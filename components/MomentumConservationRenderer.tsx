'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// MOMENTUM CONSERVATION - Premium 10-Phase Design
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Lab',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

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

interface MomentumConservationRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  setTestScore?: (score: number) => void;
}

const MomentumConservationRenderer: React.FC<MomentumConservationRendererProps> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete,
  setTestScore
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
  const [massLeft, setMassLeft] = useState(1);
  const [massRight, setMassRight] = useState(2);
  const [hasFriction, setHasFriction] = useState(false);
  const [isCompressed, setIsCompressed] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [leftPos, setLeftPos] = useState(0);
  const [rightPos, setRightPos] = useState(0);
  const [leftVel, setLeftVel] = useState(0);
  const [rightVel, setRightVel] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  const animationRef = useRef<number>();

  // Test questions - 10 questions with correct: true
  const testQuestions = [
    {
      question: "Two carts push off each other. If cart A is heavier, which cart moves faster?",
      options: [
        { text: "Cart A (heavier)", correct: false },
        { text: "Cart B (lighter)", correct: true },
        { text: "Both same speed", correct: false },
        { text: "Neither moves", correct: false }
      ],
      explanation: "The lighter cart moves faster. Since momentum is conserved and starts at zero, m₁v₁ = m₂v₂. The lighter cart needs higher velocity to match the heavier cart's momentum."
    },
    {
      question: "What is the total momentum before and after two stationary carts push off?",
      options: [
        { text: "Increases after", correct: false },
        { text: "Decreases after", correct: false },
        { text: "Zero both times", correct: true },
        { text: "Depends on masses", correct: false }
      ],
      explanation: "Total momentum is conserved. Starting at rest = zero momentum. After pushing, momenta are equal and opposite, still summing to zero."
    },
    {
      question: "If a 1kg cart and 3kg cart push off, and the 1kg cart moves at 6 m/s, how fast is the 3kg cart?",
      options: [
        { text: "6 m/s", correct: false },
        { text: "2 m/s", correct: true },
        { text: "18 m/s", correct: false },
        { text: "3 m/s", correct: false }
      ],
      explanation: "Using p₁ = p₂: 1kg × 6m/s = 3kg × v₂, so v₂ = 2 m/s. The heavier cart moves slower."
    },
    {
      question: "Why doesn't total momentum equal zero on carpet (with friction)?",
      options: [
        { text: "Friction creates momentum", correct: false },
        { text: "Momentum transfers to Earth", correct: true },
        { text: "Carts are heavier", correct: false },
        { text: "Momentum is destroyed", correct: false }
      ],
      explanation: "Friction transfers momentum to Earth. The Earth-cart system still conserves momentum, but Earth's huge mass means negligible motion."
    },
    {
      question: "Two ice skaters push off each other. What happens?",
      options: [
        { text: "Only lighter one moves", correct: false },
        { text: "Only heavier one moves", correct: false },
        { text: "Both move opposite ways", correct: true },
        { text: "Neither moves on ice", correct: false }
      ],
      explanation: "Both skaters move in opposite directions. The lighter skater moves faster, but both acquire equal and opposite momenta."
    },
    {
      question: "Momentum is calculated as:",
      options: [
        { text: "mass × acceleration", correct: false },
        { text: "mass × velocity", correct: true },
        { text: "force × time", correct: false },
        { text: "mass × distance", correct: false }
      ],
      explanation: "Momentum (p) equals mass times velocity: p = mv. It's a vector quantity with both magnitude and direction."
    },
    {
      question: "A gun recoils when fired. This demonstrates:",
      options: [
        { text: "Energy conservation", correct: false },
        { text: "Momentum conservation", correct: true },
        { text: "Mass conservation", correct: false },
        { text: "Friction effects", correct: false }
      ],
      explanation: "Gun recoil demonstrates momentum conservation. The bullet gains forward momentum, so the gun gains equal backward momentum."
    },
    {
      question: "If you double both masses but keep the spring the same, what happens to velocities?",
      options: [
        { text: "Both double", correct: false },
        { text: "Both halve", correct: true },
        { text: "Stay the same", correct: false },
        { text: "One doubles, one halves", correct: false }
      ],
      explanation: "Same spring impulse but doubled masses means both velocities halve. Total momentum of each cart stays similar, but v = p/m means lower velocity."
    },
    {
      question: "Why is momentum a vector quantity?",
      options: [
        { text: "Only has magnitude", correct: false },
        { text: "Has magnitude and direction", correct: true },
        { text: "Always positive", correct: false },
        { text: "Doesn't change", correct: false }
      ],
      explanation: "Momentum is a vector because it has both magnitude (how much) and direction (which way). Opposite momenta cancel in the sum."
    },
    {
      question: "In space, an astronaut throws a tool. What happens?",
      options: [
        { text: "Only tool moves", correct: false },
        { text: "Both move opposite ways", correct: true },
        { text: "Neither moves in space", correct: false },
        { text: "Astronaut moves faster", correct: false }
      ],
      explanation: "Both move in opposite directions due to momentum conservation. The lighter tool moves faster than the heavier astronaut."
    }
  ];

  // Real-world applications - 4 applications
  const applications = [
    {
      id: 'car_crashes',
      title: "Car Crashes",
      description: "In collisions, momentum is transferred between vehicles. Crumple zones extend collision time, reducing peak force while conserving total momentum. Heavier vehicles transfer more momentum to lighter ones.",
      formula: "p₁ + p₂ = p₁' + p₂'",
      stat: "Crumple zones reduce peak force by 50%",
      color: '#ef4444',
    },
    {
      id: 'rockets',
      title: "Rockets",
      description: "Rockets expel exhaust gases backward at high speed, gaining forward momentum. The faster and more massive the exhaust, the more thrust generated. This works even in the vacuum of space!",
      formula: "F = Δp/Δt = ṁ × vₑ",
      stat: "Saturn V thrust: 35 million N",
      color: '#f97316',
    },
    {
      id: 'billiards',
      title: "Billiards",
      description: "When the cue ball strikes another ball, momentum transfers. A direct center hit can transfer nearly all momentum to the target ball, stopping the cue. Angles create split momentum.",
      formula: "m₁v₁ = m₁v₁' + m₂v₂'",
      stat: "Cue ball: ~170g at 10 m/s",
      color: '#22c55e',
    },
    {
      id: 'newtons_cradle',
      title: "Newton's Cradle",
      description: "Momentum transfers through the balls via elastic collisions. Lift one ball, and one ball swings out the other side with nearly equal momentum. Energy and momentum both conserved!",
      formula: "p_before = p_after",
      stat: "~95% momentum transfer",
      color: '#3b82f6',
    }
  ];

  // Effects
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Web Audio API sound
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
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Physics simulation
  const releaseCarts = useCallback(() => {
    if (isAnimating || !isCompressed) return;
    setIsAnimating(true);
    setIsCompressed(false);

    const springImpulse = 10;
    const initialVelLeft = -springImpulse / massLeft;
    const initialVelRight = springImpulse / massRight;
    const friction = hasFriction ? 0.015 : 0.001;

    let vL = initialVelLeft;
    let vR = initialVelRight;
    let pL = 0;
    let pR = 0;

    emitEvent('simulation_started', { massLeft, massRight, hasFriction });

    const animate = () => {
      vL *= (1 - friction);
      vR *= (1 - friction);
      pL += vL * 0.5;
      pR += vR * 0.5;

      setLeftPos(pL);
      setRightPos(pR);
      setLeftVel(vL);
      setRightVel(vR);

      if (Math.abs(vL) > 0.05 || Math.abs(vR) > 0.05) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setExperimentCount(prev => prev + 1);
        playSound('complete');
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating, isCompressed, massLeft, massRight, hasFriction, emitEvent, playSound]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsCompressed(true);
    setIsAnimating(false);
    setLeftPos(0);
    setRightPos(0);
    setLeftVel(0);
    setRightVel(0);
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
  }, [currentQuestion, answeredQuestions, emitEvent, testQuestions, playSound]);

  // Visualization
  const renderVisualization = () => {
    const trackY = 140;
    const centerX = 200;
    const cartWidth = 56;
    const cartHeight = 38;
    const leftCartX = centerX - 70 + leftPos * 3;
    const rightCartX = centerX + 14 + rightPos * 3;
    const springLen = isCompressed ? 24 : 60;

    const momentumLeft = massLeft * leftVel;
    const momentumRight = massRight * rightVel;
    const totalMomentum = momentumLeft + momentumRight;

    return (
      <svg width="100%" height="260" viewBox="0 0 400 260" className="block">
        <defs>
          <linearGradient id="mc-cart-blue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="mc-cart-orange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="mc-track" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hasFriction ? '#a07a55' : '#4a4a5e'} />
            <stop offset="100%" stopColor={hasFriction ? '#8b6b4a' : '#3d3d50'} />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="260" fill="#0f172a" />

        {/* Grid */}
        <pattern id="mc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
        <rect width="400" height="260" fill="url(#mc-grid)" />

        {/* Track */}
        <rect x={24} y={trackY + cartHeight + 8} width={352} height={14} rx={3} fill="url(#mc-track)" />
        <rect x={24} y={trackY + cartHeight + 8} width={352} height={4} rx={2} fill="rgba(255,255,255,0.08)" />

        {/* Track label */}
        <text x={368} y={trackY + cartHeight + 38} textAnchor="end" fill="#64748b" fontSize={11} fontFamily="system-ui">
          {hasFriction ? 'Carpet (friction)' : 'Frictionless track'}
        </text>

        {/* Spring mechanism */}
        <g transform={`translate(${leftCartX + cartWidth}, ${trackY + cartHeight / 2})`}>
          {isCompressed ? (
            <g>
              <path
                d={`M0 0 ${Array.from({length: 8}, (_, i) => `L${3 + i * 3} ${i % 2 === 0 ? -6 : 6}`).join(' ')} L${springLen} 0`}
                stroke="#22c55e" strokeWidth={3.5} fill="none" strokeLinecap="round"
              />
              <circle cx={springLen / 2} cy={0} r={5} fill="#22c55e" opacity={0.6}>
                <animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </g>
          ) : (
            <line x1={0} y1={0} x2={Math.max(20, rightCartX - leftCartX - cartWidth - 8)} y2={0}
                  stroke="#22c55e" strokeWidth={2} strokeDasharray="6,4" opacity={0.4} />
          )}
        </g>

        {/* Left Cart */}
        <g>
          <rect x={leftCartX} y={trackY} width={cartWidth} height={cartHeight} rx={6} fill="url(#mc-cart-blue)" />
          <rect x={leftCartX + 4} y={trackY + 4} width={cartWidth - 8} height={8} rx={2} fill="rgba(255,255,255,0.2)" />
          <text x={leftCartX + cartWidth / 2} y={trackY + cartHeight / 2 + 6} textAnchor="middle"
                fill="#fff" fontSize={15} fontWeight="700" fontFamily="system-ui">
            {massLeft} kg
          </text>
          {/* Wheels */}
          <circle cx={leftCartX + 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
          <circle cx={leftCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
        </g>

        {/* Right Cart */}
        <g>
          <rect x={rightCartX} y={trackY} width={cartWidth} height={cartHeight} rx={6} fill="url(#mc-cart-orange)" />
          <rect x={rightCartX + 4} y={trackY + 4} width={cartWidth - 8} height={8} rx={2} fill="rgba(255,255,255,0.2)" />
          <text x={rightCartX + cartWidth / 2} y={trackY + cartHeight / 2 + 6} textAnchor="middle"
                fill="#fff" fontSize={15} fontWeight="700" fontFamily="system-ui">
            {massRight} kg
          </text>
          <circle cx={rightCartX + 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
          <circle cx={rightCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
        </g>

        {/* Velocity arrows */}
        {!isCompressed && Math.abs(leftVel) > 0.1 && (
          <g transform={`translate(${leftCartX + cartWidth / 2}, ${trackY - 20})`}>
            <line x1={0} y1={0} x2={leftVel * 6} y2={0} stroke="#3b82f6" strokeWidth={3} strokeLinecap="round" />
            <polygon points={`${leftVel * 6},0 ${leftVel * 6 + (leftVel > 0 ? -8 : 8)},-5 ${leftVel * 6 + (leftVel > 0 ? -8 : 8)},5`} fill="#3b82f6" />
            <text x={leftVel * 3} y={-10} textAnchor="middle" fill="#3b82f6" fontSize={11} fontWeight="600">
              v = {Math.abs(leftVel).toFixed(1)}
            </text>
          </g>
        )}
        {!isCompressed && Math.abs(rightVel) > 0.1 && (
          <g transform={`translate(${rightCartX + cartWidth / 2}, ${trackY - 20})`}>
            <line x1={0} y1={0} x2={rightVel * 6} y2={0} stroke="#f97316" strokeWidth={3} strokeLinecap="round" />
            <polygon points={`${rightVel * 6},0 ${rightVel * 6 + (rightVel > 0 ? -8 : 8)},-5 ${rightVel * 6 + (rightVel > 0 ? -8 : 8)},5`} fill="#f97316" />
            <text x={rightVel * 3} y={-10} textAnchor="middle" fill="#f97316" fontSize={11} fontWeight="600">
              v = {Math.abs(rightVel).toFixed(1)}
            </text>
          </g>
        )}

        {/* Momentum display */}
        <g transform="translate(20, 220)">
          <text x={0} y={0} fill="#94a3b8" fontSize={12} fontWeight="600" fontFamily="system-ui">
            Momentum (p = mv)
          </text>
          <rect x={0} y={8} width={100} height={8} rx={4} fill="#1e293b" />
          <rect x={50 - Math.min(50, Math.abs(momentumLeft) * 3)} y={8} width={Math.min(50, Math.abs(momentumLeft) * 3)} height={8} rx={4} fill="#3b82f6" />
          <text x={110} y={16} fill="#3b82f6" fontSize={11} fontWeight="600" fontFamily="monospace">
            p₁ = {momentumLeft.toFixed(1)}
          </text>

          <rect x={180} y={8} width={100} height={8} rx={4} fill="#1e293b" />
          <rect x={230} y={8} width={Math.min(50, Math.abs(momentumRight) * 3)} height={8} rx={4} fill="#f97316" />
          <text x={290} y={16} fill="#f97316" fontSize={11} fontWeight="600" fontFamily="monospace">
            p₂ = {momentumRight.toFixed(1)}
          </text>
        </g>

        {/* Total momentum badge */}
        <g transform="translate(310, 15)">
          <rect x={0} y={0} width={75} height={32} rx={8} fill={Math.abs(totalMomentum) < 0.5 ? 'rgba(34,197,94,0.15)' : '#1e293b'}
                stroke={Math.abs(totalMomentum) < 0.5 ? '#22c55e' : '#334155'} strokeWidth={1} />
          <text x={37} y={14} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="system-ui">Σp</text>
          <text x={37} y={26} textAnchor="middle" fill={Math.abs(totalMomentum) < 0.5 ? '#22c55e' : '#f1f5f9'}
                fontSize={12} fontWeight="700" fontFamily="monospace">
            {totalMomentum.toFixed(1)}
          </text>
        </g>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  // HOOK PHASE - Welcome page explaining momentum conservation
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-orange-200 bg-clip-text text-transparent">
        Momentum Conservation
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-6">
        Discover one of physics most fundamental laws - the conservation of momentum!
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-orange-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-4">🛒💥🛒</div>
          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            Two carts connected by a compressed spring. When released, they push apart.
          </p>
          <p className="text-lg text-blue-300 font-semibold">
            "If one cart is heavier, which one moves faster?"
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-md w-full mb-8 border border-slate-700/50">
        <h3 className="text-white font-semibold mb-2">What You'll Learn:</h3>
        <ul className="text-left text-slate-300 space-y-1 text-sm">
          <li>• The momentum equation: p = mv</li>
          <li>• Why momentum is always conserved in isolated systems</li>
          <li>• How mass and velocity are inversely related in collisions</li>
          <li>• Real-world applications from rockets to billiards</li>
        </ul>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Let's Find Out
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <p className="mt-8 text-sm text-slate-500 tracking-wide">CONSERVATION OF MOMENTUM • p = mv</p>
    </div>
  );

  // PREDICT PHASE - Prediction question about collision outcomes
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Make Your Prediction</h2>
      <p className="text-slate-400 mb-8">A 1kg cart and 2kg cart are connected by a compressed spring. When released, which moves faster?</p>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'heavy', label: 'The heavy cart (2kg) moves faster', icon: '🏋️' },
          { id: 'light', label: 'The light cart (1kg) moves faster', icon: '🪶' },
          { id: 'same', label: 'Both move at the same speed', icon: '⚖️' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { setPrediction(option.id); playSound('click'); emitEvent('prediction_made', { prediction: option.id }); }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
              prediction === option.id
                ? 'bg-blue-600/30 border-2 border-blue-400'
                : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onClick={() => goToPhase('play')}
          style={{ position: 'relative', zIndex: 10 }}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        >
          Test It! →
        </button>
      )}
    </div>
  );

  // PLAY PHASE - Interactive collision simulation
  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Momentum Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        {renderVisualization()}
      </div>

      <div className="flex gap-4 items-center mb-4 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-400 font-medium">Left:</span>
          {[1, 2, 3].map(m => (
            <button
              key={m}
              onClick={() => { setMassLeft(m); resetExperiment(); }}
              disabled={isAnimating}
              style={{ position: 'relative', zIndex: 10 }}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                massLeft === m ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {m}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-slate-700" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-orange-400 font-medium">Right:</span>
          {[1, 2, 3].map(m => (
            <button
              key={m}
              onClick={() => { setMassRight(m); resetExperiment(); }}
              disabled={isAnimating}
              style={{ position: 'relative', zIndex: 10 }}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                massRight === m ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {isCompressed ? (
          <button
            onClick={() => releaseCarts()}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
            disabled={isAnimating}>
            🚀 Release Spring
          </button>
        ) : (
          <button
            onClick={() => resetExperiment()}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl">
            ↺ Reset
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4">Experiments: {experimentCount}</p>

      {experimentCount >= 2 && (
        <button
          onClick={() => goToPhase('review')}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
          I see the pattern →
        </button>
      )}
    </div>
  );

  // REVIEW PHASE - Explain p = mv, momentum conservation equation
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Momentum Conservation!</h2>

      <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 max-w-lg mb-6">
        <p className="text-lg text-blue-400 font-semibold text-center mb-2">The Law of Conservation of Momentum</p>
        <p className="text-2xl text-white font-mono text-center mb-4">m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'</p>
        <p className="text-slate-300 text-center text-sm">Total momentum before = Total momentum after</p>
      </div>

      <div className="grid gap-4 max-w-lg w-full">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 font-semibold mb-1">Momentum Equation</p>
          <p className="text-white font-mono text-lg mb-2">p = mv</p>
          <p className="text-slate-300 text-sm">Momentum equals mass times velocity. Its a vector quantity with both magnitude and direction.</p>
        </div>
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 font-semibold mb-1">Key Insight</p>
          <p className="text-slate-300 text-sm">Starting at rest means zero total momentum. After the push, the momenta are equal and opposite. Lighter objects need higher velocity to have the same momentum!</p>
        </div>
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 font-semibold mb-1">The Math</p>
          <p className="text-slate-300 text-sm">If m₁ = 1kg and m₂ = 2kg, then v₁ = 2 × v₂. The lighter cart moves twice as fast!</p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Your prediction: {prediction === 'light' ? '✅ Correct! The lighter cart moves faster.' : '🤔 Now you know - the lighter cart moves faster!'}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Ready for a Twist? →
      </button>
    </div>
  );

  // TWIST_PREDICT PHASE - Scenario about rocket propulsion
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Plot Twist: Rocket Science!</h2>
      <p className="text-slate-400 mb-4 text-center max-w-md">A rocket in space has no track to push against. How can it move forward?</p>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-md w-full mb-6">
        <div className="text-4xl text-center mb-3">🚀</div>
        <p className="text-slate-300 text-center text-sm">
          Think about what youve learned about momentum conservation. If a rocket expels exhaust gases backward...
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'push_air', label: 'Rockets push against the air', icon: '💨' },
          { id: 'momentum', label: 'Exhaust goes back, rocket goes forward', icon: '⚡' },
          { id: 'magic', label: 'Rockets cant work in space', icon: '❌' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { setTwistPrediction(option.id); playSound('click'); emitEvent('twist_prediction_made', { twistPrediction: option.id }); }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
              twistPrediction === option.id
                ? 'bg-amber-600/30 border-2 border-amber-400'
                : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onClick={() => goToPhase('twist_play')}
          style={{ position: 'relative', zIndex: 10 }}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        >
          See It In Action →
        </button>
      )}
    </div>
  );

  // TWIST_PLAY PHASE - Interactive rocket/explosion simulation
  const renderTwistPlay = () => {
    const [rocketPos, setRocketPos] = useState(200);
    const [exhaustParticles, setExhaustParticles] = useState<{id: number; x: number; y: number; vx: number}[]>([]);
    const [isFiring, setIsFiring] = useState(false);
    const rocketAnimRef = useRef<number>();

    const fireRocket = () => {
      if (isFiring) return;
      setIsFiring(true);

      let pos = rocketPos;
      const particles: {id: number; x: number; y: number; vx: number}[] = [];
      let particleId = 0;

      const animate = () => {
        // Move rocket forward (right)
        pos += 2;
        setRocketPos(pos);

        // Add exhaust particles going backward (left)
        if (Math.random() > 0.3) {
          particles.push({
            id: particleId++,
            x: pos - 30,
            y: 130 + (Math.random() - 0.5) * 20,
            vx: -8 - Math.random() * 4
          });
        }

        // Move existing particles
        particles.forEach(p => { p.x += p.vx; });

        // Remove old particles
        const activeParticles = particles.filter(p => p.x > 0);
        setExhaustParticles([...activeParticles]);

        if (pos < 350) {
          rocketAnimRef.current = requestAnimationFrame(animate);
        } else {
          setIsFiring(false);
          playSound('complete');
        }
      };

      rocketAnimRef.current = requestAnimationFrame(animate);
    };

    const resetRocket = () => {
      if (rocketAnimRef.current) cancelAnimationFrame(rocketAnimRef.current);
      setRocketPos(200);
      setExhaustParticles([]);
      setIsFiring(false);
    };

    useEffect(() => {
      return () => {
        if (rocketAnimRef.current) cancelAnimationFrame(rocketAnimRef.current);
      };
    }, []);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Rocket Propulsion Lab</h2>

        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
          <svg width="100%" height="260" viewBox="0 0 400 260" className="block">
            <rect width="400" height="260" fill="#0a0a15" />

            {/* Stars */}
            {[...Array(30)].map((_, i) => (
              <circle key={i} cx={Math.random() * 400} cy={Math.random() * 260} r={1} fill="#fff" opacity={0.5 + Math.random() * 0.5} />
            ))}

            {/* Exhaust particles */}
            {exhaustParticles.map(p => (
              <circle key={p.id} cx={p.x} cy={p.y} r={4} fill="#f97316" opacity={0.8}>
                <animate attributeName="opacity" from="0.8" to="0" dur="0.5s" />
              </circle>
            ))}

            {/* Rocket */}
            <g transform={`translate(${rocketPos}, 130)`}>
              {/* Body */}
              <ellipse cx={0} cy={0} rx={25} ry={15} fill="#3b82f6" />
              {/* Nose */}
              <polygon points="25,0 40,-8 40,8" fill="#60a5fa" />
              {/* Tail */}
              <polygon points="-25,-10 -35,-20 -25,-5" fill="#1e40af" />
              <polygon points="-25,10 -35,20 -25,5" fill="#1e40af" />
              {/* Window */}
              <circle cx={10} cy={0} r={6} fill="#0ea5e9" />
              <circle cx={10} cy={0} r={4} fill="#38bdf8" />
              {/* Flame when firing */}
              {isFiring && (
                <g transform="translate(-30, 0)">
                  <ellipse cx={0} cy={0} rx={15} ry={8} fill="#f97316">
                    <animate attributeName="rx" values="15;20;15" dur="0.1s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx={-5} cy={0} rx={8} ry={4} fill="#fbbf24" />
                </g>
              )}
            </g>

            {/* Labels */}
            <text x={200} y={30} textAnchor="middle" fill="#94a3b8" fontSize={12}>
              Exhaust goes LEFT ← | Rocket goes RIGHT →
            </text>

            {/* Momentum arrows */}
            {isFiring && (
              <>
                <g transform={`translate(${rocketPos - 60}, 180)`}>
                  <line x1={0} y1={0} x2={-40} y2={0} stroke="#f97316" strokeWidth={3} />
                  <polygon points="-40,0 -30,-6 -30,6" fill="#f97316" />
                  <text x={-20} y={20} textAnchor="middle" fill="#f97316" fontSize={11}>p exhaust</text>
                </g>
                <g transform={`translate(${rocketPos + 40}, 180)`}>
                  <line x1={0} y1={0} x2={40} y2={0} stroke="#3b82f6" strokeWidth={3} />
                  <polygon points="40,0 30,-6 30,6" fill="#3b82f6" />
                  <text x={20} y={20} textAnchor="middle" fill="#3b82f6" fontSize={11}>p rocket</text>
                </g>
              </>
            )}

            <text x={200} y={240} textAnchor="middle" fill="#64748b" fontSize={11}>
              Total momentum = 0 (conserved!)
            </text>
          </svg>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={fireRocket}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl"
            disabled={isFiring}>
            🚀 Fire Thrusters!
          </button>
          <button
            onClick={resetRocket}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl">
            ↺ Reset
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4 text-center max-w-md">
          Watch how the rocket gains forward momentum by expelling exhaust backward. The momenta are equal and opposite!
        </p>

        <button
          onClick={() => goToPhase('twist_review')}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          I understand now →
        </button>
      </div>
    );
  };

  // TWIST_REVIEW PHASE - Explain how rockets use momentum conservation
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Rockets & Momentum</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-lg mb-6">
        <p className="text-lg text-amber-400 font-semibold text-center mb-2">Rockets Work By Conservation of Momentum!</p>
        <p className="text-slate-300 text-center">
          A rocket doesn't need anything to push against. It works by throwing mass (exhaust) backward at high speed, gaining equal momentum forward.
        </p>
      </div>

      <div className="grid gap-4 max-w-lg w-full">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 font-semibold mb-1">The Rocket Equation</p>
          <p className="text-white font-mono mb-2">F = Δp/Δt = ṁ × vₑ</p>
          <p className="text-slate-300 text-sm">Thrust equals mass flow rate times exhaust velocity. Faster exhaust = more thrust!</p>
        </div>
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 font-semibold mb-1">Why It Works in Space</p>
          <p className="text-slate-300 text-sm">
            Rockets don't push against air - they push against their own exhaust! This is why they work perfectly in the vacuum of space.
          </p>
        </div>
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 font-semibold mb-1">Real Numbers</p>
          <p className="text-slate-300 text-sm">
            The Saturn V rocket expelled 15 tons of fuel per second at 2,500 m/s to generate 35 million Newtons of thrust!
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Your prediction: {twistPrediction === 'momentum' ? '✅ Exactly right!' : '🤔 Now you understand how rockets really work!'}
      </p>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        See More Examples →
      </button>
    </div>
  );

  // TRANSFER PHASE - 4 real-world applications
  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size === applications.length;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Real-World Applications</h2>
        <p className="text-slate-400 mb-4 text-center">Momentum conservation is everywhere!</p>

        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {applications.map((_, idx) => (
            <div key={idx} className={`w-3 h-3 rounded-full ${completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {applications.map((a, idx) => (
            <button
              key={a.id}
              onClick={() => setActiveApp(idx)}
              disabled={idx > 0 && !completedApps.has(idx - 1)}
              style={{ position: 'relative', zIndex: 10 }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeApp === idx ? 'bg-blue-600 text-white'
                : completedApps.has(idx) ? 'bg-emerald-600/30 text-emerald-400'
                : idx > 0 && !completedApps.has(idx - 1) ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {a.title.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full">
          <h3 className="text-xl font-bold mb-3" style={{ color: app.color }}>{app.title}</h3>
          <p className="text-slate-300 mb-4">{app.description}</p>
          <div className="flex gap-3 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3 flex-1 text-center">
              <p className="text-xs text-slate-500">Formula</p>
              <p className="text-sm text-white font-mono">{app.formula}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 flex-1 text-center">
              <p className="text-xs text-slate-500">Real Data</p>
              <p className="text-sm text-white">{app.stat}</p>
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
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full py-3 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 font-medium rounded-xl"
            >
              ✓ Mark as Read
            </button>
          )}
        </div>

        {allAppsCompleted && (
          <button
            onClick={() => goToPhase('test')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
            Take the Quiz →
          </button>
        )}
      </div>
    );
  };

  // TEST PHASE - 10 multiple choice questions
  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);

    return (
      <div className="flex flex-col items-center p-6">
        <div className="flex justify-between items-center w-full max-w-lg mb-4">
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span className="text-sm text-emerald-400 bg-emerald-600/20 px-3 py-1 rounded-full font-medium">
            Score: {correctAnswers}/{answeredQuestions.size}
          </span>
        </div>

        <div className="h-1 bg-slate-800 rounded-full w-full max-w-lg mb-6 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }} />
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full">
          <h3 className="text-lg text-white font-medium mb-4">{q.question}</h3>

          <div className="grid gap-3">
            {q.options.map((option, idx) => {
              let bgClass = 'bg-slate-700/50 hover:bg-slate-600/50';
              if (isAnswered) {
                if (option.correct) bgClass = 'bg-emerald-600/30 border-emerald-500';
                else if (idx === selectedAnswer) bgClass = 'bg-red-600/30 border-red-500';
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleTestAnswer(idx)}
                  disabled={isAnswered}
                  style={{ position: 'relative', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left border-2 transition-all ${bgClass} ${isAnswered ? 'cursor-default' : ''}`}
                >
                  <span className="text-slate-200">{option.text}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-4 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl">
              <p className="text-slate-300 text-sm">💡 {q.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between w-full max-w-lg mt-6">
          <button
            onClick={() => { setCurrentQuestion(prev => Math.max(0, prev - 1)); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion - 1)); }}
            disabled={currentQuestion === 0}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
          >
            ← Back
          </button>

          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => { setCurrentQuestion(prev => prev + 1); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion + 1)); }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Next →
            </button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <button
              onClick={() => {
                const score = Math.round((correctAnswers / testQuestions.length) * 100);
                setTestScore?.(score);
                emitEvent('test_completed', { score, correct: correctAnswers, total: testQuestions.length });
                goToPhase('mastery');
              }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg"
            >
              Complete →
            </button>
          ) : (
            <span className="text-sm text-slate-500 self-center">Answer all to continue</span>
          )}
        </div>
      </div>
    );
  };

  // MASTERY PHASE - Congratulations page
  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);
    const passed = correctAnswers >= 7;

    const resetGame = () => {
      setPhase('hook');
      setExperimentCount(0);
      setCurrentQuestion(0);
      setCorrectAnswers(0);
      setAnsweredQuestions(new Set());
      setPrediction(null);
      setTwistPrediction(null);
      setMassLeft(1);
      setMassRight(2);
      setHasFriction(false);
      setActiveApp(0);
      setCompletedApps(new Set());
      resetExperiment();
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center relative overflow-hidden">
        {/* Confetti effect for passing */}
        {passed && (
          <>
            <style>{`
              @keyframes confettiFall {
                0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
              }
            `}</style>
            {[...Array(20)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px',
                animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
                pointerEvents: 'none', fontSize: 18,
              }}>
                {['🚀', '⭐', '✨', '🎉', '🛒'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </>
        )}

        <div className="text-7xl mb-6">{passed ? '🏆' : '📚'}</div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {passed ? 'Congratulations! Momentum Master!' : 'Keep Practicing!'}
        </h1>
        <div className={`text-5xl font-bold mb-2 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>{percentage}%</div>
        <p className="text-slate-400 mb-8">{correctAnswers}/{testQuestions.length} correct answers</p>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md w-full mb-8 border border-slate-700/50">
          <h3 className="text-lg font-bold text-blue-400 mb-4">{passed ? 'Concepts Mastered' : 'Key Concepts to Review'}</h3>
          <ul className="text-left space-y-2">
            {['Momentum p = mass × velocity', 'Total momentum is always conserved', 'Lighter objects move faster in push-offs', 'Rockets use momentum conservation'].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-slate-300">
                <span className="text-emerald-400">{passed ? '✓' : '○'}</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-md">
          {passed ? (
            <>
              <button
                onClick={() => handleReturnToDashboard()}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              >
                🏠 Return to Dashboard
              </button>
              <button
                onClick={() => resetGame()}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                🔬 Review Lesson
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setCurrentQuestion(0);
                  setCorrectAnswers(0);
                  setAnsweredQuestions(new Set());
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  goToPhase('test');
                }}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                ↻ Retake Test
              </button>
              <button
                onClick={() => resetGame()}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                🔬 Review Lesson
              </button>
              <button
                onClick={() => handleReturnToDashboard()}
                style={{ position: 'relative', zIndex: 10 }}
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

  // Phase renderer
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Momentum Conservation</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default MomentumConservationRenderer;
