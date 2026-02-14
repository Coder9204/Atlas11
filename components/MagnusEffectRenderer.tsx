'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Magnus Effect - Complete 10-Phase Game
// How spinning balls curve through the air
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface MagnusEffectRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A soccer player is taking a free kick. The defensive wall is blocking the direct path to the goal, so the player decides to curve the ball around the wall.",
    question: "What must the player do to make the ball curve to the right (from the kicker's perspective)?",
    options: [
      { id: 'a', label: "Kick the ball with their toe to add extra force" },
      { id: 'b', label: "Strike the ball on the left side to impart clockwise spin (viewed from above)", correct: true },
      { id: 'c', label: "Kick the ball as hard as possible in a straight line" },
      { id: 'd', label: "Wait for a strong crosswind to push the ball" }
    ],
    explanation: "To curve a ball to the right, the player strikes the left side of the ball, imparting clockwise spin (viewed from above). The Magnus effect creates a pressure difference that pushes the ball in the direction of the spin."
  },
  {
    scenario: "A baseball pitcher is throwing a curveball. The batter expects the ball to arrive at chest height, but it drops dramatically as it reaches home plate.",
    question: "What type of spin did the pitcher put on the ball?",
    options: [
      { id: 'a', label: "Backspin, causing the ball to rise" },
      { id: 'b', label: "Topspin, causing the ball to drop faster than gravity alone", correct: true },
      { id: 'c', label: "No spin - the ball naturally curves due to air resistance" },
      { id: 'd', label: "Sidespin, causing horizontal movement" }
    ],
    explanation: "Topspin creates lower pressure above the ball and higher pressure below, resulting in a downward Magnus force that adds to gravity. This makes the ball drop faster than the batter expects."
  },
  {
    scenario: "A golfer hits a drive and notices the ball climbs higher than expected and travels much farther than a non-spinning ball would. The ball appears to 'float' through the air.",
    question: "What causes this extended flight?",
    options: [
      { id: 'a', label: "The golf ball is lighter than it appears" },
      { id: 'b', label: "Wind currents are lifting the ball" },
      { id: 'c', label: "Backspin creates lift via the Magnus effect, counteracting some gravity", correct: true },
      { id: 'd', label: "The dimples trap air that propels the ball forward" }
    ],
    explanation: "Backspin creates higher air speed above the ball (where the spin adds to airflow) and lower speed below. This pressure difference creates lift that partially counteracts gravity, allowing the ball to stay airborne longer."
  },
  {
    scenario: "Two identical balls are thrown at the same speed. Ball A has heavy topspin while Ball B has no spin. Both balls start at the same height.",
    question: "What will happen to these balls' trajectories?",
    options: [
      { id: 'a', label: "Both balls will land at the same spot since they have the same speed" },
      { id: 'b', label: "Ball A will land shorter and lower because topspin adds to gravity's effect", correct: true },
      { id: 'c', label: "Ball B will land first because spin slows Ball A down" },
      { id: 'd', label: "Ball A will travel farther because spin reduces air resistance" }
    ],
    explanation: "Topspin creates a downward Magnus force that adds to gravity, causing Ball A to curve downward more sharply than Ball B. Ball A will hit the ground sooner and travel a shorter horizontal distance."
  },
  {
    scenario: "A table tennis player notices their opponent is using a very smooth paddle, yet their shots still curve dramatically. The player examines the ball and notices it has a rough surface texture.",
    question: "How does the ball's surface roughness affect the Magnus force?",
    options: [
      { id: 'a', label: "Roughness has no effect - only spin rate matters" },
      { id: 'b', label: "Rough surfaces increase the boundary layer interaction, enhancing the Magnus effect", correct: true },
      { id: 'c', label: "Smooth balls always curve more than rough balls" },
      { id: 'd', label: "Roughness only affects the ball's speed, not its curve" }
    ],
    explanation: "Surface roughness (like golf ball dimples or baseball seams) increases the interaction between the ball and the boundary layer of air. This enhanced grip on the air amplifies the Magnus effect, creating stronger curves."
  },
  {
    scenario: "An engineer is designing a Flettner rotor ship that uses spinning vertical cylinders to generate thrust from crosswinds. The rotors spin clockwise when viewed from above.",
    question: "When wind blows from the right (starboard), which direction will the Magnus force push the ship?",
    options: [
      { id: 'a', label: "Backwards, slowing the ship down" },
      { id: 'b', label: "To the right, into the wind" },
      { id: 'c', label: "Forward, propelling the ship", correct: true },
      { id: 'd', label: "The ship will spin in circles" }
    ],
    explanation: "The Magnus force acts perpendicular to both the wind direction and the spin axis. With clockwise rotation and wind from the right, the force points forward. On the right side of the rotor, spin opposes wind (high pressure); on the left, spin aids wind (low pressure). This pressure difference pushes forward."
  },
  {
    scenario: "A physicist calculates that increasing the spin rate of a ball from 1000 RPM to 2000 RPM while keeping velocity constant should double the Magnus force.",
    question: "What is the relationship between spin rate and Magnus force magnitude?",
    options: [
      { id: 'a', label: "Magnus force is independent of spin rate" },
      { id: 'b', label: "Magnus force is proportional to spin rate - double spin means double force", correct: true },
      { id: 'c', label: "Magnus force increases with the square of spin rate" },
      { id: 'd', label: "Magnus force decreases as spin rate increases due to turbulence" }
    ],
    explanation: "The Magnus force is proportional to both the spin rate and the velocity of the object. The lift coefficient CL increases linearly with the spin parameter (surface velocity / flow velocity), so doubling spin approximately doubles the force."
  },
  {
    scenario: "A volleyball player serves a 'float serve' with minimal spin. The ball wobbles unpredictably and is extremely difficult to return. Surprisingly, sometimes the ball curves opposite to the expected direction.",
    question: "What phenomenon explains this unexpected behavior?",
    options: [
      { id: 'a', label: "The player is secretly adding hidden spin" },
      { id: 'b', label: "Air currents in the gym are unpredictable" },
      { id: 'c', label: "At certain speeds and low spin, the 'reverse Magnus effect' can occur", correct: true },
      { id: 'd', label: "Volleyballs have special aerodynamic properties" }
    ],
    explanation: "The reverse Magnus effect occurs when a smooth ball with low spin moves at speeds where the boundary layer transitions from laminar to turbulent asymmetrically. This can cause the ball to curve opposite to the normal Magnus direction, making float serves highly unpredictable."
  },
  {
    scenario: "A tennis player hits a heavy topspin forehand. The ball clears the net with plenty of room but then dips sharply and lands inside the baseline.",
    question: "Why can players hit the ball harder with topspin without it going out?",
    options: [
      { id: 'a', label: "Topspin slows the ball down through increased air resistance" },
      { id: 'b', label: "The downward Magnus force curves the ball back into the court", correct: true },
      { id: 'c', label: "Topspin makes the ball heavier so it falls faster" },
      { id: 'd', label: "The opponent's court has a slight incline" }
    ],
    explanation: "Topspin creates a downward Magnus force that adds to gravity, causing the ball to dip sharply. This allows players to hit with more pace while still keeping the ball in the court - the topspin 'pulls' the ball down into the playing area."
  },
  {
    scenario: "An aerospace engineer is studying why artillery shells are rifled (given spin by spiral grooves in the gun barrel). The shells spin around their long axis as they fly.",
    question: "Besides stability, how does spin affect a projectile's trajectory through crosswinds?",
    options: [
      { id: 'a', label: "Spin has no effect on crosswind drift" },
      { id: 'b', label: "Spinning projectiles drift perpendicular to the crosswind direction due to Magnus force", correct: true },
      { id: 'c', label: "Spin cancels out all crosswind effects completely" },
      { id: 'd', label: "Spinning shells fly faster through crosswinds" }
    ],
    explanation: "When a crosswind hits a spinning projectile, the Magnus effect creates a force perpendicular to both the wind direction and the spin axis. This causes the shell to drift in a predictable direction (called 'spin drift'), which must be compensated for in aiming."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '⚽',
    title: 'Sports Ball Trajectory',
    short: 'Curved shots in football, baseball, golf',
    tagline: 'Bend it like Beckham - with physics',
    description: 'Professional athletes exploit the Magnus effect to curve balls through the air. Soccer free kicks that bend around walls, baseball curveballs that drop suddenly, and golf drives that carry extra distance all rely on spin-induced aerodynamic forces.',
    connection: 'The simulation showed how topspin, backspin, and sidespin create pressure differentials. In sports, players intuitively control spin rate and axis to achieve specific trajectories - making physics their secret weapon.',
    howItWorks: 'Spinning ball drags air in rotation direction, creating asymmetric flow. Bernoulli principle causes pressure difference. Net force perpendicular to velocity curves trajectory. Spin axis determines curve direction.',
    stats: [
      { value: '50%', label: 'Drag reduction (dimples)', icon: '⚾' },
      { value: '8 m', label: 'Maximum ball curve', icon: '📐' },
      { value: '$50 billion', label: 'Global sports equipment', icon: '📈' }
    ],
    examples: ['Roberto Carlos free kick', 'Clayton Kershaw curveball', 'Dustin Johnson drives', 'Table tennis loops'],
    companies: ['Trackman', 'Rapsodo', 'Callaway', 'Wilson'],
    futureImpact: 'AI-powered spin tracking will enable personalized coaching apps that teach optimal ball spin for any skill level.',
    color: '#22c55e'
  },
  {
    icon: '⛵',
    title: 'Flettner Rotor Ships',
    short: 'Spinning cylinders for ship propulsion',
    tagline: 'Harnessing wind without sails',
    description: 'Rotor ships use spinning vertical cylinders (Flettner rotors) to generate thrust from crosswinds via the Magnus effect. Modern cargo ships install these rotors to reduce fuel consumption by 10-30%, cutting emissions while maintaining schedules.',
    connection: 'The game demonstrated how spinning objects in airflow experience perpendicular forces. Flettner rotors scale this up - 30-meter spinning cylinders generate enough Magnus force to propel massive cargo vessels.',
    howItWorks: 'Electric motors spin cylinders at 100-200 rpm. Wind flowing past creates Magnus lift perpendicular to wind direction. Ship\'s course determines which direction this force provides thrust. Automated control optimizes rotor speed.',
    stats: [
      { value: '30%', label: 'Fuel savings possible', icon: '⛽' },
      { value: '100+', label: 'Ships with rotors', icon: '🚢' },
      { value: '35m', label: 'Tallest rotor installed', icon: '📏' }
    ],
    examples: ['E-Ship 1', 'Viking Grace', 'Maersk Pelican', 'Sea Cargo vessels'],
    companies: ['Norsepower', 'Anemoi Marine', 'Bound4Blue', 'Eco Marine Power'],
    futureImpact: 'IMO 2030 emissions targets will drive widespread adoption, with hybrid rotor-electric ships becoming standard for transoceanic shipping.',
    color: '#3b82f6'
  },
  {
    icon: '✈️',
    title: 'Boundary Layer Control',
    short: 'Spinning leading edges for aircraft',
    tagline: 'Extra lift when you need it most',
    description: 'Experimental aircraft use spinning cylinders at wing leading edges to delay flow separation and increase lift. The Magnus effect energizes the boundary layer, allowing steeper approach angles and shorter landing distances.',
    connection: 'The simulation showed how spin affects the wake behind a ball. On aircraft, spinning cylinders similarly modify airflow, keeping it attached to the wing surface longer for enhanced lift.',
    howItWorks: 'Rotating cylinders at wing leading edge accelerate boundary layer air. Higher local velocity delays flow separation. Lift coefficient increases dramatically. Most effective at high angles of attack during takeoff/landing.',
    stats: [
      { value: '30%', label: 'Lift increase possible', icon: '📈' },
      { value: '25%', label: 'Shorter runway needed', icon: '🛬' },
      { value: '15 deg', label: 'Higher stall angle', icon: '📐' }
    ],
    examples: ['STOL aircraft', 'Bush planes', 'UAV designs', 'Wind tunnel research'],
    companies: ['NASA', 'DARPA', 'Airbus', 'Joby Aviation'],
    futureImpact: 'Urban air mobility vehicles may use Magnus lift augmentation for quiet, steep approaches into city vertiports.',
    color: '#8b5cf6'
  },
  {
    icon: '🎯',
    title: 'Projectile Guidance',
    short: 'Spin-stabilized smart munitions',
    tagline: 'Precision from physics, not explosives',
    description: 'Modern guided projectiles use spin for stability and small fins or Magnus effect to steer. By controlling spin rate and asymmetry, projectiles can correct trajectory mid-flight without complex guidance systems, improving accuracy from kilometers away.',
    connection: 'The game\'s sidespin demonstration shows how spinning objects curve predictably. Guided projectiles exploit this: intentional spin asymmetries or small actuators create controlled Magnus forces for steering.',
    howItWorks: 'Spinning projectile has gyroscopic stability. Asymmetric surfaces or deployable tabs create lift differential via Magnus effect. GPS/IMU detects drift from target. Small corrections accumulate into precision strikes.',
    stats: [
      { value: '30km', label: 'Guided artillery range', icon: '🎯' },
      { value: '1m', label: 'CEP accuracy achieved', icon: '📍' },
      { value: '150 rpm', label: 'Typical spin rate', icon: '🔄' }
    ],
    examples: ['Excalibur shells', 'PGK fuzes', 'Guided mortars', 'Extended range munitions'],
    companies: ['Raytheon', 'BAE Systems', 'Northrop Grumman', 'General Dynamics'],
    futureImpact: 'Affordable precision guidance will make all artillery as accurate as missiles, changing military tactics fundamentally.',
    color: '#ef4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const MagnusEffectRenderer: React.FC<MagnusEffectRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [spinRate, setSpinRate] = useState(50);
  const [ballSpeed, setBallSpeed] = useState(50);
  const [spinDirection, setSpinDirection] = useState<'topspin' | 'backspin' | 'sidespin'>('topspin');
  const [isAnimating, setIsAnimating] = useState(false);
  const [ballX, setBallX] = useState(50);
  const [ballY, setBallY] = useState(150);
  const [ballRotation, setBallRotation] = useState(0);
  const [trajectory, setTrajectory] = useState<{x: number, y: number}[]>([]);

  // Twist phase - different ball surfaces
  const [ballSurface, setBallSurface] = useState<'smooth' | 'rough' | 'dimpled'>('rough');
  const [twistSpinRate, setTwistSpinRate] = useState(50);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ball flight animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setBallX(prev => {
        const newX = prev + ballSpeed / 10;
        if (newX > 380) {
          setIsAnimating(false);
          return 50;
        }
        return newX;
      });

      setBallY(prev => {
        const magnusForce = (spinRate / 100) * (spinDirection === 'topspin' ? 0.8 : spinDirection === 'backspin' ? -0.8 : 0);
        const gravity = 0.15;
        const newY = prev + magnusForce + gravity;
        return Math.max(30, Math.min(280, newY));
      });

      setBallRotation(prev => prev + spinRate / 5);

      setTrajectory(prev => {
        const newTraj = [...prev, { x: ballX, y: ballY }];
        if (newTraj.length > 50) newTraj.shift();
        return newTraj;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating, ballSpeed, spinRate, spinDirection, ballX, ballY]);

  // Calculate Magnus force for display
  const magnusForce = ((spinRate / 100) * (ballSpeed / 100) * 10).toFixed(1);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for sports/Magnus
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Twist',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'magnus-effect',
        gameTitle: 'Magnus Effect',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const startAnimation = useCallback(() => {
    setBallX(50);
    setBallY(150);
    setTrajectory([]);
    setIsAnimating(true);
  }, []);

  // Ball Visualization SVG Component
  const BallVisualization = ({ showAirflow = false }: { showAirflow?: boolean }) => {
    const width = isMobile ? 340 : 400;
    const height = isMobile ? 280 : 320;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1929" />
            <stop offset="50%" stopColor="#1a4a6e" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <radialGradient id="ballGradient" cx="35%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#fca5a5" />
            <stop offset="70%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#skyGradient)" rx="12" />

        {/* Grid pattern */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`vg-${i}`} x1={i * 20} y1="0" x2={i * 20} y2={height} stroke="#3b82f6" strokeWidth="1" opacity="0.1" strokeDasharray="4 4" />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`hg-${i}`} x1="0" y1={i * 20} x2={width} y2={i * 20} stroke="#3b82f6" strokeWidth="1" opacity="0.1" strokeDasharray="4 4" />
        ))}

        {/* Reference trajectory (no spin - straight line with gravity) */}
        <path
          d={`M 50 ${height * 0.35} L 80 ${height * 0.38} L 110 ${height * 0.42} L 140 ${height * 0.47} L 170 ${height * 0.53} L 200 ${height * 0.6} L 230 ${height * 0.68} L 260 ${height * 0.72} L 290 ${height * 0.76} L 320 ${height * 0.8} L 350 ${height * 0.85}`}
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.5"
        />
        <text x={width - 80} y={height * 0.88} fill="#64748b" fontSize="11">No-spin baseline</text>

        {/* Trajectory trail */}
        {trajectory.length > 1 && (
          <path
            d={`M ${trajectory.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        )}

        {/* Airflow visualization */}
        {showAirflow && (
          <g>
            {/* Fast airflow (top - low pressure) */}
            <g opacity="0.6">
              {[0, 1, 2].map((i) => (
                <path
                  key={`fast-${i}`}
                  d={`M${60 + i * 20},${ballY - 40 + i * 8} Q${ballX},${ballY - 60 + i * 5} ${ballX + 100 - i * 20},${ballY - 40 + i * 8}`}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth={3 - i * 0.5}
                  strokeLinecap="round"
                />
              ))}
              <text x={ballX} y={ballY - 70} textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">
                FAST = LOW P
              </text>
            </g>

            {/* Slow airflow (bottom - high pressure) */}
            <g opacity="0.6">
              {[0, 1, 2].map((i) => (
                <path
                  key={`slow-${i}`}
                  d={`M${60 + i * 20},${ballY + 40 - i * 8} Q${ballX},${ballY + 60 - i * 5} ${ballX + 100 - i * 20},${ballY + 40 - i * 8}`}
                  fill="none"
                  stroke="#f87171"
                  strokeWidth={3 - i * 0.5}
                  strokeLinecap="round"
                  strokeDasharray="8,4"
                />
              ))}
              <text x={ballX} y={ballY + 85} textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="bold">
                SLOW = HIGH P
              </text>
            </g>

            {/* Magnus force arrow */}
            <g filter="url(#glowFilter)">
              <line
                x1={ballX}
                y1={ballY + 30}
                x2={ballX}
                y2={ballY - 40}
                stroke="#22c55e"
                strokeWidth="4"
                markerEnd="url(#forceArrow)"
              />
            </g>
            <defs>
              <marker id="forceArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
              </marker>
            </defs>
            <text x={ballX + 20} y={ballY - 10} fill="#22c55e" fontSize="11" fontWeight="bold">
              Magnus Force
            </text>
          </g>
        )}

        {/* Ball */}
        <g transform={`translate(${ballX}, ${ballY})`} filter="url(#glowFilter)">
          <circle r="25" fill="url(#ballGradient)" />
          {/* Seam lines with rotation */}
          <g transform={`rotate(${ballRotation})`}>
            <ellipse rx="15" ry="10" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
          </g>
          {/* Spin direction indicator */}
          {spinDirection === 'topspin' && (
            <path d="M-15,-35 A20,20 0 0 1 15,-35" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#spinArrow)" />
          )}
          {spinDirection === 'backspin' && (
            <path d="M15,-35 A20,20 0 0 0 -15,-35" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#spinArrow)" />
          )}
          {spinDirection === 'sidespin' && (
            <path d="M35,-15 A20,20 0 0 1 35,15" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#spinArrow)" />
          )}
          <defs>
            <marker id="spinArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#fbbf24" />
            </marker>
          </defs>
          <text x="0" y="-45" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">
            {spinDirection.toUpperCase()}
          </text>
        </g>

        {/* Target zone */}
        <rect x={width - 45} y="80" width="30" height="160" fill="rgba(34, 197, 94, 0.1)" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" rx="4" />
        <text x={width - 30} y={height - 20} textAnchor="middle" fill="#22c55e" fontSize="11">TARGET</text>

        {/* Stats display */}
        <g>
          <rect x="10" y="10" width="100" height="60" rx="6" fill="rgba(0,0,0,0.5)" />
          <text x="20" y="30" fill={colors.textMuted} fontSize="11">Spin: {spinRate}%</text>
          <text x="20" y="45" fill={colors.textMuted} fontSize="11">Speed: {ballSpeed}%</text>
          <text x="20" y="60" fill={colors.accent} fontSize="11">Force: {magnusForce}N</text>
        </g>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Bottom navigation bar with Back / Next + dots
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bgPrimary,
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.border,
            cursor: canGoBack ? 'pointer' : 'default',
            fontWeight: 600,
            minHeight: '44px',
            opacity: canGoBack ? 1 : 0.4,
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              title={phaseLabels[p]}
              aria-label={phaseLabels[p]}
              style={{
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <span style={{
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                transition: 'all 0.3s ease',
                display: 'block',
              }} />
            </button>
          ))}
        </div>
        <button
          onClick={() => currentIndex < phaseOrder.length - 1 && nextPhase()}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            background: currentIndex < phaseOrder.length - 1 ? colors.accent : colors.border,
            color: 'white',
            cursor: currentIndex < phaseOrder.length - 1 ? 'pointer' : 'default',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'spin 3s linear infinite',
        }}>
          ⚽🏀
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Magnus Effect
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A pitcher throws a perfect curveball. The batter swings at chest height... but the ball drops into the dirt. How does a spinning ball <span style={{ color: colors.accent }}>defy expectations</span>?"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "The Magnus effect is behind every banana kick, every knuckleball, every golf drive that seems to float on air. It's the secret physics that makes sports beautiful."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Sports Aerodynamics
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Discovery
        </button>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The spin adds extra weight to the ball, pulling it down' },
      { id: 'b', text: 'Spin creates different air pressures on opposite sides of the ball', correct: true },
      { id: 'c', text: 'The air "grabs" the ball and pulls it in the spin direction' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A ball is thrown with topspin (rotating forward). Why does it curve downward?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="300" height="150" style={{ maxWidth: '100%' }}>
              <rect width="300" height="150" fill="#1e3a5f" rx="8" />
              <circle cx="80" cy="75" r="25" fill="#dc2626" />
              <path d="M55,55 A30,30 0 0 1 105,55" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#predArrow)" />
              <text x="80" y="40" textAnchor="middle" fill="#fbbf24" fontSize="11">Topspin</text>
              <line x1="110" y1="75" x2="250" y2="75" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5,5" />
              <text x="180" y="65" fill="#e2e8f0" fontSize="11">Which way?</text>
              <path d="M250,75 L250,120" stroke="#22c55e" strokeWidth="3" markerEnd="url(#downArrow)" />
              <path d="M250,75 L250,30" stroke="#ef4444" strokeWidth="3" markerEnd="url(#upArrow)" />
              <defs>
                <marker id="predArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L7,3 z" fill="#fbbf24" />
                </marker>
                <marker id="downArrow" markerWidth="8" markerHeight="8" refX="3" refY="0" orient="auto">
                  <path d="M0,0 L6,0 L3,8 z" fill="#22c55e" />
                </marker>
                <marker id="upArrow" markerWidth="8" markerHeight="8" refX="3" refY="8" orient="auto">
                  <path d="M0,8 L6,8 L3,0 z" fill="#ef4444" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Ball Spin Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '800px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Magnus Effect Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Observe how spin rate and speed affect the ball trajectory. Watch the curve change as you increase spin - when you increase spin rate, the ball curves more because the pressure difference grows.
          </p>

          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            This technology is used in sports engineering, ship design, and aerospace applications every day.
          </p>

          {/* Formula display */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              <strong>F = CL × (1/2)pv² × A</strong>
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '4px', marginBottom: 0 }}>
              Magnus force is proportional to spin rate and velocity squared
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <BallVisualization showAirflow={true} />
            </div>

            {/* Spin rate slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Spin Rate (0%)</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{spinRate}%</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>(100%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={spinRate}
                onChange={(e) => setSpinRate(parseInt(e.target.value))}
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '10px',
                  background: `linear-gradient(to right, ${colors.accent} ${spinRate}%, ${colors.border} ${spinRate}%)`,
                  cursor: 'pointer',
                } as React.CSSProperties}
              />
            </div>

            {/* Ball speed slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Ball Speed (20%)</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{ballSpeed}%</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>(100%)</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={ballSpeed}
                onChange={(e) => setBallSpeed(parseInt(e.target.value))}
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '10px',
                  background: `linear-gradient(to right, ${colors.warning} ${ballSpeed}%, ${colors.border} ${ballSpeed}%)`,
                  cursor: 'pointer',
                } as React.CSSProperties}
              />
            </div>

            {/* Spin direction buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
              {(['topspin', 'backspin', 'sidespin'] as const).map(dir => (
                <button
                  key={dir}
                  onClick={() => setSpinDirection(dir)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: spinDirection === dir ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    background: spinDirection === dir ? `${colors.accent}22` : 'transparent',
                    color: spinDirection === dir ? colors.accent : colors.textSecondary,
                    cursor: 'pointer',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {dir}
                </button>
              ))}
            </div>

            {/* Throw button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => {
                  startAnimation();
                  playSound('click');
                }}
                disabled={isAnimating}
                style={{
                  padding: '14px 32px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isAnimating ? colors.border : colors.accent,
                  color: 'white',
                  fontWeight: 700,
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                }}
              >
                {isAnimating ? 'Flying...' : 'Throw Ball'}
              </button>
            </div>
          </div>

          {/* Comparison: current vs baseline values */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.accent }}>{magnusForce}N</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Current Force</div>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.warning }}>{spinRate}%</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Spin Rate</div>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.success }}>{ballSpeed}%</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Ball Speed</div>
            </div>
          </div>

          {/* Explanation box */}
          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              How the Magnus Effect Works
            </h3>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p><strong>1.</strong> The spinning ball drags air around with it (boundary layer)</p>
              <p><strong>2.</strong> On one side, spin adds to airflow speed. On the other, it subtracts.</p>
              <p><strong>3.</strong> Faster air = lower pressure (Bernoulli&#39;s principle)</p>
              <p><strong>4.</strong> The ball curves toward the low-pressure side!</p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const userPredictionText = prediction === 'b'
      ? "You correctly predicted that spin creates different air pressures!"
      : prediction === 'a'
        ? "You predicted spin adds weight - actually, spin creates pressure differences!"
        : prediction === 'c'
          ? "You predicted air 'grabs' the ball - close! It's about pressure differences from airflow."
          : "Let's see how your prediction compares to the physics.";

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            The Physics of the Magnus Effect
          </h2>

          {/* Reference to user's prediction */}
          <div style={{
            background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}44`,
          }}>
            <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
              {prediction === 'b' ? '✓' : '→'} {userPredictionText}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>F = CL x (1/2)pv^2 x A</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The Magnus force depends on:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><span style={{ color: colors.accent }}>CL</span> - Lift coefficient (depends on spin rate)</li>
                <li><span style={{ color: colors.accent }}>p</span> - Air density</li>
                <li><span style={{ color: colors.accent }}>v</span> - Ball velocity (squared!)</li>
                <li><span style={{ color: colors.accent }}>A</span> - Cross-sectional area</li>
              </ul>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⬇️</div>
              <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Topspin</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>Ball curves DOWN. Used in tennis groundstrokes, soccer shots.</p>
            </div>
            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⬆️</div>
              <h4 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Backspin</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>Ball floats UP. Used in golf drives, basketball shots.</p>
            </div>
            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>↔️</div>
              <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Sidespin</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>Ball curves LEFT/RIGHT. Used in curveballs, banana kicks.</p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Key Insight: Pressure Differential
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The spinning ball creates an asymmetric airflow. Where the ball surface moves WITH the air, speed increases and pressure drops. Where it moves AGAINST the air, speed decreases and pressure rises. The ball is pushed from high to low pressure!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The curve gets even stronger with extreme spin' },
      { id: 'b', text: 'The ball goes perfectly straight at very high speeds' },
      { id: 'c', text: 'The curve can actually REVERSE direction!', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Ball Surface &amp; Extreme Conditions
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens when a smooth ball spins VERY fast at VERY high speeds?
          </h2>

          {/* SVG diagram showing surface comparison */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="320" height="200" viewBox="0 0 320 200" style={{ maxWidth: '100%' }}>
              <rect width="320" height="200" fill="#1e3a5f" rx="8" />
              {/* Smooth ball */}
              <circle cx="60" cy="80" r="25" fill="#fbbf24" opacity="0.8" />
              <text x="60" y="125" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">Smooth</text>
              {/* Seamed ball */}
              <circle cx="160" cy="80" r="25" fill="#dc2626" />
              <ellipse cx="160" cy="80" rx="15" ry="12" fill="none" stroke="white" strokeWidth="1.5" />
              <text x="160" y="125" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="bold">Seamed</text>
              {/* Dimpled ball */}
              <circle cx="260" cy="80" r="25" fill="#e2e8f0" />
              <circle cx="252" cy="73" r="2" fill="#94a3b8" />
              <circle cx="260" cy="70" r="2" fill="#94a3b8" />
              <circle cx="268" cy="73" r="2" fill="#94a3b8" />
              <circle cx="255" cy="82" r="2" fill="#94a3b8" />
              <circle cx="265" cy="82" r="2" fill="#94a3b8" />
              <text x="260" y="125" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Dimpled</text>
              {/* Label */}
              <text x="160" y="165" textAnchor="middle" fill="#94a3b8" fontSize="12">Surface affects Magnus force strength</text>
              {/* Reference arrows */}
              <path d="M60 40 L60 20 L110 20" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#twistArrow)" />
              <text x="130" y="18" fill="#f59e0b" fontSize="11">Reverse possible!</text>
              <defs>
                <marker id="twistArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
                </marker>
              </defs>
            </svg>
            <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px' }}>
              Different sports use different ball surfaces - some are smooth (volleyball), some have seams (baseball), some have dimples (golf).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate curve direction based on surface
    const getCurveDirection = () => {
      if (ballSurface === 'smooth' && twistSpinRate > 70) {
        return 'REVERSED!';
      }
      return 'Normal';
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '800px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Ball Surface Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare how different ball surfaces affect the Magnus effect
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Surface selector */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
              {([
                { id: 'smooth', label: 'Smooth', icon: '🏐', desc: 'Volleyball' },
                { id: 'rough', label: 'Seamed', icon: '⚾', desc: 'Baseball' },
                { id: 'dimpled', label: 'Dimpled', icon: '⛳', desc: 'Golf Ball' }
              ] as const).map(surface => (
                <button
                  key={surface.id}
                  onClick={() => setBallSurface(surface.id)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: ballSurface === surface.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    background: ballSurface === surface.id ? `${colors.accent}22` : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '32px' }}>{surface.icon}</div>
                  <div style={{ color: colors.textPrimary, fontWeight: 600, marginTop: '4px' }}>{surface.label}</div>
                  <div style={{ color: colors.textMuted, fontSize: '12px' }}>{surface.desc}</div>
                </button>
              ))}
            </div>

            {/* SVG responding to spin rate */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="300" height="180" viewBox="0 0 300 180">
                <rect width="300" height="180" fill="#1e3a5f" rx="8" />
                <line x1="30" y1="90" x2="270" y2="90" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                {/* Ball */}
                <circle cx="50" cy="90" r="18" fill={ballSurface === 'smooth' ? '#fbbf24' : ballSurface === 'dimpled' ? '#e2e8f0' : '#dc2626'} />
                {/* Trajectory curve based on spin */}
                <path
                  d={`M 50 90 L 80 ${90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.5 : twistSpinRate * 0.5)} L 110 ${90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.8 : twistSpinRate * 0.8)} L 140 ${Math.max(10, Math.min(170, 90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.9 : twistSpinRate * 0.9)))} L 170 ${Math.max(10, Math.min(170, 90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.85 : twistSpinRate * 0.85)))} L 200 ${90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.7 : twistSpinRate * 0.7)} L 230 ${90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.5 : twistSpinRate * 0.5)} L 260 ${90 + (twistSpinRate > 70 && ballSurface === 'smooth' ? -twistSpinRate * 0.25 : twistSpinRate * 0.25)}`}
                  fill="none"
                  stroke={ballSurface === 'smooth' && twistSpinRate > 70 ? '#f59e0b' : '#22c55e'}
                  strokeWidth="3"
                />
                <text x="150" y="20" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
                  {ballSurface === 'smooth' && twistSpinRate > 70 ? 'REVERSE Magnus!' : 'Normal Magnus'}
                </text>
                <text x="150" y="170" textAnchor="middle" fill="#94a3b8" fontSize="11">Spin: {twistSpinRate}% | Surface: {ballSurface}</text>
              </svg>
            </div>

            {/* Spin rate for twist */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Spin Rate</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistSpinRate}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={twistSpinRate}
                onChange={(e) => setTwistSpinRate(parseInt(e.target.value))}
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                } as React.CSSProperties}
              />
            </div>

            {/* Curve direction display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: ballSurface === 'smooth' && twistSpinRate > 70 ? colors.warning : colors.success }}>
                  {getCurveDirection()}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Curve Direction</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>
                  {ballSurface === 'dimpled' ? 'Enhanced' : ballSurface === 'smooth' ? 'Variable' : 'Normal'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Magnus Strength</div>
              </div>
            </div>

            {/* Visualization diagrams */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '12px' }}>Normal Magnus (Baseball)</h4>
                <svg width="180" height="100" style={{ maxWidth: '100%' }}>
                  <rect width="180" height="100" fill="#1e3a5f" rx="6" />
                  <circle cx="40" cy="50" r="18" fill="#dc2626" />
                  <path d="M58 50 Q100 15 160 50" fill="none" stroke="#22c55e" strokeWidth="3" />
                  <text x="100" y="12" fill="#22c55e" fontSize="11">Curves as expected</text>
                </svg>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '12px' }}>Reverse Magnus (Volleyball)</h4>
                <svg width="180" height="100" style={{ maxWidth: '100%' }}>
                  <rect width="180" height="100" fill="#1e3a5f" rx="6" />
                  <circle cx="40" cy="50" r="18" fill="#fbbf24" />
                  <path d="M58 50 Q100 85 160 50" fill="none" stroke="#f59e0b" strokeWidth="3" />
                  <text x="100" y="85" fill="#f59e0b" fontSize="11">Curves OPPOSITE!</text>
                </svg>
              </div>
            </div>
          </div>

          {ballSurface === 'smooth' && twistSpinRate > 70 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                The Reverse Magnus Effect is active! Smooth balls at high speeds can curve opposite to expectations!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Hidden Complexity of Magnus Effect
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🏐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Reverse Magnus Effect</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                At certain speeds and low spin, the boundary layer on a smooth ball can transition from laminar to turbulent asymmetrically. This creates the opposite pressure distribution, causing the ball to curve in the unexpected direction - making float serves so unpredictable!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⛳</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Why Golf Balls Have Dimples</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Dimples create a turbulent boundary layer that stays attached to the ball longer, reducing drag by up to 50%. They also enhance the Magnus effect - a dimpled ball can fly twice as far as a smooth one with the same initial conditions!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚾</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Baseball Seams</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The raised seams on a baseball trip the boundary layer, creating controlled turbulence. Different grip orientations (4-seam vs 2-seam fastball) change how air interacts with the seams, producing different movement patterns even at the same spin rate.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔬</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Reynolds Number</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Whether Magnus effect is normal or reversed depends on the Reynolds number - a ratio combining ball size, speed, and air viscosity. Different sports operate in different Reynolds number regimes, which is why each sport has evolved balls optimized for their specific conditions.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '800px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
          </p>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Magnus Effect Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Key Companies:</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    background: colors.bgSecondary,
                    padding: '4px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {/* Got It button for current application */}
            {!completedApps[selectedApp] ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  marginTop: '16px',
                }}
              >
                Got It
              </button>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px',
                padding: '12px',
                background: `${colors.success}22`,
                borderRadius: '8px',
              }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.success }}>Completed</span>
              </div>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
          overflowY: 'auto',
          paddingBottom: '100px',
          flex: 1,
          paddingTop: '48px',
        }}>
          {renderProgressBar()}
          {renderBottomNav()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', overflowY: 'auto' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed
                ? 'You understand the Magnus effect and how it shapes sports and engineering!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review section */}
            <div style={{
              textAlign: 'left',
              marginBottom: '24px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Your Answers:</h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const isCorrect = testAnswers[i] === correctId;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: `1px solid ${colors.border}`,
                  }}>
                    <span style={{
                      color: isCorrect ? colors.success : colors.error,
                      fontSize: '18px',
                      fontWeight: 700,
                      minWidth: '24px',
                    }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>
                      Question {i + 1}: {isCorrect ? 'Correct' : `Wrong (correct: ${correctId?.toUpperCase()})`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={primaryButtonStyle}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={primaryButtonStyle}
                >
                  Replay
                </button>
              )}
              <a
                href="/"
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
        paddingBottom: '100px',
        flex: 1,
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Magnus Effect Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the physics behind every curveball, banana kick, and golf drive that seems to defy gravity.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Spin creates pressure differentials via airflow asymmetry',
              'Topspin curves down, backspin floats up, sidespin curves sideways',
              'Ball surface affects Magnus effect strength',
              'Reverse Magnus can occur with smooth balls at high speeds',
              'Engineers use Magnus effect in ships and aircraft',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return null;
};

export default MagnusEffectRenderer;
