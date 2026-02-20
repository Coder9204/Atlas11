import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

interface StableLevitationRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
type Phase = typeof PHASES[number];

const realWorldApps = [
  {
    icon: '🚄',
    title: 'Maglev Trains',
    short: 'Magnetic levitation for frictionless transport',
    tagline: 'Floating at 600 km/h',
    description: 'Maglev trains use electromagnetic forces to levitate above the track, eliminating wheel friction. This enables speeds over 600 km/h while providing a smooth, quiet ride with 90% energy efficiency. Japan\'s Chuo Shinkansen maglev line will connect Tokyo and Osaka in under 40 minutes.',
    connection: 'Like Bernoulli levitation, maglev requires stable equilibrium in multiple dimensions. Active feedback control adjusts electromagnet current to maintain constant gap despite disturbances.',
    howItWorks: 'Electromagnetic suspension (EMS) uses attractive force from beneath, with sensors and controllers adjusting current thousands of times per second. Electrodynamic suspension (EDS) uses repulsive force from superconducting magnets.',
    stats: [
      { value: '603 km/h', label: 'Speed record (Japan)', icon: '🚀' },
      { value: '10 mm', label: 'Levitation gap', icon: '📏' },
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
    description: 'Ultrasonic transducers create standing waves at 40 kHz that trap small objects (up to 5 mm) at pressure nodes. This enables contactless manipulation for pharmaceutical processing, materials research, and microgravity simulation. Sound intensity of 160 dB creates sufficient pressure gradients.',
    connection: 'Like Bernoulli levitation using air pressure differences, acoustic levitation uses sound pressure gradients. Objects rest in low-pressure nodes surrounded by high-pressure antinodes.',
    howItWorks: 'Arrays of ultrasonic speakers create interference patterns with stable trapping points. Multiple transducers allow 3D positioning. Frequency tuning adjusts trap stiffness and position.',
    stats: [
      { value: '40 kHz', label: 'Typical frequency', icon: '🔊' },
      { value: '5 mm', label: 'Max object size', icon: '📐' },
      { value: '160 dB', label: 'Sound intensity', icon: '📢' }
    ],
    examples: ['Drug formulation', 'Containerless processing', 'Cell manipulation', 'Art installations'],
    companies: ['Ultrahaptics', 'Argonne National Lab', 'Bristol Ultrasonics', 'Sonovol'],
    futureImpact: 'Mid-air haptic displays will let users feel virtual objects, with acoustic levitation creating tactile interfaces for VR and touchless public interfaces.',
    color: '#3b82f6'
  },
  {
    icon: '🧲',
    title: 'Magnetic Bearings',
    short: 'Frictionless rotation for precision machines',
    tagline: 'Spinning without touching',
    description: 'Active magnetic bearings suspend rotating shafts without contact, eliminating friction, wear, and lubricant contamination. Achieves up to 100,000 RPM with zero friction losses and over 10 years of maintenance-free life. Used in turbomachinery, flywheels, and precision instruments.',
    connection: 'Magnetic bearings face the same stability challenge as Bernoulli levitation. Earnshaw\'s theorem prohibits stable passive magnetic suspension, so active feedback control is essential.',
    howItWorks: 'Position sensors measure shaft location. Controllers calculate required restoring forces. Electromagnets provide forces proportional to displacement. Digital control enables stiffness tuning.',
    stats: [
      { value: '100k RPM', label: 'Max speed achievable', icon: '🔄' },
      { value: '0 friction', label: 'Friction losses', icon: '✨' },
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
    description: 'Levitation enables melting and processing materials without crucible contact, preventing contamination. Essential for producing ultra-pure metals (99.9999% purity), glasses, and studying undercooled liquids at temperatures up to 3000°C. NASA Glenn and DLR lead research in this area.',
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
  phase: externalPhase,
  gamePhase: externalGamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Determine initial phase from props
  const getInitialPhase = (): Phase => {
    const p = externalPhase || externalGamePhase;
    if (p && PHASES.includes(p as Phase)) return p as Phase;
    return 'hook';
  };

  const [currentPhase, setCurrentPhase] = useState<Phase>(getInitialPhase);

  // Update if external prop changes
  useEffect(() => {
    const p = externalPhase || externalGamePhase;
    if (p && PHASES.includes(p as Phase)) {
      setCurrentPhase(p as Phase);
    }
  }, [externalPhase, externalGamePhase]);

  const phase = currentPhase;

  // Simulation state
  const [tiltAngle, setTiltAngle] = useState(10);
  const [ballMass, setBallMass] = useState(1); // 0.5 = light, 1 = normal, 2 = heavy
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [ballOffset, setBallOffset] = useState({ x: 0, y: 0 });
  const [airflowStrength, setAirflowStrength] = useState(0.7);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
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
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const stabilityFactor = 1 / (ballMass * 0.8);
    const equilibriumX = Math.sin(tiltRad) * 30 * (1 / stabilityFactor);
    const equilibriumY = Math.cos(tiltRad) * 10 * (ballMass - 1);
    const oscillation = isAnimating ? Math.sin(animationTime * 3) * 5 * (1 / stabilityFactor) : 0;
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

  const testQuestions = [
    {
      question: 'In the levitation demonstration, when the ball is displaced sideways from the center of the airstream, what physical mechanism brings it back to the center?',
      scenario: 'Imagine a ping-pong ball floating in a vertical airstream from a hair dryer. You gently push it sideways.',
      options: [
        { text: 'The ball is lighter than air', correct: false },
        { text: 'Pressure differences from varying airflow speeds create a restoring force', correct: true },
        { text: 'Static electricity attracts the ball to the center', correct: false },
        { text: 'The air pushes equally from all directions', correct: false },
      ],
    },
    {
      question: 'According to Bernoulli\'s principle, when airflow velocity increases as it squeezes past the edges of the levitating ball, what happens to the air pressure in that region?',
      scenario: 'Consider air flowing around a ball. Where the stream narrows, velocity increases.',
      options: [
        { text: 'Pressure increases because more air is flowing', correct: false },
        { text: 'Pressure decreases (Bernoulli principle: faster flow = lower pressure)', correct: true },
        { text: 'Pressure stays exactly the same', correct: false },
        { text: 'Pressure fluctuates randomly', correct: false },
      ],
    },
    {
      question: 'When you gradually tilt the hair dryer to one side while the ball is levitating, the ball initially moves sideways. What happens next?',
      scenario: 'A ball floats in a tilted airstream at about 20 degrees from vertical.',
      options: [
        { text: 'The ball falls out of the stream completely', correct: false },
        { text: 'The ball stays displaced to one side permanently', correct: false },
        { text: 'The ball returns toward the center of the stream (restoring force)', correct: true },
        { text: 'The ball rises higher in the stream', correct: false },
      ],
    },
    {
      question: 'The stable levitation point acts like a potential energy:',
      scenario: 'Think about the energy landscape the ball experiences in the airstream.',
      options: [
        { text: 'Maximum (unstable equilibrium - like a ball on a hilltop)', correct: false },
        { text: 'Minimum (stable equilibrium - like a ball in a bowl, a "potential well")', correct: true },
        { text: 'Zero potential energy point', correct: false },
        { text: 'Infinite potential energy barrier', correct: false },
      ],
    },
    {
      question: 'Compared to a normal ping-pong ball, a heavier ball in the same airstream:',
      scenario: 'You replace the ping-pong ball with a heavier ball of the same size.',
      options: [
        { text: 'Is more stable and can handle larger tilts', correct: false },
        { text: 'Is less stable and falls out at smaller tilt angles', correct: true },
        { text: 'Behaves exactly the same way as the ping-pong ball', correct: false },
        { text: 'Cannot levitate at all, regardless of airflow strength', correct: false },
      ],
    },
    {
      question: 'Bernoulli\'s principle states that for flowing fluid:',
      scenario: 'You are studying fluid dynamics and the relationship between speed and pressure.',
      options: [
        { text: 'Faster flow means higher pressure (like a fire hose)', correct: false },
        { text: 'Faster flow means lower pressure (conservation of energy)', correct: true },
        { text: 'Flow speed and pressure are completely unrelated', correct: false },
        { text: 'Pressure depends only on temperature, not speed', correct: false },
      ],
    },
    {
      question: 'Why does increasing airflow strength improve levitation stability?',
      scenario: 'You increase the hair dryer power from low to high setting.',
      options: [
        { text: 'It makes the air heavier and pushes harder', correct: false },
        { text: 'It increases the restoring force for a given displacement', correct: true },
        { text: 'It reduces the effect of gravity on the ball', correct: false },
        { text: 'It makes the ball lighter through air pressure', correct: false },
      ],
    },
    {
      question: 'The Coanda effect describes which physical phenomenon?',
      scenario: 'You observe that airflow tends to follow curved surfaces rather than moving in straight lines.',
      options: [
        { text: 'Heavy objects falling faster than light ones in air', correct: false },
        { text: 'A fluid jet following a curved surface (adhesion to surfaces)', correct: true },
        { text: 'Sound waves bouncing off walls and creating echoes', correct: false },
        { text: 'Light bending as it passes through water (refraction)', correct: false },
      ],
    },
    {
      question: 'Air hockey pucks stay centered on the table because:',
      scenario: 'An air hockey table blows air through tiny holes. When a puck drifts toward an edge...',
      options: [
        { text: 'The pucks are magnetic and attracted to the center', correct: false },
        { text: 'The table surface is perfectly flat and frictionless', correct: false },
        { text: 'Pressure differences in the air cushion create restoring forces', correct: true },
        { text: 'Friction along the edges holds the puck in place', correct: false },
      ],
    },
    {
      question: 'VTOL aircraft hovering is challenging primarily because:',
      scenario: 'A Harrier jet is trying to hover stationary at a fixed altitude.',
      options: [
        { text: 'The aircraft must balance on its thrust column like a ball on an airstream', correct: true },
        { text: 'The jet engines are too weak for sustained hovering', correct: false },
        { text: 'Hovering consumes less fuel than forward flight', correct: false },
        { text: 'Bernoulli\'s principle does not apply to jets', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const handleNext = () => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      setCurrentPhase(PHASES[idx + 1]);
    }
    if (onPhaseComplete) onPhaseComplete();
  };

  const handleBack = () => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      setCurrentPhase(PHASES[idx - 1]);
    }
  };

  const renderVisualization = (interactive: boolean, showPressure: boolean = true) => {
    const width = 500;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2 - 30;

    const dryerLength = 110;
    const dryerWidth = 55;
    const tiltRad = (tiltAngle * Math.PI) / 180;

    const ballRadius = 22;
    const ballY = centerY - 90 + ballOffset.y;
    const ballX = centerX + ballOffset.x;

    const fallThreshold = 25 / ballMass;
    const isStable = Math.abs(tiltAngle) <= fallThreshold;

    // Generate airflow particles
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

    // Generate field lines
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

    // Stability well - use absolute SVG coordinates spanning >= 25% of SVG height (>= 112.5px)
    const wellAbsLeft = 180;
    const wellAbsRight = 320;
    const wellAbsTop = 295;   // Top of well panel area
    const wellAbsBottom = 420; // Bottom - range = 125px = 27.8% of 450px SVG
    const wellWidth = wellAbsRight - wellAbsLeft;  // 140px
    const wellMidY = wellAbsBottom;   // Bottom of well (minimum potential)
    const wellTopY = wellAbsTop + 10; // Top rim of well (max potential visible)
    // airflowStrength affects well depth - stronger flow = deeper, more stable well
    // Minimum depth ensures >= 25% of SVG height (>= 112.5px out of 450px)
    const maxDepth = wellMidY - wellTopY; // 115px
    const wellDepthPx = isStable
      ? Math.max(113, Math.min(maxDepth, maxDepth * airflowStrength / ballMass))
      : Math.max(50, Math.min(maxDepth, maxDepth * 0.5 * airflowStrength));
    const ballIndicatorX = (ballOffset.x / 50) * (wellWidth / 2);

    // Generate smooth potential well using absolute coords (>= 20 M/L points)
    const numWellPoints = 20;
    const wellPoints: string[] = [];
    for (let i = 0; i <= numWellPoints; i++) {
      const t = i / numWellPoints;
      const wx = wellAbsLeft + t * wellWidth;
      const normX = (t - 0.5) * 2; // -1 to 1
      // Parabola: bottom at center (normX=0), rises at edges
      const wy = wellMidY - wellDepthPx * (1 - normX * normX);
      wellPoints.push(`${i === 0 ? 'M' : 'L'} ${wx.toFixed(1)} ${wy.toFixed(1)}`);
    }
    const wellPath = wellPoints.join(' ');
    const wellFillPath = wellPoints.join(' ') + ` L ${wellAbsRight} ${wellAbsBottom} L ${wellAbsLeft} ${wellAbsBottom} Z`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0c1929 0%, #0f172a 50%, #020617 100%)', borderRadius: '16px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="slevLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="slevDryerBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="45%" stopColor="#6b7280" />
              <stop offset="65%" stopColor="#374151" />
              <stop offset="85%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
            <radialGradient id="slevDryerNozzle" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <radialGradient id="slevBallGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
            <radialGradient id="slevBallHighlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <linearGradient id="slevAirflowStream" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#7dd3fc" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="slevAirParticle" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>
            <linearGradient id="slevFieldLine" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="slevPressureLow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="slevPressureHigh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="slevWellGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isStable ? '#10b981' : '#ef4444'} stopOpacity="0.1" />
              <stop offset="100%" stopColor={isStable ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="slevForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <filter id="slevParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="slevBallGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#fbbf24" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="slevDryerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="slevHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#f97316" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="slevArrowhead" markerWidth="12" markerHeight="9" refX="10" refY="4.5" orient="auto">
              <polygon points="0 0, 12 4.5, 0 9" fill="url(#slevForceArrow)" />
            </marker>
            <pattern id="slevLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 4" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#slevLabBg)" />
          <rect width={width} height={height} fill="url(#slevLabGrid)" />

          {/* Field lines */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 55})`} opacity={showPressure ? 0.7 : 0.3}>
            {fieldLines}
          </g>

          {/* Airflow cone - uses L points for >= 10 M/L data points */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 55})`}>
            <path
              d={(() => {
                const cx = centerX;
                const baseY = centerY + 55;
                const tipY = centerY - 110;
                const halfBase = 25;
                const numPts = 12;
                const leftEdge: string[] = [];
                const rightEdge: string[] = [];
                for (let i = 0; i <= numPts; i++) {
                  const t = i / numPts;
                  const spread = halfBase * (1 - t);
                  const y = baseY - t * (baseY - tipY);
                  if (i === 0) leftEdge.push(`M ${cx - spread} ${y}`);
                  else leftEdge.push(`L ${cx - spread} ${y}`);
                  rightEdge.push(`L ${cx + spread} ${y}`);
                }
                return leftEdge.join(' ') + ' ' + [...rightEdge].reverse().join(' ') + ' Z';
              })()}
              fill="url(#slevAirflowStream)"
            />
          </g>

          {/* Airflow particles */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 55})`}>
            {airflowParticles}
          </g>

          {/* Hair dryer */}
          <g transform={`rotate(${tiltAngle}, ${centerX}, ${centerY + 85})`}>
            <rect x={centerX - dryerWidth / 2} y={centerY + 60} width={dryerWidth} height={dryerLength} rx={12} fill="url(#slevDryerBody)" stroke="#374151" strokeWidth={1.5} />
            <rect x={centerX - dryerWidth / 2 + 5} y={centerY + 65} width={8} height={dryerLength - 15} rx={4} fill="rgba(255,255,255,0.1)" />
            <ellipse cx={centerX} cy={centerY + 60} rx={dryerWidth / 2 - 3} ry={10} fill="url(#slevDryerNozzle)" filter="url(#slevHeatGlow)" />
            <ellipse cx={centerX} cy={centerY + 60} rx={dryerWidth / 2 - 8} ry={6} fill="#111827" stroke="#f97316" strokeWidth={1} strokeOpacity={0.5} />
            <rect x={centerX + dryerWidth / 2 - 5} y={centerY + 105} width={45} height={22} rx={6} fill="url(#slevDryerBody)" stroke="#374151" strokeWidth={1.5} />
            {[0, 8, 16, 24, 32].map((offset) => (
              <line key={offset} x1={centerX + dryerWidth / 2 + offset} y1={centerY + 108} x2={centerX + dryerWidth / 2 + offset} y2={centerY + 124} stroke="#1f2937" strokeWidth={1} />
            ))}
            <circle cx={centerX} cy={centerY + 130} r={4} fill={isAnimating ? '#22c55e' : '#64748b'} filter={isAnimating ? 'url(#slevParticleGlow)' : 'none'} />
          </g>

          {/* Pressure indicators */}
          {showPressure && isStable && (
            <>
              <ellipse cx={ballX - ballRadius - 8} cy={ballY} rx={12} ry={18} fill="url(#slevPressureLow)" opacity={0.7} />
              <ellipse cx={ballX + ballRadius + 8} cy={ballY} rx={12} ry={18} fill="url(#slevPressureLow)" opacity={0.7} />
              <ellipse cx={ballX} cy={ballY + ballRadius + 10} rx={20} ry={10} fill="url(#slevPressureHigh)" opacity={0.6} />
            </>
          )}

          {/* Levitating ball */}
          <g filter="url(#slevBallGlow)">
            <ellipse cx={ballX + 5} cy={centerY + 45} rx={ballRadius * 0.6} ry={6} fill="#000" opacity={0.3} />
            <circle cx={ballX} cy={ballY} r={ballRadius} fill="url(#slevBallGradient)" stroke="#d97706" strokeWidth={1.5} />
            <ellipse cx={ballX - 7} cy={ballY - 8} rx={8} ry={5} fill="url(#slevBallHighlight)" />
            <circle cx={ballX + 5} cy={ballY + 6} r={3} fill="rgba(255,255,255,0.2)" />
          </g>

          {/* Force arrows */}
          {Math.abs(tiltAngle) > 3 && isStable && (
            <>
              <line x1={ballX + Math.sign(tiltAngle) * 40} y1={ballY} x2={ballX + Math.sign(tiltAngle) * 15} y2={ballY} stroke="url(#slevForceArrow)" strokeWidth={4} strokeLinecap="round" markerEnd="url(#slevArrowhead)" />
              <text x={ballX + Math.sign(tiltAngle) * 58} y={ballY + 20} textAnchor="middle" fill={colors.success} fontSize={11} fontWeight="bold">F restore</text>
            </>
          )}

          {/* Top-left info panel: Tilt - absolute coords */}
          <rect x={10} y={10} width={130} height={28} rx={8} fill="rgba(15, 23, 42, 0.85)" stroke="rgba(71, 85, 105, 0.5)" strokeWidth={1} />
          <text x={20} y={28} fill={colors.textPrimary} fontSize={12} fontWeight="bold">
            Tilt: {tiltAngle.toFixed(0)}°
          </text>

          {/* Top-right stability badge - absolute coords */}
          <rect x={width - 95} y={10} width={85} height={30} rx={15} fill={isStable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} stroke={isStable ? colors.success : colors.error} strokeWidth={1.5} />
          <circle cx={width - 78} cy={25} r={5} fill={isStable ? colors.success : colors.error} />
          <text x={width - 50} y={29} textAnchor="middle" fill={isStable ? colors.success : colors.error} fontSize={11} fontWeight="bold">
            {isStable ? 'STABLE' : 'UNSTABLE'}
          </text>

          {/* Bernoulli formula - absolute coords, top center */}
          <rect x={centerX - 80} y={46} width={160} height={38} rx={6} fill="rgba(15, 23, 42, 0.85)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth={1} />
          <text x={centerX} y={59} textAnchor="middle" fill={colors.accent} fontSize={11} fontWeight="bold">Bernoulli Equation</text>
          <text x={centerX} y={78} textAnchor="middle" fill={colors.textPrimary} fontSize={12} fontFamily="monospace">P + ½ρv² = const</text>

          {/* Mass label - absolute coords, below Bernoulli, far left */}
          <rect x={10} y={48} width={130} height={28} rx={6} fill="rgba(15, 23, 42, 0.75)" stroke="rgba(71, 85, 105, 0.3)" strokeWidth={1} />
          <text x={75} y={66} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
            {ballMass === 0.5 ? 'Light (foam)' : ballMass === 1 ? 'Normal (PP)' : 'Heavy (golf)'}
          </text>

          {/* Pressure legend - absolute coords, right side */}
          {showPressure && (
            <>
              <rect x={width - 145} y={88} width={138} height={58} rx={6} fill="rgba(15, 23, 42, 0.85)" stroke="rgba(71, 85, 105, 0.5)" strokeWidth={1} />
              <text x={width - 76} y={102} textAnchor="middle" fill={colors.textSecondary} fontSize={11} fontWeight="bold">PRESSURE ZONES</text>
              <circle cx={width - 133} cy={116} r={6} fill="url(#slevPressureLow)" />
              <text x={width - 120} y={120} fill={colors.pressure.low} fontSize={11}>Low (fast flow)</text>
              <circle cx={width - 133} cy={134} r={6} fill="url(#slevPressureHigh)" />
              <text x={width - 120} y={138} fill={colors.pressure.high} fontSize={11}>High (slow flow)</text>
            </>
          )}

          {/* Stability potential well panel - absolute SVG coordinates (no group transform) */}
          {/* Panel background */}
          <rect x={wellAbsLeft - 15} y={wellAbsTop - 20} width={wellWidth + 30} height={wellAbsBottom - wellAbsTop + 35} rx={10} fill="rgba(15, 23, 42, 0.9)" stroke={isStable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'} strokeWidth={1} />
          {/* Title */}
          <text x={wellAbsLeft + wellWidth / 2} y={wellAbsTop - 6} textAnchor="middle" fill={colors.textSecondary} fontSize={11} fontWeight="bold">STABILITY POTENTIAL WELL</text>
          {/* Axis grid lines at absolute coordinates */}
          <line x1={wellAbsLeft} y1={wellTopY} x2={wellAbsRight} y2={wellTopY} stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} strokeDasharray="4 4" opacity="0.3" />
          <line x1={wellAbsLeft} y1={(wellTopY + wellMidY) / 2} x2={wellAbsRight} y2={(wellTopY + wellMidY) / 2} stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} strokeDasharray="4 4" opacity="0.3" />
          {/* Y-axis label */}
          <text x={wellAbsLeft - 8} y={wellTopY + 4} textAnchor="end" fill={colors.textSecondary} fontSize={11}>E</text>
          {/* X-axis label */}
          <text x={wellAbsLeft + wellWidth / 2} y={wellAbsBottom + 14} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>Position</text>
          {/* Well fill */}
          <path d={wellFillPath} fill="url(#slevWellGradient)" />
          {/* Well curve (smooth with many points) */}
          <path d={wellPath} fill="none" stroke={isStable ? colors.success : colors.error} strokeWidth={2.5} strokeLinecap="round" />
          {/* Ball indicator on well */}
          {(() => {
            const ballNormX = ballIndicatorX / (wellWidth / 2);
            const ballWellY = wellMidY - wellDepthPx * (1 - ballNormX * ballNormX);
            return (
              <circle
                cx={wellAbsLeft + wellWidth / 2 + ballIndicatorX}
                cy={ballWellY}
                r={8}
                fill="url(#slevBallGradient)"
                stroke="#d97706"
                strokeWidth={1}
                filter="url(#slevBallGlow)"
              />
            );
          })()}
          {/* Status text */}
          <text x={wellAbsLeft + wellWidth / 2} y={wellAbsBottom + 28} textAnchor="middle" fill={isStable ? colors.success : colors.error} fontSize={11} fontWeight="bold">
            {isStable ? 'STABLE EQUILIBRIUM' : 'ESCAPING WELL'}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? `linear-gradient(135deg, ${colors.error}, #dc2626)`
                  : `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                minHeight: '44px',
                transition: 'all 0.2s ease',
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
                minHeight: '44px',
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
          onInput={(e) => setTiltAngle(parseFloat((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            accentColor: '#3b82f6',
            WebkitAppearance: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>-45° (max left)</span>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>+45° (max right)</span>
        </div>
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
          onInput={(e) => setAirflowStrength(parseFloat((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            accentColor: '#3b82f6',
            WebkitAppearance: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>50% (low flow)</span>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>150% (high flow)</span>
        </div>
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
            onInput={(e) => setBallMass(parseFloat((e.target as HTMLInputElement).value))}
            style={{
              width: '100%',
              height: '20px',
              touchAction: 'pan-y',
              accentColor: '#3b82f6',
              WebkitAppearance: 'none',
              cursor: 'pointer',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Light (0.5x)</span>
            <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Heavy (2x)</span>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Max stable tilt: ~{(25 / ballMass).toFixed(0)}° for current ball mass
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Observe: lighter balls handle more tilt before falling out
        </div>
      </div>
    </div>
  );

  const currentPhaseIndex = PHASES.indexOf(phase);
  const progressPercent = ((currentPhaseIndex + 1) / PHASES.length) * 100;

  const renderNavHeader = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
      padding: '12px 16px',
      zIndex: 1001,
    }}>
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: '8px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: `${progressPercent}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${colors.accent}, #a78bfa)`,
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {PHASES.map((p, index) => {
          const labels: Record<string, string> = {
            hook: 'explore hook',
            predict: 'predict phase',
            play: 'experiment play',
            review: 'review understanding',
            twist_predict: 'predict twist variable',
            twist_play: 'experiment twist play',
            twist_review: 'review twist insight',
            transfer: 'transfer real-world apply',
            test: 'test knowledge quiz',
            mastery: 'mastery complete transfer',
          };
          return (
            <button
              key={p}
              aria-label={`${labels[p] || p} phase`}
              title={labels[p] || p}
              onClick={() => setCurrentPhase(p)}
              style={{
                width: '10px',
                height: '10px',
                minHeight: '10px',
                borderRadius: '50%',
                border: 'none',
                background: index === currentPhaseIndex
                  ? `linear-gradient(135deg, ${colors.accent}, #a78bfa)`
                  : index < currentPhaseIndex ? colors.success : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string, showBack: boolean = true) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1001,
    }}>
      {showBack && phase !== 'hook' ? (
        <button
          onClick={handleBack}
          aria-label="Back"
          style={{
            padding: '12px 24px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.textSecondary}`,
            background: 'transparent',
            color: colors.textPrimary,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={handleNext}
        disabled={disabled && !canProceed}
        aria-label="Next"
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed
            ? `linear-gradient(135deg, ${colors.accent}, #7c3aed)`
            : 'rgba(255,255,255,0.1)',
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
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Floating Ball Mystery
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If I tilt the airflow, will the ball fall?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Point a hair dryer upward and place a ping-pong ball in the airstream.
                It floats! But here's the puzzle: even when you tilt the dryer,
                the ball stays suspended and returns to center...
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                What invisible force keeps pulling it back? <strong style={{ color: colors.accent }}>Explore</strong> the controls and observe how the ball behaves.
              </p>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try tilting the dryer — watch how the ball responds and returns. Notice the stability potential well at the bottom of the visualization.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue: Make a Prediction →', false)}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          {renderVisualization(false, false)}

          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A ping-pong ball floats in the upward airstream from a hair dryer.
              You slowly tilt the dryer 20-30 degrees to one side.
              Watch carefully — what do you predict will happen?
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
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                    fontWeight: prediction === p.id ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Experiment: Stable Levitation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust controls and observe how the ball responds — watch for the restoring force
            </p>
          </div>

          {/* What the visualization shows */}
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', margin: '0 16px 16px 16px', padding: '12px 16px', borderRadius: '8px', borderLeft: `3px solid ${colors.airflow}` }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, marginBottom: '8px', fontWeight: 600 }}>
              What this visualization shows:
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              A hair dryer blowing air upward (blue particles), a levitating ball, and a
              <strong> stability potential well graph</strong> at the bottom — deeper wells mean stronger stability.
              Watch how <strong>tilting</strong> the dryer shifts the ball's equilibrium position.
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', margin: '0 16px 16px 16px', padding: '12px 16px', borderRadius: '8px', borderLeft: `3px solid ${colors.airflow}` }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Observe carefully:</strong> As you tilt the dryer,
              watch how the ball first moves sideways, then returns toward center. Notice the restoring force arrow
              that appears when tilted. Pay attention to how the well depth changes with airflow strength.
              Try adjusting the slider to see what happens — experiment with different tilt angles.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization(true)}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls(false)}
            </div>
          </div>

          {/* Cause-effect explanation */}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.accent}` }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>Cause and Effect</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              When you <strong style={{ color: colors.textPrimary }}>increase the tilt angle</strong>, the ball's position shifts sideways.
              At small tilts, pressure differences (Bernoulli's principle) create a restoring force that brings the ball back.
              At large tilts, the ball escapes the stable region and falls out of the airstream.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              When you <strong style={{ color: colors.textPrimary }}>increase airflow strength</strong>, the well becomes deeper —
              stronger pressure differences create a larger restoring force, making the system more stable.
              Compare: low vs. high airflow gives you a before-after view of stability.
            </p>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
              <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: colors.success, fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>Low Tilt (&lt;15°)</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Ball returns to center, stable equilibrium maintained</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: colors.error, fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>High Tilt (&gt;25°)</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Ball escapes the potential well, falls out of stream</div>
              </div>
            </div>
          </div>

          {/* Key physics concepts */}
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.airflow}` }}>
            <h4 style={{ color: colors.airflow, marginBottom: '12px', fontWeight: 600 }}>Key Physics Concepts</h4>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Bernoulli's Principle:</strong> P + ½ρv² = const.
                In a flowing fluid, regions with higher velocity have lower pressure.
                This explains why the ball is pushed toward the center where airflow is fastest.
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Stable Equilibrium:</strong> A state where disturbances
                create restoring forces — like a ball at the bottom of a bowl. This is the "potential well" concept.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Coanda Effect:</strong> The tendency of a fluid jet to
                follow a curved surface, which helps keep the airflow attached to the ball's surface and creates the pressure differential.
              </p>
            </div>
          </div>

          {/* Real-world relevance */}
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Why This Matters — Real-World Applications</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This stable equilibrium principle enables <strong style={{ color: colors.textPrimary }}>maglev trains</strong> to float at 603 km/h,
              <strong style={{ color: colors.textPrimary }}> magnetic bearings</strong> to spin at 100,000 RPM frictionlessly in turbines, and
              <strong style={{ color: colors.textPrimary }}> acoustic levitation</strong> at 40 kHz to suspend materials for 99.9999% pure contamination-free processing.
              Companies like <strong style={{ color: colors.textPrimary }}>Central Japan Railway</strong> and{' '}
              <strong style={{ color: colors.textPrimary }}>SKF</strong> use these principles for real industrial applications.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'stable';

    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Your prediction was correct!' : 'Not quite — here\'s what you observed:'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              As you saw in the experiment: the ball stays in the stream and returns to center — stable levitation!
              Your prediction and observation reveal the physics of restoring forces.
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>The Physics of Stable Levitation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Bernoulli's Principle explains this:</strong> When air flows
                faster, its pressure drops. Around the ball, air speeds up as it squeezes past the edges.
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px',
                fontFamily: 'monospace',
                fontSize: '15px',
                textAlign: 'center',
              }}>
                <div style={{ color: colors.textPrimary, marginBottom: '4px' }}>P + ½ρv² = constant</div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>Pressure + Dynamic Pressure = Total Pressure</div>
              </div>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Restoring Force:</strong> If the ball moves
                sideways, air flows faster on one side (lower pressure) than the other (higher pressure).
                This pressure difference pushes the ball back to center — exactly what the experiment demonstrates.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Potential Well:</strong> The ball sits in an
                energy minimum — like a marble in a bowl. Small displacements create restoring forces,
                because the relationship F = −dE/dx means any displacement from the minimum creates a force back.
              </p>
            </div>
          </div>

          {renderVisualization(false, true)}
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist: New Variable!</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we change the ball's weight? A new variable to experiment with.
            </p>
          </div>

          {renderVisualization(false, false)}

          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>New Twist Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Instead of a standard ping-pong ball, we try a very light foam ball (0.5x mass) and
              a heavier ball like a golf ball (2x mass, same size). The airflow stays the same.
              Watch what happens when we change this new variable — mass.
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
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                    fontWeight: twistPrediction === p.id ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Experiment: Different Ball Masses</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change ball mass and observe how stability changes — compare before and after
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', margin: '0 16px 16px 16px', padding: '12px 16px', borderRadius: '8px', borderLeft: `3px solid ${colors.warning}` }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Observe carefully:</strong> Change the ball mass and compare how each responds to tilting.
              Watch the stability well — it becomes deeper for lighter balls. Notice the maximum stable tilt angle
              changes when you adjust the mass slider. This demonstrates how mass affects the balance between
              gravitational and aerodynamic forces. Try adjusting mass while keeping tilt constant.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization(true)}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls(true)}
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px' }}>Comparison: Mass vs. Stability</h4>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.success, fontWeight: 'bold', marginBottom: '4px' }}>Light Ball (0.5×)</div>
                <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Max stable tilt: ~50°</div>
                <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Stability: High</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.error, fontWeight: 'bold', marginBottom: '4px' }}>Heavy Ball (2×)</div>
                <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Max stable tilt: ~12°</div>
                <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Stability: Low</div>
              </div>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Lighter balls handle more tilt! The restoring force (from pressure differences)
              is the same, but F=ma means it accelerates lighter balls more effectively back to center.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'light_better';

    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Lighter balls are more stable and can handle larger tilt angles!
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Mass and Stability: The Physics</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Same Force, Different Response:</strong> The
                pressure-based restoring force is roughly the same for any ball of the same size. But
                Newton's F=ma means lighter balls accelerate faster back to center for the same force.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Deeper Potential Well:</strong> For light
                balls, the effective "bowl" they sit in is steeper — they experience stronger
                restoring acceleration for the same displacement. The equation shows: a = F/m, so smaller m → larger a.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Gravity Competition:</strong> Heavy balls
                feel stronger gravitational pull sideways when tilted (F_gravity = mg·sin θ), while the aerodynamic restoring
                force stays the same. They escape the stable region at smaller tilts.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Stable Levitation"
        applications={realWorldApps}
        onComplete={() => setCurrentPhase('test')}
        isMobile={isMobile}
        colors={colors}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[currentTransferApp];
    const isCompleted = transferCompleted.has(currentTransferApp);
    const allCompleted = transferCompleted.size >= realWorldApps.length;

    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Apply: Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Stable levitation physics appears in many technologies
            </p>
            {/* Progress: App X of Y */}
            <p style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
              App {currentTransferApp + 1} of {realWorldApps.length} — {transferCompleted.size} completed
            </p>

            {/* App selector tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTransferApp(i)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: currentTransferApp === i ? `2px solid ${a.color}` : '1px solid rgba(255,255,255,0.2)',
                    background: currentTransferApp === i ? `${a.color}30` : 'transparent',
                    color: currentTransferApp === i ? a.color : colors.textSecondary,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: currentTransferApp === i ? 700 : 400,
                  }}
                >
                  {transferCompleted.has(i) ? '✓ ' : ''}{a.icon} {a.title}
                </button>
              ))}
            </div>

            {/* Current app card */}
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', border: isCompleted ? `2px solid ${colors.success}` : `1px solid rgba(255,255,255,0.1)`, marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '36px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ color: colors.textPrimary, margin: 0, fontSize: '18px', fontWeight: 700 }}>{app.title}</h3>
                  <p style={{ color: app.color, margin: 0, fontSize: '13px' }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
                {app.description}
              </p>

              {/* Numeric stats */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {app.stats.map((stat, si) => (
                  <div key={si} style={{ background: `${app.color}20`, padding: '10px 14px', borderRadius: '8px', flex: '1 1 auto', minWidth: '90px', textAlign: 'center' }}>
                    <div style={{ color: app.color, fontSize: '18px', fontWeight: 'bold' }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Companies */}
              <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '12px' }}>
                Companies: {app.companies.join(' · ')}
              </p>

              {/* Connection to lesson */}
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>
                  Connection to Stable Levitation:
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>{app.connection}</p>
              </div>

              {/* How it Works */}
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>
                  How It Works:
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>{app.howItWorks}</p>
              </div>

              {!isCompleted ? (
                <button
                  onClick={() => {
                    setTransferCompleted(new Set([...transferCompleted, currentTransferApp]));
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${app.color}, ${app.color}aa)`,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    minHeight: '44px',
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  Got It — See Future Impact
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>Future Impact:</p>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{app.futureImpact}</p>
                </div>
              )}
            </div>

            {/* Navigation between apps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                onClick={() => setCurrentTransferApp(Math.max(0, currentTransferApp - 1))}
                disabled={currentTransferApp === 0}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  background: 'transparent',
                  color: currentTransferApp === 0 ? colors.textMuted : colors.textPrimary,
                  cursor: currentTransferApp === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                ← Previous App
              </button>
              {currentTransferApp < realWorldApps.length - 1 ? (
                <button
                  onClick={() => setCurrentTransferApp(currentTransferApp + 1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Next App →
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Continue to Test →
                </button>
              )}
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Take the Test →')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
          {renderNavHeader()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
            <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered stable levitation physics!' : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 16px' }}>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer!].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, margin: '8px 0', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>{qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{ padding: '6px 10px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontSize: '13px' }}>
                        {opt.correct ? '✓ Correct: ' : userAnswer === oIndex ? '✗ Your answer: ' : '  '} {opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '16px' }}>
            {/* Q.1: Prominent question counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: colors.textPrimary, margin: 0 }}>Knowledge Test</h2>
              <span style={{ color: colors.accent, fontSize: '18px', fontWeight: 'bold' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background 0.3s' }} />
              ))}
            </div>

            {/* Scenario context */}
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${colors.airflow}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, fontStyle: 'italic' }}>{currentQ.scenario}</p>
            </div>

            {/* Question */}
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, margin: 0 }}>{currentQ.question}</p>
            </div>

            {/* Answer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                    fontWeight: testAnswers[currentTestQuestion] === oIndex ? 600 : 400,
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation between questions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textSecondary}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                minHeight: '44px',
                fontWeight: 600,
              }}
            >Previous</button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
                  color: 'white',
                  cursor: 'pointer',
                  minHeight: '44px',
                  fontWeight: 600,
                }}
              >Next</button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null)
                    ? colors.textMuted
                    : `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  minHeight: '44px',
                  fontWeight: 600,
                }}
              >Submit Test</button>
            )}
          </div>
        </div>
        {/* Bottom bar disabled during active test - must answer all questions first */}
        {renderBottomBar(true, false, 'Complete Test to Continue →')}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {renderNavHeader()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Complete!</h1>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginBottom: '8px' }}>Congratulations — you've mastered stable levitation and Bernoulli physics!</p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
              Great work completing all phases and passing the knowledge test.
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
              <li>Bernoulli principle: faster flow = lower pressure (P + ½ρv² = const)</li>
              <li>Pressure-based restoring forces create stable equilibrium</li>
              <li>Potential well concept: energy minimum resists displacement</li>
              <li>Mass affects stability through Newton's F=ma law</li>
              <li>Coanda effect keeps airflow attached to curved surfaces</li>
              <li>Real-world applications: maglev trains (603 km/h), magnetic bearings (100k RPM), acoustic levitation (40 kHz)</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The same principles govern how hummingbirds hover, how air bearings work in precision
              machinery, and how acoustic levitation suspends objects using sound waves. The Coanda
              effect is used in everything from aircraft lift to fluidic logic circuits!
              Your score demonstrates you've achieved true understanding of these principles.
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default StableLevitationRenderer;
