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

interface OrbitalMechanicsRendererProps {
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
    question: 'What keeps the ISS in orbit around Earth?',
    options: [
      'Rocket engines firing continuously',
      'It\'s outside Earth\'s gravity',
      'It\'s falling toward Earth but moving sideways fast enough to miss',
      'Magnetic repulsion from Earth\'s core'
    ],
    correct: 2
  },
  {
    question: 'If you throw a ball horizontally on Earth, why doesn\'t it orbit?',
    options: [
      'Balls can\'t orbit',
      'It doesn\'t have enough horizontal speed - it hits the ground',
      'Air pushes it down',
      'Gravity is too strong at ground level'
    ],
    correct: 1
  },
  {
    question: 'Why do astronauts float inside the ISS?',
    options: [
      'There\'s no gravity in space',
      'The ISS has anti-gravity generators',
      'They\'re falling at the same rate as the station (free fall)',
      'They\'re too far from Earth for gravity'
    ],
    correct: 2
  },
  {
    question: 'To orbit higher, a satellite needs to:',
    options: [
      'Move faster',
      'Move slower (orbital velocity decreases with altitude)',
      'Weigh less',
      'Be larger'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'GPS Satellites',
    description: '~20,200 km altitude, ~14,000 km/h. Higher orbit = slower speed, longer orbital period.',
    icon: '📡'
  },
  {
    title: 'Geostationary Orbit',
    description: '35,786 km up, orbits in exactly 24 hours - appears stationary over one spot!',
    icon: '🛰️'
  },
  {
    title: 'Vomit Comet',
    description: 'Parabolic flights create ~25 seconds of free fall to simulate microgravity for training.',
    icon: '✈️'
  },
  {
    title: 'Escape Velocity',
    description: 'At 11.2 km/s horizontal, you escape Earth entirely - no more "falling around"!',
    icon: '🚀'
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
export default function OrbitalMechanicsRenderer({ onEvent, savedState }: OrbitalMechanicsRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [launchSpeed, setLaunchSpeed] = useState(5); // km/s scale
  const [isLaunched, setIsLaunched] = useState(false);
  const [projectilePos, setProjectilePos] = useState({ x: 0, y: 0 });
  const [projectileVel, setProjectileVel] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [outcome, setOutcome] = useState<'none' | 'crash' | 'orbit' | 'escape'>('none');
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - ISS simulation
  const [issAngle, setIssAngle] = useState(0);

  const navigationLockRef = useRef(false);

  // Earth radius in simulation units
  const EARTH_RADIUS = 80;
  const EARTH_CENTER = { x: 200, y: 300 };

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

  const launchProjectile = () => {
    // Start from mountain top (top of Earth)
    const startX = EARTH_CENTER.x;
    const startY = EARTH_CENTER.y - EARTH_RADIUS - 10;

    setProjectilePos({ x: startX, y: startY });
    setProjectileVel({ x: launchSpeed * 3, y: 0 }); // Horizontal launch
    setTrail([{ x: startX, y: startY }]);
    setOutcome('none');
    setIsLaunched(true);
  };

  const resetLaunch = () => {
    setIsLaunched(false);
    setProjectilePos({ x: 0, y: 0 });
    setProjectileVel({ x: 0, y: 0 });
    setTrail([]);
    setOutcome('none');
  };

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ISS orbit animation
  useEffect(() => {
    if (phase === 'twist_play' || phase === 'twist_review') {
      const interval = setInterval(() => {
        setIssAngle(a => (a + 0.02) % (Math.PI * 2));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Projectile simulation
  useEffect(() => {
    if (!isLaunched || outcome !== 'none') return;

    const interval = setInterval(() => {
      setProjectilePos(pos => {
        // Calculate gravity (pointing toward Earth center)
        const dx = EARTH_CENTER.x - pos.x;
        const dy = EARTH_CENTER.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < EARTH_RADIUS) {
          setOutcome('crash');
          return pos;
        }

        if (dist > 400) {
          setOutcome('escape');
          return pos;
        }

        // Gravity strength (inverse square, simplified)
        const g = 300 / (dist * dist);
        const ax = (dx / dist) * g;
        const ay = (dy / dist) * g;

        // Update velocity
        const newVx = projectileVel.x + ax;
        const newVy = projectileVel.y + ay;
        setProjectileVel({ x: newVx, y: newVy });

        // Update position
        const newX = pos.x + newVx;
        const newY = pos.y + newVy;

        // Check for stable orbit (completed a loop)
        if (trail.length > 50 && Math.abs(newX - trail[0].x) < 20 && Math.abs(newY - trail[0].y) < 20) {
          setOutcome('orbit');
        }

        // Update trail
        setTrail(t => [...t.slice(-200), { x: newX, y: newY }]);

        return { x: newX, y: newY };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isLaunched, outcome, projectileVel, trail]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      resetLaunch();
      setLaunchSpeed(5);
    }
    if (phase === 'twist_play') {
      setIssAngle(0);
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
              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderCannonScene = () => {
    return (
      <svg viewBox="0 0 400 350" className="w-full h-64">
        <rect width="400" height="350" fill="#0a0a1a" />

        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 37) % 400}
            cy={(i * 23) % 200}
            r={0.5 + Math.random()}
            fill="#ffffff"
            opacity={0.3 + Math.random() * 0.5}
          />
        ))}

        {/* Earth */}
        <circle
          cx={EARTH_CENTER.x}
          cy={EARTH_CENTER.y}
          r={EARTH_RADIUS}
          fill="url(#earthGradient)"
        />

        {/* Atmosphere glow */}
        <circle
          cx={EARTH_CENTER.x}
          cy={EARTH_CENTER.y}
          r={EARTH_RADIUS + 5}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          opacity="0.3"
        />

        {/* Mountain/cannon position */}
        <polygon
          points={`${EARTH_CENTER.x - 15},${EARTH_CENTER.y - EARTH_RADIUS} ${EARTH_CENTER.x},${EARTH_CENTER.y - EARTH_RADIUS - 15} ${EARTH_CENTER.x + 15},${EARTH_CENTER.y - EARTH_RADIUS}`}
          fill="#6b7280"
        />

        {/* Cannon */}
        <rect
          x={EARTH_CENTER.x}
          y={EARTH_CENTER.y - EARTH_RADIUS - 18}
          width="30"
          height="8"
          fill="#374151"
          rx="2"
        />

        {/* Trajectory trail */}
        {trail.length > 1 && (
          <path
            d={`M ${trail[0].x} ${trail[0].y} ${trail.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
            fill="none"
            stroke={outcome === 'orbit' ? '#22c55e' : outcome === 'crash' ? '#ef4444' : '#fbbf24'}
            strokeWidth="2"
            strokeDasharray={outcome === 'orbit' ? 'none' : '4,2'}
            opacity="0.7"
          />
        )}

        {/* Projectile */}
        {isLaunched && outcome === 'none' && (
          <circle
            cx={projectilePos.x}
            cy={projectilePos.y}
            r={5}
            fill="#fbbf24"
            className="animate-pulse"
          />
        )}

        {/* Velocity vector indicator (before launch) */}
        {!isLaunched && (
          <g>
            <line
              x1={EARTH_CENTER.x + 30}
              y1={EARTH_CENTER.y - EARTH_RADIUS - 14}
              x2={EARTH_CENTER.x + 30 + launchSpeed * 6}
              y2={EARTH_CENTER.y - EARTH_RADIUS - 14}
              stroke="#22c55e"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={EARTH_CENTER.x + 35 + launchSpeed * 3}
              y={EARTH_CENTER.y - EARTH_RADIUS - 25}
              className="fill-green-400 text-xs"
            >
              {launchSpeed} km/s
            </text>
          </g>
        )}

        {/* Outcome indicator */}
        {outcome === 'crash' && (
          <text x="200" y="30" textAnchor="middle" className="fill-red-400 text-sm font-bold">
            💥 Crashed! Not enough horizontal speed
          </text>
        )}
        {outcome === 'orbit' && (
          <text x="200" y="30" textAnchor="middle" className="fill-green-400 text-sm font-bold">
            🛰️ Orbit achieved! Falling around Earth
          </text>
        )}
        {outcome === 'escape' && (
          <text x="200" y="30" textAnchor="middle" className="fill-purple-400 text-sm font-bold">
            🚀 Escape velocity! Left Earth&apos;s gravity
          </text>
        )}

        {/* Gradients and markers */}
        <defs>
          <radialGradient id="earthGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
          </marker>
        </defs>

        {/* Labels */}
        <text x="200" y="340" textAnchor="middle" className="fill-gray-400 text-xs">
          Newton&apos;s Cannonball: What speed makes it orbit?
        </text>
      </svg>
    );
  };

  const renderISSScene = () => {
    const issX = EARTH_CENTER.x + Math.cos(issAngle) * (EARTH_RADIUS + 30);
    const issY = 200 + Math.sin(issAngle) * (EARTH_RADIUS + 30) * 0.3; // Flattened for perspective

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#0a0a1a" />

        {/* Stars */}
        {[...Array(40)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 31) % 400}
            cy={(i * 17) % 280}
            r={0.5 + Math.random() * 0.5}
            fill="#ffffff"
            opacity={0.3 + Math.random() * 0.4}
          />
        ))}

        {/* Earth (partial, from space view) */}
        <ellipse
          cx={200}
          cy={350}
          rx={180}
          ry={160}
          fill="url(#earthGradient2)"
        />

        {/* Atmosphere */}
        <ellipse
          cx={200}
          cy={350}
          rx={185}
          ry={165}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="4"
          opacity="0.3"
        />

        {/* Orbital path (dashed) */}
        <ellipse
          cx={200}
          cy={200}
          rx={120}
          ry={40}
          fill="none"
          stroke="#4b5563"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* ISS */}
        <g transform={`translate(${issX}, ${issY})`}>
          {/* Solar panels */}
          <rect x="-25" y="-3" width="50" height="6" fill="#fbbf24" />
          {/* Main body */}
          <rect x="-8" y="-5" width="16" height="10" fill="#9ca3af" rx="2" />
          {/* Smaller modules */}
          <rect x="-12" y="-3" width="4" height="6" fill="#6b7280" />
          <rect x="8" y="-3" width="4" height="6" fill="#6b7280" />
        </g>

        {/* Gravity arrow (always pointing down toward Earth) */}
        <g transform={`translate(${issX}, ${issY + 20})`}>
          <line x1="0" y1="0" x2="0" y2="25" stroke="#ef4444" strokeWidth="2" />
          <polygon points="-5,25 5,25 0,35" fill="#ef4444" />
          <text x="10" y="20" className="fill-red-400 text-xs">Gravity</text>
        </g>

        {/* Velocity arrow (tangent to orbit) */}
        <g transform={`translate(${issX}, ${issY})`}>
          <line
            x1="0"
            y1="0"
            x2={Math.cos(issAngle + Math.PI / 2) * 30}
            y2={Math.sin(issAngle + Math.PI / 2) * 10}
            stroke="#22c55e"
            strokeWidth="2"
          />
          <text
            x={Math.cos(issAngle + Math.PI / 2) * 35}
            y={Math.sin(issAngle + Math.PI / 2) * 12 - 5}
            className="fill-green-400 text-xs"
          >
            Velocity
          </text>
        </g>

        {/* Free fall indicator */}
        <g transform="translate(30, 30)">
          <rect x="0" y="0" width="120" height="50" fill="#1f2937" rx="8" opacity="0.9" />
          <text x="10" y="20" className="fill-gray-300 text-xs font-semibold">ISS Status:</text>
          <text x="10" y="38" className="fill-yellow-400 text-xs">
            ↓ Falling at 7.66 km/s!
          </text>
        </g>

        {/* Floating astronaut inside ISS (conceptual) */}
        <g transform="translate(280, 50)">
          <rect x="0" y="0" width="100" height="60" fill="#1f2937" rx="8" opacity="0.9" />
          <text x="10" y="18" className="fill-gray-300 text-xs font-semibold">Inside ISS:</text>
          <text x="50" y="45" textAnchor="middle" className="text-2xl">🧑‍🚀</text>
        </g>

        {/* Explanation */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-400 text-xs">
          ISS falls toward Earth at 7.66 km/s - but misses because it&apos;s moving sideways!
        </text>

        <defs>
          <radialGradient id="earthGradient2" cx="50%" cy="20%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="40%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
        The Falling Satellite Paradox
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how satellites orbit by perpetually falling
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🛰️🌍</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              The International Space Station is <span className="text-blue-400 font-semibold">falling toward Earth</span> at 28,000 km/h!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              So why doesn&apos;t it crash? And if it&apos;s falling, why do astronauts float?
            </p>
            <div className="pt-2">
              <p className="text-base text-blue-400 font-semibold">
                How can something fall forever without hitting the ground?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You fire a cannonball horizontally from a very tall mountain. What determines if it orbits Earth?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'fast', text: 'Horizontal speed - fast enough to "fall around" Earth\'s curve', icon: '→' },
          { id: 'up', text: 'Firing angle - must aim slightly upward to stay in space', icon: '↗️' },
          { id: 'mass', text: 'Mass of the cannonball - heavier objects orbit better', icon: '⚖️' },
          { id: 'gravity', text: 'Getting above Earth\'s gravity (impossible to orbit)', icon: '🚫' }
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
                ? 'border-blue-500 bg-blue-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Newton&apos;s Cannonball</h2>

      {renderCannonScene()}

      <div className="max-w-lg mx-auto space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Launch Speed: {launchSpeed} km/s</label>
          <input
            type="range"
            min="2"
            max="12"
            step="0.5"
            value={launchSpeed}
            onChange={(e) => setLaunchSpeed(Number(e.target.value))}
            disabled={isLaunched}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>2 km/s (falls)</span>
            <span>~8 km/s (orbit)</span>
            <span>11+ km/s (escape)</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onMouseDown={() => {
              playSound('click');
              if (isLaunched) {
                resetLaunch();
              } else {
                launchProjectile();
              }
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              isLaunched
                ? 'bg-gray-600 text-white'
                : 'bg-green-600 text-white hover:bg-green-500'
            }`}
          >
            {isLaunched ? '🔄 Reset' : '🚀 Fire Cannon!'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-blue-300 text-sm text-center">
          <strong>Key insight:</strong> The cannonball always falls toward Earth. But if it&apos;s moving
          fast enough sideways, Earth&apos;s surface curves away beneath it at the same rate!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Orbiting = Falling + Missing</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Gravity Always Pulls Down</h3>
              <p className="text-gray-400 text-sm">The satellite constantly accelerates toward Earth&apos;s center</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Horizontal Motion Continues</h3>
              <p className="text-gray-400 text-sm">Nothing slows it down sideways (no air resistance in space)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Earth Curves Away</h3>
              <p className="text-gray-400 text-sm">At ~8 km/s, the fall rate matches Earth&apos;s curvature - perpetual free fall!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-blue-300 font-semibold">Orbital Velocity Formula</p>
        <p className="text-gray-400 text-sm mt-1">
          v = √(GM/r) ≈ 7.9 km/s at Earth&apos;s surface<br />
          Higher altitude = slower orbital speed needed!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-blue-400 font-semibold">{prediction === 'fast' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
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
        Astronauts on the ISS &quot;float&quot; and experience &quot;weightlessness.&quot;
        But the ISS is only 400 km up where gravity is still 90% as strong as on Earth&apos;s surface!
        <span className="text-yellow-400 font-semibold"> Why do they float?</span>
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'freefall', text: 'They\'re in free fall WITH the station - everything falls together', icon: '⬇️' },
          { id: 'nogravity', text: 'There\'s no gravity in space - they\'re truly weightless', icon: '🚫' },
          { id: 'centrifugal', text: 'Centrifugal force cancels gravity exactly', icon: '🔄' },
          { id: 'vacuum', text: 'Vacuum of space prevents gravity from working', icon: '🌌' }
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
      <h2 className="text-xl font-bold text-white text-center">Free Fall in Orbit</h2>

      {renderISSScene()}

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-purple-300 text-sm text-center">
          <strong>The ISS AND the astronauts are falling at the same rate!</strong><br />
          Since they accelerate together, there&apos;s no &quot;floor pushing up&quot; feeling.
          It&apos;s like being in a falling elevator - except the elevator never hits bottom!
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
      <h2 className="text-xl font-bold text-white text-center">&quot;Microgravity&quot; Not &quot;Zero Gravity&quot;</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Scientists say <span className="text-yellow-400 font-semibold">&quot;microgravity&quot;</span> because:
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold">✓ Gravity IS present (90% of surface)</div>
            <div className="text-gray-500">The ISS is in Earth&apos;s gravity well</div>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">✓ Free fall creates apparent weightlessness</div>
            <div className="text-gray-500">Same as skydiving before parachute opens</div>
          </div>
          <div className="bg-yellow-900/30 rounded-lg p-3">
            <div className="text-yellow-400 font-semibold">✓ Tiny residual accelerations exist</div>
            <div className="text-gray-500">Air drag, tidal effects, vibrations = ~10⁻⁶ g</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-purple-400 font-semibold">{twistPrediction === 'freefall' ? '✓ Correct!' : '✗ Not quite'}</span></p>
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
                ? 'border-blue-500 bg-blue-900/30'
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
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
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
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
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
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500 transition-all text-left text-gray-200"
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
      <h2 className="text-2xl font-bold text-white">Orbital Mechanics Master!</h2>
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-blue-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Orbiting = falling toward Earth but moving sideways fast enough to miss</li>
          <li>✓ Orbital velocity ~7.9 km/s at Earth&apos;s surface</li>
          <li>✓ Astronauts float because they&apos;re in free fall with the station</li>
          <li>✓ &quot;Microgravity&quot; is more accurate than &quot;zero gravity&quot;</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        You now understand what Newton imagined 350 years ago! 🍎🛰️
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Orbital Mechanics</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  PHASES.indexOf(phase) === i
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
