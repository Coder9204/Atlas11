'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TORQUE - Premium 10-Phase Educational Game
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

const realWorldApps = [
  {
    icon: '🔧',
    title: 'Torque Wrenches',
    short: 'Precision tightening for critical fasteners',
    tagline: 'When too tight or too loose means failure',
    description: 'Torque wrenches ensure bolts are tightened to exact specifications. Under-torqued bolts loosen and fail; over-torqued bolts strip threads or break. Critical in automotive, aerospace, and construction.',
    connection: 'The wrench handle is the lever arm, and the force you apply creates torque. Click-type wrenches release when target torque is reached.',
    howItWorks: 'A calibrated spring or electronic sensor measures torque. The longer the handle, the less force needed for the same torque. Digital wrenches display real-time readings.',
    stats: [
      { value: '±4%', label: 'Wrench accuracy', icon: '🎯' },
      { value: '500Nm', label: 'Lug nut torque', icon: '🔩' },
      { value: '1%', label: 'Aerospace tolerance', icon: '✈️' }
    ],
    examples: ['Wheel lug nuts', 'Engine head bolts', 'Aircraft fasteners', 'Bridge bolts'],
    companies: ['Snap-on', 'Proto', 'CDI', 'Norbar'],
    futureImpact: 'Smart bolts with embedded sensors will confirm proper torque and detect loosening over time.',
    color: '#3B82F6'
  },
  {
    icon: '🚴',
    title: 'Bicycle Gear Systems',
    short: 'Multiplying force through the drivetrain',
    tagline: 'Turning leg power into speed',
    description: 'Bicycle gears trade pedaling speed for force multiplication. Small chainrings increase torque for climbing; large ones increase speed for flats. The crankset is a lever arm for your legs.',
    connection: 'Pedal force times crank length equals input torque. Gear ratios multiply or divide this torque before it reaches the wheel.',
    howItWorks: 'Torque = force x crank length. A 170mm crank with 100N force produces 17Nm. A 1:2 gear ratio doubles the torque at the wheel but halves the rotation speed.',
    stats: [
      { value: '165-175mm', label: 'Typical crank length', icon: '📏' },
      { value: '1:4', label: 'Climbing gear ratio', icon: '⛰️' },
      { value: '4:1', label: 'Sprint gear ratio', icon: '🏎️' }
    ],
    examples: ['Road bikes', 'Mountain bikes', 'E-bikes', 'Track cycling'],
    companies: ['Shimano', 'SRAM', 'Campagnolo', 'FSA'],
    futureImpact: 'Electronic shifting with AI will automatically optimize gear ratios based on terrain and rider fatigue.',
    color: '#10B981'
  },
  {
    icon: '🏗️',
    title: 'Crane Moment Ratings',
    short: 'Understanding lifting capacity limits',
    tagline: 'Load times distance equals danger',
    description: 'Crane capacity drops dramatically with boom length and angle. A 100-ton crane might only lift 10 tons at full extension. Operators must constantly calculate moments to prevent tipping.',
    connection: 'The load creates a tipping moment about the crane base. This moment (force x distance) must never exceed the counterweight moment.',
    howItWorks: 'Load charts show maximum weight at each radius. Moment limiters cut power if limits approach. Counterweights balance the load moment. Longer boom = smaller capacity.',
    stats: [
      { value: '10x', label: 'Capacity reduction at full reach', icon: '📉' },
      { value: '85%', label: 'Crane accidents from overload', icon: '⚠️' },
      { value: '1000t', label: 'Max mobile crane capacity', icon: '🏗️' }
    ],
    examples: ['Tower cranes', 'Mobile cranes', 'Overhead cranes', 'Container cranes'],
    companies: ['Liebherr', 'Manitowoc', 'Tadano', 'Terex'],
    futureImpact: 'Real-time structural monitoring will enable cranes to safely exceed traditional limits.',
    color: '#F59E0B'
  },
  {
    icon: '⚙️',
    title: 'Electric Motor Torque',
    short: 'Instant power from electromagnetic forces',
    tagline: 'Maximum torque from zero RPM',
    description: 'Electric motors produce maximum torque at zero speed, unlike combustion engines. This enables incredible acceleration in EVs and precise control in robotics.',
    connection: 'Motor torque comes from the force between magnetic fields times the rotor radius. Current controls the magnetic field strength, so torque is directly controllable.',
    howItWorks: 'Electromagnetic force on conductors in a magnetic field creates rotation. Torque = force x radius. Controllers modulate current to achieve precise torque at any speed.',
    stats: [
      { value: '1000Nm', label: 'Tesla Plaid motor torque', icon: '⚡' },
      { value: '0rpm', label: 'Max torque speed', icon: '🎯' },
      { value: '1ms', label: 'Torque response time', icon: '⏱️' }
    ],
    examples: ['Electric vehicles', 'Industrial robots', 'CNC machines', 'Elevators'],
    companies: ['Tesla', 'ABB', 'Siemens', 'Fanuc'],
    futureImpact: 'In-wheel motors will provide independent torque control to each wheel for unprecedented handling.',
    color: '#8B5CF6'
  }
];

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

interface TorqueRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TorqueRenderer: React.FC<TorqueRendererProps> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>('hook');

  // Sync phase with external prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [pushPosition, setPushPosition] = useState(0.8);
  const [hasFriction, setHasFriction] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [doorAngle, setDoorAngle] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [showForceVector, setShowForceVector] = useState(true);

  // Transfer state with sequential navigation
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const animationRef = useRef<number>();

  // Physics calculations
  const requiredTorque = hasFriction ? 30 : 15;
  const leverArm = Math.max(0.1, pushPosition);
  const requiredForce = requiredTorque / leverArm;

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

  // Cleanup animation
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Web Audio API sound with typed categories
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Return to dashboard handler
  const handleReturnToDashboard = useCallback(() => {
    emitEvent('mastery_achieved', { action: 'return_to_dashboard' });
    window.dispatchEvent(new CustomEvent('returnToDashboard'));
  }, [emitEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    const phaseIndex = phaseOrder.indexOf(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(phaseIndex);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Door physics
  const pushDoor = useCallback(() => {
    if (isPushing) return;
    setIsPushing(true);
    setDoorAngle(0);
    playSound('click');

    emitEvent('simulation_started', { pushPosition, requiredForce, hasFriction });

    const targetAngle = 60;
    const speed = 150 / requiredForce;
    let angle = 0;

    const animate = () => {
      angle += speed;
      setDoorAngle(Math.min(angle, targetAngle));

      if (angle < targetAngle) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPushing(false);
        setExperimentCount(prev => prev + 1);
        playSound('success');
        emitEvent('simulation_started', { finalAngle: targetAngle, pushPosition, force: requiredForce });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isPushing, pushPosition, requiredForce, hasFriction, emitEvent, playSound]);

  const resetDoor = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPushing(false);
    setDoorAngle(0);
    emitEvent('parameter_changed', { action: 'reset' });
  }, [emitEvent]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = testQuestions[currentQuestion].options[answerIndex]?.correct;
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      playSound('success');
    } else {
      playSound('failure');
    }
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emitEvent('test_answered', { question: currentQuestion, answer: answerIndex, correct: isCorrect });
  }, [currentQuestion, answeredQuestions, emitEvent, playSound]);

  // Test questions - 10 questions with correct: true markers
  const testQuestions = [
    { question: "Why is it easier to open a door by pushing at the handle (far from hinge)?", options: [
      { text: "The handle is smoother", correct: false },
      { text: "Larger lever arm = less force needed", correct: true },
      { text: "The door is lighter there", correct: false },
      { text: "It's not actually easier", correct: false }
    ], explanation: "Torque = Force x Lever arm. With a larger lever arm (distance from hinge), you need less force to create the same torque." },
    { question: "What is the correct formula for torque?", options: [
      { text: "t = F + r", correct: false },
      { text: "t = F x r", correct: true },
      { text: "t = F / r", correct: false },
      { text: "t = F - r", correct: false }
    ], explanation: "Torque (t) equals force (F) times the perpendicular distance (r) from the pivot point: t = F x r" },
    { question: "If you push a door at half the distance from the hinge, you need:", options: [
      { text: "Half the force", correct: false },
      { text: "The same force", correct: false },
      { text: "Twice the force", correct: true },
      { text: "Four times the force", correct: false }
    ], explanation: "Since t = F x r, halving r means you need to double F to maintain the same torque." },
    { question: "Door handles are placed far from hinges because:", options: [
      { text: "It looks better aesthetically", correct: false },
      { text: "Maximizes lever arm, minimizing force needed", correct: true },
      { text: "It's where the door is strongest", correct: false },
      { text: "There's no particular reason", correct: false }
    ], explanation: "Engineers place handles far from hinges to maximize the lever arm, making doors easy to open with minimal force." },
    { question: "A sticky hinge increases the force needed because:", options: [
      { text: "It adds friction resistance to overcome", correct: true },
      { text: "It makes the door heavier", correct: false },
      { text: "It changes the lever arm length", correct: false },
      { text: "It doesn't affect the force needed", correct: false }
    ], explanation: "Friction at the hinge creates a resisting torque that must be overcome in addition to the torque needed to accelerate the door." },
    { question: "A wrench with a longer handle:", options: [
      { text: "Is always heavier to use", correct: false },
      { text: "Provides more torque for the same force", correct: true },
      { text: "Provides less torque overall", correct: false },
      { text: "Doesn't affect the torque", correct: false }
    ], explanation: "A longer wrench handle increases the lever arm, so the same force produces more torque." },
    { question: "To balance a seesaw with unequal weights:", options: [
      { text: "Put the heavier weight in the middle", correct: false },
      { text: "Put the heavier weight closer to pivot", correct: true },
      { text: "Put the lighter weight closer to pivot", correct: false },
      { text: "It cannot be balanced", correct: false }
    ], explanation: "For balance, torques must be equal: W1 x r1 = W2 x r2. The heavier weight needs a shorter lever arm." },
    { question: "Why do doorstops work best when placed far from the hinge?", options: [
      { text: "They're easier to see there", correct: false },
      { text: "Maximum leverage prevents door motion", correct: true },
      { text: "The door is thinner there", correct: false },
      { text: "Position doesn't matter", correct: false }
    ], explanation: "Placing a doorstop far from the hinge maximizes the resisting moment arm, making it harder to push the door open." },
    { question: "A torque wrench is designed to measure:", options: [
      { text: "The weight of the wrench", correct: false },
      { text: "Rotational force being applied", correct: true },
      { text: "The length of the wrench", correct: false },
      { text: "The turning speed", correct: false }
    ], explanation: "A torque wrench measures the rotational force (torque) being applied to a fastener, ensuring proper tightening." },
    { question: "If torque = 20 N-m and lever arm = 0.5 m, what force is applied?", options: [
      { text: "10 N", correct: false },
      { text: "40 N", correct: true },
      { text: "20 N", correct: false },
      { text: "0.025 N", correct: false }
    ], explanation: "Using t = F x r: 20 = F x 0.5, solving for F gives F = 40 N." }
  ];

  // Real-world applications - 4 applications
  const applications = [
    {
      id: 'wrench',
      title: "Wrenches",
      description: "Longer wrenches provide more torque with less effort. Mechanics use breaker bars for stubborn bolts - maximum leverage from extended handles!",
      formula: "t = F x r",
      insight: "2x handle length = 2x torque",
    },
    {
      id: 'seesaw',
      title: "Seesaws",
      description: "Torque balance determines equilibrium. A heavier child sits closer to the pivot to balance a lighter child sitting farther away.",
      formula: "m1r1 = m2r2",
      insight: "Balance point shifts with mass",
    },
    {
      id: 'steering',
      title: "Steering Wheels",
      description: "Large steering wheels require less force to turn. Power steering reduces the torque needed at your hands, making driving effortless.",
      formula: "F = t / r",
      insight: "Larger radius = less effort",
    },
    {
      id: 'engine',
      title: "Engines",
      description: "Engine torque determines pulling power. Diesel engines produce high torque at low RPM, making them ideal for heavy vehicles and towing.",
      formula: "Power = t x omega",
      insight: "Torque = rotational strength",
    }
  ];

  // ============================================================================
  // VISUALIZATION - Premium Door Animation
  // ============================================================================
  const renderVisualization = () => {
    const svgWidth = Math.min(360, isMobile ? 320 : 360);
    const hingeX = 60;
    const hingeY = 120;
    const doorLength = svgWidth - 120;
    const doorWidth = 20;
    const pushX = pushPosition * doorLength;

    return (
      <div>
        <svg width="100%" height={240} viewBox={`0 0 ${svgWidth} 240`} className="block mx-auto">
          <defs>
            {/* === PREMIUM GRADIENTS === */}

            {/* Metal beam/lever gradient - brushed steel look */}
            <linearGradient id="torqMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="75%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Door wood grain - premium brown */}
            <linearGradient id="torqDoorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4a574" />
              <stop offset="30%" stopColor="#c4956a" />
              <stop offset="50%" stopColor="#e0b88a" />
              <stop offset="70%" stopColor="#b8845a" />
              <stop offset="100%" stopColor="#8b5a2b" />
            </linearGradient>

            {/* 3D Pivot radial gradient */}
            <radialGradient id="torqPivotGrad" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#a1a1aa" />
              <stop offset="40%" stopColor="#71717a" />
              <stop offset="70%" stopColor="#52525b" />
              <stop offset="100%" stopColor="#3f3f46" />
            </radialGradient>

            {/* Friction pivot - rusty orange */}
            <radialGradient id="torqFrictionPivotGrad" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="40%" stopColor="#ea580c" />
              <stop offset="70%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>

            {/* Force arrow gradient - glowing green */}
            <linearGradient id="torqForceGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>

            {/* Torque arc gradient - purple glow */}
            <linearGradient id="torqTorqueArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* Lever arm gradient - blue */}
            <linearGradient id="torqLeverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Handle metallic gradient */}
            <radialGradient id="torqHandleGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* Wall gradient - 3D depth */}
            <linearGradient id="torqWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="80%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#52525b" />
            </linearGradient>

            {/* === GLOW FILTERS === */}

            {/* Force arrow glow */}
            <filter id="torqForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pivot glow (for highlighting) */}
            <filter id="torqPivotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#a855f7" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Torque arc glow */}
            <filter id="torqArcGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#a855f7" floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Door shadow */}
            <filter id="torqDoorShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>

            {/* Pivot shadow */}
            <filter id="torqPivotShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
            </filter>

            {/* Background grid pattern */}
            <pattern id="torqGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#3a2850" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={svgWidth} height={240} fill="#08050c" />
          <rect width={svgWidth} height={240} fill="url(#torqGrid)" />

          {/* Wall with 3D depth */}
          <rect x={0} y={hingeY - 80} width={50} height={160} fill="url(#torqWallGrad)" />
          <rect x={48} y={hingeY - 80} width={4} height={160} fill="#52525b" />
          <line x1={50} y1={hingeY - 80} x2={50} y2={hingeY + 80} stroke="#71717a" strokeWidth={1} />

          {/* Pivot shadow on floor */}
          <ellipse cx={hingeX + 5} cy={hingeY + 25} rx={18} ry={6} fill="#000" opacity={0.4} />

          {/* Door with rotation */}
          <g transform={`translate(${hingeX}, ${hingeY}) rotate(${doorAngle})`} filter="url(#torqDoorShadow)">
            {/* Door body with premium gradient */}
            <rect x={0} y={-doorWidth / 2} width={doorLength} height={doorWidth} rx={3} fill="url(#torqDoorGrad)" />

            {/* Wood grain lines for realism */}
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((pos, i) => (
              <line key={i} x1={doorLength * pos} y1={-doorWidth / 2 + 2} x2={doorLength * pos} y2={doorWidth / 2 - 2}
                    stroke="#8b5a2b" strokeWidth={0.5} opacity={0.25} />
            ))}

            {/* Door edge highlight */}
            <line x1={2} y1={-doorWidth / 2 + 2} x2={2} y2={doorWidth / 2 - 2} stroke="#e0b88a" strokeWidth={1} opacity={0.5} />
            <line x1={doorLength - 2} y1={-doorWidth / 2 + 2} x2={doorLength - 2} y2={doorWidth / 2 - 2} stroke="#8b5a2b" strokeWidth={1} opacity={0.5} />

            {/* Premium door handle with metallic gradient */}
            <circle cx={doorLength - 30} cy={0} r={10} fill="url(#torqHandleGrad)" stroke="#92400e" strokeWidth={2} />
            <circle cx={doorLength - 30} cy={0} r={4} fill="#78350f" />
            <circle cx={doorLength - 33} cy={-3} r={2} fill="#fcd34d" opacity={0.6} />

            {/* Lever arm visualization */}
            {showForceVector && (
              <g>
                <line x1={0} y1={32} x2={pushX} y2={32}
                      stroke="url(#torqLeverGrad)" strokeWidth={3} strokeDasharray="6,3" />
                <circle cx={0} cy={32} r={5} fill="#3b82f6" stroke="#60a5fa" strokeWidth={1} />
                <circle cx={pushX} cy={32} r={5} fill="#3b82f6" stroke="#60a5fa" strokeWidth={1} />
              </g>
            )}

            {/* Push point indicator with glow */}
            <circle cx={pushX} cy={0} r={12} fill="#22c55e" stroke="#86efac" strokeWidth={2} filter="url(#torqForceGlow)">
              <animate attributeName="r" values="10;13;10" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={pushX} cy={0} r={4} fill="#fff" opacity={0.8} />

            {/* Force arrow with gradient and glow */}
            {showForceVector && (
              <g transform={`translate(${pushX}, 0)`} filter="url(#torqForceGlow)">
                <line x1={0} y1={-18} x2={0} y2={-18 - requiredForce * 1.2}
                      stroke="url(#torqForceGrad)" strokeWidth={4} strokeLinecap="round" />
                <polygon points={`0,${-18 - requiredForce * 1.2 - 10} -6,${-18 - requiredForce * 1.2} 6,${-18 - requiredForce * 1.2}`}
                         fill="#86efac" />
              </g>
            )}

            {/* Torque arc indicator (shows rotation direction) */}
            {showForceVector && doorAngle > 5 && (
              <g filter="url(#torqArcGlow)">
                <path
                  d={`M 30 0 A 30 30 0 0 0 ${30 * Math.cos(-Math.PI / 6)} ${30 * Math.sin(-Math.PI / 6)}`}
                  stroke="url(#torqTorqueArcGrad)"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon
                  points={`${30 * Math.cos(-Math.PI / 6) - 4},${30 * Math.sin(-Math.PI / 6)} ${30 * Math.cos(-Math.PI / 6) + 3},${30 * Math.sin(-Math.PI / 6) - 6} ${30 * Math.cos(-Math.PI / 6) + 6},${30 * Math.sin(-Math.PI / 6) + 4}`}
                  fill="#c084fc"
                />
              </g>
            )}
          </g>

          {/* 3D Pivot/Hinge with shadow and gradient */}
          <g transform={`translate(${hingeX}, ${hingeY})`} filter="url(#torqPivotShadow)">
            {/* Outer ring */}
            <circle r={16} fill={hasFriction ? 'url(#torqFrictionPivotGrad)' : 'url(#torqPivotGrad)'} stroke="#52525b" strokeWidth={2} />
            {/* Inner detail rings */}
            <circle r={10} fill="none" stroke={hasFriction ? '#7c2d12' : '#3f3f46'} strokeWidth={1} opacity={0.5} />
            {/* Center bolt */}
            <circle r={5} fill={hasFriction ? '#ea580c' : '#71717a'} />
            {/* Highlight */}
            <circle cx={-4} cy={-4} r={3} fill={hasFriction ? '#fdba74' : '#a1a1aa'} opacity={0.6} />
          </g>

          {/* Force meter panel */}
          <g transform={`translate(${svgWidth - 95}, 165)`}>
            <rect x={0} y={0} width={85} height={60} rx={10} fill="#181220"
                  stroke="#3a2850" strokeWidth={1.5} />
            <rect x={2} y={2} width={81} height={12} rx={6} fill="#1e1030" opacity={0.5} />
          </g>

          {/* Torque display panel */}
          <g transform="translate(10, 165)">
            <rect x={0} y={0} width={100} height={60} rx={10} fill="#181220"
                  stroke="#3a2850" strokeWidth={1.5} />
            <rect x={2} y={2} width={96} height={12} rx={6} fill="#1e1030" opacity={0.5} />
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${typo.elementGap} ${typo.cardPadding}`, marginTop: '-60px' }}>
          <div style={{
            background: '#181220',
            borderRadius: '10px',
            padding: '8px 12px',
            border: '1px solid #3a2850',
            minWidth: '100px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: typo.label, color: '#7a6890', marginBottom: '4px' }}>Torque (t = F x r)</div>
            <div style={{ fontSize: typo.heading, fontWeight: 700, color: '#a855f7' }}>{requiredTorque} N-m</div>
          </div>

          <div style={{
            background: '#181220',
            borderRadius: '10px',
            padding: '8px 12px',
            border: '1px solid #3a2850',
            minWidth: '85px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: typo.label, color: '#7a6890', marginBottom: '4px' }}>Required Force</div>
            <div style={{ fontSize: typo.heading, fontWeight: 700, color: requiredForce > 100 ? '#ef4444' : '#22c55e' }}>
              {requiredForce.toFixed(1)}N
            </div>
          </div>
        </div>

        {/* Lever arm label */}
        {showForceVector && (
          <div style={{ textAlign: 'center', marginTop: typo.elementGap }}>
            <span style={{
              fontSize: typo.small,
              color: '#3b82f6',
              fontWeight: 600,
              background: '#1e3a5f',
              padding: '4px 12px',
              borderRadius: '12px'
            }}>
              Lever arm r = {(pushPosition * 100).toFixed(0)}% of door length
            </span>
          </div>
        )}

        {/* Friction indicator */}
        {hasFriction && (
          <div style={{ textAlign: 'center', marginTop: typo.elementGap }}>
            <span style={{
              fontSize: typo.small,
              color: '#f97316',
              fontWeight: 600,
              background: '#451a03',
              padding: '4px 12px',
              borderRadius: '12px'
            }}>
              Sticky hinge - extra torque needed!
            </span>
          </div>
        )}

        {/* Title moved outside SVG */}
        <div style={{
          textAlign: 'center',
          marginTop: typo.elementGap,
          fontSize: typo.small,
          color: '#a1a1aa'
        }}>
          Top-Down View (looking down at door)
        </div>
      </div>
    );
  };

  // Seesaw visualization for twist phases
  const renderSeesawVisualization = () => {
    const svgWidth = Math.min(360, isMobile ? 320 : 360);

    return (
      <div>
        <svg width="100%" height={180} viewBox={`0 0 ${svgWidth} 180`} className="block mx-auto">
          <defs>
            {/* Premium board gradient - polished wood */}
            <linearGradient id="torqSeesawBoardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a3765c" />
              <stop offset="25%" stopColor="#8b6348" />
              <stop offset="50%" stopColor="#c9a07a" />
              <stop offset="75%" stopColor="#8b6348" />
              <stop offset="100%" stopColor="#6b4d38" />
            </linearGradient>

            {/* Fulcrum metal gradient */}
            <linearGradient id="torqFulcrumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="40%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Heavy weight gradient - red/orange */}
            <radialGradient id="torqHeavyWeightGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>

            {/* Light weight gradient - green */}
            <radialGradient id="torqLightWeightGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>

            {/* Ground gradient */}
            <linearGradient id="torqGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1e2e" />
              <stop offset="100%" stopColor="#0f0f1a" />
            </linearGradient>

            {/* Weight shadow filter */}
            <filter id="torqWeightShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
            </filter>

            {/* Fulcrum shadow */}
            <filter id="torqFulcrumShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background */}
          <rect width={svgWidth} height={180} fill="#08050c" />

          {/* Ground with gradient */}
          <rect x={0} y={145} width={svgWidth} height={35} fill="url(#torqGroundGrad)" />
          <line x1={0} y1={145} x2={svgWidth} y2={145} stroke="#27272a" strokeWidth={1} />

          {/* Fulcrum shadow on ground */}
          <ellipse cx={svgWidth/2} cy={150} rx={35} ry={8} fill="#000" opacity={0.3} />

          {/* Fulcrum (triangle) with 3D effect */}
          <g filter="url(#torqFulcrumShadow)">
            <polygon points={`${svgWidth/2},115 ${svgWidth/2 - 28},145 ${svgWidth/2 + 28},145`} fill="url(#torqFulcrumGrad)" stroke="#9ca3af" strokeWidth={1.5} />
            {/* Highlight edge */}
            <line x1={svgWidth/2} y1={117} x2={svgWidth/2 - 24} y2={143} stroke="#9ca3af" strokeWidth={1} opacity={0.5} />
          </g>

          {/* Seesaw board with premium wood grain */}
          <g transform={`translate(${svgWidth/2}, 108)`}>
            <rect x={-(svgWidth - 90)/2} y={-6} width={svgWidth - 90} height={12} rx={4} fill="url(#torqSeesawBoardGrad)" />
            {/* Wood grain lines */}
            {[-0.35, -0.15, 0.05, 0.25, 0.45].map((pos, i) => (
              <line key={i} x1={(svgWidth - 90) * pos} y1={-4} x2={(svgWidth - 90) * pos} y2={4}
                    stroke="#6b4d38" strokeWidth={0.5} opacity={0.3} />
            ))}
            {/* Board highlight */}
            <line x1={-(svgWidth - 90)/2 + 4} y1={-4} x2={(svgWidth - 90)/2 - 4} y2={-4} stroke="#c9a07a" strokeWidth={1} opacity={0.4} />
          </g>

          {/* Left weight (heavier, closer to center) */}
          <g transform={`translate(100, 78)`} filter="url(#torqWeightShadow)">
            <circle r={28} fill="url(#torqHeavyWeightGrad)" stroke="#dc2626" strokeWidth={2}>
              <animate attributeName="cy" values="-2;2;-2" dur="3s" repeatCount="indefinite" />
            </circle>
            {/* Weight highlight */}
            <circle cx={-8} cy={-8} r={6} fill="#fca5a5" opacity={0.5} />
          </g>

          {/* Right weight (lighter, farther from center) */}
          <g transform={`translate(${svgWidth - 80}, 78)`} filter="url(#torqWeightShadow)">
            <circle r={20} fill="url(#torqLightWeightGrad)" stroke="#16a34a" strokeWidth={2}>
              <animate attributeName="cy" values="2;-2;2" dur="3s" repeatCount="indefinite" />
            </circle>
            {/* Weight highlight */}
            <circle cx={-5} cy={-5} r={4} fill="#86efac" opacity={0.5} />
          </g>

          {/* Lever arm indicators */}
          <line x1={svgWidth/2} y1={130} x2={100} y2={130} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
          <line x1={svgWidth/2} y1={130} x2={svgWidth - 80} y2={130} stroke="#f97316" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />

          {/* Pivot point marker */}
          <circle cx={svgWidth/2} cy={115} r={4} fill="#a855f7" stroke="#c084fc" strokeWidth={1} />
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `4px ${typo.cardPadding}`, marginTop: '-35px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: typo.small, color: '#ef4444', fontWeight: 700 }}>5kg</span>
            <div style={{ fontSize: typo.label, color: '#3b82f6', marginTop: '2px' }}>r1 (short)</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: typo.small, color: '#22c55e', fontWeight: 700 }}>2kg</span>
            <div style={{ fontSize: typo.label, color: '#f97316', marginTop: '2px' }}>r2 (long)</div>
          </div>
        </div>

        {/* Balance equation */}
        <div style={{ textAlign: 'center', marginTop: typo.elementGap }}>
          <span style={{
            fontSize: typo.small,
            color: '#a855f7',
            fontWeight: 600,
            background: '#2d1f4e',
            padding: '6px 14px',
            borderRadius: '12px'
          }}>
            5kg x r1 = 2kg x r2 (Balanced!)
          </span>
        </div>
      </div>
    );
  };

  // Application graphics for transfer phase
  const renderApplicationGraphic = (appId: string) => {
    const svgWidth = isMobile ? 280 : 320;

    return (
      <svg width="100%" height={130} viewBox={`0 0 ${svgWidth} 130`} className="block mx-auto">
        <defs>
          {/* Wrench metal gradient */}
          <linearGradient id="torqWrenchMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="30%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#e5e7eb" />
            <stop offset="70%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>

          {/* Force arrow glow */}
          <filter id="torqAppForceGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#22c55e" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Torque arc glow */}
          <filter id="torqAppArcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="#a855f7" floodOpacity="0.4" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Steering wheel gradient */}
          <linearGradient id="torqSteeringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#52525b" />
            <stop offset="50%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>

          {/* Engine block gradient */}
          <linearGradient id="torqEngineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Bolt metallic gradient */}
          <radialGradient id="torqBoltGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#a1a1aa" />
            <stop offset="50%" stopColor="#71717a" />
            <stop offset="100%" stopColor="#3f3f46" />
          </radialGradient>

          {/* Weight shadows */}
          <filter id="torqAppShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
          </filter>

          {/* Premium weight gradients */}
          <radialGradient id="torqAppHeavyGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <radialGradient id="torqAppLightGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>

          {/* Hand/grip gradient */}
          <radialGradient id="torqHandGripGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </radialGradient>
        </defs>

        <rect width={svgWidth} height={130} fill="#0f0a14" rx={12} />

        {appId === 'wrench' && (
          <g>
            {/* Wrench body with premium metal gradient */}
            <rect x={70} y={55} width={160} height={18} rx={4} fill="url(#torqWrenchMetalGrad)" filter="url(#torqAppShadow)" />
            {/* Highlight stripe */}
            <rect x={72} y={58} width={156} height={3} rx={1} fill="#e5e7eb" opacity={0.4} />
            {/* Wrench head */}
            <circle cx={70} cy={64} r={22} fill="url(#torqWrenchMetalGrad)" stroke="#9ca3af" strokeWidth={2} filter="url(#torqAppShadow)" />
            <circle cx={70} cy={64} r={12} fill="#27272a" />
            {/* Bolt with metallic gradient */}
            <polygon points="70,64 78,59 78,54 70,49 62,54 62,59" fill="url(#torqBoltGrad)" stroke="#71717a" strokeWidth={1} />
            {/* Force arrow with glow */}
            <g filter="url(#torqAppForceGlow)">
              <line x1={230} y1={64} x2={230} y2={22} stroke="#22c55e" strokeWidth={4} strokeLinecap="round" />
              <polygon points="230,16 222,28 238,28" fill="#86efac" />
            </g>
            {/* Lever arm */}
            <line x1={70} y1={94} x2={230} y2={94} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
            {/* Rotation indicator with glow */}
            <g filter="url(#torqAppArcGlow)">
              <path d="M 48 42 A 32 32 0 0 0 48 86" stroke="#a855f7" strokeWidth={3} fill="none" strokeLinecap="round" />
              <polygon points="48,38 42,48 54,48" fill="#c084fc" />
            </g>
          </g>
        )}

        {appId === 'seesaw' && (
          <g>
            {/* Fulcrum with gradient */}
            <polygon points={`${svgWidth/2},88 ${svgWidth/2 - 24},115 ${svgWidth/2 + 24},115`} fill="url(#torqSteeringGrad)" stroke="#71717a" strokeWidth={1} />
            {/* Board with wood grain effect */}
            <g transform={`rotate(-5, ${svgWidth/2}, 83)`}>
              <rect x={35} y={78} width={svgWidth - 70} height={10} rx={3} fill="#a3765c" />
              <rect x={37} y={79} width={svgWidth - 74} height={2} rx={1} fill="#c9a07a" opacity={0.4} />
            </g>
            {/* Heavy weight (left, closer to center) */}
            <g filter="url(#torqAppShadow)">
              <circle cx={90} cy={65} r={22} fill="url(#torqAppHeavyGrad)">
                <animate attributeName="cy" values="63;67;63" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={84} cy={59} r={5} fill="#fca5a5" opacity={0.5} />
            </g>
            {/* Light weight (right, farther from center) */}
            <g filter="url(#torqAppShadow)">
              <circle cx={svgWidth - 75} cy={98} r={16} fill="url(#torqAppLightGrad)">
                <animate attributeName="cy" values="100;96;100" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={svgWidth - 79} cy={94} r={4} fill="#86efac" opacity={0.5} />
            </g>
          </g>
        )}

        {appId === 'steering' && (
          <g>
            {/* Steering wheel outer ring with premium gradient */}
            <circle cx={svgWidth/2} cy={65} r={45} fill="none" stroke="#27272a" strokeWidth={10} />
            <circle cx={svgWidth/2} cy={65} r={45} fill="none" stroke="url(#torqSteeringGrad)" strokeWidth={6} />
            {/* Center hub */}
            <circle cx={svgWidth/2} cy={65} r={14} fill="#1f2937" stroke="#52525b" strokeWidth={2} />
            <circle cx={svgWidth/2 - 3} cy={62} r={4} fill="#3f3f46" opacity={0.6} />
            {/* Spokes */}
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2} y2={24} stroke="url(#torqSteeringGrad)" strokeWidth={6} strokeLinecap="round" />
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2 - 36} y2={92} stroke="url(#torqSteeringGrad)" strokeWidth={6} strokeLinecap="round" />
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2 + 36} y2={92} stroke="url(#torqSteeringGrad)" strokeWidth={6} strokeLinecap="round" />
            {/* Hands with gradient */}
            <circle cx={svgWidth/2 - 45} cy={65} r={8} fill="url(#torqHandGripGrad)" filter="url(#torqAppShadow)" />
            <circle cx={svgWidth/2 + 45} cy={65} r={8} fill="url(#torqHandGripGrad)" filter="url(#torqAppShadow)" />
            {/* Force arrows with glow */}
            <g filter="url(#torqAppForceGlow)">
              <line x1={svgWidth/2 - 45} y1={53} x2={svgWidth/2 - 45} y2={35} stroke="#22c55e" strokeWidth={3} strokeLinecap="round" />
              <polygon points={`${svgWidth/2 - 45},30 ${svgWidth/2 - 50},40 ${svgWidth/2 - 40},40`} fill="#86efac" />
              <line x1={svgWidth/2 + 45} y1={77} x2={svgWidth/2 + 45} y2={95} stroke="#22c55e" strokeWidth={3} strokeLinecap="round" />
              <polygon points={`${svgWidth/2 + 45},100 ${svgWidth/2 + 40},90 ${svgWidth/2 + 50},90`} fill="#86efac" />
            </g>
            {/* Rotation arc with glow */}
            <g filter="url(#torqAppArcGlow)">
              <path d={`M ${svgWidth/2 + 55} 50 A 48 48 0 0 1 ${svgWidth/2 + 55} 80`} stroke="#a855f7" strokeWidth={3} fill="none" strokeLinecap="round" />
            </g>
          </g>
        )}

        {appId === 'engine' && (
          <g>
            {/* Engine block with gradient */}
            <rect x={svgWidth/2 - 50} y={30} width={100} height={70} rx={8} fill="url(#torqEngineGrad)" stroke="#6b7280" strokeWidth={2} filter="url(#torqAppShadow)" />
            {/* Engine detail lines */}
            <line x1={svgWidth/2 - 45} y1={35} x2={svgWidth/2 + 45} y2={35} stroke="#4b5563" strokeWidth={1} />
            <line x1={svgWidth/2 - 45} y1={45} x2={svgWidth/2 + 45} y2={45} stroke="#4b5563" strokeWidth={1} />
            {/* Crankshaft circle */}
            <circle cx={svgWidth/2} cy={65} r={25} fill="#1f2937" stroke="#71717a" strokeWidth={3} />
            <circle cx={svgWidth/2 - 6} cy={60} r={6} fill="#27272a" opacity={0.5} />
            {/* Piston with metallic look */}
            <rect x={svgWidth/2 - 15} y={12} width={30} height={38} rx={4} fill="url(#torqWrenchMetalGrad)">
              <animate attributeName="y" values="12;22;12" dur="0.5s" repeatCount="indefinite" />
            </rect>
            {/* Connecting rod */}
            <line x1={svgWidth/2} y1={48} x2={svgWidth/2} y2={65} stroke="#9ca3af" strokeWidth={7} strokeLinecap="round">
              <animate attributeName="y1" values="48;58;48" dur="0.5s" repeatCount="indefinite" />
            </line>
            {/* Rotation arrow with glow */}
            <g filter="url(#torqAppForceGlow)">
              <path d={`M ${svgWidth/2 + 35} 52 A 35 35 0 0 1 ${svgWidth/2 + 35} 78`} stroke="#22c55e" strokeWidth={3} fill="none" strokeLinecap="round" />
              <polygon points={`${svgWidth/2 + 35},83 ${svgWidth/2 + 29},73 ${svgWidth/2 + 41},73`} fill="#86efac" />
            </g>
            {/* Output shaft */}
            <rect x={svgWidth/2 + 50} y={58} width={40} height={14} rx={4} fill="url(#torqWrenchMetalGrad)" />
            <line x1={svgWidth/2 + 52} y1={60} x2={svgWidth/2 + 88} y2={60} stroke="#e5e7eb" strokeWidth={1} opacity={0.3} />
          </g>
        )}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-orange-200 bg-clip-text text-transparent">
        Torque: The Rotational Force
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Have you ever tried to push a door near its hinges? It's surprisingly hard!
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-orange-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-7xl mb-6">
            <span className="drop-shadow-lg" style={{ filter: 'drop-shadow(0 8px 24px rgba(168, 85, 247, 0.4))' }}>
              {'\uD83D\uDEAA'}
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Where should you push to need the <em className="text-purple-400">least</em> force?
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Torque is the rotational equivalent of force - it makes things spin!
            </p>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Let's Investigate
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">{'\u2726'}</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">{'\u2726'}</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">{'\u2726'}</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Make Your Prediction</h2>
      <p className="text-slate-400 mb-8">To open a door with the least effort, where should you push?</p>

      <div className="flex flex-col gap-3 w-full max-w-md mb-8">
        {[
          { id: 'near_hinge', label: 'Near the hinge (close to pivot)', icon: '\uD83D\uDCCD' },
          { id: 'middle', label: 'In the middle of the door', icon: '\uD83C\uDFAF' },
          { id: 'far_edge', label: 'Far from hinge (at the handle)', icon: '\uD83D\uDEAA' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setPrediction(option.id);
              playSound(option.id === 'far_edge' ? 'success' : 'click');
              emitEvent('prediction_made', { prediction: option.id });
            }}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
              prediction === option.id
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-white font-medium text-left">{option.label}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onClick={() => goToPhase('play')}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          Test It! {'\u2192'}
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="text-2xl font-bold text-white mb-4">Torque Laboratory</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 max-w-md w-full border border-slate-700/50">
        {renderVisualization()}
      </div>

      {/* Slider control */}
      <div className="w-full max-w-md mb-6">
        <label className="text-sm text-slate-300 mb-2 block">
          Push position: <span className="text-purple-400 font-semibold">{(pushPosition * 100).toFixed(0)}%</span> from hinge
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={pushPosition}
          onChange={(e) => {
            setPushPosition(parseFloat(e.target.value));
            resetDoor();
            emitEvent('parameter_changed', { position: e.target.value });
          }}
          disabled={isPushing}
          className="w-full accent-purple-500 h-2"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Near hinge</span>
          <span>At handle</span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        {doorAngle === 0 ? (
          <button
            onClick={() => pushDoor()}
            disabled={isPushing}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {'\uD83D\uDC46'} Push Door!
          </button>
        ) : (
          <button
            onClick={() => resetDoor()}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600"
          >
            {'\u21BA'} Reset
          </button>
        )}
        <button
          onClick={() => setShowForceVector(!showForceVector)}
          style={{ zIndex: 10 }}
          className={`px-4 py-3 rounded-xl font-medium ${showForceVector ? 'bg-blue-600' : 'bg-slate-700'} text-white`}
        >
          {showForceVector ? '\uD83D\uDC41 Vectors ON' : '\uD83D\uDC41 Vectors OFF'}
        </button>
      </div>

      <p className="text-slate-400 text-sm mb-6">
        Experiments: {experimentCount} - Try different positions!
      </p>

      {experimentCount >= 3 && (
        <button
          onClick={() => goToPhase('review')}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-xl"
        >
          I see the pattern! {'\u2192'}
        </button>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="text-5xl mb-4">{'\uD83D\uDCA1'}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Torque = Force x Lever Arm</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/60 rounded-2xl p-6 max-w-lg w-full border border-purple-500/30 mb-6">
        <p className="text-3xl text-purple-400 font-mono font-bold text-center mb-4">
          {'\u03C4'} = r {'\u00D7'} F = rF sin({'\u03B8'})
        </p>
        <p className="text-slate-300 text-center leading-relaxed">
          To rotate something, you need <em className="text-purple-400">torque</em>.
          Same torque can come from big force + small distance, or small force + big distance!
        </p>
      </div>

      <div className="grid gap-4 max-w-lg w-full mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="font-semibold text-emerald-400 mb-1">Far from hinge (large r)</p>
          <p className="text-slate-300 text-sm">Small force gives enough torque {'\u2192'} Easy!</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="font-semibold text-red-400 mb-1">Near hinge (small r)</p>
          <p className="text-slate-300 text-sm">Need huge force for same torque {'\u2192'} Hard!</p>
        </div>
      </div>

      <p className={`text-sm mb-6 ${prediction === 'far_edge' ? 'text-emerald-400' : 'text-slate-400'}`}>
        Your prediction: {prediction === 'far_edge' ? '\u2713 Correct!' : 'Now you understand!'}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
      >
        Next Challenge: Balancing! {'\u2192'}
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="text-5xl mb-4">{'\u2696\uFE0F'}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mb-2">Plot Twist: The Seesaw!</h2>
      <p className="text-slate-400 mb-8">How do you balance a seesaw with unequal weights?</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 max-w-md w-full border border-slate-700/50">
        {renderSeesawVisualization()}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md mb-8">
        {[
          { id: 'heavy_far', label: "Put the heavy weight farther from pivot" },
          { id: 'heavy_close', label: "Put the heavy weight closer to pivot" },
          { id: 'impossible', label: "It's impossible to balance unequal weights" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              playSound(option.id === 'heavy_close' ? 'success' : 'click');
              emitEvent('twist_prediction_made', { twistPrediction: option.id });
            }}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              twistPrediction === option.id
                ? 'border-amber-500 bg-amber-500/20'
                : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
            }`}
          >
            <span className="text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onClick={() => goToPhase('twist_play')}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
        >
          Try the Seesaw! {'\u2192'}
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const [leftWeight, setLeftWeight] = useState(5);
    const [leftPosition, setLeftPosition] = useState(0.4);
    const [rightWeight, setRightWeight] = useState(2);
    const [rightPosition, setRightPosition] = useState(0.8);

    const leftTorque = leftWeight * leftPosition;
    const rightTorque = rightWeight * rightPosition;
    const isBalanced = Math.abs(leftTorque - rightTorque) < 0.5;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Seesaw Balance Lab</h2>

        {/* Interactive seesaw visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 max-w-md w-full border border-slate-700/50">
          <svg width="100%" height={160} viewBox="0 0 360 160" className="block mx-auto">
            <defs>
              {/* Premium board gradient - polished wood */}
              <linearGradient id="torqLabBoardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a3765c" />
                <stop offset="25%" stopColor="#8b6348" />
                <stop offset="50%" stopColor="#c9a07a" />
                <stop offset="75%" stopColor="#8b6348" />
                <stop offset="100%" stopColor="#6b4d38" />
              </linearGradient>

              {/* Fulcrum metal gradient */}
              <linearGradient id="torqLabFulcrumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#71717a" />
                <stop offset="50%" stopColor="#52525b" />
                <stop offset="100%" stopColor="#3f3f46" />
              </linearGradient>

              {/* Left weight gradient - red */}
              <radialGradient id="torqLabLeftGrad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </radialGradient>

              {/* Right weight gradient - green */}
              <radialGradient id="torqLabRightGrad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </radialGradient>

              {/* Ground gradient */}
              <linearGradient id="torqLabGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e1e2e" />
                <stop offset="100%" stopColor="#0f0f1a" />
              </linearGradient>

              {/* Shadow filters */}
              <filter id="torqLabWeightShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
              </filter>

              <filter id="torqLabFulcrumShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
              </filter>

              {/* Balance glow */}
              <filter id="torqLabBalanceGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={isBalanced ? '#22c55e' : '#f97316'} floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width={360} height={160} fill="#08050c" />

            {/* Ground with gradient */}
            <rect x={0} y={130} width={360} height={30} fill="url(#torqLabGroundGrad)" />
            <line x1={0} y1={130} x2={360} y2={130} stroke="#27272a" strokeWidth={1} />

            {/* Fulcrum shadow on ground */}
            <ellipse cx={180} cy={135} rx={35} ry={8} fill="#000" opacity={0.3} />

            {/* Fulcrum (triangle) with 3D effect */}
            <g filter="url(#torqLabFulcrumShadow)">
              <polygon points="180,105 150,130 210,130" fill="url(#torqLabFulcrumGrad)" stroke="#9ca3af" strokeWidth={1.5} />
              <line x1={180} y1={107} x2={154} y2={128} stroke="#9ca3af" strokeWidth={1} opacity={0.5} />
            </g>

            {/* Seesaw board - tilts based on balance */}
            <g transform={`rotate(${(rightTorque - leftTorque) * 3}, 180, 98)`}>
              {/* Board with premium wood grain */}
              <rect x={30} y={92} width={300} height={12} rx={4} fill="url(#torqLabBoardGrad)" />
              {/* Wood grain lines */}
              {[-0.35, -0.15, 0.05, 0.25, 0.45].map((pos, i) => (
                <line key={i} x1={180 + 150 * pos} y1={94} x2={180 + 150 * pos} y2={102}
                      stroke="#6b4d38" strokeWidth={0.5} opacity={0.3} />
              ))}
              {/* Board highlight */}
              <line x1={35} y1={94} x2={325} y2={94} stroke="#c9a07a" strokeWidth={1} opacity={0.4} />

              {/* Left weight with premium gradient */}
              <g transform={`translate(${30 + leftPosition * 150}, 68)`} filter="url(#torqLabWeightShadow)">
                <circle r={18 + leftWeight * 2} fill="url(#torqLabLeftGrad)" stroke="#dc2626" strokeWidth={2} />
                {/* Highlight */}
                <circle cx={-(5 + leftWeight * 0.5)} cy={-(5 + leftWeight * 0.5)} r={4 + leftWeight * 0.5} fill="#fca5a5" opacity={0.5} />
              </g>

              {/* Right weight with premium gradient */}
              <g transform={`translate(${180 + rightPosition * 150}, 68)`} filter="url(#torqLabWeightShadow)">
                <circle r={18 + rightWeight * 2} fill="url(#torqLabRightGrad)" stroke="#16a34a" strokeWidth={2} />
                {/* Highlight */}
                <circle cx={-(4 + rightWeight * 0.4)} cy={-(4 + rightWeight * 0.4)} r={3 + rightWeight * 0.4} fill="#86efac" opacity={0.5} />
              </g>
            </g>

            {/* Pivot point marker with glow */}
            <circle cx={180} cy={105} r={5} fill="#a855f7" stroke="#c084fc" strokeWidth={1.5} filter="url(#torqLabBalanceGlow)" />
          </svg>

          {/* Balance indicator outside SVG */}
          <div style={{ textAlign: 'center', marginTop: typo.elementGap }}>
            <span style={{
              fontSize: typo.body,
              fontWeight: 700,
              color: isBalanced ? '#22c55e' : '#f97316',
              background: isBalanced ? '#052e16' : '#451a03',
              padding: '6px 16px',
              borderRadius: '12px',
              border: `1px solid ${isBalanced ? '#22c55e40' : '#f9731640'}`
            }}>
              {isBalanced ? 'BALANCED!' : `Tilting ${leftTorque > rightTorque ? 'Left' : 'Right'}`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <p className="text-red-400 font-semibold text-sm mb-2">Left Weight</p>
            <input
              type="range" min="1" max="10" value={leftWeight}
              onChange={(e) => setLeftWeight(parseInt(e.target.value))}
              className="w-full accent-red-500"
            />
            <p className="text-white text-center mt-1">{leftWeight} kg</p>
            <p className="text-slate-400 text-xs mt-2">Position: {(leftPosition * 100).toFixed(0)}%</p>
            <input
              type="range" min="0.1" max="1" step="0.1" value={leftPosition}
              onChange={(e) => setLeftPosition(parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <p className="text-green-400 font-semibold text-sm mb-2">Right Weight</p>
            <input
              type="range" min="1" max="10" value={rightWeight}
              onChange={(e) => setRightWeight(parseInt(e.target.value))}
              className="w-full accent-green-500"
            />
            <p className="text-white text-center mt-1">{rightWeight} kg</p>
            <p className="text-slate-400 text-xs mt-2">Position: {(rightPosition * 100).toFixed(0)}%</p>
            <input
              type="range" min="0.1" max="1" step="0.1" value={rightPosition}
              onChange={(e) => setRightPosition(parseFloat(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        {/* Torque display - moved outside SVG with typo system */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 max-w-md w-full mb-6">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: typo.body }}>
            <span style={{ color: '#cbd5e1' }}>
              Left: <span style={{ color: '#ef4444', fontWeight: 600 }}>{leftTorque.toFixed(1)}</span> N-m
            </span>
            <span style={{ color: '#6b7280' }}>|</span>
            <span style={{ color: '#cbd5e1' }}>
              Right: <span style={{ color: '#22c55e', fontWeight: 600 }}>{rightTorque.toFixed(1)}</span> N-m
            </span>
          </div>
          <p style={{ textAlign: 'center', color: '#a855f7', fontSize: typo.small, marginTop: '8px', fontWeight: 600 }}>
            {'\u03A3\u03C4'} = {(leftTorque - rightTorque).toFixed(1)} N-m
          </p>
        </div>

        {isBalanced && (
          <button
            onClick={() => goToPhase('twist_review')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
          >
            I balanced it! {'\u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="text-5xl mb-4">{'\u2696\uFE0F'}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mb-6">Rotational Equilibrium</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/60 rounded-2xl p-6 max-w-lg w-full border border-amber-500/30 mb-6">
        <p className="text-3xl text-amber-400 font-mono font-bold text-center mb-4">
          {'\u03A3\u03C4'} = 0
        </p>
        <p className="text-slate-300 text-center leading-relaxed">
          For an object to be in rotational equilibrium, the sum of all torques must equal zero.
          Clockwise torques balance counterclockwise torques!
        </p>
      </div>

      <div className="grid gap-4 max-w-lg w-full mb-6">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="font-semibold text-purple-400 mb-1">Balance Condition</p>
          <p className="text-slate-300 text-sm">m1 x r1 = m2 x r2</p>
          <p className="text-slate-400 text-xs mt-1">Heavier objects need shorter lever arms!</p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
          <p className="font-semibold text-cyan-400 mb-1">Real-World Applications</p>
          <p className="text-slate-300 text-sm">Bridges, cranes, mobiles, and even your body use this principle!</p>
        </div>
      </div>

      <p className={`text-sm mb-6 ${twistPrediction === 'heavy_close' ? 'text-emerald-400' : 'text-slate-400'}`}>
        Your prediction: {twistPrediction === 'heavy_close' ? '\u2713 Correct!' : 'Now you understand!'}
      </p>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        See Real-World Examples {'\u2192'}
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size >= applications.length;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">Torque in the Real World</h2>
        <p className="text-slate-400 text-sm mb-6">
          Application {activeApp + 1} of {applications.length} - {completedApps.size} completed
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 mb-6">
          {applications.map((_, idx) => (
            <div key={idx} className={`w-3 h-3 rounded-full transition-all ${
              completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-purple-500' : 'bg-slate-700'
            }`} />
          ))}
        </div>

        {/* Application card */}
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 mb-6">
          {renderApplicationGraphic(app.id)}

          <h3 className="text-xl font-bold text-purple-400 text-center mt-4 mb-2">{app.title}</h3>
          <p className="text-slate-300 text-center text-sm mb-4">{app.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Formula</p>
              <p className="text-white font-mono text-sm">{app.formula}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Key Insight</p>
              <p className="text-white text-xs">{app.insight}</p>
            </div>
          </div>

          {!completedApps.has(activeApp) && (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: app.id });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              style={{ zIndex: 10 }}
              className="w-full mt-4 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-semibold rounded-xl"
            >
              {'\u2713'} Mark "{app.title}" as Read
            </button>
          )}

          {completedApps.has(activeApp) && (
            <div className="mt-4 py-3 bg-emerald-500/10 rounded-xl text-center">
              <span className="text-emerald-400 text-sm">{'\u2713'} Completed</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveApp(Math.max(0, activeApp - 1))}
            disabled={activeApp === 0}
            style={{ zIndex: 10 }}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
          >
            {'\u2190'} Previous
          </button>

          {activeApp < applications.length - 1 ? (
            <button
              onClick={() => setActiveApp(activeApp + 1)}
              disabled={!completedApps.has(activeApp)}
              style={{ zIndex: 10 }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
            >
              Next {'\u2192'}
            </button>
          ) : allAppsCompleted ? (
            <button
              onClick={() => goToPhase('test')}
              style={{ zIndex: 10 }}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg"
            >
              Take the Quiz {'\u2192'}
            </button>
          ) : (
            <span className="text-slate-500 text-sm self-center">Complete all to continue</span>
          )}
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="flex justify-between items-center w-full max-w-lg mb-4">
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span className="text-sm font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
            Score: {correctAnswers}/{answeredQuestions.size}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-lg h-1 bg-slate-700 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }}
          />
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 className="text-white font-semibold mb-4 leading-relaxed">{q.question}</h3>

          <div className="flex flex-col gap-3">
            {q.options.map((option, idx) => {
              let bgClass = 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50';
              let textClass = 'text-white';

              if (isAnswered) {
                if (option.correct) {
                  bgClass = 'bg-emerald-500/20 border-emerald-500';
                  textClass = 'text-emerald-400';
                } else if (idx === selectedAnswer && !option.correct) {
                  bgClass = 'bg-red-500/20 border-red-500';
                  textClass = 'text-red-400';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleTestAnswer(idx)}
                  disabled={isAnswered}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${bgClass}`}
                >
                  <span className={`text-sm ${textClass}`}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 max-w-lg w-full mb-6">
            <p className="text-slate-300 text-sm">
              {'\uD83D\uDCA1'} {q.explanation}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => {
              setCurrentQuestion(prev => Math.max(0, prev - 1));
              setSelectedAnswer(null);
              setShowExplanation(answeredQuestions.has(currentQuestion - 1));
            }}
            disabled={currentQuestion === 0}
            style={{ zIndex: 10 }}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
          >
            {'\u2190'} Back
          </button>

          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
                setShowExplanation(answeredQuestions.has(currentQuestion + 1));
              }}
              style={{ zIndex: 10 }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg"
            >
              Next {'\u2192'}
            </button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{ zIndex: 10 }}
              className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg"
            >
              Complete {'\u2192'}
            </button>
          ) : (
            <span className="text-slate-500 text-sm self-center">Answer all to continue</span>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);
    const passed = correctAnswers >= 7;

    const resetGame = () => {
      setPhase('hook');
      setExperimentCount(0);
      setCurrentQuestion(0);
      setCorrectAnswers(0);
      setAnsweredQuestions(new Set());
      setCompletedApps(new Set());
      setActiveApp(0);
      setPrediction(null);
      setTwistPrediction(null);
      setPushPosition(0.8);
      setHasFriction(false);
      resetDoor();
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center relative overflow-hidden">
        {/* Confetti effect */}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
          }
        `}</style>
        {passed && [...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px',
            animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
            pointerEvents: 'none', fontSize: 18,
          }}>
            {['\uD83D\uDEAA', '\uD83D\uDD27', '\u2B50', '\u2728', '\uD83C\uDF89'][Math.floor(Math.random() * 5)]}
          </div>
        ))}

        <div className="text-7xl mb-6">{passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}</div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          {passed ? 'Congratulations! Torque Master!' : 'Keep Practicing!'}
        </h2>

        <div className={`text-5xl font-bold mb-2 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>{percentage}%</div>
        <p className="text-slate-400 mb-8">{correctAnswers}/{testQuestions.length} correct answers</p>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 mb-8">
          <h3 className="text-purple-400 font-semibold mb-4">{passed ? 'Concepts Mastered' : 'Key Concepts'}</h3>
          <ul className="text-left space-y-2">
            {[
              '{\\u03C4} = r x F = rF sin(theta)',
              'Longer lever arm = less force needed',
              'Rotational equilibrium: Sum of torques = 0',
              'Real applications: Wrenches, Seesaws, Steering, Engines'
            ].map((item, idx) => (
              <li key={idx} className="text-slate-300 text-sm flex items-center gap-2">
                <span className="text-emerald-400">{passed ? '\u2713' : '\u25CB'}</span> {item.replace('{\\u03C4}', '\u03C4')}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-md">
          {passed ? (
            <>
              <button
                onClick={() => handleReturnToDashboard()}
                style={{ zIndex: 10 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-xl"
              >
                {'\uD83C\uDFE0'} Return to Dashboard
              </button>
              <button
                onClick={() => resetGame()}
                style={{ zIndex: 10 }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                {'\uD83D\uDD2C'} Review Lesson
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => goToPhase('test')}
                style={{ zIndex: 10 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                {'\u21BA'} Retake Test
              </button>
              <button
                onClick={() => resetGame()}
                style={{ zIndex: 10 }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                {'\uD83D\uDD2C'} Review Lesson
              </button>
              <button
                onClick={() => handleReturnToDashboard()}
                style={{ zIndex: 10 }}
                className="text-slate-500 underline text-sm mt-2"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Torque</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-purple-400 w-6 shadow-lg shadow-purple-400/30'
                    : currentPhaseIndex > idx
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-purple-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default TorqueRenderer;
