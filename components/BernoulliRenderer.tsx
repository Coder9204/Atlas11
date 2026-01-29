'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// BERNOULLI RENDERER - LIFT & FLUID DYNAMICS
// Premium 10-screen educational game with premium design
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
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
  onBack?: () => void;
}

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "You hold a strip of paper below your lips and blow across the top of it (not under it). What happens to the paper?",
    options: [
      { id: 'A', text: 'It bends downward from the force of air' },
      { id: 'B', text: 'It rises up toward the airflow' },
      { id: 'C', text: 'It stays perfectly still' },
      { id: 'D', text: 'It flaps back and forth randomly' },
    ],
    correct: 'B',
    explanation: "The paper rises! When you blow across the top, you create fast-moving air above and still air below. According to Bernoulli's principle, faster-moving air has LOWER pressure. The higher pressure below pushes the paper up into the low-pressure zone above. This is exactly how airplane wings generate lift!"
  },
  twist: {
    question: "A baseball pitcher throws a curveball. The ball spins as it travels, creating faster airflow on one side than the other. Which way does the ball curve?",
    options: [
      { id: 'A', text: 'Toward the side with faster-moving air (lower pressure)' },
      { id: 'B', text: 'Away from the side with faster-moving air' },
      { id: 'C', text: "It doesn't curve - that's an optical illusion" },
      { id: 'D', text: 'Straight down from gravity only' },
    ],
    correct: 'A',
    explanation: "The ball curves toward the low-pressure side! Spin drags air faster on one side (lower pressure) and slower on the other (higher pressure). The ball is pushed from high to low pressure - this is the Magnus effect! It's Bernoulli's principle applied to spinning objects."
  }
};

const realWorldApplications = [
  {
    id: 'airplane',
    title: 'Airplane Wings',
    icon: '✈️',
    subtitle: 'How 500 tons fly through air',
    description: 'Airplane wings are shaped so air travels faster over the curved top than under the flatter bottom. Faster air = lower pressure above the wing. The pressure difference creates lift - up to 500,000+ pounds for a 747!',
    formula: 'Lift = (1/2)rho*v^2*A*CL (air density x velocity^2 x wing area x lift coefficient)',
    realExample: 'A Boeing 747 wing creates enough lift to support 400 tons at takeoff speed of 180 mph.',
  },
  {
    id: 'curveball',
    title: 'Sports Spin',
    icon: '⚾',
    subtitle: 'Curving balls and soccer bends',
    description: "When a ball spins, it drags air faster on one side (creating low pressure) and slower on the other (higher pressure). The ball moves toward low pressure - that's the Magnus effect.",
    formula: 'Magnus Force proportional to spin rate x velocity x ball radius',
    realExample: 'A 90mph fastball with 2000 RPM spin can curve over 17 inches from a straight path!',
  },
  {
    id: 'venturi',
    title: 'Venturi Effect',
    icon: '💨',
    subtitle: 'Narrow pipes, fast flow',
    description: 'When fluid flows through a constriction, it speeds up (continuity) and pressure drops (Bernoulli). This powers carburetors, atomizers, and paint sprayers.',
    formula: 'A1*v1 = A2*v2 (continuity) + Bernoulli leads to P2 < P1 in narrow section',
    realExample: 'Perfume atomizers use venturi effect - fast air over a tube sucks up perfume to make mist.',
  },
  {
    id: 'shower',
    title: 'Shower Curtain Mystery',
    icon: '🚿',
    subtitle: 'Why it attacks you',
    description: 'Hot shower water creates a column of rising air (convection). This moving air has lower pressure than the still air outside. The pressure difference pushes the curtain inward!',
    formula: 'Moving air inside (low P) + Still air outside (high P) = Inward force',
    realExample: 'The shower curtain effect was officially studied and won an Ig Nobel Prize in 2001!',
  }
];

const quizQuestions = [
  {
    question: "According to Bernoulli's principle, when fluid speed increases, what happens to pressure?",
    options: [
      { text: "Pressure increases", correct: false },
      { text: "Pressure decreases", correct: true },
      { text: "Pressure stays the same", correct: false },
      { text: "Pressure becomes zero", correct: false },
    ],
  },
  {
    question: "How do airplane wings generate lift?",
    options: [
      { text: "By pushing air downward with propellers", correct: false },
      { text: "By creating higher pressure above the wing", correct: false },
      { text: "By creating lower pressure above the wing (faster airflow)", correct: true },
      { text: "By being lighter than air", correct: false },
    ],
  },
  {
    question: "What is the Bernoulli equation?",
    options: [
      { text: "F = ma", correct: false },
      { text: "E = mc^2", correct: false },
      { text: "P + (1/2)rho*v^2 + rho*g*h = constant", correct: true },
      { text: "PV = nRT", correct: false },
    ],
  },
  {
    question: "What causes a curveball to curve?",
    options: [
      { text: "Air resistance alone", correct: false },
      { text: "Gravity pulling it down", correct: false },
      { text: "The Magnus effect - spin creates pressure differences", correct: true },
      { text: "Optical illusion", correct: false },
    ],
  },
  {
    question: "What is the Venturi effect?",
    options: [
      { text: "Sound travels faster in tunnels", correct: false },
      { text: "Fluid speeds up and pressure drops in a constriction", correct: true },
      { text: "Water always flows downhill", correct: false },
      { text: "Hot air rises", correct: false },
    ],
  },
  {
    question: "Why does a shower curtain get sucked inward?",
    options: [
      { text: "Static electricity", correct: false },
      { text: "Water splashing on it", correct: false },
      { text: "Moving air from hot water has lower pressure than still air outside", correct: true },
      { text: "Magnetic forces", correct: false },
    ],
  },
  {
    question: "If you blow between two hanging pieces of paper, what happens?",
    options: [
      { text: "They blow apart", correct: false },
      { text: "They come together", correct: true },
      { text: "They don't move", correct: false },
      { text: "One rises, one falls", correct: false },
    ],
  },
  {
    question: "Why do race cars have spoilers that push down instead of up?",
    options: [
      { text: "To look cool", correct: false },
      { text: "Inverted wing shape creates downforce for better grip", correct: true },
      { text: "To reduce drag", correct: false },
      { text: "To cool the engine", correct: false },
    ],
  },
  {
    question: "What does the continuity equation state about fluid in a pipe?",
    options: [
      { text: "Pressure is constant", correct: false },
      { text: "Temperature is constant", correct: false },
      { text: "A1*v1 = A2*v2 (flow rate is constant)", correct: true },
      { text: "Density changes with speed", correct: false },
    ],
  },
  {
    question: "How do atomizers and spray bottles work?",
    options: [
      { text: "Pumping creates high pressure that pushes liquid out", correct: false },
      { text: "Fast air over a tube creates low pressure that sucks liquid up (Venturi)", correct: true },
      { text: "Chemical reaction produces gas", correct: false },
      { text: "Liquid is heated until it evaporates", correct: false },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BernoulliRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete, onBack }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive state for simulation
  const [airSpeed, setAirSpeed] = useState(50);
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [showPressure, setShowPressure] = useState(true);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [simulationMode, setSimulationMode] = useState<'wing' | 'ball'>('wing');
  const [ballSpin, setBallSpin] = useState(1500);
  const [animationTime, setAnimationTime] = useState(0);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationTime(t => t + 0.016);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });

    if (newPhase === 2) {
      setAirSpeed(50);
      setAngleOfAttack(5);
      setSimulationMode('wing');
    } else if (newPhase === 5) {
      setAirSpeed(50);
      setBallSpin(1500);
      setSimulationMode('ball');
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Calculate lift based on airspeed and angle of attack
  const calculateLift = useCallback((speed: number, angle: number) => {
    const stallAngle = 15;
    const effectiveAngle = Math.min(angle, stallAngle);
    const lift = (speed / 100) ** 2 * (effectiveAngle / 15) * 100;
    return Math.min(100, lift);
  }, []);

  // Calculate Magnus force for spinning ball
  const calculateMagnusForce = useCallback((speed: number, spin: number) => {
    return (speed / 100) * (spin / 2000) * 50;
  }, []);

  const lift = calculateLift(airSpeed, angleOfAttack);
  const magnusForce = calculateMagnusForce(airSpeed, ballSpin);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'A' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer >= 0 && quizQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  // ============================================================================
  // BERNOULLI SIMULATION VISUALIZATION
  // ============================================================================

  const renderWingSimulation = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 300;
    const centerX = simWidth / 2;
    const centerY = simHeight / 2;
    const wingLength = 120;

    return (
      <svg width={simWidth} height={simHeight} className="mx-auto">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
        </defs>

        <rect width={simWidth} height={simHeight} fill="url(#skyGrad)" />

        {/* Streamlines */}
        {showStreamlines && (
          <g>
            {[-50, -35, -20].map((yOffset, i) => {
              const compression = 1 - (lift / 200);
              const animOffset = (animationTime * airSpeed * 0.5 + i * 50) % simWidth;
              const yPos = centerY + yOffset * compression;
              return (
                <g key={`top-${i}`}>
                  <path
                    d={`M 0 ${yPos} Q ${centerX - 60} ${yPos} ${centerX - 20} ${yPos + yOffset * 0.3 * (lift / 100)} Q ${centerX + 20} ${yPos + yOffset * 0.5 * (lift / 100)} ${centerX + 60} ${yPos} L ${simWidth} ${yPos}`}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                  <circle cx={animOffset} cy={yPos} r={3} fill="#60a5fa" opacity={0.8} />
                </g>
              );
            })}
            {[20, 35, 50].map((yOffset, i) => {
              const spread = 1 + (lift / 400);
              const animOffset = (animationTime * airSpeed * 0.35 + i * 50) % simWidth;
              const yPos = centerY + yOffset * spread;
              return (
                <g key={`bottom-${i}`}>
                  <path
                    d={`M 0 ${yPos} Q ${centerX - 50} ${yPos} ${centerX - 15} ${yPos - yOffset * 0.2 * (lift / 100)} Q ${centerX + 50} ${yPos - yOffset * 0.1 * (lift / 100)} ${simWidth} ${yPos}`}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                  <circle cx={animOffset} cy={yPos} r={3} fill="#fbbf24" opacity={0.8} />
                </g>
              );
            })}
          </g>
        )}

        {/* Pressure regions */}
        {showPressure && (
          <g>
            <ellipse cx={centerX} cy={centerY - 25} rx={70} ry={25} fill="#60a5fa" opacity={0.2 + (lift / 200)} />
            <text x={centerX} y={centerY - 45} fill="#60a5fa" fontSize={11} textAnchor="middle" fontWeight="600">LOW PRESSURE</text>
            <ellipse cx={centerX} cy={centerY + 40} rx={60} ry={20} fill="#fbbf24" opacity={0.2 + (lift / 300)} />
            <text x={centerX} y={centerY + 60} fill="#fbbf24" fontSize={11} textAnchor="middle" fontWeight="600">HIGH PRESSURE</text>
          </g>
        )}

        {/* Airfoil */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${-angleOfAttack})`}>
          <path
            d={`M ${-wingLength / 2} 0 Q ${-wingLength / 4} ${-18} 0 ${-22} Q ${wingLength / 4} ${-18} ${wingLength / 2} 0 Q ${wingLength / 4} 5 0 7 Q ${-wingLength / 4} 5 ${-wingLength / 2} 0`}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={2}
          />
        </g>

        {/* Lift arrow */}
        {lift > 5 && (
          <g>
            <line x1={centerX} y1={centerY} x2={centerX} y2={centerY - lift * 0.7} stroke="#34d399" strokeWidth={4} />
            <polygon points={`${centerX},${centerY - lift * 0.7 - 12} ${centerX - 8},${centerY - lift * 0.7} ${centerX + 8},${centerY - lift * 0.7}`} fill="#34d399" />
            <text x={centerX + 15} y={centerY - lift * 0.35} fill="#34d399" fontSize={12} fontWeight="600">LIFT</text>
          </g>
        )}

        {/* Wind indicator */}
        <g>
          <line x1={25} y1={centerY} x2={65} y2={centerY} stroke="white" strokeWidth={2} />
          <polygon points={`65,${centerY} 55,${centerY - 5} 55,${centerY + 5}`} fill="white" />
          <text x={10} y={centerY - 12} fill="#94a3b8" fontSize={10}>Wind</text>
          <text x={10} y={centerY + 18} fill="#94a3b8" fontSize={10}>{airSpeed} m/s</text>
        </g>

        <text x={simWidth - 10} y={18} fill="#94a3b8" fontSize={11} textAnchor="end">Angle: {angleOfAttack}deg</text>
      </svg>
    );
  };

  const renderBallSimulation = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 300;
    const centerY = simHeight / 2;

    const ballX = (animationTime * airSpeed * 2) % (simWidth + 100) - 50;
    const curveAmount = magnusForce * 2;
    const ballY = centerY + Math.sin(ballX / 100) * curveAmount;
    const spinDirection = ballSpin > 0 ? 1 : -1;

    return (
      <svg width={simWidth} height={simHeight} className="mx-auto">
        <defs>
          <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
        </defs>

        <rect width={simWidth} height={simHeight} fill="url(#fieldGrad)" />

        {/* Trajectory path */}
        <path
          d={`M 50 ${centerY} Q ${simWidth / 2} ${centerY + curveAmount * 3} ${simWidth - 50} ${centerY}`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="10,5"
          opacity={0.5}
        />

        {/* Streamlines around ball */}
        {showStreamlines && ballX > 0 && ballX < simWidth && (
          <g transform={`translate(${ballX}, ${ballY})`}>
            <path d={`M -50 ${-15 * spinDirection} Q -15 ${-35 * spinDirection} 35 ${-15 * spinDirection}`} fill="none" stroke="#60a5fa" strokeWidth={2} opacity={0.6} />
            <text x={-8} y={-45 * spinDirection} fill="#60a5fa" fontSize={9} textAnchor="middle">Fast (Low P)</text>
            <path d={`M -50 ${15 * spinDirection} Q -15 ${25 * spinDirection} 35 ${15 * spinDirection}`} fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.6} />
            <text x={-8} y={50 * spinDirection} fill="#fbbf24" fontSize={9} textAnchor="middle">Slow (High P)</text>
          </g>
        )}

        {/* Baseball */}
        <g transform={`translate(${ballX}, ${ballY}) rotate(${animationTime * ballSpin * 0.1})`}>
          <circle r={22} fill="#f5f5f4" stroke="#a3a3a3" strokeWidth={2} />
          <path d="M -18 -8 Q -8 -18, 0 -13 Q 8 -8, 18 -13" fill="none" stroke="#dc2626" strokeWidth={2} />
          <path d="M -18 8 Q -8 18, 0 13 Q 8 8, 18 13" fill="none" stroke="#dc2626" strokeWidth={2} />
        </g>

        {/* Magnus force arrow */}
        {Math.abs(ballSpin) > 100 && ballX > 80 && ballX < simWidth - 80 && (
          <g transform={`translate(${ballX}, ${ballY})`}>
            <line x1={0} y1={0} x2={0} y2={-magnusForce * 1.2} stroke="#f472b6" strokeWidth={3} />
            <polygon points={`0,${-magnusForce * 1.2 - 8} -6,${-magnusForce * 1.2 + 3} 6,${-magnusForce * 1.2 + 3}`} fill="#f472b6" />
            <text x={12} y={-magnusForce * 0.6} fill="#f472b6" fontSize={10} fontWeight="600">Magnus</text>
          </g>
        )}

        <text x={simWidth - 10} y={18} fill="white" fontSize={11} textAnchor="end">Spin: {ballSpin} RPM</text>
        <text x={simWidth / 2} y={simHeight - 12} fill="#94a3b8" fontSize={11} textAnchor="middle">
          Ball curves {magnusForce > 0 ? 'UP' : magnusForce < 0 ? 'DOWN' : 'straight'} (Magnus effect)
        </text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">FLUID DYNAMICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
        Why Planes Fly
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        A 500-ton airplane floats through the air. How is this possible?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">✈️</div>
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
            <span className="text-xl font-mono text-blue-300">P + (1/2)rho*v^2 = constant</span>
          </div>
          <p className="text-xl text-white/90 font-medium leading-relaxed">
            Daniel Bernoulli discovered the answer 300 years ago: faster fluid = lower pressure.
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Lift
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-blue-400">*</span>Wing Simulation</div>
        <div className="flex items-center gap-2"><span className="text-blue-400">*</span>Magnus Effect</div>
        <div className="flex items-center gap-2"><span className="text-blue-400">*</span>Real Applications</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">{predictions.initial.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.initial.options.map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold mb-2">{selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'}</p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Bernoulli Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">See how airspeed and wing angle affect lift and pressure.</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
        {simulationMode === 'wing' ? renderWingSimulation() : renderBallSimulation()}
      </div>

      {/* Data panel */}
      <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-lg">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-blue-400">Airspeed</div>
          <div className="text-lg font-bold text-white">{airSpeed} m/s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-emerald-400">{simulationMode === 'wing' ? 'Lift' : 'Magnus Force'}</div>
          <div className="text-lg font-bold text-white">{simulationMode === 'wing' ? `${lift.toFixed(0)}%` : `${magnusForce.toFixed(1)} N`}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-amber-400">{simulationMode === 'wing' ? 'Angle' : 'Spin'}</div>
          <div className="text-lg font-bold text-white">{simulationMode === 'wing' ? `${angleOfAttack}deg` : `${ballSpin} RPM`}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <label className="text-blue-400 text-sm block mb-2">Air Speed: {airSpeed} m/s</label>
          <input type="range" min={10} max={100} value={airSpeed} onChange={(e) => setAirSpeed(Number(e.target.value))} className="w-full accent-blue-500" />
        </div>
        {simulationMode === 'wing' ? (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
            <label className="text-amber-400 text-sm block mb-2">Angle: {angleOfAttack}deg {angleOfAttack > 12 && <span className="text-pink-400">Near stall!</span>}</label>
            <input type="range" min={0} max={20} value={angleOfAttack} onChange={(e) => setAngleOfAttack(Number(e.target.value))} className="w-full accent-amber-500" />
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-500/30">
            <label className="text-pink-400 text-sm block mb-2">Ball Spin: {ballSpin} RPM</label>
            <input type="range" min={-2500} max={2500} value={ballSpin} onChange={(e) => setBallSpin(Number(e.target.value))} className="w-full accent-pink-500" />
          </div>
        )}
      </div>

      {/* Quick buttons */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button onMouseDown={() => setShowStreamlines(!showStreamlines)} className={`px-4 py-2 rounded-lg text-sm font-medium ${showStreamlines ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Flow {showStreamlines ? 'ON' : 'OFF'}
        </button>
        <button onMouseDown={() => setShowPressure(!showPressure)} className={`px-4 py-2 rounded-lg text-sm font-medium ${showPressure ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Pressure {showPressure ? 'ON' : 'OFF'}
        </button>
        <button onMouseDown={() => setSimulationMode('wing')} className={`px-4 py-2 rounded-lg text-sm font-medium ${simulationMode === 'wing' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Wing
        </button>
        <button onMouseDown={() => setSimulationMode('ball')} className={`px-4 py-2 rounded-lg text-sm font-medium ${simulationMode === 'ball' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Ball
        </button>
      </div>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Bernoulli's Principle</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6 border border-blue-700/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Bernoulli Equation</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-blue-300">P + (1/2)rho*v^2 + rho*g*h = const</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Pressure + Kinetic + Potential = constant</li>
            <li>Speed up = Pressure down</li>
            <li>Energy is conserved along streamline</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Wing Lift</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">💨</div>
              <div className="text-xs text-slate-400">Fast = Low P</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">🐌</div>
              <div className="text-xs text-slate-400">Slow = High P</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">⬆️</div>
              <div className="text-xs text-slate-400">Delta P = Lift</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm">Curved top = fast air = low pressure. Pressure difference creates upward force!</p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover the Magnus Effect
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Curveball Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <p className="text-lg text-slate-300 mb-4">{predictions.twist.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.twist.options.map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold mb-2">{twistPrediction === 'A' ? 'Excellent!' : 'Interesting guess!'}</p>
          <p className="text-slate-300 text-sm">{predictions.twist.explanation}</p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            See the Magnus Effect
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Magnus Effect Lab</h2>
      <p className="text-slate-400 mb-6 text-center">Watch how spin creates pressure differences that curve the ball!</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
        {renderBallSimulation()}
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <label className="text-blue-400 text-sm block mb-2">Pitch Speed: {airSpeed} m/s</label>
          <input type="range" min={10} max={100} value={airSpeed} onChange={(e) => setAirSpeed(Number(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-500/30">
          <label className="text-pink-400 text-sm block mb-2">Ball Spin: {ballSpin} RPM</label>
          <input type="range" min={-2500} max={2500} value={ballSpin} onChange={(e) => setBallSpin(Number(e.target.value))} className="w-full accent-pink-500" />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Backspin</span>
            <span>Topspin</span>
          </div>
        </div>
      </div>

      <div className="bg-pink-900/30 rounded-xl p-4 max-w-lg border border-pink-700/30 mb-6">
        <h3 className="text-pink-400 font-semibold mb-2">The Magnus Effect</h3>
        <p className="text-slate-300 text-sm">Spin drags air faster on one side (lower pressure) and slower on the other. The ball is pushed from high to low pressure - creating curves that seem to defy physics!</p>
      </div>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Magnus Effect Explained</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Spin Creates Pressure Differences</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-blue-400 font-semibold mb-2">Topspin</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Top moves with airflow (faster)</li>
              <li>Bottom moves against (slower)</li>
              <li>Ball curves DOWN</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-amber-400 font-semibold mb-2">Backspin</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Bottom moves with airflow (faster)</li>
              <li>Top moves against (slower)</li>
              <li>Ball curves UP (floats)</li>
            </ul>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mt-4 text-center">
          <span className="text-pink-400 font-mono">F_Magnus proportional to omega x v</span>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Bernoulli Everywhere</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {realWorldApplications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-blue-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{realWorldApplications[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{realWorldApplications[activeAppTab].title}</h3>
            <p className="text-slate-400 text-sm">{realWorldApplications[activeAppTab].subtitle}</p>
          </div>
        </div>
        <p className="text-slate-300 mb-4">{realWorldApplications[activeAppTab].description}</p>
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <span className="text-blue-400 text-sm font-mono">{realWorldApplications[activeAppTab].formula}</span>
        </div>
        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/30">
          <p className="text-emerald-400 text-sm">{realWorldApplications[activeAppTab].realExample}</p>
        </div>
        {!completedApps.has(activeAppTab) && (
          <button onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{realWorldApplications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full max-h-[60vh] overflow-y-auto">
          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); playSound('complete'); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered fluid dynamics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-indigo-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl border border-blue-700/30">
        <div className="text-8xl mb-6">✈️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Fluid Dynamics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered Bernoulli's Principle and the Magnus Effect!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">✈️</div><p className="text-sm text-slate-300">Airplane Lift</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚾</div><p className="text-sm text-slate-300">Curveballs</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💨</div><p className="text-sm text-slate-300">Venturi Effect</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🚿</div><p className="text-sm text-slate-300">Shower Curtain</p></div>
        </div>
        <div className="flex gap-3 justify-center">
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">Explore Again</button>
          {onBack && <button onMouseDown={(e) => { e.preventDefault(); onBack(); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl">Back to Menu</button>}
        </div>
      </div>
    </div>
  );

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Bernoulli's Principle</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : phase > p
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

export default BernoulliRenderer;
