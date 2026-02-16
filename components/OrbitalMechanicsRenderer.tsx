'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Orbital Mechanics - Complete 10-Phase Game
// Understanding how satellites orbit by perpetually falling
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

interface OrbitalMechanicsRendererProps {
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
    scenario: "The International Space Station orbits Earth at about 400 km altitude, completing one orbit every 90 minutes. Despite being so close to Earth, astronauts inside experience weightlessness.",
    question: "Why does the ISS stay in orbit instead of falling to Earth?",
    options: [
      { id: 'a', label: "The ISS is above Earth's gravitational field where there is no gravity" },
      { id: 'b', label: "The ISS is falling toward Earth but moving sideways fast enough that it continuously misses the surface", correct: true },
      { id: 'c', label: "The ISS has thrusters that constantly fire to keep it from falling" },
      { id: 'd', label: "Earth's magnetic field repels the metallic structure of the station" }
    ],
    explanation: "The ISS is constantly falling toward Earth due to gravity, but it's also moving horizontally at about 7.66 km/s. This sideways motion means that as it falls, the Earth's surface curves away beneath it at the same rate."
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
    explanation: "At higher altitudes, gravity is weaker, so satellites need less speed to balance the reduced gravitational pull. The ISS at 400 km travels at 7.66 km/s, while geostationary satellites at 35,786 km orbit at only 3.07 km/s."
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
    explanation: "A geostationary orbit requires three precise conditions: 35,786 km altitude, orbit directly above the equator, and travel eastward. Only this combination allows the satellite to remain stationary relative to a point on Earth's surface."
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
    explanation: "A Hohmann transfer is an elliptical orbit that touches both the starting orbit and destination orbit. It requires only two burns and uses the minimum possible fuel for the transfer."
  },
  {
    scenario: "The Voyager 1 spacecraft, launched in 1977, is now over 24 billion kilometers from Earth and continuing to move away from the Sun. It will never return to the inner solar system.",
    question: "What must be true about Voyager 1's velocity for it to escape the Sun's gravitational influence?",
    options: [
      { id: 'a', label: "Its velocity must be exactly equal to the Sun's orbital velocity around the galaxy" },
      { id: 'b', label: "Its velocity must exceed the local escape velocity, meaning its kinetic energy exceeds the gravitational potential energy", correct: true },
      { id: 'c', label: "Its velocity must be zero relative to the cosmic microwave background" },
      { id: 'd', label: "Its velocity must be perpendicular to the Sun's gravity at all times" }
    ],
    explanation: "Escape velocity is the minimum speed needed for an object's kinetic energy to overcome gravitational potential energy. Once achieved, the spacecraft follows a hyperbolic trajectory and will never return."
  },
  {
    scenario: "GPS satellites orbit at approximately 20,200 km altitude and complete exactly two orbits per day. The Moon, much farther away at 384,400 km, takes about 27.3 days to complete one orbit around Earth.",
    question: "According to Kepler's Third Law, how does orbital period (T) relate to orbital radius (r)?",
    options: [
      { id: 'a', label: "T is directly proportional to r (double the radius means double the period)" },
      { id: 'b', label: "T squared is proportional to r cubed (T^2 is proportional to r^3)", correct: true },
      { id: 'c', label: "T is inversely proportional to r (higher orbits are faster)" },
      { id: 'd', label: "T squared is proportional to r squared" }
    ],
    explanation: "Kepler's Third Law states that T^2 is proportional to r^3. This means if you double the orbital radius, the period increases by a factor of about 2.83."
  },
  {
    scenario: "The Voyager 2 spacecraft used gravity assists from Jupiter, Saturn, Uranus, and Neptune to reach speeds that would have been impossible with its rocket fuel alone.",
    question: "How does a gravity assist increase a spacecraft's speed relative to the Sun?",
    options: [
      { id: 'a', label: "The planet's gravity accelerates the spacecraft, adding energy from nowhere" },
      { id: 'b', label: "The spacecraft steals a tiny amount of the planet's orbital momentum, gaining velocity relative to the Sun", correct: true },
      { id: 'c', label: "The spacecraft's engines fire more efficiently in the planet's gravitational field" },
      { id: 'd', label: "The planet's magnetic field accelerates charged particles in the spacecraft" }
    ],
    explanation: "In a gravity assist, the spacecraft's speed relative to the planet stays the same, but by approaching from behind the planet, it gets 'dragged along' and exits with added velocity relative to the Sun."
  },
  {
    scenario: "The James Webb Space Telescope orbits the Sun at the L2 Lagrange point, about 1.5 million kilometers from Earth. At this location, it maintains a stable position relative to both Earth and the Sun.",
    question: "What makes Lagrange points special locations in a two-body gravitational system?",
    options: [
      { id: 'a', label: "They are points where gravity from both bodies cancels out completely, creating zero gravity" },
      { id: 'b', label: "They are points where gravitational pull and centrifugal effect allow an object to orbit with the same period as the smaller body", correct: true },
      { id: 'c', label: "They are points where solar wind pressure exactly balances gravitational attraction" },
      { id: 'd', label: "They are points where time dilation effects cancel out" }
    ],
    explanation: "At Lagrange points, gravitational forces from two large bodies combine with centrifugal effect to create equilibrium positions. An object at L2 orbits the Sun at the same rate as Earth."
  },
  {
    scenario: "The International Space Station experiences slight atmospheric drag even at 400 km altitude, causing it to lose about 2 km of altitude per month. Without periodic reboosts, it would eventually re-enter.",
    question: "How does atmospheric drag affect a satellite's orbit over time?",
    options: [
      { id: 'a', label: "Drag slows the satellite, causing it to drop to a lower orbit where it actually speeds up", correct: true },
      { id: 'b', label: "Drag slows the satellite uniformly, keeping it in the same orbit but at lower speed" },
      { id: 'c', label: "Drag pushes the satellite to a higher orbit where there is less atmosphere" },
      { id: 'd', label: "Drag has no effect because there is no air in space" }
    ],
    explanation: "Atmospheric drag removes energy, causing the satellite to spiral inward to lower orbits. Counterintuitively, as the satellite drops, it speeds up because lower orbits require higher velocities."
  },
  {
    scenario: "When SpaceX's Crew Dragon approaches the ISS for docking, it must match the station's position, velocity, and orientation precisely. The approach takes several hours despite the spacecraft being capable of moving much faster.",
    question: "Why can't a spacecraft simply accelerate directly toward a target to catch up in orbit?",
    options: [
      { id: 'a', label: "Speeding up in orbit raises your altitude, potentially causing you to move away from a target in a lower orbit", correct: true },
      { id: 'b', label: "Direct acceleration would create dangerous g-forces for the crew" },
      { id: 'c', label: "Fuel efficiency requires slow approaches at all times" },
      { id: 'd', label: "Space debris makes fast approaches too dangerous" }
    ],
    explanation: "If you thrust forward to speed up, you raise your orbit and end up moving away from a target below you. Catching up requires slowing down first to drop to a faster, lower orbit."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🛰️',
    title: 'International Space Station',
    short: 'Continuous crewed presence in low Earth orbit',
    tagline: "Humanity's outpost in space",
    description: 'The ISS orbits at 400 km altitude, completing one orbit every 90 minutes at 7.7 km/s. It demonstrates orbital mechanics principles daily as it requires periodic reboosts to counteract atmospheric drag.',
    connection: 'The ISS is in constant free fall around Earth, demonstrating that orbiting is "falling while moving sideways fast enough to keep missing the ground."',
    howItWorks: 'The station maintains altitude through periodic engine burns from visiting spacecraft. Crew members experience microgravity because they fall at the same rate as their spacecraft.',
    stats: [
      { value: '400 km', label: 'Altitude', icon: '📏' },
      { value: '90 min', label: 'Per orbit', icon: '⏱️' },
      { value: '7.7 km/s', label: 'Velocity', icon: '🚀' }
    ],
    examples: ['Crew rotation missions', 'Science experiments', 'Spacewalks', 'Commercial cargo deliveries'],
    companies: ['NASA', 'Roscosmos', 'ESA', 'SpaceX'],
    futureImpact: 'Commercial space stations like Axiom and Orbital Reef will continue demonstrating orbital mechanics while expanding human presence in space.',
    color: '#3B82F6'
  },
  {
    icon: '🌍',
    title: 'Geostationary Satellites',
    short: 'Stationary orbit for communications and weather',
    tagline: 'Hovering 35,786 km above Earth',
    description: 'Geostationary satellites orbit at exactly 35,786 km altitude where their 24-hour orbital period matches Earth rotation. They appear stationary above a single point on the equator.',
    connection: "At this specific altitude, orbital velocity of 3.07 km/s creates a 24-hour period. Kepler's Third Law (T^2 proportional to r^3) determines this unique altitude.",
    howItWorks: 'Weather satellites like GOES provide continuous coverage of hemispheres. Communication satellites relay signals without tracking antennas needed on the ground.',
    stats: [
      { value: '35,786 km', label: 'Altitude', icon: '📏' },
      { value: '24 hr', label: 'Period', icon: '⏱️' },
      { value: '3.07 km/s', label: 'Velocity', icon: '🌐' }
    ],
    examples: ['GOES weather satellites', 'DirecTV broadcasting', 'GPS ground control', 'International communications'],
    companies: ['Boeing', 'Lockheed Martin', 'Airbus', 'Intelsat'],
    futureImpact: 'Next-generation GEO satellites will provide higher bandwidth and more precise Earth observation for climate monitoring.',
    color: '#10B981'
  },
  {
    icon: '🚀',
    title: 'Interplanetary Missions',
    short: 'Hohmann transfers minimize fuel for planet travel',
    tagline: 'Reaching other worlds efficiently',
    description: 'Spacecraft traveling to Mars use Hohmann transfer orbits that touch departure and arrival planet orbits. These trajectories minimize fuel consumption for interplanetary travel.',
    connection: "The transfer orbit is an ellipse with perihelion at Earth's orbit and aphelion at the destination, demonstrating Kepler's laws on an interplanetary scale.",
    howItWorks: 'Spacecraft launch during specific windows when planetary alignment allows efficient transfers. The journey to Mars takes about 7 months along an elliptical path around the Sun.',
    stats: [
      { value: '7 months', label: 'To Mars', icon: '🔴' },
      { value: '55M km', label: 'Minimum distance', icon: '📏' },
      { value: '2.5 km/s', label: 'Delta-v needed', icon: '⚡' }
    ],
    examples: ['Mars rover missions', 'Venus flybys', 'Jupiter exploration', 'Voyager interstellar missions'],
    companies: ['NASA JPL', 'ESA', 'JAXA', 'SpaceX'],
    futureImpact: 'Starship and nuclear thermal propulsion will reduce transit times while orbital mechanics principles remain fundamental to mission planning.',
    color: '#EF4444'
  },
  {
    icon: '⭐',
    title: 'Gravity Assists',
    short: 'Planetary flybys change spacecraft velocity',
    tagline: 'Borrowing momentum from planets',
    description: 'Spacecraft can use planetary gravity to change velocity without using fuel. This gravity assist has enabled missions to the outer solar system that would otherwise be impossible.',
    connection: 'The spacecraft gains velocity relative to the Sun while losing velocity relative to the planet, conserving momentum in the planet-spacecraft system.',
    howItWorks: "By approaching a planet from behind its orbital motion, spacecraft 'steal' a small amount of the planet's orbital momentum. The planet slows imperceptibly while the spacecraft accelerates significantly.",
    stats: [
      { value: '14 km/s', label: 'Max gain', icon: '⚡' },
      { value: '4 assists', label: 'Cassini used', icon: '🪐' },
      { value: '45+ yrs', label: 'Voyager mission', icon: '📡' }
    ],
    examples: ['Voyager grand tour', 'Cassini Saturn mission', 'New Horizons Pluto flyby', 'Parker Solar Probe'],
    companies: ['NASA', 'ESA', 'APL', 'Lockheed Martin'],
    futureImpact: 'Advanced trajectory planning using multiple gravity assists will enable faster, more capable missions throughout the solar system.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const OrbitalMechanicsRenderer: React.FC<OrbitalMechanicsRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [launchSpeed, setLaunchSpeed] = useState(5); // km/s scale
  const [isLaunched, setIsLaunched] = useState(false);
  const [projectilePos, setProjectilePos] = useState({ x: 0, y: 0 });
  const [projectileVel, setProjectileVel] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [outcome, setOutcome] = useState<'none' | 'crash' | 'orbit' | 'escape'>('none');

  // Twist state - ISS simulation
  const [issAngle, setIssAngle] = useState(0);
  const [gravityStrength, setGravityStrength] = useState(100); // percentage

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

  // Earth constants
  const EARTH_RADIUS = 80;
  const EARTH_CENTER = { x: 200, y: 300 };

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

        const g = 300 / (dist * dist);
        const ax = (dx / dist) * g;
        const ay = (dy / dist) * g;

        const newVx = projectileVel.x + ax;
        const newVy = projectileVel.y + ay;
        setProjectileVel({ x: newVx, y: newVy });

        const newX = pos.x + newVx;
        const newY = pos.y + newVy;

        if (trail.length > 50 && Math.abs(newX - trail[0].x) < 20 && Math.abs(newY - trail[0].y) < 20) {
          setOutcome('orbit');
        }

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
      setGravityStrength(100);
    }
  }, [phase]);

  const launchProjectile = () => {
    const startX = EARTH_CENTER.x;
    const startY = EARTH_CENTER.y - EARTH_RADIUS - 10;
    setProjectilePos({ x: startX, y: startY });
    setProjectileVel({ x: launchSpeed * 3, y: 0 });
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

  // Premium design colors - brighter for better contrast
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1', // slate-300 - bright enough for contrast (brightness ~210)
    textMuted: '#94a3b8', // slate-400 - secondary muted (brightness ~170)
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
        gameType: 'orbital-mechanics',
        gameTitle: 'Orbital Mechanics',
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
        background: `linear-gradient(90deg, ${colors.accent}, #8B5CF6)`,
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
    background: `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`,
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

  // Cannon Scene Visualization
  const renderCannonScene = () => {
    return (
      <svg viewBox="0 0 400 350" style={{ width: '100%', maxHeight: '300px', background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="earthGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="45%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>
          <radialGradient id="projectileGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
          <linearGradient id="trailOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="trailCrash" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="trailEscape" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0.5" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Space background */}
        <rect width="400" height="350" fill="#030712" />

        {/* Stars */}
        {[...Array(40)].map((_, i) => (
          <circle
            key={`star-${i}`}
            cx={(i * 37 + i * i * 3) % 400}
            cy={(i * 23 + i * 7) % 180}
            r={0.5 + (i % 4) * 0.4}
            fill="white"
            opacity={0.3 + (i % 5) * 0.15}
          />
        ))}

        {/* Orbital altitude reference grid lines */}
        <circle cx={EARTH_CENTER.x} cy={EARTH_CENTER.y} r={EARTH_RADIUS + 60} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />
        <circle cx={EARTH_CENTER.x} cy={EARTH_CENTER.y} r={EARTH_RADIUS + 120} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6,4" opacity="0.3" />
        {/* Tick marks for altitude reference */}
        <line x1={EARTH_CENTER.x} y1={EARTH_CENTER.y - EARTH_RADIUS - 55} x2={EARTH_CENTER.x} y2={EARTH_CENTER.y - EARTH_RADIUS - 65} stroke="#64748b" strokeWidth="1" opacity="0.6" />
        <line x1={EARTH_CENTER.x} y1={EARTH_CENTER.y - EARTH_RADIUS - 115} x2={EARTH_CENTER.x} y2={EARTH_CENTER.y - EARTH_RADIUS - 125} stroke="#64748b" strokeWidth="1" opacity="0.6" />

        {/* Earth atmosphere glow */}
        <circle cx={EARTH_CENTER.x} cy={EARTH_CENTER.y} r={EARTH_RADIUS + 8} fill="none" stroke="#60a5fa" strokeWidth="6" opacity="0.3" />

        {/* Earth */}
        <circle cx={EARTH_CENTER.x} cy={EARTH_CENTER.y} r={EARTH_RADIUS} fill="url(#earthGrad)" />

        {/* Continents */}
        <ellipse cx={EARTH_CENTER.x - 15} cy={EARTH_CENTER.y - 20} rx={25} ry={20} fill="#22c55e" opacity="0.3" />
        <ellipse cx={EARTH_CENTER.x + 25} cy={EARTH_CENTER.y + 10} rx={18} ry={22} fill="#22c55e" opacity="0.3" />

        {/* Mountain */}
        <polygon
          points={`${EARTH_CENTER.x - 20},${EARTH_CENTER.y - EARTH_RADIUS + 2} ${EARTH_CENTER.x},${EARTH_CENTER.y - EARTH_RADIUS - 18} ${EARTH_CENTER.x + 20},${EARTH_CENTER.y - EARTH_RADIUS + 2}`}
          fill="#6b7280"
        />

        {/* Cannon */}
        <rect x={EARTH_CENTER.x} y={EARTH_CENTER.y - EARTH_RADIUS - 20} width="35" height="10" rx="3" fill="#475569" />

        {/* Trajectory trail */}
        {trail.length > 1 && (
          <path
            d={`M ${trail[0].x} ${trail[0].y} ${trail.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
            fill="none"
            stroke={outcome === 'orbit' ? 'url(#trailOrbit)' : outcome === 'crash' ? 'url(#trailCrash)' : 'url(#trailEscape)'}
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Projectile */}
        {isLaunched && outcome === 'none' && (
          <circle cx={projectilePos.x} cy={projectilePos.y} r={6} fill="url(#projectileGrad)" filter="url(#glow)" />
        )}

        {/* Velocity indicator (before launch) */}
        {!isLaunched && (
          <g>
            <line
              x1={EARTH_CENTER.x + 38}
              y1={EARTH_CENTER.y - EARTH_RADIUS - 15}
              x2={EARTH_CENTER.x + 38 + launchSpeed * 5}
              y2={EARTH_CENTER.y - EARTH_RADIUS - 15}
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <text
              x={EARTH_CENTER.x + 40 + launchSpeed * 2.5}
              y={EARTH_CENTER.y - EARTH_RADIUS - 25}
              textAnchor="middle"
              fill="#4ade80"
              fontSize="12"
              fontWeight="600"
            >
              v = {launchSpeed} km/s
            </text>
          </g>
        )}

        {/* Outcome messages */}
        {outcome === 'crash' && (
          <text x="200" y="30" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="bold">
            Crashed - Not enough horizontal speed
          </text>
        )}
        {outcome === 'orbit' && (
          <text x="200" y="30" textAnchor="middle" fill="#4ade80" fontSize="14" fontWeight="bold">
            Orbit achieved - Falling around Earth!
          </text>
        )}
        {outcome === 'escape' && (
          <text x="200" y="30" textAnchor="middle" fill="#c084fc" fontSize="14" fontWeight="bold">
            Escape velocity - Left Earth's gravity!
          </text>
        )}

        {/* Labels for key elements */}
        <text x={EARTH_CENTER.x} y={EARTH_CENTER.y + EARTH_RADIUS + 20} textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>
        <text x={EARTH_CENTER.x + 20} y={EARTH_CENTER.y - EARTH_RADIUS - 45} textAnchor="start" fill="#9ca3af" fontSize="10">Cannon</text>
        <text x={EARTH_CENTER.x - 55} y={EARTH_CENTER.y - EARTH_RADIUS + 5} textAnchor="end" fill="#9ca3af" fontSize="10">Mountain</text>

        {/* Legend */}
        <g transform="translate(10, 10)">
          <text x="0" y="12" fill="#9ca3af" fontSize="10" fontWeight="600">Legend:</text>
          <line x1="0" y1="22" x2="20" y2="22" stroke="#22c55e" strokeWidth="3" />
          <text x="25" y="26" fill="#22c55e" fontSize="9">Orbit (~8 km/s)</text>
          <line x1="0" y1="36" x2="20" y2="36" stroke="#ef4444" strokeWidth="3" />
          <text x="25" y="40" fill="#ef4444" fontSize="9">Crash (too slow)</text>
          <line x1="0" y1="50" x2="20" y2="50" stroke="#8B5CF6" strokeWidth="3" />
          <text x="25" y="54" fill="#8B5CF6" fontSize="9">Escape (11+ km/s)</text>
        </g>

        <text x="200" y="340" textAnchor="middle" fill="#9ca3af" fontSize="12">
          Newton's Cannonball: What speed makes it orbit?
        </text>
      </svg>
    );
  };

  // ISS Scene Visualization
  const renderISSScene = () => {
    const issX = EARTH_CENTER.x + Math.cos(issAngle) * 120;
    const issY = 200 + Math.sin(issAngle) * 40;

    return (
      <svg viewBox="0 0 400 280" style={{ width: '100%', maxHeight: '240px', background: colors.bgCard, borderRadius: '12px' }}>
        {/* Space background */}
        <rect width="400" height="280" fill="#020617" />

        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <circle
            key={`iss-star-${i}`}
            cx={(i * 31 + i * i * 2) % 400}
            cy={(i * 17 + i * 5) % 180}
            r={0.4 + (i % 5) * 0.3}
            fill="white"
            opacity={0.2 + (i % 6) * 0.12}
          />
        ))}

        {/* Earth (partial view from orbit) */}
        <ellipse cx={200} cy={360} rx={180} ry={160} fill="#2563eb" />
        <ellipse cx={200} cy={360} rx={182} ry={162} fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.4" />

        {/* Cloud patterns */}
        <ellipse cx={150} cy={250} rx={40} ry={15} fill="#ffffff" opacity="0.15" />
        <ellipse cx={250} cy={270} rx={30} ry={12} fill="#ffffff" opacity="0.12" />

        {/* Orbital path */}
        <ellipse cx={200} cy={200} rx={120} ry={40} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4" opacity="0.4" />

        {/* ISS */}
        <g transform={`translate(${issX}, ${issY})`}>
          {/* Solar panels */}
          <rect x="-28" y="-4" width="22" height="8" fill="#fbbf24" rx="1" />
          <rect x="6" y="-4" width="22" height="8" fill="#fbbf24" rx="1" />
          {/* Main truss */}
          <rect x="-30" y="-2" width="60" height="4" fill="#cbd5e1" rx="1" />
          {/* Central module */}
          <rect x="-10" y="-7" width="20" height="14" fill="#94a3b8" rx="3" />
        </g>

        {/* Gravity vector - scales with gravityStrength */}
        <g transform={`translate(${issX}, ${issY + 18})`}>
          <line x1="0" y1="0" x2="0" y2={gravityStrength * 0.35} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity={gravityStrength / 100} />
          <polygon points={`-5,${gravityStrength * 0.3} 5,${gravityStrength * 0.3} 0,${gravityStrength * 0.4}`} fill="#ef4444" opacity={gravityStrength / 100} />
          <text x="15" y="20" fill="#f87171" fontSize="11" fontWeight="600">{gravityStrength}% Gravity</text>
        </g>

        {/* Velocity vector */}
        <g transform={`translate(${issX}, ${issY})`}>
          <line
            x1="0" y1="0"
            x2={Math.cos(issAngle + Math.PI / 2) * 35}
            y2={Math.sin(issAngle + Math.PI / 2) * 12}
            stroke="#22c55e" strokeWidth="3" strokeLinecap="round"
          />
          <text x={Math.cos(issAngle + Math.PI / 2) * 45} y={Math.sin(issAngle + Math.PI / 2) * 15} fill="#4ade80" fontSize="11" fontWeight="600">Velocity</text>
        </g>

        {/* Info panels */}
        <g transform="translate(20, 20)">
          <rect width="120" height="50" rx="8" fill="#1e293b" opacity="0.9" />
          <text x="10" y="18" fill="#94a3b8" fontSize="11" fontWeight="600">ISS Status</text>
          <text x="10" y="34" fill="#22d3ee" fontSize="10">Altitude: 408 km</text>
          <text x="10" y="46" fill="#fbbf24" fontSize="10">Speed: 7.66 km/s</text>
        </g>

        <g transform="translate(270, 20)">
          <rect width="110" height="50" rx="8" fill="#1e293b" opacity="0.9" />
          <text x="10" y="18" fill="#94a3b8" fontSize="11" fontWeight="600">Inside ISS</text>
          <text x="55" y="38" textAnchor="middle" fontSize="18">&#x1F9D1;&#x200D;&#x1F680;</text>
          <text x="55" y="48" textAnchor="middle" fill="#a78bfa" fontSize="9">Free falling!</text>
        </g>

        <text x="200" y="268" textAnchor="middle" fill="#64748b" fontSize="10">
          ISS falls toward Earth at 7.66 km/s - but misses because it's moving sideways!
        </text>
      </svg>
    );
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'float 3s ease-in-out infinite',
        }}>
          &#x1F6F0;&#xFE0F;&#x1F30D;
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Falling Satellite Paradox
        </h1>

        <p className="text-secondary" style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "The International Space Station is <span style={{ color: colors.accent }}>falling toward Earth</span> at 28,000 km/h! So why doesn't it crash? And if it's falling, why do astronauts <span style={{ color: '#8B5CF6' }}>float</span>?"
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
            "What goes up must come down - unless it's going fast enough sideways to keep missing the ground."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Newton's Cannonball Thought Experiment
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Discovery
        </button>

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // Static prediction diagram SVG
  const renderPredictDiagram = () => {
    return (
      <svg viewBox="0 0 400 300" style={{ width: '100%', maxHeight: '250px', background: colors.bgCard, borderRadius: '12px' }}>
        {/* Space background */}
        <rect width="400" height="300" fill="#030712" />

        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <circle
            key={`pred-star-${i}`}
            cx={(i * 37 + i * i * 3) % 400}
            cy={(i * 23 + i * 7) % 150}
            r={0.5 + (i % 3) * 0.3}
            fill="white"
            opacity={0.3 + (i % 4) * 0.15}
          />
        ))}

        {/* Earth */}
        <circle cx="200" cy="250" r="70" fill="#2563eb" />
        <circle cx="200" cy="250" r="72" fill="none" stroke="#60a5fa" strokeWidth="3" opacity="0.3" />

        {/* Mountain */}
        <polygon points="180,180 200,150 220,180" fill="#6b7280" />

        {/* Cannon */}
        <rect x="200" y="145" width="30" height="8" rx="2" fill="#475569" />

        {/* Projectile with question mark */}
        <circle cx="260" cy="149" r="8" fill="#f59e0b" opacity="0.6" />
        <text x="260" y="154" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>

        {/* Possible trajectories (dashed) */}
        <path d="M 235 149 Q 280 100 320 80" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
        <path d="M 235 149 Q 270 149 300 180" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
        <path d="M 235 149 Q 300 120 350 149 Q 300 180 250 200" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />

        {/* Labels */}
        <text x="200" y="290" textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>
        <text x="200" y="140" textAnchor="middle" fill="#9ca3af" fontSize="10">Cannon</text>
        <text x="330" y="75" textAnchor="start" fill="#22c55e" fontSize="10">Escape?</text>
        <text x="310" y="185" textAnchor="start" fill="#ef4444" fontSize="10">Crash?</text>
        <text x="355" y="155" textAnchor="start" fill="#8B5CF6" fontSize="10">Orbit?</text>

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#9ca3af" fontSize="12">
          What determines the cannonball's fate?
        </text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Horizontal speed - fast enough to "fall around" Earth\'s curve', correct: true },
      { id: 'b', text: 'Firing angle - must aim slightly upward to stay in space' },
      { id: 'c', text: 'Mass of the cannonball - heavier objects orbit better' },
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
              &#x1F914; Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You fire a cannonball horizontally from a very tall mountain. What determines if it orbits Earth?
          </h2>

          {/* SVG diagram showing the prediction scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            {renderPredictDiagram()}
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

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => { playSound('click'); goToPhase('hook'); }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              &#x2190; Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, flex: 2 }}
              >
                Test My Prediction
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Orbital Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Newton's Cannonball
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust the launch speed to see what happens.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderCannonScene()}
            </div>

            {/* Launch speed slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Launch Speed</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{launchSpeed} km/s</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={launchSpeed}
                onChange={(e) => setLaunchSpeed(parseFloat(e.target.value))}
                disabled={isLaunched}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: isLaunched ? 'not-allowed' : 'pointer',
                  accentColor: colors.accent,
                  background: colors.bgSecondary,
                  touchAction: 'pan-y',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>2 km/s (falls)</span>
                <span style={{ ...typo.small, color: colors.success }}>~8 km/s (orbit)</span>
                <span style={{ ...typo.small, color: '#8B5CF6' }}>11+ km/s (escape)</span>
              </div>
            </div>

            {/* Launch/Reset button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  if (isLaunched) {
                    resetLaunch();
                  } else {
                    launchProjectile();
                  }
                }}
                style={{
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isLaunched ? colors.border : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {isLaunched ? '&#x1F504; Reset' : '&#x1F680; Fire Cannon!'}
              </button>
            </div>

            {/* Key insight */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Key Insight:</strong> The cannonball always falls toward Earth. But if it is moving fast enough sideways, Earth's surface curves away beneath it at the same rate!
              </p>
            </div>

            {/* Cause-effect explanation */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>What to Watch:</strong> When you increase the launch speed, the cannonball travels farther before falling back. This is important because it demonstrates the relationship between velocity and orbit.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.warning }}>Real-World Application:</strong> This principle is used by engineers to design satellite orbits. Understanding orbital velocity helps us place communication satellites and space stations at the right altitude.
              </p>
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
            Orbiting = Falling + Missing
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Key Insight:</strong> A satellite is constantly falling toward Earth, but it's also moving sideways so fast that it keeps missing!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>1</div>
                  <span>Gravity constantly pulls the satellite toward Earth's center</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>2</div>
                  <span>Horizontal velocity keeps it moving sideways (no air resistance in space)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>3</div>
                  <span>At ~7.9 km/s, the fall rate matches Earth's curvature - perpetual orbit!</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Orbital Velocity Formula
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px', fontFamily: 'monospace' }}>
              v = sqrt(GM/r)
            </p>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>At Earth's surface: ~7.9 km/s needed</li>
              <li>Higher altitude = weaker gravity = slower speed needed</li>
              <li>ISS at 400 km: 7.66 km/s</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Your prediction: <span style={{ color: prediction === 'a' ? colors.success : colors.error, fontWeight: 600 }}>{prediction === 'a' ? '&#x2713; Correct!' : '&#x2717; Not quite'}</span>
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            But Wait... &#x2192;
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // Twist predict diagram SVG
  const renderTwistPredictDiagram = () => {
    return (
      <svg viewBox="0 0 400 250" style={{ width: '100%', maxHeight: '220px', background: colors.bgCard, borderRadius: '12px' }}>
        {/* Space background */}
        <rect width="400" height="250" fill="#020617" />

        {/* Stars */}
        {[...Array(35)].map((_, i) => (
          <circle
            key={`twist-star-${i}`}
            cx={(i * 29 + i * i * 2) % 400}
            cy={(i * 19 + i * 5) % 150}
            r={0.4 + (i % 4) * 0.25}
            fill="white"
            opacity={0.25 + (i % 5) * 0.1}
          />
        ))}

        {/* Earth (partial view) */}
        <ellipse cx="200" cy="320" rx="160" ry="140" fill="#2563eb" />
        <ellipse cx="200" cy="320" rx="162" ry="142" fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.3" />

        {/* ISS */}
        <g transform="translate(200, 100)">
          {/* Solar panels */}
          <rect x="-30" y="-5" width="24" height="10" fill="#fbbf24" rx="1" />
          <rect x="6" y="-5" width="24" height="10" fill="#fbbf24" rx="1" />
          {/* Main truss */}
          <rect x="-32" y="-3" width="64" height="6" fill="#cbd5e1" rx="1" />
          {/* Central module */}
          <rect x="-12" y="-8" width="24" height="16" fill="#94a3b8" rx="3" />
        </g>

        {/* Astronaut inside (floating) */}
        <text x="200" y="100" textAnchor="middle" fontSize="20">&#x1F9D1;&#x200D;&#x1F680;</text>

        {/* Gravity arrow pointing down */}
        <line x1="200" y1="125" x2="200" y2="165" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <polygon points="195,160 205,160 200,175" fill="#ef4444" />
        <text x="220" y="155" fill="#f87171" fontSize="11" fontWeight="600">Gravity: 8.7 m/s^2</text>

        {/* Question mark */}
        <circle cx="280" cy="95" r="18" fill="#f59e0b" opacity="0.2" />
        <text x="280" y="102" textAnchor="middle" fill="#f59e0b" fontSize="22" fontWeight="bold">?</text>

        {/* Labels */}
        <text x="200" y="30" textAnchor="middle" fill="#9ca3af" fontSize="12">
          ISS at 400 km - Gravity still 90% of surface!
        </text>
        <text x="200" y="230" textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>
        <text x="100" y="100" textAnchor="middle" fill="#fbbf24" fontSize="10">ISS</text>
        <text x="280" y="120" fill="#f59e0b" fontSize="10">Why do they float?</text>
      </svg>
    );
  };

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'They\'re in free fall WITH the station - everything falls together', correct: true },
      { id: 'b', text: 'There\'s no gravity in space - they\'re truly weightless' },
      { id: 'c', text: 'Centrifugal force cancels gravity exactly' },
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
              &#x1F504; The Twist: Microgravity
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Astronauts on the ISS "float" and experience "weightlessness." But gravity at 400 km is still 90% as strong as on Earth's surface! Why do they float?
          </h2>

          {/* SVG diagram showing the twist scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            {renderTwistPredictDiagram()}
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
              See Free Fall in Action
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
            Free Fall in Orbit
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch the ISS and astronaut fall together
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderISSScene()}
            </div>

            {/* Gravity strength slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Gravity at ISS altitude vs surface</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{gravityStrength}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={gravityStrength}
                onChange={(e) => setGravityStrength(parseInt(e.target.value))}
                style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', accentColor: colors.accent, background: colors.bgSecondary, touchAction: 'pan-y' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>0% (no gravity)</span>
                <span style={{ ...typo.small, color: colors.success }}>90% actual ISS gravity</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>8.7 m/s^2</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Gravity at ISS (400 km)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>9.8 m/s^2</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Gravity at surface</div>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.warning }}>The ISS AND astronauts are falling at the same rate!</strong><br />
              Since they accelerate together, there's no "floor pushing up" feeling. It's like being in a falling elevator - except it never hits bottom!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Microgravity
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
            "Microgravity" Not "Zero Gravity"
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#x2713;</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Gravity IS Present (90% of surface)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The ISS is still firmly in Earth's gravity well. Without gravity, it wouldn't orbit at all!
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#x2713;</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Free Fall Creates Apparent Weightlessness</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Same physics as skydiving before parachute opens - everything falls together, so there's no relative force between objects.
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#x2713;</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Tiny Residual Accelerations Exist</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Air drag, tidal effects, and vibrations create ~10^-6 g of acceleration. Hence "micro" gravity, not "zero" gravity.
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Your prediction: <span style={{ color: twistPrediction === 'a' ? colors.success : colors.error, fontWeight: 600 }}>{twistPrediction === 'a' ? '&#x2713; Correct!' : '&#x2717; Not quite'}</span>
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
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
    const completedCount = completedApps.filter(c => c).length;

    const handleGotIt = () => {
      playSound('click');
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);

      // Auto-advance to next uncompleted app
      if (selectedApp < realWorldApps.length - 1) {
        const nextUncompletedIndex = completedApps.findIndex((c, i) => !c && i > selectedApp);
        if (nextUncompletedIndex !== -1) {
          setSelectedApp(nextUncompletedIndex);
        } else if (!newCompleted.every(c => c)) {
          const firstUncompleted = newCompleted.findIndex(c => !c);
          if (firstUncompleted !== -1) {
            setSelectedApp(firstUncompleted);
          }
        }
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - {completedCount} of {realWorldApps.length} completed
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
                    &#x2713;
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
                How Orbital Mechanics Connects:
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
                  <div style={{ ...typo.small, color: colors.textSecondary }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for each app */}
            {!completedApps[selectedApp] ? (
              <button
                onClick={handleGotIt}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  background: `linear-gradient(135deg, ${app.color}, ${colors.accent})`,
                }}
              >
                Got It! Next App
              </button>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: `${colors.success}22`,
                borderRadius: '8px',
                color: colors.success,
                fontWeight: 600,
              }}>
                &#x2713; Completed
              </div>
            )}
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              opacity: allAppsCompleted ? 1 : 0.5,
              cursor: allAppsCompleted ? 'pointer' : 'not-allowed',
            }}
            disabled={!allAppsCompleted}
          >
            {allAppsCompleted ? 'Continue to Knowledge Test' : `Complete all ${realWorldApps.length} apps to continue`}
          </button>
        </div>
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
              {passed ? '&#x1F3C6;' : '&#x1F4DA;'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand orbital mechanics and satellite physics!'
                : 'Review the concepts and try again.'}
            </p>

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
                Review and Try Again
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
          &#x1F3C6;
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Orbital Mechanics Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how satellites orbit by perpetually falling around Earth.
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
              'Orbiting = falling toward Earth while moving sideways fast enough to miss',
              'Orbital velocity is ~7.9 km/s at Earth\'s surface',
              'Higher orbits require slower speeds (weaker gravity)',
              'Astronauts float due to free fall, not zero gravity',
              '"Microgravity" is more accurate than "zero gravity"',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>&#x2713;</span>
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default OrbitalMechanicsRenderer;
