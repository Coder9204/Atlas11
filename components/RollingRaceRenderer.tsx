import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '🚗',
    title: 'Automotive Wheel Design',
    short: 'Reducing wheel rotational inertia improves acceleration, braking, and fuel efficiency',
    tagline: 'Every gram of wheel matters',
    description: 'Automotive engineers obsess over wheel rotational inertia because it directly affects vehicle dynamics. Reducing unsprung rotating mass improves acceleration (less energy stored in spinning), braking (less rotational energy to dissipate), and fuel efficiency. Lightweight alloy and carbon fiber wheels cost more but transform how a car performs.',
    connection: 'This game teaches how moment of inertia affects rolling acceleration - exactly why lightweight wheels make cars feel more responsive.',
    howItWorks: 'A wheel with high rotational inertia resists speed changes. When accelerating, energy goes into both translational motion and rotation. Hollow designs and low-density materials reduce I while maintaining strength. Each kg saved from the wheel rim is worth 2-3 kg saved from the car body.',
    stats: [
      { value: '2-3x', label: 'Wheel weight effect multiplier', icon: '⚡' },
      { value: '10-15 kg', label: 'Typical alloy wheel mass', icon: '⚖️' },
      { value: '5-7 kg', label: 'Carbon wheel mass', icon: '🏎️' }
    ],
    examples: ['Carbon fiber race wheels', 'Forged aluminum alloys', 'Magnesium wheels', 'Flow-formed wheels'],
    companies: ['BBS', 'HRE Wheels', 'Vossen', 'Enkei'],
    futureImpact: 'Electric vehicles with in-wheel motors will require radical rethinking of wheel inertia optimization as the motor becomes part of the rotating mass.',
    color: '#3B82F6'
  },
  {
    icon: '🏊',
    title: 'Flywheel Energy Storage',
    short: 'High-inertia flywheels store grid-scale energy as rotational kinetic energy',
    tagline: 'Spinning up the power grid',
    description: 'Flywheel energy storage systems use massive rotating discs to store electrical energy as rotational kinetic energy. When demand exceeds supply, the flywheel momentum is converted back to electricity. The key is maximizing moment of inertia - energy stored scales with I*omega^2. Carbon fiber flywheels spin at 60,000+ RPM.',
    connection: 'The moment of inertia physics in this game directly explains flywheel energy storage - why mass distribution matters more than total mass for storing energy.',
    howItWorks: 'A motor/generator accelerates a flywheel during low demand (storing energy) and extracts power during peaks (releasing energy). Carbon composite allows high rim speed for maximum energy density. Magnetic bearings and vacuum enclosures minimize friction losses.',
    stats: [
      { value: '100 MJ', label: 'Energy per flywheel', icon: '⚡' },
      { value: '60,000 RPM', label: 'Carbon flywheel speed', icon: '🔄' },
      { value: '95%+', label: 'Round-trip efficiency', icon: '📊' }
    ],
    examples: ['Grid frequency regulation', 'UPS backup power', 'EV regenerative storage', 'Tokamak pulse power'],
    companies: ['Beacon Power', 'Amber Kinetics', 'Stornetic', 'Punch Flybrid'],
    futureImpact: 'Lower-cost carbon fiber and superconducting bearings could make flywheels competitive with batteries for multi-hour grid storage.',
    color: '#10B981'
  },
  {
    icon: '🛹',
    title: 'Skateboard and Bicycle Wheels',
    short: 'Wheel inertia affects acceleration response and maintaining speed over rough terrain',
    tagline: 'The physics of smooth rolling',
    description: 'Skateboarders and cyclists intuitively understand wheel inertia. Heavier wheels maintain speed better over cracks and bumps but are sluggish to accelerate. Lightweight wheels respond instantly but slow down faster on rough surfaces. The right choice depends on riding style and terrain.',
    connection: 'This game demonstrates why hollow vs solid cylinders have different accelerations - explaining the performance tradeoffs in wheel design.',
    howItWorks: 'Wheel angular momentum resists change. High-inertia wheels carry through obstacles better because more energy is stored in rotation. Low-inertia wheels accelerate faster from stops and respond quicker to pushes. Skaters choose based on street (lighter) vs cruising (heavier) priorities.',
    stats: [
      { value: '50-60mm', label: 'Street skate wheels', icon: '🛹' },
      { value: '60-75mm', label: 'Cruiser wheels', icon: '🏄' },
      { value: '1.5-2 kg', label: 'Road bike wheel target', icon: '🚴' }
    ],
    examples: ['Spitfire Formula Fours', 'Bones STF', 'Mavic road wheels', 'Zipp aero wheels'],
    companies: ['Spitfire', 'Bones', 'Shimano', 'SRAM'],
    futureImpact: 'Advanced composites and 3D-printed wheel cores will allow optimized inertia distribution impossible with traditional manufacturing.',
    color: '#8B5CF6'
  },
  {
    icon: '🎡',
    title: 'Industrial Machinery Flywheels',
    short: 'Flywheels smooth power delivery and store energy in presses, engines, and generators',
    tagline: 'Smoothing the industrial heartbeat',
    description: 'Industrial machines use flywheels to smooth power pulses and store energy between strokes. Punch presses store energy during the motor-driven portion of the cycle and release it during the high-force punch. Engine flywheels smooth the power pulses between cylinder firings. Moment of inertia determines smoothing effectiveness.',
    connection: 'The rolling physics in this game shows how rotational inertia stores kinetic energy - the same principle industrial flywheels use to smooth power delivery.',
    howItWorks: 'During low-load portions of a machine cycle, the flywheel accelerates slightly, storing energy. During peak loads, it slows, releasing stored energy. The result is more constant motor loading and reduced electrical demand spikes. Higher inertia means smoother operation but slower startup.',
    stats: [
      { value: '10-100 kg', label: 'Typical flywheel mass', icon: '⚙️' },
      { value: '1000-3000 RPM', label: 'Operating speeds', icon: '🔄' },
      { value: '50%+', label: 'Peak power reduction', icon: '📉' }
    ],
    examples: ['Punch presses', 'Steam engines', 'Diesel generators', 'Potter wheels'],
    companies: ['Schuler', 'Caterpillar', 'Cummins', 'SHIMPO'],
    futureImpact: 'Smart flywheels with variable inertia could adapt to changing load patterns, optimizing efficiency across different operating conditions.',
    color: '#F59E0B'
  }
];

interface RollingRaceRendererProps {
  gamePhase?: string;
  onPhaseComplete?: (phase: number) => void;
  onBack?: () => void;
  onGameEvent?: (event: any) => void;
}

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
  solidCylinder: '#3b82f6',
  hollowHoop: '#ef4444',
  ramp: '#64748b',
  energy: '#fbbf24',
};

const RollingRaceRenderer: React.FC<RollingRaceRendererProps> = ({
  gamePhase,
  onPhaseComplete,
  onBack,
  onGameEvent,
}) => {
  // Internal phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');

  // Use external phase if provided, otherwise use internal
  const phase = (gamePhase && validPhases.includes(gamePhase as Phase) ? gamePhase : internalPhase) as Phase;

  // Sync internal phase from external gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== internalPhase) {
      setInternalPhase(gamePhase as Phase);
    }
  }, [gamePhase, internalPhase]);

  // Function to advance to next phase
  const goToPhase = useCallback((newPhase: Phase) => {
    setInternalPhase(newPhase);
    if (onPhaseComplete) {
      const phaseIndex = validPhases.indexOf(newPhase);
      onPhaseComplete(phaseIndex);
    }
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase: newPhase } });
    }
  }, [onPhaseComplete, onGameEvent]);

  // Simulation state
  const [rampAngle, setRampAngle] = useState(30);
  const [objectMass, setObjectMass] = useState(1);
  const [isRacing, setIsRacing] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [solidPosition, setSolidPosition] = useState(0);
  const [hollowPosition, setHollowPosition] = useState(0);
  const [solidRotation, setSolidRotation] = useState(0);
  const [hollowRotation, setHollowRotation] = useState(0);
  const [raceFinished, setRaceFinished] = useState(false);
  const [winner, setWinner] = useState<'solid' | 'hollow' | null>(null);

  // Twist state - coins inside
  const [coinsAdded, setCoinsAdded] = useState(false);
  const [coinCount, setCoinCount] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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

  // Physics constants
  const g = 9.81;
  const rampLength = 1.0; // meters (normalized)
  const objectRadius = 0.05; // meters

  // Calculate accelerations based on moment of inertia
  // a = g * sin(theta) / (1 + I/(MR^2))
  // Solid cylinder: I = 0.5*M*R^2, so a = g*sin(theta) / 1.5
  // Hollow cylinder: I = M*R^2, so a = g*sin(theta) / 2
  const getSolidAcceleration = useCallback(() => {
    const theta = (rampAngle * Math.PI) / 180;
    return (g * Math.sin(theta)) / 1.5;
  }, [rampAngle]);

  const getHollowAcceleration = useCallback(() => {
    const theta = (rampAngle * Math.PI) / 180;
    // With coins, the moment of inertia changes
    if (coinsAdded && coinCount > 0) {
      // Coins at center reduce effective I/MR^2 ratio
      // More coins = closer to solid cylinder behavior
      const effectiveRatio = 2 - (coinCount / 10) * 0.5; // Goes from 2 to 1.5
      return (g * Math.sin(theta)) / effectiveRatio;
    }
    return (g * Math.sin(theta)) / 2;
  }, [rampAngle, coinsAdded, coinCount]);

  // Animation loop
  useEffect(() => {
    if (!isRacing) return;

    const solidAcc = getSolidAcceleration();
    const hollowAcc = getHollowAcceleration();

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000; // seconds
      setRaceTime(elapsed);

      // Position from s = 0.5 * a * t^2
      const newSolidPos = Math.min(0.5 * solidAcc * elapsed * elapsed / rampLength, 1);
      const newHollowPos = Math.min(0.5 * hollowAcc * elapsed * elapsed / rampLength, 1);

      setSolidPosition(newSolidPos);
      setHollowPosition(newHollowPos);

      // Rotation (v = a*t, omega = v/R)
      const solidVel = solidAcc * elapsed;
      const hollowVel = hollowAcc * elapsed;
      setSolidRotation((solidVel * elapsed / objectRadius) * (180 / Math.PI));
      setHollowRotation((hollowVel * elapsed / objectRadius) * (180 / Math.PI));

      // Check if race finished
      if (newSolidPos >= 1 || newHollowPos >= 1) {
        setRaceFinished(true);
        setIsRacing(false);
        if (newSolidPos >= 1 && newHollowPos < 1) {
          setWinner('solid');
        } else if (newHollowPos >= 1 && newSolidPos < 1) {
          setWinner('hollow');
        } else {
          setWinner(newSolidPos >= newHollowPos ? 'solid' : 'hollow');
        }
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRacing, getSolidAcceleration, getHollowAcceleration]);

  const startRace = () => {
    setSolidPosition(0);
    setHollowPosition(0);
    setSolidRotation(0);
    setHollowRotation(0);
    setRaceTime(0);
    setRaceFinished(false);
    setWinner(null);
    startTimeRef.current = 0;
    setIsRacing(true);
  };

  const resetRace = () => {
    setIsRacing(false);
    setSolidPosition(0);
    setHollowPosition(0);
    setSolidRotation(0);
    setHollowRotation(0);
    setRaceTime(0);
    setRaceFinished(false);
    setWinner(null);
    startTimeRef.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const predictions = [
    { id: 'solid', label: 'The solid cylinder wins - it is heavier in the middle' },
    { id: 'hollow', label: 'The hollow hoop wins - it can spin faster' },
    { id: 'tie', label: 'They tie - mass does not affect rolling speed' },
    { id: 'depends', label: 'It depends on which one is heavier' },
  ];

  const twistPredictions = [
    { id: 'faster', label: 'The hoop rolls faster - more mass means more speed' },
    { id: 'slower', label: 'The hoop rolls slower - extra mass adds resistance' },
    { id: 'same', label: 'No change - mass does not matter for rolling' },
    { id: 'depends_location', label: 'It depends on where the coins are placed' },
  ];

  const transferApplications = [
    {
      title: 'Wheels in Cars',
      description: 'Lightweight alloy wheels with mass near the hub improve acceleration and braking compared to heavy steel wheels with mass at the rim.',
      question: 'Why do performance cars use lightweight wheels with mass concentrated near the center?',
      answer: 'Wheels with less mass at the rim have lower moment of inertia, requiring less energy to accelerate. This means faster acceleration, better braking, and improved fuel efficiency.',
    },
    {
      title: 'Yo-Yo Design',
      description: 'Professional yo-yos have mass concentrated in metal rims, while beginner yo-yos have more uniform mass distribution.',
      question: 'Why do professional yo-yos have heavy metal rims?',
      answer: 'Heavy rims increase moment of inertia, making the yo-yo spin longer (more angular momentum). But this also makes it harder to change spin speed, requiring more skill to control.',
    },
    {
      title: 'Flywheels for Energy Storage',
      description: 'Modern flywheels use high-density rims to store maximum rotational kinetic energy in the smallest package.',
      question: 'Why are flywheel rims made as heavy as possible?',
      answer: 'Rotational kinetic energy is (1/2)Iw^2. Rim-weighted flywheels have higher I, storing more energy at the same rotation speed. This is the opposite of what you want for quick acceleration!',
    },
    {
      title: 'Figure Skating Spins',
      description: 'Skaters speed up dramatically when they pull their arms in during a spin, going from slow to extremely fast rotation.',
      question: 'How does pulling arms in make a skater spin faster?',
      answer: 'Angular momentum (L = Iw) is conserved. When arms are pulled in, I decreases, so w must increase to keep L constant. This is the same physics as mass distribution in rolling objects!',
    },
  ];

  const testQuestions = [
    {
      question: 'You have two cylindrical objects with identical mass (1 kg) and radius (10 cm). One is solid metal throughout, the other is a hollow metal hoop. You release them simultaneously from the top of a 2-meter ramp. Which object wins a race down the ramp?',
      options: [
        { text: 'The hollow hoop - it has more surface area', correct: false },
        { text: 'The solid cylinder - less rotational inertia means faster rolling', correct: true },
        { text: 'They tie - mass cancels out in the equations', correct: false },
        { text: 'The heavier one wins regardless of shape', correct: false },
      ],
    },
    {
      question: 'A solid cylinder rolls down a ramp without slipping. At the bottom, it has both translational (forward motion) and rotational (spinning) kinetic energy. What fraction of its total kinetic energy is rotational?',
      options: [
        { text: 'All of it (100%)', correct: false },
        { text: 'Half of it (50%)', correct: false },
        { text: 'One-third (33%)', correct: true },
        { text: 'None - all energy is translational', correct: false },
      ],
    },
    {
      question: 'For a hollow hoop rolling without slipping, what fraction of its kinetic energy is rotational?',
      options: [
        { text: 'One-quarter (25%)', correct: false },
        { text: 'One-third (33%)', correct: false },
        { text: 'One-half (50%)', correct: true },
        { text: 'Two-thirds (67%)', correct: false },
      ],
    },
    {
      question: 'What is the moment of inertia of a solid cylinder about its central axis?',
      options: [
        { text: 'I = MR^2', correct: false },
        { text: 'I = (1/2)MR^2', correct: true },
        { text: 'I = (2/5)MR^2', correct: false },
        { text: 'I = 2MR^2', correct: false },
      ],
    },
    {
      question: 'Adding mass to the center of a hollow cylinder will:',
      options: [
        { text: 'Make it roll slower - more mass means more inertia', correct: false },
        { text: 'Make it roll faster - reduces I/(MR^2) ratio', correct: true },
        { text: 'Have no effect on rolling speed', correct: false },
        { text: 'Make it slide instead of roll', correct: false },
      ],
    },
    {
      question: 'Why does a hollow sphere roll slower than a solid sphere of the same mass?',
      options: [
        { text: 'More mass is far from the axis, increasing I', correct: true },
        { text: 'Hollow objects have more friction', correct: false },
        { text: 'Air resistance is greater for hollow objects', correct: false },
        { text: 'The hollow sphere has less contact with the ramp', correct: false },
      ],
    },
    {
      question: 'The ratio of speeds v_solid/v_hollow at the bottom of a ramp is approximately:',
      options: [
        { text: '1.0 (they are equal)', correct: false },
        { text: '1.15 (solid is about 15% faster)', correct: true },
        { text: '2.0 (solid is twice as fast)', correct: false },
        { text: '0.87 (hollow is faster)', correct: false },
      ],
    },
    {
      question: 'If you increase the ramp angle, how does the race outcome change?',
      options: [
        { text: 'The solid wins by a larger margin', correct: false },
        { text: 'The hollow catches up', correct: false },
        { text: 'The winner stays the same, but both complete the race faster', correct: true },
        { text: 'The race becomes a tie at steep angles', correct: false },
      ],
    },
    {
      question: 'A flywheel designed for maximum energy storage should have:',
      options: [
        { text: 'Mass concentrated near the center', correct: false },
        { text: 'Mass concentrated at the rim', correct: true },
        { text: 'Uniform mass distribution', correct: false },
        { text: 'The lightest possible mass', correct: false },
      ],
    },
    {
      question: 'When a figure skater pulls their arms in during a spin:',
      options: [
        { text: 'Angular momentum increases, so they spin faster', correct: false },
        { text: 'Moment of inertia decreases, so angular velocity increases', correct: true },
        { text: 'Rotational kinetic energy stays constant', correct: false },
        { text: 'They slow down due to reduced air resistance', correct: false },
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
    if (onGameEvent) {
      onGameEvent({ type: 'test_completed', data: { score, total: testQuestions.length } });
    }
  };

  // Calculate energy distributions for visualization
  const getSolidEnergySplit = () => {
    // For solid cylinder: KE_rot/KE_total = (1/3)
    return { rotational: 1/3, translational: 2/3 };
  };

  const getHollowEnergySplit = () => {
    // For hollow hoop: KE_rot/KE_total = (1/2)
    if (coinsAdded && coinCount > 0) {
      const rotFraction = 0.5 - (coinCount / 10) * (0.5 - 1/3);
      return { rotational: rotFraction, translational: 1 - rotFraction };
    }
    return { rotational: 0.5, translational: 0.5 };
  };

  const renderVisualization = (interactive: boolean, showTwist: boolean = false) => {
    const width = 500;
    const height = 340;
    const rampStartX = 60;
    const rampStartY = 70;
    const rampEndX = 400;

    // Calculate actual ramp based on angle
    const theta = (rampAngle * Math.PI) / 180;
    const actualRampEndY = rampStartY + (rampEndX - rampStartX) * Math.tan(theta);
    const clampedRampEndY = Math.min(actualRampEndY, 290);

    // Object positions along ramp
    const solidX = rampStartX + solidPosition * (rampEndX - rampStartX);
    const solidY = rampStartY + solidPosition * (clampedRampEndY - rampStartY);
    const hollowX = rampStartX + hollowPosition * (rampEndX - rampStartX);
    const hollowY = rampStartY + hollowPosition * (clampedRampEndY - rampStartY) + 45;

    const objectRadiusPx = 18;

    const solidEnergy = getSolidEnergySplit();
    const hollowEnergy = getHollowEnergySplit();

    // Calculate ramp angle for rotation transforms
    const rampAngleRad = Math.atan2(clampedRampEndY - rampStartY, rampEndX - rampStartX);
    const rampAngleDeg = rampAngleRad * 180 / Math.PI;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '580px' }}
        >
          {/* ========== PREMIUM DEFS SECTION ========== */}
          <defs>
            {/* === BACKGROUND GRADIENTS === */}
            <linearGradient id="rraceBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* === RAMP GRADIENTS WITH DEPTH === */}
            <linearGradient id="rraceRampSurface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="15%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="90%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="rraceRampEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            <linearGradient id="rraceRampHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
            </linearGradient>

            {/* === SOLID CYLINDER GRADIENTS (3D SPHERE EFFECT) === */}
            <radialGradient id="rraceSolidSphere" cx="35%" cy="35%" r="65%" fx="25%" fy="25%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            <radialGradient id="rraceSolidCore" cx="40%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
            </radialGradient>

            <linearGradient id="rraceSolidShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#bfdbfe" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>

            {/* === HOLLOW HOOP GRADIENTS (3D RING EFFECT) === */}
            <linearGradient id="rraceHoopRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            <radialGradient id="rraceHoopInner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.5" />
            </radialGradient>

            <linearGradient id="rraceHoopHighlight" x1="20%" y1="20%" x2="80%" y2="80%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#fecaca" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* === COIN GRADIENT (GOLD METALLIC) === */}
            <radialGradient id="rraceCoinGold" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            {/* === GROUND/FLOOR GRADIENT === */}
            <linearGradient id="rraceGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* === FINISH LINE GRADIENT === */}
            <linearGradient id="rraceFinishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            <filter id="rraceSolidGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rraceHoopGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rraceWinnerGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rraceTrailBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            <filter id="rraceLabelShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* === MOTION TRAIL GRADIENTS === */}
            <linearGradient id="rraceSolidTrail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="rraceHoopTrail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="30%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.6" />
            </linearGradient>

            {/* === GRID PATTERN === */}
            <pattern id="rraceLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* ========== BACKGROUND ========== */}
          <rect width={width} height={height} fill="url(#rraceBgGradient)" />
          <rect width={width} height={height} fill="url(#rraceLabGrid)" />

          {/* ========== PREMIUM RAMP WITH DEPTH ========== */}
          {/* Ramp shadow */}
          <polygon
            points={`${rampStartX + 5},${rampStartY + 8} ${rampEndX + 5},${clampedRampEndY + 8} ${rampEndX + 5},${clampedRampEndY + 22} ${rampStartX + 5},${rampStartY + 22}`}
            fill="#000000"
            opacity="0.3"
          />

          {/* Ramp side (depth effect) */}
          <polygon
            points={`${rampEndX},${clampedRampEndY} ${rampEndX + 8},${clampedRampEndY + 4} ${rampEndX + 8},${clampedRampEndY + 18} ${rampEndX},${clampedRampEndY + 14}`}
            fill="url(#rraceRampEdge)"
          />

          {/* Main ramp surface */}
          <polygon
            points={`${rampStartX},${rampStartY} ${rampEndX},${clampedRampEndY} ${rampEndX},${clampedRampEndY + 14} ${rampStartX},${rampStartY + 14}`}
            fill="url(#rraceRampSurface)"
            stroke="#64748b"
            strokeWidth={1}
          />

          {/* Ramp top highlight */}
          <line
            x1={rampStartX}
            y1={rampStartY}
            x2={rampEndX}
            y2={clampedRampEndY}
            stroke="#94a3b8"
            strokeWidth={2}
            strokeOpacity={0.6}
          />

          {/* Ramp surface texture lines */}
          {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t, i) => (
            <line
              key={i}
              x1={rampStartX + t * (rampEndX - rampStartX)}
              y1={rampStartY + t * (clampedRampEndY - rampStartY)}
              x2={rampStartX + t * (rampEndX - rampStartX)}
              y2={rampStartY + t * (clampedRampEndY - rampStartY) + 14}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          ))}

          {/* Starting platform */}
          <rect
            x={rampStartX - 25}
            y={rampStartY - 5}
            width={30}
            height={25}
            rx={3}
            fill="url(#rraceRampSurface)"
            stroke="#64748b"
            strokeWidth={1}
          />

          {/* ========== GROUND LINE ========== */}
          <rect
            x={rampEndX - 15}
            y={clampedRampEndY + 12}
            width={width - rampEndX + 5}
            height={8}
            fill="url(#rraceGroundGradient)"
            rx={2}
          />

          {/* ========== FINISH LINE ========== */}
          <g transform={`translate(${rampEndX + 45}, ${clampedRampEndY - 50})`}>
            {/* Finish pole */}
            <rect x={-3} y={0} width={6} height={65} fill="url(#rraceFinishGradient)" rx={2} />
            {/* Checkered flag pattern */}
            <g>
              {[0, 1, 2].map((row) =>
                [0, 1, 2, 3].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={8 + col * 8}
                    y={row * 8}
                    width={8}
                    height={8}
                    fill={(row + col) % 2 === 0 ? '#ffffff' : '#1e293b'}
                  />
                ))
              )}
            </g>
            <rect x={8} y={0} width={32} height={24} fill="none" stroke="#64748b" strokeWidth={1} />
            <text x={24} y={38} textAnchor="middle" fill="#22c55e" fontSize={11} fontWeight="bold">FINISH</text>
          </g>

          {/* ========== MOTION TRAILS ========== */}
          {isRacing && solidPosition > 0.05 && (
            <ellipse
              cx={solidX - 15}
              cy={solidY - objectRadiusPx - 5}
              rx={solidPosition * 40 + 10}
              ry={4}
              fill="url(#rraceSolidTrail)"
              filter="url(#rraceTrailBlur)"
              transform={`rotate(${rampAngleDeg}, ${solidX - 15}, ${solidY - objectRadiusPx - 5})`}
            />
          )}
          {isRacing && hollowPosition > 0.05 && (
            <ellipse
              cx={hollowX - 15}
              cy={hollowY - objectRadiusPx - 5}
              rx={hollowPosition * 40 + 10}
              ry={4}
              fill="url(#rraceHoopTrail)"
              filter="url(#rraceTrailBlur)"
              transform={`rotate(${rampAngleDeg}, ${hollowX - 15}, ${hollowY - objectRadiusPx - 5})`}
            />
          )}

          {/* ========== SOLID CYLINDER (PREMIUM 3D SPHERE) ========== */}
          <g transform={`translate(${solidX}, ${solidY - objectRadiusPx - 5})`} filter="url(#rraceSolidGlow)">
            {/* Main sphere body */}
            <circle
              cx={0}
              cy={0}
              r={objectRadiusPx}
              fill="url(#rraceSolidSphere)"
            />
            {/* Inner core showing solid mass */}
            <circle cx={0} cy={0} r={objectRadiusPx * 0.75} fill="url(#rraceSolidCore)" />
            <circle cx={0} cy={0} r={objectRadiusPx * 0.5} fill="url(#rraceSolidCore)" opacity={0.7} />
            <circle cx={0} cy={0} r={objectRadiusPx * 0.25} fill="#60a5fa" opacity={0.5} />
            {/* Highlight shine */}
            <ellipse cx={-5} cy={-6} rx={6} ry={4} fill="url(#rraceSolidShine)" />
            {/* Rotation indicator line */}
            <line
              x1={0}
              y1={0}
              x2={objectRadiusPx * 0.8 * Math.cos(solidRotation * Math.PI / 180)}
              y2={objectRadiusPx * 0.8 * Math.sin(solidRotation * Math.PI / 180)}
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.8}
            />
            {/* Edge highlight */}
            <circle cx={0} cy={0} r={objectRadiusPx} fill="none" stroke="#93c5fd" strokeWidth={1} strokeOpacity={0.5} />
          </g>

          {/* ========== HOLLOW HOOP (PREMIUM 3D RING) ========== */}
          <g transform={`translate(${hollowX}, ${hollowY - objectRadiusPx - 5})`} filter="url(#rraceHoopGlow)">
            {/* Outer ring with gradient */}
            <circle
              cx={0}
              cy={0}
              r={objectRadiusPx}
              fill="none"
              stroke="url(#rraceHoopRing)"
              strokeWidth={5}
            />
            {/* Inner dark area showing hollow */}
            <circle cx={0} cy={0} r={objectRadiusPx - 4} fill="url(#rraceHoopInner)" />
            {/* Ring highlight */}
            <circle
              cx={0}
              cy={0}
              r={objectRadiusPx}
              fill="none"
              stroke="url(#rraceHoopHighlight)"
              strokeWidth={2}
            />
            {/* Rotation indicator */}
            <line
              x1={(objectRadiusPx - 5) * Math.cos(hollowRotation * Math.PI / 180)}
              y1={(objectRadiusPx - 5) * Math.sin(hollowRotation * Math.PI / 180)}
              x2={objectRadiusPx * Math.cos(hollowRotation * Math.PI / 180)}
              y2={objectRadiusPx * Math.sin(hollowRotation * Math.PI / 180)}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.9}
            />
            {/* Coins inside (if twist mode) */}
            {showTwist && (
              <g>
                {coinCount > 0 && Array.from({ length: Math.min(coinCount, 5) }).map((_, i) => (
                  <circle
                    key={i}
                    cx={(i - 2) * 5}
                    cy={0}
                    r={4}
                    fill="url(#rraceCoinGold)"
                    stroke="#fbbf24"
                    strokeWidth={0.5}
                  />
                ))}
                {coinCount > 5 && (
                  <text x={0} y={-8} fill="#fbbf24" fontSize={11} textAnchor="middle" fontWeight="bold">+{coinCount - 5}</text>
                )}
              </g>
            )}
          </g>

          {/* ========== LABELS ========== */}
          <g filter="url(#rraceLabelShadow)">
            <rect x={rampStartX - 5} y={32} width={95} height={18} rx={4} fill="rgba(59, 130, 246, 0.2)" />
            <text x={rampStartX} y={46} fill="#60a5fa" fontSize={12} fontWeight="bold">
              Solid Cylinder
            </text>
          </g>
          <g filter="url(#rraceLabelShadow)">
            <rect x={rampStartX - 5} y={rampStartY + 48} width={85} height={18} rx={4} fill="rgba(239, 68, 68, 0.2)" />
            <text x={rampStartX} y={rampStartY + 62} fill="#f87171" fontSize={12} fontWeight="bold">
              Hollow Hoop
            </text>
          </g>

          {/* Angle indicator */}
          <g transform={`translate(${rampEndX - 55}, ${clampedRampEndY + 28})`}>
            <rect x={-5} y={-12} width={50} height={16} rx={4} fill="rgba(100, 116, 139, 0.3)" />
            <text x={20} y={0} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="bold">
              {rampAngle} degrees
            </text>
          </g>

          {/* Winner indicator */}
          {raceFinished && winner && (
            <g filter="url(#rraceWinnerGlow)">
              <rect
                x={width / 2 - 90}
                y={height - 45}
                width={180}
                height={30}
                rx={8}
                fill={winner === 'solid' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                stroke={winner === 'solid' ? '#3b82f6' : '#ef4444'}
                strokeWidth={2}
              />
              <text
                x={width / 2}
                y={height - 24}
                fill={winner === 'solid' ? '#60a5fa' : '#f87171'}
                fontSize={16}
                fontWeight="bold"
                textAnchor="middle"
              >
                {winner === 'solid' ? 'Solid Cylinder Wins!' : 'Hollow Hoop Wins!'}
              </text>
            </g>
          )}

          {/* Time display */}
          {isRacing && (
            <g>
              <rect x={width - 95} y={12} width={80} height={22} rx={6} fill="rgba(30, 41, 59, 0.8)" stroke="#475569" strokeWidth={1} />
              <text x={width - 55} y={28} fill={colors.textSecondary} fontSize={13} textAnchor="middle" fontWeight="bold">
                {raceTime.toFixed(2)}s
              </text>
            </g>
          )}

          {/* Physics info badge */}
          <g transform={`translate(15, ${height - 35})`}>
            <rect x={0} y={0} width={130} height={22} rx={5} fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" strokeWidth={1} />
            <text x={65} y={15} fill="#a78bfa" fontSize={11} textAnchor="middle" fontWeight="bold">
              I = {winner === 'solid' || !raceFinished ? '1/2' : '1'} MR squared
            </text>
          </g>

          {/* Coin count display in twist mode */}
          {showTwist && (
            <g transform={`translate(${width - 100}, 15)`}>
              <rect x={0} y={0} width={85} height={20} rx={4} fill="rgba(245, 158, 11, 0.2)" stroke={colors.warning} strokeWidth={1} />
              <text x={42} y={14} fill={colors.warning} fontSize={11} textAnchor="middle" fontWeight="bold">
                Coins: {coinCount}
              </text>
            </g>
          )}

          {/* Mass display */}
          <g transform={`translate(${width - 100}, ${showTwist ? 42 : 15})`}>
            <rect x={0} y={48} width={85} height={18} rx={4} fill="rgba(148, 163, 184, 0.2)" stroke={colors.textMuted} strokeWidth={1} />
            <text x={42} y={60} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontWeight="bold">
              Mass: {objectMass.toFixed(1)} kg
            </text>
          </g>

          {/* Axis labels */}
          <text x={width / 2} y={height - 8} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Distance (horizontal)
          </text>
          <text x={15} y={height / 2} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>
            Height (vertical)
          </text>
        </svg>

        {/* Energy Bars */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%', maxWidth: '500px', padding: '0 16px' }}>
          {/* Solid Energy Bar */}
          <div style={{ flex: 1 }}>
            <div style={{ color: colors.solidCylinder, fontSize: '11px', marginBottom: '4px' }}>Solid Cylinder Energy</div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', border: `1px solid ${colors.textMuted}` }}>
              <div style={{ width: `${solidEnergy.translational * 100}%`, background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: colors.bgPrimary, fontWeight: 'bold' }}>Trans</span>
              </div>
              <div style={{ width: `${solidEnergy.rotational * 100}%`, background: colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: colors.bgPrimary, fontWeight: 'bold' }}>Rot</span>
              </div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '2px' }}>
              I = (1/2)MR^2
            </div>
          </div>

          {/* Hollow Energy Bar */}
          <div style={{ flex: 1 }}>
            <div style={{ color: colors.hollowHoop, fontSize: '11px', marginBottom: '4px' }}>Hollow Hoop Energy</div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', border: `1px solid ${colors.textMuted}` }}>
              <div style={{ width: `${hollowEnergy.translational * 100}%`, background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: colors.bgPrimary, fontWeight: 'bold' }}>Trans</span>
              </div>
              <div style={{ width: `${hollowEnergy.rotational * 100}%`, background: colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: colors.bgPrimary, fontWeight: 'bold' }}>Rot</span>
              </div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '2px' }}>
              I = MR^2 {showTwist && coinsAdded && coinCount > 0 ? `(+${coinCount} coins)` : ''}
            </div>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={isRacing ? resetRace : startRace}
              disabled={raceFinished && !isRacing}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isRacing ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {isRacing ? 'Stop' : 'Release!'}
            </button>
            <button
              onClick={resetRace}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Ramp Angle: {rampAngle}deg
        </label>
        <input
          type="range"
          min="10"
          max="60"
          step="5"
          value={rampAngle}
          onChange={(e) => { setRampAngle(parseInt(e.target.value)); resetRace(); }}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' } as React.CSSProperties}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Object Mass: {objectMass.toFixed(1)} kg (same for both)
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={objectMass}
          onChange={(e) => setObjectMass(parseFloat(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' } as React.CSSProperties}
        />
      </div>

      {showTwist && (
        <div>
          <label style={{ color: colors.warning, display: 'block', marginBottom: '8px' }}>
            Coins in Hoop Center: {coinCount}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={coinCount}
            onChange={(e) => { setCoinCount(parseInt(e.target.value)); setCoinsAdded(parseInt(e.target.value) > 0); resetRace(); }}
            style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' } as React.CSSProperties}
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
          Speed ratio: v_solid/v_hollow = sqrt(4/3) = 1.15
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          The solid cylinder is always ~15% faster (same mass)
        </div>
      </div>
    </div>
  );

  const currentPhaseIndex = validPhases.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;

  const handleBack = () => {
    if (currentPhaseIndex > 0) {
      goToPhase(validPhases[currentPhaseIndex - 1]);
    }
    if (onBack) {
      onBack();
    }
  };

  const handleNext = () => {
    if (currentPhaseIndex < validPhases.length - 1) {
      goToPhase(validPhases[currentPhaseIndex + 1]);
    }
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 1000,
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {validPhases.map((p, i) => (
          <div
            key={p}
            aria-label={`${p} phase`}
            title={p}
            onClick={() => goToPhase(p)}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: i === currentPhaseIndex ? colors.accent : 'rgba(148, 163, 184, 0.7)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${canGoBack ? colors.textSecondary : colors.textMuted}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={disabled && !canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #a78bfa)` : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Rolling Race
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Which wins down a ramp: a full cylinder or a hoop?
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 'normal' }}>
                A solid cylinder and a hollow hoop have the same mass and radius.
                Release them together at the top of a ramp. Which one reaches
                the bottom first?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                The answer reveals a fundamental truth about rotational energy!
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Release!" to start the race and watch the energy bars!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Two objects at the top of a ramp: a solid cylinder (blue, filled in) and a hollow
              hoop (red, just a ring). They have identical mass and radius. The energy bars
              show how energy is split between translation (forward motion) and rotation (spinning).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Predict: what will happen when they're released together?
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
        {renderBottomBar(true, true, 'Next →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Race the Rollers!</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the ramp angle and watch where the energy goes
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Change the ramp angle - does the winner change?</li>
              <li>Watch the energy bars - which object spins more?</li>
              <li>Try different masses - does mass affect the race?</li>
              <li>Notice: hoop uses 50% for rotation, cylinder only 33%</li>
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
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              Understanding how mass distribution affects rolling is critical for designing everything from
              car wheels (lighter wheels mean better acceleration) to flywheels (heavier rims store more energy)
              to figure skating (pulling arms in makes you spin faster). This principle explains why performance
              cars use expensive lightweight wheels - every gram saved from the rim improves acceleration, braking,
              and fuel efficiency more than saving weight from the car body!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review ->')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'solid';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
              Your prediction vs the experiment result: The solid cylinder wins! It has less rotational inertia, so less energy goes into spinning.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Rolling</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Moment of Inertia:</strong> The solid cylinder
                has I = (1/2)MR^2, while the hollow hoop has I = MR^2. The hoop's mass is farther from
                the rotation axis, making it harder to spin.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy Split:</strong> When rolling without
                slipping, energy must go into both translation AND rotation. The hoop "wastes" 50%
                on spinning, while the cylinder only uses 33%.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Speed Ratio:</strong> At the bottom,
                v_solid/v_hoop = sqrt(4/3) = 1.15. The solid is always 15% faster, regardless of
                mass, radius, or ramp angle!
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.solidCylinder}`,
          }}>
            <h4 style={{ color: colors.solidCylinder, marginBottom: '8px' }}>Key Equations:</h4>
            <div style={{ color: colors.textSecondary, fontSize: '13px', fontFamily: 'monospace' }}>
              <p>Solid: I = (1/2)MR^2, KE_rot = (1/3)KE_total</p>
              <p>Hoop: I = MR^2, KE_rot = (1/2)KE_total</p>
              <p>v = sqrt(2gh / (1 + I/MR^2))</p>
            </div>
          </div>

          {/* Visual diagram for review */}
          <div style={{ margin: '16px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ borderRadius: '8px' }}>
              <defs>
                <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="400" height="200" fill="url(#reviewBg)" />

              {/* Solid cylinder cross-section */}
              <g transform="translate(100, 100)">
                <circle r="50" fill="url(#rraceSolidSphere)" />
                <circle r="40" fill="rgba(59, 130, 246, 0.5)" />
                <circle r="30" fill="rgba(59, 130, 246, 0.3)" />
                <circle r="20" fill="rgba(59, 130, 246, 0.2)" />
                <text y="80" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Solid: I = 1/2 MR²</text>
              </g>

              {/* Hollow hoop cross-section */}
              <g transform="translate(300, 100)">
                <circle r="50" fill="none" stroke={colors.hollowHoop} strokeWidth="8" />
                <circle r="35" fill={colors.bgPrimary} />
                <text y="80" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Hoop: I = MR²</text>
              </g>

              {/* Title */}
              <text x="200" y="20" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="bold">
                Mass Distribution Comparison
              </text>
            </svg>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! ->')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we add coins inside the hollow hoop?
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
              Imagine taping coins to the inside center of the hollow hoop (like putting
              weights in a can). The total mass increases, but now some mass is at the
              center instead of the rim.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How will adding coins to the hoop's center affect its speed?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction ->')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test with Coins!</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Add coins to the hoop and see how its speed changes
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
              Watch the energy bar change as you add coins! More coins at the center
              means more mass closer to the axis, reducing the effective I/MR^2 ratio.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation ->')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'depends_location';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
              Location matters! Coins at the center make the hoop roll faster, approaching solid cylinder behavior.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Mass Distribution is Key</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Center Mass:</strong> Adding mass at the
                center doesn't increase I much (since I depends on r^2, and r=0 at center). But it
                increases total M, reducing the I/(MR^2) ratio.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Rim Mass:</strong> If we added coins to
                the rim instead, I would increase proportionally with M, and the rolling speed
                wouldn't change much.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Lesson:</strong> It's not total mass
                that matters for rolling - it's how that mass is distributed relative to the rotation
                axis!
              </p>
            </div>
          </div>

          {/* Visual diagram for twist review */}
          <div style={{ margin: '16px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ borderRadius: '8px' }}>
              <defs>
                <linearGradient id="twistReviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="400" height="200" fill="url(#twistReviewBg)" />

              {/* Empty hoop */}
              <g transform="translate(100, 100)">
                <circle r="40" fill="none" stroke={colors.hollowHoop} strokeWidth="6" />
                <circle r="28" fill={colors.bgPrimary} />
                <text y="70" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Empty Hoop</text>
                <text y="85" textAnchor="middle" fill={colors.warning} fontSize="11">I/MR² = 1.0</text>
              </g>

              {/* Arrow */}
              <g transform="translate(200, 100)">
                <line x1="-30" y1="0" x2="30" y2="0" stroke={colors.accent} strokeWidth="2" />
                <polygon points="30,0 25,-4 25,4" fill={colors.accent} />
                <text y="-10" textAnchor="middle" fill={colors.warning} fontSize="11">Add coins</text>
              </g>

              {/* Hoop with coins */}
              <g transform="translate(300, 100)">
                <circle r="40" fill="none" stroke={colors.hollowHoop} strokeWidth="6" />
                <circle r="28" fill={colors.bgPrimary} />
                <circle cx="0" cy="0" r="4" fill="url(#rraceCoinGold)" />
                <circle cx="-6" cy="0" r="3" fill="url(#rraceCoinGold)" />
                <circle cx="6" cy="0" r="3" fill="url(#rraceCoinGold)" />
                <text y="70" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Coins Added</text>
                <text y="85" textAnchor="middle" fill={colors.success} fontSize="11">I/MR² &lt; 1.0</text>
              </g>

              {/* Title */}
              <text x="200" y="20" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="bold">
                Adding Mass at Center Reduces I/MR² Ratio
              </text>
            </svg>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge ->')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Rolling Race"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Rotational inertia affects everything that spins
            </p>
            <div style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
              <p>Speed ratio: solid cylinder is ~15% faster than hollow hoop</p>
              <p>Energy split: solid uses 33% for rotation, hoop uses 50%</p>
              <p>Complete all 4 applications to unlock the test</p>
            </div>
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: colors.accent, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                >
                  Got It
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: colors.success, color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test ->')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', color: colors.textMuted, fontSize: '13px' }}>
              Mastery Test Results
            </div>
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
              <div style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                Score: {testScore} / 10
              </div>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered rolling motion and rotational inertia!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery ->' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered rolling motion and rotational inertia</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Moment of inertia depends on mass distribution</li>
              <li>Rolling objects split energy between translation and rotation</li>
              <li>Solid cylinders beat hollow hoops by ~15%</li>
              <li>Adding mass at the center reduces effective I/MR^2</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This principle extends to spheres (solid sphere beats hollow sphere),
              explains why car wheels are designed with mass near the hub, and connects
              to conservation of angular momentum in figure skating and diving!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game ->')}
      </div>
    );
  }

  return null;
};

export default RollingRaceRenderer;
