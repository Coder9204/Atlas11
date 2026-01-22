import React, { useState, useEffect, useCallback, useRef } from 'react';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'experiment_run'
  | 'parameter_changed'
  | 'milestone_reached'
  | 'concept_explained'
  | 'test_answered'
  | 'test_completed'
  | 'app_explored'
  | 'app_completed'
  | 'hint_requested'
  | 'error_made'
  | 'mastery_achieved'
  | 'twist_predicted'
  | 'ball_launched'
  | 'basket_scored'
  | 'trajectory_traced';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

const ProjectileMotionRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // Phase constants
  const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const phaseLabels: Record<number, string> = {
    0: 'Hook',
    1: 'Predict',
    2: 'Lab',
    3: 'Review',
    4: 'Twist',
    5: 'Demo',
    6: 'Discovery',
    7: 'Apply',
    8: 'Test',
    9: 'Mastery'
  };

  // Core state
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [launchAngle, setLaunchAngle] = useState(45);
  const [launchSpeed, setLaunchSpeed] = useState(15);
  const [isLaunched, setIsLaunched] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 60, y: 260 });
  const [trajectoryPoints, setTrajectoryPoints] = useState<{ x: number; y: number }[]>([]);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [flightStats, setFlightStats] = useState({ time: 0, maxHeight: 0, range: 0 });
  const [madeBasket, setMadeBasket] = useState<boolean | null>(null);

  // Teaching milestones
  const [milestones, setMilestones] = useState({
    launchedFirstBall: false,
    changedAngle: false,
    changedSpeed: false,
    scored: false,
    understoodIndependence: false
  });

  // Navigation refs
  const isNavigating = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sound utility
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'complete' | 'launch' | 'swish' | 'bounce' | 'transition') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        success: { freq: 800, duration: 0.2, type: 'sine' },
        failure: { freq: 300, duration: 0.3, type: 'sawtooth' },
        complete: { freq: 1000, duration: 0.3, type: 'sine' },
        launch: { freq: 400, duration: 0.15, type: 'triangle' },
        swish: { freq: 1200, duration: 0.4, type: 'sine' },
        bounce: { freq: 200, duration: 0.1, type: 'square' },
        transition: { freq: 500, duration: 0.15, type: 'sine' }
      };

      const sound = sounds[type] || sounds.click;
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch {
      // Audio not available
    }
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: number) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('click');
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseLabels[newPhase] } });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [playSound, onGameEvent, onPhaseComplete, phaseLabels]);

  // Physics constants
  const g = 9.81; // m/s²
  const scale = 12; // pixels per meter
  const startX = 60;
  const startY = 260;
  const hoopX = 320;
  const hoopY = 165;

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Launch ball animation
  const launchBall = useCallback(() => {
    if (isLaunched) return;

    setIsLaunched(true);
    setTrajectoryPoints([]);
    setMadeBasket(null);
    playSound('launch');

    if (!milestones.launchedFirstBall) {
      setMilestones(m => ({ ...m, launchedFirstBall: true }));
      onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'launchedFirstBall' } });
    }

    const v0 = launchSpeed;
    const theta = (launchAngle * Math.PI) / 180;
    const v0x = v0 * Math.cos(theta);
    const v0y = v0 * Math.sin(theta);

    // Calculate theoretical values
    const tMax = (2 * v0y) / g;
    const hMax = (v0y * v0y) / (2 * g);
    const range = (v0 * v0 * Math.sin(2 * theta)) / g;

    setFlightStats({ time: tMax, maxHeight: hMax, range });

    let t = 0;
    const dt = 0.03;
    const points: { x: number; y: number }[] = [];
    let hasScored = false;

    const animate = () => {
      t += dt;
      const x = startX + v0x * t * scale;
      const y = startY - (v0y * t - 0.5 * g * t * t) * scale;

      points.push({ x, y });
      setTrajectoryPoints([...points]);
      setBallPosition({ x, y });

      // Check if scored (ball passes through hoop area)
      if (!hasScored && Math.abs(x - hoopX) < 18 && Math.abs(y - hoopY) < 12 && y < hoopY + 10) {
        hasScored = true;
        setMadeBasket(true);
        playSound('swish');
        if (!milestones.scored) {
          setMilestones(m => ({ ...m, scored: true }));
          onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'scored' } });
        }
        onGameEvent?.({ type: 'basket_scored', data: { angle: launchAngle, speed: launchSpeed } });
      }

      // Continue until ball goes off screen or hits ground
      if (y < 320 && x < 420 && t < 5) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsLaunched(false);
        if (!hasScored) {
          setMadeBasket(false);
          playSound('bounce');
        }
        onGameEvent?.({ type: 'ball_launched', data: { angle: launchAngle, speed: launchSpeed, scored: hasScored } });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isLaunched, launchAngle, launchSpeed, milestones, playSound, onGameEvent]);

  // Reset ball
  const resetBall = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsLaunched(false);
    setBallPosition({ x: startX, y: startY });
    setTrajectoryPoints([]);
    setMadeBasket(null);
  }, []);

  // Event handlers
  const handlePrediction = useCallback((prediction: string) => {
    if (isNavigating.current) return;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (isNavigating.current) return;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_predicted', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (isNavigating.current) return;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    playSound('click');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [playSound, onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (isNavigating.current) return;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_completed', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const handleAngleChange = useCallback((newAngle: number) => {
    resetBall();
    setLaunchAngle(newAngle);
    if (!milestones.changedAngle) {
      setMilestones(m => ({ ...m, changedAngle: true }));
      onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'changedAngle' } });
    }
    onGameEvent?.({ type: 'parameter_changed', data: { parameter: 'angle', value: newAngle } });
  }, [resetBall, milestones.changedAngle, onGameEvent]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    resetBall();
    setLaunchSpeed(newSpeed);
    if (!milestones.changedSpeed) {
      setMilestones(m => ({ ...m, changedSpeed: true }));
      onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'changedSpeed' } });
    }
    onGameEvent?.({ type: 'parameter_changed', data: { parameter: 'speed', value: newSpeed } });
  }, [resetBall, milestones.changedSpeed, onGameEvent]);

  // Test questions
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A basketball player is practicing free throws from the free-throw line, which is 4.6 meters from the basket.",
      question: "What path does the basketball follow through the air (ignoring air resistance)?",
      options: [
        { text: "A straight line from hand to basket", correct: false },
        { text: "A parabola (curved arc)", correct: true },
        { text: "A circular arc", correct: false },
        { text: "A zig-zag pattern", correct: false }
      ],
      explanation: "Projectiles follow parabolic paths because horizontal motion (constant velocity) combines with vertical motion (constant acceleration from gravity) to create a curved trajectory."
    },
    {
      scenario: "An artillery officer needs to hit a target 500 meters away. They can choose any launch angle between 10° and 80°.",
      question: "What angle will give the maximum horizontal range (assuming no air resistance)?",
      options: [
        { text: "30° - low and fast", correct: false },
        { text: "45° - perfect balance", correct: true },
        { text: "60° - high arc", correct: false },
        { text: "80° - almost vertical", correct: false }
      ],
      explanation: "Range = (v₀²sin(2θ))/g. Since sin(2θ) is maximized when 2θ = 90° (θ = 45°), this angle provides the optimal balance between time in air and horizontal velocity."
    },
    {
      scenario: "A soccer player kicks a ball at 20 m/s at an angle of 30° above horizontal.",
      question: "What happens to the horizontal velocity during the ball's flight?",
      options: [
        { text: "It stays constant throughout", correct: true },
        { text: "It decreases due to gravity", correct: false },
        { text: "It increases as the ball falls", correct: false },
        { text: "It becomes zero at the peak", correct: false }
      ],
      explanation: "Gravity only acts vertically (downward). Since there's no horizontal force (ignoring air resistance), horizontal velocity remains constant: vₓ = v₀cos(θ) = 17.3 m/s throughout."
    },
    {
      scenario: "You're standing on a cliff. You throw one ball horizontally and simply drop another from the same height at the same moment.",
      question: "Which ball hits the ground first?",
      options: [
        { text: "The dropped ball - it takes the shortest path", correct: false },
        { text: "The thrown ball - it has more energy", correct: false },
        { text: "They hit at exactly the same time", correct: true },
        { text: "It depends on how hard you throw", correct: false }
      ],
      explanation: "Vertical and horizontal motions are independent! Both balls accelerate downward at g = 9.8 m/s² and fall the same vertical distance. The thrown ball just travels farther horizontally while falling."
    },
    {
      scenario: "At the highest point of a ball's trajectory, it momentarily reaches its peak height before falling back down.",
      question: "What is the ball's velocity at this highest point?",
      options: [
        { text: "Zero in all directions", correct: false },
        { text: "Zero vertical, but horizontal velocity remains", correct: true },
        { text: "Maximum vertical, zero horizontal", correct: false },
        { text: "Equal horizontal and vertical", correct: false }
      ],
      explanation: "At the peak, vertical velocity is zero (it's reversing direction). But horizontal velocity is unchanged throughout the flight. Total velocity = horizontal velocity at the peak."
    },
    {
      scenario: "A golfer hits a ball at 50 m/s and wants to maximize distance. Another golfer hits at 100 m/s at the same angle.",
      question: "How does doubling the launch speed affect the range?",
      options: [
        { text: "Doubles the range (2x)", correct: false },
        { text: "Quadruples the range (4x)", correct: true },
        { text: "Triples the range (3x)", correct: false },
        { text: "No change - only angle matters", correct: false }
      ],
      explanation: "Range = v₀²sin(2θ)/g. Since range depends on v₀², doubling speed means 2² = 4 times the range. That's why a small increase in club head speed dramatically increases golf drive distance!"
    },
    {
      scenario: "A water fountain shoots water upward at various angles. The designer wants symmetrical arcs on both sides.",
      question: "If one jet is at 30°, what angle for the other jet gives the same range?",
      options: [
        { text: "30° (same angle)", correct: false },
        { text: "45° (optimal angle)", correct: false },
        { text: "60° (complementary angle)", correct: true },
        { text: "90° - 30° = 60° is wrong, try 70°", correct: false }
      ],
      explanation: "Complementary angles (angles that sum to 90°) give the same range! sin(2×30°) = sin(60°) and sin(2×60°) = sin(120°) = sin(60°). Both 30° and 60° jets land at the same distance."
    },
    {
      scenario: "A cannon fires a cannonball at 45° with initial speed of 100 m/s. You want to calculate the maximum height reached.",
      question: "Which formula correctly gives the maximum height?",
      options: [
        { text: "h = v₀²/(2g) - uses total velocity", correct: false },
        { text: "h = (v₀sinθ)²/(2g) - uses vertical component", correct: true },
        { text: "h = v₀t - simple distance formula", correct: false },
        { text: "h = gt²/2 - free fall formula", correct: false }
      ],
      explanation: "Maximum height depends only on the initial vertical velocity component (v₀sinθ). Using energy conservation: ½m(v₀sinθ)² = mgh, solving gives h = (v₀sinθ)²/(2g)."
    },
    {
      scenario: "A baseball is hit at an angle. You measure that it travels 120 meters horizontally and is in the air for 4 seconds.",
      question: "What is the initial horizontal velocity?",
      options: [
        { text: "30 m/s", correct: true },
        { text: "40 m/s", correct: false },
        { text: "120 m/s", correct: false },
        { text: "480 m/s", correct: false }
      ],
      explanation: "Since horizontal velocity is constant, vₓ = distance/time = 120m/4s = 30 m/s. This is one of the simplest projectile motion calculations!"
    },
    {
      scenario: "A stunt driver needs to jump a motorcycle over a 50-meter gap. The takeoff ramp is at ground level.",
      question: "What factor does NOT affect whether the motorcycle successfully clears the gap?",
      options: [
        { text: "The mass of the motorcycle and rider", correct: true },
        { text: "The launch speed", correct: false },
        { text: "The launch angle", correct: false },
        { text: "The gravitational acceleration", correct: false }
      ],
      explanation: "Just like Galileo's falling objects, mass doesn't affect projectile motion! The equations x = v₀cosθ·t and y = v₀sinθ·t - ½gt² don't include mass. A heavy bike and light bike follow the same path at the same speed and angle."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "🏀",
      title: "Sports Ball Trajectories",
      short: "Sports",
      tagline: "The science behind every perfect shot",
      description: "From basketball free throws to soccer kicks, athletes instinctively apply projectile motion principles to score. Coaches use trajectory analysis to optimize technique.",
      connection: "Every thrown, kicked, or hit ball follows a parabolic path governed by initial velocity, launch angle, and gravity. The 45° angle maximizes range, but real sports add spin and air resistance.",
      howItWorks: "A basketball released at the optimal 52° angle with backspin has higher success rates. The arc gives margin for error - the ball can enter the hoop from more angles than a flat shot.",
      stats: [
        "NBA free throw line is exactly 4.57m from the basket",
        "Optimal basketball release angle: 52° (not 45° due to height)",
        "A golf ball can reach 300+ yards at 250+ mph initial speed",
        "Soccer free kicks curve using Magnus effect + projectile motion"
      ],
      examples: [
        "Basketball arc shooting for higher success rate",
        "Golf club loft angles (drivers ~10°, wedges ~56°)",
        "Baseball outfielder predicting fly ball landing spots",
        "Tennis serve toss height and angle optimization"
      ],
      companies: ["Spalding", "Nike", "Callaway Golf", "Wilson Sporting Goods"],
      futureImpact: "AI coaching systems will use real-time trajectory analysis to give instant feedback, helping athletes optimize their technique with unprecedented precision.",
      color: "from-orange-600 to-amber-600"
    },
    {
      icon: "🚀",
      title: "Ballistics & Aerospace",
      short: "Aerospace",
      tagline: "From cannons to spacecraft trajectories",
      description: "Military ballistics and space mission planning rely on projectile motion equations extended to account for air resistance, Earth's rotation, and varying gravity.",
      connection: "The fundamental parabolic trajectory applies to everything from bullets to spacecraft. At larger scales, Earth's curvature and the Coriolis effect must be included.",
      howItWorks: "Artillery computers calculate trajectories accounting for muzzle velocity, angle, air density, wind, and even Earth's rotation. Spacecraft use similar principles for orbital insertion burns.",
      stats: [
        "ICBM trajectories reach 1,200+ km altitude",
        "Tank shells can travel 4+ km accurately",
        "Sniper bullets are affected by Earth's rotation over 1km",
        "Apollo missions used trajectory calculations for Moon landing"
      ],
      examples: [
        "Artillery fire control computers",
        "Spacecraft orbital transfer calculations",
        "Missile guidance systems",
        "Re-entry trajectory planning for capsules"
      ],
      companies: ["Lockheed Martin", "SpaceX", "Raytheon", "Boeing"],
      futureImpact: "Advanced AI will enable real-time trajectory optimization for hypersonic vehicles and autonomous spacecraft, making space travel more efficient and accessible.",
      color: "from-blue-600 to-indigo-600"
    },
    {
      icon: "⛲",
      title: "Water Features & Fountains",
      short: "Fountains",
      tagline: "Engineering beauty through physics",
      description: "Fountain designers use projectile motion to create stunning water displays. Multiple jets at different angles create symmetrical patterns that seem to defy gravity.",
      connection: "Each water jet follows a parabolic arc. Complementary angles (30° and 60°) create jets that land at the same spot. Adjusting pressure (velocity) changes arc height and distance.",
      howItWorks: "The Bellagio fountains use 1,214 nozzles firing water at precisely calculated angles and velocities. Computer control synchronizes jets to music, creating choreographed displays.",
      stats: [
        "Bellagio fountains shoot water 460 feet high",
        "Dubai Fountain jets reach 150 meters (500 feet)",
        "Precision nozzles control trajectory within millimeters",
        "Pump pressure directly controls launch velocity"
      ],
      examples: [
        "Bellagio Hotel dancing fountains in Las Vegas",
        "Dubai Fountain choreographed water shows",
        "Olympic stadium water feature displays",
        "Theme park water ride trajectory design"
      ],
      companies: ["WET Design", "Oase", "Fountain People", "Delta Fountains"],
      futureImpact: "Smart fountains will use AI to create dynamic shows that respond to audience, weather, and music in real-time, making each performance unique.",
      color: "from-cyan-600 to-blue-600"
    },
    {
      icon: "🚒",
      title: "Firefighting Operations",
      short: "Firefighting",
      tagline: "Reaching flames with physics precision",
      description: "Firefighters calculate water hose angles to reach upper floors and maximize coverage. The 45° angle maximizes horizontal distance for a given water pressure.",
      connection: "Water from a fire hose follows projectile motion. Higher pressure (velocity) and optimal angles determine how high and far water can reach to extinguish flames.",
      howItWorks: "Fire engines use high-pressure pumps to increase water velocity. Firefighters adjust nozzle angle based on distance and height. Ladder trucks position elevated streams for better angles.",
      stats: [
        "Fire hoses operate at 100-250 PSI",
        "Monitor nozzles can throw water 100+ meters",
        "Ladder trucks reach 100+ feet elevation",
        "Optimal angle for upper floors: 60-70° depending on distance"
      ],
      examples: [
        "Ground crews adjusting hose angles for reach",
        "Aerial ladder water streams hitting high floors",
        "Foam cannon trajectories for aircraft fires",
        "Sprinkler system spray pattern design"
      ],
      companies: ["Pierce Manufacturing", "E-ONE", "Rosenbauer", "Oshkosh"],
      futureImpact: "Autonomous firefighting drones will calculate optimal water trajectories in real-time, directing streams precisely to hotspots identified by thermal imaging.",
      color: "from-red-600 to-orange-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index]?.options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Render helper functions (NOT components)
  const renderBasketballCourt = (width: number, height: number) => {
    const angleRad = (launchAngle * Math.PI) / 180;
    const arrowLength = 50;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#4a7c9b" />
          </linearGradient>
          <linearGradient id="courtGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4a77d" />
            <stop offset="100%" stopColor="#a08060" />
          </linearGradient>
          <linearGradient id="ballGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff8c00" />
            <stop offset="50%" stopColor="#ff6600" />
            <stop offset="100%" stopColor="#cc4400" />
          </linearGradient>
          <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width={width} height="260" fill="url(#skyGradient)" />

        {/* Court floor */}
        <rect x="0" y="260" width={width} height="80" fill="url(#courtGradient)" />
        <line x1="0" y1="260" x2={width} y2="260" stroke="#8b7355" strokeWidth="3" />

        {/* Free throw line */}
        <line x1="60" y1="260" x2="60" y2="280" stroke="#ffffff" strokeWidth="2" />

        {/* Three-point arc (partial) */}
        <path d="M 0 260 Q 60 200 120 260" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.5" />

        {/* Backboard */}
        <rect x="345" y="100" width="12" height="90" fill="#ffffff" stroke="#333333" strokeWidth="2" />
        <rect x="348" y="140" width="6" height="30" fill="#ff0000" opacity="0.3" />

        {/* Hoop */}
        <ellipse cx={hoopX} cy={hoopY} rx="22" ry="6" fill="none" stroke="#ff6600" strokeWidth="5" />

        {/* Net */}
        <path
          d="M298 171 L305 210 M308 171 L312 210 M318 171 L318 210 M328 171 L324 210 M338 171 L331 210"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Launch angle indicator */}
        <line
          x1="60"
          y1="260"
          x2={60 + arrowLength * Math.cos(angleRad)}
          y2={260 - arrowLength * Math.sin(angleRad)}
          stroke="#ffff00"
          strokeWidth="3"
          strokeDasharray="6,4"
        />
        <text
          x={65 + 35 * Math.cos(angleRad)}
          y={255 - 35 * Math.sin(angleRad)}
          fill="#ffff00"
          fontSize="14"
          fontWeight="bold"
        >
          {launchAngle}°
        </text>

        {/* Trajectory path */}
        {showTrajectory && trajectoryPoints.length > 1 && (
          <polyline
            points={trajectoryPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#ffff00"
            strokeWidth="2"
            strokeDasharray="6,4"
            opacity="0.8"
          />
        )}

        {/* Basketball */}
        <circle
          cx={ballPosition.x}
          cy={ballPosition.y}
          r="14"
          fill="url(#ballGradient)"
          filter="url(#ballShadow)"
          stroke="#8b4513"
          strokeWidth="1"
        />
        {/* Ball lines */}
        <path
          d={`M${ballPosition.x - 14} ${ballPosition.y} Q${ballPosition.x} ${ballPosition.y - 4} ${ballPosition.x + 14} ${ballPosition.y}`}
          stroke="#333"
          strokeWidth="1.5"
          fill="none"
        />
        <line
          x1={ballPosition.x}
          y1={ballPosition.y - 14}
          x2={ballPosition.x}
          y2={ballPosition.y + 14}
          stroke="#333"
          strokeWidth="1.5"
        />

        {/* Score indicator */}
        {madeBasket !== null && (
          <g>
            <rect
              x={width / 2 - 60}
              y="30"
              width="120"
              height="40"
              rx="8"
              fill={madeBasket ? '#22c55e' : '#ef4444'}
              opacity="0.9"
            />
            <text
              x={width / 2}
              y="58"
              fontSize="20"
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              {madeBasket ? '🏀 SWISH!' : '❌ MISS!'}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Twist animation component (inline function)
  const renderTwistDemo = () => {
    const [dropY, setDropY] = useState(50);
    const [throwX, setThrowX] = useState(80);
    const [isDropping, setIsDropping] = useState(false);

    const startDrop = () => {
      if (isDropping) return;
      setIsDropping(true);
      setDropY(50);
      setThrowX(80);

      let t = 0;
      const interval = setInterval(() => {
        t += 0.08;
        const y = 50 + 100 * t * t;
        const x = 80 + 100 * t;

        setDropY(Math.min(y, 240));
        setThrowX(Math.min(x, 340));

        if (y >= 240) {
          clearInterval(interval);
          setTimeout(() => setIsDropping(false), 500);
        }
      }, 40);
    };

    return (
      <div className="flex flex-col items-center">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
          <svg width={isMobile ? 300 : 400} height={280} className="overflow-visible">
            {/* Background */}
            <rect x="0" y="0" width="100%" height="240" fill="#1e1e3f" rx="8" />

            {/* Ground */}
            <rect x="0" y="240" width="100%" height="40" fill="#4a3728" />
            <line x1="0" y1="240" x2="100%" y2="240" stroke="#6b5344" strokeWidth="2" />

            {/* Platform */}
            <rect x="50" y="40" width="80" height="10" fill="#64748b" rx="2" />

            {/* Labels */}
            <text x="70" y="30" fontSize="12" fill="#f97316" textAnchor="middle" fontWeight="bold">DROP</text>
            <text x="200" y="30" fontSize="12" fill="#3b82f6" textAnchor="middle" fontWeight="bold">THROW →</text>

            {/* Height reference line */}
            <line x1="40" y1="50" x2="40" y2="240" stroke="#555" strokeWidth="1" strokeDasharray="4,4" />

            {/* Dropped ball (orange) */}
            <circle cx="80" cy={dropY} r="16" fill="#f97316" stroke="#ea580c" strokeWidth="2" />

            {/* Thrown ball (blue) */}
            <circle cx={throwX} cy={dropY} r="16" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />

            {/* Impact markers */}
            {dropY >= 240 && (
              <>
                <circle cx="80" cy="240" r="20" fill="#f97316" opacity="0.3">
                  <animate attributeName="r" from="16" to="30" dur="0.3s" fill="freeze" />
                </circle>
                <circle cx={throwX} cy="240" r="20" fill="#3b82f6" opacity="0.3">
                  <animate attributeName="r" from="16" to="30" dur="0.3s" fill="freeze" />
                </circle>
                <text x="200" y="270" fontSize="14" fill="#22c55e" textAnchor="middle" fontWeight="bold">
                  SAME TIME!
                </text>
              </>
            )}
          </svg>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); startDrop(); }}
          disabled={isDropping}
          className={`px-6 py-3 ${isDropping ? 'bg-slate-600' : 'bg-purple-600 hover:bg-purple-500'} text-white font-semibold rounded-xl transition-colors`}
        >
          {isDropping ? 'Watch them fall...' : '▶ Drop Both Balls'}
        </button>
      </div>
    );
  };

  // Phase render functions
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent">
        The Perfect Free Throw
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Master the physics of projectile motion
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 rounded-3xl" />

        <div className="relative">
          <div className="mb-6">
            {renderBasketballCourt(isMobile ? 320 : 400, 300)}
          </div>

          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            A basketball follows a <span className="text-orange-400 font-bold">curved path</span> through the air on its way to the basket.
          </p>

          <p className="text-lg text-cyan-400 font-semibold">
            What determines whether the shot goes in?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Physics
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          10 Phases
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Make Your Prediction</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          You're launching a projectile and want maximum horizontal distance (range). Air resistance is negligible.
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          What launch angle gives the maximum range?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: '30° — Lower angle means more horizontal speed' },
          { id: 'B', text: '45° — Perfect balance between height and distance' },
          { id: 'C', text: '60° — Higher arc gives more time in the air' },
          { id: 'D', text: '90° — Straight up gives maximum height and time' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ 45° is the magic angle for maximum range!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Range = (v₀²sin(2θ))/g — sin(2θ) is maximized when 2θ = 90°, which means θ = 45°.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
          >
            Try It Yourself →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>Projectile Motion Lab</h2>

      {/* Court visualization */}
      <div className="bg-slate-800/30 rounded-2xl p-2 mb-4">
        {renderBasketballCourt(isMobile ? 340 : 420, isMobile ? 280 : 320)}
      </div>

      {/* Controls */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 w-full max-w-lg mb-4`}>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Launch Angle: {launchAngle}°
          </label>
          <input
            type="range"
            min="10"
            max="80"
            step="1"
            value={launchAngle}
            onChange={(e) => handleAngleChange(parseInt(e.target.value))}
            disabled={isLaunched}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10° (Flat)</span>
            <span>45° (Max)</span>
            <span>80° (High)</span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Launch Speed: {launchSpeed} m/s
          </label>
          <input
            type="range"
            min="8"
            max="25"
            step="0.5"
            value={launchSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            disabled={isLaunched}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>8 (Slow)</span>
            <span>25 (Fast)</span>
          </div>
        </div>
      </div>

      {/* Flight stats */}
      {trajectoryPoints.length > 0 && (
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-4">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-orange-400">{flightStats.time.toFixed(2)}s</div>
            <div className="text-xs text-slate-400">Flight Time</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{flightStats.maxHeight.toFixed(1)}m</div>
            <div className="text-xs text-slate-400">Max Height</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{flightStats.range.toFixed(1)}m</div>
            <div className="text-xs text-slate-400">Range</div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); launchBall(); }}
          disabled={isLaunched}
          className={`px-6 py-3 ${isLaunched ? 'bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-semibold rounded-xl transition-colors`}
        >
          {isLaunched ? '🏀 Flying...' : '▶ Launch!'}
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); resetBall(); }}
          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors"
        >
          ↺ Reset
        </button>
        <label className="flex items-center gap-2 px-4 py-3 bg-slate-700/50 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={showTrajectory}
            onChange={(e) => setShowTrajectory(e.target.checked)}
            className="accent-orange-500"
          />
          <span className="text-slate-300 text-sm">Show Path</span>
        </label>
      </div>

      {/* Key insight */}
      <div className="bg-gradient-to-r from-orange-900/40 to-amber-900/40 rounded-xl p-4 max-w-lg">
        <h3 className="text-sm font-semibold text-orange-400 mb-2">Try This!</h3>
        <p className="text-slate-300 text-sm">
          Compare 30° and 60° at the same speed. They land at the same distance! (Complementary angles)
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
      >
        Review the Physics →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>The Physics of Projectile Motion</h2>

      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-cyan-400 mb-3">→ Horizontal Motion</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p><strong>No horizontal force</strong> (ignoring air resistance)</p>
            <p>Velocity stays constant: <span className="text-cyan-400 font-mono">vₓ = v₀cos(θ)</span></p>
            <p>Position: <span className="text-cyan-400 font-mono">x = vₓ × t</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-emerald-400 mb-3">↓ Vertical Motion</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p><strong>Gravity pulls down</strong> at g = 9.8 m/s²</p>
            <p>Velocity changes: <span className="text-emerald-400 font-mono">vᵧ = v₀sin(θ) - gt</span></p>
            <p>Position: <span className="text-emerald-400 font-mono">y = vᵧt - ½gt²</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-orange-400 mb-3">📐 Maximum Range</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="font-mono text-orange-400">Range = (v₀² × sin(2θ)) / g</p>
            <p>sin(2θ) is maximum when 2θ = 90°</p>
            <p>Therefore <strong>θ = 45°</strong> gives maximum range</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-purple-400 mb-3">🔄 Complementary Angles</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p>Angles that add to 90° give <strong>same range</strong></p>
            <p>30° and 60° land at the same spot</p>
            <p>20° and 70° also land together</p>
            <p className="text-purple-400">Different paths, same destination!</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>🌟 The Twist Challenge</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          You hold two identical balls at the same height. You <span className="text-orange-400 font-bold">drop</span> one straight down and <span className="text-blue-400 font-bold">throw</span> the other perfectly horizontally.
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          Which ball hits the ground first?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The dropped ball — it goes straight down' },
          { id: 'B', text: 'The thrown ball — it has more energy' },
          { id: 'C', text: 'They hit at exactly the same time' },
          { id: 'D', text: 'It depends on how fast you throw' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ They hit at exactly the same time!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This seems impossible, but horizontal and vertical motions are completely independent. Gravity pulls both down equally, regardless of horizontal speed!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See It In Action →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>Independence of Motion</h2>

      {renderTwistDemo()}

      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 mt-6 max-w-lg">
        <h3 className="text-lg font-semibold text-purple-400 mb-2">Why This Works</h3>
        <p className="text-slate-300 text-sm">
          Gravity only affects <strong>vertical</strong> motion. The thrown ball travels farther horizontally, but falls at the exact same rate. Both follow: y = ½gt²
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Independence of Horizontal and Vertical Motion</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            This is one of the most important principles in physics:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-orange-400 font-semibold mb-2">Dropped Ball</h4>
              <p className="text-sm">y = ½gt²</p>
              <p className="text-xs text-slate-400 mt-1">Pure vertical motion</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-blue-400 font-semibold mb-2">Thrown Ball</h4>
              <p className="text-sm">y = ½gt² (same!)</p>
              <p className="text-sm">x = vₓt (bonus motion)</p>
            </div>
          </div>
          <p className="text-amber-400 font-medium mt-4">
            A bullet fired horizontally from a gun hits the ground at the same time as one simply dropped from the same height!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Real-World Applications</h2>

      {/* App tabs */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppIndex(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      {/* Active app content */}
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppIndex].title}</h3>
            <p className="text-sm text-slate-400">{transferApps[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppIndex].description}</p>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection</h4>
            <p className="text-slate-400 text-sm">{transferApps[activeAppIndex].connection}</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">How It Works</h4>
            <p className="text-slate-400 text-sm">{transferApps[activeAppIndex].howItWorks}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-emerald-400 mb-2">Key Stats</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              {transferApps[activeAppIndex].stats.map((stat, i) => (
                <li key={i}>• {stat}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">Examples</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              {transferApps[activeAppIndex].examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-3 mb-4">
          <h4 className="text-sm font-semibold text-pink-400 mb-2">Industry Leaders</h4>
          <div className="flex flex-wrap gap-2">
            {transferApps[activeAppIndex].companies.map((company, i) => (
              <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-slate-300 text-sm">
                {company}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Future Impact</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppIndex].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppIndex); }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors w-full"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-4 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm italic mb-2">{q.scenario}</p>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              onGameEvent?.({ type: 'test_completed', data: { score: calculateScore() } });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏀' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered Projectile Motion!'
                : 'Keep practicing! Review the concepts and try again.'}
            </p>

            {calculateScore() >= 7 ? (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                Claim Your Mastery Badge →
              </button>
            ) : (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTestResults(false);
                  setTestAnswers(Array(10).fill(-1));
                  goToPhase(3);
                }}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
              >
                Review & Try Again
              </button>
            )}
          </div>

          {/* Show explanations */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-slate-300">Review Answers:</h4>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = q.options[userAnswer]?.correct;
              return (
                <div key={qIndex} className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-900/30 border border-emerald-600' : 'bg-red-900/30 border border-red-600'}`}>
                  <p className="text-sm text-slate-400 mb-1">Q{qIndex + 1}: {q.question}</p>
                  <p className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {q.options[userAnswer]?.text}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-emerald-400">
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-amber-900/50 to-yellow-900/50 rounded-3xl p-6 md:p-8 max-w-2xl">
        <div className="text-7xl md:text-8xl mb-6">🏀</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Projectile Motion Master!
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-6">
          You can now predict where any thrown object will land!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">📐</div>
            <p className="text-xs text-slate-300">45° Max Range</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">⬌</div>
            <p className="text-xs text-slate-300">Independence</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">🎯</div>
            <p className="text-xs text-slate-300">Parabolic Path</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">🔄</div>
            <p className="text-xs text-slate-300">Complementary</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setPhase(0);
              setShowPredictionFeedback(false);
              setSelectedPrediction(null);
              setTwistPrediction(null);
              setShowTwistFeedback(false);
              setTestAnswers(Array(10).fill(-1));
              setShowTestResults(false);
              setCompletedApps(new Set());
              resetBall();
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Projectile Motion</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        {phase === 0 && renderHook()}
        {phase === 1 && renderPredict()}
        {phase === 2 && renderPlay()}
        {phase === 3 && renderReview()}
        {phase === 4 && renderTwistPredict()}
        {phase === 5 && renderTwistPlay()}
        {phase === 6 && renderTwistReview()}
        {phase === 7 && renderTransfer()}
        {phase === 8 && renderTest()}
        {phase === 9 && renderMastery()}
      </div>
    </div>
  );
};

export default ProjectileMotionRenderer;
