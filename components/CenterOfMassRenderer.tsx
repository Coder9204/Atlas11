'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CENTER OF MASS - Premium 10-Screen Design
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

interface CenterOfMassRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const CenterOfMassRenderer: React.FC<CenterOfMassRendererProps> = ({
  onGameEvent,
  currentPhase,
  onPhaseComplete
}) => {
  // Navigation debouncing ref
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
  const [clayPosition, setClayPosition] = useState<number>(0);
  const [hasClayAdded, setHasClayAdded] = useState(false);
  const [isBalanced, setIsBalanced] = useState(true);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [showCOM, setShowCOM] = useState(true);
  const [experimentCount, setExperimentCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Transfer state
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const animationRef = useRef<number>();

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

  // Navigation with debouncing
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    if (!PHASES.includes(newPhase)) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Physics calculations
  const calculateBalance = useCallback((clay: number) => {
    const baseCOM = -0.3;
    const clayEffect = clay * 0.5;
    const finalCOM = baseCOM + clayEffect;
    return { comY: finalCOM, stable: finalCOM < 0.1 };
  }, []);

  const addClay = useCallback((position: number) => {
    if (isAnimating || hasClayAdded) return;
    setHasClayAdded(true);
    setClayPosition(position);
    const { stable, comY } = calculateBalance(position);
    setIsBalanced(stable);

    if (!stable) {
      setIsAnimating(true);
      let angle = 0;
      const animate = () => {
        angle += (position > 0 ? 2 : -2);
        setTiltAngle(angle);
        if (Math.abs(angle) < 45) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setExperimentCount(prev => prev + 1);
          playSound('failure');
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setTiltAngle(0);
      setExperimentCount(prev => prev + 1);
      playSound('success');
    }
    emitEvent('simulation_started', { clayPosition: position, stable, comY });
  }, [calculateBalance, emitEvent, isAnimating, hasClayAdded, playSound]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setHasClayAdded(false);
    setClayPosition(0);
    setIsBalanced(true);
    setTiltAngle(0);
    setIsAnimating(false);
    emitEvent('parameter_changed', { action: 'reset' });
  }, [emitEvent]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = answerIndex === testQuestions[currentQuestion].correct;
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
    { question: "Why does the fork-toothpick system balance on the glass rim?", options: ["The fork is very light", "Center of mass is below the pivot point", "Magic holds it in place", "The glass surface is sticky"], correct: 1, explanation: "The system balances because its center of mass lies below the pivot point. This creates stable equilibrium where gravity provides a restoring torque." },
    { question: "What happens if you move the center of mass above the pivot?", options: ["System becomes more stable", "System becomes unstable and falls", "Nothing changes at all", "It starts to float"], correct: 1, explanation: "When COM is above the pivot, any small disturbance causes gravity to tip it further (unstable equilibrium). It will fall over." },
    { question: "Adding clay to the fork end (lower side) would:", options: ["Make it more stable", "Make it less stable", "Have no effect on stability", "Make it lighter"], correct: 0, explanation: "Adding weight to the fork end (which hangs low) shifts the COM even lower, making the system more stable." },
    { question: "A tightrope walker holds a long pole because:", options: ["For exercise during the walk", "To lower their overall center of mass", "To wave at the crowd below", "The pole has no purpose"], correct: 1, explanation: "The heavy pole bends downward, lowering the walker's overall center of mass below the rope, creating stability." },
    { question: "Where is the center of mass of a donut shape?", options: ["In the dough material", "In the empty hole at center", "Nowhere specific", "At the outer edge"], correct: 1, explanation: "A donut's center of mass is in the hole—the geometric center—even though there's no material there!" },
    { question: "To balance a ruler on your finger, where should you place it?", options: ["At one end of the ruler", "At its center of mass", "Anywhere works the same", "At both ends simultaneously"], correct: 1, explanation: "You must place your finger under the center of mass. For a uniform ruler, that's the geometric center." },
    { question: "Why do racing cars have low centers of mass?", options: ["To go faster in a straight line", "To be more stable in turns", "Only for aerodynamics", "To use less fuel"], correct: 1, explanation: "A low COM means the car is less likely to tip over during sharp turns. The lower the COM, the more it can lean before tipping." },
    { question: "A bird perches on a branch by:", options: ["Gripping with claws only", "Keeping its COM over the branch", "Birds cannot balance well", "The branch helps them"], correct: 1, explanation: "Birds constantly adjust their body position to keep their center of mass directly over the branch (support point)." },
    { question: "If you lean too far forward while standing, you fall because:", options: ["Your legs are too weak", "Your COM moves outside your base of support", "Gravity suddenly increases", "Wind pushes you over"], correct: 1, explanation: "When your COM moves outside the area between your feet (base of support), gravity creates an unbalanced torque and you fall." },
    { question: "A Weeble toy always rights itself because:", options: ["It contains magnets", "Its center of mass is very low", "It is filled with water", "It is perfectly round"], correct: 1, explanation: "Weebles have a heavy, rounded bottom that keeps the COM very low. Any tilt creates a restoring torque from gravity." }
  ];

  // Real-world applications
  const applications = [
    {
      id: 'tightrope',
      title: "Tightrope Walking",
      description: "Performers use long, curved poles that dip below the rope. This lowers their overall center of mass below the rope, creating remarkable stability.",
      formula: "Stable when COM < pivot height",
      insight: "Poles: 10-12m, 10-15kg",
      color: '#10b981',
    },
    {
      id: 'ship',
      title: "Ship Stability",
      description: "Ships have heavy ballast at the bottom to keep the center of mass low. This prevents capsizing even in rough seas and high waves.",
      formula: "Metacentric height = GM",
      insight: "GM: 0.5-2m for stability",
      color: '#0ea5e9',
    },
    {
      id: 'wine',
      title: "Wine Glass Balance",
      description: "A wine glass with liquid is more stable than when empty because the liquid lowers the center of mass closer to the wide base.",
      formula: "Lower COM = wider stability zone",
      insight: "COM drops ~2cm when filled",
      color: '#a855f7',
    },
    {
      id: 'standing',
      title: "Human Balance",
      description: "We constantly adjust our body position to keep our center of mass over our feet. That's why it's hard to stand still with eyes closed!",
      formula: "COM must stay over base of support",
      insight: "COM: ~55% of standing height",
      color: '#f59e0b',
    }
  ];

  // Visualization
  const renderVisualization = () => {
    const svgWidth = 400;
    const glassX = svgWidth / 2;
    const glassY = 180;
    const pivotY = glassY - 60;
    const { comY } = calculateBalance(clayPosition);

    return (
      <svg width="100%" height={260} viewBox={`0 0 ${svgWidth} 260`} className="block">
        <defs>
          <linearGradient id="com-glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="com-fork-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4dcd8" />
            <stop offset="100%" stopColor="#8a9a94" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={svgWidth} height={260} fill="#0f172a" />

        {/* Grid */}
        <pattern id="com-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
        <rect width={svgWidth} height={260} fill="url(#com-grid)" />

        {/* Table surface */}
        <rect x={0} y={glassY + 55} width={svgWidth} height={60} fill="#2d1f14" />
        <rect x={0} y={glassY + 55} width={svgWidth} height={4} fill="#4a3525" />

        {/* Glass */}
        <g>
          <path
            d={`M${glassX - 28} ${glassY + 55} L${glassX - 22} ${glassY - 55} Q${glassX} ${glassY - 60} ${glassX + 22} ${glassY - 55} L${glassX + 28} ${glassY + 55} Z`}
            fill="url(#com-glass-grad)"
            stroke="#7dd3fc"
            strokeWidth={2}
          />
          <ellipse cx={glassX} cy={glassY + 55} rx={28} ry={7} fill="#0284c7" opacity={0.5} />
        </g>

        {/* Pivot reference line */}
        <line x1={glassX - 100} y1={pivotY} x2={glassX + 100} y2={pivotY}
              stroke="#64748b" strokeWidth={1} strokeDasharray="5,5" opacity={0.5} />
        <text x={glassX + 108} y={pivotY + 4} fill="#64748b" fontSize={10} fontFamily="system-ui">
          Pivot
        </text>

        {/* Fork-toothpick system with rotation */}
        <g transform={`translate(${glassX}, ${pivotY}) rotate(${tiltAngle})`}>
          {/* Toothpick */}
          <rect x={-85} y={-4} width={170} height={8} rx={4} fill="#d4a574" />

          {/* Left Fork */}
          <g transform="translate(-70, 0) rotate(35)">
            <rect x={-6} y={0} width={12} height={55} rx={3} fill="url(#com-fork-grad)" />
            <ellipse cx={0} cy={60} rx={16} ry={7} fill="#b8c4c0" />
            {[-10, -3.5, 3.5, 10].map((x, i) => (
              <rect key={i} x={x - 2.5} y={60} width={5} height={22} rx={1} fill="#d4dcd8" />
            ))}
          </g>

          {/* Right Fork (mirrored) */}
          <g transform="translate(-70, 0) rotate(-35) scale(-1, 1)">
            <rect x={-6} y={0} width={12} height={55} rx={3} fill="url(#com-fork-grad)" />
            <ellipse cx={0} cy={60} rx={16} ry={7} fill="#b8c4c0" />
            {[-10, -3.5, 3.5, 10].map((x, i) => (
              <rect key={i} x={x - 2.5} y={60} width={5} height={22} rx={1} fill="#d4dcd8" />
            ))}
          </g>

          {/* Clay ball if added */}
          {hasClayAdded && (
            <g transform={`translate(${clayPosition * 65}, 0)`}>
              <circle cx={0} cy={0} r={14} fill="#d97706" stroke="#92400e" strokeWidth={2} />
              <ellipse cx={-4} cy={-4} rx={4} ry={3} fill="rgba(255,255,255,0.2)" />
            </g>
          )}

          {/* Center of mass indicator */}
          {showCOM && (
            <g transform={`translate(0, ${comY * 80})`}>
              <circle cx={0} cy={0} r={10} fill="#ef4444" />
              <circle cx={0} cy={0} r={5} fill="#fff" opacity={0.4} />
              <text x={18} y={4} fill="#ef4444" fontSize={11} fontWeight="700" fontFamily="system-ui">
                COM
              </text>
            </g>
          )}

          {/* Pivot point */}
          <circle cx={0} cy={0} r={5} fill="#fff" stroke="#10b981" strokeWidth={2} />
        </g>

        {/* Status badges */}
        <g transform="translate(16, 16)">
          <rect x={0} y={0} width={95} height={34} rx={8}
                fill={isBalanced ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}
                stroke={isBalanced ? '#22c55e' : '#ef4444'} strokeWidth={1} />
          <text x={47} y={22} textAnchor="middle"
                fill={isBalanced ? '#22c55e' : '#ef4444'}
                fontSize={12} fontWeight="700" fontFamily="system-ui">
            {isBalanced ? '✓ Balanced' : '✗ Falling!'}
          </text>
        </g>

        {showCOM && (
          <g transform={`translate(${svgWidth - 110}, 16)`}>
            <rect x={0} y={0} width={95} height={34} rx={8} fill="#1e293b"
                  stroke="#334155" strokeWidth={1} />
            <text x={47} y={14} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="system-ui">
              COM Position
            </text>
            <text x={47} y={28} textAnchor="middle"
                  fill={comY < 0 ? '#22c55e' : '#ef4444'}
                  fontSize={12} fontWeight="600" fontFamily="system-ui">
              {comY < 0 ? '↓ Below pivot' : '↑ Above pivot'}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Phase renderers
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent">
        The Impossible Balance
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        A toothpick with forks attached balances on the rim of a glass. Most of it hangs off the edge!
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">⚖️</div>
          <p className="text-xl text-white/90 font-medium leading-relaxed">
            "How can something hang off a table without falling?"
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <p className="mt-8 text-sm text-slate-500 tracking-wide">CENTER OF MASS • STABILITY</p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Make Your Prediction</h2>
      <p className="text-slate-400 mb-8">Why doesn't the fork-toothpick system fall off the glass?</p>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'light', label: 'The toothpick is very light', icon: '🪶' },
          { id: 'com_below', label: 'The center of mass is below the pivot', icon: '⬇️' },
          { id: 'friction', label: 'Friction holds it in place', icon: '🤝' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); setPrediction(option.id); playSound('click'); emitEvent('prediction_made', { prediction: option.id }); }}
            className={`p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
              prediction === option.id
                ? 'bg-emerald-600/30 border-2 border-emerald-400'
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
          onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
        >
          See It In Action! →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Balance Demonstration</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        {renderVisualization()}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-400">Show COM:</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowCOM(!showCOM); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${showCOM ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}
        >
          {showCOM ? 'ON' : 'OFF'}
        </button>
      </div>

      <p className="text-slate-300 text-center max-w-md mb-4">
        Notice how the <span className="text-red-400 font-semibold">center of mass</span> (red dot) is <strong>below</strong> the pivot point. This creates stability!
      </p>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl">
        I understand! →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Secret: Center of Mass</h2>

      <div className="bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 rounded-2xl p-6 max-w-lg mb-6">
        <p className="text-lg text-emerald-400 font-semibold text-center mb-2">COM below pivot = Stable equilibrium</p>
        <p className="text-slate-300 text-center">When the center of mass is below the support point, gravity creates a restoring torque that pulls it back to balance.</p>
      </div>

      <div className="grid gap-4 max-w-lg w-full">
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 font-semibold mb-1">Stable (COM below)</p>
          <p className="text-slate-300 text-sm">Tilt it, and gravity pulls it back. Like a pendulum!</p>
        </div>
        <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-semibold mb-1">Unstable (COM above)</p>
          <p className="text-slate-300 text-sm">Tilt it, and gravity tips it further. Falls over!</p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Your prediction: {prediction === 'com_below' ? '✅ Correct!' : '🤔 Now you understand!'}
      </p>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Can We Break It? →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Plot Twist: Add Clay!</h2>
      <p className="text-slate-400 mb-8">What if we stick a ball of clay on the toothpick? Where should we put it?</p>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'fork_side', label: 'Near the forks (left) - more stable' },
          { id: 'middle', label: 'In the middle - no change' },
          { id: 'other_side', label: 'Away from forks (right) - might fall!' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); setTwistPrediction(option.id); playSound('click'); emitEvent('twist_prediction_made', { twistPrediction: option.id }); }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option.id
                ? 'bg-amber-600/30 border-2 border-amber-400'
                : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
            }`}
          >
            <span className="text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        >
          Experiment! →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Clay Experiment</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        {renderVisualization()}
      </div>

      <p className="text-slate-300 mb-4">Where do you want to add clay?</p>

      <div className="flex gap-3 mb-4 flex-wrap justify-center">
        {[
          { pos: -0.8, label: '← Fork side' },
          { pos: 0, label: 'Middle' },
          { pos: 0.8, label: 'Other side →' }
        ].map((opt) => (
          <button
            key={opt.pos}
            onMouseDown={(e) => { e.preventDefault(); addClay(opt.pos); }}
            disabled={isAnimating || hasClayAdded}
            className={`px-4 py-2 rounded-lg font-medium bg-amber-600 hover:bg-amber-500 text-white ${(isAnimating || hasClayAdded) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {hasClayAdded && (
        <button onMouseDown={(e) => { e.preventDefault(); resetExperiment(); }}
          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl mb-4">
          ↺ Reset & Try Again
        </button>
      )}

      <p className="text-sm text-slate-500 mb-4">Experiments: {experimentCount}</p>

      {experimentCount >= 2 && (
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          I see the pattern! →
        </button>
      )}
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Shifting the Center of Mass</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-lg mb-6">
        <p className="text-slate-300 text-center mb-2">
          Adding weight <span className="text-emerald-400 font-semibold">on the fork side</span> lowers the COM further → <strong>more stable</strong>
        </p>
        <p className="text-slate-300 text-center">
          Adding weight <span className="text-red-400 font-semibold">on the other side</span> raises the COM → <strong>unstable, falls!</strong>
        </p>
      </div>

      <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 max-w-lg w-full mb-6">
        <p className="text-emerald-400 font-semibold text-center">
          The Rule: Keep your center of mass over (or below) your support point!
        </p>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        Your prediction: {twistPrediction === 'other_side' ? '✅ Correct!' : '🤔 Now you see why!'}
      </p>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl">
        See Real-World Examples →
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size >= applications.length;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Center of Mass in Action</h2>

        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {applications.map((_, idx) => (
            <div key={idx} className={`w-3 h-3 rounded-full ${completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {applications.map((a, idx) => (
            <button
              key={a.id}
              onMouseDown={(e) => { e.preventDefault(); setActiveApp(idx); }}
              disabled={idx > 0 && !completedApps.has(idx - 1)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeApp === idx ? 'bg-emerald-600 text-white'
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
              <p className="text-xs text-slate-500">Principle</p>
              <p className="text-sm text-white font-mono">{app.formula}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 flex-1 text-center">
              <p className="text-xs text-slate-500">Real Data</p>
              <p className="text-sm text-white">{app.insight}</p>
            </div>
          </div>

          {!completedApps.has(activeApp) && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: app.id });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              className="w-full py-3 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 font-medium rounded-xl"
            >
              ✓ Mark as Read
            </button>
          )}
        </div>

        {allAppsCompleted && (
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl">
            Take the Quiz →
          </button>
        )}
      </div>
    );
  };

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
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }} />
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full">
          <h3 className="text-lg text-white font-medium mb-4">{q.question}</h3>

          <div className="grid gap-3">
            {q.options.map((option, idx) => {
              let bgClass = 'bg-slate-700/50 hover:bg-slate-600/50';
              if (isAnswered) {
                if (idx === q.correct) bgClass = 'bg-emerald-600/30 border-emerald-500';
                else if (idx === selectedAnswer) bgClass = 'bg-red-600/30 border-red-500';
              }
              return (
                <button
                  key={idx}
                  onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(idx); }}
                  disabled={isAnswered}
                  className={`p-4 rounded-xl text-left border-2 transition-all ${bgClass} ${isAnswered ? 'cursor-default' : ''}`}
                >
                  <span className="text-slate-200">{option}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-4 p-4 bg-emerald-600/20 border border-emerald-500/30 rounded-xl">
              <p className="text-slate-300 text-sm">💡 {q.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between w-full max-w-lg mt-6">
          <button
            onMouseDown={(e) => { e.preventDefault(); setCurrentQuestion(prev => Math.max(0, prev - 1)); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion - 1)); }}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
          >
            ← Back
          </button>

          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); setCurrentQuestion(prev => prev + 1); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion + 1)); }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Next →
            </button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-medium rounded-lg"
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

  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-2">Balance Master!</h1>
        <div className="text-5xl font-bold text-emerald-400 mb-2">{percentage}%</div>
        <p className="text-slate-400 mb-8">{correctAnswers}/{testQuestions.length} correct answers</p>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md w-full mb-8">
          <h3 className="text-lg font-bold text-emerald-400 mb-4">Key Takeaways</h3>
          <ul className="text-left space-y-2">
            {['COM below pivot = stable equilibrium', 'COM above pivot = unstable, falls', 'Adding weight shifts the COM', 'Keep COM over support to balance'].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-slate-300">
                <span className="text-emerald-400">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setPhase(0);
            setExperimentCount(0);
            setCurrentQuestion(0);
            setCorrectAnswers(0);
            setAnsweredQuestions(new Set());
            setCompletedApps(new Set());
            setActiveApp(0);
            setPrediction(null);
            setTwistPrediction(null);
            resetExperiment();
          }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          ↺ Play Again
        </button>
      </div>
    );
  };

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Center of Mass</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-emerald-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default CenterOfMassRenderer;
