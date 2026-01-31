'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { playSound } from '../lib/audio';

// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

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

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

interface InductiveKickbackRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What causes inductive kickback when a switch opens?',
    options: [
      { text: 'Capacitor discharge creates voltage', correct: false },
      { text: 'The collapsing magnetic field induces voltage (V = -L di/dt)', correct: true },
      { text: 'Static electricity from the switch contacts', correct: false },
      { text: 'Heat from resistance generates voltage', correct: false },
    ],
  },
  {
    question: 'Why can kickback voltage be MUCH higher than the supply voltage?',
    options: [
      { text: 'The battery releases extra stored energy', correct: false },
      { text: 'Wire resistance amplifies the voltage', correct: false },
      { text: 'The rate of current change (di/dt) is extremely fast when interrupted', correct: true },
      { text: 'Magnetic fields naturally create higher voltages', correct: false },
    ],
  },
  {
    question: 'What is the purpose of a flyback diode?',
    options: [
      { text: 'To increase the kickback voltage', correct: false },
      { text: 'To convert AC to DC power', correct: false },
      { text: 'To provide a safe path for current, clamping the voltage spike', correct: true },
      { text: 'To store energy in the magnetic field', correct: false },
    ],
  },
  {
    question: 'In a car ignition system, what voltage does the coil produce from 12V?',
    options: [
      { text: 'About 24V (doubled)', correct: false },
      { text: 'About 120V (10x)', correct: false },
      { text: 'About 1,000V (100x)', correct: false },
      { text: 'About 40,000V (over 3,000x)', correct: true },
    ],
  },
  {
    question: 'How does a boost converter use inductive kickback?',
    options: [
      { text: 'It eliminates kickback to save energy', correct: false },
      { text: 'Controlled switching captures kickback energy to raise output voltage', correct: true },
      { text: 'It converts the kickback to heat', correct: false },
      { text: 'It only works by filtering out the kickback', correct: false },
    ],
  },
  {
    question: 'What happens if you control a relay from an Arduino WITHOUT a flyback diode?',
    options: [
      { text: 'The relay works perfectly fine', correct: false },
      { text: 'The Arduino runs faster', correct: false },
      { text: 'The kickback spike can damage or destroy the Arduino', correct: true },
      { text: 'The relay becomes more efficient', correct: false },
    ],
  },
  {
    question: 'Which formula describes the induced voltage from an inductor?',
    options: [
      { text: 'V = IR (Ohm\'s law)', correct: false },
      { text: 'P = IV (Power equation)', correct: false },
      { text: 'V = -L x (di/dt) (Inductor equation)', correct: true },
      { text: 'V = Q/C (Capacitor equation)', correct: false },
    ],
  },
  {
    question: 'What type of switching frequency do boost converters typically use?',
    options: [
      { text: '50-60 Hz (like household AC)', correct: false },
      { text: '100 Hz - 1 kHz (low frequency)', correct: false },
      { text: '10 kHz - 1 MHz (high frequency switching)', correct: true },
      { text: 'They don\'t switch at all', correct: false },
    ],
  },
  {
    question: 'Why is inductance measured in Henrys (H)?',
    options: [
      { text: 'Named after the Henry battery company', correct: false },
      { text: 'Represents how much energy the magnetic field can store', correct: true },
      { text: 'Measures the resistance of the coil', correct: false },
      { text: 'Indicates the coil\'s temperature rating', correct: false },
    ],
  },
  {
    question: 'What makes inductive loads (motors, relays, solenoids) different from resistive loads?',
    options: [
      { text: 'They use more electricity', correct: false },
      { text: 'They store energy in magnetic fields that must be dissipated', correct: true },
      { text: 'They work on AC only', correct: false },
      { text: 'They generate heat immediately', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// PREMIUM UI COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

const ProgressIndicator: React.FC<{ current: number; total: number; phase: Phase }> = ({
  current,
  total,
  phase,
}) => {
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Prediction',
    play: 'Simulation',
    review: 'Concepts',
    twist_predict: 'Twist',
    twist_play: 'Boost Demo',
    twist_review: 'Applications',
    transfer: 'Real World',
    test: 'Assessment',
    mastery: 'Complete',
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-amber-700 tracking-wide uppercase">
          {phaseLabels[phase]}
        </span>
        <span className="text-sm font-medium text-slate-500">
          {current} of {total}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
};

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  fullWidth?: boolean;
}> = ({ children, onMouseDown, disabled, variant = 'primary', fullWidth = true }) => {
  const baseClasses = `py-4 px-8 rounded-2xl font-semibold text-lg transition-all duration-200 transform ${
    fullWidth ? 'w-full' : ''
  }`;

  const variantClasses = {
    primary: disabled
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0',
    secondary: disabled
      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50',
    success: disabled
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5',
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled) {
        onMouseDown(e);
      }
    },
    [disabled, onMouseDown]
  );

  return (
    <button
      onMouseDown={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// APPLICATION GRAPHICS
// ────────────────────────────────────────────────────────────────────────────

const IgnitionCoilGraphic: React.FC = () => (
  <svg viewBox="0 0 400 300" className="w-full h-64">
    <defs>
      <linearGradient id="ignitionSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id="coilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="400" height="300" fill="#1e293b" rx="12" />

    {/* Battery */}
    <rect x="30" y="120" width="60" height="80" fill="#374151" rx="8" stroke="#4b5563" strokeWidth="2" />
    <rect x="45" y="110" width="30" height="12" fill="#4b5563" rx="2" />
    <text x="60" y="168" textAnchor="middle" fill="#fbbf24" fontSize="18" fontWeight="bold">12V</text>

    {/* Primary coil */}
    <rect x="140" y="100" width="60" height="120" fill="url(#coilGrad)" rx="8" />
    <path d="M155 130 Q165 120, 175 130 Q185 140, 195 130" fill="none" stroke="#a5b4fc" strokeWidth="3" />
    <path d="M155 150 Q165 140, 175 150 Q185 160, 195 150" fill="none" stroke="#a5b4fc" strokeWidth="3" />
    <path d="M155 170 Q165 160, 175 170 Q185 180, 195 170" fill="none" stroke="#a5b4fc" strokeWidth="3" />
    <path d="M155 190 Q165 180, 175 190 Q185 200, 195 190" fill="none" stroke="#a5b4fc" strokeWidth="3" />
    <text x="170" y="240" textAnchor="middle" fill="#94a3b8" fontSize="11">PRIMARY</text>
    <text x="170" y="253" textAnchor="middle" fill="#64748b" fontSize="10">~200 turns</text>

    {/* Secondary coil */}
    <rect x="220" y="80" width="40" height="160" fill="url(#coilGrad)" rx="6" />
    {[...Array(12)].map((_, i) => (
      <path key={i} d={`M225 ${95 + i * 12} Q235 ${89 + i * 12}, 245 ${95 + i * 12} Q255 ${101 + i * 12}, 255 ${95 + i * 12}`}
        fill="none" stroke="#c7d2fe" strokeWidth="1.5" />
    ))}
    <text x="240" y="260" textAnchor="middle" fill="#94a3b8" fontSize="11">SECONDARY</text>
    <text x="240" y="273" textAnchor="middle" fill="#64748b" fontSize="10">~20,000 turns</text>

    {/* Spark plug */}
    <rect x="300" y="100" width="40" height="60" fill="#475569" rx="6" />
    <rect x="308" y="80" width="24" height="25" fill="#1f2937" rx="4" />
    <rect x="315" y="160" width="10" height="30" fill="#94a3b8" />
    <rect x="312" y="190" width="16" height="8" fill="#64748b" rx="2" />

    {/* Spark effect */}
    <path d="M320 200 L315 215 L325 210 L318 230" fill="none" stroke="url(#ignitionSparkGrad)" strokeWidth="3" strokeLinecap="round">
      <animate attributeName="opacity" values="1;0.3;1" dur="0.15s" repeatCount="indefinite" />
    </path>
    <circle cx="320" cy="220" r="15" fill="#fbbf24" opacity="0.3">
      <animate attributeName="r" values="10;20;10" dur="0.3s" repeatCount="indefinite" />
    </circle>

    {/* Voltage labels */}
    <rect x="90" y="130" width="35" height="24" fill="#1f2937" rx="4" />
    <text x="107" y="147" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">12V</text>

    <rect x="270" y="130" width="55" height="24" fill="#1f2937" rx="4" />
    <text x="297" y="147" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">40,000V</text>

    {/* Connection wires */}
    <path d="M90 160 L140 160" stroke="#22c55e" strokeWidth="3" />
    <path d="M200 160 L220 160" stroke="#6366f1" strokeWidth="4" strokeDasharray="4,2" />
    <path d="M260 160 L300 160" stroke="#ef4444" strokeWidth="2" />

    {/* Title */}
    <text x="200" y="35" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">
      Automotive Ignition Coil
    </text>
    <text x="200" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12">
      Inductive kickback amplifies voltage 3,000×
    </text>
  </svg>
);

const BoostConverterGraphic: React.FC = () => (
  <svg viewBox="0 0 400 300" className="w-full h-64">
    <defs>
      <linearGradient id="boostPowerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
      <linearGradient id="inductorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="400" height="300" fill="#1e293b" rx="12" />

    {/* Input source */}
    <rect x="20" y="110" width="55" height="70" fill="#374151" rx="8" stroke="#4b5563" strokeWidth="2" />
    <text x="47" y="150" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="bold">5V</text>
    <text x="47" y="168" textAnchor="middle" fill="#94a3b8" fontSize="10">INPUT</text>

    {/* Inductor */}
    <rect x="95" y="100" width="70" height="90" fill="url(#inductorGrad)" rx="10" opacity="0.3" />
    <path d="M105 145 Q120 125, 135 145 Q150 165, 165 145" fill="none" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
    <text x="130" y="205" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="bold">INDUCTOR</text>

    {/* MOSFET switch */}
    <rect x="145" y="170" width="35" height="45" fill="#475569" rx="6" stroke="#64748b" strokeWidth="2" />
    <text x="162" y="195" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">FET</text>
    <circle cx="162" cy="210" r="4" fill="#22c55e">
      <animate attributeName="fill" values="#22c55e;#64748b;#22c55e" dur="0.1s" repeatCount="indefinite" />
    </circle>

    {/* Switching indicator */}
    <rect x="125" y="220" width="75" height="20" fill="#1f2937" rx="4" />
    <text x="162" y="234" textAnchor="middle" fill="#fbbf24" fontSize="10">100 kHz</text>

    {/* Diode */}
    <polygon points="205,130 230,145 205,160" fill="#6366f1" />
    <line x1="230" y1="130" x2="230" y2="160" stroke="#6366f1" strokeWidth="4" />
    <text x="217" y="180" textAnchor="middle" fill="#94a3b8" fontSize="10">Diode</text>

    {/* Capacitor */}
    <line x1="255" y1="115" x2="255" y2="175" stroke="#64748b" strokeWidth="4" />
    <line x1="270" y1="115" x2="270" y2="175" stroke="#64748b" strokeWidth="4" />
    <text x="262" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10">Cap</text>

    {/* Output */}
    <rect x="300" y="95" width="80" height="100" fill="#1f2937" rx="10" stroke="#22c55e" strokeWidth="2" />
    <text x="340" y="130" textAnchor="middle" fill="#94a3b8" fontSize="12">OUTPUT</text>
    <text x="340" y="165" textAnchor="middle" fill="#22c55e" fontSize="28" fontWeight="bold">12V</text>

    {/* Energy flow animation */}
    <circle cx="88" cy="145" r="6" fill="#22c55e">
      <animate attributeName="cx" values="88;160;88" dur="0.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
    </circle>

    {/* Kickback arrow */}
    <path d="M165 130 L165 100 L155 110 M165 100 L175 110" fill="none" stroke="#fbbf24" strokeWidth="2">
      <animate attributeName="opacity" values="0;1;0" dur="0.1s" repeatCount="indefinite" />
    </path>
    <text x="165" y="90" textAnchor="middle" fill="#fbbf24" fontSize="9">KICKBACK</text>

    {/* Connection lines */}
    <path d="M75 145 L95 145" stroke="#22c55e" strokeWidth="3" />
    <path d="M165 145 L205 145" stroke="#a5b4fc" strokeWidth="2" />
    <path d="M230 145 L255 145" stroke="#6366f1" strokeWidth="2" />
    <path d="M270 145 L300 145" stroke="#22c55e" strokeWidth="3" />

    {/* Title */}
    <text x="200" y="35" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">
      DC-DC Boost Converter
    </text>
    <text x="200" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12">
      Steps up voltage using controlled kickback
    </text>
  </svg>
);

const FlybackProtectionGraphic: React.FC = () => (
  <svg viewBox="0 0 400 300" className="w-full h-64">
    <defs>
      <linearGradient id="protectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="400" height="300" fill="#1e293b" rx="12" />

    {/* Arduino board */}
    <rect x="20" y="80" width="100" height="140" fill="#0d9488" rx="8" stroke="#14b8a6" strokeWidth="2" />
    <rect x="30" y="90" width="30" height="20" fill="#1f2937" rx="4" />
    <text x="45" y="105" textAnchor="middle" fill="#94a3b8" fontSize="8">USB</text>
    <text x="70" y="140" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Arduino</text>

    {/* Digital pin */}
    <rect x="90" y="150" width="25" height="15" fill="#1f2937" rx="2" />
    <text x="102" y="161" textAnchor="middle" fill="#fbbf24" fontSize="8">D7</text>

    {/* Protection circuit box */}
    <rect x="140" y="100" width="120" height="100" fill="#1f2937" rx="8" stroke="#475569" strokeWidth="2" strokeDasharray="4,2" />
    <text x="200" y="120" textAnchor="middle" fill="#94a3b8" fontSize="10">PROTECTION CIRCUIT</text>

    {/* Transistor */}
    <circle cx="170" cy="160" r="18" fill="#374151" stroke="#6366f1" strokeWidth="2" />
    <text x="170" y="165" textAnchor="middle" fill="#a5b4fc" fontSize="10">NPN</text>

    {/* Flyback diode - highlighted */}
    <polygon points="220,140 240,150 220,160" fill="url(#protectionGrad)" />
    <line x1="240" y1="140" x2="240" y2="160" stroke="#22c55e" strokeWidth="4" />
    <rect x="210" y="165" width="40" height="18" fill="#1f2937" rx="4" />
    <text x="230" y="178" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold">FLYBACK</text>

    {/* Relay/Motor */}
    <rect x="280" y="90" width="90" height="120" fill="#374151" rx="10" stroke="#4b5563" strokeWidth="2" />
    <rect x="295" y="110" width="60" height="40" fill="#6366f1" rx="6" opacity="0.8" />
    <path d="M305 130 Q320 115, 335 130 Q350 145, 350 130" fill="none" stroke="#a5b4fc" strokeWidth="3" />
    <text x="325" y="170" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">RELAY</text>
    <text x="325" y="185" textAnchor="middle" fill="#94a3b8" fontSize="10">Coil</text>

    {/* Voltage spike visualization (blocked) */}
    <path d="M275 130 L265 130 L268 120 L260 140 L263 130" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.5" />
    <text x="262" y="115" textAnchor="middle" fill="#ef4444" fontSize="8">Spike</text>
    <circle cx="262" cy="130" r="10" fill="none" stroke="#22c55e" strokeWidth="2" />
    <path d="M255 123 L269 137" stroke="#22c55e" strokeWidth="2" />

    {/* Safe indicator */}
    <rect x="300" y="220" width="70" height="25" fill="#22c55e" rx="6" opacity="0.2" />
    <text x="335" y="237" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">✓ SAFE</text>

    {/* Connections */}
    <path d="M115 158 L150 158" stroke="#fbbf24" strokeWidth="2" />
    <path d="M188 160 L210 150" stroke="#6366f1" strokeWidth="2" />
    <path d="M250 150 L280 130" stroke="#22c55e" strokeWidth="2" />

    {/* Title */}
    <text x="200" y="35" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">
      Microcontroller Relay Protection
    </text>
    <text x="200" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12">
      Flyback diode protects Arduino from voltage spikes
    </text>
  </svg>
);

const SwitchModeSupplyGraphic: React.FC = () => (
  <svg viewBox="0 0 400 300" className="w-full h-64">
    <defs>
      <linearGradient id="smpsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="400" height="300" fill="#1e293b" rx="12" />

    {/* Power supply enclosure */}
    <rect x="100" y="80" width="200" height="140" fill="#374151" rx="12" stroke="#4b5563" strokeWidth="3" />

    {/* Input section */}
    <rect x="30" y="120" width="60" height="60" fill="#1f2937" rx="6" />
    <text x="60" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">AC IN</text>
    <text x="60" y="160" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">120V</text>
    <text x="60" y="175" textAnchor="middle" fill="#64748b" fontSize="10">60Hz</text>

    {/* Internal components */}
    <rect x="115" y="100" width="40" height="30" fill="#6366f1" rx="4" opacity="0.7" />
    <text x="135" y="120" textAnchor="middle" fill="#ffffff" fontSize="9">Rectifier</text>

    <rect x="165" y="100" width="45" height="30" fill="url(#smpsGrad)" rx="4" />
    <text x="187" y="115" textAnchor="middle" fill="#ffffff" fontSize="8">HF</text>
    <text x="187" y="125" textAnchor="middle" fill="#ffffff" fontSize="8">Switch</text>

    <rect x="220" y="95" width="30" height="40" fill="#8b5cf6" rx="4" />
    <path d="M227 115 Q235 105, 243 115" fill="none" stroke="#c4b5fd" strokeWidth="2" />
    <text x="235" y="145" textAnchor="middle" fill="#a5b4fc" fontSize="8">Xformer</text>

    <rect x="260" y="105" width="30" height="25" fill="#22c55e" rx="4" opacity="0.7" />
    <text x="275" y="122" textAnchor="middle" fill="#ffffff" fontSize="8">Filter</text>

    {/* Feedback loop */}
    <path d="M275 150 L275 185 L150 185 L150 145" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,2" />
    <text x="212" y="200" textAnchor="middle" fill="#fbbf24" fontSize="9">Feedback Control</text>

    {/* Output section */}
    <rect x="310" y="110" width="70" height="80" fill="#1f2937" rx="8" stroke="#22c55e" strokeWidth="2" />
    <text x="345" y="135" textAnchor="middle" fill="#94a3b8" fontSize="10">DC OUT</text>
    <text x="345" y="160" textAnchor="middle" fill="#22c55e" fontSize="18" fontWeight="bold">5V</text>
    <text x="345" y="180" textAnchor="middle" fill="#94a3b8" fontSize="10">3A / 15W</text>

    {/* Connection arrows */}
    <path d="M90 150 L100 150" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow)" />
    <path d="M300 150 L310 150" stroke="#22c55e" strokeWidth="3" />

    {/* Efficiency badge */}
    <rect x="170" y="155" width="60" height="24" fill="#22c55e" rx="12" opacity="0.2" />
    <text x="200" y="172" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">90% Eff</text>

    {/* Phone/device */}
    <rect x="320" y="210" width="50" height="80" fill="#475569" rx="8" stroke="#64748b" strokeWidth="2" />
    <rect x="328" y="220" width="34" height="50" fill="#1e293b" rx="4" />
    <text x="345" y="250" textAnchor="middle" fill="#22c55e" fontSize="12">📱</text>

    {/* Charging indicator */}
    <path d="M345 195 L345 210" stroke="#22c55e" strokeWidth="2" strokeDasharray="2,2">
      <animate attributeName="stroke-dashoffset" values="0;4" dur="0.5s" repeatCount="indefinite" />
    </path>

    {/* Title */}
    <text x="200" y="35" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">
      Switch Mode Power Supply
    </text>
    <text x="200" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12">
      High-frequency switching enables compact, efficient design
    </text>
  </svg>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function InductiveKickbackRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: InductiveKickbackRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const [currentPhase, setCurrentPhase] = useState<Phase>(phase || 'hook');
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [activeAppTab, setActiveAppTab] = useState(0);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase: Relay simulator
  const [switchOn, setSwitchOn] = useState(true);
  const [hasFlybackDiode, setHasFlybackDiode] = useState(false);
  const [kickbackVoltage, setKickbackVoltage] = useState(0);
  const [showSpark, setShowSpark] = useState(false);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase: Boost converter
  const [boostActive, setBoostActive] = useState(false);
  const [boostOutput, setBoostOutput] = useState(5);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>(0);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  // Animation for kickback decay
  useEffect(() => {
    if (kickbackVoltage > 0) {
      animationRef.current = requestAnimationFrame(() => {
        setKickbackVoltage(v => Math.max(0, v - 15));
      });
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [kickbackVoltage]);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION WITH DUAL DEBOUNCING
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setCurrentPhase(newPhase);
    setTimeout(() => {
      navigationLockRef.current = false;
    }, 200);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(currentPhase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  }, [currentPhase, goToPhase]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = useCallback((choice: string) => {
    playSound('click');
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    playSound('click');
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleSwitchToggle = useCallback(() => {
    if (switchOn) {
      if (!hasFlybackDiode) {
        setKickbackVoltage(350);
        setShowSpark(true);
        setTimeout(() => setShowSpark(false), 300);
      } else {
        setKickbackVoltage(12);
      }
    }
    setSwitchOn(prev => !prev);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setHasExperimented(true);
      }
      return newCount;
    });
  }, [switchOn, hasFlybackDiode]);

  const handleToggleDiode = useCallback(() => {
    setHasFlybackDiode(prev => !prev);
  }, []);

  const handleBoostToggle = useCallback(() => {
    setBoostActive(prev => {
      if (!prev) {
        let output = 5;
        const interval = setInterval(() => {
          output += 3;
          if (output >= 12) {
            setBoostOutput(12);
            clearInterval(interval);
          } else {
            setBoostOutput(output);
          }
        }, 100);
        return true;
      } else {
        setBoostOutput(5);
        return false;
      }
    });
    setHasExploredTwist(true);
  }, []);

  const handleCompleteApp = useCallback((appIndex: number) => {
    playSound('success');
    setCompletedApps(prev => new Set([...prev, appIndex]));
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    playSound('click');
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer !== null && TEST_QUESTIONS[index].options[answer].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 7 ? 'success' : 'failure');
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderRelayCircuit = () => (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
      <svg viewBox="0 0 400 220" className="w-full h-52">
        {/* Battery */}
        <rect x="30" y="80" width="40" height="60" fill="#374151" rx="4" />
        <text x="50" y="115" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          12V
        </text>

        {/* Wires */}
        <path
          d="M 70 100 L 120 100"
          stroke={switchOn ? '#22C55E' : '#6B7280'}
          strokeWidth="4"
          fill="none"
        />

        {/* Switch */}
        <circle cx="140" cy="100" r="8" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
        <line
          x1="140"
          y1="100"
          x2={switchOn ? '170' : '160'}
          y2={switchOn ? '100' : '80'}
          stroke="#374151"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="170" cy="100" r="6" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />

        {/* Spark effect */}
        {showSpark && (
          <>
            <circle cx="155" cy="90" r="15" fill="#FEF08A" opacity="0.8">
              <animate attributeName="r" values="5;20;5" dur="0.3s" />
              <animate attributeName="opacity" values="1;0;1" dur="0.3s" />
            </circle>
            <text x="155" y="65" textAnchor="middle" fill="#DC2626" fontSize="14" fontWeight="bold">
              ⚡ SPARK!
            </text>
          </>
        )}

        {/* Wire to coil */}
        <path
          d="M 180 100 L 220 100"
          stroke={switchOn ? '#22C55E' : '#6B7280'}
          strokeWidth="4"
          fill="none"
        />

        {/* Inductor coil */}
        <rect x="220" y="70" width="80" height="60" fill="none" stroke="#6366F1" strokeWidth="3" rx="8" />
        <path
          d="M 235 100 C 240 85, 250 85, 255 100 C 260 115, 270 115, 275 100 C 280 85, 290 85, 295 100"
          fill="none"
          stroke="#6366F1"
          strokeWidth="3"
        />
        <text x="260" y="145" textAnchor="middle" fill="#a5b4fc" fontSize="11">
          RELAY COIL
        </text>

        {/* Magnetic field indicator */}
        {switchOn && (
          <>
            <ellipse cx="260" cy="100" rx="50" ry="25" fill="none" stroke="#A5B4FC" strokeWidth="1" strokeDasharray="4" opacity="0.6">
              <animate attributeName="rx" values="45;55;45" dur="2s" repeatCount="indefinite" />
            </ellipse>
            <text x="260" y="60" textAnchor="middle" fill="#a5b4fc" fontSize="10">
              Magnetic Field
            </text>
          </>
        )}

        {/* Flyback diode (if enabled) */}
        {hasFlybackDiode && (
          <>
            <polygon points="260,165 275,180 245,180" fill="#22C55E" />
            <line x1="245" y1="165" x2="275" y2="165" stroke="#22C55E" strokeWidth="3" />
            <text x="260" y="200" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">
              FLYBACK DIODE
            </text>
            <line x1="225" y1="130" x2="225" y2="172" stroke="#22C55E" strokeWidth="2" />
            <line x1="225" y1="172" x2="245" y2="172" stroke="#22C55E" strokeWidth="2" />
            <line x1="275" y1="172" x2="295" y2="172" stroke="#22C55E" strokeWidth="2" />
            <line x1="295" y1="172" x2="295" y2="130" stroke="#22C55E" strokeWidth="2" />
          </>
        )}

        {/* Return wire */}
        <path
          d="M 300 100 L 340 100 L 340 140 L 50 140 L 50 140"
          stroke={switchOn ? '#22C55E' : '#6B7280'}
          strokeWidth="4"
          fill="none"
        />

        {/* Kickback voltage indicator */}
        {kickbackVoltage > 0 && (
          <g>
            <rect x="320" y="20" width="70" height="40" fill={kickbackVoltage > 50 ? '#FEE2E2' : '#D1FAE5'} rx="6" />
            <text x="355" y="38" textAnchor="middle" fill={kickbackVoltage > 50 ? '#DC2626' : '#059669'} fontSize="10">
              SPIKE
            </text>
            <text x="355" y="52" textAnchor="middle" fill={kickbackVoltage > 50 ? '#DC2626' : '#059669'} fontSize="14" fontWeight="bold">
              {kickbackVoltage.toFixed(0)}V
            </text>
          </g>
        )}
      </svg>
    </div>
  );

  const renderBoostConverter = () => (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
      <svg viewBox="0 0 400 180" className="w-full h-44">
        {/* Input battery */}
        <rect x="20" y="60" width="50" height="60" fill="#374151" rx="6" />
        <text x="45" y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          5V
        </text>

        {/* Inductor */}
        <path
          d="M 80 90 C 90 75, 100 75, 110 90 C 120 105, 130 105, 140 90"
          fill="none"
          stroke="#6366F1"
          strokeWidth="4"
        />

        {/* Switch symbol */}
        <rect x="150" y="100" width="30" height="20" fill={boostActive ? '#22C55E' : '#9CA3AF'} rx="4" />
        <text x="165" y="114" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
          {boostActive ? 'ON' : 'OFF'}
        </text>

        {/* Switching frequency indicator */}
        {boostActive && (
          <g>
            <rect x="145" y="70" width="40" height="20" fill="#1e3a5f" rx="4" />
            <text x="165" y="84" textAnchor="middle" fill="#60a5fa" fontSize="8">
              100kHz
            </text>
          </g>
        )}

        {/* Diode */}
        <polygon points="200,90 220,80 220,100" fill="#6366F1" />
        <line x1="220" y1="80" x2="220" y2="100" stroke="#6366F1" strokeWidth="3" />

        {/* Capacitor */}
        <line x1="240" y1="75" x2="240" y2="105" stroke="#94a3b8" strokeWidth="3" />
        <line x1="250" y1="75" x2="250" y2="105" stroke="#94a3b8" strokeWidth="3" />

        {/* Output */}
        <rect x="280" y="55" width="90" height="70" fill="#1f2937" rx="8" stroke="#22c55e" strokeWidth="2" />
        <text x="325" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">
          OUTPUT
        </text>
        <text x="325" y="105" textAnchor="middle" fill={boostActive ? '#22c55e' : '#94a3b8'} fontSize="24" fontWeight="bold">
          {boostOutput}V
        </text>

        {/* Energy flow arrow */}
        {boostActive && (
          <path
            d="M 100 55 L 130 55 L 125 50 M 130 55 L 125 60"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
          >
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />
          </path>
        )}

        {/* Labels */}
        <text x="110" y="120" textAnchor="middle" fill="#a5b4fc" fontSize="10">
          Inductor
        </text>
        <text x="245" y="120" textAnchor="middle" fill="#94a3b8" fontSize="10">
          Cap
        </text>

        {/* Explanation */}
        <text x="200" y="160" textAnchor="middle" fill="#94a3b8" fontSize="11">
          {boostActive ? 'Inductor kickback boosts voltage!' : 'Activate to see boost effect'}
        </text>
      </svg>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO-BASED TEST QUESTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    {
      scenario: "You're debugging a simple circuit where a 12V relay coil is switched off using a mechanical switch. The switch contacts are showing burn marks after just a few days of use.",
      question: "What is the most likely cause of the switch contact damage?",
      options: [
        { id: 'a', label: "The switch is rated for too low a current", correct: false },
        { id: 'b', label: "Inductive kickback from the relay coil is arcing across the switch contacts", correct: true },
        { id: 'c', label: "The 12V power supply is providing too much voltage", correct: false },
        { id: 'd', label: "Static electricity is building up in the circuit", correct: false },
      ],
      explanation: "When current through an inductor (like a relay coil) is suddenly interrupted, the collapsing magnetic field induces a high voltage spike (V = -L di/dt). This 'inductive kickback' can be hundreds of volts, easily arcing across switch contacts and causing burn marks over time.",
    },
    {
      scenario: "An engineer is designing a circuit where an Arduino controls a 24V relay. The Arduino's GPIO pins can only withstand a maximum of 5V.",
      question: "What component should be added across the relay coil to protect the Arduino?",
      options: [
        { id: 'a', label: "A capacitor to store the excess energy", correct: false },
        { id: 'b', label: "A resistor to limit current flow", correct: false },
        { id: 'c', label: "A flyback diode oriented reverse-biased across the coil", correct: true },
        { id: 'd', label: "A fuse to break the circuit during spikes", correct: false },
      ],
      explanation: "A flyback diode (also called a freewheeling or snubber diode) is placed reverse-biased across the relay coil. When the switch opens, the diode becomes forward-biased and provides a safe path for the collapsing magnetic field's current, clamping the voltage spike to about 0.7V above the supply voltage instead of hundreds of volts.",
    },
    {
      scenario: "A technician notices that the flyback diode across a motor is installed with the cathode connected to the positive terminal and the anode to the negative terminal of the motor.",
      question: "What is the purpose of this specific diode orientation?",
      options: [
        { id: 'a', label: "To block current flow during normal motor operation while conducting during kickback", correct: true },
        { id: 'b', label: "To increase the motor's efficiency by reducing resistance", correct: false },
        { id: 'c', label: "To convert the AC motor current to DC", correct: false },
        { id: 'd', label: "To prevent the motor from spinning backwards", correct: false },
      ],
      explanation: "The flyback diode is reverse-biased during normal operation so it doesn't affect the circuit. When the switch opens and kickback occurs, the inductor's voltage reverses polarity, forward-biasing the diode and allowing current to circulate through it, safely dissipating the stored magnetic energy as heat.",
    },
    {
      scenario: "A robotics student is building an H-bridge motor driver using four MOSFETs to control a DC motor's direction. During testing, one of the MOSFETs fails immediately when the motor direction is reversed quickly.",
      question: "What most likely caused the MOSFET failure?",
      options: [
        { id: 'a', label: "The motor drew too much continuous current", correct: false },
        { id: 'b', label: "Inductive kickback from the motor exceeded the MOSFET's voltage rating", correct: true },
        { id: 'c', label: "The PWM frequency was set too high", correct: false },
        { id: 'd', label: "The gate driver voltage was insufficient", correct: false },
      ],
      explanation: "When a motor's direction is reversed quickly, the current through its windings must change direction. This rapid current change (high di/dt) generates a massive voltage spike that can exceed the MOSFET's drain-source breakdown voltage, causing immediate failure. Flyback diodes across each MOSFET are essential for protection.",
    },
    {
      scenario: "A car won't start. The mechanic measures 12V at the ignition coil primary but the spark plugs aren't firing. The ignition coil is supposed to generate around 40,000V for the spark plugs.",
      question: "How does the ignition coil achieve such a dramatic voltage increase from 12V to 40,000V?",
      options: [
        { id: 'a', label: "An internal battery booster multiplies the voltage", correct: false },
        { id: 'b', label: "The secondary coil has many more turns, and the rapid current interruption creates inductive kickback that is stepped up by the turns ratio", correct: true },
        { id: 'c', label: "Capacitors store energy and release it all at once", correct: false },
        { id: 'd', label: "The spark plugs themselves amplify the incoming voltage", correct: false },
      ],
      explanation: "The ignition coil is a transformer with the secondary having about 100x more turns than the primary. When current to the primary is suddenly interrupted, inductive kickback creates a voltage spike that is further multiplied by the turns ratio (100:1 becomes 12V x 100 = 1,200V primary spike, stepped up to ~40,000V on the secondary).",
    },
    {
      scenario: "An engineer is designing a snubber circuit for a high-power relay that switches 50 times per second. A simple flyback diode causes the relay to release too slowly, creating timing problems.",
      question: "What snubber circuit modification would allow faster relay release while still protecting against kickback?",
      options: [
        { id: 'a', label: "Remove the diode entirely and accept the voltage spikes", correct: false },
        { id: 'b', label: "Add a resistor in series with the flyback diode to allow some controlled voltage spike", correct: true },
        { id: 'c', label: "Replace the diode with a larger capacitor", correct: false },
        { id: 'd', label: "Use a higher voltage power supply to overwhelm the kickback", correct: false },
      ],
      explanation: "An RC snubber or a resistor-diode combination allows a controlled voltage spike (typically limited to 2-3x supply voltage) while speeding up the magnetic field collapse. The resistor dissipates energy faster than a diode alone, reducing the relay's release time. This is a common trade-off between protection level and switching speed.",
    },
    {
      scenario: "A power electronics designer is selecting a MOSFET for a flyback converter that operates from a 48V input. The MOSFET's datasheet shows a maximum Vds rating of 100V.",
      question: "Why might this MOSFET be inadequate for this application despite seeming to have sufficient margin?",
      options: [
        { id: 'a', label: "The MOSFET is too physically large for the circuit board", correct: false },
        { id: 'b', label: "Inductive kickback spikes from the transformer can exceed twice the input voltage, plus additional ringing", correct: true },
        { id: 'c', label: "48V systems require special low-voltage MOSFETs", correct: false },
        { id: 'd', label: "The switching frequency will be too slow with this MOSFET", correct: false },
      ],
      explanation: "In flyback converters, the MOSFET sees the input voltage plus the reflected output voltage plus any leakage inductance spikes. A 48V input can easily create 120V+ spikes across the MOSFET. Engineers typically select MOSFETs rated for 2-3x the expected peak voltage, so a 150V-200V rated device would be more appropriate.",
    },
    {
      scenario: "A switching power supply designer is working on a flyback converter for a phone charger. The design uses a transformer with a primary inductance of 500uH and switches at 100kHz.",
      question: "How does the flyback converter use inductive kickback to transfer energy to the output?",
      options: [
        { id: 'a', label: "Energy is transferred continuously while the switch is closed", correct: false },
        { id: 'b', label: "When the switch opens, the collapsing magnetic field transfers stored energy through the transformer to the secondary winding and output", correct: true },
        { id: 'c', label: "The transformer steps down AC voltage directly from the wall", correct: false },
        { id: 'd', label: "Kickback is eliminated by the transformer, allowing smooth DC output", correct: false },
      ],
      explanation: "In a flyback converter, energy is stored in the transformer's magnetic field while the switch is closed. When the switch opens, inductive kickback causes the magnetic field to collapse, transferring the stored energy to the secondary winding. This 'flyback' action is what gives the topology its name and enables efficient DC-DC conversion.",
    },
    {
      scenario: "A factory is experiencing mysterious electronic equipment failures. Investigation reveals that large motors and solenoids share power distribution with sensitive control electronics. Failures often occur when motors are turned off.",
      question: "What electromagnetic phenomenon is most likely causing these failures?",
      options: [
        { id: 'a', label: "Radio frequency interference from motor brushes", correct: false },
        { id: 'b', label: "Ground loops between the motor and control circuits", correct: false },
        { id: 'c', label: "EMI from inductive kickback coupling into nearby circuits through conducted and radiated emissions", correct: true },
        { id: 'd', label: "Power supply voltage droop when motors start", correct: false },
      ],
      explanation: "Inductive kickback generates high-frequency voltage spikes with fast rise times that radiate electromagnetic interference (EMI) and conduct through shared power lines. These transients can couple into nearby sensitive electronics, causing data corruption, resets, or permanent damage. Proper snubbing and EMI filtering at the source is essential.",
    },
    {
      scenario: "An electric vehicle engineer is designing a regenerative braking system. When the driver releases the accelerator, the motor should slow the car while recovering energy to the battery.",
      question: "How can the motor's inductive properties be used to recover braking energy?",
      options: [
        { id: 'a', label: "By disconnecting the motor and letting it spin freely as a generator", correct: false },
        { id: 'b', label: "By using controlled switching to route the motor's back-EMF and inductive energy through power electronics back to the battery", correct: true },
        { id: 'c', label: "By adding extra batteries that only charge during braking", correct: false },
        { id: 'd', label: "By converting the kinetic energy directly to heat in the motor windings", correct: false },
      ],
      explanation: "During regenerative braking, the motor acts as a generator with its own back-EMF. Power electronics actively control the current flow using PWM switching, routing the motor's inductive kickback energy back to the battery rather than dissipating it. This is the inverse of motoring operation and can recover 60-70% of braking energy.",
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
        <span className="text-4xl">⚡</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
        The Mysterious Voltage Spike
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Ever unplugged something with a motor and seen a spark? Or wondered why
        some circuits need special protection diodes?
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <span className="text-2xl">🧲</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Hidden Danger</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              When current through a coil suddenly stops, the collapsing magnetic
              field fights back with a massive voltage spike—often 10-100× the supply voltage!
            </p>
          </div>
        </div>
      </div>

      {/* Feature indicators */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: '🔌', label: 'Relays' },
          { icon: '🚗', label: 'Ignition' },
          { icon: '🔋', label: 'Converters' },
        ].map((item, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-xs text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('click'); goToPhase('predict'); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate the Spike
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-xl">🤔</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Make Your Prediction</h2>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <p className="text-blue-800 leading-relaxed">
          A relay coil is powered by <strong>12V</strong>. When you flip the switch OFF,
          what happens to the voltage across the coil?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'zero', label: 'Drops to 0V immediately', icon: '📉' },
          { id: 'gradual', label: 'Gradually decreases from 12V to 0V', icon: '📊' },
          { id: 'spike', label: 'Spikes to hundreds of volts briefly', icon: '⚡' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'spike'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-red-300 bg-red-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          prediction === 'spike' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${prediction === 'spike' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {prediction === 'spike' ? (
              <><strong>Exactly right!</strong> The collapsing magnetic field induces a huge voltage spike—often 10-100× the supply voltage. This is inductive kickback!</>
            ) : (
              <><strong>Surprising result:</strong> The voltage actually spikes to hundreds of volts! The inductor &quot;kicks back&quot; when current is interrupted suddenly.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <PrimaryButton onMouseDown={nextPhase}>
          See It Happen →
        </PrimaryButton>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Relay Circuit Simulator</h2>
          <p className="text-sm text-slate-500">Toggle switch and observe kickback</p>
        </div>
      </div>

      {renderRelayCircuit()}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); handleSwitchToggle(); }}
          className={`py-4 px-4 rounded-2xl font-semibold transition-all duration-200 ${
            switchOn
              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {switchOn ? '🔌 Switch ON' : '🔌 Switch OFF'}
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); handleToggleDiode(); }}
          className={`py-4 px-4 rounded-2xl font-semibold transition-all duration-200 ${
            hasFlybackDiode
              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
          }`}
        >
          {hasFlybackDiode ? '✓ Diode Added' : '+ Add Diode'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-amber-800 text-sm leading-relaxed">
          <strong>Try this:</strong> Toggle the switch OFF without the diode to see the spark.
          Then add the diode and notice how it clamps the voltage spike!
        </p>
      </div>

      <PrimaryButton
        onMouseDown={nextPhase}
        disabled={!hasExperimented}
      >
        {hasExperimented ? 'Continue to Review →' : `Toggle switch ${Math.max(0, 3 - experimentCount)} more times...`}
      </PrimaryButton>
    </div>
  );

  const renderReview = () => (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding Inductive Kickback</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">The Inductor Equation</p>
        <div className="text-3xl font-bold mb-2">V = -L × (di/dt)</div>
        <p className="text-indigo-200 text-sm">
          Induced voltage = Inductance × Rate of current change
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '🧲',
            title: 'Magnetic Field Energy',
            desc: 'Current through a coil creates a magnetic field that stores energy. This energy cannot disappear instantly!',
          },
          {
            icon: '⚡',
            title: 'Rapid Change = High Voltage',
            desc: 'When current is cut suddenly, di/dt is huge, producing a massive voltage spike in the opposite direction.',
          },
          {
            icon: '🛡️',
            title: 'Flyback Diode Protection',
            desc: 'A diode across the coil provides a path for the current to continue flowing, safely clamping the voltage spike.',
          },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onMouseDown={nextPhase}>
        Now for a Twist... →
      </PrimaryButton>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">🔄</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The Useful Side of Kickback</h2>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 mb-6">
        <p className="text-purple-800 leading-relaxed">
          Inductive kickback seems destructive. But engineers have found ways to
          <strong> harness it constructively</strong>. How might they use it?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'nothing', label: "It's only a problem to be prevented", icon: '🚫' },
          { id: 'spark', label: 'To create sparks in spark plugs', icon: '🔥' },
          { id: 'both', label: 'Both spark plugs AND voltage boosting circuits', icon: '⚡' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'both'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'both' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${twistPrediction === 'both' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {twistPrediction === 'both' ? (
              <><strong>Perfect!</strong> Ignition coils use it for spark plugs (40,000V from 12V!), and boost converters use controlled kickback to increase voltage efficiently.</>
            ) : (
              <><strong>There&apos;s more!</strong> Inductive kickback powers spark plugs (40,000V from 12V!) and boost converters that efficiently increase voltage.</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <PrimaryButton onMouseDown={nextPhase}>
          Explore Boost Converters →
        </PrimaryButton>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <span className="text-xl">🔋</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Boost Converter Demo</h2>
          <p className="text-sm text-slate-500">See how kickback steps up voltage</p>
        </div>
      </div>

      {renderBoostConverter()}

      <button
        onMouseDown={(e) => { e.preventDefault(); handleBoostToggle(); }}
        className={`w-full py-4 rounded-2xl font-semibold mb-4 transition-all duration-200 ${
          boostActive
            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
        }`}
      >
        {boostActive ? '⚡ Boost Active - Click to Stop' : '▶ Activate Boost Converter'}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <p className="text-blue-800 text-sm leading-relaxed">
          <strong>How it works:</strong> A switch rapidly turns on/off (100kHz).
          Each time it opens, the inductor&apos;s kickback adds to the input voltage,
          charging a capacitor to a higher level!
        </p>
      </div>

      <PrimaryButton
        onMouseDown={nextPhase}
        disabled={!hasExploredTwist}
      >
        {hasExploredTwist ? 'Continue →' : 'Try the boost converter...'}
      </PrimaryButton>
    </div>
  );

  const renderTwistReview = () => (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Harnessing the Kickback</h2>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Controlled Kickback Applications</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🚗</div>
            <div className="text-sm text-slate-700 font-medium">Ignition Coils</div>
            <div className="text-xs text-emerald-600 font-semibold">12V → 40,000V!</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🔋</div>
            <div className="text-sm text-slate-700 font-medium">Boost Converters</div>
            <div className="text-xs text-emerald-600 font-semibold">Step up DC voltage</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h4 className="font-bold text-slate-800 mb-1">🎯 Key Insight</h4>
          <p className="text-slate-600 text-sm leading-relaxed">
            The same physics that can destroy circuits is harnessed to generate high voltages and
            efficient power conversion—it&apos;s all about control!
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h4 className="font-bold text-slate-800 mb-1">📊 Switching Frequency</h4>
          <p className="text-slate-600 text-sm leading-relaxed">
            Boost converters switch at 10kHz-1MHz. Each cycle captures a bit of kickback energy,
            accumulating it in a capacitor.
          </p>
        </div>
      </div>

      <PrimaryButton onMouseDown={nextPhase}>
        Apply This Knowledge →
      </PrimaryButton>
    </div>
  );

  const renderTransfer = () => {
    const applications = [
      {
        title: 'Automotive Ignition Systems',
        description: 'Ignition coils boost 12V battery voltage to 40,000V spark using controlled kickback from transformer windings.',
        graphic: <IgnitionCoilGraphic />,
      },
      {
        title: 'DC-DC Boost Converters',
        description: 'Switch-mode power supplies use rapid switching and kickback to efficiently step up voltage for USB chargers and LED drivers.',
        graphic: <BoostConverterGraphic />,
      },
      {
        title: 'Microcontroller Protection',
        description: 'Arduino and Raspberry Pi projects use flyback diodes when controlling motors, relays, and solenoids to protect sensitive electronics.',
        graphic: <FlybackProtectionGraphic />,
      },
      {
        title: 'Switch Mode Power Supplies',
        description: 'High-frequency switching enables compact, efficient power supplies in phones, laptops, and virtually all modern electronics.',
        graphic: <SwitchModeSupplyGraphic />,
      },
    ];

    const allAppsCompleted = completedApps.size >= 4;

    return (
      <div className="py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <span className="text-xl">🌍</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Real-World Applications</h2>
            <p className="text-sm text-slate-500">
              Complete all 4 to unlock the assessment
            </p>
          </div>
        </div>

        {/* App Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {applications.map((app, index) => (
            <button
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppTab(index);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                activeAppTab === index
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : completedApps.has(index)
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {completedApps.has(index) && <span>✓</span>}
              App {index + 1}
            </button>
          ))}
        </div>

        {/* Active Application Content */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
          {applications[activeAppTab].graphic}
          <div className="p-5">
            <h3 className="font-bold text-slate-800 text-lg mb-2">
              {applications[activeAppTab].title}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {applications[activeAppTab].description}
            </p>
            {!completedApps.has(activeAppTab) ? (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCompleteApp(activeAppTab);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all duration-200"
              >
                Mark as Complete ✓
              </button>
            ) : (
              <div className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl font-semibold text-center">
                ✓ Completed
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-amber-600">{completedApps.size}/4 Complete</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedApps.size / 4) * 100}%` }}
            />
          </div>
        </div>

        <PrimaryButton
          onMouseDown={nextPhase}
          disabled={!allAppsCompleted}
        >
          {allAppsCompleted ? 'Take the Assessment →' : `Complete ${4 - completedApps.size} more application${4 - completedApps.size !== 1 ? 's' : ''}`}
        </PrimaryButton>
      </div>
    );
  };

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;

    return (
      <div className="py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <span className="text-xl">📝</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Knowledge Assessment</h2>
            <p className="text-sm text-slate-500">10 questions · 70% to pass</p>
          </div>
        </div>

        {!testSubmitted ? (
          <>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Progress</span>
                <span className="text-sm font-bold text-violet-600">{answeredCount}/10</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / 10) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-6 mb-6">
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                      testAnswers[qIndex] !== null
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {qIndex + 1}
                    </span>
                    <p className="font-medium text-slate-800 leading-relaxed">{q.question}</p>
                  </div>
                  <div className="space-y-2 ml-10">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleTestAnswer(qIndex, oIndex);
                        }}
                        className={`w-full p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                            : 'bg-slate-50 text-slate-700 hover:bg-violet-50 border border-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <PrimaryButton
              onMouseDown={handleSubmitTest}
              disabled={!allAnswered}
              variant="success"
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more question${10 - answeredCount !== 1 ? 's' : ''}`}
            </PrimaryButton>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7
                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/30'
                : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl shadow-amber-500/30'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '⚡' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {testScore}/10 Correct
            </h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7
                ? 'Excellent! You understand inductive kickback!'
                : 'Review the concepts and try again to improve your score.'}
            </p>

            {/* Show answers review */}
            <div className="space-y-4 max-w-2xl mx-auto text-left mb-8">
              {TEST_QUESTIONS.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <p className="text-slate-800 font-medium mb-2">{qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className={`py-1 px-2 rounded ${opt.correct ? 'text-green-600' : userAnswer === oIndex ? 'text-red-600' : 'text-gray-500'}`}>
                        {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {testScore >= 7 ? (
              <PrimaryButton onMouseDown={nextPhase} variant="success">
                Complete Lesson →
              </PrimaryButton>
            ) : (
              <div className="space-y-3">
                <PrimaryButton onMouseDown={() => {
                  setTestSubmitted(false);
                  setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null));
                }} variant="secondary">
                  Try Again
                </PrimaryButton>
                <PrimaryButton onMouseDown={nextPhase}>
                  Continue Anyway →
                </PrimaryButton>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center py-8">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30 mb-6 animate-pulse">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">
        Inductive Kickback Master!
      </h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand one of the most important phenomena in power electronics and circuit protection.
      </p>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'V = -L(di/dt): Rapid current change creates voltage spikes',
            'Flyback diodes protect circuits from destructive spikes',
            'Ignition coils use kickback for 40,000V spark generation',
            'Boost converters harness controlled kickback for voltage step-up',
            'Understanding kickback is essential for working with inductive loads',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm">✓</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {testScore !== null && (
        <div className="bg-slate-100 rounded-2xl p-4 mb-8">
          <p className="text-slate-600">
            Assessment Score: <strong className="text-amber-600">{testScore}/10</strong>
          </p>
        </div>
      )}

      <PrimaryButton onMouseDown={() => goToPhase('hook')} variant="secondary">
        Review Again
      </PrimaryButton>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Inductive Kickback</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">
            {phase.charAt(0).toUpperCase() + phase.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
