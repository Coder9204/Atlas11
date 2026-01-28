/**
 * HOMOPOLAR MOTOR RENDERER
 *
 * Secure game demonstrating the simplest motor on Earth.
 * Uses Lorentz force (F = BIL) to create continuous rotation.
 *
 * KEY SECURITY: Correct answers are stored on the server only.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTestAnswers } from '@/hooks/useSecureTestAnswers';

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'homopolar_motor';

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
    scenario: "A homopolar motor is built with an AA battery, a strong neodymium magnet, and a copper wire loop.",
    question: "What fundamental force causes the wire to spin?",
    options: [
      "Gravitational force between the wire and magnet",
      "Lorentz force on current-carrying wire in magnetic field",
      "Electrostatic repulsion between charges",
      "Magnetic attraction between wire and magnet"
    ]
  },
  {
    scenario: "The copper wire in a homopolar motor carries current from the battery's positive terminal through the magnet to the negative terminal.",
    question: "Why does the wire experience a continuous torque rather than just a single push?",
    options: [
      "The wire's momentum keeps it spinning",
      "Current direction is always radial while magnetic field is axial, creating consistent tangential force",
      "The battery pulses current on and off rapidly",
      "The magnet rotates with the wire"
    ]
  },
  {
    scenario: "You flip the neodymium magnet so its north pole faces the battery instead of south.",
    question: "What happens to the motor's rotation?",
    options: [
      "The motor stops completely",
      "The motor spins faster due to stronger field",
      "The motor reverses direction",
      "Nothing changes - polarity doesn't matter"
    ]
  },
  {
    scenario: "A student tries to build a homopolar motor but uses a plastic-coated wire.",
    question: "Why doesn't the motor work?",
    options: [
      "Plastic is too heavy for the motor to spin",
      "Plastic insulation prevents electrical contact with the battery",
      "Plastic generates static electricity that opposes motion",
      "The motor would work fine - plastic doesn't affect it"
    ]
  },
  {
    scenario: "The Lorentz force on a current-carrying wire is given by F = BIL.",
    question: "If you double the current through the wire, what happens to the force?",
    options: [
      "Force stays the same",
      "Force doubles",
      "Force quadruples",
      "Force is halved"
    ]
  },
  {
    scenario: "You want to make your homopolar motor spin faster.",
    question: "Which modification would be most effective?",
    options: [
      "Use a longer wire loop",
      "Use a stronger magnet",
      "Add more weight to the wire",
      "Cool the battery in ice"
    ]
  },
  {
    scenario: "During operation, the battery gets warm after a few minutes.",
    question: "Why does this happen?",
    options: [
      "The magnet generates heat through induction",
      "The wire has resistance, converting electrical energy to heat",
      "The spinning motion creates friction with air",
      "Chemical reactions in the battery slow down when cold"
    ]
  },
  {
    scenario: "A homopolar motor is different from a conventional DC motor in that it has no commutator.",
    question: "Why doesn't a homopolar motor need a commutator?",
    options: [
      "Because it uses AC power instead of DC",
      "Because current flows in a constant radial direction, not through coils",
      "Because the magnet provides all the switching",
      "Because the wire is perfectly balanced"
    ]
  },
  {
    scenario: "You're designing a homopolar motor for maximum torque.",
    question: "What geometry maximizes the torque at the point where current crosses the magnetic field?",
    options: [
      "Current and magnetic field should be parallel",
      "Current and magnetic field should be perpendicular",
      "Current should spiral around the magnetic field",
      "Current should oscillate back and forth"
    ]
  },
  {
    scenario: "Homopolar motors are rarely used in practical applications despite their simplicity.",
    question: "What is the main disadvantage of homopolar motors?",
    options: [
      "They can only spin in one direction",
      "They require very high voltages",
      "They have low efficiency and require high currents for useful torque",
      "They only work with rare earth magnets"
    ]
  }
];

// Transfer phase applications
const transferApplications = [
  {
    id: 'rail_guns',
    title: 'Electromagnetic Rail Guns',
    description: 'Naval weapons use the same Lorentz force principle to accelerate projectiles to hypersonic speeds without explosives.',
    fact: 'The US Navy rail gun can launch projectiles at Mach 6 (over 4,500 mph).',
    icon: '🚀'
  },
  {
    id: 'mri_machines',
    title: 'MRI Machine Gradient Coils',
    description: 'MRI machines use homopolar motor principles in gradient coils to create varying magnetic fields for imaging.',
    fact: 'MRI gradient coils can switch magnetic fields thousands of times per second.',
    icon: '🏥'
  },
  {
    id: 'welding',
    title: 'Homopolar Welding',
    description: 'Industrial welding uses homopolar generators to deliver massive current pulses for joining metals.',
    fact: 'Homopolar welders can deliver over 1 million amperes in milliseconds.',
    icon: '⚡'
  },
  {
    id: 'faraday_disk',
    title: 'Faraday Disk Generator',
    description: 'The reverse of a homopolar motor - spinning a disk in a magnetic field generates DC electricity directly.',
    fact: 'Michael Faraday invented the first homopolar generator in 1831.',
    icon: '🔬'
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

interface HomopolarMotorRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
}

const HomopolarMotorRenderer: React.FC<HomopolarMotorRendererProps> = ({
  onComplete,
  onGameEvent
}) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string>('');
  const [twistPrediction, setTwistPrediction] = useState<string>('');

  // Play phase state
  const [magnetStrength, setMagnetStrength] = useState(80);
  const [wireThickness, setWireThickness] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [magnetPolarity, setMagnetPolarity] = useState<'north' | 'south'>('north');

  // Animation state
  const [wireAngle, setWireAngle] = useState(0);
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
  const rotationSpeed = useMemo(() => {
    if (!isRunning) return 0;
    const baseSpeed = (magnetStrength / 100) * (wireThickness / 100) * 4;
    return magnetPolarity === 'north' ? baseSpeed : -baseSpeed;
  }, [isRunning, magnetStrength, wireThickness, magnetPolarity]);

  // Animation loop
  useEffect(() => {
    if (rotationSpeed !== 0) {
      const animate = () => {
        setWireAngle(prev => (prev + rotationSpeed) % 360);
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
    const height = isMobile ? 280 : 350;
    const cx = width / 2;
    const cy = height / 2 + 20;

    // Calculate wire position
    const wireRadius = isMobile ? 60 : 100;
    const angleRad = (wireAngle * Math.PI) / 180;
    const wireX1 = cx + wireRadius * Math.cos(angleRad);
    const wireY1 = cy + wireRadius * Math.sin(angleRad);
    const wireX2 = cx - wireRadius * Math.cos(angleRad);
    const wireY2 = cy - wireRadius * Math.sin(angleRad);

    // Force arrow calculation
    const forceStrength = isRunning ? magnetStrength * wireThickness / 1000 : 0;
    const forceAngle = angleRad + Math.PI / 2 * (magnetPolarity === 'north' ? 1 : -1);

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          {/* Battery gradient */}
          <linearGradient id="batteryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="50%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#1a202c" />
          </linearGradient>

          {/* Positive terminal gradient */}
          <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Negative terminal gradient */}
          <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Magnet gradient - North */}
          <radialGradient id="magnetNorthGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Magnet gradient - South */}
          <radialGradient id="magnetSouthGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>

          {/* Copper wire gradient */}
          <linearGradient id="copperGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Glow filter for running motor */}
          <filter id="motorGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Magnetic field lines pattern */}
          <marker id="fieldArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={magnetPolarity === 'north' ? '#ef4444' : '#3b82f6'} opacity="0.6" />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" />

        {/* Magnetic field lines (radial from magnet) */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * Math.PI) / 4;
          const startR = isMobile ? 35 : 55;
          const endR = isMobile ? 90 : 140;
          return (
            <line
              key={`field-${i}`}
              x1={cx + startR * Math.cos(angle)}
              y1={cy + startR * Math.sin(angle)}
              x2={cx + endR * Math.cos(angle)}
              y2={cy + endR * Math.sin(angle)}
              stroke={magnetPolarity === 'north' ? '#ef4444' : '#3b82f6'}
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.4"
              markerEnd="url(#fieldArrow)"
            />
          );
        })}

        {/* AA Battery (vertical) */}
        <g transform={`translate(${cx}, ${cy - (isMobile ? 80 : 120)})`}>
          {/* Battery body */}
          <rect
            x="-15"
            y="0"
            width="30"
            height={isMobile ? 60 : 80}
            rx="4"
            fill="url(#batteryGradient)"
            stroke="#64748b"
            strokeWidth="1"
          />

          {/* Positive terminal (bump) */}
          <rect
            x="-6"
            y="-8"
            width="12"
            height="10"
            rx="2"
            fill="url(#positiveGradient)"
          />
          <text x="0" y="-12" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">+</text>

          {/* Battery label */}
          <text x="0" y={isMobile ? 35 : 45} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">AA</text>
          <text x="0" y={isMobile ? 45 : 57} textAnchor="middle" fill="#94a3b8" fontSize="6">1.5V</text>
        </g>

        {/* Neodymium Magnet (disk at bottom of battery) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={isMobile ? 30 : 50}
          ry={isMobile ? 12 : 18}
          fill={magnetPolarity === 'north' ? 'url(#magnetNorthGradient)' : 'url(#magnetSouthGradient)'}
          stroke={magnetPolarity === 'north' ? '#fca5a5' : '#93c5fd'}
          strokeWidth="2"
        />

        {/* Magnet label */}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill="white"
          fontSize={isMobile ? 10 : 14}
          fontWeight="bold"
        >
          {magnetPolarity === 'north' ? 'N' : 'S'}
        </text>

        {/* Copper Wire Loop */}
        <g filter={isRunning ? 'url(#motorGlow)' : undefined}>
          {/* Main wire arc */}
          <path
            d={`M ${wireX1} ${wireY1 - 30}
                Q ${cx} ${cy - (isMobile ? 60 : 90)} ${wireX2} ${wireY2 - 30}
                L ${wireX2} ${wireY2}
                Q ${cx} ${cy + (isMobile ? 20 : 30)} ${wireX1} ${wireY1}
                Z`}
            fill="none"
            stroke="url(#copperGradient)"
            strokeWidth={3 + wireThickness / 25}
            strokeLinecap="round"
          />

          {/* Wire contact points (sparks when running) */}
          {isRunning && (
            <>
              <circle
                cx={wireX1}
                cy={wireY1}
                r="4"
                fill="#fef08a"
                opacity={0.5 + 0.5 * Math.sin(wireAngle * 0.1)}
              />
              <circle
                cx={wireX2}
                cy={wireY2}
                r="4"
                fill="#fef08a"
                opacity={0.5 + 0.5 * Math.cos(wireAngle * 0.1)}
              />
            </>
          )}
        </g>

        {/* Lorentz Force Arrow (when running) */}
        {isRunning && forceStrength > 0 && (
          <g transform={`translate(${wireX1}, ${wireY1})`}>
            <line
              x1="0"
              y1="0"
              x2={40 * forceStrength * Math.cos(forceAngle)}
              y2={40 * forceStrength * Math.sin(forceAngle)}
              stroke="#22c55e"
              strokeWidth="3"
              markerEnd="url(#forceArrow)"
            />
            <marker id="forceArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L0,8 L8,4 z" fill="#22c55e" />
            </marker>
            <text
              x={50 * forceStrength * Math.cos(forceAngle)}
              y={50 * forceStrength * Math.sin(forceAngle)}
              fill="#22c55e"
              fontSize="12"
              fontWeight="bold"
            >
              F
            </text>
          </g>
        )}

        {/* Current direction indicator */}
        {isRunning && (
          <g>
            <text
              x={cx + (isMobile ? 80 : 130)}
              y={cy - 10}
              fill="#fbbf24"
              fontSize="11"
            >
              I (current)
            </text>
            <path
              d={`M ${cx + (isMobile ? 60 : 100)} ${cy} L ${cx + (isMobile ? 75 : 120)} ${cy}`}
              stroke="#fbbf24"
              strokeWidth="2"
              markerEnd="url(#currentArrow)"
            />
            <marker id="currentArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#fbbf24" />
            </marker>
          </g>
        )}

        {/* Labels */}
        <g className="labels">
          {/* Title */}
          <text
            x={cx}
            y={isMobile ? 20 : 25}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={isMobile ? 14 : 18}
            fontWeight="bold"
          >
            Homopolar Motor
          </text>

          {/* Speed indicator */}
          {isRunning && (
            <text
              x={cx}
              y={height - 15}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="12"
            >
              Speed: {Math.abs(rotationSpeed * 60).toFixed(0)} RPM | Direction: {rotationSpeed > 0 ? 'CW' : 'CCW'}
            </text>
          )}

          {/* Formula */}
          <text
            x={isMobile ? 10 : 15}
            y={height - 15}
            fill="#64748b"
            fontSize="11"
          >
            F = B × I × L (Lorentz Force)
          </text>
        </g>
      </svg>
    );
  };

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderHookPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="text-6xl mb-6">🔋⚡</div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
        Can a motor spin with no coils or commutator?
      </h2>
      <p className="text-lg text-slate-600 mb-8 max-w-xl">
        What if you could build the world's simplest motor with just a battery, a magnet, and a piece of wire?
      </p>
      <button
        onClick={() => goToPhase('predict')}
        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all shadow-lg hover:shadow-xl"
      >
        Let's Find Out →
      </button>
    </div>
  );

  const renderPredictPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-600 mb-6 text-center max-w-xl">
        If you attach a copper wire to an AA battery sitting on a strong magnet, what will happen to the wire?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { id: 'nothing', text: 'Nothing - the wire stays still', icon: '🚫' },
          { id: 'spark', text: 'The wire sparks and heats up only', icon: '✨' },
          { id: 'spin', text: 'The wire spins continuously', icon: '🔄' },
          { id: 'jump', text: 'The wire jumps once then stops', icon: '⬆️' }
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
        <h2 className="text-xl font-bold text-slate-800">Build Your Homopolar Motor</h2>
        <p className="text-slate-600 text-sm">Adjust the controls and press START to run the motor</p>
      </div>

      {renderMotorVisualization()}

      {/* Controls */}
      <div className="mt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Magnet Strength</span>
            <span className="text-indigo-600">{magnetStrength}%</span>
          </label>
          <input
            type="range"
            min="20"
            max="100"
            value={magnetStrength}
            onChange={(e) => setMagnetStrength(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Wire Thickness</span>
            <span className="text-amber-600">{wireThickness}%</span>
          </label>
          <input
            type="range"
            min="20"
            max="100"
            value={wireThickness}
            onChange={(e) => setWireThickness(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setIsRunning(!isRunning);
              playSound(isRunning ? 330 : 550, 0.2);
              emitEvent(isRunning ? 'motor_stopped' : 'motor_started', { magnetStrength, wireThickness });
            }}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isRunning ? '⏹ STOP' : '▶ START'}
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="mt-6 text-center">
          <p className="text-green-600 font-medium">
            The wire spins continuously! The Lorentz force creates a constant torque.
          </p>
          <button
            onClick={() => goToPhase('review')}
            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
          >
            Understand Why →
          </button>
        </div>
      )}
    </div>
  );

  const renderReviewPhase = () => (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Why Does It Spin?</h2>

      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-blue-800 mb-2">What Happened</h3>
          <p className="text-blue-900">
            When current flows through the wire in the presence of the magnetic field, each part of the wire
            experiences a Lorentz force (F = BIL). Because the current is radial and the magnetic field is
            axial, the force is tangential - creating continuous rotation.
          </p>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-green-800 mb-2">Why It Works</h3>
          <p className="text-green-900">
            This is the <strong>homopolar motor</strong> - the simplest possible electric motor. Unlike
            conventional motors, it needs no commutator because the current always flows in the same
            radial direction relative to the axial magnetic field.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-amber-800 mb-2">Real-World Connection</h3>
          <p className="text-amber-900">
            The same principle powers electromagnetic rail guns, homopolar generators in welding machines,
            and even some spacecraft propulsion concepts. Michael Faraday invented this motor in 1821!
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
        Twist: Flip the Magnet!
      </h2>
      <p className="text-slate-600 mb-6 text-center max-w-xl">
        What do you think will happen if you flip the magnet so its opposite pole faces up?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { id: 'stop', text: 'The motor will stop completely', icon: '⏹' },
          { id: 'faster', text: 'The motor will spin faster', icon: '⚡' },
          { id: 'reverse', text: 'The motor will spin in the opposite direction', icon: '🔄' },
          { id: 'same', text: 'Nothing will change', icon: '➡️' }
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
        <h2 className="text-xl font-bold text-slate-800">Flip the Magnet Polarity</h2>
        <p className="text-slate-600 text-sm">Watch what happens when you change the magnetic pole orientation</p>
      </div>

      {renderMotorVisualization()}

      {/* Controls */}
      <div className="mt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <label className="text-sm font-medium text-slate-700 mb-3 block text-center">
            Magnet Polarity (Facing Up)
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setMagnetPolarity('north');
                playSound(550, 0.1);
                emitEvent('polarity_changed', { polarity: 'north' });
              }}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                magnetPolarity === 'north'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-red-100'
              }`}
            >
              North (N)
            </button>
            <button
              onClick={() => {
                setMagnetPolarity('south');
                playSound(550, 0.1);
                emitEvent('polarity_changed', { polarity: 'south' });
              }}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                magnetPolarity === 'south'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-blue-100'
              }`}
            >
              South (S)
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
            Notice the direction! The motor spins {rotationSpeed > 0 ? 'clockwise' : 'counter-clockwise'}.
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
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">The Twist Explained</h2>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl mb-6">
        <h3 className="font-bold text-purple-800 mb-3 text-lg">Reversing the Magnetic Field</h3>
        <p className="text-purple-900 mb-4">
          When you flip the magnet, the magnetic field direction reverses. According to the Lorentz force
          equation <strong>F = q(v × B)</strong>, reversing B reverses the force direction.
        </p>
        <p className="text-purple-900">
          This is why the motor spins in the opposite direction! The same principle lets us control
          motor direction in electric vehicles and industrial machinery.
        </p>
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-6">
        <h4 className="font-bold text-slate-700 mb-2">Key Insight</h4>
        <p className="text-slate-600">
          In a homopolar motor, you can reverse direction by either flipping the magnet OR
          reversing the battery polarity (which reverses current direction). Both change the
          cross product in F = I × B.
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
        Explore how the homopolar motor principle powers incredible technology. Complete all four to unlock the test.
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
          ? 'You have mastered the homopolar motor! You understand how the Lorentz force creates continuous rotation.'
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

export default HomopolarMotorRenderer;
