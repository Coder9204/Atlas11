'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TERMINAL VELOCITY RENDERER - Complete 10-Phase Premium Physics Game
// Understanding terminal velocity through coffee filter experiments
// ============================================================================

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

interface TerminalVelocityRendererProps {
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

const realWorldApps = [
  {
    icon: '🪂',
    title: 'Parachute Design',
    short: 'Engineering safe descent rates',
    tagline: 'Slowing down to save lives',
    description: 'Parachutes are precisely engineered to create enough drag to reduce terminal velocity to safe landing speeds. Canopy size, shape, and porosity all determine the final descent rate.',
    connection: 'Parachute design directly applies terminal velocity equations. The canopy area and drag coefficient must reduce terminal velocity from 200+ km/h to about 20 km/h for safe landing.',
    howItWorks: 'Ram-air parachutes inflate to create airfoil shapes with high drag and some lift. Slider mechanisms control opening shock. Multiple stages can reduce velocity gradually.',
    stats: [
      { value: '5m/s', label: 'Safe landing speed', icon: '🎯' },
      { value: '28m²', label: 'Typical main canopy', icon: '📐' },
      { value: '1.4', label: 'Parachute Cd', icon: '💨' }
    ],
    examples: ['Military airborne', 'Recreational skydiving', 'Cargo drops', 'Emergency ejection'],
    companies: ['Performance Designs', 'PD', 'Aerodyne', 'UPT'],
    futureImpact: 'Autonomous precision-guided parachutes will enable accurate delivery of supplies anywhere on Earth, including disaster relief to inaccessible areas.',
    color: '#3b82f6'
  },
  {
    icon: '🚀',
    title: 'Spacecraft Reentry',
    short: 'Surviving atmospheric braking',
    tagline: 'From orbital speed to touchdown',
    description: 'Spacecraft returning from orbit use atmospheric drag to slow from 28,000 km/h to landing speed. Heat shields, parachutes, and retrorockets work together to manage the deceleration.',
    connection: 'Reentry vehicles intentionally maximize drag to slow down. Blunt body shapes create high drag coefficients. The balance between drag heating and deceleration determines safe reentry trajectories.',
    howItWorks: 'Blunt heat shields create a strong bow shock that keeps hot gases away. Peak heating occurs before peak deceleration. Parachutes deploy once velocity and density allow textile survival.',
    stats: [
      { value: '28000km/h', label: 'Orbital velocity', icon: '🌍' },
      { value: '4G', label: 'Peak deceleration', icon: '⚡' },
      { value: '1650°C', label: 'Peak heating', icon: '🔥' }
    ],
    examples: ['SpaceX Dragon', 'Soyuz capsule', 'Space Shuttle', 'Mars landers'],
    companies: ['SpaceX', 'Roscosmos', 'NASA', 'Blue Origin'],
    futureImpact: 'Inflatable heat shields and precision-guided parafoils will enable landing anywhere on Earth or Mars with pinpoint accuracy.',
    color: '#f59e0b'
  },
  {
    icon: '🌧️',
    title: 'Raindrop Physics',
    short: 'Understanding precipitation dynamics',
    tagline: 'Why big drops fall faster',
    description: 'Raindrops of different sizes reach different terminal velocities, affecting weather radar interpretation, soil erosion, and agricultural planning. Large drops fall faster but also break up.',
    connection: 'Raindrop terminal velocity depends on the balance between gravity (proportional to volume) and drag (proportional to area). Larger drops fall faster until they become unstable.',
    howItWorks: 'Small drops (<1mm) are spherical with low Reynolds number drag. Larger drops flatten and oscillate. Above 5mm, drops break up due to aerodynamic pressure. Terminal velocity ranges from 2-9 m/s.',
    stats: [
      { value: '9m/s', label: 'Max raindrop speed', icon: '💧' },
      { value: '5mm', label: 'Max stable drop size', icon: '📏' },
      { value: '0.45', label: 'Drop drag coefficient', icon: '💨' }
    ],
    examples: ['Weather radar', 'Soil erosion studies', 'Aircraft icing', 'Agricultural spraying'],
    companies: ['NOAA', 'Weather companies', 'Agricultural tech', 'Aviation safety'],
    futureImpact: 'Better raindrop physics models will improve weather forecasting and enable precision agriculture with optimized irrigation and pesticide application.',
    color: '#06b6d4'
  },
  {
    icon: '⚽',
    title: 'Sports Aerodynamics',
    short: 'Understanding ball flight through air',
    tagline: 'When drag determines the game',
    description: 'Every sport with a ball involves terminal velocity physics. Golf balls, baseballs, and soccer balls are designed with specific dimple patterns and surface textures to optimize flight.',
    connection: 'Ball sports exploit the drag equation. Golf ball dimples reduce drag by triggering turbulent boundary layers. Spin affects drag and creates lift through the Magnus effect.',
    howItWorks: 'Smooth balls transition to turbulent flow late, creating high drag. Dimples trip the boundary layer early, reducing wake size and drag. Seams on baseballs allow pitchers to manipulate airflow.',
    stats: [
      { value: '50%', label: 'Drag reduction from dimples', icon: '⛳' },
      { value: '160km/h', label: 'Fastest baseball pitch', icon: '⚾' },
      { value: '500', label: 'Golf ball dimples', icon: '🔘' }
    ],
    examples: ['Golf ball design', 'Baseball pitching', 'Soccer free kicks', 'Tennis serves'],
    companies: ['Titleist', 'Callaway', 'Rawlings', 'Wilson'],
    futureImpact: 'Smart sports equipment with active surface control will adapt to conditions in real-time, optimizing performance for each shot or throw.',
    color: '#22c55e'
  }
];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  filter: '#d4a574',
  filterDark: '#a67c52',
  air: '#60a5fa',
  gravity: '#ef4444',
};

const TerminalVelocityRenderer: React.FC<TerminalVelocityRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [currentPhase, setCurrentPhase] = useState<Phase>(getInitialPhase());
  const phase = currentPhase;

  // Event emitter helper
  const emitEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: Record<string, unknown> = {}
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'Terminal Velocity',
        gameTitle: 'Terminal Velocity',
        details,
        timestamp: Date.now(),
      });
    }
  }, [onGameEvent]);

  // Phase change tracking
  useEffect(() => {
    emitEvent('phase_changed', { phase });
  }, [phase, emitEvent]);

  // Sync external gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setCurrentPhase(gamePhase as Phase);
    }
  }, [gamePhase]);
  // Simulation state
  const [numFilters, setNumFilters] = useState(1);
  const [airDensity, setAirDensity] = useState(1.2); // kg/m^3
  const [isDropped, setIsDropped] = useState(false);
  const [time, setTime] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [position, setPosition] = useState(0);
  const [velocityHistory, setVelocityHistory] = useState<{t: number, v: number}[]>([]);
  const [isCrumpled, setIsCrumpled] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Physics constants
  const g = 9.81; // m/s^2
  const filterMass = 0.001; // 1 gram per filter
  const filterArea = 0.02; // m^2 (roughly 16cm diameter)
  const dragCoefficient = isCrumpled ? 0.47 : 1.2; // sphere vs flat disk
  const crumpledArea = 0.005; // much smaller when crumpled

  const effectiveArea = isCrumpled ? crumpledArea : filterArea;
  const totalMass = numFilters * filterMass;

  // Terminal velocity: v_t = sqrt(2mg / (rho * A * Cd))
  const terminalVelocity = Math.sqrt((2 * totalMass * g) / (airDensity * effectiveArea * dragCoefficient));

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setIsDropped(false);
    setTime(0);
    setVelocity(0);
    setPosition(0);
    setVelocityHistory([]);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Drop the filter
  const dropFilter = useCallback(() => {
    resetSimulation();
    setIsDropped(true);
    lastTimeRef.current = performance.now();
    setVelocityHistory([{ t: 0, v: 0 }]);
    emitEvent('button_clicked', { action: 'drop_filter', numFilters, airDensity, isCrumpled });
    playSound('click');
  }, [resetSimulation, emitEvent, numFilters, airDensity, isCrumpled]);

  const [isMobile, setIsMobile] = useState(false);

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

  // Animation loop
  useEffect(() => {
    if (!isDropped) return;

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;

      setTime(prev => {
        const newTime = prev + dt;
        if (newTime > 5) {
          setIsDropped(false);
          return prev;
        }
        return newTime;
      });

      setVelocity(prev => {
        // Drag force: F_d = 0.5 * rho * v^2 * Cd * A
        const dragForce = 0.5 * airDensity * prev * prev * dragCoefficient * effectiveArea;
        // Net acceleration: a = g - (F_d / m)
        const acceleration = g - (dragForce / totalMass);
        const newVelocity = Math.max(0, prev + acceleration * dt);
        return newVelocity;
      });

      setPosition(prev => prev + velocity * dt);

      setVelocityHistory(prev => {
        const newHistory = [...prev, { t: time, v: velocity }];
        // Keep last 100 points for performance
        if (newHistory.length > 100) newHistory.shift();
        return newHistory;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDropped, velocity, time, airDensity, dragCoefficient, effectiveArea, totalMass]);

  const predictions = [
    { id: 'double', label: 'Double the filters = double the terminal velocity' },
    { id: 'same', label: 'Terminal velocity stays exactly the same' },
    { id: 'sqrt', label: 'Terminal velocity increases by about 41% (square root of 2)' },
    { id: 'half', label: 'Terminal velocity decreases (more filters = more drag)' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Shape doesn\'t matter - same mass means same speed' },
    { id: 'faster', label: 'Crumpled falls faster - much smaller area catches less air' },
    { id: 'slower', label: 'Crumpled falls slower - tumbles and catches more air' },
    { id: 'erratic', label: 'Falls at the same terminal speed but reaches it faster' },
  ];

  const transferApplications = [
    {
      title: 'Parachute Design',
      description: 'Parachutes use large area and high drag coefficient to minimize terminal velocity, allowing safe landings.',
      question: 'How does a skydiver control descent speed with a parachute?',
      answer: 'By changing the effective area through steering toggles that reshape the canopy, or by using different parachute sizes. The terminal velocity scales inversely with the square root of area.',
    },
    {
      title: 'Skydiver Body Position',
      description: 'Skydivers can vary their speed from 50 to 300+ mph by changing body position.',
      question: 'Why does a head-down position make skydivers fall faster than belly-to-earth?',
      answer: 'Head-down presents much less cross-sectional area (roughly 1/4 as much) to the airflow. Since v_t proportional to 1/sqrt(A), reducing area by 4x doubles terminal velocity.',
    },
    {
      title: 'Raindrop Size and Speed',
      description: 'Small raindrops fall at about 2 m/s while large drops reach 9 m/s.',
      question: 'Why don\'t all raindrops fall at the same speed?',
      answer: 'Larger drops have more mass relative to their surface area (mass ~ r^3, area ~ r^2). This higher mass-to-area ratio gives them higher terminal velocity.',
    },
    {
      title: 'Seed Dispersal',
      description: 'Dandelion seeds, maple samaras, and other seeds use air resistance to travel far from parent plants.',
      question: 'How do dandelion seeds achieve such low terminal velocities?',
      answer: 'The fluffy pappus creates enormous drag area relative to the tiny seed mass. This extreme area-to-mass ratio results in terminal velocities under 0.5 m/s.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is terminal velocity?',
      options: [
        { text: 'The maximum speed any object can reach while falling', correct: false },
        { text: 'The speed at which drag force equals gravitational force', correct: true },
        { text: 'The speed at which air becomes too thick to penetrate', correct: false },
        { text: 'The velocity at which objects disintegrate from friction', correct: false },
      ],
    },
    {
      question: 'If you stack 4 coffee filters instead of 1, the terminal velocity:',
      options: [
        { text: 'Quadruples (4x faster)', correct: false },
        { text: 'Doubles (2x faster)', correct: true },
        { text: 'Stays the same', correct: false },
        { text: 'Increases by 4x but area increases too, so net effect is small', correct: false },
      ],
    },
    {
      question: 'At terminal velocity, the acceleration of a falling object is:',
      options: [
        { text: '9.8 m/s^2 (gravity)', correct: false },
        { text: 'Constantly increasing', correct: false },
        { text: 'Zero', correct: true },
        { text: 'Negative (slowing down)', correct: false },
      ],
    },
    {
      question: 'How does drag force change with velocity?',
      options: [
        { text: 'Drag is constant regardless of speed', correct: false },
        { text: 'Drag increases linearly with velocity', correct: false },
        { text: 'Drag increases with the square of velocity', correct: true },
        { text: 'Drag decreases as velocity increases', correct: false },
      ],
    },
    {
      question: 'A crumpled coffee filter falls faster than a flat one because:',
      options: [
        { text: 'Crumpling increases its mass', correct: false },
        { text: 'Crumpling dramatically reduces its cross-sectional area', correct: true },
        { text: 'Crumpled shapes are more aerodynamic', correct: false },
        { text: 'The air cannot reach the crumpled center', correct: false },
      ],
    },
    {
      question: 'On the Moon (no atmosphere), a hammer and feather dropped together:',
      options: [
        { text: 'Hammer falls faster due to greater mass', correct: false },
        { text: 'Feather falls faster due to less mass', correct: false },
        { text: 'Both fall at exactly the same rate', correct: true },
        { text: 'Neither falls - they float', correct: false },
      ],
    },
    {
      question: 'What happens to terminal velocity if air density doubles?',
      options: [
        { text: 'Terminal velocity doubles', correct: false },
        { text: 'Terminal velocity halves', correct: false },
        { text: 'Terminal velocity decreases by about 29% (factor of 1/sqrt(2))', correct: true },
        { text: 'Terminal velocity is unaffected by air density', correct: false },
      ],
    },
    {
      question: 'The drag coefficient (Cd) depends mainly on:',
      options: [
        { text: 'The mass of the object', correct: false },
        { text: 'The shape of the object', correct: true },
        { text: 'The color of the object', correct: false },
        { text: 'The temperature of the object', correct: false },
      ],
    },
    {
      question: 'Why does a velocity-time graph for a falling object curve and then flatten?',
      options: [
        { text: 'Gravity weakens with distance', correct: false },
        { text: 'Air gets thinner at lower altitudes', correct: false },
        { text: 'Increasing drag reduces acceleration until it reaches zero', correct: true },
        { text: 'The object runs out of gravitational potential energy', correct: false },
      ],
    },
    {
      question: 'A skydiver in spread-eagle position has terminal velocity of 55 m/s. In head-down position (1/4 the area), terminal velocity is approximately:',
      options: [
        { text: '55 m/s (same mass, same speed)', correct: false },
        { text: '110 m/s (double)', correct: true },
        { text: '220 m/s (quadruple)', correct: false },
        { text: '27.5 m/s (half)', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    emitEvent('answer_submitted', { questionIndex, optionIndex });
    playSound('click');
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8) {
      emitEvent('correct_answer', { score, total: testQuestions.length });
      playSound('success');
    } else {
      emitEvent('incorrect_answer', { score, total: testQuestions.length });
      playSound('failure');
    }
  };

  const renderVisualization = (interactive: boolean, showCrumple: boolean = false) => {
    const width = 700;
    const height = 400;
    const dropZoneWidth = 280;
    const dropZoneHeight = 320;
    const graphWidth = 180;
    const graphHeight = 140;

    // Calculate filter position for animation
    const maxFallDistance = dropZoneHeight - 80;
    const filterY = 50 + Math.min(position * 25, maxFallDistance);

    // Calculate forces for arrows
    const gravityForce = totalMass * g;
    const dragForce = 0.5 * airDensity * velocity * velocity * dragCoefficient * effectiveArea;
    const maxForce = gravityForce * 1.5;
    const gravityArrowLength = Math.min((gravityForce / maxForce) * 60, 60);
    const dragArrowLength = Math.min((dragForce / maxForce) * 60, 60);

    // Graph scaling
    const graphMaxV = Math.ceil(terminalVelocity * 1.3);
    const graphMaxT = 5;

    // Air particle positions for resistance visualization
    const airParticles = Array.from({ length: 20 }, (_, i) => ({
      x: 80 + (i % 5) * 35,
      y: filterY - 60 + Math.floor(i / 5) * 20 + Math.sin(time * 3 + i) * 5,
      size: 3 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.3
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '800px' }}
        >
          {/* ========== PREMIUM DEFS SECTION ========== */}
          <defs>
            {/* Sky gradient with atmospheric depth - 6 color stops */}
            <linearGradient id="tvelSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="15%" stopColor="#2563eb" />
              <stop offset="35%" stopColor="#3b82f6" />
              <stop offset="55%" stopColor="#60a5fa" />
              <stop offset="80%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>

            {/* Ground gradient with depth - 5 color stops */}
            <linearGradient id="tvelGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#65a30d" />
              <stop offset="20%" stopColor="#4d7c0f" />
              <stop offset="50%" stopColor="#3f6212" />
              <stop offset="80%" stopColor="#365314" />
              <stop offset="100%" stopColor="#1a2e05" />
            </linearGradient>

            {/* Coffee filter gradient - warm tones with depth */}
            <linearGradient id="tvelFilterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="25%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#d4a574" />
              <stop offset="75%" stopColor="#b8956c" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Crumpled filter radial gradient */}
            <radialGradient id="tvelCrumpledGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="30%" stopColor="#fde68a" />
              <stop offset="60%" stopColor="#d4a574" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>

            {/* Gravity force arrow gradient */}
            <linearGradient id="tvelGravityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Drag force arrow gradient */}
            <linearGradient id="tvelDragGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Air resistance particle radial gradient */}
            <radialGradient id="tvelAirParticleGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>

            {/* Graph panel gradient */}
            <linearGradient id="tvelGraphBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Velocity curve glow gradient */}
            <linearGradient id="tvelVelocityCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Terminal velocity line gradient */}
            <linearGradient id="tvelTerminalLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="tvelInfoPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Object glow filter */}
            <filter id="tvelObjectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force arrow glow filter */}
            <filter id="tvelForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Air particle glow filter */}
            <filter id="tvelAirGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Curve glow filter */}
            <filter id="tvelCurveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Drop shadow filter */}
            <filter id="tvelDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
            </filter>

            {/* Panel shadow filter */}
            <filter id="tvelPanelShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* ========== BACKGROUND ========== */}
          {/* Sky with atmospheric gradient */}
          <rect x="0" y="0" width={width} height={height - 50} fill="url(#tvelSkyGradient)" />

          {/* Subtle clouds */}
          <ellipse cx="100" cy="40" rx="60" ry="20" fill="white" opacity="0.3" />
          <ellipse cx="130" cy="35" rx="40" ry="15" fill="white" opacity="0.4" />
          <ellipse cx="550" cy="60" rx="70" ry="25" fill="white" opacity="0.25" />
          <ellipse cx="590" cy="55" rx="45" ry="18" fill="white" opacity="0.35" />

          {/* Ground with grass texture */}
          <rect x="0" y={height - 50} width={width} height="50" fill="url(#tvelGroundGradient)" />
          {/* Grass texture lines */}
          {Array.from({ length: 40 }, (_, i) => (
            <line
              key={`grass-${i}`}
              x1={i * 18 + 5}
              y1={height - 50}
              x2={i * 18 + 5 + (Math.random() - 0.5) * 6}
              y2={height - 50 - 8 - Math.random() * 10}
              stroke="#4d7c0f"
              strokeWidth="2"
              opacity={0.6 + Math.random() * 0.4}
            />
          ))}

          {/* ========== DROP ZONE ========== */}
          {/* Drop zone frame */}
          <rect
            x="30"
            y="20"
            width={dropZoneWidth}
            height={dropZoneHeight}
            fill="rgba(255,255,255,0.1)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
            rx="12"
            strokeDasharray="8,4"
          />

          {/* Height markers with better styling */}
          {[0, 2, 4, 6].map((i) => (
            <g key={`height-${i}`}>
              <line
                x1="22"
                y1={35 + i * 45}
                x2="32"
                y2={35 + i * 45}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="2"
              />
              <text
                x="10"
                y={39 + i * 45}
                fill="white"
                fontSize="11"
                fontWeight="bold"
                textAnchor="end"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
              >
                {(6 - i) * 0.5}m
              </text>
            </g>
          ))}

          {/* ========== AIR RESISTANCE VISUALIZATION ========== */}
          {isDropped && velocity > 0.2 && (
            <g filter="url(#tvelAirGlow)">
              {airParticles.map((particle, i) => (
                <circle
                  key={`air-${i}`}
                  cx={particle.x}
                  cy={particle.y}
                  r={particle.size}
                  fill="url(#tvelAirParticleGradient)"
                  opacity={particle.opacity * Math.min(velocity / terminalVelocity, 1)}
                >
                  <animate
                    attributeName="cy"
                    values={`${particle.y};${particle.y - 15};${particle.y}`}
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
              {/* Air flow lines */}
              {[-30, -15, 0, 15, 30].map((offset, i) => (
                <line
                  key={`airflow-${i}`}
                  x1={170 + offset}
                  y1={filterY - 40}
                  x2={170 + offset}
                  y2={filterY - 80 - velocity * 3}
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                  strokeOpacity={0.3 * Math.min(velocity / terminalVelocity, 1)}
                  strokeDasharray="4,4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-8"
                    dur="0.3s"
                    repeatCount="indefinite"
                  />
                </line>
              ))}
            </g>
          )}

          {/* ========== FALLING OBJECT (COFFEE FILTER) ========== */}
          <g transform={`translate(170, ${filterY})`} filter="url(#tvelObjectGlow)">
            {showCrumple && isCrumpled ? (
              // Crumpled filter - irregular ball with premium gradient
              <g filter="url(#tvelDropShadow)">
                <ellipse cx="0" cy="0" rx="16" ry="14" fill="url(#tvelCrumpledGradient)" />
                <ellipse cx="-4" cy="-4" rx="12" ry="10" fill="#fde68a" opacity="0.5" />
                {/* Crumple texture lines */}
                <path d="M-8,-6 Q-2,-10 8,-5" stroke="#92400e" fill="none" strokeWidth="1.5" opacity="0.6" />
                <path d="M-6,3 Q2,8 7,2" stroke="#92400e" fill="none" strokeWidth="1.5" opacity="0.6" />
                <path d="M-3,-2 Q0,0 3,-1" stroke="#b45309" fill="none" strokeWidth="1" opacity="0.4" />
              </g>
            ) : (
              // Flat filter(s) - cone shape with premium gradient
              <g filter="url(#tvelDropShadow)">
                {Array.from({ length: numFilters }).map((_, i) => (
                  <g key={`filter-${i}`} transform={`translate(0, ${i * 3})`}>
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={38 - i * 1.5}
                      ry={10 - i * 0.4}
                      fill="url(#tvelFilterGradient)"
                      stroke="#92400e"
                      strokeWidth="1.5"
                      opacity={1 - i * 0.08}
                    />
                  </g>
                ))}
                {/* Filter ridges with gradient */}
                {[-28, -18, -8, 0, 8, 18, 28].map((x, i) => (
                  <line
                    key={`ridge-${i}`}
                    x1={x}
                    y1={-7}
                    x2={x * 0.85}
                    y2={7}
                    stroke="#b45309"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                ))}
                {/* Center highlight */}
                <ellipse cx="0" cy="-2" rx="15" ry="4" fill="white" opacity="0.2" />
              </g>
            )}

            {/* ========== FORCE ARROWS WITH PREMIUM GRADIENTS ========== */}
            {isDropped && velocity > 0.1 && (
              <g>
                {/* Gravity arrow (red gradient, pointing down) */}
                <g filter="url(#tvelForceGlow)">
                  <line
                    x1="0"
                    y1={20}
                    x2="0"
                    y2={20 + gravityArrowLength}
                    stroke="url(#tvelGravityGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`0,${28 + gravityArrowLength} -8,${18 + gravityArrowLength} 8,${18 + gravityArrowLength}`}
                    fill="url(#tvelGravityGradient)"
                  />
                  <rect
                    x="12"
                    y={15 + gravityArrowLength / 2}
                    width="28"
                    height="18"
                    rx="4"
                    fill="rgba(239, 68, 68, 0.9)"
                  />
                  <text
                    x="26"
                    y={28 + gravityArrowLength / 2}
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    W
                  </text>
                </g>

                {/* Drag arrow (blue gradient, pointing up) */}
                <g filter="url(#tvelForceGlow)">
                  <line
                    x1="0"
                    y1={-20}
                    x2="0"
                    y2={-20 - dragArrowLength}
                    stroke="url(#tvelDragGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`0,${-28 - dragArrowLength} -8,${-18 - dragArrowLength} 8,${-18 - dragArrowLength}`}
                    fill="url(#tvelDragGradient)"
                  />
                  <rect
                    x="12"
                    y={-30 - dragArrowLength / 2}
                    width="28"
                    height="18"
                    rx="4"
                    fill="rgba(59, 130, 246, 0.9)"
                  />
                  <text
                    x="26"
                    y={-17 - dragArrowLength / 2}
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Fd
                  </text>
                </g>
              </g>
            )}
          </g>

          {/* ========== VELOCITY VS TIME GRAPH (absolute coords: gX=470, gY=30) ========== */}
          {(() => {
            const gX = width - graphWidth - 50; // 470
            const gY = 30;
            return (
              <g filter="url(#tvelPanelShadow)">
                {/* Graph background panel */}
                <rect
                  x={gX}
                  y={gY}
                  width={graphWidth}
                  height={graphHeight + 10}
                  fill="url(#tvelGraphBgGradient)"
                  rx="12"
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Graph title */}
                <text
                  x={gX + graphWidth / 2}
                  y={gY + 15}
                  fill="#f8fafc"
                  fontSize="12"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  v-t Graph
                </text>

                {/* Graph area background */}
                <rect
                  x={gX + 35}
                  y={gY + 30}
                  width={graphWidth - 50}
                  height={graphHeight - 45}
                  fill="#020617"
                  rx="4"
                />

                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((frac, i) => (
                  <line
                    key={`hgrid-${i}`}
                    x1={gX + 35}
                    y1={gY + 30 + (graphHeight - 45) * frac}
                    x2={gX + graphWidth - 15}
                    y2={gY + 30 + (graphHeight - 45) * frac}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                ))}
                {[0.25, 0.5, 0.75].map((frac, i) => (
                  <line
                    key={`vgrid-${i}`}
                    x1={gX + 35 + (graphWidth - 50) * frac}
                    y1={gY + 30}
                    x2={gX + 35 + (graphWidth - 50) * frac}
                    y2={gY + graphHeight - 15}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                ))}

                {/* Axes */}
                <line
                  x1={gX + 35}
                  y1={gY + graphHeight - 15}
                  x2={gX + graphWidth - 15}
                  y2={gY + graphHeight - 15}
                  stroke="#64748b"
                  strokeWidth="2"
                />
                <line
                  x1={gX + 35}
                  y1={gY + 30}
                  x2={gX + 35}
                  y2={gY + graphHeight - 15}
                  stroke="#64748b"
                  strokeWidth="2"
                />

                {/* Axis labels */}
                <text
                  x={gX + graphWidth / 2 + 10}
                  y={gY + graphHeight + 5}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="middle"
                >
                  Time (s)
                </text>
                <text
                  x={gX + 8}
                  y={gY + (graphHeight - 15 + 30) / 2}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="middle"
                  transform={`rotate(-90, ${gX + 8}, ${gY + (graphHeight - 15 + 30) / 2})`}
                >
                  v(m/s)
                </text>

                {/* Baseline reference marker (v=0 starting point) */}
                <circle
                  cx={gX + 35}
                  cy={gY + graphHeight - 15}
                  r="4"
                  fill="#94a3b8"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={gX + 42}
                  y={gY + graphHeight - 10}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="bold"
                >
                  Start
                </text>

                {/* Terminal velocity reference line */}
                {(() => {
                  const tvY = gY + graphHeight - 15 - (terminalVelocity / graphMaxV) * (graphHeight - 45);
                  return (
                    <>
                      <line
                        x1={gX + 35}
                        y1={tvY}
                        x2={gX + graphWidth - 15}
                        y2={tvY}
                        stroke="url(#tvelTerminalLineGradient)"
                        strokeWidth="2"
                        strokeDasharray="6,3"
                      />
                      <rect
                        x={gX + graphWidth - 35}
                        y={tvY - 8}
                        width="22"
                        height="14"
                        rx="3"
                        fill="rgba(139, 92, 246, 0.8)"
                      />
                      <text
                        x={gX + graphWidth - 24}
                        y={tvY + 2}
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        vt
                      </text>
                    </>
                  );
                })()}

                {/* Velocity curve with glow */}
                {velocityHistory.length > 1 && (
                  <g filter="url(#tvelCurveGlow)">
                    <polyline
                      points={velocityHistory.map((pt) => {
                        const x = gX + 35 + (pt.t / graphMaxT) * (graphWidth - 50);
                        const y = gY + graphHeight - 15 - (pt.v / graphMaxV) * (graphHeight - 45);
                        return `${x},${Math.max(gY + 30, Math.min(gY + graphHeight - 15, y))}`;
                      }).join(' ')}
                      fill="none"
                      stroke="url(#tvelVelocityCurveGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {/* Y-axis values */}
                <text x={gX + 30} y={gY + graphHeight - 12} fill="#64748b" fontSize="11" textAnchor="end">0</text>
                <text x={gX + 30} y={gY + 35} fill="#64748b" fontSize="11" textAnchor="end">{graphMaxV.toFixed(1)}</text>
              </g>
            );
          })()}

          {/* ========== INFO PANEL (absolute coords: iX=470, iY=195) ========== */}
          {(() => {
            const iX = width - graphWidth - 50; // 470
            const iY = graphHeight + 55; // 195
            return (
              <g filter="url(#tvelPanelShadow)">
                <rect
                  x={iX}
                  y={iY}
                  width={graphWidth}
                  height="100"
                  fill="url(#tvelInfoPanelGradient)"
                  rx="12"
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Panel header */}
                <rect x={iX} y={iY} width={graphWidth} height="28" rx="12" fill="#1e293b" />
                <rect x={iX} y={iY + 14} width={graphWidth} height="14" fill="#1e293b" />
                <text
                  x={iX + graphWidth / 2}
                  y={iY + 18}
                  fill="#f8fafc"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {numFilters} Filter{numFilters > 1 ? 's' : ''} | {showCrumple && isCrumpled ? 'Crumpled' : 'Flat'}
                </text>

                {/* Current velocity */}
                <text x={iX + 10} y={iY + 46} fill="#94a3b8" fontSize="11">Current:</text>
                <text x={iX + graphWidth - 10} y={iY + 46} fill="#22c55e" fontSize="11" fontWeight="bold" textAnchor="end">
                  v={velocity.toFixed(2)}m/s
                </text>

                {/* Terminal velocity */}
                <text x={iX + 10} y={iY + 66} fill="#94a3b8" fontSize="11">Terminal:</text>
                <text x={iX + graphWidth - 10} y={iY + 66} fill="#a855f7" fontSize="11" fontWeight="bold" textAnchor="end">
                  vt={terminalVelocity.toFixed(2)}m/s
                </text>

                {/* Time elapsed */}
                <text x={iX + 10} y={iY + 86} fill="#94a3b8" fontSize="11">Time:</text>
                <text x={iX + graphWidth - 10} y={iY + 86} fill="#60a5fa" fontSize="11" fontWeight="bold" textAnchor="end">
                  t={time.toFixed(2)}s
                </text>
              </g>
            );
          })()}

          {/* ========== LEGEND (absolute coords: lX=470, lY=352) ========== */}
          {(() => {
            const lX = width - graphWidth - 50; // 470
            const lY = height - 48; // 352
            return (
              <g>
                <rect x={lX} y={lY} width={graphWidth} height="42" fill="url(#tvelInfoPanelGradient)" rx="8" stroke="#334155" strokeWidth="1" />
                <circle cx={lX + 12} cy={lY + 12} r="4" fill="url(#tvelGravityGradient)" />
                <text x={lX + 20} y={lY + 15} fill="#f8fafc" fontSize="11">Weight W=mg</text>
                <circle cx={lX + 12} cy={lY + 30} r="4" fill="url(#tvelDragGradient)" />
                <text x={lX + 20} y={lY + 33} fill="#f8fafc" fontSize="11">Drag Force ½ρv²CA</text>
              </g>
            );
          })()}

          {/* ========== DROP ZONE LABEL (absolute coords: 120-220, 10-32) ========== */}
          <rect x="120" y="10" width="100" height="22" rx="6" fill="rgba(15, 23, 42, 0.85)" />
          <text x="170" y="25" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">
            Drop Zone
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '12px' }}>
            <button
              onClick={dropFilter}
              disabled={isDropped}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                border: 'none',
                background: isDropped
                  ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: isDropped ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                boxShadow: isDropped ? 'none' : '0 4px 20px rgba(34, 197, 94, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              Drop Filter
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                border: '2px solid #8b5cf6',
                background: 'transparent',
                color: '#a855f7',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'all 0.2s ease',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showCrumple: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of Stacked Filters: {numFilters}
        </label>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          value={numFilters}
          onChange={(e) => {
            const newValue = parseInt(e.target.value);
            setNumFilters(newValue);
            resetSimulation();
            emitEvent('slider_changed', { slider: 'numFilters', value: newValue });
          }}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            accentColor: '#3b82f6'
          } as React.CSSProperties}
        />
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Increasing filters increases mass. More mass means terminal velocity increases by the square root of the number of filters (v ∝ √n).
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Air Density: {airDensity.toFixed(2)} kg/m^3
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={airDensity}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            setAirDensity(newValue);
            resetSimulation();
            emitEvent('slider_changed', { slider: 'airDensity', value: newValue });
          }}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            accentColor: '#3b82f6'
          } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>High altitude</span>
          <span>Sea level</span>
          <span>Dense</span>
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Higher air density increases drag force, which reduces terminal velocity. At high altitude, objects fall faster due to thinner air.
        </div>
      </div>

      {showCrumple && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Filter Shape:
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setIsCrumpled(false);
                resetSimulation();
                emitEvent('button_clicked', { action: 'set_shape', shape: 'flat' });
                playSound('click');
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: !isCrumpled ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: !isCrumpled ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
              }}
            >
              Flat (Open)
            </button>
            <button
              onClick={() => {
                setIsCrumpled(true);
                resetSimulation();
                emitEvent('button_clicked', { action: 'set_shape', shape: 'crumpled' });
                playSound('click');
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: isCrumpled ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: isCrumpled ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
              }}
            >
              Crumpled
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Terminal velocity: vt = sqrt(2mg / rhoACd) = {terminalVelocity.toFixed(2)} m/s
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          {numFilters} filter(s): mass = {(totalMass * 1000).toFixed(1)}g | vt proportional to sqrt(n)
        </div>
      </div>
    </div>
  );

  // Navigation handlers
  const handleNext = () => {
    const phaseIndex = validPhases.indexOf(phase);
    if (phaseIndex < validPhases.length - 1) {
      const nextPhase = validPhases[phaseIndex + 1];
      setCurrentPhase(nextPhase);
      emitEvent('button_clicked', { action: 'next', from: phase, to: nextPhase });
      playSound('transition');
    }
  };

  const handleBack = () => {
    const phaseIndex = validPhases.indexOf(phase);
    if (phaseIndex > 0) {
      const prevPhase = validPhases[phaseIndex - 1];
      setCurrentPhase(prevPhase);
      emitEvent('button_clicked', { action: 'back', from: phase, to: prevPhase });
      playSound('click');
    }
  };

  const handleDotClick = (targetPhase: Phase) => {
    setCurrentPhase(targetPhase);
    emitEvent('button_clicked', { action: 'navigate_dot', from: phase, to: targetPhase });
    playSound('click');
  };

  const renderNavigationDots = () => (
    <div style={{
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.9)',
      padding: '8px 16px',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
    }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => handleDotClick(p)}
          title={p.replace('_', ' ')}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: 'none',
            background: p === phase ? colors.accent : 'rgba(148, 163, 184, 0.4)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.2s ease',
          }}
          aria-label={`Go to ${p} phase`}
        />
      ))}
    </div>
  );

  const handlePhaseComplete = () => {
    handleNext();
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => {
    const phaseIndex = validPhases.indexOf(phase);
    const canGoBack = phaseIndex > 0;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        minHeight: '72px',
      }}>
        {canGoBack ? (
          <button
            onClick={handleBack}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: colors.textPrimary,
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Back
          </button>
        ) : <div />}

        <button
          onClick={handlePhaseComplete}
          disabled={disabled && !canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '16px',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, minHeight: '100dvh' }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 'bold' }}>
              Terminal Velocity
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              Stacking filters: double fall speed or not?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Drop a coffee filter and it floats gently down. The air resistance
                grows until it exactly balances gravity - then speed stays constant.
                This is terminal velocity!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                But what happens when you stack multiple filters together?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch the velocity graph - see how it curves toward the terminal velocity line!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next → Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A coffee filter falling through air. The red arrow shows weight (constant),
              the blue arrow shows drag force (grows with speed). When they balance,
              velocity stops increasing - that's terminal velocity.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you stack 2 coffee filters (double the mass), what happens to terminal velocity?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    emitEvent('prediction_made', { prediction: p.id, phase: 'predict' });
                    playSound('click');
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next → Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Terminal Velocity</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Stack filters and change air density to see how terminal velocity changes
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>1 filter vs 4 filters - is 4x mass = 4x speed?</li>
              <li>Watch the v-t graph curve flatten as terminal velocity is reached</li>
              <li>Lower air density (high altitude) - faster or slower?</li>
              <li>Notice the drag arrow grows until it matches the weight arrow</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <h4 style={{ color: colors.success, marginBottom: '8px' }}>Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Terminal velocity determines parachute design, raindrop speeds, seed dispersal, and skydiving safety. Understanding how mass and area affect fall speed is critical for aerospace engineering, weather prediction, and recreational aviation.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'sqrt';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, marginBottom: '8px' }}>
              {prediction
                ? `As you predicted ("${predictions.find(p => p.id === prediction)?.label || prediction}"), doubling mass increases terminal velocity by sqrt(2), about 41% faster - not double!`
                : 'You observed that doubling mass increases terminal velocity by sqrt(2), about 41% faster - not double!'
              }
            </p>
          </div>

          {/* Visual diagram showing force balance */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px' }}>
            <svg width="100%" height="300" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '600px' }}>
              <defs>
                <linearGradient id="reviewBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              <rect width="600" height="300" fill="url(#reviewBg)" rx="12" />

              {/* Title */}
              <text x="300" y="30" fill="#a855f7" fontSize="18" fontWeight="bold" textAnchor="middle">
                Terminal Velocity: Force Balance
              </text>

              {/* 1 Filter */}
              <g transform="translate(150, 100)">
                <text x="0" y="-35" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">1 Filter</text>
                <ellipse cx="0" cy="0" rx="30" ry="8" fill="#d4a574" stroke="#92400e" strokeWidth="2" />
                <line x1="0" y1="20" x2="0" y2="70" stroke="#ef4444" strokeWidth="4" markerEnd="url(#arrowRed)" />
                <text x="0" y="95" fill="#ef4444" fontSize="12" textAnchor="middle">W = mg</text>
                <line x1="0" y1="-20" x2="0" y2="-60" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowBlue)" />
                <text x="0" y="-75" fill="#3b82f6" fontSize="12" textAnchor="middle">Drag</text>
                <text x="0" y="115" fill="#10b981" fontSize="13" fontWeight="bold" textAnchor="middle">vt = v₀</text>
              </g>

              {/* 2 Filters */}
              <g transform="translate(450, 100)">
                <text x="0" y="-35" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">2 Filters</text>
                <ellipse cx="0" cy="0" rx="30" ry="8" fill="#d4a574" stroke="#92400e" strokeWidth="2" />
                <ellipse cx="0" cy="3" rx="29" ry="7" fill="#d4a574" stroke="#92400e" strokeWidth="1.5" opacity="0.8" />
                <line x1="0" y1="20" x2="0" y2="85" stroke="#ef4444" strokeWidth="4" markerEnd="url(#arrowRed)" />
                <text x="0" y="105" fill="#ef4444" fontSize="12" textAnchor="middle">W = 2mg</text>
                <line x1="0" y1="-20" x2="0" y2="-73" stroke="#3b82f6" strokeWidth="4" markerEnd="url(#arrowBlue)" />
                <text x="0" y="-85" fill="#3b82f6" fontSize="12" textAnchor="middle">Drag (2x)</text>
                <text x="0" y="125" fill="#10b981" fontSize="13" fontWeight="bold" textAnchor="middle">vt = √2 · v₀</text>
                <text x="0" y="145" fill="#94a3b8" fontSize="11" textAnchor="middle">(1.41x faster)</text>
              </g>

              {/* Arrow markers */}
              <defs>
                <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                  <polygon points="0,0 10,5 0,10" fill="#ef4444" />
                </marker>
                <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                  <polygon points="0,0 10,5 0,10" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Explanation */}
              <text x="300" y="230" fill="#94a3b8" fontSize="12" textAnchor="middle">
                At terminal velocity: Drag Force = Weight
              </text>
              <text x="300" y="250" fill="#94a3b8" fontSize="12" textAnchor="middle">
                Double mass → Drag must double → vt increases by √2
              </text>
              <text x="300" y="270" fill="#a855f7" fontSize="11" fontWeight="bold" textAnchor="middle">
                vt ∝ √m (not directly proportional to mass!)
              </text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Terminal Velocity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Force Balance:</strong> At terminal velocity,
                drag equals weight: Fd = mg. The object falls at constant velocity with zero acceleration.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Drag Equation:</strong> Fd = (1/2) * rho * v^2 * Cd * A.
                Drag grows with velocity squared, which is why falling objects eventually stop accelerating.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Terminal Velocity Formula:</strong> vt = sqrt(2mg / (rho * A * Cd)).
                Since vt depends on sqrt(m), doubling mass only increases vt by sqrt(2) = 1.41x.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Stacking n Filters:</strong> vt is proportional to sqrt(n).
                4 filters = 2x terminal velocity, 9 filters = 3x terminal velocity.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you crumple the filter instead of keeping it flat?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Same coffee filter, same mass - but now crumpled into a loose ball instead
              of keeping its flat, open shape. The paper weighs exactly the same either way.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Flat vs crumpled filter (same mass) - what happens to terminal velocity?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                    emitEvent('prediction_made', { prediction: p.id, phase: 'twist_predict' });
                    playSound('click');
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Shape Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle between flat and crumpled to see the dramatic difference
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Shape matters hugely! Crumpling reduces cross-sectional area by ~4x, which
              roughly doubles terminal velocity. Same mass, vastly different falling speed.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The crumpled filter falls much faster - shape (cross-sectional area) dominates!
            </p>
          </div>

          {/* Visual diagram showing shape effect */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px' }}>
            <svg width="100%" height="320" viewBox="0 0 600 320" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '600px' }}>
              <defs>
                <linearGradient id="twistReviewBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <radialGradient id="crumpledGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="60%" stopColor="#d4a574" />
                  <stop offset="100%" stopColor="#78350f" />
                </radialGradient>
              </defs>
              <rect width="600" height="320" fill="url(#twistReviewBg)" rx="12" />

              {/* Title */}
              <text x="300" y="30" fill="#f59e0b" fontSize="18" fontWeight="bold" textAnchor="middle">
                Shape Controls Terminal Velocity
              </text>

              {/* Flat Filter */}
              <g transform="translate(150, 120)">
                <text x="0" y="-45" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">Flat Filter</text>
                <ellipse cx="0" cy="0" rx="40" ry="10" fill="#d4a574" stroke="#92400e" strokeWidth="2" />
                <text x="0" y="30" fill="#94a3b8" fontSize="11" textAnchor="middle">Area = A</text>
                <text x="0" y="45" fill="#94a3b8" fontSize="11" textAnchor="middle">Cd = 1.2</text>

                {/* Air resistance visualization */}
                <path d="M -50,-25 L -50,-15" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <path d="M -35,-25 L -35,-15" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <path d="M -20,-25 L -20,-15" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <path d="M 20,-25 L 20,-15" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <path d="M 35,-25 L 35,-15" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <path d="M 50,-25 L 50,-15" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <text x="0" y="-35" fill="#60a5fa" fontSize="11" textAnchor="middle">Large drag</text>

                <text x="0" y="75" fill="#10b981" fontSize="13" fontWeight="bold" textAnchor="middle">vt = v₀</text>
                <text x="0" y="92" fill="#94a3b8" fontSize="11" textAnchor="middle">(Slow)</text>
              </g>

              {/* Crumpled Filter */}
              <g transform="translate(450, 120)">
                <text x="0" y="-45" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">Crumpled</text>
                <circle cx="0" cy="0" r="18" fill="url(#crumpledGrad)" stroke="#92400e" strokeWidth="2" />
                <path d="M-8,-6 Q-2,-10 8,-5" stroke="#92400e" fill="none" strokeWidth="1.5" opacity="0.6" />
                <path d="M-6,3 Q2,8 7,2" stroke="#92400e" fill="none" strokeWidth="1.5" opacity="0.6" />
                <text x="0" y="30" fill="#94a3b8" fontSize="11" textAnchor="middle">Area ≈ A/4</text>
                <text x="0" y="45" fill="#94a3b8" fontSize="11" textAnchor="middle">Cd = 0.47</text>

                {/* Less air resistance */}
                <path d="M -12,-25 L -12,-22" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
                <path d="M 0,-25 L 0,-22" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
                <path d="M 12,-25 L 12,-22" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
                <text x="0" y="-35" fill="#60a5fa" fontSize="11" textAnchor="middle">Small drag</text>

                <text x="0" y="75" fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle">vt ≈ 2.5·v₀</text>
                <text x="0" y="92" fill="#94a3b8" fontSize="11" textAnchor="middle">(Much faster!)</text>
              </g>

              {/* Downward arrows */}
              <g>
                <path d="M 150,180 L 150,210" stroke="#ef4444" strokeWidth="3" markerEnd="url(#twistArrowSlow)" />
                <path d="M 450,180 L 450,235" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#twistArrowFast)" />
              </g>

              {/* Arrow markers */}
              <defs>
                <marker id="twistArrowSlow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                  <polygon points="0,0 10,5 0,10" fill="#ef4444" />
                </marker>
                <marker id="twistArrowFast" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
                  <polygon points="0,0 12,6 0,12" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Formula explanation */}
              <rect x="50" y="250" width="500" height="55" fill="rgba(15, 23, 42, 0.8)" rx="8" />
              <text x="300" y="270" fill="#a855f7" fontSize="13" fontWeight="bold" textAnchor="middle">
                vt = √(2mg / ρACd)
              </text>
              <text x="300" y="288" fill="#94a3b8" fontSize="11" textAnchor="middle">
                vt ∝ 1/√A  and  vt ∝ 1/√Cd
              </text>
              <text x="300" y="303" fill="#f59e0b" fontSize="11" textAnchor="middle">
                Smaller area + lower Cd = Much higher terminal velocity!
              </text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Shape Matters So Much</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Area Effect:</strong> Terminal velocity
                is proportional to 1/sqrt(A). Reducing area by 4x doubles terminal velocity.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Drag Coefficient:</strong> A flat disk
                (Cd = 1.2) has much higher drag than a sphere (Cd = 0.47). Crumpling changes both
                area AND shape factor.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Combined Effect:</strong> A crumpled filter
                might have 1/4 the area and 1/2 the drag coefficient - resulting in terminal velocity
                nearly 3x higher than flat! This is why skydivers can control speed by body position.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Terminal velocity shapes everything from weather to extreme sports
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => {
                    setTransferCompleted(new Set([...transferCompleted, index]));
                    emitEvent('button_clicked', { action: 'reveal_answer', applicationIndex: index });
                    playSound('click');
                  }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Got It — Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderNavigationDots()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered terminal velocity!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {testScore >= 8
            ? renderBottomBar(false, true, 'Complete Mastery')
            : (
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px',
                background: colors.bgDark, borderTop: `1px solid rgba(255,255,255,0.1)`,
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, minHeight: '72px',
              }}>
                <button
                  onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); setTestScore(0); }}
                  style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                >
                  Review & Retry
                </button>
              </div>
            )
          }
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, lineHeight: 1.6, marginBottom: '16px' }}>
              Scenario: A team of aerospace engineers is designing a new parachute system for cargo delivery. They need to apply their understanding of terminal velocity, drag forces, and the relationship between mass, cross-sectional area, and falling speed. Apply your knowledge of how drag force equals gravitational force at terminal velocity, how terminal velocity scales with mass and area, and the real-world implications for parachute design, skydiving safety, and precipitation physics.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>
                Progress: {testAnswers.filter(a => a !== null).length}/{testQuestions.length} answered
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered terminal velocity and drag physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Terminal velocity as force balance (drag = weight)</li>
              <li>Drag force proportional to velocity squared</li>
              <li>Terminal velocity proportional to sqrt(mass)</li>
              <li>Critical role of cross-sectional area and shape</li>
              <li>Applications in parachutes, skydiving, and nature</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Terminal velocity concepts extend to fluid dynamics in water (sinking particles),
              aerospace engineering (re-entry vehicles), sports science (ski jumping, cycling),
              and even astrophysics (meteorites burning up in atmosphere). The drag equation
              is fundamental to understanding motion through any fluid medium!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TerminalVelocityRenderer;
