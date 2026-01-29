'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CARTESIAN DIVER RENDERER - BUOYANCY & PRESSURE
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
}

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "You have a sealed plastic bottle filled with water and a small dropper with an air bubble inside. When you squeeze the bottle hard, what happens to the dropper?",
    options: [
      { id: 'A', text: 'Nothing - it stays in place' },
      { id: 'B', text: 'It rises to the top' },
      { id: 'C', text: 'It sinks to the bottom' },
      { id: 'D', text: 'It spins around' },
    ],
    correct: 'C',
    explanation: "When you squeeze the bottle, you increase the pressure throughout the water. This compresses the air bubble inside the dropper (Boyle's Law: PV = constant). With less air volume, the dropper displaces less water, reducing its buoyancy. When buoyancy becomes less than its weight, it sinks!"
  },
  twist: {
    question: "You adjust the dropper so it floats perfectly in the middle - neutrally buoyant. Now the temperature drops by 10°C. What happens?",
    options: [
      { id: 'A', text: "It stays perfectly neutral - temperature doesn't matter" },
      { id: 'B', text: 'It slowly sinks as the water contracts' },
      { id: 'C', text: 'It slowly rises as the air contracts more than water' },
      { id: 'D', text: 'It sinks because cold water is denser' },
    ],
    correct: 'C',
    explanation: "Gases contract much more than liquids when cooled! The air bubble shrinks significantly, while the water barely contracts. This reduces the dropper's buoyancy and it sinks. Real submarines face this challenge - cold ocean layers affect their buoyancy unexpectedly!"
  }
};

const realWorldApplications = [
  {
    id: 'submarines',
    title: 'Submarines',
    icon: '🚢',
    subtitle: 'Controlling buoyancy with ballast tanks',
    description: 'Submarines use the same principle as Cartesian divers! They have ballast tanks that can be filled with water (to sink) or compressed air (to rise).',
    formula: 'Buoyancy = rho_water x V_displaced x g = Weight for neutral buoyancy',
    realExample: 'A nuclear submarine can hover motionless at 300m depth by precisely balancing its ballast tanks.',
  },
  {
    id: 'fish',
    title: 'Fish Swim Bladders',
    icon: '🐟',
    subtitle: "Nature's buoyancy control",
    description: 'Most fish have a swim bladder - an internal air sac they can inflate or deflate. By adjusting the gas volume, fish control their buoyancy without constantly swimming.',
    formula: 'Fish adjusts V_bladder to match: rho_fish x V_fish = rho_water x V_fish',
    realExample: 'Goldfish can hover motionless by fine-tuning their swim bladder - no fin movement needed!',
  },
  {
    id: 'scuba',
    title: 'Scuba Diving',
    icon: '🤿',
    subtitle: 'BCD and pressure at depth',
    description: 'Scuba divers wear a BCD (Buoyancy Control Device) - an inflatable vest. As divers descend, increasing water pressure compresses air in their BCD.',
    formula: 'P1V1 = P2V2 - At 10m depth, air volume halves!',
    realExample: 'At 30m depth, a diver needs 4x as much air in their BCD as at the surface to maintain buoyancy.',
  },
  {
    id: 'density',
    title: 'Density Columns',
    icon: '⚗️',
    subtitle: 'Layered liquids and floating objects',
    description: 'Objects float at the level where their density matches the surrounding liquid. A density column demonstrates this beautifully.',
    formula: 'Object floats when: rho_object < rho_liquid, sinks when: rho_object > rho_liquid',
    realExample: "An egg sinks in fresh water but floats in salt water - the salt increases water density above the egg's.",
  }
];

const quizQuestions = [
  {
    question: "What happens to the air bubble in a Cartesian diver when you squeeze the bottle?",
    options: [
      { text: "It expands", correct: false },
      { text: "It compresses (gets smaller)", correct: true },
      { text: "It stays the same size", correct: false },
      { text: "It turns into water", correct: false },
    ],
  },
  {
    question: "What gas law explains why the air bubble changes size under pressure?",
    options: [
      { text: "Newton's Law", correct: false },
      { text: "Ohm's Law", correct: false },
      { text: "Boyle's Law (PV = constant)", correct: true },
      { text: "Murphy's Law", correct: false },
    ],
  },
  {
    question: "Why does compressing the air bubble make the diver sink?",
    options: [
      { text: "The diver gets heavier", correct: false },
      { text: "Less displaced water means less buoyant force", correct: true },
      { text: "The water pushes it down", correct: false },
      { text: "Air becomes heavier under pressure", correct: false },
    ],
  },
  {
    question: "What is the condition for neutral buoyancy (floating at a fixed depth)?",
    options: [
      { text: "Object must be hollow", correct: false },
      { text: "Object density equals water density", correct: true },
      { text: "Object must be made of plastic", correct: false },
      { text: "Water must be cold", correct: false },
    ],
  },
  {
    question: "How do submarines control their depth?",
    options: [
      { text: "By spinning propellers faster", correct: false },
      { text: "By adjusting ballast tanks (water vs air)", correct: true },
      { text: "By changing shape", correct: false },
      { text: "By heating the water around them", correct: false },
    ],
  },
  {
    question: "At 10 meters underwater, how does pressure compare to the surface?",
    options: [
      { text: "Same pressure", correct: false },
      { text: "About double (2 atm total)", correct: true },
      { text: "Ten times higher", correct: false },
      { text: "Half the pressure", correct: false },
    ],
  },
  {
    question: "Why do scuba divers need to add air to their BCD as they descend?",
    options: [
      { text: "To breathe easier", correct: false },
      { text: "To compensate for air compression from increased pressure", correct: true },
      { text: "To stay warm", correct: false },
      { text: "To see better", correct: false },
    ],
  },
  {
    question: "What does a fish's swim bladder do?",
    options: [
      { text: "Helps the fish breathe", correct: false },
      { text: "Stores food", correct: false },
      { text: "Controls buoyancy by adjusting gas volume", correct: true },
      { text: "Makes the fish swim faster", correct: false },
    ],
  },
  {
    question: "If you heat a Cartesian diver setup, what happens?",
    options: [
      { text: "The diver sinks (air expands)", correct: false },
      { text: "The diver rises (air expands, more buoyancy)", correct: true },
      { text: "Nothing changes", correct: false },
      { text: "The diver spins", correct: false },
    ],
  },
  {
    question: "Why can't deep-sea fish survive if brought to the surface quickly?",
    options: [
      { text: "They get cold", correct: false },
      { text: "It's too bright", correct: false },
      { text: "Their swim bladder expands rapidly and can rupture", correct: true },
      { text: "They can't breathe surface air", correct: false },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CartesianDiverRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
  const [pressure, setPressure] = useState(1.0);
  const [temperature, setTemperature] = useState(20);
  const [diverPosition, setDiverPosition] = useState(0.3);
  const [diverVelocity, setDiverVelocity] = useState(0);
  const [showForces, setShowForces] = useState(true);
  const [isSqueezing, setIsSqueezing] = useState(false);
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

    // Reset simulation for certain phases
    if (newPhase === 2) {
      setPressure(1.0);
      setTemperature(20);
      setDiverPosition(0.3);
      setDiverVelocity(0);
    } else if (newPhase === 5) {
      setPressure(1.0);
      setTemperature(20);
      setDiverPosition(0.5);
      setDiverVelocity(0);
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Calculate bubble size based on pressure and temperature
  const calculateBubbleSize = useCallback((p: number, t: number) => {
    const baseSize = 1.0;
    const baseTemp = 293;
    const currentTemp = t + 273;
    return baseSize * (1.0 / p) * (currentTemp / baseTemp);
  }, []);

  const bubbleSize = calculateBubbleSize(pressure, temperature);

  // Calculate buoyancy
  const calculateNetForce = useCallback((bubbleVol: number) => {
    const buoyancy = (bubbleVol - 0.85) * 2.0;
    return buoyancy;
  }, []);

  // Physics simulation
  useEffect(() => {
    const simulate = () => {
      setAnimationTime(t => t + 0.016);

      setDiverPosition(pos => {
        setDiverVelocity(vel => {
          const netForce = calculateNetForce(bubbleSize);
          const gravity = 0.001;
          const drag = 0.95;

          let newVel = (vel + netForce * 0.01 - gravity) * drag;
          newVel = Math.max(-0.02, Math.min(0.02, newVel));

          let newPos = pos - newVel;

          if (newPos < 0.05) {
            newPos = 0.05;
            newVel = Math.abs(newVel) * 0.3;
          }
          if (newPos > 0.9) {
            newPos = 0.9;
            newVel = -Math.abs(newVel) * 0.3;
          }

          return newVel;
        });

        return pos;
      });

      setDiverPosition(pos => {
        const newPos = pos - diverVelocity;
        return Math.max(0.05, Math.min(0.9, newPos));
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bubbleSize, calculateNetForce, diverVelocity]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
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

  const handleSqueezeStart = useCallback(() => {
    setIsSqueezing(true);
    setPressure(1.5);
  }, []);

  const handleSqueezeEnd = useCallback(() => {
    setIsSqueezing(false);
    setPressure(1.0);
  }, []);

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer >= 0 && quizQuestions[index].options[answer]?.correct ? 1 : 0), 0);
  const netForce = calculateNetForce(bubbleSize);

  // ============================================================================
  // DIVER SIMULATION VISUALIZATION
  // ============================================================================

  const renderDiverSimulation = () => {
    const simWidth = isMobile ? 320 : 400;
    const simHeight = 400;
    const bottleWidth = 120;
    const bottleHeight = 320;
    const bottleX = (simWidth - bottleWidth) / 2;
    const bottleY = 40;

    const diverY = bottleY + 30 + diverPosition * (bottleHeight - 80);
    const diverX = simWidth / 2;
    const bubbleRadius = 8 + bubbleSize * 12;

    return (
      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50">
        <svg width={simWidth} height={simHeight} className="mx-auto">
          <defs>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#88c0d0" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#88c0d0" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#88c0d0" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Bottle outline */}
          <rect
            x={bottleX - (isSqueezing ? 5 : 0)}
            y={bottleY}
            width={bottleWidth + (isSqueezing ? 10 : 0)}
            height={bottleHeight}
            rx={20}
            fill="url(#bottleGrad)"
            stroke="#88c0d0"
            strokeWidth={3}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water inside bottle */}
          <rect
            x={bottleX + 5 - (isSqueezing ? 4 : 0)}
            y={bottleY + 10}
            width={bottleWidth - 10 + (isSqueezing ? 8 : 0)}
            height={bottleHeight - 20}
            rx={15}
            fill="url(#waterGrad)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Animated bubbles */}
          {[...Array(8)].map((_, i) => {
            const bubbleYPos = ((animationTime * 30 + i * 45) % (bottleHeight - 40)) + bottleY + 20;
            const bubbleXPos = bottleX + 20 + (i % 3) * 35 + Math.sin(animationTime * 2 + i) * 5;
            return (
              <circle
                key={i}
                cx={bubbleXPos}
                cy={bottleY + bottleHeight - (bubbleYPos - bottleY)}
                r={2 + (i % 3)}
                fill="white"
                opacity={0.3}
              />
            );
          })}

          {/* The Diver */}
          <g transform={`translate(${diverX}, ${diverY})`}>
            <rect x={-8} y={-25} width={16} height={50} rx={4} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
            <ellipse cx={0} cy={-30} rx={10} ry={8} fill="#ef4444" />
            <ellipse cx={0} cy={-5} rx={bubbleRadius * 0.5} ry={bubbleRadius} fill="white" opacity={0.8} />
            <rect x={-3} y={25} width={6} height={8} fill="#6b7280" />
          </g>

          {/* Force arrows */}
          {showForces && (
            <g transform={`translate(${diverX + 40}, ${diverY})`}>
              <line x1={0} y1={0} x2={0} y2={-netForce * 500} stroke="#22c55e" strokeWidth={3} />
              <text x={5} y={-netForce * 250} fill="#22c55e" fontSize={10}>F_b</text>
              <line x1={20} y1={0} x2={20} y2={30} stroke="#fbbf24" strokeWidth={3} />
              <polygon points="20,35 15,25 25,25" fill="#fbbf24" />
              <text x={25} y={25} fill="#fbbf24" fontSize={10}>W</text>
            </g>
          )}

          {/* Pressure indicators */}
          {isSqueezing && (
            <>
              <polygon points={`${bottleX - 20},${bottleY + bottleHeight / 2} ${bottleX - 5},${bottleY + bottleHeight / 2 - 10} ${bottleX - 5},${bottleY + bottleHeight / 2 + 10}`} fill="#f472b6" />
              <polygon points={`${bottleX + bottleWidth + 20},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 - 10} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 + 10}`} fill="#f472b6" />
            </>
          )}

          <text x={simWidth / 2} y={simHeight - 10} fill="#94a3b8" fontSize={12} textAnchor="middle">
            {isSqueezing ? 'Squeezing! Pressure increased!' : 'Click and hold to squeeze bottle'}
          </text>
        </svg>

        {/* Data panel */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-pink-400">Pressure</div>
            <div className="text-lg font-bold text-white">{pressure.toFixed(2)} atm</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-cyan-400">Bubble Size</div>
            <div className="text-lg font-bold text-white">{(bubbleSize * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className={`text-xs ${netForce > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>Net Force</div>
            <div className="text-lg font-bold text-white">{netForce > 0 ? 'Rising' : 'Sinking'}</div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Cartesian Diver
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        A simple squeeze makes things sink. Release, and they rise.
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">🧪</div>
          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              This 17th-century toy reveals the same physics that lets submarines dive and fish hover.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Squeeze to sink, release to rise - but why?
            </p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-cyan-400">*</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-cyan-400">*</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-cyan-400">*</span>Knowledge Test</div>
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
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
          <p className="text-emerald-400 font-semibold mb-2">
            {selectedPrediction === 'C' ? 'Correct!' : 'Not quite!'}
          </p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Diver Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Press and hold to squeeze the bottle. Watch the air bubble and diver respond!</p>

      {renderDiverSimulation()}

      <div className="flex gap-3 justify-center my-6">
        <button
          onMouseDown={handleSqueezeStart}
          onMouseUp={handleSqueezeEnd}
          onMouseLeave={handleSqueezeEnd}
          onTouchStart={handleSqueezeStart}
          onTouchEnd={handleSqueezeEnd}
          className={`px-8 py-4 rounded-xl font-bold text-white transition-all ${
            isSqueezing
              ? 'bg-gradient-to-r from-pink-500 to-amber-500 scale-95'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg'
          }`}
        >
          {isSqueezing ? 'Squeezing!' : 'Hold to Squeeze'}
        </button>
        <button
          onMouseDown={() => setShowForces(!showForces)}
          className={`px-4 py-4 rounded-xl font-medium ${showForces ? 'bg-blue-600' : 'bg-slate-700'} text-white`}
        >
          Forces {showForces ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-lg border border-slate-700/50">
        <h3 className="text-cyan-400 font-semibold mb-2">Boyle's Law: PV = constant</h3>
        <p className="text-slate-300 text-sm">When pressure increases, the air bubble compresses. Less displaced water means less buoyancy!</p>
      </div>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Physics of Buoyancy</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6 border border-cyan-700/30">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Boyle's Law</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-cyan-300">P1V1 = P2V2</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Pressure up = Volume down</li>
            <li>Compressed bubble = less buoyancy</li>
            <li>Works at constant temperature</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Archimedes' Principle</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-emerald-300">F_b = rho * g * V</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Buoyancy = weight of displaced fluid</li>
            <li>Less volume displaced = less upward force</li>
            <li>Neutral buoyancy when forces balance</li>
          </ul>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
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
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
          <p className="text-emerald-400 font-semibold mb-2">{twistPrediction === 'C' ? 'Excellent!' : 'Interesting guess!'}</p>
          <p className="text-slate-300 text-sm">{predictions.twist.explanation}</p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            Explore Temperature Effects
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Temperature & Buoyancy</h2>
      <p className="text-slate-400 mb-6 text-center">Watch how temperature changes affect the air bubble and buoyancy!</p>

      {renderDiverSimulation()}

      <div className="bg-slate-800/50 rounded-xl p-4 w-full max-w-lg mb-4 border border-slate-700/50">
        <label className="text-amber-400 text-sm block mb-2">Temperature: {temperature}C</label>
        <input
          type="range"
          min={5}
          max={35}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Cold</span>
          <span>Warm</span>
        </div>
      </div>

      <div className="bg-amber-900/30 rounded-xl p-4 max-w-lg border border-amber-700/30">
        <h3 className="text-amber-400 font-semibold mb-2">Combined Gas Law: PV/T = constant</h3>
        <p className="text-slate-300 text-sm">Gases contract much more than liquids when cooled. Cold temperature shrinks the bubble more than the water!</p>
      </div>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Key Discovery</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Temperature Matters!</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-cyan-400 font-semibold mb-2">Cold Temperature</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Gas contracts more than liquid</li>
              <li>Bubble gets smaller</li>
              <li>Less buoyancy - sinks</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-pink-400 font-semibold mb-2">Warm Temperature</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Gas expands more than liquid</li>
              <li>Bubble gets larger</li>
              <li>More buoyancy - rises</li>
            </ul>
          </div>
        </div>
        <p className="text-emerald-400 font-medium mt-4">Submarines encounter thermoclines - invisible temperature layers that change buoyancy!</p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {realWorldApplications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-cyan-600 text-white'
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
          <span className="text-cyan-400 text-sm font-mono">{realWorldApplications[activeAppTab].formula}</span>
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
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl">
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered buoyancy physics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl border border-cyan-700/30">
        <div className="text-8xl mb-6">🧪</div>
        <h1 className="text-3xl font-bold text-white mb-4">Buoyancy Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered the Cartesian Diver and buoyancy physics!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🚢</div><p className="text-sm text-slate-300">Submarines</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🐟</div><p className="text-sm text-slate-300">Fish Bladders</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🤿</div><p className="text-sm text-slate-300">Scuba Diving</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚗️</div><p className="text-sm text-slate-300">Density Columns</p></div>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">Explore Again</button>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Cartesian Diver</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default CartesianDiverRenderer;
