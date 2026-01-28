/**
 * CLASSIC DC MOTOR RENDERER
 *
 * Secure game demonstrating how commutation keeps DC motors spinning.
 * Shows the relationship between coil position, commutator timing, and torque.
 *
 * KEY SECURITY: Correct answers are stored on the server only.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTestAnswers } from '@/hooks/useSecureTestAnswers';

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'classic_dc_motor';

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

// Questions for test phase - NO correct answers stored here
const questions = [
  {
    scenario: "A simple DC motor has a coil rotating between two permanent magnets.",
    question: "What is the primary purpose of the commutator in a DC motor?",
    options: [
      "To increase the voltage supplied to the coil",
      "To reverse current direction in the coil at the right moment",
      "To create a stronger magnetic field",
      "To reduce friction in the motor"
    ]
  },
  {
    scenario: "The coil in a DC motor is at the position where it's parallel to the magnetic field.",
    question: "What happens to the torque at this position (called the 'dead zone')?",
    options: [
      "Torque is at maximum",
      "Torque is zero",
      "Torque reverses direction",
      "Torque oscillates rapidly"
    ]
  },
  {
    scenario: "You notice your simple paperclip motor sometimes stops and won't restart.",
    question: "What is the most likely cause?",
    options: [
      "The battery is dead",
      "The coil stopped at a dead zone position with poor brush contact",
      "The magnets have demagnetized",
      "The paperclips are too heavy"
    ]
  },
  {
    scenario: "The commutator on a simple motor has two segments with a small gap between them.",
    question: "What happens during the brief moment when the brushes touch the gap?",
    options: [
      "Current increases dramatically",
      "Current is momentarily interrupted, allowing momentum to carry through",
      "The motor reverses direction",
      "Sparks destroy the commutator"
    ]
  },
  {
    scenario: "You're building a simple DC motor and want to increase its speed.",
    question: "Which modification would be most effective?",
    options: [
      "Add more turns to the coil",
      "Use stronger magnets or increase voltage",
      "Make the coil larger in diameter",
      "Use thicker wire"
    ]
  },
  {
    scenario: "In your motor, the coil experiences maximum torque at a certain position.",
    question: "At what angle relative to the magnetic field is torque maximum?",
    options: [
      "When coil plane is parallel to the field (0°)",
      "When coil plane is perpendicular to the field (90°)",
      "At 45° to the field",
      "Torque is constant at all angles"
    ]
  },
  {
    scenario: "A student scrapes only half of the enamel coating off the coil wire.",
    question: "Why is this technique used in simple motors?",
    options: [
      "To reduce the weight of the coil",
      "To create a simple commutator effect - current flows only half the rotation",
      "To increase electrical resistance",
      "To make the coil more flexible"
    ]
  },
  {
    scenario: "You add a second magnet to your motor setup, creating a stronger field.",
    question: "How does this affect the motor's behavior?",
    options: [
      "The motor will spin slower",
      "The motor will have more torque and may start more easily",
      "The motor will overheat immediately",
      "No change in performance"
    ]
  },
  {
    scenario: "The torque equation for a DC motor is τ = nBIA sin(θ), where n is number of turns.",
    question: "What does this equation tell us about increasing torque?",
    options: [
      "Only magnetic field strength matters",
      "Increasing turns, field strength, current, or coil area all increase torque",
      "The angle θ must always be 0°",
      "Current should be minimized for maximum torque"
    ]
  },
  {
    scenario: "Industrial DC motors often have many commutator segments instead of just two.",
    question: "What is the advantage of having more commutator segments?",
    options: [
      "It reduces the cost of the motor",
      "It provides smoother torque with fewer dead zones",
      "It eliminates the need for brushes",
      "It allows the motor to run on AC power"
    ]
  }
];

// Transfer phase applications
const transferApplications = [
  {
    id: 'power_tools',
    title: 'Cordless Power Tools',
    description: 'Drills, saws, and screwdrivers use brushed DC motors for their high torque and simple speed control.',
    fact: 'A typical cordless drill motor can spin at over 20,000 RPM.',
    icon: '🔧'
  },
  {
    id: 'electric_vehicles',
    title: 'Electric Vehicle Motors',
    description: 'Early electric cars used DC motors. Understanding commutation led to modern brushless designs.',
    fact: 'The first electric car (1834) used a simple DC motor similar to what you built.',
    icon: '🚗'
  },
  {
    id: 'starter_motors',
    title: 'Car Starter Motors',
    description: 'Every gasoline car has a DC motor to crank the engine. High torque at low speed is essential.',
    fact: 'Starter motors can draw 200+ amps for a few seconds - enough to weld metal!',
    icon: '🔑'
  },
  {
    id: 'robotics',
    title: 'Robotics Actuators',
    description: 'Small DC motors power robot joints, grippers, and wheels with precise position control.',
    fact: 'Mars rovers use DC motors rated to work at -40°C to +40°C.',
    icon: '🤖'
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

interface ClassicDCMotorRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
}

const ClassicDCMotorRenderer: React.FC<ClassicDCMotorRendererProps> = ({
  onComplete,
  onGameEvent
}) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string>('');
  const [twistPrediction, setTwistPrediction] = useState<string>('');

  // Play phase state
  const [voltage, setVoltage] = useState(50);
  const [magnetCount, setMagnetCount] = useState<1 | 2>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [showCommutator, setShowCommutator] = useState(true);

  // Animation state
  const [coilAngle, setCoilAngle] = useState(0);
  const animationRef = useRef<number>();

  // Test phase state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  // Transfer phase state
  const [completedApps, setCompletedApps] = useState<string[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  // Viewport
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Secure answer validation
  const {
    validateAnswer,
    submitTest,
    isValidating,
    error: validationError
  } = useTestAnswers(GAME_ID, questions);

  // Calculate physics
  const torque = useMemo(() => {
    // τ = nBIA sin(θ)
    const angleRad = (coilAngle * Math.PI) / 180;
    const B = magnetCount === 2 ? 1.5 : 1.0;
    const baseTorque = B * (voltage / 100) * Math.sin(angleRad);
    return baseTorque;
  }, [coilAngle, magnetCount, voltage]);

  const rotationSpeed = useMemo(() => {
    if (!isRunning) return 0;
    return (voltage / 100) * (magnetCount === 2 ? 1.5 : 1.0) * 3;
  }, [isRunning, voltage, magnetCount]);

  // Determine current direction based on commutator position
  const currentDirection = useMemo(() => {
    // Commutator switches at 0° and 180°
    const normalizedAngle = ((coilAngle % 360) + 360) % 360;
    return normalizedAngle < 180 ? 'cw' : 'ccw';
  }, [coilAngle]);

  // Animation loop
  useEffect(() => {
    if (rotationSpeed !== 0) {
      const animate = () => {
        setCoilAngle(prev => (prev + rotationSpeed) % 360);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rotationSpeed]);

  // Sound effects
  const playSound = useCallback((freq: number, duration: number = 0.15) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) { /* silent fail */ }
  }, []);

  // Event emitter
  const emitEvent = useCallback((type: string, data: any = {}) => {
    onGameEvent?.({ type, data: { ...data, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    emitEvent('phase_changed', { phase: newPhase });
    playSound(660, 0.1);
  }, [emitEvent, playSound]);

  // Test handlers
  const handleAnswerSelect = useCallback(async (selectedIndex: number) => {
    if (testAnswers[currentQuestion] !== null || isValidating) return;

    try {
      const result = await validateAnswer(currentQuestion, selectedIndex);

      const newAnswers = [...testAnswers];
      newAnswers[currentQuestion] = selectedIndex;
      setTestAnswers(newAnswers);

      if (result.correct) {
        setTestScore(prev => prev + 1);
        playSound(880, 0.2);
        emitEvent('answer_correct', { question: currentQuestion });
      } else {
        playSound(220, 0.3);
        emitEvent('answer_incorrect', { question: currentQuestion });
      }

      setCurrentExplanation(result.explanation);
      setShowExplanation(true);
    } catch (error) {
      console.error('Failed to validate answer:', error);
    }
  }, [currentQuestion, testAnswers, isValidating, validateAnswer, playSound, emitEvent]);

  const handleNextQuestion = useCallback(() => {
    setShowExplanation(false);
    setCurrentExplanation('');

    if (currentQuestion < 9) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleSubmitTest();
    }
  }, [currentQuestion]);

  const handleSubmitTest = useCallback(async () => {
    try {
      const answers = testAnswers.map(a => a ?? 0);
      const result = await submitTest(answers);

      setTestSubmitted(true);
      setTestScore(result.score);
      setTestPassed(result.passed);

      emitEvent('test_complete', { score: result.score, passed: result.passed });
      goToPhase('mastery');
    } catch (error) {
      console.error('Failed to submit test:', error);
    }
  }, [testAnswers, submitTest, emitEvent, goToPhase]);

  // ============================================================
  // VISUALIZATION COMPONENT
  // ============================================================

  const renderMotorVisualization = () => {
    const width = isMobile ? 350 : 700;
    const height = isMobile ? 320 : 400;
    const cx = width / 2;
    const cy = height / 2;

    // Coil dimensions
    const coilWidth = isMobile ? 60 : 100;
    const coilHeight = isMobile ? 40 : 70;
    const angleRad = (coilAngle * Math.PI) / 180;

    // Torque visualization
    const torqueAbs = Math.abs(torque);
    const torqueBarHeight = torqueAbs * (isMobile ? 60 : 100);

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          {/* Magnet gradients */}
          <linearGradient id="magnetNorth" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="magnetSouth" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Copper coil gradient */}
          <linearGradient id="copperCoil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Commutator gradient */}
          <linearGradient id="commutatorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Brush gradient */}
          <linearGradient id="brushGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Shaft gradient */}
          <linearGradient id="shaftGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" />

        {/* Magnetic field lines */}
        {[...Array(5)].map((_, i) => {
          const y = cy - 60 + i * 30;
          return (
            <g key={`field-${i}`}>
              <line
                x1={cx - (isMobile ? 120 : 200)}
                y1={y}
                x2={cx + (isMobile ? 120 : 200)}
                y2={y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="6,4"
                opacity="0.3"
              />
              {/* Arrow heads */}
              <polygon
                points={`${cx + (isMobile ? 100 : 180)},${y - 4} ${cx + (isMobile ? 100 : 180)},${y + 4} ${cx + (isMobile ? 110 : 195)},${y}`}
                fill="#94a3b8"
                opacity="0.4"
              />
            </g>
          );
        })}

        {/* Left Magnet (North) */}
        <g transform={`translate(${cx - (isMobile ? 130 : 220)}, ${cy - 60})`}>
          <rect
            x="0"
            y="0"
            width={isMobile ? 35 : 50}
            height="120"
            rx="4"
            fill="url(#magnetNorth)"
            stroke="#fca5a5"
            strokeWidth="2"
          />
          <text x={isMobile ? 17 : 25} y="65" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">N</text>
        </g>

        {/* Right Magnet (South) */}
        <g transform={`translate(${cx + (isMobile ? 95 : 170)}, ${cy - 60})`}>
          <rect
            x="0"
            y="0"
            width={isMobile ? 35 : 50}
            height="120"
            rx="4"
            fill="url(#magnetSouth)"
            stroke="#93c5fd"
            strokeWidth="2"
          />
          <text x={isMobile ? 17 : 25} y="65" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">S</text>
        </g>

        {/* Second magnet pair (if enabled) */}
        {magnetCount === 2 && (
          <>
            <g transform={`translate(${cx - (isMobile ? 130 : 220)}, ${cy - 60})`}>
              <rect
                x={isMobile ? -25 : -35}
                y="20"
                width={isMobile ? 20 : 30}
                height="80"
                rx="3"
                fill="url(#magnetNorth)"
                stroke="#fca5a5"
                strokeWidth="1"
                opacity="0.7"
              />
            </g>
            <g transform={`translate(${cx + (isMobile ? 95 : 170)}, ${cy - 60})`}>
              <rect
                x={isMobile ? 40 : 55}
                y="20"
                width={isMobile ? 20 : 30}
                height="80"
                rx="3"
                fill="url(#magnetSouth)"
                stroke="#93c5fd"
                strokeWidth="1"
                opacity="0.7"
              />
            </g>
          </>
        )}

        {/* Rotating Coil */}
        <g transform={`translate(${cx}, ${cy}) rotate(${coilAngle})`}>
          {/* Coil rectangle */}
          <rect
            x={-coilWidth / 2}
            y={-coilHeight / 2}
            width={coilWidth}
            height={coilHeight}
            rx="4"
            fill="none"
            stroke="url(#copperCoil)"
            strokeWidth={isMobile ? 6 : 10}
          />

          {/* Current direction arrows on coil */}
          {isRunning && (
            <>
              {/* Top of coil */}
              <polygon
                points={`${currentDirection === 'cw' ? -10 : 10},-${coilHeight / 2} 0,-${coilHeight / 2 - 8} ${currentDirection === 'cw' ? 10 : -10},-${coilHeight / 2}`}
                fill="#fbbf24"
              />
              {/* Bottom of coil */}
              <polygon
                points={`${currentDirection === 'cw' ? 10 : -10},${coilHeight / 2} 0,${coilHeight / 2 + 8} ${currentDirection === 'cw' ? -10 : 10},${coilHeight / 2}`}
                fill="#fbbf24"
              />
            </>
          )}

          {/* Shaft */}
          <rect
            x="-4"
            y={-coilHeight / 2 - 30}
            width="8"
            height={coilHeight + 60}
            fill="url(#shaftGradient)"
          />
        </g>

        {/* Force arrows showing torque */}
        {isRunning && Math.abs(torque) > 0.1 && (
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Force on top wire */}
            <line
              x1={coilWidth / 2 * Math.cos(angleRad)}
              y1={-coilHeight / 2 * Math.cos(angleRad)}
              x2={coilWidth / 2 * Math.cos(angleRad) + 30 * torque}
              y2={-coilHeight / 2 * Math.cos(angleRad)}
              stroke="#22c55e"
              strokeWidth="3"
            />
            {/* Force on bottom wire */}
            <line
              x1={-coilWidth / 2 * Math.cos(angleRad)}
              y1={coilHeight / 2 * Math.cos(angleRad)}
              x2={-coilWidth / 2 * Math.cos(angleRad) - 30 * torque}
              y2={coilHeight / 2 * Math.cos(angleRad)}
              stroke="#22c55e"
              strokeWidth="3"
            />
            <text x={isMobile ? 60 : 90} y="-30" fill="#22c55e" fontSize="12" fontWeight="bold">F</text>
          </g>
        )}

        {/* Commutator and Brushes */}
        {showCommutator && (
          <g transform={`translate(${cx}, ${cy + (isMobile ? 70 : 100)})`}>
            {/* Commutator segments (rotating with coil) */}
            <g transform={`rotate(${coilAngle})`}>
              {/* Left segment */}
              <path
                d={`M -15,-12 A 15,15 0 0,1 15,-12 L 12,-12 A 12,12 0 0,0 -12,-12 Z`}
                fill="url(#commutatorGradient)"
                stroke="#92400e"
                strokeWidth="1"
              />
              {/* Right segment */}
              <path
                d={`M -15,12 A 15,15 0 0,0 15,12 L 12,12 A 12,12 0 0,1 -12,12 Z`}
                fill="url(#commutatorGradient)"
                stroke="#92400e"
                strokeWidth="1"
              />
              {/* Gap indicators */}
              <rect x="-2" y="-15" width="4" height="30" fill="#0f172a" />
            </g>

            {/* Static Brushes */}
            <rect x="-25" y="-6" width="8" height="12" rx="1" fill="url(#brushGradient)" />
            <rect x="17" y="-6" width="8" height="12" rx="1" fill="url(#brushGradient)" />

            {/* Brush connections */}
            <line x1="-29" y1="0" x2="-40" y2="0" stroke="#ef4444" strokeWidth="2" />
            <line x1="25" y1="0" x2="40" y2="0" stroke="#3b82f6" strokeWidth="2" />

            {/* Labels */}
            <text x="-45" y="5" fill="#ef4444" fontSize="10" fontWeight="bold">+</text>
            <text x="42" y="5" fill="#3b82f6" fontSize="10" fontWeight="bold">−</text>
          </g>
        )}

        {/* Torque vs Angle Graph */}
        <g transform={`translate(${isMobile ? 20 : 40}, ${height - (isMobile ? 80 : 100)})`}>
          <rect x="0" y="0" width={isMobile ? 80 : 120} height={isMobile ? 50 : 70} fill="#1e293b" rx="4" />
          <text x={isMobile ? 40 : 60} y="12" textAnchor="middle" fill="#94a3b8" fontSize="9">Torque vs Angle</text>

          {/* Sine wave */}
          <path
            d={`M 5,${isMobile ? 30 : 40} ${[...Array(isMobile ? 70 : 110)].map((_, i) => {
              const x = 5 + i;
              const angle = (i / (isMobile ? 70 : 110)) * 2 * Math.PI;
              const y = (isMobile ? 30 : 40) - Math.sin(angle) * (isMobile ? 12 : 18);
              return `L ${x},${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
          />

          {/* Current position marker */}
          <circle
            cx={5 + ((coilAngle % 360) / 360) * (isMobile ? 70 : 110)}
            cy={(isMobile ? 30 : 40) - torque * (isMobile ? 12 : 18)}
            r="4"
            fill="#fbbf24"
          />
        </g>

        {/* Commutator timing overlay */}
        <g transform={`translate(${width - (isMobile ? 100 : 160)}, ${height - (isMobile ? 80 : 100)})`}>
          <rect x="0" y="0" width={isMobile ? 80 : 120} height={isMobile ? 50 : 70} fill="#1e293b" rx="4" />
          <text x={isMobile ? 40 : 60} y="12" textAnchor="middle" fill="#94a3b8" fontSize="9">Current Direction</text>

          {/* Current direction indicator */}
          <rect
            x="10"
            y="20"
            width={isMobile ? 25 : 45}
            height={isMobile ? 20 : 30}
            rx="3"
            fill={currentDirection === 'cw' ? '#22c55e' : '#64748b'}
          />
          <text x={isMobile ? 22 : 32} y={isMobile ? 34 : 40} textAnchor="middle" fill="white" fontSize="8">CW</text>

          <rect
            x={isMobile ? 45 : 65}
            y="20"
            width={isMobile ? 25 : 45}
            height={isMobile ? 20 : 30}
            rx="3"
            fill={currentDirection === 'ccw' ? '#22c55e' : '#64748b'}
          />
          <text x={isMobile ? 57 : 87} y={isMobile ? 34 : 40} textAnchor="middle" fill="white" fontSize="8">CCW</text>
        </g>

        {/* Labels */}
        <text x={cx} y="25" textAnchor="middle" fill="#e2e8f0" fontSize={isMobile ? 14 : 18} fontWeight="bold">
          Classic DC Motor
        </text>

        {isRunning && (
          <text x={cx} y="50" textAnchor="middle" fill="#94a3b8" fontSize="12">
            Angle: {Math.round(coilAngle % 360)}° | Torque: {torque.toFixed(2)}
          </text>
        )}

        {/* Formula */}
        <text x={cx} y={height - 15} textAnchor="middle" fill="#64748b" fontSize="11">
          τ = nBIA sin(θ)
        </text>
      </svg>
    );
  };

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderHookPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="text-6xl mb-6">⚙️🔄</div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
        How does a motor keep pushing the same way every turn?
      </h2>
      <p className="text-lg text-slate-600 mb-8 max-w-xl">
        If a magnetic force pushes a coil one way, why doesn't it push it back the other way a moment later?
      </p>
      <button
        onClick={() => goToPhase('predict')}
        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all shadow-lg hover:shadow-xl"
      >
        Discover the Secret →
      </button>
    </div>
  );

  const renderPredictPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-600 mb-6 text-center max-w-xl">
        In a simple motor with a coil between two magnets, what keeps the coil spinning in the same direction?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { id: 'momentum', text: 'Just momentum - it keeps spinning after a push', icon: '🎯' },
          { id: 'commutator', text: 'A commutator flips current direction at the right time', icon: '🔄' },
          { id: 'magnet', text: 'The magnets rotate with the coil', icon: '🧲' },
          { id: 'ac', text: 'The electricity naturally reverses (like AC)', icon: '⚡' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              setPrediction(option.id);
              playSound(440, 0.1);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <span className="text-slate-700">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onClick={() => goToPhase('play')}
          className="mt-8 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlayPhase = () => (
    <div className="p-4 md:p-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Build Your DC Motor</h2>
        <p className="text-slate-600 text-sm">Watch how the commutator keeps the torque aligned</p>
      </div>

      {renderMotorVisualization()}

      {/* Controls */}
      <div className="mt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Voltage (Speed)</span>
            <span className="text-indigo-600">{voltage}%</span>
          </label>
          <input
            type="range"
            min="20"
            max="100"
            value={voltage}
            onChange={(e) => setVoltage(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setIsRunning(!isRunning);
              playSound(isRunning ? 330 : 550, 0.2);
              emitEvent(isRunning ? 'motor_stopped' : 'motor_started', { voltage, magnetCount });
            }}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isRunning ? '⏹ STOP' : '▶ START'}
          </button>

          <button
            onClick={() => setShowCommutator(!showCommutator)}
            className={`px-4 py-3 rounded-xl font-bold transition-all ${
              showCommutator
                ? 'bg-amber-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {showCommutator ? '👁 Hide' : '👁 Show'} Commutator
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="mt-6 text-center">
          <p className="text-green-600 font-medium">
            Watch the torque graph! The commutator reverses current at the dead zones (0° and 180°).
          </p>
          <button
            onClick={() => goToPhase('review')}
            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
          >
            Understand Commutation →
          </button>
        </div>
      )}
    </div>
  );

  const renderReviewPhase = () => (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">The Magic of Commutation</h2>

      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-blue-800 mb-2">What's Happening</h3>
          <p className="text-blue-900">
            As the coil rotates, the torque from the magnetic force follows a sine wave - positive half the
            time, negative half the time. Without commutation, the coil would just oscillate back and forth!
          </p>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-green-800 mb-2">The Commutator's Job</h3>
          <p className="text-green-900">
            The commutator is a mechanical switch that <strong>reverses the current direction</strong> exactly
            when torque would become negative. This keeps the torque always positive (or always negative),
            creating continuous rotation instead of oscillation.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-amber-800 mb-2">Dead Zones</h3>
          <p className="text-amber-900">
            At 0° and 180°, torque is zero (sin(0) = 0). This is why simple motors sometimes stall - if they
            stop at a dead zone, they can't restart. The coil's momentum carries it through these points.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => goToPhase('twist_predict')}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all"
        >
          Try a Twist →
        </button>
      </div>
    </div>
  );

  const renderTwistPredictPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 text-center">
        Twist: Add a Second Magnet!
      </h2>
      <p className="text-slate-600 mb-6 text-center max-w-xl">
        What do you think will happen if you add a second magnet to make the magnetic field stronger?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { id: 'slower', text: 'The motor will spin slower due to extra weight', icon: '🐢' },
          { id: 'faster', text: 'The motor will have more torque and start easier', icon: '💪' },
          { id: 'stop', text: 'The motor will stop - too much magnetic force', icon: '⏹' },
          { id: 'same', text: 'No change - strength doesn\'t matter', icon: '➡️' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              playSound(440, 0.1);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-slate-200 hover:border-purple-300'
            }`}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <span className="text-slate-700">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onClick={() => goToPhase('twist_play')}
          className="mt-8 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-lg font-bold transition-all"
        >
          Test It →
        </button>
      )}
    </div>
  );

  const renderTwistPlayPhase = () => (
    <div className="p-4 md:p-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Test with Extra Magnets</h2>
        <p className="text-slate-600 text-sm">Toggle between 1 and 2 magnets to see the difference</p>
      </div>

      {renderMotorVisualization()}

      {/* Controls */}
      <div className="mt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <label className="text-sm font-medium text-slate-700 mb-3 block text-center">
            Number of Magnets
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setMagnetCount(1);
                playSound(440, 0.1);
                emitEvent('magnet_changed', { count: 1 });
              }}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                magnetCount === 1
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-indigo-100'
              }`}
            >
              1 Magnet
            </button>
            <button
              onClick={() => {
                setMagnetCount(2);
                playSound(550, 0.1);
                emitEvent('magnet_changed', { count: 2 });
              }}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                magnetCount === 2
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-indigo-100'
              }`}
            >
              2 Magnets
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setIsRunning(!isRunning);
            playSound(isRunning ? 330 : 550, 0.2);
          }}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
            isRunning
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isRunning ? '⏹ STOP' : '▶ START'}
        </button>
      </div>

      {isRunning && (
        <div className="mt-6 text-center">
          <p className="text-purple-600 font-medium">
            With {magnetCount} magnet{magnetCount > 1 ? 's' : ''}: Torque is {magnetCount === 2 ? '50% stronger!' : 'at baseline.'}
          </p>
          <button
            onClick={() => goToPhase('twist_review')}
            className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
          >
            See the Explanation →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistReviewPhase = () => (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Stronger Magnets = More Torque</h2>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl mb-6">
        <h3 className="font-bold text-purple-800 mb-3 text-lg">Why It Works</h3>
        <p className="text-purple-900 mb-4">
          The torque equation <strong>τ = nBIA sin(θ)</strong> shows that torque is directly proportional
          to magnetic field strength (B). Double the field, double the torque!
        </p>
        <p className="text-purple-900">
          With more torque, the motor can:
        </p>
        <ul className="list-disc list-inside text-purple-900 mt-2 space-y-1">
          <li>Start more easily from dead zones</li>
          <li>Overcome more resistance</li>
          <li>Accelerate faster</li>
        </ul>
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-6">
        <h4 className="font-bold text-slate-700 mb-2">Real-World Application</h4>
        <p className="text-slate-600">
          This is why powerful motors use strong permanent magnets or electromagnets. Neodymium magnets
          revolutionized motor design by providing very strong fields in small packages.
        </p>
      </div>

      <div className="text-center">
        <button
          onClick={() => goToPhase('transfer')}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all"
        >
          See Real-World Applications →
        </button>
      </div>
    </div>
  );

  const renderTransferPhase = () => (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Real-World Applications</h2>
      <p className="text-slate-600 text-center mb-8">
        DC motors are everywhere! Explore these applications to unlock the test.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {transferApplications.map((app, index) => {
          const isUnlocked = index === 0 || completedApps.includes(transferApplications[index - 1].id);
          const isCompleted = completedApps.includes(app.id);

          return (
            <button
              key={app.id}
              onClick={() => {
                if (isUnlocked && !isCompleted) {
                  setSelectedApp(app.id);
                  playSound(550, 0.1);
                }
              }}
              disabled={!isUnlocked}
              className={`p-6 rounded-xl text-left transition-all ${
                isCompleted
                  ? 'bg-green-100 border-2 border-green-500'
                  : isUnlocked
                    ? 'bg-white border-2 border-slate-200 hover:border-indigo-400 cursor-pointer'
                    : 'bg-slate-100 border-2 border-slate-200 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{app.icon}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{app.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{app.description}</p>
                  {isCompleted && (
                    <span className="inline-block mt-2 text-green-600 text-sm font-medium">✓ Completed</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected app detail modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            {(() => {
              const app = transferApplications.find(a => a.id === selectedApp)!;
              return (
                <>
                  <div className="text-center mb-6">
                    <span className="text-6xl">{app.icon}</span>
                    <h3 className="text-2xl font-bold text-slate-800 mt-4">{app.title}</h3>
                  </div>
                  <p className="text-slate-600 mb-4">{app.description}</p>
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6">
                    <p className="text-amber-900 font-medium">💡 {app.fact}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCompletedApps(prev => [...prev, app.id]);
                      setSelectedApp(null);
                      playSound(880, 0.2);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
                  >
                    Got It! →
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {completedApps.length === transferApplications.length && (
        <div className="text-center">
          <button
            onClick={() => goToPhase('test')}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-lg font-bold transition-all"
          >
            Take the Test →
          </button>
        </div>
      )}
    </div>
  );

  const renderTestPhase = () => {
    const question = questions[currentQuestion];

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  testAnswers[i] !== null
                    ? 'bg-green-500 text-white'
                    : i === currentQuestion
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-slate-600 text-sm">{question.scenario}</p>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-4">{question.question}</h3>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = testAnswers[currentQuestion] === index;
            const isDisabled = testAnswers[currentQuestion] !== null || isValidating;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isDisabled}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-300'
                } ${isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="font-bold text-indigo-600 mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {isValidating && (
          <div className="mt-4 text-center text-slate-600">Checking answer...</div>
        )}

        {showExplanation && (
          <div className="mt-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
            <h4 className="font-bold text-amber-800 mb-2">Explanation</h4>
            <p className="text-amber-900">{currentExplanation}</p>
            <button
              onClick={handleNextQuestion}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all"
            >
              {currentQuestion < 9 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        )}

        {validationError && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
            <p className="text-red-800">{validationError}</p>
          </div>
        )}
      </div>
    );
  };

  const renderMasteryPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="text-6xl mb-6">{testPassed ? '🏆' : '📚'}</div>
      <h2 className="text-3xl font-bold text-slate-800 mb-4">
        {testPassed ? 'Congratulations!' : 'Keep Learning!'}
      </h2>
      <div className="text-6xl font-bold text-indigo-600 mb-4">{testScore}/10</div>
      <p className="text-lg text-slate-600 mb-8">
        {testPassed
          ? 'You have mastered DC motor principles! You understand commutation, torque, and motor design.'
          : 'You need 7/10 to pass. Review the lesson and try again to master this concept.'}
      </p>
      <div className="flex gap-4">
        {!testPassed && (
          <button
            onClick={() => {
              setPhase('hook');
              setCurrentQuestion(0);
              setTestAnswers(Array(10).fill(null));
              setTestScore(0);
              setTestSubmitted(false);
              setCompletedApps([]);
            }}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all"
          >
            Review Lesson
          </button>
        )}
        <button
          onClick={() => {
            onComplete?.();
            window.dispatchEvent(new CustomEvent('returnToDashboard'));
          }}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{
            width: `${(['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].indexOf(phase) + 1) * 10}%`
          }}
        />
      </div>

      {/* Phase content */}
      {phase === 'hook' && renderHookPhase()}
      {phase === 'predict' && renderPredictPhase()}
      {phase === 'play' && renderPlayPhase()}
      {phase === 'review' && renderReviewPhase()}
      {phase === 'twist_predict' && renderTwistPredictPhase()}
      {phase === 'twist_play' && renderTwistPlayPhase()}
      {phase === 'twist_review' && renderTwistReviewPhase()}
      {phase === 'transfer' && renderTransferPhase()}
      {phase === 'test' && renderTestPhase()}
      {phase === 'mastery' && renderMasteryPhase()}
    </div>
  );
};

export default ClassicDCMotorRenderer;
