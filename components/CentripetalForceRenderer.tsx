'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
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
      { value: '6g', label: 'Peak rider force', icon: '💪' },
      { value: '240 km/h', label: 'Fastest coaster', icon: '⚡' },
      { value: '139 m', label: 'Tallest drop', icon: '📏' }
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
    tagline: 'Falling around Earth at 28,000 km/h',
    description: 'Every satellite in orbit is experiencing continuous circular motion maintained by Earth\'s gravity. From GPS satellites at 20,000 km to the ISS at 400 km, each orbit balances gravitational centripetal force with orbital velocity.',
    connection: 'Orbital mechanics directly applies F = mv^2/r where gravity provides the centripetal force. The relationship GMm/r^2 = mv^2/r determines the exact speed needed for any orbital altitude - too slow and the satellite falls, too fast and it escapes.',
    howItWorks: 'Satellites don\'t need engines to stay in orbit because gravity constantly pulls them toward Earth. Their horizontal velocity is so great that as they fall, the Earth\'s surface curves away beneath them. The result is a continuous circular path around the planet.',
    stats: [
      { value: '7.66 km/s', label: 'ISS orbital velocity', icon: '🚀' },
      { value: '90 min', label: 'ISS orbit period', icon: '⏱️' },
      { value: '4,500', label: 'Active satellites', icon: '🛰️' }
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
    tagline: 'Spinning at 100,000 RPM to analyze microscopic structures',
    description: 'Medical and research centrifuges use extreme centripetal acceleration to separate biological samples by density. Blood components, DNA, viruses, and proteins can all be isolated through controlled high-speed spinning.',
    connection: 'In a centrifuge, all particles rotate together but denser particles need more centripetal force. Since the container provides limited force, dense particles migrate outward while lighter components stay near the center.',
    howItWorks: 'When blood spins at 3,000 RPM, red blood cells (densest) collect at the bottom, then white blood cells and platelets form a thin layer, with plasma (lightest) on top. Ultracentrifuges spinning at 100,000 RPM can separate individual proteins and viruses.',
    stats: [
      { value: '100,000 g', label: 'Ultracentrifuge force', icon: '🔬' },
      { value: '15 min', label: 'Blood separation', icon: '⏱️' },
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
    howItWorks: 'At the optimal "design speed," a car could navigate a banked curve with no friction at all. Below this speed, friction prevents sliding inward; above it, friction prevents sliding outward. NASCAR tracks bank up to 33 degrees, enabling 290 km/h turns.',
    stats: [
      { value: '33 deg', label: 'Maximum NASCAR bank', icon: '📐' },
      { value: '320 km/h', label: 'Turn speeds achieved', icon: '🏁' },
      { value: '5g', label: 'Cornering forces', icon: '💪' }
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
  const { isMobile } = useViewport();
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
  const [currentAppRead, setCurrentAppRead] = useState(false);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
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

  // Premium design colors - using brighter colors for text contrast
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#1e293b',
    accent: '#8B5CF6', // Violet for circular motion
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#334155',
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
    review: 'Review',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Complete'
  };

  const currentIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < phaseOrder.length - 1 && phase !== 'test';

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
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

  // Main circular motion visualization (render function, not component)
  const renderCircularMotionSVG = ({ showVec = true, size = 280 }: { showVec?: boolean; size?: number }) => {
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
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Centripetal Force visualization">
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

        {/* Grid lines for visual reference */}
        <g id="grid-layer">
          <line x1={30} y1={centerY} x2={size - 30} y2={centerY} strokeDasharray="4 4" opacity="0.3" stroke={colors.textMuted} strokeWidth="1" />
          <line x1={centerX} y1={30} x2={centerX} y2={size - 30} strokeDasharray="4 4" opacity="0.3" stroke={colors.textMuted} strokeWidth="1" />
        </g>

        {/* Interactive force indicator point */}
        {(() => {
          const maxForce = 12;
          const clampedForce = Math.min(centripetalForce, maxForce);
          const indicatorY = size - 40 - (clampedForce / maxForce) * (size - 80);
          return (
            <g id="force-indicator">
              <line x1={size - 25} y1={size - 40} x2={size - 25} y2={40} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <text x={size - 25} y={35} fill={colors.force} fontSize="11" textAnchor="middle" fontWeight="bold">Fc</text>
              <circle
                cx={size - 25}
                cy={indicatorY}
                r={8}
                fill={colors.force}
                filter="url(#glow)"
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          );
        })()}

        {/* Background group */}
        <g id="background-layer">
          {/* Track background */}
          <circle cx={centerX} cy={centerY} r={displayRadius + 18} fill="url(#trackGradient)" />
          <circle cx={centerX} cy={centerY} r={displayRadius - 18} fill={colors.bgPrimary} />
        </g>

        {/* Track group */}
        <g id="track-layer">
          {/* Track path */}
          <circle cx={centerX} cy={centerY} r={displayRadius} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 5" />
          <text x={centerX} y={size - 8} fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">Circular Track</text>
        </g>

        {/* Motion trail group */}
        <g id="trail-layer">
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
        </g>

        {/* Car group */}
        <g id="car-layer" transform={`translate(${carX}, ${carY}) rotate(${carAngle + 90})`}>
          <rect x="-8" y="-12" width="16" height="24" rx="3" fill={isSliding ? colors.error : colors.accent} filter="url(#glow)" />
          <rect x="-6" y="-8" width="12" height="8" rx="2" fill="#93C5FD" opacity="0.8" />
        </g>

        {/* Labels on car */}
        <text x={carX + 20} y={carY - 22} fill={colors.textPrimary} fontSize="11" fontWeight="bold">Car</text>
        <text x={carX + 20} y={carY - 6} fill={colors.textSecondary} fontSize="11">m = {mass.toFixed(1)} kg</text>

        {/* Vectors group */}
        {showVec && (
          <g id="vectors-layer">
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
            <circle cx={centerX} cy={centerY} r="6" fill="#fbbf24" />
            <text x={centerX + 10} y={centerY + 4} fill="#fbbf24" fontSize="11" fontWeight="bold">Center</text>
          </g>
        )}

        {/* Vector labels group */}
        {showVec && (
          <g id="labels-layer">
            <text x={carX + velX * 1.3} y={carY + velY * 1.3} fill={colors.velocity} fontSize="12" fontWeight="bold" textAnchor="middle">v (velocity)</text>
            <text x={carX + forceX * 1.6} y={carY + forceY * 1.6 - 12} fill={colors.force} fontSize="12" fontWeight="bold" textAnchor="middle">Fc (force)</text>
          </g>
        )}

        {/* Radius indicator group */}
        <g id="radius-layer">
          <line x1={centerX} y1={centerY} x2={centerX + displayRadius * 0.7} y2={centerY} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4 2" />
          <text x={centerX + displayRadius * 0.35} y={centerY + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle">r = {(radius/10).toFixed(1)} m</text>
        </g>

        {/* Sliding warning */}
        {isSliding && (
          <text x={centerX} y={size - 15} fill={colors.error} fontSize="12" fontWeight="bold" textAnchor="middle">SLIDING!</text>
        )}
      </svg>
    );
  };

  // String release simulation (render function, not component)
  const renderStringReleaseSVG = ({ size = 280 }: { size?: number }) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const simRadius = 80;
    const ballX = centerX + Math.cos(carAngle * Math.PI / 180) * simRadius;
    const ballY = centerY + Math.sin(carAngle * Math.PI / 180) * simRadius;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
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

        {/* Background group */}
        <g id="bg-group">
          {/* Circular path indicator */}
          <circle cx={centerX} cy={centerY} r={simRadius} fill="none" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5 3" />
          <text x={centerX} y={centerY - simRadius - 10} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Circular Path</text>
        </g>

        {/* Center pivot group */}
        <g id="pivot-group">
          <circle cx={centerX} cy={centerY} r="8" fill="#fbbf24" filter="url(#ballGlow)" />
          <text x={centerX} y={centerY + 24} fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">Pivot</text>
        </g>

        {!stringBroken ? (
          <g id="attached-state">
            {/* String */}
            <line x1={centerX} y1={centerY} x2={ballX} y2={ballY} stroke={colors.textSecondary} strokeWidth="3" />
            <text x={(centerX + ballX) / 2 - 15} y={(centerY + ballY) / 2 - 5} fill={colors.textSecondary} fontSize="11">String</text>

            {/* Ball */}
            <circle cx={ballX} cy={ballY} r="14" fill="url(#ballGrad)" filter="url(#ballGlow)" />
            <text x={ballX + 18} y={ballY - 5} fill={colors.textPrimary} fontSize="11" fontWeight="bold">Ball</text>

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
              fontSize="11"
              fontWeight="bold"
            >v (tangent)</text>
          </g>
        ) : (
          <g id="released-state">
            {/* Broken string pieces */}
            <line x1={centerX} y1={centerY} x2={centerX + 12} y2={centerY + 8} stroke={colors.error} strokeWidth="3" />
            <line x1={centerX} y1={centerY} x2={centerX - 10} y2={centerY + 6} stroke={colors.error} strokeWidth="3" />
            <text x={centerX - 35} y={centerY + 20} fill={colors.error} fontSize="11">Broken!</text>

            {/* Trail of released ball */}
            <g id="trail-group">
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
            </g>

            {/* Released ball */}
            <circle
              cx={ballX + ballPosition.x}
              cy={ballY + ballPosition.y}
              r="14"
              fill="url(#ballReleasedGrad)"
              filter="url(#ballGlow)"
            />
            <text x={ballX + ballPosition.x + 18} y={ballY + ballPosition.y - 5} fill={colors.error} fontSize="11" fontWeight="bold">Ball</text>

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
            <text x={ballX + Math.cos(releaseAngle) * 60} y={ballY + Math.sin(releaseAngle) * 60 - 8} fill={colors.success} fontSize="11" fontWeight="bold">Straight Line Path</text>

            {/* Release point marker */}
            <circle cx={ballX} cy={ballY} r="5" fill={colors.success} opacity="0.5" />
            <text x={ballX - 30} y={ballY + 20} fill={colors.success} fontSize="11">Release Point</text>
          </g>
        )}

        {stringBroken && (
          <text x={centerX} y={size - 12} fill={colors.success} fontSize="11" fontWeight="bold" textAnchor="middle">
            Ball travels in a STRAIGHT LINE!
          </text>
        )}
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER PHASE CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  const renderPhaseContent = () => {
    // HOOK PHASE
    if (phase === 'hook') {
      return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
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
            margin: '0 auto 32px',
          }}>
            "When a car turns, you feel pushed toward the outside door. But is there really an <span style={{ color: colors.accent, fontWeight: 600 }}>outward force</span>, or is something else going on?"
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            border: `1px solid ${colors.border}`,
          }}>
            {renderCircularMotionSVG({ showVec: true, size: isMobile ? 260 : 300 })}
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '16px', fontStyle: 'italic' }}>
              "Every object moving in a circle requires a force pointing toward the center. Without it, objects would travel in straight lines forever."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Newton's Laws of Motion
            </p>
          </div>
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
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
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
            {renderCircularMotionSVG({ showVec: false, size: isMobile ? 220 : 260 })}
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
        </div>
      );
    }

    // PLAY PHASE - Interactive Circular Motion Lab
    if (phase === 'play') {
      return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Centripetal Force Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            This visualization demonstrates how centripetal force keeps objects moving in circles.
            Watch how the force vectors change as you adjust the controls below.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            This is important in real-world applications like race track design, satellite orbits, and centrifuges used in technology and industry.
          </p>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            {/* Left: SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  {renderCircularMotionSVG({ showVec: showVectors, size: isMobile ? 280 : 320 })}
                </div>

                {/* Legend panel */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '24px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '4px', background: colors.velocity, borderRadius: '2px' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Velocity (v)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '4px', background: colors.force, borderRadius: '2px' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Centripetal Force (Fc)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '50%' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Center</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                {/* Mass slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Mass (m)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{mass.toFixed(1)} kg</span>
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '6px', fontSize: '12px' }}>Controls inertia — affects force</div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={mass}
                    onChange={(e) => setMass(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                {/* Speed slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Speed (v)</span>
                    <span style={{ ...typo.small, color: colors.velocity, fontWeight: 600 }}>{speed.toFixed(1)} m/s</span>
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '6px', fontSize: '12px' }}>Affects force quadratically</div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="0.5"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                {/* Radius slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Radius (r)</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{(radius / 10).toFixed(1)} m</span>
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '6px', fontSize: '12px' }}>Inversely affects force</div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                  <button
                    onClick={() => setIsAnimating(!isAnimating)}
                    style={{
                      padding: '10px 16px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isAnimating ? colors.error : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {isAnimating ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={() => setShowVectors(!showVectors)}
                    style={{
                      padding: '10px 16px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: 'none',
                      background: showVectors ? colors.accent : colors.bgSecondary,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Vectors {showVectors ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Physics values */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(1, 1fr)',
                  gap: '10px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.h3, color: isSliding ? colors.error : colors.force }}>{centripetalForce.toFixed(2)} N</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Required Fc</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>{centripetalAccel.toFixed(2)} m/s²</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Acceleration</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.h3, color: isSliding ? colors.error : colors.success }}>
                      {isSliding ? 'SLIDING' : 'GRIPPING'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key formula */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
              <span style={{ fontWeight: 800 }}>F</span><sub>c</sub> = <span style={{ fontWeight: 800 }}>m</span><span style={{ fontWeight: 800 }}>v</span>²/<span style={{ fontWeight: 800 }}>r</span>
            </h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <span style={{ color: colors.velocity, fontWeight: 700 }}>v</span> (velocity) is tangent to the circle.{' '}
              <span style={{ color: colors.force, fontWeight: 700 }}>Fc</span> points toward the center.{' '}
              <span style={{ fontWeight: 700 }}>Double the speed = 4x the force!</span>
            </p>
          </div>
        </div>
      );
    }

    // REVIEW PHASE
    if (phase === 'review') {
      return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            Understanding Centripetal Force
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            As you observed in the experiment, centripetal force increases dramatically with speed.
            Your prediction helped you see the result of these physics relationships in action.
          </p>

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
                <li>Formula: F = mv²/r</li>
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
                  <strong style={{ color: colors.textPrimary }}>Centripetal acceleration:</strong> a = v²/r (always toward center)
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.textPrimary }}>Newton's 2nd Law:</strong> F = ma = mv²/r
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Speed doubled?</strong> Force quadruples! (v² relationship)
                </p>
              </div>
            </div>
          </div>
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
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>
              New Variable: What Happens When Centripetal Force Disappears?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A ball swings in a circle on a string. The string suddenly breaks. What path does the ball follow?
          </h2>

          {/* Diagram - Add SVG here for twist_predict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <svg width={isMobile ? 260 : 300} height={isMobile ? 260 : 300} viewBox="0 0 300 300" style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="ballGradPredict" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </radialGradient>
                <filter id="glowPredict">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background */}
              <g id="bg-layer">
                <rect x="0" y="0" width="300" height="300" fill={colors.bgCard} />
              </g>

              {/* Circular path */}
              <g id="path-layer">
                <circle cx="150" cy="150" r="80" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5 3" />
                <text x="150" y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Circular Path</text>
              </g>

              {/* Question marks showing possible paths */}
              <g id="question-layer">
                {/* Tangent path option */}
                <line x1="230" y1="150" x2="280" y2="150" stroke={colors.accent} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
                <text x="255" y="140" fill={colors.accent} fontSize="14" textAnchor="middle">?</text>

                {/* Outward spiral option */}
                <line x1="230" y1="150" x2="270" y2="180" stroke={colors.warning} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
                <text x="260" y="195" fill={colors.warning} fontSize="14" textAnchor="middle">?</text>

                {/* Radially outward option */}
                <line x1="230" y1="150" x2="280" y2="150" stroke={colors.error} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" transform="rotate(30, 230, 150)" />
                <text x="270" y="120" fill={colors.error} fontSize="14" textAnchor="middle">?</text>
              </g>

              {/* Center pivot */}
              <g id="pivot-layer">
                <circle cx="150" cy="150" r="8" fill="#fbbf24" filter="url(#glowPredict)" />
                <text x="150" y="175" fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">Pivot</text>
              </g>

              {/* String */}
              <g id="string-layer">
                <line x1="150" y1="150" x2="230" y2="150" stroke={colors.textSecondary} strokeWidth="3" />
                <text x="190" y="140" fill={colors.textSecondary} fontSize="11">String</text>
              </g>

              {/* Ball */}
              <g id="ball-layer">
                <circle cx="230" cy="150" r="14" fill="url(#ballGradPredict)" filter="url(#glowPredict)" />
                <text x="230" y="125" fill={colors.textPrimary} fontSize="11" fontWeight="bold" textAnchor="middle">Ball</text>
              </g>

              {/* Velocity arrow */}
              <g id="velocity-layer">
                <line x1="230" y1="150" x2="230" y2="100" stroke={colors.velocity} strokeWidth="3" markerEnd="url(#arrowVel)" />
                <text x="245" y="105" fill={colors.velocity} fontSize="11" fontWeight="bold">v</text>
              </g>

              {/* Explanation text */}
              <text x="150" y="285" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Which direction when string breaks?</text>
            </svg>
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
        </div>
      );
    }

    // TWIST PLAY PHASE
    if (phase === 'twist_play') {
      return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Tangential Release Simulation
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch what happens when the centripetal force suddenly disappears
          </p>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            {/* Left: SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderStringReleaseSVG({ size: isMobile ? 280 : 320 })}
                </div>
              </div>
            </div>

            {/* Right: Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {!stringBroken ? (
                    <button
                      onClick={breakString}
                      style={{
                        padding: '14px 28px',
                        minHeight: '48px',
                        borderRadius: '10px',
                        border: 'none',
                        background: colors.error,
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '16px',
                        width: '100%',
                      }}
                    >
                      Break the String!
                    </button>
                  ) : (
                    <button
                      onClick={resetTwistSim}
                      style={{
                        padding: '14px 28px',
                        minHeight: '48px',
                        borderRadius: '10px',
                        border: 'none',
                        background: colors.accent,
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '16px',
                        width: '100%',
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
                padding: '16px',
              }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px', fontSize: '16px' }}>
                  What You're Observing:
                </h3>
                <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '18px' }}>
                  <li style={{ marginBottom: '6px' }}>The ball moves in a circle because the string pulls it toward the center</li>
                  <li style={{ marginBottom: '6px' }}>Velocity is always TANGENT to the circle</li>
                  <li style={{ marginBottom: '6px' }}>When the string breaks, there's no more centripetal force</li>
                  <li><strong style={{ color: colors.textPrimary }}>Without a force to change its direction, the ball travels in a STRAIGHT LINE!</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TWIST REVIEW PHASE
    if (phase === 'twist_review') {
      return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
                <span style={{ fontSize: '24px' }}>💡</span>
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
                <span style={{ fontSize: '24px' }}>✅</span>
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
                <span style={{ fontSize: '24px' }}>🎯</span>
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
        </div>
      );
    }

    // TRANSFER PHASE
    if (phase === 'transfer') {
      return (
        <TransferPhaseView
          conceptName="Centripetal Force"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
        />
      );
    }

    if (phase === 'transfer') {
      const app = realWorldApps[selectedApp];
      const allAppsCompleted = completedApps.every(c => c);
      const completedCount = completedApps.filter(c => c).length;

      return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            App {selectedApp + 1} of {realWorldApps.length}
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
                  setCurrentAppRead(false);
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
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '4px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>

            {/* Got It button for marking app as read */}
            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  playSound('success');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  setCurrentAppRead(true);
                }}
                style={{
                  width: '100%',
                  padding: '14px 28px',
                  minHeight: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}dd)`,
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Got It! ✓
              </button>
            )}
          </div>

          {/* Progress indicator */}
          <div style={{
            textAlign: 'center',
            color: colors.textSecondary,
            ...typo.small,
            marginBottom: '16px',
          }}>
            {completedCount} of {realWorldApps.length} applications explored
          </div>
        </div>
      );
    }

    // TEST PHASE
    if (phase === 'test') {
      if (testSubmitted) {
        const passed = testScore >= 7;
        return (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
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

            {/* Answer review */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '12px', fontWeight: 600 }}>
                Answer Review:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {testAnswers.map((ans, i) => {
                  const correct = testQuestions[i].options.find(o => o.correct)?.id;
                  const isCorrect = ans === correct;
                  return (
                    <div
                      key={i}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isCorrect ? colors.success : colors.error,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      {isCorrect ? '✓' : '✗'}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {passed && (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{
                    padding: '16px 32px',
                    minHeight: '48px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Claim Your Mastery Badge
                </button>
              )}
              <a
                href="/"
                style={{
                  padding: '16px 32px',
                  minHeight: '48px',
                  borderRadius: '12px',
                  background: passed ? 'rgba(71, 85, 105, 0.5)' : `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        );
      }

      const question = testQuestions[currentQuestion];

      return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
                  minHeight: '48px',
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
                  minHeight: '48px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next Question
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
                  minHeight: '48px',
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
      );
    }

    // MASTERY PHASE
    if (phase === 'mastery') {
      return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Circular Motion Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 32px' }}>
            You've mastered centripetal force and understand why objects move in circles.
            From roller coasters to satellites, you now see circular motion everywhere!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              What You've Mastered:
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { icon: '🔄', text: 'F = mv²/r formula' },
                { icon: '🚀', text: 'Satellite orbits' },
                { icon: '🎢', text: 'Roller coaster loops' },
                { icon: '🚗', text: 'Banked curves' },
                { icon: '🔬', text: 'Centrifuge separation' },
                { icon: '🎯', text: 'Tangential release' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
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
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Key Insight:</strong> There is no "centrifugal force" -
              objects want to go straight, and centripetal force curves their path. Remove the force,
              and they fly off tangentially!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                minHeight: '48px',
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
                padding: '14px 28px',
                minHeight: '48px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
                color: 'white',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 700,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER WITH PROPER LAYOUT STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 50%, ${colors.bgPrimary} 100%)`,
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: '25%',
        width: '384px',
        height: '384px',
        background: 'rgba(139, 92, 246, 0.05)',
        borderRadius: '50%',
        filter: 'blur(48px)',
      }} />

      {/* Fixed header with progress bar */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(71, 85, 105, 0.5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: colors.accent }}>Centripetal Force</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, index) => (
              <button
                key={p}
                aria-label={phaseLabels[p]}
                title={phaseLabels[p]}
                onClick={() => goToPhase(p)}
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  transition: 'all 0.3s ease',
                  width: phase === p ? '24px' : '8px',
                  background: phase === p
                    ? `linear-gradient(to right, ${colors.accent}, #7C3AED)`
                    : index < currentIndex
                      ? colors.success
                      : colors.border,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', color: colors.textSecondary }}>{phaseLabels[phase]}</span>
        </div>
      </header>

      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
        zIndex: 10,
        paddingTop: '64px',
        paddingBottom: '16px',
      }}>
        {renderPhaseContent()}
      </div>

      {/* Fixed bottom navigation bar */}
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(71, 85, 105, 0.5)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <button
            onClick={prevPhase}
            disabled={!canGoBack}
            style={{
              padding: '12px 24px',
              minHeight: '48px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              lineHeight: 1.5,
              border: 'none',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              background: canGoBack ? 'rgba(71, 85, 105, 0.5)' : 'rgba(51, 65, 85, 0.3)',
              color: canGoBack ? colors.textSecondary : '#64748b',
              opacity: canGoBack ? 1 : 0.4,
              transition: 'all 0.2s ease',
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: '14px', color: colors.textSecondary }}>
            {currentIndex + 1} of {phaseOrder.length}
          </span>
          <button
            onClick={nextPhase}
            disabled={!canGoNext}
            style={{
              padding: '12px 24px',
              minHeight: '48px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              lineHeight: 1.5,
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              background: canGoNext ? `linear-gradient(to right, ${colors.accent}, #7C3AED)` : 'rgba(51, 65, 85, 0.3)',
              color: canGoNext ? 'white' : '#64748b',
              opacity: phase === 'test' ? 0.4 : (canGoNext ? 1 : 0.4),
              transition: 'all 0.2s ease',
            }}
          >
            Next →
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CentripetalForceRenderer;
