import React, { useState, useEffect, useCallback } from 'react';

const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Spacecraft Attitude Control',
    short: 'Satellites use reaction wheels to orient themselves in space',
    tagline: 'Staying steady among the stars',
    description: 'Spacecraft use spinning reaction wheels and control moment gyroscopes to maintain precise orientation without expending fuel. By speeding up or slowing down internal flywheels, the craft can rotate in the opposite direction.',
    connection: 'The sleeping top demonstrates gyroscopic stability - the same principle that keeps spacecraft pointing in the right direction. Angular momentum conservation means changing one spinning component affects the whole system.',
    howItWorks: 'Reaction wheels are electric motors spinning heavy disks. To turn the spacecraft right, the wheel spins faster left, and by conservation of angular momentum, the spacecraft rotates right. Control moment gyroscopes use tilting gyros for faster, more powerful attitude changes.',
    stats: [
      { value: '6000+', label: 'Active satellites in orbit', icon: '🛰️' },
      { value: '0.001°', label: 'Pointing accuracy achieved', icon: '🎯' },
      { value: '90%', label: 'Fuel savings vs thrusters', icon: '⛽' }
    ],
    examples: ['Hubble Space Telescope', 'International Space Station', 'GPS satellites', 'Mars rovers'],
    companies: ['NASA', 'SpaceX', 'Honeywell Aerospace', 'Collins Aerospace'],
    futureImpact: 'Advanced gyroscopic systems will enable more agile spacecraft, precise space telescopes, and eventually artificial gravity stations using rotating habitats.',
    color: '#3B82F6'
  },
  {
    icon: '🚴',
    title: 'Bicycle Stability',
    short: 'Spinning wheels help bikes stay upright at speed',
    tagline: 'The physics of two-wheeled balance',
    description: 'A moving bicycle is remarkably stable even without a rider. The spinning wheels act as gyroscopes, and when the bike tips, the front wheel naturally steers into the fall, creating a self-correcting effect.',
    connection: 'Like a sleeping top resisting falling over, spinning bicycle wheels resist changes to their orientation. The gyroscopic precession of the front wheel provides automatic steering correction.',
    howItWorks: 'When a bike tips left, the gyroscopic effect steers the front wheel left. This moves the wheels under the falling center of mass, correcting the tip. Trail geometry and mass distribution also contribute to this self-stability.',
    stats: [
      { value: '1B+', label: 'Bicycles worldwide', icon: '🚲' },
      { value: '8 mph', label: 'Min speed for gyro stability', icon: '💨' },
      { value: '130+', label: 'Years of physics study', icon: '📚' }
    ],
    examples: ['Road racing bikes', 'Motorcycles', 'Self-balancing robots', 'Gyroscopic monorails'],
    companies: ['Trek', 'Specialized', 'Lit Motors', 'Segway'],
    futureImpact: 'Understanding bicycle gyroscopic dynamics is enabling self-balancing electric vehicles, autonomous delivery robots, and more stable motorcycle designs.',
    color: '#10B981'
  },
  {
    icon: '🧭',
    title: 'Gyrocompasses',
    short: 'Spinning gyros find true north without magnets',
    tagline: 'Earth itself becomes the reference',
    description: 'Ships and aircraft use gyrocompasses to find true north. Unlike magnetic compasses, they are unaffected by metal hulls or electromagnetic interference, making them essential for precise navigation.',
    connection: 'A gyrocompass exploits gyroscopic precession - the same physics that makes a sleeping top precess around its vertical axis. Earth\'s rotation causes the gyro axis to align with true north over time.',
    howItWorks: 'A spinning gyro wants to maintain its orientation in space. But Earth rotates beneath it. Clever damping mechanisms convert this apparent drift into precession that aligns the spin axis with Earth\'s rotation axis (north-south).',
    stats: [
      { value: '0.1°', label: 'Heading accuracy', icon: '🎯' },
      { value: '100+', label: 'Years of marine use', icon: '⚓' },
      { value: '$15B', label: 'Navigation equipment market', icon: '📈' }
    ],
    examples: ['Naval vessels', 'Commercial ships', 'Submarines', 'Large aircraft'],
    companies: ['Sperry Marine', 'Raytheon', 'Kongsberg', 'Safran'],
    futureImpact: 'Modern fiber-optic and MEMS gyroscopes are miniaturizing this technology for drones, autonomous vehicles, and consumer electronics.',
    color: '#F59E0B'
  },
  {
    icon: '⛸️',
    title: 'Figure Skating Spins',
    short: 'Skaters spin faster by pulling arms inward',
    tagline: 'Conservation of angular momentum in action',
    description: 'Figure skaters demonstrate physics principles beautifully. Starting a spin with arms extended, then pulling them in dramatically increases rotation speed - sometimes reaching 6 revolutions per second.',
    connection: 'Like adjusting a top\'s precession by changing its spin rate, skaters exploit conservation of angular momentum. Reducing moment of inertia (arms in) means angular velocity must increase to conserve L.',
    howItWorks: 'Angular momentum L = Iω is conserved. When the skater pulls arms from extended (large I) to the body (small I), the angular velocity ω must increase proportionally. A 3x reduction in I means 3x faster spinning.',
    stats: [
      { value: '6 rev/s', label: 'Max spin speed', icon: '🌀' },
      { value: '4 G', label: 'Force on body during spin', icon: '💪' },
      { value: '20M', label: 'Global skating enthusiasts', icon: '👥' }
    ],
    examples: ['Olympic figure skating', 'Ice dancing', 'Divers and gymnasts', 'Ballet pirouettes'],
    companies: ['US Figure Skating', 'International Skating Union', 'Riedell Skates', 'Jackson Ultima'],
    futureImpact: 'Biomechanics research in skating is improving athletic performance, rehabilitation techniques, and even robotics control systems.',
    color: '#8B5CF6'
  }
];

interface SleepingTopRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  top: '#f59e0b',
  spin: '#3b82f6',
  precession: '#10b981',
};

interface TopState {
  theta: number;      // Tilt angle from vertical
  phi: number;        // Precession angle
  psi: number;        // Spin angle
  thetaDot: number;   // Tilt rate
  phiDot: number;     // Precession rate
  psiDot: number;     // Spin rate
}

const SleepingTopRenderer: React.FC<SleepingTopRendererProps> = ({
  phase = 'hook',
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [top, setTop] = useState<TopState>({
    theta: 0.1,      // Small initial tilt
    phi: 0,
    psi: 0,
    thetaDot: 0,
    phiDot: 0,
    psiDot: 50,      // High initial spin
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [initialSpin, setInitialSpin] = useState(50);
  const [initialTilt, setInitialTilt] = useState(0.1);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
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

  // Physics constants
  const g = 9.81;
  const m = 0.1;           // Mass
  const R = 0.05;          // Radius
  const h = 0.08;          // Height of CM above tip
  const I3 = 0.5 * m * R * R;  // Moment about spin axis
  const I1 = 0.25 * m * R * R + m * h * h / 3;  // Moment about tilt axis
  const friction = 0.01;

  // Physics simulation
  const updatePhysics = useCallback((dt: number, state: TopState): TopState => {
    // Simplified top equations with damping
    const sinTheta = Math.sin(state.theta);
    const cosTheta = Math.cos(state.theta);

    // Gyroscopic effect: precession rate from angular momentum
    // phiDot = (m*g*h) / (I3 * psiDot) when steady
    const gyroTerm = I3 * state.psiDot;
    const gravitationalTorque = m * g * h * sinTheta;

    // Precession: τ = L × ω (simplified)
    let phiDot = state.phiDot;
    if (gyroTerm > 0.1 && Math.abs(sinTheta) > 0.01) {
      // Stable precession regime
      phiDot = gravitationalTorque / gyroTerm;
    }

    // Nutation (wobble) with damping
    const nutationDamping = 0.5;
    let thetaDot = state.thetaDot;
    let thetaDDot = 0;

    // If spinning fast enough, the top is stable (gyroscopic stabilization)
    const criticalSpin = Math.sqrt(4 * m * g * h * I1) / I3;

    if (state.psiDot < criticalSpin * 0.5) {
      // Below critical: top falls
      thetaDDot = gravitationalTorque / I1 - nutationDamping * thetaDot;
    } else {
      // Above critical: stable with small oscillations
      thetaDDot = -10 * (state.theta - 0.05) - nutationDamping * thetaDot;
    }

    thetaDot = thetaDot + thetaDDot * dt;
    const newTheta = Math.max(0.01, Math.min(Math.PI / 2, state.theta + thetaDot * dt));

    // Spin decay due to friction
    const newPsiDot = Math.max(0, state.psiDot * (1 - friction * dt));

    // Precession angle
    const newPhi = state.phi + phiDot * dt;

    // Spin angle
    const newPsi = state.psi + newPsiDot * dt;

    return {
      theta: newTheta,
      phi: newPhi,
      psi: newPsi,
      thetaDot: thetaDot,
      phiDot: phiDot,
      psiDot: newPsiDot,
    };
  }, [m, g, h, I1, I3, friction]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.016;
    const interval = setInterval(() => {
      setTop(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setTop({
      theta: initialTilt,
      phi: 0,
      psi: 0,
      thetaDot: 0,
      phiDot: 0,
      psiDot: initialSpin,
    });
  }, [initialSpin, initialTilt]);

  useEffect(() => {
    resetSimulation();
  }, [initialSpin, initialTilt, resetSimulation]);

  // Get top state description
  const getTopState = () => {
    if (top.psiDot < 5) return 'Fallen';
    if (top.theta > 0.5) return 'Wobbling';
    if (top.theta < 0.15 && top.psiDot > 30) return 'Sleeping';
    return 'Precessing';
  };

  const predictions = [
    { id: 'fall', label: 'The top immediately falls over from gravity' },
    { id: 'precess', label: 'The top slowly wobbles in circles instead of falling' },
    { id: 'stable', label: 'The top stays perfectly upright without wobbling' },
    { id: 'faster', label: 'The spin makes it fall faster' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'It behaves exactly the same' },
    { id: 'faster_fall', label: 'It falls over more quickly' },
    { id: 'slower_fall', label: 'It takes longer to fall' },
    { id: 'no_precess', label: 'It stops precessing and just spins' },
  ];

  const transferApplications = [
    {
      title: 'Bicycle Stability',
      description: 'A moving bicycle is remarkably stable, even without a rider. The spinning wheels act like gyroscopes, resisting tipping.',
      question: 'Why is it harder to balance a stationary bicycle than a moving one?',
      answer: 'Moving bicycle wheels have angular momentum. When the bike tips, the gyroscopic effect creates a torque that steers the front wheel into the fall, self-correcting. Stationary wheels have no angular momentum and can\'t provide this stabilization.',
    },
    {
      title: 'Spacecraft Attitude Control',
      description: 'Satellites use reaction wheels (spinning disks) to control their orientation without using fuel. Speeding or slowing wheels changes the spacecraft\'s rotation.',
      question: 'How do reaction wheels change spacecraft orientation without external forces?',
      answer: 'Angular momentum is conserved. When a reaction wheel speeds up in one direction, the spacecraft must rotate the opposite way to keep total angular momentum constant. This is Newton\'s third law applied to rotation.',
    },
    {
      title: 'Helicopter Tail Rotor',
      description: 'Without a tail rotor, a helicopter body would spin opposite to its main rotor due to conservation of angular momentum.',
      question: 'Why does a helicopter need a tail rotor?',
      answer: 'The engine applies torque to spin the main rotor. By Newton\'s third law, equal opposite torque acts on the helicopter body. The tail rotor provides counter-torque to prevent the body from spinning and allows yaw control.',
    },
    {
      title: 'Figure Skating Spins',
      description: 'When a spinning skater pulls in their arms, they spin faster. This is conservation of angular momentum in action.',
      question: 'How does pulling arms inward speed up a spin?',
      answer: 'Angular momentum L = Iω is conserved. When the skater reduces moment of inertia I by pulling in mass, angular velocity ω must increase to keep L constant. This also applies to tops and how their precession rate changes.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why doesn\'t a fast-spinning top fall over immediately?',
      options: [
        { text: 'The spin creates centrifugal force that holds it up', correct: false },
        { text: 'Angular momentum resists changes to the spin axis direction', correct: true },
        { text: 'The tip has too much friction to slip', correct: false },
        { text: 'Gravity is weaker when things spin', correct: false },
      ],
    },
    {
      question: 'What is precession in the context of a spinning top?',
      options: [
        { text: 'The spin around the top\'s own axis', correct: false },
        { text: 'The slow circular motion of the tilted spin axis', correct: true },
        { text: 'The wobbling back and forth motion', correct: false },
        { text: 'The friction between the tip and the surface', correct: false },
      ],
    },
    {
      question: 'As a top slows down, its precession rate:',
      options: [
        { text: 'Stays constant', correct: false },
        { text: 'Decreases', correct: false },
        { text: 'Increases', correct: true },
        { text: 'Stops immediately', correct: false },
      ],
    },
    {
      question: 'What is a "sleeping" top?',
      options: [
        { text: 'A top that has fallen over', correct: false },
        { text: 'A top spinning so fast it appears motionless and perfectly upright', correct: true },
        { text: 'A top that has stopped spinning', correct: false },
        { text: 'A top spinning very slowly', correct: false },
      ],
    },
    {
      question: 'What determines the minimum spin rate for a stable top?',
      options: [
        { text: 'The color of the top', correct: false },
        { text: 'The balance between gravity torque and gyroscopic stability', correct: true },
        { text: 'The temperature of the room', correct: false },
        { text: 'How hard you initially spin it', correct: false },
      ],
    },
    {
      question: 'What causes nutation (the fast wobble superimposed on precession)?',
      options: [
        { text: 'Wind in the room', correct: false },
        { text: 'Oscillation of the tilt angle as the top adjusts to torques', correct: true },
        { text: 'Imperfections in the top\'s shape', correct: false },
        { text: 'Friction with the surface', correct: false },
      ],
    },
    {
      question: 'Why does gravity cause precession instead of simply tipping the top over?',
      options: [
        { text: 'The angular momentum vector changes direction, not magnitude', correct: true },
        { text: 'Gravity is too weak to tip a spinning object', correct: false },
        { text: 'The floor prevents tipping', correct: false },
        { text: 'Air pressure balances gravity', correct: false },
      ],
    },
    {
      question: 'What happens when a spinning top\'s angular momentum drops below a critical value?',
      options: [
        { text: 'It speeds up', correct: false },
        { text: 'It becomes unstable and falls over', correct: true },
        { text: 'It hovers in the air', correct: false },
        { text: 'Nothing changes', correct: false },
      ],
    },
    {
      question: 'The direction of precession depends on:',
      options: [
        { text: 'The direction of gravity', correct: false },
        { text: 'The direction of spin (clockwise vs counterclockwise)', correct: true },
        { text: 'The mass of the top', correct: false },
        { text: 'The temperature', correct: false },
      ],
    },
    {
      question: 'Which principle explains why tops don\'t immediately fall?',
      options: [
        { text: 'Conservation of energy', correct: false },
        { text: 'Conservation of angular momentum', correct: true },
        { text: 'Conservation of mass', correct: false },
        { text: 'Conservation of charge', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const centerX = width / 2;
    const centerY = height / 2 + 50;

    // Calculate top position based on angles
    const topHeight = 80;
    const topRadius = 40;

    // Tilt causes the top to lean
    const tiltX = topHeight * Math.sin(top.theta) * Math.cos(top.phi);
    const tiltY = topHeight * Math.sin(top.theta) * Math.sin(top.phi) * 0.5; // Perspective

    // Tip position
    const tipX = centerX;
    const tipY = centerY + 40;

    // Top center position
    const topX = centerX + tiltX;
    const topY = centerY - topHeight * Math.cos(top.theta) * 0.7 + tiltY;

    // Spin visualization
    const spinPhase = top.psi % (2 * Math.PI);

    const state = getTopState();

    // Calculate angular momentum vector direction (along spin axis)
    const lVectorLength = Math.min(80, 20 + top.psiDot * 1.2);
    const lVectorEndX = topX + Math.sin(top.theta) * Math.cos(top.phi) * lVectorLength * -0.3;
    const lVectorEndY = topY - Math.cos(top.theta) * lVectorLength * 0.8;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* === PREMIUM DEFS SECTION === */}
          <defs>
            {/* Premium metallic body gradient - polished brass/gold */}
            <linearGradient id="slptBodyMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Top disk metallic gradient with 3D effect */}
            <radialGradient id="slptDiskMetallic" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="25%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>

            {/* Secondary metallic gradient for cone shading */}
            <linearGradient id="slptConeShading" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="25%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Tip metallic gradient - chrome steel */}
            <radialGradient id="slptTipChrome" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="30%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Angular momentum vector gradient - vibrant blue */}
            <linearGradient id="slptAngularMomentum" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="30%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>

            {/* Precession arc gradient - emerald green */}
            <linearGradient id="slptPrecessionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="1" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>

            {/* Surface/ground gradient */}
            <radialGradient id="slptSurfaceGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Spin indicator stripe gradient */}
            <linearGradient id="slptSpinStripe" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* State badge gradients */}
            <linearGradient id="slptSleepingBadge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="slptFallenBadge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="slptPrecessingBadge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.3" />
            </linearGradient>

            {/* Glow filter for angular momentum vector */}
            <filter id="slptVectorGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for precession arc */}
            <filter id="slptPrecessionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Tip highlight glow */}
            <filter id="slptTipGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for disk depth */}
            <filter id="slptDiskShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Arrow markers with gradients */}
            <marker id="slptArrowBlue" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#slptAngularMomentum)" />
            </marker>
            <marker id="slptArrowGreen" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="#34d399" />
            </marker>

            {/* Subtle grid pattern for lab floor */}
            <pattern id="slptLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background grid pattern */}
          <rect width={width} height={height} fill="url(#slptLabGrid)" opacity="0.5" />

          {/* Premium surface with shadow */}
          <ellipse cx={centerX} cy={tipY + 15} rx={140} ry={25} fill="url(#slptSurfaceGrad)" opacity="0.8" />
          <ellipse cx={centerX} cy={tipY + 12} rx={130} ry={22} fill="none" stroke="#475569" strokeWidth="1" opacity="0.5" />

          {/* Precession circle indicator - enhanced with glow */}
          {top.theta > 0.05 && (
            <g filter="url(#slptPrecessionGlow)">
              <ellipse
                cx={centerX}
                cy={centerY - 20}
                rx={Math.sin(top.theta) * topHeight * 1.2}
                ry={Math.sin(top.theta) * topHeight * 0.4}
                fill="none"
                stroke="url(#slptPrecessionGrad)"
                strokeWidth={2}
                strokeDasharray="8,4"
                opacity={0.7}
              />
            </g>
          )}

          {/* Top body - premium cone with metallic gradient and shading */}
          <g>
            {/* Cone shadow */}
            <polygon
              points={`
                ${tipX + 3},${tipY + 3}
                ${topX - topRadius * Math.cos(spinPhase) + 3},${topY + 3}
                ${topX + topRadius * Math.cos(spinPhase) + 3},${topY + 3}
              `}
              fill="#000"
              opacity="0.3"
            />

            {/* Main cone body with metallic gradient */}
            <polygon
              points={`
                ${tipX},${tipY}
                ${topX - topRadius * Math.cos(spinPhase)},${topY}
                ${topX + topRadius * Math.cos(spinPhase)},${topY}
              `}
              fill="url(#slptBodyMetallic)"
              stroke="#92400e"
              strokeWidth={1.5}
            />

            {/* Cone highlight line for 3D effect */}
            <line
              x1={tipX}
              y1={tipY}
              x2={topX}
              y2={topY}
              stroke="#fef3c7"
              strokeWidth={1}
              opacity={0.4}
            />
          </g>

          {/* Chrome tip with glow */}
          <g filter="url(#slptTipGlow)">
            <circle cx={tipX} cy={tipY} r={4} fill="url(#slptTipChrome)" />
            <circle cx={tipX - 1} cy={tipY - 1} r={1.5} fill="#fff" opacity="0.6" />
          </g>

          {/* Top disk with 3D metallic effect */}
          <g filter="url(#slptDiskShadow)">
            {/* Disk shadow */}
            <ellipse
              cx={topX + 2}
              cy={topY + 2}
              rx={topRadius}
              ry={topRadius * 0.35}
              fill="#000"
              opacity="0.3"
            />

            {/* Main disk with radial metallic gradient */}
            <ellipse
              cx={topX}
              cy={topY}
              rx={topRadius}
              ry={topRadius * 0.35}
              fill="url(#slptDiskMetallic)"
              stroke="#92400e"
              strokeWidth={1.5}
            />

            {/* Disk edge highlight */}
            <ellipse
              cx={topX}
              cy={topY - 2}
              rx={topRadius - 3}
              ry={topRadius * 0.25}
              fill="none"
              stroke="#fef3c7"
              strokeWidth={0.8}
              opacity={0.5}
            />
          </g>

          {/* Premium spin indicator stripes */}
          {[0, 1, 2, 3].map((i) => {
            const angle = spinPhase + (i * Math.PI) / 2;
            const stripeLength = topRadius * 0.85;
            return (
              <g key={i}>
                {/* Stripe shadow */}
                <line
                  x1={topX + 1}
                  y1={topY + 1}
                  x2={topX + stripeLength * Math.cos(angle) + 1}
                  y2={topY + stripeLength * 0.35 * Math.sin(angle) + 1}
                  stroke="#000"
                  strokeWidth={4}
                  opacity={0.2}
                  strokeLinecap="round"
                />
                {/* Main stripe */}
                <line
                  x1={topX}
                  y1={topY}
                  x2={topX + stripeLength * Math.cos(angle)}
                  y2={topY + stripeLength * 0.35 * Math.sin(angle)}
                  stroke="url(#slptSpinStripe)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Stripe highlight */}
                <line
                  x1={topX}
                  y1={topY}
                  x2={topX + stripeLength * 0.7 * Math.cos(angle)}
                  y2={topY + stripeLength * 0.7 * 0.35 * Math.sin(angle)}
                  stroke="#93c5fd"
                  strokeWidth={1}
                  opacity={0.5}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Premium Angular momentum vector with glow */}
          {top.psiDot > 5 && (
            <g filter="url(#slptVectorGlow)">
              {/* Vector shaft */}
              <line
                x1={topX}
                y1={topY}
                x2={lVectorEndX}
                y2={lVectorEndY}
                stroke="url(#slptAngularMomentum)"
                strokeWidth={4}
                strokeLinecap="round"
                markerEnd="url(#slptArrowBlue)"
              />
              {/* Vector label with background */}
              <rect
                x={lVectorEndX - 55}
                y={lVectorEndY - 22}
                width={110}
                height={18}
                rx={4}
                fill="#0c4a6e"
                opacity={0.8}
              />
              <text
                x={lVectorEndX}
                y={lVectorEndY - 9}
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize={11}
                fontWeight="bold"
              >
                L (Angular Momentum)
              </text>
            </g>
          )}

          {/* Premium precession arc with glow */}
          {top.phiDot > 0.1 && (
            <g filter="url(#slptPrecessionGlow)">
              <path
                d={`M ${centerX + 70} ${centerY - 20} A 70 24 0 0 1 ${centerX - 70} ${centerY - 20}`}
                fill="none"
                stroke="url(#slptPrecessionGrad)"
                strokeWidth={3}
                markerEnd="url(#slptArrowGreen)"
              />
              {/* Precession label with background */}
              <rect
                x={centerX - 42}
                y={centerY - 62}
                width={84}
                height={18}
                rx={4}
                fill="#064e3b"
                opacity={0.8}
              />
              <text
                x={centerX}
                y={centerY - 49}
                textAnchor="middle"
                fill="#6ee7b7"
                fontSize={11}
                fontWeight="bold"
              >
                Precession
              </text>
            </g>
          )}

          {/* Premium state indicator badge */}
          <g transform={`translate(20, 20)`}>
            <rect
              x={0}
              y={0}
              width={105}
              height={32}
              rx={6}
              fill={state === 'Sleeping' ? 'url(#slptSleepingBadge)' :
                    state === 'Fallen' ? 'url(#slptFallenBadge)' :
                    'url(#slptPrecessingBadge)'}
              stroke={state === 'Sleeping' ? '#10b981' :
                      state === 'Fallen' ? '#ef4444' : '#a855f7'}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            {/* Status indicator dot */}
            <circle
              cx={16}
              cy={16}
              r={5}
              fill={state === 'Sleeping' ? '#10b981' :
                    state === 'Fallen' ? '#ef4444' : '#a855f7'}
            >
              {state !== 'Fallen' && (
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>
            <text x={58} y={20} textAnchor="middle" fill={colors.textPrimary} fontSize={13} fontWeight="bold">
              {state}
            </text>
          </g>

          {/* Premium stats panel */}
          <g transform={`translate(${width - 120}, 140)`}>
            <rect
              x={0}
              y={0}
              width={110}
              height={60}
              rx={6}
              fill="#0f172a"
              fillOpacity={0.9}
              stroke="#334155"
              strokeWidth={1}
            />
            <text x={8} y={18} fill="#94a3b8" fontSize={11} fontWeight="600">
              Spin
            </text>
            <text x={102} y={18} textAnchor="end" fill="#38bdf8" fontSize={12} fontWeight="bold">
              {top.psiDot.toFixed(0)} rad/s
            </text>
            <text x={8} y={35} fill="#94a3b8" fontSize={11} fontWeight="600">
              Tilt
            </text>
            <text x={102} y={35} textAnchor="end" fill="#fbbf24" fontSize={12} fontWeight="bold">
              {(top.theta * 180 / Math.PI).toFixed(1)}°
            </text>
            <text x={8} y={52} fill="#94a3b8" fontSize={11} fontWeight="600">
              Prec
            </text>
            <text x={102} y={52} textAnchor="end" fill="#34d399" fontSize={12} fontWeight="bold">
              {top.phiDot.toFixed(1)} rad/s
            </text>
          </g>

          {/* Rotation direction indicator on disk */}
          {top.psiDot > 10 && (
            <g opacity={0.6}>
              <path
                d={`M ${topX - topRadius * 0.6} ${topY}
                    A ${topRadius * 0.6} ${topRadius * 0.6 * 0.35} 0 0 1
                    ${topX + topRadius * 0.6} ${topY}`}
                fill="none"
                stroke="#fef3c7"
                strokeWidth={1.5}
                strokeDasharray="3,2"
                markerEnd="url(#slptArrowBlue)"
              />
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isPlaying
                  ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                  : '0 4px 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              {isPlaying ? 'Pause' : 'Spin Top'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.2) 100%)',
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

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Initial Spin Rate: {initialSpin} rad/s
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={initialSpin}
          onChange={(e) => setInitialSpin(parseInt(e.target.value))}
          onInput={(e) => setInitialSpin(parseInt((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            accentColor: '#3b82f6'
          } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted }}>
          <span>Slow (falls)</span>
          <span>Fast (stable)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Initial Tilt: {(initialTilt * 180 / Math.PI).toFixed(0)}°
        </label>
        <input
          type="range"
          min="0.05"
          max="0.5"
          step="0.05"
          value={initialTilt}
          onChange={(e) => setInitialTilt(parseFloat(e.target.value))}
          onInput={(e) => setInitialTilt(parseFloat((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            accentColor: '#3b82f6'
          } as React.CSSProperties}
        />
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {getTopState() === 'Sleeping' && 'The top is "sleeping" - spinning so fast it appears stationary!'}
          {getTopState() === 'Precessing' && 'Watch the axis slowly circle around - that\'s precession!'}
          {getTopState() === 'Wobbling' && 'Spin is slowing - instability increasing!'}
          {getTopState() === 'Fallen' && 'The gyroscopic effect couldn\'t overcome gravity.'}
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string, showBack: boolean = false) => (
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
      zIndex: 1000,
    }}>
      {showBack && (
        <button
          onClick={() => {}}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: colors.textPrimary,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Back
        </button>
      )}
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
          marginLeft: showBack ? '0' : 'auto',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Navigation dots
  const renderNavDots = (currentPhase: string) => {
    const phases = [
      { key: 'hook', label: 'explore', color: colors.accent },
      { key: 'predict', label: 'predict', color: colors.warning },
      { key: 'play', label: 'experiment', color: colors.spin },
      { key: 'review', label: 'review', color: colors.success },
      { key: 'twist_predict', label: 'twist', color: colors.warning },
      { key: 'twist_play', label: 'experiment', color: colors.spin },
      { key: 'twist_review', label: 'review', color: colors.success },
      { key: 'transfer', label: 'apply', color: colors.precession },
      { key: 'test', label: 'quiz', color: colors.accent },
      { key: 'mastery', label: 'transfer', color: colors.success },
    ];

    const currentIndex = phases.findIndex(p => p.key === currentPhase);

    return (
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 1000,
        background: colors.bgDark,
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {phases.map((p, i) => (
          <div
            key={p.key}
            aria-label={p.label}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i === currentIndex ? p.color : 'rgba(148,163,184,0.7)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('hook')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              🌀 The Defiant Top
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How does a spinning top resist the force of gravity?
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
                A non-spinning top falls over instantly. But spin it fast enough, and it
                defies gravity - sometimes for minutes! This "sleeping top" phenomenon
                has fascinated physicists for centuries.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The same physics keeps bicycles upright and guides spacecraft through space.
              </p>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Try spinning the top and watch how it behaves!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →', false)}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('predict')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Make Your Prediction</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Think about what might happen before we test it
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A conical top balanced on its tip. Gravity pulls down on its center of mass,
              creating a torque that should tip it over. But when spinning...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When a tilted top is spinning fast, what happens?
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
                    background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →', true)}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('play')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Sleeping Top</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch how spin rate affects stability and precession
            </p>
          </div>

          {renderVisualization(true)}

          {/* Formula display */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <h4 style={{ color: colors.spin, marginBottom: '8px', fontSize: '14px' }}>⚡ Key Formula:</h4>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '16px',
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: '8px',
            }}>
              Ω<sub>prec</sub> = mgh / (Iω<sub>spin</sub>)
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0 }}>
              Precession rate is inversely proportional to spin rate
            </p>
          </div>

          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>High spin (80+) - watch it "sleep" nearly upright</li>
              <li>Medium spin (40-60) - observe precession circles</li>
              <li>Low spin (10-20) - it falls over quickly</li>
              <li>Watch how precession speeds up as spin slows down!</li>
            </ul>
          </div>

          {/* Before/After comparison */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px' }}>📊 Comparison:</h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.error, fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>No Spin</div>
                <div style={{ color: colors.textSecondary, fontSize: '11px' }}>Falls immediately</div>
              </div>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.success, fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Fast Spin</div>
                <div style={{ color: colors.textSecondary, fontSize: '11px' }}>Stable & precessing</div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →', true)}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'precess';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('review')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The top precesses - it wobbles slowly in circles instead of falling!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Gyroscopic Precession</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Angular Momentum:</strong> A spinning
                top has angular momentum L pointing along its spin axis. This vector resists
                changes to its direction (gyroscopic rigidity).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Torque = dL/dt:</strong> Gravity
                creates a horizontal torque. Instead of tipping over, this torque changes
                L's direction, causing it to sweep in a horizontal circle - precession!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Sleeping Top:</strong> When spinning
                extremely fast, even small tilts are suppressed. The top appears nearly
                motionless - it's "asleep."
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →', true)}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('twist_predict')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if the top spins slower?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine starting the top with a much lower spin rate. The angular
              momentum is weaker, so the gyroscopic effect is reduced.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 With much slower spin, what happens to the top?
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
                    transition: 'all 0.3s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →', true)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('twist_play')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Spin Rate Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare high spin vs low spin stability
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>💡 Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Below a critical spin rate, the gyroscopic effect can't overcome gravity's
              torque. Also notice: slower spin = faster precession (they're inversely related)!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →', true)}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster_fall';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots('twist_review')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Lower spin means less gyroscopic stability - the top falls faster!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Critical Spin Rate</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Balance:</strong> The gyroscopic
                effect must overcome gravity's tipping torque. Below a critical spin rate,
                gravity wins and the top becomes unstable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Inverse Relationship:</strong>
                Precession rate ∝ 1/spin rate. As the top slows down from friction, its
                precession speeds up - until stability is lost.
              </p>
              <p>
                This is why a spinning top always eventually falls - friction inevitably
                slows the spin below the critical threshold!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →', true)}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Gyroscopic effects are everywhere in technology
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
                {transferCompleted.has(index) && (
                  <span style={{ color: colors.success }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  💭 {app.question}
                </p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered gyroscopic physics!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

              return (
                <div
                  key={qIndex}
                  style={{
                    background: colors.bgCard,
                    margin: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}
                >
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        background: opt.correct
                          ? 'rgba(16, 185, 129, 0.2)'
                          : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}
                    >
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '24px',
            }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                      ? colors.textMuted
                      : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'rgba(168, 85, 247, 0.2)'
                      : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                }}
              >
                Submit Test
              </button>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered gyroscopic physics and the sleeping top
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Angular momentum and gyroscopic stability</li>
              <li>Precession as a response to torque</li>
              <li>Critical spin rate for stability</li>
              <li>Inverse relationship between spin and precession</li>
              <li>Applications from bicycles to spacecraft</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The mathematics of gyroscopes (Euler equations) describe phenomena from
              Earth's axial precession (26,000 year cycle!) to quantum spin. Modern
              inertial navigation uses laser ring gyroscopes - light instead of mass,
              but the same fundamental physics!
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

export default SleepingTopRenderer;
