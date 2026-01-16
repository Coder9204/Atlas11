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

interface FractureMechanicsRendererProps {
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
    question: 'Why do airplane windows have rounded corners?',
    options: [
      'Rounded corners look more modern',
      'Sharp corners create stress concentration that can cause cracks',
      'Rounded corners are easier to manufacture',
      'It helps with air pressure equalization'
    ],
    correct: 1
  },
  {
    question: 'What is stress concentration factor (Kt)?',
    options: [
      'The total stress on a material',
      'The ratio of maximum local stress to average stress',
      'The temperature at which stress increases',
      'The speed of crack propagation'
    ],
    correct: 1
  },
  {
    question: 'How can you stop a crack from propagating?',
    options: [
      'Apply more force to close it',
      'Heat the material',
      'Drill a hole at the crack tip to reduce stress concentration',
      'Cover it with tape'
    ],
    correct: 2
  },
  {
    question: 'Which shape has the HIGHEST stress concentration?',
    options: [
      'Circular hole',
      'Ellipse with long axis perpendicular to stress',
      'Sharp V-notch',
      'Rounded notch'
    ],
    correct: 2
  }
];

const TRANSFER_APPS = [
  {
    title: 'Aircraft Design',
    description: 'De Havilland Comet crashes led to rounded windows - stress at corners caused fuselage failures.',
    icon: '✈️'
  },
  {
    title: 'Crack-Stop Holes',
    description: 'Drilling a hole at a crack tip reduces Kt, stopping propagation. Used in ship repair!',
    icon: '🕳️'
  },
  {
    title: 'Fillet Radii',
    description: 'Engineers add rounded transitions (fillets) at corners to reduce stress concentration.',
    icon: '⚙️'
  },
  {
    title: 'Perforation Lines',
    description: 'Toilet paper tears easily along perforations - intentional stress concentrators!',
    icon: '🧻'
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
export default function FractureMechanicsRenderer({ onEvent, savedState }: FractureMechanicsRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [notchType, setNotchType] = useState<'none' | 'round' | 'vsharp' | 'crack'>('none');
  const [appliedStress, setAppliedStress] = useState(0);
  const [isFractured, setIsFractured] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - crack stop hole
  const [hasCrackStopHole, setHasCrackStopHole] = useState(false);
  const [crackLength, setCrackLength] = useState(20);
  const [twistStress, setTwistStress] = useState(0);

  const navigationLockRef = useRef(false);

  // Stress concentration factors
  const getStressConcentration = (type: string): number => {
    switch (type) {
      case 'none': return 1;
      case 'round': return 2; // Circular hole ≈ 2-3
      case 'vsharp': return 5; // Sharp V-notch can be 5+
      case 'crack': return 10; // Crack tip approaches infinity (limited here)
      default: return 1;
    }
  };

  const getFractureStress = (type: string): number => {
    // Lower fracture threshold for higher stress concentration
    const kt = getStressConcentration(type);
    return 100 / kt;
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

  // Check for fracture
  useEffect(() => {
    const fractureThreshold = getFractureStress(notchType);
    if (appliedStress > fractureThreshold && !isFractured) {
      setIsFractured(true);
      playSound('failure');
    }
  }, [appliedStress, notchType, isFractured]);

  // Twist - crack propagation
  useEffect(() => {
    if (phase !== 'twist_play') return;

    const effectiveKt = hasCrackStopHole ? 2 : 8;
    const criticalStress = 100 / effectiveKt;

    if (twistStress > criticalStress && !hasCrackStopHole) {
      const interval = setInterval(() => {
        setCrackLength(l => {
          if (l >= 150) return 150;
          return l + 5;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase, twistStress, hasCrackStopHole]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setNotchType('none');
      setAppliedStress(0);
      setIsFractured(false);
    }
    if (phase === 'twist_play') {
      setHasCrackStopHole(false);
      setCrackLength(20);
      setTwistStress(0);
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

  const renderStressScene = () => {
    const kt = getStressConcentration(notchType);
    const localStress = appliedStress * kt;
    const stretch = appliedStress / 10;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Stress arrows (top and bottom) */}
        <g>
          {/* Top arrows (pulling up) */}
          {[...Array(5)].map((_, i) => (
            <g key={`top-${i}`} transform={`translate(${80 + i * 60}, 20)`}>
              <line x1="0" y1={30 + stretch} x2="0" y2="10" stroke="#ef4444" strokeWidth="3" />
              <polygon points="-5,15 5,15 0,5" fill="#ef4444" />
            </g>
          ))}
          {/* Bottom arrows (pulling down) */}
          {[...Array(5)].map((_, i) => (
            <g key={`bot-${i}`} transform={`translate(${80 + i * 60}, 260)`}>
              <line x1="0" y1={-30 - stretch} x2="0" y2="-10" stroke="#ef4444" strokeWidth="3" />
              <polygon points="-5,-15 5,-15 0,-5" fill="#ef4444" />
            </g>
          ))}
        </g>

        {/* Material specimen */}
        <g transform="translate(100, 50)">
          {/* Main body */}
          <rect
            x="0"
            y={-stretch}
            width="200"
            height={160 + stretch * 2}
            fill={isFractured ? '#7f1d1d' : '#4b5563'}
            stroke={isFractured ? '#ef4444' : '#6b7280'}
            strokeWidth="2"
          />

          {/* Notch/defect */}
          {notchType === 'round' && (
            <circle cx="100" cy={80} r="15" fill="#111827" />
          )}
          {notchType === 'vsharp' && (
            <polygon points="100,65 85,80 100,95 115,80" fill="#111827" />
          )}
          {notchType === 'crack' && (
            <line x1="50" y1="80" x2="100" y2="80" stroke="#111827" strokeWidth="3" />
          )}

          {/* Stress field visualization */}
          {appliedStress > 0 && notchType !== 'none' && !isFractured && (
            <g>
              {/* Stress concentration lines */}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const baseRadius = notchType === 'crack' ? 10 : 20;
                const intensityRadius = baseRadius + (localStress / 10) * Math.sin(animPhase + i);
                return (
                  <circle
                    key={i}
                    cx={notchType === 'crack' ? 100 : 100}
                    cy={80}
                    r={intensityRadius}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1"
                    opacity={0.3 + (i % 2) * 0.2}
                  />
                );
              })}
            </g>
          )}

          {/* Fracture visualization */}
          {isFractured && (
            <g>
              <line x1="0" y1="80" x2="200" y2="80" stroke="#ef4444" strokeWidth="4" strokeDasharray="10,5" />
              <text x="100" y="40" textAnchor="middle" className="fill-red-400 text-lg font-bold">
                FRACTURED!
              </text>
            </g>
          )}
        </g>

        {/* Stress info panel */}
        <g transform="translate(320, 80)">
          <rect x="0" y="0" width="70" height="100" fill="#1f2937" rx="5" />
          <text x="35" y="20" textAnchor="middle" className="fill-gray-400 text-xs">Applied</text>
          <text x="35" y="38" textAnchor="middle" className="fill-white text-sm font-bold">{appliedStress.toFixed(0)} MPa</text>
          <text x="35" y="55" textAnchor="middle" className="fill-gray-400 text-xs">Kt</text>
          <text x="35" y="73" textAnchor="middle" className="fill-yellow-400 text-sm font-bold">×{kt}</text>
          <text x="35" y="90" textAnchor="middle" className="fill-red-400 text-xs">Local: {localStress.toFixed(0)}</text>
        </g>

        {/* Notch type label */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-400 text-sm">
          {notchType === 'none' ? 'Solid material' :
            notchType === 'round' ? 'Circular hole (Kt ≈ 2-3)' :
              notchType === 'vsharp' ? 'Sharp V-notch (Kt ≈ 5+)' :
                'Crack (Kt → very high!)'}
        </text>
      </svg>
    );
  };

  const renderCrackStopScene = () => {
    const crackTipX = 100 + crackLength;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#111827" />

        {/* Metal plate */}
        <rect x="50" y="50" width="300" height="150" fill="#4b5563" stroke="#6b7280" strokeWidth="2" />

        {/* Stress arrows */}
        {twistStress > 0 && (
          <g>
            {[...Array(3)].map((_, i) => (
              <g key={i}>
                <line x1={100 + i * 100} y1="30" x2={100 + i * 100} y2="50" stroke="#ef4444" strokeWidth="2" />
                <line x1={100 + i * 100} y1="220" x2={100 + i * 100} y2="200" stroke="#ef4444" strokeWidth="2" />
              </g>
            ))}
          </g>
        )}

        {/* Crack */}
        <line
          x1="50"
          y1="125"
          x2={crackTipX}
          y2="125"
          stroke="#1f2937"
          strokeWidth="4"
        />

        {/* Crack tip stress field */}
        {twistStress > 0 && !hasCrackStopHole && crackLength < 150 && (
          <g className="animate-pulse">
            {[1, 2, 3].map(r => (
              <circle
                key={r}
                cx={crackTipX}
                cy={125}
                r={r * 8}
                fill="none"
                stroke="#ef4444"
                strokeWidth="1"
                opacity={0.5 - r * 0.1}
              />
            ))}
          </g>
        )}

        {/* Crack-stop hole */}
        {hasCrackStopHole && (
          <g>
            <circle cx={crackTipX + 15} cy={125} r={12} fill="#111827" stroke="#22c55e" strokeWidth="2" />
            <text x={crackTipX + 15} y={105} textAnchor="middle" className="fill-green-400 text-xs">
              Stop hole
            </text>
          </g>
        )}

        {/* Propagation indicator */}
        {crackLength >= 150 && (
          <text x="200" y="30" textAnchor="middle" className="fill-red-400 text-sm font-bold">
            Complete Fracture!
          </text>
        )}

        {hasCrackStopHole && twistStress > 20 && (
          <text x="200" y="30" textAnchor="middle" className="fill-green-400 text-sm font-bold">
            Crack Arrested! ✓
          </text>
        )}

        {/* Info */}
        <g transform="translate(280, 60)">
          <rect x="0" y="0" width="60" height="60" fill="#1f2937" rx="5" />
          <text x="30" y="18" textAnchor="middle" className="fill-gray-400 text-xs">Kt at tip</text>
          <text x="30" y="38" textAnchor="middle" className={`text-lg font-bold ${hasCrackStopHole ? 'fill-green-400' : 'fill-red-400'}`}>
            {hasCrackStopHole ? '~2' : '~8+'}
          </text>
        </g>

        {/* Explanation */}
        <text x="200" y="235" textAnchor="middle" className="fill-gray-400 text-xs">
          {hasCrackStopHole
            ? 'Hole converts sharp crack tip to rounded edge → lower Kt'
            : 'Sharp crack tip has extreme stress concentration'}
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">✈️💥</div>
      <h2 className="text-2xl font-bold text-white">Why Airplane Windows Have Rounded Corners</h2>
      <p className="text-gray-300 text-lg max-w-lg mx-auto">
        In the 1950s, three de Havilland Comet jets broke apart mid-flight. The cause?
        <span className="text-red-400 font-semibold"> Square windows</span>. The sharp corners created
        stress concentrations that grew into catastrophic cracks.
      </p>
      <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-red-300 font-medium">
          Why are sharp corners so dangerous in materials? 🤔
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
      >
        Investigate! →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You have two identical metal plates. One has a circular hole, one has a sharp V-notch.
        Which breaks first under the same load?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'vnotch', text: 'Sharp V-notch - stress concentrates more at sharp corners', icon: '📐' },
          { id: 'circle', text: 'Circular hole - it removes more material', icon: '⭕' },
          { id: 'same', text: 'Same - both weaken the plate equally', icon: '=' },
          { id: 'neither', text: 'Neither - small defects don\'t matter', icon: '✓' }
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
                ? 'border-red-500 bg-red-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Stress Concentration</h2>

      {renderStressScene()}

      <div className="max-w-lg mx-auto space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Defect Type:</label>
          <div className="flex gap-2 mt-1">
            {[
              { id: 'none', label: 'None' },
              { id: 'round', label: 'Round Hole' },
              { id: 'vsharp', label: 'V-Notch' },
              { id: 'crack', label: 'Crack' }
            ].map((opt) => (
              <button
                key={opt.id}
                onMouseDown={() => {
                  playSound('click');
                  setNotchType(opt.id as typeof notchType);
                  setAppliedStress(0);
                  setIsFractured(false);
                }}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  notchType === opt.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm">Applied Stress: {appliedStress.toFixed(0)} MPa</label>
          <input
            type="range"
            min="0"
            max="100"
            value={appliedStress}
            onChange={(e) => setAppliedStress(Number(e.target.value))}
            disabled={isFractured}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>Fracture: {getFractureStress(notchType).toFixed(0)} MPa</span>
            <span>100</span>
          </div>
        </div>

        {isFractured && (
          <button
            onMouseDown={() => {
              playSound('click');
              setIsFractured(false);
              setAppliedStress(0);
            }}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            🔄 Reset
          </button>
        )}
      </div>

      <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-red-300 text-sm text-center">
          <strong>Stress concentration factor Kt:</strong> The ratio of maximum local stress to average stress.
          Sharper features → higher Kt → earlier fracture!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Why Sharp Corners Fail</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Stress Flow</h3>
              <p className="text-gray-400 text-sm">Stress &quot;flows&quot; through material like water - it must go around obstacles</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Concentration at Corners</h3>
              <p className="text-gray-400 text-sm">Sharp corners force stress into a tiny area → local stress skyrockets</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Crack Initiation</h3>
              <p className="text-gray-400 text-sm">When local stress exceeds material strength, cracks begin and propagate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-red-300 font-semibold">Engineering Rule</p>
        <p className="text-gray-400 text-sm mt-1">
          Always use fillets (rounded transitions) at corners.
          A fillet radius of just 1-2mm can reduce Kt by 50%!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-red-400 font-semibold">{prediction === 'vnotch' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
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
        A ship hull has developed a crack. Surprisingly, the repair involves
        <span className="text-green-400 font-semibold"> drilling a HOLE</span> at the crack tip!
        Why would making the defect bigger help?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'blunt', text: 'Hole blunts the sharp crack tip → reduces stress concentration', icon: '⭕' },
          { id: 'drain', text: 'Hole lets water drain out of the crack', icon: '💧' },
          { id: 'weld', text: 'Makes it easier to weld the crack closed', icon: '🔥' },
          { id: 'bad', text: 'It\'s actually a bad idea and will make things worse', icon: '❌' }
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
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Crack-Stop Hole</h2>

      {renderCrackStopScene()}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onMouseDown={() => {
            playSound('click');
            setHasCrackStopHole(!hasCrackStopHole);
            setCrackLength(20);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            hasCrackStopHole
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {hasCrackStopHole ? '✓ Stop Hole Added' : '+ Add Stop Hole'}
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setCrackLength(20);
            setTwistStress(0);
          }}
          className="px-4 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          🔄 Reset
        </button>
      </div>

      <div className="max-w-lg mx-auto">
        <label className="text-gray-400 text-sm">Applied Stress: {twistStress.toFixed(0)} MPa</label>
        <input
          type="range"
          min="0"
          max="50"
          value={twistStress}
          onChange={(e) => setTwistStress(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-orange-300 text-sm text-center">
          <strong>The crack-stop hole</strong> converts the infinitely sharp crack tip into a rounded edge.
          This dramatically reduces Kt and arrests crack growth!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Fighting Cracks with Holes</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Counter-intuitive but effective!
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-red-900/30 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Sharp Crack Tip</div>
            <div className="text-gray-500">Kt approaches infinity → crack grows under any stress</div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold">After Stop Hole</div>
            <div className="text-gray-500">Kt drops to ~2-3 (like circular hole) → crack arrested!</div>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Used In Practice</div>
            <div className="text-gray-500">Ships, aircraft, bridges - drill and fill for permanent repair</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-orange-400 font-semibold">{twistPrediction === 'blunt' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all"
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
                ? 'border-red-500 bg-red-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
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
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
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
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-red-500 transition-all text-left text-gray-200"
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
      <h2 className="text-2xl font-bold text-white">Fracture Mechanics Master!</h2>
      <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-red-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Stress concentration at defects and sharp corners</li>
          <li>✓ Why airplane windows need rounded corners</li>
          <li>✓ Kt = stress concentration factor</li>
          <li>✓ Crack-stop holes reduce Kt and arrest cracks</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        You now know why engineers obsess over corner radii! 📐✈️
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        {renderPhase()}
      </div>
    </div>
  );
}
