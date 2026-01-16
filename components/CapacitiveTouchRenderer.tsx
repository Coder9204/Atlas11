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

interface CapacitiveTouchRendererProps {
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

interface TouchPoint {
  x: number;
  y: number;
  capacitance: number;
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
    question: 'What does your finger change when touching a capacitive screen?',
    options: [
      'The screen temperature',
      'The local capacitance in the touch grid',
      'The screen brightness',
      'The electrical resistance'
    ],
    correct: 1
  },
  {
    question: 'Why don\'t regular gloves work on touchscreens?',
    options: [
      'They\'re too thick to press hard enough',
      'They block the capacitive coupling with your body',
      'They create static electricity',
      'The screen can\'t sense warmth through them'
    ],
    correct: 1
  },
  {
    question: 'How does the screen know WHERE you touched?',
    options: [
      'A camera watches your finger',
      'Pressure sensors under the glass',
      'Grid of electrodes detects which intersection changed',
      'Sound waves bounce off your finger'
    ],
    correct: 2
  },
  {
    question: 'Why can capacitive screens detect multiple touches?',
    options: [
      'Multiple pressure sensors',
      'Each touch point changes capacitance at a different grid location',
      'The screen has multiple layers',
      'The CPU is very fast'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Smartphones & Tablets',
    description: 'Projected capacitive touch (PCT) enables multi-touch gestures like pinch-to-zoom with incredible precision.',
    icon: '📱'
  },
  {
    title: 'Touch Gloves',
    description: 'Conductive threads in fingertips allow capacitive coupling through the glove material.',
    icon: '🧤'
  },
  {
    title: 'Stylus Pens',
    description: 'Active styluses have conductive tips or electronics that mimic finger capacitance for drawing.',
    icon: '✏️'
  },
  {
    title: 'Car Touchscreens',
    description: 'Infotainment systems use capacitive touch. Some new cars add haptic feedback for "button" feel.',
    icon: '🚗'
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
export default function CapacitiveTouchRenderer({ onEvent, savedState }: CapacitiveTouchRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [isFingerMode, setIsFingerMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Twist state - gloves vs capacitive gloves
  const [touchMode, setTouchMode] = useState<'finger' | 'glove' | 'capacitiveGlove'>('finger');

  const navigationLockRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const handleSvgTouch = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const points: TouchPoint[] = [];

    if ('touches' in e) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = ((touch.clientX - rect.left) / rect.width) * 400;
        const y = ((touch.clientY - rect.top) / rect.height) * 280;
        points.push({
          x,
          y,
          capacitance: isFingerMode || touchMode === 'finger' || touchMode === 'capacitiveGlove' ? 1 : 0
        });
      }
    } else {
      const x = ((e.clientX - rect.left) / rect.width) * 400;
      const y = ((e.clientY - rect.top) / rect.height) * 280;
      points.push({
        x,
        y,
        capacitance: isFingerMode || touchMode === 'finger' || touchMode === 'capacitiveGlove' ? 1 : 0
      });
    }

    setTouchPoints(points);
  };

  // Clear touch points when mouse/touch ends
  const handleTouchEnd = () => {
    setTouchPoints([]);
  };

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setTouchPoints([]);
      setIsFingerMode(true);
      setShowGrid(true);
    }
    if (phase === 'twist_play') {
      setTouchPoints([]);
      setTouchMode('finger');
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
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderTouchScreen = (mode: 'finger' | 'glove' | 'capacitiveGlove' = 'finger', points: TouchPoint[]) => {
    const gridSize = 8;
    const cellWidth = 400 / gridSize;
    const cellHeight = 280 / gridSize;

    return (
      <svg
        ref={svgRef}
        viewBox="0 0 400 280"
        className="w-full h-56 cursor-pointer touch-none"
        onMouseDown={handleSvgTouch}
        onMouseMove={(e) => e.buttons && handleSvgTouch(e)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleSvgTouch}
        onTouchMove={handleSvgTouch}
        onTouchEnd={handleTouchEnd}
      >
        {/* Screen background */}
        <rect width="400" height="280" fill="#1a1a2e" rx="8" />

        {/* Electrode grid */}
        {showGrid && (
          <g>
            {/* Horizontal lines (X electrodes) */}
            {[...Array(gridSize + 1)].map((_, i) => (
              <line
                key={`h${i}`}
                x1="0"
                y1={i * cellHeight}
                x2="400"
                y2={i * cellHeight}
                stroke="#3b82f6"
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
            {/* Vertical lines (Y electrodes) */}
            {[...Array(gridSize + 1)].map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * cellWidth}
                y1="0"
                x2={i * cellWidth}
                y2="280"
                stroke="#22c55e"
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
            {/* Grid intersections */}
            {[...Array(gridSize + 1)].map((_, i) =>
              [...Array(gridSize + 1)].map((_, j) => (
                <circle
                  key={`n${i}-${j}`}
                  cx={i * cellWidth}
                  cy={j * cellHeight}
                  r="3"
                  fill="#4b5563"
                />
              ))
            )}
          </g>
        )}

        {/* Touch effects */}
        {points.map((point, idx) => {
          const gridX = Math.round(point.x / cellWidth);
          const gridY = Math.round(point.y / cellHeight);
          const detected = point.capacitance > 0;

          return (
            <g key={idx}>
              {/* Touch indicator */}
              <circle
                cx={point.x}
                cy={point.y}
                r={detected ? "25" : "20"}
                fill={detected ? "rgba(59, 130, 246, 0.3)" : "rgba(239, 68, 68, 0.3)"}
                stroke={detected ? "#3b82f6" : "#ef4444"}
                strokeWidth="2"
              />

              {/* Capacitance change visualization */}
              {detected && showGrid && (
                <g className="animate-pulse">
                  {/* Highlight affected grid nodes */}
                  {[-1, 0, 1].map(dx =>
                    [-1, 0, 1].map(dy => {
                      const nx = gridX + dx;
                      const ny = gridY + dy;
                      if (nx >= 0 && nx <= gridSize && ny >= 0 && ny <= gridSize) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const intensity = 1 - dist * 0.3;
                        return (
                          <circle
                            key={`effect-${dx}-${dy}`}
                            cx={nx * cellWidth}
                            cy={ny * cellHeight}
                            r="6"
                            fill={`rgba(59, 130, 246, ${intensity * 0.8})`}
                          />
                        );
                      }
                      return null;
                    })
                  )}

                  {/* Electric field lines */}
                  {[...Array(8)].map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const length = 30;
                    return (
                      <line
                        key={`field-${i}`}
                        x1={point.x}
                        y1={point.y}
                        x2={point.x + Math.cos(angle) * length}
                        y2={point.y + Math.sin(angle) * length}
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                        opacity="0.5"
                      />
                    );
                  })}
                </g>
              )}

              {/* Finger/glove icon */}
              <text
                x={point.x}
                y={point.y - 35}
                textAnchor="middle"
                className="text-2xl"
              >
                {mode === 'finger' ? '👆' : mode === 'glove' ? '🧤' : '🧤✨'}
              </text>

              {/* Detection status */}
              <rect
                x={point.x - 35}
                y={point.y + 30}
                width="70"
                height="20"
                rx="4"
                fill={detected ? '#22c55e' : '#ef4444'}
              />
              <text
                x={point.x}
                y={point.y + 44}
                textAnchor="middle"
                className="fill-white text-xs font-bold"
              >
                {detected ? 'DETECTED' : 'NO SIGNAL'}
              </text>
            </g>
          );
        })}

        {/* Instructions when no touch */}
        {points.length === 0 && (
          <text x="200" y="140" textAnchor="middle" className="fill-gray-500 text-sm">
            Touch or click anywhere!
          </text>
        )}

        {/* Coordinate display */}
        {points.length > 0 && points[0].capacitance > 0 && (
          <g>
            <rect x="10" y="10" width="100" height="40" rx="4" fill="#1f2937" opacity="0.9" />
            <text x="60" y="28" textAnchor="middle" className="fill-gray-400 text-xs">
              Position
            </text>
            <text x="60" y="43" textAnchor="middle" className="fill-cyan-400 text-xs font-bold">
              ({Math.round(points[0].x)}, {Math.round(points[0].y)})
            </text>
          </g>
        )}
      </svg>
    );
  };

  const renderCapacitorDiagram = () => (
    <svg viewBox="0 0 300 150" className="w-full h-32">
      <rect width="300" height="150" fill="#111827" />

      {/* Traditional capacitor */}
      <g transform="translate(50, 20)">
        <text x="50" y="0" textAnchor="middle" className="fill-gray-400 text-xs">Traditional Capacitor</text>
        <line x1="20" y1="30" x2="20" y2="90" stroke="#3b82f6" strokeWidth="4" />
        <line x1="80" y1="30" x2="80" y2="90" stroke="#3b82f6" strokeWidth="4" />
        <text x="50" y="70" textAnchor="middle" className="fill-yellow-400 text-xs">↔ Gap</text>
        <rect x="30" y="40" width="40" height="30" fill="#fbbf24" fillOpacity="0.3" stroke="#fbbf24" strokeDasharray="2,2" />
        <text x="50" y="120" textAnchor="middle" className="fill-gray-500 text-xs">2 plates, 1 gap</text>
      </g>

      {/* Finger as capacitor plate */}
      <g transform="translate(180, 20)">
        <text x="50" y="0" textAnchor="middle" className="fill-gray-400 text-xs">Touchscreen + Finger</text>
        <line x1="20" y1="30" x2="20" y2="90" stroke="#3b82f6" strokeWidth="4" />
        <text x="20" y="105" textAnchor="middle" className="fill-blue-400 text-xs">Screen</text>
        {/* Finger acting as second plate */}
        <ellipse cx="80" cy="60" rx="20" ry="30" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" />
        <text x="80" y="105" textAnchor="middle" className="fill-red-400 text-xs">Finger</text>
        {/* Electric field */}
        <path d="M 25 50 Q 50 50 75 50" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" />
        <path d="M 25 70 Q 50 70 75 70" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" />
        <text x="50" y="45" textAnchor="middle" className="fill-green-400 text-xs">E-field</text>
      </g>
    </svg>
  );

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">How Does Your Phone Know Where You Touched?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Your phone screen isn&apos;t pressing any buttons. It&apos;s just <span className="text-cyan-400">smooth glass</span>.
          Yet it knows exactly where your finger is, and can track 10 fingers at once!
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-blue-300 font-medium">
            ⚡ The secret: your body is a conductor, and the screen can sense you electrically!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover the physics that makes modern touchscreens possible.
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
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
          A capacitive touchscreen has a grid of electrodes under the glass.
          What does your finger actually change when you touch the screen?
        </p>
        <div className="space-y-3">
          {[
            'It presses a tiny button at that location',
            'It changes the local electric field/capacitance',
            'It heats the glass and a sensor detects warmth',
            'It reflects light back to a camera'
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
                  ? 'bg-cyan-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Capacitive Touch Grid</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderTouchScreen(isFingerMode ? 'finger' : 'glove', touchPoints)}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setIsFingerMode(true);
              setTouchPoints([]);
            }}
            className={`px-4 py-2 rounded-lg font-bold ${
              isFingerMode ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            👆 Bare Finger
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setShowGrid(!showGrid);
            }}
            className={`px-4 py-2 rounded-lg font-bold ${
              showGrid ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            📐 {showGrid ? 'Hide' : 'Show'} Grid
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            Your conductive finger acts as a capacitor plate!
            The screen measures capacitance changes at each grid intersection.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Your Finger Is a Capacitor Plate!</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-cyan-900/30 rounded-lg border border-cyan-600">
          <h3 className="text-cyan-400 font-bold mb-2">The Capacitive Principle</h3>
          <p className="text-gray-300">
            Your body is conductive (mostly water + ions). When your finger approaches the screen,
            it forms a <span className="text-yellow-400 font-bold">capacitor</span> with the electrode grid.
            This changes the local capacitance, which the controller detects!
          </p>
        </div>

        {renderCapacitorDiagram()}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-blue-400 font-bold mb-2">X-Y Grid</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Horizontal electrodes (X)</li>
              <li>• Vertical electrodes (Y)</li>
              <li>• Intersections form sensing points</li>
              <li>• Typical: 10-20 lines each direction</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-green-400 font-bold mb-2">Detection</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Controller scans each intersection</li>
              <li>• Measures charge/discharge time</li>
              <li>• Finger = slower discharge = detected!</li>
              <li>• 60-120+ scans per second</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Multi-Touch:</strong> Each grid intersection is independent!
            10 fingers = 10 different locations with changed capacitance.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          Why Don&apos;t Gloves Work? →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Glove Problem</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          Regular winter gloves don&apos;t work on touchscreens. Why not?
        </p>
        <div className="space-y-3">
          {[
            'Gloves are too thick to press hard enough',
            'Insulating material blocks capacitive coupling',
            'Gloves create too much static electricity',
            'The screen needs to sense body heat'
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
                  ? 'bg-cyan-600 text-white'
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
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          See the Difference →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Finger vs Glove vs Touch Glove</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderTouchScreen(touchMode, touchPoints)}

        <div className="flex justify-center gap-2 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setTouchMode('finger');
              setTouchPoints([]);
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              touchMode === 'finger' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            👆 Bare Finger
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setTouchMode('glove');
              setTouchPoints([]);
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              touchMode === 'glove' ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            🧤 Regular Glove
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setTouchMode('capacitiveGlove');
              setTouchPoints([]);
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              touchMode === 'capacitiveGlove' ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            🧤✨ Touch Glove
          </button>
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${
          touchMode === 'glove'
            ? 'bg-red-900/30 border-red-600'
            : 'bg-green-900/30 border-green-600'
        }`}>
          <p className={`text-center ${
            touchMode === 'glove' ? 'text-red-300' : 'text-green-300'
          }`}>
            {touchMode === 'finger' && (
              <>
                <span className="font-bold">Bare Finger:</span> Conductive! Forms capacitor with screen. ✓
              </>
            )}
            {touchMode === 'glove' && (
              <>
                <span className="font-bold">Regular Glove:</span> Insulating fabric blocks capacitive coupling. ✗
              </>
            )}
            {touchMode === 'capacitiveGlove' && (
              <>
                <span className="font-bold">Touch Glove:</span> Conductive threads connect your finger to the tip! ✓
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          Understand the Solution →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Making Gloves Work</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-red-900/30 rounded-lg border border-red-600">
          <h3 className="text-red-400 font-bold mb-2">The Problem</h3>
          <p className="text-gray-300">
            Wool, cotton, and synthetic fabrics are <span className="text-yellow-400 font-bold">electrical insulators</span>.
            They block the capacitive coupling between your conductive body and the screen electrodes.
            No coupling = no signal = no touch detected!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-cyan-400 font-bold mb-2">Touch Gloves</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Conductive threads (silver, copper)</li>
              <li>• Woven into fingertips</li>
              <li>• Connect skin to glove surface</li>
              <li>• Capacitive coupling restored!</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-purple-400 font-bold mb-2">Active Styluses</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Battery-powered electronics</li>
              <li>• Generate their own signal</li>
              <li>• Works with any material</li>
              <li>• Often has pressure sensitivity</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Life Hack:</strong> In emergencies, a small piece of aluminum foil or a sausage (!)
            can conduct enough to trigger a touchscreen. The human body isn&apos;t special—any conductor works!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Capacitive Touch</h2>
      <p className="text-gray-400 text-center">Explore how capacitive sensing shapes our technology</p>

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
                : 'bg-gray-800 border-2 border-gray-700 hover:border-cyan-500'
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
            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
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
            {passed ? 'Excellent understanding of capacitive touch!' : 'Review the concepts and try again.'}
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
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
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
                    ? 'bg-cyan-500'
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
      <h2 className="text-3xl font-bold text-white">Capacitive Touch Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Your finger forms a capacitor with the screen
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> X-Y electrode grid detects touch location
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Insulators (gloves) block capacitive coupling
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Conductive materials restore touch ability
          </li>
        </ul>
      </div>
      <div className="p-4 bg-cyan-900/30 rounded-lg border border-cyan-600 max-w-md mx-auto">
        <p className="text-cyan-300">
          📱 Key Insight: Touchscreens sense your body&apos;s electrical properties—you&apos;re part of the circuit!
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
          <span className="px-3 py-1 bg-cyan-900/50 text-cyan-300 rounded-full text-sm">
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
