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

interface FaradayCageRendererProps {
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
    question: 'Why does a Faraday cage block electromagnetic waves?',
    options: [
      'It absorbs all the energy as heat',
      'Free electrons move to cancel the field inside',
      'The metal reflects all radiation like a mirror',
      'It converts EM waves to sound'
    ],
    correct: 1
  },
  {
    question: 'Your phone loses signal in an elevator because:',
    options: [
      'Elevators are too high up',
      'The metal walls act as a Faraday cage',
      'The motor creates interference',
      'Buildings block GPS'
    ],
    correct: 1
  },
  {
    question: 'Why does mesh work for shielding even though it has holes?',
    options: [
      'The holes let heat escape',
      'Mesh is cheaper than solid metal',
      'Holes smaller than the wavelength still block waves',
      'The holes are filled with invisible glass'
    ],
    correct: 2
  },
  {
    question: 'Microwave ovens have a mesh window. What would happen if the holes were larger?',
    options: [
      'Food would cook faster',
      'Microwaves could leak out and be dangerous',
      'The oven would be more efficient',
      'You couldn\'t see the food'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Microwave Ovens',
    description: 'The mesh door keeps 2.45GHz microwaves inside while letting you see your food. Holes are ~1mm, wavelength is 12cm!',
    icon: '🍿'
  },
  {
    title: 'MRI Rooms',
    description: 'Entire rooms are shielded to keep RF signals from interfering with sensitive imaging. Also protects the outside world.',
    icon: '🏥'
  },
  {
    title: 'EMP Protection',
    description: 'Critical electronics in military and infrastructure use Faraday enclosures to survive electromagnetic pulses.',
    icon: '⚡'
  },
  {
    title: 'RFID Blocking Wallets',
    description: 'Metal-lined wallets block the radio signals used to scan contactless cards, preventing wireless theft.',
    icon: '💳'
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
export default function FaradayCageRenderer({ onEvent, savedState }: FaradayCageRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [cageEnabled, setCageEnabled] = useState(false);
  const [signalStrength, setSignalStrength] = useState(100);
  const [wavePhase, setWavePhase] = useState(0);

  // Twist state - mesh vs wavelength
  const [meshSize, setMeshSize] = useState<'small' | 'medium' | 'large'>('small');
  const [wavelength, setWavelength] = useState<'long' | 'short'>('long');

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

  // Calculate shielding effectiveness
  const getShieldingEffectiveness = (mesh: 'small' | 'medium' | 'large', wave: 'long' | 'short'): number => {
    // Small mesh works for all, large mesh fails for short wavelength
    if (mesh === 'small') return 99;
    if (mesh === 'medium') return wave === 'long' ? 95 : 50;
    return wave === 'long' ? 80 : 10;
  };

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setWavePhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Update signal based on cage
  useEffect(() => {
    if (cageEnabled) {
      setSignalStrength(5); // Very low signal inside cage
    } else {
      setSignalStrength(100);
    }
  }, [cageEnabled]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setCageEnabled(false);
      setSignalStrength(100);
    }
    if (phase === 'twist_play') {
      setMeshSize('small');
      setWavelength('long');
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
              ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderFaradayCage = (cage: boolean, strength: number, animPhase: number) => {
    const waveAmplitude = 30;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Radio tower */}
        <g>
          <rect x="30" y="100" width="10" height="130" fill="#6b7280" />
          <path d="M 15 100 L 35 60 L 55 100" fill="none" stroke="#6b7280" strokeWidth="4" />
          <circle cx="35" cy="55" r="8" fill="#ef4444" className="animate-pulse" />
          <text x="35" y="250" textAnchor="middle" className="fill-gray-400 text-xs">📡 Signal</text>
        </g>

        {/* EM waves propagating */}
        <g>
          {[...Array(5)].map((_, i) => {
            const x = 80 + i * 40;
            const opacity = cage && x > 200 ? 0.1 : 1 - i * 0.15;
            const blocked = cage && x > 180;

            return (
              <g key={i}>
                {/* Wave */}
                <path
                  d={`M ${x} 80
                     Q ${x + 10} ${80 + Math.sin(animPhase + i) * waveAmplitude} ${x + 20} 80
                     Q ${x + 30} ${80 - Math.sin(animPhase + i) * waveAmplitude} ${x + 40} 80`}
                  fill="none"
                  stroke={blocked ? '#ef4444' : '#fbbf24'}
                  strokeWidth="3"
                  opacity={blocked ? 0.3 : opacity}
                />
                <path
                  d={`M ${x} 200
                     Q ${x + 10} ${200 + Math.sin(animPhase + i) * waveAmplitude} ${x + 20} 200
                     Q ${x + 30} ${200 - Math.sin(animPhase + i) * waveAmplitude} ${x + 40} 200`}
                  fill="none"
                  stroke={blocked ? '#ef4444' : '#fbbf24'}
                  strokeWidth="3"
                  opacity={blocked ? 0.3 : opacity}
                />
              </g>
            );
          })}
        </g>

        {/* Faraday cage (when enabled) */}
        {cage && (
          <g>
            <rect
              x="180"
              y="50"
              width="140"
              height="180"
              rx="8"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="6"
            />
            {/* Mesh pattern */}
            {[...Array(7)].map((_, i) => (
              <line
                key={`v${i}`}
                x1={190 + i * 20}
                y1="50"
                x2={190 + i * 20}
                y2="230"
                stroke="#f59e0b"
                strokeWidth="2"
              />
            ))}
            {[...Array(9)].map((_, i) => (
              <line
                key={`h${i}`}
                x1="180"
                y1={60 + i * 20}
                x2="320"
                y2={60 + i * 20}
                stroke="#f59e0b"
                strokeWidth="2"
              />
            ))}

            {/* Electrons moving (shielding visualization) */}
            {[...Array(4)].map((_, i) => (
              <circle
                key={`e${i}`}
                cx={183 + Math.sin(animPhase * 2 + i) * 3}
                cy={80 + i * 40}
                r="4"
                fill="#3b82f6"
                className="animate-pulse"
              />
            ))}
            {[...Array(4)].map((_, i) => (
              <circle
                key={`e2${i}`}
                cx={317 + Math.sin(animPhase * 2 + i + Math.PI) * 3}
                cy={80 + i * 40}
                r="4"
                fill="#3b82f6"
                className="animate-pulse"
              />
            ))}
          </g>
        )}

        {/* Phone inside */}
        <g transform="translate(230, 100)">
          <rect x="0" y="0" width="40" height="70" rx="6" fill="#374151" stroke="#6b7280" strokeWidth="2" />
          <rect x="5" y="8" width="30" height="45" fill="#1f2937" />
          {/* Signal bars */}
          <g transform="translate(8, 15)">
            {[...Array(4)].map((_, i) => {
              const barHeight = 5 + i * 4;
              const barStrength = (i + 1) * 25;
              const visible = strength >= barStrength;
              return (
                <rect
                  key={i}
                  x={i * 7}
                  y={20 - barHeight}
                  width="5"
                  height={barHeight}
                  fill={visible ? '#22c55e' : '#4b5563'}
                />
              );
            })}
          </g>
          <text x="20" y="65" textAnchor="middle" className="fill-gray-400 text-xs">
            {strength > 50 ? '📶' : '❌'}
          </text>
        </g>

        {/* Signal strength indicator */}
        <rect x="10" y="10" width="100" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="60" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Inside Signal</text>
        <text x="60" y="43" textAnchor="middle" className={`text-sm font-bold ${
          strength > 50 ? 'fill-green-400' : 'fill-red-400'
        }`}>
          {strength}%
        </text>

        {/* Cage status */}
        <rect x="290" y="10" width="100" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="340" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Cage</text>
        <text x="340" y="43" textAnchor="middle" className={`text-sm font-bold ${
          cage ? 'fill-yellow-400' : 'fill-gray-500'
        }`}>
          {cage ? 'ON' : 'OFF'}
        </text>
      </svg>
    );
  };

  const renderMeshComparison = (mesh: 'small' | 'medium' | 'large', wave: 'long' | 'short', animPhase: number) => {
    const meshSizes = { small: 8, medium: 20, large: 40 };
    const wavelengths = { long: 60, short: 15 };
    const meshPixels = meshSizes[mesh];
    const wavePixels = wavelengths[wave];
    const effectiveness = getShieldingEffectiveness(mesh, wave);
    const penetrates = effectiveness < 50;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Mesh visualization */}
        <rect x="180" y="40" width="120" height="200" rx="4" fill="none" stroke="#6b7280" strokeWidth="2" />

        {/* Draw mesh pattern based on size */}
        <g>
          {[...Array(Math.ceil(120 / meshPixels))].map((_, i) =>
            [...Array(Math.ceil(200 / meshPixels))].map((_, j) => (
              <rect
                key={`${i}-${j}`}
                x={180 + i * meshPixels + 2}
                y={40 + j * meshPixels + 2}
                width={meshPixels - 4}
                height={meshPixels - 4}
                fill="#111827"
                stroke="#f59e0b"
                strokeWidth="1"
              />
            ))
          )}
        </g>

        {/* Incoming waves */}
        <g>
          {[...Array(3)].map((_, i) => {
            const x = 50 + i * 40;
            return (
              <path
                key={i}
                d={`M ${x} ${140 - wavePixels / 2}
                   C ${x + 20} ${140 - wavePixels / 2}, ${x + 20} ${140 + wavePixels / 2}, ${x + 40} ${140 + wavePixels / 2}
                   C ${x + 60} ${140 + wavePixels / 2}, ${x + 60} ${140 - wavePixels / 2}, ${x + 80} ${140 - wavePixels / 2}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                opacity={1 - i * 0.2}
              />
            );
          })}
        </g>

        {/* Waves inside (if penetrating) */}
        {penetrates && (
          <g className="animate-pulse">
            <path
              d={`M 200 ${140 - wavePixels / 4}
                 C 220 ${140 - wavePixels / 4}, 220 ${140 + wavePixels / 4}, 240 ${140 + wavePixels / 4}
                 C 260 ${140 + wavePixels / 4}, 260 ${140 - wavePixels / 4}, 280 ${140 - wavePixels / 4}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              opacity="0.7"
            />
          </g>
        )}

        {/* Blocked indicator */}
        {!penetrates && (
          <g>
            <circle cx="240" cy="140" r="20" fill="#22c55e" fillOpacity="0.2" />
            <text x="240" y="145" textAnchor="middle" className="fill-green-400 text-lg">✓</text>
          </g>
        )}

        {/* Labels */}
        <text x="100" y="260" textAnchor="middle" className="fill-blue-400 text-xs">
          λ = {wave === 'long' ? '60mm' : '15mm'}
        </text>
        <text x="240" y="260" textAnchor="middle" className="fill-yellow-400 text-xs">
          Mesh: {meshPixels}mm holes
        </text>

        {/* Comparison indicator */}
        <rect x="20" y="20" width="140" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="90" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Hole vs Wavelength</text>
        <text x="90" y="58" textAnchor="middle" className={`text-sm font-bold ${
          meshPixels < wavePixels ? 'fill-green-400' : 'fill-red-400'
        }`}>
          {meshPixels < wavePixels ? 'Hole < λ ✓ BLOCKED' : 'Hole > λ ✗ LEAKS'}
        </text>

        {/* Effectiveness meter */}
        <rect x="280" y="20" width="100" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="330" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Shielding</text>
        <text x="330" y="60" textAnchor="middle" className={`text-lg font-bold ${
          effectiveness > 80 ? 'fill-green-400' : effectiveness > 40 ? 'fill-yellow-400' : 'fill-red-400'
        }`}>
          {effectiveness}%
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Why Does Your Phone Lose Signal in Elevators?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Step into a metal elevator, and your phone signal vanishes.
          Step out, and it returns. The metal box acts like a
          <span className="text-yellow-400"> magical shield</span> against radio waves!
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-amber-300 font-medium">
            🛡️ This is called a &quot;Faraday cage&quot; - and it&apos;s used everywhere from microwaves to MRI rooms!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how a simple metal enclosure can block electromagnetic waves.
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
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
          Why does a metal enclosure block electromagnetic waves?
        </p>
        <div className="space-y-3">
          {[
            'Metal absorbs all the wave energy as heat',
            'Free electrons in metal move to cancel the field inside',
            'Metal is simply too dense for waves to pass through',
            'The waves bounce back like light off a mirror'
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
                  ? 'bg-yellow-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Faraday Cage Simulator</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderFaradayCage(cageEnabled, signalStrength, wavePhase)}

        <div className="flex justify-center mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setCageEnabled(!cageEnabled);
            }}
            className={`px-8 py-4 rounded-lg font-bold text-lg ${
              cageEnabled
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {cageEnabled ? '🛡️ Cage ON' : '📡 Cage OFF'}
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            {cageEnabled ? (
              <>
                <span className="text-yellow-400 font-bold">Signal blocked!</span> Free electrons in the
                metal redistribute to cancel the incoming field.
              </>
            ) : (
              <>
                <span className="text-green-400 font-bold">Full signal!</span> EM waves pass freely
                to the phone.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Shielding Principle</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <h3 className="text-yellow-400 font-bold mb-2">How It Works</h3>
          <p className="text-gray-300">
            When an EM wave hits a conductor, it pushes free electrons around.
            These electrons <span className="text-cyan-400 font-bold">redistribute instantly</span> to
            create an opposing field that cancels the original wave inside the enclosure!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-blue-400 font-bold mb-2">External Wave</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Oscillating E and B fields</li>
              <li>• Pushes electrons in metal</li>
              <li>• Creates surface currents</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-green-400 font-bold mb-2">Inside</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Surface currents make opposing field</li>
              <li>• Fields cancel out perfectly</li>
              <li>• Net field ≈ zero!</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
          <p className="text-purple-300">
            💡 <strong>Key Insight:</strong> The cage doesn&apos;t need to be solid!
            As long as holes are smaller than the wavelength, it still works.
            That&apos;s why microwave oven doors have mesh!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          What About Mesh? →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Mesh Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          A Faraday cage with large holes is exposed to waves with a wavelength
          SHORTER than the hole size. What happens?
        </p>
        <div className="space-y-3">
          {[
            'Still blocks everything - holes don\'t matter',
            'Blocks half the wave',
            'Waves leak through - holes are too big!',
            'Converts the wave to a different frequency'
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
                  ? 'bg-yellow-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Mesh Size vs Wavelength</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderMeshComparison(meshSize, wavelength, wavePhase)}

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-yellow-400 font-medium mb-2">Mesh Hole Size</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onMouseDown={() => {
                    playSound('click');
                    setMeshSize(size);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm ${
                    meshSize === size
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {size === 'small' ? '8mm' : size === 'medium' ? '20mm' : '40mm'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-blue-400 font-medium mb-2">Wavelength</p>
            <div className="flex gap-2">
              {(['long', 'short'] as const).map(wave => (
                <button
                  key={wave}
                  onMouseDown={() => {
                    playSound('click');
                    setWavelength(wave);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm ${
                    wavelength === wave
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {wave === 'long' ? '60mm' : '15mm'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${
          getShieldingEffectiveness(meshSize, wavelength) > 80
            ? 'bg-green-900/30 border-green-600'
            : getShieldingEffectiveness(meshSize, wavelength) > 40
              ? 'bg-yellow-900/30 border-yellow-600'
              : 'bg-red-900/30 border-red-600'
        }`}>
          <p className={`text-center ${
            getShieldingEffectiveness(meshSize, wavelength) > 80 ? 'text-green-300' :
              getShieldingEffectiveness(meshSize, wavelength) > 40 ? 'text-yellow-300' : 'text-red-300'
          }`}>
            <span className="font-bold">Rule:</span> Hole size must be &lt;&lt; wavelength for effective shielding.
            {meshSize === 'large' && wavelength === 'short' && (
              <><br />🚨 Short waves slip right through large holes!</>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          Understand the Rule →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Wavelength Rule</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Key Principle</h3>
          <p className="text-gray-300">
            Electromagnetic waves can only &quot;see&quot; obstacles comparable to their wavelength.
            If a hole is <span className="text-yellow-400 font-bold">much smaller than λ</span>,
            the wave diffracts around it and can&apos;t pass through!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-cyan-400 font-bold mb-2">Microwave Oven Door</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Microwaves: λ = 12cm (122mm)</li>
              <li>• Mesh holes: ~1-2mm</li>
              <li>• Ratio: holes are 60-100× smaller</li>
              <li>• Result: Safe! Waves can&apos;t escape</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-purple-400 font-bold mb-2">WiFi Through Walls</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• WiFi: λ = 12cm</li>
              <li>• Wall studs: ~40cm apart</li>
              <li>• Ratio: gaps are 3× larger</li>
              <li>• Result: WiFi passes through!</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Real Example:</strong> Your car is a Faraday cage for radio waves (metal body),
            but you can still make phone calls because cell signals have longer wavelengths that
            can enter through the windows!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Faraday Cages</h2>
      <p className="text-gray-400 text-center">Explore how EM shielding protects us</p>

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
                : 'bg-gray-800 border-2 border-gray-700 hover:border-yellow-500'
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
            className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-amber-500 transition-all"
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
            {passed ? 'Excellent understanding of Faraday cages!' : 'Review the concepts and try again.'}
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
                : 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white'
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
                    ? 'bg-yellow-500'
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
      <h2 className="text-3xl font-bold text-white">Faraday Cage Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Electrons redistribute to cancel internal fields
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Mesh works if holes &lt;&lt; wavelength
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Real-world shielding applications
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Why elevators block signals
          </li>
        </ul>
      </div>
      <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600 max-w-md mx-auto">
        <p className="text-yellow-300">
          🛡️ Key Insight: A conductor shields by moving charges to oppose incoming fields!
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
          <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-sm">
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
