/**
 * OERSTED EXPERIMENT RENDERER
 *
 * Secure game demonstrating that electric current creates magnetic fields.
 * The fundamental discovery linking electricity and magnetism.
 *
 * KEY SECURITY: Correct answers are stored on the server only.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTestAnswers } from '@/hooks/useSecureTestAnswers';

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'oersted_experiment';

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
    scenario: "Hans Christian Oersted placed a compass near a wire carrying electric current.",
    question: "What did Oersted observe when he turned on the current?",
    options: [
      "The compass needle pointed toward the wire",
      "The compass needle deflected perpendicular to the wire",
      "The compass stopped working",
      "The wire moved toward the compass"
    ]
  },
  {
    scenario: "A straight wire carries current upward through a table with a compass placed nearby.",
    question: "What shape do the magnetic field lines around the wire form?",
    options: [
      "Straight lines parallel to the wire",
      "Straight lines perpendicular to the wire",
      "Concentric circles around the wire",
      "Random curved lines"
    ]
  },
  {
    scenario: "You reverse the direction of current flow in a wire near a compass.",
    question: "What happens to the compass needle?",
    options: [
      "It points in the same direction as before",
      "It deflects in the opposite direction",
      "It spins continuously",
      "It stops responding to the current"
    ]
  },
  {
    scenario: "The right-hand rule helps predict magnetic field direction around a current-carrying wire.",
    question: "When using the right-hand rule, what does your thumb represent?",
    options: [
      "The direction of the magnetic field",
      "The direction of current flow",
      "The direction of force on the wire",
      "The direction of electron movement"
    ]
  },
  {
    scenario: "You want to increase the magnetic field strength near your current-carrying wire.",
    question: "Which modification would be most effective?",
    options: [
      "Use a thicker wire",
      "Increase the current or coil the wire",
      "Use a longer wire",
      "Cool the wire with ice"
    ]
  },
  {
    scenario: "A wire is coiled into a solenoid (many loops in a cylinder shape).",
    question: "How does the magnetic field of a solenoid compare to a single wire?",
    options: [
      "It's weaker because the fields cancel",
      "It's the same strength but more spread out",
      "It's much stronger and resembles a bar magnet",
      "It only works with AC current"
    ]
  },
  {
    scenario: "The magnetic field strength around a wire depends on distance.",
    question: "How does field strength change as you move away from the wire?",
    options: [
      "It stays constant",
      "It decreases inversely with distance (1/r)",
      "It decreases with the square of distance (1/r²)",
      "It increases with distance"
    ]
  },
  {
    scenario: "Oersted's discovery in 1820 unified two previously separate phenomena.",
    question: "What two phenomena did Oersted's experiment connect?",
    options: [
      "Gravity and magnetism",
      "Electricity and magnetism",
      "Light and sound",
      "Heat and motion"
    ]
  },
  {
    scenario: "You're designing an electromagnet using Oersted's principle.",
    question: "What determines which end of the electromagnet is north vs south?",
    options: [
      "The material of the wire",
      "The direction of current flow through the coils",
      "The temperature of the coil",
      "The voltage of the power supply"
    ]
  },
  {
    scenario: "A compass is placed directly above a horizontal wire carrying current eastward.",
    question: "Using the right-hand rule, which way will the compass needle deflect?",
    options: [
      "North (same as no current)",
      "East (along the wire)",
      "South (away from normal north)",
      "It depends on the current strength"
    ]
  }
];

// Transfer phase applications
const transferApplications = [
  {
    id: 'electromagnets',
    title: 'Electromagnets',
    description: 'From junkyard cranes to MRI machines, electromagnets use coiled wire to create controlled magnetic fields.',
    fact: 'The world\'s strongest electromagnet generates 45 Tesla - about 1 million times Earth\'s magnetic field!',
    icon: '🧲'
  },
  {
    id: 'electric_motors',
    title: 'Electric Motors',
    description: 'Every motor combines Oersted\'s discovery (current creates field) with the Lorentz force to create rotation.',
    fact: 'Your phone has multiple tiny motors using this principle in the vibration motor and speakers.',
    icon: '⚡'
  },
  {
    id: 'transformers',
    title: 'Power Transformers',
    description: 'The changing magnetic field from AC current in one coil induces voltage in another - essential for power grids.',
    fact: 'Power transformers are 99%+ efficient, making long-distance electricity transmission practical.',
    icon: '🔌'
  },
  {
    id: 'speakers',
    title: 'Speakers & Headphones',
    description: 'Audio signals create varying currents in a coil, which creates varying magnetic fields that move a diaphragm.',
    fact: 'The first electromagnetic speaker was invented just 7 years after Oersted\'s discovery.',
    icon: '🔊'
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

interface OerstedExperimentRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
}

const OerstedExperimentRenderer: React.FC<OerstedExperimentRendererProps> = ({
  onComplete,
  onGameEvent
}) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string>('');
  const [twistPrediction, setTwistPrediction] = useState<string>('');

  // Play phase state
  const [currentOn, setCurrentOn] = useState(false);
  const [currentStrength, setCurrentStrength] = useState(50);
  const [currentDirection, setCurrentDirection] = useState<'up' | 'down'>('up');
  const [wireMode, setWireMode] = useState<'straight' | 'coil'>('straight');
  const [coilTurns, setCoilTurns] = useState(5);

  // Animation state
  const [compassAngle, setCompassAngle] = useState(0);
  const targetCompassAngle = useRef(0);
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

  // Calculate compass deflection based on current
  useEffect(() => {
    if (!currentOn) {
      targetCompassAngle.current = 0; // Points north when no current
    } else {
      const baseDeflection = (currentStrength / 100) * 75; // Max 75 degrees
      const multiplier = wireMode === 'coil' ? Math.min(coilTurns / 3, 3) : 1;
      const direction = currentDirection === 'up' ? 1 : -1;
      targetCompassAngle.current = baseDeflection * multiplier * direction;
    }
  }, [currentOn, currentStrength, currentDirection, wireMode, coilTurns]);

  // Smooth compass animation
  useEffect(() => {
    const animate = () => {
      setCompassAngle(prev => {
        const diff = targetCompassAngle.current - prev;
        if (Math.abs(diff) < 0.5) return targetCompassAngle.current;
        return prev + diff * 0.1;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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

  const renderExperimentVisualization = () => {
    const width = isMobile ? 350 : 700;
    const height = isMobile ? 320 : 400;
    const cx = width / 2;
    const cy = height / 2;

    // Field line parameters
    const fieldStrength = currentOn ? (currentStrength / 100) * (wireMode === 'coil' ? coilTurns / 3 : 1) : 0;

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          {/* Wire gradient */}
          <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Copper coil gradient */}
          <linearGradient id="coilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Compass face gradient */}
          <radialGradient id="compassFace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="90%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          {/* Magnetic field line gradient */}
          <linearGradient id="fieldLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity={fieldStrength * 0.6} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* Glow for active elements */}
          <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background - table surface */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" />
        <rect x="0" y={cy - 20} width={width} height={height / 2 + 20} fill="#3f3a35" opacity="0.5" />

        {/* Wire or Coil */}
        {wireMode === 'straight' ? (
          // Straight wire through table
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Wire through table */}
            <rect
              x="-4"
              y={-cy + 20}
              width="8"
              height={height - 40}
              fill={currentOn ? 'url(#wireGradient)' : '#64748b'}
              filter={currentOn ? 'url(#activeGlow)' : undefined}
            />

            {/* Current direction arrow */}
            {currentOn && (
              <g>
                <polygon
                  points={currentDirection === 'up' ? '0,-80 -10,-60 10,-60' : '0,80 -10,60 10,60'}
                  fill="#fbbf24"
                />
                <text
                  x="20"
                  y={currentDirection === 'up' ? -65 : 65}
                  fill="#fbbf24"
                  fontSize="12"
                  fontWeight="bold"
                >
                  I
                </text>
              </g>
            )}

            {/* Magnetic field circles around wire */}
            {currentOn && [...Array(4)].map((_, i) => {
              const radius = 40 + i * 25;
              const opacity = 0.4 - i * 0.1;
              return (
                <g key={`field-circle-${i}`}>
                  <circle
                    cx="0"
                    cy="0"
                    r={radius}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="8,6"
                    opacity={opacity * fieldStrength}
                  />
                  {/* Direction indicators (dots and crosses) */}
                  {currentDirection === 'up' ? (
                    // CCW field lines when viewed from above with upward current
                    <>
                      <circle cx={radius} cy="0" r="3" fill="#3b82f6" opacity={opacity * fieldStrength} />
                      <text x={-radius} y="4" textAnchor="middle" fill="#3b82f6" fontSize="10" opacity={opacity * fieldStrength}>×</text>
                    </>
                  ) : (
                    // CW field lines when viewed from above with downward current
                    <>
                      <text x={radius} y="4" textAnchor="middle" fill="#3b82f6" fontSize="10" opacity={opacity * fieldStrength}>×</text>
                      <circle cx={-radius} cy="0" r="3" fill="#3b82f6" opacity={opacity * fieldStrength} />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        ) : (
          // Coiled wire (solenoid)
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Coil turns */}
            {[...Array(coilTurns)].map((_, i) => {
              const xOffset = (i - (coilTurns - 1) / 2) * 15;
              return (
                <ellipse
                  key={`coil-${i}`}
                  cx={xOffset}
                  cy="0"
                  rx="25"
                  ry="40"
                  fill="none"
                  stroke={currentOn ? 'url(#coilGradient)' : '#64748b'}
                  strokeWidth="4"
                  filter={currentOn ? 'url(#activeGlow)' : undefined}
                />
              );
            })}

            {/* Magnetic field lines through solenoid */}
            {currentOn && [...Array(3)].map((_, i) => {
              const yOffset = (i - 1) * 20;
              return (
                <line
                  key={`solenoid-field-${i}`}
                  x1={-(coilTurns * 10 + 40)}
                  y1={yOffset}
                  x2={(coilTurns * 10 + 40)}
                  y2={yOffset}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity={0.4 * fieldStrength}
                  markerEnd="url(#fieldArrow)"
                />
              );
            })}

            {/* Field arrow marker */}
            <marker id="fieldArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" opacity="0.6" />
            </marker>

            {/* N and S pole labels */}
            {currentOn && (
              <>
                <text
                  x={currentDirection === 'up' ? -(coilTurns * 10 + 55) : (coilTurns * 10 + 45)}
                  y="5"
                  fill="#ef4444"
                  fontSize="16"
                  fontWeight="bold"
                >
                  N
                </text>
                <text
                  x={currentDirection === 'up' ? (coilTurns * 10 + 45) : -(coilTurns * 10 + 55)}
                  y="5"
                  fill="#3b82f6"
                  fontSize="16"
                  fontWeight="bold"
                >
                  S
                </text>
              </>
            )}
          </g>
        )}

        {/* Compass */}
        <g transform={`translate(${wireMode === 'straight' ? cx + (isMobile ? 100 : 150) : cx}, ${wireMode === 'straight' ? cy : cy + (isMobile ? 80 : 100)})`}>
          {/* Compass body */}
          <circle
            cx="0"
            cy="0"
            r={isMobile ? 35 : 50}
            fill="url(#compassFace)"
            stroke="#64748b"
            strokeWidth="3"
          />

          {/* Cardinal directions */}
          <text x="0" y={isMobile ? -22 : -32} textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">N</text>
          <text x="0" y={isMobile ? 28 : 38} textAnchor="middle" fill="#64748b" fontSize="10">S</text>
          <text x={isMobile ? 26 : 38} y="4" textAnchor="middle" fill="#64748b" fontSize="10">E</text>
          <text x={isMobile ? -26 : -38} y="4" textAnchor="middle" fill="#64748b" fontSize="10">W</text>

          {/* Degree markings */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const r1 = isMobile ? 30 : 42;
            const r2 = isMobile ? 35 : 50;
            return (
              <line
                key={`mark-${i}`}
                x1={r1 * Math.sin(angle)}
                y1={-r1 * Math.cos(angle)}
                x2={r2 * Math.sin(angle)}
                y2={-r2 * Math.cos(angle)}
                stroke="#94a3b8"
                strokeWidth="1"
              />
            );
          })}

          {/* Compass needle */}
          <g transform={`rotate(${compassAngle})`}>
            {/* North end (red) */}
            <polygon
              points={`0,${isMobile ? -28 : -38} -6,0 6,0`}
              fill="#dc2626"
            />
            {/* South end (white) */}
            <polygon
              points={`0,${isMobile ? 28 : 38} -6,0 6,0`}
              fill="#e2e8f0"
              stroke="#94a3b8"
              strokeWidth="1"
            />
            {/* Center pivot */}
            <circle cx="0" cy="0" r="4" fill="#1e293b" />
          </g>

          {/* Deflection indicator */}
          {currentOn && Math.abs(compassAngle) > 5 && (
            <text
              x="0"
              y={isMobile ? 55 : 70}
              textAnchor="middle"
              fill="#3b82f6"
              fontSize="11"
              fontWeight="bold"
            >
              Deflection: {Math.round(compassAngle)}°
            </text>
          )}
        </g>

        {/* Right-hand rule diagram */}
        {currentOn && wireMode === 'straight' && (
          <g transform={`translate(${isMobile ? 40 : 80}, ${isMobile ? 40 : 60})`}>
            <rect x="-30" y="-25" width="80" height="60" fill="#1e293b" rx="6" stroke="#3b82f6" strokeWidth="1" opacity="0.9" />
            <text x="10" y="-10" textAnchor="middle" fill="#94a3b8" fontSize="9">Right-Hand Rule</text>
            <text x="10" y="5" textAnchor="middle" fill="#fbbf24" fontSize="8">Thumb = I</text>
            <text x="10" y="18" textAnchor="middle" fill="#3b82f6" fontSize="8">Fingers = B</text>
          </g>
        )}

        {/* Labels */}
        <text x={cx} y="25" textAnchor="middle" fill="#e2e8f0" fontSize={isMobile ? 14 : 18} fontWeight="bold">
          Oersted Experiment
        </text>

        <text x={cx} y={height - 15} textAnchor="middle" fill="#64748b" fontSize="11">
          {wireMode === 'straight' ? 'B = μ₀I / (2πr)' : 'B = μ₀nI (Solenoid)'}
        </text>

        {/* Status */}
        <text x={cx} y="50" textAnchor="middle" fill={currentOn ? '#22c55e' : '#ef4444'} fontSize="12">
          Current: {currentOn ? 'ON' : 'OFF'} {currentOn && `(${currentStrength}%)`}
        </text>
      </svg>
    );
  };

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderHookPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="text-6xl mb-6">🧭⚡</div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
        Can a wire act like a magnet?
      </h2>
      <p className="text-lg text-slate-600 mb-8 max-w-xl">
        In 1820, Hans Christian Oersted noticed something strange during a lecture demonstration.
        His discovery changed physics forever.
      </p>
      <button
        onClick={() => goToPhase('predict')}
        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all shadow-lg hover:shadow-xl"
      >
        Recreate the Discovery →
      </button>
    </div>
  );

  const renderPredictPhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-600 mb-6 text-center max-w-xl">
        If you place a compass next to a wire and turn on an electric current, what do you think will happen to the compass needle?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { id: 'nothing', text: 'Nothing - electricity and magnetism are unrelated', icon: '❌' },
          { id: 'toward', text: 'The needle will point toward the wire', icon: '➡️' },
          { id: 'deflect', text: 'The needle will deflect sideways', icon: '↪️' },
          { id: 'spin', text: 'The needle will spin continuously', icon: '🔄' }
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
          Run the Experiment →
        </button>
      )}
    </div>
  );

  const renderPlayPhase = () => (
    <div className="p-4 md:p-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Oersted's Experiment</h2>
        <p className="text-slate-600 text-sm">Turn on the current and watch the compass needle</p>
      </div>

      {renderExperimentVisualization()}

      {/* Controls */}
      <div className="mt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Current Strength</span>
            <span className="text-indigo-600">{currentStrength}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={currentStrength}
            onChange={(e) => setCurrentStrength(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <label className="text-sm font-medium text-slate-700 mb-3 block text-center">
            Current Direction
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCurrentDirection('up');
                playSound(440, 0.1);
                emitEvent('direction_changed', { direction: 'up' });
              }}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                currentDirection === 'up'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-indigo-100'
              }`}
            >
              ↑ Upward
            </button>
            <button
              onClick={() => {
                setCurrentDirection('down');
                playSound(440, 0.1);
                emitEvent('direction_changed', { direction: 'down' });
              }}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                currentDirection === 'down'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-indigo-100'
              }`}
            >
              ↓ Downward
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentOn(!currentOn);
            playSound(currentOn ? 330 : 550, 0.2);
            emitEvent(currentOn ? 'current_off' : 'current_on', { strength: currentStrength, direction: currentDirection });
          }}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
            currentOn
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {currentOn ? '⏹ Turn OFF' : '▶ Turn ON'}
        </button>
      </div>

      {currentOn && (
        <div className="mt-6 text-center">
          <p className="text-green-600 font-medium">
            The compass deflects! Current creates a magnetic field around the wire.
          </p>
          <button
            onClick={() => goToPhase('review')}
            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
          >
            Understand the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderReviewPhase = () => (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Electricity Creates Magnetism!</h2>

      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-blue-800 mb-2">What Happened</h3>
          <p className="text-blue-900">
            When current flows through the wire, it creates a magnetic field that circles around the wire.
            This field deflects the compass needle perpendicular to the wire direction.
          </p>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-green-800 mb-2">The Right-Hand Rule</h3>
          <p className="text-green-900">
            Point your thumb in the direction of current flow. Your fingers curl in the direction
            of the magnetic field. This is why the compass deflects perpendicular to the wire!
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
          <h3 className="font-bold text-amber-800 mb-2">Historical Significance</h3>
          <p className="text-amber-900">
            Oersted's 1820 discovery proved that electricity and magnetism are connected.
            This led to Maxwell's equations and our entire understanding of electromagnetism!
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
        Twist: Coil the Wire!
      </h2>
      <p className="text-slate-600 mb-6 text-center max-w-xl">
        What do you think will happen if you coil the wire into multiple loops (a solenoid)?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { id: 'weaker', text: 'The magnetic field will be weaker', icon: '📉' },
          { id: 'stronger', text: 'The magnetic field will be much stronger', icon: '📈' },
          { id: 'same', text: 'The field will be the same strength', icon: '➡️' },
          { id: 'cancel', text: 'The fields will cancel each other', icon: '❌' }
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
          onClick={() => {
            setWireMode('coil');
            goToPhase('twist_play');
          }}
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
        <h2 className="text-xl font-bold text-slate-800">The Solenoid Effect</h2>
        <p className="text-slate-600 text-sm">Adjust the number of coils and watch the field strength change</p>
      </div>

      {renderExperimentVisualization()}

      {/* Controls */}
      <div className="mt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Number of Coil Turns</span>
            <span className="text-purple-600">{coilTurns}</span>
          </label>
          <input
            type="range"
            min="2"
            max="10"
            value={coilTurns}
            onChange={(e) => {
              setCoilTurns(Number(e.target.value));
              emitEvent('coils_changed', { turns: Number(e.target.value) });
            }}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setWireMode(wireMode === 'straight' ? 'coil' : 'straight');
              playSound(440, 0.1);
            }}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              wireMode === 'coil'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {wireMode === 'coil' ? '🔄 Coiled' : '| Straight'}
          </button>

          <button
            onClick={() => {
              setCurrentOn(!currentOn);
              playSound(currentOn ? 330 : 550, 0.2);
            }}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              currentOn
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {currentOn ? '⏹ OFF' : '▶ ON'}
          </button>
        </div>
      </div>

      {currentOn && wireMode === 'coil' && (
        <div className="mt-6 text-center">
          <p className="text-purple-600 font-medium">
            Notice how the coiled wire creates a much stronger, focused magnetic field!
            It behaves like a bar magnet with N and S poles.
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
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">The Electromagnet</h2>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl mb-6">
        <h3 className="font-bold text-purple-800 mb-3 text-lg">Why Coils Are Stronger</h3>
        <p className="text-purple-900 mb-4">
          When you coil the wire, each loop's magnetic field adds together. For a solenoid with n turns:
          <strong className="block mt-2 font-mono text-center">B = μ₀ × n × I</strong>
        </p>
        <p className="text-purple-900">
          More turns = stronger field. This is the principle behind electromagnets - they can be
          turned on/off and have adjustable strength, unlike permanent magnets.
        </p>
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-6">
        <h4 className="font-bold text-slate-700 mb-2">Key Insight</h4>
        <p className="text-slate-600">
          A coiled current-carrying wire acts exactly like a bar magnet! The direction of current
          determines which end is north and which is south (right-hand rule).
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
        Oersted's discovery powers countless technologies. Explore all four to unlock the test.
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
          ? 'You understand how current creates magnetic fields! This principle powers motors, speakers, and MRI machines.'
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
              setWireMode('straight');
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

export default OerstedExperimentRenderer;
