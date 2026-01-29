'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
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

// Real-World Applications Data
const applications = [
  {
    id: 'rollercoaster',
    icon: '🎢',
    title: 'Roller Coasters',
    subtitle: 'Theme Park Engineering',
    description: 'The first hill of a roller coaster is always the highest because all subsequent motion relies on that initial potential energy.',
    physics: 'PE at top of first hill converts to KE throughout the ride. No motors push the cars after the initial climb.',
  },
  {
    id: 'hydropower',
    icon: '💧',
    title: 'Hydroelectric Dams',
    subtitle: 'Clean Energy Generation',
    description: 'Dams store water at height, converting gravitational PE into KE as water falls, then into electrical energy.',
    physics: 'Water PE = mgh converts to KE as it falls through penstocks. Turbines convert this to electricity.',
  },
  {
    id: 'pendulum',
    icon: '🕰️',
    title: 'Pendulum Clocks',
    subtitle: 'Timekeeping Precision',
    description: 'A pendulum continuously exchanges PE and KE. At extremes: max PE, zero KE. At bottom: max KE, min PE.',
    physics: 'The period depends only on length and gravity, not on mass or amplitude for small swings.',
  },
  {
    id: 'skateboard',
    icon: '🛹',
    title: 'Skateboard Half-Pipes',
    subtitle: 'Action Sports Physics',
    description: 'Skaters pump by extending legs at the bottom and crouching at the top, adding energy to go higher.',
    physics: 'Without pumping, max height equals starting height. Pumping adds work to increase total energy.',
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A marble is released from rest at height h. At what height will it have half kinetic and half potential energy?',
    options: [
      { text: 'h/4', correct: false },
      { text: 'h/2', correct: true },
      { text: 'h/3', correct: false },
      { text: '3h/4', correct: false }
    ]
  },
  {
    question: 'Why can\'t a roller coaster\'s second hill be higher than the first (without motors)?',
    options: [
      { text: 'Too scary', correct: false },
      { text: 'Not enough potential energy', correct: true },
      { text: 'Cars would derail', correct: false },
      { text: 'Air resistance', correct: false }
    ]
  },
  {
    question: 'A ball rolls down. At the bottom, speed is v. From twice the height, speed would be:',
    options: [
      { text: 'v', correct: false },
      { text: '2v', correct: false },
      { text: 'v*sqrt(2)', correct: true },
      { text: '4v', correct: false }
    ]
  },
  {
    question: 'What happens to mechanical energy when friction is present?',
    options: [
      { text: 'Disappears', correct: false },
      { text: 'Converts to thermal energy', correct: true },
      { text: 'Increases', correct: false },
      { text: 'Stays the same', correct: false }
    ]
  },
  {
    question: 'A pendulum swings from A to B. At which point is kinetic energy maximum?',
    options: [
      { text: 'At A (highest)', correct: false },
      { text: 'At B (other highest)', correct: false },
      { text: 'At the lowest point', correct: true },
      { text: 'Halfway', correct: false }
    ]
  },
  {
    question: 'Two marbles (m and 2m) released from same height. Their speeds at bottom are:',
    options: [
      { text: 'Heavier is faster', correct: false },
      { text: 'Lighter is faster', correct: false },
      { text: 'Same speed', correct: true },
      { text: 'Cannot determine', correct: false }
    ]
  },
  {
    question: 'Skater at top with 100J of PE. At bottom (ignoring friction), KE is:',
    options: [
      { text: '50J', correct: false },
      { text: '100J', correct: true },
      { text: '200J', correct: false },
      { text: '0J', correct: false }
    ]
  },
  {
    question: 'Which has MOST mechanical energy? Ball at 10m at rest, at 5m moving 10m/s, or at 0m moving 14m/s?',
    options: [
      { text: '10m at rest', correct: false },
      { text: '5m moving', correct: false },
      { text: '0m moving fast', correct: false },
      { text: 'All similar', correct: true }
    ]
  },
  {
    question: 'Hydroelectric dam: what is the intermediate form of energy?',
    options: [
      { text: 'Chemical', correct: false },
      { text: 'Nuclear', correct: false },
      { text: 'Kinetic energy of water', correct: true },
      { text: 'Thermal', correct: false }
    ]
  },
  {
    question: 'If ALL friction eliminated, a marble would:',
    options: [
      { text: 'Eventually stop', correct: false },
      { text: 'Return to exactly starting height', correct: true },
      { text: 'Go higher', correct: false },
      { text: 'Accelerate forever', correct: false }
    ]
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const EnergyConservationRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [marblePos, setMarblePos] = useState({ x: 50, y: 20 });
  const [marbleVel, setMarbleVel] = useState({ x: 0, y: 0 });
  const [friction, setFriction] = useState(0);
  const [trackType, setTrackType] = useState<'hill' | 'loop' | 'bowl'>('hill');

  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

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
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Track path calculations
  const getTrackY = useCallback((x: number, type: string): number => {
    if (type === 'hill') {
      const normalizedX = (x - 50) / 50;
      return 20 + 60 * (1 - normalizedX * normalizedX);
    } else if (type === 'loop') {
      if (x < 30) return 20 + (x / 30) * 50;
      if (x > 70) return 20 + ((100 - x) / 30) * 50;
      const loopX = (x - 50) / 20;
      const loopY = Math.sqrt(Math.max(0, 1 - loopX * loopX));
      return 50 - loopY * 25;
    } else if (type === 'bowl') {
      const normalizedX = (x - 50) / 50;
      return 20 + 60 * normalizedX * normalizedX;
    }
    return 50;
  }, []);

  // Physics simulation
  const runSimulation = useCallback(() => {
    if (!isRunning) return;
    const dt = 0.016;
    const g = 500;
    const frictionCoeff = friction * 0.01;

    setMarblePos(prev => {
      let newX = prev.x + marbleVel.x * dt;
      let newY = prev.y + marbleVel.y * dt;
      const trackY = getTrackY(newX, trackType);

      if (newY > trackY) {
        newY = trackY;
        const slope = (getTrackY(newX + 1, trackType) - getTrackY(newX - 1, trackType)) / 2;
        const normalAngle = Math.atan2(-1, slope);
        const speed = Math.sqrt(marbleVel.x ** 2 + marbleVel.y ** 2);
        const newSpeed = speed * (1 - frictionCoeff);

        setMarbleVel({
          x: newSpeed * Math.cos(normalAngle + Math.PI/2) * (marbleVel.x > 0 ? 1 : -1),
          y: Math.max(0, marbleVel.y * -0.3),
        });
      } else {
        setMarbleVel(v => ({ ...v, y: v.y + g * dt }));
      }

      if (newX < 5) { newX = 5; setMarbleVel(v => ({ ...v, x: -v.x * 0.5 })); }
      if (newX > 95) { newX = 95; setMarbleVel(v => ({ ...v, x: -v.x * 0.5 })); }

      return { x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) };
    });

    timeRef.current += dt;
    animationRef.current = requestAnimationFrame(runSimulation);
  }, [isRunning, marbleVel, friction, trackType, getTrackY]);

  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(runSimulation);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, runSimulation]);

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setMarblePos({ x: 10, y: 20 });
    setMarbleVel({ x: 0, y: 0 });
    timeRef.current = 0;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  const startSimulation = useCallback(() => {
    resetSimulation();
    setMarblePos({ x: 10, y: 20 });
    setMarbleVel({ x: 50, y: 0 });
    setIsRunning(true);
  }, [resetSimulation]);

  const calculateEnergy = useCallback(() => {
    const maxHeight = 80;
    const currentHeight = maxHeight - marblePos.y;
    const speed = Math.sqrt(marbleVel.x ** 2 + marbleVel.y ** 2);
    const pe = 10 * Math.max(0, currentHeight);
    const ke = 0.5 * speed ** 2 / 100;
    const total = pe + ke;
    return {
      potential: Math.min(100, (pe / 800) * 100),
      kinetic: Math.min(100, (ke / 800) * 100),
      total: Math.min(100, (total / 800) * 100),
    };
  }, [marblePos, marbleVel]);

  const handlePrediction = useCallback((id: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(id);
    playSound('click');
    onGameEvent?.({ type: 'prediction_made', data: { prediction: id } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((id: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(id);
    playSound('click');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction: id } });
  }, [playSound, onGameEvent]);

  const handleAppComplete = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, index]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { app: applications[index].title } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (testAnswers[testIndex] !== null) return;
    const newAnswers = [...testAnswers];
    newAnswers[testIndex] = answerIndex;
    setTestAnswers(newAnswers);
    const correct = testQuestions[testIndex].options[answerIndex]?.correct ?? false;
    playSound(correct ? 'success' : 'failure');
    onGameEvent?.({ type: 'test_answered', data: { answer: answerIndex, correct } });
  }, [testAnswers, testIndex, playSound, onGameEvent]);

  // Track visualization component
  const TrackVisualization = ({ type }: { type: string }) => {
    const energy = calculateEnergy();
    const trackPoints = [];
    for (let x = 0; x <= 100; x += 2) {
      trackPoints.push({ x, y: getTrackY(x, type) });
    }
    const pathD = trackPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 3} ${p.y * 2}`).join(' ');

    return (
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
        <svg viewBox="0 0 300 200" className="w-full h-48 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl">
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" y1={y * 2} x2="300" y2={y * 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          ))}
          <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <circle cx={marblePos.x * 3} cy={marblePos.y * 2} r="12" fill="url(#marbleGradient)" />
          <defs>
            <radialGradient id="marbleGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>
          </defs>
          <text x="10" y="25" fill="#64748b" fontSize="10">High PE</text>
          <text x="10" y="175" fill="#64748b" fontSize="10">Low PE</text>
        </svg>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-amber-400">Potential</span>
              <span className="text-xs text-amber-400">{Math.round(energy.potential)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${energy.potential}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-emerald-400">Kinetic</span>
              <span className="text-xs text-emerald-400">{Math.round(energy.kinetic)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${energy.kinetic}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-purple-400">Total</span>
              <span className="text-xs text-purple-400">{Math.round(energy.total)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 transition-all" style={{ width: `${energy.total}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-amber-200 bg-clip-text text-transparent">
        The Marble Coaster
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Watch a marble roll down a track. Why can't it go higher than where it started?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-amber-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-4">🎢</div>
          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Energy flows between potential and kinetic forms
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But the total energy stays constant!
            </p>
            <div className="pt-2">
              <p className="text-base text-purple-400 font-semibold">
                Discover the Law of Energy Conservation
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Make a Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-purple-400">*</span>PE = mgh</div>
        <div className="flex items-center gap-2"><span className="text-purple-400">*</span>KE = 1/2mv^2</div>
        <div className="flex items-center gap-2"><span className="text-purple-400">*</span>Conservation</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          If you release a marble from a certain height, how high can it roll on the other side?
        </p>
        <p className="text-sm text-slate-400 mt-2">Assume a smooth track with minimal friction.</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 0, label: 'Much lower than start', icon: '📉', description: 'It loses energy while rolling' },
          { id: 1, label: 'Exactly same height', icon: '=', description: 'Energy is perfectly conserved' },
          { id: 2, label: 'Slightly lower', icon: '📊', description: 'Some energy lost to friction' },
          { id: 3, label: 'Higher than start', icon: '📈', description: 'It gains energy going down' },
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={prediction !== null}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option.id
                ? (option.id === 1 || option.id === 2) ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : prediction !== null && (option.id === 1 || option.id === 2) ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="mr-3 text-xl">{option.icon}</span>
            <span className="text-white font-medium">{option.label}</span>
            <span className="text-slate-400 text-sm block mt-1 ml-9">{option.description}</span>
          </button>
        ))}
      </div>
      {prediction !== null && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            In a frictionless system: exactly same height. In reality: slightly lower due to friction!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-xl"
          >
            See It in Action
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Energy Transformation Lab</h2>
      <TrackVisualization type={trackType} />

      <div className="flex justify-center gap-4 mt-4 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            startSimulation();
            playSound('click');
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${isRunning ? 'bg-slate-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {isRunning ? 'Running...' : 'Release Marble'}
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            resetSimulation();
            playSound('click');
          }}
          className="px-6 py-2 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
        >
          Reset
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl w-full mb-4">
        <p className="text-slate-400 text-sm mb-3">Track Shape:</p>
        <div className="flex gap-2">
          {[
            { id: 'hill', label: 'Valley', icon: '=' },
            { id: 'bowl', label: 'Bowl', icon: 'U' },
            { id: 'loop', label: 'Loop', icon: 'O' },
          ].map((t) => (
            <button
              key={t.id}
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setTrackType(t.id as 'hill' | 'loop' | 'bowl');
                resetSimulation();
                playSound('click');
              }}
              className={`flex-1 py-2 rounded-lg text-center ${trackType === t.id ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-900/40 to-violet-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <p className="text-purple-300 text-sm text-center">
          <strong>Key Observation:</strong> Watch how PE and KE bars trade off while Total stays constant!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-xl"
      >
        Review the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Conservation of Mechanical Energy</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Potential Energy</h3>
          <p className="text-2xl text-white mb-2">PE = mgh</p>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Energy stored due to height</li>
            <li>* Maximum at top, zero at bottom</li>
            <li>* Depends on mass, gravity, height</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Kinetic Energy</h3>
          <p className="text-2xl text-white mb-2">KE = 1/2 mv^2</p>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Energy of motion</li>
            <li>* Maximum at bottom, zero at top</li>
            <li>* Depends on mass and velocity</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-violet-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">The Conservation Law</h3>
          <p className="text-2xl text-white text-center mb-4">PE + KE = Constant</p>
          <p className="text-slate-300 text-sm">
            In the absence of friction, the total mechanical energy remains constant. Energy transforms between potential and kinetic forms, but the total never changes.
          </p>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Discover the Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist: What About Friction?</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          How does friction affect the marble's maximum height?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 0, label: 'Height depends on friction', icon: '🔥', description: 'More friction = lower final height' },
          { id: 1, label: 'Friction doesn\'t matter', icon: '🧊', description: 'Height is always the same' },
          { id: 2, label: 'Speed at bottom changes', icon: '*', description: 'Friction changes speed but not max height' },
          { id: 3, label: 'Energy disappears', icon: '?', description: 'Friction destroys energy completely' },
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option.id
                ? option.id === 0 ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : twistPrediction !== null && option.id === 0 ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="mr-3 text-xl">{option.icon}</span>
            <span className="text-white font-medium">{option.label}</span>
            <span className="text-slate-400 text-sm block mt-1 ml-9">{option.description}</span>
          </button>
        ))}
      </div>
      {twistPrediction !== null && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 0 ? 'Correct!' : 'Actually:'} More friction means more energy converted to heat, so lower final height!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            Test With Friction
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Friction's Effect on Energy</h2>
      <TrackVisualization type="hill" />

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl w-full mt-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-medium">Friction Level</span>
          <span className={`font-bold ${friction > 50 ? 'text-red-400' : friction > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {friction}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="80"
          value={friction}
          onChange={(e) => setFriction(Number(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full cursor-pointer"
        />
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>Ice (0%)</span>
          <span>Wood</span>
          <span>Carpet (80%)</span>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            startSimulation();
            playSound('click');
          }}
          className="px-6 py-2 rounded-lg font-medium bg-emerald-600 text-white"
        >
          {isRunning ? 'Running...' : 'Release Marble'}
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            resetSimulation();
            playSound('click');
          }}
          className="px-6 py-2 rounded-lg font-medium bg-slate-700 text-slate-300"
        >
          Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-900/40 to-red-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <p className="text-amber-300 text-sm text-center">
          <strong>Watch:</strong> The total energy bar decreases with friction! Energy becomes heat.
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Review Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Energy Transforms, Never Disappears</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-red-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">First Law of Thermodynamics</h3>
        <p className="text-lg text-purple-400 text-center mb-4">
          Energy cannot be created or destroyed, only transformed
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap text-center">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-amber-400 font-bold">PE + KE</div>
            <div className="text-xs text-slate-400">Mechanical</div>
          </div>
          <span className="text-2xl text-slate-400">-&gt;</span>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-emerald-400 font-bold">Less PE + KE</div>
            <div className="text-xs text-slate-400">Mechanical</div>
          </div>
          <span className="text-2xl text-slate-400">+</span>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-red-400 font-bold">Heat</div>
            <div className="text-xs text-slate-400">Thermal</div>
          </div>
        </div>
      </div>
      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mb-6">
        <p className="text-amber-400 font-semibold mb-2">Real World Example: Car Brakes</p>
        <p className="text-slate-300 text-sm">
          When you brake, kinetic energy becomes heat in the brake pads. That's why brakes get hot!
          Hybrid cars recover some energy using regenerative braking.
        </p>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-slate-400 mb-4">Explore each application</p>
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
        {applications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveApp(index); handleAppComplete(index); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-emerald-500 bg-emerald-900/30'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-slate-400 text-xs mt-1">{app.subtitle}</p>
            {completedApps.has(index) && <span className="text-emerald-400 text-xs">Explored!</span>}
          </button>
        ))}
      </div>

      {completedApps.size > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 max-w-lg w-full mb-6">
          <h4 className="text-white font-semibold mb-2">{applications[activeApp].title}</h4>
          <p className="text-slate-300 text-sm mb-2">{applications[activeApp].description}</p>
          <p className="text-purple-400 text-sm">{applications[activeApp].physics}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-xl"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    if (testSubmitted) {
      const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0);
      const passed = totalCorrect >= 7;
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Score: {totalCorrect}/10</h2>
          <p className="text-slate-300 mb-6">{passed ? 'Excellent! You\'ve mastered energy conservation!' : 'Keep studying! Review and try again.'}</p>
          {passed ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); playSound('complete'); goToPhase(9); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setTestAnswers(Array(10).fill(null)); setTestIndex(0); setTestSubmitted(false); goToPhase(3); }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    const q = testQuestions[testIndex];
    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white text-center mb-6">Quiz: Question {testIndex + 1}/{testQuestions.length}</h2>
        <div className="flex gap-1 mb-4">
          {testQuestions.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${
              testAnswers[i] !== null
                ? testQuestions[i].options[testAnswers[i] as number]?.correct ? 'bg-emerald-500' : 'bg-red-500'
                : i === testIndex ? 'bg-purple-400' : 'bg-slate-600'
            }`} />
          ))}
        </div>
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
          <p className="text-lg text-slate-300">{q.question}</p>
        </div>
        <div className="grid gap-3 w-full max-w-xl">
          {q.options.map((option, i) => {
            const isSelected = testAnswers[testIndex] === i;
            const isCorrect = option.correct;
            const showResult = testAnswers[testIndex] !== null;
            return (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(i); }}
                disabled={showResult}
                className={`p-4 rounded-xl text-left transition-all duration-300 ${
                  showResult
                    ? isCorrect ? 'bg-emerald-600/40 border-2 border-emerald-400'
                    : isSelected ? 'bg-red-600/40 border-2 border-red-400'
                    : 'bg-slate-700/50 border-2 border-transparent'
                    : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                }`}
              >
                <span className="font-bold text-white mr-2">{String.fromCharCode(65 + i)}.</span>
                <span className="text-slate-200">{option.text}</span>
              </button>
            );
          })}
        </div>
        {testAnswers[testIndex] !== null && (
          <div className="mt-6 flex gap-4">
            {testIndex > 0 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setTestIndex(testIndex - 1); }}
                className="px-6 py-3 bg-slate-700 text-white rounded-xl"
              >
                Previous
              </button>
            )}
            {testIndex < testQuestions.length - 1 ? (
              <button
                onMouseDown={(e) => { e.preventDefault(); setTestIndex(testIndex + 1); }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-xl"
              >
                Next Question
              </button>
            ) : (
              <button
                onMouseDown={(e) => { e.preventDefault(); setTestSubmitted(true); }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              >
                See Results
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-purple-900/50 via-violet-900/50 to-indigo-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-4">Energy Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered the law of energy conservation!</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🎢</div><p className="text-sm text-slate-300">PE <-> KE</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔥</div><p className="text-sm text-slate-300">Energy Loss</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">*</div><p className="text-sm text-slate-300">Applications</p></div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <p className="text-purple-400 text-sm mb-1">Key Formula Mastered</p>
          <p className="text-xl text-white">E = PE + KE = mgh + 1/2 mv^2 = constant</p>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Energy Conservation</span>
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

export default EnergyConservationRenderer;
