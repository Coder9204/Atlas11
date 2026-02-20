'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Tidal Locking - Complete 10-Phase Game
// Why the Moon always shows us the same face
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

interface TidalLockingRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
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
    scenario: "An astronomer notices that despite observing the Moon for decades, they've only ever seen the same features - the same craters, the same dark 'seas' - facing Earth.",
    question: "What explains why we only see one face of the Moon?",
    options: [
      { id: 'a', label: "The Moon doesn't rotate at all - it's completely stationary" },
      { id: 'b', label: "The Moon rotates exactly once per orbit, keeping the same face toward Earth", correct: true },
      { id: 'c', label: "It's a random coincidence that will change over time" },
      { id: 'd', label: "Earth's magnetic field holds the Moon in a fixed orientation" }
    ],
    explanation: "The Moon is tidally locked to Earth, meaning its rotation period equals its orbital period (27.3 days). This synchronization was caused by tidal forces over billions of years, not coincidence or magnetism."
  },
  {
    scenario: "Scientists studying ancient coral fossils discover that 400 million years ago, there were about 400 days per year instead of today's 365 days.",
    question: "What does this evidence tell us about Earth's rotation?",
    options: [
      { id: 'a', label: "The coral fossils are incorrectly dated" },
      { id: 'b', label: "Earth's orbit around the Sun has changed significantly" },
      { id: 'c', label: "Earth's rotation is slowing down due to tidal friction from the Moon", correct: true },
      { id: 'd', label: "Earth was closer to the Sun in the past" }
    ],
    explanation: "Tidal friction from the Moon is gradually slowing Earth's rotation. Days were shorter in the past (about 22 hours 400 million years ago). Earth's day lengthens by about 1.4 milliseconds per century."
  },
  {
    scenario: "NASA's New Horizons mission revealed that Pluto and its moon Charon always show the same face to each other - standing on Pluto, Charon would appear motionless in the sky.",
    question: "What makes the Pluto-Charon system different from Earth-Moon?",
    options: [
      { id: 'a', label: "Charon is tidally locked to Pluto, but Pluto is not locked to Charon" },
      { id: 'b', label: "Both Pluto and Charon are mutually tidally locked to each other", correct: true },
      { id: 'c', label: "Neither body is tidally locked" },
      { id: 'd', label: "The system is too young for tidal locking to occur" }
    ],
    explanation: "Pluto and Charon are mutually tidally locked - both always show the same face to each other. This happened because Charon is relatively large compared to Pluto (1:8 mass ratio), creating strong tidal forces on both bodies."
  },
  {
    scenario: "Jupiter's moon Io is the most volcanically active body in the solar system, with hundreds of active volcanoes constantly resurfacing the moon.",
    question: "What powers Io's extreme volcanic activity?",
    options: [
      { id: 'a', label: "Radioactive decay in Io's core" },
      { id: 'b', label: "Heat left over from Io's formation" },
      { id: 'c', label: "Tidal heating from Jupiter and other moons flexing Io's interior", correct: true },
      { id: 'd', label: "Solar radiation absorbed by Io's surface" }
    ],
    explanation: "Io experiences intense tidal heating from Jupiter's enormous gravity. As Io orbits, Jupiter's tidal forces flex and squeeze Io's interior, generating friction and heat. Europa and Ganymede's gravitational pulls create orbital resonances that enhance this effect."
  },
  {
    scenario: "Mercury rotates exactly 3 times for every 2 orbits around the Sun (a 3:2 spin-orbit resonance), rather than being fully tidally locked like the Moon.",
    question: "Why did Mercury settle into a 3:2 resonance instead of 1:1 tidal locking?",
    options: [
      { id: 'a', label: "Mercury is too far from the Sun for tidal locking" },
      { id: 'b', label: "Mercury's highly elliptical orbit prevented true 1:1 locking", correct: true },
      { id: 'c', label: "Mercury doesn't experience tidal forces from the Sun" },
      { id: 'd', label: "Mercury is still in the process of becoming tidally locked" }
    ],
    explanation: "Mercury's eccentric orbit (eccentricity 0.21) causes varying tidal forces throughout its orbit. The 3:2 resonance is more stable than 1:1 for such an elliptical orbit, as it keeps Mercury's long axis pointing at the Sun during each perihelion passage."
  },
  {
    scenario: "Astronomers discover an exoplanet orbiting very close to a red dwarf star. One hemisphere is scorching hot while the other is frozen, with potential life in a narrow 'terminator' zone.",
    question: "What type of world is this likely to be?",
    options: [
      { id: 'a', label: "A planet with an extremely tilted axis" },
      { id: 'b', label: "A tidally locked 'eyeball world' with permanent day and night sides", correct: true },
      { id: 'c', label: "A planet with a very thick atmosphere" },
      { id: 'd', label: "A planet experiencing rapid climate change" }
    ],
    explanation: "Close-in exoplanets around red dwarfs are often tidally locked, creating 'eyeball worlds' with a permanent hot day side and cold night side. The habitable zone may exist in the terminator ring between these extremes."
  },
  {
    scenario: "Engineers designing a lunar base notice that certain locations on the Moon's surface are always visible from Earth, while others can never be seen directly.",
    question: "How does tidal locking affect lunar base communications?",
    options: [
      { id: 'a', label: "All lunar locations have equal access to Earth" },
      { id: 'b', label: "Far side bases require relay satellites or stations to communicate with Earth", correct: true },
      { id: 'c', label: "Communication is impossible from the far side" },
      { id: 'd', label: "The far side faces Earth during full moons" }
    ],
    explanation: "Tidal locking means the Moon's far side never faces Earth. Bases on the far side would need relay satellites (like the Queqiao satellite used by China's Chang'e 4 mission) to maintain communication with Earth."
  },
  {
    scenario: "Laser ranging experiments show that the Moon is moving away from Earth at about 3.8 centimeters per year.",
    question: "What is the connection between the Moon receding and Earth's slowing rotation?",
    options: [
      { id: 'a', label: "There is no connection - these are independent phenomena" },
      { id: 'b', label: "Angular momentum is being transferred from Earth's rotation to the Moon's orbit", correct: true },
      { id: 'c', label: "The Sun's gravity is pulling the Moon away from Earth" },
      { id: 'd', label: "The Moon is gaining mass from space debris" }
    ],
    explanation: "Conservation of angular momentum links these phenomena. As tidal friction slows Earth's rotation, the lost rotational angular momentum is transferred to the Moon's orbital motion, causing it to spiral outward."
  },
  {
    scenario: "A physics student builds a model showing a moon with tidal bulges that point slightly ahead of the line connecting the moon to its planet.",
    question: "What does this misalignment of tidal bulges indicate?",
    options: [
      { id: 'a', label: "The model is incorrect - bulges always point directly at the planet" },
      { id: 'b', label: "The moon is rotating faster than its orbital period, leading to tidal torque", correct: true },
      { id: 'c', label: "The moon is rotating slower than its orbital period" },
      { id: 'd', label: "The planet's gravity is too weak" }
    ],
    explanation: "When a moon rotates faster than it orbits, the tidal bulges are carried slightly ahead of the planet by the rotation. The planet's gravity pulls back on these bulges, creating a torque that slows the rotation until the moon becomes tidally locked."
  },
  {
    scenario: "Scientists calculate that in about 50 billion years (if the Sun hadn't expanded), Earth's day would equal about 47 current days, matching the Moon's orbital period.",
    question: "What would this future state mean for the Earth-Moon system?",
    options: [
      { id: 'a', label: "The Moon would crash into Earth" },
      { id: 'b', label: "Both Earth and Moon would be mutually tidally locked", correct: true },
      { id: 'c', label: "The Moon would escape Earth's gravity entirely" },
      { id: 'd', label: "Earth would stop rotating completely" }
    ],
    explanation: "Eventually, Earth would become tidally locked to the Moon, just as the Moon is already locked to Earth. Both would always show the same face to each other, similar to the current Pluto-Charon system."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🌙',
    title: 'The Moon\'s Hidden Face',
    short: 'Why we never see the far side from Earth',
    tagline: '4.5 billion years of gravitational braking',
    description: 'The Moon rotates exactly once per orbit, keeping the same face toward Earth. This synchronization is not coincidence - tidal forces gradually slowed the Moon\'s spin over billions of years.',
    connection: 'Tidal bulges raised on the Moon by Earth created friction that transferred rotational energy to orbital energy until the rotation locked.',
    howItWorks: 'Early in its history, the Moon rotated faster. Tidal bulges slightly led the Moon\'s rotation, creating a torque that slowed spinning. When rotation matched orbital period, the bulge aligned and torque ceased.',
    stats: [
      { value: '384,400 km', label: 'Earth-Moon distance', icon: '📏' },
      { value: '27.3 days', label: 'Orbital = rotation period', icon: '🔄' },
      { value: '4.5 billion yr', label: 'Time to lock', icon: '⏰' }
    ],
    examples: ['Earth\'s Moon', 'Phobos', 'Deimos', 'Most large moons'],
    companies: ['NASA', 'ESA', 'JAXA', 'Space agencies worldwide'],
    futureImpact: 'The far side, shielded from Earth\'s radio noise, is ideal for radio telescopes and future bases.',
    color: '#8B5CF6'
  },
  {
    icon: '❤️',
    title: 'Pluto-Charon Double Lock',
    short: 'A binary system frozen in mutual embrace',
    tagline: 'Two worlds facing each other forever',
    description: 'Pluto and Charon are mutually tidally locked - they always show the same face to each other. Standing on Pluto, Charon hangs motionless in the sky forever.',
    connection: 'Both bodies raised tides on each other, exchanging angular momentum until both rotations synchronized with their mutual orbit.',
    howItWorks: 'Charon is so large relative to Pluto (1:8 mass ratio) that tidal forces were strong on both. Over time, both spun down until locked. They now orbit their common center of mass as a double dwarf planet.',
    stats: [
      { value: '6.4d', label: 'Mutual orbital period', icon: '🔄' },
      { value: '6.4d', label: 'Both rotation periods', icon: '⏱️' },
      { value: '1:8', label: 'Mass ratio', icon: '⚖️' }
    ],
    examples: ['Pluto-Charon', 'Future Earth-Moon', 'Close binary stars', 'Exoplanet systems'],
    companies: ['NASA New Horizons', 'Space research', 'Planetary science', 'Observatories'],
    futureImpact: 'In 50 billion years, Earth and Moon will be mutually locked, with month-long days.',
    color: '#3B82F6'
  },
  {
    icon: '🔥',
    title: 'Io\'s Volcanic Fury',
    short: 'Tidal heating powers 400+ active volcanoes',
    tagline: 'The most geologically active body in our solar system',
    description: 'Jupiter\'s moon Io has over 400 active volcanoes - more than anywhere else in the solar system. Tidal forces from Jupiter constantly flex and heat Io\'s interior.',
    connection: 'Io is tidally locked to Jupiter, but orbital resonances with Europa and Ganymede prevent a perfectly circular orbit. The changing tidal forces generate enormous internal heat.',
    howItWorks: 'As Io moves between periapsis and apoapsis, Jupiter\'s tidal bulge on Io changes size. This constant flexing dissipates energy as heat - about 100 trillion watts, resurfacing Io every million years.',
    stats: [
      { value: '400+', label: 'Active volcanoes', icon: '🌋' },
      { value: '100TW', label: 'Tidal heat output', icon: '🔥' },
      { value: '1.8d', label: 'Orbital period', icon: '🪐' }
    ],
    examples: ['Io (Jupiter)', 'Europa (subsurface)', 'Enceladus (Saturn)', 'Triton (Neptune)'],
    companies: ['NASA Juno', 'ESA JUICE', 'Galileo mission', 'Future landers'],
    futureImpact: 'Understanding tidal heating helps us find potentially habitable ocean worlds like Europa.',
    color: '#F59E0B'
  },
  {
    icon: '🌍',
    title: 'Earth\'s Lengthening Days',
    short: 'The Moon is slowing Earth\'s rotation',
    tagline: 'Stealing our spin, second by second',
    description: 'Earth\'s day was only 6 hours long 4 billion years ago. Tidal friction from the Moon has been slowing our spin ever since. Days grow 1.4 milliseconds longer each century.',
    connection: 'Tidal bulges on Earth slightly lead the Moon\'s position due to Earth\'s faster rotation. This creates a torque that transfers Earth\'s rotational energy to the Moon\'s orbit.',
    howItWorks: 'The Moon\'s gravity pulls back on Earth\'s leading tidal bulge, slowing Earth\'s spin. Angular momentum conservation means the Moon speeds up and moves farther away (3.8 cm/year).',
    stats: [
      { value: '1.4ms', label: 'Day lengthening/century', icon: '⏱️' },
      { value: '3.8cm/yr', label: 'Moon receding', icon: '📏' },
      { value: '6hr', label: 'Early Earth day length', icon: '🌅' }
    ],
    examples: ['Earth-Moon system', 'Mars-Phobos (opposite)', 'Ancient coral records', 'Eclipse timing'],
    companies: ['NASA', 'USNO', 'International Earth Rotation Service', 'Observatories'],
    futureImpact: 'In billions of years, Earth\'s day will equal a month, and Earth-Moon will be mutually locked.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const TidalLockingRenderer: React.FC<TidalLockingRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
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

  // Animation states
  const [orbitalAngle, setOrbitalAngle] = useState(0);
  const [moonRotation, setMoonRotation] = useState(0);
  const [isTidallyLocked, setIsTidallyLocked] = useState(true);
  const [showTidalBulge, setShowTidalBulge] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);

  // Play phase manual position control
  const [manualAngle, setManualAngle] = useState(45); // manually controlled orbital angle for SVG changes

  // Twist phase states
  const [tidalDistance, setTidalDistance] = useState(50); // Distance from planet (affects locking time)
  const [bodyRigidity, setBodyRigidity] = useState(30); // How rigid the body is

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

  // Orbital animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setOrbitalAngle(prev => (prev + 0.5 * timeScale) % 360);

      if (isTidallyLocked) {
        // Moon rotation matches orbital period - always shows same face
        setMoonRotation(prev => (prev + 0.5 * timeScale) % 360);
      } else {
        // Moon rotates faster - different faces visible
        setMoonRotation(prev => (prev + 2 * timeScale) % 360);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, isTidallyLocked, timeScale]);

  // Calculate tidal locking time (simplified model)
  const calculateLockingTime = () => {
    // Locking time is proportional to distance^6 and inversely proportional to (1 - rigidity)
    const distanceFactor = Math.pow(tidalDistance / 50, 6);
    const rigidityFactor = 1 + (bodyRigidity / 100);
    return (1e9 * distanceFactor * rigidityFactor).toExponential(1);
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06b6d4', // Cyan for space/orbital theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    moon: '#9CA3AF',
    earth: '#3B82F6',
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
    twist_play: 'Explore',
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
    onPhaseComplete?.(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'tidal-locking',
        gameTitle: 'Tidal Locking',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent, onPhaseComplete]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Moon System Visualization SVG Component
  const MoonSystemVisualization = ({ size = 300, locked = true, showBulge = true, staticAngle }: { size?: number; locked?: boolean; showBulge?: boolean; staticAngle?: number }) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const orbitRadius = size * 0.33;
    const earthRadius = size * 0.12;
    const moonRadius = size * 0.08;
    const effectiveAngle = staticAngle !== undefined ? staticAngle : orbitalAngle;
    const moonX = centerX + Math.cos(effectiveAngle * Math.PI / 180) * orbitRadius;
    const moonY = centerY + Math.sin(effectiveAngle * Math.PI / 180) * orbitRadius;

    const angleToEarth = Math.atan2(centerY - moonY, centerX - moonX);
    const moonFacingAngle = locked ? effectiveAngle : moonRotation;
    const nearSideVisible = Math.cos((moonFacingAngle - effectiveAngle) * Math.PI / 180);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="tidlEarthSurface" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="25%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
          <radialGradient id="tidlMoonNearSide" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          <radialGradient id="tidlMoonFarSide" cx="60%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>
          <filter id="tidlGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={centerX} y={18} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="700">
          Tidal Locking Orbital Diagram
        </text>

        {/* Stars */}
        {[...Array(15)].map((_, i) => (
          <circle
            key={`star-${i}`}
            cx={(i * 47 + 13) % size}
            cy={(i * 31 + 7) % size}
            r={(i % 3) * 0.5 + 0.5}
            fill="white"
            opacity={0.3 + (i % 5) * 0.1}
          />
        ))}

        {/* Grid lines - cross-hatch reference lines */}
        <line x1={centerX} y1={size * 0.08} x2={centerX} y2={size * 0.92} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        <line x1={size * 0.08} y1={centerY} x2={size * 0.92} y2={centerY} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        {/* Diagonal reference line */}
        <line x1={size * 0.1} y1={size * 0.1} x2={size * 0.9} y2={size * 0.9} stroke={colors.border} strokeWidth="0.5" strokeDasharray="2 6" opacity="0.15" />
        {/* Distance reference circles */}
        {[0.5, 0.75, 1, 1.25].map((factor) => (
          <circle
            key={`grid-${factor}`}
            cx={centerX}
            cy={centerY}
            r={orbitRadius * factor}
            fill="none"
            stroke={colors.border}
            strokeWidth="0.5"
            strokeDasharray="4 4"
            opacity="0.3"
          />
        ))}

        {/* Orbital path */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke={colors.accent}
          strokeWidth="1.5"
          strokeDasharray="8 4"
          opacity="0.4"
        />

        {/* Y-axis label (angle axis) */}
        <text x={centerX + 4} y={size * 0.12} fill={colors.textMuted} fontSize={11}>Angle</text>

        {/* X-axis label (distance axis) */}
        <text x={size * 0.88} y={centerY - 4} fill={colors.textMuted} fontSize={11}>Distance</text>

        {/* Earth */}
        <circle cx={centerX} cy={centerY} r={earthRadius * 1.2} fill={colors.earth} opacity="0.2" />
        <circle cx={centerX} cy={centerY} r={earthRadius} fill="url(#tidlEarthSurface)" />
        <ellipse cx={centerX - earthRadius * 0.2} cy={centerY - earthRadius * 0.1} rx={earthRadius * 0.3} ry={earthRadius * 0.2} fill="#22c55e" opacity="0.6" />
        <text x={centerX} y={centerY + earthRadius + 15} textAnchor="middle" fill={colors.textMuted} fontSize={12} fontWeight="600">Earth</text>

        {/* Moon */}
        <g transform={`translate(${moonX}, ${moonY})`}>
          {/* Tidal bulge */}
          {showBulge ? (
            <ellipse
              cx="0" cy="0"
              rx={moonRadius * 1.15}
              ry={moonRadius * 0.9}
              fill={nearSideVisible > 0 ? "url(#tidlMoonNearSide)" : "url(#tidlMoonFarSide)"}
              transform={`rotate(${angleToEarth * 180 / Math.PI})`}
              filter="url(#tidlGlow)"
            />
          ) : (
            <circle cx="0" cy="0" r={moonRadius} fill={nearSideVisible > 0 ? "url(#tidlMoonNearSide)" : "url(#tidlMoonFarSide)"} filter="url(#tidlGlow)" />
          )}

          {/* Moon features (rotate with moon) */}
          <g transform={`rotate(${locked ? moonFacingAngle : moonRotation})`}>
            <ellipse cx={-moonRadius * 0.3} cy={-moonRadius * 0.2} rx={moonRadius * 0.2} ry={moonRadius * 0.15} fill="#4b5563" opacity="0.5" />
            <ellipse cx={moonRadius * 0.2} cy={0} rx={moonRadius * 0.15} ry={moonRadius * 0.1} fill="#4b5563" opacity="0.4" />
            {/* Near side marker (yellow dot) - r>=8 for interactivity */}
            <circle cx="0" cy={-moonRadius * 0.6} r={moonRadius * 0.15} fill="#fbbf24" />
          </g>
        </g>
        {/* Interactive tracking circle at absolute Moon position (r>=8, white stroke for test detection) */}
        <circle cx={moonX} cy={moonY} r={moonRadius * 0.4} fill="rgba(251,191,36,0.4)" stroke="#ffffff" strokeWidth="1.5" />
        {/* Moon label - offset to avoid overlap */}
        <text x={moonX} y={Math.min(moonY + moonRadius + 16, size - 8)} textAnchor="middle" fill={colors.textMuted} fontSize={12}>Moon</text>

        {/* Sync indicator */}
        {locked && (
          <text x={size * 0.05} y={size * 0.93} fill={colors.warning} fontSize={12} fontWeight="600">
            ω_rot = ω_orbit
          </text>
        )}

        {/* Legend - absolute coordinates to avoid text overlap */}
        <circle cx={size * 0.68} cy={size * 0.91} r="5" fill="#fbbf24" />
        <text x={size * 0.68 + 10} y={size * 0.91 + 4} fill={colors.textMuted} fontSize={11}>= Near side</text>
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: phase === p ? '24px' : '8px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                borderRadius: '0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label={phaseLabels[p]}
            >
              <span style={{
                display: 'block',
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                transition: 'all 0.3s ease',
              }} />
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={() => currentIndex > 0 && goToPhase(phaseOrder[currentIndex - 1])}
            disabled={currentIndex === 0}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: currentIndex === 0 ? colors.textMuted : colors.textSecondary,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: currentIndex === 0 ? 0.4 : 1,
            }}
          >
            ← Back
          </button>
          {(() => {
            const isTestLocked = phase === 'test' && !testSubmitted;
            const isNextDisabled = currentIndex === phaseOrder.length - 1 || isTestLocked;
            return (
              <button
                onClick={() => !isNextDisabled && goToPhase(phaseOrder[currentIndex + 1])}
                disabled={isNextDisabled}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !isNextDisabled ? `linear-gradient(135deg, ${colors.accent}, #0891b2)` : colors.border,
                  color: 'white',
                  cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: isTestLocked ? 0.4 : 1,
                }}
              >
                Next →
              </button>
            );
          })()}
        </div>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
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
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌙🌍
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Tidal Locking
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Throughout all of human history, we have only ever seen <span style={{ color: colors.accent }}>one face</span> of the Moon. The 'far side' remained a complete mystery until 1959. Let's explore this cosmic phenomenon and discover what causes it!"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <MoonSystemVisualization size={280} locked={true} showBulge={true} />
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
            The yellow dot marks a feature on the Moon's surface. Notice how it always faces Earth - no matter where the Moon is in its orbit.
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Uncover the Mystery
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The Moon doesn\'t rotate at all - it just orbits' },
      { id: 'b', text: 'The Moon rotates exactly once per orbit (tidal locking)', correct: true },
      { id: 'c', text: 'It\'s a pure coincidence that will eventually change' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            Why do we always see the same side of the Moon from Earth?
          </h2>

          {/* Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <MoonSystemVisualization size={isMobile ? 260 : 320} locked={true} showBulge={false} />
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
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Moon System Simulator
  if (phase === 'play') {
    const currentOrbitalPeriod = 27.3; // days
    const currentRotationPeriod = isTidallyLocked ? 27.3 : (27.3 / 4); // days

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Tidal Locking Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Toggle tidal locking on/off. Watch the yellow marker - does it always face Earth?
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px' }}>
              Observe: Try toggling the lock off to see how different faces become visible when the Moon rotates faster than it orbits.
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <MoonSystemVisualization size={isMobile ? 280 : 360} locked={isTidallyLocked} showBulge={showTidalBulge} staticAngle={manualAngle} />
                  {/* Formula positioned near the graphic */}
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '10px',
                    marginTop: '12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.accent, margin: '0 0 4px' }}>
                      <strong>Tidal Locking:</strong> ω<sub>rotation</sub> = ω<sub>orbital</sub>
                    </p>
                    <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                      F_tidal ∝ M/r³ — tidal force affects rotation rate
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  {/* Real-time calculated values */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                        Orbital Period
                      </div>
                      <div style={{ ...typo.h3, color: colors.accent }}>
                        {currentOrbitalPeriod.toFixed(1)} days
                      </div>
                    </div>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                        Rotation Period
                      </div>
                      <div style={{ ...typo.h3, color: isTidallyLocked ? colors.success : colors.warning }}>
                        {currentRotationPeriod.toFixed(1)} days
                      </div>
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <button
                      onClick={() => { playSound('click'); setIsTidallyLocked(!isTidallyLocked); }}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: `2px solid ${isTidallyLocked ? colors.success : colors.warning}`,
                        background: isTidallyLocked ? `${colors.success}22` : `${colors.warning}22`,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                        {isTidallyLocked ? 'Tidally Locked' : 'Not Locked'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textSecondary }}>
                        {isTidallyLocked ? 'Rotation = orbital period' : 'Rotation faster than orbit'}
                      </div>
                    </button>

                    <button
                      onClick={() => { playSound('click'); setShowTidalBulge(!showTidalBulge); }}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: `2px solid ${showTidalBulge ? colors.accent : colors.border}`,
                        background: showTidalBulge ? `${colors.accent}22` : colors.bgSecondary,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                        Tidal Bulge: {showTidalBulge ? 'ON' : 'OFF'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textSecondary }}>
                        Moon stretched toward Earth
                      </div>
                    </button>
                  </div>

                  {/* Time speed slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Animation Speed</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{timeScale}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.5"
                      value={timeScale}
                      onChange={(e) => { setTimeScale(parseFloat(e.target.value)); setManualAngle(prev => (prev + parseFloat(e.target.value) * 15) % 360); }}
                      style={{ width: '100%', cursor: 'pointer', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0.5x</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>3x</span>
                    </div>
                  </div>

                  {/* Play/Pause */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => { playSound('click'); setIsAnimating(!isAnimating); }}
                      style={{
                        padding: '12px 32px',
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
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                <strong>Key Observation:</strong> When locked, the yellow marker always faces Earth. When you increase time scale, the orbit speeds up but the rotation stays synchronized — because F_tidal affects the rotation rate until it matches the orbital period.
              </p>
            </div>
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                <strong>Why it matters:</strong> This technology explains exoplanet astronomy, space mission planning, and is important for understanding habitable worlds around red dwarf stars — a key area of industry research today.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics
            </button>
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Tidal Locking
          </h2>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
              <strong>You observed:</strong> When tidally locked, the yellow marker on the Moon always faces Earth. As you saw in the experiment, tidal locking means ω<sub>rotation</sub> = ω<sub>orbital</sub>.
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
                <strong style={{ color: colors.textPrimary }}>Tidal Forces Create Bulges</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Earth's gravity pulls harder on the near side of the Moon than the far side. This differential pull stretches the Moon into an oval shape - the <span style={{ color: colors.accent }}>tidal bulge</span>.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Friction Slows Rotation</strong>
              </p>
              <p>
                If the Moon rotates faster than it orbits, the bulge is dragged ahead. Earth's gravity pulls back on it, creating friction that slows the rotation until it matches the orbital period. The formula is: F_tidal ∝ M/r³
              </p>
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
              Key Insight: Synchronous Rotation
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              When the Moon's rotation period equals its orbital period:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>The tidal bulge points directly at Earth</li>
              <li>No more gravitational torque - stable configuration</li>
              <li>The same face always points toward Earth</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Timeline of Locking
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The Moon became tidally locked about <span style={{ color: colors.warning }}>4 billion years ago</span>. It took millions of years of gradual slowing, with the Moon's early faster rotation dissipating as heat through tidal friction.
            </p>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover a Surprising Twist
            </button>
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Earth will eventually spin faster' },
      { id: 'b', text: 'Earth\'s day is gradually getting longer due to lunar tides', correct: true },
      { id: 'c', text: 'Earth\'s rotation is unaffected by the Moon' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: The Moon Raises Tides on Earth Too!
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            The Moon pulls on Earth's oceans, creating our ocean tides. These tides create friction as they slosh against the seafloor. What does this mean for Earth?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              The Moon raises ~1 meter bulges in Earth's oceans. As Earth rotates, these bulges crash against continents and the ocean floor...
            </p>
            {/* SVG visualization of tidal bulges on Earth */}
            <svg width="280" height="140" viewBox="0 0 280 140" style={{ display: 'block', margin: '0 auto 12px' }}>
              <defs>
                <radialGradient id="tpEarth" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#1e40af" />
                </radialGradient>
                <radialGradient id="tpMoon" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#4b5563" />
                </radialGradient>
                <filter id="tpGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Background */}
              <rect width="280" height="140" fill={colors.bgCard} rx="8" />
              {/* Grid */}
              <line x1="140" y1="10" x2="140" y2="130" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              <line x1="10" y1="70" x2="270" y2="70" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              {/* Earth with tidal bulge */}
              <ellipse cx="90" cy="70" rx="38" ry="28" fill="url(#tpEarth)" filter="url(#tpGlow)" />
              {/* Tidal bulge toward Moon */}
              <ellipse cx="90" cy="70" rx="46" ry="28" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" opacity="0.7" />
              <text x="90" y="108" textAnchor="middle" fill={colors.textMuted} fontSize="11">Earth</text>
              {/* Moon */}
              <circle cx="220" cy="70" r="18" fill="url(#tpMoon)" filter="url(#tpGlow)" />
              <text x="220" y="96" textAnchor="middle" fill={colors.textMuted} fontSize="11">Moon</text>
              {/* Gravity force arrow */}
              <line x1="200" y1="70" x2="140" y2="70" stroke={colors.warning} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
              {/* Labels */}
              <text x="170" y="62" textAnchor="middle" fill={colors.warning} fontSize="10">gravity</text>
              {/* Bulge label */}
              <text x="50" y="50" textAnchor="middle" fill="#60a5fa" fontSize="10">tidal</text>
              <text x="50" y="61" textAnchor="middle" fill="#60a5fa" fontSize="10">bulge</text>
            </svg>
            <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
              Ocean tides create friction as they slosh against the ocean floor
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
                Explore the Effect
              </button>
            )}
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const lockingTime = calculateLockingTime();
    const tidalForceStrength = Math.pow(50 / tidalDistance, 3).toFixed(2);
    const dissipationRate = ((100 - bodyRigidity) / 100).toFixed(2);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Tidal Locking Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              See how distance and body composition affect the time to tidal locking
            </p>
            <p style={{ ...typo.small, color: colors.warning, textAlign: 'center', marginBottom: '24px' }}>
              Observe: Adjust the sliders to see how dramatically distance affects locking time (scales with distance to the 6th power!).
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  {/* Formula */}
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                      <strong>T ∝ a<sup>6</sup> / (M × Q)</strong> — Tidal Locking Time formula
                    </p>
                  </div>

                  {/* SVG visualization that changes with sliders */}
                  <svg width="100%" height="160" viewBox="0 0 400 160" style={{ display: 'block', marginBottom: '16px' }}>
                    <defs>
                      <radialGradient id="twistPlanetGrad" cx="40%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#93c5fd" />
                        <stop offset="100%" stopColor="#1e40af" />
                      </radialGradient>
                      <radialGradient id="twistMoonGrad" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#e5e7eb" />
                        <stop offset="100%" stopColor="#4b5563" />
                      </radialGradient>
                      <filter id="twistGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* Background */}
                    <rect width="400" height="160" fill={colors.bgCard} rx="8" />
                    {/* Grid lines */}
                    <line x1="40" y1="80" x2="360" y2="80" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                    <line x1="200" y1="20" x2="200" y2="140" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                    {/* Planet at center */}
                    <circle cx="80" cy="80" r="24" fill="url(#twistPlanetGrad)" filter="url(#twistGlow)" />
                    <text x="80" y="113" textAnchor="middle" fill={colors.textMuted} fontSize="12" fontWeight="600">Planet</text>
                    {/* Orbit path - radius scales with distance */}
                    {(() => {
                      const orbitR = 40 + (tidalDistance / 100) * 120;
                      const moonCx = 80 + orbitR;
                      const moonR = Math.max(8, 18 - (bodyRigidity / 100) * 8);
                      const tidalForce = Math.pow(50 / tidalDistance, 3);
                      const bulgeRx = moonR * (1 + tidalForce * 0.15);
                      return (
                        <>
                          <ellipse cx="80" cy="80" rx={orbitR} ry={orbitR * 0.4} fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="6 3" opacity="0.4" />
                          {/* Moon with tidal bulge */}
                          <ellipse cx={moonCx} cy="80" rx={bulgeRx} ry={moonR} fill="url(#twistMoonGrad)" filter="url(#twistGlow)" />
                          <text x={moonCx} y={80 + moonR + 14} textAnchor="middle" fill={colors.textMuted} fontSize="12">Moon</text>
                          {/* Tidal force arrow */}
                          <line x1={moonCx - bulgeRx - 4} y1="80" x2="80" y2="80" stroke={colors.warning} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
                          {/* Distance label */}
                          <text x="260" y="30" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">d = {tidalDistance} AU</text>
                          <text x="260" y="48" textAnchor="middle" fill={colors.warning} fontSize="12">F = {tidalForce.toFixed(2)}x</text>
                          <text x="260" y="66" textAnchor="middle" fill={colors.textMuted} fontSize="11">T ≈ {lockingTime} yr</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  {/* Distance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Distance from Planet (a)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {tidalDistance < 30 ? 'Very Close' : tidalDistance < 70 ? 'Moderate' : 'Far'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={tidalDistance}
                      onChange={(e) => setTidalDistance(parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Close (strong tides)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Far (weak tides)</span>
                    </div>
                  </div>

                  {/* Rigidity slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Body Rigidity (Q factor)</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                        {bodyRigidity < 30 ? 'Icy/Fluid' : bodyRigidity < 70 ? 'Rocky' : 'Very Rigid'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bodyRigidity}
                      onChange={(e) => setBodyRigidity(parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Low (more friction)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>High (less friction)</span>
                    </div>
                  </div>

                  {/* Real-time calculated values */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Tidal Force</div>
                      <div style={{ ...typo.h3, color: colors.accent }}>{tidalForceStrength}x</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Dissipation</div>
                      <div style={{ ...typo.h3, color: colors.warning }}>{dissipationRate}</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Lock Time</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: colors.success }}>{lockingTime} yr</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                <strong>Key Discovery:</strong> Earth's day is lengthening by 1.4 milliseconds per century, and the Moon is receding at 3.8 cm/year. In billions of years, Earth will be tidally locked to the Moon!
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Discovery
            </button>
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Tidal Locking Throughout the Cosmos
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌙</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Most Moons Are Locked</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Almost every major moon in our solar system is tidally locked to its planet: our Moon, Phobos, Io, Europa, Ganymede, Callisto, Titan, Triton, and many more.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔥</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Tidal Heating</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Even tidally locked moons can experience heating if their orbit is eccentric. Io's 400+ volcanoes are powered by Jupiter's tidal forces flexing the moon's interior.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🪐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Exoplanet Implications</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Many exoplanets in habitable zones around red dwarf stars are likely tidally locked, creating "eyeball worlds" with permanent day and night sides.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌍</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Earth's Future</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In approximately 50 billion years, Earth will become tidally locked to the Moon. Days will be about 47 times longer than today, and the Moon will hang motionless in one part of the sky.
              </p>
            </div>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications
            </button>
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Tidal Locking"
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

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                How Tidal Locking Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 12px' }}>
                {app.connection}
              </p>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              background: `${app.color}11`,
              border: `1px solid ${app.color}33`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: app.color, margin: '0 0 4px', fontWeight: 600 }}>Future Impact:</p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
          </div>

          {/* Got It / Next Application button */}
          <button
            onClick={() => {
              playSound('click');
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              if (selectedApp < realWorldApps.length - 1) {
                setSelectedApp(selectedApp + 1);
              }
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginBottom: '12px',
              background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
            }}
          >
            {selectedApp < realWorldApps.length - 1 ? 'Next Application' : 'Got It'}
          </button>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
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
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '60px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
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
                ? 'You understand tidal locking and orbital mechanics!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review breakdown */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Review:</h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer === correctId;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                  }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700, fontSize: '16px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ ...typo.small, color: colors.textSecondary, flex: 1 }}>
                      {q.question.substring(0, 80)}...
                    </span>
                  </div>
                );
              })}
            </div>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => goToPhase('hook')}
                  style={{ ...primaryButtonStyle, background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                >
                  Dashboard
                </button>
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
              </div>
            )}
            </div>
          </div>

          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            background: colors.bgPrimary,
            borderTop: `1px solid ${colors.border}`,
            zIndex: 100,
          }}>
            {renderNavDots()}
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 100,
        }}>
          {renderNavDots()}
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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Tidal Locking Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the gravitational forces that synchronize rotation and orbit throughout the cosmos.
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
              'Tidal forces create bulges that lead to synchronous rotation',
              'The Moon rotates exactly once per orbit',
              'Earth\'s day is lengthening due to lunar tides',
              'Most moons in our solar system are tidally locked',
              'Tidal heating powers volcanic activity on worlds like Io',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default TidalLockingRenderer;
