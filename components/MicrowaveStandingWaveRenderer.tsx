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

interface MicrowaveStandingWaveRendererProps {
  onEvent?: (event: GameEvent) => void;
  savedState?: GameState | null;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
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
    question: 'Why does a microwave oven have hot spots and cold spots?',
    options: [
      'The magnetron doesn\'t produce enough power',
      'Standing waves form with fixed nodes (cold) and antinodes (hot)',
      'Food absorbs microwaves unevenly due to its color',
      'The walls absorb some of the microwave energy'
    ],
    correct: 1
  },
  {
    question: 'What happens at a standing wave node?',
    options: [
      'Maximum energy - food heats fastest',
      'Minimum/zero energy - food barely heats',
      'The wave changes direction',
      'Microwaves are absorbed by the walls'
    ],
    correct: 1
  },
  {
    question: 'Why do microwave ovens have turntables?',
    options: [
      'To look more professional',
      'To move food through hot spots for even heating',
      'To prevent sparks',
      'To reduce microwave power consumption'
    ],
    correct: 1
  },
  {
    question: 'The wavelength of microwave radiation is about 12 cm. What distance is between hot spots?',
    options: [
      '12 cm (one wavelength)',
      '6 cm (half wavelength)',
      '3 cm (quarter wavelength)',
      '24 cm (two wavelengths)'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Marshmallow Experiment',
    description: 'Remove the turntable, heat marshmallows, measure distance between melted spots to find wavelength!',
    icon: '🍡'
  },
  {
    title: 'Acoustic Room Modes',
    description: 'Bass frequencies create standing waves in rooms - some spots have strong bass, others weak.',
    icon: '🔊'
  },
  {
    title: 'Laser Cavities',
    description: 'Lasers use standing waves between mirrors to amplify light at specific frequencies.',
    icon: '🔴'
  },
  {
    title: 'Musical Instruments',
    description: 'String and wind instruments create standing waves at specific harmonics!',
    icon: '🎸'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MicrowaveStandingWaveRenderer({ onEvent, savedState }: MicrowaveStandingWaveRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [isCooking, setIsCooking] = useState(false);
  const [turntableOn, setTurntableOn] = useState(false);
  const [cookTime, setCookTime] = useState(0);
  const [foodTemp, setFoodTemp] = useState<number[]>(Array(25).fill(20)); // 5x5 grid
  const [animPhase, setAnimPhase] = useState(0);
  const [turntableAngle, setTurntableAngle] = useState(0);

  // Twist state
  const [twistTurntable, setTwistTurntable] = useState(false);
  const [twistCookTime, setTwistCookTime] = useState(0);
  const [twistFoodTemp, setTwistFoodTemp] = useState<number[]>(Array(25).fill(20));

  const navigationLockRef = useRef(false);

  // Standing wave intensity pattern (simplified 2D)
  const getIntensityAt = (x: number, y: number, angle: number) => {
    // Rotate position by turntable angle
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Standing wave pattern (nodes at certain positions)
    const intensity = Math.abs(Math.sin(rx * Math.PI * 2) * Math.sin(ry * Math.PI * 2));
    return intensity;
  };

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
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cooking simulation
  useEffect(() => {
    if (!isCooking) return;

    const interval = setInterval(() => {
      setCookTime(t => t + 0.1);
      setTurntableAngle(a => turntableOn ? (a + 0.05) % (Math.PI * 2) : a);

      setFoodTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5;
          const y = Math.floor(i / 5) / 4 - 0.5;
          const intensity = getIntensityAt(x, y, turntableOn ? turntableAngle : 0);
          const heating = intensity * 2;
          return Math.min(100, temp + heating);
        });
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isCooking, turntableOn, turntableAngle]);

  // Twist cooking simulation
  useEffect(() => {
    if (phase !== 'twist_play') return;
    if (twistCookTime <= 0) return;

    const cookInterval = setInterval(() => {
      setTwistCookTime(t => {
        if (t <= 0) return 0;
        return t - 0.1;
      });

      setTwistFoodTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5;
          const y = Math.floor(i / 5) / 4 - 0.5;
          const angle = twistTurntable ? (10 - twistCookTime) * 0.5 : 0;
          const intensity = getIntensityAt(x, y, angle);
          const heating = intensity * 3;
          return Math.min(100, temp + heating);
        });
      });
    }, 100);

    return () => clearInterval(cookInterval);
  }, [phase, twistCookTime, twistTurntable]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setIsCooking(false);
      setTurntableOn(false);
      setCookTime(0);
      setFoodTemp(Array(25).fill(20));
      setTurntableAngle(0);
    }
    if (phase === 'twist_play') {
      setTwistTurntable(false);
      setTwistCookTime(0);
      setTwistFoodTemp(Array(25).fill(20));
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
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  // Temperature to color
  const tempToColor = (temp: number) => {
    const normalized = (temp - 20) / 80; // 20°C to 100°C
    if (normalized < 0.25) return '#3b82f6'; // cold blue
    if (normalized < 0.5) return '#22c55e'; // warm green
    if (normalized < 0.75) return '#eab308'; // hot yellow
    return '#ef4444'; // very hot red
  };

  const renderMicrowaveScene = (temps: number[], cooking: boolean, turntable: boolean, angle: number) => {
    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Microwave body */}
        <rect x="50" y="30" width="300" height="200" rx="10" fill="#374151" stroke="#4b5563" strokeWidth="3" />

        {/* Door frame */}
        <rect x="60" y="40" width="220" height="180" rx="5" fill="#1f2937" />

        {/* Viewing window */}
        <rect x="70" y="50" width="200" height="160" rx="3" fill="#0a1628" />

        {/* Mesh pattern */}
        {[...Array(20)].map((_, i) => (
          <line key={`h${i}`} x1="70" y1={55 + i * 8} x2="270" y2={55 + i * 8} stroke="#1e293b" strokeWidth="1" />
        ))}
        {[...Array(25)].map((_, i) => (
          <line key={`v${i}`} x1={75 + i * 8} y1="50" x2={75 + i * 8} y2="210" stroke="#1e293b" strokeWidth="1" />
        ))}

        {/* Standing wave visualization (when cooking) */}
        {cooking && (
          <g opacity="0.4">
            {[...Array(5)].map((_, yi) => (
              [...Array(5)].map((_, xi) => {
                const x = (xi / 4 - 0.5);
                const y = (yi / 4 - 0.5);
                const intensity = getIntensityAt(x, y, 0);
                return (
                  <circle
                    key={`w${xi}-${yi}`}
                    cx={95 + xi * 40}
                    cy={75 + yi * 35}
                    r={10 + intensity * 8}
                    fill={intensity > 0.5 ? '#ef4444' : '#3b82f6'}
                    opacity={0.3 + Math.sin(animPhase + xi + yi) * 0.2}
                  />
                );
              })
            ))}
          </g>
        )}

        {/* Turntable */}
        <g transform={`translate(170, 180)`}>
          <ellipse cx="0" cy="0" rx="60" ry="15" fill="#4b5563" />
          {/* Rotation indicator */}
          {turntable && cooking && (
            <line
              x1="0"
              y1="0"
              x2={Math.cos(angle) * 50}
              y2={Math.sin(angle) * 10}
              stroke="#9ca3af"
              strokeWidth="2"
            />
          )}
        </g>

        {/* Food (5x5 grid representing a plate) */}
        <g transform={`translate(120, 100) rotate(${turntable ? angle * 180 / Math.PI : 0}, 50, 40)`}>
          {temps.map((temp, i) => {
            const x = (i % 5) * 20;
            const y = Math.floor(i / 5) * 16;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="18"
                height="14"
                rx="2"
                fill={tempToColor(temp)}
                stroke="#1f2937"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Control panel */}
        <rect x="290" y="50" width="50" height="160" fill="#1f2937" rx="3" />
        <circle cx="315" cy="80" r="12" fill={cooking ? '#22c55e' : '#4b5563'} />
        <text x="315" y="110" textAnchor="middle" className="fill-gray-400 text-xs">
          {cooking ? 'ON' : 'OFF'}
        </text>
        <rect x="300" y="130" width="30" height="8" fill={turntable ? '#3b82f6' : '#4b5563'} rx="2" />
        <text x="315" y="155" textAnchor="middle" className="fill-gray-500 text-xs">Turn</text>

        {/* Timer */}
        <text x="315" y="190" textAnchor="middle" className="fill-green-400 text-sm font-mono">
          {cookTime.toFixed(1)}s
        </text>

        {/* Temperature legend */}
        <g transform="translate(60, 240)">
          <rect x="0" y="0" width="20" height="10" fill="#3b82f6" />
          <text x="25" y="9" className="fill-gray-400 text-xs">Cold</text>
          <rect x="70" y="0" width="20" height="10" fill="#22c55e" />
          <text x="95" y="9" className="fill-gray-400 text-xs">Warm</text>
          <rect x="140" y="0" width="20" height="10" fill="#eab308" />
          <text x="165" y="9" className="fill-gray-400 text-xs">Hot</text>
          <rect x="200" y="0" width="20" height="10" fill="#ef4444" />
          <text x="225" y="9" className="fill-gray-400 text-xs">V.Hot</text>
        </g>
      </svg>
    );
  };

  const renderTwistScene = (temps: number[], turntable: boolean) => {
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const tempVariance = Math.sqrt(temps.reduce((acc, t) => acc + Math.pow(t - avgTemp, 2), 0) / temps.length);

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#111827" />

        {/* Two side-by-side results */}
        <text x="200" y="25" textAnchor="middle" className="fill-gray-300 text-sm font-semibold">
          After 10 seconds of cooking:
        </text>

        {/* Food grid display */}
        <g transform="translate(100, 50)">
          <text x="50" y="-10" textAnchor="middle" className="fill-gray-400 text-xs">
            {turntable ? 'WITH Turntable' : 'NO Turntable'}
          </text>
          {temps.map((temp, i) => {
            const x = (i % 5) * 22;
            const y = Math.floor(i / 5) * 22;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="20"
                height="20"
                rx="3"
                fill={tempToColor(temp)}
                stroke="#374151"
                strokeWidth="1"
              />
            );
          })}
          <text x="50" y="130" textAnchor="middle" className="fill-gray-400 text-xs">
            Avg: {avgTemp.toFixed(0)}°C
          </text>
          <text x="50" y="145" textAnchor="middle" className="fill-gray-400 text-xs">
            Variation: ±{tempVariance.toFixed(0)}°C
          </text>
        </g>

        {/* Comparison metrics */}
        <g transform="translate(220, 60)">
          <text x="0" y="0" className="fill-gray-300 text-sm">Evenness Score:</text>
          <rect x="0" y="10" width="150" height="20" fill="#1f2937" rx="4" />
          <rect
            x="0"
            y="10"
            width={Math.max(10, 150 - tempVariance * 5)}
            height="20"
            fill={tempVariance < 10 ? '#22c55e' : tempVariance < 20 ? '#eab308' : '#ef4444'}
            rx="4"
          />
          <text x="75" y="25" textAnchor="middle" className="fill-white text-xs font-semibold">
            {tempVariance < 10 ? 'Excellent!' : tempVariance < 20 ? 'OK' : 'Uneven!'}
          </text>
        </g>

        {/* Explanation */}
        <text x="200" y="220" textAnchor="middle" className="fill-gray-400 text-sm">
          {turntable
            ? '✓ Turntable moves food through hot spots → even heating!'
            : '✗ Food sits in fixed positions → hot and cold spots!'}
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🍲❄️🔥</div>
      <h2 className="text-2xl font-bold text-white">The Microwave Mystery</h2>
      <p className="text-gray-300 text-lg max-w-lg mx-auto">
        You heat leftovers in the microwave. One bite is <span className="text-blue-400 font-semibold">ice cold</span>,
        the next is <span className="text-red-400 font-semibold">scalding hot</span>!
        But the microwave filled the whole cavity with energy...
      </p>
      <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-yellow-300 font-medium">
          Why does a microwave have hot spots and cold spots? 🤔
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        Investigate! →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        Microwaves bounce back and forth inside the oven. What happens when waves reflect off the walls?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'random', text: 'Random chaos - energy scatters everywhere equally', icon: '🎲' },
          { id: 'standing', text: 'Standing waves form with fixed hot spots and cold spots', icon: '〰️' },
          { id: 'center', text: 'All energy concentrates in the center', icon: '🎯' },
          { id: 'absorbed', text: 'Walls absorb most energy - edges are hottest', icon: '🧱' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setPrediction(option.id);
              emitEvent('prediction', { prediction: option.id });
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-yellow-500 bg-yellow-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Experiment: Standing Waves</h2>

      {renderMicrowaveScene(foodTemp, isCooking, turntableOn, turntableAngle)}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={() => {
            playSound('click');
            setIsCooking(!isCooking);
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isCooking
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          {isCooking ? '⏹️ Stop' : '▶️ Start Cooking'}
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setTurntableOn(!turntableOn);
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            turntableOn
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Turntable: {turntableOn ? 'ON' : 'OFF'}
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setFoodTemp(Array(25).fill(20));
            setCookTime(0);
          }}
          className="px-6 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-yellow-300 text-sm text-center">
          <strong>Standing waves:</strong> When microwaves bounce back and forth, they interfere to create
          fixed patterns of high energy (antinodes) and low energy (nodes).
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Standing Wave Physics</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Wave Reflection</h3>
              <p className="text-gray-400 text-sm">Microwaves bounce off metal walls back into the cavity</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Interference Pattern</h3>
              <p className="text-gray-400 text-sm">Outgoing + reflected waves create standing waves</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Fixed Hot/Cold Spots</h3>
              <p className="text-gray-400 text-sm">Antinodes (hot) are λ/2 = 6cm apart for 2.45 GHz microwaves</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-yellow-300 font-semibold">The Math</p>
        <p className="text-gray-400 text-sm mt-1">
          λ = c / f = 3×10⁸ / 2.45×10⁹ ≈ 12.2 cm<br />
          Hot spots separated by λ/2 ≈ 6 cm!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-yellow-400 font-semibold">{prediction === 'standing' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">🔄 The Twist!</h2>
      <p className="text-gray-300 text-center max-w-lg mx-auto">
        If standing waves create fixed hot spots, why do microwave ovens have a <span className="text-blue-400 font-semibold">turntable</span>?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'even', text: 'Turntable moves food through hot spots for even heating', icon: '🔄' },
          { id: 'stir', text: 'It just stirs the food like a mixer', icon: '🥄' },
          { id: 'waves', text: 'Turntable creates additional microwaves', icon: '📡' },
          { id: 'nothing', text: 'It\'s decorative - doesn\'t really help', icon: '✨' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setTwistPrediction(option.id);
              emitEvent('prediction', { twistPrediction: option.id });
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-orange-500 bg-orange-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const startCooking = (withTurntable: boolean) => {
      setTwistTurntable(withTurntable);
      setTwistFoodTemp(Array(25).fill(20));
      setTwistCookTime(10);
    };

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white text-center">Turntable vs No Turntable</h2>

        {renderTwistScene(twistFoodTemp, twistTurntable)}

        <div className="flex justify-center gap-4">
          <button
            onMouseDown={() => { playSound('click'); startCooking(false); }}
            disabled={twistCookTime > 0}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              twistCookTime > 0 && !twistTurntable
                ? 'bg-yellow-700 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Cook WITHOUT turntable
          </button>
          <button
            onMouseDown={() => { playSound('click'); startCooking(true); }}
            disabled={twistCookTime > 0}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              twistCookTime > 0 && twistTurntable
                ? 'bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Cook WITH turntable
          </button>
        </div>

        {twistCookTime > 0 && (
          <p className="text-center text-yellow-400">Cooking... {twistCookTime.toFixed(1)}s remaining</p>
        )}

        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">The Turntable Solution</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          The turntable <span className="text-blue-400 font-semibold">doesn&apos;t change the standing wave pattern</span>,
          it moves the food through the pattern!
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-red-900/30 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Without Turntable</div>
            <div className="text-gray-500">Food in hot spots: scalding</div>
            <div className="text-gray-500">Food in cold spots: cold</div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold">With Turntable</div>
            <div className="text-gray-500">Each part visits hot spots</div>
            <div className="text-gray-500">Average heating is even!</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-orange-400 font-semibold">{twistPrediction === 'even' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, index]));
              emitEvent('interaction', { app: app.title });
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-yellow-500 bg-yellow-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
          >
            Take the Quiz →
          </button>
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => a === TEST_QUESTIONS[i].correct).length;
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="text-gray-300">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onMouseDown={() => {
              playSound(score >= 3 ? 'complete' : 'click');
              nextPhase();
            }}
            className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Continue →'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mx-auto">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
          {question.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound(i === question.correct ? 'success' : 'failure');
                setTestAnswers([...testAnswers, i]);
                emitEvent('interaction', { question: currentQuestion, answer: i, correct: i === question.correct });
              }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-yellow-500 transition-all text-left text-gray-200"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">Standing Wave Master!</h2>
      <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-yellow-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Standing waves form from wave interference</li>
          <li>✓ Nodes (cold) and antinodes (hot) at fixed positions</li>
          <li>✓ Turntables move food through the pattern for even heating</li>
          <li>✓ Hot spots are λ/2 ≈ 6cm apart for microwaves</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Try the marshmallow experiment at home to measure microwave wavelength! 🍡
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-white font-semibold hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        Complete! 🎊
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-950 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        {renderPhase()}
      </div>
    </div>
  );
}
