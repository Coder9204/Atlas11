'use client';

import React, { useState, useEffect, useCallback } from 'react';

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

// String phases
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

interface GyroscopeStabilityRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TEST_QUESTIONS = [
  {
    question: 'What is angular momentum?',
    options: [
      { text: 'The speed at which an object moves in a straight line', correct: false },
      { text: 'The rotational equivalent of linear momentum (L = Iω)', correct: true },
      { text: 'The force needed to start an object spinning', correct: false },
      { text: 'The energy stored in a spinning object', correct: false }
    ]
  },
  {
    question: 'Why does a spinning bicycle wheel resist being tilted?',
    options: [
      { text: 'The wheel becomes heavier when spinning', correct: false },
      { text: 'Air resistance pushes against tilting', correct: false },
      { text: 'Angular momentum is conserved - changing direction requires torque', correct: true },
      { text: 'Friction increases when spinning', correct: false }
    ]
  },
  {
    question: 'What happens to a spinning top\'s stability as it slows down?',
    options: [
      { text: 'It becomes more stable', correct: false },
      { text: 'Stability stays the same', correct: false },
      { text: 'It becomes less stable and eventually falls', correct: true },
      { text: 'It speeds up to compensate', correct: false }
    ]
  },
  {
    question: 'How do bicycles stay upright when moving?',
    options: [
      { text: 'The rider\'s balance alone keeps them up', correct: false },
      { text: 'Gyroscopic effects from spinning wheels help resist tipping', correct: true },
      { text: 'The handlebars automatically correct balance', correct: false },
      { text: 'Bikes have hidden stabilizers', correct: false }
    ]
  },
  {
    question: 'What is the relationship between spin rate and stability?',
    options: [
      { text: 'Faster spin = less stability', correct: false },
      { text: 'Spin rate doesn\'t affect stability', correct: false },
      { text: 'Faster spin = more angular momentum = more stability', correct: true },
      { text: 'Only the mass matters, not spin rate', correct: false }
    ]
  },
  {
    question: 'How do spacecraft control their orientation without rockets?',
    options: [
      { text: 'They can\'t - rockets are always needed', correct: false },
      { text: 'They use reaction wheels and control moment gyroscopes', correct: true },
      { text: 'They rely on solar wind pressure', correct: false },
      { text: 'They bounce off Earth\'s magnetic field', correct: false }
    ]
  },
  {
    question: 'Why does a gyroscope appear to "defy gravity"?',
    options: [
      { text: 'It actually cancels out gravity', correct: false },
      { text: 'Angular momentum prevents the axis from falling until friction slows it', correct: true },
      { text: 'It creates an anti-gravity field', correct: false },
      { text: 'Air pressure holds it up', correct: false }
    ]
  },
  {
    question: 'What is the moment of inertia?',
    options: [
      { text: 'The moment when an object stops spinning', correct: false },
      { text: 'A measure of how mass is distributed relative to the rotation axis', correct: true },
      { text: 'The time it takes to start spinning', correct: false },
      { text: 'The force needed to maintain rotation', correct: false }
    ]
  },
  {
    question: 'Why are flywheels used in engines?',
    options: [
      { text: 'To make the engine lighter', correct: false },
      { text: 'To store rotational energy and smooth out power delivery', correct: true },
      { text: 'To create more friction', correct: false },
      { text: 'To reduce fuel consumption by stopping rotation', correct: false }
    ]
  },
  {
    question: 'What happens if you try to rotate a spinning gyroscope in a new direction?',
    options: [
      { text: 'It rotates easily in any direction', correct: false },
      { text: 'It experiences precession - rotating perpendicular to the applied force', correct: true },
      { text: 'It immediately stops spinning', correct: false },
      { text: 'It doubles its spin speed', correct: false }
    ]
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
                  ? 'bg-emerald-500 text-white'
                  : index === currentIndex
                  ? 'bg-emerald-400 text-white ring-4 ring-emerald-400/30'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
            {index < phases.length - 1 && (
              <div
                className={`w-6 h-1 mx-1 rounded ${
                  index < currentIndex ? 'bg-emerald-500' : 'bg-slate-700'
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
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', disabled = false }) => {
  return (
    <button
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
      style={{ zIndex: 10 }}
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
export default function GyroscopeStabilityRenderer({ onGameEvent, gamePhase, onPhaseComplete }: GyroscopeStabilityRendererProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>((gamePhase as Phase) ?? 'hook');
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

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Phase sync with external control
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [onPhaseComplete, onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
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
        type: phase === 'mastery' ? 'mastery_achieved' : 'phase_change',
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
        onClick={() => nextPhase()}
        style={{ zIndex: 10 }}
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
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
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
        <PrimaryButton onClick={nextPhase} disabled={!prediction}>
          Test Your Prediction →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderPlay = () => {
    const wheelRotation = isSpinning ? animPhase * (spinRate / 20) : 0;
    const stabilityFactor = isSpinning ? spinRate / 10 : 0;
    const tiltResistance = isSpinning ? Math.max(0, 20 - spinRate / 5) : 45;
    const glowIntensity = isSpinning ? 0.6 + (spinRate / 200) : 0.2;

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-4 text-center">
          Spinning Wheel Experiment
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 280" className="w-full h-64">
            <defs>
              {/* Premium lab background gradient */}
              <linearGradient id="gstabLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#030712" />
                <stop offset="30%" stopColor="#0a0f1a" />
                <stop offset="70%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#030712" />
              </linearGradient>

              {/* Metallic axle gradient */}
              <linearGradient id="gstabAxleMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="25%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="75%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Spinning disc metallic gradient */}
              <linearGradient id="gstabDiscMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="20%" stopColor="#94a3b8" />
                <stop offset="40%" stopColor="#64748b" />
                <stop offset="60%" stopColor="#94a3b8" />
                <stop offset="80%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Disc rim gradient for 3D effect */}
              <linearGradient id="gstabDiscRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="25%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="75%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Angular momentum vector glow */}
              <linearGradient id="gstabMomentumGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#4ade80" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#86efac" stopOpacity="1" />
              </linearGradient>

              {/* Hub center gradient */}
              <radialGradient id="gstabHubCenter" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </radialGradient>

              {/* Stability indicator gradient */}
              <linearGradient id="gstabStabilityHigh" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>

              <linearGradient id="gstabStabilityLow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>

              {/* Panel background gradient */}
              <linearGradient id="gstabPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="gstabMomentumGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="gstabDiscGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="gstabHubGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Premium dark lab background */}
            <rect width="400" height="280" fill="url(#gstabLabBg)" />

            {/* Subtle grid pattern */}
            <g opacity="0.1">
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`gv${i}`} x1={i * 20} y1="0" x2={i * 20} y2="280" stroke="#64748b" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <line key={`gh${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20} stroke="#64748b" strokeWidth="0.5" />
              ))}
            </g>

            {/* Wheel with axle - premium gyroscope design */}
            <g transform={`translate(200, 150) rotate(${isSpinning ? tiltResistance : 45})`}>
              {/* Outer gimbal ring (3D effect) */}
              <ellipse cx="0" cy="0" rx="70" ry="18" fill="none" stroke="url(#gstabAxleMetal)" strokeWidth="3" opacity="0.5" />

              {/* Inner gimbal ring */}
              <ellipse cx="0" cy="0" rx="60" ry="15" fill="none" stroke="url(#gstabAxleMetal)" strokeWidth="2" opacity="0.7" />

              {/* Axle with metallic gradient */}
              <line x1="-75" y1="0" x2="75" y2="0" stroke="url(#gstabAxleMetal)" strokeWidth="8" strokeLinecap="round" />

              {/* Axle end caps with 3D effect */}
              <circle cx="-75" cy="0" r="10" fill="url(#gstabHubCenter)" stroke="#475569" strokeWidth="1" />
              <circle cx="75" cy="0" r="10" fill="url(#gstabHubCenter)" stroke="#475569" strokeWidth="1" />

              {/* Spinning disc with metallic gradient and glow when spinning */}
              <g filter={isSpinning ? 'url(#gstabDiscGlow)' : undefined} opacity={isSpinning ? glowIntensity + 0.4 : 1}>
                {/* Disc rim (thick outer ring) */}
                <circle cx="0" cy="0" r="52" fill="none" stroke="url(#gstabDiscRim)" strokeWidth="8" />

                {/* Inner disc face with metallic sheen */}
                <circle cx="0" cy="0" r="48" fill="url(#gstabDiscMetal)" opacity="0.3" />

                {/* Spokes with metallic gradient */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <line
                    key={i}
                    x1="0"
                    y1="0"
                    x2={Math.cos((i * 45 + wheelRotation) * Math.PI / 180) * 46}
                    y2={Math.sin((i * 45 + wheelRotation) * Math.PI / 180) * 46}
                    stroke="url(#gstabAxleMetal)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                ))}

                {/* Hub center with glow */}
                <circle cx="0" cy="0" r="12" fill="url(#gstabHubCenter)" filter="url(#gstabHubGlow)" />
                <circle cx="0" cy="0" r="8" fill="#1e293b" />
                <circle cx="0" cy="0" r="3" fill="#475569" />
              </g>

              {/* Angular momentum vector (when spinning) with glow effect */}
              {isSpinning && (
                <g filter="url(#gstabMomentumGlow)">
                  {/* Vector shaft */}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={-35 - stabilityFactor}
                    stroke="url(#gstabMomentumGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`0,${-42 - stabilityFactor} -8,${-28 - stabilityFactor} 8,${-28 - stabilityFactor}`}
                    fill="#4ade80"
                  />
                  {/* L label with glow */}
                  <text
                    x="18"
                    y={-35 - stabilityFactor / 2}
                    fill="#4ade80"
                    fontSize="14"
                    fontWeight="bold"
                    fontStyle="italic"
                  >
                    L
                  </text>
                </g>
              )}
            </g>

            {/* Stability indicator panel - premium design */}
            <g transform="translate(20, 20)">
              <rect width="110" height="90" fill="url(#gstabPanelBg)" rx="10" stroke="#334155" strokeWidth="1" />
              <rect x="2" y="2" width="106" height="86" fill="none" rx="9" stroke="#475569" strokeWidth="0.5" opacity="0.5" />

              {/* Panel content moved outside SVG to typo system - just bar visualization */}
              <rect x="15" y="40" width="80" height="24" fill="#0f172a" rx="6" stroke="#334155" strokeWidth="1" />
              <rect
                x="18"
                y="43"
                width={Math.max(0, 74 * (1 - tiltResistance / 45))}
                height="18"
                fill={isSpinning ? 'url(#gstabStabilityHigh)' : 'url(#gstabStabilityLow)'}
                rx="4"
              />

              {/* Stability level markers */}
              <line x1="18" y1="68" x2="18" y2="72" stroke="#475569" strokeWidth="1" />
              <line x1="55" y1="68" x2="55" y2="72" stroke="#475569" strokeWidth="1" />
              <line x1="92" y1="68" x2="92" y2="72" stroke="#475569" strokeWidth="1" />
            </g>
          </svg>
        </div>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 border border-slate-700">
            <p style={{ fontSize: typo.label }} className="text-slate-400 uppercase tracking-wide mb-1">Tilt Resistance</p>
            <p style={{ fontSize: typo.body }} className={`font-bold ${isSpinning ? 'text-emerald-400' : 'text-red-400'}`}>
              {isSpinning ? 'HIGH' : 'NONE'}
            </p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 border border-slate-700 text-center">
            <p style={{ fontSize: typo.label }} className="text-slate-400 uppercase tracking-wide mb-1">Status</p>
            <p style={{ fontSize: typo.body }} className="text-white font-semibold">
              {isSpinning ? `Spinning at ${spinRate}%` : 'Not Spinning'}
            </p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 border border-slate-700 text-right">
            <p style={{ fontSize: typo.label }} className="text-slate-400 uppercase tracking-wide mb-1">Stability Factor</p>
            <p style={{ fontSize: typo.body }} className={`font-bold ${isSpinning ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stabilityFactor.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setIsSpinning(!isSpinning)}
            style={{ zIndex: 10 }}
            className={`py-4 rounded-xl font-bold text-lg transition-all ${
              isSpinning
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isSpinning ? 'Stop Wheel' : 'Spin Wheel'}
          </button>

          <div className="bg-slate-700/30 rounded-xl p-3 flex flex-col justify-center">
            <label style={{ fontSize: typo.small }} className="text-slate-400 text-center mb-1">
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
          <p style={{ fontSize: typo.body }} className="text-slate-300 text-center">
            {isSpinning
              ? `The wheel resists tilting! Angular momentum L = Iω points along the axis and wants to stay that direction.`
              : 'Try spinning the wheel and then notice how it resists being tilted.'}
          </p>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onClick={nextPhase}>
            Understand Why
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
        <PrimaryButton onClick={nextPhase}>
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
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
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
        <PrimaryButton onClick={nextPhase} disabled={!twistPrediction}>
          See What Happens →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPlay = () => {
    const precessionAngle = animPhase * 0.5;
    const spinAngle = animPhase * 5;
    const discPulse = 0.8 + Math.sin(animPhase * 0.1) * 0.2;

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-4 text-center">
          Gyroscopic Precession
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 280" className="w-full h-64">
            <defs>
              {/* Premium lab background */}
              <linearGradient id="gstabPrecLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#030712" />
                <stop offset="30%" stopColor="#0a0f1a" />
                <stop offset="70%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#030712" />
              </linearGradient>

              {/* Metallic arm gradient */}
              <linearGradient id="gstabArmMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="30%" stopColor="#64748b" />
                <stop offset="60%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Spinning disc gradient with emerald tones */}
              <radialGradient id="gstabPrecDiscGrad" cx="30%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="30%" stopColor="#22c55e" />
                <stop offset="60%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#166534" />
              </radialGradient>

              {/* Disc rim metallic */}
              <linearGradient id="gstabPrecDiscRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#166534" />
                <stop offset="25%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="75%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#166534" />
              </linearGradient>

              {/* Angular momentum (L) vector gradient - amber */}
              <linearGradient id="gstabLVectorGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fde68a" stopOpacity="1" />
              </linearGradient>

              {/* Gravity vector gradient - red */}
              <linearGradient id="gstabGravityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
              </linearGradient>

              {/* Precession path gradient */}
              <linearGradient id="gstabPrecPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
              </linearGradient>

              {/* Pivot point gradient */}
              <radialGradient id="gstabPivotGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </radialGradient>

              {/* Glow filters */}
              <filter id="gstabPrecDiscGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="gstabLVectorGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="gstabGravityGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="gstabPrecPathGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Premium dark lab background */}
            <rect width="400" height="280" fill="url(#gstabPrecLabBg)" />

            {/* Subtle radial glow in center */}
            <circle cx="200" cy="200" r="100" fill="url(#gstabPivotGrad)" opacity="0.1" />

            {/* Precession path indicator with glow */}
            <ellipse
              cx="200"
              cy="210"
              rx="90"
              ry="35"
              fill="none"
              stroke="url(#gstabPrecPathGrad)"
              strokeWidth="2"
              strokeDasharray="8 4"
              filter="url(#gstabPrecPathGlow)"
              opacity="0.7"
            />

            {/* Pivot point with metallic look */}
            <circle cx="200" cy="210" r="8" fill="url(#gstabPivotGrad)" stroke="#475569" strokeWidth="1" />
            <circle cx="200" cy="210" r="4" fill="#1e293b" />

            {/* Gyroscope with precession */}
            <g transform={`translate(200, 210) rotate(${precessionAngle})`}>
              {/* Support arm with metallic gradient */}
              <line
                x1="0"
                y1="0"
                x2="85"
                y2="-70"
                stroke="url(#gstabArmMetal)"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Spinning disk at end of arm */}
              <g transform="translate(85, -70)" filter="url(#gstabPrecDiscGlow)">
                {/* Outer gimbal ring */}
                <ellipse cx="0" cy="0" rx="32" ry="10" fill="none" stroke="url(#gstabArmMetal)" strokeWidth="2" opacity="0.6" />

                {/* Disc with 3D effect and pulsing opacity */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx="28"
                  ry="9"
                  fill="url(#gstabPrecDiscGrad)"
                  opacity={discPulse}
                  transform={`rotate(${spinAngle})`}
                />
                {/* Disc rim */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx="28"
                  ry="9"
                  fill="none"
                  stroke="url(#gstabPrecDiscRim)"
                  strokeWidth="3"
                />
                {/* Center hub */}
                <circle cx="0" cy="0" r="5" fill="url(#gstabPivotGrad)" />

                {/* Angular momentum vector (L) with glow */}
                <g filter="url(#gstabLVectorGlow)">
                  <line x1="0" y1="0" x2="0" y2="-50" stroke="url(#gstabLVectorGrad)" strokeWidth="4" strokeLinecap="round" />
                  <polygon points="0,-58 -7,-45 7,-45" fill="#fbbf24" />
                </g>

                {/* Spin direction curved arrow */}
                <path
                  d="M -28 6 A 28 9 0 0 0 28 6"
                  stroke="#4ade80"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <polygon points="28,6 22,12 24,3" fill="#4ade80" opacity="0.8" />
              </g>
            </g>

            {/* Gravity arrow with glow */}
            <g transform="translate(320, 80)" filter="url(#gstabGravityGlow)">
              <line x1="0" y1="0" x2="0" y2="50" stroke="url(#gstabGravityGrad)" strokeWidth="4" strokeLinecap="round" />
              <polygon points="0,58 -7,45 7,45" fill="#ef4444" />
            </g>
          </svg>
        </div>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 border border-slate-700">
            <p style={{ fontSize: typo.label }} className="text-amber-400 font-semibold mb-1">Angular Momentum L</p>
            <p style={{ fontSize: typo.small }} className="text-slate-400">Points perpendicular to disc</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 border border-slate-700">
            <p style={{ fontSize: typo.label }} className="text-red-400 font-semibold mb-1">Gravity</p>
            <p style={{ fontSize: typo.small }} className="text-slate-400">Pulls downward</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 border border-slate-700">
            <p style={{ fontSize: typo.label }} className="text-amber-400/70 font-semibold mb-1">Precession Path</p>
            <p style={{ fontSize: typo.small }} className="text-slate-400">L traces a cone</p>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <p style={{ fontSize: typo.body }} className="text-slate-300 text-center">
            Instead of falling, the gyroscope <strong className="text-amber-400">precesses</strong> -
            rotating around the vertical axis. The angular momentum vector traces a cone!
          </p>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onClick={nextPhase}>
            Learn More
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
        <PrimaryButton onClick={nextPhase}>
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

    const handleNextApplication = () => {
      // Mark current as completed and move to next
      handleAppComplete(activeAppTab);
      if (activeAppTab < TRANSFER_APPS.length - 1) {
        setActiveAppTab(activeAppTab + 1);
      }
    };

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
              onClick={() => setActiveAppTab(index)}
              style={{ zIndex: 10 }}
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

          {/* Next Application button */}
          {activeAppTab < TRANSFER_APPS.length - 1 && (
            <button
              onClick={handleNextApplication}
              style={{ zIndex: 10 }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all"
            >
              Next Application →
            </button>
          )}

          {activeAppTab === TRANSFER_APPS.length - 1 && !completedApps.has(activeAppTab) && (
            <button
              onClick={() => handleAppComplete(activeAppTab)}
              style={{ zIndex: 10 }}
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
            onClick={nextPhase}
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
    const score = testAnswers.reduce((acc, answer, index) => {
      return acc + (TEST_QUESTIONS[index].options[answer]?.correct ? 1 : 0);
    }, 0);
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
            {TEST_QUESTIONS.map((q, index) => {
              const isCorrect = q.options[testAnswers[index]]?.correct;
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <p className="text-sm text-slate-300">Q{index + 1}: {q.question}</p>
                  <p className={`text-xs mt-1 ${
                    isCorrect ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isCorrect ? '✓ Correct' : `✗ Correct: ${q.options.find(o => o.correct)?.text}`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            {passed ? (
              <PrimaryButton onClick={nextPhase}>
                Complete Mastery →
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => {
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
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? option.correct
                          ? 'bg-green-500/20 border border-green-500 text-green-300'
                          : 'bg-red-500/20 border border-red-500 text-red-300'
                        : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <PrimaryButton
            onClick={() => setShowTestResults(true)}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST QUESTIONS - Scenario-based multiple choice questions
  // ═══════════════════════════════════════════════════════════════════════════
  const testQuestions = [
    // Question 1: Core concept - gyroscopic precession (Easy)
    {
      scenario: "A student holds a spinning bicycle wheel by its axle. When she tries to tilt the wheel to the left, she notices the wheel rotates forward instead of simply tilting sideways as expected.",
      question: "What phenomenon causes the wheel to rotate in an unexpected direction when a tilting force is applied?",
      options: [
        { id: 'a', label: "Air resistance pushing against the spinning wheel creates a deflecting force" },
        { id: 'b', label: "Gyroscopic precession - the wheel rotates perpendicular to the applied torque", correct: true },
        { id: 'c', label: "The wheel's momentum causes it to continue in its original direction" },
        { id: 'd', label: "Friction in the axle bearings redirects the force" }
      ],
      explanation: "Gyroscopic precession occurs because of the relationship between angular momentum and torque. When you apply a torque to a spinning object, instead of tilting in the direction of the force, it rotates perpendicular to both the spin axis and the applied torque. This is described by the equation τ = dL/dt, where the change in angular momentum is perpendicular to the applied torque."
    },
    // Question 2: Bicycle stability (Easy-Medium)
    {
      scenario: "A cyclist notices that riding at higher speeds makes the bicycle feel more stable and resistant to falling over. At very low speeds, the same bicycle feels wobbly and requires constant balance corrections.",
      question: "How do the spinning wheels contribute to bicycle stability at higher speeds?",
      options: [
        { id: 'a', label: "Faster wheels generate more air resistance that pushes the bike upright" },
        { id: 'b', label: "The wheels' angular momentum creates gyroscopic resistance to tilting", correct: true },
        { id: 'c', label: "Centrifugal force from the wheels pushes outward against the ground" },
        { id: 'd', label: "Higher speed creates more friction between the tires and road" }
      ],
      explanation: "Spinning bicycle wheels have angular momentum (L = Iω), which increases with wheel speed. This angular momentum resists changes to the wheel's orientation due to conservation of angular momentum. When the bike starts to tilt, the gyroscopic effect creates a restoring torque that helps keep the bike upright. While other factors like trail geometry also contribute to bicycle stability, the gyroscopic effect becomes increasingly significant at higher speeds."
    },
    // Question 3: Smartphone orientation sensing (Medium)
    {
      scenario: "A smartphone game developer notices that the phone can detect rotation even when stationary. The phone uses tiny MEMS gyroscopes that contain vibrating structures instead of spinning wheels, yet still measure rotational motion accurately.",
      question: "How do MEMS gyroscopes in smartphones detect rotation without using traditional spinning wheels?",
      options: [
        { id: 'a', label: "They use GPS signals to calculate the phone's angular position" },
        { id: 'b', label: "Tiny magnets inside the sensor respond to Earth's magnetic field changes" },
        { id: 'c', label: "Vibrating structures experience Coriolis forces when rotated, which are measured capacitively", correct: true },
        { id: 'd', label: "Accelerometers detect the centrifugal force created by rotation" }
      ],
      explanation: "MEMS (Micro-Electro-Mechanical Systems) gyroscopes use the Coriolis effect instead of spinning mass. A tiny vibrating structure moves back and forth at a known frequency. When the device rotates, the Coriolis force deflects this vibrating mass perpendicular to both its velocity and the rotation axis. This deflection is detected by measuring capacitance changes between the mass and nearby electrodes, providing precise rotation rate measurements in a chip only millimeters in size."
    },
    // Question 4: Ship stabilizers (Medium)
    {
      scenario: "A luxury cruise ship crossing the Atlantic Ocean uses massive gyroscopic stabilizers weighing several tons each. During a storm with 15-foot waves, passengers notice the ship remains remarkably level while smaller vessels nearby are rolling dramatically.",
      question: "How do gyroscopic stabilizers reduce a ship's rolling motion in rough seas?",
      options: [
        { id: 'a', label: "The spinning gyroscopes add weight to the bottom of the ship, lowering its center of gravity" },
        { id: 'b', label: "They pump water between tanks on opposite sides of the ship to counterbalance waves" },
        { id: 'c', label: "The gyroscopes' precession generates counter-torque that opposes the wave-induced rolling", correct: true },
        { id: 'd', label: "Gyroscopes create a magnetic field that repels the water beneath the ship" }
      ],
      explanation: "Ship gyroscopic stabilizers work by harnessing precession. When waves try to roll the ship, this motion applies a torque to the spinning gyroscope. Due to precession, the gyroscope responds by tilting in a perpendicular direction, which through mechanical linkages generates a counter-torque that opposes the rolling motion. Modern systems actively control the precession rate to maximize the stabilizing effect, reducing roll by up to 90% in some conditions."
    },
    // Question 5: Airplane attitude instruments (Medium-Hard)
    {
      scenario: "A pilot flying through thick clouds cannot see the horizon, yet the aircraft's attitude indicator (artificial horizon) continues to show the exact orientation of the aircraft relative to the ground. This instrument uses a gyroscope that maintains its orientation regardless of the aircraft's movements.",
      question: "What property of gyroscopes makes them suitable as a reference for aircraft attitude indicators?",
      options: [
        { id: 'a', label: "Gyroscopes align themselves with Earth's magnetic field, always pointing north" },
        { id: 'b', label: "Rigidity in space - a spinning gyroscope maintains its orientation relative to inertial space", correct: true },
        { id: 'c', label: "Gyroscopes are connected to GPS satellites that provide real-time orientation data" },
        { id: 'd', label: "The gyroscope senses air pressure differences to determine aircraft tilt" }
      ],
      explanation: "Gyroscopes exhibit 'rigidity in space' - once spinning, they maintain their orientation relative to inertial (fixed) space due to conservation of angular momentum. In an attitude indicator, the gyroscope is initially aligned with the horizon. As the aircraft pitches and rolls, the gyroscope resists these movements, maintaining its original orientation. The aircraft's movement relative to the stable gyroscope is measured and displayed to the pilot as pitch and bank angles."
    },
    // Question 6: Control moment gyros in spacecraft (Hard)
    {
      scenario: "The International Space Station uses four Control Moment Gyroscopes (CMGs), each containing a 220-pound wheel spinning at 6,600 RPM. To change the station's orientation, motors tilt these spinning wheels rather than firing thrusters, saving precious propellant.",
      question: "How do Control Moment Gyroscopes generate torque to rotate a spacecraft?",
      options: [
        { id: 'a', label: "The spinning wheels create artificial gravity that pulls the spacecraft in the desired direction" },
        { id: 'b', label: "Tilting the spinning wheel's axis causes precession, transferring angular momentum to the spacecraft", correct: true },
        { id: 'c', label: "The gyroscopes emit charged particles that push against Earth's magnetic field" },
        { id: 'd', label: "Changing the wheel's spin speed creates reaction forces on the spacecraft" }
      ],
      explanation: "CMGs generate torque through forced precession. When a gimbal motor tilts the axis of the spinning wheel, the gyroscope resists this change and produces a torque perpendicular to both the spin axis and the gimbal axis. This torque is transmitted to the spacecraft, causing it to rotate. CMGs are more efficient than reaction wheels because they produce torque proportional to both the wheel's angular momentum AND the gimbal rate, allowing small motors to generate large torques. The ISS CMGs can produce up to 258 N·m of torque each."
    },
    // Question 7: Ring laser gyroscopes (Hard)
    {
      scenario: "A commercial airliner's navigation system uses ring laser gyroscopes that have no moving parts whatsoever. Two laser beams travel in opposite directions around a triangular glass path, and the system detects rotation by measuring the difference in the beams' frequencies.",
      question: "What physical principle allows ring laser gyroscopes to detect rotation using light beams?",
      options: [
        { id: 'a', label: "Rotating the gyroscope Doppler-shifts the laser frequency proportional to angular velocity" },
        { id: 'b', label: "The Sagnac effect - rotation changes the effective path length differently for counter-propagating beams", correct: true },
        { id: 'c', label: "Photons have angular momentum that transfers to the glass ring during rotation" },
        { id: 'd', label: "The laser beams bend due to centrifugal force when the gyroscope rotates" }
      ],
      explanation: "Ring laser gyroscopes exploit the Sagnac effect. Light traveling in the direction of rotation must travel a slightly longer path to complete the circuit (the detector has moved), while light traveling opposite to rotation travels a shorter path. This path length difference causes a frequency difference between the two beams, which creates an interference pattern. The resulting beat frequency is directly proportional to the rotation rate. With no mechanical parts, RLGs are extremely reliable and accurate, detecting rotation rates as small as 0.001 degrees per hour."
    },
    // Question 8: MEMS gyroscope operation (Hard)
    {
      scenario: "An engineer designing a drone flight controller selects a MEMS gyroscope that uses a 'tuning fork' design. Two masses vibrate toward and away from each other at 25 kHz. When the drone rotates, sensors detect sideways deflection of these masses.",
      question: "Why must MEMS gyroscope proof masses be vibrating rather than stationary to detect rotation?",
      options: [
        { id: 'a', label: "Vibration heats the masses, making them more sensitive to magnetic field changes" },
        { id: 'b', label: "Stationary masses would be pulled down by gravity, preventing rotation detection" },
        { id: 'c', label: "The Coriolis force only acts on moving masses - stationary objects experience no Coriolis effect", correct: true },
        { id: 'd', label: "Vibration creates resonance that amplifies the electronic measurement signal" }
      ],
      explanation: "The Coriolis force is described by F = -2m(ω × v), meaning it only acts on objects that are already moving (velocity v ≠ 0) within a rotating reference frame. If the proof mass were stationary relative to the sensor, there would be no Coriolis force to measure when the device rotates. By keeping the mass vibrating at a known frequency, any rotation produces a measurable Coriolis force perpendicular to the vibration direction. The vibration frequency is chosen to match the mechanical resonance, maximizing sensitivity."
    },
    // Question 9: Gyroscopic effects in rotating machinery (Hard)
    {
      scenario: "A wind turbine engineer investigates why certain turbine designs experience unexpected stress on their bearings. When the turbine's nacelle yaws (rotates horizontally) to track changing wind directions while the blades are spinning, large gyroscopic loads develop that can damage the yaw bearings.",
      question: "Why does yawing a spinning wind turbine create damaging gyroscopic loads on the bearings?",
      options: [
        { id: 'a', label: "The wind pushes harder on one side of the rotor when it's not facing directly into the wind" },
        { id: 'b', label: "Yawing applies torque to the spinning rotor, which produces precession forces perpendicular to both the spin and yaw axes", correct: true },
        { id: 'c', label: "Centrifugal force from the spinning blades increases during yaw maneuvers" },
        { id: 'd', label: "The generator's magnetic field interacts with Earth's magnetic field during rotation" }
      ],
      explanation: "When a spinning rotor is forced to yaw (rotate about a vertical axis), gyroscopic precession creates a pitching moment (torque about the horizontal axis perpendicular to both the spin and yaw). This gyroscopic torque, described by τ = Iω × Ω (where ω is spin rate and Ω is yaw rate), creates bending moments on the main shaft and loads on the bearings that weren't intended in the original design. Large wind turbines with heavy rotors spinning at lower speeds still produce significant gyroscopic moments during rapid yaw maneuvers, requiring careful engineering consideration."
    },
    // Question 10: Inertial navigation systems (Hard)
    {
      scenario: "A submarine navigating under Arctic ice cannot use GPS, yet its inertial navigation system tracks its position within meters over weeks of underwater travel. The system uses a 'stable platform' with three gyroscopes that maintain their orientation regardless of the submarine's movements.",
      question: "How does an inertial navigation system use gyroscopes to maintain position accuracy over long periods without external references?",
      options: [
        { id: 'a', label: "Gyroscopes measure the submarine's speed through the water, which is integrated to find position" },
        { id: 'b', label: "The gyroscopes detect changes in water pressure that indicate depth and current direction" },
        { id: 'c', label: "Gyroscopes maintain a stable reference frame, allowing accelerometers to measure true acceleration for double integration into position", correct: true },
        { id: 'd', label: "Gyroscopes sense the submarine's distance from the North Pole using Earth's rotation" }
      ],
      explanation: "Inertial navigation works by double-integrating acceleration to get position. However, accelerometers measure acceleration in their own reference frame, which tilts with the vehicle. Gyroscopes solve this by maintaining a stable platform that doesn't rotate with the submarine. This allows the accelerometers to measure acceleration in a fixed reference frame. By subtracting gravity (which the system knows based on its gyro-maintained orientation) and double-integrating the remaining acceleration, the system calculates velocity and position. Modern ring laser gyroscopes are so precise that position errors accumulate at only about 1 nautical mile per hour of operation."
    }
  ];

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

  const currentIndex = phaseOrder.indexOf(phase);

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
            {phaseOrder.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-emerald-400 w-6' : currentIndex > index ? 'bg-emerald-500 w-2' : 'bg-slate-600 w-2'
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
