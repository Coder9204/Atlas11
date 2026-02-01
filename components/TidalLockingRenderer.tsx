import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for the 10-phase learning structure
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
      { value: '27.3d', label: 'Moon rotation period', icon: '🔄' },
      { value: '27.3d', label: 'Moon orbital period', icon: '🌍' },
      { value: '4.5B yr', label: 'Time to lock', icon: '⏰' }
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
    title: 'Mercury\'s 3:2 Resonance',
    short: 'A spin-orbit lock that isn\'t quite 1:1',
    tagline: 'Captured in an eccentric dance',
    description: 'Mercury rotates exactly 3 times for every 2 orbits around the Sun. This unusual resonance exists because Mercury\'s elliptical orbit prevented true 1:1 locking.',
    connection: 'The same tidal physics applies, but Mercury\'s eccentric orbit created torques that stabilized at 3:2 instead of 1:1.',
    howItWorks: 'At perihelion (closest to Sun), tidal forces are strongest. The 3:2 resonance keeps Mercury\'s long axis pointing at the Sun at each perihelion, minimizing tidal stress over time.',
    stats: [
      { value: '59d', label: 'Rotation period', icon: '🔄' },
      { value: '88d', label: 'Orbital period', icon: '☀️' },
      { value: '0.21', label: 'Orbital eccentricity', icon: '📈' }
    ],
    examples: ['Mercury', 'Some exoplanets', 'Binary asteroids', 'Eccentric moons'],
    companies: ['NASA MESSENGER', 'ESA BepiColombo', 'Observatories', 'Research institutes'],
    futureImpact: 'Understanding spin-orbit resonances helps predict exoplanet climates and habitability.',
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

// Gold standard types
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

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const TidalLockingRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Animation states
  const [orbitalAngle, setOrbitalAngle] = useState(0);
  const [moonRotation, setMoonRotation] = useState(0);
  const [isTidallyLocked, setIsTidallyLocked] = useState(true);
  const [showTidalBulge, setShowTidalBulge] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);

  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mobile detection
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

  // Phase sync with external control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const playSound = useCallback((soundType: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
        'correct': { freq: 880, type: 'sine', duration: 0.15 },
        'incorrect': { freq: 220, type: 'square', duration: 0.3 },
        'complete': { freq: 587, type: 'sine', duration: 0.2 },
        'transition': { freq: 440, type: 'sine', duration: 0.1 }
      };

      const sound = sounds[soundType] || sounds['transition'];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch (e) {
      console.log(`Sound: ${soundType}`);
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

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

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const testQuestions = [
    {
      question: "What causes tidal locking to occur?",
      options: [
        { text: "Magnetic attraction", correct: false },
        { text: "Tidal friction dissipating rotational energy", correct: true },
        { text: "Solar radiation", correct: false },
        { text: "The satellite's composition", correct: false }
      ]
    },
    {
      question: "When a body is tidally locked, its rotation period equals its:",
      options: [
        { text: "Day length of the parent body", correct: false },
        { text: "Orbital period", correct: true },
        { text: "Parent body's rotation period", correct: false },
        { text: "None - it stops rotating", correct: false }
      ]
    },
    {
      question: "The Moon's rotation period is approximately:",
      options: [
        { text: "1 day", correct: false },
        { text: "1 week", correct: false },
        { text: "27.3 days (same as its orbital period)", correct: true },
        { text: "365 days", correct: false }
      ]
    },
    {
      question: "Tidal bulges on a body are caused by:",
      options: [
        { text: "Internal heat", correct: false },
        { text: "Differential gravitational pull across the body", correct: true },
        { text: "Magnetic fields", correct: false },
        { text: "Solar wind", correct: false }
      ]
    },
    {
      question: "Which statement about the Earth-Moon system is true?",
      options: [
        { text: "Earth is already tidally locked to the Moon", correct: false },
        { text: "The Moon is moving closer to Earth", correct: false },
        { text: "Earth's rotation is gradually slowing", correct: true },
        { text: "Tidal locking cannot happen to Earth", correct: false }
      ]
    },
    {
      question: "Pluto and Charon are special because:",
      options: [
        { text: "Neither is tidally locked", correct: false },
        { text: "They are mutually tidally locked", correct: true },
        { text: "Only Charon is tidally locked", correct: false },
        { text: "They orbit the Sun together", correct: false }
      ]
    },
    {
      question: "An 'eyeball world' refers to a tidally locked exoplanet with:",
      options: [
        { text: "Unusual coloring", correct: false },
        { text: "A permanent day side and night side", correct: true },
        { text: "Multiple moons", correct: false },
        { text: "A ring system", correct: false }
      ]
    },
    {
      question: "What powers Io's extreme volcanic activity?",
      options: [
        { text: "Radioactive decay", correct: false },
        { text: "Solar heating", correct: false },
        { text: "Tidal heating from Jupiter's gravity", correct: true },
        { text: "Chemical reactions", correct: false }
      ]
    },
    {
      question: "Before tidal locking, a moon typically rotates:",
      options: [
        { text: "Slower than its orbital period", correct: false },
        { text: "Faster than its orbital period", correct: true },
        { text: "At exactly its orbital period", correct: false },
        { text: "In the opposite direction", correct: false }
      ]
    },
    {
      question: "The 'far side' of the Moon:",
      options: [
        { text: "Is always dark", correct: false },
        { text: "Was first photographed from space", correct: true },
        { text: "Doesn't exist", correct: false },
        { text: "Faces the Sun constantly", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderMoonSystem = (locked: boolean, showBulge: boolean, orbAngle: number, moonRot: number, size: number = 300) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const orbitRadius = size * 0.33;
    const earthRadius = size * 0.12;
    const moonRadius = size * 0.08;
    const moonX = centerX + Math.cos(orbAngle * Math.PI / 180) * orbitRadius;
    const moonY = centerY + Math.sin(orbAngle * Math.PI / 180) * orbitRadius;

    // Angle from Moon to Earth (for tidal bulge direction)
    const angleToEarth = Math.atan2(centerY - moonY, centerX - moonX);

    // Calculate which side of moon faces Earth (for near/far side visualization)
    const moonFacingAngle = locked ? orbAngle : moonRot;
    const nearSideVisible = Math.cos((moonFacingAngle - orbAngle) * Math.PI / 180);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          {/* === PREMIUM EARTH GRADIENTS === */}
          {/* Earth atmosphere glow */}
          <radialGradient id="tidlEarthAtmosphere" cx="50%" cy="50%" r="55%">
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="85%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="95%" stopColor="#93c5fd" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
          </radialGradient>

          {/* Earth surface with 3D depth */}
          <radialGradient id="tidlEarthSurface" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="25%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>

          {/* Earth ocean shimmer */}
          <linearGradient id="tidlEarthOcean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#0284c7" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#0369a1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#075985" stopOpacity="0.4" />
          </linearGradient>

          {/* Earth continent green */}
          <linearGradient id="tidlEarthLand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="40%" stopColor="#22c55e" />
            <stop offset="70%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {/* === PREMIUM MOON GRADIENTS === */}
          {/* Moon near side (visible from Earth) - lighter, more detailed */}
          <radialGradient id="tidlMoonNearSide" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="25%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="75%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>

          {/* Moon far side (darker, more cratered appearance) */}
          <radialGradient id="tidlMoonFarSide" cx="60%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="25%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="75%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </radialGradient>

          {/* Moon glow effect */}
          <radialGradient id="tidlMoonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#9ca3af" stopOpacity="0" />
            <stop offset="85%" stopColor="#d1d5db" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0" />
          </radialGradient>

          {/* Moon crater shadows */}
          <radialGradient id="tidlCrater" cx="40%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="60%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </radialGradient>

          {/* === ORBITAL PATH GRADIENTS === */}
          <linearGradient id="tidlOrbitPath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
            <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
          </linearGradient>

          {/* Synchronous rotation indicator */}
          <linearGradient id="tidlSyncArrow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
          </linearGradient>

          {/* Tidal force arrow gradient */}
          <linearGradient id="tidlTidalForce" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#f97316" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="70%" stopColor="#f97316" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
          </linearGradient>

          {/* === STAR FIELD GRADIENT === */}
          <radialGradient id="tidlStarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>

          {/* === GLOW FILTERS === */}
          {/* Earth atmospheric glow filter */}
          <filter id="tidlEarthGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Moon soft glow filter */}
          <filter id="tidlMoonGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Star twinkle filter */}
          <filter id="tidlStarFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Tidal bulge glow */}
          <filter id="tidlBulgeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker for tidal force */}
          <marker id="tidlArrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="url(#tidlTidalForce)" />
          </marker>

          {/* Arrow marker for rotation */}
          <marker id="tidlArrowSync" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* === PREMIUM STARFIELD BACKGROUND === */}
        {[...Array(20)].map((_, i) => {
          const starX = ((i * 47 + 13) % size);
          const starY = ((i * 31 + 7) % size);
          const starSize = (i % 3) * 0.5 + 0.5;
          const opacity = 0.3 + (i % 5) * 0.1;
          return (
            <circle
              key={`star-${i}`}
              cx={starX}
              cy={starY}
              r={starSize}
              fill="url(#tidlStarGlow)"
              opacity={opacity}
              filter="url(#tidlStarFilter)"
            />
          );
        })}

        {/* === PREMIUM ORBITAL PATH === */}
        {/* Outer glow ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius + 2}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="4"
          strokeOpacity="0.1"
        />
        {/* Main orbit path */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke="url(#tidlOrbitPath)"
          strokeWidth="1.5"
          strokeDasharray="8 4"
        />
        {/* Orbital direction markers */}
        {[0, 90, 180, 270].map((angle) => {
          const markerX = centerX + Math.cos(angle * Math.PI / 180) * orbitRadius;
          const markerY = centerY + Math.sin(angle * Math.PI / 180) * orbitRadius;
          return (
            <circle
              key={`orbit-mark-${angle}`}
              cx={markerX}
              cy={markerY}
              r="2"
              fill="#67e8f9"
              opacity="0.5"
            />
          );
        })}

        {/* Orbit direction arrow */}
        <path
          d={`M ${centerX + orbitRadius - 15} ${centerY - 8}
              Q ${centerX + orbitRadius} ${centerY - 12} ${centerX + orbitRadius + 5} ${centerY - 5}`}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="1.5"
          markerEnd="url(#tidlArrowSync)"
          opacity="0.6"
        />

        {/* === PREMIUM EARTH === */}
        {/* Earth atmosphere glow */}
        <circle
          cx={centerX}
          cy={centerY}
          r={earthRadius * 1.3}
          fill="url(#tidlEarthAtmosphere)"
          filter="url(#tidlEarthGlowFilter)"
        />

        {/* Earth main body */}
        <circle
          cx={centerX}
          cy={centerY}
          r={earthRadius}
          fill="url(#tidlEarthSurface)"
        />

        {/* Earth ocean shimmer overlay */}
        <circle
          cx={centerX}
          cy={centerY}
          r={earthRadius}
          fill="url(#tidlEarthOcean)"
        />

        {/* Earth continents */}
        <ellipse
          cx={centerX - earthRadius * 0.3}
          cy={centerY - earthRadius * 0.15}
          rx={earthRadius * 0.35}
          ry={earthRadius * 0.25}
          fill="url(#tidlEarthLand)"
          opacity="0.8"
        />
        <ellipse
          cx={centerX + earthRadius * 0.25}
          cy={centerY + earthRadius * 0.25}
          rx={earthRadius * 0.25}
          ry={earthRadius * 0.15}
          fill="url(#tidlEarthLand)"
          opacity="0.7"
        />
        <ellipse
          cx={centerX + earthRadius * 0.1}
          cy={centerY - earthRadius * 0.4}
          rx={earthRadius * 0.15}
          ry={earthRadius * 0.1}
          fill="url(#tidlEarthLand)"
          opacity="0.6"
        />

        {/* Earth highlight */}
        <ellipse
          cx={centerX - earthRadius * 0.3}
          cy={centerY - earthRadius * 0.3}
          rx={earthRadius * 0.15}
          ry={earthRadius * 0.1}
          fill="white"
          opacity="0.15"
        />

        {/* Earth label */}
        <text
          x={centerX}
          y={centerY + earthRadius + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={size * 0.035}
          fontWeight="500"
        >
          Earth
        </text>

        {/* === PREMIUM MOON === */}
        <g transform={`translate(${moonX}, ${moonY})`}>
          {/* Moon glow aura */}
          <circle
            cx="0"
            cy="0"
            r={moonRadius * 1.4}
            fill="url(#tidlMoonGlow)"
            filter="url(#tidlMoonGlowFilter)"
          />

          {/* Tidal bulge - elongated toward Earth */}
          {showBulge ? (
            <ellipse
              cx="0" cy="0"
              rx={moonRadius * 1.15}
              ry={moonRadius * 0.9}
              fill={nearSideVisible > 0 ? "url(#tidlMoonNearSide)" : "url(#tidlMoonFarSide)"}
              transform={`rotate(${angleToEarth * 180 / Math.PI})`}
              filter="url(#tidlBulgeGlow)"
            />
          ) : (
            <circle
              cx="0"
              cy="0"
              r={moonRadius}
              fill={nearSideVisible > 0 ? "url(#tidlMoonNearSide)" : "url(#tidlMoonFarSide)"}
            />
          )}

          {/* Moon surface features (rotate with moon) */}
          <g transform={`rotate(${locked ? moonRot : moonRot})`}>
            {/* Mare (dark regions) - near side features */}
            <ellipse cx={-moonRadius * 0.3} cy={-moonRadius * 0.2} rx={moonRadius * 0.2} ry={moonRadius * 0.15} fill="url(#tidlCrater)" opacity="0.6" />
            <ellipse cx={moonRadius * 0.2} cy={-moonRadius * 0.1} rx={moonRadius * 0.15} ry={moonRadius * 0.12} fill="url(#tidlCrater)" opacity="0.5" />
            <ellipse cx={0} cy={moonRadius * 0.3} rx={moonRadius * 0.22} ry={moonRadius * 0.18} fill="url(#tidlCrater)" opacity="0.55" />

            {/* Small craters */}
            <circle cx={-moonRadius * 0.5} cy={moonRadius * 0.1} r={moonRadius * 0.08} fill="url(#tidlCrater)" opacity="0.4" />
            <circle cx={moonRadius * 0.4} cy={moonRadius * 0.35} r={moonRadius * 0.06} fill="url(#tidlCrater)" opacity="0.35" />

            {/* Near side indicator (yellow marker) */}
            <circle cx="0" cy={-moonRadius * 0.6} r={moonRadius * 0.12} fill="#fbbf24" filter="url(#tidlStarFilter)" />
            <circle cx="0" cy={-moonRadius * 0.6} r={moonRadius * 0.06} fill="#fef3c7" />
          </g>

          {/* Moon highlight */}
          <ellipse
            cx={-moonRadius * 0.25}
            cy={-moonRadius * 0.25}
            rx={moonRadius * 0.12}
            ry={moonRadius * 0.08}
            fill="white"
            opacity="0.2"
          />
        </g>

        {/* Moon label */}
        <text
          x={moonX}
          y={moonY + moonRadius + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={size * 0.03}
          fontWeight="500"
        >
          Moon
        </text>

        {/* === SYNCHRONOUS ROTATION INDICATOR === */}
        {locked && (
          <g>
            {/* Curved arrow around Moon showing rotation direction */}
            <path
              d={`M ${moonX - moonRadius * 1.5} ${moonY - moonRadius * 0.3}
                  A ${moonRadius * 1.5} ${moonRadius * 1.2} 0 0 1 ${moonX - moonRadius * 0.3} ${moonY - moonRadius * 1.5}`}
              fill="none"
              stroke="url(#tidlSyncArrow)"
              strokeWidth="2"
              markerEnd="url(#tidlArrowSync)"
              opacity="0.8"
            />
            {/* Sync indicator label */}
            <text
              x={moonX - moonRadius * 1.8}
              y={moonY - moonRadius * 0.8}
              textAnchor="end"
              fill="#f59e0b"
              fontSize={size * 0.028}
              fontWeight="600"
            >
              1 rotation
            </text>
            <text
              x={moonX - moonRadius * 1.8}
              y={moonY - moonRadius * 0.5}
              textAnchor="end"
              fill="#fbbf24"
              fontSize={size * 0.025}
              opacity="0.8"
            >
              = 1 orbit
            </text>
          </g>
        )}

        {/* === TIDAL FORCE ARROW === */}
        {showBulge && (
          <g>
            <line
              x1={moonX + Math.cos(angleToEarth) * (moonRadius * 1.3)}
              y1={moonY + Math.sin(angleToEarth) * (moonRadius * 1.3)}
              x2={moonX + Math.cos(angleToEarth) * (moonRadius * 2.2)}
              y2={moonY + Math.sin(angleToEarth) * (moonRadius * 2.2)}
              stroke="url(#tidlTidalForce)"
              strokeWidth="3"
              markerEnd="url(#tidlArrowOrange)"
              filter="url(#tidlBulgeGlow)"
            />
            <text
              x={moonX + Math.cos(angleToEarth) * (moonRadius * 2.8)}
              y={moonY + Math.sin(angleToEarth) * (moonRadius * 2.8)}
              textAnchor="middle"
              fill="#f59e0b"
              fontSize={size * 0.028}
              fontWeight="500"
            >
              Tidal Force
            </text>
          </g>
        )}

        {/* === OBSERVER ON EARTH === */}
        <g>
          {/* Observer figure */}
          <circle
            cx={centerX + earthRadius * 0.7}
            cy={centerY - earthRadius * 0.5}
            r={earthRadius * 0.12}
            fill="#fcd9b6"
          />
          {/* Line of sight to Moon */}
          <line
            x1={centerX + earthRadius * 0.7}
            y1={centerY - earthRadius * 0.6}
            x2={moonX}
            y2={moonY}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.4"
          />
          {/* Observer label */}
          <text
            x={centerX + earthRadius * 0.7}
            y={centerY - earthRadius * 0.8}
            textAnchor="middle"
            fill="#64748b"
            fontSize={size * 0.025}
          >
            Observer
          </text>
        </g>

        {/* === NEAR SIDE INDICATOR LEGEND === */}
        <g transform={`translate(${size * 0.05}, ${size * 0.9})`}>
          <circle cx="0" cy="0" r="4" fill="#fbbf24" />
          <text x="8" y="4" fill="#94a3b8" fontSize={size * 0.028}>= Near side marker</text>
        </g>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Orbital Mechanics</span>
      </div>

      {/* Gradient Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-cyan-100 to-slate-300 bg-clip-text text-transparent">
        The Moon&apos;s Hidden Side
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8">
        A mystery hiding in plain sight for all of human history
      </p>

      {/* Premium Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl">
        {renderMoonSystem(isTidallyLocked, true, orbitalAngle, moonRotation, 280)}
        <p className="text-xl text-slate-300 mt-6 mb-4">
          Throughout human history, we&apos;ve only ever seen one face of the Moon. The &quot;far side&quot; remained a complete mystery until spacecraft photographed it in 1959.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Why does the Moon always show us the same face? Is it just a cosmic coincidence?
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-lg font-semibold rounded-2xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          Uncover the Mystery
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="text-slate-500 text-sm mt-4">
        Tap to begin your journey through tidal forces
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Why do we always see the same side of the Moon from Earth?
        </p>
        {renderMoonSystem(true, true, orbitalAngle, moonRotation, 200)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The Moon doesn\'t rotate at all - it just orbits' },
          { id: 'B', text: 'It\'s a pure coincidence that hasn\'t changed' },
          { id: 'C', text: 'The Moon rotates exactly once per orbit (tidal locking)' },
          { id: 'D', text: 'Earth\'s magnetic field holds the Moon in place' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
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
            Correct! The Moon IS rotating, but exactly once per orbit. This is called <span className="text-cyan-400">tidal locking</span>!
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Tidal Locking Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderMoonSystem(isTidallyLocked, showTidalBulge, orbitalAngle, moonRotation, 280)}
        <p className="text-sm text-slate-400 mt-2 text-center">
          Yellow dot = marker on Moon's near side. Watch if it always faces Earth!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <button
          onClick={() => setIsTidallyLocked(!isTidallyLocked)}
          style={{ zIndex: 10 }}
          className={`p-4 rounded-xl transition-all ${
            isTidallyLocked
              ? 'bg-emerald-600/40 border-2 border-emerald-500'
              : 'bg-amber-600/40 border-2 border-amber-500'
          }`}
        >
          <div className="font-semibold text-white">
            {isTidallyLocked ? 'Tidally Locked' : 'Not Locked'}
          </div>
          <div className="text-sm text-slate-300">
            {isTidallyLocked
              ? 'Rotation = orbital period'
              : 'Rotation faster than orbit'}
          </div>
        </button>

        <button
          onClick={() => setShowTidalBulge(!showTidalBulge)}
          style={{ zIndex: 10 }}
          className={`p-4 rounded-xl transition-all ${
            showTidalBulge
              ? 'bg-cyan-600/40 border-2 border-cyan-500'
              : 'bg-slate-700/50 border-2 border-transparent'
          }`}
        >
          <div className="font-semibold text-white">
            {showTidalBulge ? 'Tidal Bulge: ON' : 'Tidal Bulge: OFF'}
          </div>
          <div className="text-sm text-slate-300">
            Moon stretched toward Earth
          </div>
        </button>
      </div>

      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-2xl mb-6">
        <label className="text-slate-300 text-sm block mb-2">Time Speed: {timeScale}x</label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.5"
          value={timeScale}
          onChange={(e) => setTimeScale(parseFloat(e.target.value))}
          className="w-full accent-slate-500"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isAnimating ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Observe:</h3>
        <p className="text-slate-300 text-sm">
          When locked: The yellow marker always points toward Earth - even though the Moon IS rotating!
          <br /><br />
          When unlocked: Different parts of the Moon become visible as it rotates faster than it orbits.
        </p>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Tidal Locking</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Tidal Forces</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Gravity is stronger on the near side, weaker on the far side</li>
            <li>This difference stretches the body into an oval (tidal bulge)</li>
            <li>The bulge always points toward the larger body</li>
            <li>If the body rotates, the bulge must "move" through the rock</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Tidal Friction</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Moving the bulge through rock creates friction</li>
            <li>Friction converts rotational energy to heat</li>
            <li>The body gradually slows its rotation</li>
            <li>Eventually, rotation matches the orbital period</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Locked State</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Synchronous Rotation:</strong> When rotation period = orbital period</p>
            <p><strong>Stable Configuration:</strong> The tidal bulge stays fixed - no more friction, no more energy loss</p>
            <p><strong>One Face Visible:</strong> The same hemisphere always faces the parent body</p>
            <p className="text-cyan-400 mt-3">
              The Moon became tidally locked about 4 billion years ago. It now rotates exactly once every 27.3 days - the same as its orbital period!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          The Moon raises tides on Earth too - that's where our ocean tides come from! These tides create friction as they slosh against continents and the seafloor.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What does this mean for Earth's future?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Earth will eventually spin faster' },
          { id: 'B', text: 'Earth\'s day is gradually getting longer' },
          { id: 'C', text: 'Earth\'s rotation is unaffected by the Moon' },
          { id: 'D', text: 'Earth will stop rotating completely' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
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
            Correct! Earth's day gets about 1.4 milliseconds longer each century!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Billions of years from now, Earth could become tidally locked to the Moon - a day would equal a month!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See the Evidence
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Moons of the Solar System</h2>
      <p className="text-slate-300 mb-6 text-center max-w-2xl">
        Compare different moons and see how tidal locking affects them differently based on their distance and size.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-4xl">
        {/* Our Moon */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Our Moon</h3>
          <svg width="180" height="120" viewBox="0 0 180 120" className="mx-auto">
            <defs>
              <radialGradient id="tidlMiniEarth" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>
              <radialGradient id="tidlMiniMoon" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#e5e7eb" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#4b5563" />
              </radialGradient>
              <linearGradient id="tidlMiniOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
              </linearGradient>
              <filter id="tidlMiniGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Stars */}
            {[1,2,3,4,5].map(i => (
              <circle key={i} cx={(i * 37) % 180} cy={(i * 23) % 120} r="0.8" fill="white" opacity="0.4" />
            ))}
            {/* Earth with glow */}
            <circle cx="60" cy="60" r="28" fill="#3b82f6" opacity="0.2" filter="url(#tidlMiniGlow)" />
            <circle cx="60" cy="60" r="25" fill="url(#tidlMiniEarth)" />
            <ellipse cx="52" cy="55" rx="8" ry="5" fill="#22c55e" opacity="0.6" />
            {/* Orbit path */}
            <ellipse cx="60" cy="60" rx="50" ry="15" fill="none" stroke="url(#tidlMiniOrbit)" strokeWidth="1.5" strokeDasharray="4 2" />
            {/* Moon */}
            <g transform={`translate(${60 + Math.cos(orbitalAngle * Math.PI / 180) * 50}, ${60 + Math.sin(orbitalAngle * Math.PI / 180) * 15})`}>
              <circle cx="0" cy="0" r="10" fill="#9ca3af" opacity="0.3" filter="url(#tidlMiniGlow)" />
              <circle cx="0" cy="0" r="8" fill="url(#tidlMiniMoon)" />
              <circle cx="-2" cy="-2" r="2" fill="#6b7280" opacity="0.6" />
              <circle cx="2" cy="1" r="1.5" fill="#6b7280" opacity="0.4" />
              {/* Near side marker */}
              <circle cx="0" cy="-5" r="1.5" fill="#fbbf24" />
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked</p>
            <p className="text-xs text-slate-400">27.3 day rotation = 27.3 day orbit</p>
          </div>
        </div>

        {/* Io */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2 text-center">Io (Jupiter)</h3>
          <svg width="180" height="120" viewBox="0 0 180 120" className="mx-auto">
            <defs>
              <radialGradient id="tidlJupiter" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#f5d0a9" />
                <stop offset="30%" stopColor="#d4a574" />
                <stop offset="60%" stopColor="#b8824a" />
                <stop offset="100%" stopColor="#8b5a2b" />
              </radialGradient>
              <radialGradient id="tidlIo" cx="35%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fde047" />
                <stop offset="70%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ca8a04" />
              </radialGradient>
              <radialGradient id="tidlVolcanoGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
              <filter id="tidlVolcanoFilter" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Jupiter */}
            <circle cx="45" cy="60" r="33" fill="#d4a574" opacity="0.15" />
            <circle cx="45" cy="60" r="30" fill="url(#tidlJupiter)" />
            {/* Jupiter bands */}
            <ellipse cx="45" cy="52" rx="28" ry="4" fill="#c2956e" opacity="0.4" />
            <ellipse cx="45" cy="60" rx="30" ry="3" fill="#e8cdb5" opacity="0.3" />
            <ellipse cx="45" cy="68" rx="28" ry="4" fill="#c2956e" opacity="0.4" />
            {/* Great Red Spot hint */}
            <ellipse cx="55" cy="58" rx="5" ry="3" fill="#dc6547" opacity="0.6" />
            {/* Orbit */}
            <ellipse cx="100" cy="60" rx="45" ry="15" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
            {/* Io */}
            <g transform={`translate(${100 + Math.cos(orbitalAngle * 2 * Math.PI / 180) * 45}, ${60 + Math.sin(orbitalAngle * 2 * Math.PI / 180) * 15})`}>
              <circle cx="0" cy="0" r="8" fill="url(#tidlIo)" />
              {/* Volcanic spots */}
              <circle cx="-3" cy="-2" r="1.5" fill="#ef4444" />
              <circle cx="2" cy="1" r="1" fill="#f97316" />
              {/* Volcanic plume */}
              <g filter="url(#tidlVolcanoFilter)">
                <path d="M-3,-3 Q-4,-10 -2,-8 Q-3,-12 -1,-7 L-3,-3" fill="url(#tidlVolcanoGlow)" />
              </g>
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked + Heated</p>
            <p className="text-xs text-slate-400">Most volcanic body in solar system</p>
          </div>
        </div>

        {/* Europa */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2 text-center">Europa (Jupiter)</h3>
          <svg width="180" height="120" viewBox="0 0 180 120" className="mx-auto">
            <defs>
              <radialGradient id="tidlEuropa" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="30%" stopColor="#bae6fd" />
                <stop offset="60%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </radialGradient>
              <linearGradient id="tidlEuropaCracks" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {/* Jupiter (same as Io) */}
            <circle cx="45" cy="60" r="30" fill="url(#tidlJupiter)" />
            <ellipse cx="45" cy="52" rx="28" ry="4" fill="#c2956e" opacity="0.4" />
            <ellipse cx="45" cy="68" rx="28" ry="4" fill="#c2956e" opacity="0.4" />
            {/* Orbit */}
            <ellipse cx="100" cy="60" rx="50" ry="18" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
            {/* Europa */}
            <g transform={`translate(${100 + Math.cos((orbitalAngle * 1.5) * Math.PI / 180) * 50}, ${60 + Math.sin((orbitalAngle * 1.5) * Math.PI / 180) * 18})`}>
              <circle cx="0" cy="0" r="9" fill="#7dd3fc" opacity="0.3" />
              <circle cx="0" cy="0" r="7" fill="url(#tidlEuropa)" />
              {/* Ice cracks */}
              <line x1="-5" y1="-3" x2="5" y2="3" stroke="url(#tidlEuropaCracks)" strokeWidth="0.8" />
              <line x1="-4" y1="2" x2="4" y2="-4" stroke="url(#tidlEuropaCracks)" strokeWidth="0.6" />
              <line x1="-2" y1="-5" x2="3" y2="5" stroke="url(#tidlEuropaCracks)" strokeWidth="0.5" />
              {/* Highlight */}
              <ellipse cx="-2" cy="-2" rx="1.5" ry="1" fill="white" opacity="0.4" />
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked</p>
            <p className="text-xs text-slate-400">Ice shell hides liquid ocean</p>
          </div>
        </div>

        {/* Titan */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2 text-center">Titan (Saturn)</h3>
          <svg width="180" height="120" viewBox="0 0 180 120" className="mx-auto">
            <defs>
              <radialGradient id="tidlSaturn" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#fde68a" />
                <stop offset="70%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#d4a574" />
              </radialGradient>
              <linearGradient id="tidlSaturnRing" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.1" />
                <stop offset="20%" stopColor="#fcd34d" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.8" />
                <stop offset="80%" stopColor="#fcd34d" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
              </linearGradient>
              <radialGradient id="tidlTitan" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="70%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </radialGradient>
              <radialGradient id="tidlTitanAtmo" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#f97316" stopOpacity="0" />
                <stop offset="85%" stopColor="#fdba74" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.2" />
              </radialGradient>
            </defs>
            {/* Saturn */}
            <circle cx="45" cy="60" r="25" fill="url(#tidlSaturn)" />
            {/* Saturn rings */}
            <ellipse cx="45" cy="60" rx="38" ry="6" fill="none" stroke="url(#tidlSaturnRing)" strokeWidth="4" />
            <ellipse cx="45" cy="60" rx="33" ry="5" fill="none" stroke="#fef3c7" strokeWidth="1" opacity="0.4" />
            {/* Orbit */}
            <ellipse cx="100" cy="60" rx="45" ry="15" fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
            {/* Titan */}
            <g transform={`translate(${100 + Math.cos(orbitalAngle * Math.PI / 180) * 45}, ${60 + Math.sin(orbitalAngle * Math.PI / 180) * 15})`}>
              {/* Atmosphere haze */}
              <circle cx="0" cy="0" r="12" fill="url(#tidlTitanAtmo)" />
              <circle cx="0" cy="0" r="8" fill="url(#tidlTitan)" />
              {/* Surface features hint */}
              <ellipse cx="-2" cy="1" rx="2" ry="1.5" fill="#7c2d12" opacity="0.4" />
              {/* Highlight through atmosphere */}
              <ellipse cx="-2" cy="-2" rx="1.5" ry="1" fill="#fed7aa" opacity="0.3" />
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked</p>
            <p className="text-xs text-slate-400">Thick atmosphere, methane lakes</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Key Insight:</h3>
        <p className="text-slate-300 text-sm">
          Almost all major moons in our solar system are tidally locked to their planets! The closer a moon orbits and the larger its planet, the faster tidal locking occurs. Io is so close to Jupiter that tidal forces flex it constantly, creating intense volcanic activity through tidal heating.
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Factors Affecting Tidal Locking Time</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The time required for a body to become tidally locked depends on several key factors:
          </p>
          <div className="grid gap-3 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Distance</h4>
              <p className="text-sm">Closer objects lock faster. Tidal force decreases with the cube of distance.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Mass Ratio</h4>
              <p className="text-sm">Larger primary body = stronger tidal forces = faster locking.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Rigidity</h4>
              <p className="text-sm">Less rigid bodies (more liquid/icy) dissipate energy faster and lock sooner.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Initial Spin</h4>
              <p className="text-sm">Bodies that start spinning faster take longer to slow down to locked state.</p>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            Most moons in our solar system are tidally locked to their planets!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const applications = [
    {
      title: "Earth-Moon System",
      icon: "Moon",
      description: "The Moon is tidally locked to Earth, always showing the same face. Earth's rotation is also gradually slowing.",
      details: "The 'far side' of the Moon was a complete mystery until Luna 3 photographed it in 1959. It looks surprisingly different - more craters, fewer dark 'mare' regions.",
      animation: (
        <svg width="200" height="150" viewBox="0 0 200 150" className="mx-auto">
          <defs>
            <radialGradient id="tidlAppEarth" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
            <radialGradient id="tidlAppEarthGlow" cx="50%" cy="50%" r="55%">
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="90%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="tidlAppMoon" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="40%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#4b5563" />
            </radialGradient>
            <linearGradient id="tidlAppOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
            </linearGradient>
            <filter id="tidlAppGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Stars */}
          {[1,2,3,4,5,6,7,8].map(i => (
            <circle key={i} cx={15 + (i * 23)} cy={10 + (i % 4) * 15} r="1" fill="white" opacity={0.3 + (i % 3) * 0.2} />
          ))}
          {/* Earth glow */}
          <circle cx="70" cy="70" r="35" fill="url(#tidlAppEarthGlow)" filter="url(#tidlAppGlow)" />
          {/* Earth */}
          <circle cx="70" cy="70" r="30" fill="url(#tidlAppEarth)" />
          {/* Earth continents */}
          <ellipse cx="60" cy="65" rx="10" ry="7" fill="#22c55e" opacity="0.6" />
          <ellipse cx="78" cy="75" rx="6" ry="4" fill="#22c55e" opacity="0.5" />
          {/* Moon orbit */}
          <ellipse cx="70" cy="70" rx="60" ry="20" fill="none" stroke="url(#tidlAppOrbit)" strokeWidth="1.5" strokeDasharray="4 3" />
          {/* Moon */}
          <g transform={`translate(${70 + Math.cos(orbitalAngle * Math.PI / 180) * 60}, ${70 + Math.sin(orbitalAngle * Math.PI / 180) * 20})`}>
            <circle cx="0" cy="0" r="12" fill="#9ca3af" opacity="0.2" filter="url(#tidlAppGlow)" />
            <circle cx="0" cy="0" r="10" fill="url(#tidlAppMoon)" />
            <circle cx="-3" cy="-2" r="2.5" fill="#6b7280" opacity="0.6" />
            <circle cx="2" cy="2" r="2" fill="#6b7280" opacity="0.5" />
            {/* Near side marker */}
            <circle cx="0" cy="-6" r="2" fill="#fbbf24" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Same face always visible</text>
        </svg>
      )
    },
    {
      title: "Mercury's Resonance",
      icon: "Mercury",
      description: "Mercury isn't fully tidally locked - it's in a 3:2 spin-orbit resonance with the Sun.",
      details: "Mercury rotates 3 times for every 2 orbits around the Sun. This unusual resonance was caused by Mercury's eccentric orbit preventing full tidal locking.",
      animation: (
        <svg width="200" height="150" viewBox="0 0 200 150" className="mx-auto">
          <defs>
            <radialGradient id="tidlAppSun" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <radialGradient id="tidlAppSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="tidlAppMercury" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="40%" stopColor="#9ca3af" />
              <stop offset="70%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </radialGradient>
            <linearGradient id="tidlAppMercuryOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
            </linearGradient>
            <filter id="tidlAppSunFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Sun glow */}
          <circle cx="45" cy="75" r="40" fill="url(#tidlAppSunGlow)" filter="url(#tidlAppSunFilter)" />
          {/* Sun */}
          <circle cx="45" cy="75" r="28" fill="url(#tidlAppSun)" />
          {/* Sun surface details */}
          <circle cx="35" cy="68" r="4" fill="#fef08a" opacity="0.5" />
          <circle cx="50" cy="80" r="3" fill="#fcd34d" opacity="0.4" />
          {/* Mercury orbit (eccentric) */}
          <ellipse cx="100" cy="75" rx="70" ry="38" fill="none" stroke="url(#tidlAppMercuryOrbit)" strokeWidth="1.5" strokeDasharray="5 3" />
          {/* Mercury */}
          <g transform={`translate(${100 + Math.cos(orbitalAngle * Math.PI / 180) * 70}, ${75 + Math.sin(orbitalAngle * Math.PI / 180) * 38})`}>
            <circle cx="0" cy="0" r="8" fill="url(#tidlAppMercury)" />
            <circle cx="-2" cy="-2" r="2" fill="#4b5563" opacity="0.6" />
            <circle cx="1" cy="1" r="1.5" fill="#4b5563" opacity="0.5" />
            {/* Rotation indicator */}
            <circle cx="0" cy="-5" r="1.5" fill="#ef4444" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">3:2 spin-orbit resonance</text>
        </svg>
      )
    },
    {
      title: "Exoplanet Habitability",
      icon: "Exoplanets",
      description: "Many exoplanets orbiting red dwarf stars may be tidally locked, creating 'eyeball worlds'.",
      details: "With a permanent day side and night side, these worlds could have habitable zones in the 'terminator ring' between extreme heat and cold.",
      animation: (
        <svg width="200" height="150" viewBox="0 0 200 150" className="mx-auto">
          <defs>
            <radialGradient id="tidlAppRedDwarf" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="tidlAppRedDwarfGlow" cx="50%" cy="50%" r="50%">
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#f87171" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="tidlAppEyeballNight" cx="70%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <radialGradient id="tidlAppEyeballDay" cx="20%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="30%" stopColor="#f97316" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
            <linearGradient id="tidlAppTerminator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="1" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="tidlAppHeatRays" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
            </linearGradient>
            <filter id="tidlAppStarFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Red dwarf glow */}
          <circle cx="30" cy="75" r="35" fill="url(#tidlAppRedDwarfGlow)" filter="url(#tidlAppStarFilter)" />
          {/* Red dwarf star */}
          <circle cx="30" cy="75" r="25" fill="url(#tidlAppRedDwarf)" />
          {/* Heat rays */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1="55" y1={55 + i * 10} x2="95" y2={55 + i * 10} stroke="url(#tidlAppHeatRays)" strokeWidth="2" opacity={0.5 - i * 0.05} />
          ))}
          {/* Eyeball planet - night side base */}
          <circle cx="130" cy="75" r="35" fill="url(#tidlAppEyeballNight)" />
          {/* Day side (hot) */}
          <path d="M130,40 A35,35 0 0 0 130,110" fill="url(#tidlAppEyeballDay)" opacity="0.85" />
          {/* Terminator/habitable zone */}
          <ellipse cx="112" cy="75" rx="7" ry="22" fill="url(#tidlAppTerminator)" opacity="0.8" />
          {/* Water in habitable zone */}
          <ellipse cx="112" cy="75" rx="4" ry="15" fill="#3b82f6" opacity="0.7" />
          {/* Ice cap on night side */}
          <ellipse cx="155" cy="55" rx="8" ry="5" fill="#e0f2fe" opacity="0.5" />
          <ellipse cx="155" cy="95" rx="8" ry="5" fill="#e0f2fe" opacity="0.5" />
          <text x="130" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Habitable terminator ring</text>
        </svg>
      )
    },
    {
      title: "Binary Stars",
      icon: "Binary Stars",
      description: "Close binary star systems can become mutually tidally locked, like Pluto and Charon.",
      details: "In these systems, both stars always show the same face to each other. The orbital period equals both rotation periods, creating a cosmic dance.",
      animation: (
        <svg width="200" height="150" viewBox="0 0 200 150" className="mx-auto">
          <defs>
            <radialGradient id="tidlAppStar1" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <radialGradient id="tidlAppStar1Glow" cx="50%" cy="50%" r="50%">
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#fde047" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="tidlAppStar2" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="30%" stopColor="#fb923c" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </radialGradient>
            <radialGradient id="tidlAppStar2Glow" cx="50%" cy="50%" r="50%">
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#fb923c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="tidlAppBarycenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
            </radialGradient>
            <filter id="tidlAppBinaryFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Stars background */}
          {[1,2,3,4,5].map(i => (
            <circle key={i} cx={(i * 43) % 200} cy={(i * 29) % 130} r="0.8" fill="white" opacity={0.3 + (i % 3) * 0.15} />
          ))}
          {/* Barycenter with glow */}
          <circle cx="100" cy="75" r="4" fill="url(#tidlAppBarycenter)" filter="url(#tidlAppBinaryFilter)" />
          <circle cx="100" cy="75" r="2" fill="#fef08a" />
          {/* Binary stars */}
          <g transform={`rotate(${orbitalAngle}, 100, 75)`}>
            {/* Star 1 glow */}
            <circle cx="55" cy="75" r="28" fill="url(#tidlAppStar1Glow)" filter="url(#tidlAppBinaryFilter)" />
            {/* Star 1 */}
            <circle cx="55" cy="75" r="20" fill="url(#tidlAppStar1)" />
            {/* Star 1 surface */}
            <circle cx="48" cy="70" r="4" fill="#fef08a" opacity="0.4" />
            {/* Facing marker */}
            <circle cx="70" cy="75" r="2" fill="#ef4444" />

            {/* Star 2 glow */}
            <circle cx="145" cy="75" r="23" fill="url(#tidlAppStar2Glow)" filter="url(#tidlAppBinaryFilter)" />
            {/* Star 2 */}
            <circle cx="145" cy="75" r="15" fill="url(#tidlAppStar2)" />
            {/* Facing marker */}
            <circle cx="132" cy="75" r="1.5" fill="#ef4444" />
          </g>
          {/* Orbital path hint */}
          <ellipse cx="100" cy="75" rx="45" ry="45" fill="none" stroke="#64748b" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Mutually tidally locked</text>
        </svg>
      )
    }
  ];

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-slate-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

        {applications[activeAppTab].animation}

        <p className="text-lg text-slate-300 mt-4 mb-3">
          {applications[activeAppTab].description}
        </p>
        <p className="text-sm text-slate-400">
          {applications[activeAppTab].details}
        </p>

        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
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
          onClick={() => goToPhase('test')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-slate-600 text-white'
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
            onClick={() => {
              setShowTestResults(true);
              const score = calculateScore();
              onGameEvent?.({ type: 'test_completed', data: { score, total: 10 } });
            }}
            style={{ zIndex: 10 }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {calculateScore()}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7
              ? 'Excellent! You\'ve mastered tidal locking and orbital mechanics!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => {
                goToPhase('mastery');
                onGameEvent?.({ type: 'mastery_achieved', data: { score: calculateScore() } });
              }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-slate-800/50 via-slate-700/50 to-slate-800/50 rounded-3xl p-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-4">Congratulations!</h1>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Tidal Locking Master!</h2>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of tidal locking and orbital resonance!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Tidal Forces</p>
            <p className="text-xs text-slate-500 mt-1">Differential gravity creates bulges</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Synchronous Rotation</p>
            <p className="text-xs text-slate-500 mt-1">Rotation = Orbital period</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Tidal Heating</p>
            <p className="text-xs text-slate-500 mt-1">Powers Io's volcanoes</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Eyeball Worlds</p>
            <p className="text-xs text-slate-500 mt-1">Locked exoplanets</p>
          </div>
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 font-medium">You have demonstrated mastery of:</p>
          <ul className="text-sm text-slate-300 mt-2 space-y-1">
            <li>Understanding why the Moon shows one face</li>
            <li>How tidal forces lead to synchronous rotation</li>
            <li>Effects on moons throughout the solar system</li>
            <li>Implications for exoplanet habitability</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
      </div>
    </div>
  );

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

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-500/5 rounded-full blur-3xl" />

      {/* Premium Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Tidal Locking</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-cyan-400 w-6' : currentPhaseIndex > index ? 'bg-cyan-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default TidalLockingRenderer;
