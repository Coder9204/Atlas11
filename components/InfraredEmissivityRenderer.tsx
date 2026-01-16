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

interface InfraredEmissivityRendererProps {
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
    question: 'Why do all warm objects emit infrared radiation?',
    options: [
      'They have special IR emitting chemicals',
      'Thermal motion of molecules produces electromagnetic radiation',
      'They absorb IR from the sun and re-emit it',
      'Only metal objects emit IR'
    ],
    correct: 1
  },
  {
    question: 'A shiny metal cup and a matte black cup are the same temperature. On an IR camera:',
    options: [
      'They look the same - same temperature means same IR',
      'The shiny cup appears COOLER because it reflects surroundings instead of emitting',
      'The shiny cup appears HOTTER because metal conducts better',
      'IR cameras cannot see metal objects'
    ],
    correct: 1
  },
  {
    question: 'What is emissivity?',
    options: [
      'How hot an object is',
      'How much IR radiation a surface emits compared to a perfect blackbody',
      'The color of an object under normal light',
      'How reflective a surface is to visible light'
    ],
    correct: 1
  },
  {
    question: 'To get accurate temperature readings with an IR camera, you should:',
    options: [
      'Always use a shiny surface',
      'Set the emissivity value to match the surface, or apply high-emissivity tape',
      'Only measure on cloudy days',
      'Point the camera at the sun first to calibrate'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Building Inspections',
    description: 'Find heat leaks, missing insulation, and moisture damage by seeing temperature differences.',
    icon: '🏠'
  },
  {
    title: 'Medical Imaging',
    description: 'Detect inflammation, blood flow issues, and fever screening by measuring skin temperature.',
    icon: '🏥'
  },
  {
    title: 'Electrical Maintenance',
    description: 'Find hot spots in electrical panels that indicate loose connections or overloaded circuits.',
    icon: '⚡'
  },
  {
    title: 'Night Vision',
    description: 'Military and wildlife observation use thermal imaging to see warm bodies in total darkness.',
    icon: '🌙'
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
export default function InfraredEmissivityRenderer({ onEvent, savedState }: InfraredEmissivityRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [viewMode, setViewMode] = useState<'visible' | 'infrared'>('visible');
  const [selectedObject, setSelectedObject] = useState<'hand' | 'cup_matte' | 'cup_shiny' | 'ice'>('hand');
  const [objectTemp, setObjectTemp] = useState(37); // Celsius
  const [ambientTemp] = useState(22);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state
  const [twistViewMode, setTwistViewMode] = useState<'visible' | 'infrared'>('visible');

  const navigationLockRef = useRef(false);

  // Object properties
  const getObjectProps = (obj: string) => {
    const props: Record<string, { emissivity: number; name: string; actualTemp: number; color: string }> = {
      hand: { emissivity: 0.98, name: 'Human Hand', actualTemp: 37, color: '#e8b4a0' },
      cup_matte: { emissivity: 0.95, name: 'Matte Black Cup', actualTemp: objectTemp, color: '#1f2937' },
      cup_shiny: { emissivity: 0.1, name: 'Polished Metal Cup', actualTemp: objectTemp, color: '#9ca3af' },
      ice: { emissivity: 0.96, name: 'Ice Cube', actualTemp: 0, color: '#e0f2fe' }
    };
    return props[obj] || props.hand;
  };

  // Temperature to IR color
  const tempToIRColor = (temp: number, emissivity: number) => {
    // Apparent temperature = emissivity * actual + (1-emissivity) * ambient
    const apparentTemp = emissivity * temp + (1 - emissivity) * ambientTemp;

    // Map to color scale (-10 to 50°C)
    const normalizedTemp = Math.max(0, Math.min(1, (apparentTemp + 10) / 60));

    if (normalizedTemp < 0.25) {
      return `rgb(${Math.floor(normalizedTemp * 4 * 100)}, ${Math.floor(normalizedTemp * 4 * 50)}, ${150 + Math.floor(normalizedTemp * 4 * 105)})`;
    } else if (normalizedTemp < 0.5) {
      return `rgb(${100 + Math.floor((normalizedTemp - 0.25) * 4 * 155)}, ${50 + Math.floor((normalizedTemp - 0.25) * 4 * 200)}, ${255 - Math.floor((normalizedTemp - 0.25) * 4 * 155)})`;
    } else if (normalizedTemp < 0.75) {
      return `rgb(255, ${250 - Math.floor((normalizedTemp - 0.5) * 4 * 100)}, ${100 - Math.floor((normalizedTemp - 0.5) * 4 * 100)})`;
    } else {
      return `rgb(255, ${150 - Math.floor((normalizedTemp - 0.75) * 4 * 150)}, 0)`;
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

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setViewMode('visible');
      setSelectedObject('hand');
      setObjectTemp(37);
    }
    if (phase === 'twist_play') {
      setTwistViewMode('visible');
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

  const renderIRScene = (object: string, infrared: boolean) => {
    const props = getObjectProps(object);
    const irColor = tempToIRColor(props.actualTemp, props.emissivity);
    const apparentTemp = props.emissivity * props.actualTemp + (1 - props.emissivity) * ambientTemp;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background */}
        <rect width="400" height="280" fill={infrared ? '#0a1628' : '#1e293b'} />

        {/* IR color scale legend */}
        {infrared && (
          <g transform="translate(350, 40)">
            <defs>
              <linearGradient id="irScale" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgb(0, 0, 150)" />
                <stop offset="25%" stopColor="rgb(100, 50, 255)" />
                <stop offset="50%" stopColor="rgb(255, 250, 100)" />
                <stop offset="75%" stopColor="rgb(255, 150, 0)" />
                <stop offset="100%" stopColor="rgb(255, 0, 0)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="20" height="150" fill="url(#irScale)" />
            <text x="25" y="10" className="fill-gray-400 text-xs">50°C</text>
            <text x="25" y="80" className="fill-gray-400 text-xs">20°C</text>
            <text x="25" y="150" className="fill-gray-400 text-xs">-10°C</text>
          </g>
        )}

        {/* Object */}
        <g transform="translate(120, 60)">
          {object === 'hand' && (
            <g>
              {/* Hand shape */}
              <ellipse cx="80" cy="100" rx="50" ry="70" fill={infrared ? irColor : props.color} />
              <ellipse cx="80" cy="40" rx="8" ry="30" fill={infrared ? irColor : props.color} />
              <ellipse cx="95" cy="35" rx="7" ry="35" fill={infrared ? irColor : props.color} />
              <ellipse cx="110" cy="40" rx="6" ry="32" fill={infrared ? irColor : props.color} />
              <ellipse cx="122" cy="50" rx="5" ry="25" fill={infrared ? irColor : props.color} />
              <ellipse cx="50" cy="75" rx="20" ry="10" fill={infrared ? irColor : props.color} transform="rotate(-30, 50, 75)" />

              {/* IR radiation lines */}
              {infrared && (
                <g className="animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <line
                      key={i}
                      x1={80}
                      y1={80}
                      x2={80 + Math.cos(i * Math.PI / 4 + animPhase) * (60 + Math.sin(animPhase + i) * 10)}
                      y2={80 + Math.sin(i * Math.PI / 4 + animPhase) * (60 + Math.sin(animPhase + i) * 10)}
                      stroke={irColor}
                      strokeWidth="2"
                      opacity="0.5"
                    />
                  ))}
                </g>
              )}
            </g>
          )}

          {(object === 'cup_matte' || object === 'cup_shiny') && (
            <g>
              {/* Cup shape */}
              <path
                d={`M 50 40 L 60 160 L 100 160 L 110 40 Z`}
                fill={infrared ? irColor : props.color}
                stroke={object === 'cup_shiny' ? '#d1d5db' : 'none'}
                strokeWidth="2"
              />
              <ellipse cx="80" cy="40" rx="30" ry="10" fill={infrared ? irColor : (object === 'cup_shiny' ? '#6b7280' : '#374151')} />

              {/* Handle */}
              <path
                d="M 110 60 Q 140 70 140 100 Q 140 130 110 140"
                fill="none"
                stroke={infrared ? irColor : (object === 'cup_shiny' ? '#9ca3af' : '#1f2937')}
                strokeWidth="8"
              />

              {/* Shiny reflection indicator */}
              {object === 'cup_shiny' && !infrared && (
                <ellipse cx="75" cy="90" rx="10" ry="25" fill="white" opacity="0.3" />
              )}

              {/* IR radiation */}
              {infrared && props.emissivity > 0.5 && (
                <g className="animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <line
                      key={i}
                      x1={80}
                      y1={100}
                      x2={80 + Math.cos(i * Math.PI / 3 + animPhase) * 50}
                      y2={100 + Math.sin(i * Math.PI / 3 + animPhase) * 50}
                      stroke={irColor}
                      strokeWidth="2"
                      opacity="0.5"
                    />
                  ))}
                </g>
              )}
            </g>
          )}

          {object === 'ice' && (
            <g>
              {/* Ice cube */}
              <polygon
                points="50,60 100,40 130,80 130,140 80,160 30,140 30,80"
                fill={infrared ? irColor : props.color}
                stroke={infrared ? 'none' : '#93c5fd'}
                strokeWidth="2"
              />
              <polygon
                points="50,60 100,40 130,80 80,100"
                fill={infrared ? irColor : '#bfdbfe'}
                opacity="0.7"
              />

              {/* Frost texture */}
              {!infrared && (
                <>
                  <line x1="60" y1="90" x2="70" y2="120" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                  <line x1="90" y1="80" x2="100" y2="130" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                </>
              )}
            </g>
          )}
        </g>

        {/* Temperature readout */}
        <g transform="translate(20, 240)">
          <text className="fill-gray-400 text-sm">
            {infrared ? `Apparent: ${apparentTemp.toFixed(1)}°C` : `Actual: ${props.actualTemp}°C`}
          </text>
          {infrared && props.emissivity < 0.5 && (
            <text x="0" y="20" className="fill-yellow-400 text-xs">
              ⚠️ Low emissivity - reflects surroundings!
            </text>
          )}
        </g>

        {/* Labels */}
        <text x="200" y="25" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {infrared ? '📷 IR Camera View' : '👁️ Normal View'} - {props.name}
        </text>
      </svg>
    );
  };

  const renderTwistScene = (infrared: boolean) => {
    // Two cups at same temperature - one shiny, one matte
    const matteIRColor = tempToIRColor(60, 0.95);
    const shinyIRColor = tempToIRColor(60, 0.1);
    const shinyApparent = 0.1 * 60 + 0.9 * ambientTemp;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill={infrared ? '#0a1628' : '#1e293b'} />

        {/* Both cups filled with hot water at 60°C */}
        <text x="200" y="25" textAnchor="middle" className="fill-gray-300 text-sm">
          Both cups contain 60°C hot water
        </text>

        {/* Matte cup */}
        <g transform="translate(60, 50)">
          <path
            d="M 30 30 L 40 150 L 100 150 L 110 30 Z"
            fill={infrared ? matteIRColor : '#1f2937'}
          />
          <ellipse cx="70" cy="30" rx="40" ry="12" fill={infrared ? matteIRColor : '#374151'} />
          <path
            d="M 110 50 Q 145 60 145 90 Q 145 120 110 130"
            fill="none"
            stroke={infrared ? matteIRColor : '#1f2937'}
            strokeWidth="10"
          />

          {/* Steam */}
          {!infrared && (
            <g className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${55 + i * 15} 20 Q ${60 + i * 15} ${10 - Math.sin(animPhase + i) * 5} ${55 + i * 15} 0`}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  opacity="0.5"
                />
              ))}
            </g>
          )}

          {/* IR radiation */}
          {infrared && (
            <g className="animate-pulse">
              {[...Array(5)].map((_, i) => (
                <line
                  key={i}
                  x1={70}
                  y1={90}
                  x2={70 + Math.cos(i * Math.PI / 2.5 + animPhase) * 40}
                  y2={90 + Math.sin(i * Math.PI / 2.5 + animPhase) * 40}
                  stroke={matteIRColor}
                  strokeWidth="2"
                  opacity="0.6"
                />
              ))}
            </g>
          )}

          <text x="70" y="180" textAnchor="middle" className="fill-gray-400 text-xs">Matte Black</text>
          <text x="70" y="195" textAnchor="middle" className={infrared ? 'fill-orange-400 text-xs' : 'fill-gray-500 text-xs'}>
            {infrared ? '~58°C' : 'ε = 0.95'}
          </text>
        </g>

        {/* Shiny cup */}
        <g transform="translate(220, 50)">
          <path
            d="M 30 30 L 40 150 L 100 150 L 110 30 Z"
            fill={infrared ? shinyIRColor : '#9ca3af'}
            stroke="#d1d5db"
            strokeWidth="2"
          />
          <ellipse cx="70" cy="30" rx="40" ry="12" fill={infrared ? shinyIRColor : '#6b7280'} />
          <path
            d="M 110 50 Q 145 60 145 90 Q 145 120 110 130"
            fill="none"
            stroke={infrared ? shinyIRColor : '#9ca3af'}
            strokeWidth="10"
          />

          {/* Reflection highlight */}
          {!infrared && (
            <ellipse cx="60" cy="80" rx="8" ry="25" fill="white" opacity="0.3" />
          )}

          {/* Steam */}
          {!infrared && (
            <g className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${55 + i * 15} 20 Q ${60 + i * 15} ${10 - Math.sin(animPhase + i) * 5} ${55 + i * 15} 0`}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  opacity="0.5"
                />
              ))}
            </g>
          )}

          <text x="70" y="180" textAnchor="middle" className="fill-gray-400 text-xs">Polished Metal</text>
          <text x="70" y="195" textAnchor="middle" className={infrared ? 'fill-blue-400 text-xs' : 'fill-gray-500 text-xs'}>
            {infrared ? `~${shinyApparent.toFixed(0)}°C` : 'ε = 0.1'}
          </text>
        </g>

        {/* Explanation */}
        {infrared && (
          <text x="200" y="230" textAnchor="middle" className="fill-yellow-400 text-sm">
            Same temperature, different IR readings! Shiny surface reflects cold room.
          </text>
        )}
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🌡️📷</div>
      <h2 className="text-2xl font-bold text-white">The Invisible Heat Vision</h2>
      <p className="text-gray-300 text-lg max-w-lg mx-auto">
        Thermal cameras can &quot;see&quot; heat! Every warm object glows with invisible
        <span className="text-orange-400 font-semibold"> infrared light</span>. But here&apos;s a trick:
        some hot objects appear <span className="text-blue-400 font-semibold">cold</span> on thermal cameras!
      </p>
      <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-orange-300 font-medium">
          How can a hot cup appear cold on a thermal camera? 🤔
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
      >
        Investigate! →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You point a thermal camera at your hand. What determines how bright it appears on the camera?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'color', text: 'The color of your skin (darker = more heat)', icon: '🎨' },
          { id: 'temp', text: 'Your body temperature creates infrared radiation', icon: '🌡️' },
          { id: 'motion', text: 'How fast you move your hand', icon: '👋' },
          { id: 'light', text: 'How much visible light is hitting your hand', icon: '💡' }
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
                ? 'border-orange-500 bg-orange-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Experiment: Thermal Imaging</h2>

      {renderIRScene(selectedObject, viewMode === 'infrared')}

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Object:</label>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value as typeof selectedObject)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="hand">Human Hand (37°C)</option>
            <option value="cup_matte">Matte Black Cup</option>
            <option value="cup_shiny">Shiny Metal Cup</option>
            <option value="ice">Ice Cube (0°C)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-gray-400 text-sm">View Mode:</label>
          <button
            onMouseDown={() => { playSound('click'); setViewMode(viewMode === 'visible' ? 'infrared' : 'visible'); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'infrared'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {viewMode === 'infrared' ? '📷 IR Camera' : '👁️ Normal View'}
          </button>
        </div>
      </div>

      {(selectedObject === 'cup_matte' || selectedObject === 'cup_shiny') && (
        <div className="max-w-lg mx-auto">
          <label className="text-gray-400 text-sm">Cup Temperature: {objectTemp}°C</label>
          <input
            type="range"
            min="20"
            max="80"
            value={objectTemp}
            onChange={(e) => setObjectTemp(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {viewMode === 'infrared' && (
        <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-4 max-w-lg mx-auto">
          <p className="text-orange-300 text-sm">
            <strong>Thermal imaging:</strong> All warm objects emit IR radiation. The camera detects this and
            creates a false-color image showing temperature differences.
            Emissivity (ε) = how well a surface emits IR compared to a perfect &quot;blackbody&quot;.
          </p>
        </div>
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

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">How Thermal Imaging Works</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Thermal Motion</h3>
              <p className="text-gray-400 text-sm">All matter above absolute zero has vibrating molecules</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">IR Emission</h3>
              <p className="text-gray-400 text-sm">These vibrations emit electromagnetic radiation (infrared)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Camera Detection</h3>
              <p className="text-gray-400 text-sm">IR sensors measure the radiation and map it to colors</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-orange-300 font-semibold">Stefan-Boltzmann Law</p>
        <p className="text-gray-400 text-sm mt-1">
          Power radiated = ε × σ × A × T⁴<br />
          Hotter objects radiate exponentially more IR!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-orange-400 font-semibold">{prediction === 'temp' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
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
        You fill TWO cups with the same 60°C hot water. One is <span className="text-gray-400">matte black</span>,
        one is <span className="text-gray-300">polished metal</span>. On the thermal camera:
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'same', text: 'Both appear the same temperature (60°C)', icon: '=' },
          { id: 'shiny_cold', text: 'Shiny cup appears COOLER than the matte cup', icon: '❄️' },
          { id: 'shiny_hot', text: 'Shiny cup appears HOTTER (metal conducts better)', icon: '🔥' },
          { id: 'invisible', text: 'Shiny cup is invisible to IR cameras', icon: '👻' }
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
                ? 'border-red-500 bg-red-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">The Emissivity Trick</h2>

      {renderTwistScene(twistViewMode === 'infrared')}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={() => { playSound('click'); setTwistViewMode('visible'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            twistViewMode === 'visible'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          👁️ Normal View
        </button>
        <button
          onMouseDown={() => { playSound('click'); setTwistViewMode('infrared'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            twistViewMode === 'infrared'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          📷 IR Camera
        </button>
      </div>

      {twistViewMode === 'infrared' && (
        <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg mx-auto">
          <p className="text-red-300 text-sm text-center">
            <strong>Low emissivity = reflects surroundings!</strong><br />
            The shiny cup reflects the cold room (~22°C) instead of emitting its own 60°C IR.
          </p>
        </div>
      )}

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Emissivity Explained</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          <span className="text-orange-400 font-semibold">Emissivity (ε)</span> is the ratio of IR emitted vs a perfect &quot;blackbody&quot;
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-orange-400 font-semibold">High Emissivity (ε ≈ 1)</div>
            <div className="text-gray-500">Skin, matte paint, paper</div>
            <div className="text-gray-400 text-xs mt-1">→ Emits true temperature</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Low Emissivity (ε ≈ 0.1)</div>
            <div className="text-gray-500">Polished metal, mirrors</div>
            <div className="text-gray-400 text-xs mt-1">→ Reflects surroundings</div>
          </div>
        </div>

        <p className="text-yellow-300 text-sm mt-4 text-center">
          💡 Pro tip: Put electrical tape (ε≈0.95) on shiny surfaces for accurate readings!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-red-400 font-semibold">{twistPrediction === 'shiny_cold' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
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
                ? 'border-orange-500 bg-orange-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
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
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
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
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-orange-500 transition-all text-left text-gray-200"
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
      <h2 className="text-2xl font-bold text-white">Thermal Imaging Master!</h2>
      <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-orange-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ All warm objects emit infrared radiation</li>
          <li>✓ Emissivity determines how much IR a surface emits</li>
          <li>✓ Shiny surfaces reflect surroundings, appearing cooler</li>
          <li>✓ Real-world thermal imaging applications</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Next time you see thermal footage, you&apos;ll know the physics behind it! 📷🔥
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        {renderPhase()}
      </div>
    </div>
  );
}
