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

interface MagneticMappingRendererProps {
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

interface Magnet {
  x: number;
  y: number;
  angle: number; // 0 = N pointing right
  strength: number;
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
    question: 'Which way do magnetic field lines point?',
    options: [
      'From south to north, inside the magnet',
      'From north to south, outside the magnet',
      'Randomly in all directions',
      'Straight up and down only'
    ],
    correct: 1
  },
  {
    question: 'What does it mean when field lines are close together?',
    options: [
      'The field is weak',
      'The magnet is broken',
      'The field is strong',
      'The temperature is high'
    ],
    correct: 2
  },
  {
    question: 'Why can\'t magnetic field lines ever cross?',
    options: [
      'They repel each other',
      'A point can only have one field direction',
      'The magnet would break',
      'It would create infinite energy'
    ],
    correct: 1
  },
  {
    question: 'How does a compass work?',
    options: [
      'It measures electric current',
      'Its magnetic needle aligns with field lines',
      'It detects gravity',
      'It uses GPS satellites'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Compass Navigation',
    description: 'Compass needles are tiny magnets that align with Earth\'s field, pointing toward magnetic north.',
    icon: '🧭'
  },
  {
    title: 'MRI Machines',
    description: 'Powerful magnets create precise fields. Field mapping ensures accurate medical imaging.',
    icon: '🏥'
  },
  {
    title: 'Particle Accelerators',
    description: 'Mapped magnetic fields steer particles at near-light speeds in exact circular paths.',
    icon: '⚛️'
  },
  {
    title: 'Magnetic Shielding',
    description: 'Understanding field patterns helps design shields for sensitive electronics.',
    icon: '🛡️'
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

// Calculate magnetic field at a point from multiple dipoles
function calculateField(px: number, py: number, magnets: Magnet[]): { bx: number; by: number } {
  let bx = 0;
  let by = 0;

  for (const m of magnets) {
    const dx = px - m.x;
    const dy = py - m.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < 10) continue; // Avoid singularity

    // Simplified dipole field
    const r3 = r * r * r;
    const mx = Math.cos(m.angle * Math.PI / 180) * m.strength;
    const my = Math.sin(m.angle * Math.PI / 180) * m.strength;

    // Dipole field formula (simplified)
    const dot = mx * dx + my * dy;
    bx += (3 * dx * dot / (r3 * r * r) - mx / r3) * 1000;
    by += (3 * dy * dot / (r3 * r * r) - my / r3) * 1000;
  }

  return { bx, by };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MagneticMappingRenderer({ onEvent, savedState }: MagneticMappingRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [magnets, setMagnets] = useState<Magnet[]>([
    { x: 200, y: 140, angle: 0, strength: 100 }
  ]);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showCompassGrid, setShowCompassGrid] = useState(false);
  const [selectedMagnet, setSelectedMagnet] = useState<number | null>(null);

  // Twist state - Earth's magnetic field
  const [showEarthField, setShowEarthField] = useState(false);

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

  const addMagnet = () => {
    if (magnets.length >= 3) return;
    setMagnets([...magnets, {
      x: 100 + Math.random() * 200,
      y: 80 + Math.random() * 120,
      angle: Math.random() * 360,
      strength: 80
    }]);
  };

  const rotateMagnet = (index: number, delta: number) => {
    setMagnets(prev => prev.map((m, i) =>
      i === index ? { ...m, angle: (m.angle + delta + 360) % 360 } : m
    ));
  };

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setMagnets([{ x: 200, y: 140, angle: 0, strength: 100 }]);
      setShowFieldLines(true);
      setShowCompassGrid(false);
    }
    if (phase === 'twist_play') {
      setShowEarthField(false);
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
              ? 'bg-gradient-to-r from-red-500 to-blue-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderMagneticField = (mags: Magnet[], fieldLines: boolean, compassGrid: boolean) => {
    // Generate field line starting points
    const fieldLineStarts: { x: number; y: number; reverse: boolean }[] = [];
    if (fieldLines) {
      for (const m of mags) {
        const nAngle = m.angle * Math.PI / 180;
        const nPoleX = m.x + Math.cos(nAngle) * 25;
        const nPoleY = m.y + Math.sin(nAngle) * 25;
        const sPoleX = m.x - Math.cos(nAngle) * 25;
        const sPoleY = m.y - Math.sin(nAngle) * 25;

        // Lines from north pole
        for (let i = 0; i < 8; i++) {
          const a = nAngle + (i - 3.5) * 0.3;
          fieldLineStarts.push({
            x: nPoleX + Math.cos(a) * 5,
            y: nPoleY + Math.sin(a) * 5,
            reverse: false
          });
        }
      }
    }

    // Trace field lines
    const tracedLines: string[] = [];
    for (const start of fieldLineStarts) {
      let x = start.x;
      let y = start.y;
      let path = `M ${x} ${y}`;

      for (let step = 0; step < 100; step++) {
        const { bx, by } = calculateField(x, y, mags);
        const mag = Math.sqrt(bx * bx + by * by);
        if (mag < 0.01) break;

        const stepSize = 5;
        const dir = start.reverse ? -1 : 1;
        x += (bx / mag) * stepSize * dir;
        y += (by / mag) * stepSize * dir;

        if (x < 0 || x > 400 || y < 0 || y > 280) break;

        path += ` L ${x} ${y}`;
      }

      tracedLines.push(path);
    }

    // Compass grid positions
    const compassPositions: { x: number; y: number }[] = [];
    if (compassGrid) {
      for (let x = 30; x < 400; x += 40) {
        for (let y = 30; y < 280; y += 40) {
          compassPositions.push({ x, y });
        }
      }
    }

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Field lines */}
        {fieldLines && tracedLines.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            opacity="0.6"
          />
        ))}

        {/* Compass grid */}
        {compassGrid && compassPositions.map((pos, i) => {
          const { bx, by } = calculateField(pos.x, pos.y, mags);
          const angle = Math.atan2(by, bx) * 180 / Math.PI;
          const mag = Math.min(Math.sqrt(bx * bx + by * by), 10);

          return (
            <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}>
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#ef4444" strokeWidth="2" />
              <polygon points="8,0 4,-3 4,3" fill="#ef4444" />
              <circle cx="0" cy="0" r="2" fill="#fbbf24" />
            </g>
          );
        })}

        {/* Magnets */}
        {mags.map((m, i) => (
          <g
            key={i}
            transform={`translate(${m.x}, ${m.y}) rotate(${m.angle})`}
            style={{ cursor: 'pointer' }}
            onMouseDown={() => setSelectedMagnet(i)}
          >
            {/* Magnet body */}
            <rect x="-30" y="-12" width="30" height="24" rx="4" fill="#ef4444" />
            <rect x="0" y="-12" width="30" height="24" rx="4" fill="#3b82f6" />
            <text x="-15" y="5" textAnchor="middle" className="fill-white text-xs font-bold">N</text>
            <text x="15" y="5" textAnchor="middle" className="fill-white text-xs font-bold">S</text>

            {/* Selection indicator */}
            {selectedMagnet === i && (
              <circle r="35" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,4" />
            )}
          </g>
        ))}

        {/* Legend */}
        <rect x="10" y="10" width="100" height="40" rx="4" fill="#1f2937" opacity="0.9" />
        <text x="60" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Magnets: {mags.length}</text>
        <text x="60" y="43" textAnchor="middle" className="fill-gray-500 text-xs">Click to select</text>
      </svg>
    );
  };

  const renderEarthField = () => (
    <svg viewBox="0 0 400 280" className="w-full h-56">
      <rect width="400" height="280" fill="#0f172a" />

      {/* Stars */}
      {[...Array(30)].map((_, i) => (
        <circle
          key={i}
          cx={Math.random() * 400}
          cy={Math.random() * 280}
          r={Math.random() * 1.5}
          fill="white"
          opacity={0.5 + Math.random() * 0.5}
        />
      ))}

      {/* Earth */}
      <circle cx="200" cy="140" r="80" fill="#1e40af" />
      <ellipse cx="200" cy="140" rx="80" ry="30" fill="#22c55e" fillOpacity="0.5" />
      <circle cx="180" cy="120" r="15" fill="#22c55e" fillOpacity="0.6" />
      <circle cx="220" cy="150" r="20" fill="#22c55e" fillOpacity="0.6" />

      {/* Magnetic poles (offset from geographic) */}
      <circle cx="200" cy="70" r="5" fill="#3b82f6" />
      <text x="200" y="55" textAnchor="middle" className="fill-blue-400 text-xs">Magnetic S</text>
      <circle cx="200" cy="210" r="5" fill="#ef4444" />
      <text x="200" y="230" textAnchor="middle" className="fill-red-400 text-xs">Magnetic N</text>

      {/* Field lines */}
      {showEarthField && (
        <g>
          {[-1, 1].map(side => (
            [30, 60, 90, 120, 150].map((offset, i) => (
              <path
                key={`${side}-${i}`}
                d={`M ${200 + side * 5} 70
                   C ${200 + side * offset} 40, ${200 + side * offset} 240, ${200 + side * 5} 210`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.5"
                opacity={0.4 + (5 - i) * 0.1}
              />
            ))
          ))}

          {/* Arrows showing direction */}
          <polygon points="120,140 130,135 130,145" fill="#60a5fa" />
          <polygon points="280,140 270,145 270,135" fill="#60a5fa" />
        </g>
      )}

      {/* Compass at surface */}
      <g transform="translate(120, 140)">
        <circle r="15" fill="#1f2937" stroke="#6b7280" strokeWidth="2" />
        <line x1="0" y1="10" x2="0" y2="-10" stroke="#ef4444" strokeWidth="2" />
        <polygon points="0,-10 -3,-5 3,-5" fill="#ef4444" />
        <text x="0" y="30" textAnchor="middle" className="fill-gray-400 text-xs">🧭</text>
      </g>

      {/* Info box */}
      <rect x="280" y="20" width="110" height="70" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
      <text x="335" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Earth&apos;s Field</text>
      <text x="335" y="58" textAnchor="middle" className="fill-cyan-400 text-xs">~25-65 μT</text>
      <text x="335" y="76" textAnchor="middle" className="fill-gray-500 text-xs">(very weak!)</text>
    </svg>
  );

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">How Can We See Invisible Magnetic Fields?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Magnetic fields are invisible, yet we can map them perfectly!
          Scientists have known their shapes for centuries—long before modern instruments.
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-red-300 font-medium">
            🧲 Iron filings and tiny compasses reveal the hidden architecture of magnetic fields!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how to visualize what you cannot see.
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
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
          If you sprinkle iron filings around a bar magnet, what pattern will they form?
        </p>
        <div className="space-y-3">
          {[
            'Random scattered pattern',
            'Curved lines from N to S pole',
            'A perfect circle around the magnet',
            'Straight parallel lines'
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
                  ? 'bg-gradient-to-r from-red-600 to-blue-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Magnetic Field Mapper</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderMagneticField(magnets, showFieldLines, showCompassGrid)}

        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setShowFieldLines(!showFieldLines);
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              showFieldLines ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            📈 Field Lines
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setShowCompassGrid(!showCompassGrid);
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              showCompassGrid ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            🧭 Compass Grid
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              addMagnet();
            }}
            className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-600 text-gray-300 hover:bg-gray-500"
            disabled={magnets.length >= 3}
          >
            ➕ Add Magnet
          </button>
        </div>

        {selectedMagnet !== null && (
          <div className="flex justify-center gap-4 mt-4">
            <button
              onMouseDown={() => rotateMagnet(selectedMagnet, -30)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              ↺ Rotate
            </button>
            <button
              onMouseDown={() => rotateMagnet(selectedMagnet, 30)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              ↻ Rotate
            </button>
            <button
              onMouseDown={() => {
                setMagnets(prev => prev.filter((_, i) => i !== selectedMagnet));
                setSelectedMagnet(null);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              🗑️ Remove
            </button>
          </div>
        )}

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center text-sm">
            Field lines show direction (N→S outside magnet) and density shows strength.
            Try adding magnets to see how fields interact!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Reading Magnetic Field Maps</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
          <h3 className="text-blue-400 font-bold mb-2">Field Line Rules</h3>
          <ul className="text-gray-300 space-y-1">
            <li>• Lines point from <span className="text-red-400">N</span> to <span className="text-blue-400">S</span> outside the magnet</li>
            <li>• Lines <span className="text-yellow-400">never cross</span> (each point has one direction)</li>
            <li>• Closer lines = <span className="text-green-400">stronger field</span></li>
            <li>• Lines form <span className="text-purple-400">closed loops</span> (continue inside magnet)</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg text-center">
            <div className="text-3xl mb-2">🧲</div>
            <h4 className="text-white font-bold mb-1">Iron Filings</h4>
            <p className="text-gray-400 text-sm">
              Each filing becomes a tiny magnet and aligns with local field
            </p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg text-center">
            <div className="text-3xl mb-2">🧭</div>
            <h4 className="text-white font-bold mb-1">Compass Array</h4>
            <p className="text-gray-400 text-sm">
              Each compass needle points along the field direction
            </p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Key Insight:</strong> Field lines are a visualization tool, not real physical objects.
            But the patterns they reveal are real and predictable!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
        >
          Earth&apos;s Giant Magnet →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Earth Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          Earth has a magnetic field that compasses detect. Which way does a compass needle point?
        </p>
        <div className="space-y-3">
          {[
            'Toward true geographic north',
            'Toward magnetic north (slightly different!)',
            'Toward the sun',
            'Random direction based on location'
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
                  ? 'bg-gradient-to-r from-red-600 to-blue-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
        >
          See Earth&apos;s Field →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Earth&apos;s Magnetic Field</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderEarthField()}

        <div className="flex justify-center mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setShowEarthField(!showEarthField);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              showEarthField
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {showEarthField ? '🌍 Hide Field Lines' : '🌍 Show Field Lines'}
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            Earth acts like a giant bar magnet! But the magnetic poles are
            <span className="text-yellow-400 font-bold"> offset from the geographic poles</span>.
            Magnetic north moves ~40km/year!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
        >
          Understand Earth&apos;s Field →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Earth&apos;s Magnetic Shield</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Geodynamo</h3>
          <p className="text-gray-300">
            Earth&apos;s magnetic field is generated by <span className="text-yellow-400 font-bold">
            convecting molten iron</span> in the outer core. This &quot;geodynamo&quot; creates
            a field that shields us from solar wind!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-cyan-400 font-bold mb-2">Magnetic Declination</h4>
            <p className="text-gray-300 text-sm">
              The angle between magnetic north and true north.
              Varies by location (can be 20°+ in some places!).
            </p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-purple-400 font-bold mb-2">Field Strength</h4>
            <p className="text-gray-300 text-sm">
              25-65 μT (microtesla). About 100× weaker than
              a refrigerator magnet, but enough for compasses!
            </p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Fun Fact:</strong> Earth&apos;s magnetic poles flip every few hundred thousand years!
            We&apos;re currently in a long-running &quot;normal&quot; period, but the field is slowly weakening.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Magnetic Mapping</h2>
      <p className="text-gray-400 text-center">Explore how field visualization helps us</p>

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
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-red-500 hover:to-blue-500 transition-all"
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
            {passed ? 'Excellent understanding of magnetic fields!' : 'Review the concepts and try again.'}
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
                : 'bg-gradient-to-r from-red-600 to-blue-600 text-white'
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
      <h2 className="text-3xl font-bold text-white">Magnetic Mapping Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Field lines from N to S
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Density indicates field strength
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Lines never cross
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Earth&apos;s geodynamo and compass navigation
          </li>
        </ul>
      </div>
      <div className="p-4 bg-gradient-to-r from-red-900/30 to-blue-900/30 rounded-lg border border-purple-600 max-w-md mx-auto">
        <p className="text-purple-300">
          🧲 Key Insight: Field maps make the invisible visible—a powerful tool for understanding nature!
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
          <span className="px-3 py-1 bg-gradient-to-r from-red-900/50 to-blue-900/50 text-purple-300 rounded-full text-sm">
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
