'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

interface NonNewtonianArmorRendererProps {
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

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'What is a non-Newtonian fluid?',
    options: [
      'A fluid that only flows in space (zero gravity)',
      'A fluid whose viscosity changes with applied stress or shear rate',
      'A fluid that is always solid at room temperature',
      'A fluid discovered by Isaac Newton'
    ],
    correct: 1
  },
  {
    question: 'What happens when you slowly push your finger into oobleck?',
    options: [
      'It shatters like glass',
      'It heats up significantly',
      'Your finger sinks in easily like a liquid',
      'It immediately hardens into a solid'
    ],
    correct: 2
  },
  {
    question: 'Why does oobleck become solid-like when hit quickly?',
    options: [
      'The water evaporates instantly from the heat',
      'The starch particles jam together, unable to move past each other',
      'Chemical bonds form between the particles',
      'The impact creates an electric charge that freezes motion'
    ],
    correct: 1
  },
  {
    question: 'What type of non-Newtonian behavior does oobleck exhibit?',
    options: [
      'Shear-thinning (viscosity decreases with stress)',
      'Shear-thickening (viscosity increases with stress)',
      'Thixotropic (viscosity decreases over time)',
      'Rheopectic (viscosity increases over time)'
    ],
    correct: 1
  },
  {
    question: 'If you stand on oobleck, what determines whether you sink?',
    options: [
      'Only your total weight matters',
      'The color of the oobleck',
      'How quickly you shift your weight - slow movements let you sink',
      'The temperature of the room'
    ],
    correct: 2
  },
  {
    question: 'What is the key ingredient that gives cornstarch-water its special properties?',
    options: [
      'Salt dissolved in the water',
      'Microscopic starch granules suspended in water',
      'Air bubbles trapped in the mixture',
      'Heat from the mixing process'
    ],
    correct: 1
  },
  {
    question: 'How might shear-thickening fluids be used in body armor?',
    options: [
      'As a cooling system for the wearer',
      'The fluid stays flexible normally but hardens on impact to stop projectiles',
      'It makes the armor lighter by replacing metal',
      'It conducts electricity to shock attackers'
    ],
    correct: 1
  },
  {
    question: 'What ratio of cornstarch to water typically creates the best oobleck?',
    options: [
      'Equal parts (1:1)',
      'More water than cornstarch (1:2)',
      'About 2 parts cornstarch to 1 part water',
      'Only a tiny bit of cornstarch in water'
    ],
    correct: 2
  },
  {
    question: 'What happens to oobleck on a vibrating speaker?',
    options: [
      'It melts from the sound energy',
      'It forms tendrils and fingers that dance with the vibration',
      'It separates into water and powder',
      'It becomes permanently solid'
    ],
    correct: 1
  },
  {
    question: 'Why is understanding non-Newtonian fluids important for engineering?',
    options: [
      'Only for making kitchen gadgets',
      'It helps design protective gear, dampers, and smart materials that respond to conditions',
      'Non-Newtonian fluids don\'t exist in real applications',
      'Only for entertainment and toys'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Liquid Body Armor',
    description: 'Military researchers develop fabric infused with shear-thickening fluid. Flexible for movement, but hardens instantly on bullet/shrapnel impact!',
    icon: '🛡️'
  },
  {
    title: 'Smart Speed Bumps',
    description: 'Speed bumps filled with non-Newtonian fluid stay flat for slow cars but become rigid obstacles for speeding vehicles.',
    icon: '🚗'
  },
  {
    title: 'Protective Sports Gear',
    description: 'Helmets and pads using D3O and similar materials remain soft and comfortable until impact, then harden to protect.',
    icon: '⛑️'
  },
  {
    title: 'Industrial Dampers',
    description: 'Shock absorbers and vibration dampers that adapt their resistance based on impact force, protecting machinery.',
    icon: '⚙️'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
const ProgressIndicator: React.FC<{ phases: Phase[]; currentPhase: Phase }> = ({ phases, currentPhase }) => {
  const currentIndex = phases.indexOf(currentPhase);
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {phases.map((p, i) => (
        <div key={p} className="flex-1 flex items-center">
          <div
            className={`h-2 w-full rounded-full transition-all duration-500 ${
              i < currentIndex
                ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                : i === currentIndex
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30'
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
  variant?: 'amber' | 'orange' | 'red';
  disabled?: boolean;
  className?: string;
}> = ({ children, onMouseDown, variant = 'amber', disabled = false, className = '' }) => {
  const gradients = {
    amber: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25',
    orange: 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-500/25',
    red: 'from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 shadow-red-500/25'
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

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION GRAPHICS
// ═══════════════════════════════════════════════════════════════════════════
const LiquidArmorGraphic: React.FC = () => {
  const [impactPhase, setImpactPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImpactPhase(p => (p + 1) % 150);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const bulletX = impactPhase < 50 ? 50 + impactPhase * 4 : 250;
  const isImpact = impactPhase >= 50 && impactPhase < 80;
  const rippleSize = isImpact ? (impactPhase - 50) * 2 : 0;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="armorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="fluidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <rect width="400" height="280" fill="#0f172a" />

      {/* Vest outline */}
      <path
        d="M150 40 L180 30 L200 25 L220 30 L250 40 L260 120 L250 200 L220 210 L200 215 L180 210 L150 200 L140 120 Z"
        fill="url(#armorGrad)"
        stroke="#334155"
        strokeWidth="2"
      />

      {/* STF layer */}
      <path
        d="M155 50 L180 42 L200 38 L220 42 L245 50 L253 120 L245 190 L220 198 L200 202 L180 198 L155 190 L147 120 Z"
        fill="url(#fluidGrad)"
      />

      {/* Particles in fluid - normal state */}
      {!isImpact && [...Array(30)].map((_, i) => (
        <circle
          key={i}
          cx={160 + (i % 6) * 15 + Math.sin(impactPhase * 0.1 + i) * 3}
          cy={55 + Math.floor(i / 6) * 30 + Math.cos(impactPhase * 0.1 + i) * 2}
          r="4"
          fill="#fcd34d"
          opacity="0.7"
        />
      ))}

      {/* Particles jammed during impact */}
      {isImpact && [...Array(30)].map((_, i) => (
        <circle
          key={i}
          cx={160 + (i % 6) * 15}
          cy={55 + Math.floor(i / 6) * 30}
          r="5"
          fill="#dc2626"
          opacity="0.9"
        />
      ))}

      {/* Bullet */}
      {impactPhase < 80 && (
        <g transform={`translate(${bulletX}, 120)`}>
          <ellipse cx="0" cy="0" rx="15" ry="8" fill="#64748b" />
          <ellipse cx="-5" cy="0" rx="8" ry="6" fill="#94a3b8" />
          {impactPhase < 50 && (
            <line x1="-25" y1="0" x2="-45" y2="0" stroke="#ef4444" strokeWidth="2" />
          )}
        </g>
      )}

      {/* Impact ripple */}
      {isImpact && (
        <circle
          cx="250"
          cy="120"
          r={rippleSize}
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          opacity={1 - rippleSize / 60}
        />
      )}

      {/* Bullet stopped */}
      {impactPhase >= 80 && impactPhase < 120 && (
        <g transform="translate(240, 120)">
          <ellipse cx="0" cy="0" rx="10" ry="6" fill="#64748b" />
          <text x="0" y="35" textAnchor="middle" className="fill-green-400 text-xs font-bold">
            STOPPED!
          </text>
        </g>
      )}

      {/* Labels */}
      <text x="200" y="250" textAnchor="middle" className="fill-amber-400 text-sm font-medium">
        Shear-Thickening Fluid Body Armor
      </text>

      {/* State indicator */}
      <g transform="translate(300, 50)">
        <rect width="80" height="35" rx="6" fill={isImpact ? '#dc2626' : '#22c55e'} opacity="0.2" />
        <rect width="80" height="35" rx="6" fill="none" stroke={isImpact ? '#dc2626' : '#22c55e'} />
        <text x="40" y="22" textAnchor="middle" className={`text-xs font-bold ${isImpact ? 'fill-red-400' : 'fill-green-400'}`}>
          {isImpact ? 'RIGID' : 'FLEXIBLE'}
        </text>
      </g>
    </svg>
  );
};

const SmartSpeedBumpGraphic: React.FC = () => {
  const [carPhase, setCarPhase] = useState(0);
  const [carSpeed, setCarSpeed] = useState<'slow' | 'fast'>('slow');

  useEffect(() => {
    const interval = setInterval(() => {
      setCarPhase(p => {
        if (p > 150) {
          setCarSpeed(s => s === 'slow' ? 'fast' : 'slow');
          return 0;
        }
        return p + (carSpeed === 'slow' ? 1 : 3);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [carSpeed]);

  const carX = 30 + carPhase * 2;
  const bumpHeight = carSpeed === 'fast' && carX > 150 && carX < 250 ? 25 : 5;

  return (
    <svg viewBox="0 0 400 260" className="w-full h-64">
      <rect width="400" height="260" fill="#0f172a" />

      {/* Road */}
      <rect x="0" y="170" width="400" height="60" fill="#374151" />
      <line x1="0" y1="200" x2="400" y2="200" stroke="#fbbf24" strokeWidth="3" strokeDasharray="20 15" />

      {/* Speed bump with fluid */}
      <path
        d={`M160 170 Q200 ${170 - bumpHeight * 2} 240 170`}
        fill="#f59e0b"
        opacity="0.8"
      />
      <rect x="160" y="168" width="80" height="5" rx="2" fill="#1e293b" />

      {/* Fluid particles */}
      {[...Array(10)].map((_, i) => (
        <circle
          key={i}
          cx={165 + i * 8}
          cy={165 - (bumpHeight > 10 ? Math.sin(i) * 5 : 0)}
          r={bumpHeight > 10 ? 4 : 3}
          fill={bumpHeight > 10 ? '#ef4444' : '#fcd34d'}
        />
      ))}

      {/* Car */}
      <g transform={`translate(${carX}, ${155 - (carX > 170 && carX < 230 && bumpHeight > 10 ? bumpHeight : 0)})`}>
        <rect x="-30" y="-15" width="60" height="25" rx="5" fill={carSpeed === 'slow' ? '#22c55e' : '#ef4444'} />
        <rect x="-25" y="-25" width="35" height="15" rx="3" fill={carSpeed === 'slow' ? '#16a34a' : '#dc2626'} />
        <circle cx="-18" cy="12" r="8" fill="#1e293b" />
        <circle cx="18" cy="12" r="8" fill="#1e293b" />
        <circle cx="-18" cy="12" r="4" fill="#64748b" />
        <circle cx="18" cy="12" r="4" fill="#64748b" />
      </g>

      {/* Speed label */}
      <g transform="translate(320, 50)">
        <rect width="70" height="30" rx="6" fill={carSpeed === 'slow' ? '#22c55e' : '#ef4444'} opacity="0.2" />
        <text x="35" y="20" textAnchor="middle" className={`text-sm font-bold ${carSpeed === 'slow' ? 'fill-green-400' : 'fill-red-400'}`}>
          {carSpeed === 'slow' ? '25 mph' : '50 mph'}
        </text>
      </g>

      {/* Bump state */}
      <g transform="translate(160, 100)">
        <text x="40" y="0" textAnchor="middle" className="fill-gray-400 text-xs">
          Bump State:
        </text>
        <text x="40" y="18" textAnchor="middle" className={`text-sm font-bold ${bumpHeight > 10 ? 'fill-red-400' : 'fill-green-400'}`}>
          {bumpHeight > 10 ? 'SOLID BARRIER' : 'SOFT'}
        </text>
      </g>

      <text x="200" y="250" textAnchor="middle" className="fill-amber-400 text-sm font-medium">
        Non-Newtonian Smart Speed Bump
      </text>
    </svg>
  );
};

const ProtectiveGearGraphic: React.FC = () => {
  const [impactStrength, setImpactStrength] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImpactStrength(s => (s + 1) % 120);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const isImpact = impactStrength > 40 && impactStrength < 80;
  const materialHardness = isImpact ? 90 : 20;

  return (
    <svg viewBox="0 0 400 260" className="w-full h-64">
      <rect width="400" height="260" fill="#0f172a" />

      {/* Helmet */}
      <g transform="translate(100, 40)">
        <ellipse cx="50" cy="60" rx="50" ry="45" fill="#1e293b" stroke="#334155" strokeWidth="2" />

        {/* D3O layer */}
        <ellipse cx="50" cy="60" rx="42" ry="38" fill={isImpact ? '#ef4444' : '#f59e0b'} opacity="0.5" />

        {/* Molecular structure visualization */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const r = isImpact ? 20 : 25 + Math.sin(impactStrength * 0.1) * 3;
          return (
            <circle
              key={i}
              cx={50 + Math.cos(angle) * r}
              cy={60 + Math.sin(angle) * r * 0.8}
              r={isImpact ? 6 : 4}
              fill={isImpact ? '#dc2626' : '#fcd34d'}
            />
          );
        })}

        {/* Impact object */}
        {impactStrength < 60 && (
          <g transform={`translate(${-30 + impactStrength * 2}, 30)`}>
            <circle r="12" fill="#64748b" />
            <text x="0" y="4" textAnchor="middle" className="fill-white text-xs font-bold">!</text>
          </g>
        )}

        <text x="50" y="130" textAnchor="middle" className="fill-gray-400 text-xs">Sports Helmet</text>
      </g>

      {/* Knee pad */}
      <g transform="translate(230, 40)">
        <rect x="10" y="20" width="80" height="90" rx="15" fill="#1e293b" stroke="#334155" strokeWidth="2" />

        {/* D3O layer */}
        <rect x="18" y="28" width="64" height="74" rx="10" fill={isImpact ? '#ef4444' : '#f59e0b'} opacity="0.5" />

        {/* Honeycomb pattern */}
        {[...Array(6)].map((_, row) => (
          [...Array(3)].map((_, col) => (
            <path
              key={`${row}-${col}`}
              d={`M ${30 + col * 22} ${38 + row * 12}
                  l 8 -5 l 8 5 l 0 10 l -8 5 l -8 -5 z`}
              fill="none"
              stroke={isImpact ? '#dc2626' : '#fcd34d'}
              strokeWidth={isImpact ? 3 : 1.5}
            />
          ))
        ))}

        <text x="50" y="130" textAnchor="middle" className="fill-gray-400 text-xs">Knee Pad</text>
      </g>

      {/* Hardness meter */}
      <g transform="translate(150, 180)">
        <text x="50" y="0" textAnchor="middle" className="fill-gray-400 text-xs font-medium">Material Hardness</text>
        <rect x="0" y="10" width="100" height="20" rx="4" fill="#1e293b" />
        <rect x="2" y="12" width={materialHardness} height="16" rx="3" fill={isImpact ? '#ef4444' : '#22c55e'} />
        <text x="50" y="45" textAnchor="middle" className={`text-sm font-bold ${isImpact ? 'fill-red-400' : 'fill-green-400'}`}>
          {isImpact ? 'HARD (Impact!)' : 'SOFT (Flexible)'}
        </text>
      </g>

      <text x="200" y="250" textAnchor="middle" className="fill-amber-400 text-sm font-medium">
        D3O Smart Protection Technology
      </text>
    </svg>
  );
};

const IndustrialDamperGraphic: React.FC = () => {
  const [vibrationPhase, setVibrationPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVibrationPhase(p => (p + 1) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const vibrationAmplitude = 15 * Math.sin(vibrationPhase * 0.2);
  const damperCompression = Math.abs(vibrationAmplitude);
  const fluidViscosity = damperCompression > 10 ? 'high' : 'low';

  return (
    <svg viewBox="0 0 400 260" className="w-full h-64">
      <rect width="400" height="260" fill="#0f172a" />

      {/* Machine base */}
      <rect x="50" y="200" width="300" height="30" fill="#374151" rx="3" />

      {/* Damper housing */}
      <g transform={`translate(200, ${120 + vibrationAmplitude})`}>
        {/* Outer cylinder */}
        <rect x="-40" y="-50" width="80" height="100" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="2" />

        {/* Fluid chamber */}
        <rect x="-35" y="-45" width="70" height="90" rx="3" fill="#f59e0b" opacity="0.4" />

        {/* Piston */}
        <rect x="-30" y={-20 - damperCompression} width="60" height="15" fill="#64748b" rx="2" />

        {/* Fluid particles showing viscosity */}
        {[...Array(20)].map((_, i) => (
          <circle
            key={i}
            cx={-28 + (i % 5) * 14}
            cy={-35 + Math.floor(i / 5) * 20 + (fluidViscosity === 'high' ? 0 : Math.sin(vibrationPhase * 0.3 + i) * 3)}
            r={fluidViscosity === 'high' ? 5 : 3}
            fill={fluidViscosity === 'high' ? '#ef4444' : '#fcd34d'}
            opacity="0.8"
          />
        ))}

        {/* Piston rod */}
        <rect x="-8" y="-80" width="16" height="50" fill="#94a3b8" />
      </g>

      {/* Vibrating machinery */}
      <g transform={`translate(200, ${60 + vibrationAmplitude * 0.5})`}>
        <rect x="-60" y="-30" width="120" height="40" fill="#475569" rx="5" />
        <circle cx="-30" cy="0" r="15" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
        <circle cx="30" cy="0" r="15" fill="#1e293b" stroke="#64748b" strokeWidth="2" />

        {/* Rotation indicator */}
        <line
          x1="-30"
          y1="0"
          x2={-30 + Math.cos(vibrationPhase * 0.2) * 12}
          y2={Math.sin(vibrationPhase * 0.2) * 12}
          stroke="#22c55e"
          strokeWidth="2"
        />
        <line
          x1="30"
          y1="0"
          x2={30 + Math.cos(vibrationPhase * 0.2) * 12}
          y2={Math.sin(vibrationPhase * 0.2) * 12}
          stroke="#22c55e"
          strokeWidth="2"
        />
      </g>

      {/* Status display */}
      <g transform="translate(50, 50)">
        <rect width="90" height="50" rx="6" fill="#1e293b" stroke="#334155" />
        <text x="45" y="18" textAnchor="middle" className="fill-gray-400 text-xs">Fluid State:</text>
        <text x="45" y="38" textAnchor="middle" className={`text-sm font-bold ${fluidViscosity === 'high' ? 'fill-red-400' : 'fill-green-400'}`}>
          {fluidViscosity === 'high' ? 'STIFF' : 'FLOWING'}
        </text>
      </g>

      {/* Force meter */}
      <g transform="translate(300, 50)">
        <rect width="70" height="50" rx="6" fill="#1e293b" stroke="#334155" />
        <text x="35" y="18" textAnchor="middle" className="fill-gray-400 text-xs">Damping:</text>
        <text x="35" y="38" textAnchor="middle" className="fill-amber-400 text-sm font-bold">
          {Math.round(damperCompression * 6)}%
        </text>
      </g>

      <text x="200" y="250" textAnchor="middle" className="fill-amber-400 text-sm font-medium">
        STF Industrial Vibration Damper
      </text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function NonNewtonianArmorRenderer({ onEvent, savedState }: NonNewtonianArmorRendererProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(
    savedState?.testAnswers || Array(10).fill(-1)
  );
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [pokeSpeed, setPokeSpeed] = useState<'slow' | 'fast' | null>(null);
  const [pokeDepth, setPokeDepth] = useState(0);
  const [isPoking, setIsPoking] = useState(false);
  const [starchRatio, setStarchRatio] = useState(2); // Parts starch per 1 part water
  const [animPhase, setAnimPhase] = useState(0);

  // CRITICAL: Navigation debouncing refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ─── Helpers ───────────────────────────────────────────────────────────────
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

  // ─── Animation Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Poking animation
  useEffect(() => {
    if (!isPoking || !pokeSpeed) return;

    const targetDepth = pokeSpeed === 'slow' ? 80 : 10;
    const speed = pokeSpeed === 'slow' ? 2 : 15;

    const interval = setInterval(() => {
      setPokeDepth(d => {
        if (d < targetDepth) {
          return Math.min(d + speed, targetDepth);
        }
        return d;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPoking, pokeSpeed]);

  // Reset simulation on phase change
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      setPokeSpeed(null);
      setPokeDepth(0);
      setIsPoking(false);
    }
  }, [phase]);

  // ─── Render Helpers ────────────────────────────────────────────────────────
  const renderOobleckSimulation = () => {
    // Calculate viscosity based on shear rate (speed) and starch ratio
    const effectiveViscosity = pokeSpeed === 'fast' ? starchRatio * 30 : 5;
    const particleColor = pokeSpeed === 'fast' ? '#ef4444' : '#fcd34d';
    const stateLabel = pokeSpeed === 'fast' ? 'SOLID-LIKE' : 'LIQUID';

    return (
      <svg viewBox="0 0 400 280" className="w-full h-60 rounded-xl">
        <rect width="400" height="280" fill="#0f172a" />

        {/* Bowl */}
        <ellipse cx="200" cy="230" rx="150" ry="30" fill="#334155" />
        <path
          d="M50 120 Q50 230 200 230 Q350 230 350 120"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="3"
        />

        {/* Oobleck surface */}
        <ellipse cx="200" cy="120" rx="140" ry="25" fill="#f59e0b" opacity="0.8" />

        {/* Particles showing internal structure */}
        {[...Array(40)].map((_, i) => {
          const baseX = 80 + (i % 8) * 35;
          const baseY = 130 + Math.floor(i / 8) * 25;
          const offset = pokeSpeed === 'fast' ? 0 : Math.sin(animPhase + i) * 3;
          const isNearFinger = pokeDepth > 10 && Math.abs(baseX - 200) < 50 && baseY < 130 + pokeDepth;

          return (
            <circle
              key={i}
              cx={baseX + offset}
              cy={baseY + (isNearFinger && pokeSpeed === 'fast' ? -5 : offset)}
              r={isNearFinger && pokeSpeed === 'fast' ? 6 : 4}
              fill={isNearFinger ? particleColor : '#fcd34d'}
              opacity={0.7}
            />
          );
        })}

        {/* Finger */}
        {pokeSpeed && (
          <g transform={`translate(200, ${40 + pokeDepth})`}>
            <ellipse cx="0" cy="0" rx="15" ry="25" fill="#d4a574" />
            <ellipse cx="0" cy="-20" rx="12" ry="10" fill="#d4a574" />
            {/* Fingernail */}
            <ellipse cx="0" cy="-25" rx="8" ry="5" fill="#f5d0c5" />
          </g>
        )}

        {/* Force indicator */}
        {pokeSpeed && (
          <g transform="translate(50, 30)">
            <text className="fill-gray-400 text-xs">Force Applied:</text>
            <rect x="0" y="10" width="80" height="12" rx="3" fill="#1e293b" />
            <rect
              x="1"
              y="11"
              width={pokeSpeed === 'fast' ? 78 : 20}
              height="10"
              rx="2"
              fill={pokeSpeed === 'fast' ? '#ef4444' : '#22c55e'}
            />
            <text x="90" y="20" className={`text-xs font-bold ${pokeSpeed === 'fast' ? 'fill-red-400' : 'fill-green-400'}`}>
              {pokeSpeed === 'fast' ? 'HIGH' : 'LOW'}
            </text>
          </g>
        )}

        {/* State indicator */}
        {pokeSpeed && (
          <g transform="translate(280, 30)">
            <rect width="100" height="40" rx="8" fill={pokeSpeed === 'fast' ? '#ef444420' : '#22c55e20'} stroke={pokeSpeed === 'fast' ? '#ef4444' : '#22c55e'} />
            <text x="50" y="25" textAnchor="middle" className={`text-sm font-bold ${pokeSpeed === 'fast' ? 'fill-red-400' : 'fill-green-400'}`}>
              {stateLabel}
            </text>
          </g>
        )}

        {/* Penetration depth */}
        {pokeSpeed && (
          <text x="200" y="260" textAnchor="middle" className="fill-gray-400 text-xs">
            Penetration: {pokeDepth.toFixed(0)}mm
          </text>
        )}

        {/* Instructions */}
        {!pokeSpeed && (
          <text x="200" y="260" textAnchor="middle" className="fill-amber-400 text-sm">
            Choose how to poke the oobleck!
          </text>
        )}
      </svg>
    );
  };

  const renderTwistSimulation = () => {
    // More starch = more dramatic shear-thickening
    const effectiveThickening = pokeSpeed === 'fast' ? starchRatio * 20 : 0;
    const penetration = pokeSpeed ? (pokeSpeed === 'slow' ? 70 + (3 - starchRatio) * 20 : Math.max(5, 30 - starchRatio * 10)) : 0;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56 rounded-xl">
        <rect width="400" height="280" fill="#0f172a" />

        {/* Three bowls showing different ratios */}
        {[1, 2, 3].map((ratio, idx) => {
          const xOffset = 70 + idx * 120;
          const isActive = ratio === starchRatio;
          const color = ratio === 1 ? '#60a5fa' : ratio === 2 ? '#f59e0b' : '#ef4444';

          return (
            <g key={ratio} transform={`translate(${xOffset}, 100)`}>
              {/* Bowl */}
              <ellipse cx="0" cy="80" rx="50" ry="15" fill="#334155" />
              <path
                d="M-45 0 Q-45 80 0 80 Q45 80 45 0"
                fill="#1e293b"
                stroke={isActive ? color : '#475569'}
                strokeWidth={isActive ? 3 : 2}
              />

              {/* Oobleck with varying opacity based on starch content */}
              <ellipse cx="0" cy="0" rx="42" ry="12" fill={color} opacity={0.4 + ratio * 0.15} />

              {/* Particles */}
              {[...Array(12)].map((_, i) => (
                <circle
                  key={i}
                  cx={-25 + (i % 4) * 17 + (isActive && pokeSpeed !== 'fast' ? Math.sin(animPhase + i) * 2 : 0)}
                  cy={10 + Math.floor(i / 4) * 18}
                  r={ratio + 2}
                  fill={color}
                  opacity={0.6}
                />
              ))}

              {/* Finger if active */}
              {isActive && pokeSpeed && (
                <g transform={`translate(0, ${-60 + (pokeSpeed === 'slow' ? penetration : penetration)})`}>
                  <ellipse cx="0" cy="0" rx="10" ry="18" fill="#d4a574" />
                </g>
              )}

              {/* Label */}
              <text x="0" y="110" textAnchor="middle" className="fill-gray-400 text-xs">
                {ratio}:1 ratio
              </text>
              <text x="0" y="125" textAnchor="middle" className={`text-xs font-medium ${isActive ? 'fill-amber-400' : 'fill-gray-500'}`}>
                {ratio === 1 ? 'Runny' : ratio === 2 ? 'Standard' : 'Thick'}
              </text>
            </g>
          );
        })}

        {/* Instructions */}
        <text x="200" y="260" textAnchor="middle" className="fill-gray-400 text-sm">
          {pokeSpeed ? `${starchRatio}:1 ratio - Penetration: ${penetration.toFixed(0)}mm` : 'Select ratio and poke speed'}
        </text>
      </svg>
    );
  };

  const renderApplicationGraphic = (index: number) => {
    switch (index) {
      case 0: return <LiquidArmorGraphic />;
      case 1: return <SmartSpeedBumpGraphic />;
      case 2: return <ProtectiveGearGraphic />;
      case 3: return <IndustrialDamperGraphic />;
      default: return null;
    }
  };

  // ─── Phase Renderers ───────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 text-center">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-amber-400/80 text-sm font-medium tracking-wide uppercase">Material Science</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
        Liquid Armor?!
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        Can you walk on a liquid?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="text-6xl mb-4">🥣💪</div>
        <p className="text-gray-300 text-center leading-relaxed">
          What if a substance could be <span className="text-amber-400 font-semibold">liquid</span> one moment
          and <span className="text-red-400 font-semibold">solid</span> the next?
          Meet oobleck - the goo that defies your intuition!
        </p>
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('click'); nextPhase(); }}
        className="group px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center gap-2 text-white"
      >
        Let's Find Out!
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Discover the physics of non-Newtonian fluids
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-gray-400">
          You have a bowl of oobleck (cornstarch + water). What happens when you poke it?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {[
          { id: 'same', text: 'Same result whether slow or fast - it\'s just a liquid', icon: '💧' },
          { id: 'slow_resist', text: 'Slow poke meets resistance; fast poke goes right through', icon: '🐌' },
          { id: 'fast_resist', text: 'Fast poke meets resistance; slow poke sinks right in', icon: '⚡' },
          { id: 'always_solid', text: 'It\'s always solid - cornstarch makes it firm', icon: '🧱' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-amber-500 bg-amber-900/30 shadow-lg shadow-amber-500/20'
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
      <h2 className="text-2xl font-bold text-white text-center">Poke the Oobleck!</h2>

      {renderOobleckSimulation()}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound('click');
            setPokeSpeed('slow');
            setPokeDepth(0);
            setIsPoking(true);
          }}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            pokeSpeed === 'slow'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          🐌 Slow Poke
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound('click');
            setPokeSpeed('fast');
            setPokeDepth(0);
            setIsPoking(true);
          }}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            pokeSpeed === 'fast'
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          ⚡ Fast Punch
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound('click');
            setPokeSpeed(null);
            setPokeDepth(0);
            setIsPoking(false);
          }}
          className="px-6 py-3 rounded-xl font-medium bg-slate-700 text-gray-300 hover:bg-slate-600 transition-all"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-2xl p-5 max-w-xl mx-auto border border-amber-500/20">
        <p className="text-amber-300 text-sm text-center">
          <strong>Notice:</strong> Slow movements sink in like liquid.
          Fast impacts are resisted like a solid! The particles &quot;jam&quot; together.
        </p>
      </div>

      <div className="text-center">
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
          Understand Why →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Shear-Thickening Fluid</h2>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-xl mx-auto border border-slate-700">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">1</div>
            <div>
              <h3 className="text-white font-semibold">Particle Suspension</h3>
              <p className="text-gray-400 text-sm">Cornstarch particles float in water, able to slide past each other</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg">2</div>
            <div>
              <h3 className="text-white font-semibold">Slow Stress = Flow</h3>
              <p className="text-gray-400 text-sm">Gentle force allows particles time to rearrange and flow around obstacles</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold shadow-lg">3</div>
            <div>
              <h3 className="text-white font-semibold">Fast Stress = JAM!</h3>
              <p className="text-gray-400 text-sm">Sudden force doesn&apos;t give particles time to move - they lock together!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-900/30 rounded-2xl p-5 max-w-xl mx-auto text-center border border-amber-500/20">
        <p className="text-amber-300 font-semibold">Shear-Thickening</p>
        <p className="text-gray-400 text-sm mt-2">
          Viscosity <strong className="text-white">increases</strong> with shear rate.
          <br />
          The faster you stress it, the more it resists!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Your prediction: <span className={prediction === 'fast_resist' ? 'text-green-400 font-semibold' : 'text-red-400'}>
            {prediction === 'fast_resist' ? '✓ Correct!' : '✗ Not quite - fast poke meets resistance!'}
          </span>
        </p>
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="orange">
          What if we change the recipe? →
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
          What if we change the <span className="text-amber-400 font-semibold">ratio</span> of cornstarch to water?
          More starch? Less starch? How does that affect the &quot;armor&quot; effect?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {[
          { id: 'more_starch', text: 'More starch = stronger armor effect (harder to penetrate when punched)', icon: '💪' },
          { id: 'less_starch', text: 'Less starch = stronger armor effect (better particle jamming)', icon: '💧' },
          { id: 'same', text: 'Ratio doesn\'t matter - any mixture works the same', icon: '⚖️' },
          { id: 'middle', text: 'There\'s a perfect middle ratio - too much or too little reduces the effect', icon: '🎯' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-orange-500 bg-orange-900/30 shadow-lg shadow-orange-500/20'
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
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="orange">
            Test Different Ratios! →
          </PrimaryButton>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Ratio Experiment</h2>

      {renderTwistSimulation()}

      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <label className="text-gray-400 text-sm font-medium">Starch:Water Ratio</label>
          <div className="flex gap-3 mt-2">
            {[1, 2, 3].map((ratio) => (
              <button
                key={ratio}
                onMouseDown={(e) => {
                  e.preventDefault();
                  playSound('click');
                  setStarchRatio(ratio);
                  setPokeSpeed(null);
                  setPokeDepth(0);
                }}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  starchRatio === ratio
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {ratio}:1 {ratio === 1 ? '(Runny)' : ratio === 2 ? '(Standard)' : '(Thick)'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              playSound('click');
              setPokeSpeed('slow');
              setPokeDepth(0);
              setIsPoking(true);
            }}
            className={`px-5 py-2 rounded-xl font-medium transition-all ${
              pokeSpeed === 'slow'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            🐌 Slow
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              playSound('click');
              setPokeSpeed('fast');
              setPokeDepth(0);
              setIsPoking(true);
            }}
            className={`px-5 py-2 rounded-xl font-medium transition-all ${
              pokeSpeed === 'fast'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            ⚡ Fast
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-2xl p-5 max-w-xl mx-auto border border-orange-500/20">
        <p className="text-orange-300 text-sm text-center">
          <strong>Observation:</strong> More starch = stronger shear-thickening!
          Too little starch (1:1) and it&apos;s just watery.
          The ~2:1 ratio is the sweet spot for dramatic effects.
        </p>
      </div>

      <div className="text-center">
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="orange">
          Continue →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Perfect Recipe</h2>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-xl mx-auto border border-slate-700">
        <p className="text-gray-300 text-center mb-5">
          The ratio matters because:
        </p>

        <div className="space-y-4">
          <div className="bg-blue-900/40 rounded-xl p-4 border border-blue-500/20">
            <div className="text-blue-400 font-semibold">Too Little Starch (1:1)</div>
            <div className="text-gray-400 text-sm">Not enough particles to jam - acts like muddy water</div>
          </div>
          <div className="bg-amber-900/40 rounded-xl p-4 border border-amber-500/20">
            <div className="text-amber-400 font-semibold">Optimal Ratio (~2:1)</div>
            <div className="text-gray-400 text-sm">Perfect particle density for dramatic shear-thickening</div>
          </div>
          <div className="bg-red-900/40 rounded-xl p-4 border border-red-500/20">
            <div className="text-red-400 font-semibold">Too Much Starch (3:1+)</div>
            <div className="text-gray-400 text-sm">Already dense and paste-like, less dramatic response</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Your prediction: <span className={twistPrediction === 'more_starch' || twistPrediction === 'middle' ? 'text-green-400 font-semibold' : 'text-amber-400'}>
            {twistPrediction === 'more_starch' || twistPrediction === 'middle' ? '✓ On the right track!' : '✗ More starch generally means stronger effect (up to a point)'}
          </span>
        </p>
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="red">
          See Real Applications →
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
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : completedApps.has(index)
                ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30'
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
              {passed ? 'Excellent! You understand non-Newtonian fluids!' : 'Review the concepts and try again!'}
            </p>
          </div>
          <PrimaryButton
            onMouseDown={() => {
              playSound(passed ? 'complete' : 'click');
              if (passed) nextPhase();
              else setTestAnswers(Array(10).fill(-1));
            }}
            variant={passed ? 'amber' : 'orange'}
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
                <span className="text-amber-400">{qIndex + 1}.</span> {q.question}
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
        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Non-Newtonian Fluid Master!
        </h2>
      </div>
      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-2xl p-8 max-w-lg mx-auto border border-amber-500/20">
        <p className="text-amber-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-3 text-left">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Shear-thickening fluids increase viscosity under stress
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Particle jamming creates the &quot;solid&quot; response
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> The ratio of particles to liquid matters
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Real applications: armor, dampers, protective gear
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Non-Newtonian fluids don&apos;t follow Newton&apos;s viscosity law
          </li>
        </ul>
      </div>
      <p className="text-gray-400">
        You can now walk on oobleck... if you run fast enough! 🏃💨
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

  // ─── Main Render ───────────────────────────────────────────────────────────
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
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Non-Newtonian Fluids</span>
            <span className="text-sm text-slate-500 capitalize">{phase.replace('_', ' ')}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {PHASES.map((p, i) => {
              const currentIndex = PHASES.indexOf(phase);
              return (
                <div
                  key={p}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i <= currentIndex
                      ? 'bg-amber-500'
                      : 'bg-slate-700'
                  } ${i === currentIndex ? 'w-6' : 'w-2'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10 pt-20 p-6">
        {renderPhase()}
      </div>
    </div>
  );
}
