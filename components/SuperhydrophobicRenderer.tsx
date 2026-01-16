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

interface SuperhydrophobicRendererProps {
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
    question: 'What makes a lotus leaf superhydrophobic?',
    options: [
      'It secretes oil that repels water',
      'Microscopic bumps trap air, reducing water contact with the surface',
      'The leaf is made of a special water-repelling chemical',
      'It has tiny holes that absorb water'
    ],
    correct: 1
  },
  {
    question: 'What is contact angle?',
    options: [
      'The angle at which rain hits the surface',
      'The angle between the water droplet edge and the surface',
      'The angle of the leaf to the ground',
      'The angle of sunlight reflection'
    ],
    correct: 1
  },
  {
    question: 'Why are superhydrophobic surfaces self-cleaning?',
    options: [
      'They release cleaning chemicals',
      'Water droplets roll and pick up dirt particles as they go',
      'The surface vibrates to shake off dirt',
      'UV light sterilizes the surface'
    ],
    correct: 1
  },
  {
    question: 'A surface with contact angle > 150° is called:',
    options: [
      'Hydrophilic',
      'Superhydrophobic',
      'Oleophobic',
      'Amphiphilic'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Self-Cleaning Glass',
    description: 'Building windows with nano-texture stay clean - rain washes away dirt!',
    icon: '🏢'
  },
  {
    title: 'Water-Repellent Clothing',
    description: 'Nano-coated fabrics let water bead off while remaining breathable.',
    icon: '🧥'
  },
  {
    title: 'Anti-Icing Surfaces',
    description: 'Aircraft wings and power lines with superhydrophobic coating resist ice formation.',
    icon: '❄️'
  },
  {
    title: 'Corrosion Prevention',
    description: 'Metal surfaces with lotus-effect coating resist water damage and rust.',
    icon: '⚙️'
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
export default function SuperhydrophobicRenderer({ onEvent, savedState }: SuperhydrophobicRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [surfaceType, setSurfaceType] = useState<'smooth' | 'lotus' | 'glass'>('smooth');
  const [dropletX, setDropletX] = useState(100);
  const [dropletY, setDropletY] = useState(50);
  const [isDropping, setIsDropping] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - self-cleaning
  const [dirtParticles, setDirtParticles] = useState<{x: number; y: number; picked: boolean}[]>([]);
  const [cleaningDropX, setCleaningDropX] = useState(-20);
  const [isCleaning, setIsCleaning] = useState(false);

  const navigationLockRef = useRef(false);

  // Contact angles for different surfaces
  const getContactAngle = (surface: string): number => {
    switch (surface) {
      case 'smooth': return 70; // Hydrophilic
      case 'lotus': return 160; // Superhydrophobic
      case 'glass': return 30; // Very hydrophilic
      default: return 70;
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

  // Droplet falling animation
  useEffect(() => {
    if (!isDropping) return;

    const interval = setInterval(() => {
      setDropletY(y => {
        if (y >= 150) {
          setIsDropping(false);
          return 150;
        }
        return y + 5;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isDropping]);

  // Self-cleaning animation
  useEffect(() => {
    if (!isCleaning) return;

    const interval = setInterval(() => {
      setCleaningDropX(x => {
        if (x >= 350) {
          setIsCleaning(false);
          return -20;
        }

        // Pick up dirt particles
        setDirtParticles(particles =>
          particles.map(p => ({
            ...p,
            picked: p.picked || (Math.abs(p.x - x) < 25 && !p.picked)
          }))
        );

        return x + 4;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isCleaning]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setSurfaceType('smooth');
      setDropletX(100);
      setDropletY(50);
      setIsDropping(false);
    }
    if (phase === 'twist_play') {
      setDirtParticles([
        { x: 80, y: 175, picked: false },
        { x: 140, y: 178, picked: false },
        { x: 200, y: 176, picked: false },
        { x: 260, y: 179, picked: false },
        { x: 310, y: 177, picked: false }
      ]);
      setCleaningDropX(-20);
      setIsCleaning(false);
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
              ? 'bg-gradient-to-r from-cyan-500 to-green-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderDropletScene = () => {
    const contactAngle = getContactAngle(surfaceType);
    const isOnSurface = dropletY >= 150;

    // Droplet shape based on contact angle
    const getDropletShape = () => {
      if (!isOnSurface) {
        // Falling droplet - spherical
        return { rx: 15, ry: 15, cy: dropletY };
      }

      if (contactAngle > 140) {
        // Superhydrophobic - nearly spherical, barely touching
        return { rx: 18, ry: 18, cy: 145 };
      } else if (contactAngle > 90) {
        // Hydrophobic - beaded up
        return { rx: 20, ry: 16, cy: 150 };
      } else if (contactAngle > 50) {
        // Neutral - slightly spread
        return { rx: 25, ry: 12, cy: 155 };
      } else {
        // Hydrophilic - very spread out
        return { rx: 40, ry: 6, cy: 162 };
      }
    };

    const dropletShape = getDropletShape();

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Surface with texture visualization */}
        <g transform="translate(50, 170)">
          {/* Surface base */}
          <rect x="0" y="0" width="300" height="60" fill={
            surfaceType === 'lotus' ? '#22c55e' :
            surfaceType === 'glass' ? '#60a5fa' : '#6b7280'
          } />

          {/* Micro-texture for lotus */}
          {surfaceType === 'lotus' && (
            <g>
              {[...Array(30)].map((_, i) => (
                <g key={i} transform={`translate(${10 + i * 10}, 0)`}>
                  <rect x="-2" y="-8" width="4" height="8" fill="#16a34a" rx="2" />
                  {/* Air pockets visualization */}
                  <ellipse cx="0" cy="-2" rx="3" ry="2" fill="#0ea5e9" opacity="0.3" />
                </g>
              ))}
              <text x="150" y="40" textAnchor="middle" className="fill-green-300 text-xs">
                Micro-bumps trap air pockets
              </text>
            </g>
          )}

          {/* Smooth surface */}
          {surfaceType === 'smooth' && (
            <text x="150" y="40" textAnchor="middle" className="fill-gray-400 text-xs">
              Smooth surface - moderate contact
            </text>
          )}

          {/* Glass surface */}
          {surfaceType === 'glass' && (
            <g>
              <rect x="0" y="0" width="300" height="10" fill="#93c5fd" opacity="0.5" />
              <text x="150" y="40" textAnchor="middle" className="fill-blue-300 text-xs">
                Hydrophilic glass - water spreads thin
              </text>
            </g>
          )}
        </g>

        {/* Water droplet */}
        <ellipse
          cx={dropletX}
          cy={dropletShape.cy}
          rx={dropletShape.rx}
          ry={dropletShape.ry}
          fill="url(#waterGradient)"
          className={isDropping ? '' : 'transition-all duration-300'}
        />

        {/* Contact angle indicator */}
        {isOnSurface && (
          <g transform={`translate(${dropletX}, 170)`}>
            {/* Contact angle arc */}
            <path
              d={`M -30 0 A 30 30 0 0 1 ${-30 * Math.cos(contactAngle * Math.PI / 180)} ${-30 * Math.sin(contactAngle * Math.PI / 180)}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <text x="35" y="-10" className="fill-yellow-400 text-xs font-bold">
              θ = {contactAngle}°
            </text>
          </g>
        )}

        {/* Contact angle scale */}
        <g transform="translate(320, 50)">
          <text x="0" y="0" className="fill-gray-400 text-xs font-semibold">Contact Angle</text>
          <text x="0" y="20" className="fill-blue-400 text-xs">&lt;90° Hydrophilic</text>
          <text x="0" y="35" className="fill-gray-400 text-xs">90° Neutral</text>
          <text x="0" y="50" className="fill-green-400 text-xs">&gt;90° Hydrophobic</text>
          <text x="0" y="65" className="fill-cyan-400 text-xs">&gt;150° Superhydrophobic</text>
        </g>

        {/* Gradient definition */}
        <defs>
          <radialGradient id="waterGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
        </defs>

        {/* Surface label */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {surfaceType === 'lotus' ? '🌿 Lotus Leaf Surface' :
           surfaceType === 'glass' ? '🔬 Clean Glass' : '⬜ Smooth Plastic'}
        </text>
      </svg>
    );
  };

  const renderCleaningScene = () => {
    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#111827" />

        {/* Lotus leaf surface */}
        <g transform="translate(25, 180)">
          <rect x="0" y="0" width="350" height="40" fill="#22c55e" rx="3" />

          {/* Micro-texture */}
          {[...Array(35)].map((_, i) => (
            <rect key={i} x={5 + i * 10} y="-6" width="4" height="6" fill="#16a34a" rx="2" />
          ))}
        </g>

        {/* Dirt particles */}
        {dirtParticles.map((particle, i) => (
          <circle
            key={i}
            cx={particle.picked ? cleaningDropX : particle.x}
            cy={particle.picked ? 155 : particle.y}
            r={4}
            fill="#8b4513"
            className={particle.picked ? 'transition-all duration-200' : ''}
          />
        ))}

        {/* Rolling water droplet */}
        {isCleaning && (
          <g>
            <ellipse
              cx={cleaningDropX}
              cy={160}
              rx={20}
              ry={20}
              fill="url(#waterGradient2)"
            />
            {/* Rolling indicator */}
            <line
              x1={cleaningDropX}
              y1={160}
              x2={cleaningDropX + Math.cos(cleaningDropX / 10) * 15}
              y2={160 + Math.sin(cleaningDropX / 10) * 15}
              stroke="#1e3a8a"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Collected dirt indicator */}
        {isCleaning && dirtParticles.filter(p => p.picked).length > 0 && (
          <text x={cleaningDropX} y={130} textAnchor="middle" className="fill-amber-400 text-xs">
            Dirt: {dirtParticles.filter(p => p.picked).length}
          </text>
        )}

        {/* Explanation */}
        <text x="200" y="30" textAnchor="middle" className="fill-gray-300 text-sm font-semibold">
          Self-Cleaning: Water Rolls and Picks Up Dirt
        </text>

        {/* Result indicator */}
        {!isCleaning && cleaningDropX > 300 && (
          <text x="200" y="240" textAnchor="middle" className="fill-green-400 text-sm font-bold">
            Surface cleaned! Dirt removed by rolling droplet.
          </text>
        )}

        <defs>
          <radialGradient id="waterGradient2" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
        </defs>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🌿💧</div>
      <h2 className="text-2xl font-bold text-white">The Lotus Leaf Mystery</h2>
      <p className="text-gray-300 text-lg max-w-lg mx-auto">
        Water on a lotus leaf forms <span className="text-cyan-400 font-semibold">perfect spheres</span> that
        roll off instantly, leaving the leaf completely dry. But on glass, water
        <span className="text-blue-400 font-semibold"> spreads into a thin film</span>.
      </p>
      <div className="bg-gradient-to-r from-cyan-900/50 to-green-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-cyan-300 font-medium">
          What makes lotus leaves so water-repellent? 🤔
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
      >
        Investigate! →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        Under a microscope, a lotus leaf has tiny bumps. How do these bumps repel water?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'air', text: 'Bumps trap air pockets - water sits on air, barely touching the surface', icon: '💨' },
          { id: 'wax', text: 'The bumps are made of a special wax that repels water', icon: '🕯️' },
          { id: 'electric', text: 'The bumps create static electricity that pushes water away', icon: '⚡' },
          { id: 'absorb', text: 'The bumps absorb water, making the surface appear dry', icon: '🧽' }
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
                ? 'border-cyan-500 bg-cyan-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Contact Angle Experiment</h2>

      {renderDropletScene()}

      <div className="flex flex-wrap justify-center gap-3">
        {[
          { id: 'glass', label: '🔬 Glass', angle: 30 },
          { id: 'smooth', label: '⬜ Plastic', angle: 70 },
          { id: 'lotus', label: '🌿 Lotus', angle: 160 }
        ].map((surface) => (
          <button
            key={surface.id}
            onMouseDown={() => {
              playSound('click');
              setSurfaceType(surface.id as typeof surfaceType);
              setDropletY(50);
              setIsDropping(false);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              surfaceType === surface.id
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {surface.label} (θ={surface.angle}°)
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onMouseDown={() => {
            playSound('click');
            setDropletY(50);
            setIsDropping(true);
          }}
          disabled={isDropping}
          className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600"
        >
          💧 Drop Water
        </button>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/30 to-green-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-cyan-300 text-sm text-center">
          <strong>Contact angle (θ)</strong> measures how much water spreads.
          Lotus leaves have θ &gt; 150° because air pockets reduce contact area!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">The Lotus Effect</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Microscopic Texture</h3>
              <p className="text-gray-400 text-sm">Tiny bumps (5-15 μm) with even smaller nano-bumps on top</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Trapped Air</h3>
              <p className="text-gray-400 text-sm">Water sits on air pockets between bumps - only ~3% surface contact!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">High Contact Angle</h3>
              <p className="text-gray-400 text-sm">θ &gt; 150° means droplets are nearly spherical and roll easily</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cyan-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-cyan-300 font-semibold">Cassie-Baxter State</p>
        <p className="text-gray-400 text-sm mt-1">
          Water droplet on composite surface of solid + air.
          cos(θ*) = f·cos(θ) + (1-f)·cos(180°)
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-cyan-400 font-semibold">{prediction === 'air' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
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
        Lotus leaves are famous for being <span className="text-green-400 font-semibold">&quot;self-cleaning&quot;</span>.
        When it rains, dirt washes away. How does water repelling make the surface cleaner?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'roll', text: 'Rolling droplets pick up dirt particles as they go', icon: '🔄' },
          { id: 'dissolve', text: 'Water dissolves the dirt before rolling off', icon: '💧' },
          { id: 'shake', text: 'Wind vibrates the leaf to shake off dirt', icon: '🍃' },
          { id: 'notclean', text: 'It doesn\'t - dirt still sticks to the bumps', icon: '❌' }
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
                ? 'border-green-500 bg-green-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-white font-semibold hover:from-green-500 hover:to-teal-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Self-Cleaning Surfaces</h2>

      {renderCleaningScene()}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={() => {
            playSound('click');
            setDirtParticles([
              { x: 80, y: 175, picked: false },
              { x: 140, y: 178, picked: false },
              { x: 200, y: 176, picked: false },
              { x: 260, y: 179, picked: false },
              { x: 310, y: 177, picked: false }
            ]);
            setCleaningDropX(-20);
            setIsCleaning(true);
          }}
          disabled={isCleaning}
          className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600"
        >
          💧 Roll Water Droplet
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setDirtParticles([
              { x: 80, y: 175, picked: false },
              { x: 140, y: 178, picked: false },
              { x: 200, y: 176, picked: false },
              { x: 260, y: 179, picked: false },
              { x: 310, y: 177, picked: false }
            ]);
            setCleaningDropX(-20);
            setIsCleaning(false);
          }}
          className="px-6 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-green-300 text-sm text-center">
          <strong>Self-cleaning mechanism:</strong> Dirt particles weakly adhere to the bump tips.
          Rolling water droplets easily pick them up and carry them away!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-white font-semibold hover:from-green-500 hover:to-teal-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Nature&apos;s Self-Cleaning Design</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          The combination of texture + chemistry creates:
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-cyan-400 font-semibold">High Contact Angle</div>
            <div className="text-gray-500">Droplets remain spherical and mobile</div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold">Low Adhesion for Dirt</div>
            <div className="text-gray-500">Particles sit on bump tips, weakly attached</div>
          </div>
          <div className="bg-teal-900/30 rounded-lg p-3">
            <div className="text-teal-400 font-semibold">Rolling Action</div>
            <div className="text-gray-500">Water-dirt adhesion &gt; dirt-surface adhesion → dirt leaves with water</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-green-400 font-semibold">{twistPrediction === 'roll' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-white font-semibold hover:from-green-500 hover:to-teal-500 transition-all"
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
                ? 'border-cyan-500 bg-cyan-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
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
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
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
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-cyan-500 transition-all text-left text-gray-200"
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
      <h2 className="text-2xl font-bold text-white">Superhydrophobic Surface Master!</h2>
      <div className="bg-gradient-to-r from-cyan-900/50 to-green-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-cyan-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Micro/nano texture traps air pockets</li>
          <li>✓ Contact angle determines water behavior</li>
          <li>✓ θ &gt; 150° = superhydrophobic</li>
          <li>✓ Self-cleaning: rolling droplets pick up dirt</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Biomimicry: engineers copy lotus leaves for amazing tech! 🌿
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-green-500 transition-all"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyan-950 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        {renderPhase()}
      </div>
    </div>
  );
}
