'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// Centripetal Force - Complete 10-Phase Learning Game
// Understanding the force that keeps objects moving in circles
// ═══════════════════════════════════════════════════════════════════════════

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

interface CentripetalForceRendererProps {
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

// ═══════════════════════════════════════════════════════════════════════════
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ═══════════════════════════════════════════════════════════════════════════
const testQuestions = [
  {
    scenario: "A race car driver takes a sharp turn on a flat track at 120 mph. As they round the corner, they feel pressed hard against the side of the car.",
    question: "What force actually keeps the car moving in a circle?",
    options: [
      { id: 'a', label: "The centrifugal force pushing the driver outward" },
      { id: 'b', label: "Friction between the tires and the road surface", correct: true },
      { id: 'c', label: "The driver's body weight pressing down on the seat" },
      { id: 'd', label: "Air pressure from the car's forward motion" }
    ],
    explanation: "Friction between the tires and road provides the centripetal force needed to change the car's direction. The driver feels pushed outward because their body wants to continue straight (Newton's 1st Law), not because there's an actual outward force."
  },
  {
    scenario: "An astronaut on the International Space Station watches a wrench float in front of them. The ISS orbits Earth at about 17,500 mph, completing one orbit every 90 minutes.",
    question: "What provides the centripetal force keeping the ISS in orbit?",
    options: [
      { id: 'a', label: "The ISS's rocket thrusters firing continuously" },
      { id: 'b', label: "The vacuum of space pulling the station around Earth" },
      { id: 'c', label: "Earth's gravitational pull on the station", correct: true },
      { id: 'd', label: "The station's momentum from its initial launch" }
    ],
    explanation: "Gravity provides the centripetal force for orbital motion. The ISS is continuously 'falling' toward Earth, but its horizontal velocity is so great that it keeps missing the surface, resulting in a circular orbit around our planet."
  },
  {
    scenario: "A physics student doubles the speed of a ball on a string while keeping the radius constant. The string suddenly snaps.",
    question: "By what factor did the required centripetal force increase when speed doubled?",
    options: [
      { id: 'a', label: "The force doubled (2x)" },
      { id: 'b', label: "The force tripled (3x)" },
      { id: 'c', label: "The force quadrupled (4x)", correct: true },
      { id: 'd', label: "The force increased eightfold (8x)" }
    ],
    explanation: "Since F = mv^2/r, and velocity is squared, doubling the speed quadruples the required force. This v-squared relationship explains why high-speed turns are so dangerous - small speed increases require dramatically more centripetal force."
  },
  {
    scenario: "At a carnival, riders on a spinning teacup ride lean outward during rotation. When the ride suddenly stops, everyone lurches forward.",
    question: "Why do riders feel pushed outward during circular motion?",
    options: [
      { id: 'a', label: "A real centrifugal force pushes them toward the outer wall" },
      { id: 'b', label: "Their bodies want to continue in a straight line but are forced to curve", correct: true },
      { id: 'c', label: "The rotation creates a vacuum that pulls them outward" },
      { id: 'd', label: "Gravitational forces increase during rotation" }
    ],
    explanation: "There is no real outward force. According to Newton's First Law, objects in motion continue in a straight line unless acted upon by a force. The teacup wall pushes riders inward (centripetal), and they feel 'pushed out' because their body resists this change in direction."
  },
  {
    scenario: "Engineers design a highway exit ramp with a 30-degree banking angle. On this curve, cars can maintain speed without relying entirely on tire friction.",
    question: "How does banking the curve help vehicles turn safely?",
    options: [
      { id: 'a', label: "The angle creates an aerodynamic lifting effect" },
      { id: 'b', label: "Banking redirects gravitational force to provide centripetal acceleration", correct: true },
      { id: 'c', label: "The slope allows cars to use their brakes more effectively" },
      { id: 'd', label: "Banking increases the friction coefficient of the road surface" }
    ],
    explanation: "On a banked curve, the normal force from the road has a horizontal component pointing toward the center of the turn. This provides centripetal force without relying on friction. At the 'design speed,' a car could theoretically navigate the turn on a frictionless surface."
  },
  {
    scenario: "A hammer thrower spins in circles before releasing the hammer. At the moment of release, the hammer flies off at over 80 mph.",
    question: "In what direction does the hammer travel immediately after release?",
    options: [
      { id: 'a', label: "Spiraling outward from the center of rotation" },
      { id: 'b', label: "In a straight line tangent to the circular path", correct: true },
      { id: 'c', label: "Directly away from the athlete toward the landing zone" },
      { id: 'd', label: "In a curved path that gradually straightens out" }
    ],
    explanation: "Once released, the hammer has no more centripetal force acting on it. It continues in the direction it was traveling at that instant - tangent to the circle. This is why the timing of release is critical for aiming in hammer throw events."
  },
  {
    scenario: "A laboratory centrifuge spins blood samples at 3,000 RPM. After spinning, the blood has separated into distinct layers with red blood cells at the bottom.",
    question: "Why do denser components move to the outside of the centrifuge?",
    options: [
      { id: 'a', label: "Heavier particles are pushed out by centrifugal force" },
      { id: 'b', label: "Denser particles require more centripetal force to stay in circular motion, so they migrate outward", correct: true },
      { id: 'c', label: "The spinning creates a magnetic field that separates materials" },
      { id: 'd', label: "Gravity pulls heavier particles to the edge of the tube" }
    ],
    explanation: "All particles experience the same angular velocity, but denser particles need more centripetal force (F = mv^2/r) to maintain circular motion. Since the container can only provide limited force through fluid pressure, denser particles 'fall' outward relative to the rotating reference frame."
  },
  {
    scenario: "At the top of a roller coaster loop, passengers feel almost weightless despite traveling at high speed. Some even feel their bodies lift slightly against the restraints.",
    question: "What forces act on a passenger at the very top of a vertical loop?",
    options: [
      { id: 'a', label: "Only gravity acts on them; centripetal force disappears at the top" },
      { id: 'b', label: "Gravity and the track's normal force both point toward the center of the loop", correct: true },
      { id: 'c', label: "Centrifugal force cancels out gravity, creating weightlessness" },
      { id: 'd', label: "The track pushes upward against gravity to keep passengers in place" }
    ],
    explanation: "At the top of a loop, both gravity and the normal force from the track point downward (toward the loop's center), providing centripetal force. If the coaster moves at just the right speed, the normal force approaches zero, and riders feel 'weightless' with only gravity acting on them."
  },
  {
    scenario: "A child swings a bucket of water in a vertical circle. Remarkably, even at the top of the swing, no water spills out of the bucket.",
    question: "Why doesn't the water fall out when the bucket is upside down?",
    options: [
      { id: 'a', label: "Air pressure seals the water inside the bucket" },
      { id: 'b', label: "The water's circular motion requires centripetal force greater than or equal to gravity", correct: true },
      { id: 'c', label: "Centrifugal force pushes the water against the bucket bottom" },
      { id: 'd', label: "Surface tension holds the water in place against gravity" }
    ],
    explanation: "The water stays in because it needs to maintain circular motion. At the top, the water requires centripetal acceleration toward the center (downward). If the bucket moves fast enough, gravity alone cannot provide enough centripetal force, so the bucket bottom must push on the water to supply the additional force needed."
  },
  {
    scenario: "NASA astronauts train in a massive centrifuge that spins them in circles, experiencing forces up to 8 times normal gravity. This prepares them for extreme g-forces during rocket launches.",
    question: "If an astronaut's mass is 80 kg and they experience 4g at a radius of 10 meters, what is their approximate speed?",
    options: [
      { id: 'a', label: "About 10 m/s" },
      { id: 'b', label: "About 20 m/s", correct: true },
      { id: 'c', label: "About 40 m/s" },
      { id: 'd', label: "About 80 m/s" }
    ],
    explanation: "Using a = v^2/r and a = 4g = 40 m/s^2, we get v^2 = ar = 40 x 10 = 400. Therefore v = 20 m/s (about 45 mph). This demonstrates how centrifuges can simulate high g-forces through circular motion at relatively moderate speeds."
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// REAL WORLD APPLICATIONS - 4 detailed applications
// ═══════════════════════════════════════════════════════════════════════════
const realWorldApps = [
  {
    icon: '🎢',
    title: 'Roller Coaster Design',
    short: 'Engineering thrills with physics precision',
    tagline: 'Loops, spirals, and corkscrews that defy gravity',
    description: 'Roller coaster engineers use centripetal force equations to design thrilling rides that feel dangerous but are mathematically safe. Every loop, turn, and corkscrew is calculated to maintain forces within human tolerance while maximizing excitement.',
    connection: 'The F = mv^2/r equation you explored determines whether riders stay in their seats during inversions. At the top of a loop, the track must provide centripetal force even against gravity, requiring precise speed control.',
    howItWorks: 'Modern coasters use clothoid (teardrop) loops rather than perfect circles because they provide consistent g-forces throughout the loop. The tighter radius at the top means lower speed is needed, while the larger radius at entry prevents dangerous g-spikes.',
    stats: [
      { value: '6g', label: 'Peak force on riders', icon: '💪' },
      { value: '149 mph', label: 'Fastest coaster speed', icon: '⚡' },
      { value: '456 ft', label: 'Tallest coaster drop', icon: '📏' }
    ],
    examples: ['Formula Rossa (Abu Dhabi)', 'Kingda Ka (New Jersey)', 'Steel Vengeance (Ohio)', 'Taron (Germany)'],
    companies: ['Intamin', 'Bolliger & Mabillard', 'Rocky Mountain Construction', 'Vekoma'],
    futureImpact: 'Next-generation coasters will use magnetic launch systems and articulating cars with active g-force management, enabling even more extreme maneuvers while maintaining rider comfort and safety.',
    color: '#EF4444'
  },
  {
    icon: '🛰️',
    title: 'Satellite Orbital Mechanics',
    short: 'Gravity as the ultimate centripetal force',
    tagline: 'Falling around Earth at 17,500 mph',
    description: 'Every satellite in orbit is experiencing continuous circular motion maintained by Earth\'s gravity. From GPS satellites at 12,500 miles to the ISS at 250 miles, each orbit balances gravitational centripetal force with orbital velocity.',
    connection: 'Orbital mechanics directly applies F = mv^2/r where gravity provides the centripetal force. The relationship GMm/r^2 = mv^2/r determines the exact speed needed for any orbital altitude - too slow and the satellite falls, too fast and it escapes.',
    howItWorks: 'Satellites don\'t need engines to stay in orbit because gravity constantly pulls them toward Earth. Their horizontal velocity is so great that as they fall, the Earth\'s surface curves away beneath them. The result is a continuous circular path around the planet.',
    stats: [
      { value: '7.66 km/s', label: 'ISS orbital velocity', icon: '🚀' },
      { value: '90 min', label: 'ISS orbit period', icon: '⏱️' },
      { value: '4,500+', label: 'Active satellites', icon: '🛰️' }
    ],
    examples: ['GPS Navigation Constellation', 'Starlink Internet Network', 'Hubble Space Telescope', 'Geostationary Weather Satellites'],
    companies: ['SpaceX', 'NASA', 'ESA', 'Roscosmos', 'ISRO'],
    futureImpact: 'Mega-constellations of thousands of satellites will provide global internet coverage, while advanced propulsion systems will enable rapid orbital transfers and debris cleanup missions.',
    color: '#3B82F6'
  },
  {
    icon: '🧬',
    title: 'Medical Centrifuges',
    short: 'Separating blood components by density',
    tagline: 'Spinning at 100,000+ RPM to analyze microscopic structures',
    description: 'Medical and research centrifuges use extreme centripetal acceleration to separate biological samples by density. Blood components, DNA, viruses, and proteins can all be isolated through controlled high-speed spinning.',
    connection: 'In a centrifuge, all particles rotate together but denser particles need more centripetal force. Since the container provides limited force, dense particles migrate outward while lighter components stay near the center.',
    howItWorks: 'When blood spins at 3,000 RPM, red blood cells (densest) collect at the bottom, then white blood cells and platelets form a thin layer, with plasma (lightest) on top. Ultracentrifuges spinning at 100,000+ RPM can separate individual proteins and viruses.',
    stats: [
      { value: '100,000+ g', label: 'Ultracentrifuge force', icon: '🔬' },
      { value: '< 15 min', label: 'Blood separation time', icon: '⏱️' },
      { value: '$50B', label: 'Global market value', icon: '💰' }
    ],
    examples: ['Blood banking and transfusions', 'DNA extraction and sequencing', 'Vaccine purification', 'Cancer cell isolation'],
    companies: ['Beckman Coulter', 'Thermo Fisher Scientific', 'Eppendorf', 'Sigma Laborzentrifugen'],
    futureImpact: 'Microfluidic centrifuge-on-a-chip technology will enable point-of-care diagnostics, allowing complete blood analysis from a single drop in minutes rather than hours at a lab.',
    color: '#8B5CF6'
  },
  {
    icon: '🏎️',
    title: 'Race Track Engineering',
    short: 'Banking curves for maximum speed',
    tagline: 'Where physics meets high-speed competition',
    description: 'Race tracks are precisely engineered to allow maximum cornering speeds through banked curves. From NASCAR ovals to Formula 1 circuits, banking angles are calculated to provide centripetal force through the track itself, not just tire friction.',
    connection: 'On a banked curve, the normal force has a horizontal component pointing toward the turn center. Combined with friction, this allows much higher speeds than flat curves - the banking literally pushes cars toward the center.',
    howItWorks: 'At the optimal "design speed," a car could navigate a banked curve with no friction at all. Below this speed, friction prevents sliding inward; above it, friction prevents sliding outward. NASCAR tracks bank up to 33 degrees, enabling 180+ mph turns.',
    stats: [
      { value: '33°', label: 'Maximum NASCAR banking', icon: '📐' },
      { value: '200+ mph', label: 'Turn speeds achieved', icon: '🏁' },
      { value: '3-5g', label: 'Cornering forces', icon: '💪' }
    ],
    examples: ['Daytona International Speedway', 'Monaco Grand Prix Circuit', 'Indianapolis Motor Speedway', 'Nurburgring Nordschleife'],
    companies: ['International Speedway Corp', 'Liberty Media (F1)', 'Circuit of the Americas', 'Dorna Sports (MotoGP)'],
    futureImpact: 'Smart track surfaces with variable banking and active grip management systems will adapt in real-time to weather conditions and tire wear, maximizing safety while enabling even faster racing.',
    color: '#F59E0B'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CentripetalForceRenderer: React.FC<CentripetalForceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [mass, setMass] = useState(1.0); // kg
  const [speed, setSpeed] = useState(5); // m/s
  const [radius, setRadius] = useState(70); // m (scaled for display)
  const [carAngle, setCarAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  // Twist phase - string release simulation
  const [stringBroken, setStringBroken] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [releaseAngle, setReleaseAngle] = useState(0);

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

  // Circular motion animation
  useEffect(() => {
    if (!isAnimating || phase === 'twist_play' && stringBroken) return;
    const interval = setInterval(() => {
      setCarAngle(prev => (prev + speed * 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, speed, phase, stringBroken]);

  // String broken animation
  useEffect(() => {
    if (!stringBroken) return;
    const interval = setInterval(() => {
      setBallPosition(prev => ({
        x: prev.x + Math.cos(releaseAngle) * 4,
        y: prev.y + Math.sin(releaseAngle) * 4
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [stringBroken, releaseAngle]);

  // Calculate physics values
  const centripetalForce = (mass * speed * speed) / (radius / 10); // Scale radius for realistic values
  const centripetalAccel = (speed * speed) / (radius / 10);
  const maxFriction = 8; // Maximum friction force available (simplified)
  const isSliding = centripetalForce > maxFriction;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Violet for circular motion
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    velocity: '#22D3EE', // Cyan for velocity
    force: '#EF4444', // Red for force
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
    twist_play: 'String Release',
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
        gameType: 'centripetal-force',
        gameTitle: 'Centripetal Force',
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

  // Break string handler
  const breakString = useCallback(() => {
    const angleRad = carAngle * Math.PI / 180;
    setReleaseAngle(angleRad + Math.PI / 2); // Tangent direction
    setBallPosition({ x: 0, y: 0 });
    setStringBroken(true);
    playSound('click');
  }, [carAngle]);

  const resetTwistSim = useCallback(() => {
    setStringBroken(false);
    setBallPosition({ x: 0, y: 0 });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUALIZATION COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Main circular motion visualization
  const CircularMotionSVG = ({ showVec = true, size = 280 }: { showVec?: boolean; size?: number }) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const displayRadius = Math.min(radius, size / 2 - 40);
    const carX = centerX + Math.cos(carAngle * Math.PI / 180) * displayRadius;
    const carY = centerY + Math.sin(carAngle * Math.PI / 180) * displayRadius;
    const velAngle = carAngle + 90;
    const velLength = Math.min(speed * 6, 50);
    const velX = Math.cos(velAngle * Math.PI / 180) * velLength;
    const velY = Math.sin(velAngle * Math.PI / 180) * velLength;
    const forceLength = Math.min(centripetalForce * 8, 50);
    const forceX = (centerX - carX) / displayRadius * forceLength;
    const forceY = (centerY - carY) / displayRadius * forceLength;

    // Motion trail
    const trailAngles = [1, 2, 3, 4, 5].map(i => carAngle - i * 10);

    return (
      <svg width={size} height={size} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="trackGradient" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="60%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>
          <linearGradient id="velocityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.velocity} />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="forceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.force} />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowVel" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill={colors.velocity} />
          </marker>
          <marker id="arrowForce" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill={colors.force} />
          </marker>
        </defs>

        {/* Track background */}
        <circle cx={centerX} cy={centerY} r={displayRadius + 18} fill="url(#trackGradient)" />
        <circle cx={centerX} cy={centerY} r={displayRadius - 18} fill={colors.bgPrimary} />

        {/* Track path */}
        <circle cx={centerX} cy={centerY} r={displayRadius} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 5" />

        {/* Motion trail */}
        {trailAngles.map((angle, i) => (
          <circle
            key={i}
            cx={centerX + Math.cos(angle * Math.PI / 180) * displayRadius}
            cy={centerY + Math.sin(angle * Math.PI / 180) * displayRadius}
            r={5 - i * 0.8}
            fill={isSliding ? colors.error : colors.accent}
            opacity={0.4 - i * 0.06}
          />
        ))}

        {/* Car body */}
        <g transform={`translate(${carX}, ${carY}) rotate(${carAngle + 90})`}>
          <rect x="-8" y="-12" width="16" height="24" rx="3" fill={isSliding ? colors.error : colors.accent} filter="url(#glow)" />
          <rect x="-6" y="-8" width="12" height="8" rx="2" fill="#93C5FD" opacity="0.8" />
        </g>

        {/* Vectors */}
        {showVec && (
          <>
            {/* Velocity vector */}
            <line
              x1={carX}
              y1={carY}
              x2={carX + velX}
              y2={carY + velY}
              stroke="url(#velocityGrad)"
              strokeWidth="3"
              markerEnd="url(#arrowVel)"
              filter="url(#glow)"
            />
            {/* Force vector */}
            <line
              x1={carX}
              y1={carY}
              x2={carX + forceX}
              y2={carY + forceY}
              stroke="url(#forceGrad)"
              strokeWidth="3"
              markerEnd="url(#arrowForce)"
              filter="url(#glow)"
            />
            {/* Center point */}
            <circle cx={centerX} cy={centerY} r="6" fill="#fbbf24" filter="url(#glow)" />
          </>
        )}

        {/* Vector labels */}
        {showVec && (
          <>
            <text x={carX + velX * 1.2} y={carY + velY * 1.2} fill={colors.velocity} fontSize="12" fontWeight="bold" textAnchor="middle">v</text>
            <text x={carX + forceX * 1.3} y={carY + forceY * 1.3 - 8} fill={colors.force} fontSize="12" fontWeight="bold" textAnchor="middle">Fc</text>
          </>
        )}

        {/* Sliding warning */}
        {isSliding && (
          <text x={centerX} y={size - 15} fill={colors.error} fontSize="12" fontWeight="bold" textAnchor="middle">SLIDING!</text>
        )}
      </svg>
    );
  };

  // String release simulation
  const StringReleaseSVG = ({ size = 280 }: { size?: number }) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const simRadius = 80;
    const ballX = centerX + Math.cos(carAngle * Math.PI / 180) * simRadius;
    const ballY = centerY + Math.sin(carAngle * Math.PI / 180) * simRadius;

    return (
      <svg width={size} height={size} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#3B82F6" />
          </radialGradient>
          <radialGradient id="ballReleasedGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="100%" stopColor="#EF4444" />
          </radialGradient>
          <filter id="ballGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Circular path indicator */}
        <circle cx={centerX} cy={centerY} r={simRadius} fill="none" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5 3" />

        {/* Center pivot */}
        <circle cx={centerX} cy={centerY} r="8" fill="#fbbf24" filter="url(#ballGlow)" />

        {!stringBroken ? (
          <>
            {/* String */}
            <line x1={centerX} y1={centerY} x2={ballX} y2={ballY} stroke={colors.textSecondary} strokeWidth="3" />

            {/* Ball */}
            <circle cx={ballX} cy={ballY} r="14" fill="url(#ballGrad)" filter="url(#ballGlow)" />

            {/* Velocity vector */}
            <line
              x1={ballX}
              y1={ballY}
              x2={ballX + Math.cos((carAngle + 90) * Math.PI / 180) * 40}
              y2={ballY + Math.sin((carAngle + 90) * Math.PI / 180) * 40}
              stroke={colors.velocity}
              strokeWidth="3"
              markerEnd="url(#arrowVel)"
              filter="url(#glow)"
            />
            <text
              x={ballX + Math.cos((carAngle + 90) * Math.PI / 180) * 50}
              y={ballY + Math.sin((carAngle + 90) * Math.PI / 180) * 50}
              fill={colors.velocity}
              fontSize="14"
              fontWeight="bold"
            >v</text>
          </>
        ) : (
          <>
            {/* Broken string pieces */}
            <line x1={centerX} y1={centerY} x2={centerX + 12} y2={centerY + 8} stroke={colors.error} strokeWidth="3" />
            <line x1={centerX} y1={centerY} x2={centerX - 10} y2={centerY + 6} stroke={colors.error} strokeWidth="3" />

            {/* Trail of released ball */}
            {[1, 2, 3, 4].map(i => (
              <circle
                key={i}
                cx={ballX + ballPosition.x - Math.cos(releaseAngle) * 6 * i}
                cy={ballY + ballPosition.y - Math.sin(releaseAngle) * 6 * i}
                r={10 - i * 2}
                fill={colors.error}
                opacity={0.4 - i * 0.08}
              />
            ))}

            {/* Released ball */}
            <circle
              cx={ballX + ballPosition.x}
              cy={ballY + ballPosition.y}
              r="14"
              fill="url(#ballReleasedGrad)"
              filter="url(#ballGlow)"
            />

            {/* Tangent path line */}
            <line
              x1={ballX}
              y1={ballY}
              x2={ballX + Math.cos(releaseAngle) * 100}
              y2={ballY + Math.sin(releaseAngle) * 100}
              stroke={colors.success}
              strokeWidth="2"
              strokeDasharray="6 3"
            />

            {/* Release point marker */}
            <circle cx={ballX} cy={ballY} r="5" fill={colors.success} opacity="0.5" />
          </>
        )}

        {stringBroken && (
          <text x={centerX} y={size - 12} fill={colors.success} fontSize="11" fontWeight="bold" textAnchor="middle">
            Ball travels in a STRAIGHT LINE!
          </text>
        )}
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
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERS
  // ═══════════════════════════════════════════════════════════════════════════

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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'spin 3s linear infinite',
        }}>
          🚗
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Centripetal Force
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "When a car turns, you feel pushed toward the outside door. But is there really an <span style={{ color: colors.accent }}>outward force</span>, or is something else going on?"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <CircularMotionSVG showVec={true} size={isMobile ? 260 : 300} />
          <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '16px', fontStyle: 'italic' }}>
            "Every object moving in a circle requires a force pointing toward the center. Without it, objects would travel in straight lines forever."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Newton's Laws of Motion
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Circular Motion
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Forward, in the direction the car is moving' },
      { id: 'b', text: 'Toward the center of the circular path', correct: true },
      { id: 'c', text: 'Outward, away from the center (centrifugal)' },
      { id: 'd', text: 'No net force - it\'s moving at constant speed' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            A car travels around a circular track at constant speed. In which direction is the NET force on the car?
          </h2>

          {/* Diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <CircularMotionSVG showVec={false} size={isMobile ? 220 : 260} />
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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Circular Motion Lab
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Centripetal Force Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust mass, speed, and radius to see how centripetal force changes
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CircularMotionSVG showVec={showVectors} size={isMobile ? 280 : 320} />
            </div>

            {/* Mass slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Mass (m)</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{mass.toFixed(1)} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Speed slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Speed (v)</span>
                <span style={{ ...typo.small, color: colors.velocity, fontWeight: 600 }}>{speed.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Radius slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Radius (r)</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{(radius / 10).toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAnimating ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isAnimating ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => setShowVectors(!showVectors)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: showVectors ? colors.accent : colors.bgSecondary,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Vectors {showVectors ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Physics values */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: isSliding ? colors.error : colors.force }}>{centripetalForce.toFixed(2)} N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Required F_c</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{centripetalAccel.toFixed(2)} m/s^2</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Acceleration</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: isSliding ? colors.error : colors.success }}>
                  {isSliding ? 'SLIDING' : 'GRIPPING'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
              </div>
            </div>
          </div>

          {/* Key formula */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
              F_c = mv^2/r
            </h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <span style={{ color: colors.velocity }}>v</span> (velocity) is tangent to the circle.{' '}
              <span style={{ color: colors.force }}>F_c</span> points toward the center.{' '}
              Double the speed = 4x the force!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Centripetal Force
          </h2>

          <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
            {/* Centripetal Force Card */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              borderLeft: `4px solid ${colors.accent}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Centripetal Force ("Center-Seeking")
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Always points toward the center of the circular path</li>
                <li>Formula: F = mv^2/r</li>
                <li>Changes direction of velocity, not speed</li>
                <li>Provided by friction, tension, gravity, or normal force</li>
              </ul>
            </div>

            {/* Centrifugal Force Card */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              borderLeft: `4px solid ${colors.error}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
                "Centrifugal Force" (Fictitious!)
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>NOT a real force - it's an apparent effect</li>
                <li>Only appears in rotating reference frames</li>
                <li>You feel "pushed out" because you want to go straight</li>
                <li>Newton's 1st Law: objects resist direction changes</li>
              </ul>
            </div>

            {/* Key Physics Card */}
            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Key Physics Relationships
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.textPrimary }}>Centripetal acceleration:</strong> a = v^2/r (always toward center)
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.textPrimary }}>Newton's 2nd Law:</strong> F = ma = mv^2/r
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Speed doubled?</strong> Force quadruples! (v^2 relationship)
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover a Surprising Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The ball spirals outward away from the center' },
      { id: 'b', text: 'The ball flies off in a straight line tangent to the circle', correct: true },
      { id: 'c', text: 'The ball flies directly away from the center' },
      { id: 'd', text: 'The ball falls straight down due to gravity' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: What Happens When Centripetal Force Disappears?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A ball swings in a circle on a string. The string suddenly breaks. What path does the ball follow?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              <span style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}>&#9898;</span>
              ----&#9899;
            </div>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              Ball rotating on a string... then the string snaps!
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
              See What Happens
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Tangential Release Simulation
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch what happens when the centripetal force suddenly disappears
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <StringReleaseSVG size={isMobile ? 280 : 320} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!stringBroken ? (
                <button
                  onClick={breakString}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.error,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  Break the String!
                </button>
              ) : (
                <button
                  onClick={resetTwistSim}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  Reset Simulation
                </button>
              )}
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              What You're Observing:
            </h3>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>The ball moves in a circle because the string pulls it toward the center</li>
              <li>Velocity is always TANGENT to the circle (perpendicular to the string)</li>
              <li>When the string breaks, there's no more centripetal force</li>
              <li>Without a force to change its direction, the ball travels in a STRAIGHT LINE!</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Deep Physics
          </button>
        </div>

        {renderNavDots()}
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Newton's First Law in Action
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#128161;</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Common Misconception</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Many people think objects in circular motion are "trying to fly outward" due to centrifugal force.
                They expect a released ball to spiral away from the center.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#9989;</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Truth</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Objects want to travel in STRAIGHT LINES (Newton's 1st Law). The centripetal force constantly
                pulls them inward, curving their path into a circle. Remove the force, and they continue straight!
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#127919;</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Key Insight</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Centripetal force doesn't push or pull objects along the circle - it CURVES their path!
                When released, the object continues in the direction it was moving at that instant:
                <strong style={{ color: colors.velocity }}> tangent to the circle</strong>.
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Real-World Examples:
            </h4>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Hammer throw athletes release at the exact moment for optimal tangent direction</li>
              <li>Sparks fly tangentially off a grinding wheel</li>
              <li>Water drops fly straight off a spinning wet dog</li>
              <li>A car that loses traction slides tangentially, not radially outward</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                    &#10003;
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
                Physics Connection:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
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

            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Examples:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.examples.join(' | ')}
              </p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Companies:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.companies.join(' | ')}
              </p>
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${app.color}33`,
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '4px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
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
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '&#127881;' : '&#128218;'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered centripetal force and circular motion!'
                : 'Review the concepts and try again to improve your understanding.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Claim Your Mastery Badge
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
                Review & Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          &#127942;
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Circular Motion Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You've mastered centripetal force and understand why objects move in circles.
          From roller coasters to satellites, you now see circular motion everywhere!
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          width: '100%',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            What You've Mastered:
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { icon: '&#128336;', text: 'F = mv^2/r formula' },
              { icon: '&#128640;', text: 'Satellite orbits' },
              { icon: '&#127906;', text: 'Roller coaster loops' },
              { icon: '&#128663;', text: 'Banked curves' },
              { icon: '&#128257;', text: 'Centrifuge separation' },
              { icon: '&#127919;', text: 'Tangential release' },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '24px' }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}11`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.accent}33`,
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.accent }}>Key Insight:</strong> There is no "centrifugal force" -
            objects want to go straight, and centripetal force curves their path. Remove the force,
            and they fly off tangentially!
          </p>
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
            Explore Again
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default CentripetalForceRenderer;
