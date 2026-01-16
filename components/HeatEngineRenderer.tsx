'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface HeatEngineRendererProps {
  onEvent?: (event: GameEvent) => void;
  savedState?: GameState | null;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  showResult: boolean;
  hotTemp: number;
  coldTemp: number;
  engineRunning: boolean;
  workOutput: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'What determines the maximum possible efficiency of a heat engine?',
    options: [
      'The size of the engine',
      'The temperature difference between hot and cold reservoirs',
      'The type of fuel used',
      'The speed of the engine'
    ],
    correct: 1
  },
  {
    question: 'According to Carnot\'s theorem, what happens when hot and cold temperatures are equal?',
    options: [
      'The engine runs at 50% efficiency',
      'The engine runs faster',
      'The engine cannot do any work',
      'The engine runs in reverse'
    ],
    correct: 2
  },
  {
    question: 'A power plant uses steam at 600K and rejects heat at 300K. What is its maximum theoretical efficiency?',
    options: [
      '25%',
      '50%',
      '75%',
      '100%'
    ],
    correct: 1
  },
  {
    question: 'Why do real engines never reach Carnot efficiency?',
    options: [
      'Carnot was wrong',
      'Friction, heat losses, and irreversible processes',
      'They use the wrong fuel',
      'The temperature measurements are inaccurate'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Power Plants',
    description: 'Coal and nuclear plants heat water to ~600°C steam, reject heat at ~30°C. Higher steam temperature = better efficiency.',
    icon: '🏭'
  },
  {
    title: 'Car Engines',
    description: 'Internal combustion reaches ~2000°C briefly, exhausts at ~500°C. The high temperature ratio enables mechanical work.',
    icon: '🚗'
  },
  {
    title: 'Refrigerators',
    description: 'Heat engines run backwards! They use work to pump heat from cold to hot, opposite of natural flow.',
    icon: '❄️'
  },
  {
    title: 'Jet Engines',
    description: 'Combustion at ~1700°C, exhaust at ~600°C. The extreme temperature difference produces thrust.',
    icon: '✈️'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function isValidPhase(phase: string): phase is Phase {
  return PHASES.includes(phase as Phase);
}

function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

function getCarnotEfficiency(hotTemp: number, coldTemp: number): number {
  // Carnot efficiency = 1 - T_cold/T_hot (in Kelvin)
  if (hotTemp <= coldTemp) return 0;
  return (1 - coldTemp / hotTemp) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HeatEngineRenderer({ onEvent, savedState }: HeatEngineRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [showResult, setShowResult] = useState(savedState?.showResult || false);

  // Simulation state
  const [hotTemp, setHotTemp] = useState(savedState?.hotTemp || 600); // Kelvin
  const [coldTemp, setColdTemp] = useState(savedState?.coldTemp || 300); // Kelvin
  const [engineRunning, setEngineRunning] = useState(savedState?.engineRunning || false);
  const [workOutput, setWorkOutput] = useState(savedState?.workOutput || 0);
  const [cyclePosition, setCyclePosition] = useState(0);

  // Twist state - same temperature scenario
  const [twistHotTemp, setTwistHotTemp] = useState(400);
  const [twistColdTemp, setTwistColdTemp] = useState(400);
  const [twistEngineRunning, setTwistEngineRunning] = useState(false);

  const navigationLockRef = useRef(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const emitEvent = (type: GameEvent['type'], data: Record<string, unknown> = {}) => {
    onEvent?.({ type, phase, data });
  };

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    emitEvent('interaction', { action: 'phase_change', from: phase, to: newPhase });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!engineRunning) return;

    const interval = setInterval(() => {
      setCyclePosition(p => (p + 1) % 100);

      const efficiency = getCarnotEfficiency(hotTemp, coldTemp);
      if (efficiency > 0) {
        setWorkOutput(w => w + efficiency / 100);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [engineRunning, hotTemp, coldTemp]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setWorkOutput(0);
      setEngineRunning(false);
      setCyclePosition(0);
    }
    if (phase === 'twist_play') {
      setTwistEngineRunning(false);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderHeatEngine = (hot: number, cold: number, running: boolean, cycle: number, showWork: boolean = true) => {
    const efficiency = getCarnotEfficiency(hot, cold);
    const tempDiff = hot - cold;
    const pistonY = running ? 120 + Math.sin(cycle * 0.1) * 30 : 120;

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        {/* Background */}
        <defs>
          <linearGradient id="hotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="coldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Hot Reservoir */}
        <rect x="50" y="20" width="120" height="60" rx="8" fill="url(#hotGrad)" />
        <text x="110" y="45" textAnchor="middle" className="fill-white text-sm font-bold">
          HOT
        </text>
        <text x="110" y="65" textAnchor="middle" className="fill-white text-xs">
          {hot}K ({(hot - 273).toFixed(0)}°C)
        </text>

        {/* Cold Reservoir */}
        <rect x="230" y="20" width="120" height="60" rx="8" fill="url(#coldGrad)" />
        <text x="290" y="45" textAnchor="middle" className="fill-white text-sm font-bold">
          COLD
        </text>
        <text x="290" y="65" textAnchor="middle" className="fill-white text-xs">
          {cold}K ({(cold - 273).toFixed(0)}°C)
        </text>

        {/* Heat flow from hot */}
        {running && tempDiff > 0 && (
          <g>
            <path
              d="M 110 80 Q 110 100 130 110"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeDasharray="8,4"
              className="animate-pulse"
            />
            <text x="90" y="105" className="fill-red-400 text-xs">Q_in</text>
          </g>
        )}

        {/* Heat flow to cold */}
        {running && tempDiff > 0 && (
          <g>
            <path
              d="M 270 110 Q 290 100 290 80"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="8,4"
              className="animate-pulse"
            />
            <text x="295" y="105" className="fill-blue-400 text-xs">Q_out</text>
          </g>
        )}

        {/* Engine Body */}
        <rect x="140" y="100" width="120" height="100" rx="8" fill="#374151" stroke="#6b7280" strokeWidth="2" />

        {/* Piston */}
        <rect
          x="160"
          y={pistonY}
          width="80"
          height="20"
          rx="4"
          fill="#9ca3af"
          stroke="#6b7280"
          strokeWidth="2"
        />

        {/* Piston rod */}
        <rect x="195" y={pistonY + 20} width="10" height="40" fill="#6b7280" />

        {/* Flywheel */}
        <circle cx="200" cy="240" r="30" fill="#4b5563" stroke="#6b7280" strokeWidth="2" />
        <circle
          cx={200 + Math.cos(cycle * 0.1) * 15}
          cy={240 + Math.sin(cycle * 0.1) * 15}
          r="5"
          fill="#f59e0b"
        />

        {/* Efficiency Display */}
        <rect x="20" y="220" width="80" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="60" y="245" textAnchor="middle" className="fill-gray-400 text-xs">Efficiency</text>
        <text x="60" y="268" textAnchor="middle" className={`text-lg font-bold ${efficiency > 0 ? 'fill-green-400' : 'fill-red-400'}`}>
          {efficiency.toFixed(1)}%
        </text>

        {/* Work Output */}
        {showWork && (
          <g>
            <rect x="300" y="220" width="80" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <text x="340" y="245" textAnchor="middle" className="fill-gray-400 text-xs">Work Done</text>
            <text x="340" y="268" textAnchor="middle" className="fill-yellow-400 text-lg font-bold">
              {workOutput.toFixed(0)}J
            </text>
          </g>
        )}

        {/* Work arrow */}
        {running && efficiency > 0 && (
          <g>
            <path
              d="M 200 200 L 200 215"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
              markerEnd="url(#arrowhead)"
            />
            <text x="200" y="212" textAnchor="middle" className="fill-yellow-400 text-xs font-bold">W</text>
          </g>
        )}

        {/* No work indicator when efficiency is 0 */}
        {running && efficiency === 0 && (
          <text x="200" y="180" textAnchor="middle" className="fill-red-500 text-sm font-bold animate-pulse">
            NO WORK!
          </text>
        )}
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Why Can&apos;t We Use the Ocean&apos;s Heat?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          The ocean contains an enormous amount of thermal energy. Yet we can&apos;t simply
          extract that heat to power our cities. Why not?
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-blue-300 font-medium">
            🌊 The ocean at 15°C has more heat than all the world&apos;s fuel reserves combined...
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          The answer reveals a fundamental law of nature about heat and work.
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
      >
        Discover the Secret →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Make Your Prediction</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          A heat engine takes heat from a hot source and converts some to work.
          What do you think determines how much work it can produce?
        </p>
        <div className="space-y-3">
          {[
            'The total amount of heat available',
            'The temperature difference between hot and cold',
            'The speed of the engine',
            'The size of the engine'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setPrediction(option);
                emitEvent('prediction', { prediction: option });
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                prediction === option
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {prediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Heat Engine Simulator</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderHeatEngine(hotTemp, coldTemp, engineRunning, cyclePosition)}

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-red-400 font-medium mb-2">
              Hot Reservoir: {hotTemp}K ({(hotTemp - 273).toFixed(0)}°C)
            </label>
            <input
              type="range"
              min="300"
              max="1000"
              value={hotTemp}
              onChange={(e) => setHotTemp(Number(e.target.value))}
              className="w-full accent-red-500"
              disabled={engineRunning}
            />
          </div>
          <div>
            <label className="block text-blue-400 font-medium mb-2">
              Cold Reservoir: {coldTemp}K ({(coldTemp - 273).toFixed(0)}°C)
            </label>
            <input
              type="range"
              min="200"
              max="600"
              value={coldTemp}
              onChange={(e) => setColdTemp(Number(e.target.value))}
              className="w-full accent-blue-500"
              disabled={engineRunning}
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            <span className="text-yellow-400 font-bold">Carnot Efficiency</span> = 1 - T_cold/T_hot = {' '}
            <span className="text-green-400 font-bold">{getCarnotEfficiency(hotTemp, coldTemp).toFixed(1)}%</span>
          </p>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setEngineRunning(!engineRunning);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              engineRunning
                ? 'bg-red-600 text-white'
                : 'bg-green-600 text-white'
            }`}
          >
            {engineRunning ? '⏹ Stop Engine' : '▶ Start Engine'}
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setWorkOutput(0);
              setEngineRunning(false);
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-bold"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); setEngineRunning(false); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Carnot&apos;s Revolutionary Insight</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Carnot Limit</h3>
          <p className="text-gray-300">
            In 1824, Sadi Carnot proved that <span className="text-yellow-400 font-bold">no heat engine
            can be more efficient</span> than one determined solely by the temperature difference:
          </p>
          <p className="text-center text-xl mt-3 text-white font-mono bg-gray-700 p-3 rounded">
            η_max = 1 - T_cold / T_hot
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-red-400 font-bold mb-2">Higher Hot = Better</h4>
            <p className="text-gray-300 text-sm">
              Hot: 1000K, Cold: 300K
              <br />
              Efficiency: <span className="text-green-400">70%</span>
            </p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-blue-400 font-bold mb-2">Lower Cold = Better</h4>
            <p className="text-gray-300 text-sm">
              Hot: 600K, Cold: 200K
              <br />
              Efficiency: <span className="text-green-400">67%</span>
            </p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Key Insight:</strong> It&apos;s not about how much heat you have,
            but the temperature difference! The ocean has lots of heat, but no convenient
            cold reservoir below it.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
        >
          What If There&apos;s No Difference? →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Critical Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          What happens if both the hot and cold reservoirs are at the
          <span className="text-yellow-400 font-bold"> same temperature</span>?
        </p>
        <div className="space-y-3">
          {[
            'The engine runs at 50% efficiency',
            'The engine runs slowly but still works',
            'The engine cannot produce any work at all',
            'The engine runs in reverse'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setTwistPrediction(option);
                emitEvent('prediction', { prediction: option, type: 'twist' });
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                twistPrediction === option
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {twistPrediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
        >
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Zero Temperature Difference</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderHeatEngine(twistHotTemp, twistColdTemp, twistEngineRunning, cyclePosition, false)}

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-red-400 font-medium mb-2">
              &quot;Hot&quot; Reservoir: {twistHotTemp}K
            </label>
            <input
              type="range"
              min="300"
              max="500"
              value={twistHotTemp}
              onChange={(e) => setTwistHotTemp(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <label className="block text-blue-400 font-medium mb-2">
              &quot;Cold&quot; Reservoir: {twistColdTemp}K
            </label>
            <input
              type="range"
              min="300"
              max="500"
              value={twistColdTemp}
              onChange={(e) => setTwistColdTemp(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            Efficiency = 1 - {twistColdTemp}/{twistHotTemp} = {' '}
            <span className={`font-bold ${getCarnotEfficiency(twistHotTemp, twistColdTemp) === 0 ? 'text-red-400' : 'text-green-400'}`}>
              {getCarnotEfficiency(twistHotTemp, twistColdTemp).toFixed(1)}%
            </span>
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setTwistEngineRunning(!twistEngineRunning);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              twistEngineRunning
                ? 'bg-red-600 text-white'
                : 'bg-green-600 text-white'
            }`}
          >
            {twistEngineRunning ? '⏹ Stop' : '▶ Try to Start'}
          </button>
        </div>

        {twistHotTemp === twistColdTemp && (
          <div className="mt-4 p-4 bg-red-900/30 rounded-lg border border-red-600 text-center">
            <p className="text-red-300 font-bold">
              ❌ The engine cannot produce any work!
              <br />
              <span className="text-sm font-normal">There&apos;s no temperature gradient to drive heat flow.</span>
            </p>
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); setTwistEngineRunning(false); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
        >
          Understand the 2nd Law →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Second Law of Thermodynamics</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
          <h3 className="text-purple-400 font-bold mb-2">The Fundamental Limit</h3>
          <p className="text-gray-300">
            Heat <span className="text-yellow-400 font-bold">cannot spontaneously flow</span> from
            cold to hot. To convert heat to work, you <span className="text-yellow-400">must</span> have
            a temperature difference.
          </p>
        </div>

        <div className="p-4 bg-gray-700 rounded-lg">
          <h4 className="text-white font-bold mb-2">Why the Ocean Won&apos;t Work</h4>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>• Ocean at 15°C (288K) contains vast thermal energy</li>
            <li>• But there&apos;s no convenient cold reservoir</li>
            <li>• Air is often warmer than the ocean surface</li>
            <li>• With no temperature difference → zero efficiency!</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-900/30 rounded-lg border border-green-600">
            <p className="text-green-300 text-sm text-center">
              <strong>Works:</strong> Steam (600K) → Air (300K)
              <br />Efficiency: 50%
            </p>
          </div>
          <div className="p-3 bg-red-900/30 rounded-lg border border-red-600">
            <p className="text-red-300 text-sm text-center">
              <strong>Fails:</strong> Ocean (288K) → Air (288K)
              <br />Efficiency: 0%
            </p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>OTEC Exception:</strong> Ocean Thermal Energy Conversion uses the
            ~20°C difference between warm surface water and cold deep water. But with only
            ~7% theoretical efficiency, it&apos;s barely practical!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Heat Engines</h2>
      <p className="text-gray-400 text-center">Explore how Carnot efficiency shapes technology</p>

      <div className="grid grid-cols-2 gap-4">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
              emitEvent('interaction', { action: 'explore_app', app: app.title });
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-green-900/30 border-2 border-green-600'
                : 'bg-gray-800 border-2 border-gray-700 hover:border-red-500'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-gray-400 text-sm">{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-green-400 text-sm">✓ Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('complete'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-orange-500 transition-all"
          >
            Take the Test →
          </button>
        </div>
      )}

      {completedApps.size < 4 && (
        <p className="text-center text-gray-500">
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete && !showResult) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (answer === TEST_QUESTIONS[i].correct ? 1 : 0),
        0
      );
      const passed = score >= 3;

      return (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">Test Complete!</h2>
          <div className={`text-6xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-gray-300">
            {passed ? 'Excellent understanding of heat engines!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                nextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson →' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-4">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? testAnswers[i] === TEST_QUESTIONS[i].correct
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-red-500'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(i === question.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                  emitEvent('interaction', {
                    action: 'answer',
                    questionIndex: currentQuestion,
                    correct: i === question.correct
                  });
                }}
                className="w-full p-4 bg-gray-700 text-gray-300 rounded-lg text-left hover:bg-gray-600 transition-all"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-3xl font-bold text-white">Heat Engine Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Carnot efficiency equation
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Temperature difference requirement
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Second Law of Thermodynamics
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Real-world heat engine applications
          </li>
        </ul>
      </div>
      <div className="p-4 bg-red-900/30 rounded-lg border border-red-600 max-w-md mx-auto">
        <p className="text-red-300">
          🔥 Key Insight: Work requires a temperature <em>difference</em>, not just heat!
        </p>
      </div>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { phase: 'mastery', completed: true });
        }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        🎓 Claim Your Badge
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}

        {/* Phase indicator */}
        <div className="text-center mb-6">
          <span className="px-3 py-1 bg-red-900/50 text-red-300 rounded-full text-sm">
            {phase.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {renderPhase()}

        {/* Navigation */}
        {phase !== 'hook' && phase !== 'mastery' && (
          <div className="mt-8 flex justify-between">
            <button
              onMouseDown={() => {
                const currentIndex = PHASES.indexOf(phase);
                if (currentIndex > 0) {
                  goToPhase(PHASES[currentIndex - 1]);
                }
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            >
              ← Back
            </button>
            <div className="text-gray-500 text-sm">
              {PHASES.indexOf(phase) + 1} / {PHASES.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
