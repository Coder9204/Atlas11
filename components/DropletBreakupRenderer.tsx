'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES (GOLD STANDARD)
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'droplet_formed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface DropletBreakupRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

interface GameState {
  phase: number;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (NUMERIC PHASES)
// ═══════════════════════════════════════════════════════════════════════════
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

const TEST_QUESTIONS = [
  {
    question: 'What is the Rayleigh-Plateau instability?',
    options: [
      'A phenomenon where liquids freeze at low temperatures',
      'The tendency of a cylindrical liquid jet to break into droplets',
      'A type of chemical reaction in fluids',
      'The resistance of fluids to flow'
    ],
    correct: 1
  },
  {
    question: 'Why does a water stream from a faucet break into droplets?',
    options: [
      'Gravity pulls the water apart',
      'Air resistance breaks it up',
      'Surface tension drives the system toward minimum surface area (spheres)',
      'The water evaporates and separates'
    ],
    correct: 2
  },
  {
    question: 'Which shape has the minimum surface area for a given volume?',
    options: [
      'Cylinder',
      'Cube',
      'Sphere',
      'Cone'
    ],
    correct: 2
  },
  {
    question: 'What role does surface tension play in droplet formation?',
    options: [
      'It holds the stream together indefinitely',
      'It amplifies small perturbations until the stream breaks',
      'It has no effect on droplet formation',
      'It only affects viscous fluids'
    ],
    correct: 1
  },
  {
    question: 'What determines the typical size of droplets formed from a jet?',
    options: [
      'The speed of the fluid only',
      'The temperature of the fluid',
      'The wavelength of the instability, related to jet radius',
      'Random chance - all droplets are different sizes'
    ],
    correct: 2
  },
  {
    question: 'How does higher viscosity affect jet breakup?',
    options: [
      'It makes breakup happen faster',
      'It slows down breakup and can create "beads on a string" patterns',
      'It prevents any breakup from occurring',
      'It has no effect on breakup'
    ],
    correct: 1
  },
  {
    question: 'In inkjet printing, how are precise droplets created?',
    options: [
      'Random breakup of a continuous stream',
      'Controlled piezoelectric pulses that trigger the instability',
      'Heating the ink until it evaporates',
      'Magnetic fields that shape the ink'
    ],
    correct: 1
  },
  {
    question: 'What happens when a perturbation wavelength is shorter than the jet circumference?',
    options: [
      'The perturbation grows rapidly',
      'The perturbation is damped and the jet remains stable',
      'The jet immediately explodes',
      'The jet solidifies'
    ],
    correct: 1
  },
  {
    question: 'Why is droplet uniformity important in spray applications?',
    options: [
      'It makes the spray look more appealing',
      'Uniform droplets ensure consistent coverage and dosing',
      'It reduces the cost of the spray equipment',
      'It prevents the spray from evaporating'
    ],
    correct: 1
  },
  {
    question: 'What is atomization?',
    options: [
      'Converting liquid into individual atoms',
      'The process of breaking liquid into fine droplets or mist',
      'A nuclear reaction in fluids',
      'Removing air from liquids'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Inkjet Printing',
    description: 'Inkjet printers use piezoelectric elements to create pressure waves that trigger controlled Rayleigh-Plateau breakup, producing precisely sized droplets that land exactly where needed.',
    icon: '🖨️'
  },
  {
    title: 'Spray Nozzles',
    description: 'Agricultural sprayers and industrial coating systems engineer nozzle geometries to control droplet size distribution, optimizing coverage while minimizing drift.',
    icon: '💨'
  },
  {
    title: 'Pharmaceutical Manufacturing',
    description: 'Drug microencapsulation and spray drying use controlled jet breakup to create uniform drug particles for consistent dosing and drug delivery.',
    icon: '💊'
  },
  {
    title: 'Metal Powder Production',
    description: 'Gas atomization shoots molten metal through nozzles - the Rayleigh-Plateau instability breaks the stream into droplets that solidify into metal powder for 3D printing.',
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

    const sounds = {
      click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
      success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
      failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
      transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
      complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
    };

    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start();
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                index < currentIndex
                  ? 'bg-indigo-500 text-white'
                  : index === currentIndex
                  ? 'bg-indigo-400 text-white ring-4 ring-indigo-400/30'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
            {index < phases.length - 1 && (
              <div
                className={`w-6 h-1 mx-1 rounded ${
                  index < currentIndex ? 'bg-indigo-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-slate-400 capitalize">
        {currentPhase.replace('_', ' ')}
      </p>
    </div>
  );
};

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}> = ({ children, onMouseDown, variant = 'primary', disabled = false }) => {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onMouseDown(e);
      }}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
        variant === 'primary'
          ? disabled
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:scale-105 active:scale-95'
          : disabled
          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
          : 'bg-slate-700 text-white hover:bg-slate-600 hover:scale-105 active:scale-95'
      }`}
    >
      {children}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION GRAPHICS
// ═══════════════════════════════════════════════════════════════════════════
const InkjetGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 120);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="inkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="nozzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Inkjet Printer Head
      </text>

      {/* Print head housing */}
      <rect x="100" y="40" width="200" height="60" fill="#1e293b" rx="8" />

      {/* Ink chamber */}
      <rect x="120" y="50" width="60" height="40" fill="url(#inkGrad)" rx="4" />
      <text x="150" y="75" textAnchor="middle" className="fill-cyan-100 text-[9px]">
        Ink
      </text>

      {/* Piezoelectric element */}
      <rect x="190" y="55" width="40" height="30" fill="#f59e0b" rx="4" />
      <text x="210" y="75" textAnchor="middle" className="fill-amber-900 text-[8px] font-bold">
        PIEZO
      </text>

      {/* Nozzle */}
      <path d="M 250 70 L 260 70 L 265 100 L 245 100 Z" fill="url(#nozzleGrad)" />

      {/* Ink droplets firing */}
      {[0, 1, 2, 3, 4].map(i => {
        const dropletPhase = (animPhase + i * 25) % 120;
        if (dropletPhase > 80) return null;
        const y = 105 + dropletPhase * 1.8;
        const size = dropletPhase < 20 ? 3 + dropletPhase * 0.2 : 7;
        return (
          <circle
            key={i}
            cx={255}
            cy={y}
            r={size}
            fill="url(#inkGrad)"
            opacity={1 - dropletPhase / 100}
          />
        );
      })}

      {/* Paper surface */}
      <rect x="50" y="240" width="300" height="30" fill="#f5f5f4" rx="2" />
      <text x="200" y="260" textAnchor="middle" className="fill-slate-400 text-xs">
        Paper
      </text>

      {/* Ink dots on paper */}
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <circle
          key={i}
          cx={80 + i * 40}
          cy={250}
          r="8"
          fill="url(#inkGrad)"
          opacity={i < (animPhase / 20) ? 1 : 0.2}
        />
      ))}

      {/* Process diagram */}
      <g transform="translate(50, 120)">
        <rect width="120" height="100" fill="#1e293b" rx="8" />
        <text x="60" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Droplet Formation
        </text>

        {/* Step 1: Pressure pulse */}
        <g transform="translate(10, 30)">
          <rect x="0" y="0" width="30" height="20" fill="#475569" rx="2" />
          <rect x="5" y="5" width="20" height="10" fill="#0891b2" rx="2" />
          <text x="15" y="35" textAnchor="middle" className="fill-slate-500 text-[7px]">
            Pulse
          </text>
        </g>

        {/* Step 2: Jet forms */}
        <g transform="translate(45, 30)">
          <rect x="0" y="0" width="30" height="20" fill="#475569" rx="2" />
          <rect x="12" y="5" width="6" height="15" fill="#0891b2" rx="1" />
          <text x="15" y="35" textAnchor="middle" className="fill-slate-500 text-[7px]">
            Jet
          </text>
        </g>

        {/* Step 3: Breakup */}
        <g transform="translate(80, 30)">
          <rect x="0" y="0" width="30" height="20" fill="#475569" rx="2" />
          <circle cx="15" cy="8" r="5" fill="#0891b2" />
          <circle cx="15" cy="18" r="3" fill="#0891b2" opacity="0.6" />
          <text x="15" y="35" textAnchor="middle" className="fill-slate-500 text-[7px]">
            Droplet
          </text>
        </g>

        <text x="60" y="85" textAnchor="middle" className="fill-cyan-400 text-[9px]">
          Controlled R-P instability
        </text>
      </g>

      {/* Stats */}
      <g transform="translate(230, 120)">
        <rect width="120" height="100" fill="#1e293b" rx="8" />
        <text x="60" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Specifications
        </text>
        <text x="15" y="40" className="fill-slate-400 text-[9px]">
          Droplet size: ~20μm
        </text>
        <text x="15" y="55" className="fill-slate-400 text-[9px]">
          Frequency: ~20kHz
        </text>
        <text x="15" y="70" className="fill-slate-400 text-[9px]">
          Speed: 10m/s
        </text>
        <text x="15" y="85" className="fill-cyan-400 text-[9px]">
          Precision: ±1μm
        </text>
      </g>

      <text x="200" y="275" textAnchor="middle" className="fill-slate-400 text-[10px]">
        Piezoelectric pulses trigger precise droplet formation
      </text>
    </svg>
  );
};

const SprayNozzleGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <radialGradient id="dropletGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Agricultural Spray Nozzle
      </text>

      {/* Nozzle housing */}
      <g transform="translate(170, 40)">
        <rect x="0" y="0" width="60" height="40" fill="#64748b" rx="6" />
        <path d="M 20 40 L 10 70 L 50 70 L 40 40 Z" fill="#475569" />
        <ellipse cx="30" cy="70" rx="20" ry="5" fill="#334155" />
      </g>

      {/* Spray cone */}
      <path
        d="M 200 80 L 100 240 L 300 240 Z"
        fill="#0891b2"
        opacity="0.1"
      />

      {/* Spray droplets */}
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * Math.PI - Math.PI / 2;
        const spread = 80;
        const baseX = 200;
        const baseY = 80;
        const dist = 30 + ((animPhase * 2 + i * 7) % 160);
        const x = baseX + Math.sin(angle) * spread * (dist / 160);
        const y = baseY + dist;
        const size = 2 + Math.random() * 4;

        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={size}
            fill="url(#dropletGrad)"
            opacity={0.8 - dist / 200}
          />
        );
      })}

      {/* Ground/crop */}
      <rect x="50" y="240" width="300" height="30" fill="#166534" rx="4" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <path
          key={i}
          d={`M ${70 + i * 40} 240 Q ${80 + i * 40} 220, ${90 + i * 40} 240`}
          stroke="#22c55e"
          strokeWidth="3"
          fill="none"
        />
      ))}

      {/* Droplet size comparison */}
      <g transform="translate(30, 100)">
        <rect width="100" height="110" fill="#1e293b" rx="8" />
        <text x="50" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Droplet Sizes
        </text>

        {/* Fine */}
        <circle cx="25" cy="40" r="3" fill="#22d3ee" />
        <text x="45" y="44" className="fill-slate-400 text-[9px]">
          Fine: &lt;150μm
        </text>

        {/* Medium */}
        <circle cx="25" cy="60" r="6" fill="#22d3ee" />
        <text x="45" y="64" className="fill-slate-400 text-[9px]">
          Med: 150-300μm
        </text>

        {/* Coarse */}
        <circle cx="25" cy="85" r="10" fill="#22d3ee" />
        <text x="50" y="89" className="fill-slate-400 text-[9px]">
          Coarse: &gt;300μm
        </text>
      </g>

      {/* Considerations */}
      <g transform="translate(280, 100)">
        <rect width="100" height="110" fill="#1e293b" rx="8" />
        <text x="50" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Trade-offs
        </text>
        <text x="10" y="38" className="fill-green-400 text-[9px]">
          ✓ Fine: Coverage
        </text>
        <text x="10" y="52" className="fill-red-400 text-[9px]">
          ✗ Fine: Drift risk
        </text>
        <text x="10" y="72" className="fill-green-400 text-[9px]">
          ✓ Coarse: No drift
        </text>
        <text x="10" y="86" className="fill-red-400 text-[9px]">
          ✗ Coarse: Coverage
        </text>
      </g>

      <text x="200" y="275" textAnchor="middle" className="fill-slate-400 text-[10px]">
        Nozzle design controls droplet size for optimal crop coverage
      </text>
    </svg>
  );
};

const PharmaceuticalGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="drugGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="coatingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Drug Microencapsulation
      </text>

      {/* Spray drying chamber */}
      <g transform="translate(130, 40)">
        {/* Chamber */}
        <path
          d="M 0 0 L 140 0 L 140 140 L 100 180 L 40 180 L 0 140 Z"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Nozzle at top */}
        <rect x="55" y="-15" width="30" height="25" fill="#64748b" rx="4" />

        {/* Spray of drug solution */}
        {Array.from({ length: 20 }).map((_, i) => {
          const phase = (animPhase + i * 10) % 100;
          const x = 70 + Math.sin(i * 0.8) * phase * 0.5;
          const y = 20 + phase * 1.2;
          const r = phase < 50 ? 2 + phase * 0.05 : 4.5 - (phase - 50) * 0.03;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={Math.max(0.5, r)}
              fill="url(#drugGrad)"
              opacity={1 - phase / 100}
            />
          );
        })}

        {/* Hot air arrows */}
        <path d="M 10 70 L 30 70 L 25 65 M 30 70 L 25 75" stroke="#ef4444" strokeWidth="2" fill="none" />
        <path d="M 110 70 L 130 70 L 125 65 M 130 70 L 125 75" stroke="#ef4444" strokeWidth="2" fill="none" />
        <text x="70" y="165" textAnchor="middle" className="fill-red-400 text-[9px]">
          Hot Air Drying
        </text>

        {/* Collected powder */}
        <ellipse cx="70" cy="175" rx="25" ry="5" fill="url(#drugGrad)" opacity="0.5" />
      </g>

      {/* Microscopic view */}
      <g transform="translate(30, 75)">
        <rect width="90" height="130" fill="#1e293b" rx="8" />
        <text x="45" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Microspheres
        </text>

        {/* Drug microspheres */}
        {[
          { x: 30, y: 50, r: 15 },
          { x: 60, y: 55, r: 12 },
          { x: 45, y: 85, r: 18 },
          { x: 25, y: 100, r: 10 },
          { x: 65, y: 95, r: 14 }
        ].map((sphere, i) => (
          <g key={i}>
            <circle cx={sphere.x} cy={sphere.y} r={sphere.r} fill="url(#coatingGrad)" opacity="0.6" />
            <circle cx={sphere.x} cy={sphere.y} r={sphere.r * 0.7} fill="url(#drugGrad)" />
          </g>
        ))}

        <text x="45" y="125" textAnchor="middle" className="fill-slate-500 text-[8px]">
          Uniform size = uniform dose
        </text>
      </g>

      {/* Benefits */}
      <g transform="translate(290, 75)">
        <rect width="90" height="130" fill="#1e293b" rx="8" />
        <text x="45" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Benefits
        </text>
        <text x="10" y="40" className="fill-purple-400 text-[9px]">
          ✓ Precise dosing
        </text>
        <text x="10" y="55" className="fill-purple-400 text-[9px]">
          ✓ Timed release
        </text>
        <text x="10" y="70" className="fill-purple-400 text-[9px]">
          ✓ Protected drug
        </text>
        <text x="10" y="85" className="fill-purple-400 text-[9px]">
          ✓ Easy to swallow
        </text>
        <text x="10" y="100" className="fill-purple-400 text-[9px]">
          ✓ Taste masking
        </text>
        <text x="10" y="118" className="fill-slate-500 text-[8px]">
          Size: 1-1000μm
        </text>
      </g>

      {/* Process flow */}
      <g transform="translate(50, 220)">
        <text x="0" y="10" className="fill-slate-500 text-[9px]">
          Solution
        </text>
        <text x="50" y="10" className="fill-slate-400">
          →
        </text>
        <text x="70" y="10" className="fill-slate-500 text-[9px]">
          Atomize
        </text>
        <text x="130" y="10" className="fill-slate-400">
          →
        </text>
        <text x="150" y="10" className="fill-slate-500 text-[9px]">
          Dry
        </text>
        <text x="185" y="10" className="fill-slate-400">
          →
        </text>
        <text x="205" y="10" className="fill-slate-500 text-[9px]">
          Collect
        </text>
        <text x="265" y="10" className="fill-slate-400">
          →
        </text>
        <text x="285" y="10" className="fill-purple-400 text-[9px]">
          Microspheres
        </text>
      </g>

      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-[10px]">
        Controlled breakup creates uniform drug particles
      </text>
    </svg>
  );
};

const MetalPowderGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 150);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="moltenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <radialGradient id="hotDropGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f97316" />
        </radialGradient>
        <radialGradient id="coolDropGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Gas Atomization - Metal Powder Production
      </text>

      {/* Crucible with molten metal */}
      <g transform="translate(160, 35)">
        <path d="M 0 20 L 10 0 L 70 0 L 80 20 L 80 50 L 0 50 Z" fill="#475569" />
        <rect x="5" y="5" width="70" height="40" fill="url(#moltenGrad)" rx="4" />
        <text x="40" y="30" textAnchor="middle" className="fill-yellow-100 text-[9px] font-bold">
          Molten Metal
        </text>
        <text x="40" y="60" textAnchor="middle" className="fill-slate-400 text-[8px]">
          ~1500°C
        </text>
      </g>

      {/* Nozzle */}
      <g transform="translate(185, 70)">
        <rect x="0" y="0" width="30" height="20" fill="#334155" rx="2" />
        <path d="M 10 20 L 5 35 L 25 35 L 20 20 Z" fill="#475569" />
      </g>

      {/* Gas jets */}
      <g transform="translate(150, 100)">
        <path d="M 0 10 L 35 20" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <path d="M 100 10 L 65 20" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <text x="15" y="5" className="fill-blue-400 text-[8px]">
          High-pressure gas
        </text>
        <text x="60" y="5" className="fill-blue-400 text-[8px]">
          High-pressure gas
        </text>
      </g>

      {/* Atomization zone - droplets breaking up */}
      {Array.from({ length: 25 }).map((_, i) => {
        const phase = (animPhase + i * 6) % 150;
        const x = 200 + Math.sin(i * 0.7) * phase * 0.3;
        const y = 115 + phase * 0.8;
        const isCooled = phase > 80;
        const r = 2 + Math.sin(i) * 1.5;

        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill={isCooled ? 'url(#coolDropGrad)' : 'url(#hotDropGrad)'}
            opacity={1 - phase / 200}
          />
        );
      })}

      {/* Collection chamber */}
      <g transform="translate(130, 200)">
        <rect x="0" y="0" width="140" height="50" fill="#1e293b" rx="8" stroke="#334155" strokeWidth="2" />
        <text x="70" y="20" textAnchor="middle" className="fill-slate-400 text-[10px]">
          Collection Chamber
        </text>
        {/* Powder bed */}
        <ellipse cx="70" cy="38" rx="50" ry="8" fill="url(#metalGrad)" />
      </g>

      {/* Process stages */}
      <g transform="translate(30, 100)">
        <rect width="85" height="95" fill="#1e293b" rx="8" />
        <text x="42" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Stages
        </text>

        <circle cx="20" cy="38" r="8" fill="url(#moltenGrad)" />
        <text x="35" y="42" className="fill-slate-400 text-[8px]">
          Melt
        </text>

        <rect x="14" y="52" width="12" height="8" fill="url(#moltenGrad)" rx="2" />
        <text x="35" y="60" className="fill-slate-400 text-[8px]">
          Stream
        </text>

        <g transform="translate(15, 68)">
          {[0, 1, 2].map(j => (
            <circle key={j} cx={j * 8} cy="4" r="3" fill="url(#hotDropGrad)" />
          ))}
        </g>
        <text x="35" y="77" className="fill-slate-400 text-[8px]">
          Breakup
        </text>

        <g transform="translate(15, 83)">
          {[0, 1, 2].map(j => (
            <circle key={j} cx={j * 8} cy="4" r="3" fill="url(#coolDropGrad)" />
          ))}
        </g>
        <text x="35" y="92" className="fill-slate-400 text-[8px]">
          Solidify
        </text>
      </g>

      {/* Applications */}
      <g transform="translate(290, 100)">
        <rect width="85" height="95" fill="#1e293b" rx="8" />
        <text x="42" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Uses
        </text>
        <text x="10" y="38" className="fill-slate-400 text-[9px]">
          • 3D printing
        </text>
        <text x="10" y="53" className="fill-slate-400 text-[9px]">
          • Sintering
        </text>
        <text x="10" y="68" className="fill-slate-400 text-[9px]">
          • Coatings
        </text>
        <text x="10" y="83" className="fill-slate-400 text-[9px]">
          • MIM parts
        </text>
      </g>

      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-[10px]">
        Rayleigh-Plateau instability creates spherical metal powder
      </text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function DropletBreakupRenderer({ onGameEvent, currentPhase, onPhaseComplete }: DropletBreakupRendererProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [isMobile, setIsMobile] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [showTestResults, setShowTestResults] = useState(false);

  // Simulation state
  const [flowRate, setFlowRate] = useState(50);
  const [viscosity, setViscosity] = useState(1);
  const [animPhase, setAnimPhase] = useState(0);

  // CRITICAL: Navigation debouncing refs
  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // ─── Navigation (CRITICAL PATTERN) ─────────────────────────────────────────
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [onPhaseComplete, onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handlePrediction = useCallback((id: string) => {
    playSound('click');
    setPrediction(id);
  }, []);

  const handleTwistPrediction = useCallback((id: string) => {
    playSound('click');
    setTwistPrediction(id);
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    playSound(answerIndex === TEST_QUESTIONS[questionIndex].correct ? 'success' : 'failure');
  }, [testAnswers]);

  const handleAppComplete = useCallback((index: number) => {
    playSound('click');
    setCompletedApps(prev => new Set([...prev, index]));
  }, []);

  // ─── Report Event ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (onEvent) {
      onEvent({
        type: phase === 'mastery' ? 'completion' : 'interaction',
        phase,
        data: { prediction, twistPrediction, testAnswers: [...testAnswers], completedApps: [...completedApps] }
      });
    }
  }, [phase, prediction, twistPrediction, testAnswers, completedApps, onEvent]);

  // ─── Phase Renderers ───────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Premium Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-indigo-400/80 text-sm font-medium tracking-wide uppercase">Surface Tension Physics</span>
      </div>

      {/* Gradient Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Breaking Stream Mystery
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8">
        Why does a water stream spontaneously form droplets?
      </p>

      {/* Premium Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 max-w-lg border border-slate-700/50 shadow-2xl">
        <div className="text-6xl mb-6">🚿</div>
        <p className="text-xl text-slate-300 mb-6">
          Turn on a faucet and watch closely. The smooth water stream suddenly breaks into droplets. Why?
        </p>
        <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
          <p className="text-lg text-indigo-400 font-semibold mb-2">
            What invisible force causes this breakup?
          </p>
          <p className="text-slate-400">
            Discover the Rayleigh-Plateau instability!
          </p>
        </div>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(e); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg font-semibold rounded-2xl hover:from-indigo-400 hover:to-purple-400 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          Find Out Why
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="text-slate-500 text-sm mt-4">
        Tap to explore droplet formation
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        Surface tension wants to minimize surface area. Which shape has the minimum surface area for a given volume?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'cylinder', label: 'Cylinder - like the original stream' },
          { id: 'cube', label: 'Cube - simple geometry' },
          { id: 'sphere', label: 'Sphere - perfectly round' },
          { id: 'cone', label: 'Cone - pointed shape' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              prediction === option.id
                ? 'bg-indigo-500/20 border-2 border-indigo-500 text-white'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase} disabled={!prediction}>
          Test Your Prediction →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderPlay = () => {
    const breakupSpeed = flowRate / 25;
    const dropletSpacing = 30 - flowRate / 5;

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Watch the Stream Break Up
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 250" className="w-full h-56">
            <defs>
              <linearGradient id="streamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <radialGradient id="dropGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </radialGradient>
            </defs>

            <rect width="400" height="250" fill="#0f172a" />

            {/* Faucet */}
            <rect x="175" y="10" width="50" height="30" fill="#64748b" rx="4" />
            <rect x="190" y="35" width="20" height="15" fill="#475569" />

            {/* Continuous stream (top) */}
            <rect
              x="195"
              y="50"
              width="10"
              height="40"
              fill="url(#streamGrad)"
              rx="5"
            />

            {/* Necking region (middle) */}
            <path
              d={`M 195 90
                  Q 197 ${100 + Math.sin(animPhase * 0.15) * 3}, 195 110
                  Q 193 ${120 - Math.sin(animPhase * 0.15) * 3}, 195 130
                  L 205 130
                  Q 207 ${120 + Math.sin(animPhase * 0.15) * 3}, 205 110
                  Q 203 ${100 - Math.sin(animPhase * 0.15) * 3}, 205 90
                  Z`}
              fill="url(#streamGrad)"
            />

            {/* Droplets (bottom) */}
            {[0, 1, 2, 3, 4].map(i => {
              const baseY = 140 + i * dropletSpacing;
              const y = baseY + (animPhase * breakupSpeed) % dropletSpacing;
              if (y > 230) return null;
              return (
                <circle
                  key={i}
                  cx={200}
                  cy={y}
                  r={8}
                  fill="url(#dropGrad)"
                />
              );
            })}

            {/* Labels */}
            <g transform="translate(250, 50)">
              <text x="0" y="10" className="fill-slate-400 text-xs">← Stable stream</text>
              <text x="0" y="70" className="fill-slate-400 text-xs">← Necking region</text>
              <text x="0" y="120" className="fill-slate-400 text-xs">← Droplets form</text>
            </g>

            {/* Instability wave visualization */}
            <g transform="translate(50, 70)">
              <rect width="100" height="80" fill="#1e293b" rx="8" />
              <text x="50" y="18" textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
                Surface Perturbation
              </text>

              {/* Wave growing */}
              <path
                d={`M 10 50 ${Array.from({ length: 8 }).map((_, i) =>
                  `Q ${15 + i * 11} ${50 + Math.sin(i + animPhase * 0.1) * (5 + i * 2)}, ${20 + i * 11} 50`
                ).join(' ')}`}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />

              <text x="50" y="72" textAnchor="middle" className="fill-indigo-400 text-[9px]">
                Small waves grow!
              </text>
            </g>

            {/* Surface area comparison */}
            <g transform="translate(50, 160)">
              <rect width="100" height="70" fill="#1e293b" rx="8" />
              <text x="50" y="15" textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
                Surface Area
              </text>

              {/* Cylinder */}
              <rect x="15" y="25" width="25" height="15" fill="#64748b" rx="2" />
              <text x="27" y="55" textAnchor="middle" className="fill-slate-500 text-[8px]">
                Cylinder
              </text>

              {/* Arrow */}
              <path d="M 45 32 L 55 32 L 52 28 M 55 32 L 52 36" stroke="#22c55e" strokeWidth="1.5" fill="none" />

              {/* Spheres */}
              <circle cx="70" cy="28" r="8" fill="#3b82f6" />
              <circle cx="85" cy="35" r="6" fill="#3b82f6" />
              <text x="77" y="55" textAnchor="middle" className="fill-blue-400 text-[8px]">
                Spheres
              </text>
              <text x="50" y="66" textAnchor="middle" className="fill-green-400 text-[8px]">
                Less area!
              </text>
            </g>
          </svg>
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 mb-2 text-center">
            Flow Rate: {flowRate}%
          </label>
          <input
            type="range"
            min="20"
            max="100"
            value={flowRate}
            onChange={(e) => setFlowRate(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-center text-sm text-slate-500 mt-2">
            {flowRate < 40 ? 'Slow flow - droplets form close together' :
             flowRate < 70 ? 'Medium flow - classic breakup pattern' :
             'Fast flow - longer intact stream before breakup'}
          </p>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onMouseDown={nextPhase}>
            Understand Why →
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        The Science Revealed
      </h2>

      {prediction === 'sphere' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Excellent prediction!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: Spheres have minimum surface area!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-indigo-400 mb-2">🔬 Rayleigh-Plateau Instability</h3>
          <p className="text-slate-300">
            A cylindrical fluid column is inherently <strong>unstable</strong>. Any tiny perturbation
            will grow because surface tension pulls the fluid toward a shape with less surface area.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2">📐 The Mathematics</h3>
          <p className="text-slate-300">
            For the same volume, a sphere has ~15% less surface area than a cylinder.
            The most unstable wavelength is <strong>λ ≈ 9r</strong> (about 9× the jet radius).
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">💧 Why Spheres Win</h3>
          <p className="text-slate-300">
            Surface tension acts like a stretched membrane trying to contract.
            Spheres minimize surface area, so that&apos;s what the fluid naturally becomes!
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase}>
          Explore a Twist →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        🔄 The Twist: Viscous Fluids
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        What happens when we use a thick, viscous fluid like honey instead of water?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'faster', label: 'Breakup happens much faster' },
          { id: 'same', label: 'Breakup happens exactly the same way' },
          { id: 'slower', label: 'Breakup is slower, creating "beads on a string"' },
          { id: 'never', label: 'No breakup ever occurs - it stays as a stream' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleTwistPrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              twistPrediction === option.id
                ? 'bg-purple-500/20 border-2 border-purple-500 text-white'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase} disabled={!twistPrediction}>
          See What Happens →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPlay = () => {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Water vs Honey Breakup
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 250" className="w-full h-56">
            <defs>
              <linearGradient id="waterStreamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="honeyStreamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>

            <rect width="400" height="250" fill="#0f172a" />

            {/* Water side */}
            <g transform="translate(50, 0)">
              <text x="70" y="25" textAnchor="middle" className="fill-blue-400 text-sm font-bold">
                Water (Low η)
              </text>

              {/* Nozzle */}
              <rect x="55" y="35" width="30" height="15" fill="#64748b" rx="2" />

              {/* Clean breakup into spheres */}
              <rect x="65" y="50" width="10" height="30" fill="url(#waterStreamGrad)" rx="5" />

              {/* Quick breakup */}
              {[0, 1, 2, 3, 4, 5].map(i => {
                const y = 90 + i * 25 + (animPhase % 25);
                if (y > 220) return null;
                return (
                  <circle
                    key={i}
                    cx={70}
                    cy={y}
                    r={8}
                    fill="url(#waterStreamGrad)"
                  />
                );
              })}

              <text x="70" y="240" textAnchor="middle" className="fill-blue-300 text-xs">
                Clean, fast breakup
              </text>
            </g>

            {/* Honey side */}
            <g transform="translate(210, 0)">
              <text x="70" y="25" textAnchor="middle" className="fill-amber-400 text-sm font-bold">
                Honey (High η)
              </text>

              {/* Nozzle */}
              <rect x="55" y="35" width="30" height="15" fill="#64748b" rx="2" />

              {/* Beads on a string pattern */}
              <rect x="67" y="50" width="6" height={120 + Math.sin(animPhase * 0.05) * 10} fill="url(#honeyStreamGrad)" rx="3" />

              {/* Beads forming on the string */}
              {[0, 1, 2, 3].map(i => {
                const y = 80 + i * 35 + (animPhase * 0.3 % 35);
                const size = 6 + Math.sin(animPhase * 0.1 + i) * 3;
                if (y > 180) return null;
                return (
                  <circle
                    key={i}
                    cx={70}
                    cy={y}
                    r={size}
                    fill="url(#honeyStreamGrad)"
                  />
                );
              })}

              {/* Eventual droplet */}
              <circle
                cx={70}
                cy={200 + (animPhase % 40)}
                r={10}
                fill="url(#honeyStreamGrad)"
                opacity={animPhase % 80 > 40 ? 1 : 0}
              />

              <text x="70" y="240" textAnchor="middle" className="fill-amber-300 text-xs">
                &quot;Beads on a string&quot;
              </text>
            </g>

            {/* Explanation */}
            <g transform="translate(145, 80)">
              <rect width="110" height="80" fill="#1e293b" rx="8" />
              <text x="55" y="20" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
                Why the Difference?
              </text>
              <text x="10" y="40" className="fill-slate-400 text-[9px]">
                Viscosity resists
              </text>
              <text x="10" y="52" className="fill-slate-400 text-[9px]">
                the pinch-off,
              </text>
              <text x="10" y="64" className="fill-slate-400 text-[9px]">
                creating thin
              </text>
              <text x="10" y="76" className="fill-purple-400 text-[9px]">
                connecting threads
              </text>
            </g>
          </svg>
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 mb-2 text-center">
            Viscosity: {viscosity === 1 ? 'Water (1 cP)' : viscosity === 5 ? 'Oil (~100 cP)' : 'Honey (~10,000 cP)'}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={viscosity}
            onChange={(e) => setViscosity(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500/10 rounded-xl p-3 text-center">
            <p className="text-blue-400 font-semibold">Low Viscosity</p>
            <p className="text-sm text-slate-400">Fast, clean breakup</p>
            <p className="text-xs text-slate-500">Uniform droplets</p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <p className="text-amber-400 font-semibold">High Viscosity</p>
            <p className="text-sm text-slate-400">Slow, complex breakup</p>
            <p className="text-xs text-slate-500">Satellite droplets</p>
          </div>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onMouseDown={nextPhase}>
            Learn More →
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Viscosity&apos;s Role in Breakup
      </h2>

      {twistPrediction === 'slower' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Exactly right!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: High viscosity creates &quot;beads on a string&quot;!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">🍯 The Honey Effect</h3>
          <p className="text-slate-300">
            Viscosity <strong>resists</strong> the pinch-off. The fluid can&apos;t thin fast enough,
            creating long thin threads between forming droplets - the &quot;beads on a string&quot; pattern.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2">🧵 Satellite Droplets</h3>
          <p className="text-slate-300">
            Those thin threads eventually break too, creating small &quot;satellite&quot; droplets
            between the main ones. This is often undesirable in industrial applications.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-indigo-400 mb-2">📊 The Ohnesorge Number</h3>
          <p className="text-slate-300">
            Oh = η / √(ρσr) compares viscous to surface tension forces.
            Low Oh → quick breakup. High Oh → slow, complex breakup with filaments.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase}>
          Real-World Applications →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const appGraphics = [
      <InkjetGraphic key="inkjet" />,
      <SprayNozzleGraphic key="spray" />,
      <PharmaceuticalGraphic key="pharma" />,
      <MetalPowderGraphic key="metal" />
    ];

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Real-World Applications
        </h2>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TRANSFER_APPS.map((app, index) => (
            <button
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppTab(index);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeAppTab === index
                  ? 'bg-indigo-500 text-white'
                  : completedApps.has(index)
                  ? 'bg-green-600/20 text-green-400 border border-green-600'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{app.icon}</span>
              <span className="text-sm font-medium">{app.title}</span>
              {completedApps.has(index) && <span>✓</span>}
            </button>
          ))}
        </div>

        {/* Active application content */}
        <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{TRANSFER_APPS[activeAppTab].icon}</span>
            <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
          </div>

          <p className="text-slate-300 mb-4">{TRANSFER_APPS[activeAppTab].description}</p>

          {/* Application graphic */}
          <div className="bg-slate-900 rounded-xl overflow-hidden mb-4">
            {appGraphics[activeAppTab]}
          </div>

          {!completedApps.has(activeAppTab) && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleAppComplete(activeAppTab);
              }}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
            >
              Mark as Understood ✓
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="text-center mb-6">
          <p className="text-slate-400">
            Completed: {completedApps.size} / {TRANSFER_APPS.length}
          </p>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedApps.size / TRANSFER_APPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <PrimaryButton
            onMouseDown={nextPhase}
            disabled={completedApps.size < TRANSFER_APPS.length}
          >
            {completedApps.size < TRANSFER_APPS.length
              ? `Complete all ${TRANSFER_APPS.length} applications to continue`
              : 'Take the Knowledge Test →'}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const score = testAnswers.reduce((acc, answer, index) =>
      answer === TEST_QUESTIONS[index].correct ? acc + 1 : acc, 0
    );
    const allAnswered = testAnswers.every(a => a !== -1);
    const passed = score >= 7;

    if (showTestResults) {
      return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Test Results
          </h2>

          <div className={`text-center p-8 rounded-xl mb-6 ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
            <p className={`text-3xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {score} / {TEST_QUESTIONS.length}
            </p>
            <p className="text-slate-300 mt-2">
              {passed ? 'Congratulations! You passed!' : 'Keep learning! You need 70% to pass.'}
            </p>
          </div>

          {/* Review answers */}
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {TEST_QUESTIONS.map((q, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  testAnswers[index] === q.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <p className="text-sm text-slate-300">Q{index + 1}: {q.question}</p>
                <p className={`text-xs mt-1 ${
                  testAnswers[index] === q.correct ? 'text-green-400' : 'text-red-400'
                }`}>
                  {testAnswers[index] === q.correct ? '✓ Correct' : `✗ Correct: ${q.options[q.correct]}`}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            {passed ? (
              <PrimaryButton onMouseDown={nextPhase}>
                Complete Mastery →
              </PrimaryButton>
            ) : (
              <PrimaryButton onMouseDown={() => {
                setTestAnswers(Array(10).fill(-1));
                setShowTestResults(false);
              }}>
                Try Again
              </PrimaryButton>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          Knowledge Test
        </h2>
        <p className="text-slate-400 text-center mb-6">
          Answer all 10 questions (70% to pass)
        </p>

        <div className="space-y-6 max-h-96 overflow-y-auto mb-6">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? testAnswers[qIndex] === q.correct
                          ? 'bg-green-500/20 border border-green-500 text-green-300'
                          : 'bg-red-500/20 border border-red-500 text-red-300'
                        : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <PrimaryButton
            onMouseDown={() => setShowTestResults(true)}
            disabled={!allAnswered}
          >
            {allAnswered ? 'Submit Answers' : `Answer all questions (${testAnswers.filter(a => a !== -1).length}/${TEST_QUESTIONS.length})`}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
      <div className="text-7xl mb-6">🏆</div>
      <h1 className="text-3xl font-bold text-white mb-4">
        Rayleigh-Plateau Master!
      </h1>
      <p className="text-xl text-slate-300 mb-6">
        You now understand why liquid streams break into droplets!
      </p>

      <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-indigo-400 mb-4">Key Takeaways</h3>
        <ul className="text-left text-slate-300 space-y-2">
          <li>• Surface tension drives breakup toward minimum surface area</li>
          <li>• Spheres have minimum surface area for a given volume</li>
          <li>• Viscosity slows breakup and creates complex patterns</li>
          <li>• This instability powers inkjets, sprays, and manufacturing</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-indigo-400">4</p>
          <p className="text-sm text-slate-400">Applications Mastered</p>
        </div>
        <div className="bg-purple-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-purple-400">10</p>
          <p className="text-sm text-slate-400">Questions Completed</p>
        </div>
      </div>

      <p className="text-slate-400 text-sm">
        Next time you see a water stream breaking up, you&apos;ll know the physics!
      </p>
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />

      {/* Premium Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Droplet Breakup</span>
          <div className="flex gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-indigo-400 w-6' : phase > p ? 'bg-indigo-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 pt-16 pb-8 px-6">
        <div className="max-w-2xl mx-auto">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
