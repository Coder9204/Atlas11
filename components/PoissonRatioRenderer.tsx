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

interface PoissonRatioRendererProps {
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
    question: 'What is Poisson\'s ratio?',
    options: [
      'The ratio of stress to strain',
      'The ratio of lateral contraction to axial extension',
      'The maximum stretch before breaking',
      'The speed of sound in the material'
    ],
    correct: 1
  },
  {
    question: 'Why does rubber have a Poisson\'s ratio close to 0.5?',
    options: [
      'It\'s very stiff',
      'It\'s nearly incompressible - volume stays constant, so it must thin when stretched',
      'It contains air bubbles',
      'It\'s made of carbon'
    ],
    correct: 1
  },
  {
    question: 'What\'s special about auxetic materials?',
    options: [
      'They\'re extremely strong',
      'They have negative Poisson\'s ratio - they get WIDER when stretched',
      'They conduct electricity',
      'They\'re transparent'
    ],
    correct: 1
  },
  {
    question: 'Why are cork stoppers good for wine bottles?',
    options: [
      'Cork is waterproof',
      'Cork has ν ≈ 0, so it doesn\'t bulge when compressed into the bottle',
      'Cork is antibacterial',
      'Cork is the cheapest material'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Cork Stoppers',
    description: 'Cork has ν ≈ 0, so it compresses without bulging - perfect for sliding into bottles!',
    icon: '🍾'
  },
  {
    title: 'Auxetic Foam',
    description: 'Used in body armor - expands to fill wounds and distribute impact over larger area.',
    icon: '🛡️'
  },
  {
    title: 'Rubber Bands',
    description: 'ν ≈ 0.5 means rubber maintains constant volume - watch it thin as you stretch!',
    icon: '🔗'
  },
  {
    title: 'Metal Forming',
    description: 'Engineers must account for Poisson contraction when designing stamped metal parts.',
    icon: '🏭'
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
export default function PoissonRatioRenderer({ onEvent, savedState }: PoissonRatioRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [material, setMaterial] = useState<'steel' | 'rubber' | 'cork'>('steel');
  const [stretch, setStretch] = useState(0); // 0 to 50 (percent)
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - auxetic material
  const [auxeticStretch, setAuxeticStretch] = useState(0);

  const navigationLockRef = useRef(false);

  // Poisson's ratios
  const getPoissonRatio = (mat: string): number => {
    switch (mat) {
      case 'steel': return 0.3;
      case 'rubber': return 0.49;
      case 'cork': return 0.0;
      default: return 0.3;
    }
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

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setMaterial('steel');
      setStretch(0);
    }
    if (phase === 'twist_play') {
      setAuxeticStretch(0);
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
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderStretchScene = () => {
    const nu = getPoissonRatio(material);
    const axialStretch = stretch / 100;
    const lateralContraction = nu * axialStretch;

    const baseWidth = 80;
    const baseHeight = 120;
    const newWidth = baseWidth * (1 - lateralContraction);
    const newHeight = baseHeight * (1 + axialStretch);

    const materialColors: Record<string, string> = {
      steel: '#6b7280',
      rubber: '#ec4899',
      cork: '#d97706'
    };

    return (
      <svg viewBox="0 0 400 300" className="w-full h-60">
        <rect width="400" height="300" fill="#111827" />

        {/* Force arrows */}
        <g>
          {/* Top arrow (pulling up) */}
          <line x1="200" y1="30" x2="200" y2={50 - stretch / 2} stroke="#ef4444" strokeWidth="3" />
          <polygon points="195,35 200,20 205,35" fill="#ef4444" />

          {/* Bottom arrow (pulling down) */}
          <line x1="200" y1="270" x2="200" y2={250 + stretch / 2} stroke="#ef4444" strokeWidth="3" />
          <polygon points="195,265 200,280 205,265" fill="#ef4444" />
        </g>

        {/* Material specimen */}
        <g transform={`translate(${200 - newWidth / 2}, ${150 - newHeight / 2})`}>
          <rect
            width={newWidth}
            height={newHeight}
            fill={materialColors[material]}
            stroke="#9ca3af"
            strokeWidth="2"
            rx="3"
          />

          {/* Grid lines to show deformation */}
          {[...Array(5)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(i + 1) * newHeight / 6}
              x2={newWidth}
              y2={(i + 1) * newHeight / 6}
              stroke="#1f2937"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
          {[...Array(3)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={(i + 1) * newWidth / 4}
              y1={0}
              x2={(i + 1) * newWidth / 4}
              y2={newHeight}
              stroke="#1f2937"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Dimension labels */}
        <g transform="translate(320, 100)">
          <text x="0" y="0" className="fill-gray-400 text-xs">Original:</text>
          <text x="0" y="18" className="fill-gray-300 text-xs">{baseWidth}×{baseHeight}</text>
          <text x="0" y="45" className="fill-gray-400 text-xs">Current:</text>
          <text x="0" y="63" className="fill-blue-300 text-xs">{newWidth.toFixed(1)}×{newHeight.toFixed(1)}</text>
          <text x="0" y="90" className="fill-gray-400 text-xs">ν = {nu}</text>
          <text x="0" y="108" className="fill-yellow-300 text-xs">
            Lateral: {(lateralContraction * 100).toFixed(1)}%
          </text>
        </g>

        {/* Lateral contraction arrows */}
        {stretch > 5 && nu > 0 && (
          <g>
            {/* Left side */}
            <line
              x1={200 - newWidth / 2 - 25}
              y1={150}
              x2={200 - newWidth / 2 - 5}
              y2={150}
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <polygon
              points={`${200 - newWidth / 2 - 10},145 ${200 - newWidth / 2 - 5},150 ${200 - newWidth / 2 - 10},155`}
              fill="#3b82f6"
            />

            {/* Right side */}
            <line
              x1={200 + newWidth / 2 + 25}
              y1={150}
              x2={200 + newWidth / 2 + 5}
              y2={150}
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <polygon
              points={`${200 + newWidth / 2 + 10},145 ${200 + newWidth / 2 + 5},150 ${200 + newWidth / 2 + 10},155`}
              fill="#3b82f6"
            />
          </g>
        )}

        {/* Material label */}
        <text x="200" y="290" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {material.charAt(0).toUpperCase() + material.slice(1)} (ν = {nu})
        </text>
      </svg>
    );
  };

  const renderAuxeticScene = () => {
    const axialStretch = auxeticStretch / 100;
    const auxeticNu = -0.5; // Negative Poisson's ratio
    const lateralExpansion = -auxeticNu * axialStretch;

    const baseWidth = 80;
    const baseHeight = 100;
    const newWidth = baseWidth * (1 + lateralExpansion);
    const newHeight = baseHeight * (1 + axialStretch);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Side-by-side comparison */}

        {/* Normal material */}
        <g transform="translate(100, 60)">
          <text x="40" y="-15" textAnchor="middle" className="fill-gray-400 text-xs">Normal (ν = 0.3)</text>

          {/* Force arrows */}
          <line x1="40" y1="-5" x2="40" y2="10" stroke="#ef4444" strokeWidth="2" />
          <line x1="40" y1={baseHeight * (1 + axialStretch) + 25} x2="40" y2={baseHeight * (1 + axialStretch) + 10} stroke="#ef4444" strokeWidth="2" />

          <rect
            x={40 - (baseWidth * (1 - 0.3 * axialStretch)) / 2}
            y={10}
            width={baseWidth * (1 - 0.3 * axialStretch)}
            height={baseHeight * (1 + axialStretch)}
            fill="#6b7280"
            stroke="#9ca3af"
            strokeWidth="2"
            rx="3"
          />

          <text x="40" y={baseHeight * (1 + axialStretch) + 45} textAnchor="middle" className="fill-gray-500 text-xs">
            Gets thinner ↔
          </text>
        </g>

        {/* Auxetic material */}
        <g transform="translate(260, 60)">
          <text x="40" y="-15" textAnchor="middle" className="fill-purple-400 text-xs">Auxetic (ν = -0.5)</text>

          {/* Force arrows */}
          <line x1="40" y1="-5" x2="40" y2="10" stroke="#ef4444" strokeWidth="2" />
          <line x1="40" y1={newHeight + 25} x2="40" y2={newHeight + 10} stroke="#ef4444" strokeWidth="2" />

          {/* Re-entrant honeycomb pattern to show auxetic structure */}
          <g>
            <rect
              x={40 - newWidth / 2}
              y={10}
              width={newWidth}
              height={newHeight}
              fill="#7c3aed"
              stroke="#a78bfa"
              strokeWidth="2"
              rx="3"
            />

            {/* Honeycomb pattern inside */}
            {auxeticStretch > 10 && (
              <g opacity="0.5">
                {[...Array(3)].map((_, row) => (
                  [...Array(2)].map((_, col) => {
                    const cellX = 40 - newWidth / 2 + 10 + col * (newWidth - 20) / 2;
                    const cellY = 15 + row * (newHeight - 10) / 3;
                    const expand = auxeticStretch / 100;
                    return (
                      <path
                        key={`${row}-${col}`}
                        d={`M ${cellX} ${cellY + 5 - expand * 10}
                            L ${cellX + 10 + expand * 5} ${cellY}
                            L ${cellX + 10 + expand * 5} ${cellY + 15 + expand * 10}
                            L ${cellX} ${cellY + 20 + expand * 10}
                            L ${cellX - 10 - expand * 5} ${cellY + 15 + expand * 10}
                            L ${cellX - 10 - expand * 5} ${cellY}
                            Z`}
                        fill="none"
                        stroke="#c4b5fd"
                        strokeWidth="1"
                      />
                    );
                  })
                ))}
              </g>
            )}
          </g>

          <text x="40" y={newHeight + 45} textAnchor="middle" className="fill-purple-400 text-xs">
            Gets WIDER! ↔
          </text>
        </g>

        {/* Explanation */}
        <text x="200" y="260" textAnchor="middle" className="fill-gray-400 text-sm">
          Auxetic structures expand laterally when stretched!
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🔗↔️</div>
      <h2 className="text-2xl font-bold text-white">The Rubber Band Mystery</h2>
      <p className="text-gray-300 text-lg max-w-lg mx-auto">
        Stretch a rubber band and watch closely - it gets <span className="text-blue-400 font-semibold">longer</span>
        but also gets <span className="text-pink-400 font-semibold">thinner</span>!
        All materials do this (to varying degrees). Why?
      </p>
      <div className="bg-gradient-to-r from-indigo-900/50 to-blue-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-indigo-300 font-medium">
          Why do materials get thinner when you stretch them? 🤔
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
      >
        Investigate! →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You stretch a rubber band to twice its length. What happens to its width?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'thinner', text: 'It gets thinner - volume is conserved so it must contract sideways', icon: '↔️' },
          { id: 'same', text: 'Stays the same - stretching only affects length', icon: '=' },
          { id: 'wider', text: 'It gets wider - stretching pulls atoms apart', icon: '↕️' },
          { id: 'depends', text: 'It depends on the color of the rubber band', icon: '🎨' }
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
                ? 'border-indigo-500 bg-indigo-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Poisson&apos;s Ratio</h2>

      {renderStretchScene()}

      <div className="max-w-lg mx-auto space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Material:</label>
          <div className="flex gap-2 mt-1">
            {[
              { id: 'steel', label: 'Steel (ν=0.3)', color: 'bg-gray-600' },
              { id: 'rubber', label: 'Rubber (ν≈0.5)', color: 'bg-pink-600' },
              { id: 'cork', label: 'Cork (ν≈0)', color: 'bg-amber-600' }
            ].map((mat) => (
              <button
                key={mat.id}
                onMouseDown={() => {
                  playSound('click');
                  setMaterial(mat.id as typeof material);
                }}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  material === mat.id
                    ? `${mat.color} text-white`
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {mat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm">Axial Stretch: {stretch}%</label>
          <input
            type="range"
            min="0"
            max="50"
            value={stretch}
            onChange={(e) => setStretch(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-indigo-300 text-sm text-center">
          <strong>Poisson&apos;s ratio (ν)</strong> = lateral strain / axial strain.
          Rubber (ν≈0.5) is nearly incompressible, so it thins a lot.
          Cork (ν≈0) barely changes width!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Understanding Poisson&apos;s Ratio</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">ν</div>
            <div>
              <h3 className="text-white font-semibold">Definition</h3>
              <p className="text-gray-400 text-sm">ν = -(lateral strain)/(axial strain)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">0.5</div>
            <div>
              <h3 className="text-white font-semibold">Incompressible (rubber)</h3>
              <p className="text-gray-400 text-sm">Volume conserved → maximum lateral contraction</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">0</div>
            <div>
              <h3 className="text-white font-semibold">Cork</h3>
              <p className="text-gray-400 text-sm">Cellular structure collapses without lateral expansion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-indigo-300 font-semibold">Typical Values</p>
        <p className="text-gray-400 text-sm mt-1">
          Most metals: 0.25-0.35 | Rubber: ~0.5 | Cork: ~0 | Concrete: 0.1-0.2
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-indigo-400 font-semibold">{prediction === 'thinner' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
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
        What if a material had a <span className="text-purple-400 font-semibold">NEGATIVE</span> Poisson&apos;s ratio?
        It would get <em>wider</em> when stretched! Do such materials exist?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'yes', text: 'Yes! "Auxetic" materials with special structures expand when pulled', icon: '✓' },
          { id: 'no', text: 'No, negative ν violates physics - all materials must contract', icon: '✗' },
          { id: 'theory', text: 'Only in theory - impossible to manufacture', icon: '📐' },
          { id: 'liquid', text: 'Only liquids can have negative Poisson\'s ratio', icon: '💧' }
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
                ? 'border-purple-500 bg-purple-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Auxetic Materials</h2>

      {renderAuxeticScene()}

      <div className="max-w-lg mx-auto">
        <label className="text-gray-400 text-sm">Stretch Amount: {auxeticStretch}%</label>
        <input
          type="range"
          min="0"
          max="50"
          value={auxeticStretch}
          onChange={(e) => setAuxeticStretch(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-purple-300 text-sm text-center">
          <strong>Auxetic materials</strong> have re-entrant (inward-pointing) structures.
          When pulled, the structure unfolds and expands outward! Used in body armor,
          medical devices, and athletic shoes.
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Materials That Defy Intuition</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Auxetic materials are <span className="text-purple-400 font-semibold">real and useful!</span>
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-purple-400 font-semibold">Re-entrant Structures</div>
            <div className="text-gray-500">Honeycomb with inward-pointing cells</div>
          </div>
          <div className="bg-pink-900/30 rounded-lg p-3">
            <div className="text-pink-400 font-semibold">Applications</div>
            <div className="text-gray-500">Body armor (spreads impact), medical stents, shoe soles</div>
          </div>
          <div className="bg-indigo-900/30 rounded-lg p-3">
            <div className="text-indigo-400 font-semibold">Natural Examples</div>
            <div className="text-gray-500">Some cat skin and cancellous bone show auxetic behavior!</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-purple-400 font-semibold">{twistPrediction === 'yes' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
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
                ? 'border-indigo-500 bg-indigo-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
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
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
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
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-indigo-500 transition-all text-left text-gray-200"
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
      <h2 className="text-2xl font-bold text-white">Poisson&apos;s Ratio Master!</h2>
      <div className="bg-gradient-to-r from-indigo-900/50 to-blue-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-indigo-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Poisson&apos;s ratio = lateral strain / axial strain</li>
          <li>✓ Most materials: 0 &lt; ν &lt; 0.5</li>
          <li>✓ Rubber ≈ 0.5 (incompressible), Cork ≈ 0</li>
          <li>✓ Auxetic materials have ν &lt; 0 (expand when stretched!)</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Now you know why rubber bands get skinny when stretched! 🔗
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        {renderPhase()}
      </div>
    </div>
  );
}
