'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// PROJECTILE INDEPENDENCE - Premium Design (Inline Styles Only)
// 10-Phase Learning Structure
// ============================================================================

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
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
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
    description: "When you shoot a basketball, the horizontal motion toward the hoop and vertical motion forming the arc are completely independent of each other. The ball's forward speed does not affect how fast it falls because only gravity controls the vertical component. Players must master both components separately to achieve consistent shooting accuracy across different distances and angles.",
    connection: "Understanding independence helps players realize they need to control two separate things: the forward push and the upward arc. The time in the air is determined solely by the vertical component, while the range depends on horizontal speed and hang time together.",
    howItWorks: "A shot launched at 45 degrees spends the same time in the air as one at 60 degrees if they reach the same maximum height. Horizontal speed just determines how far the ball travels during that time. Modern shot-tracking systems decompose every attempt into these independent axes.",
    stats: [
      { value: '45 m', label: 'three-point range', icon: '📐' },
      { value: '8 m/s', label: 'typical release speed', icon: '🚀' },
      { value: '55 kg', label: 'ball momentum factor', icon: '🎯' }
    ],
    examples: ['Free throw arc analysis', 'Three-point shooting', 'Alley-oop timing', 'Bank shot geometry'],
    companies: ['NBA', 'FIBA', 'ShotTracker', 'Noah Basketball'],
    color: '#f97316'
  },
  {
    icon: '🎯',
    title: 'Artillery: Ballistic Calculations',
    tagline: 'Independent Axes for Precise Targeting',
    description: "Artillery crews calculate trajectories by treating horizontal range and vertical drop as completely separate problems. The shell maintains its horizontal velocity while gravity pulls it down independently. Modern fire control computers solve these equations in real time to account for wind, altitude, temperature, and even the rotation of the Earth, delivering precise targeting at extreme distances.",
    connection: "Because the motions are independent, artillery computers can calculate time-of-flight from vertical equations alone, then use that time to find horizontal range. Wind corrections are added as a third independent component.",
    howItWorks: "For a shell fired at angle theta with velocity v: Time to peak = v*sin(theta)/g. Total flight time = 2 times that. Horizontal range = v*cos(theta) times total time.",
    stats: [
      { value: '800 m/s', label: 'muzzle velocity', icon: '💨' },
      { value: '30 km', label: 'typical range', icon: '📏' },
      { value: '120 kg', label: 'shell mass', icon: '💣' }
    ],
    examples: ['Howitzer targeting', 'Naval gunfire', 'Mortar calculations', 'Anti-aircraft ranging'],
    companies: ['Raytheon', 'BAE Systems', 'Lockheed Martin', 'General Dynamics'],
    color: '#8b5cf6'
  },
  {
    icon: '🎮',
    title: 'Video Games: Physics Engines',
    tagline: 'Realistic Projectile Simulation',
    description: "Game physics engines simulate projectile motion by updating x and y positions separately each frame. This independence makes the code simple and efficient while producing realistic parabolic arcs. Modern engines like Unity and Unreal handle thousands of simultaneous projectiles by leveraging the mathematical simplicity that comes from decomposing motion into independent axes.",
    connection: "Every frame, the engine adds horizontal velocity to x position (constant) and adds vertical velocity to y position after subtracting gravity. The two calculations never interact, demonstrating pure independence.",
    howItWorks: "Each frame: x += vx * dt (constant velocity). y += vy * dt, then vy -= g * dt (gravity). This simple separation creates perfect parabolic arcs for arrows, grenades, and projectiles in games.",
    stats: [
      { value: '60 GHz', label: 'GPU clock speed', icon: '🖥️' },
      { value: '16 ms', label: 'frame time', icon: '⏱️' },
      { value: '500 MB', label: 'physics memory', icon: '📊' }
    ],
    examples: ['Angry Birds trajectories', 'Fortnite grenades', 'Call of Duty bullets', 'Portal physics'],
    companies: ['Unity', 'Unreal Engine', 'Havok', 'PhysX'],
    color: '#f59e0b'
  },
  {
    icon: '🚀',
    title: 'Spacecraft: Orbital Mechanics',
    tagline: 'Independence at Cosmic Scales',
    description: "Spacecraft exploit motion independence: horizontal thrust puts them in orbit while gravity pulls them down. At orbital velocity, the rate of falling matches the curvature of the Earth, creating continuous free fall around the planet. This elegant balance between horizontal momentum and vertical gravitational pull is what keeps every satellite in orbit.",
    connection: "Independence means rockets can be analyzed as horizontal acceleration (thrust) and vertical acceleration (gravity) separately. Orbit is achieved when horizontal velocity is so great that falling matches the curvature of the Earth.",
    howItWorks: "At orbital altitude, gravity causes roughly 9 m/s squared downward acceleration. At approximately 7.8 km/s horizontal velocity, falling 9 meters in a second matches the curvature of the Earth, so you never get closer to the ground.",
    stats: [
      { value: '8 km/s', label: 'LEO velocity', icon: '🛰️' },
      { value: '90 s', label: 'burn duration', icon: '⏰' },
      { value: '400 km', label: 'ISS altitude', icon: '📍' }
    ],
    examples: ['ISS orbital insertion', 'Satellite deployment', 'Ballistic missile trajectory', 'Space station resupply'],
    companies: ['SpaceX', 'NASA', 'Boeing', 'Rocket Lab'],
    color: '#ec4899'
  }
];

// Test questions - AVOID words: "continue", "submit", "finish", "see results", "next question" in option text
const testQuestions = [
  {
    scenario: "You're standing on a cliff edge with two identical balls. You drop one straight down and throw the other horizontally at the same instant.",
    question: "Which ball hits the water below first?",
    options: [
      { id: 'a', text: "The dropped ball because it takes the most direct path down to the water", correct: false },
      { id: 'b', text: "The thrown ball because horizontal speed adds energy to its total speed", correct: false },
      { id: 'c', text: "They hit at exactly the same time because vertical motion is independent", correct: true },
      { id: 'd', text: "The thrown ball because it has more kinetic energy overall", correct: false }
    ],
    explanation: "Both balls hit at exactly the same time! The horizontal and vertical motions are completely independent. Both experience the same gravitational acceleration and fall the same vertical distance, so they take the same time regardless of horizontal velocity."
  },
  {
    scenario: "An airplane flying at 200 m/s releases a supply crate from 500 m altitude over a flat desert landscape.",
    question: "How does the crate move immediately after release (ignoring air resistance)?",
    options: [
      { id: 'a', text: "It falls straight down since it is no longer pushed forward by the plane engines", correct: false },
      { id: 'b', text: "It keeps 200 m/s horizontally while also accelerating downward at g", correct: true },
      { id: 'c', text: "It gradually slows down horizontally as it falls toward the ground", correct: false },
      { id: 'd', text: "It arcs backward relative to the plane due to drag forces", correct: false }
    ],
    explanation: "The crate maintains its 200 m/s horizontal velocity (Newton's first law - no horizontal forces) while simultaneously accelerating downward at g. These motions are independent. The crate stays directly below the plane!"
  },
  {
    scenario: "A cannonball is fired horizontally from a tower. At the same instant, another cannonball is dropped from the same height.",
    question: "If the fired cannonball has twice the initial horizontal speed, how does this affect when it lands?",
    options: [
      { id: 'a', text: "It lands twice as fast because it moves with greater total energy", correct: false },
      { id: 'b', text: "It lands at the same time but at twice the horizontal distance away", correct: true },
      { id: 'c', text: "It lands later because it needs to travel a longer curved path", correct: false },
      { id: 'd', text: "It lands sooner because it has significantly more kinetic energy", correct: false }
    ],
    explanation: "Doubling horizontal speed has zero effect on landing time (vertical motion is independent) but exactly doubles the horizontal distance traveled. Time is determined only by height and gravity: t = sqrt(2h/g)."
  },
  {
    scenario: "A baseball is thrown at 30 m/s at a 30 degree angle above the horizontal direction.",
    question: "What are the independent velocity components at the moment of launch?",
    options: [
      { id: 'a', text: "Horizontal: 30 m/s, Vertical: 0 m/s (all speed is horizontal)", correct: false },
      { id: 'b', text: "Horizontal: 15 m/s, Vertical: 15 m/s (equal split)", correct: false },
      { id: 'c', text: "Horizontal: 26 m/s, Vertical: 15 m/s (trig decomposition)", correct: true },
      { id: 'd', text: "Horizontal: 15 m/s, Vertical: 26 m/s (opposite split)", correct: false }
    ],
    explanation: "Using trigonometry: Horizontal = 30*cos(30) = 30*0.866 = 26 m/s. Vertical = 30*sin(30) = 30*0.5 = 15 m/s. These components evolve independently - horizontal stays constant while vertical changes due to gravity."
  },
  {
    scenario: "A monkey hangs from a branch. A hunter aims directly at the monkey and fires. The monkey, seeing the gun fire, drops from the branch at the exact instant the bullet leaves the gun.",
    question: "What happens in this scenario? (Ignoring air resistance)",
    options: [
      { id: 'a', text: "The bullet passes over the monkey because it aimed where the monkey was originally hanging", correct: false },
      { id: 'b', text: "The bullet passes under the monkey because gravity only affects the bullet significantly", correct: false },
      { id: 'c', text: "The bullet hits the monkey because both fall the same vertical distance during flight", correct: true },
      { id: 'd', text: "It entirely depends on the speed of the bullet and distance to the monkey", correct: false }
    ],
    explanation: "The bullet hits the monkey! Both the bullet and monkey are accelerated downward by gravity equally. Whatever distance the monkey falls during the bullet's flight time, the bullet falls by exactly the same amount from its aimed path."
  },
  {
    scenario: "On the Moon (gravity = 1.6 m/s squared), you throw a ball horizontally at 10 m/s from a 20 m cliff.",
    question: "Compared to Earth (g = 10 m/s squared), how does the Moon change the trajectory?",
    options: [
      { id: 'a', text: "The ball goes the same distance but takes significantly longer to land", correct: false },
      { id: 'b', text: "The ball goes much farther and takes much longer to land on the surface", correct: true },
      { id: 'c', text: "The ball goes farther but takes exactly the same amount of time", correct: false },
      { id: 'd', text: "The ball goes the same distance but lands considerably sooner", correct: false }
    ],
    explanation: "On Moon: t = sqrt(2*20/1.6) = 5s. Distance = 10*5 = 50m. On Earth: t = sqrt(2*20/10) = 2s. Distance = 10*2 = 20m. Lower gravity means more time in the air (vertical), and same horizontal speed means more distance."
  },
  {
    scenario: "A car drives off a cliff at 20 m/s. The cliff is 45 m high above the ground below.",
    question: "How far from the base of the cliff does the car land?",
    options: [
      { id: 'a', text: "20 meters from the base of the cliff", correct: false },
      { id: 'b', text: "45 meters from the base of the cliff", correct: false },
      { id: 'c', text: "60 meters from the base of the cliff", correct: true },
      { id: 'd', text: "90 meters from the base of the cliff", correct: false }
    ],
    explanation: "First find time: t = sqrt(2h/g) = sqrt(90/10) = 3 seconds. Then horizontal distance = v*t = 20*3 = 60 meters. The car's horizontal speed stays constant at 20 m/s while it falls for 3 seconds."
  },
  {
    scenario: "A projectile is at the peak of its trajectory (the highest point in its arc).",
    question: "At this exact moment, what are the velocity components of the projectile?",
    options: [
      { id: 'a', text: "Both horizontal and vertical velocity are zero at the peak", correct: false },
      { id: 'b', text: "Horizontal velocity is zero while vertical velocity is at maximum", correct: false },
      { id: 'c', text: "Horizontal velocity is unchanged and vertical velocity is zero", correct: true },
      { id: 'd', text: "Both components are at their minimum non-zero values", correct: false }
    ],
    explanation: "At the peak, only the vertical velocity has become zero (it changed from positive to negative). The horizontal velocity never changes (no horizontal forces) and maintains its original value. The projectile is still moving horizontally at full speed!"
  },
  {
    scenario: "Two projectiles are launched at the same speed but at different angles: 30 degrees and 60 degrees.",
    question: "Ignoring air resistance, which projectile lands farther from the launch point?",
    options: [
      { id: 'a', text: "The 30 degree projectile because a lower angle means more horizontal speed", correct: false },
      { id: 'b', text: "The 60 degree projectile because a higher arc means more time in the air", correct: false },
      { id: 'c', text: "They land at the same distance because of complementary angle symmetry", correct: true },
      { id: 'd', text: "Cannot determine the answer without knowing the exact launch speed", correct: false }
    ],
    explanation: "They land at the same distance! Range = v squared * sin(2*theta)/g. Since sin(60) = sin(120), angles that sum to 90 degrees give equal range. 30 and 60 are complementary."
  },
  {
    scenario: "A ball is thrown horizontally from a moving train at 10 m/s relative to the train. The train moves at 30 m/s relative to the ground.",
    question: "What is the ball's horizontal velocity relative to the ground (in direction of train motion)?",
    options: [
      { id: 'a', text: "10 m/s because only the throw matters once released", correct: false },
      { id: 'b', text: "20 m/s because they partially cancel each other", correct: false },
      { id: 'c', text: "30 m/s because the ball inherits only the train speed", correct: false },
      { id: 'd', text: "40 m/s because velocities add together in the same direction", correct: true }
    ],
    explanation: "Velocities add! If thrown forward: 30 m/s (train) + 10 m/s (throw) = 40 m/s relative to ground. The vertical motion (falling) is completely unaffected by this 40 m/s horizontal velocity."
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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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
    } catch { /* Audio not supported */ }
  }, []);

  // Emit events
  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        type,
        gameType: 'projectile_independence',
        gameTitle: 'Projectile Independence',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [playSound, emitEvent, phase, onPhaseComplete]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Quiz state - confirm flow
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(testQuestions.length).fill(null));
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [horizontalSpeed, setHorizontalSpeed] = useState(120);
  const [cliffHeight, setCliffHeight] = useState(150);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [droppedY, setDroppedY] = useState(50);
  const [thrownX, setThrownX] = useState(100);
  const [thrownY, setThrownY] = useState(50);
  const [airResistance, setAirResistance] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);

  const animationRef = useRef<number | null>(null);

  // Design system
  const colors = {
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    accent: '#22c55e',
    accentLight: '#4ade80',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgDark: '#0a0a0f',
    bgCard: '#12121a',
    bgCardLight: '#1a1a24',
    bgElevated: '#22222e',
    border: '#2a2a36',
    borderLight: '#3a3a48',
    textPrimary: '#fafafa',
    textSecondary: 'rgba(161,161,170,0.85)',
    textMuted: 'rgba(113,113,122,0.7)',
  };

  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < phaseOrder.length - 1 && phase !== 'test';

  // Simulation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const g = 500;
    const groundY = 50 + cliffHeight;
    let lastTime = performance.now();
    let st = 0;
    let dy = 50, dyVel = 0;
    let tx = 100, ty = 50, txVel = horizontalSpeed, tyVel = 0;
    const drag = airResistance * 0.02;

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      st += dt;

      dyVel += g * dt;
      if (drag > 0) dyVel *= (1 - drag);
      dy += dyVel * dt;

      tyVel += g * dt;
      if (drag > 0) { tyVel *= (1 - drag); txVel *= (1 - drag * 0.5); }
      tx += txVel * dt;
      ty += tyVel * dt;

      if (dy > groundY) dy = groundY;
      if (ty > groundY) ty = groundY;

      setDroppedY(dy);
      setThrownX(tx);
      setThrownY(ty);
      setSimTime(st);

      if (dy >= groundY && ty >= groundY) {
        setIsSimulating(false);
        return;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isSimulating, cliffHeight, horizontalSpeed, airResistance]);

  const startSimulation = useCallback(() => {
    setDroppedY(50);
    setThrownX(100);
    setThrownY(50);
    setSimTime(0);
    setIsSimulating(true);
  }, []);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    setDroppedY(50);
    setThrownX(100);
    setThrownY(50);
    setSimTime(0);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Mastery event
  useEffect(() => {
    if (phase === 'mastery') {
      emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length });
    }
  }, [phase, testScore, emitEvent]);

  // ============ SHARED STYLES ============
  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: '24px',
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    color: 'white',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    transition: 'all 0.3s ease',
    zIndex: 10,
    position: 'relative' as const,
    boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
  };

  // ============ HELPER RENDERERS ============

  // Progress bar - fixed at top
  const renderProgressBar = () => {
    const progress = ((currentPhaseIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: colors.bgCardLight, zIndex: 100 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.5s ease',
        }} />
      </div>
    );
  };

  // Nav dots (only in bottom bar)
  const renderNavDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          title={phaseLabels[p]}
          aria-label={phaseLabels[p]}
          style={{
            height: '8px',
            width: phase === p ? '24px' : '8px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            background: phase === p ? colors.primary : currentPhaseIndex > i ? colors.success : colors.bgCardLight,
            boxShadow: phase === p ? `0 0 12px ${colors.primary}40` : 'none',
            transition: 'all 0.3s ease',
            zIndex: 10,
            position: 'relative' as const,
          }}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = () => (
    <div style={{
      padding: '16px 24px',
      background: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <button
        onClick={() => canGoBack && goToPhase(phaseOrder[currentPhaseIndex - 1])}
        disabled={!canGoBack}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: canGoBack ? colors.textPrimary : colors.textMuted,
          cursor: canGoBack ? 'pointer' : 'default',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: canGoBack ? 1 : 0.4,
        }}
      >
        Back
      </button>
      {renderNavDots()}
      <button
        onClick={() => canGoNext && goToPhase(phaseOrder[currentPhaseIndex + 1])}
        disabled={!canGoNext || phase === 'test'}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: 'none',
          background: canGoNext && phase !== 'test' ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` : colors.bgCardLight,
          color: canGoNext && phase !== 'test' ? 'white' : colors.textMuted,
          cursor: canGoNext && phase !== 'test' ? 'pointer' : 'default',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: canGoNext && phase !== 'test' ? 1 : 0.4,
        }}
      >
        Next
      </button>
    </div>
  );

  // Simulation SVG
  const renderSimulation = (showControls: boolean = true) => {
    const svgW = 400;
    const svgH = 280;
    const groundY = 50 + cliffHeight * (svgH - 80) / 300;
    const speedFactor = horizontalSpeed / 200;
    const dampColor = airResistance > 0 ? colors.warning : colors.accent;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '420px' }}>
        <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet" style={{ borderRadius: '16px', border: `1px solid ${colors.border}` }}>
          <defs>
            <linearGradient id="projBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <linearGradient id="projGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#134e3a" />
              <stop offset="100%" stopColor="#14352a" />
            </linearGradient>
            <linearGradient id="projCliffGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2a2a36" />
              <stop offset="50%" stopColor="#3a3a48" />
              <stop offset="100%" stopColor="#22222e" />
            </linearGradient>
            <radialGradient id="projDropGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="projThrowGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <radialGradient id="projSpeedGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor={dampColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={dampColor} stopOpacity="0" />
            </radialGradient>
            <filter id="projBallGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="projTrailGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={svgW} height={svgH} fill="url(#projBgGrad)" />

          {/* Grid lines */}
          <g>
            {[1,2,3,4,5].map(i => <line key={`h${i}`} x1="0" y1={i * svgH / 6} x2={svgW} y2={i * svgH / 6} stroke="#fff" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />)}
            {[1,2,3,4,5,6,7].map(i => <line key={`v${i}`} x1={i * svgW / 8} y1="0" x2={i * svgW / 8} y2={svgH} stroke="#fff" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />)}
          </g>

          {/* Ground */}
          <g>
            <rect x="0" y={groundY} width={svgW} height={svgH - groundY} fill="url(#projGroundGrad)" />
            <line x1="0" y1={groundY} x2={svgW} y2={groundY} stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
          </g>

          {/* Cliff */}
          <g>
            <rect x="0" y="30" width="110" height={groundY - 30} fill="url(#projCliffGrad)" />
            <line x1="110" y1="30" x2="110" y2={groundY} stroke="#1a1a24" strokeWidth="2" />
            <path d={`M 0 30 L 110 30`} stroke="#4a4a58" strokeWidth="1" fill="none" />
            {/* Cliff hatching */}
            <path d={`M 5 50 L 20 35 M 5 70 L 20 55 M 5 90 L 20 75 M 5 110 L 20 95 M 5 130 L 20 115`} stroke="#4a4a58" strokeWidth="0.8" opacity="0.4" fill="none" />
          </g>

          {/* Speed indicator - changes with slider */}
          <g opacity={speedFactor}>
            <circle cx={svgW - 35} cy={25} r={8 + speedFactor * 10} fill="url(#projSpeedGlow)" />
            <circle cx={svgW - 35} cy={25} r={3} fill={dampColor} />
            <path d={`M ${svgW - 50} 25 L ${svgW - 20} 25`} stroke={dampColor} strokeWidth="1.5" opacity="0.6" fill="none" />
          </g>

          {/* Thrown ball (green) - rendered first so getInteractivePoint finds it */}
          <g>
            <circle cx={Math.min(isSimulating ? thrownX : 100 + horizontalSpeed * 0.5, svgW - 10)} cy={Math.min(thrownY, groundY - 8)} r={10} fill="url(#projThrowGrad)" filter="url(#projBallGlow)" />
            <ellipse cx={Math.min(isSimulating ? thrownX : 100 + horizontalSpeed * 0.5, svgW - 10)} cy={Math.min(thrownY, groundY - 8)} rx={4} ry={4} fill="white" opacity="0.2" />
          </g>

          {/* Dropped ball (red) */}
          <g>
            <circle cx={100} cy={Math.min(droppedY, groundY - 8)} r={10} fill="url(#projDropGrad)" filter="url(#projBallGlow)" />
            <ellipse cx={100} cy={Math.min(droppedY, groundY - 8)} rx={4} ry={4} fill="white" opacity="0.2" />
          </g>

          {/* Title */}
          <title>Projectile Independence Simulation</title>
          {/* Axis labels */}
          <text x={svgW / 2} y={16} fill="#fff" fontSize="13" textAnchor="middle" fontWeight="700">Projectile Distance vs Height</text>
          <text x={svgW - 8} y={groundY - 4} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="end">Distance</text>
          <text x={14} y={groundY - 4} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="start">Height</text>
          {/* Labels */}
          <g>
            <text x={60} y={groundY + 16} fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="600">Dropped</text>
            <text x={svgW / 2} y={groundY + 16} fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="600">Thrown</text>
            <text x={svgW - 35} y={groundY + 32} fill={dampColor} fontSize="11" textAnchor="middle">Speed: {horizontalSpeed}</text>
          </g>
        </svg>

        {showControls && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '380px',
            padding: '16px',
            background: colors.bgCard,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '110px', fontWeight: 500 }}>Horizontal Speed:</span>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={horizontalSpeed}
                onChange={(e) => {
                  setHorizontalSpeed(Number(e.target.value));
                  stopSimulation();
                }}
                style={{ flex: 1, width: '100%', height: '20px', touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, accentColor: '#3b82f6' }}
              />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '55px', fontWeight: 600 }}>
                {horizontalSpeed} px/s
              </span>
            </div>

            <button
              onClick={() => isSimulating ? stopSimulation() : startSimulation()}
              style={{
                ...primaryBtnStyle,
                padding: '12px 16px',
                fontSize: '14px',
                background: isSimulating
                  ? `linear-gradient(135deg, ${colors.danger}, #dc2626)`
                  : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
              }}
            >
              {isSimulating ? 'Reset' : 'Drop Both Balls'}
            </button>

            <div style={{
              padding: '12px',
              background: colors.bgCardLight,
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>
                Both balls experience the same gravitational acceleration regardless of horizontal speed
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ PHASE RENDERERS ============

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '9999px' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
      </div>

      <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', lineHeight: 1.1 }}>
        Projectile Independence
      </h1>

      <p style={{ fontSize: '18px', color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px', lineHeight: 1.7 }}>
        Discover why horizontal and vertical motion are completely independent
      </p>

      <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '32px', position: 'relative' as const }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, lineHeight: 1.7, marginBottom: '12px' }}>
          You stand on a cliff with two identical balls. You drop one straight down and throw the other horizontally.
        </p>
        <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '12px' }}>
          Which one hits the ground first? Does horizontal speed affect falling?
        </p>
        <p style={{ fontSize: '16px', color: colors.primary, fontWeight: 600 }}>
          The answer will surprise you and change how you see motion!
        </p>
      </div>

      <button onClick={() => goToPhase('predict')} style={primaryBtnStyle}>
        Explore Projectiles
      </button>

      <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: colors.textMuted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.primary }}>✦</span>
          Interactive Lab
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.primary }}>✦</span>
          Real-World Examples
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.primary }}>✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // Predict phase
  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', alignItems: 'center' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Your Prediction</h2>
      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
        Two balls released from the same height at the same time...
      </p>

      {/* SVG visualization for predict phase */}
      <div style={{ marginBottom: '24px' }}>
        <svg width="360" height="200" viewBox="0 0 360 200">
          <defs>
            <linearGradient id="predProjBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <linearGradient id="predCliff" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2a2a36" />
              <stop offset="100%" stopColor="#3a3a48" />
            </linearGradient>
            <radialGradient id="predRedBall" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="predGreenBall" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <filter id="predGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="360" height="200" fill="url(#predProjBg)" rx="12" />

          {/* Grid */}
          <g opacity="0.06">
            {[0,1,2,3,4].map(i => <line key={`h${i}`} x1="0" y1={i*50} x2="360" y2={i*50} stroke="#fff" strokeWidth="0.5" />)}
            {[0,1,2,3,4,5,6].map(i => <line key={`v${i}`} x1={i*60} y1="0" x2={i*60} y2="200" stroke="#fff" strokeWidth="0.5" />)}
          </g>

          {/* Cliff */}
          <g>
            <rect x="20" y="40" width="80" height="120" fill="url(#predCliff)" rx="2" />
            <line x1="100" y1="40" x2="100" y2="160" stroke="#1a1a24" strokeWidth="2" />
          </g>

          {/* Ground */}
          <g>
            <rect x="0" y="160" width="360" height="40" fill="#134e3a" />
            <line x1="0" y1="160" x2="360" y2="160" stroke="#22c55e" strokeWidth="1" opacity="0.5" />
          </g>

          {/* Dropped ball */}
          <circle cx="60" cy="50" r="10" fill="url(#predRedBall)" filter="url(#predGlow)" />
          <path d="M 60 65 L 60 100" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
          <text x="60" y="120" fill="#ef4444" fontSize="10" textAnchor="middle">Drop</text>

          {/* Thrown ball */}
          <circle cx="80" cy="50" r="10" fill="url(#predGreenBall)" filter="url(#predGlow)" />
          <path d="M 95 50 Q 160 50 200 100 Q 240 150 280 155" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" fill="none" />

          {/* Arrow showing throw */}
          <g>
            <line x1="95" y1="45" x2="140" y2="45" stroke={colors.warning} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="140,45 132,40 132,50" fill={colors.warning} />
            <text x="118" y="38" fill={colors.warning} fontSize="10" textAnchor="middle" fontWeight="600">Throw</text>
          </g>

          {/* Question marks */}
          <g opacity="0.6">
            <text x="310" y="80" fill={colors.primary} fontSize="22" fontWeight="700">?</text>
            <text x="270" y="130" fill={colors.accent} fontSize="18" fontWeight="700">?</text>
            <text x="320" y="150" fill={colors.warning} fontSize="16" fontWeight="700">?</text>
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', width: '100%' }}>
        {[
          { id: 'dropped', label: 'The dropped ball hits first (direct path is shorter)', icon: '🔴' },
          { id: 'thrown', label: 'The thrown ball hits first (more energy, falls faster)', icon: '🟢' },
          { id: 'same', label: 'They hit at exactly the same time', icon: '⏱️' },
          { id: 'depends', label: 'It depends on how fast you throw', icon: '🤔' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => setPrediction(option.id)}
            style={{
              padding: '18px',
              fontSize: '15px',
              fontWeight: prediction === option.id ? 700 : 500,
              color: prediction === option.id ? '#0a0a0f' : colors.textPrimary,
              background: prediction === option.id
                ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                : colors.bgCard,
              border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              boxShadow: prediction === option.id ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
              zIndex: 10,
              position: 'relative' as const
            }}
          >
            <span style={{ fontSize: '28px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: colors.textPrimary }}>Think about it:</strong> Does throwing a ball sideways make gravity pull on it any differently? Does horizontal speed affect how fast something falls?
        </p>
      </div>
    </div>
  );

  // Play phase
  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🔬</span>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Experiment</h2>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>Drop and throw balls simultaneously and compare their fall times</p>
        </div>
      </div>

      {/* Observation guidance */}
      <div style={{ padding: '14px', background: `${colors.accent}15`, borderRadius: '12px', border: `1px solid ${colors.accent}30`, marginBottom: '16px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: colors.accent }}>What to watch:</strong> Observe how both balls hit the ground at the same time regardless of horizontal speed. When you increase the horizontal speed, the thrown ball travels farther but the fall time stays constant because gravity affects both equally.
        </p>
      </div>

      {/* Real-world relevance */}
      <div style={{ padding: '14px', background: `${colors.primary}15`, borderRadius: '12px', border: `1px solid ${colors.primary}30`, marginBottom: '16px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: colors.primary }}>Why this matters:</strong> This principle is important in real-world applications from sports to engineering. Understanding motion independence allows us to calculate trajectories for everything from basketball shots to spacecraft navigation.
        </p>
      </div>

      {/* Key formula and definition */}
      <div style={{ padding: '14px', background: colors.bgCardLight, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
        <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: colors.textPrimary }}>Independence of motion</strong> is defined as the principle where horizontal velocity v = v0 remains constant while vertical position y = y0 + 0.5·g·t² is calculated independently. The fall time t = √(2h/g) depends only on height, not horizontal speed.
        </p>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {renderSimulation(true)}
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Speed controls are inside renderSimulation */}
        </div>
      </div>
    </div>
  );

  // Review phase
  const renderReview = () => {
    const wasCorrect = prediction === 'same';

    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '32px',
          background: wasCorrect
            ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
            : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
          borderRadius: '16px',
          border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎉' : '💡'}</span>
          <h3 style={{ fontSize: '22px', color: wasCorrect ? colors.success : colors.accent, marginTop: '12px', fontWeight: 700 }}>
            {wasCorrect ? 'Correct! Your prediction was right!' : 'As you observed in the experiment, they hit at the same time!'}
          </h3>
          <p style={{ fontSize: '15px', color: colors.textSecondary, marginTop: '8px' }}>
            {wasCorrect ? 'You correctly predicted this result from the experiment.' : 'This is what happens when motion is truly independent.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>📚</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Independence of Motion</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, padding: '20px' }}>
            <h4 style={{ fontSize: '15px', color: colors.primary, marginBottom: '12px', fontWeight: 700 }}>
              Horizontal Motion
            </h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
              Horizontal velocity remains constant throughout the flight because there are no horizontal forces acting on the projectile (ignoring air resistance). The object continues at whatever horizontal speed it started with, obeying Newton's first law of motion. This means a ball thrown at 20 m/s horizontally will still be moving at 20 m/s horizontally when it hits the ground.
            </p>
          </div>

          <div style={{ ...cardStyle, padding: '20px' }}>
            <h4 style={{ fontSize: '15px', color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>
              Vertical Motion
            </h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
              Vertical motion is governed solely by gravity, accelerating the object downward at approximately 9.8 m/s squared regardless of any horizontal velocity. The vertical position follows the equation y = y0 + v0y*t + 0.5*g*t squared. This means a dropped ball and a thrown ball fall at exactly the same rate because gravity treats them identically.
            </p>
          </div>
        </div>

        <div style={{ padding: '24px', background: colors.bgCardLight, borderRadius: '16px', border: `1px solid ${colors.primary}30`, marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px', color: colors.textPrimary, marginBottom: '12px', textAlign: 'center', fontWeight: 700 }}>
            Key Equations of Projectile Motion
          </h4>
          <div style={{ fontSize: '20px', color: colors.primary, fontWeight: 700, textAlign: 'center', padding: '16px', background: colors.bgDark, borderRadius: '8px', fontFamily: 'monospace' }}>
            x = v0*cos(theta)*t &nbsp;&nbsp; y = v0*sin(theta)*t - 0.5*g*t squared
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}>
              <strong style={{ color: colors.primary }}>x</strong> = horizontal position
            </span>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}>
              <strong style={{ color: colors.accent }}>y</strong> = vertical position
            </span>
          </div>
        </div>

        <div style={{ padding: '20px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`, borderRadius: '16px', border: `1px solid ${colors.primary}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <p style={{ fontSize: '15px', color: colors.textPrimary, margin: 0, lineHeight: 1.7 }}>
              The independence of horizontal and vertical motion is one of the most powerful principles in physics. It means we can solve complex 2D problems by treating each dimension separately. Gravity does not care about horizontal speed. Horizontal motion does not care about gravity. They are truly independent.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Twist Predict phase
  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🌀</span>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>The Twist</h2>
      </div>
      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
        What happens when we add air resistance?
      </p>

      {/* SVG visualization for twist predict phase */}
      <div style={{ marginBottom: '24px' }}>
        <svg width="360" height="180" viewBox="0 0 360 180">
          <defs>
            <linearGradient id="twistProjBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <linearGradient id="twistWind" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </linearGradient>
            <radialGradient id="twistBall" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="360" height="180" fill="url(#twistProjBg)" rx="12" />

          {/* Wind lines */}
          <g opacity="0.3">
            <path d="M 320 50 Q 280 52 240 48" stroke={colors.warning} strokeWidth="1.5" fill="none" />
            <path d="M 330 80 Q 270 84 220 76" stroke={colors.warning} strokeWidth="1.5" fill="none" />
            <path d="M 310 110 Q 260 114 200 106" stroke={colors.warning} strokeWidth="1.5" fill="none" />
            <text x="340" y="70" fill={colors.warning} fontSize="14" fontWeight="700">Air</text>
          </g>

          {/* Cliff */}
          <g>
            <rect x="20" y="30" width="60" height="110" fill="#2a2a36" rx="2" />
          </g>

          {/* Ground */}
          <g>
            <rect x="0" y="140" width="360" height="40" fill="#134e3a" />
          </g>

          {/* No-air path (dashed) */}
          <path d="M 80 40 Q 160 40 240 140" stroke={colors.accent} strokeWidth="2" strokeDasharray="6,4" opacity="0.4" fill="none" />
          <text x="200" y="80" fill={colors.accent} fontSize="9" opacity="0.6">No air</text>

          {/* With-air path (solid) */}
          <path d="M 80 40 Q 140 45 180 140" stroke={colors.warning} strokeWidth="2" opacity="0.6" fill="none" />
          <text x="140" y="100" fill={colors.warning} fontSize="9" opacity="0.6">With air</text>

          {/* Ball */}
          <circle cx="80" cy="40" r="10" fill="url(#twistBall)" filter="url(#twistGlow)" />

          {/* Question marks */}
          <g>
            <text x="280" y="55" fill={colors.primary} fontSize="22" fontWeight="700">?</text>
            <text x="300" y="125" fill={colors.warning} fontSize="20" fontWeight="700">?</text>
          </g>
        </svg>
      </div>

      <div style={{ padding: '16px', background: colors.bgCardLight, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '24px', maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
          In the real world, air resistance acts on moving objects. <strong style={{ color: colors.textPrimary }}>Does air resistance break the independence of horizontal and vertical motion?</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', width: '100%' }}>
        {[
          { id: 'still_same', label: 'They still hit at the same time - air affects both equally', icon: '⏱️' },
          { id: 'dropped_first', label: 'Dropped ball hits first - thrown ball has more drag', icon: '🔴' },
          { id: 'thrown_first', label: 'Thrown ball hits first - air pushes it down faster', icon: '🟢' },
          { id: 'depends_speed', label: 'It depends on the throwing speed and ball shape', icon: '🎯' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => setTwistPrediction(option.id)}
            style={{
              padding: '18px',
              fontSize: '15px',
              fontWeight: twistPrediction === option.id ? 700 : 500,
              color: twistPrediction === option.id ? '#0a0a0f' : colors.textPrimary,
              background: twistPrediction === option.id
                ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                : colors.bgCard,
              border: `2px solid ${twistPrediction === option.id ? colors.accent : colors.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              boxShadow: twistPrediction === option.id ? '0 4px 12px rgba(34,197,94,0.3)' : 'none',
              zIndex: 10,
              position: 'relative' as const
            }}
          >
            <span style={{ fontSize: '28px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Twist Play phase
  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🔬</span>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Air Resistance Experiment</h2>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>Toggle air resistance and observe the difference</p>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {renderSimulation(true)}
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Air resistance toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {[
              { id: 0, label: 'No Air Resistance' },
              { id: 1, label: 'Light Air Drag' },
              { id: 2, label: 'Heavy Air Drag' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setAirResistance(m.id);
                  stopSimulation();
                }}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: airResistance === m.id ? 700 : 500,
                  color: airResistance === m.id ? '#0a0a0f' : colors.textPrimary,
                  background: airResistance === m.id
                    ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                    : colors.bgCard,
                  border: `2px solid ${airResistance === m.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Twist Review phase
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'dropped_first';

    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '32px',
          background: wasCorrect
            ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
            : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
          borderRadius: '16px',
          border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎯' : '💡'}</span>
          <h3 style={{ fontSize: '22px', color: wasCorrect ? colors.success : colors.accent, marginTop: '12px', fontWeight: 700 }}>
            {wasCorrect ? 'Correct! Air resistance breaks the independence!' : 'Air resistance breaks the independence!'}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>📊</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>How Air Resistance Changes Things</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { title: 'No Air Drag', desc: 'Balls hit at the same time. Independence holds perfectly in a vacuum.', icon: '✅', color: colors.success },
            { title: 'Light Drag', desc: 'Thrown ball falls slightly behind. Its higher speed creates more drag force.', icon: '〰️', color: colors.warning },
            { title: 'Heavy Drag', desc: 'Thrown ball significantly delayed. Air resistance couples the axes together.', icon: '❌', color: colors.danger }
          ].map((item, idx) => (
            <div key={idx} style={{ ...cardStyle, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <h4 style={{ fontSize: '15px', color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
            Why Does Air Resistance Break Independence?
          </h4>
          <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
            Air drag force is proportional to the square of the total speed (F_drag = 0.5 * rho * Cd * A * v squared). Since total speed involves both horizontal and vertical components (v = sqrt(vx squared + vy squared)), the drag force in each direction depends on the speed in the other direction. This mathematical coupling means the axes are no longer independent when air resistance is present. This is why real ballistic calculations are much harder than the idealized physics equations suggest, requiring numerical computation methods.
          </p>
        </div>

        <div style={{ padding: '20px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`, borderRadius: '16px', border: `1px solid ${colors.primary}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <p style={{ fontSize: '15px', color: colors.textPrimary, margin: 0, lineHeight: 1.7 }}>
              Independence of motion is an idealization that works perfectly in vacuum. In the real world, air resistance couples the axes together because drag depends on total speed. For many practical situations (low speeds, dense objects), the coupling is small enough to ignore. But for high-speed projectiles like bullets and artillery shells, air resistance makes a huge difference.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Transfer phase
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];

    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>🌍</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Real-World Applications</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Projectile independence in engineering and science
          </p>
          <span style={{ fontSize: '14px', color: colors.primary, fontWeight: 600 }}>
            App {activeApp + 1} of {realWorldApps.length}
          </span>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
          {realWorldApps.map((a, idx) => {
            const isCompleted = completedApps.has(idx);
            const isCurrent = idx === activeApp;
            return (
              <button
                key={idx}
                onClick={() => setActiveApp(idx)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#0a0a0f' : isCompleted ? colors.success : colors.textSecondary,
                  background: isCurrent
                    ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                    : isCompleted ? `${colors.success}15` : colors.bgCard,
                  border: `1px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                {isCompleted ? '✓ ' : ''}{a.icon} {a.title}
              </button>
            );
          })}
        </div>

        {/* Application content */}
        <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '24px', background: `linear-gradient(135deg, ${app.color}20, transparent)`, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: '22px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>{app.title}</h3>
                <p style={{ fontSize: '14px', color: app.color, margin: '4px 0 0', fontWeight: 600 }}>{app.tagline}</p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.description}</p>
          </div>

          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}` }}>
            <h4 style={{ fontSize: '14px', color: app.color, marginBottom: '8px', fontWeight: 700 }}>Connection to Projectile Independence</h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.connection}</p>
          </div>

          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}` }}>
            <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>How It Works</h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.howItWorks}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: colors.border }}>
            {app.stats.map((stat, idx) => (
              <div key={idx} style={{ padding: '16px', background: colors.bgCardLight, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}>
            <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Examples</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {app.examples.map((ex, idx) => (
                <span key={idx} style={{ padding: '6px 12px', fontSize: '13px', color: colors.textSecondary, background: colors.bgDark, borderRadius: '9999px', border: `1px solid ${colors.border}` }}>
                  {ex}
                </span>
              ))}
            </div>
          </div>

          <div style={{ padding: '12px 24px', background: colors.bgCardLight, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>Key players:</span>
            {app.companies.map((company, idx) => (
              <span key={idx} style={{ padding: '4px 12px', fontSize: '12px', color: colors.textSecondary, background: colors.bgCard, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                {company}
              </span>
            ))}
          </div>

          <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
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
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0a0a0f',
                  background: colors.success,
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                Got It
              </button>
            ) : (
              <div style={{ padding: '16px', background: `${colors.success}15`, borderRadius: '12px', border: `1px solid ${colors.success}40`, textAlign: 'center' }}>
                <span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Test phase - Confirm flow
  const renderTest = () => {
    const question = testQuestions[currentQuestion];
    const currentAnswer = testAnswers[currentQuestion];
    const isConfirmed = confirmedQuestions.has(currentQuestion);

    if (testSubmitted) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      return (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, marginBottom: '24px' }}>Quiz Results</h2>

          <div style={{
            padding: '32px',
            background: percentage >= 70
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
              : `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`,
            borderRadius: '16px',
            border: `1px solid ${percentage >= 70 ? colors.success : colors.warning}40`,
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '56px', fontWeight: 800, color: percentage >= 70 ? colors.success : colors.warning }}>
              {percentage}%
            </div>
            <p style={{ fontSize: '18px', color: colors.textPrimary, margin: '8px 0 0', fontWeight: 600 }}>
              {testScore} out of {testQuestions.length} correct
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => goToPhase('mastery')} style={{ ...primaryBtnStyle }}>
              Next: Complete Lesson
            </button>
            <button onClick={() => goToPhase('review')} style={{ ...primaryBtnStyle, background: colors.bgCardLight, color: colors.textPrimary }}>
              Back to Review
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.textPrimary, marginBottom: '8px' }}>Knowledge Check - Projectile Independence</h2>
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
          Question {currentQuestion + 1} of {testQuestions.length}
        </p>
        <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '24px', maxWidth: '520px', textAlign: 'center', lineHeight: 1.6 }}>
          Apply your understanding of independent horizontal and vertical motion, projectile trajectories, and the effects of gravity to answer each scenario-based question below.
        </p>

        {/* Scenario */}
        <div style={{
          padding: '16px',
          background: colors.bgCardLight,
          borderRadius: '12px',
          marginBottom: '12px',
          borderLeft: `4px solid ${colors.accent}`,
          maxWidth: '520px',
          width: '100%'
        }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
            {question.scenario}
          </p>
        </div>

        {/* Question */}
        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>{question.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options.map((option) => {
              const isSelected = currentAnswer === option.id;
              const isCorrectOpt = option.correct;

              let bg = `${colors.bgCardLight}80`;
              let borderColor = colors.borderLight;
              let textColor = '#ffffff';

              if (isConfirmed) {
                if (isCorrectOpt) {
                  bg = `${colors.success}20`;
                  borderColor = colors.success;
                  textColor = colors.success;
                } else if (isSelected) {
                  bg = `${colors.danger}20`;
                  borderColor = colors.danger;
                  textColor = colors.danger;
                }
              } else if (isSelected) {
                bg = `${colors.primary}20`;
                borderColor = colors.primary;
              }

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (isConfirmed) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = option.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    textAlign: 'left',
                    cursor: isConfirmed ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                    position: 'relative' as const,
                  }}
                >
                  <span style={{ fontSize: '14px', color: textColor, lineHeight: 1.5 }}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation after confirm */}
        {isConfirmed && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            marginBottom: '16px',
            background: currentAnswer === question.options.find(o => o.correct)?.id ? `${colors.success}10` : `${colors.danger}10`,
            border: `1px solid ${currentAnswer === question.options.find(o => o.correct)?.id ? `${colors.success}30` : `${colors.danger}30`}`,
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: currentAnswer === question.options.find(o => o.correct)?.id ? colors.success : colors.danger }}>
              {currentAnswer === question.options.find(o => o.correct)?.id ? 'Correct!' : 'Not quite'}
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>{question.explanation}</p>
          </div>
        )}

        {/* Quiz action buttons */}
        <div style={{ display: 'flex', gap: '12px', maxWidth: '520px', width: '100%' }}>
          {currentAnswer && !isConfirmed && (
            <button
              onClick={() => {
                setConfirmedQuestions(prev => new Set(prev).add(currentQuestion));
                const selectedOption = question.options.find(o => o.id === currentAnswer);
                if (selectedOption?.correct) {
                  setTestScore(s => s + 1);
                  playSound('success');
                } else {
                  playSound('failure');
                }
              }}
              style={{ ...primaryBtnStyle, flex: 1 }}
            >
              Check Answer
            </button>
          )}
          {isConfirmed && currentQuestion < 9 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              style={{ ...primaryBtnStyle, flex: 1 }}
            >
              Next Question
            </button>
          )}
          {isConfirmed && currentQuestion === 9 && (
            <button
              onClick={() => setTestSubmitted(true)}
              style={{ ...primaryBtnStyle, flex: 1, background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  // Mastery phase
  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '500px', padding: '48px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: [colors.primary, colors.accent, colors.success, colors.warning][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}

        <div style={{
          width: '120px', height: '120px', borderRadius: '9999px',
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '32px', boxShadow: `0 8px 32px ${colors.primary}40`,
        }}>
          <span style={{ fontSize: '56px' }}>🏆</span>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>Congratulations!</h1>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.primary, marginBottom: '16px' }}>Projectile Master</h2>

        <p style={{ fontSize: '18px', color: colors.textSecondary, marginBottom: '32px', lineHeight: 1.6 }}>
          Final Score: <span style={{ color: colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '480px', width: '100%', marginBottom: '32px' }}>
          {[
            { icon: '🎯', label: 'Independence', sub: 'x and y are separate' },
            { icon: '⚡', label: 'Same Fall Time', sub: 'Gravity is universal' },
            { icon: '📊', label: `${testScore}/10`, sub: 'Quiz score' },
          ].map((item, i) => (
            <div key={i} style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: colors.primary }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.sub}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px', maxWidth: '420px', lineHeight: 1.6 }}>
          You now understand projectile independence! Horizontal and vertical motion are truly separate, enabling precise trajectory calculations from basketball courts to orbital mechanics.
        </p>

        <button
          onClick={() => {
            setPhase('hook');
            setPrediction(null);
            setTwistPrediction(null);
            setActiveApp(0);
            setCompletedApps(new Set());
            setCurrentQuestion(0);
            setTestAnswers(new Array(testQuestions.length).fill(null));
            setConfirmedQuestions(new Set());
            setTestScore(0);
            setTestSubmitted(false);
          }}
          style={primaryBtnStyle}
        >
          Complete Lesson
        </button>
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
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Projectile Independence"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgDark, color: '#ffffff' }}>
      {renderProgressBar()}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: `${colors.bgCard}cc`,
        borderBottom: `1px solid ${colors.border}50`,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>Projectile Independence</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.primary }}>{phaseLabels[phase]}</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', width: '100%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        {renderPhase()}
      </div>

      {/* Bottom nav bar */}
      {renderBottomBar()}
    </div>
  );
};

export default ProjectileIndependenceRenderer;
