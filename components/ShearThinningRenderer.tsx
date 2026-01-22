'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
// Gold standard types
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface ShearThinningRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TEST_QUESTIONS = [
  {
    question: 'What happens to a shear-thinning fluid when you apply stress?',
    options: [
      'It becomes thicker and more resistant',
      'It becomes thinner and flows more easily',
      'It remains unchanged',
      'It solidifies completely'
    ],
    correct: 1
  },
  {
    question: 'Why does ketchup often refuse to flow when you first tip the bottle?',
    options: [
      'It is frozen inside the bottle',
      'The cap creates a vacuum seal',
      'At rest, it has high viscosity and behaves like a thick gel',
      'The bottle opening is too small'
    ],
    correct: 2
  },
  {
    question: 'What molecular mechanism causes shear-thinning behavior?',
    options: [
      'Molecules freeze and lock together under stress',
      'Polymer chains or particles align and untangle under shear',
      'Heat from friction melts the fluid',
      'Air bubbles form and reduce viscosity'
    ],
    correct: 1
  },
  {
    question: 'Which of these is NOT a shear-thinning fluid?',
    options: [
      'Ketchup',
      'Paint',
      'Cornstarch and water (oobleck)',
      'Toothpaste'
    ],
    correct: 2
  },
  {
    question: 'Why is shear-thinning important for paint application?',
    options: [
      'It makes paint dry faster',
      'It allows paint to flow smoothly when brushed but stay put when done',
      'It makes paint more colorful',
      'It prevents paint from being washed off'
    ],
    correct: 1
  },
  {
    question: 'How does blood demonstrate shear-thinning properties?',
    options: [
      'Blood clots immediately when stressed',
      'Blood cells freeze under pressure',
      'Red blood cells deform and align to flow through narrow capillaries',
      'Blood evaporates when sheared'
    ],
    correct: 2
  },
  {
    question: 'What would happen if toothpaste was NOT shear-thinning?',
    options: [
      'It would be easier to squeeze out',
      'It might drip off your brush before you can use it',
      'It would taste different',
      'It would clean teeth better'
    ],
    correct: 1
  },
  {
    question: 'At what point does a shear-thinning fluid have its HIGHEST viscosity?',
    options: [
      'When being stirred rapidly',
      'When being poured quickly',
      'When at rest with no applied stress',
      'When heated to high temperatures'
    ],
    correct: 2
  },
  {
    question: 'Why is shear-thinning behavior valuable in 3D printing inks?',
    options: [
      'It makes the ink more colorful',
      'It allows precise extrusion through nozzles while maintaining shape afterward',
      'It prevents the printer from jamming',
      'It makes printing faster'
    ],
    correct: 1
  },
  {
    question: 'What technique helps get ketchup out of a glass bottle?',
    options: [
      'Heating the bottle to melt the ketchup',
      'Shaking or tapping to apply shear stress and reduce viscosity',
      'Squeezing the glass bottle',
      'Leaving the bottle upside down for hours'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Paint Technology',
    description: 'Paint flows smoothly when brushed (high shear) but stays put without dripping when left alone (low shear). This allows for even coverage without runs.',
    icon: '🎨'
  },
  {
    title: 'Blood Circulation',
    description: 'Blood is shear-thinning, allowing it to flow easily through narrow capillaries. Red blood cells deform and align under shear, reducing resistance.',
    icon: '❤️'
  },
  {
    title: 'Toothpaste',
    description: 'Toothpaste stays on your brush (high viscosity at rest) but spreads easily when you brush your teeth (low viscosity under shear).',
    icon: '🦷'
  },
  {
    title: '3D Printing Inks',
    description: 'Special inks flow precisely through fine nozzles under pressure but maintain their shape once deposited, enabling complex 3D structures.',
    icon: '🖨️'
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
const ProgressIndicator: React.FC<{ phases: number[]; currentPhase: number }> = ({ phases, currentPhase }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-white/10 p-3 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-400">Shear-Thinning</span>
        <span className="text-sm text-slate-500">{phaseLabels[currentPhase]}</span>
      </div>
      {/* Premium phase dots */}
      <div className="flex items-center justify-center gap-1.5">
        {phases.map((phase, index) => (
          <div
            key={phase}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentPhase
                ? 'bg-red-400 w-6 shadow-lg shadow-red-400/30'
                : index < currentPhase
                  ? 'bg-emerald-500 w-2'
                  : 'bg-slate-700 w-2'
            }`}
          />
        ))}
      </div>
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
            : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 hover:scale-105 active:scale-95'
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
const PaintGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const brushX = 100 + (animPhase < 100 ? animPhase * 2 : (200 - animPhase) * 2);
  const paintFlow = animPhase < 100 ? 0.8 : 0.2;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="paintGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Wall surface */}
      <rect x="50" y="140" width="300" height="100" fill="url(#wallGrad)" rx="4" />

      {/* Paint layer - thinner where brush is (shear applied) */}
      <rect
        x="50"
        y="135"
        width={brushX - 50}
        height="8"
        fill="url(#paintGrad)"
        opacity="0.9"
      />

      {/* Paint brush */}
      <g transform={`translate(${brushX}, 100)`}>
        {/* Handle */}
        <rect x="-5" y="-60" width="10" height="50" fill="#8B4513" rx="2" />
        {/* Ferrule */}
        <rect x="-8" y="-15" width="16" height="15" fill="#C0C0C0" />
        {/* Bristles */}
        <rect x="-12" y="0" width="24" height="35" fill="#F5DEB3" rx="2" />
        {/* Paint on bristles */}
        <rect x="-12" y="20" width="24" height="15" fill="url(#paintGrad)" rx="2" opacity={paintFlow} />
      </g>

      {/* Labels */}
      <text x="200" y="35" textAnchor="middle" className="fill-white text-sm font-bold">
        Paint Application
      </text>

      {/* Viscosity indicator */}
      <rect x="320" y="50" width="60" height="80" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />
      <text x="350" y="70" textAnchor="middle" className="fill-slate-400 text-xs">
        Viscosity
      </text>
      <rect x="335" y="80" width="30" height="40" fill="#334155" rx="2" />
      <rect
        x="337"
        y={120 - (animPhase < 100 ? 35 : 15)}
        width="26"
        height={animPhase < 100 ? 35 : 15}
        fill="url(#paintGrad)"
        rx="2"
      />

      {/* Explanation */}
      <text x="200" y="265" textAnchor="middle" className="fill-slate-400 text-xs">
        Brush shear → low viscosity → smooth flow
      </text>
    </svg>
  );
};

const BloodGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 120);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Blood cells moving through vessel
  const cellPositions = [0, 30, 60, 90].map(offset =>
    ((animPhase * 3 + offset) % 280) + 60
  );

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="vesselGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#fecaca" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <radialGradient id="cellGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="30" textAnchor="middle" className="fill-white text-sm font-bold">
        Blood Flow in Capillaries
      </text>

      {/* Wide vessel (artery) */}
      <rect x="30" y="60" width="120" height="50" fill="url(#vesselGrad)" rx="25" />
      <text x="90" y="90" textAnchor="middle" className="fill-slate-900 text-xs font-semibold">
        Artery
      </text>

      {/* Narrow capillary */}
      <rect x="150" y="75" width="150" height="20" fill="#fecaca" rx="10" />
      <text x="225" y="115" textAnchor="middle" className="fill-red-400 text-xs">
        Capillary
      </text>

      {/* Wide vessel (vein) */}
      <rect x="300" y="60" width="70" height="50" fill="url(#vesselGrad)" rx="25" />
      <text x="335" y="90" textAnchor="middle" className="fill-slate-900 text-xs font-semibold">
        Vein
      </text>

      {/* Red blood cells - round in wide vessels, elongated in capillary */}
      {cellPositions.map((x, i) => {
        const inCapillary = x > 150 && x < 300;
        const cellWidth = inCapillary ? 20 : 14;
        const cellHeight = inCapillary ? 10 : 14;
        const yPos = inCapillary ? 80 : 78;

        return (
          <ellipse
            key={i}
            cx={x}
            cy={yPos + (i % 2) * 6}
            rx={cellWidth / 2}
            ry={cellHeight / 2}
            fill="url(#cellGrad)"
            stroke="#991b1b"
            strokeWidth="1"
          />
        );
      })}

      {/* Diagram showing cell deformation */}
      <g transform="translate(60, 150)">
        <rect width="130" height="90" fill="#1e293b" rx="8" />
        <text x="65" y="20" textAnchor="middle" className="fill-slate-400 text-xs font-semibold">
          Cell Shape Change
        </text>

        {/* Normal cell */}
        <ellipse cx="35" cy="55" rx="15" ry="15" fill="url(#cellGrad)" stroke="#991b1b" />
        <text x="35" y="85" textAnchor="middle" className="fill-slate-500 text-xs">
          At rest
        </text>

        {/* Arrow */}
        <path d="M 60 55 L 75 55 L 72 50 M 75 55 L 72 60" stroke="#94a3b8" strokeWidth="2" fill="none" />

        {/* Deformed cell */}
        <ellipse cx="95" cy="55" rx="22" ry="10" fill="url(#cellGrad)" stroke="#991b1b" />
        <text x="95" y="85" textAnchor="middle" className="fill-slate-500 text-xs">
          Sheared
        </text>
      </g>

      {/* Viscosity graph */}
      <g transform="translate(220, 150)">
        <rect width="140" height="90" fill="#1e293b" rx="8" />
        <text x="70" y="20" textAnchor="middle" className="fill-slate-400 text-xs font-semibold">
          Blood Viscosity
        </text>

        {/* Axes */}
        <line x1="25" y1="70" x2="120" y2="70" stroke="#475569" strokeWidth="1" />
        <line x1="25" y1="30" x2="25" y2="70" stroke="#475569" strokeWidth="1" />

        {/* Curve showing decreasing viscosity */}
        <path d="M 25 35 Q 50 38, 70 50 Q 90 58, 115 62" stroke="#ef4444" strokeWidth="2" fill="none" />

        <text x="75" y="82" textAnchor="middle" className="fill-slate-500 text-[10px]">
          Shear Rate →
        </text>
        <text x="15" y="52" textAnchor="middle" className="fill-slate-500 text-[10px]" transform="rotate(-90, 15, 52)">
          η
        </text>
      </g>

      {/* Bottom label */}
      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        Cells deform under shear → easier flow through narrow vessels
      </text>
    </svg>
  );
};

const ToothpasteGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);
  const [squeezing, setSqueezing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 150);
      if (animPhase === 0) setSqueezing(true);
      if (animPhase === 75) setSqueezing(false);
    }, 50);
    return () => clearInterval(interval);
  }, [animPhase]);

  const pasteLength = squeezing ? Math.min(animPhase * 1.5, 80) : 0;
  const tubeSquish = squeezing ? 5 : 0;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="pasteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="tubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="30" textAnchor="middle" className="fill-white text-sm font-bold">
        Toothpaste Flow
      </text>

      {/* Toothpaste tube */}
      <g transform="translate(50, 80)">
        {/* Tube body */}
        <ellipse cx="60" cy="50" rx={55 - tubeSquish} ry={35 + tubeSquish} fill="url(#tubeGrad)" />

        {/* Cap end */}
        <rect x="105" y="35" width="40" height="30" fill="#334155" />
        <rect x="140" y="40" width="15" height="20" fill="#1e293b" rx="3" />

        {/* Nozzle */}
        <polygon points="155,45 155,55 175,52 175,48" fill="#64748b" />

        {/* Paste coming out */}
        {squeezing && (
          <rect x="175" y="46" width={pasteLength} height="8" fill="url(#pasteGrad)" rx="4" />
        )}

        {/* Squeeze arrows */}
        {squeezing && (
          <>
            <path d="M 60 10 L 60 25" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 60 90 L 60 75" stroke="#f59e0b" strokeWidth="2" />
            <text x="60" y="5" textAnchor="middle" className="fill-amber-400 text-xs">
              Squeeze
            </text>
          </>
        )}
      </g>

      {/* Toothbrush */}
      <g transform="translate(220, 100)">
        {/* Handle */}
        <rect x="0" y="15" width="80" height="12" fill="#22c55e" rx="6" />
        {/* Head */}
        <rect x="75" y="10" width="40" height="22" fill="#334155" rx="4" />
        {/* Bristles */}
        {[0, 8, 16, 24, 32].map((x, i) => (
          <rect key={i} x={80 + x} y="0" width="5" height="12" fill="#f0f9ff" rx="1" />
        ))}
        {/* Paste on brush */}
        {!squeezing && pasteLength > 50 && (
          <path d="M 83 -5 Q 100 -15, 117 -5" stroke="#06b6d4" strokeWidth="8" fill="none" strokeLinecap="round" />
        )}
      </g>

      {/* Explanation boxes */}
      <g transform="translate(40, 180)">
        <rect width="150" height="70" fill="#1e293b" rx="8" />
        <text x="75" y="20" textAnchor="middle" className="fill-red-400 text-xs font-semibold">
          At Rest (High η)
        </text>
        <text x="75" y="38" textAnchor="middle" className="fill-slate-400 text-xs">
          Stays on brush
        </text>
        <text x="75" y="52" textAnchor="middle" className="fill-slate-400 text-xs">
          Won&apos;t drip or slide
        </text>
      </g>

      <g transform="translate(210, 180)">
        <rect width="150" height="70" fill="#1e293b" rx="8" />
        <text x="75" y="20" textAnchor="middle" className="fill-green-400 text-xs font-semibold">
          Brushing (Low η)
        </text>
        <text x="75" y="38" textAnchor="middle" className="fill-slate-400 text-xs">
          Spreads easily
        </text>
        <text x="75" y="52" textAnchor="middle" className="fill-slate-400 text-xs">
          Coats all teeth
        </text>
      </g>

      {/* Bottom label */}
      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        Shear-thinning: stays put at rest, flows when needed
      </text>
    </svg>
  );
};

const PrintingGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const nozzleX = 80 + (animPhase % 100);
  const layerY = Math.floor(animPhase / 100) * 8;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="inkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="nozzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="25" textAnchor="middle" className="fill-white text-sm font-bold">
        3D Printing with Shear-Thinning Ink
      </text>

      {/* Print bed */}
      <rect x="60" y="180" width="180" height="10" fill="#334155" rx="2" />

      {/* Printed layers */}
      {[0, 8, 16].map((y, i) => {
        if (y > layerY && i > 0) return null;
        return (
          <rect
            key={i}
            x="80"
            y={172 - y}
            width={y === layerY ? nozzleX - 80 : 140}
            height="6"
            fill="url(#inkGrad)"
            opacity={0.9 - i * 0.15}
            rx="1"
          />
        );
      })}

      {/* Print head assembly */}
      <g transform={`translate(${nozzleX}, 80)`}>
        {/* Ink reservoir */}
        <rect x="-15" y="0" width="30" height="40" fill="#1e293b" stroke="#475569" rx="4" />
        <rect x="-10" y="5" width="20" height="25" fill="url(#inkGrad)" rx="2" />

        {/* Nozzle */}
        <path d="M -8 40 L -3 60 L 3 60 L 8 40 Z" fill="url(#nozzleGrad)" />

        {/* Ink stream */}
        <rect x="-2" y="60" width="4" height={112 - layerY} fill="url(#inkGrad)" />

        {/* Pressure indicator */}
        <circle cx="0" cy="20" r="6" fill="#22c55e" opacity="0.8" />
      </g>

      {/* Viscosity diagram */}
      <g transform="translate(270, 50)">
        <rect width="110" height="130" fill="#1e293b" rx="8" />
        <text x="55" y="20" textAnchor="middle" className="fill-slate-300 text-xs font-semibold">
          Ink Behavior
        </text>

        {/* In reservoir - high viscosity */}
        <g transform="translate(15, 35)">
          <rect width="35" height="35" fill="#334155" rx="4" />
          <rect x="5" y="5" width="25" height="25" fill="url(#inkGrad)" rx="2" />
          <text x="17" y="50" textAnchor="middle" className="fill-slate-500 text-[9px]">
            Reservoir
          </text>
          <text x="17" y="60" textAnchor="middle" className="fill-green-400 text-[8px]">
            High η
          </text>
        </g>

        {/* In nozzle - low viscosity */}
        <g transform="translate(60, 35)">
          <rect width="35" height="35" fill="#334155" rx="4" />
          <rect x="12" y="5" width="10" height="25" fill="url(#inkGrad)" rx="2" />
          <text x="17" y="50" textAnchor="middle" className="fill-slate-500 text-[9px]">
            Nozzle
          </text>
          <text x="17" y="60" textAnchor="middle" className="fill-amber-400 text-[8px]">
            Low η
          </text>
        </g>

        {/* On bed - recovers viscosity */}
        <g transform="translate(15, 95)">
          <rect width="80" height="25" fill="#334155" rx="4" />
          <rect x="5" y="15" width="70" height="6" fill="url(#inkGrad)" rx="2" />
          <text x="40" y="12" textAnchor="middle" className="fill-slate-500 text-[9px]">
            Deposited → Shape holds
          </text>
        </g>
      </g>

      {/* Process arrows */}
      <text x="60" y="220" className="fill-slate-500 text-xs">
        1. Stored thick
      </text>
      <text x="145" y="220" className="fill-slate-500 text-xs">
        2. Flows thin
      </text>
      <text x="230" y="220" className="fill-slate-500 text-xs">
        3. Holds shape
      </text>

      {/* Bottom label */}
      <text x="200" y="265" textAnchor="middle" className="fill-slate-400 text-xs">
        Precise extrusion + shape retention = complex 3D structures
      </text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ShearThinningRenderer({ onGameEvent, currentPhase, onPhaseComplete }: ShearThinningRendererProps) {
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
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [twistShearRate, setTwistShearRate] = useState(50);

  // CRITICAL: Navigation debouncing refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ─── Navigation (CRITICAL PATTERN) ─────────────────────────────────────────
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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
    if (phase < 9) {
      goToPhase(phase + 1);
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

  const handleShake = useCallback(() => {
    setIsShaking(true);
    let intensity = 0;
    const interval = setInterval(() => {
      intensity += 10;
      setShakeIntensity(Math.min(intensity, 100));
      if (intensity >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsShaking(false);
        }, 1500);
      }
    }, 100);
  }, []);

  // ─── Report Event ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({
        type: phase === 9 ? 'mastery_achieved' : 'phase_change',
        data: { phase, prediction, twistPrediction, testAnswers: [...testAnswers], completedApps: Array.from(completedApps) }
      });
    }
  }, [phase, prediction, twistPrediction, testAnswers, completedApps, onGameEvent]);

  // ─── Phase Renderers ───────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/10">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      <div className="text-6xl mb-6">🍅</div>
      {/* Gradient Title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
        The Stubborn Ketchup Mystery
      </h1>
      <p className="text-xl text-slate-300 mb-6">
        You tip the bottle... nothing happens. You shake it... suddenly ketchup floods your plate!
      </p>
      <div className="bg-slate-700/30 backdrop-blur-xl rounded-xl p-6 mb-6 border border-white/10">
        <p className="text-lg text-red-400 font-semibold mb-2">
          Why does ketchup refuse to flow until you shake it?
        </p>
        <p className="text-slate-400">
          Discover the science of shear-thinning fluids!
        </p>
      </div>
      <PrimaryButton onMouseDown={nextPhase}>
        Find Out Why →
      </PrimaryButton>
    </div>
  );

  const renderPredict = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        What happens to ketchup&apos;s viscosity when you shake or squeeze the bottle?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'thicker', label: 'It gets thicker and harder to pour' },
          { id: 'thinner', label: 'It gets thinner and flows easily' },
          { id: 'same', label: 'It stays exactly the same' },
          { id: 'solid', label: 'It turns completely solid' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              prediction === option.id
                ? 'bg-red-500/20 border-2 border-red-500 text-white'
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
    const viscosity = isShaking ? Math.max(100 - shakeIntensity, 20) : 100;
    const ketchupY = isShaking && shakeIntensity > 50 ? 100 + (shakeIntensity - 50) : 100;

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          The Ketchup Experiment
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 300" className="w-full h-64">
            <rect width="400" height="300" fill="#0f172a" />

            {/* Plate */}
            <ellipse cx="200" cy="280" rx="150" ry="30" fill="#475569" />
            <ellipse cx="200" cy="275" rx="140" ry="25" fill="#64748b" />

            {/* Ketchup bottle */}
            <g transform={`translate(160, 50) ${isShaking ? `rotate(${Math.sin(Date.now() / 50) * 5}, 40, 100)` : ''}`}>
              {/* Bottle body */}
              <path d="M 20 60 L 20 150 Q 20 180, 40 180 Q 60 180, 60 150 L 60 60 Z" fill="#dc2626" />
              {/* Bottle neck */}
              <rect x="30" y="20" width="20" height="45" fill="#dc2626" />
              {/* Cap */}
              <rect x="28" y="5" width="24" height="18" fill="#fbbf24" rx="3" />
              {/* Label */}
              <rect x="25" y="80" width="30" height="50" fill="#fef3c7" rx="2" />
              <text x="40" y="105" textAnchor="middle" className="fill-red-700 text-[8px] font-bold">
                KETCHUP
              </text>

              {/* Ketchup inside */}
              <path d={`M 22 ${180 - ketchupY * 0.8} L 22 148 Q 22 175, 40 175 Q 58 175, 58 148 L 58 ${180 - ketchupY * 0.8} Z`} fill="#991b1b" />

              {/* Ketchup stream */}
              {isShaking && shakeIntensity > 60 && (
                <rect x="38" y="180" width="4" height={shakeIntensity - 40} fill="#dc2626" rx="2" />
              )}
            </g>

            {/* Ketchup on plate */}
            {isShaking && shakeIntensity > 70 && (
              <ellipse cx="200" cy="265" rx={10 + (shakeIntensity - 70) * 0.5} ry={5 + (shakeIntensity - 70) * 0.2} fill="#dc2626" />
            )}

            {/* Viscosity meter */}
            <g transform="translate(300, 80)">
              <rect x="0" y="0" width="80" height="120" fill="#1e293b" rx="8" />
              <text x="40" y="20" textAnchor="middle" className="fill-slate-400 text-xs">
                Viscosity
              </text>
              <rect x="15" y="30" width="50" height="70" fill="#334155" rx="4" />
              <rect
                x="17"
                y={100 - viscosity * 0.68}
                width="46"
                height={viscosity * 0.68}
                fill={viscosity > 70 ? '#ef4444' : viscosity > 40 ? '#f59e0b' : '#22c55e'}
                rx="3"
              />
              <text x="40" y="115" textAnchor="middle" className="fill-slate-400 text-xs">
                {viscosity > 70 ? 'HIGH' : viscosity > 40 ? 'MEDIUM' : 'LOW'}
              </text>
            </g>

            {/* Instructions */}
            <text x="80" y="40" className="fill-slate-400 text-sm">
              {isShaking ? 'Shaking... applying shear!' : 'Click below to shake the bottle'}
            </text>
          </svg>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleShake();
            }}
            disabled={isShaking}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              isShaking
                ? 'bg-slate-700 text-slate-500'
                : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:scale-105'
            }`}
          >
            {isShaking ? 'Shaking...' : '🍅 Shake the Bottle!'}
          </button>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-center">
            {isShaking && shakeIntensity > 70
              ? '✨ The shaking creates shear stress, breaking molecular bonds and reducing viscosity!'
              : 'At rest, ketchup molecules are tangled together, creating high resistance to flow.'
            }
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

      {prediction === 'thinner' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Excellent prediction!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: It gets thinner and flows easily!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2">🔬 Shear-Thinning Fluids</h3>
          <p className="text-slate-300">
            Ketchup is a <strong>shear-thinning</strong> (or pseudoplastic) fluid. Its viscosity
            <strong> decreases</strong> when stress is applied, the opposite of oobleck!
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">⚗️ Molecular Mechanism</h3>
          <p className="text-slate-300">
            At rest, long polymer chains and particles in ketchup are tangled and randomly oriented.
            When you shake or squeeze, these chains <strong>align and untangle</strong>, reducing resistance.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">📐 The Math</h3>
          <p className="text-slate-300">
            Viscosity (η) = K × (shear rate)<sup>n-1</sup> where n &lt; 1 for shear-thinning fluids.
            Higher shear rate → lower viscosity!
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
        🔄 The Twist: Recovery Time
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        After you stop shaking, what happens to the ketchup&apos;s viscosity over time?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'instant', label: 'It instantly returns to high viscosity' },
          { id: 'gradual', label: 'It gradually recovers its thickness over seconds' },
          { id: 'never', label: 'It stays thin forever' },
          { id: 'thicker', label: 'It becomes even thicker than before' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleTwistPrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              twistPrediction === option.id
                ? 'bg-orange-500/20 border-2 border-orange-500 text-white'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase} disabled={!twistPrediction}>
          Test Your Prediction →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPlay = () => {
    const viscosityAtRate = Math.max(100 - twistShearRate * 0.8, 15);

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Shear Rate vs Viscosity
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 280" className="w-full h-64">
            <rect width="400" height="280" fill="#0f172a" />

            {/* Graph axes */}
            <line x1="60" y1="220" x2="360" y2="220" stroke="#475569" strokeWidth="2" />
            <line x1="60" y1="40" x2="60" y2="220" stroke="#475569" strokeWidth="2" />

            {/* Axis labels */}
            <text x="210" y="250" textAnchor="middle" className="fill-slate-400 text-sm">
              Shear Rate (s⁻¹)
            </text>
            <text x="25" y="130" textAnchor="middle" className="fill-slate-400 text-sm" transform="rotate(-90, 25, 130)">
              Viscosity (Pa·s)
            </text>

            {/* Shear-thinning curve */}
            <path
              d="M 60 60 Q 100 65, 140 100 Q 180 140, 220 160 Q 280 185, 360 200"
              stroke="#ef4444"
              strokeWidth="3"
              fill="none"
            />

            {/* Current point indicator */}
            <circle
              cx={60 + twistShearRate * 3}
              cy={60 + (100 - viscosityAtRate) * 1.4}
              r="8"
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth="2"
            />

            {/* Vertical line to x-axis */}
            <line
              x1={60 + twistShearRate * 3}
              y1={60 + (100 - viscosityAtRate) * 1.4}
              x2={60 + twistShearRate * 3}
              y2="220"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4"
            />

            {/* Horizontal line to y-axis */}
            <line
              x1="60"
              y1={60 + (100 - viscosityAtRate) * 1.4}
              x2={60 + twistShearRate * 3}
              y2={60 + (100 - viscosityAtRate) * 1.4}
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4"
            />

            {/* Legend */}
            <rect x="270" y="50" width="120" height="60" fill="#1e293b" rx="8" />
            <circle cx="285" cy="70" r="5" fill="#ef4444" />
            <text x="295" y="74" className="fill-slate-300 text-xs">
              Shear-thinning
            </text>
            <circle cx="285" cy="90" r="5" fill="#fbbf24" />
            <text x="295" y="94" className="fill-slate-300 text-xs">
              Current point
            </text>
          </svg>
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 mb-2 text-center">
            Adjust Shear Rate: {twistShearRate}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={twistShearRate}
            onChange={(e) => setTwistShearRate(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>At rest</span>
            <span>Maximum shear</span>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-sm">Shear Rate</p>
              <p className="text-2xl font-bold text-orange-400">{twistShearRate}%</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Viscosity</p>
              <p className="text-2xl font-bold text-red-400">{viscosityAtRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onMouseDown={nextPhase}>
            See the Full Picture →
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Thixotropy: Time-Dependent Behavior
      </h2>

      {twistPrediction === 'gradual' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Exactly right!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: It gradually recovers over time!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">⏱️ Thixotropy</h3>
          <p className="text-slate-300">
            Many shear-thinning fluids are also <strong>thixotropic</strong> - their viscosity
            gradually recovers after shearing stops. This takes seconds to minutes.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2">🔄 Recovery Process</h3>
          <p className="text-slate-300">
            After shearing stops, molecular chains slowly re-tangle and particles re-aggregate,
            rebuilding the structure that gives ketchup its thick consistency.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">💡 Practical Tip</h3>
          <p className="text-slate-300">
            This is why you should use ketchup quickly after shaking! Wait too long and
            you&apos;ll need to shake again. The &quot;memory&quot; of being sheared fades over time.
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
      <PaintGraphic key="paint" />,
      <BloodGraphic key="blood" />,
      <ToothpasteGraphic key="toothpaste" />,
      <PrintingGraphic key="printing" />
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
                  ? 'bg-red-500 text-white'
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
              className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all"
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
        Shear-Thinning Master!
      </h1>
      <p className="text-xl text-slate-300 mb-6">
        You now understand why ketchup flows when shaken!
      </p>

      <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Key Takeaways</h3>
        <ul className="text-left text-slate-300 space-y-2">
          <li>• Shear-thinning fluids decrease in viscosity under stress</li>
          <li>• Molecular chains align and untangle when sheared</li>
          <li>• Many everyday products rely on this behavior</li>
          <li>• Thixotropy allows gradual viscosity recovery</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-red-400">4</p>
          <p className="text-sm text-slate-400">Applications Mastered</p>
        </div>
        <div className="bg-orange-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-orange-400">10</p>
          <p className="text-sm text-slate-400">Questions Completed</p>
        </div>
      </div>

      <p className="text-slate-400 text-sm">
        Next time you shake a ketchup bottle, you&apos;ll know the science behind it!
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/3 rounded-full blur-3xl" />

      <div className="relative z-10 p-6">
        <div className="max-w-2xl mx-auto">
          <ProgressIndicator phases={PHASES} currentPhase={phase} />
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
