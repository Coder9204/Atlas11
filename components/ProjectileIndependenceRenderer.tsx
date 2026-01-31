'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Premium design system - Apple/Airbnb quality
const design = {
  colors: {
    primary: '#f97316',       // Vibrant orange
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    accent: '#22c55e',        // Fresh green
    accentLight: '#4ade80',
    accentDark: '#16a34a',
    bgPrimary: '#0a0a0f',     // Deepest background
    bgSecondary: '#12121a',   // Cards
    bgTertiary: '#1a1a24',    // Inputs, interactive elements
    bgElevated: '#22222e',    // Elevated surfaces
    textPrimary: '#fafafa',   // Primary text
    textSecondary: '#a1a1aa', // Secondary text
    textTertiary: '#71717a',  // Tertiary text
    textInverse: '#0a0a0f',   // Text on light backgrounds
    border: '#2a2a36',        // Subtle borders
    borderLight: '#3a3a48',   // Lighter borders
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },
  shadows: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 4px 16px rgba(0,0,0,0.4)',
    lg: '0 8px 32px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
  }
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

interface ProjectileIndependenceRendererProps {
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
    icon: '🏀',
    title: 'Sports: Basketball Shooting',
    tagline: 'Arc Physics for Perfect Shots',
    description: "When you shoot a basketball, the horizontal motion (toward the hoop) and vertical motion (arc) are completely independent. The ball's forward speed doesn't affect how fast it falls - only gravity does.",
    connection: "Understanding independence helps players realize they need to control two separate things: the forward push and the upward arc. The time in the air is determined solely by the vertical component.",
    howItWorks: "A shot launched at 45 degrees spends the same time in the air as one at 60 degrees if they reach the same maximum height. Horizontal speed just determines how far the ball travels during that time.",
    stats: [
      { value: '45 deg', label: 'optimal angle (no rim)', icon: '📐' },
      { value: '50-55 deg', label: 'actual shot angle', icon: '🎯' },
      { value: '7.2m/s', label: 'typical release speed', icon: '🚀' }
    ],
    examples: ['Free throw arc analysis', 'Three-point shooting', 'Alley-oop timing', 'Bank shot geometry'],
    companies: ['NBA', 'FIBA', 'ShotTracker', 'Noah Basketball'],
    color: design.colors.primary
  },
  {
    icon: '🎯',
    title: 'Artillery: Ballistic Calculations',
    tagline: 'Independent Axes for Precise Targeting',
    description: "Artillery crews calculate trajectories by treating horizontal range and vertical drop as completely separate problems. The shell maintains its horizontal velocity while gravity pulls it down independently.",
    connection: "Because the motions are independent, artillery computers can calculate time-of-flight from vertical equations alone, then use that time to find horizontal range. Wind corrections are added as a third independent component.",
    howItWorks: "For a shell fired at angle theta with velocity v: Time to peak = v*sin(theta)/g. Total flight time = 2 times that. Horizontal range = v*cos(theta) times total time.",
    stats: [
      { value: '800m/s', label: 'muzzle velocity', icon: '💨' },
      { value: '45 deg', label: 'max range angle', icon: '📐' },
      { value: '30km', label: 'typical range', icon: '📏' }
    ],
    examples: ['Howitzer targeting', 'Naval gunfire', 'Mortar calculations', 'Anti-aircraft ranging'],
    companies: ['Raytheon', 'BAE Systems', 'Lockheed Martin', 'General Dynamics'],
    color: '#8b5cf6'
  },
  {
    icon: '🎮',
    title: 'Video Games: Physics Engines',
    tagline: 'Realistic Projectile Simulation',
    description: "Game physics engines simulate projectile motion by updating x and y positions separately each frame. This independence makes the code simple and efficient while producing realistic arcs.",
    connection: "Every frame, the engine adds horizontal velocity to x position (constant) and adds vertical velocity to y position after subtracting gravity. The two calculations never interact - pure independence!",
    howItWorks: "Each frame: x += vx * dt (constant velocity). y += vy * dt, then vy -= g * dt (gravity). This simple separation creates perfect parabolic arcs for arrows, grenades, and projectiles.",
    stats: [
      { value: '60 FPS', label: 'typical update rate', icon: '🖥️' },
      { value: '16.7ms', label: 'per frame', icon: '⏱️' },
      { value: '2 axes', label: 'independent calcs', icon: '📊' }
    ],
    examples: ['Angry Birds trajectories', 'Fortnite grenades', 'Call of Duty bullets', 'Portal physics'],
    companies: ['Unity', 'Unreal Engine', 'Havok', 'PhysX'],
    color: '#f59e0b'
  },
  {
    icon: '🚀',
    title: 'Spacecraft: Orbital Mechanics',
    tagline: 'Independence at Cosmic Scales',
    description: "Spacecraft exploit motion independence: horizontal thrust puts them in orbit while gravity pulls them down. At orbital velocity, the 'falling' matches Earth's curvature - continuous free fall around the planet.",
    connection: "Independence means rockets can be analyzed as horizontal acceleration (thrust) and vertical acceleration (gravity) separately. Orbit is achieved when horizontal velocity is so great that falling matches Earth's curve.",
    howItWorks: "At orbital altitude, gravity causes ~9 m/s squared downward acceleration. At ~7.8 km/s horizontal velocity, falling 9 meters in a second matches Earth's curvature - you never get closer to the ground!",
    stats: [
      { value: '7.8km/s', label: 'LEO velocity', icon: '🛰️' },
      { value: '90min', label: 'orbital period', icon: '⏰' },
      { value: '400km', label: 'ISS altitude', icon: '📍' }
    ],
    examples: ['ISS orbital insertion', 'Satellite deployment', 'Ballistic missile trajectory', 'Space station resupply'],
    companies: ['SpaceX', 'NASA', 'Boeing', 'Rocket Lab'],
    color: '#ec4899'
  }
];

// Test questions with scenarios - 10 questions with correct: true
const testQuestions = [
  {
    scenario: "You're standing on a cliff edge with two identical balls. You drop one straight down and throw the other horizontally at the same instant.",
    question: "Which ball hits the water below first?",
    options: [
      { text: "The dropped ball - it takes the direct path", correct: false },
      { text: "The thrown ball - horizontal speed adds to total speed", correct: false },
      { text: "They hit at exactly the same time", correct: true },
      { text: "The thrown ball - it has more energy", correct: false }
    ],
    explanation: "Both balls hit at exactly the same time! The horizontal and vertical motions are completely independent. Both experience the same gravitational acceleration and fall the same vertical distance, so they take the same time regardless of horizontal velocity."
  },
  {
    scenario: "An airplane flying at 200 m/s releases a supply crate from 500m altitude.",
    question: "How does the crate move immediately after release (ignoring air resistance)?",
    options: [
      { text: "Falls straight down since it's no longer pushed by the plane", correct: false },
      { text: "Continues at 200 m/s horizontally while also accelerating downward at g", correct: true },
      { text: "Slows down horizontally as it falls", correct: false },
      { text: "Arcs backward relative to the plane", correct: false }
    ],
    explanation: "The crate maintains its 200 m/s horizontal velocity (Newton's first law - no horizontal forces to change it) while simultaneously accelerating downward at g. These motions are independent. The crate stays directly below the plane!"
  },
  {
    scenario: "A cannonball is fired horizontally from a tower. At the same instant, another cannonball is dropped from the same height.",
    question: "If the fired cannonball has twice the initial horizontal speed, how does this affect when it lands?",
    options: [
      { text: "It lands twice as fast", correct: false },
      { text: "It lands at the same time but twice as far", correct: true },
      { text: "It lands later because it travels farther", correct: false },
      { text: "It lands sooner because it has more kinetic energy", correct: false }
    ],
    explanation: "Doubling horizontal speed has zero effect on landing time (vertical motion is independent) but exactly doubles the horizontal distance traveled. Time is determined only by height and gravity: t = sqrt(2h/g)."
  },
  {
    scenario: "A baseball is thrown at 30 m/s at a 30 degree angle above horizontal.",
    question: "What are the independent velocity components at launch?",
    options: [
      { text: "Horizontal: 30 m/s, Vertical: 0 m/s", correct: false },
      { text: "Horizontal: 15 m/s, Vertical: 15 m/s", correct: false },
      { text: "Horizontal: 26 m/s, Vertical: 15 m/s", correct: true },
      { text: "Horizontal: 15 m/s, Vertical: 26 m/s", correct: false }
    ],
    explanation: "Using trigonometry: Horizontal = 30*cos(30) = 30*0.866 = 26 m/s. Vertical = 30*sin(30) = 30*0.5 = 15 m/s. These components evolve independently - horizontal stays constant while vertical changes due to gravity."
  },
  {
    scenario: "A monkey hangs from a branch. A hunter aims directly at the monkey and fires. The monkey, seeing the gun fire, drops from the branch at the exact instant the bullet leaves the gun.",
    question: "What happens? (Ignore air resistance)",
    options: [
      { text: "The bullet passes over the monkey - it aimed where the monkey was", correct: false },
      { text: "The bullet passes under the monkey - gravity affects only the bullet", correct: false },
      { text: "The bullet hits the monkey - both fall the same amount during flight", correct: true },
      { text: "It depends on the bullet's speed", correct: false }
    ],
    explanation: "The bullet hits the monkey! Both the bullet and monkey are accelerated downward by gravity equally. Whatever distance the monkey falls during the bullet's flight time, the bullet falls by exactly the same amount (starting from the aimed path). This is the famous 'monkey and hunter' problem!"
  },
  {
    scenario: "On the Moon (gravity = 1.6 m/s squared), you throw a ball horizontally at 10 m/s from a 20m cliff.",
    question: "Compared to Earth (g = 10 m/s squared), how does the Moon affect the trajectory?",
    options: [
      { text: "Ball goes same distance but takes longer to land", correct: false },
      { text: "Ball goes farther and takes longer to land", correct: true },
      { text: "Ball goes farther but takes the same time", correct: false },
      { text: "Ball goes same distance but lands sooner", correct: false }
    ],
    explanation: "On Moon: t = sqrt(2*20/1.6) = 5s. Distance = 10*5 = 50m. On Earth: t = sqrt(2*20/10) = 2s. Distance = 10*2 = 20m. Lower gravity means more time in the air (vertical), and same horizontal speed means more distance. Moon ball travels 2.5x farther and takes 2.5x longer."
  },
  {
    scenario: "A car drives off a cliff at 20 m/s. The cliff is 45m high.",
    question: "How far from the base of the cliff does the car land?",
    options: [
      { text: "20 meters", correct: false },
      { text: "45 meters", correct: false },
      { text: "60 meters", correct: true },
      { text: "90 meters", correct: false }
    ],
    explanation: "First find time: t = sqrt(2h/g) = sqrt(90/10) = 3 seconds. Then horizontal distance = v*t = 20*3 = 60 meters. The car's horizontal speed stays constant at 20 m/s while it falls for 3 seconds."
  },
  {
    scenario: "A projectile is at the peak of its trajectory (highest point).",
    question: "At this exact moment, what are the velocity components?",
    options: [
      { text: "Both horizontal and vertical velocity are zero", correct: false },
      { text: "Horizontal velocity is zero, vertical velocity is maximum", correct: false },
      { text: "Horizontal velocity is unchanged, vertical velocity is zero", correct: true },
      { text: "Both are at their minimum non-zero values", correct: false }
    ],
    explanation: "At the peak, only the vertical velocity has become zero (it changed from positive to negative). The horizontal velocity never changes (no horizontal forces) and maintains its original value. The projectile is still moving horizontally at full speed!"
  },
  {
    scenario: "Two projectiles are launched at the same speed but different angles: 30 degrees and 60 degrees.",
    question: "Ignoring air resistance, which lands farther from the launch point?",
    options: [
      { text: "The 30 degree projectile - lower angle means more horizontal speed", correct: false },
      { text: "The 60 degree projectile - higher arc means more time in air", correct: false },
      { text: "They land at the same distance", correct: true },
      { text: "Cannot determine without knowing the speed", correct: false }
    ],
    explanation: "They land at the same distance! This is the 'complementary angle' property of projectile motion. Range = v squared * sin(2*theta)/g. Since sin(60) = sin(120) = sin(180-60), angles that sum to 90 degrees give equal range. 30 and 60 are complementary."
  },
  {
    scenario: "A ball is thrown horizontally from a moving train at 10 m/s relative to the train. The train moves at 30 m/s relative to the ground.",
    question: "What is the ball's horizontal velocity relative to the ground (in the direction of train motion)?",
    options: [
      { text: "10 m/s", correct: false },
      { text: "20 m/s", correct: false },
      { text: "30 m/s", correct: false },
      { text: "40 m/s", correct: true }
    ],
    explanation: "Velocities add! If the ball is thrown forward relative to the train: 30 m/s (train) + 10 m/s (throw) = 40 m/s relative to ground. If thrown backward, it would be 20 m/s. This still demonstrates independence - the vertical motion (falling) is unaffected by this 40 m/s horizontal velocity."
  }
];

const ProjectileIndependenceRenderer: React.FC<ProjectileIndependenceRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(testQuestions.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [droppedBall, setDroppedBall] = useState({ x: 100, y: 50, vy: 0 });
  const [thrownBall, setThrownBall] = useState({ x: 100, y: 50, vx: 100, vy: 0 });
  const [time, setTime] = useState(0);
  const [horizontalSpeed, setHorizontalSpeed] = useState(100);
  const [cliffHeight, setCliffHeight] = useState(200);
  const [showTrails, setShowTrails] = useState(true);
  const [droppedLanded, setDroppedLanded] = useState(false);
  const [thrownLanded, setThrownLanded] = useState(false);
  const [trails, setTrails] = useState<{dropped: {x: number, y: number}[], thrown: {x: number, y: number}[]}>({ dropped: [], thrown: [] });

  // Twist: air resistance mode
  const [airResistance, setAirResistance] = useState(false);

  const animationRef = useRef<number | null>(null);

  const isMobile = width < 600;

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

  // Reset simulation when entering twist_play phase
  useEffect(() => {
    if (phase === 'twist_play') {
      setAirResistance(false);
      resetSimulation();
    }
  }, [phase]);

  // Emit mastery event when reaching mastery phase
  useEffect(() => {
    if (phase === 'mastery') {
      emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length });
    }
  }, [phase, testScore, emitEvent]);

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
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Get current phase index
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // Physics simulation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const g = 500; // pixels/s squared (scaled for visual)
    const airDrag = airResistance ? 0.02 : 0;
    let lastTime = performance.now();
    let simTime = 0;

    const groundY = 50 + cliffHeight;
    let dropped = { ...droppedBall };
    let thrown = { ...thrownBall };
    let droppedDone = false;
    let thrownDone = false;
    const newTrails = { dropped: [] as {x: number, y: number}[], thrown: [] as {x: number, y: number}[] };

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      simTime += dt;

      // Update dropped ball
      if (!droppedDone) {
        dropped.vy += g * dt;
        if (airResistance) dropped.vy *= (1 - airDrag);
        dropped.y += dropped.vy * dt;
        newTrails.dropped.push({ x: dropped.x, y: dropped.y });

        if (dropped.y >= groundY) {
          dropped.y = groundY;
          droppedDone = true;
          setDroppedLanded(true);
        }
      }

      // Update thrown ball
      if (!thrownDone) {
        thrown.vy += g * dt;
        if (airResistance) {
          thrown.vy *= (1 - airDrag);
          thrown.vx *= (1 - airDrag * 0.5);
        }
        thrown.x += thrown.vx * dt;
        thrown.y += thrown.vy * dt;
        newTrails.thrown.push({ x: thrown.x, y: thrown.y });

        if (thrown.y >= groundY) {
          thrown.y = groundY;
          thrownDone = true;
          setThrownLanded(true);
        }
      }

      setDroppedBall({ ...dropped });
      setThrownBall({ ...thrown });
      setTime(simTime);
      setTrails({ ...newTrails });

      if (droppedDone && thrownDone) {
        setIsSimulating(false);
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
  }, [isSimulating, cliffHeight, airResistance, droppedBall, thrownBall]);

  const startSimulation = useCallback(() => {
    setDroppedBall({ x: 100, y: 50, vy: 0 });
    setThrownBall({ x: 100, y: 50, vx: horizontalSpeed, vy: 0 });
    setTime(0);
    setDroppedLanded(false);
    setThrownLanded(false);
    setTrails({ dropped: [], thrown: [] });
    setIsSimulating(true);
    emitEvent('simulation_started');
  }, [horizontalSpeed, emitEvent]);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setDroppedBall({ x: 100, y: 50, vy: 0 });
    setThrownBall({ x: 100, y: 50, vx: horizontalSpeed, vy: 0 });
    setTime(0);
    setDroppedLanded(false);
    setThrownLanded(false);
    setTrails({ dropped: [], thrown: [] });
  }, [horizontalSpeed]);

  // Helper function: Progress bar
  const renderProgressBar = () => {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: `${design.space.md}px ${design.space.lg}px`,
        background: design.colors.bgSecondary,
        borderBottom: `1px solid ${design.colors.border}`
      }}>
        {phaseOrder.map((p, idx) => (
          <div
            key={p}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: idx <= currentPhaseIndex ? design.colors.primary : design.colors.bgTertiary,
              transition: 'background 0.3s ease'
            }}
          />
        ))}
        <span style={{
          marginLeft: `${design.space.md}px`,
          fontSize: '12px',
          color: design.colors.textSecondary,
          fontWeight: 500
        }}>
          {currentPhaseIndex + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Helper function: Bottom bar
  const renderBottomBar = (onNext: () => void, nextLabel: string = 'Continue', disabled: boolean = false) => {
    return (
      <div style={{
        padding: `${design.space.lg}px ${design.space.xl}px`,
        background: design.colors.bgSecondary,
        borderTop: `1px solid ${design.colors.border}`,
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={onNext}
          disabled={disabled}
          style={{
            padding: `${design.space.md}px ${design.space.xl}px`,
            fontSize: '15px',
            fontWeight: 600,
            color: design.colors.textInverse,
            background: disabled ? design.colors.bgTertiary : design.colors.primary,
            border: 'none',
            borderRadius: `${design.radius.md}px`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            boxShadow: disabled ? 'none' : design.shadows.sm,
            zIndex: 10,
            position: 'relative'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Helper function: Section header
  const renderSectionHeader = (icon: string, title: string, subtitle?: string) => {
    return (
      <div style={{ marginBottom: `${design.space.xl}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${design.space.md}px`, marginBottom: `${design.space.sm}px` }}>
          <span style={{ fontSize: '28px' }}>{icon}</span>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: design.colors.textPrimary,
            margin: 0
          }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{
            fontSize: '15px',
            color: design.colors.textSecondary,
            margin: 0,
            lineHeight: 1.6
          }}>
            {subtitle}
          </p>
        )}
      </div>
    );
  };

  // Helper function: Key takeaway box
  const renderKeyTakeaway = (text: string) => {
    return (
      <div style={{
        padding: `${design.space.xl}px`,
        background: `linear-gradient(135deg, ${design.colors.primary}15, ${design.colors.accent}10)`,
        borderRadius: `${design.radius.lg}px`,
        border: `1px solid ${design.colors.primary}30`,
        marginTop: `${design.space.xl}px`
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: `${design.space.md}px` }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: design.colors.primary,
              marginBottom: `${design.space.xs}px`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Key Takeaway
            </div>
            <p style={{
              fontSize: '15px',
              color: design.colors.textPrimary,
              margin: 0,
              lineHeight: 1.6
            }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render projectile simulation
  const renderSimulation = (showControls: boolean = true) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = 300;
    const groundY = 50 + cliffHeight;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${design.space.lg}px` }}>
        <svg width={svgWidth} height={svgHeight} style={{
          background: design.colors.bgTertiary,
          borderRadius: `${design.radius.lg}px`,
          border: `1px solid ${design.colors.border}`
        }}>
          {/* Sky gradient */}
          <defs>
            <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor={design.colors.bgSecondary} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={svgWidth} height={groundY} fill="url(#sky)" />

          {/* Ground */}
          <rect x="0" y={groundY} width={svgWidth} height={svgHeight - groundY} fill="#1e4d3d" />

          {/* Cliff/table */}
          <rect x="0" y="0" width="120" height={groundY} fill={design.colors.bgSecondary} stroke={design.colors.border} strokeWidth="2" />

          {/* Trails */}
          {showTrails && trails.dropped.length > 1 && (
            <polyline
              points={trails.dropped.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={design.colors.error}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.7"
            />
          )}
          {showTrails && trails.thrown.length > 1 && (
            <polyline
              points={trails.thrown.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={design.colors.accent}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.7"
            />
          )}

          {/* Dropped ball (red) */}
          <circle cx={droppedBall.x} cy={Math.min(droppedBall.y, groundY)} r="12" fill={design.colors.error} stroke={design.colors.textPrimary} strokeWidth="2" />
          <text x={droppedBall.x - 20} y={Math.min(droppedBall.y, groundY) - 18} fill={design.colors.error} fontSize="11" fontWeight="bold">
            Dropped
          </text>

          {/* Thrown ball (green) */}
          <circle cx={thrownBall.x} cy={Math.min(thrownBall.y, groundY)} r="12" fill={design.colors.accent} stroke={design.colors.textPrimary} strokeWidth="2" />
          <text x={thrownBall.x - 15} y={Math.min(thrownBall.y, groundY) - 18} fill={design.colors.accent} fontSize="11" fontWeight="bold">
            Thrown
          </text>

          {/* Velocity arrow for thrown ball */}
          {!isSimulating && (
            <line
              x1={thrownBall.x + 15}
              y1={thrownBall.y}
              x2={thrownBall.x + 15 + horizontalSpeed * 0.4}
              y2={thrownBall.y}
              stroke={design.colors.accent}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          )}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={design.colors.accent} />
            </marker>
          </defs>

          {/* Time display */}
          <text x="10" y="25" fill={design.colors.textPrimary} fontSize="14" fontWeight="bold">
            t = {time.toFixed(2)}s
          </text>

          {/* Landing indicators */}
          {droppedLanded && (
            <text x={droppedBall.x - 10} y={groundY + 20} fill={design.colors.error} fontSize="11">
              Landed
            </text>
          )}
          {thrownLanded && (
            <text x={thrownBall.x - 10} y={groundY + 35} fill={design.colors.accent} fontSize="11">
              Landed at x={Math.round(thrownBall.x)}
            </text>
          )}

          {/* Height indicator */}
          <line x1="125" y1="50" x2="125" y2={groundY} stroke={design.colors.textTertiary} strokeDasharray="4,4" />
          <text x="130" y={50 + cliffHeight / 2} fill={design.colors.textTertiary} fontSize="11">
            h = {cliffHeight}px
          </text>
        </svg>

        {showControls && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${design.space.md}px`, width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: `${design.space.md}px` }}>
              <span style={{ fontSize: '13px', color: design.colors.textSecondary, minWidth: '120px' }}>Horizontal speed:</span>
              <input
                type="range"
                min="50"
                max="200"
                value={horizontalSpeed}
                onChange={(e) => {
                  setHorizontalSpeed(Number(e.target.value));
                  resetSimulation();
                }}
                style={{ flex: 1, accentColor: design.colors.primary }}
              />
              <span style={{ fontSize: '13px', color: design.colors.textPrimary, minWidth: '50px' }}>
                {horizontalSpeed}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: `${design.space.md}px` }}>
              <span style={{ fontSize: '13px', color: design.colors.textSecondary, minWidth: '120px' }}>Cliff height:</span>
              <input
                type="range"
                min="100"
                max="220"
                value={cliffHeight}
                onChange={(e) => {
                  setCliffHeight(Number(e.target.value));
                  resetSimulation();
                }}
                style={{ flex: 1, accentColor: design.colors.primary }}
              />
              <span style={{ fontSize: '13px', color: design.colors.textPrimary, minWidth: '50px' }}>
                {cliffHeight}
              </span>
            </div>

            <div style={{ display: 'flex', gap: `${design.space.sm}px` }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: `${design.space.sm}px`,
                padding: `${design.space.sm}px ${design.space.lg}px`,
                background: design.colors.bgSecondary,
                borderRadius: `${design.radius.sm}px`,
                cursor: 'pointer',
                fontSize: '13px',
                color: design.colors.textSecondary,
                border: `1px solid ${design.colors.border}`
              }}>
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(e) => setShowTrails(e.target.checked)}
                  style={{ accentColor: design.colors.primary }}
                />
                Show trails
              </label>
            </div>

            <div style={{ display: 'flex', gap: `${design.space.sm}px` }}>
              <button
                onClick={isSimulating ? resetSimulation : startSimulation}
                style={{
                  flex: 1,
                  padding: `${design.space.md}px`,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: design.colors.textPrimary,
                  background: isSimulating ? design.colors.error : design.colors.primary,
                  border: 'none',
                  borderRadius: `${design.radius.md}px`,
                  cursor: 'pointer',
                  boxShadow: design.shadows.sm,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {isSimulating ? 'Reset' : 'Drop Both Balls'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Phase: Hook - Premium welcome screen
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-green-200 bg-clip-text text-transparent">
        Independence of Motion
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how horizontal and vertical motion work independently in projectiles
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-green-500/5 rounded-3xl" />

        <div className="relative">
          <p className="text-xl text-white/90 font-medium leading-relaxed mb-6">
            Imagine standing at the edge of a table with two identical balls. At the exact same moment, you <span className="text-red-400 font-semibold">drop</span> one straight down and <span className="text-green-400 font-semibold">throw</span> the other horizontally.
          </p>

          <div className="flex gap-6 justify-center mb-6">
            <div className="bg-slate-800/60 rounded-xl p-4 border-2 border-red-500/50">
              <span className="text-4xl">Ball A</span>
              <p className="text-sm text-red-400 mt-2 font-semibold">Dropped</p>
              <p className="text-xs text-slate-500">Straight down</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border-2 border-green-500/50">
              <span className="text-4xl">Ball B</span>
              <p className="text-sm text-green-400 mt-2 font-semibold">Thrown</p>
              <p className="text-xs text-slate-500">Horizontally</p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-lg text-orange-400 font-semibold">
              Which ball hits the ground first?
            </p>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-green-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ zIndex: 10, position: 'relative' }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Make Your Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400">*</span>
          10 Phases
        </div>
      </div>
    </div>
  );

  // Phase: Predict
  const renderPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: design.colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? `${design.space.xl}px` : `${design.space.xxl}px`, overflowY: 'auto' }}>
        {renderSectionHeader('🤔', 'Your Prediction', 'A ball dropped vs a ball thrown horizontally from the same height...')}

        <div style={{
          padding: `${design.space.xl}px`,
          background: design.colors.bgTertiary,
          borderRadius: `${design.radius.lg}px`,
          border: `1px solid ${design.colors.border}`,
          marginBottom: `${design.space.xl}px`
        }}>
          <p style={{ fontSize: '15px', color: design.colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Both balls are released at the exact same instant from the same height. One is simply dropped (no initial velocity), while the other is thrown horizontally with some speed. Which one reaches the ground first?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${design.space.md}px`,
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          {[
            { id: 'dropped', label: 'Dropped ball lands first (shorter path)', icon: 'A' },
            { id: 'thrown', label: 'Thrown ball lands first (more speed = faster)', icon: 'B' },
            { id: 'same', label: 'Both land at the same time', icon: 'C' },
            { id: 'depends', label: 'Depends on how hard you throw', icon: 'D' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => {
                setPrediction(option.id);
                emitEvent('prediction_made', { prediction: option.id });
              }}
              style={{
                padding: `${design.space.lg}px ${design.space.xl}px`,
                fontSize: '15px',
                color: prediction === option.id ? design.colors.textInverse : design.colors.textPrimary,
                background: prediction === option.id ? design.colors.primary : design.colors.bgSecondary,
                border: `2px solid ${prediction === option.id ? design.colors.primary : design.colors.border}`,
                borderRadius: `${design.radius.lg}px`,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: `${design.space.md}px`,
                transition: 'all 0.2s ease',
                boxShadow: prediction === option.id ? design.shadows.sm : 'none',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: prediction === option.id ? design.colors.bgPrimary : design.colors.bgTertiary,
                borderRadius: '50%',
                color: prediction === option.id ? design.colors.primary : design.colors.textSecondary
              }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: `${design.space.xl}px`,
          padding: `${design.space.lg}px`,
          background: design.colors.bgTertiary,
          borderRadius: `${design.radius.lg}px`,
          border: `1px solid ${design.colors.border}`
        }}>
          <p style={{ fontSize: '14px', color: design.colors.textSecondary, margin: 0 }}>
            <strong style={{ color: design.colors.textPrimary }}>Think about:</strong> The thrown ball travels a longer curved path. The dropped ball goes straight down. Does path length matter for landing time?
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('play'), 'Test It!', !prediction)}
    </div>
  );

  // Phase: Play
  const renderPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: design.colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? `${design.space.lg}px` : `${design.space.xl}px`, overflowY: 'auto' }}>
        {renderSectionHeader('🔬', 'Experiment', 'Drop and throw simultaneously - watch which lands first')}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: `${design.space.xl}px`, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {renderSimulation(true)}
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `1px solid ${design.colors.border}`,
              marginBottom: `${design.space.lg}px`
            }}>
              <h4 style={{ fontSize: '15px', color: design.colors.primary, marginBottom: `${design.space.md}px`, fontWeight: 600 }}>
                Try This:
              </h4>
              <ol style={{ margin: 0, paddingLeft: '20px', color: design.colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
                <li>Click "Drop Both Balls"</li>
                <li>Watch which lands first</li>
                <li>Change horizontal speed - try 50, 100, 200</li>
                <li>Does speed affect landing time?</li>
              </ol>
            </div>

            <div style={{
              padding: `${design.space.lg}px`,
              background: droppedLanded && thrownLanded ? `${design.colors.success}15` : design.colors.bgTertiary,
              borderRadius: `${design.radius.md}px`,
              border: `1px solid ${droppedLanded && thrownLanded ? design.colors.success : design.colors.border}`
            }}>
              <h4 style={{ fontSize: '14px', color: design.colors.textPrimary, marginBottom: `${design.space.sm}px` }}>Results:</h4>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                {!droppedLanded && !thrownLanded && 'Click "Drop Both Balls" to start'}
                {droppedLanded && !thrownLanded && 'Dropped ball landed! Waiting for thrown...'}
                {!droppedLanded && thrownLanded && 'Thrown ball landed! Waiting for dropped...'}
                {droppedLanded && thrownLanded && (
                  <>
                    <strong style={{ color: design.colors.success }}>Both landed at t = {time.toFixed(2)}s!</strong><br />
                    Thrown ball traveled {Math.round(thrownBall.x - 100)} pixels horizontally.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('review'), 'See Why')}
    </div>
  );

  // Phase: Review
  const renderReview = () => {
    const wasCorrect = prediction === 'same';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.xl}px` : `${design.space.xxl}px`, overflowY: 'auto' }}>
          <div style={{
            padding: `${design.space.xl}px`,
            background: wasCorrect ? `${design.colors.success}15` : `${design.colors.primary}15`,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${wasCorrect ? design.colors.success : design.colors.primary}40`,
            marginBottom: `${design.space.xl}px`,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px' }}>{wasCorrect ? '!' : '!'}</span>
            <h3 style={{
              fontSize: '20px',
              color: wasCorrect ? design.colors.success : design.colors.primary,
              marginTop: `${design.space.md}px`,
              fontWeight: 600
            }}>
              {wasCorrect ? 'Correct! They land simultaneously!' : 'Surprise! They land at the same time!'}
            </h3>
          </div>

          {renderSectionHeader('📚', 'Independence of Motion', 'Horizontal and vertical motions do not affect each other')}

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: `${design.space.lg}px`,
            marginBottom: `${design.space.xl}px`
          }}>
            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `2px solid ${design.colors.error}`
            }}>
              <h4 style={{ fontSize: '15px', color: design.colors.error, marginBottom: `${design.space.md}px`, display: 'flex', alignItems: 'center', gap: `${design.space.sm}px` }}>
                <span>Y</span> Vertical Motion
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: design.colors.textPrimary }}>Only gravity acts vertically</strong><br />
                - Starts with vy = 0<br />
                - Accelerates at g = 9.8 m/s squared<br />
                - Position: y = v0y*t - (1/2)*g*t squared<br />
                <em>This is identical for both balls!</em>
              </p>
            </div>

            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `2px solid ${design.colors.accent}`
            }}>
              <h4 style={{ fontSize: '15px', color: design.colors.accent, marginBottom: `${design.space.md}px`, display: 'flex', alignItems: 'center', gap: `${design.space.sm}px` }}>
                <span>X</span> Horizontal Motion
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: design.colors.textPrimary }}>No horizontal forces</strong><br />
                - Dropped ball: vx = 0<br />
                - Thrown ball: vx = constant<br />
                - Position: x = v0x*t<br />
                <em>Horizontal speed does NOT affect falling!</em>
              </p>
            </div>
          </div>

          <div style={{
            padding: `${design.space.xl}px`,
            background: design.colors.bgTertiary,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${design.colors.primary}30`,
            marginBottom: `${design.space.xl}px`
          }}>
            <h4 style={{ fontSize: '16px', color: design.colors.textPrimary, marginBottom: `${design.space.lg}px`, textAlign: 'center' }}>
              The Key Equations
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: `${design.space.lg}px`
            }}>
              <div style={{
                padding: `${design.space.lg}px`,
                background: design.colors.bgPrimary,
                borderRadius: `${design.radius.md}px`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: design.colors.error, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>VERTICAL (same for both)</div>
                <div style={{ fontSize: '16px', color: design.colors.textPrimary, fontFamily: 'monospace' }}>
                  y = v0y*t - (1/2)*g*t squared
                </div>
              </div>
              <div style={{
                padding: `${design.space.lg}px`,
                background: design.colors.bgPrimary,
                borderRadius: `${design.radius.md}px`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: design.colors.accent, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>HORIZONTAL (independent)</div>
                <div style={{ fontSize: '16px', color: design.colors.textPrimary, fontFamily: 'monospace' }}>
                  x = v0x * t
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary, marginTop: `${design.space.lg}px`, textAlign: 'center' }}>
              Notice: <strong style={{ color: design.colors.textPrimary }}>vx does not appear in the y equation!</strong> They are completely independent.
            </p>
          </div>

          {renderKeyTakeaway('The horizontal and vertical components of motion are completely independent. Gravity only affects vertical motion. No matter how fast something moves horizontally, it falls at exactly the same rate as if it were dropped.')}
        </div>
        {renderBottomBar(() => goToPhase('twist_predict'), 'Explore the Twist')}
      </div>
    );
  };

  // Phase: Twist Predict
  const renderTwistPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: design.colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? `${design.space.xl}px` : `${design.space.xxl}px`, overflowY: 'auto' }}>
        {renderSectionHeader('🌀', 'The Twist: Bullet vs Dropped Bullet', 'A classic physics thought experiment')}

        <div style={{
          padding: `${design.space.xl}px`,
          background: design.colors.bgTertiary,
          borderRadius: `${design.radius.lg}px`,
          border: `1px solid ${design.colors.border}`,
          marginBottom: `${design.space.xl}px`
        }}>
          <p style={{ fontSize: '15px', color: design.colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Imagine you hold a bullet horizontally at shoulder height. At the exact same instant, you <strong style={{ color: design.colors.textPrimary }}>fire an identical bullet horizontally</strong> from a gun at the same height. The fired bullet travels at 400 m/s! Which bullet hits the ground first?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${design.space.md}px`,
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          {[
            { id: 'dropped_first', label: 'Dropped bullet lands first (direct path)', icon: 'A' },
            { id: 'fired_first', label: 'Fired bullet lands first (more energy)', icon: 'B' },
            { id: 'same_time', label: 'Both hit the ground at the same time', icon: 'C' },
            { id: 'fired_never', label: 'Fired bullet goes too fast to fall', icon: 'D' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => {
                setTwistPrediction(option.id);
                emitEvent('twist_prediction_made', { prediction: option.id });
              }}
              style={{
                padding: `${design.space.lg}px ${design.space.xl}px`,
                fontSize: '15px',
                color: twistPrediction === option.id ? design.colors.textInverse : design.colors.textPrimary,
                background: twistPrediction === option.id ? design.colors.accent : design.colors.bgSecondary,
                border: `2px solid ${twistPrediction === option.id ? design.colors.accent : design.colors.border}`,
                borderRadius: `${design.radius.lg}px`,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: `${design.space.md}px`,
                transition: 'all 0.2s ease',
                boxShadow: twistPrediction === option.id ? design.shadows.sm : 'none',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: twistPrediction === option.id ? design.colors.bgPrimary : design.colors.bgTertiary,
                borderRadius: '50%',
                color: twistPrediction === option.id ? design.colors.accent : design.colors.textSecondary
              }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: `${design.space.xl}px`,
          padding: `${design.space.lg}px`,
          background: `${design.colors.warning}15`,
          borderRadius: `${design.radius.lg}px`,
          border: `1px solid ${design.colors.warning}30`
        }}>
          <p style={{ fontSize: '14px', color: design.colors.textSecondary, margin: 0 }}>
            <strong style={{ color: design.colors.warning }}>Think about:</strong> The fired bullet is moving at 400 m/s horizontally - incredibly fast! Does this extreme horizontal speed change how fast gravity pulls it down?
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('twist_play'), 'See the Experiment', !twistPrediction)}
    </div>
  );

  // Phase: Twist Play
  const renderTwistPlay = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.lg}px` : `${design.space.xl}px`, overflowY: 'auto' }}>
          {renderSectionHeader('🔬', 'Bullet Comparison', 'Watch a horizontal bullet vs a dropped bullet')}

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            gap: `${design.space.md}px`,
            marginBottom: `${design.space.xl}px`,
            justifyContent: 'center'
          }}>
            <button
              onClick={() => { setAirResistance(false); resetSimulation(); }}
              style={{
                padding: `${design.space.md}px ${design.space.xl}px`,
                fontSize: '14px',
                fontWeight: 600,
                color: !airResistance ? design.colors.textInverse : design.colors.textSecondary,
                background: !airResistance ? design.colors.primary : design.colors.bgSecondary,
                border: `2px solid ${!airResistance ? design.colors.primary : design.colors.border}`,
                borderRadius: `${design.radius.md}px`,
                cursor: 'pointer',
                zIndex: 10,
                position: 'relative'
              }}
            >
              Vacuum (Ideal)
            </button>
            <button
              onClick={() => { setAirResistance(true); resetSimulation(); }}
              style={{
                padding: `${design.space.md}px ${design.space.xl}px`,
                fontSize: '14px',
                fontWeight: 600,
                color: airResistance ? design.colors.textInverse : design.colors.textSecondary,
                background: airResistance ? design.colors.accent : design.colors.bgSecondary,
                border: `2px solid ${airResistance ? design.colors.accent : design.colors.border}`,
                borderRadius: `${design.radius.md}px`,
                cursor: 'pointer',
                zIndex: 10,
                position: 'relative'
              }}
            >
              With Air Resistance
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: `${design.space.xl}px`, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {renderSimulation(true)}
            </div>

            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{
                padding: `${design.space.xl}px`,
                background: design.colors.bgSecondary,
                borderRadius: `${design.radius.lg}px`,
                border: `1px solid ${design.colors.border}`,
                marginBottom: `${design.space.lg}px`
              }}>
                <h4 style={{ fontSize: '15px', color: design.colors.accent, marginBottom: `${design.space.md}px`, fontWeight: 600 }}>
                  Try Both Modes:
                </h4>
                <ol style={{ margin: 0, paddingLeft: '20px', color: design.colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
                  <li>Run in Vacuum mode first</li>
                  <li>Note when both land</li>
                  <li>Switch to Air Resistance mode</li>
                  <li>Compare the difference!</li>
                </ol>
              </div>

              <div style={{
                padding: `${design.space.lg}px`,
                background: airResistance ? `${design.colors.warning}15` : design.colors.bgTertiary,
                borderRadius: `${design.radius.md}px`,
                border: `1px solid ${airResistance ? design.colors.warning : design.colors.border}`
              }}>
                <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: design.colors.textPrimary }}>Mode:</strong> {airResistance ? 'Air resistance ON' : 'Vacuum (no air)'}<br />
                  {airResistance && (
                    <>
                      In real air, the faster-moving bullet experiences more drag, which has both horizontal AND vertical components!
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(() => goToPhase('twist_review'), 'See Analysis')}
      </div>
    );
  };

  // Phase: Twist Review
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'same_time';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.xl}px` : `${design.space.xxl}px`, overflowY: 'auto' }}>
          <div style={{
            padding: `${design.space.xl}px`,
            background: wasCorrect ? `${design.colors.success}15` : `${design.colors.accent}15`,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${wasCorrect ? design.colors.success : design.colors.accent}40`,
            marginBottom: `${design.space.xl}px`,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px' }}>{wasCorrect ? '!' : '!'}</span>
            <h3 style={{
              fontSize: '20px',
              color: wasCorrect ? design.colors.success : design.colors.accent,
              marginTop: `${design.space.md}px`,
              fontWeight: 600
            }}>
              {wasCorrect ? 'Correct! Both bullets hit the ground at the same time!' : 'They hit at the same time (in a vacuum)!'}
            </h3>
          </div>

          {renderSectionHeader('📊', 'Why Both Hit Together', 'The independence principle at extreme speeds')}

          <div style={{
            padding: `${design.space.xl}px`,
            background: design.colors.bgSecondary,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${design.colors.border}`,
            marginBottom: `${design.space.xl}px`
          }}>
            <h4 style={{ fontSize: '15px', color: design.colors.textPrimary, marginBottom: `${design.space.lg}px` }}>
              The Key Insight
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: `${design.space.lg}px`
            }}>
              <div style={{
                padding: `${design.space.lg}px`,
                background: design.colors.bgTertiary,
                borderRadius: `${design.radius.md}px`
              }}>
                <div style={{ fontSize: '13px', color: design.colors.error, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>Dropped Bullet</div>
                <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                  - Falls straight down<br />
                  - Only vertical velocity<br />
                  - Time to fall: t = sqrt(2h/g)<br />
                  - Example: 1.5m height = 0.55s
                </p>
              </div>
              <div style={{
                padding: `${design.space.lg}px`,
                background: design.colors.bgTertiary,
                borderRadius: `${design.radius.md}px`
              }}>
                <div style={{ fontSize: '13px', color: design.colors.accent, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>Fired Bullet (400 m/s)</div>
                <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                  - Has huge horizontal velocity<br />
                  - Same vertical acceleration (g)<br />
                  - Same time to fall: 0.55s<br />
                  - Travels 220m horizontally!
                </p>
              </div>
            </div>
          </div>

          <div style={{
            padding: `${design.space.xl}px`,
            background: `${design.colors.warning}10`,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${design.colors.warning}40`,
            marginBottom: `${design.space.xl}px`
          }}>
            <h4 style={{ fontSize: '15px', color: design.colors.warning, marginBottom: `${design.space.md}px` }}>
              Real World: Air Resistance Matters
            </h4>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
              In reality, a bullet traveling at 400 m/s experiences significant air resistance. This drag force has both horizontal (slowing it down) and vertical (slightly affecting fall) components. The faster bullet experiences MORE drag, which can actually slow its descent slightly. But the fundamental principle of independence still applies - it is just that air adds forces that depend on velocity!
            </p>
          </div>

          {renderKeyTakeaway('Even at 400 m/s - faster than the speed of sound - horizontal motion does not affect falling time. In a vacuum, both bullets hit the ground simultaneously. This is true whether the horizontal speed is 1 m/s or 1000 m/s!')}
        </div>
        {renderBottomBar(() => goToPhase('transfer'), 'See Real Applications')}
      </div>
    );
  };

  // Phase: Transfer
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const allRead = completedApps.size >= realWorldApps.length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.lg}px` : `${design.space.xl}px`, overflowY: 'auto' }}>
          {renderSectionHeader('🌍', 'Real-World Applications', 'Independence of motion in Sports, Artillery, Video Games, and Space')}

          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${design.space.sm}px`,
            marginBottom: `${design.space.lg}px`
          }}>
            <span style={{ fontSize: '13px', color: design.colors.textSecondary }}>
              {completedApps.size} of {realWorldApps.length} applications read
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {realWorldApps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: completedApps.has(idx) ? design.colors.success : idx === activeApp ? design.colors.primary : design.colors.bgTertiary,
                    transition: 'background 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{
            display: 'flex',
            gap: `${design.space.sm}px`,
            marginBottom: `${design.space.xl}px`,
            overflowX: 'auto',
            paddingBottom: `${design.space.sm}px`
          }}>
            {realWorldApps.map((a, i) => {
              const isUnlocked = i === 0 || completedApps.has(i - 1);
              const isCompleted = completedApps.has(i);
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isUnlocked) {
                      setActiveApp(i);
                      emitEvent('app_explored', { app: a.title });
                    }
                  }}
                  disabled={!isUnlocked}
                  style={{
                    padding: `${design.space.md}px ${design.space.lg}px`,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: activeApp === i ? design.colors.textInverse : isCompleted ? design.colors.success : design.colors.textSecondary,
                    background: activeApp === i ? a.color : isCompleted ? `${design.colors.success}20` : design.colors.bgSecondary,
                    border: `1px solid ${activeApp === i ? a.color : design.colors.border}`,
                    borderRadius: `${design.radius.md}px`,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    boxShadow: activeApp === i ? design.shadows.sm : 'none',
                    opacity: isUnlocked ? 1 : 0.5,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  {isCompleted ? 'Done' : a.icon} {a.title.split(':')[0]}
                </button>
              );
            })}
          </div>

          {/* Application content */}
          <div style={{
            background: design.colors.bgSecondary,
            borderRadius: `${design.radius.xl}px`,
            border: `1px solid ${design.colors.border}`,
            overflow: 'hidden',
            boxShadow: design.shadows.md
          }}>
            {/* Header */}
            <div style={{
              padding: `${design.space.xl}px`,
              background: `linear-gradient(135deg, ${app.color}20, transparent)`,
              borderBottom: `1px solid ${design.colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: `${design.space.lg}px`, marginBottom: `${design.space.md}px` }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ fontSize: '22px', color: design.colors.textPrimary, margin: 0, fontWeight: 700 }}>
                    {app.title}
                  </h3>
                  <p style={{ fontSize: '15px', color: app.color, margin: `${design.space.xs}px 0 0`, fontWeight: 500 }}>
                    {app.tagline}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {app.description}
              </p>
            </div>

            {/* Connection */}
            <div style={{ padding: `${design.space.xl}px`, borderBottom: `1px solid ${design.colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: app.color, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>
                Connection to Independence
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ padding: `${design.space.xl}px`, borderBottom: `1px solid ${design.colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: design.colors.textPrimary, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>
                How It Works
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: design.colors.border
            }}>
              {app.stats.map((stat, idx) => (
                <div key={idx} style={{
                  padding: `${design.space.lg}px`,
                  background: design.colors.bgTertiary,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: `${design.space.xs}px` }}>{stat.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: app.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: design.colors.textTertiary }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div style={{ padding: `${design.space.xl}px`, borderTop: `1px solid ${design.colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: design.colors.textPrimary, marginBottom: `${design.space.md}px`, fontWeight: 600 }}>
                Examples
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${design.space.sm}px` }}>
                {app.examples.map((ex, idx) => (
                  <span key={idx} style={{
                    padding: `${design.space.xs}px ${design.space.md}px`,
                    fontSize: '13px',
                    color: design.colors.textSecondary,
                    background: design.colors.bgPrimary,
                    borderRadius: `${design.radius.full}px`
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {/* Companies */}
            <div style={{
              padding: `${design.space.lg}px ${design.space.xl}px`,
              background: design.colors.bgTertiary,
              display: 'flex',
              alignItems: 'center',
              gap: `${design.space.sm}px`,
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '12px', color: design.colors.textTertiary }}>Key players:</span>
              {app.companies.map((company, idx) => (
                <span key={idx} style={{
                  padding: `${design.space.xs}px ${design.space.md}px`,
                  fontSize: '12px',
                  color: design.colors.textSecondary,
                  background: design.colors.bgSecondary,
                  borderRadius: `${design.radius.sm}px`,
                  border: `1px solid ${design.colors.border}`
                }}>
                  {company}
                </span>
              ))}
            </div>

            {/* Mark as Read Button */}
            <div style={{ padding: `${design.space.xl}px`, borderTop: `1px solid ${design.colors.border}` }}>
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
                    padding: `${design.space.md}px ${design.space.xl}px`,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    background: design.colors.success,
                    border: 'none',
                    borderRadius: `${design.radius.md}px`,
                    cursor: 'pointer',
                    boxShadow: design.shadows.sm,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Mark "{app.title.split(':')[0]}" as Read
                </button>
              ) : (
                <div style={{
                  padding: `${design.space.md}px ${design.space.xl}px`,
                  borderRadius: `${design.radius.md}px`,
                  background: `${design.colors.success}15`,
                  border: `1px solid ${design.colors.success}30`,
                  color: design.colors.success,
                  fontSize: '15px',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  Completed
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{
          padding: `${design.space.lg}px ${design.space.xl}px`,
          background: design.colors.bgSecondary,
          borderTop: `1px solid ${design.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => goToPhase('twist_review')}
            style={{
              padding: `${design.space.md}px ${design.space.xl}px`,
              fontSize: '15px',
              color: design.colors.textSecondary,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative'
            }}
          >
            Back
          </button>
          <button
            onClick={() => goToPhase('test')}
            disabled={!allRead}
            style={{
              padding: `${design.space.md}px ${design.space.xl}px`,
              fontSize: '15px',
              fontWeight: 600,
              color: !allRead ? design.colors.textTertiary : '#FFFFFF',
              background: !allRead ? design.colors.bgTertiary : design.colors.success,
              border: 'none',
              borderRadius: `${design.radius.md}px`,
              cursor: !allRead ? 'not-allowed' : 'pointer',
              opacity: !allRead ? 0.5 : 1,
              zIndex: 10,
              position: 'relative'
            }}
          >
            Take the Quiz ({completedApps.size}/{realWorldApps.length} read)
          </button>
        </div>
      </div>
    );
  };

  // Phase: Test - 10 multiple choice questions
  const renderTest = () => {
    const currentQ = testQuestions[currentQuestionIndex];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.lg}px` : `${design.space.xl}px`, overflowY: 'auto' }}>
          {!showTestResults ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: `${design.space.xl}px`
              }}>
                <h2 style={{ fontSize: '20px', color: design.colors.textPrimary, margin: 0, fontWeight: 700 }}>
                  Knowledge Check
                </h2>
                <span style={{
                  padding: `${design.space.xs}px ${design.space.md}px`,
                  fontSize: '13px',
                  color: design.colors.textSecondary,
                  background: design.colors.bgSecondary,
                  borderRadius: `${design.radius.full}px`
                }}>
                  {currentQuestionIndex + 1} / {testQuestions.length}
                </span>
              </div>

              {/* Question navigation dots */}
              <div style={{
                display: 'flex',
                gap: `${design.space.xs}px`,
                marginBottom: `${design.space.xl}px`,
                justifyContent: 'center'
              }}>
                {testQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      background: idx === currentQuestionIndex
                        ? design.colors.primary
                        : testAnswers[idx] !== null
                          ? design.colors.success
                          : design.colors.bgTertiary,
                      zIndex: 10,
                      position: 'relative'
                    }}
                  />
                ))}
              </div>

              {/* Scenario */}
              <div style={{
                padding: `${design.space.lg}px ${design.space.xl}px`,
                background: design.colors.bgTertiary,
                borderRadius: `${design.radius.lg}px`,
                marginBottom: `${design.space.lg}px`,
                borderLeft: `4px solid ${design.colors.accent}`
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
                  {currentQ.scenario}
                </p>
              </div>

              {/* Question */}
              <div style={{
                padding: `${design.space.xl}px`,
                background: design.colors.bgSecondary,
                borderRadius: `${design.radius.lg}px`,
                border: `1px solid ${design.colors.border}`,
                marginBottom: `${design.space.lg}px`
              }}>
                <p style={{ fontSize: '16px', color: design.colors.textPrimary, margin: 0, fontWeight: 500 }}>
                  {currentQ.question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: `${design.space.md}px` }}>
                {currentQ.options.map((option, idx) => {
                  const isSelected = testAnswers[currentQuestionIndex] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const newAnswers = [...testAnswers];
                        newAnswers[currentQuestionIndex] = idx;
                        setTestAnswers(newAnswers);
                        emitEvent('test_answered', { question: currentQuestionIndex, answer: idx });
                      }}
                      style={{
                        padding: `${design.space.lg}px ${design.space.xl}px`,
                        fontSize: '14px',
                        color: isSelected ? design.colors.textInverse : design.colors.textPrimary,
                        background: isSelected ? design.colors.primary : design.colors.bgSecondary,
                        border: `2px solid ${isSelected ? design.colors.primary : design.colors.border}`,
                        borderRadius: `${design.radius.md}px`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? design.shadows.sm : 'none',
                        zIndex: 10,
                        position: 'relative'
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        lineHeight: '24px',
                        textAlign: 'center',
                        borderRadius: '50%',
                        background: isSelected ? design.colors.bgPrimary : design.colors.bgTertiary,
                        color: isSelected ? design.colors.primary : design.colors.textTertiary,
                        marginRight: `${design.space.md}px`,
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option.text}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: `${design.space.xl}px`,
                gap: `${design.space.md}px`
              }}>
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    padding: `${design.space.md}px ${design.space.xl}px`,
                    fontSize: '14px',
                    color: currentQuestionIndex === 0 ? design.colors.textTertiary : design.colors.textPrimary,
                    background: design.colors.bgSecondary,
                    border: `1px solid ${design.colors.border}`,
                    borderRadius: `${design.radius.md}px`,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Previous
                </button>

                {currentQuestionIndex < testQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    style={{
                      padding: `${design.space.md}px ${design.space.xl}px`,
                      fontSize: '14px',
                      color: design.colors.textPrimary,
                      background: design.colors.bgSecondary,
                      border: `1px solid ${design.colors.border}`,
                      borderRadius: `${design.radius.md}px`,
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative'
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const score = testAnswers.reduce((acc, answer, idx) =>
                        acc + (testQuestions[idx].options[answer as number]?.correct ? 1 : 0), 0);
                      setTestScore(score);
                      setShowTestResults(true);
                      emitEvent('test_completed', { score, total: testQuestions.length });
                    }}
                    disabled={answeredCount < testQuestions.length}
                    style={{
                      padding: `${design.space.md}px ${design.space.xl}px`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: answeredCount < testQuestions.length ? design.colors.textTertiary : design.colors.textInverse,
                      background: answeredCount < testQuestions.length ? design.colors.bgTertiary : design.colors.primary,
                      border: 'none',
                      borderRadius: `${design.radius.md}px`,
                      cursor: answeredCount < testQuestions.length ? 'not-allowed' : 'pointer',
                      zIndex: 10,
                      position: 'relative'
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
                const percentage = Math.round((testScore / testQuestions.length) * 100);

                return (
                  <>
                    <div style={{
                      padding: `${design.space.xl}px`,
                      background: percentage >= 70 ? `${design.colors.success}15` : `${design.colors.warning}15`,
                      borderRadius: `${design.radius.lg}px`,
                      border: `1px solid ${percentage >= 70 ? design.colors.success : design.colors.warning}40`,
                      textAlign: 'center',
                      marginBottom: `${design.space.xl}px`
                    }}>
                      <div style={{ fontSize: '48px', fontWeight: 700, color: percentage >= 70 ? design.colors.success : design.colors.warning }}>
                        {percentage}%
                      </div>
                      <p style={{ fontSize: '16px', color: design.colors.textPrimary, margin: `${design.space.sm}px 0 0` }}>
                        {testScore} out of {testQuestions.length} correct
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${design.space.lg}px` }}>
                      {testQuestions.map((q, idx) => {
                        const isCorrect = q.options[testAnswers[idx] as number]?.correct ?? false;
                        return (
                          <div key={idx} style={{
                            padding: `${design.space.lg}px`,
                            background: design.colors.bgSecondary,
                            borderRadius: `${design.radius.lg}px`,
                            border: `1px solid ${isCorrect ? design.colors.success : design.colors.error}40`
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: `${design.space.md}px`,
                              marginBottom: `${design.space.md}px`
                            }}>
                              <span style={{
                                fontSize: '18px',
                                lineHeight: 1,
                                color: isCorrect ? design.colors.success : design.colors.error
                              }}>
                                {isCorrect ? 'Correct' : 'Wrong'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: design.colors.textPrimary, margin: 0, fontWeight: 500 }}>
                                  Q{idx + 1}: {q.question}
                                </p>
                                {!isCorrect && (
                                  <p style={{ fontSize: '13px', color: design.colors.error, margin: `${design.space.sm}px 0 0` }}>
                                    Your answer: {q.options[testAnswers[idx] as number]?.text}
                                  </p>
                                )}
                                <p style={{ fontSize: '13px', color: design.colors.success, margin: `${design.space.xs}px 0 0` }}>
                                  Correct: {q.options.find(o => o.correct)?.text}
                                </p>
                              </div>
                            </div>
                            <div style={{
                              padding: `${design.space.md}px`,
                              background: design.colors.bgTertiary,
                              borderRadius: `${design.radius.md}px`,
                              fontSize: '13px',
                              color: design.colors.textSecondary,
                              lineHeight: 1.5
                            }}>
                              Explanation: {q.explanation}
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

  // Phase: Mastery - Congratulations page
  const renderMastery = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, ${design.colors.bgSecondary} 100%)`
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          padding: isMobile ? `${design.space.xl}px` : `${design.space.xxl}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Celebration icon with glow */}
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 32px',
            background: `linear-gradient(135deg, ${design.colors.primary}30, ${design.colors.accent}20)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: design.shadows.glow(design.colors.primary),
            border: `2px solid ${design.colors.primary}40`
          }}>
            <span style={{ fontSize: '56px' }}>Trophy</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '40px',
            fontWeight: 800,
            color: design.colors.textPrimary,
            marginBottom: `${design.space.lg}px`,
            letterSpacing: '-0.02em'
          }}>
            Congratulations!
          </h1>
          <h2 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: 600,
            color: design.colors.primary,
            marginBottom: `${design.space.lg}px`
          }}>
            Independence of Motion Mastered!
          </h2>
          <p style={{
            fontSize: '18px',
            color: design.colors.textSecondary,
            maxWidth: '500px',
            lineHeight: 1.6,
            marginBottom: `${design.space.xxl}px`
          }}>
            You now understand one of physics' most elegant principles - that horizontal and vertical motions are completely independent!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: `${design.space.lg}px`,
            width: '100%',
            maxWidth: '600px',
            marginBottom: `${design.space.xxl}px`
          }}>
            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `1px solid ${design.colors.border}`,
              boxShadow: design.shadows.sm
            }}>
              <div style={{ fontSize: '32px', marginBottom: `${design.space.sm}px` }}>Y-axis</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: design.colors.error }}>Vertical</div>
              <div style={{ fontSize: '13px', color: design.colors.textTertiary }}>y = v0y*t - (1/2)*g*t^2</div>
            </div>

            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `1px solid ${design.colors.border}`,
              boxShadow: design.shadows.sm
            }}>
              <div style={{ fontSize: '32px', marginBottom: `${design.space.sm}px` }}>X-axis</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: design.colors.accent }}>Horizontal</div>
              <div style={{ fontSize: '13px', color: design.colors.textTertiary }}>x = v0x * t</div>
            </div>

            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `1px solid ${design.colors.border}`,
              boxShadow: design.shadows.sm
            }}>
              <div style={{ fontSize: '32px', marginBottom: `${design.space.sm}px` }}>Score</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: design.colors.primary }}>{testScore}/10</div>
              <div style={{ fontSize: '13px', color: design.colors.textTertiary }}>Quiz score</div>
            </div>
          </div>

          <div style={{
            padding: `${design.space.xl}px ${design.space.xxl}px`,
            background: design.colors.bgSecondary,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${design.colors.primary}40`,
            maxWidth: '500px',
            boxShadow: design.shadows.md
          }}>
            <h4 style={{ fontSize: '15px', color: design.colors.primary, marginBottom: `${design.space.md}px`, fontWeight: 600 }}>
              Key Insights You Learned
            </h4>
            <ul style={{
              textAlign: 'left',
              margin: 0,
              paddingLeft: '20px',
              color: design.colors.textSecondary,
              fontSize: '14px',
              lineHeight: 1.8
            }}>
              <li>Horizontal velocity does not affect fall time</li>
              <li>Both components can be analyzed separately</li>
              <li>Time depends only on height: t = sqrt(2h/g)</li>
              <li>Air resistance couples the motions (breaks ideal independence)</li>
              <li>This principle applies from basketballs to spacecraft!</li>
            </ul>
          </div>
        </div>
        <div style={{
          padding: `${design.space.lg}px ${design.space.xl}px`,
          background: design.colors.bgSecondary,
          borderTop: `1px solid ${design.colors.border}`,
          display: 'flex',
          justifyContent: 'center'
        }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: `${design.space.md}px ${design.space.xxl}px`,
                fontSize: '15px',
                fontWeight: 600,
                color: design.colors.textInverse,
                background: design.colors.primary,
                border: 'none',
                borderRadius: `${design.radius.md}px`,
                cursor: 'pointer',
                boxShadow: design.shadows.sm,
                zIndex: 10,
                position: 'relative'
              }}
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Projectile Independence</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10, position: 'relative' }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default ProjectileIndependenceRenderer;
