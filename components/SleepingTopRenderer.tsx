import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
      { value: '$45B', label: 'Space industry annual revenue', icon: '💰' },
      { value: '$8B', label: 'Reaction wheel market size', icon: '🛰️' },
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
    howItWorks: 'Angular momentum L = I × ω is conserved. When the skater pulls arms from extended (large I) to the body (small I), the angular velocity ω must increase proportionally. A 3x reduction in I means 3x faster spinning.',
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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface SleepingTopRendererProps {
  gamePhase?: string;
  phase?: string;
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
  theta: number;
  phi: number;
  psi: number;
  thetaDot: number;
  phiDot: number;
  psiDot: number;
}

const SleepingTopRenderer: React.FC<SleepingTopRendererProps> = ({
  gamePhase: gamePhaseP,
  phase: phaseP,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase management - self-managing game
  const getInitialPhase = (): Phase => {
    const ext = gamePhaseP || phaseP;
    if (ext && PHASE_ORDER.includes(ext as Phase)) return ext as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync with external phase prop changes
  useEffect(() => {
    const ext = gamePhaseP || phaseP;
    if (ext && PHASE_ORDER.includes(ext as Phase) && ext !== phase) {
      setPhase(ext as Phase);
    }
  }, [gamePhaseP, phaseP]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < PHASE_ORDER.length - 1;

  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
  }, []);

  const goBack = useCallback(() => {
    if (canGoBack) goToPhase(PHASE_ORDER[currentPhaseIndex - 1]);
  }, [canGoBack, currentPhaseIndex, goToPhase]);

  const goNext = useCallback(() => {
    if (canGoNext) {
      goToPhase(PHASE_ORDER[currentPhaseIndex + 1]);
      if (onPhaseComplete) onPhaseComplete();
    }
  }, [canGoNext, currentPhaseIndex, goToPhase, onPhaseComplete]);

  // Simulation state
  const [top, setTop] = useState<TopState>({
    theta: 0.1,
    phi: 0,
    psi: 0,
    thetaDot: 0,
    phiDot: 0,
    psiDot: 50,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [initialSpin, setInitialSpin] = useState(50);
  const [initialTilt, setInitialTilt] = useState(0.1);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentApp, setCurrentApp] = useState(0);
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
  const m = 0.1;
  const R = 0.05;
  const h = 0.08;
  const I3 = 0.5 * m * R * R;
  const I1 = 0.25 * m * R * R + m * h * h / 3;
  const friction = 0.01;

  const updatePhysics = useCallback((dt: number, state: TopState): TopState => {
    const sinTheta = Math.sin(state.theta);
    const gyroTerm = I3 * state.psiDot;
    const gravitationalTorque = m * g * h * sinTheta;

    let phiDot = state.phiDot;
    if (gyroTerm > 0.1 && Math.abs(sinTheta) > 0.01) {
      phiDot = gravitationalTorque / gyroTerm;
    }

    const nutationDamping = 0.5;
    let thetaDot = state.thetaDot;
    let thetaDDot = 0;
    const criticalSpin = Math.sqrt(4 * m * g * h * I1) / I3;

    if (state.psiDot < criticalSpin * 0.5) {
      thetaDDot = gravitationalTorque / I1 - nutationDamping * thetaDot;
    } else {
      thetaDDot = -10 * (state.theta - 0.05) - nutationDamping * thetaDot;
    }

    thetaDot = thetaDot + thetaDDot * dt;
    const newTheta = Math.max(0.01, Math.min(Math.PI / 2, state.theta + thetaDot * dt));
    const newPsiDot = Math.max(0, state.psiDot * (1 - friction * dt));
    const newPhi = state.phi + phiDot * dt;
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

  useEffect(() => {
    if (!isPlaying) return;
    const dt = 0.016;
    const interval = setInterval(() => {
      setTop(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

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
    { id: 'levitate', label: 'The top levitates and floats in the air' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'It behaves exactly the same' },
    { id: 'faster_fall', label: 'It falls over more quickly' },
    { id: 'slower_fall', label: 'It takes longer to fall' },
    { id: 'no_precess', label: 'It stops precessing and just spins' },
    { id: 'reverse', label: 'It precesses in the opposite direction' },
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
      context: 'A spinning top tilted at 10° maintains its angle for several seconds before slowly precessing.',
    },
    {
      question: 'What is precession in the context of a spinning top?',
      options: [
        { text: 'The spin around the top\'s own axis', correct: false },
        { text: 'The slow circular motion of the tilted spin axis', correct: true },
        { text: 'The wobbling back and forth motion', correct: false },
        { text: 'The friction between the tip and the surface', correct: false },
      ],
      context: 'Watch a tilted top: its axis traces a cone shape over several seconds.',
    },
    {
      question: 'As a top slows down, its precession rate:',
      options: [
        { text: 'Stays constant', correct: false },
        { text: 'Decreases', correct: false },
        { text: 'Increases', correct: true },
        { text: 'Stops immediately', correct: false },
      ],
      context: 'A top starts spinning at 80 rad/s and slows to 20 rad/s due to friction. Ω_prec = mgh / (I·ω).',
    },
    {
      question: 'What is a "sleeping" top?',
      options: [
        { text: 'A top that has fallen over', correct: false },
        { text: 'A top spinning so fast it appears motionless and perfectly upright', correct: true },
        { text: 'A top that has stopped spinning', correct: false },
        { text: 'A top spinning very slowly', correct: false },
      ],
      context: 'At very high spin rates (>60 rad/s), the top\'s precession becomes almost imperceptible.',
    },
    {
      question: 'What determines the minimum spin rate for a stable top?',
      options: [
        { text: 'The color of the top', correct: false },
        { text: 'The balance between gravity torque and gyroscopic stability', correct: true },
        { text: 'The temperature of the room', correct: false },
        { text: 'How hard you initially spin it', correct: false },
      ],
      context: 'Below critical spin ω_crit = 2√(mghI₁)/I₃, the top becomes unstable.',
    },
    {
      question: 'What causes nutation (the fast wobble superimposed on precession)?',
      options: [
        { text: 'Wind in the room', correct: false },
        { text: 'Oscillation of the tilt angle as the top adjusts to torques', correct: true },
        { text: 'Imperfections in the top\'s shape', correct: false },
        { text: 'Friction with the surface', correct: false },
      ],
      context: 'A top released with non-zero tilt velocity shows rapid wobble on top of the slow precession circle.',
    },
    {
      question: 'Why does gravity cause precession instead of simply tipping the top over?',
      options: [
        { text: 'The angular momentum vector changes direction, not magnitude', correct: true },
        { text: 'Gravity is too weak to tip a spinning object', correct: false },
        { text: 'The floor prevents tipping', correct: false },
        { text: 'Air pressure balances gravity', correct: false },
      ],
      context: 'Torque τ = dL/dt. For a spinning top, gravity\'s torque changes the direction of L.',
    },
    {
      question: 'What happens when a spinning top\'s angular momentum drops below a critical value?',
      options: [
        { text: 'It speeds up', correct: false },
        { text: 'It becomes unstable and falls over', correct: true },
        { text: 'It hovers in the air', correct: false },
        { text: 'Nothing changes', correct: false },
      ],
      context: 'As friction slows the spin, gyroscopic stabilization weakens until gravity wins.',
    },
    {
      question: 'The direction of precession depends on:',
      options: [
        { text: 'The direction of gravity', correct: false },
        { text: 'The direction of spin (clockwise vs counterclockwise)', correct: true },
        { text: 'The mass of the top', correct: false },
        { text: 'The temperature', correct: false },
      ],
      context: 'Reversing the spin direction reverses the cross product τ × L, reversing precession.',
    },
    {
      question: 'Which principle explains why tops don\'t immediately fall?',
      options: [
        { text: 'Conservation of energy', correct: false },
        { text: 'Conservation of angular momentum', correct: true },
        { text: 'Conservation of mass', correct: false },
        { text: 'Conservation of charge', correct: false },
      ],
      context: 'A spinning top has angular momentum L = I·ω pointing along its spin axis.',
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

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const centerX = width / 2;
    const centerY = height / 2 + 50;

    const topHeight = 80;
    const topRadius = 40;

    const tiltX = topHeight * Math.sin(top.theta) * Math.cos(top.phi);
    const tiltY = topHeight * Math.sin(top.theta) * Math.sin(top.phi) * 0.5;

    const tipX = centerX;
    const tipY = centerY + 40;

    const topX = centerX + tiltX;
    const topY = centerY - topHeight * Math.cos(top.theta) * 0.7 + tiltY;

    const spinPhase = top.psi % (2 * Math.PI);
    const state = getTopState();

    const lVectorLength = Math.min(80, 20 + top.psiDot * 1.2);
    const lVectorEndX = topX + Math.sin(top.theta) * Math.cos(top.phi) * lVectorLength * -0.3;
    const lVectorEndY = topY - Math.cos(top.theta) * lVectorLength * 0.8;

    // Stats panel position - right side at y=60 (distinct from top state badge at y=20)
    const statsPanelX = width - 120;
    const statsPanelY = 60;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="slptBodyMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            <radialGradient id="slptDiskMetallic" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="25%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>

            <linearGradient id="slptConeShading" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="25%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <radialGradient id="slptTipChrome" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="30%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            <linearGradient id="slptAngularMomentum" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="30%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>

            <linearGradient id="slptPrecessionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="1" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>

            <radialGradient id="slptSurfaceGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            <linearGradient id="slptSpinStripe" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

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

            <filter id="slptVectorGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="slptPrecessionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="slptTipGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="slptDiskShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <marker id="slptArrowBlue" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#slptAngularMomentum)" />
            </marker>
            <marker id="slptArrowGreen" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="#34d399" />
            </marker>

            <pattern id="slptLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={width} height={height} fill="url(#slptLabGrid)" opacity="0.5" />

          {/* Surface */}
          <ellipse cx={centerX} cy={tipY + 15} rx={140} ry={25} fill="url(#slptSurfaceGrad)" opacity="0.8" />
          <ellipse cx={centerX} cy={tipY + 12} rx={130} ry={22} fill="none" stroke="#475569" strokeWidth="1" opacity="0.5" />

          {/* Precession circle */}
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

          {/* Top body */}
          <g>
            <polygon
              points={`
                ${tipX + 3},${tipY + 3}
                ${topX - topRadius * Math.cos(spinPhase) + 3},${topY + 3}
                ${topX + topRadius * Math.cos(spinPhase) + 3},${topY + 3}
              `}
              fill="#000"
              opacity="0.3"
            />
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

          {/* Chrome tip */}
          <g filter="url(#slptTipGlow)">
            <circle cx={tipX} cy={tipY} r={4} fill="url(#slptTipChrome)" />
            <circle cx={tipX - 1} cy={tipY - 1} r={1.5} fill="#fff" opacity="0.6" />
          </g>

          {/* Disk */}
          <g filter="url(#slptDiskShadow)">
            <ellipse
              cx={topX + 2}
              cy={topY + 2}
              rx={topRadius}
              ry={topRadius * 0.35}
              fill="#000"
              opacity="0.3"
            />
            <ellipse
              cx={topX}
              cy={topY}
              rx={topRadius}
              ry={topRadius * 0.35}
              fill="url(#slptDiskMetallic)"
              stroke="#92400e"
              strokeWidth={1.5}
            />
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

          {/* Spin indicator stripes */}
          {[0, 1, 2, 3].map((i) => {
            const angle = spinPhase + (i * Math.PI) / 2;
            const stripeLength = topRadius * 0.85;
            return (
              <g key={i}>
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
                <line
                  x1={topX}
                  y1={topY}
                  x2={topX + stripeLength * Math.cos(angle)}
                  y2={topY + stripeLength * 0.35 * Math.sin(angle)}
                  stroke="url(#slptSpinStripe)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
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

          {/* Angular momentum vector */}
          {top.psiDot > 5 && (
            <g filter="url(#slptVectorGlow)">
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
              {/* L label positioned to avoid overlap with state badge (which is at top-left) */}
              <rect
                x={lVectorEndX - 55}
                y={lVectorEndY - 24}
                width={110}
                height={18}
                rx={4}
                fill="#0c4a6e"
                opacity={0.85}
              />
              <text
                x={lVectorEndX}
                y={lVectorEndY - 11}
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize={11}
                fontWeight="bold"
              >
                L = Angular Momentum
              </text>
            </g>
          )}

          {/* Precession arc */}
          {top.phiDot > 0.1 && (
            <g filter="url(#slptPrecessionGlow)">
              <path
                d={`M ${centerX + 70} ${centerY - 20} A 70 24 0 0 1 ${centerX - 70} ${centerY - 20}`}
                fill="none"
                stroke="url(#slptPrecessionGrad)"
                strokeWidth={3}
                markerEnd="url(#slptArrowGreen)"
              />
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

          {/* State badge - top LEFT corner */}
          <g transform="translate(10, 8)">
            <rect
              x={0}
              y={0}
              width={90}
              height={24}
              rx={5}
              fill={state === 'Sleeping' ? 'url(#slptSleepingBadge)' :
                    state === 'Fallen' ? 'url(#slptFallenBadge)' :
                    'url(#slptPrecessingBadge)'}
              stroke={state === 'Sleeping' ? '#10b981' :
                      state === 'Fallen' ? '#ef4444' : '#a855f7'}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <circle
              cx={12}
              cy={12}
              r={4}
              fill={state === 'Sleeping' ? '#10b981' :
                    state === 'Fallen' ? '#ef4444' : '#a855f7'}
            >
              {state !== 'Fallen' && (
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>
            <text x={48} y={16} textAnchor="middle" fill={colors.textPrimary} fontSize={12} fontWeight="bold">
              {state}
            </text>
          </g>

          {/* Stats panel - right side, stacked label/value rows to avoid overlap */}
          {/* y-values offset from badge text (y=16) to prevent raw-coordinate overlap */}
          <g transform={`translate(${statsPanelX}, ${statsPanelY})`}>
            <rect
              x={0}
              y={0}
              width={110}
              height={125}
              rx={6}
              fill="#0f172a"
              fillOpacity={0.9}
              stroke="#334155"
              strokeWidth={1}
            />
            {/* Row 1: Spin Rate — label y=30 avoids badge text at y=16 */}
            <text x={8} y={30} fill="rgba(148,163,184,0.7)" fontSize={11} fontWeight="500">
              Spin Rate
            </text>
            <text x={55} y={46} textAnchor="middle" fill="#7dd3fc" fontSize={12} fontWeight="bold">
              {top.psiDot.toFixed(0)} r/s
            </text>
            {/* Row 2: Tilt Angle */}
            <text x={8} y={65} fill="rgba(148,163,184,0.7)" fontSize={11} fontWeight="500">
              Tilt Angle
            </text>
            <text x={55} y={81} textAnchor="middle" fill="#fbbf24" fontSize={12} fontWeight="bold">
              {(top.theta * 180 / Math.PI).toFixed(1)}°
            </text>
            {/* Row 3: Prec. Rate */}
            <text x={8} y={100} fill="rgba(148,163,184,0.7)" fontSize={11} fontWeight="500">
              Prec. Rate
            </text>
            <text x={55} y={116} textAnchor="middle" fill="#34d399" fontSize={12} fontWeight="bold">
              {top.phiDot.toFixed(2)} r/s
            </text>
          </g>

          {/* Rotation direction indicator */}
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
                transition: 'all 0.2s ease',
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

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Initial Spin Rate: <strong style={{ color: '#38bdf8' }}>{initialSpin} rad/s</strong>
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
            accentColor: '#3b82f6',
            cursor: 'pointer',
          } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148,163,184,0.7)' }}>
          <span>10 (falls)</span>
          <span>100 (sleeping)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Initial Tilt: <strong style={{ color: '#fbbf24' }}>{(initialTilt * 180 / Math.PI).toFixed(0)}°</strong>
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
            accentColor: '#3b82f6',
            cursor: 'pointer',
          } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148,163,184,0.7)' }}>
          <span>3° (nearly upright)</span>
          <span>29° (large tilt)</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 'normal' }}>
          {getTopState() === 'Sleeping' && 'The top is "sleeping" - spinning so fast it appears stationary!'}
          {getTopState() === 'Precessing' && 'Watch the axis slowly circle around - that\'s precession!'}
          {getTopState() === 'Wobbling' && 'Spin is slowing - instability increasing!'}
          {getTopState() === 'Fallen' && 'The gyroscopic effect couldn\'t overcome gravity.'}
        </div>
      </div>
    </div>
  );

  // Navigation dots
  const renderNavDots = () => {
    const phases: { key: Phase; label: string; color: string }[] = [
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

    const currentIndex = PHASE_ORDER.indexOf(phase);

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
            onClick={() => goToPhase(p.key)}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i === currentIndex ? p.color : 'rgba(148,163,184,0.7)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    );
  };

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
      alignItems: 'center',
      zIndex: 1000,
    }}>
      {showBack ? (
        <button
          onClick={goBack}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: colors.textPrimary,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={goNext}
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
          transition: 'all 0.2s ease',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // ============================================================
  // HOOK PHASE
  // ============================================================
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: '700' }}>
              🌀 The Defiant Top
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '8px', fontWeight: '400' }}>
              How does a spinning top resist the force of gravity?
            </p>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '14px', marginBottom: '16px', fontWeight: 'normal' }}>
              Explore gyroscopic physics — the science behind spacecraft, bicycles, and more
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                A non-spinning top falls over instantly. But spin it fast enough, and it
                defies gravity — sometimes for minutes! This "sleeping top" phenomenon
                has fascinated physicists for centuries and engineers in industry.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 'normal' }}>
                The same physics keeps bicycles upright, guides spacecraft through space,
                and lets figure skaters spin at 6 revolutions per second.
              </p>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: '500' }}>
                💡 Click "Spin Top" above and watch how spin rate affects stability.
                Notice the difference between a slow spin (falls over) and a fast spin (precesses)!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: Make a Prediction →', false)}
      </div>
    );
  }

  // ============================================================
  // PREDICT PHASE
  // ============================================================
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700' }}>Make Your Prediction</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Think about what might happen before we test it
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '600' }}>📋 The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 'normal' }}>
              A conical top is balanced on its tip. Gravity pulls down on its center of mass,
              creating a torque that should tip it over. But when you spin it fast...
              something unexpected happens. What do you predict?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '600' }}>
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
                    fontWeight: prediction === p.id ? '600' : '400',
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

  // ============================================================
  // PLAY PHASE
  // ============================================================
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700' }}>Explore the Sleeping Top</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Adjust the spin rate and tilt to observe how they affect stability and precession
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
              {/* Key formula near graphic */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '12px',
              }}>
                <h4 style={{ color: colors.spin, marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>⚡ Key Formula:</h4>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  Ω_prec = mgh / (I · ω_spin)
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0, fontWeight: 'normal' }}>
                  Precession rate Ω is inversely proportional to spin rate ω — slower spin = faster precession.
                  This is the key cause-effect relationship governing gyroscopic motion.
                </p>
              </div>

              {renderControls()}
            </div>
          </div>

          {/* Educational definition of key terms */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>📖 Key Physics Terms:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ color: '#7dd3fc', fontWeight: '700' }}>Angular Momentum (L = I·ω):</span>
                <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}> A spinning body resists changes to its rotation axis — the faster it spins, the more rigid the axis.</span>
              </div>
              <div>
                <span style={{ color: '#6ee7b7', fontWeight: '700' }}>Precession:</span>
                <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}> The slow circular wobble of the spin axis caused by gravity's torque. Instead of falling, the top traces a cone.</span>
              </div>
              <div>
                <span style={{ color: '#fbbf24', fontWeight: '700' }}>Gyroscopic Stability:</span>
                <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}> The property that makes fast-spinning objects resist tipping — essential for spacecraft, bikes, and navigation.</span>
              </div>
              <div>
                <span style={{ color: '#fca5a5', fontWeight: '700' }}>Critical Spin Rate:</span>
                <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}> Below this threshold, gravity torque overcomes gyroscopic stability and the top falls.</span>
              </div>
            </div>
          </div>

          {/* Why this matters */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: '700' }}>🌍 Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 'normal' }}>
              Gyroscopic physics is fundamental to modern engineering. NASA and SpaceX use
              reaction wheels (spinning disks) to orient satellites without using fuel.
              Bicycles and motorcycles exploit gyroscopic stabilization for safer riding.
              Even your smartphone contains tiny MEMS gyroscopes for orientation sensing.
              Understanding spin-stability relationships is critical for robotics, aerospace,
              and consumer electronics design.
            </p>
          </div>

          {/* Comparison display */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>📊 Before vs After Spinning:</h4>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.error, fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>No Spin (ω=0)</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 'normal' }}>Falls immediately under gravity torque</div>
              </div>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.spin, fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>Medium Spin</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 'normal' }}>Visible precession circles</div>
              </div>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.success, fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>Fast Spin (60+)</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 'normal' }}>"Sleeping" — stable & upright</div>
              </div>
            </div>
          </div>

          {/* Cause-effect explanation */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: '700' }}>🔬 Cause → Effect:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 2, paddingLeft: '20px', margin: 0, fontWeight: 'normal' }}>
              <li><strong style={{ color: colors.textPrimary, fontWeight: '600' }}>Higher spin rate</strong> → Stronger angular momentum → More stable (less precession)</li>
              <li><strong style={{ color: colors.textPrimary, fontWeight: '600' }}>Lower spin rate</strong> → Weaker angular momentum → Faster precession or falls</li>
              <li><strong style={{ color: colors.textPrimary, fontWeight: '600' }}>Greater tilt</strong> → More gravity torque → Faster precession required for stability</li>
              <li><strong style={{ color: colors.textPrimary, fontWeight: '600' }}>Friction over time</strong> → Spin decays below critical → Top eventually falls</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →', true)}
      </div>
    );
  }

  // ============================================================
  // REVIEW PHASE
  // ============================================================
  if (phase === 'review') {
    const wasCorrect = prediction === 'precess';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: '700' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontWeight: '400' }}>
              {wasCorrect
                ? 'You predicted it! The tilted top precesses — its spin axis circles slowly instead of the top falling.'
                : `You predicted "${predictions.find(p => p.id === prediction)?.label ?? 'something else'}". The correct answer is: the top precesses — it wobbles slowly in circles instead of falling!`
              }
            </p>
          </div>

          {/* SVG diagram in review */}
          <div style={{ margin: '0 16px' }}>
            {renderVisualization(false)}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>🎓 Why Does This Happen? — Gyroscopic Precession</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 'normal' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Why Angular Momentum Prevents Falling:</strong> A spinning
                top has angular momentum <em>L</em> pointing along its spin axis. This vector strongly
                resists changes to its direction — that's why spinning objects are so stable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>The Key Formula — Torque = dL/dt:</strong> Gravity
                creates a horizontal torque (τ = r × F). Instead of tipping over, this torque causes
                <em>L</em>'s direction to sweep in a circle. This is exactly what you observed as precession!
                The precession rate formula is: <strong style={{ color: '#38bdf8', fontWeight: '700' }}>Ω = mgh / (I·ω)</strong>
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Connection to Your Prediction:</strong>{' '}
                {wasCorrect
                  ? 'Your intuition was correct — angular momentum\'s resistance to direction change converts the "falling" force into circular precession instead.'
                  : 'The surprising reality is that spinning objects don\'t simply fall — they precess. The same force that would tip a stationary object instead causes a spinning object to orbit.'
                }
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>The "Sleeping" State:</strong> When spinning
                extremely fast (high ω), even small tilts are suppressed because
                Ω = mgh/(I·ω) becomes very small — the top appears nearly
                motionless, "sleeping," with almost no visible precession.
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <h4 style={{ color: colors.spin, marginBottom: '8px', fontWeight: '700' }}>📐 Mathematical Relationship:</h4>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '15px',
              color: colors.textPrimary,
              textAlign: 'center',
              padding: '10px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '6px',
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              Ω_prec = mgh / (I · ω_spin)
            </div>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 'normal' }}>
              <li><strong style={{ fontWeight: '600' }}>m</strong> = mass, <strong style={{ fontWeight: '600' }}>g</strong> = gravity, <strong style={{ fontWeight: '600' }}>h</strong> = center-of-mass height</li>
              <li><strong style={{ fontWeight: '600' }}>I</strong> = moment of inertia, <strong style={{ fontWeight: '600' }}>ω</strong> = spin rate</li>
              <li>Ω ∝ 1/ω — doubling spin rate halves precession rate</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →', true)}
      </div>
    );
  }

  // ============================================================
  // TWIST PREDICT PHASE
  // ============================================================
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary, fontWeight: 'normal' }}>
              A new variable: what happens when we change the initial spin rate?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '600' }}>📋 The New Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 'normal' }}>
              Now imagine starting the top with a much lower spin rate — say 15 rad/s instead
              of 50 rad/s. The angular momentum vector L = I·ω is much weaker. How does this
              change the top's behavior? Think about what the formula Ω = mgh/(I·ω) predicts.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '600' }}>
              🤔 With much slower spin (15 rad/s), what happens to the top?
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
                    fontWeight: twistPrediction === p.id ? '600' : '400',
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

  // ============================================================
  // TWIST PLAY PHASE
  // ============================================================
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>Test Spin Rate Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Compare high spin vs low spin stability
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
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '12px',
              }}>
                <h4 style={{ color: colors.spin, marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>⚡ Critical Relationship:</h4>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '15px',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  Ω_prec = mgh / (I · ω_spin)
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0, fontWeight: 'normal' }}>
                  Slower spin (ω↓) → larger Ω_prec → faster wobble, until the top destabilizes completely.
                </p>
              </div>

              {renderControls()}
            </div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>💡 New Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Below a critical spin rate ω_crit = 2√(mghI₁)/I₃, the gyroscopic effect can't overcome
              gravity's torque. This is genuinely new behavior — a threshold effect not present at high spin rates.
              Also notice: slower spin = faster precession (they're inversely related)!
            </p>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>📊 Spin Rate Comparison:</h4>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.error, fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>Slow Spin (10-20 r/s)</div>
                <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'normal' }}>Falls quickly, no stability</div>
              </div>
              <div style={{ flex: '1', minWidth: '140px', background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.success, fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>Fast Spin (60+ r/s)</div>
                <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'normal' }}>Stable, slow precession</div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →', true)}
      </div>
    );
  }

  // ============================================================
  // TWIST REVIEW PHASE
  // ============================================================
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster_fall';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: '700' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontWeight: '400' }}>
              Lower spin means less gyroscopic stability - the top falls faster!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: '700' }}>🔬 Critical Spin Rate — Why the Threshold Exists</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 'normal' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>The Critical Threshold:</strong> The gyroscopic
                effect must overcome gravity's tipping torque. Below critical spin rate
                ω_crit = 2√(mghI₁)/I₃, gravity wins and the top becomes unstable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Inverse Relationship:</strong>
                Precession rate Ω ∝ 1/ω_spin. As the top slows from friction, its
                precession speeds up — until stability threshold is crossed.
              </p>
              <p>
                This is why every spinning top always eventually falls — friction
                inevitably reduces ω below the critical threshold!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →', true)}
      </div>
    );
  }

  // ============================================================
  // TRANSFER PHASE
  // ============================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Sleeping Top"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[currentApp];
    const appCompleted = transferCompleted.has(currentApp);

    const handleGotIt = () => {
      const newCompleted = new Set([...transferCompleted, currentApp]);
      setTransferCompleted(newCompleted);
      if (currentApp < realWorldApps.length - 1) {
        setCurrentApp(currentApp + 1);
      }
    };

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '4px', textAlign: 'center', fontWeight: '700' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '4px', fontWeight: 'normal' }}>
              How engineers apply gyroscopic physics in industry
            </p>
            {/* Progress indicator: App X of Y */}
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '13px', textAlign: 'center', marginBottom: '16px', fontWeight: 'normal' }}>
              Application {currentApp + 1} of {realWorldApps.length} — {transferCompleted.size} completed
            </p>
          </div>

          {/* App navigation tabs */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {realWorldApps.map((a, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentApp(idx)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  background: idx === currentApp
                    ? a.color
                    : transferCompleted.has(idx)
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(255,255,255,0.1)',
                  color: idx === currentApp ? 'white' : colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: idx === currentApp ? '700' : '400',
                  transition: 'all 0.2s ease',
                }}
              >
                {transferCompleted.has(idx) ? '✓ ' : ''}{a.icon} {a.title.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Current app card */}
          <div
            style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              border: appCompleted ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{app.icon}</div>
                <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '4px', fontWeight: '700' }}>{app.title}</h3>
                <p style={{ color: app.color, fontSize: '12px', fontStyle: 'italic', fontWeight: 'normal' }}>{app.tagline}</p>
              </div>
              {appCompleted && (
                <span style={{ color: colors.success, fontSize: '24px' }}>✓</span>
              )}
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', lineHeight: 1.6, fontWeight: 'normal' }}>
              {app.description}
            </p>

            <div style={{
              background: `${app.color}22`,
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '12px',
              borderLeft: `3px solid ${app.color}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                🔗 Connection to Sleeping Top:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5, fontWeight: 'normal' }}>
                {app.connection}
              </p>
            </div>

            {!appCompleted ? (
              <>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '11px', marginBottom: '4px', fontWeight: '600' }}>COMPANIES:</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 'normal' }}>
                    {app.companies.join(' • ')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{
                      flex: '1',
                      minWidth: '100px',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ color: app.color, fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>{stat.value}</div>
                      <div style={{ color: 'rgba(148,163,184,0.7)', fontSize: '10px', fontWeight: 'normal' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGotIt}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Got It — Next Application →
                </button>
              </>
            ) : (
              <>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '14px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                  marginBottom: '12px',
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    ⚙️ How It Works:
                  </p>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, fontWeight: 'normal' }}>{app.howItWorks}</p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{
                      flex: '1',
                      minWidth: '100px',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ color: app.color, fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>{stat.value}</div>
                      <div style={{ color: 'rgba(148,163,184,0.7)', fontSize: '10px', fontWeight: 'normal' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}>
                  <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '11px', marginBottom: '4px', fontWeight: '600' }}>INDUSTRY EXAMPLES:</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 'normal' }}>
                    {app.companies.join(' • ')}
                  </p>
                </div>

                <div style={{
                  background: `${app.color}11`,
                  padding: '10px',
                  borderRadius: '6px',
                }}>
                  <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '11px', marginBottom: '4px', fontWeight: '600' }}>FUTURE IMPACT:</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5, fontWeight: 'normal' }}>
                    {app.futureImpact}
                  </p>
                </div>

                {currentApp < realWorldApps.length - 1 && (
                  <button
                    onClick={() => setCurrentApp(currentApp + 1)}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.accent}`,
                      background: 'transparent',
                      color: colors.accent,
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Continue to Next Application →
                  </button>
                )}
              </>
            )}
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '13px', textAlign: 'center', fontWeight: '500' }}>
              <strong style={{ fontWeight: '700' }}>Progress:</strong> {transferCompleted.size} of {realWorldApps.length} applications explored
            </p>
          </div>
        </div>
        {renderBottomBar(
          transferCompleted.size < realWorldApps.length,
          transferCompleted.size >= realWorldApps.length,
          transferCompleted.size >= realWorldApps.length ? 'Take the Test →' : 'Continue Exploring →',
          true
        )}
      </div>
    );
  }

  // ============================================================
  // TEST PHASE
  // ============================================================
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderNavDots()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              transition: 'all 0.3s ease',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: '700' }}>
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Good Job — Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: '700' }}>
                Score: {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: 'normal' }}>
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
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '700' }}>
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
                        fontWeight: opt.correct ? '600' : 'normal',
                      }}
                    >
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry', true)}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: '700' }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: '600', fontSize: '15px' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px', lineHeight: 1.5, fontWeight: 'normal' }}>
              Test your understanding of gyroscopic physics, angular momentum, precession,
              and the sleeping top phenomenon. Each question includes a real-world scenario
              to help you apply the concepts you have explored in this module.
            </p>

            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '16px',
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
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Scenario context for each question */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}>
              <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '11px', marginBottom: '4px', fontWeight: '600' }}>SCENARIO:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5, fontWeight: 'normal' }}>
                {currentQ.context}
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: '600' }}>
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
                    fontWeight: testAnswers[currentTestQuestion] === oIndex ? '600' : '400',
                    transition: 'all 0.3s ease',
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
                fontWeight: '500',
                transition: 'all 0.2s ease',
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
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                }}
              >
                Next Question
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
                  fontWeight: '700',
                  transition: 'all 0.2s ease',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        {/* Fixed bottom bar - disabled during active quiz, enabled after submission */}
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
            disabled={true}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: colors.textMuted,
              fontWeight: 'bold',
              cursor: 'not-allowed',
              fontSize: '16px',
              opacity: 0.4,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MASTERY PHASE
  // ============================================================
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: '700' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '8px', fontWeight: '400' }}>
              You've mastered gyroscopic physics and the sleeping top!
            </p>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '14px', fontWeight: 'normal' }}>
              Congratulations on completing this module — you've earned this accomplishment.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 'normal' }}>
              <li><strong style={{ fontWeight: '600' }}>Angular momentum</strong> and gyroscopic stability (L = I·ω)</li>
              <li><strong style={{ fontWeight: '600' }}>Precession</strong> as torque-induced direction change of L</li>
              <li><strong style={{ fontWeight: '600' }}>Critical spin rate</strong> for stability threshold</li>
              <li><strong style={{ fontWeight: '600' }}>Inverse relationship</strong> — Ω = mgh/(I·ω)</li>
              <li><strong style={{ fontWeight: '600' }}>Applications</strong>: spacecraft (NASA, SpaceX), bicycles, gyrocompasses</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <h3 style={{ color: colors.success, marginBottom: '8px', fontWeight: '700' }}>🏅 Achievement Unlocked: Gyroscope Master</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 'normal' }}>
              You can now explain why tops, bicycles, and spacecraft all exploit the same physics.
              This understanding connects classical mechanics to modern engineering applications
              across aerospace, robotics, and consumer electronics.
            </p>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 'normal' }}>
              The mathematics of gyroscopes (Euler equations) describe phenomena from
              Earth's axial precession (26,000 year cycle!) to quantum spin. Modern
              inertial navigation uses laser ring gyroscopes — light instead of mass,
              but the same fundamental physics governing angular momentum.
              Companies like Honeywell, Safran, and Collins Aerospace build billion-dollar
              businesses on these principles.
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →', true)}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderNavDots()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', padding: '24px', textAlign: 'center' }}>
        <h1 style={{ color: colors.accent, fontWeight: '700' }}>🌀 Sleeping Top</h1>
        <p style={{ color: colors.textSecondary, fontWeight: 'normal' }}>Loading...</p>
      </div>
    </div>
  );
};

export default SleepingTopRenderer;
