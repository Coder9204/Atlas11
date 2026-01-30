'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Premium Design System - Apple/Airbnb inspired
const design = {
  colors: {
    primary: '#10b981',       // Emerald green
    primaryLight: '#34d399',
    primaryDark: '#059669',
    accent: '#f59e0b',        // Warm amber
    accentLight: '#fbbf24',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPrimary: '#0a0a0f',     // Deepest background
    bgSecondary: '#12121a',   // Cards and elevated surfaces
    bgTertiary: '#1a1a24',    // Hover states, inputs
    bgElevated: '#22222e',    // Highly elevated elements
    border: '#2a2a36',
    borderLight: '#3a3a48',
    borderFocus: '#10b981',
    textPrimary: '#fafafa',   // Headings
    textSecondary: '#a1a1aa', // Body text
    textTertiary: '#71717a',  // Captions, hints
    textInverse: '#0a0a0f',   // Text on light backgrounds
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 40px ${color}40`,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Lab',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
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

interface PendulumPeriodRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Real-world applications data
const realWorldApps = [
  {
    icon: '🕰️',
    title: 'Grandfather Clocks',
    tagline: 'Precision Timekeeping for Centuries',
    description: "Grandfather clocks use the pendulum's consistent period to keep accurate time. The period depends only on pendulum length, so adjusting the bob height fine-tunes the clock.",
    connection: "Since mass doesn't affect period, clockmakers can use decorative brass bobs or simple lead weights - both keep identical time if the length is the same.",
    howItWorks: "A escapement mechanism gives the pendulum small pushes to overcome air resistance. Each swing advances the gear train by one tooth, moving the hands at a precise rate.",
    stats: [
      { value: '1s', label: 'standard period', icon: '⏱️' },
      { value: '99.4cm', label: 'for 1-second period', icon: '📏' },
      { value: '±0.5s', label: 'daily accuracy', icon: '🎯' }
    ],
    examples: ['Westminster chime clocks', 'Regulator clocks in observatories', 'Antique longcase clocks', 'Metronomes for musicians'],
    companies: ['Howard Miller', 'Hermle', 'Kieninger', 'Seth Thomas'],
    color: design.colors.primary
  },
  {
    icon: '📈',
    title: 'Seismographs',
    tagline: 'Detecting Earth\'s Tremors',
    description: "Early seismographs used pendulums to detect earthquakes. The pendulum's inertia keeps it stationary while the ground moves, allowing measurement of seismic waves.",
    connection: "The pendulum period determines which earthquake frequencies are detected. Longer pendulums (longer periods) detect slower, more distant quakes.",
    howItWorks: "When the ground shakes, the pendulum stays relatively still due to inertia while the frame moves. A pen attached to the bob traces the relative motion on a rotating drum.",
    stats: [
      { value: '1880', label: 'first modern seismograph', icon: '📜' },
      { value: '15s', label: 'typical period for teleseismic', icon: '⏱️' },
      { value: '0.001mm', label: 'detection sensitivity', icon: '🔬' }
    ],
    examples: ['Wiechert inverted pendulum', 'Wood-Anderson torsion seismometer', 'Galitzin seismograph', 'Modern broadband sensors'],
    companies: ['USGS', 'Guralp', 'Streckeisen', 'Nanometrics'],
    color: '#ef4444'
  },
  {
    icon: '🌍',
    title: 'Foucault Pendulum',
    tagline: 'Proving Earth\'s Rotation',
    description: "Foucault pendulums demonstrate Earth's rotation. The swing plane appears to rotate because Earth turns underneath while the pendulum maintains its original plane of oscillation.",
    connection: "The predictable period (independent of mass) allows precise tracking of the apparent rotation rate, which varies with latitude - fastest at poles, zero at equator.",
    howItWorks: "A heavy bob on a long wire swings for hours. At the poles, the plane rotates 360° per day. At other latitudes, rotation = 360° × sin(latitude) per day.",
    stats: [
      { value: '67m', label: 'Panthéon pendulum', icon: '📐' },
      { value: '28kg', label: 'typical bob mass', icon: '⚖️' },
      { value: '11.3°', label: 'rotation per hour at 45°N', icon: '🔄' }
    ],
    examples: ['Paris Panthéon (original 1851)', 'United Nations HQ', 'California Academy of Sciences', 'Griffith Observatory'],
    companies: ['Science museums worldwide', 'Universities', 'Public institutions', 'Research facilities'],
    color: '#8b5cf6'
  },
  {
    icon: '🎵',
    title: 'Metronomes',
    tagline: 'Perfect Musical Timing',
    description: "Metronomes use an inverted pendulum with an adjustable weight to set tempo. Musicians rely on the consistent beat to practice rhythm and maintain tempo.",
    connection: "Moving the weight up or down changes the effective length, changing the period. The mass of the weight doesn't matter - only its position affects tempo.",
    howItWorks: "An inverted pendulum with a counterweight below the pivot swings back and forth. A spring mechanism gives pulses to maintain oscillation and produces the click sound.",
    stats: [
      { value: '40-208', label: 'BPM range', icon: '🎵' },
      { value: '1815', label: 'year patented', icon: '📜' },
      { value: '±0.5%', label: 'typical accuracy', icon: '🎯' }
    ],
    examples: ['Wittner Taktell', 'Seth Thomas metronomes', 'Digital metronomes', 'Smartphone apps'],
    companies: ['Wittner', 'Seiko', 'Korg', 'Boss'],
    color: '#ec4899'
  }
];

// Test questions with scenarios
const testQuestions = [
  {
    scenario: "You're timing a grandfather clock pendulum. The brass bob feels heavy in your hand.",
    question: "If you replaced the brass bob with an aluminum one of the same size (but lighter), what would happen to the period?",
    options: [
      { text: "Period would increase because lighter things swing slower", correct: false },
      { text: "Period would decrease because lighter things swing faster", correct: false },
      { text: "Period would stay the same because mass cancels out in the equation", correct: true },
      { text: "Period would become erratic due to the material change", correct: false }
    ],
    explanation: "In the pendulum equation T = 2π√(L/g), mass doesn't appear! When deriving the equation, the bob's mass appears in both gravitational force (mg) and inertia (ma), canceling completely. Only length and gravity determine period."
  },
  {
    scenario: "A student sets up two identical pendulums but uses a 1kg bob on one and a 5kg bob on the other.",
    question: "They start both at the same angle and release simultaneously. Which reaches the bottom first?",
    options: [
      { text: "The 5kg bob - heavier objects fall faster", correct: false },
      { text: "The 1kg bob - lighter objects accelerate more easily", correct: false },
      { text: "They arrive at the same time", correct: true },
      { text: "It depends on the release technique", correct: false }
    ],
    explanation: "Both arrive simultaneously! This is the same principle as Galileo's famous thought experiment. In a pendulum, the restoring force is proportional to mass (F = mg×sin(θ)), but so is inertia (ma). They cancel, so all masses swing identically."
  },
  {
    scenario: "You need to design a pendulum clock with a 2-second period (1 second each way).",
    question: "What length should the pendulum be? (Use g = 10 m/s² and π² ≈ 10)",
    options: [
      { text: "About 25 cm", correct: false },
      { text: "About 50 cm", correct: false },
      { text: "About 100 cm (1 meter)", correct: true },
      { text: "About 200 cm (2 meters)", correct: false }
    ],
    explanation: "Using T = 2π√(L/g): 2 = 2π√(L/10). Solving: √(L/10) = 1/π, so L/10 = 1/π² ≈ 0.1, giving L ≈ 1 meter. A 'seconds pendulum' that takes 1 second per half-swing is indeed about 1 meter long."
  },
  {
    scenario: "A Foucault pendulum at a science museum swings with a period of 16 seconds.",
    question: "Scientists want to double the period to 32 seconds. How should they change the length?",
    options: [
      { text: "Double the length (2× longer)", correct: false },
      { text: "Quadruple the length (4× longer)", correct: true },
      { text: "Increase length by √2 (about 1.41× longer)", correct: false },
      { text: "The period cannot be changed by adjusting length", correct: false }
    ],
    explanation: "Since T ∝ √L, doubling the period requires quadrupling the length. If T₁ = 2π√(L₁/g) and T₂ = 2T₁, then √(L₂/g) = 2√(L₁/g), so L₂ = 4L₁. Period scales with square root of length!"
  },
  {
    scenario: "On the Moon, gravity is about 1/6 of Earth's gravity.",
    question: "A 1-meter pendulum has a 2-second period on Earth. What's its period on the Moon?",
    options: [
      { text: "About 2 seconds (same as Earth)", correct: false },
      { text: "About 5 seconds (√6 ≈ 2.45 times longer)", correct: true },
      { text: "About 12 seconds (6 times longer)", correct: false },
      { text: "About 0.8 seconds (shorter due to less resistance)", correct: false }
    ],
    explanation: "Since T = 2π√(L/g) and Moon's g is 1/6 of Earth's, T_moon = 2π√(L/(g/6)) = √6 × T_earth ≈ 2.45 × 2s ≈ 5 seconds. Lower gravity means slower restoration and longer period."
  },
  {
    scenario: "A child on a playground swing is pushed to a small angle.",
    question: "If the child's parent (who weighs 3× more) sits on the same swing at the same angle, how does their period compare?",
    options: [
      { text: "Parent swings 3× slower due to greater weight", correct: false },
      { text: "Parent swings √3 times slower", correct: false },
      { text: "Both have the same period", correct: true },
      { text: "Parent swings faster because adults push off harder", correct: false }
    ],
    explanation: "The period is identical! A playground swing acts as a pendulum, and since mass cancels out (T = 2π√(L/g)), the parent and child swing at the same rate if released from the same angle. Only the swing's length matters."
  },
  {
    scenario: "You're exploring a cave and find an ancient pendulum. You measure its length as 2.5 meters.",
    question: "You time 10 complete swings and count about 32 seconds. What can you conclude about the cave's gravity?",
    options: [
      { text: "Gravity is normal (about 10 m/s²)", correct: true },
      { text: "Gravity is weaker than normal", correct: false },
      { text: "Gravity is stronger than normal", correct: false },
      { text: "You can't determine gravity from this information", correct: false }
    ],
    explanation: "Period ≈ 3.2 seconds. Using T = 2π√(L/g): 3.2 = 2π√(2.5/g). Solving: g = 4π²×2.5/3.2² ≈ 4×10×2.5/10 ≈ 10 m/s². This matches Earth's normal gravity, suggesting the cave is near sea level."
  },
  {
    scenario: "An engineer is designing a tuned mass damper for a skyscraper. The building sways with a 10-second period.",
    question: "What pendulum length is needed for the damper to match this frequency?",
    options: [
      { text: "About 2.5 meters", correct: false },
      { text: "About 10 meters", correct: false },
      { text: "About 25 meters", correct: true },
      { text: "About 100 meters", correct: false }
    ],
    explanation: "Using T = 2π√(L/g) with T = 10s and g = 10 m/s²: 10 = 2π√(L/10). Squaring: 100 = 4π²L/10, so L = 1000/4π² ≈ 1000/40 ≈ 25 meters. This is why building dampers need significant height!"
  },
  {
    scenario: "A physics student claims that swinging higher (larger amplitude) will make the period longer.",
    question: "Is the student correct for a simple pendulum with small to moderate angles?",
    options: [
      { text: "Yes, amplitude strongly affects period", correct: false },
      { text: "No, period is completely independent of amplitude", correct: false },
      { text: "Partially - period is nearly constant for small angles but increases slightly at large angles", correct: true },
      { text: "The opposite is true - larger amplitude means shorter period", correct: false }
    ],
    explanation: "For small angles (< 15°), the period is essentially constant - this is the 'isochronism' Galileo observed. However, the sin(θ) ≈ θ approximation breaks down at large angles, causing slightly longer periods. At 90°, the period is about 18% longer than the small-angle value."
  },
  {
    scenario: "Two pendulums have the same length, but one swings in oil and one in air.",
    question: "Ignoring damping (energy loss), how do their natural periods compare?",
    options: [
      { text: "Oil pendulum is much slower due to viscosity", correct: false },
      { text: "Oil pendulum is faster because oil is denser", correct: false },
      { text: "Periods are nearly identical - the formula T = 2π√(L/g) doesn't include medium density", correct: true },
      { text: "Cannot be determined without knowing oil density", correct: false }
    ],
    explanation: "The natural period depends only on length and gravity, not on the surrounding medium. The oil causes faster damping (energy loss), but each swing still takes the same time. The pendulum simply loses amplitude faster, not frequency."
  }
];

const PendulumPeriodRenderer: React.FC<PendulumPeriodRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'transition' = 'click') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const freqMap = { click: 440, success: 600, error: 300, transition: 520 };
      oscillator.frequency.value = freqMap[type];
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {}
  }, []);

  // Emit events
  const emitEvent = (type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  };

  // Phase navigation
  const goToPhase = (newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  };

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(testQuestions.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [pendulumLength, setPendulumLength] = useState(200);
  const [bobMass, setBobMass] = useState(1);
  const [amplitude, setAmplitude] = useState(15);
  const [isSwinging, setIsSwinging] = useState(false);
  const [pendulumAngle, setPendulumAngle] = useState(15);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [recordedPeriods, setRecordedPeriods] = useState<{length: number, mass: number, period: number}[]>([]);
  const [lastCrossing, setLastCrossing] = useState<number | null>(null);
  const [measuredPeriod, setMeasuredPeriod] = useState<number | null>(null);

  // Twist play state for Earth vs Moon comparison
  const [twistPlanet, setTwistPlanet] = useState<'earth' | 'moon'>('earth');
  const [twistIsSwinging, setTwistIsSwinging] = useState(false);
  const [twistAngle, setTwistAngle] = useState(15);
  const [twistVelocity, setTwistVelocity] = useState(0);
  const [twistMeasuredPeriod, setTwistMeasuredPeriod] = useState<number | null>(null);
  const [twistLastCrossing, setTwistLastCrossing] = useState<number | null>(null);
  const [earthPeriod, setEarthPeriod] = useState<number | null>(null);
  const [moonPeriod, setMoonPeriod] = useState<number | null>(null);

  const animationRef = useRef<number | null>(null);
  const twistAnimationRef = useRef<number | null>(null);

  const isMobile = width < 600;
  const { colors, space, radius, shadows } = design;


  // Pendulum physics simulation
  useEffect(() => {
    if (!isSwinging) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const g = 9.81;
    const pixelsPerMeter = 200;
    const lengthMeters = pendulumLength / pixelsPerMeter;
    let lastTime = performance.now();
    let wasPositive = pendulumAngle > 0;

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const angleRad = (pendulumAngle * Math.PI) / 180;
      const angularAccel = -(g / lengthMeters) * Math.sin(angleRad);

      const newVelocity = angularVelocity + angularAccel * dt;
      const newAngle = pendulumAngle + newVelocity * dt * (180 / Math.PI);
      const dampedVelocity = newVelocity * 0.999;

      setAngularVelocity(dampedVelocity);
      setPendulumAngle(newAngle);

      const isPositive = newAngle > 0;
      if (wasPositive && !isPositive) {
        const now = performance.now();
        if (lastCrossing !== null) {
          const period = (now - lastCrossing) / 1000 * 2;
          setMeasuredPeriod(period);
        }
        setLastCrossing(now);
      }
      wasPositive = isPositive;

      if (Math.abs(newAngle) < 0.1 && Math.abs(dampedVelocity) < 0.01) {
        setIsSwinging(false);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSwinging, pendulumLength]);

  // Twist pendulum physics (Earth vs Moon)
  useEffect(() => {
    if (!twistIsSwinging) {
      if (twistAnimationRef.current) {
        cancelAnimationFrame(twistAnimationRef.current);
      }
      return;
    }

    const g = twistPlanet === 'earth' ? 9.81 : 1.62; // Moon gravity is ~1/6 of Earth
    const pixelsPerMeter = 200;
    const lengthMeters = 1; // Fixed 1 meter pendulum for comparison
    let lastTime = performance.now();
    let wasPositive = twistAngle > 0;

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const angleRad = (twistAngle * Math.PI) / 180;
      const angularAccel = -(g / lengthMeters) * Math.sin(angleRad);

      const newVelocity = twistVelocity + angularAccel * dt;
      const newAngle = twistAngle + newVelocity * dt * (180 / Math.PI);
      const dampedVelocity = newVelocity * 0.999;

      setTwistVelocity(dampedVelocity);
      setTwistAngle(newAngle);

      const isPositive = newAngle > 0;
      if (wasPositive && !isPositive) {
        const now = performance.now();
        if (twistLastCrossing !== null) {
          const period = (now - twistLastCrossing) / 1000 * 2;
          setTwistMeasuredPeriod(period);
          if (twistPlanet === 'earth') {
            setEarthPeriod(period);
          } else {
            setMoonPeriod(period);
          }
        }
        setTwistLastCrossing(now);
      }
      wasPositive = isPositive;

      if (Math.abs(newAngle) < 0.1 && Math.abs(dampedVelocity) < 0.01) {
        setTwistIsSwinging(false);
        return;
      }

      twistAnimationRef.current = requestAnimationFrame(animate);
    };

    twistAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (twistAnimationRef.current) {
        cancelAnimationFrame(twistAnimationRef.current);
      }
    };
  }, [twistIsSwinging, twistPlanet]);

  const startSwing = useCallback(() => {
    setPendulumAngle(amplitude);
    setAngularVelocity(0);
    setLastCrossing(null);
    setMeasuredPeriod(null);
    setIsSwinging(true);
  }, [amplitude]);

  const stopSwing = useCallback(() => {
    setIsSwinging(false);
    setPendulumAngle(amplitude);
    setAngularVelocity(0);
  }, [amplitude]);

  const startTwistSwing = useCallback(() => {
    setTwistAngle(15);
    setTwistVelocity(0);
    setTwistLastCrossing(null);
    setTwistMeasuredPeriod(null);
    setTwistIsSwinging(true);
  }, []);

  const stopTwistSwing = useCallback(() => {
    setTwistIsSwinging(false);
    setTwistAngle(15);
    setTwistVelocity(0);
  }, []);

  const recordMeasurement = useCallback(() => {
    if (measuredPeriod !== null) {
      setRecordedPeriods(prev => [...prev, {
        length: pendulumLength,
        mass: bobMass,
        period: measuredPeriod
      }]);
    }
  }, [measuredPeriod, pendulumLength, bobMass]);

  // Calculate theoretical period
  const theoreticalPeriod = useCallback((lengthPx: number, gravity: number = 9.81) => {
    const lengthMeters = lengthPx / 200;
    return 2 * Math.PI * Math.sqrt(lengthMeters / gravity);
  }, []);

  // ============ HELPER FUNCTIONS ============

  // Progress bar - premium phase dots pattern
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `12px ${space.lg}`,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>
          Pendulum Period
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {phaseOrder.map((p, idx) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                height: '8px',
                width: idx === currentIndex ? '24px' : '8px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                background: idx === currentIndex
                  ? colors.primary
                  : idx < currentIndex
                    ? colors.success
                    : colors.bgTertiary,
                boxShadow: idx === currentIndex ? `0 0 12px ${colors.primary}40` : 'none',
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.primary }}>
          {phaseLabels[phase]}
        </span>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (onNext: () => void, nextLabel: string = 'Continue', disabled: boolean = false) => {
    return (
      <div style={{
        padding: `${space.lg} ${space.xl}`,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => !disabled && onNext()}
          style={{
            padding: `${space.md} ${space.xl}`,
            fontSize: '15px',
            fontWeight: 700,
            color: disabled ? colors.textTertiary : colors.textInverse,
            background: disabled
              ? colors.bgTertiary
              : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
            border: 'none',
            borderRadius: radius.md,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: disabled ? 0.5 : 1,
            boxShadow: disabled ? 'none' : shadows.md,
            letterSpacing: '0.3px',
            zIndex: 10,
            position: 'relative',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Section header
  const renderSectionHeader = (icon: string, title: string, subtitle?: string) => {
    return (
      <div style={{ marginBottom: space.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.md, marginBottom: space.sm }}>
          <span style={{ fontSize: '28px' }}>{icon}</span>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: colors.textPrimary,
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{
            fontSize: '15px',
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.6
          }}>
            {subtitle}
          </p>
        )}
      </div>
    );
  };

  // Key takeaway box
  const renderKeyTakeaway = (text: string) => {
    return (
      <div style={{
        padding: `${space.lg} ${space.lg}`,
        background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`,
        borderRadius: radius.lg,
        border: `1px solid ${colors.primary}40`,
        marginTop: space.lg
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: space.md }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: colors.primary,
              marginBottom: space.xs,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Key Takeaway
            </div>
            <p style={{
              fontSize: '15px',
              color: colors.textPrimary,
              margin: 0,
              lineHeight: 1.7
            }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Pendulum visualization
  const renderPendulum = (showControls: boolean = true, compact: boolean = false) => {
    const svgWidth = compact ? 280 : 380;
    const svgHeight = compact ? 250 : 320;
    const pivotX = svgWidth / 2;
    const pivotY = 50;

    const scaledLength = compact ? pendulumLength * 0.55 : pendulumLength * 0.85;
    const bobRadius = 14 + (bobMass - 1) * 6;

    const angleRad = (pendulumAngle * Math.PI) / 180;
    const bobX = pivotX + scaledLength * Math.sin(angleRad);
    const bobY = pivotY + scaledLength * Math.cos(angleRad);

    const bobColors = ['#60a5fa', '#f59e0b', '#ef4444'];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space.md }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{
            background: `linear-gradient(180deg, ${colors.bgTertiary} 0%, ${colors.bgSecondary} 100%)`,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`
          }}
        >
          {/* Support beam */}
          <rect x={pivotX - 40} y={pivotY - 20} width="80" height="10" fill={colors.borderLight} rx="5" />

          {/* Pivot point */}
          <circle cx={pivotX} cy={pivotY} r="10" fill={colors.border} stroke={colors.borderLight} strokeWidth="2" />

          {/* String/rod */}
          <line
            x1={pivotX}
            y1={pivotY}
            x2={bobX}
            y2={bobY}
            stroke={colors.textSecondary}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Bob glow */}
          <circle
            cx={bobX}
            cy={bobY}
            r={bobRadius + 8}
            fill={`${bobColors[bobMass - 1]}20`}
          />

          {/* Bob */}
          <circle
            cx={bobX}
            cy={bobY}
            r={bobRadius}
            fill={bobColors[bobMass - 1]}
            stroke={colors.textPrimary}
            strokeWidth="2"
          />

          {/* Angle arc */}
          {Math.abs(pendulumAngle) > 2 && (
            <path
              d={`M ${pivotX} ${pivotY + 50} A 50 50 0 0 ${pendulumAngle > 0 ? 1 : 0} ${pivotX + 50 * Math.sin(angleRad)} ${pivotY + 50 * Math.cos(angleRad)}`}
              fill="none"
              stroke={colors.primary}
              strokeWidth="2"
              strokeDasharray="6,4"
              opacity="0.8"
            />
          )}

          {/* Length label */}
          <text x={pivotX + 55} y={pivotY + scaledLength / 2} fill={colors.textSecondary} fontSize="13" fontWeight="500">
            L = {(pendulumLength / 200).toFixed(2)}m
          </text>

          {/* Period display */}
          {measuredPeriod !== null && (
            <g>
              <rect x={pivotX - 90} y={svgHeight - 45} width="180" height="30" fill={colors.bgPrimary} rx="8" opacity="0.9" />
              <text x={pivotX} y={svgHeight - 24} fill={colors.primary} fontSize="14" textAnchor="middle" fontWeight="700">
                T = {measuredPeriod.toFixed(2)}s (theory: {theoreticalPeriod(pendulumLength).toFixed(2)}s)
              </text>
            </g>
          )}
        </svg>

        {showControls && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: space.md,
            width: '100%',
            maxWidth: '360px',
            padding: space.md,
            background: colors.bgSecondary,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`
          }}>
            {/* Length control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '70px', fontWeight: 500 }}>Length:</span>
              <input
                type="range"
                min="100"
                max="300"
                value={pendulumLength}
                onChange={(e) => {
                  setPendulumLength(Number(e.target.value));
                  stopSwing();
                }}
                style={{ flex: 1, accentColor: colors.primary }}
              />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '55px', fontWeight: 600 }}>
                {(pendulumLength / 200).toFixed(2)}m
              </span>
            </div>

            {/* Mass control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '70px', fontWeight: 500 }}>Mass:</span>
              <div style={{ display: 'flex', gap: space.sm, flex: 1 }}>
                {[1, 2, 3].map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setBobMass(m);
                      stopSwing();
                    }}
                    style={{
                      flex: 1,
                      padding: `${space.sm} ${space.md}`,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: bobMass === m ? colors.textInverse : colors.textSecondary,
                      background: bobMass === m ? bobColors[m - 1] : colors.bgTertiary,
                      border: `1px solid ${bobMass === m ? bobColors[m - 1] : colors.border}`,
                      borderRadius: radius.sm,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      zIndex: 10,
                      position: 'relative',
                    }}
                  >
                    {m === 1 ? 'Light' : m === 2 ? 'Medium' : 'Heavy'}
                  </button>
                ))}
              </div>
            </div>

            {/* Amplitude control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '70px', fontWeight: 500 }}>Angle:</span>
              <input
                type="range"
                min="5"
                max="60"
                value={amplitude}
                onChange={(e) => {
                  setAmplitude(Number(e.target.value));
                  stopSwing();
                }}
                style={{ flex: 1, accentColor: colors.accent }}
              />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '55px', fontWeight: 600 }}>
                {amplitude}°
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: space.sm, marginTop: space.xs }}>
              <button
                onClick={() => isSwinging ? stopSwing() : startSwing()}
                style={{
                  flex: 1,
                  padding: `${space.md} ${space.md}`,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: colors.textPrimary,
                  background: isSwinging
                    ? `linear-gradient(135deg, ${colors.danger}, #dc2626)`
                    : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                  border: 'none',
                  borderRadius: radius.sm,
                  cursor: 'pointer',
                  boxShadow: shadows.sm,
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                {isSwinging ? '⏹ Stop' : '▶ Start'}
              </button>
              {measuredPeriod !== null && (
                <button
                  onClick={() => recordMeasurement()}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: colors.textInverse,
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
                    border: 'none',
                    borderRadius: radius.sm,
                    cursor: 'pointer',
                    boxShadow: shadows.sm,
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  📊 Record
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Data table
  const renderDataTable = () => {
    if (recordedPeriods.length === 0) return null;

    return (
      <div style={{
        marginTop: space.lg,
        background: colors.bgTertiary,
        borderRadius: radius.md,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '1px',
          background: colors.border
        }}>
          <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '12px', fontWeight: 700, color: colors.textSecondary }}>
            Length (m)
          </div>
          <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '12px', fontWeight: 700, color: colors.textSecondary }}>
            Mass
          </div>
          <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '12px', fontWeight: 700, color: colors.textSecondary }}>
            Measured T
          </div>
          <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '12px', fontWeight: 700, color: colors.textSecondary }}>
            Theory T
          </div>
          {recordedPeriods.map((record, idx) => (
            <React.Fragment key={idx}>
              <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '13px', color: colors.textPrimary }}>
                {(record.length / 200).toFixed(2)}
              </div>
              <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '13px', color: colors.textPrimary }}>
                {record.mass === 1 ? 'Light' : record.mass === 2 ? 'Medium' : 'Heavy'}
              </div>
              <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '13px', color: colors.primary, fontWeight: 600 }}>
                {record.period.toFixed(3)}s
              </div>
              <div style={{ padding: space.md, background: colors.bgSecondary, fontSize: '13px', color: colors.textSecondary }}>
                {theoreticalPeriod(record.length).toFixed(3)}s
              </div>
            </React.Fragment>
          ))}
        </div>
        <button
          onClick={() => setRecordedPeriods([])}
          style={{
            width: '100%',
            padding: space.md,
            fontSize: '12px',
            fontWeight: 500,
            color: colors.textTertiary,
            background: colors.bgSecondary,
            border: 'none',
            borderTop: `1px solid ${colors.border}`,
            cursor: 'pointer',
            zIndex: 10,
            position: 'relative',
          }}
        >
          Clear Data
        </button>
      </div>
    );
  };

  // ============ PHASE RENDERS ============

  // Hook phase - Premium welcome screen
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: `radial-gradient(ellipse at top, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 70%)`
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        padding: isMobile ? space.lg : space.xxl,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          {/* Animated icon with glow */}
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 32px',
            borderRadius: radius.full,
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.glow(colors.primary),
            border: `2px solid ${colors.primary}30`
          }}>
            <span style={{ fontSize: '56px' }}>🎢</span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isMobile ? '32px' : '42px',
            fontWeight: 800,
            color: colors.textPrimary,
            marginBottom: space.md,
            lineHeight: 1.1,
            letterSpacing: '-1px'
          }}>
            The Pendulum Period
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '18px',
            color: colors.textSecondary,
            marginBottom: space.xl,
            lineHeight: 1.7
          }}>
            What determines how fast a pendulum swings? Is it the mass of the bob, the length of the string, or something else entirely?
          </p>

          {/* Info card */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgTertiary}, ${colors.bgSecondary})`,
            borderRadius: radius.xl,
            padding: space.xl,
            marginBottom: space.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.lg
          }}>
            <p style={{
              fontSize: '16px',
              color: colors.textSecondary,
              margin: 0,
              lineHeight: 1.7
            }}>
              The <strong style={{ color: colors.primary }}>period</strong> of a pendulum is the time it takes to complete one full swing back and forth. Understanding what affects it led to some of physics' most important discoveries.
            </p>
          </div>

          {/* Visual comparison */}
          <div style={{
            display: 'flex',
            gap: space.lg,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: `${space.lg} ${space.xl}`,
              background: colors.bgSecondary,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '40px' }}>⏱️</span>
              <p style={{ fontSize: '14px', color: colors.textSecondary, margin: `${space.sm} 0 0`, fontWeight: 500 }}>Period (T)</p>
            </div>
            <div style={{
              padding: `${space.lg} ${space.xl}`,
              background: colors.bgSecondary,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '40px' }}>📏</span>
              <p style={{ fontSize: '14px', color: colors.textSecondary, margin: `${space.sm} 0 0`, fontWeight: 500 }}>Length (L)</p>
            </div>
            <div style={{
              padding: `${space.lg} ${space.xl}`,
              background: colors.bgSecondary,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '40px' }}>⚖️</span>
              <p style={{ fontSize: '14px', color: colors.textSecondary, margin: `${space.sm} 0 0`, fontWeight: 500 }}>Mass (m)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA */}
      <div style={{
        padding: `${space.lg} ${space.xl}`,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => goToPhase('predict')}
          style={{
            padding: `${space.md} ${space.xxl}`,
            fontSize: '16px',
            fontWeight: 700,
            color: colors.textInverse,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
            border: 'none',
            borderRadius: radius.md,
            cursor: 'pointer',
            boxShadow: `${shadows.md}, ${shadows.glow(colors.primary)}`,
            letterSpacing: '0.5px',
            zIndex: 10,
            position: 'relative',
          }}
        >
          Make Your Prediction →
        </button>
      </div>
    </div>
  );

  // Predict phase
  const renderPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('🤔', 'Your Prediction', 'What do you think affects the period of a pendulum?')}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          {[
            { id: 'mass', label: 'Mass of the bob - heavier bobs swing slower', icon: '⚖️' },
            { id: 'length', label: 'Length of the string - longer pendulums swing slower', icon: '📏' },
            { id: 'amplitude', label: 'Starting angle - bigger swings take longer', icon: '📐' },
            { id: 'all', label: 'All of the above affect the period', icon: '🎯' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setPrediction(option.id)}
              style={{
                padding: `${space.lg} ${space.lg}`,
                fontSize: '15px',
                fontWeight: prediction === option.id ? 700 : 500,
                color: prediction === option.id ? colors.textInverse : colors.textPrimary,
                background: prediction === option.id
                  ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                  : colors.bgSecondary,
                border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                transition: 'all 0.2s ease',
                boxShadow: prediction === option.id ? shadows.md : 'none',
                zIndex: 10,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: space.xl,
          padding: space.lg,
          background: colors.bgSecondary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: colors.textPrimary }}>Think about it:</strong> In everyday experience, heavier objects often seem different. Does mass affect how a pendulum swings?
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('play'), 'Test It!', !prediction)}
    </div>
  );

  // Play phase
  const renderPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
        {renderSectionHeader('🔬', 'Experiment', 'Change length, mass, and amplitude. What affects the period?')}

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: space.lg,
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            {renderPendulum(true)}
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: space.md
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.primary,
                marginBottom: space.md,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: space.sm
              }}>
                🎯 Challenge
              </h4>
              <ol style={{
                margin: 0,
                paddingLeft: space.lg,
                color: colors.textSecondary,
                fontSize: '14px',
                lineHeight: 2
              }}>
                <li>Keep length at 1.00m, try each mass</li>
                <li>Keep mass the same, change the length</li>
                <li>Try different starting angles</li>
                <li>Record measurements and compare!</li>
              </ol>
            </div>

            {renderDataTable()}

            <div style={{
              marginTop: space.md,
              padding: space.md,
              background: `${colors.accent}15`,
              borderRadius: radius.sm,
              border: `1px solid ${colors.accent}30`
            }}>
              <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: colors.accent }}>Hint:</strong> Watch what changes the period and what doesn't. The answer might surprise you!
              </p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(() => {
        setShowResult(true);
        goToPhase('review');
      }, 'See Results')}
    </div>
  );

  // Review phase
  const renderReview = () => {
    const wasCorrect = prediction === 'length';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
          {/* Result banner */}
          <div style={{
            padding: space.xl,
            background: wasCorrect
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
              : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
            borderRadius: radius.lg,
            border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
            marginBottom: space.xl,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎉' : '🤔'}</span>
            <h3 style={{
              fontSize: '22px',
              color: wasCorrect ? colors.success : colors.accent,
              marginTop: space.md,
              fontWeight: 700
            }}>
              {wasCorrect ? 'Correct! Only length matters!' : 'Surprising, right? Only length affects period!'}
            </h3>
          </div>

          {renderSectionHeader('📚', 'The Physics', 'The pendulum period formula')}

          {/* Formula highlight */}
          <div style={{
            padding: space.xl,
            background: colors.bgTertiary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.primary}30`,
            textAlign: 'center',
            marginBottom: space.xl
          }}>
            <div style={{
              fontSize: '32px',
              color: colors.primary,
              fontWeight: 700,
              fontFamily: 'monospace',
              marginBottom: space.md
            }}>
              T = 2π√(L/g)
            </div>
            <p style={{ fontSize: '16px', color: colors.textSecondary, margin: 0 }}>
              Period depends only on <strong style={{ color: colors.textPrimary }}>length (L)</strong> and <strong style={{ color: colors.textPrimary }}>gravity (g)</strong>
            </p>
          </div>

          {/* Why mass doesn't matter */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: space.md,
            marginBottom: space.xl
          }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.primary,
                marginBottom: space.md,
                display: 'flex',
                alignItems: 'center',
                gap: space.sm,
                fontWeight: 700
              }}>
                <span>⬇️</span> Gravitational Force
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>F = mg × sin(θ)</strong><br />
                Heavier objects feel more gravitational pull
              </p>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.accent,
                marginBottom: space.md,
                display: 'flex',
                alignItems: 'center',
                gap: space.sm,
                fontWeight: 700
              }}>
                <span>🎯</span> Inertia
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>F = ma</strong><br />
                But heavier objects are also harder to accelerate!
              </p>
            </div>
          </div>

          {/* Mass cancellation */}
          <div style={{
            padding: space.lg,
            background: colors.bgSecondary,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            marginBottom: space.lg
          }}>
            <h4 style={{ fontSize: '15px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
              The Cancellation
            </h4>
            <div style={{
              fontSize: '18px',
              color: colors.primary,
              textAlign: 'center',
              padding: space.md,
              background: colors.bgPrimary,
              borderRadius: radius.sm,
              fontFamily: 'monospace'
            }}>
              mg sin(θ) = ma → <strong>a = g sin(θ)</strong>
            </div>
            <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: space.md, textAlign: 'center' }}>
              Mass (m) cancels out! Acceleration depends only on gravity and angle.
            </p>
          </div>

          {renderKeyTakeaway('This is the same principle as Galileo\'s falling objects experiment - all masses fall at the same rate because gravity and inertia scale together. In a pendulum, mass affects both the driving force and the resistance equally, so they cancel.')}
        </div>
        {renderBottomBar(() => goToPhase('twist_predict'), 'Explore the Twist')}
      </div>
    );
  };

  // Twist Predict phase - Moon scenario
  const renderTwistPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('🌙', 'The Twist', 'What happens on the Moon?')}

        <div style={{
          padding: space.lg,
          background: colors.bgTertiary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
          marginBottom: space.xl
        }}>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
            Astronauts bring a 1-meter pendulum to the Moon. The Moon's gravity is about <strong style={{ color: colors.textPrimary }}>1/6 of Earth's</strong> (1.62 m/s² vs 9.81 m/s²). What happens to the pendulum's period?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          {[
            { id: 'same', label: 'Same period - gravity doesn\'t affect pendulums', icon: '⚖️' },
            { id: 'faster', label: 'Faster (shorter period) - less gravity means easier swinging', icon: '⏩' },
            { id: 'slower', label: 'Slower (longer period) - weaker gravity means weaker restoring force', icon: '🐢' },
            { id: 'stops', label: 'The pendulum won\'t swing at all', icon: '⛔' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setTwistPrediction(option.id)}
              style={{
                padding: `${space.lg} ${space.lg}`,
                fontSize: '15px',
                fontWeight: twistPrediction === option.id ? 700 : 500,
                color: twistPrediction === option.id ? colors.textInverse : colors.textPrimary,
                background: twistPrediction === option.id
                  ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                  : colors.bgSecondary,
                border: `2px solid ${twistPrediction === option.id ? colors.accent : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                transition: 'all 0.2s ease',
                boxShadow: twistPrediction === option.id ? shadows.md : 'none',
                zIndex: 10,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: space.xl,
          padding: space.md,
          background: `${colors.accent}15`,
          borderRadius: radius.md,
          border: `1px solid ${colors.accent}30`
        }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.accent }}>Remember:</strong> The formula is T = 2π√(L/g). Mass doesn't appear, but gravity (g) does!
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('twist_play'), 'Test on the Moon', !twistPrediction)}
    </div>
  );

  // Twist Play phase - Earth vs Moon comparison
  const renderTwistPlay = () => {
    const svgWidth = 340;
    const svgHeight = 280;
    const pivotX = svgWidth / 2;
    const pivotY = 50;
    const scaledLength = 170;
    const bobRadius = 18;

    const angleRad = (twistAngle * Math.PI) / 180;
    const bobX = pivotX + scaledLength * Math.sin(angleRad);
    const bobY = pivotY + scaledLength * Math.cos(angleRad);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {renderSectionHeader('🌍🌙', 'Earth vs Moon', 'Compare the same pendulum on Earth and Moon')}

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: space.lg,
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1 }}>
              {/* Planet selector */}
              <div style={{
                display: 'flex',
                gap: space.sm,
                marginBottom: space.md
              }}>
                <button
                  onClick={() => {
                    setTwistPlanet('earth');
                    stopTwistSwing();
                  }}
                  style={{
                    flex: 1,
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: twistPlanet === 'earth' ? colors.textInverse : colors.textSecondary,
                    background: twistPlanet === 'earth'
                      ? `linear-gradient(135deg, #3b82f6, #1d4ed8)`
                      : colors.bgSecondary,
                    border: `2px solid ${twistPlanet === 'earth' ? '#3b82f6' : colors.border}`,
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  🌍 Earth (g = 9.81)
                </button>
                <button
                  onClick={() => {
                    setTwistPlanet('moon');
                    stopTwistSwing();
                  }}
                  style={{
                    flex: 1,
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: twistPlanet === 'moon' ? colors.textInverse : colors.textSecondary,
                    background: twistPlanet === 'moon'
                      ? `linear-gradient(135deg, #6b7280, #374151)`
                      : colors.bgSecondary,
                    border: `2px solid ${twistPlanet === 'moon' ? '#6b7280' : colors.border}`,
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  🌙 Moon (g = 1.62)
                </button>
              </div>

              {/* Pendulum visualization */}
              <svg
                width={svgWidth}
                height={svgHeight}
                style={{
                  background: twistPlanet === 'earth'
                    ? `linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)`
                    : `linear-gradient(180deg, #1f1f1f 0%, #0a0a0a 100%)`,
                  borderRadius: radius.lg,
                  border: `1px solid ${colors.border}`,
                  display: 'block',
                  margin: '0 auto'
                }}
              >
                {/* Stars for moon */}
                {twistPlanet === 'moon' && (
                  <>
                    <circle cx="50" cy="30" r="1" fill="white" opacity="0.8" />
                    <circle cx="100" cy="60" r="1.5" fill="white" opacity="0.6" />
                    <circle cx="280" cy="40" r="1" fill="white" opacity="0.7" />
                    <circle cx="310" cy="80" r="1.2" fill="white" opacity="0.5" />
                    <circle cx="30" cy="100" r="1" fill="white" opacity="0.6" />
                  </>
                )}

                {/* Support beam */}
                <rect x={pivotX - 40} y={pivotY - 20} width="80" height="10" fill={colors.borderLight} rx="5" />

                {/* Pivot point */}
                <circle cx={pivotX} cy={pivotY} r="10" fill={colors.border} stroke={colors.borderLight} strokeWidth="2" />

                {/* String/rod */}
                <line
                  x1={pivotX}
                  y1={pivotY}
                  x2={bobX}
                  y2={bobY}
                  stroke={colors.textSecondary}
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Bob glow */}
                <circle
                  cx={bobX}
                  cy={bobY}
                  r={bobRadius + 8}
                  fill={twistPlanet === 'earth' ? '#3b82f620' : '#9ca3af20'}
                />

                {/* Bob */}
                <circle
                  cx={bobX}
                  cy={bobY}
                  r={bobRadius}
                  fill={twistPlanet === 'earth' ? '#3b82f6' : '#9ca3af'}
                  stroke={colors.textPrimary}
                  strokeWidth="2"
                />

                {/* Planet label */}
                <text x={pivotX} y={30} fill={colors.textPrimary} fontSize="16" textAnchor="middle" fontWeight="700">
                  {twistPlanet === 'earth' ? '🌍 Earth' : '🌙 Moon'}
                </text>

                {/* Period display */}
                {twistMeasuredPeriod !== null && (
                  <g>
                    <rect x={pivotX - 70} y={svgHeight - 40} width="140" height="28" fill={colors.bgPrimary} rx="8" opacity="0.9" />
                    <text x={pivotX} y={svgHeight - 20} fill={colors.primary} fontSize="14" textAnchor="middle" fontWeight="700">
                      T = {twistMeasuredPeriod.toFixed(2)}s
                    </text>
                  </g>
                )}
              </svg>

              {/* Control button */}
              <div style={{ marginTop: space.md, display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => twistIsSwinging ? stopTwistSwing() : startTwistSwing()}
                  style={{
                    padding: `${space.md} ${space.xxl}`,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: colors.textPrimary,
                    background: twistIsSwinging
                      ? `linear-gradient(135deg, ${colors.danger}, #dc2626)`
                      : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                    border: 'none',
                    borderRadius: radius.sm,
                    cursor: 'pointer',
                    boxShadow: shadows.sm,
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  {twistIsSwinging ? '⏹ Stop' : '▶ Start Pendulum'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{
                padding: space.lg,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                marginBottom: space.md
              }}>
                <h4 style={{
                  fontSize: '15px',
                  color: colors.accent,
                  marginBottom: space.md,
                  fontWeight: 700
                }}>
                  🎯 Your Mission
                </h4>
                <ol style={{
                  margin: 0,
                  paddingLeft: space.lg,
                  color: colors.textSecondary,
                  fontSize: '14px',
                  lineHeight: 2
                }}>
                  <li>Start the pendulum on Earth</li>
                  <li>Note the period</li>
                  <li>Switch to Moon and repeat</li>
                  <li>Compare the two periods!</li>
                </ol>
              </div>

              {/* Results comparison */}
              <div style={{
                padding: space.lg,
                background: colors.bgTertiary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`
              }}>
                <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
                  📊 Recorded Periods
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: space.md,
                    background: '#3b82f615',
                    borderRadius: radius.sm,
                    border: '1px solid #3b82f640'
                  }}>
                    <span style={{ color: colors.textSecondary }}>🌍 Earth:</span>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>
                      {earthPeriod ? `${earthPeriod.toFixed(2)}s` : '---'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: space.md,
                    background: '#6b728015',
                    borderRadius: radius.sm,
                    border: '1px solid #6b728040'
                  }}>
                    <span style={{ color: colors.textSecondary }}>🌙 Moon:</span>
                    <span style={{ color: '#9ca3af', fontWeight: 700 }}>
                      {moonPeriod ? `${moonPeriod.toFixed(2)}s` : '---'}
                    </span>
                  </div>
                  {earthPeriod && moonPeriod && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: space.md,
                      background: `${colors.primary}15`,
                      borderRadius: radius.sm,
                      border: `1px solid ${colors.primary}40`
                    }}>
                      <span style={{ color: colors.textSecondary }}>Ratio:</span>
                      <span style={{ color: colors.primary, fontWeight: 700 }}>
                        {(moonPeriod / earthPeriod).toFixed(2)}x slower
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                marginTop: space.md,
                padding: space.md,
                background: colors.bgSecondary,
                borderRadius: radius.sm
              }}>
                <p style={{ fontSize: '13px', color: colors.textTertiary, margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: colors.textSecondary }}>Theory:</strong><br />
                  Earth: T = 2.01s<br />
                  Moon: T = 4.93s (≈ 2.45× longer)<br />
                  √6 ≈ 2.45
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(() => {
          setShowTwistResult(true);
          goToPhase('twist_review');
        }, 'See Analysis')}
      </div>
    );
  };

  // Twist Review phase
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'slower';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
          <div style={{
            padding: space.xl,
            background: wasCorrect
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
              : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
            borderRadius: radius.lg,
            border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
            marginBottom: space.xl,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎯' : '💡'}</span>
            <h3 style={{
              fontSize: '22px',
              color: wasCorrect ? colors.success : colors.accent,
              marginTop: space.md,
              fontWeight: 700
            }}>
              {wasCorrect ? 'Excellent! Gravity matters!' : 'Gravity is in the formula!'}
            </h3>
          </div>

          {renderSectionHeader('🌙', 'Why Gravity Affects Period', 'The g in T = 2π√(L/g)')}

          {/* Explanation */}
          <div style={{
            padding: space.lg,
            background: colors.bgSecondary,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            marginBottom: space.lg
          }}>
            <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.8, margin: 0 }}>
              Remember how mass cancels because gravity pulls harder on heavy objects but they're also harder to accelerate? Gravity (g) doesn't cancel - it's the <strong style={{ color: colors.primary }}>restoring force</strong> that makes the pendulum swing back.
            </p>
          </div>

          {/* Math explanation */}
          <div style={{
            padding: space.xl,
            background: colors.bgTertiary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            marginBottom: space.lg
          }}>
            <h4 style={{ fontSize: '15px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
              The Math
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: space.md
            }}>
              <div style={{
                padding: space.md,
                background: '#3b82f615',
                borderRadius: radius.sm,
                border: '1px solid #3b82f640',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 700, marginBottom: space.xs }}>🌍 Earth</div>
                <div style={{ fontSize: '13px', color: colors.textSecondary, fontFamily: 'monospace' }}>
                  T = 2π√(1/9.81)<br />
                  T ≈ 2.01 seconds
                </div>
              </div>
              <div style={{
                padding: space.md,
                background: '#6b728015',
                borderRadius: radius.sm,
                border: '1px solid #6b728040',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 700, marginBottom: space.xs }}>🌙 Moon</div>
                <div style={{ fontSize: '13px', color: colors.textSecondary, fontFamily: 'monospace' }}>
                  T = 2π√(1/1.62)<br />
                  T ≈ 4.93 seconds
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: space.md, textAlign: 'center' }}>
              Since g_moon = g_earth/6, and T ∝ 1/√g, the Moon period is <strong style={{ color: colors.primary }}>√6 ≈ 2.45 times longer</strong>
            </p>
          </div>

          {/* Physical intuition */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: space.md,
            marginBottom: space.lg
          }}>
            <div style={{
              padding: space.lg,
              background: `${colors.primary}10`,
              borderRadius: radius.md,
              border: `1px solid ${colors.primary}30`
            }}>
              <h4 style={{ fontSize: '15px', color: colors.primary, marginBottom: space.sm, fontWeight: 700 }}>
                Why Weaker Gravity = Longer Period
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                Weaker gravity means a weaker restoring force pulling the pendulum back to center. With less force, the pendulum accelerates more slowly and takes longer to complete each swing.
              </p>
            </div>

            <div style={{
              padding: space.lg,
              background: `${colors.accent}10`,
              borderRadius: radius.md,
              border: `1px solid ${colors.accent}30`
            }}>
              <h4 style={{ fontSize: '15px', color: colors.accent, marginBottom: space.sm, fontWeight: 700 }}>
                Real-World Application
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                This is why pendulum clocks run slow at high altitudes (weaker gravity) and why they were historically used to measure local gravitational variations.
              </p>
            </div>
          </div>

          {renderKeyTakeaway('While mass cancels in the pendulum equation (appearing in both force and inertia), gravity does not. Gravity provides the restoring force, so weaker gravity means slower oscillation. On the Moon, a pendulum swings about 2.45 times slower than on Earth!')}
        </div>
        {renderBottomBar(() => goToPhase('transfer'), 'See Real Applications')}
      </div>
    );
  };

  // Transfer phase - Real-world applications
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {renderSectionHeader('🌍', 'Real-World Applications', 'How pendulum physics shapes our world')}

          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            marginBottom: space.md
          }}>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>
              {completedApps.size} of {realWorldApps.length} explored
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {realWorldApps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: completedApps.has(idx) ? colors.success : idx === activeApp ? colors.primary : colors.bgTertiary,
                    transition: 'background 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{
            display: 'flex',
            gap: space.sm,
            marginBottom: space.lg,
            overflowX: 'auto',
            paddingBottom: space.sm
          }}>
            {realWorldApps.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isCurrent = idx === activeApp;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveApp(idx)}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? colors.textInverse : isCompleted ? colors.success : colors.textSecondary,
                    background: isCurrent
                      ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                      : isCompleted ? `${colors.success}15` : colors.bgSecondary,
                    border: `1px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`,
                    borderRadius: radius.sm,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrent ? shadows.sm : 'none',
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  {isCompleted ? '✓ ' : ''}{a.icon} {a.title}
                </button>
              );
            })}
          </div>

          {/* Application content card */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: space.xl,
              background: `linear-gradient(135deg, ${app.color}20, transparent)`,
              borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.lg, marginBottom: space.md }}>
                <span style={{ fontSize: '56px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ fontSize: '24px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>
                    {app.title}
                  </h3>
                  <p style={{ fontSize: '16px', color: app.color, margin: `${space.xs} 0 0`, fontWeight: 600 }}>
                    {app.tagline}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.description}
              </p>
            </div>

            {/* Connection */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: app.color, marginBottom: space.sm, fontWeight: 700 }}>
                🔗 Connection to Pendulum Physics
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.sm, fontWeight: 700 }}>
                ⚙️ How It Works
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: colors.border
            }}>
              {app.stats.map((stat, idx) => (
                <div key={idx} style={{
                  padding: space.lg,
                  background: colors.bgTertiary,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: space.xs }}>{stat.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: colors.textTertiary, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderTop: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
                📍 Examples
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm }}>
                {app.examples.map((ex, idx) => (
                  <span key={idx} style={{
                    padding: `${space.sm} ${space.md}`,
                    fontSize: '13px',
                    color: colors.textSecondary,
                    background: colors.bgPrimary,
                    borderRadius: radius.full,
                    border: `1px solid ${colors.border}`
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {/* Mark as Explored Button */}
            <div style={{ padding: space.lg, borderTop: `1px solid ${colors.border}` }}>
              {!completedApps.has(activeApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    if (activeApp < realWorldApps.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: space.lg,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: colors.textInverse,
                    background: colors.success,
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  ✓ Mark "{app.title}" as Explored
                </button>
              ) : (
                <div style={{
                  padding: space.lg,
                  background: `${colors.success}15`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.success}40`,
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>
                    ✓ Explored
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{
          padding: `${space.lg} ${space.xl}`,
          background: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => goToPhase('twist_review')}
            style={{
              padding: `${space.md} ${space.xl}`,
              fontSize: '14px',
              color: colors.textSecondary,
              background: 'transparent',
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative',
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => goToPhase('test')}
            style={{
              padding: `${space.md} ${space.xxl}`,
              fontSize: '15px',
              fontWeight: 600,
              color: colors.textInverse,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              zIndex: 10,
              position: 'relative',
            }}
          >
            Take the Quiz →
          </button>
        </div>
      </div>
    );
  };

  // Test phase
  const renderTest = () => {
    const currentQ = testQuestions[currentQuestionIndex];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {!showTestResults ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: space.lg
              }}>
                <h2 style={{ fontSize: '22px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>
                  📝 Knowledge Check
                </h2>
                <span style={{
                  padding: `${space.sm} ${space.md}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.textSecondary,
                  background: colors.bgSecondary,
                  borderRadius: radius.full
                }}>
                  {currentQuestionIndex + 1} / {testQuestions.length}
                </span>
              </div>

              {/* Question navigation dots */}
              <div style={{
                display: 'flex',
                gap: space.sm,
                marginBottom: space.lg,
                justifyContent: 'center'
              }}>
                {testQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: radius.full,
                      border: 'none',
                      cursor: 'pointer',
                      background: idx === currentQuestionIndex
                        ? colors.primary
                        : testAnswers[idx] !== null
                          ? colors.success
                          : colors.bgTertiary,
                      transition: 'all 0.2s ease',
                      boxShadow: idx === currentQuestionIndex ? shadows.glow(colors.primary) : 'none',
                      zIndex: 10,
                      position: 'relative',
                    }}
                  />
                ))}
              </div>

              {/* Scenario */}
              <div style={{
                padding: space.lg,
                background: colors.bgTertiary,
                borderRadius: radius.md,
                marginBottom: space.md,
                borderLeft: `4px solid ${colors.accent}`
              }}>
                <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {currentQ.scenario}
                </p>
              </div>

              {/* Question */}
              <div style={{
                padding: space.lg,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                marginBottom: space.md
              }}>
                <p style={{ fontSize: '16px', color: colors.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                  {currentQ.question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
                {currentQ.options.map((option, idx) => {
                  const isSelected = testAnswers[currentQuestionIndex] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const newAnswers = [...testAnswers];
                        newAnswers[currentQuestionIndex] = idx;
                        setTestAnswers(newAnswers);
                      }}
                      style={{
                        padding: `${space.md} ${space.lg}`,
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? colors.textInverse : colors.textPrimary,
                        background: isSelected
                          ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                          : colors.bgSecondary,
                        border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                        borderRadius: radius.md,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: space.md,
                        zIndex: 10,
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: radius.full,
                        background: isSelected ? colors.bgPrimary : colors.bgTertiary,
                        color: isSelected ? colors.primary : colors.textTertiary,
                        fontSize: '13px',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span style={{ lineHeight: 1.4 }}>{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: space.xl,
                gap: space.md
              }}>
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: currentQuestionIndex === 0 ? colors.textTertiary : colors.textPrimary,
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  ← Previous
                </button>

                {currentQuestionIndex < testQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    style={{
                      padding: `${space.md} ${space.lg}`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: colors.textPrimary,
                      background: colors.bgSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.sm,
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative',
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const score = testAnswers.reduce((acc, answer, idx) =>
                        acc + (testQuestions[idx].options[answer as number]?.correct ? 1 : 0), 0);
                      setTestScore(score);
                      setShowTestResults(true);
                    }}
                    disabled={answeredCount < testQuestions.length}
                    style={{
                      padding: `${space.md} ${space.xl}`,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: answeredCount < testQuestions.length ? colors.textTertiary : colors.textInverse,
                      background: answeredCount < testQuestions.length
                        ? colors.bgTertiary
                        : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                      border: 'none',
                      borderRadius: radius.sm,
                      cursor: answeredCount < testQuestions.length ? 'not-allowed' : 'pointer',
                      boxShadow: answeredCount >= testQuestions.length ? shadows.sm : 'none',
                      zIndex: 10,
                      position: 'relative',
                    }}
                  >
                    Submit ({answeredCount}/{testQuestions.length})
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Test Results */}
              {renderSectionHeader('📊', 'Quiz Results', 'Review your answers and learn from any mistakes')}

              {(() => {
                const score = testAnswers.reduce((acc, answer, idx) =>
                  acc + (testQuestions[idx].options[answer as number]?.correct ? 1 : 0), 0);
                const percentage = Math.round((score / testQuestions.length) * 100);

                return (
                  <>
                    <div style={{
                      padding: space.xl,
                      background: percentage >= 70
                        ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
                        : `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`,
                      borderRadius: radius.lg,
                      border: `1px solid ${percentage >= 70 ? colors.success : colors.warning}40`,
                      textAlign: 'center',
                      marginBottom: space.xl
                    }}>
                      <div style={{ fontSize: '56px', fontWeight: 800, color: percentage >= 70 ? colors.success : colors.warning }}>
                        {percentage}%
                      </div>
                      <p style={{ fontSize: '18px', color: colors.textPrimary, margin: `${space.sm} 0 0`, fontWeight: 600 }}>
                        {score} out of {testQuestions.length} correct
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                      {testQuestions.map((q, idx) => {
                        const isCorrect = q.options[testAnswers[idx] as number]?.correct ?? false;
                        return (
                          <div key={idx} style={{
                            padding: space.lg,
                            background: colors.bgSecondary,
                            borderRadius: radius.md,
                            border: `1px solid ${isCorrect ? colors.success : colors.danger}40`
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: space.md,
                              marginBottom: space.md
                            }}>
                              <span style={{
                                fontSize: '20px',
                                color: isCorrect ? colors.success : colors.danger,
                                fontWeight: 700
                              }}>
                                {isCorrect ? '✓' : '✗'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                                  Q{idx + 1}: {q.question}
                                </p>
                                {!isCorrect && (
                                  <p style={{ fontSize: '13px', color: colors.danger, margin: `${space.sm} 0 0` }}>
                                    Your answer: {q.options[testAnswers[idx] as number]?.text}
                                  </p>
                                )}
                                <p style={{ fontSize: '13px', color: colors.success, margin: `${space.xs} 0 0`, fontWeight: 500 }}>
                                  Correct: {q.options.find(o => o.correct)?.text}
                                </p>
                              </div>
                            </div>
                            <div style={{
                              padding: space.md,
                              background: colors.bgTertiary,
                              borderRadius: radius.sm,
                              fontSize: '13px',
                              color: colors.textSecondary,
                              lineHeight: 1.6
                            }}>
                              💡 {q.explanation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
        {showTestResults && renderBottomBar(() => goToPhase('mastery'), 'Complete Module')}
      </div>
    );
  };

  // Mastery phase
  const renderMastery = () => {
    const score = testScore || testAnswers.reduce((acc, answer, idx) =>
      acc + (testQuestions[idx].options[answer as number]?.correct ? 1 : 0), 0);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: `radial-gradient(ellipse at top, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 70%)`
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          padding: isMobile ? space.lg : space.xl,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Trophy icon */}
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 32px',
            borderRadius: radius.full,
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.glow(colors.primary),
            border: `2px solid ${colors.primary}30`
          }}>
            <span style={{ fontSize: '60px' }}>🏆</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '40px',
            fontWeight: 800,
            color: colors.textPrimary,
            marginBottom: space.md,
            letterSpacing: '-1px'
          }}>
            Congratulations!
          </h1>
          <p style={{
            fontSize: '18px',
            color: colors.textSecondary,
            maxWidth: '520px',
            lineHeight: 1.7,
            marginBottom: space.xl
          }}>
            You've mastered the physics of pendulum period! You now understand why only length and gravity affect how fast a pendulum swings.
          </p>

          {/* Achievement cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: space.md,
            width: '100%',
            maxWidth: '640px',
            marginBottom: space.xl
          }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ fontSize: '36px', marginBottom: space.sm }}>📐</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: colors.primary }}>T = 2π√(L/g)</div>
              <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: space.xs }}>Period formula</div>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ fontSize: '36px', marginBottom: space.sm }}>⚖️</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: colors.success }}>Mass Cancels</div>
              <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: space.xs }}>F/m = g sin(θ)</div>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ fontSize: '36px', marginBottom: space.sm }}>🎯</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: colors.accent }}>{score}/10</div>
              <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: space.xs }}>Quiz score</div>
            </div>
          </div>

          {/* Key insights */}
          <div style={{
            padding: space.xl,
            background: colors.bgSecondary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.primary}40`,
            maxWidth: '520px',
            width: '100%'
          }}>
            <h4 style={{ fontSize: '16px', color: colors.primary, marginBottom: space.md, fontWeight: 700 }}>
              🧠 Key Insights
            </h4>
            <ul style={{
              textAlign: 'left',
              margin: 0,
              paddingLeft: space.lg,
              color: colors.textSecondary,
              fontSize: '14px',
              lineHeight: 2
            }}>
              <li>Mass cancels because gravity and inertia both scale with mass</li>
              <li>Period depends only on length (L) and gravity (g)</li>
              <li>Weaker gravity (like on the Moon) means longer period</li>
              <li>This principle enables pendulum clocks and seismographs</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: `${space.lg} ${space.xl}`,
          background: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'center'
        }}>
          {onBack && (
            <button
              onClick={() => onBack?.()}
              style={{
                padding: `${space.md} ${space.xxl}`,
                fontSize: '16px',
                fontWeight: 700,
                color: colors.textInverse,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                border: 'none',
                borderRadius: radius.md,
                cursor: 'pointer',
                boxShadow: `${shadows.md}, ${shadows.glow(colors.primary)}`,
                zIndex: 10,
                position: 'relative',
              }}
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render switch
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

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: colors.bgPrimary,
    }}>
      {renderPhase()}
    </div>
  );
};

export default PendulumPeriodRenderer;
