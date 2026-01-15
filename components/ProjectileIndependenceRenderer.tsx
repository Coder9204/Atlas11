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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface ProjectileIndependenceRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  emitGameEvent?: (event: string, data?: Record<string, unknown>) => void;
}

// Real-world applications data
const realWorldApps = [
  {
    icon: '🏀',
    title: 'Basketball Shooting',
    tagline: 'Arc Physics for Perfect Shots',
    description: "When you shoot a basketball, the horizontal motion (toward the hoop) and vertical motion (arc) are completely independent. The ball's forward speed doesn't affect how fast it falls - only gravity does.",
    connection: "Understanding independence helps players realize they need to control two separate things: the forward push and the upward arc. The time in the air is determined solely by the vertical component.",
    howItWorks: "A shot launched at 45° spends the same time in the air as one at 60° if they reach the same maximum height. Horizontal speed just determines how far the ball travels during that time.",
    stats: [
      { value: '45°', label: 'optimal angle (no rim)', icon: '📐' },
      { value: '50-55°', label: 'actual shot angle', icon: '🎯' },
      { value: '7.2m/s', label: 'typical release speed', icon: '🚀' }
    ],
    examples: ['Free throw arc analysis', 'Three-point shooting', 'Alley-oop timing', 'Bank shot geometry'],
    companies: ['NBA', 'FIBA', 'ShotTracker', 'Noah Basketball'],
    color: design.colors.primary
  },
  {
    icon: '✈️',
    title: 'Aircraft Navigation',
    tagline: 'Crosswind Compensation',
    description: "When dropping supplies from aircraft, pilots use independence of motion. The package maintains the plane's horizontal speed while accelerating downward independently. Crosswinds add a third independent component.",
    connection: "Because horizontal and vertical motions are independent, the package travels forward at the same rate as the plane while falling. Bombardiers calculate drop points by treating each dimension separately.",
    howItWorks: "At altitude h, time to ground is t = √(2h/g). The package travels horizontally x = v·t during this time. Add crosswind drift as an independent third component: d = w·t.",
    stats: [
      { value: '3s', label: 'drop from 50m', icon: '⏱️' },
      { value: '150m', label: 'forward travel at 50m/s', icon: '📏' },
      { value: 'JPADS', label: 'precision system', icon: '🎯' }
    ],
    examples: ['Humanitarian aid drops', 'Military supply delivery', 'Firefighting water bombs', 'Skydiving exit points'],
    companies: ['Airborne Systems', 'Military forces', 'Red Cross', 'CAL FIRE'],
    color: '#8b5cf6'
  },
  {
    icon: '⚽',
    title: 'Soccer Ball Physics',
    tagline: 'Curve and Fall Independently',
    description: "A soccer ball's horizontal motion (kick direction), vertical motion (loft), and spin-induced curve all operate independently. The Magnus effect adds horizontal curve without affecting fall rate.",
    connection: "Free kick specialists exploit independence: they can add massive horizontal curve (via spin) without changing how quickly the ball drops. The goal is to make the ball curve around the wall while still reaching net height.",
    howItWorks: "Vertical: y = v₀sinθ·t - ½gt². Horizontal: x = v₀cosθ·t. Curve (Magnus): adds perpendicular acceleration a = ρv²A·Cd, which is independent of gravity.",
    stats: [
      { value: '130km/h', label: 'pro kick speed', icon: '⚡' },
      { value: '10 rev/s', label: 'spin rate', icon: '🔄' },
      { value: '4m', label: 'max curve possible', icon: '↪️' }
    ],
    examples: ['Roberto Carlos free kick', 'Beckham benders', 'Knuckleball shots', 'Corner kick deliveries'],
    companies: ['FIFA', 'Adidas', 'Nike', 'STATS Perform'],
    color: '#f59e0b'
  },
  {
    icon: '🚀',
    title: 'Rocket Trajectory',
    tagline: 'Orbital Mechanics Basics',
    description: "Rockets exploit motion independence: horizontal thrust puts them in orbit while gravity pulls them down. At orbital velocity, the 'falling' matches Earth's curvature - continuous free fall around the planet.",
    connection: "Independence means rockets can be analyzed as horizontal acceleration (thrust) and vertical acceleration (gravity) separately. Orbit is achieved when horizontal velocity is so great that falling matches Earth's curve.",
    howItWorks: "At orbital altitude, gravity causes ~9 m/s² downward acceleration. At ~7.8 km/s horizontal velocity, falling 9 meters in a second matches Earth's curvature - you never get closer to the ground!",
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

// Test questions with scenarios
const testQuestions = [
  {
    scenario: "You're standing on a cliff edge with two identical balls. You drop one straight down and throw the other horizontally at the same instant.",
    question: "Which ball hits the water below first?",
    options: [
      "The dropped ball - it takes the direct path",
      "The thrown ball - horizontal speed adds to total speed",
      "They hit at exactly the same time",
      "The thrown ball - it has more energy"
    ],
    correct: 2,
    explanation: "Both balls hit at exactly the same time! The horizontal and vertical motions are completely independent. Both experience the same gravitational acceleration and fall the same vertical distance, so they take the same time regardless of horizontal velocity."
  },
  {
    scenario: "An airplane flying at 200 m/s releases a supply crate from 500m altitude.",
    question: "How does the crate move immediately after release (ignoring air resistance)?",
    options: [
      "Falls straight down since it's no longer pushed by the plane",
      "Continues at 200 m/s horizontally while also accelerating downward at g",
      "Slows down horizontally as it falls",
      "Arcs backward relative to the plane"
    ],
    correct: 1,
    explanation: "The crate maintains its 200 m/s horizontal velocity (Newton's first law - no horizontal forces to change it) while simultaneously accelerating downward at g. These motions are independent. The crate stays directly below the plane!"
  },
  {
    scenario: "A cannonball is fired horizontally from a tower. At the same instant, another cannonball is dropped from the same height.",
    question: "If the fired cannonball has twice the initial horizontal speed, how does this affect when it lands?",
    options: [
      "It lands twice as fast",
      "It lands at the same time but twice as far",
      "It lands later because it travels farther",
      "It lands sooner because it has more kinetic energy"
    ],
    correct: 1,
    explanation: "Doubling horizontal speed has zero effect on landing time (vertical motion is independent) but exactly doubles the horizontal distance traveled. Time is determined only by height and gravity: t = √(2h/g)."
  },
  {
    scenario: "A baseball is thrown at 30 m/s at a 30° angle above horizontal.",
    question: "What are the independent velocity components at launch?",
    options: [
      "Horizontal: 30 m/s, Vertical: 0 m/s",
      "Horizontal: 15 m/s, Vertical: 15 m/s",
      "Horizontal: 26 m/s, Vertical: 15 m/s",
      "Horizontal: 15 m/s, Vertical: 26 m/s"
    ],
    correct: 2,
    explanation: "Using trigonometry: Horizontal = 30×cos(30°) = 30×0.866 ≈ 26 m/s. Vertical = 30×sin(30°) = 30×0.5 = 15 m/s. These components evolve independently - horizontal stays constant while vertical changes due to gravity."
  },
  {
    scenario: "A monkey hangs from a branch. A hunter aims directly at the monkey and fires. The monkey, seeing the gun fire, drops from the branch at the exact instant the bullet leaves the gun.",
    question: "What happens? (Ignore air resistance)",
    options: [
      "The bullet passes over the monkey - it aimed where the monkey was",
      "The bullet passes under the monkey - gravity affects only the bullet",
      "The bullet hits the monkey - both fall the same amount during flight",
      "It depends on the bullet's speed"
    ],
    correct: 2,
    explanation: "The bullet hits the monkey! Both the bullet and monkey are accelerated downward by gravity equally. Whatever distance the monkey falls during the bullet's flight time, the bullet falls by exactly the same amount (starting from the aimed path). This is the famous 'monkey and hunter' problem!"
  },
  {
    scenario: "On the Moon (gravity = 1.6 m/s²), you throw a ball horizontally at 10 m/s from a 20m cliff.",
    question: "Compared to Earth (g = 10 m/s²), how does the Moon affect the trajectory?",
    options: [
      "Ball goes same distance but takes longer to land",
      "Ball goes farther and takes longer to land",
      "Ball goes farther but takes the same time",
      "Ball goes same distance but lands sooner"
    ],
    correct: 1,
    explanation: "On Moon: t = √(2×20/1.6) = 5s. Distance = 10×5 = 50m. On Earth: t = √(2×20/10) = 2s. Distance = 10×2 = 20m. Lower gravity means more time in the air (vertical), and same horizontal speed means more distance. Moon ball travels 2.5× farther and takes 2.5× longer."
  },
  {
    scenario: "A car drives off a cliff at 20 m/s. The cliff is 45m high.",
    question: "How far from the base of the cliff does the car land?",
    options: [
      "20 meters",
      "45 meters",
      "60 meters",
      "90 meters"
    ],
    correct: 2,
    explanation: "First find time: t = √(2h/g) = √(90/10) = 3 seconds. Then horizontal distance = v×t = 20×3 = 60 meters. The car's horizontal speed stays constant at 20 m/s while it falls for 3 seconds."
  },
  {
    scenario: "A projectile is at the peak of its trajectory (highest point).",
    question: "At this exact moment, what are the velocity components?",
    options: [
      "Both horizontal and vertical velocity are zero",
      "Horizontal velocity is zero, vertical velocity is maximum",
      "Horizontal velocity is unchanged, vertical velocity is zero",
      "Both are at their minimum non-zero values"
    ],
    correct: 2,
    explanation: "At the peak, only the vertical velocity has become zero (it changed from positive to negative). The horizontal velocity never changes (no horizontal forces) and maintains its original value. The projectile is still moving horizontally at full speed!"
  },
  {
    scenario: "Two projectiles are launched at the same speed but different angles: 30° and 60°.",
    question: "Ignoring air resistance, which lands farther from the launch point?",
    options: [
      "The 30° projectile - lower angle means more horizontal speed",
      "The 60° projectile - higher arc means more time in air",
      "They land at the same distance",
      "Cannot determine without knowing the speed"
    ],
    correct: 2,
    explanation: "They land at the same distance! This is the 'complementary angle' property of projectile motion. Range = v²sin(2θ)/g. Since sin(60°) = sin(120°) = sin(180°-60°), angles that sum to 90° give equal range. 30° and 60° are complementary."
  },
  {
    scenario: "A ball is thrown horizontally from a moving train at 10 m/s relative to the train. The train moves at 30 m/s relative to the ground.",
    question: "What is the ball's horizontal velocity relative to the ground (in the direction of train motion)?",
    options: [
      "10 m/s",
      "20 m/s",
      "30 m/s",
      "40 m/s"
    ],
    correct: 3,
    explanation: "Velocities add! If the ball is thrown forward relative to the train: 30 m/s (train) + 10 m/s (throw) = 40 m/s relative to ground. If thrown backward, it would be 20 m/s. This still demonstrates independence - the vertical motion (falling) is unaffected by this 40 m/s horizontal velocity."
  }
];

const ProjectileIndependenceRenderer: React.FC<ProjectileIndependenceRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  emitGameEvent = () => {}
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(testQuestions.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

  // Debounce refs for safe button handling
  const navigationLock = useRef(false);
  const tabLock = useRef(false);
  const buttonLock = useRef(false);
  const animationRef = useRef<number | null>(null);

  const isMobile = width < 600;

  // Safe button click handler with debouncing
  const handleButtonClick = useCallback((action: () => void, lockRef: React.MutableRefObject<boolean> = buttonLock) => {
    if (lockRef.current) return;
    lockRef.current = true;
    action();
    setTimeout(() => { lockRef.current = false; }, 400);
  }, []);

  // Safe navigation with dedicated lock
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLock.current) return;
    navigationLock.current = true;
    setPhase(newPhase);
    emitGameEvent('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLock.current = false; }, 400);
  }, [phase, emitGameEvent]);

  // Safe tab switching
  const handleTabClick = useCallback((index: number) => {
    if (tabLock.current) return;
    tabLock.current = true;
    setActiveAppTab(index);
    setTimeout(() => { tabLock.current = false; }, 300);
  }, []);

  // Physics simulation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const g = 500; // pixels/s² (scaled for visual)
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
  }, [isSimulating, cliffHeight, airResistance]);

  const startSimulation = useCallback(() => {
    setDroppedBall({ x: 100, y: 50, vy: 0 });
    setThrownBall({ x: 100, y: 50, vx: horizontalSpeed, vy: 0 });
    setTime(0);
    setDroppedLanded(false);
    setThrownLanded(false);
    setTrails({ dropped: [], thrown: [] });
    setIsSimulating(true);
  }, [horizontalSpeed]);

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
    const currentIdx = phases.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: `${design.space.md}px ${design.space.lg}px`,
        background: design.colors.bgSecondary,
        borderBottom: `1px solid ${design.colors.border}`
      }}>
        {phases.map((p, idx) => (
          <div
            key={p}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: idx <= currentIdx ? design.colors.primary : design.colors.bgTertiary,
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
          {currentIdx + 1}/{phases.length}
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
          onMouseDown={() => !disabled && handleButtonClick(onNext, navigationLock)}
          style={{
            padding: `${design.space.md}px ${design.space.xxl}px`,
            fontSize: '15px',
            fontWeight: 600,
            color: disabled ? design.colors.textTertiary : design.colors.textInverse,
            background: disabled ? design.colors.bgTertiary : design.colors.primary,
            border: 'none',
            borderRadius: `${design.radius.md}px`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1,
            boxShadow: disabled ? 'none' : design.shadows.sm
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
              ✓ Landed
            </text>
          )}
          {thrownLanded && (
            <text x={thrownBall.x - 10} y={groundY + 35} fill={design.colors.accent} fontSize="11">
              ✓ Landed at x={Math.round(thrownBall.x)}
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
                onMouseDown={() => handleButtonClick(isSimulating ? resetSimulation : startSimulation)}
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
                  boxShadow: design.shadows.sm
                }}
              >
                {isSimulating ? '⏹ Reset' : '▶ Drop Both Balls'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Phase: Hook - Premium welcome screen
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, ${design.colors.bgSecondary} 100%)`
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        padding: isMobile ? `${design.space.xl}px` : `${design.space.xxxl}px`,
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
            background: `linear-gradient(135deg, ${design.colors.primary}30, ${design.colors.accent}20)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: design.shadows.glow(design.colors.primary),
            border: `2px solid ${design.colors.primary}40`
          }}>
            <span style={{ fontSize: '56px' }}>🎯</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '42px',
            fontWeight: 800,
            color: design.colors.textPrimary,
            marginBottom: `${design.space.lg}px`,
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>
            The Falling Race
          </h1>

          <p style={{
            fontSize: '18px',
            color: design.colors.textSecondary,
            marginBottom: `${design.space.xxl}px`,
            lineHeight: 1.6
          }}>
            You're at the edge of a table with two identical balls. At the exact same moment, you <strong style={{ color: design.colors.error }}>drop</strong> one straight down and <strong style={{ color: design.colors.accent }}>throw</strong> the other horizontally.
          </p>

          <div style={{
            background: design.colors.bgTertiary,
            borderRadius: `${design.radius.xl}px`,
            padding: `${design.space.xl}px`,
            marginBottom: `${design.space.xl}px`,
            border: `1px solid ${design.colors.border}`,
            boxShadow: design.shadows.md
          }}>
            <p style={{
              fontSize: '22px',
              color: design.colors.primary,
              fontWeight: 700,
              margin: 0
            }}>
              Which ball hits the ground first?
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: `${design.space.xl}px`,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `2px solid ${design.colors.error}`,
              minWidth: '130px',
              boxShadow: design.shadows.sm
            }}>
              <span style={{ fontSize: '40px' }}>⬇️</span>
              <p style={{ fontSize: '15px', color: design.colors.error, margin: `${design.space.sm}px 0 0`, fontWeight: 600 }}>Dropped</p>
              <p style={{ fontSize: '12px', color: design.colors.textTertiary, margin: `${design.space.xs}px 0 0` }}>Straight down</p>
            </div>
            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `2px solid ${design.colors.accent}`,
              minWidth: '130px',
              boxShadow: design.shadows.sm
            }}>
              <span style={{ fontSize: '40px' }}>↗️</span>
              <p style={{ fontSize: '15px', color: design.colors.accent, margin: `${design.space.sm}px 0 0`, fontWeight: 600 }}>Thrown</p>
              <p style={{ fontSize: '12px', color: design.colors.textTertiary, margin: `${design.space.xs}px 0 0` }}>Horizontally</p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('predict'), 'Make Your Prediction')}
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
        {renderSectionHeader('🤔', 'Your Prediction', 'One ball dropped, one thrown horizontally from the same height...')}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${design.space.md}px`,
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          {[
            { id: 'dropped', label: 'Dropped ball lands first (shorter path)', icon: '⬇️' },
            { id: 'thrown', label: 'Thrown ball lands first (more speed = faster)', icon: '↗️' },
            { id: 'same', label: 'Both land at the same time', icon: '⚖️' },
            { id: 'depends', label: 'Depends on how hard you throw', icon: '🤷' }
          ].map(option => (
            <button
              key={option.id}
              onMouseDown={() => handleButtonClick(() => setPrediction(option.id))}
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
                boxShadow: prediction === option.id ? design.shadows.sm : 'none'
              }}
            >
              <span style={{ fontSize: '24px' }}>{option.icon}</span>
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
                🎯 Try This
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
            <span style={{ fontSize: '48px' }}>{wasCorrect ? '🎉' : '😮'}</span>
            <h3 style={{
              fontSize: '20px',
              color: wasCorrect ? design.colors.success : design.colors.primary,
              marginTop: `${design.space.md}px`,
              fontWeight: 600
            }}>
              {wasCorrect ? 'Correct! They land simultaneously!' : 'Surprise! They land at the same time!'}
            </h3>
          </div>

          {renderSectionHeader('📚', 'Independence of Motion', 'Horizontal and vertical motions don\'t affect each other')}

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
                <span>⬇️</span> Vertical Motion
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: design.colors.textPrimary }}>Only gravity acts vertically</strong><br />
                • Starts with v_y = 0<br />
                • Accelerates at g = 9.8 m/s²<br />
                • Time to fall: t = √(2h/g)<br />
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
                <span>➡️</span> Horizontal Motion
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: design.colors.textPrimary }}>No horizontal forces</strong><br />
                • Dropped ball: v_x = 0<br />
                • Thrown ball: v_x = constant<br />
                • Neither affects the other!<br />
                <em>Horizontal speed ≠ faster falling</em>
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
                  y = ½gt²
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
                  x = v_x × t
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary, marginTop: `${design.space.lg}px`, textAlign: 'center' }}>
              Notice: <strong style={{ color: design.colors.textPrimary }}>v_x doesn't appear in the y equation!</strong> They're completely independent.
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
        {renderSectionHeader('🌀', 'The Twist', 'What if we add air resistance?')}

        <div style={{
          padding: `${design.space.xl}px`,
          background: design.colors.bgTertiary,
          borderRadius: `${design.radius.lg}px`,
          border: `1px solid ${design.colors.border}`,
          marginBottom: `${design.space.xl}px`
        }}>
          <p style={{ fontSize: '15px', color: design.colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            In a vacuum, both balls land together. But in real air, the thrown ball experiences <strong style={{ color: design.colors.textPrimary }}>air resistance</strong> as it moves through the air...
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
            { id: 'still_same', label: 'Still land at the same time', icon: '⚖️' },
            { id: 'dropped_first', label: 'Dropped ball lands first (thrown has more drag)', icon: '⬇️' },
            { id: 'thrown_first', label: 'Thrown ball lands first (moving faster overall)', icon: '↗️' },
            { id: 'depends_shape', label: 'Depends on ball shape, not which was thrown', icon: '⚽' }
          ].map(option => (
            <button
              key={option.id}
              onMouseDown={() => handleButtonClick(() => setTwistPrediction(option.id))}
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
                boxShadow: twistPrediction === option.id ? design.shadows.sm : 'none'
              }}
            >
              <span style={{ fontSize: '24px' }}>{option.icon}</span>
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
            <strong style={{ color: design.colors.warning }}>Think about:</strong> Air resistance depends on speed. The thrown ball is moving faster (it has both horizontal and vertical velocity). Does this affect landing time?
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('twist_play'), 'Test with Air Resistance', !twistPrediction)}
    </div>
  );

  // Phase: Twist Play
  const renderTwistPlay = () => {
    useEffect(() => {
      setAirResistance(true);
      resetSimulation();
    }, []);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.lg}px` : `${design.space.xl}px`, overflowY: 'auto' }}>
          {renderSectionHeader('🔬', 'Air Resistance Mode', 'Now with drag - which lands first?')}

          {/* Air resistance toggle */}
          <div style={{
            display: 'flex',
            gap: `${design.space.md}px`,
            marginBottom: `${design.space.xl}px`,
            justifyContent: 'center'
          }}>
            <button
              onMouseDown={() => handleButtonClick(() => { setAirResistance(false); resetSimulation(); })}
              style={{
                padding: `${design.space.md}px ${design.space.xl}px`,
                fontSize: '14px',
                fontWeight: 600,
                color: !airResistance ? design.colors.textInverse : design.colors.textSecondary,
                background: !airResistance ? design.colors.primary : design.colors.bgSecondary,
                border: `2px solid ${!airResistance ? design.colors.primary : design.colors.border}`,
                borderRadius: `${design.radius.md}px`,
                cursor: 'pointer'
              }}
            >
              🌑 Vacuum
            </button>
            <button
              onMouseDown={() => handleButtonClick(() => { setAirResistance(true); resetSimulation(); })}
              style={{
                padding: `${design.space.md}px ${design.space.xl}px`,
                fontSize: '14px',
                fontWeight: 600,
                color: airResistance ? design.colors.textInverse : design.colors.textSecondary,
                background: airResistance ? design.colors.accent : design.colors.bgSecondary,
                border: `2px solid ${airResistance ? design.colors.accent : design.colors.border}`,
                borderRadius: `${design.radius.md}px`,
                cursor: 'pointer'
              }}
            >
              💨 With Air
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
                  🎯 Compare
                </h4>
                <ol style={{ margin: 0, paddingLeft: '20px', color: design.colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
                  <li>Run in vacuum mode first</li>
                  <li>Switch to air mode</li>
                  <li>Use high horizontal speed (200)</li>
                  <li>Watch for any difference in landing</li>
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
                      Drag ∝ v² means the faster-moving thrown ball experiences MORE total drag, including a component that resists its falling!
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
    const wasCorrect = twistPrediction === 'dropped_first';

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
            <span style={{ fontSize: '48px' }}>{wasCorrect ? '🎯' : '💡'}</span>
            <h3 style={{
              fontSize: '20px',
              color: wasCorrect ? design.colors.success : design.colors.accent,
              marginTop: `${design.space.md}px`,
              fontWeight: 600
            }}>
              {wasCorrect ? 'Correct! The dropped ball lands first with air!' : 'With air, the dropped ball lands first!'}
            </h3>
          </div>

          {renderSectionHeader('📊', 'Why Air Changes Things', 'Drag depends on total velocity')}

          <div style={{
            padding: `${design.space.xl}px`,
            background: design.colors.bgSecondary,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${design.colors.border}`,
            marginBottom: `${design.space.xl}px`
          }}>
            <h4 style={{ fontSize: '15px', color: design.colors.textPrimary, marginBottom: `${design.space.lg}px` }}>
              The Air Resistance Factor
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
                <div style={{ fontSize: '13px', color: design.colors.error, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>Dropped Ball</div>
                <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                  • Falls straight down<br />
                  • Only vertical velocity<br />
                  • Drag opposes falling<br />
                  • Reaches terminal velocity
                </p>
              </div>
              <div style={{
                padding: `${design.space.lg}px`,
                background: design.colors.bgTertiary,
                borderRadius: `${design.radius.md}px`
              }}>
                <div style={{ fontSize: '13px', color: design.colors.accent, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>Thrown Ball</div>
                <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                  • Has horizontal AND vertical velocity<br />
                  • Total speed = √(v_x² + v_y²)<br />
                  • Higher speed → more drag<br />
                  • Drag has vertical component!
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
              ⚠️ The Coupling Effect
            </h4>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
              Air resistance <strong style={{ color: design.colors.textPrimary }}>couples</strong> horizontal and vertical motion! The drag force is proportional to <strong>total</strong> velocity squared, and it acts <strong>opposite</strong> to the velocity direction. This means horizontal motion now affects vertical motion - the independence breaks down!
            </p>
          </div>

          <div style={{
            padding: `${design.space.xl}px`,
            background: design.colors.bgSecondary,
            borderRadius: `${design.radius.lg}px`,
            border: `1px solid ${design.colors.border}`
          }}>
            <h4 style={{ fontSize: '15px', color: design.colors.textPrimary, marginBottom: `${design.space.md}px` }}>
              📐 Mathematically
            </h4>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
              Drag force: <strong style={{ color: design.colors.primary }}>F_d = ½ρv²C_dA</strong>, pointing opposite to velocity.<br /><br />
              The vertical component of drag depends on the direction of motion, which depends on both v_x and v_y. With v_x = 0 (dropped), drag is purely vertical. With v_x ≠ 0 (thrown), total speed is higher and drag angle means less vertical drag - but total drag is much higher, and its vertical component still slows falling!
            </p>
          </div>

          {renderKeyTakeaway('In a vacuum, horizontal and vertical motions are truly independent. But air resistance depends on total speed and opposes the velocity direction, coupling the motions together. High-speed projectiles experience this strongly - bullets don\'t follow simple parabolas in air!')}
        </div>
        {renderBottomBar(() => goToPhase('transfer'), 'See Real Applications')}
      </div>
    );
  };

  // Phase: Transfer
  const renderTransfer = () => {
    const app = realWorldApps[activeAppTab];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: design.colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? `${design.space.lg}px` : `${design.space.xl}px`, overflowY: 'auto' }}>
          {renderSectionHeader('🌍', 'Real-World Applications', 'Projectile independence in sports, aviation, and space')}

          {/* Tab navigation */}
          <div style={{
            display: 'flex',
            gap: `${design.space.sm}px`,
            marginBottom: `${design.space.xl}px`,
            overflowX: 'auto',
            paddingBottom: `${design.space.sm}px`
          }}>
            {realWorldApps.map((a, idx) => (
              <button
                key={idx}
                onMouseDown={() => handleTabClick(idx)}
                style={{
                  padding: `${design.space.md}px ${design.space.lg}px`,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeAppTab === idx ? design.colors.textInverse : design.colors.textSecondary,
                  background: activeAppTab === idx ? a.color : design.colors.bgSecondary,
                  border: `1px solid ${activeAppTab === idx ? a.color : design.colors.border}`,
                  borderRadius: `${design.radius.md}px`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: activeAppTab === idx ? design.shadows.sm : 'none'
                }}
              >
                {a.icon} {a.title}
              </button>
            ))}
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
                🔗 Connection to Independence
              </h4>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ padding: `${design.space.xl}px`, borderBottom: `1px solid ${design.colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: design.colors.textPrimary, marginBottom: `${design.space.sm}px`, fontWeight: 600 }}>
                ⚙️ How It Works
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
                📍 Examples
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
          </div>
        </div>
        {renderBottomBar(() => goToPhase('test'), 'Take the Quiz')}
      </div>
    );
  };

  // Phase: Test
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
                  📝 Knowledge Check
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
                    onMouseDown={() => handleButtonClick(() => setCurrentQuestionIndex(idx))}
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
                          : design.colors.bgTertiary
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
                      onMouseDown={() => handleButtonClick(() => {
                        const newAnswers = [...testAnswers];
                        newAnswers[currentQuestionIndex] = idx;
                        setTestAnswers(newAnswers);
                      })}
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
                        boxShadow: isSelected ? design.shadows.sm : 'none'
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
                      {option}
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
                  onMouseDown={() => handleButtonClick(() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1)))}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    padding: `${design.space.md}px ${design.space.xl}px`,
                    fontSize: '14px',
                    color: currentQuestionIndex === 0 ? design.colors.textTertiary : design.colors.textPrimary,
                    background: design.colors.bgSecondary,
                    border: `1px solid ${design.colors.border}`,
                    borderRadius: `${design.radius.md}px`,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1
                  }}
                >
                  ← Previous
                </button>

                {currentQuestionIndex < testQuestions.length - 1 ? (
                  <button
                    onMouseDown={() => handleButtonClick(() => setCurrentQuestionIndex(currentQuestionIndex + 1))}
                    style={{
                      padding: `${design.space.md}px ${design.space.xl}px`,
                      fontSize: '14px',
                      color: design.colors.textPrimary,
                      background: design.colors.bgSecondary,
                      border: `1px solid ${design.colors.border}`,
                      borderRadius: `${design.radius.md}px`,
                      cursor: 'pointer'
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onMouseDown={() => handleButtonClick(() => setShowTestResults(true))}
                    disabled={answeredCount < testQuestions.length}
                    style={{
                      padding: `${design.space.md}px ${design.space.xl}px`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: answeredCount < testQuestions.length ? design.colors.textTertiary : design.colors.textInverse,
                      background: answeredCount < testQuestions.length ? design.colors.bgTertiary : design.colors.primary,
                      border: 'none',
                      borderRadius: `${design.radius.md}px`,
                      cursor: answeredCount < testQuestions.length ? 'not-allowed' : 'pointer'
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
                  acc + (answer === testQuestions[idx].correct ? 1 : 0), 0);
                const percentage = Math.round((score / testQuestions.length) * 100);

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
                        {score} out of {testQuestions.length} correct
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${design.space.lg}px` }}>
                      {testQuestions.map((q, idx) => {
                        const isCorrect = testAnswers[idx] === q.correct;
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
                                {isCorrect ? '✓' : '✗'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: design.colors.textPrimary, margin: 0, fontWeight: 500 }}>
                                  Q{idx + 1}: {q.question}
                                </p>
                                {!isCorrect && (
                                  <p style={{ fontSize: '13px', color: design.colors.error, margin: `${design.space.sm}px 0 0` }}>
                                    Your answer: {q.options[testAnswers[idx] as number]}
                                  </p>
                                )}
                                <p style={{ fontSize: '13px', color: design.colors.success, margin: `${design.space.xs}px 0 0` }}>
                                  Correct: {q.options[q.correct]}
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

  // Phase: Mastery - Premium completion screen
  const renderMastery = () => {
    const score = testAnswers.reduce((acc, answer, idx) =>
      acc + (answer === testQuestions[idx].correct ? 1 : 0), 0);

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
            <span style={{ fontSize: '56px' }}>🎯</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '40px',
            fontWeight: 800,
            color: design.colors.textPrimary,
            marginBottom: `${design.space.lg}px`,
            letterSpacing: '-0.02em'
          }}>
            Independence Mastered!
          </h1>
          <p style={{
            fontSize: '18px',
            color: design.colors.textSecondary,
            maxWidth: '500px',
            lineHeight: 1.6,
            marginBottom: `${design.space.xxl}px`
          }}>
            You understand why horizontal and vertical motions are independent - one of physics' most elegant principles!
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
              <div style={{ fontSize: '32px', marginBottom: `${design.space.sm}px` }}>⬇️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: design.colors.error }}>Vertical</div>
              <div style={{ fontSize: '13px', color: design.colors.textTertiary }}>y = ½gt² (same for all)</div>
            </div>

            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `1px solid ${design.colors.border}`,
              boxShadow: design.shadows.sm
            }}>
              <div style={{ fontSize: '32px', marginBottom: `${design.space.sm}px` }}>➡️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: design.colors.accent }}>Horizontal</div>
              <div style={{ fontSize: '13px', color: design.colors.textTertiary }}>x = v_x·t (independent)</div>
            </div>

            <div style={{
              padding: `${design.space.xl}px`,
              background: design.colors.bgSecondary,
              borderRadius: `${design.radius.lg}px`,
              border: `1px solid ${design.colors.border}`,
              boxShadow: design.shadows.sm
            }}>
              <div style={{ fontSize: '32px', marginBottom: `${design.space.sm}px` }}>🎯</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: design.colors.primary }}>{score}/10</div>
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
              🧠 Key Insights
            </h4>
            <ul style={{
              textAlign: 'left',
              margin: 0,
              paddingLeft: '20px',
              color: design.colors.textSecondary,
              fontSize: '14px',
              lineHeight: 1.8
            }}>
              <li>Horizontal velocity doesn't affect fall time</li>
              <li>Both components can be analyzed separately</li>
              <li>Time depends only on height: t = √(2h/g)</li>
              <li>Air resistance couples the motions (breaks independence)</li>
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
              onMouseDown={() => handleButtonClick(onBack, navigationLock)}
              style={{
                padding: `${design.space.md}px ${design.space.xxl}px`,
                fontSize: '15px',
                fontWeight: 600,
                color: design.colors.textInverse,
                background: design.colors.primary,
                border: 'none',
                borderRadius: `${design.radius.md}px`,
                cursor: 'pointer',
                boxShadow: design.shadows.sm
              }}
            >
              Back to Topics
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
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100vh',
      background: design.colors.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: design.colors.textPrimary,
      overflow: 'hidden'
    }}>
      {renderPhase()}
    </div>
  );
};

export default ProjectileIndependenceRenderer;
