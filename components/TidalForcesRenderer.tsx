'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Tidal Forces - Complete 10-Phase Game
// Why there are TWO tidal bulges on Earth
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

interface TidalForcesRendererProps {
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
    scenario: "You're standing on a beach watching the tide come in. Your friend says the Moon's gravity is simply pulling the water toward it.",
    question: "What is the actual cause of tidal forces on Earth?",
    options: [
      { id: 'a', label: "The total gravitational pull of the Moon on the oceans" },
      { id: 'b', label: "The DIFFERENCE in gravitational pull across Earth - stronger on the near side, weaker on the far side", correct: true },
      { id: 'c', label: "Earth's magnetic field interacting with lunar radiation" },
      { id: 'd', label: "The centrifugal force from Earth's rotation" }
    ],
    explanation: "Tidal forces arise from the gradient (difference) in gravitational pull across an extended body. The Moon pulls the near side of Earth more strongly than the center, and the center more strongly than the far side. This differential creates the stretching effect we call tides."
  },
  {
    scenario: "A student notices that coastal towns experience two high tides per day, roughly 12 hours apart. They're puzzled because there's only one Moon.",
    question: "Why does Earth have TWO tidal bulges instead of just one facing the Moon?",
    options: [
      { id: 'a', label: "The Sun creates the second bulge on the opposite side" },
      { id: 'b', label: "Earth's rapid rotation flings water outward on both sides" },
      { id: 'c', label: "The far side is pulled LESS than Earth's center, so it 'falls behind' creating a second bulge", correct: true },
      { id: 'd', label: "Ocean currents redirect water to the opposite side" }
    ],
    explanation: "The far-side bulge exists because that water is pulled LESS strongly than Earth's center. Relative to the center, the far-side water effectively 'lags behind' or bulges outward. This is a consequence of differential gravity - the same physics that creates the near-side bulge also creates the far-side one."
  },
  {
    scenario: "During a full moon, a harbor master notices the tides are exceptionally high. Two weeks later, during the first quarter moon, the tides are much milder.",
    question: "What explains the difference between spring tides and neap tides?",
    options: [
      { id: 'a', label: "Spring tides occur in springtime when Earth is closer to the Sun" },
      { id: 'b', label: "During spring tides, Sun and Moon align, adding their tidal effects; during neap tides, they're at right angles and partially cancel", correct: true },
      { id: 'c', label: "The Moon's distance from Earth varies significantly over two weeks" },
      { id: 'd', label: "Ocean temperature changes affect water volume" }
    ],
    explanation: "Spring tides occur during new and full moons when the Sun, Moon, and Earth align - their tidal forces ADD together. Neap tides happen at quarter moons when Sun and Moon are at 90 degrees - their tidal forces partially CANCEL. Spring tides can be 20% higher than average; neap tides about 20% lower."
  },
  {
    scenario: "Both the Sun and Moon exert gravitational pull on Earth's oceans. The Sun is far more massive than the Moon.",
    question: "Despite the Sun being 27 million times more massive, why does the Moon have about twice the tidal influence on Earth?",
    options: [
      { id: 'a', label: "The Moon is made of denser material" },
      { id: 'b', label: "The Sun's gravity is blocked by Earth's magnetic field" },
      { id: 'c', label: "Tidal force decreases as 1/r cubed - the Moon's proximity matters more than the Sun's mass", correct: true },
      { id: 'd', label: "The Moon has a special gravitational effect on water" }
    ],
    explanation: "Tidal force depends on the GRADIENT of gravity, which falls off as 1/r cubed (not 1/r squared like gravity itself). The Moon is about 390 times closer than the Sun. Though less massive, the Moon's proximity gives it roughly twice the tidal effect."
  },
  {
    scenario: "Astronomers studying the Moon notice we always see the same face from Earth. Some people incorrectly claim the Moon doesn't rotate.",
    question: "Why does the Moon always show the same face to Earth?",
    options: [
      { id: 'a', label: "The Moon stopped rotating billions of years ago" },
      { id: 'b', label: "Earth's gravity is strong enough to hold one side facing us" },
      { id: 'c', label: "Tidal friction synchronized the Moon's rotation period to exactly match its orbital period", correct: true },
      { id: 'd', label: "The far side is too dark to reflect sunlight" }
    ],
    explanation: "The Moon IS rotating - exactly once per orbit (27.3 days). This is called tidal locking. Over billions of years, tidal friction from Earth's gravity slowed the Moon's rotation until it synchronized with its orbit. The Moon rotates, but from Earth we always see the same hemisphere."
  },
  {
    scenario: "A comet is approaching a massive planet. Mission scientists are calculating whether it will survive the close encounter.",
    question: "What is the Roche limit and why does it matter for the comet?",
    options: [
      { id: 'a', label: "The minimum safe distance for spacecraft communications" },
      { id: 'b', label: "The distance within which tidal forces exceed an object's self-gravity, potentially tearing it apart", correct: true },
      { id: 'c', label: "The boundary where the planet's atmosphere begins" },
      { id: 'd', label: "The point where orbital velocity equals escape velocity" }
    ],
    explanation: "The Roche limit is the critical distance where tidal forces from a massive body exceed the gravitational self-cohesion of an orbiting object. If the comet passes within this limit, tidal stretching could fragment or destroy it. Saturn's rings likely formed from a moon that ventured inside Saturn's Roche limit."
  },
  {
    scenario: "Jupiter's moon Io has over 400 active volcanoes - more volcanic activity than any other body in our solar system, including Earth.",
    question: "What powers Io's extreme volcanic activity?",
    options: [
      { id: 'a', label: "Io is very close to the Sun and receives intense solar heating" },
      { id: 'b', label: "Io has an extremely large radioactive core" },
      { id: 'c', label: "Tidal flexing from Jupiter's gravity, amplified by orbital resonance with other moons, continuously heats Io's interior", correct: true },
      { id: 'd', label: "Chemical reactions from Jupiter's radiation belts" }
    ],
    explanation: "Io experiences intense tidal heating from Jupiter's enormous gravity. Its slightly elliptical orbit (maintained by orbital resonance with Europa and Ganymede) means the tidal bulge constantly shifts as Io moves closer and farther from Jupiter. This continuous flexing generates friction that heats Io's interior."
  },
  {
    scenario: "Scientists studying Saturn's moon Enceladus discovered water geysers erupting from cracks in its icy surface, suggesting a subsurface ocean.",
    question: "How can a small, distant moon maintain liquid water beneath its frozen surface?",
    options: [
      { id: 'a', label: "Radioactive decay in the core provides enough heat" },
      { id: 'b', label: "Reflected sunlight from Saturn's rings warms the moon" },
      { id: 'c', label: "Tidal heating from Saturn, as the moon's eccentric orbit causes continuous flexing and internal friction", correct: true },
      { id: 'd', label: "Chemical reactions between ice and rock generate heat" }
    ],
    explanation: "Enceladus maintains a subsurface ocean through tidal heating. Its eccentric orbit around Saturn causes the moon to flex rhythmically as the tidal bulge shifts. This mechanical deformation generates internal friction and heat, keeping water liquid beneath the ice."
  },
  {
    scenario: "Geologists have discovered that 620 million years ago, Earth's day was only about 21 hours long. Ancient coral growth rings confirm this shorter day length.",
    question: "Why is Earth's rotation gradually slowing down?",
    options: [
      { id: 'a', label: "The Sun's gravity is gradually capturing Earth" },
      { id: 'b', label: "Earth is gaining mass from meteorites" },
      { id: 'c', label: "Tidal friction from the Moon transfers Earth's rotational energy to the Moon's orbit", correct: true },
      { id: 'd', label: "Earth's core is cooling and contracting" }
    ],
    explanation: "Tidal friction acts like a brake on Earth's rotation. The tidal bulges don't point exactly at the Moon because Earth's rotation carries them slightly ahead. The Moon's gravity pulls back on these bulges, slowing Earth's rotation. This angular momentum is transferred to the Moon, which is moving away at about 3.8 cm per year."
  },
  {
    scenario: "Astronomers discover a binary star system where two stars orbit very close to each other. Both stars appear elongated rather than spherical.",
    question: "What causes the stars in close binary systems to become elongated?",
    options: [
      { id: 'a', label: "Rapid rotation causes centrifugal flattening" },
      { id: 'b', label: "Magnetic fields from each star repel material" },
      { id: 'c', label: "Intense mutual tidal forces stretch each star toward its companion", correct: true },
      { id: 'd', label: "Radiation pressure from each star pushes material outward" }
    ],
    explanation: "In close binary systems, each star raises tidal bulges on its companion. The closer the stars, the more extreme the tidal distortion - some binaries have stars so close they share material through their elongated regions. These tidal interactions can transfer mass between stars and affect their evolution."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🌊',
    title: 'Tidal Power Generation',
    short: 'Harvesting energy from the Moon\'s pull',
    tagline: 'Predictable renewable energy from space',
    description: 'Tidal power plants harness the rise and fall of ocean tides to generate electricity. Unlike solar and wind, tidal energy is completely predictable centuries in advance, based on orbital mechanics.',
    connection: 'Tidal forces from the Moon and Sun create the water level changes that drive turbines, converting gravitational potential energy to electricity.',
    howItWorks: 'Tidal barrages trap water at high tide, releasing it through turbines at low tide. Tidal stream generators work like underwater wind turbines, capturing energy from tidal currents.',
    stats: [
      { value: '500MW', label: 'Largest tidal plant', icon: '⚡' },
      { value: '100%', label: 'Predictability', icon: '📊' },
      { value: '80%', label: 'Capacity factor possible', icon: '🔋' }
    ],
    examples: ['La Rance, France', 'Sihwa Lake, Korea', 'Bay of Fundy', 'Pentland Firth'],
    companies: ['Simec Atlantis', 'Orbital Marine Power', 'Naval Group', 'DCNS'],
    futureImpact: 'Floating tidal platforms will make tidal energy accessible in deep water sites worldwide.',
    color: '#3B82F6'
  },
  {
    icon: '🌙',
    title: 'Tidal Locking of Moons',
    short: 'Why we only see one face of the Moon',
    tagline: 'Gravity\'s grip on rotation',
    description: 'The Moon always shows the same face to Earth because tidal forces have synchronized its rotation with its orbit. This same process affects moons throughout the solar system.',
    connection: 'Tidal bulges create a torque that gradually slows rotation until the bulge points permanently toward the parent body.',
    howItWorks: 'Tidal forces stretch the Moon along the Earth-Moon axis. If the Moon rotated faster than it orbited, friction would slow its spin until locked. Earth is slowly locking to the Moon too.',
    stats: [
      { value: '27.3d', label: 'Moon rotation = orbit', icon: '🔄' },
      { value: '4.5B yr', label: 'Time to lock', icon: '⏰' },
      { value: '3.8cm/yr', label: 'Moon receding rate', icon: '📏' }
    ],
    examples: ['Earth\'s Moon', 'Pluto-Charon', 'Jupiter\'s Galilean moons', 'Mars\'s Phobos'],
    companies: ['NASA', 'ESA', 'JAXA', 'Space research institutes'],
    futureImpact: 'In 50 billion years, Earth and Moon will be mutually tidally locked, with month-long days.',
    color: '#8B5CF6'
  },
  {
    icon: '🌋',
    title: 'Io\'s Volcanic Activity',
    short: 'Tidal heating creates the most volcanic world',
    tagline: 'Jupiter\'s crushing embrace',
    description: 'Jupiter\'s moon Io is the most volcanically active body in the solar system, with over 400 active volcanoes. This activity comes not from radioactive decay but from tidal heating.',
    connection: 'Jupiter\'s immense gravity and orbital resonances with other moons cause Io\'s orbit to be slightly elliptical, constantly flexing the moon and generating internal heat.',
    howItWorks: 'As Io\'s distance from Jupiter changes, tidal forces stretch and squeeze it differently. This flexing creates friction that heats the interior to over 1000C, driving volcanism.',
    stats: [
      { value: '400+', label: 'Active volcanoes', icon: '🌋' },
      { value: '100TW', label: 'Tidal heat output', icon: '🔥' },
      { value: '500km', label: 'Lava plume heights', icon: '📈' }
    ],
    examples: ['Io', 'Europa (subsurface ocean)', 'Enceladus', 'Triton'],
    companies: ['NASA Juno mission', 'ESA JUICE', 'Research universities', 'Planetary science'],
    futureImpact: 'Europa\'s tidally heated subsurface ocean may harbor life, making it a prime astrobiology target.',
    color: '#EF4444'
  },
  {
    icon: '🚢',
    title: 'Maritime Navigation',
    short: 'Tides shape shipping and coastal life',
    tagline: 'Planning voyages with lunar precision',
    description: 'Accurate tide predictions are essential for maritime navigation, harbor operations, and coastal communities. Ships entering shallow harbors must time arrivals with high tide.',
    connection: 'Understanding tidal force physics allows precise predictions of water levels based on Moon and Sun positions, saving billions in shipping and preventing groundings.',
    howItWorks: 'Tide tables combine gravitational theory with local geography. Harmonic analysis of tidal constituents from decades of data allows predictions accurate to within centimeters.',
    stats: [
      { value: '$14T/yr', label: 'Seaborne trade value', icon: '💰' },
      { value: '16m', label: 'Bay of Fundy tide range', icon: '📐' },
      { value: '1000+yr', label: 'Prediction accuracy', icon: '🎯' }
    ],
    examples: ['Port of Rotterdam', 'Thames Barrier', 'Panama Canal', 'Suez Canal'],
    companies: ['NOAA', 'UK Hydrographic Office', 'Maersk', 'Port Authorities'],
    futureImpact: 'Climate change is altering tidal patterns as sea levels rise, requiring updated predictions for coastal infrastructure.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const TidalForcesRenderer: React.FC<TidalForcesRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [showVectors, setShowVectors] = useState(false);
  const [showDifferential, setShowDifferential] = useState(false);
  const [moonAngle, setMoonAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Twist phase - tidal locking
  const [moonRotation, setMoonRotation] = useState(0);
  const [isTidallyLocked, setIsTidallyLocked] = useState(true);

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
      setMoonAngle(a => (a + 0.02) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Twist animation - tidal locking
  useEffect(() => {
    if (phase !== 'twist_play') return;
    const interval = setInterval(() => {
      setMoonAngle(a => (a + 0.02) % (Math.PI * 2));
      if (isTidallyLocked) {
        setMoonRotation(r => (r + 0.02) % (Math.PI * 2));
      } else {
        setMoonRotation(r => (r + 0.08) % (Math.PI * 2));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase, isTidallyLocked]);

  // Reset states when entering play phases
  useEffect(() => {
    if (phase === 'play') {
      setShowVectors(false);
      setShowDifferential(false);
      setMoonAngle(0);
      setIsAnimating(false);
    }
    if (phase === 'twist_play') {
      setMoonAngle(0);
      setMoonRotation(0);
      setIsTidallyLocked(true);
    }
  }, [phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for tides/ocean
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    ocean: '#0EA5E9',
    moon: '#9CA3AF',
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
    twist_predict: 'Compare Variable',
    twist_play: 'Explore Locking',
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
        gameType: 'tidal-forces',
        gameTitle: 'Tidal Forces',
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

  // Tidal Forces Visualization SVG Component
  const TidalVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;
    const earthCenterX = width * 0.35;
    const earthCenterY = height * 0.5;
    const earthRadius = isMobile ? 45 : 55;
    const moonDistance = isMobile ? 100 : 140;
    const moonRadius = isMobile ? 12 : 16;

    const moonX = earthCenterX + Math.cos(moonAngle) * moonDistance;
    const moonY = earthCenterY + Math.sin(moonAngle) * moonDistance * 0.3;
    const bulgeAngle = moonAngle;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <title>Tidal Forces Visualization - Differential Gravity</title>
        <defs>
          <radialGradient id="earthGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>
          <radialGradient id="moonGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          <linearGradient id="oceanBulge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="arrowYellow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
          </marker>
          <marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
          </marker>
          <marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Background stars */}
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 47 + 13) % width}
            cy={(i * 31 + 7) % height}
            r={0.4 + (i % 4) * 0.15}
            fill="#ffffff"
            opacity={0.2 + (i % 4) * 0.15}
          />
        ))}

        {/* Grid lines for reference */}
        <line x1={earthCenterX} y1={20} x2={earthCenterX} y2={height - 20} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
        <line x1={20} y1={earthCenterY} x2={width - 20} y2={earthCenterY} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />

        {/* Orbit path */}
        <ellipse
          cx={earthCenterX}
          cy={earthCenterY}
          rx={moonDistance}
          ry={moonDistance * 0.3}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.5"
        />

        {/* Earth with tidal bulge */}
        <g transform={`translate(${earthCenterX}, ${earthCenterY})`}>
          {/* Tidal bulge - water layer */}
          <ellipse
            cx={0}
            cy={0}
            rx={earthRadius + 12}
            ry={earthRadius - 5}
            fill="url(#oceanBulge)"
            transform={`rotate(${bulgeAngle * 180 / Math.PI})`}
            opacity="0.7"
            filter="url(#glow)"
          />

          {/* Earth sphere */}
          <circle cx={0} cy={0} r={earthRadius} fill="url(#earthGrad)" />

          {/* Continents */}
          <ellipse cx={-10} cy={-8} rx={15} ry={10} fill="#22c55e" opacity="0.8" />
          <ellipse cx={12} cy={8} rx={12} ry={8} fill="#22c55e" opacity="0.7" />

          {/* Bulge labels */}
          <g transform={`rotate(${bulgeAngle * 180 / Math.PI})`}>
            <text x={earthRadius + 18} y={4} textAnchor="start" fill="#7dd3fc" fontSize="11" fontWeight="600">HIGH</text>
            <text x={-earthRadius - 18} y={4} textAnchor="end" fill="#7dd3fc" fontSize="11" fontWeight="600">HIGH</text>
          </g>
        </g>

        {/* Gravity vectors */}
        {showVectors && (
          <g filter="url(#glow)">
            {/* Near side - strongest */}
            <line
              x1={earthCenterX + Math.cos(bulgeAngle) * (earthRadius - 10)}
              y1={earthCenterY + Math.sin(bulgeAngle) * (earthRadius - 10) * 0.3}
              x2={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 30)}
              y2={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 30) * 0.3}
              stroke="#ef4444"
              strokeWidth="3"
              markerEnd="url(#arrowRed)"
            />
            {/* Center */}
            <line
              x1={earthCenterX}
              y1={earthCenterY}
              x2={earthCenterX + Math.cos(bulgeAngle) * 25}
              y2={earthCenterY + Math.sin(bulgeAngle) * 25 * 0.3}
              stroke="#fbbf24"
              strokeWidth="3"
              markerEnd="url(#arrowYellow)"
            />
            {/* Far side - weakest */}
            <line
              x1={earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 10)}
              y1={earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 10) * 0.3}
              x2={earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 25)}
              y2={earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 25) * 0.3}
              stroke="#22c55e"
              strokeWidth="2"
              markerEnd="url(#arrowGreen)"
            />
          </g>
        )}

        {/* Differential (tidal) vectors */}
        {showDifferential && (
          <g filter="url(#glow)">
            {/* Near side - outward */}
            <line
              x1={earthCenterX + Math.cos(bulgeAngle) * earthRadius}
              y1={earthCenterY + Math.sin(bulgeAngle) * earthRadius * 0.3}
              x2={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 22)}
              y2={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 22) * 0.3}
              stroke="#60a5fa"
              strokeWidth="4"
              markerEnd="url(#arrowBlue)"
            />
            {/* Far side - also outward! */}
            <line
              x1={earthCenterX - Math.cos(bulgeAngle) * earthRadius}
              y1={earthCenterY - Math.sin(bulgeAngle) * earthRadius * 0.3}
              x2={earthCenterX - Math.cos(bulgeAngle) * (earthRadius + 22)}
              y2={earthCenterY - Math.sin(bulgeAngle) * (earthRadius + 22) * 0.3}
              stroke="#60a5fa"
              strokeWidth="4"
              markerEnd="url(#arrowBlue)"
            />
            <text
              x={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 35)}
              y={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 35) * 0.3 + 4}
              fill="#93c5fd"
              fontSize="11"
              textAnchor="middle"
            >
              STRETCH
            </text>
            <text
              x={earthCenterX - Math.cos(bulgeAngle) * (earthRadius + 35)}
              y={earthCenterY - Math.sin(bulgeAngle) * (earthRadius + 35) * 0.3 + 4}
              fill="#93c5fd"
              fontSize="11"
              textAnchor="middle"
            >
              STRETCH
            </text>
          </g>
        )}

        {/* Moon position indicator - absolute cx/cy for tracking */}
        <circle cx={moonX} cy={moonY} r={moonRadius} fill={colors.moon} filter="url(#glow)" opacity="0.95" />

        {/* Moon */}
        <g transform={`translate(${moonX}, ${moonY})`}>
          <circle cx={0} cy={0} r={moonRadius} fill="url(#moonGrad)" filter="url(#glow)" />
          <circle cx={-3} cy={-3} r={2} fill="#6b7280" />
          <circle cx={4} cy={1} r={1.5} fill="#6b7280" />
          <text x={0} y={moonRadius + 12} textAnchor="middle" fill="#9ca3af" fontSize="11">Moon</text>
        </g>

        {/* Legend */}
        {showVectors && (
          <g>
            <rect x="10" y="10" width="130" height="65" rx="6" fill="#0f172a" stroke="#334155" />
            <text x="75" y="24" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">GRAVITY VECTORS</text>
            <line x1="20" y1="36" x2="40" y2="36" stroke="#ef4444" strokeWidth="2" />
            <text x="45" y="40" fill="#94a3b8" fontSize="11">Strong (near)</text>
            <line x1="20" y1="52" x2="40" y2="52" stroke="#fbbf24" strokeWidth="2" />
            <text x="45" y="56" fill="#94a3b8" fontSize="11">Medium</text>
            <line x1="20" y1="66" x2="40" y2="66" stroke="#22c55e" strokeWidth="2" />
            <text x="45" y="70" fill="#94a3b8" fontSize="11">Weak (far)</text>
          </g>
        )}

        {showDifferential && (
          <g>
            <rect x="10" y="10" width="150" height="44" rx="6" fill="#0f172a" stroke="#334155" />
            <text x="85" y="26" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="600">NET TIDAL FORCES</text>
            <line x1="20" y1="38" x2="40" y2="38" stroke="#60a5fa" strokeWidth="3" />
            <text x="45" y="42" fill="#94a3b8" fontSize="11">Outward stretch</text>
          </g>
        )}

        {/* Title */}
        <text x={width / 2} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="11">
          Tidal Force = Differential Gravity
        </text>
      </svg>
    );
  };

  // Tidal Locking Visualization
  const TidalLockingVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 240 : 280;
    const earthCenterX = width * 0.3;
    const earthCenterY = height * 0.5;
    const earthRadius = isMobile ? 28 : 35;
    const moonOrbitRadius = isMobile ? 80 : 110;
    const moonRadius = isMobile ? 16 : 20;

    const moonX = earthCenterX + Math.cos(moonAngle) * moonOrbitRadius;
    const moonY = earthCenterY + Math.sin(moonAngle) * moonOrbitRadius * 0.4;
    const moonFacingAngle = isTidallyLocked ? moonAngle + Math.PI : moonRotation;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <title>Tidal Locking Visualization</title>
        <defs>
          <radialGradient id="earthGrad2" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>
          <radialGradient id="moonGrad2" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 43 + 11) % width}
            cy={(i * 29 + 5) % height}
            r={0.4 + (i % 3) * 0.12}
            fill="#ffffff"
            opacity={0.2 + (i % 4) * 0.12}
          />
        ))}

        {/* Grid lines */}
        <line x1={earthCenterX} y1={15} x2={earthCenterX} y2={height - 15} stroke="#334155" strokeWidth="1" strokeDasharray="2,2" opacity="0.2" />
        <line x1={15} y1={earthCenterY} x2={width - 15} y2={earthCenterY} stroke="#334155" strokeWidth="1" strokeDasharray="2,2" opacity="0.2" />

        {/* Orbital path */}
        <ellipse
          cx={earthCenterX}
          cy={earthCenterY}
          rx={moonOrbitRadius}
          ry={moonOrbitRadius * 0.4}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Earth */}
        <g>
          <circle cx={earthCenterX} cy={earthCenterY} r={earthRadius + 5} fill="#3b82f6" opacity="0.2" />
          <circle cx={earthCenterX} cy={earthCenterY} r={earthRadius} fill="url(#earthGrad2)" filter="url(#glow2)" />
          <ellipse cx={earthCenterX - 5} cy={earthCenterY - 5} rx={10} ry={7} fill="#22c55e" opacity="0.8" />
          <text x={earthCenterX} y={earthCenterY + earthRadius + 15} textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>
        </g>

        {/* Observer on Earth */}
        <g transform={`translate(${earthCenterX}, ${earthCenterY - earthRadius - 8})`}>
          <text x={0} y={0} textAnchor="middle" fontSize="14">👁️</text>
          <text x={0} y={14} textAnchor="middle" fill="#94a3b8" fontSize="11">Observer</text>
        </g>

        {/* Reference line */}
        <line
          x1={moonX}
          y1={moonY}
          x2={earthCenterX}
          y2={earthCenterY}
          stroke="#6366f1"
          strokeWidth="1"
          strokeDasharray="4,3"
          opacity="0.4"
        />

        {/* Moon with rotation marker */}
        <g transform={`translate(${moonX}, ${moonY})`} filter="url(#glow2)">
          <circle cx={0} cy={0} r={moonRadius} fill="url(#moonGrad2)" />

          {/* Moon's face pattern - rotates with moonFacingAngle */}
          <g transform={`rotate(${moonFacingAngle * 180 / Math.PI})`}>
            <ellipse cx={-4} cy={-3} rx={3} ry={2.5} fill="#6b7280" />
            <ellipse cx={4} cy={-3} rx={3} ry={2.5} fill="#6b7280" />
            <ellipse cx={0} cy={5} rx={6} ry={2} fill="#6b7280" />

            {/* Direction marker */}
            <line x1={0} y1={0} x2={moonRadius + 8} y2={0} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <polygon points={`${moonRadius + 6},-3 ${moonRadius + 12},0 ${moonRadius + 6},3`} fill="#ef4444" />
          </g>

          <text x={0} y={moonRadius + 15} textAnchor="middle" fill="#9ca3af" fontSize="11">Moon</text>
        </g>

        {/* Status panel - using absolute coordinates */}
        <rect x={width - 145} y="15" width="130" height="80" rx="8" fill="#0f172a" stroke="#334155" />
        <rect x={width - 145} y="15" width="130" height="24" rx="8" fill={isTidallyLocked ? "#052e16" : "#450a0a"} opacity="0.5" />
        <text x={width - 80} y="31" textAnchor="middle" fill={isTidallyLocked ? "#4ade80" : "#f87171"} fontSize="11" fontWeight="600">
          {isTidallyLocked ? 'Tidally Locked' : 'NOT Locked'}
        </text>
        <text x={width - 140} y="52" fill="#64748b" fontSize="11">Orbital:</text>
        <text x={width - 95} y="52" fill="#7dd3fc" fontSize="11" fontWeight="600">{(moonAngle * 180 / Math.PI).toFixed(0)}°</text>
        <text x={width - 75} y="52" fill="#64748b" fontSize="11">Rot:</text>
        <text x={width - 48} y="52" fill="#fbbf24" fontSize="11" fontWeight="600">{(moonRotation * 180 / Math.PI).toFixed(0)}°</text>
        <text x={width - 80} y="70" textAnchor="middle" fill={isTidallyLocked ? "#4ade80" : "#f87171"} fontSize="11">
          {isTidallyLocked ? 'Same face to Earth' : 'Faces change'}
        </text>
        <text x={width - 80} y="86" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">
          {isTidallyLocked ? 'Period matched' : 'Period differs'}
        </text>

        {/* Title */}
        <text x={width / 2} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="11">
          {isTidallyLocked ? 'Rotation period = Orbital period' : 'Rotation faster than orbit'}
        </text>
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

  // Bottom navigation bar with Back/Next buttons and nav dots
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestActive = phase === 'test' && !testSubmitted;
    const isNextDisabled = currentIndex === phaseOrder.length - 1 || isTestActive;
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 100,
      }}>
        <button
          onClick={() => { if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]); }}
          disabled={currentIndex === 0}
          aria-label="Back"
          style={{
            minHeight: '44px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex === 0 ? colors.textMuted : colors.textSecondary,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: currentIndex === 0 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                minHeight: '44px',
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => { if (!isNextDisabled) nextPhase(); }}
          disabled={isNextDisabled}
          aria-label="Next"
          style={{
            minHeight: '44px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: isNextDisabled ? colors.border : colors.accent,
            color: 'white',
            cursor: isNextDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isNextDisabled ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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
        paddingTop: '48px',
        paddingBottom: '100px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌊🌙
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Tidal Forces
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "The Moon pulls on the ocean, creating tides. But here's the mystery: there are <span style={{ color: colors.accent }}>TWO tidal bulges</span> - one toward the Moon AND one on the <span style={{ color: colors.accent }}>opposite side</span>!"
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
            "If gravity just pulls water toward the Moon, why is there a bulge on the OPPOSITE side of Earth? This mystery reveals something fundamental about how gravity works across distances."
          </p>
          <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>
            - The Tidal Paradox
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Investigate the Mystery
        </button>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The Sun creates the second bulge on the opposite side' },
      { id: 'b', text: 'Differential gravity: far side is pulled LESS than Earth\'s center, creating a second bulge', correct: true },
      { id: 'c', text: 'Centrifugal force from Earth\'s rotation throws water outward on both sides' },
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
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Why is there a tidal bulge on the side of Earth AWAY from the Moon?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 340 : 480} height={isMobile ? 180 : 200} viewBox={`0 0 ${isMobile ? 340 : 480} ${isMobile ? 180 : 200}`} style={{ margin: '0 auto', display: 'block' }}>
              <title>Two Tidal Bulges Diagram</title>
              <defs>
                <radialGradient id="earthGradPredict" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e3a5f" />
                </radialGradient>
              </defs>
              {/* Moon */}
              <circle cx={isMobile ? 50 : 70} cy={isMobile ? 90 : 100} r={isMobile ? 15 : 18} fill="#9ca3af" />
              <text x={isMobile ? 50 : 70} y={isMobile ? 130 : 140} textAnchor="middle" fill="#9ca3af" fontSize="11">Moon</text>

              {/* Arrow */}
              <line x1={isMobile ? 70 : 95} y1={isMobile ? 90 : 100} x2={isMobile ? 130 : 160} y2={isMobile ? 90 : 100} stroke="#06B6D4" strokeWidth="2" markerEnd="url(#arrowCyan)" />
              <defs>
                <marker id="arrowCyan" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#06B6D4" />
                </marker>
              </defs>
              <text x={isMobile ? 100 : 130} y={isMobile ? 78 : 88} textAnchor="middle" fill="#06B6D4" fontSize="11">pulls</text>

              {/* Earth with bulges */}
              <ellipse cx={isMobile ? 170 : 240} cy={isMobile ? 90 : 100} rx={isMobile ? 50 : 60} ry={isMobile ? 35 : 40} fill="url(#earthGradPredict)" />
              <text x={isMobile ? 170 : 240} y={isMobile ? 148 : 160} textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>

              {/* Bulge labels */}
              <text x={isMobile ? 125 : 185} y={isMobile ? 70 : 80} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="600">HIGH</text>
              <text x={isMobile ? 215 : 295} y={isMobile ? 70 : 80} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="600">HIGH</text>

              {/* Question mark */}
              <text x={isMobile ? 260 : 340} y={isMobile ? 95 : 105} textAnchor="middle" fill="#F59E0B" fontSize="24" fontWeight="700">?</text>
              <text x={isMobile ? 260 : 340} y={isMobile ? 148 : 160} textAnchor="middle" fill="#F59E0B" fontSize="11">Why?</text>
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

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
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
            Differential Gravity Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Explore how different parts of Earth experience different gravitational pull.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <TidalVisualization />
            </div>

            {/* Moon position slider */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Moon Position (angle): {(moonAngle * 180 / Math.PI).toFixed(0)}°
              </label>
              <input
                type="range"
                min="0"
                max="3.14"
                step="0.1"
                value={moonAngle}
                onChange={(e) => {
                  playSound('click');
                  setMoonAngle(parseFloat(e.target.value));
                }}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none' as const,
                  touchAction: 'pan-y',
                  accentColor: '#3b82f6',
                }}
              />
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setShowVectors(!showVectors);
                  if (!showVectors) setShowDifferential(false);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: showVectors ? colors.accent : colors.bgSecondary,
                  color: showVectors ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showVectors ? '✓' : '○'} Gravity Vectors
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setShowDifferential(!showDifferential);
                  if (!showDifferential) setShowVectors(false);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: showDifferential ? colors.ocean : colors.bgSecondary,
                  color: showDifferential ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showDifferential ? '✓' : '○'} Net Tidal Force
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setIsAnimating(!isAnimating);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAnimating ? '#8B5CF6' : colors.bgSecondary,
                  color: isAnimating ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isAnimating ? '⏸ Pause' : '▶ Animate'}
              </button>
            </div>

            {/* Explanation based on current view */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              {showVectors && !showDifferential && (
                <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
                  <strong>When you increase the Moon distance, the gravity difference decreases.</strong> Near side: pulled MORE than Earth&apos;s center.
                  Far side: pulled LESS. As the Moon gets closer, larger tidal forces result — this causes more extreme ocean tides.
                </p>
              )}
              {showDifferential && (
                <p style={{ ...typo.body, color: colors.ocean, margin: 0 }}>
                  <strong>When tidal forces increase, both bulges grow larger.</strong> Near side stretches toward Moon.
                  Far side &quot;lags behind&quot; relative to center → stretches AWAY. Higher differential gravity leads to stronger tidal effects.
                </p>
              )}
              {!showVectors && !showDifferential && (
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Toggle the buttons above to observe how differential gravity creates TWO tidal bulges! Try animating to see the comparison before and after.
                </p>
              )}
            </div>

            {/* Why this matters */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>
                Why This Matters in the Real World
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0' }}>
                This is why tidal forces are important for engineering and science. Engineers designing coastal infrastructure, tidal power plants, and maritime navigation systems all rely on this physics. Tidal forces also affect spacecraft trajectories, planetary formation, and habitability of moons like Europa. Understanding how the Moon causes two tidal bulges helps us design better tide prediction systems used in shipping, which moves $14 trillion in goods annually.
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

        {renderBottomNav()}
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
            The Physics of Tidal Forces
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Tidal Force = Differential Gravity</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Tidal forces arise because gravity varies with distance. The Moon pulls the <span style={{ color: '#ef4444' }}>near side</span> more strongly than Earth&apos;s center, and the center more strongly than the <span style={{ color: '#22c55e' }}>far side</span>.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Why Two Bulges?</strong>
              </p>
              <p>
                The near-side bulge forms because water is pulled MORE than Earth&apos;s center. The far-side bulge forms because water there is pulled LESS than the center - it effectively &quot;lags behind.&quot;
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
              Key Insight: Tidal Force ∝ 1/r³
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Tidal forces depend on the <em>gradient</em> of gravity, not just its strength:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Gravity falls off as 1/r²</li>
              <li>Tidal force (the difference) falls off as 1/r³</li>
              <li>Distance matters MORE for tidal forces than for gravity itself</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Moon vs Sun: Proximity Wins
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The Sun is 27 million times more massive than the Moon, but the Moon is 390× closer. Because tidal force scales as 1/r³, the Moon&apos;s tidal influence is about <strong>twice</strong> that of the Sun!
            </p>
          </div>

          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Your prediction: <span style={{ color: prediction === 'b' ? colors.success : colors.error, fontWeight: 600 }}>
                {prediction === 'b' ? '✓ Correct!' : '✗ The answer was differential gravity'}
              </span>
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover Another Effect
          </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Tidal forces synchronized the Moon\'s rotation with its orbit (tidal locking)', correct: true },
      { id: 'b', text: 'The Moon doesn\'t rotate at all' },
      { id: 'c', text: 'Pure coincidence - rotation and orbit just happen to match' },
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
              🔄 New Twist: Tidal Locking
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            We always see the same face of the Moon from Earth. The &quot;dark side&quot; isn&apos;t dark - we just never see it! Why?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Think about it: For us to always see the same side, the Moon must rotate exactly once per orbit. How did that happen?
            </p>
            <svg width={isMobile ? 320 : 460} height={200} viewBox={`0 0 ${isMobile ? 320 : 460} 200`} style={{ margin: '0 auto', display: 'block' }}>
              <title>Tidal Locking Comparison - Locked vs Unlocked Moon</title>
              {/* Background */}
              <rect width={isMobile ? 320 : 460} height={200} fill="#0f172a" rx="8" />
              {/* Label: Tidally Locked */}
              <text x={isMobile ? 80 : 115} y="20" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="600">Tidally Locked</text>
              {/* Earth */}
              <circle cx={isMobile ? 20 : 30} cy="100" r="14" fill="#3b82f6" />
              <text x={isMobile ? 20 : 30} y="125" textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>
              {/* Moon 1 (locked) - always same face */}
              <circle cx={isMobile ? 80 : 115} cy="60" r="12" fill="#9ca3af" />
              <ellipse cx={isMobile ? 80 : 115} cy="60" rx="5" ry="4" fill="#6b7280" />
              <text x={isMobile ? 80 : 115} y="82" textAnchor="middle" fill="#9ca3af" fontSize="11">Same face</text>
              <circle cx={isMobile ? 80 : 115} cy="140" r="12" fill="#9ca3af" />
              <ellipse cx={isMobile ? 80 : 115} cy="140" rx="5" ry="4" fill="#6b7280" />
              <text x={isMobile ? 80 : 115} y="162" textAnchor="middle" fill="#9ca3af" fontSize="11">Same face</text>
              {/* Orbit arrow */}
              <ellipse cx={isMobile ? 80 : 115} cy="100" rx="40" ry="40" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              {/* Divider */}
              <line x1={isMobile ? 160 : 230} y1="10" x2={isMobile ? 160 : 230} y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              {/* Label: Not Locked */}
              <text x={isMobile ? 240 : 345} y="20" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Not Locked</text>
              {/* Earth 2 */}
              <circle cx={isMobile ? 175 : 250} cy="100" r="14" fill="#3b82f6" />
              <text x={isMobile ? 175 : 250} y="125" textAnchor="middle" fill="#60a5fa" fontSize="11">Earth</text>
              {/* Moon 2 (unlocked) - different face each orbit */}
              <circle cx={isMobile ? 240 : 345} cy="60" r="12" fill="#9ca3af" />
              <ellipse cx={isMobile ? 240 : 358} cy="57" rx="5" ry="4" fill="#6b7280" transform={`rotate(45, ${isMobile ? 240 : 345}, 60)`} />
              <text x={isMobile ? 240 : 345} y="82" textAnchor="middle" fill="#9ca3af" fontSize="11">Diff. face</text>
              <circle cx={isMobile ? 240 : 345} cy="140" r="12" fill="#9ca3af" />
              <ellipse cx={isMobile ? 253 : 358} cy="137" rx="5" ry="4" fill="#6b7280" transform={`rotate(-45, ${isMobile ? 240 : 345}, 140)`} />
              <text x={isMobile ? 240 : 345} y="162" textAnchor="middle" fill="#9ca3af" fontSize="11">Diff. face</text>
              {/* Orbit arrow 2 */}
              <ellipse cx={isMobile ? 240 : 345} cy="100" rx="40" ry="40" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Effect
            </button>
          )}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
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
            Tidal Locking Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare tidally locked vs unlocked rotation
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <TidalLockingVisualization />
            </div>

            {/* Orbital position slider */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Orbital Position: {(moonAngle * 180 / Math.PI).toFixed(0)}°
              </label>
              <input
                type="range"
                min="0"
                max="3.14"
                step="0.1"
                value={moonAngle}
                onChange={(e) => {
                  playSound('click');
                  setMoonAngle(parseFloat(e.target.value));
                  if (isTidallyLocked) {
                    setMoonRotation(parseFloat(e.target.value));
                  }
                }}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none' as const,
                  touchAction: 'pan-y',
                  accentColor: '#3b82f6',
                }}
              />
            </div>

            {/* Toggle buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => { playSound('click'); setIsTidallyLocked(true); }}
                style={{
                  padding: '14px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isTidallyLocked ? colors.success : colors.bgSecondary,
                  color: isTidallyLocked ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔒 Tidally Locked
              </button>
              <button
                onClick={() => { playSound('click'); setIsTidallyLocked(false); }}
                style={{
                  padding: '14px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: !isTidallyLocked ? colors.error : colors.bgSecondary,
                  color: !isTidallyLocked ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔓 Not Locked
              </button>
            </div>

            {/* Explanation */}
            <div style={{
              background: isTidallyLocked ? `${colors.success}11` : `${colors.error}11`,
              border: `1px solid ${isTidallyLocked ? colors.success : colors.error}33`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: isTidallyLocked ? colors.success : colors.error, margin: 0 }}>
                {isTidallyLocked ? (
                  <>
                    <strong>Tidally Locked:</strong> The Moon rotates exactly once per orbit (27.3 days).
                    The red arrow (Moon&apos;s &quot;front&quot;) always points toward Earth!
                  </>
                ) : (
                  <>
                    <strong>Not Locked:</strong> The Moon rotates faster than it orbits.
                    Different sides would face Earth over time.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Process
          </button>
          </div>
        </div>

        {renderBottomNav()}
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
            How Tidal Locking Works
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Moon IS Rotating</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Common misconception: the Moon doesn&apos;t rotate. It DOES rotate - exactly once every 27.3 days, which is also its orbital period. That&apos;s why we always see the same face.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚙️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Tidal Friction</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Earth raises tidal bulges on the Moon (solid rock can deform too!). If the Moon rotated faster than it orbited, friction from these bulges would slow its rotation until synchronized.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⏰</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Earth Is Slowing Too</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The Moon&apos;s gravity creates tidal bulges on Earth that act as a brake on our rotation. Days are getting longer by ~2 milliseconds per century. The Moon is moving away at 3.8 cm/year!
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔮</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Far Future</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Eventually, Earth will also become tidally locked to the Moon. Days will be a month long, and the Moon will hang motionless in the sky - visible from only one hemisphere forever!
              </p>
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Your prediction: <span style={{ color: twistPrediction === 'a' ? colors.success : colors.error, fontWeight: 600 }}>
                {twistPrediction === 'a' ? '✓ Correct!' : '✗ The answer was tidal locking'}
              </span>
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
          </div>
        </div>

        {renderBottomNav()}
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
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
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
                How Tidal Forces Connect:
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
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                Real-World Examples:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.examples.join(' • ')}
              </p>
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: `1px solid ${app.color}33`,
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>

            {/* Got It button for current app */}
            {!completedApps[selectedApp] && (
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
                Got It - Continue
              </button>
            )}
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
        </div>

        {renderBottomNav()}
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
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand tidal forces and their cosmic effects!'
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
          {renderBottomNav()}
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

        {renderBottomNav()}
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
          Tidal Forces Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand one of gravity&apos;s most subtle and far-reaching effects in the universe.
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
              'TWO tidal bulges from differential gravity',
              'Tidal force depends on gravity gradient (1/r cubed)',
              'Tidal locking synchronizes rotation with orbit',
              'Tidal heating powers volcanism on moons',
              'Earth\'s days are slowly getting longer',
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default TidalForcesRenderer;
