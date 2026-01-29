'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// HEAT TRANSFER CAPACITY RENDERER - THERMAL PHYSICS
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
    question: "A metal spoon and a wooden spoon have been sitting at room temperature (20C) all day. When you touch them, which will feel colder?",
    options: [
      { id: 'A', text: 'Metal feels colder - it conducts heat from your hand faster' },
      { id: 'B', text: 'Wood feels colder - it absorbs heat from the room' },
      { id: 'C', text: 'Both feel the same - they are the same temperature' },
      { id: 'D', text: "Metal feels warmer - it's denser" },
    ],
    correct: 'A',
    explanation: "Metal feels colder even though both are at 20C! Metal has high thermal conductivity (k), so it rapidly draws heat away from your 37C hand. Wood is an insulator with low k, so heat transfers slowly and it feels warmer. Your nerves sense heat FLOW, not temperature!"
  },
  twist: {
    question: "You put equal masses of water, oil, aluminum, and iron on identical burners providing equal heat. Which reaches 100C first?",
    options: [
      { id: 'A', text: 'Water heats fastest - it absorbs heat well' },
      { id: 'B', text: 'Oil heats fastest - used for frying' },
      { id: 'C', text: 'Metals heat fastest - they have low specific heat capacity' },
      { id: 'D', text: 'All heat at the same rate - same heat input' },
    ],
    correct: 'C',
    explanation: "Metals win the race! Specific heat capacity (c) is the energy needed to raise 1g by 1C. Metals have low c (iron: 0.45 J/gC), so they need less energy per degree. Water has high c (4.18 J/gC), making it a thermal buffer that resists temperature change."
  }
};

const materials: Record<string, { k: number; name: string; color: string; description: string }> = {
  copper: { k: 401, name: 'Copper', color: '#f97316', description: 'Excellent conductor - used in cookware, electronics' },
  aluminum: { k: 237, name: 'Aluminum', color: '#94a3b8', description: 'Good conductor - lightweight, used in heat sinks' },
  steel: { k: 50, name: 'Steel', color: '#64748b', description: 'Moderate conductor - durable, used in construction' },
  glass: { k: 1.05, name: 'Glass', color: '#22d3ee', description: 'Poor conductor - used for insulation, windows' },
  wood: { k: 0.12, name: 'Wood', color: '#a3e635', description: 'Excellent insulator - why wooden spoons stay cool' }
};

const specificHeats: Record<string, { c: number; name: string; color: string }> = {
  water: { c: 4.18, name: 'Water', color: '#3b82f6' },
  oil: { c: 2.0, name: 'Cooking Oil', color: '#eab308' },
  aluminum: { c: 0.90, name: 'Aluminum', color: '#94a3b8' },
  iron: { c: 0.45, name: 'Iron', color: '#64748b' }
};

const realWorldApplications = [
  {
    id: 'cooking',
    title: 'Cooking & Cookware',
    icon: '🍳',
    subtitle: 'Heat distribution in the kitchen',
    description: 'High-quality cookware uses copper or aluminum bottoms for even heat distribution. Cast iron maintains temperature when food is added. Wooden handles stay cool due to low thermal conductivity.',
    formula: "Fourier's Law: Q/t = -kA(dT/dx)",
    realExample: 'Copper-clad pans cook more evenly: higher k means heat spreads faster laterally, eliminating hot spots.',
  },
  {
    id: 'building',
    title: 'Building Insulation',
    icon: '🏠',
    subtitle: 'Energy efficiency',
    description: 'Buildings use low-conductivity materials (fiberglass, foam, aerogel) to minimize heat transfer. Double-pane windows trap air - an excellent insulator with k = 0.025 W/mK.',
    formula: 'R-value = thickness / k',
    realExample: 'Doubling wall thickness halves heat loss. Air gaps work because still air is 1,600x less conductive than concrete.',
  },
  {
    id: 'electronics',
    title: 'Electronics Cooling',
    icon: '💻',
    subtitle: 'Heat sink design',
    description: 'Computer processors generate intense heat in tiny areas. Heat sinks use high-k metals (copper, aluminum) to spread heat, while thermal paste fills microscopic air gaps.',
    formula: 'Heat flows: CPU -> thermal paste -> heat sink -> fins -> air',
    realExample: 'A high-end CPU generates 150W of heat. Copper heat sinks spread this across large surface areas for dissipation.',
  },
  {
    id: 'climate',
    title: 'Climate & Weather',
    icon: '🌊',
    subtitle: 'Ocean heat capacity',
    description: "Oceans absorb 90% of global warming's excess heat. Water's high specific heat capacity (4.18 J/gC) moderates temperature swings, making coastal cities milder.",
    formula: 'Q = mcDeltaT - large m and c mean small DeltaT',
    realExample: 'San Francisco has mild weather year-round while inland Sacramento has extreme temps - same latitude, different heat capacity effects.',
  }
];

const quizQuestions = [
  {
    question: "Why does metal feel colder than wood at the same temperature?",
    options: [
      { text: "Metal is actually colder", correct: false },
      { text: "Metal conducts heat away from your hand faster", correct: true },
      { text: "Wood absorbs more heat", correct: false },
      { text: "Metal reflects body heat", correct: false },
    ],
  },
  {
    question: "What does thermal conductivity (k) measure?",
    options: [
      { text: "How hot something can get", correct: false },
      { text: "How fast heat flows through a material", correct: true },
      { text: "How much heat something stores", correct: false },
      { text: "How well something insulates", correct: false },
    ],
  },
  {
    question: "Which has the highest specific heat capacity?",
    options: [
      { text: "Iron (0.45 J/gC)", correct: false },
      { text: "Aluminum (0.90 J/gC)", correct: false },
      { text: "Water (4.18 J/gC)", correct: true },
      { text: "Copper (0.39 J/gC)", correct: false },
    ],
  },
  {
    question: "Why do coastal cities have milder climates?",
    options: [
      { text: "Ocean breezes", correct: false },
      { text: "Less pollution", correct: false },
      { text: "Water's high heat capacity buffers temperature changes", correct: true },
      { text: "Lower elevation", correct: false },
    ],
  },
  {
    question: "What is Fourier's Law of heat conduction?",
    options: [
      { text: "E = mc^2", correct: false },
      { text: "Q/t = -kA(dT/dx)", correct: true },
      { text: "PV = nRT", correct: false },
      { text: "F = ma", correct: false },
    ],
  },
  {
    question: "Why does doubling wall thickness halve heat loss?",
    options: [
      { text: "More material blocks heat", correct: false },
      { text: "Temperature gradient (dT/dx) is halved", correct: true },
      { text: "Air gets trapped", correct: false },
      { text: "Insulation absorbs heat", correct: false },
    ],
  },
  {
    question: "What makes copper better than aluminum for cookware bottoms?",
    options: [
      { text: "Copper is cheaper", correct: false },
      { text: "Copper has higher thermal conductivity (401 vs 237 W/mK)", correct: true },
      { text: "Copper is lighter", correct: false },
      { text: "Copper stores more heat", correct: false },
    ],
  },
  {
    question: "Why does water take so long to boil compared to metals?",
    options: [
      { text: "Water is a liquid", correct: false },
      { text: "Water has high specific heat - needs more energy per degree", correct: true },
      { text: "Water evaporates", correct: false },
      { text: "Water conducts heat poorly", correct: false },
    ],
  },
  {
    question: "What fills the gap between CPU and heat sink?",
    options: [
      { text: "Air", correct: false },
      { text: "Thermal paste - fills air gaps that would insulate", correct: true },
      { text: "Water", correct: false },
      { text: "Vacuum", correct: false },
    ],
  },
  {
    question: "Q = mcDeltaT: if c doubles, what happens to DeltaT for same Q?",
    options: [
      { text: "Doubles", correct: false },
      { text: "Halves", correct: true },
      { text: "Stays same", correct: false },
      { text: "Quadruples", correct: false },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HeatTransferCapacityRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
  const [selectedMaterial, setSelectedMaterial] = useState<'copper' | 'aluminum' | 'steel' | 'glass' | 'wood'>('copper');
  const [heatSource, setHeatSource] = useState(100);
  const [barTemperatures, setBarTemperatures] = useState<number[]>(Array(20).fill(25));
  const [isHeating, setIsHeating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Twist phase - heat capacity
  const [substanceTemps, setSubstanceTemps] = useState<Record<string, number>>({ water: 25, oil: 25, aluminum: 25, iron: 25 });
  const [heatingStarted, setHeatingStarted] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

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

  // Heat conduction simulation
  useEffect(() => {
    if (phase === 2 && isHeating) {
      const interval = setInterval(() => {
        setElapsedTime(t => t + 0.1);
        setBarTemperatures(prev => {
          const newTemps = [...prev];
          const k = materials[selectedMaterial].k;
          const alpha = k * 0.0001;
          newTemps[0] = heatSource;
          for (let i = 1; i < newTemps.length - 1; i++) {
            const heatFlow = alpha * (newTemps[i - 1] - 2 * newTemps[i] + newTemps[i + 1]);
            newTemps[i] = Math.min(heatSource, Math.max(25, newTemps[i] + heatFlow));
          }
          newTemps[newTemps.length - 1] = Math.max(25, newTemps[newTemps.length - 1] + alpha * (newTemps[newTemps.length - 2] - newTemps[newTemps.length - 1]) - 0.1);
          return newTemps;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, isHeating, selectedMaterial, heatSource]);

  // Heat capacity simulation
  useEffect(() => {
    if (phase === 5 && heatingStarted) {
      const interval = setInterval(() => {
        setSubstanceTemps(prev => {
          const newTemps = { ...prev };
          const heatInput = 50;
          const mass = 100;
          Object.keys(specificHeats).forEach(sub => {
            if (newTemps[sub] < 100) {
              const deltaT = heatInput / (mass * specificHeats[sub].c);
              newTemps[sub] = Math.min(100, newTemps[sub] + deltaT * 0.1);
            }
          });
          return newTemps;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, heatingStarted]);

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
      setBarTemperatures(Array(20).fill(25));
      setIsHeating(false);
      setElapsedTime(0);
    } else if (newPhase === 5) {
      setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 });
      setHeatingStarted(false);
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'A' ? 'success' : 'failure');
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

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer >= 0 && quizQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  // ============================================================================
  // HEAT CONDUCTION VISUALIZATION
  // ============================================================================

  const renderHeatConductionViz = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 280;
    const barWidth = simWidth - 100;
    const material = materials[selectedMaterial];

    return (
      <svg width={simWidth} height={simHeight} className="mx-auto">
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={simWidth} height={simHeight} fill="#020617" />

        {/* Flame */}
        {isHeating && (
          <g transform={`translate(30, ${simHeight / 2 - 40})`}>
            <ellipse cx={15} cy={30} rx={15} ry={30} fill="url(#flameGrad)" opacity={0.9}>
              <animate attributeName="ry" values="25;35;25" dur="0.3s" repeatCount="indefinite" />
            </ellipse>
          </g>
        )}

        {/* Heat source label */}
        <text x={30} y={simHeight / 2 + 50} fill="#f97316" fontSize={12} textAnchor="middle">{heatSource}C</text>

        {/* Metal bar with temperature gradient */}
        <g transform={`translate(60, ${simHeight / 2 - 15})`}>
          {barTemperatures.map((temp, i) => {
            const segWidth = barWidth / barTemperatures.length;
            const t = Math.min(1, Math.max(0, (temp - 25) / 75));
            const r = Math.round(59 + t * 180);
            const g = Math.round(130 - t * 80);
            const b = Math.round(246 - t * 200);
            return (
              <rect
                key={i}
                x={i * segWidth}
                y={0}
                width={segWidth + 1}
                height={30}
                rx={i === 0 ? 4 : i === barTemperatures.length - 1 ? 4 : 0}
                fill={`rgb(${r},${g},${b})`}
              />
            );
          })}
          <rect x={0} y={0} width={barWidth} height={30} rx={4} fill="none" stroke="#334155" strokeWidth={2} />
          <text x={barWidth / 2} y={22} fill="white" fontSize={12} textAnchor="middle" fontWeight="bold">{material.name} (k={material.k})</text>
        </g>

        {/* Temperature labels */}
        <text x={65} y={simHeight / 2 + 35} fill="#94a3b8" fontSize={10}>Hot: {Math.round(barTemperatures[0])}C</text>
        <text x={60 + barWidth - 5} y={simHeight / 2 + 35} fill="#94a3b8" fontSize={10} textAnchor="end">Cold: {Math.round(barTemperatures[barTemperatures.length - 1])}C</text>

        {/* Time and equation */}
        <text x={simWidth - 10} y={20} fill="#94a3b8" fontSize={11} textAnchor="end">Time: {elapsedTime.toFixed(1)}s</text>
        <rect x={simWidth / 2 - 100} y={simHeight - 40} width={200} height={30} rx={8} fill="#0f172a" stroke="#334155" />
        <text x={simWidth / 2} y={simHeight - 20} fill="#f97316" fontSize={12} textAnchor="middle" fontWeight="bold">Q/t = -kA(dT/dx)</text>
      </svg>
    );
  };

  // ============================================================================
  // HEAT CAPACITY VISUALIZATION
  // ============================================================================

  const renderHeatCapacityViz = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 280;

    return (
      <svg width={simWidth} height={simHeight} className="mx-auto">
        <defs>
          <linearGradient id="flameGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>

        <rect width={simWidth} height={simHeight} fill="#020617" />

        {/* Four beakers */}
        {Object.entries(specificHeats).map(([key, data], idx) => {
          const x = 40 + idx * (simWidth - 80) / 4;
          const temp = substanceTemps[key];
          const fillHeight = ((temp - 25) / 75) * 80;
          const isWinner = temp >= 100;

          return (
            <g key={key} transform={`translate(${x}, 30)`}>
              {/* Beaker */}
              <path d="M 0 0 L 0 100 Q 0 115 15 115 L 55 115 Q 70 115 70 100 L 70 0 Z" fill="#0f172a" stroke="#334155" strokeWidth={2} />

              {/* Liquid */}
              <rect x={3} y={115 - fillHeight - 15} width={64} height={fillHeight + 12} fill={data.color} opacity={0.6} rx={2} />

              {/* Bubbles when heating */}
              {heatingStarted && temp > 50 && (
                <g>
                  {[0, 1, 2].map(i => (
                    <circle key={i} cx={20 + i * 15} r={3} fill={data.color} opacity={0.5}>
                      <animate attributeName="cy" values={`${100 - (temp - 50) * 0.5};60;${100 - (temp - 50) * 0.5}`} dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>
              )}

              {/* Temperature */}
              <rect x={10} y={40} width={50} height={22} rx={4} fill="#020617" opacity={0.8} />
              <text x={35} y={56} textAnchor="middle" fill={isWinner ? '#10b981' : 'white'} fontSize={13} fontWeight="bold">{Math.round(temp)}C</text>
              {isWinner && <text x={35} y={75} textAnchor="middle" fontSize={16}>🏆</text>}

              {/* Label */}
              <text x={35} y={135} textAnchor="middle" fill={data.color} fontSize={11} fontWeight="bold">{data.name}</text>
              <text x={35} y={148} textAnchor="middle" fill="#64748b" fontSize={9}>c={data.c}</text>

              {/* Flame */}
              {heatingStarted && (
                <ellipse cx={35} cy={125} rx={12} ry={15} fill="url(#flameGrad2)" opacity={0.7}>
                  <animate attributeName="ry" values="12;18;12" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
              )}
            </g>
          );
        })}

        {/* Equation */}
        <rect x={simWidth / 2 - 80} y={simHeight - 45} width={160} height={35} rx={8} fill="#0f172a" stroke="#334155" />
        <text x={simWidth / 2} y={simHeight - 22} fill="#3b82f6" fontSize={14} textAnchor="middle" fontWeight="bold">Q = mcDeltaT</text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">THERMAL PHYSICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        Heat Transfer & Capacity
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why does metal feel cold and wood feel warm at the same temperature?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">🔥</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🌡️</div>
              <div className="text-xs text-slate-400">Temperature</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs text-slate-400">Conduction</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">💧</div>
              <div className="text-xs text-slate-400">Capacity</div>
            </div>
          </div>
          <p className="text-lg text-white/90 font-medium leading-relaxed">
            Discover the two key properties that govern thermal physics.
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Exploring
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-orange-400">*</span>Fourier's Law</div>
        <div className="flex items-center gap-2"><span className="text-orange-400">*</span>Specific Heat</div>
        <div className="flex items-center gap-2"><span className="text-orange-400">*</span>Real Applications</div>
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
                ? option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
          <p className="text-emerald-400 font-semibold mb-2">{selectedPrediction === 'A' ? 'Correct!' : 'Not quite!'}</p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Heat Conduction Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Watch how different materials conduct heat at different rates.</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
        {renderHeatConductionViz()}
      </div>

      {/* Material selector */}
      <div className="grid grid-cols-5 gap-2 mb-4 w-full max-w-lg">
        {Object.entries(materials).map(([key, mat]) => (
          <button
            key={key}
            onMouseDown={() => {
              setSelectedMaterial(key as typeof selectedMaterial);
              setBarTemperatures(Array(20).fill(25));
              setIsHeating(false);
              setElapsedTime(0);
            }}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              selectedMaterial === key
                ? 'bg-orange-600/30 border-2 border-orange-500 text-orange-400'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            {mat.name}
          </button>
        ))}
      </div>

      {/* Heat source slider */}
      <div className="bg-slate-800/50 rounded-xl p-4 w-full max-w-lg mb-4 border border-slate-700/50">
        <label className="text-orange-400 text-sm block mb-2">Heat Source: {heatSource}C</label>
        <input type="range" min={50} max={200} value={heatSource} onChange={(e) => setHeatSource(Number(e.target.value))} className="w-full accent-orange-500" />
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onMouseDown={() => setIsHeating(!isHeating)}
          className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
            isHeating ? 'bg-red-600' : 'bg-gradient-to-r from-orange-500 to-red-500'
          }`}
        >
          {isHeating ? '⏸ Pause' : '🔥 Start Heating'}
        </button>
        <button
          onMouseDown={() => { setBarTemperatures(Array(20).fill(25)); setIsHeating(false); setElapsedTime(0); }}
          className="px-4 py-3 rounded-xl bg-slate-700 text-white font-medium"
        >
          🔄 Reset
        </button>
      </div>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Conductivity</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6 border border-orange-700/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Fourier's Law</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-orange-300">Q/t = -kA(dT/dx)</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>k = thermal conductivity</li>
            <li>A = cross-sectional area</li>
            <li>dT/dx = temperature gradient</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Why Metal Feels Cold</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">🥄</div>
              <div className="text-xs text-slate-400">High k = Cold</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">🪵</div>
              <div className="text-xs text-slate-400">Low k = Warm</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm">Your nerves sense heat FLOW, not temperature. Metal draws heat away faster!</p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Discover Heat Capacity
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-6">Heat Capacity Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-blue-700/30">
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
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
            See the Heating Race
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">Heat Capacity Race</h2>
      <p className="text-slate-400 mb-6 text-center">Watch different substances race to 100C with the same heat input!</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
        {renderHeatCapacityViz()}
      </div>

      {/* Temperature readouts */}
      <div className="grid grid-cols-4 gap-2 mb-4 w-full max-w-lg">
        {Object.entries(specificHeats).map(([key, data]) => (
          <div key={key} className={`bg-slate-800/50 rounded-lg p-3 text-center border-2 ${substanceTemps[key] >= 100 ? 'border-emerald-500' : 'border-transparent'}`}>
            <div className="text-xs font-medium" style={{ color: data.color }}>{data.name}</div>
            <div className={`text-lg font-bold ${substanceTemps[key] >= 100 ? 'text-emerald-400' : 'text-white'}`}>{Math.round(substanceTemps[key])}C</div>
            {substanceTemps[key] >= 100 && <span className="text-sm">🏆</span>}
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onMouseDown={() => setHeatingStarted(!heatingStarted)}
          className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
            heatingStarted ? 'bg-red-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
          }`}
        >
          {heatingStarted ? '⏸ Pause' : '🔥 Start All Burners'}
        </button>
        <button
          onMouseDown={() => { setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 }); setHeatingStarted(false); }}
          className="px-4 py-3 rounded-xl bg-slate-700 text-white font-medium"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-blue-900/30 rounded-xl p-4 max-w-lg border border-blue-700/30 mb-6">
        <h3 className="text-blue-400 font-semibold mb-2">Q = mcDeltaT</h3>
        <p className="text-slate-300 text-sm">Same Q, same m - higher c means smaller DeltaT. That's why water resists temperature change!</p>
      </div>

      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-6">Specific Heat Capacity</h2>
      <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-blue-700/30">
        <h3 className="text-xl font-bold text-blue-400 mb-4">Two Properties, Two Roles</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-orange-400 font-semibold mb-2">Thermal Conductivity (k)</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>How fast heat spreads</li>
              <li>Metal feels cold (high k)</li>
              <li>Wood feels warm (low k)</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-blue-400 font-semibold mb-2">Specific Heat (c)</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Energy needed per degree</li>
              <li>Water buffers temperature</li>
              <li>Metals heat up fast</li>
            </ul>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mt-4 text-center">
          <span className="text-blue-400 font-mono">Q = mcDeltaT</span>
          <span className="text-slate-400 mx-2">|</span>
          <span className="text-orange-400 font-mono">Q/t = -kA(dT/dx)</span>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Physics Everywhere</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {realWorldApplications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-orange-600 text-white'
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
          <span className="text-orange-400 text-sm font-mono">{realWorldApplications[activeAppTab].formula}</span>
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
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-orange-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered thermal physics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl border border-orange-700/30">
        <div className="text-8xl mb-6">🔥</div>
        <h1 className="text-3xl font-bold text-white mb-4">Thermal Physics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered heat transfer and thermal capacity!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Fourier's Law</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💧</div><p className="text-sm text-slate-300">Heat Capacity</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🍳</div><p className="text-sm text-slate-300">Cookware</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌊</div><p className="text-sm text-slate-300">Climate</p></div>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Heat Transfer</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default HeatTransferCapacityRenderer;
