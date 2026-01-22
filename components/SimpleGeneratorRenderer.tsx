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

interface SimpleGeneratorRendererProps {
  onEvent?: (event: GameEvent) => void;
  savedState?: GameState | null;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  magnetPosition: number;
  coilTurns: number;
  isDragging: boolean;
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
    question: 'What causes electromagnetic induction?',
    options: [
      'Static magnetic fields',
      'Changing magnetic flux through a coil',
      'Constant electric current',
      'The weight of the magnet'
    ],
    correct: 1
  },
  {
    question: 'How can you increase the voltage from a generator?',
    options: [
      'Move the magnet slower',
      'Use fewer coil turns',
      'Move the magnet faster or use more turns',
      'Use a weaker magnet'
    ],
    correct: 2
  },
  {
    question: 'What happens when the magnet stops moving inside the coil?',
    options: [
      'Maximum current flows',
      'Current slowly decreases',
      'No current flows - flux isn\'t changing',
      'The coil becomes a permanent magnet'
    ],
    correct: 2
  },
  {
    question: 'Why do power plants spin generators continuously?',
    options: [
      'To keep the magnets warm',
      'Because constant rotation = constantly changing flux = constant current',
      'To prevent rust',
      'Spinning makes the electricity flow faster'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Power Plants',
    description: 'Steam/water/wind spins turbines connected to generators. Each rotation changes flux thousands of times per second!',
    icon: '🏭'
  },
  {
    title: 'Bicycle Dynamos',
    description: 'Wheel rotation spins a magnet past a coil, generating power for lights. No batteries needed!',
    icon: '🚲'
  },
  {
    title: 'Regenerative Braking',
    description: 'Electric cars run their motors in reverse as generators, converting motion back to electricity when slowing down.',
    icon: '🚗'
  },
  {
    title: 'Wind Turbines',
    description: 'Spinning blades rotate magnets past coils. One large turbine can power 500+ homes!',
    icon: '🌬️'
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SimpleGeneratorRenderer({ onEvent, savedState }: SimpleGeneratorRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [magnetPosition, setMagnetPosition] = useState(savedState?.magnetPosition || 50);
  const [magnetVelocity, setMagnetVelocity] = useState(0);
  const [coilTurns, setCoilTurns] = useState(savedState?.coilTurns || 20);
  const [voltage, setVoltage] = useState(0);
  const [voltageHistory, setVoltageHistory] = useState<number[]>(new Array(50).fill(0));

  // Twist state - rotating generator
  const [isRotating, setIsRotating] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(2);

  const navigationLockRef = useRef(false);
  const lastPositionRef = useRef(magnetPosition);

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
  // Calculate induced EMF based on rate of change
  useEffect(() => {
    const interval = setInterval(() => {
      const velocity = magnetPosition - lastPositionRef.current;
      lastPositionRef.current = magnetPosition;
      setMagnetVelocity(velocity);

      // EMF = -N × dΦ/dt ∝ velocity × turns × (position factor for coil proximity)
      const positionFactor = magnetPosition > 30 && magnetPosition < 70
        ? 1 - Math.abs(magnetPosition - 50) / 20
        : 0.1;
      const inducedVoltage = velocity * coilTurns * positionFactor * 0.1;

      setVoltage(inducedVoltage);
      setVoltageHistory(prev => [...prev.slice(1), inducedVoltage]);
    }, 50);

    return () => clearInterval(interval);
  }, [magnetPosition, coilTurns]);

  // Rotation animation for twist phase
  useEffect(() => {
    if (!isRotating) return;

    const interval = setInterval(() => {
      setRotationAngle(prev => (prev + rotationSpeed) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [isRotating, rotationSpeed]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setMagnetPosition(50);
      setMagnetVelocity(0);
      setVoltage(0);
      setVoltageHistory(new Array(50).fill(0));
    }
    if (phase === 'twist_play') {
      setIsRotating(false);
      setRotationAngle(0);
      setRotationSpeed(2);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-white/10 p-3 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-400">Simple Generator</span>
        <span className="text-sm text-slate-500">{phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
      {/* Premium phase dots */}
      <div className="flex items-center justify-center gap-1.5">
        {PHASES.map((p, i) => (
          <button
            key={p}
            onMouseDown={(e) => {
              e.preventDefault();
              if (i < PHASES.indexOf(phase)) goToPhase(p);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === PHASES.indexOf(phase)
                ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                : i < PHASES.indexOf(phase)
                  ? 'bg-emerald-500 w-2'
                  : 'bg-slate-700 w-2 hover:bg-slate-600'
            }`}
            style={{ cursor: i < PHASES.indexOf(phase) ? 'pointer' : 'default' }}
          />
        ))}
      </div>
    </div>
  );

  const renderGenerator = () => {
    const magnetInCoil = magnetPosition > 30 && magnetPosition < 70;
    const magnetX = 50 + (magnetPosition / 100) * 300;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Magnetic field lines (when magnet is moving) */}
        {Math.abs(magnetVelocity) > 0.5 && magnetInCoil && (
          <g className="animate-pulse" style={{ opacity: Math.min(1, Math.abs(magnetVelocity) / 5) }}>
            {[...Array(5)].map((_, i) => (
              <ellipse
                key={i}
                cx={magnetX}
                cy="120"
                rx={20 + i * 10}
                ry={10 + i * 5}
                fill="none"
                stroke={magnetVelocity > 0 ? '#3b82f6' : '#ef4444'}
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            ))}
          </g>
        )}

        {/* Coil */}
        <g>
          <rect x="150" y="70" width="100" height="100" rx="8" fill="none" stroke="#6b7280" strokeWidth="4" />
          {/* Coil windings visualization */}
          {[...Array(Math.min(coilTurns / 2, 15))].map((_, i) => (
            <rect
              key={i}
              x={155 + i * 6}
              y="75"
              width="4"
              height="90"
              fill="#f59e0b"
              opacity={0.8}
            />
          ))}
          <text x="200" y="195" textAnchor="middle" className="fill-gray-400 text-xs">
            {coilTurns} turns
          </text>
        </g>

        {/* Wire connections to meter */}
        <path d="M 150 120 L 80 120 L 80 240 L 150 240" fill="none" stroke="#f59e0b" strokeWidth="3" />
        <path d="M 250 120 L 320 120 L 320 240 L 250 240" fill="none" stroke="#f59e0b" strokeWidth="3" />

        {/* Magnet */}
        <g transform={`translate(${magnetX - 25}, 100)`}>
          {/* North pole */}
          <rect x="0" y="0" width="25" height="40" rx="4" fill="#ef4444" />
          <text x="12" y="25" textAnchor="middle" className="fill-white text-sm font-bold">N</text>
          {/* South pole */}
          <rect x="25" y="0" width="25" height="40" rx="4" fill="#3b82f6" />
          <text x="37" y="25" textAnchor="middle" className="fill-white text-sm font-bold">S</text>
        </g>

        {/* Voltmeter */}
        <rect x="150" y="220" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="242" textAnchor="middle" className="fill-gray-400 text-xs">Induced EMF</text>
        <text
          x="200"
          y="262"
          textAnchor="middle"
          className={`text-lg font-bold ${
            voltage > 0.5 ? 'fill-green-400' : voltage < -0.5 ? 'fill-red-400' : 'fill-gray-500'
          }`}
        >
          {voltage.toFixed(2)} V
        </text>

        {/* Bulb indicator */}
        <circle
          cx="330"
          cy="240"
          r="20"
          fill={Math.abs(voltage) > 0.5 ? '#fbbf24' : '#374151'}
          stroke="#6b7280"
          strokeWidth="2"
          style={{
            filter: Math.abs(voltage) > 0.5 ? `drop-shadow(0 0 ${Math.abs(voltage) * 5}px #fbbf24)` : 'none'
          }}
        />
        <text x="330" y="245" textAnchor="middle" className="fill-gray-600 text-xs">💡</text>

        {/* Velocity indicator */}
        <rect x="20" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="70" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Velocity</text>
        <text x="70" y="60" textAnchor="middle" className={`text-sm font-bold ${
          Math.abs(magnetVelocity) > 2 ? 'fill-green-400' : 'fill-gray-500'
        }`}>
          {magnetVelocity > 0 ? '→' : magnetVelocity < 0 ? '←' : '•'} {Math.abs(magnetVelocity).toFixed(1)}
        </text>

        {/* Instructions */}
        <text x="200" y="30" textAnchor="middle" className="fill-gray-500 text-xs">
          Drag the magnet through the coil!
        </text>
      </svg>
    );
  };

  const renderOscilloscope = () => {
    const maxVoltage = Math.max(...voltageHistory.map(Math.abs), 1);
    const points = voltageHistory.map((v, i) => {
      const x = (i / voltageHistory.length) * 280 + 10;
      const y = 50 - (v / maxVoltage) * 40;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 300 100" className="w-full h-24 bg-gray-900 rounded-lg">
        {/* Grid */}
        <defs>
          <pattern id="oscGrid" width="28" height="20" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="300" height="100" fill="url(#oscGrid)" />

        {/* Center line */}
        <line x1="10" y1="50" x2="290" y2="50" stroke="#4b5563" strokeWidth="1" />

        {/* Voltage trace */}
        <polyline
          points={points}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
        />

        {/* Labels */}
        <text x="5" y="15" className="fill-green-400 text-xs">+V</text>
        <text x="5" y="95" className="fill-red-400 text-xs">-V</text>
      </svg>
    );
  };

  const renderRotatingGenerator = () => {
    const radAngle = (rotationAngle * Math.PI) / 180;
    const inducedVoltage = isRotating ? Math.sin(radAngle) * rotationSpeed * 2 : 0;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Stator (stationary magnets) */}
        <g>
          {/* Top magnet - North */}
          <rect x="175" y="30" width="50" height="30" rx="4" fill="#ef4444" />
          <text x="200" y="50" textAnchor="middle" className="fill-white text-sm font-bold">N</text>
          {/* Bottom magnet - South */}
          <rect x="175" y="220" width="50" height="30" rx="4" fill="#3b82f6" />
          <text x="200" y="240" textAnchor="middle" className="fill-white text-sm font-bold">S</text>
        </g>

        {/* Rotor (spinning coil) */}
        <g transform={`rotate(${rotationAngle}, 200, 140)`}>
          <ellipse cx="200" cy="140" rx="60" ry="40" fill="none" stroke="#f59e0b" strokeWidth="4" />
          {/* Coil sides */}
          <line x1="140" y1="140" x2="130" y2="140" stroke="#f59e0b" strokeWidth="4" />
          <line x1="260" y1="140" x2="270" y2="140" stroke="#f59e0b" strokeWidth="4" />
        </g>

        {/* Slip rings and brushes */}
        <circle cx="200" cy="140" r="15" fill="#4b5563" stroke="#6b7280" strokeWidth="2" />
        <rect x="100" y="135" width="30" height="10" fill="#9ca3af" />
        <rect x="270" y="135" width="30" height="10" fill="#9ca3af" />

        {/* Output display */}
        <rect x="20" y="200" width="120" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="80" y="220" textAnchor="middle" className="fill-gray-400 text-xs">Output Voltage</text>
        <text x="80" y="245" textAnchor="middle" className={`text-lg font-bold ${
          inducedVoltage > 0 ? 'fill-green-400' : inducedVoltage < 0 ? 'fill-red-400' : 'fill-gray-500'
        }`}>
          {inducedVoltage.toFixed(2)} V
        </text>

        {/* Speed indicator */}
        <rect x="260" y="200" width="120" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="320" y="220" textAnchor="middle" className="fill-gray-400 text-xs">Rotation Speed</text>
        <text x="320" y="245" textAnchor="middle" className="fill-cyan-400 text-lg font-bold">
          {isRotating ? `${(rotationSpeed * 60).toFixed(0)} RPM` : 'STOPPED'}
        </text>

        {/* Magnetic field visualization */}
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1="200"
            y1={65 + i * 8}
            x2="200"
            y2={200 - i * 8}
            stroke="#6b7280"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity={0.3 + i * 0.1}
          />
        ))}
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      {/* Gradient Title */}
      <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-200 bg-clip-text text-transparent">Where Does Electricity Come From?</h2>
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-6 max-w-lg mx-auto border border-white/10">
        <p className="text-gray-300 text-lg leading-relaxed">
          Power plants, wind turbines, and hydroelectric dams all generate electricity.
          But how do you turn <span className="text-cyan-400">spinning motion</span> into
          <span className="text-yellow-400"> electric current</span>?
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-green-300 font-medium">
            🧲 The answer involves magnets, coils, and one of physics&apos; most beautiful symmetries!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how Faraday&apos;s simple experiment powers our entire civilization.
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
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
          If you move a magnet through a coil of wire, what will happen?
        </p>
        <div className="space-y-3">
          {[
            'Nothing - magnets don\'t affect wire',
            'The wire will become magnetic',
            'Electric current will flow in the wire',
            'The magnet will lose its magnetism'
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
                  ? 'bg-green-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Electromagnetic Induction</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderGenerator()}

        <div className="mt-6">
          <label className="block text-gray-400 font-medium mb-2">
            Magnet Position (drag to move)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={magnetPosition}
            onChange={(e) => setMagnetPosition(Number(e.target.value))}
            className="w-full accent-green-500 h-4"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Outside</span>
            <span>Inside Coil</span>
            <span>Outside</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-yellow-400 font-medium mb-2">
            Coil Turns: {coilTurns}
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={coilTurns}
            onChange={(e) => setCoilTurns(Number(e.target.value))}
            className="w-full accent-yellow-500"
          />
        </div>

        <div className="mt-4">
          <p className="text-gray-400 text-sm mb-2">Voltage Over Time:</p>
          {renderOscilloscope()}
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            {Math.abs(magnetVelocity) > 1 ? (
              <span className="text-green-400">
                ⚡ Moving magnet = changing flux = induced EMF!
              </span>
            ) : (
              <span className="text-yellow-400">
                Move the magnet quickly to generate electricity!
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Faraday&apos;s Law of Induction</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Discovery That Changed Everything</h3>
          <p className="text-gray-300">
            In 1831, Michael Faraday discovered that a <span className="text-yellow-400 font-bold">
            changing magnetic field induces electric current</span>. This is the principle
            behind all electrical generators!
          </p>
        </div>

        <div className="p-4 bg-gray-700 rounded-lg text-center">
          <p className="text-white font-mono text-lg">EMF = -N × dΦ/dt</p>
          <p className="text-gray-400 text-sm mt-2">
            Induced voltage = turns × rate of flux change
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🏃</div>
            <p className="text-xs text-gray-400">Faster Motion</p>
            <p className="text-green-400 font-bold">→ More Voltage</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🔄</div>
            <p className="text-xs text-gray-400">More Turns</p>
            <p className="text-green-400 font-bold">→ More Voltage</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🧲</div>
            <p className="text-xs text-gray-400">Stronger Magnet</p>
            <p className="text-green-400 font-bold">→ More Voltage</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Beautiful Symmetry:</strong> Electricity creates magnetism (Oersted).
            Changing magnetism creates electricity (Faraday). Together, these form electromagnetism!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          The Critical Detail →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Crucial Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          If you hold a strong magnet perfectly still inside a coil, what happens?
        </p>
        <div className="space-y-3">
          {[
            'Constant strong current flows',
            'Current slowly builds up',
            'No current flows at all',
            'The coil heats up'
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
                  ? 'bg-green-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Continuous Rotation Generator</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderRotatingGenerator()}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-cyan-400 font-medium mb-2">
              Rotation Speed: {rotationSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div className="flex justify-center gap-4">
            <button
              onMouseDown={() => {
                playSound('click');
                setIsRotating(!isRotating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                isRotating
                  ? 'bg-red-600 text-white'
                  : 'bg-green-600 text-white'
              }`}
            >
              {isRotating ? '⏹ Stop Rotation' : '▶ Start Rotation'}
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            {isRotating ? (
              <>
                <span className="text-green-400 font-bold">Continuous rotation = continuously changing flux = AC current!</span>
                <br />
                <span className="text-sm">Notice the voltage oscillates between + and - as the coil rotates.</span>
              </>
            ) : (
              <>
                <span className="text-red-400 font-bold">No rotation = no changing flux = NO current!</span>
                <br />
                <span className="text-sm">A static field doesn&apos;t induce anything, no matter how strong.</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); setIsRotating(false); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          Understand Why →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">It&apos;s the CHANGE That Matters!</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-red-900/30 rounded-lg border border-red-600">
          <h3 className="text-red-400 font-bold mb-2">The Critical Insight</h3>
          <p className="text-gray-300">
            <span className="text-yellow-400 font-bold">Static magnetic fields produce zero current!</span>{' '}
            Only <em>changing</em> magnetic flux induces EMF. This is why generators must
            spin continuously—a stopped generator produces nothing.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
            <h4 className="text-red-400 font-bold mb-2">❌ No Current</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Magnet sitting still in coil</li>
              <li>• Generator not spinning</li>
              <li>• Constant magnetic field</li>
            </ul>
          </div>
          <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
            <h4 className="text-green-400 font-bold mb-2">✓ Current Flows</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Magnet moving through coil</li>
              <li>• Generator spinning</li>
              <li>• Changing magnetic field</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Why AC Power:</strong> Rotating generators naturally produce alternating current
            because the flux change alternates direction each half-turn. This is why our power grid uses AC!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Generators</h2>
      <p className="text-gray-400 text-center">Explore how induction powers our world</p>

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
                : 'bg-gray-800 border-2 border-gray-700 hover:border-green-500'
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
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
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
            {passed ? 'Excellent understanding of electromagnetic induction!' : 'Review the concepts and try again.'}
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
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
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
                    ? 'bg-green-500'
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
      <h2 className="text-3xl font-bold text-white">Generator Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Faraday&apos;s law of induction
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Changing flux induces EMF
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Static fields produce no current
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> How generators power civilization
          </li>
        </ul>
      </div>
      <div className="p-4 bg-green-900/30 rounded-lg border border-green-600 max-w-md mx-auto">
        <p className="text-green-300">
          ⚡ Key Insight: Moving magnets create electricity—this simple principle powers our entire world!
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-3xl" />

      <div className="relative z-10 p-4">
        <div className="max-w-2xl mx-auto">
          {renderProgressBar()}

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
                className="px-4 py-2 bg-slate-700/50 backdrop-blur-xl text-gray-300 rounded-lg hover:bg-slate-600/50 transition-all border border-white/10"
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
    </div>
  );
}
