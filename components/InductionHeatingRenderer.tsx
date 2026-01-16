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

interface InductionHeatingRendererProps {
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
    question: 'What causes metal to heat up in an induction cooktop?',
    options: [
      'Direct heat from burning gas',
      'Radiation from a hot coil',
      'Eddy currents induced in the metal pan',
      'Microwaves penetrating the food'
    ],
    correct: 2
  },
  {
    question: 'Why doesn\'t a glass pan heat up on an induction stove?',
    options: [
      'Glass is already too hot',
      'Glass is an insulator - no eddy currents form',
      'The magnetic field passes through glass too fast',
      'Glass reflects the magnetic field'
    ],
    correct: 1
  },
  {
    question: 'How do eddy currents cause heating?',
    options: [
      'They create friction with air molecules',
      'They flow through resistance, converting electrical energy to heat (I²R)',
      'They vibrate at ultrasonic frequencies',
      'They create sparks inside the metal'
    ],
    correct: 1
  },
  {
    question: 'Why is induction cooking more efficient than gas?',
    options: [
      'It uses more electricity',
      'Heat is generated directly in the pan, not wasted on air',
      'Gas burners are turned down',
      'Induction uses nuclear energy'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Induction Cooktops',
    description: 'Oscillating field creates eddy currents in steel/iron pans. 80-90% efficient vs 40% for gas!',
    icon: '🍳'
  },
  {
    title: 'Metal Hardening',
    description: 'Rapid surface heating hardens tool steel without affecting the core. Used for gears and shafts.',
    icon: '⚙️'
  },
  {
    title: 'Induction Furnaces',
    description: 'Melt metals without contamination from fuel combustion. Essential for high-purity alloys.',
    icon: '🔥'
  },
  {
    title: 'Wireless Charging',
    description: 'Similar principle! Oscillating field induces current in your phone\'s receiver coil.',
    icon: '🔋'
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
export default function InductionHeatingRenderer({ onEvent, savedState }: InductionHeatingRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [isHeating, setIsHeating] = useState(false);
  const [panMaterial, setPanMaterial] = useState<'steel' | 'aluminum' | 'glass' | 'copper'>('steel');
  const [temperature, setTemperature] = useState(25);
  const [frequency, setFrequency] = useState(25); // kHz
  const [fieldPhase, setFieldPhase] = useState(0);

  // Twist state
  const [twistMaterial, setTwistMaterial] = useState<'steel' | 'aluminum' | 'glass'>('steel');

  const navigationLockRef = useRef(false);

  // Material properties
  const getMaterialProperties = (mat: string) => {
    const props: Record<string, { conductivity: number; magnetic: boolean; heatingRate: number; color: string }> = {
      steel: { conductivity: 0.7, magnetic: true, heatingRate: 1.0, color: '#6b7280' },
      aluminum: { conductivity: 1.0, magnetic: false, heatingRate: 0.3, color: '#d1d5db' },
      glass: { conductivity: 0, magnetic: false, heatingRate: 0, color: '#93c5fd' },
      copper: { conductivity: 1.0, magnetic: false, heatingRate: 0.4, color: '#f97316' }
    };
    return props[mat] || props.steel;
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
      setFieldPhase(p => (p + frequency / 10) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [frequency]);

  // Heating simulation
  useEffect(() => {
    if (!isHeating) return;

    const props = getMaterialProperties(panMaterial);
    const interval = setInterval(() => {
      setTemperature(t => {
        const maxTemp = props.heatingRate > 0 ? 400 : 25;
        const rate = props.heatingRate * (frequency / 25);
        if (t >= maxTemp) return maxTemp;
        return t + rate;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isHeating, panMaterial, frequency]);

  // Cooling when not heating
  useEffect(() => {
    if (isHeating || temperature <= 25) return;

    const interval = setInterval(() => {
      setTemperature(t => Math.max(25, t - 0.5));
    }, 100);

    return () => clearInterval(interval);
  }, [isHeating, temperature]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setIsHeating(false);
      setPanMaterial('steel');
      setTemperature(25);
      setFrequency(25);
    }
    if (phase === 'twist_play') {
      setTwistMaterial('steel');
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
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderInductionCooktop = (material: string, temp: number, heating: boolean, phase: number) => {
    const props = getMaterialProperties(material);
    const tempColor = temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : temp > 50 ? '#fbbf24' : '#6b7280';
    const hasEddyCurrents = heating && props.conductivity > 0;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Cooktop surface */}
        <rect x="50" y="180" width="300" height="30" rx="4" fill="#1f2937" />

        {/* Induction coil (under surface) */}
        <g>
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx="200"
              cy="195"
              rx={30 + i * 15}
              ry={6 + i * 3}
              fill="none"
              stroke={heating ? '#f97316' : '#4b5563'}
              strokeWidth="3"
              opacity={heating ? 0.5 + Math.sin(phase + i) * 0.3 : 0.5}
            />
          ))}
        </g>

        {/* Magnetic field arrows (oscillating) */}
        {heating && (
          <g>
            {[-1, 1].map(side => (
              <g key={side} transform={`translate(${200 + side * 80}, 160)`}>
                <path
                  d={`M 0 30 L 0 ${30 - Math.sin(phase) * 20}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text y="50" textAnchor="middle" className="fill-blue-400 text-xs">B</text>
              </g>
            ))}
          </g>
        )}

        {/* Pan */}
        <g>
          {/* Pan body */}
          <ellipse cx="200" cy="175" rx="80" ry="15" fill={tempColor} />
          <rect x="120" y="100" width="160" height="75" fill={props.color} />
          <ellipse cx="200" cy="100" rx="80" ry="20" fill={props.color} />
          <ellipse cx="200" cy="100" rx="70" ry="15" fill="#111827" />

          {/* Handle */}
          <rect x="280" y="125" width="60" height="15" rx="4" fill="#1f2937" />

          {/* Eddy currents in pan (when conducting) */}
          {hasEddyCurrents && (
            <g className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <ellipse
                  key={i}
                  cx="200"
                  cy={170 - i * 20}
                  rx={60 - i * 10}
                  ry={10 - i * 2}
                  fill="none"
                  stroke={temp > 100 ? '#ef4444' : '#f97316'}
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity={0.6 - i * 0.15}
                  style={{ transform: `rotate(${Math.sin(phase) * 5}deg)`, transformOrigin: '200px 150px' }}
                />
              ))}
            </g>
          )}

          {/* No heating indicator for glass */}
          {material === 'glass' && heating && (
            <text x="200" y="140" textAnchor="middle" className="fill-blue-300 text-sm font-bold">
              No currents!
            </text>
          )}
        </g>

        {/* Temperature display */}
        <rect x="20" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="70" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Pan Temp</text>
        <text x="70" y="60" textAnchor="middle" className={`text-lg font-bold ${
          temp > 100 ? 'fill-red-400' : 'fill-gray-300'
        }`}>
          {temp.toFixed(0)}°C
        </text>

        {/* Material label */}
        <rect x="280" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="330" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Material</text>
        <text x="330" y="60" textAnchor="middle" className="fill-white text-sm font-bold capitalize">
          {material}
        </text>

        {/* Power indicator */}
        <rect x="150" y="230" width="100" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="250" textAnchor="middle" className="fill-gray-400 text-xs">Induction</text>
        <text x="200" y="265" textAnchor="middle" className={`text-sm font-bold ${
          heating ? 'fill-orange-400' : 'fill-gray-500'
        }`}>
          {heating ? 'ON' : 'OFF'}
        </text>
      </svg>
    );
  };

  const renderEddyCurrentDiagram = () => (
    <svg viewBox="0 0 300 150" className="w-full h-32">
      <rect width="300" height="150" fill="#111827" />

      {/* Changing B field */}
      <g transform="translate(60, 75)">
        <text x="0" y="-50" textAnchor="middle" className="fill-gray-400 text-xs">Changing B field</text>
        <circle r="30" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" />
        <path d="M 0 -20 L 0 20" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowhead)" />
        <text x="0" y="50" textAnchor="middle" className="fill-blue-400 text-xs">↕ B(t)</text>
      </g>

      {/* Arrow */}
      <path d="M 100 75 L 130 75" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
      <text x="115" y="90" textAnchor="middle" className="fill-yellow-400 text-xs">induces</text>

      {/* Eddy currents in conductor */}
      <g transform="translate(190, 75)">
        <text x="0" y="-50" textAnchor="middle" className="fill-gray-400 text-xs">Metal conductor</text>
        <rect x="-40" y="-30" width="80" height="60" rx="4" fill="#6b7280" />
        {/* Swirling currents */}
        <ellipse cx="0" cy="0" rx="25" ry="15" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4,4" />
        <ellipse cx="0" cy="0" rx="15" ry="8" fill="none" stroke="#ef4444" strokeWidth="2" />
        <text x="0" y="50" textAnchor="middle" className="fill-orange-400 text-xs">Eddy currents → I²R heat</text>
      </g>
    </svg>
  );

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">How Does a Stove Heat Without Getting Hot?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Induction cooktops can boil water in seconds, yet the surface stays cool enough to touch!
          You can even put ice cubes on the cooktop while it &quot;heats&quot; a pan.
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-orange-300 font-medium">
            🔥 The heat is generated inside the pan itself, not transferred from the stove!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how invisible magnetic fields can cook your dinner.
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
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
          An oscillating magnetic field passes through a metal pan.
          What happens inside the metal?
        </p>
        <div className="space-y-3">
          {[
            'The metal vibrates like a speaker',
            'Circular currents form and heat the metal (I²R)',
            'The metal becomes a permanent magnet',
            'Nothing - magnetism doesn\'t affect metal'
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
                  ? 'bg-orange-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Induction Heating Simulator</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderInductionCooktop(panMaterial, temperature, isHeating, fieldPhase)}

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-gray-400 text-sm mb-2">Pan Material:</p>
            <div className="grid grid-cols-2 gap-2">
              {(['steel', 'aluminum', 'glass', 'copper'] as const).map(mat => (
                <button
                  key={mat}
                  onMouseDown={() => {
                    playSound('click');
                    setPanMaterial(mat);
                    setTemperature(25);
                  }}
                  className={`px-3 py-2 rounded-lg font-bold text-sm capitalize ${
                    panMaterial === mat
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Frequency: {frequency} kHz</p>
            <input
              type="range"
              min="10"
              max="50"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setIsHeating(!isHeating);
            }}
            className={`px-8 py-4 rounded-lg font-bold text-lg ${
              isHeating
                ? 'bg-red-600 text-white'
                : 'bg-orange-600 text-white'
            }`}
          >
            {isHeating ? '⏹ Turn Off' : '🔥 Turn On'}
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center text-sm">
            {panMaterial === 'glass'
              ? '❌ Glass is an insulator - no eddy currents, no heating!'
              : panMaterial === 'aluminum' || panMaterial === 'copper'
                ? '⚠️ Non-magnetic metal heats slowly (fewer eddy currents)'
                : '✓ Steel heats efficiently - magnetic + conductive!'}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); setIsHeating(false); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Eddy Currents & Induction Heating</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-orange-900/30 rounded-lg border border-orange-600">
          <h3 className="text-orange-400 font-bold mb-2">How It Works</h3>
          <p className="text-gray-300">
            A coil creates an <span className="text-blue-400 font-bold">oscillating magnetic field</span>.
            This changing field induces <span className="text-orange-400 font-bold">circular currents</span> (eddy currents)
            in any nearby conductor. These currents flow through resistance and generate heat (P = I²R)!
          </p>
        </div>

        {renderEddyCurrentDiagram()}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
            <h4 className="text-green-400 font-bold mb-2">Best Materials</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <span className="text-white">Iron/Steel:</span> Magnetic + resistive</li>
              <li>• <span className="text-white">Cast iron:</span> Excellent for induction</li>
              <li>• Higher resistance = more I²R heating</li>
            </ul>
          </div>
          <div className="p-4 bg-red-900/30 rounded-lg border border-red-600">
            <h4 className="text-red-400 font-bold mb-2">Poor Materials</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <span className="text-white">Glass:</span> No free electrons</li>
              <li>• <span className="text-white">Aluminum:</span> Low resistance</li>
              <li>• <span className="text-white">Copper:</span> Too conductive!</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Efficiency:</strong> Induction is 80-90% efficient because heat is generated
            directly where needed. Gas is only ~40% efficient!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
        >
          Material Comparison →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Material Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          Why do induction cooktops require special pans? What happens if you use aluminum or glass?
        </p>
        <div className="space-y-3">
          {[
            'All pans work equally well',
            'Non-magnetic/non-conducting pans don\'t heat (or heat poorly)',
            'The cooktop will break if wrong pan is used',
            'All metal pans work, only glass fails'
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
                  ? 'bg-orange-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
        >
          Compare Materials →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const materialProps: Record<string, { heats: boolean; rate: string; reason: string }> = {
      steel: { heats: true, rate: 'Fast', reason: 'Magnetic + moderate resistance = strong eddy currents + I²R heating' },
      aluminum: { heats: true, rate: 'Slow', reason: 'Conductive but non-magnetic - weak eddy currents' },
      glass: { heats: false, rate: 'None', reason: 'No free electrons - no currents can form!' }
    };
    const props = materialProps[twistMaterial];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Material Comparison</h2>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-center gap-2 mb-6">
            {(['steel', 'aluminum', 'glass'] as const).map(mat => (
              <button
                key={mat}
                onMouseDown={() => {
                  playSound('click');
                  setTwistMaterial(mat);
                }}
                className={`px-6 py-3 rounded-lg font-bold capitalize ${
                  twistMaterial === mat
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>

          <div className="h-40 bg-gray-900 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {twistMaterial === 'steel' ? '🍳' : twistMaterial === 'aluminum' ? '🥘' : '🫖'}
              </div>
              <p className={`font-bold text-lg ${props.heats ? 'text-orange-400' : 'text-blue-400'}`}>
                Heating: {props.rate}
              </p>
            </div>
          </div>

          <div className={`mt-4 p-4 rounded-lg border ${
            props.heats ? 'bg-orange-900/30 border-orange-600' : 'bg-blue-900/30 border-blue-600'
          }`}>
            <p className={`text-center ${props.heats ? 'text-orange-300' : 'text-blue-300'}`}>
              <span className="font-bold">{twistMaterial.charAt(0).toUpperCase() + twistMaterial.slice(1)}:</span> {props.reason}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {Object.entries(materialProps).map(([mat, p]) => (
              <div key={mat} className={`p-2 rounded-lg ${mat === twistMaterial ? 'bg-gray-600' : 'bg-gray-700'}`}>
                <p className="text-white text-xs font-bold capitalize text-center">{mat}</p>
                <p className={`text-xs text-center ${p.heats ? 'text-orange-400' : 'text-blue-400'}`}>
                  {p.rate}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
          >
            Understand Why →
          </button>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Why Material Matters</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
          <h3 className="text-blue-400 font-bold mb-2">Two Key Properties</h3>
          <p className="text-gray-300">
            Effective induction heating requires:
            <br />
            1. <span className="text-green-400 font-bold">Electrical conductivity</span> - for currents to flow
            <br />
            2. <span className="text-purple-400 font-bold">Magnetic permeability</span> - for stronger field coupling
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-green-900/30 rounded-lg border border-green-600 text-center">
            <div className="text-2xl mb-1">🍳</div>
            <p className="text-green-400 font-bold text-sm">Steel/Cast Iron</p>
            <p className="text-gray-400 text-xs">✓ Conductive</p>
            <p className="text-gray-400 text-xs">✓ Magnetic</p>
            <p className="text-green-300 text-xs font-bold">BEST</p>
          </div>
          <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-600 text-center">
            <div className="text-2xl mb-1">🥘</div>
            <p className="text-yellow-400 font-bold text-sm">Aluminum</p>
            <p className="text-gray-400 text-xs">✓ Conductive</p>
            <p className="text-gray-400 text-xs">✗ Not magnetic</p>
            <p className="text-yellow-300 text-xs font-bold">POOR</p>
          </div>
          <div className="p-3 bg-red-900/30 rounded-lg border border-red-600 text-center">
            <div className="text-2xl mb-1">🫖</div>
            <p className="text-red-400 font-bold text-sm">Glass</p>
            <p className="text-gray-400 text-xs">✗ Insulator</p>
            <p className="text-gray-400 text-xs">✗ Not magnetic</p>
            <p className="text-red-300 text-xs font-bold">NONE</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Workaround:</strong> Some &quot;induction-ready&quot; aluminum pans have a steel
            plate bonded to the bottom. The steel heats up and conducts heat to the aluminum!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Induction Heating</h2>
      <p className="text-gray-400 text-center">Explore how eddy currents power industry</p>

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
                : 'bg-gray-800 border-2 border-gray-700 hover:border-orange-500'
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
            className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all"
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
            {passed ? 'Excellent understanding of induction heating!' : 'Review the concepts and try again.'}
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
                : 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
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
                    ? 'bg-orange-500'
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
      <h2 className="text-3xl font-bold text-white">Induction Heating Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Eddy currents from changing magnetic fields
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> I²R heating in resistive materials
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Why steel works but glass doesn&apos;t
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Industrial applications
          </li>
        </ul>
      </div>
      <div className="p-4 bg-orange-900/30 rounded-lg border border-orange-600 max-w-md mx-auto">
        <p className="text-orange-300">
          🔥 Key Insight: Heat without direct contact—oscillating fields make currents, currents make heat!
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
          <span className="px-3 py-1 bg-orange-900/50 text-orange-300 rounded-full text-sm">
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
