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

interface GyroscopeStabilityRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TEST_QUESTIONS = [
  {
    question: 'What is angular momentum?',
    options: [
      'The speed at which an object moves in a straight line',
      'The rotational equivalent of linear momentum (L = Iω)',
      'The force needed to start an object spinning',
      'The energy stored in a spinning object'
    ],
    correct: 1
  },
  {
    question: 'Why does a spinning bicycle wheel resist being tilted?',
    options: [
      'The wheel becomes heavier when spinning',
      'Air resistance pushes against tilting',
      'Angular momentum is conserved - changing direction requires torque',
      'Friction increases when spinning'
    ],
    correct: 2
  },
  {
    question: 'What happens to a spinning top\'s stability as it slows down?',
    options: [
      'It becomes more stable',
      'Stability stays the same',
      'It becomes less stable and eventually falls',
      'It speeds up to compensate'
    ],
    correct: 2
  },
  {
    question: 'How do bicycles stay upright when moving?',
    options: [
      'The rider\'s balance alone keeps them up',
      'Gyroscopic effects from spinning wheels help resist tipping',
      'The handlebars automatically correct balance',
      'Bikes have hidden stabilizers'
    ],
    correct: 1
  },
  {
    question: 'What is the relationship between spin rate and stability?',
    options: [
      'Faster spin = less stability',
      'Spin rate doesn\'t affect stability',
      'Faster spin = more angular momentum = more stability',
      'Only the mass matters, not spin rate'
    ],
    correct: 2
  },
  {
    question: 'How do spacecraft control their orientation without rockets?',
    options: [
      'They can\'t - rockets are always needed',
      'They use reaction wheels and control moment gyroscopes',
      'They rely on solar wind pressure',
      'They bounce off Earth\'s magnetic field'
    ],
    correct: 1
  },
  {
    question: 'Why does a gyroscope appear to "defy gravity"?',
    options: [
      'It actually cancels out gravity',
      'Angular momentum prevents the axis from falling until friction slows it',
      'It creates an anti-gravity field',
      'Air pressure holds it up'
    ],
    correct: 1
  },
  {
    question: 'What is the moment of inertia?',
    options: [
      'The moment when an object stops spinning',
      'A measure of how mass is distributed relative to the rotation axis',
      'The time it takes to start spinning',
      'The force needed to maintain rotation'
    ],
    correct: 1
  },
  {
    question: 'Why are flywheels used in engines?',
    options: [
      'To make the engine lighter',
      'To store rotational energy and smooth out power delivery',
      'To create more friction',
      'To reduce fuel consumption by stopping rotation'
    ],
    correct: 1
  },
  {
    question: 'What happens if you try to rotate a spinning gyroscope in a new direction?',
    options: [
      'It rotates easily in any direction',
      'It experiences precession - rotating perpendicular to the applied force',
      'It immediately stops spinning',
      'It doubles its spin speed'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Bicycle Stability',
    description: 'Spinning bicycle wheels create angular momentum that resists tipping. This gyroscopic effect, combined with trail geometry, helps bikes self-correct and stay upright when moving.',
    icon: '🚲'
  },
  {
    title: 'Spacecraft Attitude Control',
    description: 'Satellites and space stations use spinning reaction wheels to change orientation without expending propellant. The Hubble Space Telescope uses four such wheels for precise pointing.',
    icon: '🛰️'
  },
  {
    title: 'Camera Gimbals',
    description: 'Steadicams and drone gimbals use gyroscopic stabilization to keep cameras level and smooth during movement, enabling professional-quality video from handheld or aerial platforms.',
    icon: '🎥'
  },
  {
    title: 'Ship Stabilizers',
    description: 'Large cruise ships use massive spinning gyroscopes (stabilizers) to counteract ocean waves and reduce rolling, making passengers more comfortable in rough seas.',
    icon: '🚢'
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                index < currentPhase
                  ? 'bg-emerald-500 text-white'
                  : index === currentPhase
                  ? 'bg-emerald-400 text-white ring-4 ring-emerald-400/30'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
            {index < phases.length - 1 && (
              <div
                className={`w-6 h-1 mx-1 rounded ${
                  index < currentPhase ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-slate-400">
        {phaseLabels[currentPhase]}
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
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:scale-105 active:scale-95'
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
const BicycleGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const wheelRotation = animPhase * 3;
  const tiltAngle = Math.sin(animPhase * 0.02) * 5;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="bikeFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Bicycle Gyroscopic Stability
      </text>

      {/* Ground */}
      <line x1="0" y1="230" x2="400" y2="230" stroke="#334155" strokeWidth="2" />

      {/* Bicycle (tilted slightly) */}
      <g transform={`translate(200, 180) rotate(${tiltAngle})`}>
        {/* Frame */}
        <line x1="-60" y1="0" x2="0" y2="-50" stroke="url(#bikeFrameGrad)" strokeWidth="4" />
        <line x1="0" y1="-50" x2="60" y2="0" stroke="url(#bikeFrameGrad)" strokeWidth="4" />
        <line x1="-60" y1="0" x2="30" y2="-30" stroke="url(#bikeFrameGrad)" strokeWidth="4" />
        <line x1="0" y1="-50" x2="0" y2="-80" stroke="url(#bikeFrameGrad)" strokeWidth="3" />

        {/* Handlebars */}
        <line x1="-15" y1="-80" x2="15" y2="-80" stroke="#64748b" strokeWidth="3" />

        {/* Seat */}
        <ellipse cx="30" cy="-45" rx="12" ry="5" fill="#1e293b" />

        {/* Rear wheel */}
        <g transform="translate(-60, 0)">
          <circle cx="0" cy="0" r="35" fill="none" stroke="#64748b" strokeWidth="4" />
          {/* Spokes */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos((i * 60 + wheelRotation) * Math.PI / 180) * 32}
              y2={Math.sin((i * 60 + wheelRotation) * Math.PI / 180) * 32}
              stroke="#475569"
              strokeWidth="1"
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#334155" />
        </g>

        {/* Front wheel */}
        <g transform="translate(60, 0)">
          <circle cx="0" cy="0" r="35" fill="none" stroke="#64748b" strokeWidth="4" />
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos((i * 60 + wheelRotation) * Math.PI / 180) * 32}
              y2={Math.sin((i * 60 + wheelRotation) * Math.PI / 180) * 32}
              stroke="#475569"
              strokeWidth="1"
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#334155" />

          {/* Angular momentum arrow */}
          <g transform={`translate(0, -50)`}>
            <path d="M 0 10 L 0 -20 L -8 -12 M 0 -20 L 8 -12" stroke="#22c55e" strokeWidth="2" fill="none" />
            <text x="15" y="-5" className="fill-emerald-400 text-[10px]">L</text>
          </g>
        </g>
      </g>

      {/* Self-righting arrow */}
      <g transform="translate(320, 140)">
        <path d="M 0 30 Q -30 0, 0 -30" stroke="#fbbf24" strokeWidth="2" fill="none" />
        <path d="M 0 -30 L -5 -22 M 0 -30 L 5 -22" stroke="#fbbf24" strokeWidth="2" fill="none" />
        <text x="0" y="50" textAnchor="middle" className="fill-amber-400 text-[10px]">
          Self-corrects!
        </text>
      </g>

      {/* Explanation box */}
      <g transform="translate(30, 40)">
        <rect width="130" height="80" fill="#1e293b" rx="8" />
        <text x="65" y="20" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Why It Works
        </text>
        <text x="10" y="40" className="fill-slate-400 text-[9px]">
          • Spinning wheels
        </text>
        <text x="10" y="52" className="fill-slate-400 text-[9px]">
          {"  "}have angular momentum
        </text>
        <text x="10" y="68" className="fill-emerald-400 text-[9px]">
          • Resists tipping over
        </text>
      </g>

      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        Faster wheels = more angular momentum = more stable
      </text>
    </svg>
  );
};

const SpacecraftGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const reactionWheelAngle = animPhase * 5;
  const spacecraftRotation = Math.sin(animPhase * 0.05) * 10;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="solarPanelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id="earthGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>
      </defs>

      {/* Background - space */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <circle
          key={i}
          cx={(i * 37) % 400}
          cy={(i * 23) % 280}
          r="1"
          fill="#fff"
          opacity={0.3 + Math.random() * 0.5}
        />
      ))}

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Spacecraft Attitude Control
      </text>

      {/* Earth (partial) */}
      <circle cx="400" cy="280" r="100" fill="url(#earthGrad)" />

      {/* Satellite */}
      <g transform={`translate(180, 140) rotate(${spacecraftRotation})`}>
        {/* Main body */}
        <rect x="-30" y="-20" width="60" height="40" fill="#64748b" rx="4" />

        {/* Solar panels */}
        <rect x="-100" y="-10" width="65" height="20" fill="url(#solarPanelGrad)" />
        <rect x="35" y="-10" width="65" height="20" fill="url(#solarPanelGrad)" />

        {/* Antenna */}
        <circle cx="0" cy="-30" r="10" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <line x1="0" y1="-20" x2="0" y2="-30" stroke="#94a3b8" strokeWidth="2" />

        {/* Reaction wheel (inside, visible as cutaway) */}
        <g transform="translate(0, 0)">
          <circle cx="0" cy="0" r="12" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
          {/* Spinning indicator */}
          {[0, 1, 2, 3].map(i => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos((i * 90 + reactionWheelAngle) * Math.PI / 180) * 10}
              y2={Math.sin((i * 90 + reactionWheelAngle) * Math.PI / 180) * 10}
              stroke="#22c55e"
              strokeWidth="2"
            />
          ))}
        </g>
      </g>

      {/* Explanation */}
      <g transform="translate(30, 50)">
        <rect width="130" height="100" fill="#1e293b" rx="8" />
        <text x="65" y="20" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Reaction Wheels
        </text>
        <text x="10" y="40" className="fill-slate-400 text-[9px]">
          Speed up wheel →
        </text>
        <text x="10" y="52" className="fill-slate-400 text-[9px]">
          Spacecraft rotates
        </text>
        <text x="10" y="64" className="fill-slate-400 text-[9px]">
          opposite direction
        </text>
        <text x="10" y="82" className="fill-emerald-400 text-[9px]">
          No propellant needed!
        </text>
      </g>

      {/* Angular momentum conservation diagram */}
      <g transform="translate(280, 50)">
        <rect width="100" height="80" fill="#1e293b" rx="8" />
        <text x="50" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          Conservation
        </text>

        {/* Wheel arrow */}
        <g transform="translate(25, 45)">
          <circle cx="0" cy="0" r="12" fill="none" stroke="#22c55e" strokeWidth="2" />
          <path d="M 0 -12 L 4 -8 M 0 -12 L -4 -8" stroke="#22c55e" strokeWidth="2" fill="none" transform="rotate(45)" />
        </g>

        {/* Spacecraft arrow (opposite) */}
        <g transform="translate(70, 45)">
          <rect x="-10" y="-8" width="20" height="16" fill="#64748b" rx="2" />
          <path d="M -15 0 L -8 0 M -15 0 L -11 -4 M -15 0 L -11 4" stroke="#f59e0b" strokeWidth="2" fill="none" transform="rotate(180)" />
        </g>

        <text x="50" y="72" textAnchor="middle" className="fill-slate-500 text-[8px]">
          L_wheel + L_craft = 0
        </text>
      </g>

      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        Hubble uses 4 reaction wheels for precise pointing
      </text>
    </svg>
  );
};

const CameraGimbalGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const handShake = Math.sin(animPhase * 0.3) * 15;
  const gimbalCorrection = Math.sin(animPhase * 0.3) * -15;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="cameraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Camera Gimbal Stabilization
      </text>

      {/* Without stabilization */}
      <g transform="translate(80, 80)">
        <text x="40" y="-10" textAnchor="middle" className="fill-red-400 text-xs font-semibold">
          Without Gimbal
        </text>

        {/* Shaky hand */}
        <g transform={`translate(0, ${handShake / 2})`}>
          <path d="M 20 80 Q 30 70, 40 80 Q 50 90, 60 80" fill="#e5d3bc" stroke="#d4c4ac" strokeWidth="1" />
          <rect x="25" y="30" width="30" height="50" fill="url(#cameraGrad)" rx="4" />
          <circle cx="40" cy="45" r="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        </g>

        {/* Shaky footage indicator */}
        <g transform="translate(10, 120)">
          <rect width="60" height="40" fill="#1e293b" stroke="#ef4444" strokeWidth="2" rx="4" />
          <line x1="10" y1={20 + handShake / 3} x2="50" y2={20 + handShake / 3} stroke="#ef4444" strokeWidth="1" strokeDasharray="3" />
          <text x="30" y="55" textAnchor="middle" className="fill-red-400 text-[9px]">
            Shaky video
          </text>
        </g>
      </g>

      {/* With stabilization */}
      <g transform="translate(240, 80)">
        <text x="60" y="-10" textAnchor="middle" className="fill-green-400 text-xs font-semibold">
          With Gimbal
        </text>

        {/* Hand with gimbal */}
        <g transform={`translate(0, ${handShake / 2})`}>
          <path d="M 30 100 Q 40 90, 50 100 Q 60 110, 70 100" fill="#e5d3bc" stroke="#d4c4ac" strokeWidth="1" />

          {/* Gimbal rings */}
          <ellipse cx="60" cy="50" rx="35" ry="15" fill="none" stroke="#64748b" strokeWidth="3" transform={`rotate(${handShake})`} />
          <ellipse cx="60" cy="50" rx="25" ry="35" fill="none" stroke="#475569" strokeWidth="3" transform={`rotate(${handShake / 2})`} />

          {/* Stabilized camera (counters shake) */}
          <g transform={`translate(60, 50) rotate(${gimbalCorrection})`}>
            <rect x="-15" y="-20" width="30" height="40" fill="url(#cameraGrad)" rx="4" />
            <circle cx="0" cy="-8" r="8" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
          </g>
        </g>

        {/* Smooth footage indicator */}
        <g transform="translate(30, 140)">
          <rect width="60" height="40" fill="#1e293b" stroke="#22c55e" strokeWidth="2" rx="4" />
          <line x1="10" y1="20" x2="50" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" />
          <text x="30" y="55" textAnchor="middle" className="fill-green-400 text-[9px]">
            Smooth video
          </text>
        </g>
      </g>

      {/* Gyroscope explanation */}
      <g transform="translate(150, 200)">
        <rect width="100" height="60" fill="#1e293b" rx="8" />
        <text x="50" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          How It Works
        </text>
        <text x="10" y="35" className="fill-slate-400 text-[9px]">
          Gyros detect motion
        </text>
        <text x="10" y="48" className="fill-emerald-400 text-[9px]">
          Motors counter-rotate
        </text>
      </g>

      <text x="200" y="275" textAnchor="middle" className="fill-slate-400 text-xs">
        3-axis gimbals stabilize roll, pitch, and yaw
      </text>
    </svg>
  );
};

const ShipStabilizerGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const waveOffset = Math.sin(animPhase * 0.1) * 20;
  const shipRollWithout = Math.sin(animPhase * 0.1) * 15;
  const shipRollWith = Math.sin(animPhase * 0.1) * 3;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
        <linearGradient id="shipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Background - sky */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Ship Gyroscopic Stabilizers
      </text>

      {/* Ocean waves */}
      <path
        d={`M 0 200 Q 50 ${190 + waveOffset}, 100 200 Q 150 ${210 + waveOffset}, 200 200 Q 250 ${190 + waveOffset}, 300 200 Q 350 ${210 + waveOffset}, 400 200 L 400 280 L 0 280 Z`}
        fill="url(#oceanGrad)"
      />

      {/* Ship without stabilizer */}
      <g transform={`translate(100, 160) rotate(${shipRollWithout})`}>
        {/* Hull */}
        <path d="M -40 20 L -30 0 L 30 0 L 40 20 Q 0 30, -40 20" fill="url(#shipGrad)" />
        {/* Deck */}
        <rect x="-25" y="-15" width="50" height="15" fill="#64748b" rx="2" />
        {/* Smokestack */}
        <rect x="5" y="-30" width="10" height="15" fill="#ef4444" />
      </g>
      <text x="100" y="240" textAnchor="middle" className="fill-red-400 text-xs">
        No Stabilizer
      </text>
      <text x="100" y="252" textAnchor="middle" className="fill-slate-500 text-[10px]">
        ±15° roll
      </text>

      {/* Ship with stabilizer */}
      <g transform={`translate(300, 160) rotate(${shipRollWith})`}>
        {/* Hull */}
        <path d="M -40 20 L -30 0 L 30 0 L 40 20 Q 0 30, -40 20" fill="url(#shipGrad)" />
        {/* Deck */}
        <rect x="-25" y="-15" width="50" height="15" fill="#64748b" rx="2" />
        {/* Smokestack */}
        <rect x="5" y="-30" width="10" height="15" fill="#22c55e" />

        {/* Gyro stabilizer (visible) */}
        <g transform="translate(0, 5)">
          <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
          <line
            x1="0"
            y1="0"
            x2={Math.cos(animPhase * 0.2) * 6}
            y2={Math.sin(animPhase * 0.2) * 6}
            stroke="#22c55e"
            strokeWidth="2"
          />
        </g>
      </g>
      <text x="300" y="240" textAnchor="middle" className="fill-green-400 text-xs">
        With Stabilizer
      </text>
      <text x="300" y="252" textAnchor="middle" className="fill-slate-500 text-[10px]">
        ±3° roll
      </text>

      {/* How it works */}
      <g transform="translate(150, 50)">
        <rect width="100" height="70" fill="#1e293b" rx="8" />
        <text x="50" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
          How It Works
        </text>

        {/* Spinning gyro */}
        <g transform="translate(30, 45)">
          <ellipse cx="0" cy="0" rx="15" ry="5" fill="none" stroke="#22c55e" strokeWidth="2" />
          <ellipse cx="0" cy="0" rx="5" ry="15" fill="none" stroke="#22c55e" strokeWidth="2" />
        </g>

        <text x="60" y="40" className="fill-slate-400 text-[9px]">
          Massive
        </text>
        <text x="60" y="52" className="fill-slate-400 text-[9px]">
          spinning
        </text>
        <text x="60" y="64" className="fill-emerald-400 text-[9px]">
          gyroscope
        </text>
      </g>

      <text x="200" y="275" textAnchor="middle" className="fill-slate-400 text-xs">
        Up to 80% roll reduction in rough seas
      </text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function GyroscopeStabilityRenderer({ onGameEvent, currentPhase, onPhaseComplete }: GyroscopeStabilityRendererProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [isMobile, setIsMobile] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1)
  );
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [showTestResults, setShowTestResults] = useState(false);

  // Simulation state
  const [spinRate, setSpinRate] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  // CRITICAL: Navigation debouncing refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

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

  // ─── Report Event ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({
        type: phase === 9 ? 'mastery_achieved' : 'phase_change',
        data: { phase, phaseLabel: phaseLabels[phase], prediction, twistPrediction, testAnswers: [...testAnswers], completedApps: [...completedApps] }
      });
    }
  }, [phase, prediction, twistPrediction, testAnswers, completedApps, onGameEvent]);

  // ─── Phase Renderers ───────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Premium Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-emerald-400/80 text-sm font-medium tracking-wide uppercase">Rotational Dynamics</span>
      </div>

      {/* Gradient Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
        The Spinning Wheel Mystery
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8">
        Why do spinning objects resist being tilted?
      </p>

      {/* Premium Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 max-w-lg border border-slate-700/50 shadow-2xl">
        <div className="text-6xl mb-6">🎯</div>
        <p className="text-xl text-slate-300 mb-6">
          Hold a bicycle wheel by its axle. When it&apos;s not spinning, it flops around. But spin it fast... suddenly it resists tilting!
        </p>
        <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
          <p className="text-lg text-emerald-400 font-semibold mb-2">
            What invisible force stabilizes spinning objects?
          </p>
          <p className="text-slate-400">
            Discover the power of angular momentum!
          </p>
        </div>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(e); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-semibold rounded-2xl hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
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
        Tap to explore gyroscopic effects
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        You hold a spinning bicycle wheel by its axle and try to tilt it. What happens?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'easy', label: 'It tilts easily, just like when not spinning' },
          { id: 'resists', label: 'It resists tilting and pushes back unexpectedly' },
          { id: 'faster', label: 'It spins faster when you try to tilt it' },
          { id: 'stops', label: 'It immediately stops spinning' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              prediction === option.id
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-white'
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
    const wheelRotation = isSpinning ? animPhase * (spinRate / 20) : 0;
    const stabilityFactor = isSpinning ? spinRate / 10 : 0;
    const tiltResistance = isSpinning ? Math.max(0, 20 - spinRate / 5) : 45;

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Spinning Wheel Experiment
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 250" className="w-full h-56">
            <rect width="400" height="250" fill="#0f172a" />

            {/* Wheel with axle */}
            <g transform={`translate(200, 130) rotate(${isSpinning ? tiltResistance : 45})`}>
              {/* Axle */}
              <line x1="-70" y1="0" x2="70" y2="0" stroke="#64748b" strokeWidth="6" />
              <circle cx="-70" cy="0" r="8" fill="#475569" />
              <circle cx="70" cy="0" r="8" fill="#475569" />

              {/* Wheel */}
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="50" fill="none" stroke="#64748b" strokeWidth="6" />
                {/* Spokes */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <line
                    key={i}
                    x1="0"
                    y1="0"
                    x2={Math.cos((i * 45 + wheelRotation) * Math.PI / 180) * 45}
                    y2={Math.sin((i * 45 + wheelRotation) * Math.PI / 180) * 45}
                    stroke="#475569"
                    strokeWidth="2"
                  />
                ))}
                <circle cx="0" cy="0" r="8" fill="#334155" />
              </g>

              {/* Angular momentum vector (when spinning) */}
              {isSpinning && (
                <g>
                  <line x1="0" y1="0" x2="0" y2={-30 - stabilityFactor} stroke="#22c55e" strokeWidth="3" />
                  <polygon points={`0,${-35 - stabilityFactor} -6,${-25 - stabilityFactor} 6,${-25 - stabilityFactor}`} fill="#22c55e" />
                  <text x="15" y={-30 - stabilityFactor / 2} className="fill-emerald-400 text-sm font-bold">
                    L
                  </text>
                </g>
              )}
            </g>

            {/* Hand trying to tilt */}
            <g transform="translate(280, 100)">
              <path d="M 0 30 Q 20 20, 40 30 Q 50 40, 40 50" fill="#e5d3bc" stroke="#d4c4ac" />
              <path d="M 0 50 L -10 80" stroke="#f59e0b" strokeWidth="3" strokeDasharray="5" />
              <text x="0" y="95" textAnchor="middle" className="fill-amber-400 text-xs">
                Push!
              </text>
            </g>

            {/* Status */}
            <text x="200" y="30" textAnchor="middle" className="fill-white text-sm font-bold">
              {isSpinning ? `Spinning at ${spinRate}% - Stability: ${stabilityFactor.toFixed(1)}` : 'Not Spinning - Unstable'}
            </text>

            {/* Tilt indicator */}
            <g transform="translate(50, 60)">
              <rect width="100" height="80" fill="#1e293b" rx="8" />
              <text x="50" y="20" textAnchor="middle" className="fill-slate-400 text-xs font-semibold">
                Tilt Resistance
              </text>
              <rect x="15" y="30" width="70" height="20" fill="#334155" rx="4" />
              <rect
                x="17"
                y="32"
                width={Math.max(0, 66 * (1 - tiltResistance / 45))}
                height="16"
                fill={isSpinning ? '#22c55e' : '#ef4444'}
                rx="3"
              />
              <text x="50" y="65" textAnchor="middle" className={`text-xs font-bold ${isSpinning ? 'fill-emerald-400' : 'fill-red-400'}`}>
                {isSpinning ? 'HIGH' : 'NONE'}
              </text>
            </g>
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setIsSpinning(!isSpinning);
            }}
            className={`py-4 rounded-xl font-bold text-lg transition-all ${
              isSpinning
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isSpinning ? '⏹️ Stop Wheel' : '▶️ Spin Wheel'}
          </button>

          <div className="bg-slate-700/30 rounded-xl p-3 flex flex-col justify-center">
            <label className="text-slate-400 text-sm text-center mb-1">
              Spin Rate: {spinRate}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={spinRate}
              onChange={(e) => setSpinRate(Number(e.target.value))}
              disabled={!isSpinning}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-center">
            {isSpinning
              ? `The wheel resists tilting! Angular momentum L = Iω points along the axis and wants to stay that direction.`
              : 'Try spinning the wheel and then notice how it resists being tilted.'}
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

      {prediction === 'resists' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Excellent prediction!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: It resists tilting and pushes back!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-emerald-400 mb-2">🔄 Angular Momentum</h3>
          <p className="text-slate-300">
            <strong>L = Iω</strong> (moment of inertia × angular velocity).
            This vector points along the rotation axis and resists changes in direction.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-teal-400 mb-2">⚖️ Conservation Law</h3>
          <p className="text-slate-300">
            Angular momentum is <strong>conserved</strong> unless an external torque acts.
            Tilting the wheel requires torque, which the wheel &quot;resists&quot; by fighting back.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-green-400 mb-2">📐 Why Faster = More Stable</h3>
          <p className="text-slate-300">
            Higher ω means larger L. Larger L requires more torque to change.
            That&apos;s why fast-spinning tops stay upright but slow ones wobble and fall.
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
        🔄 The Twist: Precession
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        If you apply a constant sideways force to a spinning gyroscope, what happens?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'falls', label: 'It falls over in the direction of the force' },
          { id: 'precesses', label: 'It rotates perpendicular to the force (precession)' },
          { id: 'nothing', label: 'Nothing happens - it completely resists' },
          { id: 'faster', label: 'It spins faster around its original axis' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleTwistPrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              twistPrediction === option.id
                ? 'bg-teal-500/20 border-2 border-teal-500 text-white'
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
    const precessionAngle = animPhase * 0.5;
    const spinAngle = animPhase * 5;

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Gyroscopic Precession
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 250" className="w-full h-56">
            <rect width="400" height="250" fill="#0f172a" />

            {/* Pivot point */}
            <circle cx="200" cy="200" r="5" fill="#64748b" />

            {/* Gyroscope with precession */}
            <g transform={`translate(200, 200) rotate(${precessionAngle})`}>
              {/* Arm */}
              <line x1="0" y1="0" x2="80" y2="-60" stroke="#64748b" strokeWidth="4" />

              {/* Spinning disk at end of arm */}
              <g transform="translate(80, -60)">
                {/* Disk (shown as ellipse for 3D effect) */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx="25"
                  ry="8"
                  fill="#22c55e"
                  transform={`rotate(${spinAngle})`}
                />
                <ellipse
                  cx="0"
                  cy="0"
                  rx="25"
                  ry="8"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                />

                {/* Angular momentum vector */}
                <line x1="0" y1="0" x2="0" y2="-40" stroke="#fbbf24" strokeWidth="2" />
                <polygon points="0,-45 -4,-38 4,-38" fill="#fbbf24" />
                <text x="10" y="-35" className="fill-amber-400 text-xs font-bold">L</text>

                {/* Spin direction arrow */}
                <path d="M -25 8 A 25 8 0 0 0 25 8" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
              </g>
            </g>

            {/* Gravity arrow */}
            <g transform="translate(280, 100)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="#ef4444" strokeWidth="2" />
              <polygon points="0,45 -4,38 4,38" fill="#ef4444" />
              <text x="15" y="25" className="fill-red-400 text-xs">Gravity</text>
            </g>

            {/* Precession circle indicator */}
            <ellipse cx="200" cy="200" rx="80" ry="30" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="5" />
            <text x="200" y="240" textAnchor="middle" className="fill-amber-400 text-xs">
              Precession path
            </text>

            {/* Title */}
            <text x="200" y="25" textAnchor="middle" className="fill-white text-sm font-bold">
              Gyroscope Precession Demo
            </text>

            {/* Explanation */}
            <g transform="translate(30, 50)">
              <rect width="130" height="80" fill="#1e293b" rx="8" />
              <text x="65" y="18" textAnchor="middle" className="fill-slate-300 text-[10px] font-semibold">
                Why Precession?
              </text>
              <text x="10" y="38" className="fill-slate-400 text-[9px]">
                Torque = r × F
              </text>
              <text x="10" y="52" className="fill-slate-400 text-[9px]">
                dL/dt = Torque
              </text>
              <text x="10" y="68" className="fill-teal-400 text-[9px]">
                L rotates ⊥ to torque!
              </text>
            </g>
          </svg>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-center">
            Instead of falling, the gyroscope <strong className="text-amber-400">precesses</strong> -
            rotating around the vertical axis. The angular momentum vector traces a cone!
          </p>
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
        Understanding Precession
      </h2>

      {twistPrediction === 'precesses' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Exactly right!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: It precesses perpendicular to the force!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">⚡ Torque Changes Angular Momentum</h3>
          <p className="text-slate-300">
            Torque doesn&apos;t just make things spin - it changes the <strong>direction</strong>
            of angular momentum. τ = dL/dt means torque equals the rate of change of L.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-teal-400 mb-2">🔄 Perpendicular Motion</h3>
          <p className="text-slate-300">
            The change in L is <strong>perpendicular</strong> to both L and the torque.
            This creates the surprising circular precession motion instead of simple falling.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-emerald-400 mb-2">📊 Precession Rate</h3>
          <p className="text-slate-300">
            Ω = τ/L = mgr/(Iω). Faster spin → slower precession.
            This is why a fast-spinning top barely precesses while a slow one wobbles wildly!
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
      <BicycleGraphic key="bicycle" />,
      <SpacecraftGraphic key="spacecraft" />,
      <CameraGimbalGraphic key="camera" />,
      <ShipStabilizerGraphic key="ship" />
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
                  ? 'bg-emerald-500 text-white'
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
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
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
        Gyroscope Master!
      </h1>
      <p className="text-xl text-slate-300 mb-6">
        You now understand why spinning objects resist tilting!
      </p>

      <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">Key Takeaways</h3>
        <ul className="text-left text-slate-300 space-y-2">
          <li>• Angular momentum L = Iω resists changes in direction</li>
          <li>• Faster spin = more stability</li>
          <li>• Torque causes precession, not simple falling</li>
          <li>• Used in bikes, spacecraft, cameras, and ships!</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-emerald-400">4</p>
          <p className="text-sm text-slate-400">Applications Mastered</p>
        </div>
        <div className="bg-teal-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-teal-400">10</p>
          <p className="text-sm text-slate-400">Questions Completed</p>
        </div>
      </div>

      <p className="text-slate-400 text-sm">
        Next time you see a spinning top or ride a bike, you&apos;ll understand the physics!
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
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Premium Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Gyroscope Stability</span>
          <div className="flex gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-emerald-400 w-6' : phase > p ? 'bg-emerald-500 w-2' : 'bg-slate-600 w-2'
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
