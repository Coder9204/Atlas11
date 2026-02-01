import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Satellite Communications',
    short: 'Geostationary satellites enable global connectivity',
    tagline: 'Orbits that match Earth\'s rotation',
    description: 'Communications satellites in geostationary orbit (35,786 km) complete one orbit in exactly 24 hours, appearing stationary above a fixed point on Earth. This enables continuous coverage for TV broadcasts, internet, and phone services.',
    connection: 'Kepler\'s Third Law determines that this specific altitude produces a 24-hour orbital period, perfectly matching Earth\'s rotation for seamless communications.',
    howItWorks: 'Satellites are launched to low Earth orbit, then use onboard propulsion to reach transfer orbits. Final circularization at GEO altitude requires precise velocity adjustments.',
    stats: [
      { value: '2,000+', label: 'GEO satellites', icon: '📡' },
      { value: '3 km/s', label: 'orbital velocity', icon: '⚡' },
      { value: '$280B', label: 'satellite industry', icon: '📈' }
    ],
    examples: ['DirecTV broadcasts', 'Global internet backhaul', 'Weather monitoring (GOES)', 'Military communications'],
    companies: ['SpaceX', 'Boeing', 'Lockheed Martin', 'Intelsat'],
    futureImpact: 'Mega-constellations in LEO and new GEO high-throughput satellites will provide global broadband access to underserved regions.',
    color: '#3B82F6'
  },
  {
    icon: '🌍',
    title: 'GPS Navigation',
    short: 'Medium Earth orbit enables precise positioning',
    tagline: '31 satellites guiding billions of devices',
    description: 'GPS satellites orbit at 20,200 km altitude, completing two orbits per day. This medium Earth orbit provides optimal coverage geometry, allowing any location on Earth to see at least 4 satellites for triangulation.',
    connection: 'The orbital velocity at this altitude (3.9 km/s) and 12-hour period are direct consequences of the gravitational relationship v = sqrt(GM/r).',
    howItWorks: 'Each satellite broadcasts precise timing signals. Receivers calculate distance from signal travel time and use at least 4 satellites to determine 3D position plus time correction.',
    stats: [
      { value: '31', label: 'active satellites', icon: '🛰️' },
      { value: '3m', label: 'position accuracy', icon: '📍' },
      { value: '6.5B', label: 'GPS-enabled devices', icon: '📱' }
    ],
    examples: ['Smartphone navigation', 'Aviation guidance', 'Precision agriculture', 'Fleet tracking'],
    companies: ['Trimble', 'Garmin', 'Qualcomm', 'u-blox'],
    futureImpact: 'GPS III satellites and multi-constellation receivers will enable centimeter-level positioning for autonomous vehicles and advanced applications.',
    color: '#10B981'
  },
  {
    icon: '🔭',
    title: 'Space Telescopes',
    short: 'Orbital observatories see the universe clearly',
    tagline: 'Above the atmosphere, clarity awaits',
    description: 'Space telescopes like Hubble and James Webb operate in orbits that provide stable thermal environments and unobstructed views. Their orbital mechanics are carefully chosen to optimize scientific observations.',
    connection: 'Orbital altitude determines the thermal environment, communication geometry, and observing time. Webb\'s L2 orbit demonstrates advanced orbital mechanics beyond simple Earth orbits.',
    howItWorks: 'Hubble orbits at 540 km for serviceability. JWST orbits the L2 Lagrange point, 1.5 million km from Earth, where gravitational forces create a stable observation platform.',
    stats: [
      { value: '1.5M', label: 'km to L2 point', icon: '🌌' },
      { value: '30', label: 'years of Hubble', icon: '📷' },
      { value: '$10B', label: 'JWST cost', icon: '💰' }
    ],
    examples: ['Hubble deep field images', 'JWST exoplanet observations', 'Chandra X-ray astronomy', 'Gaia star mapping'],
    companies: ['NASA', 'ESA', 'Northrop Grumman', 'Ball Aerospace'],
    futureImpact: 'Next-generation observatories like Roman and future interferometers will push orbital mechanics to enable direct imaging of exoplanets.',
    color: '#8B5CF6'
  },
  {
    icon: '🌙',
    title: 'Lunar Missions',
    short: 'Trans-lunar injection requires precise orbital changes',
    tagline: 'From Earth orbit to the Moon',
    description: 'Reaching the Moon requires a carefully calculated trajectory that uses orbital mechanics to minimize fuel consumption. Spacecraft enter highly elliptical transfer orbits before lunar capture.',
    connection: 'The escape velocity and transfer orbit calculations are direct applications of orbital mechanics principles, balancing Earth and Moon gravity fields.',
    howItWorks: 'Spacecraft first reach low Earth orbit, then fire engines for trans-lunar injection, entering a trajectory that intersects the Moon\'s orbit. Lunar gravity capture requires precise timing and braking.',
    stats: [
      { value: '384K', label: 'km to Moon', icon: '🌙' },
      { value: '3 days', label: 'transit time', icon: '⏱️' },
      { value: '$93B', label: 'Artemis program', icon: '📈' }
    ],
    examples: ['Apollo Moon landings', 'Artemis lunar gateway', 'Chang\'e lunar rovers', 'Chandrayaan missions'],
    companies: ['NASA', 'SpaceX', 'Blue Origin', 'ISRO'],
    futureImpact: 'Sustainable lunar presence and Mars missions will require mastery of orbital mechanics for efficient trajectory planning and fuel optimization.',
    color: '#F59E0B'
  }
];

interface OrbitalMechanicsBasicsRendererProps {
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const OrbitalMechanicsBasicsRenderer: React.FC<OrbitalMechanicsBasicsRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase navigation
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
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

  const validPhases: Phase[] = phaseOrder;
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
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

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 300);
  }, [onGameEvent, phaseLabels]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);
  // Simulation state
  const [altitude, setAltitude] = useState(400); // km above Earth surface
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showGravityVector, setShowGravityVector] = useState(true);
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [trailPoints, setTrailPoints] = useState<{x: number, y: number}[]>([]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physical constants
  const EARTH_RADIUS = 6371; // km
  const G = 6.674e-11; // gravitational constant
  const EARTH_MASS = 5.972e24; // kg

  // Calculate orbital parameters
  const calculateOrbitalParams = useCallback(() => {
    const r = (EARTH_RADIUS + altitude) * 1000; // meters

    // Orbital velocity: v = sqrt(GM/r)
    const velocity = Math.sqrt(G * EARTH_MASS / r) / 1000; // km/s

    // Orbital period: T = 2*pi*sqrt(r^3/GM)
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / (G * EARTH_MASS));
    const periodMinutes = periodSeconds / 60;

    // Escape velocity: v_esc = sqrt(2GM/r)
    const escapeVelocity = Math.sqrt(2 * G * EARTH_MASS / r) / 1000; // km/s

    // Gravitational acceleration at altitude
    const gravityAccel = (G * EARTH_MASS / Math.pow(r, 2)); // m/s^2

    return {
      velocity: Math.round(velocity * 100) / 100,
      periodMinutes: Math.round(periodMinutes * 10) / 10,
      escapeVelocity: Math.round(escapeVelocity * 100) / 100,
      gravityAccel: Math.round(gravityAccel * 100) / 100,
      radiusRatio: (EARTH_RADIUS + altitude) / EARTH_RADIUS,
    };
  }, [altitude]);

  // Orbit animation
  useEffect(() => {
    if (!isAnimating) return;
    const params = calculateOrbitalParams();
    const angularSpeed = 360 / (params.periodMinutes * 60); // degrees per second

    const interval = setInterval(() => {
      setOrbitAngle(prev => {
        const newAngle = (prev + angularSpeed * 0.1) % 360;

        // Add trail point
        const centerX = 250;
        const centerY = 200;
        const orbitRadius = 80 + (altitude / 10);
        const rad = (newAngle * Math.PI) / 180;
        const x = centerX + Math.cos(rad) * orbitRadius;
        const y = centerY + Math.sin(rad) * orbitRadius;

        setTrailPoints(points => {
          const newPoints = [...points, { x, y }];
          return newPoints.slice(-100); // Keep last 100 points
        });

        return newAngle;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnimating, altitude, calculateOrbitalParams]);

  const predictions = [
    { id: 'gravity', label: 'There\'s no gravity in space - that\'s why they float' },
    { id: 'falling', label: 'They ARE falling, but moving sideways fast enough to keep missing Earth' },
    { id: 'spinning', label: 'Earth\'s rotation keeps them up' },
    { id: 'engines', label: 'Satellite engines constantly push them up against gravity' },
  ];

  const twistPredictions = [
    { id: 'faster_higher', label: 'Higher orbits are faster - more potential energy converts to speed' },
    { id: 'slower_higher', label: 'Higher orbits are SLOWER - counterintuitive but true' },
    { id: 'same_speed', label: 'All orbits have the same speed' },
    { id: 'depends', label: 'It depends on the satellite\'s mass' },
  ];

  const transferApplications = [
    {
      title: 'International Space Station',
      description: 'The ISS orbits at about 400km altitude, completing one orbit every 90 minutes.',
      question: 'Why does the ISS occasionally need to boost its orbit?',
      answer: 'At 400km, there\'s still trace atmosphere causing drag. The ISS loses about 2km of altitude per month and must periodically fire thrusters to boost back up. Without boosts, it would eventually re-enter.',
    },
    {
      title: 'Geostationary Satellites',
      description: 'TV and weather satellites that appear to hover over one spot on Earth.',
      question: 'At what altitude must a satellite orbit to appear stationary?',
      answer: 'About 35,786 km - at this altitude, orbital period exactly matches Earth\'s 24-hour rotation. The satellite orbits at 3 km/s (much slower than ISS at 7.7 km/s), keeping pace with Earth\'s surface.',
    },
    {
      title: 'GPS Constellation',
      description: 'GPS satellites orbit at about 20,200 km altitude in carefully arranged orbits.',
      question: 'Why aren\'t GPS satellites geostationary?',
      answer: 'GPS needs satellites visible from multiple angles for triangulation. Medium Earth Orbit provides coverage of more Earth surface per satellite. Each GPS satellite orbits twice per day, not once.',
    },
    {
      title: 'Escape Velocity',
      description: 'Spacecraft leaving Earth for the Moon or Mars must exceed escape velocity.',
      question: 'Why does escape velocity decrease at higher altitudes?',
      answer: 'Escape velocity is v = sqrt(2GM/r). At higher r, you\'ve already climbed out of some of Earth\'s gravity well. It takes less additional speed to escape completely. This is why rockets stage - they gain altitude first.',
    },
  ];

  const testQuestions = [
    {
      question: 'Satellites stay in orbit because:',
      options: [
        { text: 'There is no gravity in space', correct: false },
        { text: 'They are falling but moving sideways fast enough to miss Earth', correct: true },
        { text: 'Rocket engines constantly push them up', correct: false },
        { text: 'Earth\'s magnetic field supports them', correct: false },
      ],
    },
    {
      question: 'As a satellite\'s orbital altitude increases, its orbital velocity:',
      options: [
        { text: 'Increases', correct: false },
        { text: 'Decreases', correct: true },
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: false },
      ],
    },
    {
      question: 'The ISS orbits at 400km altitude with a period of about:',
      options: [
        { text: '24 hours', correct: false },
        { text: '90 minutes', correct: true },
        { text: '12 hours', correct: false },
        { text: '1 week', correct: false },
      ],
    },
    {
      question: 'Orbital velocity at a given altitude is determined by:',
      options: [
        { text: 'The satellite\'s mass', correct: false },
        { text: 'The central body\'s mass and orbital radius only', correct: true },
        { text: 'The satellite\'s fuel load', correct: false },
        { text: 'The satellite\'s shape', correct: false },
      ],
    },
    {
      question: 'To reach a higher orbit, a spacecraft must:',
      options: [
        { text: 'Slow down', correct: false },
        { text: 'Speed up, then slow down at the new altitude', correct: true },
        { text: 'Point straight up and fire engines', correct: false },
        { text: 'Do nothing - orbits naturally rise', correct: false },
      ],
    },
    {
      question: 'Escape velocity from Earth\'s surface is approximately:',
      options: [
        { text: '7.9 km/s (orbital velocity)', correct: false },
        { text: '11.2 km/s', correct: true },
        { text: '3 km/s', correct: false },
        { text: '300,000 km/s (speed of light)', correct: false },
      ],
    },
    {
      question: 'A geostationary orbit requires an altitude of about:',
      options: [
        { text: '400 km', correct: false },
        { text: '2,000 km', correct: false },
        { text: '35,786 km', correct: true },
        { text: '100 km', correct: false },
      ],
    },
    {
      question: 'The orbital period of a satellite depends on:',
      options: [
        { text: 'Only its velocity', correct: false },
        { text: 'The semi-major axis of its orbit', correct: true },
        { text: 'The satellite\'s mass', correct: false },
        { text: 'The launch date', correct: false },
      ],
    },
    {
      question: 'At higher orbits, gravitational acceleration:',
      options: [
        { text: 'Is stronger because you\'re closer to space', correct: false },
        { text: 'Is weaker because you\'re farther from Earth\'s center', correct: true },
        { text: 'Is the same at all altitudes', correct: false },
        { text: 'Becomes repulsive', correct: false },
      ],
    },
    {
      question: 'If the ISS suddenly stopped moving sideways, it would:',
      options: [
        { text: 'Stay in place', correct: false },
        { text: 'Fall straight toward Earth', correct: true },
        { text: 'Drift slowly into deep space', correct: false },
        { text: 'Start spinning', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    onGameEvent?.({ type: 'test_completed', data: { score, total: 10 } });
  };

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #334155',
        backgroundColor: '#0f172a',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: i < currentIdx ? '#22c55e' : i === currentIdx ? '#3b82f6' : '#334155',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s'
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#3b82f6',
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canGoNext: boolean = true, nextLabel: string = 'Next') => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;
    const isLastPhase = currentIdx === phaseOrder.length - 1;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderTop: '1px solid #334155',
        backgroundColor: '#0f172a',
        marginTop: 'auto'
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: '#1e293b',
            color: canBack ? '#e2e8f0' : '#475569',
            border: '1px solid #334155',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        {!isLastPhase && (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: canGoNext ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : '#1e293b',
              color: canGoNext ? '#ffffff' : '#475569',
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              boxShadow: canGoNext ? '0 2px 12px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            {nextLabel}
          </button>
        )}
        {isLastPhase && (
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            Start Over
          </button>
        )}
      </div>
    );
  };

  const renderVisualization = () => {
    const params = calculateOrbitalParams();
    const centerX = 250;
    const centerY = 200;
    const earthRadius = 70;
    const orbitRadius = 80 + (altitude / 10);

    // Satellite position
    const rad = (orbitAngle * Math.PI) / 180;
    const satX = centerX + Math.cos(rad) * orbitRadius;
    const satY = centerY + Math.sin(rad) * orbitRadius;

    // Velocity vector (tangent to orbit)
    const velAngle = rad + Math.PI / 2;
    const velLength = 30 * (params.velocity / 8); // Scale to orbital velocity
    const velX = Math.cos(velAngle) * velLength;
    const velY = Math.sin(velAngle) * velLength;

    // Gravity vector (toward Earth)
    const gravAngle = rad + Math.PI;
    const gravLength = 20 * (params.gravityAccel / 10); // Scale to gravity
    const gravX = Math.cos(gravAngle) * gravLength;
    const gravY = Math.sin(gravAngle) * gravLength;

    return (
      <svg width="100%" height="450" viewBox="0 0 500 450" style={{ maxWidth: '600px' }}>
        <defs>
          <radialGradient id="earthGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
          <radialGradient id="atmosphereGrad" cx="50%" cy="50%">
            <stop offset="80%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
          </radialGradient>
          <linearGradient id="velocityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="gravityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Background - space */}
        <rect width="500" height="450" fill="#0a0a1a" rx="12" />

        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <circle
            key={i}
            cx={Math.random() * 500}
            cy={Math.random() * 450}
            r={Math.random() * 1.5}
            fill="#fff"
            opacity={Math.random() * 0.8 + 0.2}
          />
        ))}

        {/* Orbit path */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.5"
        />

        {/* Trail */}
        {trailPoints.length > 1 && (
          <path
            d={`M ${trailPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            opacity="0.6"
          />
        )}

        {/* Earth atmosphere glow */}
        <circle cx={centerX} cy={centerY} r={earthRadius + 10} fill="url(#atmosphereGrad)" />

        {/* Earth */}
        <circle cx={centerX} cy={centerY} r={earthRadius} fill="url(#earthGrad)" />

        {/* Continent hints */}
        <ellipse cx={centerX - 15} cy={centerY - 10} rx="20" ry="15" fill="#22c55e" opacity="0.4" />
        <ellipse cx={centerX + 20} cy={centerY + 15} rx="15" ry="10" fill="#22c55e" opacity="0.4" />

        {/* Satellite */}
        <g transform={`translate(${satX}, ${satY})`}>
          {/* Solar panels */}
          <rect x="-25" y="-3" width="20" height="6" fill="#1e3a8a" stroke="#3b82f6" />
          <rect x="5" y="-3" width="20" height="6" fill="#1e3a8a" stroke="#3b82f6" />
          {/* Body */}
          <rect x="-5" y="-5" width="10" height="10" fill="#f8fafc" stroke="#94a3b8" />

          {/* Velocity vector */}
          {showVelocityVector && (
            <g>
              <line x1="0" y1="0" x2={velX} y2={velY} stroke="#22c55e" strokeWidth="3" />
              <polygon
                points={`${velX},${velY} ${velX - 8},${velY - 4} ${velX - 8},${velY + 4}`}
                fill="#22c55e"
                transform={`rotate(${(velAngle * 180) / Math.PI}, ${velX}, ${velY})`}
              />
              <text x={velX + 10} y={velY} fill="#22c55e" fontSize="10">v</text>
            </g>
          )}

          {/* Gravity vector */}
          {showGravityVector && (
            <g>
              <line x1="0" y1="0" x2={gravX} y2={gravY} stroke="#ef4444" strokeWidth="3" />
              <polygon
                points={`${gravX},${gravY} ${gravX - 8},${gravY - 4} ${gravX - 8},${gravY + 4}`}
                fill="#ef4444"
                transform={`rotate(${(gravAngle * 180) / Math.PI}, ${gravX}, ${gravY})`}
              />
              <text x={gravX - 15} y={gravY} fill="#ef4444" fontSize="10">g</text>
            </g>
          )}
        </g>

        {/* Altitude indicator */}
        <g transform="translate(30, 350)">
          <text x="0" y="0" fill="#f8fafc" fontSize="12" fontWeight="bold">Orbital Parameters</text>
          <text x="0" y="25" fill="#94a3b8" fontSize="11">Altitude: {altitude} km</text>
          <text x="0" y="45" fill="#22c55e" fontSize="11">Velocity: {params.velocity} km/s</text>
          <text x="0" y="65" fill="#f59e0b" fontSize="11">Period: {params.periodMinutes} min</text>
          <text x="0" y="85" fill="#ef4444" fontSize="11">Gravity: {params.gravityAccel} m/s2</text>
        </g>

        {/* Escape velocity indicator */}
        <g transform="translate(280, 350)">
          <text x="0" y="0" fill="#f8fafc" fontSize="12" fontWeight="bold">Key Velocities</text>
          <text x="0" y="25" fill="#22c55e" fontSize="11">Orbital: {params.velocity} km/s</text>
          <text x="0" y="45" fill="#a855f7" fontSize="11">Escape: {params.escapeVelocity} km/s</text>
          <text x="0" y="65" fill="#94a3b8" fontSize="11">Ratio: {(params.escapeVelocity / params.velocity).toFixed(2)}x</text>
        </g>

        {/* Legend */}
        <g transform="translate(350, 30)">
          <rect x="0" y="0" width="130" height="70" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <circle cx="15" cy="20" r="6" fill="#22c55e" />
          <text x="30" y="24" fill="#f8fafc" fontSize="11">Velocity</text>
          <circle cx="15" cy="45" r="6" fill="#ef4444" />
          <text x="30" y="49" fill="#f8fafc" fontSize="11">Gravity</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Orbital Altitude: {altitude} km
        </label>
        <input
          type="range"
          min="200"
          max="40000"
          step="100"
          value={altitude}
          onChange={(e) => setAltitude(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px', marginTop: '4px' }}>
          <span>ISS ~400km</span>
          <span>GPS ~20,000km</span>
          <span>GEO ~36,000km</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowVelocityVector(!showVelocityVector)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: showVelocityVector ? '#22c55e' : '#475569',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Velocity: {showVelocityVector ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => setShowGravityVector(!showGravityVector)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: showGravityVector ? '#ef4444' : '#475569',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Gravity: {showGravityVector ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => { setIsAnimating(!isAnimating); if (!isAnimating) setTrailPoints([]); }}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: isAnimating ? '#f59e0b' : '#3b82f6',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isAnimating ? 'Pause Orbit' : 'Animate Orbit'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setAltitude(400)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: altitude === 400 ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ISS (400km)
        </button>
        <button
          onClick={() => setAltitude(20200)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: altitude === 20200 ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          GPS (20,200km)
        </button>
        <button
          onClick={() => setAltitude(35786)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: altitude === 35786 ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          GEO (35,786km)
        </button>
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ color: '#3b82f6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Space Physics</span>
              <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Orbital Mechanics Basics
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
                Why don't satellites just fall down?
              </p>
            </div>

            {renderVisualization()}

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
                The International Space Station zooms around Earth at 7.7 km/s, completing an orbit every 90 minutes.
                But gravity at ISS altitude is still 90% of surface gravity. So why doesn't it fall?
              </p>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
                The answer is one of physics' most beautiful insights.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Discover the Answer')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                At the ISS altitude (400 km), gravity is still about 8.7 m/s2 - about 89% of surface gravity.
                Yet astronauts float weightlessly. Why don't they and the station fall to Earth?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: prediction === p.id ? '2px solid #3b82f6' : '1px solid #475569',
                    background: prediction === p.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(prediction !== null, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Orbital Mechanics</h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
              See how altitude affects orbital velocity and period
            </p>

            {renderVisualization()}
            {renderControls()}

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Key Experiments:</h3>
              <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
                <li>Compare velocities at ISS vs GPS vs GEO altitudes</li>
                <li>Notice: velocity and gravity BOTH decrease with altitude</li>
                <li>Watch how the velocity vector is always perpendicular to gravity</li>
                <li>See the orbital period increase dramatically with altitude</li>
              </ul>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Review the Concepts')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'falling';

    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
              borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
            }}>
              <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
                {wasCorrect ? 'Correct!' : 'The key insight:'}
              </h3>
              <p>Orbiting IS falling! The satellite falls toward Earth, but moves sideways so fast that the curve of its fall matches Earth's curve. It keeps missing the ground!</p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Newton's Cannonball</h3>
              <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
                <strong>The thought experiment:</strong> Imagine firing a cannon horizontally from a tall mountain.
                Fire faster, and the cannonball lands farther away. Fire fast enough, and the ground curves away as fast as the ball falls.
              </p>
              <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
                <strong>The key insight:</strong> At orbital velocity, the object is continuously falling toward Earth,
                but Earth's surface curves away at exactly the same rate. The object falls "around" Earth!
              </p>
              <p style={{ lineHeight: 1.7 }}>
                <strong>Weightlessness:</strong> Astronauts feel weightless because they and their spacecraft are both
                falling at exactly the same rate. There's no floor pushing up on them - they're in free fall together.
              </p>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: '#8b5cf6', marginBottom: '16px' }}>The Math</h3>
              <p style={{ lineHeight: 1.7 }}>
                <strong>Orbital velocity:</strong> v = sqrt(GM/r)<br />
                <strong>For Earth at 400km:</strong> v = 7.7 km/s = 27,720 km/h<br />
                <strong>Key relationship:</strong> Higher orbit = lower velocity (counterintuitively!)
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Discover the Twist')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>The Twist</h2>

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
              <p style={{ fontSize: '16px', marginBottom: '12px' }}>
                Here's something counterintuitive: A satellite at 400 km orbits at 7.7 km/s.
                A GPS satellite at 20,200 km orbits at only 3.9 km/s.
                A geostationary satellite at 35,786 km orbits at just 3.1 km/s.
              </p>
              <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
                What happens to orbital velocity as you go higher?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                    background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(twistPrediction !== null, 'See the Answer')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Higher = Slower</h2>

            {renderVisualization()}
            {renderControls()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Low Orbit (ISS)</h4>
                <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>400 km altitude</li>
                  <li>7.7 km/s velocity</li>
                  <li>90 minute period</li>
                  <li>Strong gravity</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ color: '#a855f7', marginBottom: '8px' }}>High Orbit (GEO)</h4>
                <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>35,786 km altitude</li>
                  <li>3.1 km/s velocity</li>
                  <li>24 hour period</li>
                  <li>Weak gravity</li>
                </ul>
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>The Paradox Explained</h4>
              <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
                To go to a higher orbit, you must speed up. But once you're there, you're moving slower!
                The extra speed converts to potential energy (height). It's like slowing down as you climb a hill -
                kinetic energy becomes potential energy.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Review the Discovery')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'slower_higher';

    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
              borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
            }}>
              <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
                {wasCorrect ? 'Exactly right!' : 'The counterintuitive truth:'}
              </h3>
              <p>Higher orbits are SLOWER! It seems wrong, but physics demands it: v = sqrt(GM/r). Larger r means smaller v.</p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Orbital Maneuvers</h3>
              <div style={{ lineHeight: 1.8 }}>
                <p><strong style={{ color: '#22c55e' }}>To go higher:</strong> Speed up - you'll rise to a higher orbit where you actually move slower</p>
                <p><strong style={{ color: '#ef4444' }}>To go lower:</strong> Slow down - you'll drop to a lower orbit where you actually move faster</p>
                <p><strong style={{ color: '#3b82f6' }}>The paradox:</strong> Speeding up slows you down (eventually). Slowing down speeds you up (eventually)!</p>
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Kepler's Third Law</h4>
              <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>
                T^2 is proportional to r^3. Double the orbital radius, and the period increases by a factor of 2.8.
                The satellite moves slower AND has a longer path - that's why higher orbits take so much longer.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'See Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
              Complete all 4 to unlock the test ({transferCompleted.size}/4)
            </p>

            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #334155',
                }}
              >
                <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>{app.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
                </div>
                {!transferCompleted.has(index) ? (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #3b82f6',
                      background: 'transparent',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                marginBottom: '24px',
              }}>
                <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
                <p style={{ color: '#94a3b8' }}>
                  {testScore >= 8 ? 'You\'ve mastered orbital mechanics!' : 'Review the concepts and try again.'}
                </p>
              </div>

              <button
                onClick={testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: testScore >= 8 ? '#22c55e' : '#f59e0b',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {testScore >= 8 ? 'Claim Mastery' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Knowledge Test</h2>
              <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1}/10</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? '#3b82f6' : i === currentTestQuestion ? '#64748b' : '#1e293b',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleTestAnswer(currentTestQuestion, i)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: testAnswers[currentTestQuestion] === i ? '2px solid #3b82f6' : '1px solid #475569',
                    background: testAnswers[currentTestQuestion] === i ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
                disabled={currentTestQuestion === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
                  cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Previous
              </button>

              {currentTestQuestion < 9 ? (
                <button
                  onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={testAnswers.includes(null)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: testAnswers.includes(null) ? '#475569' : '#22c55e',
                    color: 'white',
                    cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>MASTERY</div>
            <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Orbital Mechanics Expert!</h1>
            <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
              You understand the elegant physics that keeps satellites in orbit
            </p>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
              <ul style={{ lineHeight: 2, paddingLeft: '20px' }}>
                <li>Orbital motion as continuous falling</li>
                <li>The relationship v = sqrt(GM/r)</li>
                <li>Higher orbits = slower velocities</li>
                <li>Kepler's laws and orbital periods</li>
                <li>Escape velocity and orbital maneuvers</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>The Core Insight</h4>
              <p style={{ color: '#e2e8f0' }}>
                Orbits are a beautiful balance between gravity's pull and sideways motion.
                The mathematics that describes this has enabled everything from GPS navigation to interplanetary exploration.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default OrbitalMechanicsBasicsRenderer;
