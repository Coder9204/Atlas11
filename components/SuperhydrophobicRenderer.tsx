'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
    question: 'What is contact angle in surface science?',
    options: [
      'The angle at which rain falls onto a surface',
      'The angle between the water droplet edge and the surface',
      'The angle of the surface to the ground',
      'The angle of light reflecting from water'
    ],
    correct: 1
  },
  {
    question: 'Why are superhydrophobic surfaces self-cleaning?',
    options: [
      'They release cleaning chemicals automatically',
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
  },
  {
    question: 'What is the Cassie-Baxter state?',
    options: [
      'When water completely wets a rough surface',
      'When a water droplet sits on air pockets trapped between surface features',
      'When water is absorbed into the surface material',
      'When water freezes on contact with the surface'
    ],
    correct: 1
  },
  {
    question: 'How do micro-bumps on lotus leaves affect water droplets?',
    options: [
      'They absorb water into the leaf',
      'They create a composite air-solid interface, reducing contact area',
      'They chemically bond with water molecules',
      'They heat up and evaporate the water'
    ],
    correct: 1
  },
  {
    question: 'Why do dirt particles stick weakly to superhydrophobic surfaces?',
    options: [
      'The surface is chemically reactive',
      'Particles only touch the tips of micro-bumps, minimizing contact',
      'The surface is constantly wet',
      'Static electricity repels dirt'
    ],
    correct: 1
  },
  {
    question: 'What contact angle classifies a surface as hydrophilic?',
    options: [
      'Greater than 150°',
      'Less than 90°',
      'Exactly 90°',
      'Between 120° and 150°'
    ],
    correct: 1
  },
  {
    question: 'Which technology uses superhydrophobic coatings for safety?',
    options: [
      'Smartphone screens for better touch response',
      'Aircraft wings to prevent ice accumulation',
      'Solar panels to increase absorption',
      'Computer chips for faster processing'
    ],
    correct: 1
  },
  {
    question: 'What percentage of surface contact occurs on a superhydrophobic lotus leaf?',
    options: [
      'About 50%',
      'About 3% (water mostly sits on air)',
      'About 25%',
      '100% - full contact'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Self-Cleaning Glass',
    description: 'Building windows with nano-texture stay clean - rain washes away dirt! Used in skyscrapers, greenhouses, and solar panels.',
    icon: '🏢'
  },
  {
    title: 'Water-Repellent Clothing',
    description: 'Nano-coated fabrics let water bead off while remaining breathable. Popular in outdoor gear and protective wear.',
    icon: '🧥'
  },
  {
    title: 'Anti-Icing Surfaces',
    description: 'Aircraft wings and power lines with superhydrophobic coating resist ice formation, improving safety.',
    icon: '❄️'
  },
  {
    title: 'Corrosion Prevention',
    description: 'Metal surfaces with lotus-effect coating resist water damage and rust, extending equipment lifespan.',
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
// PREMIUM UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const ProgressIndicator: React.FC<{ phases: Phase[]; currentPhase: Phase }> = ({ phases, currentPhase }) => {
  const currentIndex = phases.indexOf(currentPhase);
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {phases.map((p, i) => (
        <div key={p} className="flex-1 flex items-center">
          <div
            className={`h-2 w-full rounded-full transition-all duration-500 ${
              i < currentIndex
                ? 'bg-gradient-to-r from-cyan-400 to-green-400'
                : i === currentIndex
                ? 'bg-gradient-to-r from-cyan-500 to-green-500 shadow-lg shadow-cyan-500/30'
                : 'bg-slate-700'
            }`}
          />
        </div>
      ))}
    </div>
  );
};

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  variant?: 'cyan' | 'green' | 'teal';
  disabled?: boolean;
  className?: string;
}> = ({ children, onMouseDown, variant = 'cyan', disabled = false, className = '' }) => {
  const gradients = {
    cyan: 'from-cyan-600 to-green-600 hover:from-cyan-500 hover:to-green-500 shadow-cyan-500/25',
    green: 'from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 shadow-green-500/25',
    teal: 'from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-teal-500/25'
  };

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onMouseDown(e);
      }}
      disabled={disabled}
      className={`px-8 py-3.5 bg-gradient-to-r ${gradients[variant]} rounded-2xl text-white font-semibold
        shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${className}`}
    >
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION GRAPHICS
// ─────────────────────────────────────────────────────────────────────────────
const SelfCleaningGlassGraphic: React.FC = () => {
  const [dropY, setDropY] = useState(40);
  const [dirtCollected, setDirtCollected] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDropY(y => {
        if (y > 200) {
          setDirtCollected(d => Math.min(d + 1, 5));
          return 40;
        }
        return y + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <radialGradient id="waterDrop" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#2563eb" />
        </radialGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Sky background */}
      <rect x="50" y="30" width="200" height="220" fill="url(#skyGradient)" rx="4" />

      {/* Glass panel with nano-coating */}
      <rect x="50" y="30" width="200" height="220" fill="url(#glassGradient)" rx="4" stroke="#60a5fa" strokeWidth="2" />

      {/* Nano-texture pattern */}
      {[...Array(20)].map((_, i) => (
        <g key={i}>
          {[...Array(11)].map((_, j) => (
            <circle
              key={`${i}-${j}`}
              cx={60 + i * 10}
              cy={40 + j * 20}
              r="1"
              fill="#22d3ee"
              opacity="0.3"
            />
          ))}
        </g>
      ))}

      {/* Dirt particles on glass */}
      {[...Array(5 - dirtCollected)].map((_, i) => (
        <circle
          key={i}
          cx={80 + i * 35}
          cy={100 + (i % 2) * 50}
          r="4"
          fill="#92400e"
        />
      ))}

      {/* Water droplet rolling */}
      <ellipse cx="150" cy={dropY} rx="10" ry="10" fill="url(#waterDrop)" />
      {dropY > 80 && dropY < 180 && (
        <circle cx="150" cy={dropY + 8} r="3" fill="#92400e" opacity="0.7" />
      )}

      {/* Building structure */}
      <rect x="270" y="60" width="80" height="190" fill="#1e3a5f" stroke="#334155" strokeWidth="2" />
      {[...Array(9)].map((_, i) => (
        <g key={i}>
          <rect x="280" y={70 + i * 20} width="25" height="15" fill="#0ea5e9" opacity="0.6" />
          <rect x="315" y={70 + i * 20} width="25" height="15" fill="#0ea5e9" opacity="0.6" />
        </g>
      ))}

      {/* Labels */}
      <text x="150" y="270" textAnchor="middle" className="fill-cyan-400 text-xs font-medium">
        Nano-Textured Self-Cleaning Glass
      </text>
      <text x="310" y="270" textAnchor="middle" className="fill-gray-400 text-xs">
        Skyscraper
      </text>

      {/* Clean indicator */}
      <g transform="translate(50, 255)">
        <text className="fill-green-400 text-xs">Cleanliness: </text>
        {[...Array(5)].map((_, i) => (
          <rect
            key={i}
            x={70 + i * 18}
            y="-8"
            width="15"
            height="10"
            rx="2"
            fill={i < dirtCollected ? '#22c55e' : '#374151'}
          />
        ))}
      </g>
    </svg>
  );
};

const WaterRepellentClothingGraphic: React.FC = () => {
  const [drops, setDrops] = useState([
    { x: 120, y: 60, vy: 0 },
    { x: 170, y: 80, vy: 0 },
    { x: 220, y: 50, vy: 0 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDrops(prev => prev.map(drop => {
        let newY = drop.y + drop.vy;
        let newVy = drop.vy;

        if (newY > 140 && newY < 180) {
          // Hit fabric - bounce off
          newVy = -3;
          newY = 140;
        } else if (newY > 240) {
          // Reset
          newY = 40 + Math.random() * 20;
          newVy = 0;
        } else {
          newVy += 0.3;
        }

        return { ...drop, y: newY, vy: newVy };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="jacketGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <pattern id="nanoFabric" patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="4" cy="4" r="1.5" fill="#3b82f6" opacity="0.5" />
        </pattern>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Rain background */}
      {[...Array(15)].map((_, i) => (
        <line
          key={i}
          x1={30 + i * 25}
          y1="0"
          x2={20 + i * 25}
          y2="100"
          stroke="#60a5fa"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}

      {/* Jacket body */}
      <path
        d="M100 100 L150 80 L170 80 L170 95 L230 95 L230 80 L250 80 L300 100 L290 220 L110 220 Z"
        fill="url(#jacketGradient)"
        stroke="#2563eb"
        strokeWidth="2"
      />

      {/* Nano-coating texture */}
      <path
        d="M100 100 L150 80 L170 80 L170 95 L230 95 L230 80 L250 80 L300 100 L290 220 L110 220 Z"
        fill="url(#nanoFabric)"
      />

      {/* Collar */}
      <path
        d="M150 80 L170 70 L200 65 L230 70 L250 80 L230 85 L200 80 L170 85 Z"
        fill="#1e3a8a"
        stroke="#2563eb"
      />

      {/* Zipper */}
      <line x1="200" y1="85" x2="200" y2="220" stroke="#64748b" strokeWidth="3" />
      {[...Array(14)].map((_, i) => (
        <rect key={i} x="196" y={90 + i * 10} width="8" height="2" fill="#94a3b8" />
      ))}

      {/* Water droplets */}
      {drops.map((drop, i) => (
        <g key={i}>
          <ellipse
            cx={drop.x}
            cy={drop.y}
            rx="6"
            ry={6 + Math.abs(drop.vy)}
            fill="#60a5fa"
            opacity="0.8"
          />
          {drop.y >= 138 && drop.y <= 145 && (
            <>
              <ellipse cx={drop.x - 10} cy={drop.y + 5} rx="4" ry="2" fill="#60a5fa" opacity="0.5" />
              <ellipse cx={drop.x + 10} cy={drop.y + 5} rx="4" ry="2" fill="#60a5fa" opacity="0.5" />
            </>
          )}
        </g>
      ))}

      {/* Droplet on fabric (beaded up) */}
      <ellipse cx="150" cy="150" rx="8" ry="8" fill="#3b82f6" opacity="0.9" />
      <ellipse cx="250" cy="170" rx="7" ry="7" fill="#3b82f6" opacity="0.9" />

      {/* Labels */}
      <text x="200" y="250" textAnchor="middle" className="fill-cyan-400 text-xs font-medium">
        Nano-Coated Waterproof Fabric
      </text>

      {/* Contact angle indicator */}
      <g transform="translate(300, 140)">
        <text className="fill-gray-400 text-xs">θ = 155°</text>
        <path d="M0 20 A15 15 0 0 1 -10 8" fill="none" stroke="#22d3ee" strokeWidth="2" />
      </g>

      {/* Feature label */}
      <g transform="translate(30, 240)">
        <rect width="100" height="20" rx="4" fill="#22c55e" opacity="0.2" />
        <text x="50" y="14" textAnchor="middle" className="fill-green-400 text-xs font-medium">Breathable</text>
      </g>
    </svg>
  );
};

const AntiIcingSurfaceGraphic: React.FC = () => {
  const [iceDrops, setIceDrops] = useState<{x: number; y: number; bounced: boolean}[]>([
    { x: 100, y: 30, bounced: false },
    { x: 200, y: 50, bounced: false },
    { x: 300, y: 20, bounced: false }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIceDrops(prev => prev.map(drop => {
        let newY = drop.y + 2;
        let bounced = drop.bounced;

        if (newY > 120 && !bounced) {
          bounced = true;
          newY = 120;
        } else if (bounced && newY < 200) {
          newY += 3;
        } else if (newY > 250) {
          return { x: 80 + Math.random() * 240, y: 20 + Math.random() * 20, bounced: false };
        }

        return { ...drop, y: newY, bounced };
      }));
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="wingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="coatingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Sky with snow */}
      {[...Array(20)].map((_, i) => (
        <circle
          key={i}
          cx={20 + (i * 19)}
          cy={10 + (i % 5) * 20}
          r="2"
          fill="#e2e8f0"
          opacity="0.5"
        />
      ))}

      {/* Aircraft wing cross-section */}
      <path
        d="M50 150 Q100 100 350 130 L350 160 Q100 190 50 150 Z"
        fill="url(#wingGradient)"
        stroke="#64748b"
        strokeWidth="2"
      />

      {/* Superhydrophobic coating layer */}
      <path
        d="M50 150 Q100 100 350 130 L350 135 Q100 105 50 150 Z"
        fill="url(#coatingGradient)"
      />

      {/* Nano-bumps on surface */}
      {[...Array(30)].map((_, i) => (
        <circle
          key={i}
          cx={70 + i * 10}
          cy={130 - Math.sin(i * 0.3) * 10}
          r="2"
          fill="#22d3ee"
          opacity="0.6"
        />
      ))}

      {/* Ice droplets bouncing off */}
      {iceDrops.map((drop, i) => (
        <g key={i}>
          <polygon
            points={`${drop.x},${drop.y - 5} ${drop.x - 4},${drop.y + 3} ${drop.x + 4},${drop.y + 3}`}
            fill="#bfdbfe"
            opacity={drop.bounced ? 0.5 : 0.9}
          />
          {drop.bounced && drop.y < 180 && (
            <>
              <circle cx={drop.x - 6} cy={drop.y + 10} r="2" fill="#bfdbfe" opacity="0.4" />
              <circle cx={drop.x + 6} cy={drop.y + 10} r="2" fill="#bfdbfe" opacity="0.4" />
            </>
          )}
        </g>
      ))}

      {/* Temperature indicator */}
      <g transform="translate(20, 40)">
        <rect x="0" y="0" width="60" height="60" rx="8" fill="#1e293b" stroke="#334155" />
        <text x="30" y="25" textAnchor="middle" className="fill-blue-400 text-sm font-bold">-15°C</text>
        <text x="30" y="45" textAnchor="middle" className="fill-gray-500 text-xs">Freezing</text>
      </g>

      {/* Aircraft silhouette */}
      <g transform="translate(310, 200)">
        <path d="M0 0 L60 -20 L65 -20 L65 -15 L60 -10 L60 0 L40 0 L35 10 L25 10 L20 0 Z" fill="#475569" />
        <rect x="25" y="-35" width="15" height="25" fill="#475569" />
      </g>

      {/* Labels */}
      <text x="200" y="210" textAnchor="middle" className="fill-cyan-400 text-xs font-medium">
        Anti-Icing Superhydrophobic Coating
      </text>
      <text x="200" y="225" textAnchor="middle" className="fill-gray-500 text-xs">
        Ice droplets bounce off before freezing
      </text>

      {/* Status indicator */}
      <g transform="translate(280, 35)">
        <rect width="100" height="30" rx="6" fill="#22c55e" opacity="0.2" />
        <text x="50" y="19" textAnchor="middle" className="fill-green-400 text-xs font-medium">ICE FREE ✓</text>
      </g>
    </svg>
  );
};

const CorrosionPreventionGraphic: React.FC = () => {
  const [waterLevel, setWaterLevel] = useState(0);
  const [protectedRust, setProtectedRust] = useState(0);
  const [unprotectedRust, setUnprotectedRust] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaterLevel(w => (w + 1) % 100);
      if (waterLevel % 20 === 0) {
        setUnprotectedRust(r => Math.min(r + 1, 10));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [waterLevel]);

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="metalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="rustGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id="waterSplash" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Water environment */}
      <rect x="0" y="200" width="400" height="100" fill="url(#waterSplash)" />
      {[...Array(8)].map((_, i) => (
        <ellipse
          key={i}
          cx={25 + i * 50}
          cy={200 + Math.sin(waterLevel * 0.1 + i) * 5}
          rx="30"
          ry="3"
          fill="#60a5fa"
          opacity="0.3"
        />
      ))}

      {/* Unprotected metal pipe (left) */}
      <g transform="translate(60, 80)">
        <text x="40" y="-10" textAnchor="middle" className="fill-red-400 text-xs font-medium">Unprotected</text>
        <rect x="0" y="0" width="80" height="150" rx="4" fill="url(#metalGradient)" stroke="#475569" strokeWidth="2" />

        {/* Rust spots */}
        {[...Array(unprotectedRust)].map((_, i) => (
          <ellipse
            key={i}
            cx={10 + (i % 3) * 25}
            cy={20 + Math.floor(i / 3) * 40}
            rx={8 + i * 0.5}
            ry={6 + i * 0.3}
            fill="url(#rustGradient)"
            opacity="0.9"
          />
        ))}

        {/* Corrosion indicator */}
        <text x="40" y="170" textAnchor="middle" className="fill-orange-400 text-xs">
          Rust: {unprotectedRust * 10}%
        </text>
      </g>

      {/* Protected metal pipe (right) */}
      <g transform="translate(260, 80)">
        <text x="40" y="-10" textAnchor="middle" className="fill-green-400 text-xs font-medium">Lotus-Coated</text>
        <rect x="0" y="0" width="80" height="150" rx="4" fill="url(#metalGradient)" stroke="#22d3ee" strokeWidth="2" />

        {/* Nano-coating shimmer */}
        <rect x="0" y="0" width="80" height="150" rx="4" fill="#22d3ee" opacity="0.15" />

        {/* Nano-texture dots */}
        {[...Array(8)].map((_, i) => (
          [...Array(15)].map((_, j) => (
            <circle
              key={`${i}-${j}`}
              cx={5 + i * 10}
              cy={5 + j * 10}
              r="1"
              fill="#22d3ee"
              opacity="0.4"
            />
          ))
        ))}

        {/* Water beading on surface */}
        <ellipse cx="20" cy="50" rx="6" ry="6" fill="#3b82f6" opacity="0.8" />
        <ellipse cx="60" cy="80" rx="5" ry="5" fill="#3b82f6" opacity="0.8" />
        <ellipse cx="35" cy="120" rx="7" ry="7" fill="#3b82f6" opacity="0.8" />

        {/* Protection indicator */}
        <text x="40" y="170" textAnchor="middle" className="fill-green-400 text-xs">
          Rust: {protectedRust}%
        </text>
      </g>

      {/* VS indicator */}
      <text x="200" y="150" textAnchor="middle" className="fill-gray-500 text-lg font-bold">VS</text>

      {/* Time indicator */}
      <g transform="translate(160, 250)">
        <rect x="0" y="0" width="80" height="25" rx="4" fill="#1e293b" />
        <text x="40" y="17" textAnchor="middle" className="fill-gray-400 text-xs">
          Year {Math.floor(unprotectedRust / 2)}
        </text>
      </g>

      {/* Labels */}
      <text x="200" y="290" textAnchor="middle" className="fill-cyan-400 text-xs font-medium">
        Superhydrophobic Corrosion Protection
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperhydrophobicRenderer({ onEvent, savedState }: SuperhydrophobicRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || Array(10).fill(-1));
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [surfaceType, setSurfaceType] = useState<'smooth' | 'lotus' | 'glass'>('smooth');
  const [dropletX] = useState(100);
  const [dropletY, setDropletY] = useState(50);
  const [isDropping, setIsDropping] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - self-cleaning
  const [dirtParticles, setDirtParticles] = useState<{x: number; y: number; picked: boolean}[]>([]);
  const [cleaningDropX, setCleaningDropX] = useState(-20);
  const [isCleaning, setIsCleaning] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

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
  const emitEvent = useCallback((type: GameEvent['type'], data: Record<string, unknown> = {}) => {
    onEvent?.({ type, phase, data });
  }, [onEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 200);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const handlePrediction = useCallback((id: string) => {
    playSound('click');
    setPrediction(id);
    emitEvent('prediction', { prediction: id });
  }, [emitEvent]);

  const handleTwistPrediction = useCallback((id: string) => {
    playSound('click');
    setTwistPrediction(id);
    emitEvent('prediction', { twistPrediction: id });
  }, [emitEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    playSound(answerIndex === TEST_QUESTIONS[questionIndex].correct ? 'success' : 'failure');
    emitEvent('interaction', { question: questionIndex, answer: answerIndex });
  }, [testAnswers, emitEvent]);

  const handleAppComplete = useCallback((index: number) => {
    playSound('click');
    setCompletedApps(prev => new Set([...prev, index]));
    setActiveAppTab(index);
    emitEvent('interaction', { app: TRANSFER_APPS[index].title });
  }, [emitEvent]);

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
  const renderDropletScene = () => {
    const contactAngle = getContactAngle(surfaceType);
    const isOnSurface = dropletY >= 150;

    // Droplet shape based on contact angle
    const getDropletShape = () => {
      if (!isOnSurface) {
        return { rx: 15, ry: 15, cy: dropletY };
      }

      if (contactAngle > 140) {
        return { rx: 18, ry: 18, cy: 145 };
      } else if (contactAngle > 90) {
        return { rx: 20, ry: 16, cy: 150 };
      } else if (contactAngle > 50) {
        return { rx: 25, ry: 12, cy: 155 };
      } else {
        return { rx: 40, ry: 6, cy: 162 };
      }
    };

    const dropletShape = getDropletShape();

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56 rounded-xl">
        <rect width="400" height="280" fill="#0f172a" />

        {/* Surface with texture visualization */}
        <g transform="translate(50, 170)">
          <rect x="0" y="0" width="300" height="60" rx="4" fill={
            surfaceType === 'lotus' ? '#22c55e' :
            surfaceType === 'glass' ? '#60a5fa' : '#6b7280'
          } />

          {surfaceType === 'lotus' && (
            <g>
              {[...Array(30)].map((_, i) => (
                <g key={i} transform={`translate(${10 + i * 10}, 0)`}>
                  <rect x="-2" y="-8" width="4" height="8" fill="#16a34a" rx="2" />
                  <ellipse cx="0" cy="-2" rx="3" ry="2" fill="#0ea5e9" opacity="0.3" />
                </g>
              ))}
              <text x="150" y="40" textAnchor="middle" className="fill-green-300 text-xs">
                Micro-bumps trap air pockets
              </text>
            </g>
          )}

          {surfaceType === 'smooth' && (
            <text x="150" y="40" textAnchor="middle" className="fill-gray-400 text-xs">
              Smooth surface - moderate contact
            </text>
          )}

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

        <defs>
          <radialGradient id="waterGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
        </defs>

        <text x="200" y="270" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {surfaceType === 'lotus' ? '🌿 Lotus Leaf Surface' :
           surfaceType === 'glass' ? '🔬 Clean Glass' : '⬜ Smooth Plastic'}
        </text>
      </svg>
    );
  };

  const renderCleaningScene = () => {
    return (
      <svg viewBox="0 0 400 250" className="w-full h-48 rounded-xl">
        <rect width="400" height="250" fill="#0f172a" />

        <g transform="translate(25, 180)">
          <rect x="0" y="0" width="350" height="40" fill="#22c55e" rx="3" />
          {[...Array(35)].map((_, i) => (
            <rect key={i} x={5 + i * 10} y="-6" width="4" height="6" fill="#16a34a" rx="2" />
          ))}
        </g>

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

        {isCleaning && (
          <g>
            <ellipse
              cx={cleaningDropX}
              cy={160}
              rx={20}
              ry={20}
              fill="url(#waterGradient2)"
            />
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

        {isCleaning && dirtParticles.filter(p => p.picked).length > 0 && (
          <text x={cleaningDropX} y={130} textAnchor="middle" className="fill-amber-400 text-xs">
            Dirt: {dirtParticles.filter(p => p.picked).length}
          </text>
        )}

        <text x="200" y="30" textAnchor="middle" className="fill-gray-300 text-sm font-semibold">
          Self-Cleaning: Water Rolls and Picks Up Dirt
        </text>

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

  const renderApplicationGraphic = (index: number) => {
    switch (index) {
      case 0: return <SelfCleaningGlassGraphic />;
      case 1: return <WaterRepellentClothingGraphic />;
      case 2: return <AntiIcingSurfaceGraphic />;
      case 3: return <CorrosionPreventionGraphic />;
      default: return null;
    }
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-green-600 flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/30">
        <span className="text-4xl">🌿</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-green-200 bg-clip-text text-transparent">
        The Lotus Leaf Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Water on a lotus leaf forms <span className="text-cyan-400 font-semibold">perfect spheres</span> that
        roll off instantly, leaving the leaf completely dry. But on glass, water
        <span className="text-blue-400 font-semibold"> spreads into a thin film</span>.
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-green-500/5 rounded-3xl" />
        <div className="relative">
          <p className="text-xl text-cyan-300 font-medium">
            What makes lotus leaves so water-repellent?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('click'); nextPhase(); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-green-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
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
          <span className="text-cyan-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-gray-400">
          Under a microscope, a lotus leaf has tiny bumps. How do these bumps repel water?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {[
          { id: 'air', text: 'Bumps trap air pockets - water sits on air, barely touching the surface', icon: '💨' },
          { id: 'wax', text: 'The bumps are made of a special wax that repels water', icon: '🕯️' },
          { id: 'electric', text: 'The bumps create static electricity that pushes water away', icon: '⚡' },
          { id: 'absorb', text: 'The bumps absorb water, making the surface appear dry', icon: '🧽' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-cyan-500 bg-cyan-900/30 shadow-lg shadow-cyan-500/20'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
            Test It! →
          </PrimaryButton>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Contact Angle Experiment</h2>

      {renderDropletScene()}

      <div className="flex flex-wrap justify-center gap-3">
        {[
          { id: 'glass', label: '🔬 Glass', angle: 30 },
          { id: 'smooth', label: '⬜ Plastic', angle: 70 },
          { id: 'lotus', label: '🌿 Lotus', angle: 160 }
        ].map((surface) => (
          <button
            key={surface.id}
            onMouseDown={(e) => {
              e.preventDefault();
              playSound('click');
              setSurfaceType(surface.id as typeof surfaceType);
              setDropletY(50);
              setIsDropping(false);
            }}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              surfaceType === surface.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {surface.label} (θ={surface.angle}°)
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound('click');
            setDropletY(50);
            setIsDropping(true);
          }}
          disabled={isDropping}
          className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
        >
          💧 Drop Water
        </button>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/30 to-green-900/30 rounded-2xl p-5 max-w-xl mx-auto border border-cyan-500/20">
        <p className="text-cyan-300 text-sm text-center">
          <strong>Contact angle (θ)</strong> measures how much water spreads.
          Lotus leaves have θ &gt; 150° because air pockets reduce contact area!
        </p>
      </div>

      <div className="text-center">
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
          Continue →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Lotus Effect</h2>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-xl mx-auto border border-slate-700">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg">1</div>
            <div>
              <h3 className="text-white font-semibold">Microscopic Texture</h3>
              <p className="text-gray-400 text-sm">Tiny bumps (5-15 μm) with even smaller nano-bumps on top</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-lg">2</div>
            <div>
              <h3 className="text-white font-semibold">Trapped Air</h3>
              <p className="text-gray-400 text-sm">Water sits on air pockets between bumps - only ~3% surface contact!</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">3</div>
            <div>
              <h3 className="text-white font-semibold">High Contact Angle</h3>
              <p className="text-gray-400 text-sm">θ &gt; 150° means droplets are nearly spherical and roll easily</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cyan-900/30 rounded-2xl p-5 max-w-xl mx-auto text-center border border-cyan-500/20">
        <p className="text-cyan-300 font-semibold">Cassie-Baxter State</p>
        <p className="text-gray-400 text-sm mt-2">
          Water droplet on composite surface of solid + air.
          <br />
          <code className="text-cyan-400">cos(θ*) = f·cos(θ) + (1-f)·cos(180°)</code>
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Your prediction: <span className={prediction === 'air' ? 'text-green-400 font-semibold' : 'text-red-400'}>
            {prediction === 'air' ? '✓ Correct!' : '✗ Not quite'}
          </span>
        </p>
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="green">
          But wait... →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-5xl mb-4">🔄</div>
        <h2 className="text-2xl font-bold text-white mb-2">The Twist!</h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          Lotus leaves are famous for being <span className="text-green-400 font-semibold">&quot;self-cleaning&quot;</span>.
          When it rains, dirt washes away. How does water repelling make the surface cleaner?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {[
          { id: 'roll', text: 'Rolling droplets pick up dirt particles as they go', icon: '🔄' },
          { id: 'dissolve', text: 'Water dissolves the dirt before rolling off', icon: '💧' },
          { id: 'shake', text: 'Wind vibrates the leaf to shake off dirt', icon: '🍃' },
          { id: 'notclean', text: 'It doesn\'t - dirt still sticks to the bumps', icon: '❌' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-green-500 bg-green-900/30 shadow-lg shadow-green-500/20'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="green">
            Test It! →
          </PrimaryButton>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Self-Cleaning Surfaces</h2>

      {renderCleaningScene()}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
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
          className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
        >
          💧 Roll Water Droplet
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
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
          className="px-6 py-2.5 rounded-xl font-medium bg-slate-700 text-gray-300 hover:bg-slate-600 transition-all"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 rounded-2xl p-5 max-w-xl mx-auto border border-green-500/20">
        <p className="text-green-300 text-sm text-center">
          <strong>Self-cleaning mechanism:</strong> Dirt particles weakly adhere to the bump tips.
          Rolling water droplets easily pick them up and carry them away!
        </p>
      </div>

      <div className="text-center">
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="green">
          Continue →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Nature&apos;s Self-Cleaning Design</h2>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-xl mx-auto border border-slate-700">
        <p className="text-gray-300 text-center mb-5">
          The combination of texture + chemistry creates:
        </p>

        <div className="space-y-4">
          <div className="bg-cyan-900/40 rounded-xl p-4 border border-cyan-500/20">
            <div className="text-cyan-400 font-semibold">High Contact Angle</div>
            <div className="text-gray-400 text-sm">Droplets remain spherical and mobile</div>
          </div>
          <div className="bg-green-900/40 rounded-xl p-4 border border-green-500/20">
            <div className="text-green-400 font-semibold">Low Adhesion for Dirt</div>
            <div className="text-gray-400 text-sm">Particles sit on bump tips, weakly attached</div>
          </div>
          <div className="bg-teal-900/40 rounded-xl p-4 border border-teal-500/20">
            <div className="text-teal-400 font-semibold">Rolling Action</div>
            <div className="text-gray-400 text-sm">Water-dirt adhesion &gt; dirt-surface adhesion → dirt leaves with water</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Your prediction: <span className={twistPrediction === 'roll' ? 'text-green-400 font-semibold' : 'text-red-400'}>
            {twistPrediction === 'roll' ? '✓ Correct!' : '✗ Not quite'}
          </span>
        </p>
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="teal">
          See Applications →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Real-World Applications</h2>
        <p className="text-gray-400">Explore all 4 applications to unlock the quiz</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 max-w-2xl mx-auto overflow-x-auto pb-2">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(index); }}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeAppTab === index
                ? 'bg-gradient-to-r from-cyan-600 to-green-600 text-white shadow-lg'
                : completedApps.has(index)
                ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl block mb-1">{app.icon}</span>
            <span className="block truncate">{app.title.split(' ')[0]}</span>
            {completedApps.has(index) && <span className="text-green-400 text-xs">✓</span>}
          </button>
        ))}
      </div>

      {/* Application Content */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-2xl mx-auto border border-slate-700">
        <div className="mb-4">
          {renderApplicationGraphic(activeAppTab)}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {TRANSFER_APPS[activeAppTab].icon} {TRANSFER_APPS[activeAppTab].title}
        </h3>
        <p className="text-gray-300">
          {TRANSFER_APPS[activeAppTab].description}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Applications explored: {completedApps.size}/4
        </p>
        {completedApps.size >= 4 && (
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
            Take the Quiz →
          </PrimaryButton>
        )}
      </div>
    </div>
  );

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== -1).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;
    const score = testAnswers.filter((a, i) => a === TEST_QUESTIONS[i].correct).length;
    const passed = score >= 7;

    if (allAnswered) {
      return (
        <div className="text-center space-y-8">
          <div className="text-7xl">{passed ? '🎉' : '📚'}</div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
            <p className="text-xl text-gray-300">
              You scored <span className={passed ? 'text-green-400' : 'text-amber-400'}>{score}/10</span>
            </p>
            <p className="text-gray-500 mt-2">
              {passed ? 'Excellent! You\'ve mastered superhydrophobic surfaces!' : 'Review the concepts and try again!'}
            </p>
          </div>
          <PrimaryButton
            onMouseDown={() => {
              playSound(passed ? 'complete' : 'click');
              if (passed) nextPhase();
              else setTestAnswers(Array(10).fill(-1));
            }}
            variant={passed ? 'cyan' : 'green'}
          >
            {passed ? 'Continue to Mastery! 🎊' : 'Try Again'}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Knowledge Check</h2>
          <p className="text-gray-400">Answer all 10 questions (70% to pass)</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 max-w-xl mx-auto">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                testAnswers[i] !== -1
                  ? testAnswers[i] === TEST_QUESTIONS[i].correct
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-6 max-w-2xl mx-auto">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div
              key={qIndex}
              className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border transition-all ${
                testAnswers[qIndex] !== -1
                  ? testAnswers[qIndex] === q.correct
                    ? 'border-green-500/50'
                    : 'border-red-500/50'
                  : 'border-slate-700'
              }`}
            >
              <p className="text-white font-medium mb-4">
                <span className="text-cyan-400">{qIndex + 1}.</span> {q.question}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (testAnswers[qIndex] === -1) handleTestAnswer(qIndex, oIndex);
                    }}
                    disabled={testAnswers[qIndex] !== -1}
                    className={`p-3 rounded-xl text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? oIndex === q.correct
                          ? 'bg-green-600/30 border border-green-500 text-green-300'
                          : 'bg-red-600/30 border border-red-500 text-red-300'
                        : testAnswers[qIndex] !== -1 && oIndex === q.correct
                        ? 'bg-green-600/20 border border-green-500/50 text-green-400'
                        : testAnswers[qIndex] !== -1
                        ? 'bg-slate-800 text-gray-500 cursor-not-allowed'
                        : 'bg-slate-800 text-gray-300 hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-8">
      <div className="text-8xl animate-bounce">🏆</div>
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
          Superhydrophobic Surface Master!
        </h2>
      </div>
      <div className="bg-gradient-to-r from-cyan-900/40 to-green-900/40 rounded-2xl p-8 max-w-lg mx-auto border border-cyan-500/20">
        <p className="text-cyan-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-3 text-left">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Micro/nano texture traps air pockets
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Contact angle determines water behavior
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> θ &gt; 150° = superhydrophobic
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Self-cleaning: rolling droplets pick up dirt
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Applications in glass, clothing, aviation, and industry
          </li>
        </ul>
      </div>
      <p className="text-gray-400">
        Biomimicry: engineers copy lotus leaves for amazing technology! 🌿
      </p>
      <PrimaryButton
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
      >
        Complete! 🎊
      </PrimaryButton>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Superhydrophobic Surfaces</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">
            {phase.charAt(0).toUpperCase() + phase.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
