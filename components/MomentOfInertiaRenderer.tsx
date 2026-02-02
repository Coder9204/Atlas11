'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// MOMENT OF INERTIA - Complete 10-Phase Game
// How mass distribution affects rotational motion
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

interface MomentOfInertiaRendererProps {
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
    scenario: "A figure skater begins a spin with arms extended and then pulls them close to her body. She notices her spin speed increases dramatically.",
    question: "What fundamental physics principle explains this phenomenon?",
    options: [
      { id: 'a', label: "Conservation of energy - she gains kinetic energy" },
      { id: 'b', label: "Conservation of angular momentum - L = I times omega stays constant", correct: true },
      { id: 'c', label: "Newton's third law - the ice pushes back harder" },
      { id: 'd', label: "Conservation of mass - her mass is redistributed" }
    ],
    explanation: "When no external torque acts on a system, angular momentum L = I times omega is conserved. By pulling in her arms, she decreases I, so omega must increase to keep L constant."
  },
  {
    scenario: "Two wheels have the same mass and radius. One is a solid disk, and the other is a thin ring (hoop) with all mass at the rim. Both are released from rest at the top of an identical inclined ramp.",
    question: "Which wheel reaches the bottom of the ramp first?",
    options: [
      { id: 'a', label: "The solid disk reaches the bottom first", correct: true },
      { id: 'b', label: "The ring reaches the bottom first" },
      { id: 'c', label: "They reach the bottom at exactly the same time" },
      { id: 'd', label: "It depends on the steepness of the ramp" }
    ],
    explanation: "The solid disk has I = (1/2)MR^2, while the ring has I = MR^2. More of the disk's gravitational potential energy goes into translational kinetic energy rather than rotational, so it accelerates faster down the ramp."
  },
  {
    scenario: "An engineer is designing a flywheel for energy storage. She must choose between a solid cylinder and a hollow cylinder of the same mass and outer radius.",
    question: "Which design stores more rotational kinetic energy at the same angular velocity?",
    options: [
      { id: 'a', label: "The solid cylinder stores more energy" },
      { id: 'b', label: "The hollow cylinder stores more energy", correct: true },
      { id: 'c', label: "Both store exactly the same energy" },
      { id: 'd', label: "Energy storage doesn't depend on mass distribution" }
    ],
    explanation: "Rotational kinetic energy is KE = (1/2)I*omega^2. The hollow cylinder has higher I because mass is farther from the axis. At the same omega, higher I means more stored energy."
  },
  {
    scenario: "A diver jumps off a platform and performs a triple somersault. She starts in a straight (layout) position, then tucks tightly, completes the rotations, and opens up before entering the water.",
    question: "Why does she tuck for the somersaults and open up before entry?",
    options: [
      { id: 'a', label: "Tucking reduces air resistance, opening increases it" },
      { id: 'b', label: "Tucking decreases I to spin faster, opening increases I to slow rotation", correct: true },
      { id: 'c', label: "Tucking generates more angular momentum" },
      { id: 'd', label: "Opening creates lift to slow her fall" }
    ],
    explanation: "By tucking, the diver reduces her moment of inertia, which increases omega (conservation of angular momentum). Opening up before entry increases I, slowing rotation for a clean vertical entry."
  },
  {
    scenario: "A playground merry-go-round is spinning freely. A child walks from the edge toward the center of the merry-go-round.",
    question: "What happens to the merry-go-round's rotation speed as the child walks inward?",
    options: [
      { id: 'a', label: "It slows down because the child adds friction" },
      { id: 'b', label: "It speeds up because total moment of inertia decreases", correct: true },
      { id: 'c', label: "It stays the same because the child's mass doesn't change" },
      { id: 'd', label: "It stops because angular momentum transfers to the child" }
    ],
    explanation: "The system's total angular momentum is conserved. As the child moves inward, the system's total I decreases (mr^2 decreases as r decreases), so omega must increase."
  },
  {
    scenario: "NASA engineers design a satellite with three reaction wheels oriented along perpendicular axes. Each wheel can be spun up or down by electric motors.",
    question: "How do reaction wheels control the satellite's orientation without using fuel?",
    options: [
      { id: 'a', label: "By creating thrust from the spinning mass" },
      { id: 'b', label: "By using gyroscopic forces to push against space" },
      { id: 'c', label: "By trading angular momentum between wheels and spacecraft body", correct: true },
      { id: 'd', label: "By generating magnetic fields that interact with Earth's field" }
    ],
    explanation: "When a reaction wheel speeds up, the spacecraft body must rotate in the opposite direction to conserve total angular momentum. This allows precise pointing without expelling propellant."
  },
  {
    scenario: "A physics teacher places equal masses at different positions on a rotating rod: one mass close to the axis and one far from the axis.",
    question: "How does the position of mass affect its contribution to the total moment of inertia?",
    options: [
      { id: 'a', label: "Position doesn't matter, only total mass counts" },
      { id: 'b', label: "Contribution increases linearly with distance from axis" },
      { id: 'c', label: "Contribution increases with the square of distance from axis", correct: true },
      { id: 'd', label: "Mass closer to axis contributes more to I" }
    ],
    explanation: "For a point mass, I = mr^2. The contribution to moment of inertia depends on the square of the distance from the rotation axis, so mass far from the axis has a much larger effect."
  },
  {
    scenario: "A star collapses to form a neutron star, shrinking from a radius of 1 million km to about 10 km while conserving most of its angular momentum.",
    question: "If the original star rotated once per month, approximately how fast does the neutron star rotate?",
    options: [
      { id: 'a', label: "Once per day - slightly faster" },
      { id: 'b', label: "Once per hour - much faster" },
      { id: 'c', label: "Many times per second - extremely fast", correct: true },
      { id: 'd', label: "Once per year - slower due to mass loss" }
    ],
    explanation: "Since L = I*omega is conserved and I ~ MR^2, reducing R by a factor of 100,000 means omega increases by about 10 billion times! Neutron stars can spin hundreds of times per second."
  },
  {
    scenario: "A figure skater spinning with arms extended has rotational kinetic energy of 100 J. She pulls her arms in and her spin rate doubles.",
    question: "What is her new rotational kinetic energy?",
    options: [
      { id: 'a', label: "50 J - energy is lost when arms move in" },
      { id: 'b', label: "100 J - energy is conserved" },
      { id: 'c', label: "200 J - energy increases when arms pull in", correct: true },
      { id: 'd', label: "400 J - energy quadruples when omega doubles" }
    ],
    explanation: "KE = (1/2)I*omega^2. If omega doubles and L = I*omega is constant, then I must halve. So KE_new = (1/2)(I/2)(2*omega)^2 = (1/2)(I/2)(4*omega^2) = I*omega^2 = 2*KE_old. The skater does work by pulling her arms in."
  },
  {
    scenario: "A car manufacturer is choosing between steel and aluminum for a new wheel design. The aluminum wheel has 60% of the mass of the steel wheel with the same dimensions.",
    question: "How does the lighter wheel affect the car's acceleration performance?",
    options: [
      { id: 'a', label: "No significant effect - wheel mass is negligible" },
      { id: 'b', label: "Better acceleration - less rotational inertia to overcome", correct: true },
      { id: 'c', label: "Worse acceleration - lighter wheels have less traction" },
      { id: 'd', label: "Better top speed but worse acceleration" }
    ],
    explanation: "Engine torque must accelerate both the car's linear motion and the wheels' rotation. Lighter wheels with lower I require less torque to spin up, leaving more for linear acceleration. This is why racing cars use lightweight wheels."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '---',
    title: 'Figure Skating Spins',
    short: 'Angular momentum conservation on ice',
    tagline: 'Pulling arms in to spin faster',
    description: 'Figure skaters demonstrate moment of inertia beautifully. By pulling their arms close to their body, they reduce moment of inertia and spin dramatically faster - the same total angular momentum distributed in a smaller radius means higher angular velocity.',
    connection: 'The simulation showed how extending arms slows rotation while tucking them speeds it up. Skaters exploit L = I*omega conservation - reducing I forces omega to increase. The physics you explored is exactly what enables triple axels.',
    howItWorks: 'Skater starts spin with arms extended (large I, moderate omega). Arms pulled tight to body dramatically reduce I. Angular momentum L = I*omega conserved. Smaller I means larger omega. Can increase spin rate 3-4x.',
    stats: [
      { value: '6 rev/s', label: 'Top spin speed', icon: '---' },
      { value: '4x', label: 'Speed increase tucking', icon: '---' },
      { value: '$400M', label: 'Industry value', icon: '---' }
    ],
    examples: ['Sit spins', 'Camel spins', 'Jump landings', 'Ice dance'],
    companies: ['US Figure Skating', 'ISU', 'Jackson Ultima', 'Riedell'],
    futureImpact: 'Biomechanical sensors will optimize arm positioning for maximum spin speed while maintaining stability.',
    color: '#3B82F6'
  },
  {
    icon: '---',
    title: 'Automotive Flywheels',
    short: 'Energy storage in rotating mass',
    tagline: 'Smoothing engine pulses with inertia',
    description: 'Engine flywheels use high moment of inertia to store rotational energy and smooth power delivery. The same physics applies to regenerative braking systems that store energy in spinning flywheels for later acceleration.',
    connection: 'The simulation demonstrated how mass distribution affects rotational inertia. Flywheels concentrate mass at large radius to maximize I = mr^2, storing more kinetic energy (0.5*I*omega^2) for a given spin rate.',
    howItWorks: 'Heavy rim concentrates mass at large radius, maximizing I. Stores rotational kinetic energy E = 0.5*I*omega^2. Releases energy to smooth engine pulses between combustion strokes. Dual-mass flywheels isolate drivetrain vibrations.',
    stats: [
      { value: '25 kg', label: 'Typical mass', icon: '---' },
      { value: '60 kJ', label: 'Energy storage', icon: '---' },
      { value: '$5B', label: 'Market size', icon: '---' }
    ],
    examples: ['Engine flywheels', 'KERS systems', 'Flywheel batteries', 'Grid storage'],
    companies: ['LuK', 'Valeo', 'ZF', 'Beacon Power'],
    futureImpact: 'Carbon fiber flywheels spinning at 100,000 rpm will compete with batteries for grid-scale energy storage.',
    color: '#F59E0B'
  },
  {
    icon: '---',
    title: 'Satellite Attitude Control',
    short: 'Reaction wheels for spacecraft orientation',
    tagline: 'Spinning to point at stars',
    description: 'Satellites use reaction wheels - spinning masses whose angular momentum can be traded with the spacecraft body. Speeding up or slowing down wheels causes the satellite to rotate in the opposite direction, enabling precise pointing without fuel.',
    connection: 'The simulation showed angular momentum conservation when changing arm position. Reaction wheels use the same physics - changing wheel spin rate (I*omega) forces the spacecraft body to counter-rotate to conserve total L.',
    howItWorks: 'Multiple reaction wheels oriented along spacecraft axes. Electric motors speed up or slow down wheels. Change in wheel angular momentum must be balanced by spacecraft body. Result: precise attitude control. Desaturation uses thrusters.',
    stats: [
      { value: '0.001 deg', label: 'Pointing accuracy', icon: '---' },
      { value: '6000 rpm', label: 'Wheel speed', icon: '---' },
      { value: '$2B', label: 'Market size', icon: '---' }
    ],
    examples: ['Hubble Space Telescope', 'GPS satellites', 'Earth observation', 'Communication sats'],
    companies: ['Honeywell', 'Rockwell Collins', 'SSTL', 'Blue Canyon'],
    futureImpact: 'Control moment gyroscopes will enable rapid repointing for satellite constellations providing real-time Earth imaging.',
    color: '#8B5CF6'
  },
  {
    icon: '---',
    title: 'Motorcycle Dynamics',
    short: 'Gyroscopic stability from spinning wheels',
    tagline: 'Why bicycles stay upright',
    description: 'Motorcycle and bicycle stability relies heavily on the gyroscopic effects of spinning wheels. The angular momentum of the wheels resists changes in orientation, and the moment of inertia distribution affects handling characteristics.',
    connection: 'The simulation showed how moment of inertia affects rotational response. Motorcycle wheels have significant angular momentum (I*omega), and this gyroscopic effect makes the bike resist tipping - harder to change L means harder to fall over.',
    howItWorks: 'Front wheel angular momentum creates gyroscopic stability. Steering input precesses wheel, causing lean. Heavier wheels (higher I) increase stability but reduce agility. Racing bikes optimize wheel I for quick direction changes.',
    stats: [
      { value: '100 rad/s', label: 'Highway wheel speed', icon: '---' },
      { value: '10 kg m^2', label: 'Typical wheel I', icon: '---' },
      { value: '$100B', label: 'Industry size', icon: '---' }
    ],
    examples: ['Sportbike handling', 'Touring stability', 'Trials balance', 'Electric motorcycles'],
    companies: ['Honda', 'BMW', 'Ducati', 'Harley-Davidson'],
    futureImpact: 'Active gyroscopic stabilization will enable self-balancing motorcycles that cannot tip over at stops.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const MomentOfInertiaRenderer: React.FC<MomentOfInertiaRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state for play phase
  const [armExtension, setArmExtension] = useState(0.7); // 0 = tucked, 1 = extended
  const [initialL, setInitialL] = useState(15); // angular momentum (conserved)
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);

  // Twist phase state - comparing shapes
  const [selectedShape, setSelectedShape] = useState<'disk' | 'ring' | 'sphere' | 'hollow'>('disk');
  const [rampAngle, setRampAngle] = useState(30);
  const [raceTime, setRaceTime] = useState(0);
  const [isRacing, setIsRacing] = useState(false);

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

  // Skater spinning animation
  useEffect(() => {
    if (!isSpinning) return;
    const momentOfInertia = 1 + 2 * armExtension; // I scales from 1 (tucked) to 3 (extended)
    const omega = initialL / momentOfInertia; // omega = L/I

    const interval = setInterval(() => {
      setRotation(prev => (prev + omega * 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isSpinning, armExtension, initialL]);

  // Race animation for twist phase
  useEffect(() => {
    if (!isRacing) return;
    const interval = setInterval(() => {
      setRaceTime(prev => {
        if (prev >= 100) {
          setIsRacing(false);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isRacing]);

  // Calculate current omega based on arm position
  const currentOmega = initialL / (1 + 2 * armExtension);
  const currentI = 1 + 2 * armExtension;

  // Shape moment of inertia factors (I = factor * MR^2)
  const shapeFactors: Record<string, { factor: number; name: string; color: string }> = {
    disk: { factor: 0.5, name: 'Solid Disk', color: '#EC4899' },
    ring: { factor: 1.0, name: 'Ring/Hoop', color: '#06B6D4' },
    sphere: { factor: 0.4, name: 'Solid Sphere', color: '#10B981' },
    hollow: { factor: 0.67, name: 'Hollow Sphere', color: '#F59E0B' }
  };

  // Calculate race position based on shape (lower I factor = faster)
  const getRacePosition = (shape: string, time: number) => {
    const factor = shapeFactors[shape].factor;
    // Position proportional to 1/(1 + factor) - shapes with lower I roll faster
    const speed = 1 / (1 + factor);
    return Math.min(time * speed, 100);
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EC4899', // Pink for rotation/skating theme
    accentGlow: 'rgba(236, 72, 153, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
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
    twist_play: 'Shape Race',
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
        gameType: 'moment-of-inertia',
        gameTitle: 'Moment of Inertia',
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

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #BE185D)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Skater SVG Component
  const SkaterVisualization = ({ size = 200 }: { size?: number }) => {
    const centerX = size / 2;
    const centerY = size / 2 + 20;
    const armLength = 25 + armExtension * 40;
    const armAngle = 70 - armExtension * 60;
    const intensity = Math.min(1, currentOmega / 10);

    return (
      <svg width={size} height={size + 40} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="skinGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fde4d4" />
            <stop offset="100%" stopColor="#e0b090" />
          </radialGradient>
          <linearGradient id="dressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#9d174d" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ice surface */}
        <ellipse cx={centerX} cy={size + 20} rx={80} ry={15} fill="url(#iceGrad)" />

        {/* Rotation trail */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          <ellipse
            cx="0" cy="60"
            rx="50" ry="12"
            fill="none"
            stroke={colors.accent}
            strokeWidth={2 + intensity * 2}
            strokeDasharray={isSpinning ? `${12 - intensity * 8} ${4 + intensity * 4}` : "8 4"}
            filter="url(#glowFilter)"
            opacity={0.6}
          />
        </g>

        {/* Skater body */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${rotation * 0.5})`}>
          {/* Head */}
          <circle cx="0" cy="-55" r="15" fill="url(#skinGrad)" stroke="#d4a574" strokeWidth="1.5" />
          <ellipse cx="-5" cy="-58" rx="2" ry="2" fill="#2d3748" />
          <ellipse cx="5" cy="-58" rx="2" ry="2" fill="#2d3748" />

          {/* Hair */}
          <path d="M-12,-62 Q-15,-75 0,-72 Q15,-75 12,-62" fill="#8B4513" />

          {/* Torso */}
          <path d="M-15,-40 L-12,-10 L12,-10 L15,-40 Z" fill="url(#dressGrad)" />

          {/* Skirt */}
          <path d="M-15,-10 Q-25,10 -30,40 L30,40 Q25,10 15,-10 Z" fill="url(#dressGrad)" />

          {/* Arms */}
          <g transform={`rotate(${-armAngle})`}>
            <rect x="-50" y="-5" width={armLength} height="8" rx="4" fill="url(#skinGrad)" />
            <circle cx={-armLength + 5} cy="0" r="6" fill="url(#skinGrad)" />
          </g>
          <g transform={`rotate(${armAngle})`}>
            <rect x={50 - armLength} y="-5" width={armLength} height="8" rx="4" fill="url(#skinGrad)" />
            <circle cx={armLength - 5} cy="0" r="6" fill="url(#skinGrad)" />
          </g>

          {/* Legs */}
          <rect x="-8" y="35" width="6" height="35" rx="2" fill="url(#skinGrad)" />
          <rect x="2" y="35" width="6" height="35" rx="2" fill="url(#skinGrad)" />

          {/* Skates */}
          <rect x="-12" y="68" width="14" height="6" rx="2" fill="#e8e8e8" />
          <rect x="-2" y="68" width="14" height="6" rx="2" fill="#e8e8e8" />
          <rect x="-12" y="73" width="16" height="2" rx="1" fill="#a0a0a0" />
          <rect x="-2" y="73" width="16" height="2" rx="1" fill="#a0a0a0" />
        </g>
      </svg>
    );
  };

  // Shape comparison visualization for twist phase
  const ShapeRaceVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="rampGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#1F2937" />
          </linearGradient>
        </defs>

        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Rolling Race: Different Shapes
        </text>

        {/* Ramp */}
        <polygon
          points={`40,${height - 40} ${width - 40},${height - 40} ${width - 40},${height - 120}`}
          fill="url(#rampGrad)"
          stroke={colors.border}
          strokeWidth="2"
        />

        {/* Start line */}
        <line x1="60" y1={height - 125} x2="60" y2={height - 140} stroke={colors.success} strokeWidth="3" />
        <text x="60" y={height - 145} textAnchor="middle" fill={colors.success} fontSize="10">START</text>

        {/* Finish line */}
        <line x1={width - 60} y1={height - 45} x2={width - 60} y2={height - 60} stroke={colors.error} strokeWidth="3" />
        <text x={width - 60} y={height - 65} textAnchor="middle" fill={colors.error} fontSize="10">FINISH</text>

        {/* Racing shapes */}
        {Object.entries(shapeFactors).map(([key, shape], index) => {
          const position = getRacePosition(key, raceTime);
          const startX = 60;
          const endX = width - 80;
          const x = startX + (endX - startX) * (position / 100);
          const startY = height - 130;
          const endY = height - 55;
          const y = startY + (endY - startY) * (position / 100);
          const radius = 12;
          const offset = index * 5 - 7.5;

          return (
            <g key={key}>
              {key === 'disk' && (
                <circle cx={x} cy={y + offset} r={radius} fill={shape.color} />
              )}
              {key === 'ring' && (
                <circle cx={x} cy={y + offset} r={radius} fill="none" stroke={shape.color} strokeWidth="4" />
              )}
              {key === 'sphere' && (
                <circle cx={x} cy={y + offset} r={radius} fill={shape.color} opacity="0.8" />
              )}
              {key === 'hollow' && (
                <>
                  <circle cx={x} cy={y + offset} r={radius} fill={shape.color} />
                  <circle cx={x} cy={y + offset} r={radius - 4} fill={colors.bgCard} />
                </>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(20, ${height - 30})`}>
          {Object.entries(shapeFactors).map(([key, shape], index) => (
            <g key={key} transform={`translate(${index * (isMobile ? 80 : 110)}, 0)`}>
              <circle cx="8" cy="0" r="6" fill={shape.color} opacity={key === 'ring' ? 0 : 1} stroke={shape.color} strokeWidth="2" />
              <text x="20" y="4" fill={colors.textSecondary} fontSize="10">{shape.name}</text>
            </g>
          ))}
        </g>
      </svg>
    );
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
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'spin 3s linear infinite',
        }}>
          ---
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Moment of Inertia
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do figure skaters spin faster when they pull in their arms? The answer lies in how <span style={{ color: colors.accent }}>mass distribution</span> affects rotation."
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
            "Moment of inertia is to rotation what mass is to linear motion. It determines how hard it is to change an object's rotational state - but unlike mass, it depends on where the mass is located."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Rotational Mechanics Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Rotation
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Her spin slows down because she is doing work against friction' },
      { id: 'b', text: 'Her spin speeds up because moment of inertia decreases', correct: true },
      { id: 'c', text: 'Her spin stays exactly the same because angular momentum is conserved' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            A figure skater is spinning with arms extended. She then pulls her arms in close to her body. What happens?
          </h2>

          {/* Visual diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>---</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Arms Extended</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.accent }}>--&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>---</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Arms Tucked</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>= ???</div>
            </div>
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

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Skater Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Skater Spin Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Move the slider to change arm position and observe the spin speed change
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <SkaterVisualization size={isMobile ? 180 : 220} />
            </div>

            {/* Arm position slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Arm Position</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                  {armExtension < 0.3 ? 'Tucked In' : armExtension > 0.7 ? 'Extended Out' : 'Partial'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={armExtension}
                onChange={(e) => setArmExtension(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  accentColor: colors.accent,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Tucked (Low I)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Extended (High I)</span>
              </div>
            </div>

            {/* Angular momentum slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Initial Angular Momentum (L)</span>
                <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{initialL}</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={initialL}
                onChange={(e) => setInitialL(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  accentColor: colors.success,
                }}
              />
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                L stays constant (conserved) - change arm position to see omega change!
              </p>
            </div>

            {/* Play/Pause button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => setIsSpinning(!isSpinning)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSpinning ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSpinning ? 'Pause Spin' : 'Resume Spin'}
              </button>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{currentI.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Moment of Inertia (I)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: '#06B6D4' }}>{currentOmega.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Angular Velocity (omega)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{initialL}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>L = I * omega (constant!)</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {armExtension < 0.3 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how tucking in arms increases spin speed! L = I * omega stays constant.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Rotation
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Moment of Inertia: I = sum(m * r^2)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Moment of inertia depends on both <span style={{ color: colors.accent }}>mass</span> and <span style={{ color: colors.accent }}>distance from the rotation axis</span>. Mass far from the axis contributes much more to I because r is squared!
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Angular Momentum: L = I * omega</strong>
              </p>
              <p>
                When no external torque acts, L is conserved. If I decreases, omega must increase to keep L constant!
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
              The Skater's Secret
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              When a skater pulls arms in:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Mass moves closer to the rotation axis</li>
              <li>Moment of inertia (I) decreases dramatically</li>
              <li>Since L = I * omega is constant, omega increases</li>
              <li>The skater spins 3-4x faster!</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Energy Considerations
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Rotational KE = (1/2) * I * omega^2. When I decreases and omega increases, the kinetic energy actually increases! Where does this energy come from? The skater does work by pulling their arms inward against the centrifugal effect.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore a New Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The ring (hoop) reaches the bottom first - all mass at the edge' },
      { id: 'b', text: 'The solid disk reaches the bottom first - mass distributed throughout', correct: true },
      { id: 'c', text: 'They reach the bottom at exactly the same time - same mass and radius' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Scenario: Rolling Objects
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A solid disk and a ring (hoop) have the same mass and radius. They roll down a ramp from rest. Which reaches the bottom first?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '16px' }}>
              <div>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="25" fill="#EC4899" />
                </svg>
                <p style={{ ...typo.small, color: colors.accent }}>Solid Disk</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>I = (1/2)MR^2</p>
              </div>
              <div>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="25" fill="none" stroke="#06B6D4" strokeWidth="6" />
                </svg>
                <p style={{ ...typo.small, color: '#06B6D4' }}>Ring/Hoop</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>I = MR^2</p>
              </div>
            </div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Same mass M, same radius R - but different mass distributions
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
              See the Race!
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Shape Rolling Race
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch which shape wins - lower moment of inertia means faster rolling!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ShapeRaceVisualization />
            </div>

            {/* Race control */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setRaceTime(0);
                  setIsRacing(true);
                  playSound('click');
                }}
                disabled={isRacing}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isRacing ? colors.border : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: isRacing ? 'not-allowed' : 'pointer',
                }}
              >
                {isRacing ? 'Racing...' : 'Start Race!'}
              </button>
              <button
                onClick={() => {
                  setRaceTime(0);
                  setIsRacing(false);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>

            {/* Shape I values comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}>
              {Object.entries(shapeFactors).map(([key, shape]) => (
                <div key={key} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  border: `2px solid ${selectedShape === key ? shape.color : 'transparent'}`,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedShape(key as typeof selectedShape)}
                >
                  <div style={{ ...typo.h3, color: shape.color }}>{shape.factor}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{shape.name}</div>
                  <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>
                    I = {shape.factor}MR^2
                  </div>
                </div>
              ))}
            </div>
          </div>

          {raceTime >= 100 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Solid sphere wins! Lower I (0.4MR^2) means more energy goes to translation, less to rotation.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Results
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Mass Distribution Matters for Rolling
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>---</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Energy Split</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When an object rolls down a ramp, gravitational PE converts to both <span style={{ color: colors.accent }}>translational KE</span> (forward motion) and <span style={{ color: '#06B6D4' }}>rotational KE</span> (spinning). Objects with higher I put more energy into rotation.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>---</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Math</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                For rolling without slipping: v = omega * R. Total KE = (1/2)mv^2 + (1/2)I*omega^2. Objects with lower I (relative to MR^2) have more energy in the (1/2)mv^2 term, so they move faster!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>---</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Ranking by Speed</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                From fastest to slowest: <span style={{ color: colors.success }}>Solid sphere (0.4)</span> &gt; <span style={{ color: colors.accent }}>Solid disk (0.5)</span> &gt; <span style={{ color: colors.warning }}>Hollow sphere (0.67)</span> &gt; <span style={{ color: '#06B6D4' }}>Ring (1.0)</span>
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>---</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Key Insight</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The race outcome doesn't depend on mass or radius - only on how mass is distributed! A tiny marble and a huge bowling ball of the same shape will tie.
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

        {renderNavDots()}
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                    +++
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
                How Moment of Inertia Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
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

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
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
              {passed ? '---' : '---'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand moment of inertia and rotational dynamics!'
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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

        {renderNavDots()}
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
          ---
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Rotational Dynamics Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how mass distribution affects rotational motion - from figure skating spins to rolling objects!
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Moment of inertia: I = sum(m*r^2)',
              'Conservation of angular momentum: L = I*omega',
              'Why skaters spin faster with arms tucked',
              'Why solid spheres roll faster than hoops',
              'Real-world applications in engineering',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>+++</span>
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

export default MomentOfInertiaRenderer;
