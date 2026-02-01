'use client';

import React, { useState, useEffect, useRef } from 'react';

const realWorldApps = [
  {
    icon: '🛰️',
    title: 'International Space Station',
    short: 'Continuous crewed presence in low Earth orbit',
    tagline: 'Humanity\'s outpost in space',
    description: 'The ISS orbits at 400 km altitude, completing one orbit every 90 minutes at 7.7 km/s. It demonstrates orbital mechanics principles daily as it requires periodic reboosts to counteract atmospheric drag.',
    connection: 'The ISS is in constant free fall around Earth, demonstrating that orbiting is "falling while moving sideways fast enough to keep missing the ground."',
    howItWorks: 'The station maintains altitude through periodic engine burns from visiting spacecraft. Crew members experience microgravity because they fall at the same rate as their spacecraft.',
    stats: [
      { value: '400', label: 'km altitude', icon: '📏' },
      { value: '90', label: 'min per orbit', icon: '⏱️' },
      { value: '23', label: 'years crewed', icon: '👨‍🚀' }
    ],
    examples: ['Crew rotation missions', 'Science experiments', 'Spacewalks', 'Commercial cargo deliveries'],
    companies: ['NASA', 'Roscosmos', 'ESA', 'SpaceX'],
    futureImpact: 'Commercial space stations like Axiom and Orbital Reef will continue demonstrating orbital mechanics while expanding human presence in space.',
    color: '#3B82F6'
  },
  {
    icon: '🌍',
    title: 'Earth Observation Satellites',
    short: 'Sun-synchronous orbits for consistent imaging',
    tagline: 'Watching our planet from above',
    description: 'Earth observation satellites use carefully chosen orbits to image the entire planet with consistent lighting. Sun-synchronous orbits precess to maintain the same solar angle throughout the year.',
    connection: 'The orbital precession rate depends on altitude and inclination, demonstrating how orbital mechanics enables specific mission requirements like consistent imaging conditions.',
    howItWorks: 'Satellites at 600-800 km with ~98° inclination precess eastward at the same rate Earth orbits the Sun, maintaining constant illumination for their ground track.',
    stats: [
      { value: '1,000+', label: 'EO satellites', icon: '📡' },
      { value: '30cm', label: 'resolution', icon: '🔍' },
      { value: '$5B', label: 'annual market', icon: '📈' }
    ],
    examples: ['Landsat land imaging', 'Sentinel climate monitoring', 'Planet daily imagery', 'Maxar commercial imaging'],
    companies: ['Maxar', 'Planet Labs', 'Airbus', 'BlackSky'],
    futureImpact: 'Mega-constellations will provide near-real-time global monitoring for climate, agriculture, and security applications.',
    color: '#10B981'
  },
  {
    icon: '🚀',
    title: 'Interplanetary Missions',
    short: 'Hohmann transfers minimize fuel for planet travel',
    tagline: 'Reaching other worlds efficiently',
    description: 'Spacecraft traveling to Mars, Venus, or beyond use Hohmann transfer orbits that touch the departure and arrival planet orbits. These trajectories minimize fuel consumption for interplanetary travel.',
    connection: 'The transfer orbit is an ellipse with its perihelion at Earth\'s orbit and aphelion at the destination planet, demonstrating Kepler\'s laws on an interplanetary scale.',
    howItWorks: 'Spacecraft launch during specific windows when planetary alignment allows efficient transfers. The journey to Mars takes about 7 months along an elliptical path around the Sun.',
    stats: [
      { value: '7', label: 'months to Mars', icon: '🔴' },
      { value: '55M', label: 'km minimum distance', icon: '📏' },
      { value: '$2.7B', label: 'Perseverance cost', icon: '💰' }
    ],
    examples: ['Mars rover missions', 'Venus flybys', 'Jupiter exploration', 'Voyager interstellar missions'],
    companies: ['NASA JPL', 'ESA', 'JAXA', 'SpaceX'],
    futureImpact: 'Starship and nuclear thermal propulsion will reduce transit times, while orbital mechanics principles remain fundamental to mission planning.',
    color: '#EF4444'
  },
  {
    icon: '⭐',
    title: 'Gravity Assists',
    short: 'Planetary flybys change spacecraft velocity',
    tagline: 'Borrowing momentum from planets',
    description: 'Spacecraft can use planetary gravity to change their velocity without using fuel. This gravity assist or "slingshot" maneuver has enabled missions to the outer solar system that would otherwise be impossible.',
    connection: 'The spacecraft gains velocity relative to the Sun while losing velocity relative to the planet, conserving momentum in the planet-spacecraft system.',
    howItWorks: 'By approaching a planet from behind its orbital motion, spacecraft "steal" a small amount of the planet\'s orbital momentum. The planet slows imperceptibly while the spacecraft accelerates significantly.',
    stats: [
      { value: '14 km/s', label: 'velocity gain possible', icon: '⚡' },
      { value: '10+', label: 'flybys for Cassini', icon: '🪐' },
      { value: '45', label: 'years Voyager mission', icon: '📡' }
    ],
    examples: ['Voyager grand tour', 'Cassini Saturn mission', 'New Horizons Pluto flyby', 'Parker Solar Probe'],
    companies: ['NASA', 'ESA', 'APL', 'Lockheed Martin'],
    futureImpact: 'Advanced trajectory planning using multiple gravity assists will enable faster, more capable missions throughout the solar system.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface OrbitalMechanicsRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'What keeps the ISS in orbit around Earth?',
    options: [
      { text: 'Rocket engines firing continuously', correct: false },
      { text: 'It\'s outside Earth\'s gravity', correct: false },
      { text: 'It\'s falling toward Earth but moving sideways fast enough to miss', correct: true },
      { text: 'Magnetic repulsion from Earth\'s core', correct: false }
    ]
  },
  {
    question: 'If you throw a ball horizontally on Earth, why doesn\'t it orbit?',
    options: [
      { text: 'Balls can\'t orbit', correct: false },
      { text: 'It doesn\'t have enough horizontal speed - it hits the ground', correct: true },
      { text: 'Air pushes it down', correct: false },
      { text: 'Gravity is too strong at ground level', correct: false }
    ]
  },
  {
    question: 'Why do astronauts float inside the ISS?',
    options: [
      { text: 'There\'s no gravity in space', correct: false },
      { text: 'The ISS has anti-gravity generators', correct: false },
      { text: 'They\'re falling at the same rate as the station (free fall)', correct: true },
      { text: 'They\'re too far from Earth for gravity', correct: false }
    ]
  },
  {
    question: 'To orbit higher, a satellite needs to:',
    options: [
      { text: 'Move faster', correct: false },
      { text: 'Move slower (orbital velocity decreases with altitude)', correct: true },
      { text: 'Weigh less', correct: false },
      { text: 'Be larger', correct: false }
    ]
  },
  {
    question: 'What is the approximate escape velocity from Earth\'s surface?',
    options: [
      { text: '7.9 km/s', correct: false },
      { text: '11.2 km/s', correct: true },
      { text: '3.5 km/s', correct: false },
      { text: '25 km/s', correct: false }
    ]
  },
  {
    question: 'According to Kepler\'s third law, how does orbital period relate to orbital radius?',
    options: [
      { text: 'Period is proportional to radius', correct: false },
      { text: 'Period squared is proportional to radius cubed', correct: true },
      { text: 'Period decreases as radius increases', correct: false },
      { text: 'Period and radius are unrelated', correct: false }
    ]
  },
  {
    question: 'What shape are all orbits according to Kepler\'s first law?',
    options: [
      { text: 'Perfect circles', correct: false },
      { text: 'Ellipses (with circle as a special case)', correct: true },
      { text: 'Parabolas', correct: false },
      { text: 'Hyperbolas', correct: false }
    ]
  },
  {
    question: 'A geostationary satellite orbits Earth in exactly 24 hours. At what altitude must it be?',
    options: [
      { text: '400 km (like the ISS)', correct: false },
      { text: '2,000 km', correct: false },
      { text: '35,786 km', correct: true },
      { text: '100,000 km', correct: false }
    ]
  },
  {
    question: 'What provides the centripetal force for a satellite in orbit?',
    options: [
      { text: 'The satellite\'s engines', correct: false },
      { text: 'Earth\'s gravitational pull', correct: true },
      { text: 'Earth\'s magnetic field', correct: false },
      { text: 'Solar wind pressure', correct: false }
    ]
  },
  {
    question: 'At what point in an elliptical orbit does a satellite move fastest?',
    options: [
      { text: 'At the farthest point from Earth (apogee)', correct: false },
      { text: 'At the closest point to Earth (perigee)', correct: true },
      { text: 'Speed is constant throughout the orbit', correct: false },
      { text: 'At the midpoint between perigee and apogee', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'GPS Satellites',
    description: '~20,200 km altitude, ~14,000 km/h. Higher orbit = slower speed, longer orbital period.',
    icon: '📡'
  },
  {
    title: 'Geostationary Orbit',
    description: '35,786 km up, orbits in exactly 24 hours - appears stationary over one spot!',
    icon: '🛰️'
  },
  {
    title: 'Vomit Comet',
    description: 'Parabolic flights create ~25 seconds of free fall to simulate microgravity for training.',
    icon: '✈️'
  },
  {
    title: 'Escape Velocity',
    description: 'At 11.2 km/s horizontal, you escape Earth entirely - no more "falling around"!',
    icon: '🚀'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function OrbitalMechanicsRenderer({ phase: initialPhase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: OrbitalMechanicsRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialPhase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [launchSpeed, setLaunchSpeed] = useState(5); // km/s scale
  const [isLaunched, setIsLaunched] = useState(false);
  const [projectilePos, setProjectilePos] = useState({ x: 0, y: 0 });
  const [projectileVel, setProjectileVel] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [outcome, setOutcome] = useState<'none' | 'crash' | 'orbit' | 'escape'>('none');
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - ISS simulation
  const [issAngle, setIssAngle] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const navigationLockRef = useRef(false);

  // Responsive detection
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

  // Earth radius in simulation units
  const EARTH_RADIUS = 80;
  const EARTH_CENTER = { x: 200, y: 300 };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete) onPhaseComplete();

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  const launchProjectile = () => {
    // Start from mountain top (top of Earth)
    const startX = EARTH_CENTER.x;
    const startY = EARTH_CENTER.y - EARTH_RADIUS - 10;

    setProjectilePos({ x: startX, y: startY });
    setProjectileVel({ x: launchSpeed * 3, y: 0 }); // Horizontal launch
    setTrail([{ x: startX, y: startY }]);
    setOutcome('none');
    setIsLaunched(true);
  };

  const resetLaunch = () => {
    setIsLaunched(false);
    setProjectilePos({ x: 0, y: 0 });
    setProjectileVel({ x: 0, y: 0 });
    setTrail([]);
    setOutcome('none');
  };

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ISS orbit animation
  useEffect(() => {
    if (phase === 'twist_play' || phase === 'twist_review') {
      const interval = setInterval(() => {
        setIssAngle(a => (a + 0.02) % (Math.PI * 2));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Projectile simulation
  useEffect(() => {
    if (!isLaunched || outcome !== 'none') return;

    const interval = setInterval(() => {
      setProjectilePos(pos => {
        // Calculate gravity (pointing toward Earth center)
        const dx = EARTH_CENTER.x - pos.x;
        const dy = EARTH_CENTER.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < EARTH_RADIUS) {
          setOutcome('crash');
          return pos;
        }

        if (dist > 400) {
          setOutcome('escape');
          return pos;
        }

        // Gravity strength (inverse square, simplified)
        const g = 300 / (dist * dist);
        const ax = (dx / dist) * g;
        const ay = (dy / dist) * g;

        // Update velocity
        const newVx = projectileVel.x + ax;
        const newVy = projectileVel.y + ay;
        setProjectileVel({ x: newVx, y: newVy });

        // Update position
        const newX = pos.x + newVx;
        const newY = pos.y + newVy;

        // Check for stable orbit (completed a loop)
        if (trail.length > 50 && Math.abs(newX - trail[0].x) < 20 && Math.abs(newY - trail[0].y) < 20) {
          setOutcome('orbit');
        }

        // Update trail
        setTrail(t => [...t.slice(-200), { x: newX, y: newY }]);

        return { x: newX, y: newY };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isLaunched, outcome, projectileVel, trail]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      resetLaunch();
      setLaunchSpeed(5);
    }
    if (phase === 'twist_play') {
      setIssAngle(0);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderCannonScene = () => {
    return (
      <svg viewBox="0 0 400 350" className="w-full h-64">
        {/* Premium SVG Definitions */}
        <defs>
          {/* === LINEAR GRADIENTS === */}

          {/* Premium space background gradient */}
          <linearGradient id="orbmSpaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0c1222" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Earth surface gradient with depth */}
          <linearGradient id="orbmEarthSurface" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="20%" stopColor="#16a34a" />
            <stop offset="40%" stopColor="#15803d" />
            <stop offset="60%" stopColor="#166534" />
            <stop offset="80%" stopColor="#14532d" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>

          {/* Ocean gradient */}
          <linearGradient id="orbmOcean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="75%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Atmosphere gradient */}
          <linearGradient id="orbmAtmosphere" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </linearGradient>

          {/* Mountain metal gradient */}
          <linearGradient id="orbmMountain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="25%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="75%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Cannon barrel gradient */}
          <linearGradient id="orbmCannonBarrel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="20%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="80%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Velocity vector gradient */}
          <linearGradient id="orbmVelocityVector" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="30%" stopColor="#4ade80" />
            <stop offset="70%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#bbf7d0" />
          </linearGradient>

          {/* Trajectory orbit gradient */}
          <linearGradient id="orbmTrajectoryOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="0.5" />
          </linearGradient>

          {/* Trajectory crash gradient */}
          <linearGradient id="orbmTrajectoryCrash" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#f87171" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.5" />
          </linearGradient>

          {/* Trajectory escape gradient */}
          <linearGradient id="orbmTrajectoryEscape" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0.5" />
          </linearGradient>

          {/* === RADIAL GRADIENTS === */}

          {/* Earth 3D sphere gradient */}
          <radialGradient id="orbmEarth3D" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="20%" stopColor="#3b82f6" />
            <stop offset="45%" stopColor="#2563eb" />
            <stop offset="70%" stopColor="#1d4ed8" />
            <stop offset="90%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>

          {/* Earth landmass overlay */}
          <radialGradient id="orbmEarthLand" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#16a34a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0.1" />
          </radialGradient>

          {/* Atmospheric glow gradient */}
          <radialGradient id="orbmAtmoGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.2" />
          </radialGradient>

          {/* Projectile glow gradient */}
          <radialGradient id="orbmProjectileGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          {/* Star glow gradient */}
          <radialGradient id="orbmStarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
          </radialGradient>

          {/* === FILTERS === */}

          {/* Atmospheric glow filter */}
          <filter id="orbmAtmoFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Projectile glow filter */}
          <filter id="orbmProjectileFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Star twinkle filter */}
          <filter id="orbmStarFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trajectory glow filter */}
          <filter id="orbmTrajectoryFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Velocity arrow marker */}
          <marker id="orbmArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="url(#orbmVelocityVector)" />
          </marker>

          {/* Gravity arrow marker */}
          <marker id="orbmGravityArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
        </defs>

        {/* Premium space background */}
        <rect width="400" height="350" fill="url(#orbmSpaceBg)" />

        {/* Distant stars with varied sizes and glow */}
        {[...Array(40)].map((_, i) => {
          const x = (i * 37 + i * i * 3) % 400;
          const y = (i * 23 + i * 7) % 180;
          const size = 0.5 + (i % 4) * 0.4;
          const opacity = 0.3 + (i % 5) * 0.15;
          return (
            <circle
              key={`star-${i}`}
              cx={x}
              cy={y}
              r={size}
              fill="url(#orbmStarGlow)"
              filter={size > 1 ? "url(#orbmStarFilter)" : undefined}
              opacity={opacity}
            />
          );
        })}

        {/* Outer atmospheric glow ring */}
        <circle
          cx={EARTH_CENTER.x}
          cy={EARTH_CENTER.y}
          r={EARTH_RADIUS + 12}
          fill="none"
          stroke="url(#orbmAtmosphere)"
          strokeWidth="8"
          opacity="0.4"
          filter="url(#orbmAtmoFilter)"
        />

        {/* Atmospheric haze */}
        <circle
          cx={EARTH_CENTER.x}
          cy={EARTH_CENTER.y}
          r={EARTH_RADIUS + 6}
          fill="url(#orbmAtmoGlow)"
          filter="url(#orbmAtmoFilter)"
        />

        {/* Earth main sphere */}
        <circle
          cx={EARTH_CENTER.x}
          cy={EARTH_CENTER.y}
          r={EARTH_RADIUS}
          fill="url(#orbmEarth3D)"
        />

        {/* Continent overlay patterns */}
        <ellipse
          cx={EARTH_CENTER.x - 15}
          cy={EARTH_CENTER.y - 20}
          rx={25}
          ry={20}
          fill="url(#orbmEarthLand)"
        />
        <ellipse
          cx={EARTH_CENTER.x + 25}
          cy={EARTH_CENTER.y + 10}
          rx={18}
          ry={22}
          fill="url(#orbmEarthLand)"
        />
        <ellipse
          cx={EARTH_CENTER.x - 10}
          cy={EARTH_CENTER.y + 30}
          rx={15}
          ry={12}
          fill="url(#orbmEarthLand)"
        />

        {/* Earth highlight rim */}
        <circle
          cx={EARTH_CENTER.x}
          cy={EARTH_CENTER.y}
          r={EARTH_RADIUS}
          fill="none"
          stroke="#93c5fd"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Premium mountain with layered depth */}
        <polygon
          points={`${EARTH_CENTER.x - 20},${EARTH_CENTER.y - EARTH_RADIUS + 2} ${EARTH_CENTER.x},${EARTH_CENTER.y - EARTH_RADIUS - 18} ${EARTH_CENTER.x + 20},${EARTH_CENTER.y - EARTH_RADIUS + 2}`}
          fill="url(#orbmMountain)"
          stroke="#4b5563"
          strokeWidth="1"
        />
        {/* Mountain snow cap */}
        <polygon
          points={`${EARTH_CENTER.x - 5},${EARTH_CENTER.y - EARTH_RADIUS - 10} ${EARTH_CENTER.x},${EARTH_CENTER.y - EARTH_RADIUS - 18} ${EARTH_CENTER.x + 5},${EARTH_CENTER.y - EARTH_RADIUS - 10}`}
          fill="#f1f5f9"
          opacity="0.8"
        />

        {/* Premium cannon with 3D effect */}
        <g>
          {/* Cannon base */}
          <ellipse
            cx={EARTH_CENTER.x + 15}
            cy={EARTH_CENTER.y - EARTH_RADIUS - 12}
            rx={8}
            ry={4}
            fill="#1e293b"
          />
          {/* Cannon barrel */}
          <rect
            x={EARTH_CENTER.x}
            y={EARTH_CENTER.y - EARTH_RADIUS - 20}
            width="35"
            height="10"
            rx="3"
            fill="url(#orbmCannonBarrel)"
            stroke="#475569"
            strokeWidth="1"
          />
          {/* Cannon barrel highlight */}
          <rect
            x={EARTH_CENTER.x + 2}
            y={EARTH_CENTER.y - EARTH_RADIUS - 19}
            width="31"
            height="3"
            rx="1"
            fill="#64748b"
            opacity="0.4"
          />
          {/* Cannon muzzle */}
          <ellipse
            cx={EARTH_CENTER.x + 35}
            cy={EARTH_CENTER.y - EARTH_RADIUS - 15}
            rx={3}
            ry={5}
            fill="#1e293b"
          />
        </g>

        {/* Trajectory trail with premium gradient */}
        {trail.length > 1 && (
          <path
            d={`M ${trail[0].x} ${trail[0].y} ${trail.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
            fill="none"
            stroke={outcome === 'orbit' ? 'url(#orbmTrajectoryOrbit)' : outcome === 'crash' ? 'url(#orbmTrajectoryCrash)' : 'url(#orbmTrajectoryEscape)'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#orbmTrajectoryFilter)"
            opacity="0.85"
          />
        )}

        {/* Premium projectile with glow */}
        {isLaunched && outcome === 'none' && (
          <g filter="url(#orbmProjectileFilter)">
            <circle
              cx={projectilePos.x}
              cy={projectilePos.y}
              r={8}
              fill="url(#orbmProjectileGlow)"
            />
            <circle
              cx={projectilePos.x}
              cy={projectilePos.y}
              r={4}
              fill="#fef08a"
            />
          </g>
        )}

        {/* Velocity vector indicator (before launch) */}
        {!isLaunched && (
          <g>
            {/* Velocity arrow */}
            <line
              x1={EARTH_CENTER.x + 38}
              y1={EARTH_CENTER.y - EARTH_RADIUS - 15}
              x2={EARTH_CENTER.x + 38 + launchSpeed * 5}
              y2={EARTH_CENTER.y - EARTH_RADIUS - 15}
              stroke="url(#orbmVelocityVector)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#orbmArrowhead)"
            />
            {/* Velocity label with background */}
            <rect
              x={EARTH_CENTER.x + 40 + launchSpeed * 2.5 - 22}
              y={EARTH_CENTER.y - EARTH_RADIUS - 35}
              width="44"
              height="16"
              rx="4"
              fill="#0f172a"
              opacity="0.8"
            />
            <text
              x={EARTH_CENTER.x + 40 + launchSpeed * 2.5}
              y={EARTH_CENTER.y - EARTH_RADIUS - 23}
              textAnchor="middle"
              className="fill-green-400 text-xs font-semibold"
            >
              v = {launchSpeed} km/s
            </text>
          </g>
        )}

        {/* Gravity vector (shown when projectile is moving) */}
        {isLaunched && outcome === 'none' && (
          <g>
            <line
              x1={projectilePos.x}
              y1={projectilePos.y + 10}
              x2={projectilePos.x}
              y2={projectilePos.y + 35}
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#orbmGravityArrow)"
              opacity="0.8"
            />
            <text
              x={projectilePos.x + 12}
              y={projectilePos.y + 28}
              className="fill-red-400 text-xs"
              opacity="0.9"
            >
              g
            </text>
          </g>
        )}

        {/* Outcome indicators with premium styling */}
        {outcome === 'crash' && (
          <g>
            <rect x="50" y="12" width="300" height="28" rx="14" fill="#0f172a" opacity="0.9" />
            <text x="200" y="32" textAnchor="middle" className="fill-red-400 text-sm font-bold">
              Crashed - Not enough horizontal speed
            </text>
          </g>
        )}
        {outcome === 'orbit' && (
          <g>
            <rect x="50" y="12" width="300" height="28" rx="14" fill="#0f172a" opacity="0.9" />
            <text x="200" y="32" textAnchor="middle" className="fill-green-400 text-sm font-bold">
              Orbit achieved - Falling around Earth!
            </text>
          </g>
        )}
        {outcome === 'escape' && (
          <g>
            <rect x="50" y="12" width="300" height="28" rx="14" fill="#0f172a" opacity="0.9" />
            <text x="200" y="32" textAnchor="middle" className="fill-purple-400 text-sm font-bold">
              Escape velocity - Left Earth&apos;s gravity!
            </text>
          </g>
        )}

        {/* Labels */}
        <text x="200" y="340" textAnchor="middle" className="fill-gray-400 text-xs">
          Newton&apos;s Cannonball: What speed makes it orbit?
        </text>
      </svg>
    );
  };

  const renderISSScene = () => {
    const issX = EARTH_CENTER.x + Math.cos(issAngle) * (EARTH_RADIUS + 30);
    const issY = 200 + Math.sin(issAngle) * (EARTH_RADIUS + 30) * 0.3; // Flattened for perspective

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Premium SVG Definitions for ISS Scene */}
        <defs>
          {/* === LINEAR GRADIENTS === */}

          {/* Premium space background */}
          <linearGradient id="orbmISSSpaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0c1629" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* ISS solar panel gradient */}
          <linearGradient id="orbmSolarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="20%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* ISS body metallic gradient */}
          <linearGradient id="orbmISSBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="25%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="75%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* ISS module gradient */}
          <linearGradient id="orbmISSModule" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="30%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Orbital path gradient */}
          <linearGradient id="orbmOrbitPath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
            <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
          </linearGradient>

          {/* Velocity vector gradient */}
          <linearGradient id="orbmISSVelocity" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          {/* Gravity vector gradient */}
          <linearGradient id="orbmISSGravity" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          {/* Info panel gradient */}
          <linearGradient id="orbmInfoPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* === RADIAL GRADIENTS === */}

          {/* Earth from orbit view */}
          <radialGradient id="orbmEarthOrbit" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="20%" stopColor="#60a5fa" />
            <stop offset="40%" stopColor="#3b82f6" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="80%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>

          {/* Earth atmosphere from orbit */}
          <radialGradient id="orbmEarthAtmoOrbit" cx="50%" cy="30%" r="75%">
            <stop offset="80%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="90%" stopColor="#93c5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.2" />
          </radialGradient>

          {/* ISS glow gradient */}
          <radialGradient id="orbmISSGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Star glow */}
          <radialGradient id="orbmISSStarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
          </radialGradient>

          {/* === FILTERS === */}

          {/* Earth atmosphere filter */}
          <filter id="orbmISSAtmoFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ISS glow filter */}
          <filter id="orbmISSGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Vector arrow filter */}
          <filter id="orbmVectorFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Panel shadow filter */}
          <filter id="orbmPanelShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* Velocity arrow marker */}
          <marker id="orbmISSVelArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#4ade80" />
          </marker>

          {/* Gravity arrow marker */}
          <marker id="orbmISSGravArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#f87171" />
          </marker>
        </defs>

        {/* Premium space background */}
        <rect width="400" height="280" fill="url(#orbmISSSpaceBg)" />

        {/* Stars with varied glow */}
        {[...Array(50)].map((_, i) => {
          const x = (i * 31 + i * i * 2) % 400;
          const y = (i * 17 + i * 5) % 180;
          const size = 0.4 + (i % 5) * 0.3;
          const opacity = 0.2 + (i % 6) * 0.12;
          return (
            <circle
              key={`iss-star-${i}`}
              cx={x}
              cy={y}
              r={size}
              fill="url(#orbmISSStarGlow)"
              opacity={opacity}
            />
          );
        })}

        {/* Earth from orbit (partial view) with atmospheric glow */}
        <ellipse
          cx={200}
          cy={360}
          rx={190}
          ry={170}
          fill="url(#orbmEarthAtmoOrbit)"
          filter="url(#orbmISSAtmoFilter)"
        />
        <ellipse
          cx={200}
          cy={360}
          rx={180}
          ry={160}
          fill="url(#orbmEarthOrbit)"
        />

        {/* Earth cloud patterns */}
        <ellipse cx={150} cy={250} rx={40} ry={15} fill="#ffffff" opacity="0.15" />
        <ellipse cx={250} cy={270} rx={30} ry={12} fill="#ffffff" opacity="0.12" />
        <ellipse cx={180} cy={290} rx={25} ry={10} fill="#ffffff" opacity="0.1" />

        {/* Atmospheric rim light */}
        <ellipse
          cx={200}
          cy={360}
          rx={182}
          ry={162}
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Premium orbital path */}
        <ellipse
          cx={200}
          cy={200}
          rx={120}
          ry={40}
          fill="none"
          stroke="url(#orbmOrbitPath)"
          strokeWidth="2"
          strokeDasharray="8,4"
        />

        {/* Premium ISS */}
        <g transform={`translate(${issX}, ${issY})`} filter="url(#orbmISSGlowFilter)">
          {/* ISS ambient glow */}
          <ellipse cx="0" cy="0" rx="35" ry="15" fill="url(#orbmISSGlow)" />

          {/* Solar panel left */}
          <g transform="translate(-28, -4)">
            <rect width="22" height="8" rx="1" fill="url(#orbmSolarPanel)" stroke="#b45309" strokeWidth="0.5" />
            {/* Panel grid lines */}
            <line x1="5.5" y1="0" x2="5.5" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.5" />
            <line x1="11" y1="0" x2="11" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.5" />
            <line x1="16.5" y1="0" x2="16.5" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.5" />
          </g>

          {/* Solar panel right */}
          <g transform="translate(6, -4)">
            <rect width="22" height="8" rx="1" fill="url(#orbmSolarPanel)" stroke="#b45309" strokeWidth="0.5" />
            <line x1="5.5" y1="0" x2="5.5" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.5" />
            <line x1="11" y1="0" x2="11" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.5" />
            <line x1="16.5" y1="0" x2="16.5" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.5" />
          </g>

          {/* Main truss */}
          <rect x="-30" y="-2" width="60" height="4" rx="1" fill="url(#orbmISSBody)" stroke="#64748b" strokeWidth="0.5" />

          {/* Central module */}
          <rect x="-10" y="-7" width="20" height="14" rx="3" fill="url(#orbmISSBody)" stroke="#94a3b8" strokeWidth="0.5" />
          {/* Module highlight */}
          <rect x="-8" y="-6" width="16" height="4" rx="2" fill="#e2e8f0" opacity="0.3" />

          {/* Left module */}
          <rect x="-16" y="-5" width="6" height="10" rx="2" fill="url(#orbmISSModule)" stroke="#64748b" strokeWidth="0.5" />

          {/* Right module */}
          <rect x="10" y="-5" width="6" height="10" rx="2" fill="url(#orbmISSModule)" stroke="#64748b" strokeWidth="0.5" />

          {/* Docking port indicator */}
          <circle cx="0" cy="-7" r="2" fill="#3b82f6" opacity="0.8" />
        </g>

        {/* Premium Gravity vector */}
        <g transform={`translate(${issX}, ${issY + 18})`} filter="url(#orbmVectorFilter)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="30"
            stroke="url(#orbmISSGravity)"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#orbmISSGravArrow)"
          />
          <rect x="8" y="8" width="52" height="16" rx="4" fill="url(#orbmInfoPanel)" opacity="0.9" />
          <text x="34" y="20" textAnchor="middle" className="fill-red-400 text-xs font-semibold">Gravity (g)</text>
        </g>

        {/* Premium Velocity vector */}
        <g transform={`translate(${issX}, ${issY})`} filter="url(#orbmVectorFilter)">
          <line
            x1="0"
            y1="0"
            x2={Math.cos(issAngle + Math.PI / 2) * 35}
            y2={Math.sin(issAngle + Math.PI / 2) * 12}
            stroke="url(#orbmISSVelocity)"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#orbmISSVelArrow)"
          />
          <g transform={`translate(${Math.cos(issAngle + Math.PI / 2) * 42}, ${Math.sin(issAngle + Math.PI / 2) * 14 - 8})`}>
            <rect x="-28" y="-6" width="56" height="16" rx="4" fill="url(#orbmInfoPanel)" opacity="0.9" />
            <text x="0" y="6" textAnchor="middle" className="fill-green-400 text-xs font-semibold">Velocity (v)</text>
          </g>
        </g>

        {/* Premium ISS Status Panel */}
        <g transform="translate(20, 20)" filter="url(#orbmPanelShadow)">
          <rect x="0" y="0" width="130" height="55" rx="10" fill="url(#orbmInfoPanel)" stroke="#334155" strokeWidth="1" />
          <rect x="0" y="0" width="130" height="18" rx="10" fill="#1e293b" />
          <rect x="0" y="10" width="130" height="8" fill="#1e293b" />
          <text x="10" y="14" className="fill-slate-300 text-xs font-bold">ISS Status</text>
          <circle cx="118" cy="10" r="4" fill="#22c55e" opacity="0.9" />
          <text x="10" y="32" className="fill-cyan-400 text-xs">Altitude: 408 km</text>
          <text x="10" y="46" className="fill-amber-400 text-xs">Speed: 7.66 km/s</text>
        </g>

        {/* Premium Astronaut Panel */}
        <g transform="translate(260, 20)" filter="url(#orbmPanelShadow)">
          <rect x="0" y="0" width="120" height="65" rx="10" fill="url(#orbmInfoPanel)" stroke="#334155" strokeWidth="1" />
          <rect x="0" y="0" width="120" height="18" rx="10" fill="#1e293b" />
          <rect x="0" y="10" width="120" height="8" fill="#1e293b" />
          <text x="10" y="14" className="fill-slate-300 text-xs font-bold">Inside ISS</text>
          <text x="60" y="48" textAnchor="middle" className="text-xl">🧑‍🚀</text>
          <text x="60" y="60" textAnchor="middle" className="fill-purple-400 text-xs">Free falling!</text>
        </g>

        {/* Premium explanation label */}
        <g transform="translate(200, 260)">
          <rect x="-175" y="-10" width="350" height="20" rx="10" fill="url(#orbmInfoPanel)" opacity="0.8" />
          <text x="0" y="4" textAnchor="middle" className="fill-slate-400 text-xs">
            ISS falls toward Earth at 7.66 km/s - but misses because it&apos;s moving sideways!
          </text>
        </g>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
        The Falling Satellite Paradox
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how satellites orbit by perpetually falling
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🛰️🌍</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              The International Space Station is <span className="text-blue-400 font-semibold">falling toward Earth</span> at 28,000 km/h!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              So why doesn&apos;t it crash? And if it&apos;s falling, why do astronauts float?
            </p>
            <div className="pt-2">
              <p className="text-base text-blue-400 font-semibold">
                How can something fall forever without hitting the ground?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You fire a cannonball horizontally from a very tall mountain. What determines if it orbits Earth?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'fast', text: 'Horizontal speed - fast enough to "fall around" Earth\'s curve', icon: '→' },
          { id: 'up', text: 'Firing angle - must aim slightly upward to stay in space', icon: '↗️' },
          { id: 'mass', text: 'Mass of the cannonball - heavier objects orbit better', icon: '⚖️' },
          { id: 'gravity', text: 'Getting above Earth\'s gravity (impossible to orbit)', icon: '🚫' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Newton&apos;s Cannonball</h2>

      {renderCannonScene()}

      <div className="max-w-lg mx-auto space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Launch Speed: {launchSpeed} km/s</label>
          <input
            type="range"
            min="2"
            max="12"
            step="0.5"
            value={launchSpeed}
            onChange={(e) => setLaunchSpeed(Number(e.target.value))}
            disabled={isLaunched}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>2 km/s (falls)</span>
            <span>~8 km/s (orbit)</span>
            <span>11+ km/s (escape)</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onMouseDown={() => {
              playSound('click');
              if (isLaunched) {
                resetLaunch();
              } else {
                launchProjectile();
              }
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              isLaunched
                ? 'bg-gray-600 text-white'
                : 'bg-green-600 text-white hover:bg-green-500'
            }`}
          >
            {isLaunched ? '🔄 Reset' : '🚀 Fire Cannon!'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-blue-300 text-sm text-center">
          <strong>Key insight:</strong> The cannonball always falls toward Earth. But if it&apos;s moving
          fast enough sideways, Earth&apos;s surface curves away beneath it at the same rate!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Orbiting = Falling + Missing</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Gravity Always Pulls Down</h3>
              <p className="text-gray-400 text-sm">The satellite constantly accelerates toward Earth&apos;s center</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Horizontal Motion Continues</h3>
              <p className="text-gray-400 text-sm">Nothing slows it down sideways (no air resistance in space)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Earth Curves Away</h3>
              <p className="text-gray-400 text-sm">At ~8 km/s, the fall rate matches Earth&apos;s curvature - perpetual free fall!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-blue-300 font-semibold">Orbital Velocity Formula</p>
        <p className="text-gray-400 text-sm mt-1">
          v = √(GM/r) ≈ 7.9 km/s at Earth&apos;s surface<br />
          Higher altitude = slower orbital speed needed!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-blue-400 font-semibold">{prediction === 'fast' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">🔄 The Twist!</h2>
      <p className="text-gray-300 text-center max-w-lg mx-auto">
        Astronauts on the ISS &quot;float&quot; and experience &quot;weightlessness.&quot;
        But the ISS is only 400 km up where gravity is still 90% as strong as on Earth&apos;s surface!
        <span className="text-yellow-400 font-semibold"> Why do they float?</span>
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'freefall', text: 'They\'re in free fall WITH the station - everything falls together', icon: '⬇️' },
          { id: 'nogravity', text: 'There\'s no gravity in space - they\'re truly weightless', icon: '🚫' },
          { id: 'centrifugal', text: 'Centrifugal force cancels gravity exactly', icon: '🔄' },
          { id: 'vacuum', text: 'Vacuum of space prevents gravity from working', icon: '🌌' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setTwistPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Free Fall in Orbit</h2>

      {renderISSScene()}

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-purple-300 text-sm text-center">
          <strong>The ISS AND the astronauts are falling at the same rate!</strong><br />
          Since they accelerate together, there&apos;s no &quot;floor pushing up&quot; feeling.
          It&apos;s like being in a falling elevator - except the elevator never hits bottom!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">&quot;Microgravity&quot; Not &quot;Zero Gravity&quot;</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Scientists say <span className="text-yellow-400 font-semibold">&quot;microgravity&quot;</span> because:
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold">✓ Gravity IS present (90% of surface)</div>
            <div className="text-gray-500">The ISS is in Earth&apos;s gravity well</div>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">✓ Free fall creates apparent weightlessness</div>
            <div className="text-gray-500">Same as skydiving before parachute opens</div>
          </div>
          <div className="bg-yellow-900/30 rounded-lg p-3">
            <div className="text-yellow-400 font-semibold">✓ Tiny residual accelerations exist</div>
            <div className="text-gray-500">Air drag, tidal effects, vibrations = ~10⁻⁶ g</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-purple-400 font-semibold">{twistPrediction === 'freefall' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, index]));
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Take the Quiz →
          </button>
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;
      if (score >= 3 && onCorrectAnswer) onCorrectAnswer();
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="text-gray-300">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onMouseDown={() => {
              playSound(score >= 3 ? 'complete' : 'click');
              nextPhase();
            }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Continue →'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mx-auto">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
          {question.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound(option.correct ? 'success' : 'failure');
                setTestAnswers([...testAnswers, i]);
              }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500 transition-all text-left text-gray-200"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">Orbital Mechanics Master!</h2>
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-blue-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Orbiting = falling toward Earth but moving sideways fast enough to miss</li>
          <li>✓ Orbital velocity ~7.9 km/s at Earth&apos;s surface</li>
          <li>✓ Astronauts float because they&apos;re in free fall with the station</li>
          <li>✓ &quot;Microgravity&quot; is more accurate than &quot;zero gravity&quot;</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        You now understand what Newton imagined 350 years ago! 🍎🛰️
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
      >
        Complete! 🎊
      </button>
    </div>
  );

  // ─── Test Questions Array ────────────────────────────────────────────────────
  const testQuestions = [
    {
      scenario: "The International Space Station orbits Earth at about 400 km altitude, completing one orbit every 90 minutes. Despite being so close to Earth, astronauts inside experience weightlessness.",
      question: "Why does the ISS stay in orbit instead of falling to Earth?",
      options: [
        { id: 'a', label: "The ISS is above Earth's gravitational field where there is no gravity" },
        { id: 'b', label: "The ISS is falling toward Earth but moving sideways fast enough that it continuously misses the surface", correct: true },
        { id: 'c', label: "The ISS has thrusters that constantly fire to keep it from falling" },
        { id: 'd', label: "Earth's magnetic field repels the metallic structure of the station" }
      ],
      explanation: "The ISS is constantly falling toward Earth due to gravity, but it's also moving horizontally at about 7.66 km/s. This sideways motion means that as it falls, the Earth's surface curves away beneath it at the same rate. The result is a continuous 'free fall' around the planet - this is what an orbit actually is."
    },
    {
      scenario: "Communication satellites in geostationary orbit appear to hover over the same spot on Earth's equator. The Hubble Space Telescope, in contrast, orbits much lower at about 540 km altitude.",
      question: "How does a satellite's orbital speed change as its altitude increases?",
      options: [
        { id: 'a', label: "Orbital speed increases with altitude because the satellite has more potential energy" },
        { id: 'b', label: "Orbital speed remains constant regardless of altitude" },
        { id: 'c', label: "Orbital speed decreases with altitude because gravity is weaker and less centripetal force is needed", correct: true },
        { id: 'd', label: "Orbital speed oscillates depending on the satellite's position relative to the Sun" }
      ],
      explanation: "At higher altitudes, gravity is weaker, so satellites need less speed to balance the reduced gravitational pull. The ISS at 400 km travels at 7.66 km/s, while geostationary satellites at 35,786 km orbit at only 3.07 km/s. The relationship comes from v = sqrt(GM/r), showing velocity decreases as radius increases."
    },
    {
      scenario: "Weather satellites like GOES-16 provide continuous imagery of the same region of Earth, making them ideal for tracking hurricanes and severe storms as they develop over hours and days.",
      question: "What specific conditions must be met for a satellite to maintain a geostationary orbit?",
      options: [
        { id: 'a', label: "The satellite must orbit at exactly 35,786 km altitude, directly above the equator, moving eastward with a 24-hour period", correct: true },
        { id: 'b', label: "The satellite must be positioned at any altitude as long as it matches Earth's rotation speed" },
        { id: 'c', label: "The satellite must orbit over Earth's poles to avoid atmospheric drag" },
        { id: 'd', label: "The satellite must use ion thrusters to maintain position against solar wind" }
      ],
      explanation: "A geostationary orbit requires three precise conditions: the satellite must be at 35,786 km altitude (where orbital period equals 24 hours), it must orbit directly above the equator (0 degrees inclination), and it must travel eastward (same direction as Earth's rotation). Only this combination allows the satellite to remain stationary relative to a point on Earth's surface."
    },
    {
      scenario: "NASA's Mars missions use a fuel-efficient trajectory called a Hohmann transfer orbit to travel between Earth and Mars. The journey takes about 9 months even though more direct paths exist.",
      question: "Why is a Hohmann transfer orbit the preferred method for interplanetary travel?",
      options: [
        { id: 'a', label: "It provides the fastest route between two planets" },
        { id: 'b', label: "It minimizes fuel consumption by using only two engine burns to transfer between circular orbits", correct: true },
        { id: 'c', label: "It keeps the spacecraft in constant sunlight for solar power" },
        { id: 'd', label: "It avoids the asteroid belt entirely" }
      ],
      explanation: "A Hohmann transfer is an elliptical orbit that touches both the starting orbit and destination orbit. It requires only two burns: one to enter the ellipse and one to circularize at the destination. While slower than direct trajectories, it uses the minimum possible fuel for the transfer, which is critical when every kilogram of fuel must be launched from Earth."
    },
    {
      scenario: "The Voyager 1 spacecraft, launched in 1977, is now over 24 billion kilometers from Earth and continuing to move away from the Sun. It will never return to the inner solar system.",
      question: "What must be true about Voyager 1's velocity for it to escape the Sun's gravitational influence?",
      options: [
        { id: 'a', label: "Its velocity must be exactly equal to the Sun's orbital velocity around the galaxy" },
        { id: 'b', label: "Its velocity must exceed the local escape velocity, meaning its kinetic energy exceeds the gravitational potential energy binding it to the Sun", correct: true },
        { id: 'c', label: "Its velocity must be zero relative to the cosmic microwave background" },
        { id: 'd', label: "Its velocity must be perpendicular to the Sun's gravity at all times" }
      ],
      explanation: "Escape velocity is the minimum speed needed for an object's kinetic energy to overcome the gravitational potential energy binding it to a massive body. For Voyager 1, this means v >= sqrt(2GM/r) at its distance from the Sun. Once achieved, the spacecraft follows a hyperbolic trajectory and will never return, even though it continues to slow down as it moves away."
    },
    {
      scenario: "GPS satellites orbit at approximately 20,200 km altitude and complete exactly two orbits per day. The Moon, much farther away at 384,400 km, takes about 27.3 days to complete one orbit around Earth.",
      question: "According to Kepler's Third Law, how does orbital period (T) relate to orbital radius (r)?",
      options: [
        { id: 'a', label: "T is directly proportional to r (double the radius means double the period)" },
        { id: 'b', label: "T squared is proportional to r cubed (T^2 is proportional to r^3)", correct: true },
        { id: 'c', label: "T is inversely proportional to r (higher orbits are faster)" },
        { id: 'd', label: "T squared is proportional to r squared (T^2 is proportional to r^2)" }
      ],
      explanation: "Kepler's Third Law states that T^2 is proportional to r^3, or T^2 = (4 pi^2 / GM) * r^3. This means if you double the orbital radius, the period increases by a factor of 2^1.5 (about 2.83). This relationship holds for all orbiting bodies and explains why distant planets take so much longer to orbit the Sun than closer ones."
    },
    {
      scenario: "The Voyager 2 spacecraft used gravity assists from Jupiter, Saturn, Uranus, and Neptune to reach speeds that would have been impossible with its rocket fuel alone. This 'Grand Tour' trajectory was only possible due to a rare planetary alignment.",
      question: "How does a gravity assist (gravitational slingshot) increase a spacecraft's speed relative to the Sun?",
      options: [
        { id: 'a', label: "The planet's gravity accelerates the spacecraft, adding energy from nowhere" },
        { id: 'b', label: "The spacecraft steals a tiny amount of the planet's orbital momentum, gaining velocity relative to the Sun while the planet loses an imperceptible amount", correct: true },
        { id: 'c', label: "The spacecraft's engines fire more efficiently in the planet's gravitational field" },
        { id: 'd', label: "The planet's magnetic field accelerates charged particles in the spacecraft" }
      ],
      explanation: "In a gravity assist, the spacecraft's speed relative to the planet remains the same before and after the encounter. However, by approaching from behind the planet (relative to its orbit), the spacecraft gets 'dragged along' and exits with added velocity relative to the Sun. This energy comes from the planet's orbital momentum - though the planet slows down, the change is unmeasurably small due to its enormous mass."
    },
    {
      scenario: "The James Webb Space Telescope orbits the Sun at the L2 Lagrange point, about 1.5 million kilometers from Earth. At this location, it maintains a stable position relative to both Earth and the Sun without using much fuel.",
      question: "What makes Lagrange points special locations in a two-body gravitational system?",
      options: [
        { id: 'a', label: "They are points where gravity from both bodies cancels out completely, creating zero gravity" },
        { id: 'b', label: "They are points where the combined gravitational pull of both bodies and the centrifugal effect of orbiting allow an object to orbit the larger body with the same period as the smaller body", correct: true },
        { id: 'c', label: "They are points where solar wind pressure exactly balances gravitational attraction" },
        { id: 'd', label: "They are points where time dilation effects cancel out" }
      ],
      explanation: "At Lagrange points, the gravitational forces from two large bodies (like Earth and Sun) combine with the centrifugal effect of the orbital motion to create equilibrium positions. An object at L2 orbits the Sun at the same rate as Earth, despite being farther out, because Earth's gravity 'helps pull it along.' L1, L2, and L3 are unstable (requiring station-keeping), while L4 and L5 are stable."
    },
    {
      scenario: "The International Space Station experiences slight atmospheric drag even at 400 km altitude, causing it to lose about 2 km of altitude per month. Without periodic reboosts, it would eventually re-enter Earth's atmosphere.",
      question: "How does atmospheric drag affect a satellite's orbit over time?",
      options: [
        { id: 'a', label: "Drag slows the satellite, causing it to drop to a lower orbit where it actually speeds up, while the orbital period decreases", correct: true },
        { id: 'b', label: "Drag slows the satellite uniformly, keeping it in the same orbit but at lower speed" },
        { id: 'c', label: "Drag pushes the satellite to a higher orbit where there is less atmosphere" },
        { id: 'd', label: "Drag has no effect because there is no air in space" }
      ],
      explanation: "Atmospheric drag removes energy from the satellite, causing it to spiral inward to lower orbits. Counterintuitively, as the satellite drops, it speeds up because lower orbits require higher velocities. The orbital period also decreases as the satellite gets closer to Earth. This is why the ISS needs regular reboosts - it's slowly spiraling inward due to the thin upper atmosphere at its altitude."
    },
    {
      scenario: "When SpaceX's Crew Dragon approaches the ISS for docking, it must match the station's position, velocity, and orientation precisely. The approach takes several hours despite the spacecraft being capable of moving much faster.",
      question: "Why can't a spacecraft simply accelerate directly toward a target to catch up in orbit?",
      options: [
        { id: 'a', label: "Speeding up in orbit raises your altitude, potentially causing you to move away from a target in a lower orbit - orbital rendezvous requires careful phasing maneuvers", correct: true },
        { id: 'b', label: "Direct acceleration would create dangerous g-forces for the crew" },
        { id: 'c', label: "Fuel efficiency requires slow approaches at all times" },
        { id: 'd', label: "Space debris makes fast approaches too dangerous" }
      ],
      explanation: "Orbital mechanics is counterintuitive: if you thrust forward to speed up, you raise your orbit and actually end up moving away from a target below you. To catch up to a target ahead of you in the same orbit, you must first slow down (dropping to a lower, faster orbit), let yourself catch up, then raise your orbit again. This phasing process requires precise timing and multiple maneuvers, which is why rendezvous operations take hours."
    }
  ];

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Orbital Mechanics</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  PHASES.indexOf(phase) === i
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
