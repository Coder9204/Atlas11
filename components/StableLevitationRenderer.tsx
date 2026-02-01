import React, { useState, useEffect, useCallback } from 'react';

interface StableLevitationRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '🚄',
    title: 'Maglev Trains',
    short: 'Magnetic levitation for frictionless transport',
    tagline: 'Floating at 600 km/h',
    description: 'Maglev trains use electromagnetic forces to levitate above the track, eliminating wheel friction. This enables speeds over 600 km/h while providing a smooth, quiet ride.',
    connection: 'Like Bernoulli levitation, maglev requires stable equilibrium in multiple dimensions. Active feedback control adjusts electromagnet current to maintain constant gap despite disturbances.',
    howItWorks: 'Electromagnetic suspension (EMS) uses attractive force from beneath, with sensors and controllers adjusting current thousands of times per second. Electrodynamic suspension (EDS) uses repulsive force from superconducting magnets.',
    stats: [
      { value: '603km/h', label: 'Speed record (Japan)', icon: '🚀' },
      { value: '10mm', label: 'Levitation gap', icon: '📏' },
      { value: '90%', label: 'Energy efficiency', icon: '⚡' }
    ],
    examples: ['Shanghai Maglev', 'Japan Chuo Shinkansen', 'Inductrack systems', 'Urban people movers'],
    companies: ['Central Japan Railway', 'Transrapid', 'CRRC', 'General Atomics'],
    futureImpact: 'Superconducting maglev lines will connect major cities, with travel times competitive with aviation but without airport hassles or emissions.',
    color: '#8b5cf6'
  },
  {
    icon: '🔬',
    title: 'Acoustic Levitation',
    short: 'Suspending objects with sound waves',
    tagline: 'Touching without touching',
    description: 'Ultrasonic transducers create standing waves that trap small objects at pressure nodes. This enables contactless manipulation for pharmaceutical processing, materials research, and microgravity simulation.',
    connection: 'Like Bernoulli levitation using air pressure differences, acoustic levitation uses sound pressure gradients. Objects rest in low-pressure nodes surrounded by high-pressure antinodes.',
    howItWorks: 'Arrays of ultrasonic speakers create interference patterns with stable trapping points. Multiple transducers allow 3D positioning. Frequency tuning adjusts trap stiffness and position.',
    stats: [
      { value: '40kHz', label: 'Typical frequency', icon: '🔊' },
      { value: '5mm', label: 'Max object size', icon: '📐' },
      { value: '160dB', label: 'Sound intensity', icon: '📢' }
    ],
    examples: ['Drug formulation', 'Containerless processing', 'Cell manipulation', 'Art installations'],
    companies: ['Ultrahaptics', 'Argonne Lab', 'Bristol Ultrasonics', 'Sonovol'],
    futureImpact: 'Mid-air haptic displays will let users feel virtual objects, with acoustic levitation creating tactile interfaces for VR and touchless public interfaces.',
    color: '#3b82f6'
  },
  {
    icon: '🧲',
    title: 'Magnetic Bearings',
    short: 'Frictionless rotation for precision machines',
    tagline: 'Spinning without touching',
    description: 'Active magnetic bearings suspend rotating shafts without contact, eliminating friction, wear, and lubricant contamination. Used in turbomachinery, flywheels, and precision instruments.',
    connection: 'Magnetic bearings face the same stability challenge as Bernoulli levitation. Earnshaw\'s theorem prohibits stable passive magnetic suspension, so active feedback control is essential.',
    howItWorks: 'Position sensors measure shaft location. Controllers calculate required restoring forces. Electromagnets provide forces proportional to displacement. Digital control enables stiffness tuning.',
    stats: [
      { value: '100k', label: 'RPM achievable', icon: '🔄' },
      { value: '0', label: 'Friction losses', icon: '✨' },
      { value: '10yr+', label: 'Maintenance-free life', icon: '⏰' }
    ],
    examples: ['Natural gas compressors', 'Flywheel energy storage', 'Vacuum pumps', 'Centrifuges'],
    companies: ['SKF', 'Waukesha', 'Calnetix', 'Mecos'],
    futureImpact: 'Superconducting magnetic bearings will enable lossless energy storage in utility-scale flywheels, supporting grid stability with renewable energy.',
    color: '#f59e0b'
  },
  {
    icon: '⚗️',
    title: 'Containerless Processing',
    short: 'Manufacturing without contamination',
    tagline: 'Pure materials from thin air',
    description: 'Levitation enables melting and processing materials without crucible contact, preventing contamination. Essential for producing ultra-pure metals, glasses, and studying undercooled liquids.',
    connection: 'Aerodynamic, acoustic, or electromagnetic levitation keeps molten samples suspended. The stability principles determine how well samples can be held during heating and cooling.',
    howItWorks: 'Samples are levitated in controlled atmosphere chambers. Lasers or RF coils provide heating. Pyrometers measure temperature. Rapid cooling can produce amorphous metals or metastable phases.',
    stats: [
      { value: '3000°C', label: 'Max processing temp', icon: '🌡️' },
      { value: '99.9999%', label: 'Purity achievable', icon: '💎' },
      { value: '10-100x', label: 'Undercooling possible', icon: '❄️' }
    ],
    examples: ['Titanium alloys', 'Silicon purification', 'Metallic glasses', 'Oxide superconductors'],
    companies: ['NASA Glenn', 'DLR', 'JAXA', 'Materion'],
    futureImpact: 'Space manufacturing will use microgravity and levitation to create materials impossible to make on Earth, from perfect crystals to novel metal alloys.',
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
  airflow: '#38bdf8',
  ball: '#fbbf24',
  dryer: '#6b7280',
  pressure: {
    high: '#ef4444',
    low: '#3b82f6',
  },
};

const StableLevitationRenderer: React.FC<StableLevitationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [tiltAngle, setTiltAngle] = useState(0);
  const [ballMass, setBallMass] = useState(1); // 0.5 = light, 1 = normal, 2 = heavy
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [ballOffset, setBallOffset] = useState({ x: 0, y: 0 });
  const [airflowStrength, setAirflowStrength] = useState(1);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
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

  // Physics simulation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Ball position based on physics
  useEffect(() => {
    // Simulate restoring force - ball oscillates but returns to center
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const gravity = 9.8 * ballMass;
    const airForce = airflowStrength * 15;

    // Stability depends on mass - lighter balls are more stable
    const stabilityFactor = 1 / (ballMass * 0.8);

    // Ball tends toward equilibrium position offset by tilt
    const equilibriumX = Math.sin(tiltRad) * 30 * (1 / stabilityFactor);
    const equilibriumY = Math.cos(tiltRad) * 10 * (ballMass - 1);

    // Add oscillation when animating
    const oscillation = isAnimating ? Math.sin(animationTime * 3) * 5 * (1 / stabilityFactor) : 0;

    // Heavy balls may fall out of stream at high tilt
    const fallThreshold = 25 / ballMass;
    const isFalling = Math.abs(tiltAngle) > fallThreshold;

    if (isFalling) {
      setBallOffset({
        x: equilibriumX + Math.sign(tiltAngle) * (Math.abs(tiltAngle) - fallThreshold) * 3,
        y: equilibriumY + Math.abs(tiltAngle - fallThreshold) * 2
      });
    } else {
      setBallOffset({
        x: equilibriumX + oscillation,
        y: equilibriumY + Math.abs(oscillation) * 0.3
      });
    }
  }, [tiltAngle, ballMass, airflowStrength, isAnimating, animationTime]);

  const predictions = [
    { id: 'fall', label: 'The ball will fall out of the airstream immediately' },
    { id: 'stable', label: 'The ball stays in the stream and returns to center' },
    { id: 'follow', label: 'The ball follows the tilt direction and stays tilted' },
    { id: 'spin', label: 'The ball starts spinning rapidly' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Both light and heavy balls behave exactly the same' },
    { id: 'light_better', label: 'Lighter ball is more stable, can handle more tilt' },
    { id: 'heavy_better', label: 'Heavier ball is more stable, resists displacement' },
    { id: 'neither', label: 'Neither ball can levitate - only ping-pong balls work' },
  ];

  const transferApplications = [
    {
      title: 'Coanda Effect in Aircraft',
      description: 'Aircraft use the Coanda effect where airflow follows curved surfaces, creating lift and control.',
      question: 'How does the Coanda effect help aircraft fly?',
      answer: 'Air flowing over a curved wing surface tends to follow the curve (Coanda effect), accelerating and creating low pressure above the wing. This pressure difference generates lift, just like the pressure difference keeps our ball centered.',
    },
    {
      title: 'Air Hockey Tables',
      description: 'Air hockey pucks float on a thin cushion of air blown up through tiny holes in the table.',
      question: 'Why does the puck stay on the table even when pushed toward the edge?',
      answer: 'The upward airflow creates a pressure cushion. When the puck tilts toward an edge, faster airflow under the raised side creates lower pressure (Bernoulli), while slower flow under the lower side creates higher pressure, providing a restoring force.',
    },
    {
      title: 'Hovercraft Design',
      description: 'Hovercraft float on a cushion of air contained by a flexible skirt around the vehicle.',
      question: 'How do hovercraft maintain stability over uneven surfaces?',
      answer: 'The air cushion pressure automatically adjusts - if one side drops, the gap narrows and pressure increases, pushing that side back up. This self-stabilizing behavior is similar to how pressure differences keep the levitating ball centered.',
    },
    {
      title: 'VTOL Aircraft',
      description: 'Vertical Take-Off and Landing aircraft like the Harrier jet direct thrust downward for hovering.',
      question: 'Why is hovering more challenging than forward flight?',
      answer: 'In hover, the aircraft must balance on its thrust column like our ball on the airstream. Small tilts must be corrected quickly. Unlike our passive ball, aircraft use active control systems to maintain this unstable equilibrium.',
    },
  ];

  const testQuestions = [
    {
      question: 'What keeps a ping-pong ball centered in an airstream?',
      options: [
        { text: 'The ball is lighter than air', correct: false },
        { text: 'Pressure differences from varying airflow speeds create a restoring force', correct: true },
        { text: 'Static electricity attracts the ball to the center', correct: false },
        { text: 'The air pushes equally from all directions', correct: false },
      ],
    },
    {
      question: 'When airflow speeds up around the edges of the ball, what happens to pressure there?',
      options: [
        { text: 'Pressure increases', correct: false },
        { text: 'Pressure decreases (Bernoulli principle)', correct: true },
        { text: 'Pressure stays the same', correct: false },
        { text: 'Pressure fluctuates randomly', correct: false },
      ],
    },
    {
      question: 'If you tilt the hair dryer, the ball initially moves sideways but then:',
      options: [
        { text: 'Falls out of the stream', correct: false },
        { text: 'Stays displaced to one side permanently', correct: false },
        { text: 'Returns toward the center of the stream', correct: true },
        { text: 'Rises higher in the stream', correct: false },
      ],
    },
    {
      question: 'The stable levitation point acts like a:',
      options: [
        { text: 'Potential energy maximum (unstable equilibrium)', correct: false },
        { text: 'Potential energy minimum (stable equilibrium or "potential well")', correct: true },
        { text: 'Zero potential energy point', correct: false },
        { text: 'Infinite potential energy point', correct: false },
      ],
    },
    {
      question: 'Compared to a normal ping-pong ball, a heavier ball in the same airstream:',
      options: [
        { text: 'Is more stable and can handle larger tilts', correct: false },
        { text: 'Is less stable and falls out at smaller tilt angles', correct: true },
        { text: 'Behaves exactly the same way', correct: false },
        { text: 'Cannot levitate at all', correct: false },
      ],
    },
    {
      question: 'The Bernoulli principle states that for flowing fluid:',
      options: [
        { text: 'Faster flow means higher pressure', correct: false },
        { text: 'Faster flow means lower pressure', correct: true },
        { text: 'Flow speed and pressure are unrelated', correct: false },
        { text: 'Pressure depends only on temperature', correct: false },
      ],
    },
    {
      question: 'Why does increasing airflow strength improve stability?',
      options: [
        { text: 'It makes the air heavier', correct: false },
        { text: 'It increases the restoring force for a given displacement', correct: true },
        { text: 'It reduces gravity on the ball', correct: false },
        { text: 'It makes the ball lighter', correct: false },
      ],
    },
    {
      question: 'The Coanda effect describes:',
      options: [
        { text: 'Heavy objects falling faster than light ones', correct: false },
        { text: 'A fluid jet following a curved surface', correct: true },
        { text: 'Sound waves bouncing off walls', correct: false },
        { text: 'Light bending through water', correct: false },
      ],
    },
    {
      question: 'Air hockey pucks stay centered because:',
      options: [
        { text: 'They are magnetic', correct: false },
        { text: 'The table is perfectly flat', correct: false },
        { text: 'Pressure differences in the air cushion create restoring forces', correct: true },
        { text: 'Friction holds them in place', correct: false },
      ],
    },
    {
      question: 'VTOL aircraft hovering is challenging because:',
      options: [
        { text: 'They need to balance on their thrust column like a ball on an airstream', correct: true },
        { text: 'The engines are too weak for hovering', correct: false },
        { text: 'Hovering uses less fuel than forward flight', correct: false },
        { text: 'The Bernoulli principle does not apply', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showPressure: boolean = true) => {
    const width = 500;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2 - 30;

    // Hair dryer position and orientation
    const dryerLength = 110;
    const dryerWidth = 55;
    const tiltRad = (tiltAngle * Math.PI) / 180;

    // Ball position
    const ballRadius = 22;
    const ballY = centerY - 90 + ballOffset.y;
    const ballX = centerX + ballOffset.x;

    // Check if ball is stable
    const fallThreshold = 25 / ballMass;
    const isStable = Math.abs(tiltAngle) <= fallThreshold;

    // Generate airflow particles with premium styling
    const airflowParticles = [];
    const numParticles = 20;
    for (let i = 0; i < numParticles; i++) {
      const t = ((animationTime * 2 + i * 0.25) % 3) / 3;
      const spread = (1 - t) * 5 + t * 45;
      const xOffset = Math.sin(i * 1.5) * spread * Math.cos(tiltRad) - t * 110 * Math.sin(tiltRad);
      const yBase = centerY + 55 - t * 160;
      const yOffset = -t * 110 * (1 - Math.abs(Math.cos(tiltRad)));

      airflowParticles.push(
        <circle
          key={`particle-${i}`}
          cx={centerX + xOffset}
          cy={yBase + yOffset}
          r={4 - t * 2.5}
          fill="url(#slevAirParticle)"
          filter="url(#slevParticleGlow)"
          opacity={0.8 - t * 0.5}
        />
      );
    }

    // Generate magnetic-like field lines (representing airflow force field)
    const fieldLines = [];
    const numFieldLines = 7;
    for (let i = 0; i < numFieldLines; i++) {
      const angle = ((i - 3) * 12) * Math.PI / 180;
      const startY = centerY + 55;
      const endY = centerY - 120;
      const curveX = Math.sin(angle) * 60;
      const opacity = 0.4 - Math.abs(i - 3) * 0.08;

      fieldLines.push(
        <path
          key={`field-${i}`}
          d={`M ${centerX + curveX * 0.3} ${startY}
              Q ${centerX + curveX} ${centerY - 30} ${centerX + curveX * 0.5} ${endY}`}
          fill="none"
          stroke="url(#slevFieldLine)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={opacity}
        />
      );
    }

    // Stability indicator dimensions
    const stabilityWidth = 140;
    const stabilityHeight = 65;
    const wellDepth = isStable ? 35 * (1 / ballMass) : 8;
    const ballIndicatorX = (ballOffset.x / 50) * (stabilityWidth / 2);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0c1929 0%, #0f172a 50%, #020617 100%)', borderRadius: '16px', maxWidth: '550px' }}
        >
          {/* === PREMIUM DEFS SECTION === */}
          <defs>
            {/* Lab background gradient */}
            <linearGradient id="slevLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Premium hair dryer body gradient - brushed metal look */}
            <linearGradient id="slevDryerBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="45%" stopColor="#6b7280" />
              <stop offset="65%" stopColor="#374151" />
              <stop offset="85%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Hair dryer nozzle gradient with depth */}
            <radialGradient id="slevDryerNozzle" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>

            {/* Premium ball gradient with 3D shading */}
            <radialGradient id="slevBallGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* Ball highlight gradient */}
            <radialGradient id="slevBallHighlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>

            {/* Airflow stream gradient */}
            <linearGradient id="slevAirflowStream" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#7dd3fc" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.05" />
            </linearGradient>

            {/* Air particle gradient */}
            <radialGradient id="slevAirParticle" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>

            {/* Field line gradient */}
            <linearGradient id="slevFieldLine" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.2" />
            </linearGradient>

            {/* Pressure zone - low pressure (fast flow) */}
            <radialGradient id="slevPressureLow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Pressure zone - high pressure (slow flow) */}
            <radialGradient id="slevPressureHigh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Stability indicator well gradient */}
            <linearGradient id="slevWellGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isStable ? '#10b981' : '#ef4444'} stopOpacity="0.1" />
              <stop offset="100%" stopColor={isStable ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
            </linearGradient>

            {/* Force arrow gradient */}
            <linearGradient id="slevForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>

            {/* Glow filter for particles */}
            <filter id="slevParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Premium ball glow/shadow */}
            <filter id="slevBallGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#fbbf24" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dryer inner glow */}
            <filter id="slevDryerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Heat glow for nozzle */}
            <filter id="slevHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#f97316" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrowhead marker */}
            <marker id="slevArrowhead" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
              <polygon points="0 0, 12 4.5, 0 9" fill="url(#slevForceArrow)" />
            </marker>

            {/* Grid pattern for lab floor */}
            <pattern id="slevLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.25" />
            </pattern>
          </defs>

          {/* Background with grid */}
          <rect width={width} height={height} fill="url(#slevLabBg)" />
          <rect width={width} height={height} fill="url(#slevLabGrid)" />

          {/* Magnetic-like field lines (airflow force field visualization) */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 55})`} opacity={showPressure ? 0.7 : 0.3}>
            {fieldLines}
          </g>

          {/* Airflow cone/stream */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 55})`}>
            <path
              d={`M ${centerX - 25} ${centerY + 55}
                  Q ${centerX} ${centerY - 110} ${centerX + 25} ${centerY + 55}
                  L ${centerX - 25} ${centerY + 55}`}
              fill="url(#slevAirflowStream)"
            />
          </g>

          {/* Airflow particles */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 55})`}>
            {airflowParticles}
          </g>

          {/* === PREMIUM HAIR DRYER === */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 85})`}>
            {/* Dryer barrel with depth */}
            <rect
              x={centerX - dryerWidth / 2}
              y={centerY + 60}
              width={dryerWidth}
              height={dryerLength}
              rx={12}
              fill="url(#slevDryerBody)"
              stroke="#374151"
              strokeWidth={1.5}
            />
            {/* Barrel highlight */}
            <rect
              x={centerX - dryerWidth / 2 + 5}
              y={centerY + 65}
              width={8}
              height={dryerLength - 15}
              rx={4}
              fill="rgba(255,255,255,0.1)"
            />
            {/* Nozzle with heat glow */}
            <ellipse
              cx={centerX}
              cy={centerY + 60}
              rx={dryerWidth / 2 - 3}
              ry={10}
              fill="url(#slevDryerNozzle)"
              filter="url(#slevHeatGlow)"
            />
            {/* Inner nozzle grate */}
            <ellipse
              cx={centerX}
              cy={centerY + 60}
              rx={dryerWidth / 2 - 8}
              ry={6}
              fill="#111827"
              stroke="#f97316"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            {/* Dryer handle */}
            <rect
              x={centerX + dryerWidth / 2 - 5}
              y={centerY + 105}
              width={45}
              height={22}
              rx={6}
              fill="url(#slevDryerBody)"
              stroke="#374151"
              strokeWidth={1.5}
            />
            {/* Handle grip lines */}
            {[0, 8, 16, 24, 32].map((offset) => (
              <line
                key={offset}
                x1={centerX + dryerWidth / 2 + offset}
                y1={centerY + 108}
                x2={centerX + dryerWidth / 2 + offset}
                y2={centerY + 124}
                stroke="#1f2937"
                strokeWidth={1}
              />
            ))}
            {/* Power indicator */}
            <circle
              cx={centerX}
              cy={centerY + 130}
              r={4}
              fill={isAnimating ? '#22c55e' : '#64748b'}
              filter={isAnimating ? 'url(#slevParticleGlow)' : 'none'}
            />
            {/* Label on dryer */}
            <text
              x={centerX}
              y={centerY + 95}
              textAnchor="middle"
              fill="#64748b"
              fontSize={9}
              fontWeight="bold"
            >
              AIR
            </text>
          </g>

          {/* Pressure indicators around ball */}
          {showPressure && isStable && (
            <>
              {/* Low pressure zones (sides where air speeds up) */}
              <ellipse
                cx={ballX - ballRadius - 8}
                cy={ballY}
                rx={12}
                ry={18}
                fill="url(#slevPressureLow)"
                opacity={0.7}
              />
              <ellipse
                cx={ballX + ballRadius + 8}
                cy={ballY}
                rx={12}
                ry={18}
                fill="url(#slevPressureLow)"
                opacity={0.7}
              />
              {/* High pressure zone (below ball) */}
              <ellipse
                cx={ballX}
                cy={ballY + ballRadius + 10}
                rx={20}
                ry={10}
                fill="url(#slevPressureHigh)"
                opacity={0.6}
              />
            </>
          )}

          {/* === PREMIUM LEVITATING BALL === */}
          <g filter="url(#slevBallGlow)">
            {/* Ball shadow on floor */}
            <ellipse
              cx={ballX + 5}
              cy={centerY + 45}
              rx={ballRadius * 0.6}
              ry={6}
              fill="#000"
              opacity={0.3}
            />
            {/* Main ball */}
            <circle
              cx={ballX}
              cy={ballY}
              r={ballRadius}
              fill="url(#slevBallGradient)"
              stroke="#d97706"
              strokeWidth={1.5}
            />
            {/* Ball highlight */}
            <ellipse
              cx={ballX - 7}
              cy={ballY - 8}
              rx={8}
              ry={5}
              fill="url(#slevBallHighlight)"
            />
            {/* Secondary highlight */}
            <circle
              cx={ballX + 5}
              cy={ballY + 6}
              r={3}
              fill="rgba(255,255,255,0.2)"
            />
          </g>

          {/* Force arrows when tilted */}
          {Math.abs(tiltAngle) > 3 && isStable && (
            <>
              {/* Restoring force arrow */}
              <line
                x1={ballX + Math.sign(tiltAngle) * 40}
                y1={ballY}
                x2={ballX + Math.sign(tiltAngle) * 15}
                y2={ballY}
                stroke="url(#slevForceArrow)"
                strokeWidth={4}
                strokeLinecap="round"
                markerEnd="url(#slevArrowhead)"
              />
              {/* Force label */}
              <text
                x={ballX + Math.sign(tiltAngle) * 55}
                y={ballY - 8}
                textAnchor="middle"
                fill={colors.success}
                fontSize={10}
                fontWeight="bold"
              >
                F restore
              </text>
            </>
          )}

          {/* === STABILITY INDICATOR PANEL === */}
          <g transform={`translate(${centerX - stabilityWidth / 2}, ${height - 85})`}>
            {/* Panel background */}
            <rect
              x={-10}
              y={-20}
              width={stabilityWidth + 20}
              height={stabilityHeight + 30}
              rx={10}
              fill="rgba(15, 23, 42, 0.9)"
              stroke={isStable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
              strokeWidth={1}
            />
            {/* Title */}
            <text x={stabilityWidth / 2} y={-5} textAnchor="middle" fill={colors.textSecondary} fontSize={10} fontWeight="bold">
              STABILITY POTENTIAL WELL
            </text>
            {/* Well fill gradient */}
            <path
              d={`M 0 ${stabilityHeight / 2}
                  Q ${stabilityWidth / 2} ${stabilityHeight / 2 + wellDepth} ${stabilityWidth} ${stabilityHeight / 2}
                  L ${stabilityWidth} ${stabilityHeight}
                  L 0 ${stabilityHeight}
                  Z`}
              fill="url(#slevWellGradient)"
            />
            {/* Well curve */}
            <path
              d={`M 0 ${stabilityHeight / 2}
                  Q ${stabilityWidth / 2} ${stabilityHeight / 2 + wellDepth} ${stabilityWidth} ${stabilityHeight / 2}`}
              fill="none"
              stroke={isStable ? colors.success : colors.error}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* Ball indicator in well */}
            <circle
              cx={stabilityWidth / 2 + ballIndicatorX}
              cy={stabilityHeight / 2 + wellDepth * (1 - Math.abs(ballIndicatorX) / (stabilityWidth / 2)) - 6}
              r={8}
              fill="url(#slevBallGradient)"
              stroke="#d97706"
              strokeWidth={1}
            />
            {/* Stability status */}
            <text
              x={stabilityWidth / 2}
              y={stabilityHeight + 8}
              textAnchor="middle"
              fill={isStable ? colors.success : colors.error}
              fontSize={9}
              fontWeight="bold"
            >
              {isStable ? 'STABLE EQUILIBRIUM' : 'UNSTABLE - ESCAPING WELL'}
            </text>
          </g>

          {/* === LABELS AND INFO === */}
          {/* Top-left info panel */}
          <g>
            <rect x={10} y={10} width={120} height={50} rx={8} fill="rgba(15, 23, 42, 0.85)" stroke="rgba(71, 85, 105, 0.5)" strokeWidth={1} />
            <text x={20} y={28} fill={colors.textPrimary} fontSize={12} fontWeight="bold">
              Tilt: {tiltAngle.toFixed(0)}deg
            </text>
            <text x={20} y={45} fill={colors.textSecondary} fontSize={10}>
              Mass: {ballMass === 0.5 ? 'Light (foam)' : ballMass === 1 ? 'Normal (PP)' : 'Heavy (golf)'}
            </text>
          </g>

          {/* Top-right stability badge */}
          <g>
            <rect
              x={width - 95}
              y={10}
              width={85}
              height={30}
              rx={15}
              fill={isStable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
              stroke={isStable ? colors.success : colors.error}
              strokeWidth={1.5}
            />
            <circle
              cx={width - 78}
              cy={25}
              r={5}
              fill={isStable ? colors.success : colors.error}
            />
            <text
              x={width - 50}
              y={29}
              textAnchor="middle"
              fill={isStable ? colors.success : colors.error}
              fontSize={11}
              fontWeight="bold"
            >
              {isStable ? 'STABLE' : 'UNSTABLE'}
            </text>
          </g>

          {/* Pressure legend when showing pressure */}
          {showPressure && (
            <g transform={`translate(${width - 130}, ${height - 90})`}>
              <rect x={-5} y={-5} width={125} height={50} rx={6} fill="rgba(15, 23, 42, 0.85)" stroke="rgba(71, 85, 105, 0.5)" strokeWidth={1} />
              <text x={55} y={10} textAnchor="middle" fill={colors.textMuted} fontSize={9} fontWeight="bold">PRESSURE ZONES</text>
              <circle cx={10} cy={25} r={6} fill="url(#slevPressureLow)" />
              <text x={22} y={28} fill={colors.pressure.low} fontSize={9}>Low (fast flow)</text>
              <circle cx={10} cy={40} r={6} fill="url(#slevPressureHigh)" />
              <text x={22} y={43} fill={colors.pressure.high} fontSize={9}>High (slow flow)</text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnimating ? 'Stop' : 'Animate'}
            </button>
            <button
              onClick={() => { setTiltAngle(0); setBallMass(1); setAirflowStrength(1); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showMassControl: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Tilt Angle: {tiltAngle.toFixed(0)}°
        </label>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value={tiltAngle}
          onChange={(e) => setTiltAngle(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Airflow Strength: {(airflowStrength * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={airflowStrength}
          onChange={(e) => setAirflowStrength(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showMassControl && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Ball Mass: {ballMass === 0.5 ? 'Light (foam ball)' : ballMass === 1 ? 'Normal (ping-pong)' : 'Heavy (golf ball)'}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.5"
            value={ballMass}
            onChange={(e) => setBallMass(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Max stable tilt: ~{(25 / ballMass).toFixed(0)}° for current ball
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Lighter balls can handle more tilt before falling
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
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

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Floating Ball Mystery
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If I tilt the airflow, will the ball fall?
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
                Point a hair dryer upward and place a ping-pong ball in the airstream.
                It floats! But here's the puzzle: even when you tilt the dryer,
                the ball stays suspended...
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                What invisible force keeps pulling it back to center?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try tilting the dryer using the controls below!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false, false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A ping-pong ball floats in the upward airstream from a hair dryer.
              You slowly tilt the dryer 20-30 degrees to one side.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the ball when you tilt the airstream?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Stable Levitation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Tilt the dryer and watch the ball's response
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Tilt slowly - watch the ball shift then return</li>
              <li>Find the maximum tilt before the ball falls</li>
              <li>Increase airflow - does stability improve?</li>
              <li>Enable animation to see oscillations</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'stable';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
              The ball stays in the stream and returns to center - stable levitation!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Stable Levitation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Bernoulli's Principle:</strong> When air flows
                faster, its pressure drops. Around the ball, air speeds up as it squeezes past the edges.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Restoring Force:</strong> If the ball moves
                sideways, air flows faster on one side (lower pressure) than the other (higher pressure).
                This pressure difference pushes the ball back to center.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Potential Well:</strong> The ball sits in an
                energy minimum - like a marble in a bowl. Small displacements create forces that push it back,
                making the equilibrium stable.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we change the ball's weight?
            </p>
          </div>

          {renderVisualization(false, false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Instead of a standard ping-pong ball, we try a very light foam ball and
              a heavier ball (like a golf ball, with same size). The airflow stays the same.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does ball weight affect stability?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Different Ball Weights</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change ball mass and observe stability changes
            </p>
          </div>

          {renderVisualization(true)}
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
              Lighter balls can handle more tilt! The restoring force (from pressure differences)
              is the same, but it accelerates lighter balls more effectively back to center.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'light_better';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
              Lighter balls are more stable and can handle larger tilt angles!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Mass and Stability</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Same Force, Different Response:</strong> The
                pressure-based restoring force is roughly the same for any ball of the same size. But
                F=ma means lighter balls accelerate faster back to center.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Deeper Potential Well:</strong> For light
                balls, the effective "bowl" they sit in is steeper - they experience stronger
                restoring acceleration for the same displacement.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Gravity Competition:</strong> Heavy balls
                feel stronger gravitational pull sideways when tilted, while the aerodynamic restoring
                force stays the same. They escape the stable region at smaller tilts.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Stable levitation physics appears in many technologies
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
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
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
                {testScore >= 8 ? 'You\'ve mastered stable levitation!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : '-'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered stable levitation and Bernoulli physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Bernoulli principle: faster flow = lower pressure</li>
              <li>Pressure-based restoring forces create stability</li>
              <li>Potential well concept for stable equilibrium</li>
              <li>Mass affects stability through F=ma</li>
              <li>Real-world applications in aviation and transport</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The same principles govern how hummingbirds hover, how air bearings work in precision
              machinery, and how acoustic levitation suspends objects using sound waves. The Coanda
              effect is used in everything from aircraft lift to fluidic logic circuits!
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

export default StableLevitationRenderer;
