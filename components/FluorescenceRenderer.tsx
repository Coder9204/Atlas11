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

interface FluorescenceRendererProps {
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
    question: 'Why does a highlighter glow under UV light but appear normal under regular light?',
    options: [
      'Highlighters have tiny LEDs inside',
      'UV light chemically changes the ink',
      'Fluorescent molecules absorb UV and re-emit visible light',
      'Regular light is too weak to activate the glow'
    ],
    correct: 2
  },
  {
    question: 'Why is the emitted light a different color (longer wavelength) than the absorbed UV light?',
    options: [
      'Some energy is lost as heat during the process (Stokes shift)',
      'The molecules change color when hit by light',
      'UV light bounces off and changes color',
      'The eye perceives UV as a different color'
    ],
    correct: 0
  },
  {
    question: 'Why doesn\'t regular white paper fluoresce much?',
    options: [
      'White paper is too bright already',
      'Paper lacks special fluorescent molecules',
      'Paper absorbs all UV light completely',
      'Paper is too thick for light to penetrate'
    ],
    correct: 1
  },
  {
    question: 'A mineral glows red under UV light. What wavelength is the UV light?',
    options: [
      'Longer than red (infrared)',
      'The same as red (~700nm)',
      'Shorter than red, shorter than all visible light (~365nm)',
      'It depends on the room temperature'
    ],
    correct: 2
  }
];

const TRANSFER_APPS = [
  {
    title: 'Currency Security',
    description: 'Banknotes have fluorescent inks that glow under UV to prevent counterfeiting.',
    icon: '💵'
  },
  {
    title: 'Forensics',
    description: 'Body fluids fluoresce under UV, helping investigators find evidence at crime scenes.',
    icon: '🔍'
  },
  {
    title: 'Fluorescent Lights',
    description: 'UV from mercury vapor hits phosphor coating, which fluoresces white light!',
    icon: '💡'
  },
  {
    title: 'Scorpion Detection',
    description: 'Scorpion exoskeletons contain fluorescent compounds - they glow bright cyan under UV!',
    icon: '🦂'
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
export default function FluorescenceRenderer({ onEvent, savedState }: FluorescenceRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [uvOn, setUvOn] = useState(false);
  const [regularLightOn, setRegularLightOn] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<'highlighter' | 'paper' | 'tonic' | 'mineral'>('highlighter');
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state
  const [twistMaterial, setTwistMaterial] = useState<'highlighter_yellow' | 'highlighter_pink' | 'highlighter_green' | 'laundry_detergent'>('highlighter_yellow');

  const navigationLockRef = useRef(false);

  // Material fluorescence properties
  const getMaterialProps = (mat: string) => {
    const props: Record<string, { fluorescent: boolean; emitColor: string; emitGlow: string; name: string }> = {
      highlighter: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter' },
      paper: { fluorescent: false, emitColor: '#f5f5dc', emitGlow: '#f5f5dc', name: 'Plain Paper' },
      tonic: { fluorescent: true, emitColor: '#00ccff', emitGlow: '#00ffff', name: 'Tonic Water (Quinine)' },
      mineral: { fluorescent: true, emitColor: '#ff4444', emitGlow: '#ff0000', name: 'Fluorite Mineral' },
      highlighter_yellow: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter' },
      highlighter_pink: { fluorescent: true, emitColor: '#ff66cc', emitGlow: '#ff00ff', name: 'Pink Highlighter' },
      highlighter_green: { fluorescent: true, emitColor: '#00ffaa', emitGlow: '#00ff88', name: 'Green Highlighter' },
      laundry_detergent: { fluorescent: true, emitColor: '#6666ff', emitGlow: '#0000ff', name: 'Laundry Detergent' }
    };
    return props[mat] || props.highlighter;
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
      setUvOn(false);
      setRegularLightOn(true);
      setSelectedMaterial('highlighter');
    }
    if (phase === 'twist_play') {
      setTwistMaterial('highlighter_yellow');
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
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderFluorescenceScene = (material: string, uvActive: boolean, regularLight: boolean) => {
    const props = getMaterialProps(material);
    const isGlowing = uvActive && props.fluorescent;
    const ambientLight = regularLight ? 0.8 : (uvActive ? 0.2 : 0.05);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background - dark room when UV only */}
        <rect width="400" height="280" fill={regularLight ? '#1e293b' : '#0a0a15'} />

        {/* UV Light Source */}
        <g transform="translate(320, 30)">
          <rect x="-25" y="0" width="50" height="80" rx="5" fill="#1f2937" />
          <rect x="-20" y="70" width="40" height="30" rx="3" fill={uvActive ? '#7c3aed' : '#374151'} />
          {uvActive && (
            <>
              {/* UV beam cone */}
              <path
                d="M -20 100 L -60 260 L 60 260 L 20 100 Z"
                fill="url(#uvGradient)"
                opacity="0.4"
              />
              {/* UV rays */}
              {[...Array(5)].map((_, i) => (
                <line
                  key={i}
                  x1={-15 + i * 8}
                  y1="100"
                  x2={-45 + i * 25}
                  y2="250"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  opacity={0.3 + Math.sin(animPhase + i) * 0.2}
                />
              ))}
            </>
          )}
        </g>

        {/* Gradient definitions */}
        <defs>
          <radialGradient id="uvGradient" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={props.emitGlow} stopOpacity="0.9" />
            <stop offset="50%" stopColor={props.emitGlow} stopOpacity="0.4" />
            <stop offset="100%" stopColor={props.emitGlow} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Material/Object */}
        <g transform="translate(120, 140)">
          {/* Glow effect when fluorescent and UV active */}
          {isGlowing && (
            <ellipse
              cx="50"
              cy="60"
              rx={70 + Math.sin(animPhase) * 5}
              ry={50 + Math.sin(animPhase) * 5}
              fill="url(#glowGradient)"
              className="animate-pulse"
            />
          )}

          {/* Object base */}
          {material.includes('highlighter') && (
            <g>
              <rect x="20" y="30" width="60" height="60" rx="4" fill={isGlowing ? props.emitColor : '#fef08a'} filter={isGlowing ? 'url(#glow)' : ''} opacity={ambientLight} />
              <text x="50" y="70" textAnchor="middle" className="fill-gray-800 text-xs font-bold">TEXT</text>
            </g>
          )}
          {material === 'paper' && (
            <rect x="10" y="20" width="80" height="80" rx="2" fill={`rgba(245, 245, 220, ${ambientLight})`} />
          )}
          {material === 'tonic' && (
            <g>
              <rect x="30" y="10" width="40" height="90" rx="3" fill="#374151" />
              <rect x="35" y="25" width="30" height="70" rx="2" fill={isGlowing ? props.emitColor : `rgba(200, 230, 255, ${ambientLight})`} filter={isGlowing ? 'url(#glow)' : ''} />
              {/* Bubbles */}
              {[...Array(5)].map((_, i) => (
                <circle
                  key={i}
                  cx={40 + (i % 3) * 10}
                  cy={80 - ((animPhase * 10 + i * 15) % 50)}
                  r={2}
                  fill={isGlowing ? '#00ffff' : '#ffffff'}
                  opacity={0.5}
                />
              ))}
            </g>
          )}
          {material === 'mineral' && (
            <g>
              {/* Crystal shape */}
              <polygon
                points="50,10 80,40 70,90 30,90 20,40"
                fill={isGlowing ? props.emitColor : '#8b7355'}
                filter={isGlowing ? 'url(#glow)' : ''}
                opacity={ambientLight}
              />
              <polygon
                points="50,10 65,35 50,50 35,35"
                fill={isGlowing ? '#ff8888' : '#a0896b'}
                opacity={ambientLight * 0.8}
              />
            </g>
          )}
          {material === 'laundry_detergent' && (
            <g>
              <rect x="25" y="20" width="50" height="70" rx="5" fill="#2563eb" />
              <rect x="30" y="30" width="40" height="20" rx="2" fill={isGlowing ? props.emitColor : '#60a5fa'} filter={isGlowing ? 'url(#glow)' : ''} />
              <text x="50" y="75" textAnchor="middle" className="fill-white text-xs">SOAP</text>
            </g>
          )}
        </g>

        {/* Energy diagram (small) */}
        {uvActive && props.fluorescent && (
          <g transform="translate(20, 180)">
            <text x="0" y="0" className="fill-violet-400 text-xs">UV (short λ)</text>
            <line x1="0" y1="10" x2="30" y2="10" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="0" y="40" className="fill-gray-400 text-xs">→</text>
            <text x="15" y="55" style={{ fill: props.emitColor }} className="text-xs">Visible (long λ)</text>
            <line x1="0" y1="65" x2="30" y2="65" stroke={props.emitColor} strokeWidth="2" />
          </g>
        )}

        {/* Labels */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {props.name}
        </text>

        {/* Light status */}
        <g transform="translate(10, 20)">
          <circle cx="10" cy="10" r="8" fill={regularLight ? '#fbbf24' : '#374151'} />
          <text x="25" y="14" className="fill-gray-400 text-xs">Room Light</text>
          <circle cx="10" cy="35" r="8" fill={uvActive ? '#8b5cf6' : '#374151'} />
          <text x="25" y="39" className="fill-gray-400 text-xs">UV Light</text>
        </g>

        {/* Arrow marker */}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderTwistScene = (material: string, uvActive: boolean) => {
    const props = getMaterialProps(material);
    const isGlowing = uvActive && props.fluorescent;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#0a0a15" />

        {/* UV light */}
        {uvActive && (
          <rect x="0" y="0" width="400" height="250" fill="#1a0a2e" opacity="0.5" />
        )}

        {/* Four different materials side by side */}
        {['highlighter_yellow', 'highlighter_pink', 'highlighter_green', 'laundry_detergent'].map((mat, i) => {
          const matProps = getMaterialProps(mat);
          const selected = mat === material;
          const glowing = uvActive && matProps.fluorescent;

          return (
            <g key={mat} transform={`translate(${50 + i * 90}, 60)`}>
              {/* Glow */}
              {glowing && (
                <ellipse
                  cx="30"
                  cy="60"
                  rx={35 + Math.sin(animPhase + i) * 3}
                  ry={35 + Math.sin(animPhase + i) * 3}
                  fill={matProps.emitGlow}
                  opacity="0.3"
                />
              )}

              {/* Object */}
              <rect
                x="5"
                y="30"
                width="50"
                height="60"
                rx="4"
                fill={glowing ? matProps.emitColor : '#4b5563'}
                stroke={selected ? '#ffffff' : 'transparent'}
                strokeWidth="2"
                filter={glowing ? 'url(#glow)' : ''}
              />

              {/* Label */}
              <text x="30" y="120" textAnchor="middle" className="fill-gray-400 text-xs">
                {mat.includes('highlighter') ? mat.split('_')[1] : 'detergent'}
              </text>

              {/* Wavelength label when glowing */}
              {glowing && (
                <text x="30" y="15" textAnchor="middle" className="text-xs" style={{ fill: matProps.emitColor }}>
                  {mat === 'highlighter_yellow' ? '520nm' : mat === 'highlighter_pink' ? '580nm' : mat === 'highlighter_green' ? '510nm' : '440nm'}
                </text>
              )}
            </g>
          );
        })}

        {/* Explanation */}
        <text x="200" y="220" textAnchor="middle" className="fill-gray-300 text-sm">
          Same UV input → Different emission colors (Stokes shift varies)
        </text>

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🖍️🔦</div>
      <h2 className="text-2xl font-bold text-white">The Glowing Highlighter Mystery</h2>
      <p className="text-gray-300 text-lg max-w-lg mx-auto">
        You&apos;ve seen highlighters glow bright under a blacklight at parties. But here&apos;s the mystery:
        <span className="text-fuchsia-400 font-semibold"> UV light is invisible</span>, yet the highlighter
        glows <span className="text-green-400 font-semibold">visible green</span>!
      </p>
      <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-violet-300 font-medium">
          How does invisible light create visible glow? 🤔
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      >
        Investigate! →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You shine an invisible UV light on a yellow highlighter. What will happen?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'reflect', text: 'The UV bounces back as UV (still invisible)', icon: '↩️' },
          { id: 'absorb', text: 'The highlighter absorbs UV and re-emits VISIBLE light', icon: '✨' },
          { id: 'nothing', text: 'Nothing - UV passes right through transparent ink', icon: '➡️' },
          { id: 'heat', text: 'The highlighter heats up but doesn\'t glow', icon: '🔥' }
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
                ? 'border-violet-500 bg-violet-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Experiment: UV Fluorescence</h2>

      {renderFluorescenceScene(selectedMaterial, uvOn, regularLightOn)}

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Material:</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value as typeof selectedMaterial)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="highlighter">Yellow Highlighter</option>
            <option value="paper">Plain Paper</option>
            <option value="tonic">Tonic Water</option>
            <option value="mineral">Fluorite Crystal</option>
          </select>
        </div>

        <div className="space-y-3">
          <button
            onMouseDown={() => { playSound('click'); setRegularLightOn(!regularLightOn); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              regularLightOn
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Room Light: {regularLightOn ? 'ON' : 'OFF'}
          </button>
          <button
            onMouseDown={() => { playSound('click'); setUvOn(!uvOn); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              uvOn
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            UV Light: {uvOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {uvOn && getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 rounded-xl p-4 max-w-lg mx-auto">
          <p className="text-fuchsia-300 text-sm">
            <strong>Fluorescence!</strong> UV photons (short wavelength, high energy) are absorbed.
            The molecule re-emits light at a <em>longer wavelength</em> (lower energy) - visible!
          </p>
        </div>
      )}

      {uvOn && !getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gray-800/50 rounded-xl p-4 max-w-lg mx-auto">
          <p className="text-gray-400 text-sm">
            <strong>No fluorescence.</strong> This material lacks the special molecules
            that can absorb UV and re-emit visible light.
          </p>
        </div>
      )}

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">What&apos;s Really Happening</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">UV Absorption</h3>
              <p className="text-gray-400 text-sm">High-energy UV photon excites electron to higher state</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Energy Loss</h3>
              <p className="text-gray-400 text-sm">Some energy lost as heat (vibrational relaxation)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Visible Emission</h3>
              <p className="text-gray-400 text-sm">Lower-energy photon emitted - longer wavelength = visible!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-violet-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-violet-300 font-semibold">Stokes Shift</p>
        <p className="text-gray-400 text-sm mt-1">
          The wavelength difference between absorbed (UV ~365nm) and emitted (green ~520nm) light.
          Named after physicist George Stokes.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-violet-400 font-semibold">{prediction === 'absorb' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
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
        Different highlighter colors (yellow, pink, green) all absorb the <span className="text-violet-400">same UV light</span>.
        What color will they each glow?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'same', text: 'They all glow the same color (UV is UV)', icon: '⚪' },
          { id: 'different', text: 'They each glow their own DIFFERENT visible color', icon: '🌈' },
          { id: 'white', text: 'They all glow white when fluorescent', icon: '⬜' },
          { id: 'none', text: 'Only yellow highlighters can fluoresce', icon: '🟡' }
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
                ? 'border-fuchsia-500 bg-fuchsia-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Compare Fluorescent Materials</h2>

      {renderTwistScene(twistMaterial, true)}

      <div className="bg-gradient-to-r from-fuchsia-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-fuchsia-300 text-sm text-center">
          <strong>Same UV in → Different colors out!</strong><br />
          Each molecule has its own energy levels, determining its emission wavelength.
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">The Molecular Fingerprint</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Each fluorescent molecule has <span className="text-fuchsia-400 font-semibold">unique energy levels</span>.
          The Stokes shift varies by molecule!
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-green-400 font-semibold">Yellow Highlighter</div>
            <div className="text-gray-500">Emits ~520nm (green)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-pink-400 font-semibold">Pink Highlighter</div>
            <div className="text-gray-500">Emits ~580nm (pink)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-emerald-400 font-semibold">Green Highlighter</div>
            <div className="text-gray-500">Emits ~510nm (cyan-green)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Laundry Detergent</div>
            <div className="text-gray-500">Emits ~440nm (blue)</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-fuchsia-400 font-semibold">{twistPrediction === 'different' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
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
                ? 'border-violet-500 bg-violet-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
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
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
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
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-violet-500 transition-all text-left text-gray-200"
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
      <h2 className="text-2xl font-bold text-white">Fluorescence Master!</h2>
      <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-violet-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ UV absorption by fluorescent molecules</li>
          <li>✓ Re-emission at longer wavelength (Stokes shift)</li>
          <li>✓ Different molecules → different emission colors</li>
          <li>✓ Real-world applications from security to forensics</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Next time you see a blacklight party, you&apos;ll know the physics of that glow! ✨
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-violet-950 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        {renderPhase()}
      </div>
    </div>
  );
}
