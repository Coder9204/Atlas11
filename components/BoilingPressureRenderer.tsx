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

interface BoilingPressureRendererProps {
  onEvent?: (event: GameEvent) => void;
  savedState?: GameState | null;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  pressure: number;
  temperature: number;
  heating: boolean;
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
    question: 'Why does water boil at a lower temperature on Mount Everest?',
    options: [
      'The air is colder',
      'There is less atmospheric pressure',
      'There is less oxygen',
      'The water is different at high altitude'
    ],
    correct: 1
  },
  {
    question: 'What does a pressure cooker do to cooking temperature?',
    options: [
      'Lowers it by removing air',
      'Keeps it exactly at 100°C',
      'Raises it by increasing pressure',
      'Has no effect on temperature'
    ],
    correct: 2
  },
  {
    question: 'At what pressure can water boil at room temperature (25°C)?',
    options: [
      '1 atmosphere',
      '2 atmospheres',
      'About 0.03 atmospheres (vacuum)',
      'Water cannot boil at 25°C'
    ],
    correct: 2
  },
  {
    question: 'Why do pressure cookers cook food faster?',
    options: [
      'Higher pressure pushes heat into food',
      'Higher boiling point means hotter water',
      'Steam moves faster at high pressure',
      'Pressure cookers use less water'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Pressure Cookers',
    description: 'At 2 atm, water boils at ~120°C. The extra 20°C dramatically speeds cooking—beans in 20 min instead of 2 hours!',
    icon: '🍲'
  },
  {
    title: 'High Altitude Cooking',
    description: 'Denver (1.6km): water boils at 95°C. Everest base camp: 85°C. Food takes longer because the water is cooler.',
    icon: '🏔️'
  },
  {
    title: 'Vacuum Distillation',
    description: 'Reduce pressure to boil liquids at lower temps. Used to purify heat-sensitive compounds without destroying them.',
    icon: '⚗️'
  },
  {
    title: 'Geysers',
    description: 'Underground water under high pressure stays liquid above 100°C. When it reaches the surface—instant explosive boiling!',
    icon: '💨'
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

// Antoine equation approximation for water boiling point
function getBoilingPoint(pressureAtm: number): number {
  // Clausius-Clapeyron simplified: T_boil ≈ 100 + 28.7 * ln(P/1.0)
  // This gives reasonable approximations across typical range
  if (pressureAtm <= 0.01) return 7; // Near triple point
  return 100 + 28.7 * Math.log(pressureAtm);
}

function getWaterState(temp: number, boilingPoint: number): 'solid' | 'liquid' | 'boiling' | 'gas' {
  if (temp <= 0) return 'solid';
  if (temp < boilingPoint - 1) return 'liquid';
  if (temp <= boilingPoint + 5) return 'boiling';
  return 'gas';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BoilingPressureRenderer({ onEvent, savedState }: BoilingPressureRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [pressure, setPressure] = useState(savedState?.pressure || 1.0); // atmospheres
  const [temperature, setTemperature] = useState(savedState?.temperature || 25);
  const [heating, setHeating] = useState(savedState?.heating || false);
  const [bubbles, setBubbles] = useState<{id: number; x: number; y: number; size: number}[]>([]);

  // Twist state - altitude comparison
  const [twistLocation, setTwistLocation] = useState<'sea' | 'denver' | 'everest'>('sea');
  const [twistTemp, setTwistTemp] = useState(25);
  const [twistHeating, setTwistHeating] = useState(false);

  const navigationLockRef = useRef(false);
  const bubbleIdRef = useRef(0);

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

  const getLocationPressure = (loc: 'sea' | 'denver' | 'everest'): number => {
    switch (loc) {
      case 'sea': return 1.0;
      case 'denver': return 0.83;
      case 'everest': return 0.33;
    }
  };

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!heating) return;

    const boilingPoint = getBoilingPoint(pressure);
    const interval = setInterval(() => {
      setTemperature(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [heating, pressure]);

  // Bubble generation
  useEffect(() => {
    const boilingPoint = getBoilingPoint(pressure);
    const state = getWaterState(temperature, boilingPoint);

    if (state !== 'boiling') {
      setBubbles([]);
      return;
    }

    const interval = setInterval(() => {
      setBubbles(prev => {
        const updated = prev
          .map(b => ({ ...b, y: b.y - 3 }))
          .filter(b => b.y > 120);

        // Add new bubbles
        if (Math.random() > 0.3) {
          const nearBoiling = temperature >= boilingPoint;
          const intensity = nearBoiling ? 3 : 1;
          for (let i = 0; i < intensity; i++) {
            updated.push({
              id: bubbleIdRef.current++,
              x: 100 + Math.random() * 200,
              y: 220 + Math.random() * 20,
              size: 3 + Math.random() * 6
            });
          }
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [temperature, pressure]);

  // Twist heating effect
  useEffect(() => {
    if (!twistHeating) return;

    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    const interval = setInterval(() => {
      setTwistTemp(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [twistHeating, twistLocation]);

  // Reset when returning to play/twist_play
  useEffect(() => {
    if (phase === 'play') {
      setTemperature(25);
      setHeating(false);
      setPressure(1.0);
    }
    if (phase === 'twist_play') {
      setTwistTemp(25);
      setTwistHeating(false);
      setTwistLocation('sea');
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
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderPhaseDiagram = () => {
    const boilingPoint = getBoilingPoint(pressure);
    // Simple phase diagram visualization
    return (
      <svg viewBox="0 0 300 200" className="w-full h-40">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="30" height="20" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="300" height="200" fill="url(#grid)" />

        {/* Axes */}
        <line x1="40" y1="170" x2="280" y2="170" stroke="#9ca3af" strokeWidth="2" />
        <line x1="40" y1="170" x2="40" y2="20" stroke="#9ca3af" strokeWidth="2" />
        <text x="160" y="195" textAnchor="middle" className="fill-gray-400 text-xs">Temperature (°C)</text>
        <text x="15" y="95" textAnchor="middle" transform="rotate(-90, 15, 95)" className="fill-gray-400 text-xs">Pressure</text>

        {/* Phase regions */}
        <path d="M 40 170 Q 60 100 80 60 L 40 60 Z" fill="#60a5fa" fillOpacity="0.3" />
        <path d="M 80 60 Q 60 100 40 170 L 280 170 Q 200 120 80 60" fill="#3b82f6" fillOpacity="0.3" />
        <path d="M 80 60 Q 200 120 280 170 L 280 20 L 80 20 Z" fill="#f97316" fillOpacity="0.3" />

        {/* Phase labels */}
        <text x="55" y="100" className="fill-blue-300 text-xs font-bold">ICE</text>
        <text x="130" y="140" className="fill-blue-400 text-xs font-bold">LIQUID</text>
        <text x="200" y="60" className="fill-orange-400 text-xs font-bold">GAS</text>

        {/* Boiling curve (approximate) */}
        <path d="M 80 60 Q 140 100 280 170" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" />

        {/* Current state point */}
        <circle
          cx={40 + (temperature / 150) * 240}
          cy={170 - (Math.log(pressure + 0.1) + 2) * 40}
          r="6"
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth="2"
        />

        {/* Temperature axis labels */}
        <text x="40" y="185" className="fill-gray-500 text-xs">0</text>
        <text x="140" y="185" className="fill-gray-500 text-xs">100</text>
        <text x="240" y="185" className="fill-gray-500 text-xs">200</text>
      </svg>
    );
  };

  const renderBeaker = (temp: number, pres: number, currentBubbles: typeof bubbles) => {
    const boilingPoint = getBoilingPoint(pres);
    const state = getWaterState(temp, boilingPoint);
    const waterColor = state === 'boiling' ? '#60a5fa' : state === 'gas' ? '#93c5fd' : '#3b82f6';

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Pressure gauge */}
        <rect x="20" y="20" width="80" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="60" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Pressure</text>
        <text x="60" y="60" textAnchor="middle" className="fill-cyan-400 text-sm font-bold">
          {pres.toFixed(2)} atm
        </text>

        {/* Temperature display */}
        <rect x="300" y="20" width="80" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="340" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Temperature</text>
        <text x="340" y="60" textAnchor="middle" className="fill-orange-400 text-sm font-bold">
          {temp.toFixed(0)}°C
        </text>

        {/* Boiling point indicator */}
        <rect x="160" y="20" width="80" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Boils at</text>
        <text x="200" y="60" textAnchor="middle" className="fill-red-400 text-sm font-bold">
          {boilingPoint.toFixed(0)}°C
        </text>

        {/* Beaker outline */}
        <path
          d="M 100 90 L 100 240 Q 100 260 120 260 L 280 260 Q 300 260 300 240 L 300 90"
          fill="none"
          stroke="#6b7280"
          strokeWidth="4"
        />

        {/* Water */}
        <path
          d="M 104 120 L 104 236 Q 104 256 124 256 L 276 256 Q 296 256 296 236 L 296 120 Z"
          fill={waterColor}
          fillOpacity={state === 'gas' ? 0.3 : 0.7}
        />

        {/* Bubbles */}
        {currentBubbles.map(b => (
          <circle
            key={b.id}
            cx={b.x}
            cy={b.y}
            r={b.size}
            fill="white"
            fillOpacity="0.6"
          />
        ))}

        {/* Steam if boiling */}
        {state === 'boiling' && (
          <g className="animate-pulse">
            <path d="M 150 85 Q 145 70 150 55" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
            <path d="M 200 85 Q 210 65 200 50" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
            <path d="M 250 85 Q 255 70 250 55" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* Burner */}
        <rect x="120" y="265" width="160" height="15" rx="4" fill="#374151" />
        {heating && (
          <g>
            <ellipse cx="200" cy="265" rx="60" ry="5" fill="#ef4444" fillOpacity="0.6" className="animate-pulse" />
            <ellipse cx="200" cy="263" rx="40" ry="3" fill="#f97316" fillOpacity="0.8" className="animate-pulse" />
          </g>
        )}

        {/* State indicator */}
        <rect x="140" y="170" width="120" height="30" rx="8" fill="#1f2937" fillOpacity="0.9" />
        <text x="200" y="190" textAnchor="middle" className={`text-sm font-bold ${
          state === 'boiling' ? 'fill-orange-400' : state === 'gas' ? 'fill-red-400' : 'fill-blue-400'
        }`}>
          {state.toUpperCase()}
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Why Is Mountain Cooking So Tricky?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Climbers on Mount Everest can&apos;t make a proper cup of tea. The water &quot;boils&quot;
          but the tea doesn&apos;t steep properly. What&apos;s going on?
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-blue-300 font-medium">
            🏔️ At Everest base camp, water boils at only 71°C (160°F)...
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          The answer involves pressure, phase changes, and the surprising
          relationship between altitude and cooking!
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
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
          If you reduce the air pressure around water, what happens to its boiling point?
        </p>
        <div className="space-y-3">
          {[
            'The boiling point increases',
            'The boiling point decreases',
            'The boiling point stays the same',
            'Water can no longer boil'
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
                  ? 'bg-blue-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => {
    const boilingPoint = getBoilingPoint(pressure);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Pressure & Boiling Point</h2>

        <div className="bg-gray-800 rounded-xl p-6">
          {renderBeaker(temperature, pressure, bubbles)}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-cyan-400 font-medium mb-2">
                Pressure: {pressure.toFixed(2)} atm
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={pressure}
                onChange={(e) => {
                  setPressure(Number(e.target.value));
                  setTemperature(25); // Reset temp when pressure changes
                }}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Vacuum (0.1)</span>
                <span>Sea Level (1.0)</span>
                <span>Pressure Cooker (3.0)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-gray-300 text-center">
              At <span className="text-cyan-400 font-bold">{pressure.toFixed(2)} atm</span>, water boils at{' '}
              <span className="text-orange-400 font-bold">{boilingPoint.toFixed(0)}°C</span>
            </p>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onMouseDown={() => {
                playSound('click');
                setHeating(!heating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                heating
                  ? 'bg-red-600 text-white'
                  : 'bg-orange-600 text-white'
              }`}
            >
              {heating ? '🔥 Stop Heating' : '🔥 Heat Water'}
            </button>
            <button
              onMouseDown={() => {
                playSound('click');
                setTemperature(25);
                setHeating(false);
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-bold"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-bold mb-2 text-center">Phase Diagram</h3>
          {renderPhaseDiagram()}
        </div>

        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); setHeating(false); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            Understand the Physics →
          </button>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Why Pressure Changes Boiling Point</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
          <h3 className="text-blue-400 font-bold mb-2">The Molecular Battle</h3>
          <p className="text-gray-300">
            Boiling occurs when water molecules have enough energy to escape into the air.
            <span className="text-yellow-400 font-bold"> Higher pressure pushes back</span> on the
            surface, requiring more energy (higher temperature) to escape.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🏔️</div>
            <p className="text-xs text-gray-400">Everest</p>
            <p className="text-cyan-400 font-bold">0.33 atm</p>
            <p className="text-orange-400">71°C</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🏖️</div>
            <p className="text-xs text-gray-400">Sea Level</p>
            <p className="text-cyan-400 font-bold">1.0 atm</p>
            <p className="text-orange-400">100°C</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🍲</div>
            <p className="text-xs text-gray-400">Pressure Cooker</p>
            <p className="text-cyan-400 font-bold">2.0 atm</p>
            <p className="text-orange-400">120°C</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Key Insight:</strong> The boiling point isn&apos;t a fixed property of water—
            it depends on the surrounding pressure! The Clausius-Clapeyron equation describes
            this relationship mathematically.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
        >
          Compare Altitudes →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Cooking Challenge</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          You need to cook pasta in boiling water. At high altitude where water boils at 85°C
          instead of 100°C, how will cooking time change?
        </p>
        <div className="space-y-3">
          {[
            'Faster - boiling is boiling',
            'About the same time',
            'Longer - the water is cooler',
            'Impossible - pasta needs 100°C water'
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
                  ? 'bg-blue-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
        >
          See the Difference →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Altitude Cooking Comparison</h2>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-center gap-2 mb-6">
            {(['sea', 'denver', 'everest'] as const).map(loc => (
              <button
                key={loc}
                onMouseDown={() => {
                  playSound('click');
                  setTwistLocation(loc);
                  setTwistTemp(25);
                  setTwistHeating(false);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  twistLocation === loc
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {loc === 'sea' ? '🏖️ Sea Level' : loc === 'denver' ? '🏙️ Denver' : '🏔️ Everest'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-sm">Altitude</p>
              <p className="text-white font-bold">
                {twistLocation === 'sea' ? '0m' : twistLocation === 'denver' ? '1,600m' : '5,400m'}
              </p>
            </div>
            <div className="p-3 bg-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-sm">Pressure</p>
              <p className="text-cyan-400 font-bold">{twistPressure.toFixed(2)} atm</p>
            </div>
            <div className="p-3 bg-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-sm">Boils at</p>
              <p className="text-orange-400 font-bold">{boilingPoint.toFixed(0)}°C</p>
            </div>
          </div>

          <div className="h-32 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {twistTemp >= boilingPoint ? '💨' : '🫖'}
              </div>
              <p className={`font-bold ${twistTemp >= boilingPoint ? 'text-orange-400' : 'text-blue-400'}`}>
                {twistTemp.toFixed(0)}°C
              </p>
              <p className="text-gray-400 text-sm">
                {twistTemp >= boilingPoint ? 'BOILING!' : 'Heating...'}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onMouseDown={() => {
                playSound('click');
                setTwistHeating(!twistHeating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                twistHeating ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
              }`}
            >
              {twistHeating ? '⏹ Stop' : '🔥 Heat'}
            </button>
          </div>

          {twistTemp >= boilingPoint && (
            <div className={`mt-4 p-4 rounded-lg border ${
              twistLocation === 'everest'
                ? 'bg-yellow-900/30 border-yellow-600'
                : twistLocation === 'denver'
                  ? 'bg-orange-900/30 border-orange-600'
                  : 'bg-green-900/30 border-green-600'
            }`}>
              <p className={`text-center ${
                twistLocation === 'everest'
                  ? 'text-yellow-300'
                  : twistLocation === 'denver'
                    ? 'text-orange-300'
                    : 'text-green-300'
              }`}>
                {twistLocation === 'everest'
                  ? '⚠️ Water boiling at only 71°C - pasta will take 50% longer!'
                  : twistLocation === 'denver'
                    ? '⚠️ Water at 95°C - add ~20% more cooking time'
                    : '✓ Perfect 100°C for standard cooking times'}
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); setTwistHeating(false); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            Understand the Impact →
          </button>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Cooking Temperature Matters!</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-orange-900/30 rounded-lg border border-orange-600">
          <h3 className="text-orange-400 font-bold mb-2">The Temperature-Time Tradeoff</h3>
          <p className="text-gray-300">
            Cooking speed depends on <span className="text-yellow-400 font-bold">temperature, not just boiling</span>.
            At lower boiling points, chemical reactions in food happen slower—
            so cooking takes longer even though the water is &quot;boiling.&quot;
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-red-900/30 rounded-lg border border-red-600">
            <h4 className="text-red-400 font-bold mb-2">High Altitude Problems</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Pasta undercooked despite boiling</li>
              <li>• Eggs take longer to hardboil</li>
              <li>• Baked goods rise too fast, then collapse</li>
              <li>• Beans may never fully soften</li>
            </ul>
          </div>
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
            <h4 className="text-green-400 font-bold mb-2">Pressure Cooker Solution</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Raises boiling point to 120°C</li>
              <li>• Beans in 20 min (vs 2 hours)</li>
              <li>• Tough meats become tender fast</li>
              <li>• Works at any altitude!</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Fun Fact:</strong> On Mars (0.006 atm), water would boil at body temperature!
            Astronauts will need pressure cookers—or they&apos;ll eat very undercooked food.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Explore how pressure affects phase changes</p>

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
                : 'bg-gray-800 border-2 border-gray-700 hover:border-blue-500'
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
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all"
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

    if (isComplete) {
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
            {passed ? 'Excellent understanding of pressure and phase changes!' : 'Review the concepts and try again.'}
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
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
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
                    ? 'bg-blue-500'
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
      <h2 className="text-3xl font-bold text-white">Phase Diagram Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Pressure-boiling point relationship
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Altitude effects on cooking
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Phase diagrams
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Pressure cooker physics
          </li>
        </ul>
      </div>
      <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600 max-w-md mx-auto">
        <p className="text-blue-300">
          🌡️ Key Insight: Boiling point isn&apos;t fixed—it&apos;s a battle between molecular escape energy and atmospheric pressure!
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
          <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm">
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
