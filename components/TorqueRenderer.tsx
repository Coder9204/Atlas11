'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TORQUE - Premium 10-Phase Educational Game
// ============================================================================

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

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook',
  1: 'Predict',
  2: 'Lab',
  3: 'Review',
  4: 'Twist Predict',
  5: 'Twist Lab',
  6: 'Twist Review',
  7: 'Transfer',
  8: 'Test',
  9: 'Mastery'
};

interface TorqueRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TorqueRenderer: React.FC<TorqueRendererProps> = ({
  onGameEvent,
  currentPhase,
  onPhaseComplete
}) => {
  // Navigation debouncing refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Phase state
  const [phase, setPhase] = useState<number>(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) return currentPhase;
    return 0;
  });

  // Sync phase with external prop
  useEffect(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) {
      setPhase(currentPhase);
    }
  }, [currentPhase]);

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

  // Navigation with debouncing
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (!PHASES.includes(newPhase)) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
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

  // Test questions
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

  // Real-world applications
  const applications = [
    {
      id: 'wrench',
      title: "Wrench & Bolts",
      description: "Longer wrenches provide more torque with less effort. Mechanics use breaker bars for stubborn bolts - maximum leverage from extended handles!",
      formula: "t = F x r",
      insight: "2x handle length = 2x torque",
    },
    {
      id: 'steering',
      title: "Steering Wheels",
      description: "Large steering wheels require less force to turn. Power steering reduces the torque needed at your hands, making driving effortless.",
      formula: "F = t / r",
      insight: "Larger radius = less effort",
    },
    {
      id: 'seesaw',
      title: "Seesaw Balance",
      description: "Torque balance determines equilibrium. A heavier child sits closer to the pivot to balance a lighter child sitting farther away.",
      formula: "m1r1 = m2r2",
      insight: "Balance point shifts with mass",
    },
    {
      id: 'bicycle',
      title: "Bicycle Pedals",
      description: "The crank arm length affects your torque output. Longer cranks provide more leverage but require greater leg movement per rotation.",
      formula: "t = F x crank length",
      insight: "Typical crank: 170-175mm",
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
      <svg width="100%" height={240} viewBox={`0 0 ${svgWidth} 240`} className="block mx-auto">
        <defs>
          <linearGradient id="torque-door-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4a882" />
            <stop offset="50%" stopColor="#a08060" />
            <stop offset="100%" stopColor="#6b5344" />
          </linearGradient>
          <filter id="torque-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="torque-force-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#22c55e" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="torque-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#3a2850" strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width={svgWidth} height={240} fill="#08050c" />
        <rect width={svgWidth} height={240} fill="url(#torque-grid)" />

        {/* Wall */}
        <rect x={0} y={hingeY - 80} width={50} height={160} fill="#3a3a4a" />
        <rect x={45} y={hingeY - 80} width={5} height={160} fill="#4a4a5a" />

        {/* Title */}
        <text x={svgWidth / 2} y={22} textAnchor="middle" fill="#fafaf9" fontSize={12} fontWeight="600" fontFamily="system-ui">
          Top-Down View (looking down at door)
        </text>

        {/* Door with rotation */}
        <g transform={`translate(${hingeX}, ${hingeY}) rotate(${doorAngle})`} filter="url(#torque-shadow)">
          {/* Door body */}
          <rect x={0} y={-doorWidth / 2} width={doorLength} height={doorWidth} rx={3} fill="url(#torque-door-grad)" />

          {/* Wood grain lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pos, i) => (
            <line key={i} x1={doorLength * pos} y1={-doorWidth / 2 + 3} x2={doorLength * pos} y2={doorWidth / 2 - 3}
                  stroke="#6b5344" strokeWidth={0.5} opacity={0.3} />
          ))}

          {/* Door handle */}
          <circle cx={doorLength - 30} cy={0} r={9} fill="#c9a97c" stroke="#a08060" strokeWidth={2} />
          <circle cx={doorLength - 30} cy={0} r={4} fill="#6b5344" />

          {/* Lever arm visualization */}
          {showForceVector && (
            <g>
              <line x1={0} y1={32} x2={pushX} y2={32}
                    stroke="#3b82f6" strokeWidth={3} strokeDasharray="6,3" />
              <circle cx={0} cy={32} r={4} fill="#3b82f6" />
              <circle cx={pushX} cy={32} r={4} fill="#3b82f6" />
              <text x={pushX / 2} y={50} textAnchor="middle" fill="#3b82f6" fontSize={10} fontWeight="600" fontFamily="system-ui">
                r = {(pushPosition * 100).toFixed(0)}%
              </text>
            </g>
          )}

          {/* Push point indicator */}
          <circle cx={pushX} cy={0} r={10} fill="#22c55e" stroke="#fff" strokeWidth={2}>
            <animate attributeName="r" values="9;11;9" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Force arrow */}
          {showForceVector && (
            <g transform={`translate(${pushX}, 0)`} filter="url(#torque-force-glow)">
              <line x1={0} y1={-16} x2={0} y2={-16 - requiredForce * 1.2}
                    stroke="#22c55e" strokeWidth={3} strokeLinecap="round" />
              <polygon points={`0,${-16 - requiredForce * 1.2 - 8} -5,${-16 - requiredForce * 1.2} 5,${-16 - requiredForce * 1.2}`}
                       fill="#22c55e" />
              <text x={16} y={-22 - requiredForce * 0.6} fill="#22c55e" fontSize={11} fontWeight="700" fontFamily="system-ui">
                F = {requiredForce.toFixed(1)}N
              </text>
            </g>
          )}
        </g>

        {/* Hinge */}
        <g transform={`translate(${hingeX}, ${hingeY})`}>
          <circle r={14} fill={hasFriction ? '#8b4513' : '#5a5a6a'} stroke="#7a7a8a" strokeWidth={3} />
          <circle r={5} fill="#7a7a8a" />
          {hasFriction && (
            <text x={0} y={35} textAnchor="middle" fill="#f97316" fontSize={10} fontWeight="600" fontFamily="system-ui">
              Sticky!
            </text>
          )}
        </g>

        {/* Force meter */}
        <g transform={`translate(${svgWidth - 95}, 165)`}>
          <rect x={0} y={0} width={85} height={60} rx={10} fill="#181220"
                stroke="#3a2850" strokeWidth={1} />
          <text x={42} y={16} textAnchor="middle" fill="#7a6890" fontSize={9} fontFamily="system-ui">
            Required Force
          </text>
          <text x={42} y={42} textAnchor="middle"
                fill={requiredForce > 100 ? '#ef4444' : '#22c55e'}
                fontSize={20} fontWeight="700" fontFamily="system-ui">
            {requiredForce.toFixed(1)}N
          </text>
        </g>

        {/* Torque display */}
        <g transform="translate(10, 165)">
          <rect x={0} y={0} width={100} height={60} rx={10} fill="#181220"
                stroke="#3a2850" strokeWidth={1} />
          <text x={50} y={16} textAnchor="middle" fill="#7a6890" fontSize={9} fontFamily="system-ui">
            Torque (t = F x r)
          </text>
          <text x={50} y={42} textAnchor="middle" fill="#a855f7" fontSize={18} fontWeight="700" fontFamily="system-ui">
            {requiredTorque} N-m
          </text>
        </g>
      </svg>
    );
  };

  // Application graphics for transfer phase
  const renderApplicationGraphic = (appId: string) => {
    const svgWidth = isMobile ? 280 : 320;

    return (
      <svg width="100%" height={130} viewBox={`0 0 ${svgWidth} 130`} className="block mx-auto">
        <rect width={svgWidth} height={130} fill="#0f0a14" rx={12} />

        {appId === 'wrench' && (
          <g>
            {/* Wrench body */}
            <rect x={70} y={55} width={160} height={18} rx={4} fill="#6b7280" />
            <rect x={70} y={60} width={160} height={4} fill="#9ca3af" />
            {/* Wrench head */}
            <circle cx={70} cy={64} r={20} fill="#4b5563" stroke="#6b7280" strokeWidth={2} />
            <circle cx={70} cy={64} r={7} fill="#1f2937" />
            {/* Bolt */}
            <polygon points="70,64 77,60 77,56 70,52 63,56 63,60" fill="#374151" stroke="#4b5563" strokeWidth={1} />
            {/* Force arrow */}
            <line x1={230} y1={64} x2={230} y2={25} stroke="#22c55e" strokeWidth={3} />
            <polygon points="230,20 224,30 236,30" fill="#22c55e" />
            <text x={246} y={42} fill="#22c55e" fontSize={11} fontWeight="600">F</text>
            {/* Lever arm */}
            <line x1={70} y1={92} x2={230} y2={92} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4,4" />
            <text x={150} y={110} textAnchor="middle" fill="#3b82f6" fontSize={10} fontWeight="600">Lever arm (r)</text>
            {/* Rotation indicator */}
            <path d="M 52 45 A 28 28 0 0 0 52 83" stroke="#a855f7" strokeWidth={2} fill="none" />
            <text x={32} y={68} fill="#a855f7" fontSize={13} fontWeight="700">t</text>
          </g>
        )}

        {appId === 'steering' && (
          <g>
            {/* Steering wheel */}
            <circle cx={svgWidth/2} cy={65} r={45} fill="none" stroke="#374151" strokeWidth={9} />
            <circle cx={svgWidth/2} cy={65} r={45} fill="none" stroke="#4b5563" strokeWidth={5} />
            <circle cx={svgWidth/2} cy={65} r={14} fill="#1f2937" stroke="#4b5563" strokeWidth={2} />
            {/* Spokes */}
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2} y2={24} stroke="#4b5563" strokeWidth={5} />
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2 - 36} y2={92} stroke="#4b5563" strokeWidth={5} />
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2 + 36} y2={92} stroke="#4b5563" strokeWidth={5} />
            {/* Hands and force arrows */}
            <circle cx={svgWidth/2 - 45} cy={65} r={7} fill="#f97316" />
            <line x1={svgWidth/2 - 45} y1={55} x2={svgWidth/2 - 45} y2={38} stroke="#22c55e" strokeWidth={3} />
            <polygon points={`${svgWidth/2 - 45},34 ${svgWidth/2 - 50},42 ${svgWidth/2 - 40},42`} fill="#22c55e" />
            <circle cx={svgWidth/2 + 45} cy={65} r={7} fill="#f97316" />
            <line x1={svgWidth/2 + 45} y1={75} x2={svgWidth/2 + 45} y2={92} stroke="#22c55e" strokeWidth={3} />
            <polygon points={`${svgWidth/2 + 45},96 ${svgWidth/2 + 40},88 ${svgWidth/2 + 50},88`} fill="#22c55e" />
            {/* Rotation indicator */}
            <text x={svgWidth/2 + 68} y={68} fill="#a855f7" fontSize={13} fontWeight="700">t</text>
          </g>
        )}

        {appId === 'seesaw' && (
          <g>
            {/* Fulcrum */}
            <polygon points={`${svgWidth/2},88 ${svgWidth/2 - 22},115 ${svgWidth/2 + 22},115`} fill="#4b5563" />
            {/* Board */}
            <rect x={35} y={78} width={svgWidth - 70} height={10} rx={3} fill="#8b7355" transform={`rotate(-5, ${svgWidth/2}, 83)`} />
            {/* Heavy weight (left, closer to center) */}
            <circle cx={90} cy={65} r={22} fill="#ef4444">
              <animate attributeName="cy" values="63;67;63" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <text x={90} y={71} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="700">5kg</text>
            {/* Light weight (right, farther from center) */}
            <circle cx={svgWidth - 75} cy={98} r={16} fill="#22c55e">
              <animate attributeName="cy" values="100;96;100" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <text x={svgWidth - 75} y={103} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="700">2kg</text>
            {/* Labels */}
            <text x={90} y={35} textAnchor="middle" fill="#7a6890" fontSize={9}>short r1</text>
            <text x={svgWidth - 75} y={35} textAnchor="middle" fill="#7a6890" fontSize={9}>long r2</text>
          </g>
        )}

        {appId === 'bicycle' && (
          <g>
            {/* Chainring */}
            <circle cx={svgWidth/2} cy={65} r={36} fill="none" stroke="#4b5563" strokeWidth={5} />
            <circle cx={svgWidth/2} cy={65} r={36} fill="none" stroke="#374151" strokeWidth={2} strokeDasharray="7,3" />
            <circle cx={svgWidth/2} cy={65} r={9} fill="#1f2937" stroke="#4b5563" strokeWidth={2} />
            {/* Chain teeth */}
            {[...Array(14)].map((_, i) => (
              <circle key={i}
                cx={svgWidth/2 + 34 * Math.cos(i * Math.PI / 7)}
                cy={65 + 34 * Math.sin(i * Math.PI / 7)}
                r={2.5} fill="#4b5563" />
            ))}
            {/* Crank arm */}
            <line x1={svgWidth/2} y1={65} x2={svgWidth/2} y2={110} stroke="#6b7280" strokeWidth={7} strokeLinecap="round" />
            {/* Pedal */}
            <rect x={svgWidth/2 - 16} y={107} width={32} height={11} rx={3} fill="#374151" stroke="#4b5563" strokeWidth={1} />
            {/* Foot */}
            <ellipse cx={svgWidth/2} cy={104} rx={13} ry={7} fill="#f97316" opacity={0.8} />
            {/* Force arrow */}
            <line x1={svgWidth/2} y1={122} x2={svgWidth/2} y2={127} stroke="#22c55e" strokeWidth={3} />
            <polygon points={`${svgWidth/2},130 ${svgWidth/2 - 5},123 ${svgWidth/2 + 5},123`} fill="#22c55e" />
            <text x={svgWidth/2 + 18} y={128} fill="#22c55e" fontSize={11} fontWeight="600">F</text>
            {/* Crank length label */}
            <line x1={svgWidth/2 + 10} y1={65} x2={svgWidth/2 + 10} y2={110} stroke="#f97316" strokeWidth={1} strokeDasharray="3,3" />
            <text x={svgWidth/2 + 26} y={92} fill="#f97316" fontSize={9}>crank (r)</text>
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
        The Door Handle Mystery
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
              Discover the physics behind every door handle placement!
            </p>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
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
            onMouseDown={(e) => {
              e.preventDefault();
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setPrediction(option.id);
              playSound(option.id === 'far_edge' ? 'success' : 'click');
              emitEvent('prediction_made', { prediction: option.id });
            }}
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
          onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
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
            onMouseDown={(e) => { e.preventDefault(); pushDoor(); }}
            disabled={isPushing}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {'\uD83D\uDC46'} Push Door!
          </button>
        ) : (
          <button
            onMouseDown={(e) => { e.preventDefault(); resetDoor(); }}
            className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600"
          >
            {'\u21BA'} Reset
          </button>
        )}
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowForceVector(!showForceVector); }}
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
          onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
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
          {'\u03C4'} = F {'\u00D7'} r
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
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
      >
        What About a Sticky Hinge? {'\u2192'}
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="text-5xl mb-4">{'\uD83D\uDD25'}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mb-2">Plot Twist: Sticky Hinge!</h2>
      <p className="text-slate-400 mb-8">What if the hinge is rusty and sticky?</p>

      <div className="flex flex-col gap-3 w-full max-w-md mb-8">
        {[
          { id: 'same', label: "Same force - friction doesn't matter" },
          { id: 'more', label: "More force needed - must overcome friction" },
          { id: 'less', label: "Less force - friction helps somehow" }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setTwistPrediction(option.id);
              playSound(option.id === 'more' ? 'success' : 'click');
              emitEvent('twist_prediction_made', { twistPrediction: option.id });
            }}
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
          onMouseDown={(e) => {
            e.preventDefault();
            setHasFriction(true);
            resetDoor();
            goToPhase(5);
          }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
        >
          Test Sticky Hinge! {'\u2192'}
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Friction Experiment</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 max-w-md w-full border border-slate-700/50">
        {renderVisualization()}
      </div>

      {/* Hinge toggle */}
      <div className="flex gap-3 items-center mb-6">
        <span className="text-slate-300 text-sm">Hinge:</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); setHasFriction(false); resetDoor(); }}
          disabled={isPushing}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${!hasFriction ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
        >
          Smooth
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setHasFriction(true); resetDoor(); }}
          disabled={isPushing}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${hasFriction ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-400'}`}
        >
          {'\uD83D\uDD25'} Sticky
        </button>
      </div>

      {/* Slider */}
      <div className="w-full max-w-md mb-6">
        <label className="text-sm text-slate-300 mb-2 block">
          Push position: <span className="text-purple-400 font-semibold">{(pushPosition * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={pushPosition}
          onChange={(e) => { setPushPosition(parseFloat(e.target.value)); resetDoor(); }}
          disabled={isPushing}
          className="w-full accent-purple-500"
        />
      </div>

      <div className="flex gap-3 mb-6">
        {doorAngle === 0 ? (
          <button
            onMouseDown={(e) => { e.preventDefault(); pushDoor(); }}
            disabled={isPushing}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {'\uD83D\uDC46'} Push!
          </button>
        ) : (
          <button
            onMouseDown={(e) => { e.preventDefault(); resetDoor(); }}
            className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600"
          >
            {'\u21BA'} Reset
          </button>
        )}
      </div>

      <p className="text-slate-400 text-sm mb-6">Compare smooth vs sticky hinge forces!</p>

      {experimentCount >= 5 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
        >
          I understand! {'\u2192'}
        </button>
      )}
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="text-5xl mb-4">{'\u2699\uFE0F'}</div>
      <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mb-6">Friction Adds Resistance</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/60 rounded-2xl p-6 max-w-lg w-full border border-amber-500/30 mb-6">
        <p className="text-orange-400 font-semibold text-center text-lg mb-3">
          Friction creates a resisting torque!
        </p>
        <p className="text-slate-300 text-center leading-relaxed">
          You need extra torque to overcome the friction at the hinge. This means more force at any position!
        </p>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 max-w-lg w-full mb-6">
        <p className="text-white text-center">
          <span className="text-emerald-400 font-semibold">Smooth:</span> {'\u03C4'} needed = 15 N-m<br />
          <span className="text-orange-400 font-semibold">Sticky:</span> {'\u03C4'} needed = 30 N-m (2x more!)
        </p>
      </div>

      <p className={`text-sm mb-6 ${twistPrediction === 'more' ? 'text-emerald-400' : 'text-slate-400'}`}>
        Your prediction: {twistPrediction === 'more' ? '\u2713 Correct!' : 'Now you understand!'}
      </p>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
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
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: app.id });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
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
            onMouseDown={(e) => { e.preventDefault(); setActiveApp(Math.max(0, activeApp - 1)); }}
            disabled={activeApp === 0}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
          >
            {'\u2190'} Previous
          </button>

          {activeApp < applications.length - 1 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); setActiveApp(activeApp + 1); }}
              disabled={!completedApps.has(activeApp)}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
            >
              Next {'\u2192'}
            </button>
          ) : allAppsCompleted ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
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
                  onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(idx); }}
                  disabled={isAnswered}
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
            onMouseDown={(e) => {
              e.preventDefault();
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setCurrentQuestion(prev => Math.max(0, prev - 1));
              setSelectedAnswer(null);
              setShowExplanation(answeredQuestions.has(currentQuestion - 1));
            }}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
          >
            {'\u2190'} Back
          </button>

          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
                setShowExplanation(answeredQuestions.has(currentQuestion + 1));
              }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg"
            >
              Next {'\u2192'}
            </button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
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
      setPhase(0);
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
          {passed ? 'Torque Master!' : 'Keep Practicing!'}
        </h2>

        <div className={`text-5xl font-bold mb-2 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>{percentage}%</div>
        <p className="text-slate-400 mb-8">{correctAnswers}/{testQuestions.length} correct answers</p>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 mb-8">
          <h3 className="text-purple-400 font-semibold mb-4">{passed ? 'Concepts Mastered' : 'Key Concepts'}</h3>
          <ul className="text-left space-y-2">
            {[
              '{\\u03C4} = Force x Lever arm',
              'Longer lever arm = less force needed',
              'Door handles maximize leverage',
              'Friction requires extra torque'
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
                onMouseDown={(e) => { e.preventDefault(); handleReturnToDashboard(); }}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-xl"
              >
                {'\uD83C\uDFE0'} Return to Dashboard
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); resetGame(); }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                {'\uD83D\uDD2C'} Review Lesson
              </button>
            </>
          ) : (
            <>
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
                className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                {'\u21BA'} Retake Test
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); resetGame(); }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                {'\uD83D\uDD2C'} Review Lesson
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleReturnToDashboard(); }}
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
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

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
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-purple-400 w-6 shadow-lg shadow-purple-400/30'
                    : phase > p
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
