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

interface TransformerRendererProps {
  onEvent?: (event: GameEvent) => void;
  savedState?: GameState | null;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  primaryTurns: number;
  secondaryTurns: number;
  inputVoltage: number;
  isAC: boolean;
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
    question: 'What determines the voltage ratio in a transformer?',
    options: [
      'The thickness of the wire',
      'The ratio of turns in primary to secondary coils',
      'The speed of the AC current',
      'The size of the iron core'
    ],
    correct: 1
  },
  {
    question: 'Why don\'t transformers work with DC (direct current)?',
    options: [
      'DC is too weak',
      'DC flows in the wrong direction',
      'DC creates a static field - no changing flux to induce current',
      'DC would melt the transformer'
    ],
    correct: 2
  },
  {
    question: 'A transformer steps up voltage from 100V to 1000V. What happens to current?',
    options: [
      'Current increases 10×',
      'Current stays the same',
      'Current decreases to 1/10',
      'Current becomes DC'
    ],
    correct: 2
  },
  {
    question: 'Why do power lines use high voltage for transmission?',
    options: [
      'High voltage travels faster',
      'High voltage looks more impressive',
      'Lower current means less I²R heat loss in wires',
      'High voltage is safer'
    ],
    correct: 2
  }
];

const TRANSFER_APPS = [
  {
    title: 'Power Grid',
    description: 'Power plants step up to 400kV for transmission, then step down to 240V for homes. This reduces losses by 99%!',
    icon: '⚡'
  },
  {
    title: 'Phone Chargers',
    description: 'Your phone charger contains a tiny transformer (or switching circuit) to convert 120/240V to the 5V your phone needs.',
    icon: '📱'
  },
  {
    title: 'Welding Equipment',
    description: 'Arc welders step down voltage but massively increase current, creating enough heat to melt steel.',
    icon: '🔧'
  },
  {
    title: 'Microwave Ovens',
    description: 'A transformer steps up 120V to 4000V to power the magnetron that generates microwaves.',
    icon: '📡'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function isValidPhase(phase: string): phase is Phase {
  return PHASES.includes(phase as Phase);
}

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
export default function TransformerRenderer({ onEvent, savedState }: TransformerRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [primaryTurns, setPrimaryTurns] = useState(savedState?.primaryTurns || 100);
  const [secondaryTurns, setSecondaryTurns] = useState(savedState?.secondaryTurns || 200);
  const [inputVoltage, setInputVoltage] = useState(savedState?.inputVoltage || 120);
  const [isAC, setIsAC] = useState(savedState?.isAC ?? true);
  const [acPhase, setAcPhase] = useState(0);

  // Twist state - DC comparison
  const [twistMode, setTwistMode] = useState<'ac' | 'dc'>('ac');

  const navigationLockRef = useRef(false);

  // Calculated values
  const turnsRatio = secondaryTurns / primaryTurns;
  const outputVoltage = isAC ? inputVoltage * turnsRatio : 0;
  const inputCurrent = 1; // Assume 1A input for simplicity
  const outputCurrent = isAC ? inputCurrent / turnsRatio : 0;
  const transformerType = turnsRatio > 1 ? 'Step-Up' : turnsRatio < 1 ? 'Step-Down' : 'Isolation';

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
    if (!isAC) return;

    const interval = setInterval(() => {
      setAcPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [isAC]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setPrimaryTurns(100);
      setSecondaryTurns(200);
      setInputVoltage(120);
      setIsAC(true);
    }
    if (phase === 'twist_play') {
      setTwistMode('ac');
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
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderTransformer = (pTurns: number, sTurns: number, vIn: number, ac: boolean, animPhase: number) => {
    const ratio = sTurns / pTurns;
    const vOut = ac ? vIn * ratio : 0;
    const currentIntensity = ac ? Math.abs(Math.sin(animPhase)) : 0;
    const fluxIntensity = ac ? currentIntensity : 0;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Iron Core */}
        <rect x="120" y="60" width="160" height="160" rx="8" fill="#4b5563" stroke="#6b7280" strokeWidth="4" />
        <rect x="140" y="80" width="120" height="120" rx="4" fill="#111827" />

        {/* Magnetic flux in core */}
        {ac && (
          <g style={{ opacity: fluxIntensity }}>
            <rect x="140" y="85" width="120" height="10" fill="#3b82f6" className="animate-pulse" />
            <rect x="140" y="185" width="120" height="10" fill="#3b82f6" className="animate-pulse" />
            <rect x="140" y="85" width="10" height="110" fill="#3b82f6" className="animate-pulse" />
            <rect x="250" y="85" width="10" height="110" fill="#3b82f6" className="animate-pulse" />
          </g>
        )}

        {/* Primary Coil (left) */}
        <g>
          {[...Array(Math.min(Math.floor(pTurns / 10), 10))].map((_, i) => (
            <ellipse
              key={i}
              cx="135"
              cy={90 + i * 10}
              rx="15"
              ry="8"
              fill="none"
              stroke={ac ? `rgba(239, 68, 68, ${0.5 + currentIntensity * 0.5})` : '#6b7280'}
              strokeWidth="3"
            />
          ))}
          <text x="135" y="220" textAnchor="middle" className="fill-red-400 text-xs">
            Primary
          </text>
          <text x="135" y="235" textAnchor="middle" className="fill-gray-400 text-xs">
            {pTurns} turns
          </text>
        </g>

        {/* Secondary Coil (right) */}
        <g>
          {[...Array(Math.min(Math.floor(sTurns / 10), 15))].map((_, i) => (
            <ellipse
              key={i}
              cx="265"
              cy={85 + i * 7}
              rx="15"
              ry="6"
              fill="none"
              stroke={ac && vOut > 0 ? `rgba(34, 197, 94, ${0.5 + currentIntensity * 0.5})` : '#6b7280'}
              strokeWidth="3"
            />
          ))}
          <text x="265" y="220" textAnchor="middle" className="fill-green-400 text-xs">
            Secondary
          </text>
          <text x="265" y="235" textAnchor="middle" className="fill-gray-400 text-xs">
            {sTurns} turns
          </text>
        </g>

        {/* Input voltage indicator */}
        <rect x="20" y="80" width="70" height="80" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="55" y="100" textAnchor="middle" className="fill-gray-400 text-xs">Input</text>
        <text x="55" y="125" textAnchor="middle" className="fill-red-400 text-lg font-bold">
          {vIn}V
        </text>
        <text x="55" y="145" textAnchor="middle" className={`text-xs ${ac ? 'fill-yellow-400' : 'fill-gray-500'}`}>
          {ac ? 'AC ∿' : 'DC ═'}
        </text>

        {/* Output voltage indicator */}
        <rect x="310" y="80" width="70" height="80" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="345" y="100" textAnchor="middle" className="fill-gray-400 text-xs">Output</text>
        <text x="345" y="125" textAnchor="middle" className={`text-lg font-bold ${vOut > 0 ? 'fill-green-400' : 'fill-red-400'}`}>
          {vOut.toFixed(0)}V
        </text>
        <text x="345" y="145" textAnchor="middle" className={`text-xs ${vOut > 0 ? 'fill-yellow-400' : 'fill-red-400'}`}>
          {vOut > 0 ? 'AC ∿' : 'NONE'}
        </text>

        {/* Waveform visualization */}
        {ac && (
          <g>
            {/* Input waveform */}
            <path
              d={`M 25 250 ${[...Array(10)].map((_, i) =>
                `L ${25 + i * 6} ${250 + Math.sin(animPhase + i * 0.5) * 10}`
              ).join(' ')}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
            {/* Output waveform */}
            <path
              d={`M 315 250 ${[...Array(10)].map((_, i) =>
                `L ${315 + i * 6} ${250 + Math.sin(animPhase + i * 0.5) * 10 * (vOut > 0 ? ratio : 0)}`
              ).join(' ')}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Transformer type label */}
        <rect x="150" y="10" width="100" height="35" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="33" textAnchor="middle" className={`text-sm font-bold ${
          ratio > 1 ? 'fill-green-400' : ratio < 1 ? 'fill-orange-400' : 'fill-blue-400'
        }`}>
          {ratio > 1 ? '⬆ Step-Up' : ratio < 1 ? '⬇ Step-Down' : '= Isolation'}
        </text>
      </svg>
    );
  };

  const renderPowerTransmission = (useHighVoltage: boolean) => {
    const transmissionVoltage = useHighVoltage ? 400000 : 240;
    const current = useHighVoltage ? 0.0006 : 1000; // P = VI = 240W
    const wireResistance = 10; // ohms
    const powerLoss = current * current * wireResistance;
    const efficiency = ((240 - powerLoss) / 240) * 100;

    return (
      <svg viewBox="0 0 400 200" className="w-full h-40">
        <rect width="400" height="200" fill="#111827" />

        {/* Power plant */}
        <rect x="20" y="80" width="60" height="60" rx="4" fill="#4b5563" />
        <text x="50" y="115" textAnchor="middle" className="fill-white text-xs">🏭</text>
        <text x="50" y="155" textAnchor="middle" className="fill-gray-400 text-xs">240V</text>

        {/* Step-up transformer */}
        {useHighVoltage && (
          <g>
            <rect x="100" y="90" width="40" height="40" rx="4" fill="#1f2937" stroke="#22c55e" strokeWidth="2" />
            <text x="120" y="115" textAnchor="middle" className="fill-green-400 text-xs">⬆</text>
          </g>
        )}

        {/* Transmission lines */}
        <line
          x1={useHighVoltage ? 140 : 80}
          y1="110"
          x2={useHighVoltage ? 260 : 320}
          y2="110"
          stroke={useHighVoltage ? '#22c55e' : '#ef4444'}
          strokeWidth={useHighVoltage ? 2 : 6}
        />
        {/* Heat loss visualization */}
        {!useHighVoltage && (
          <g className="animate-pulse">
            {[...Array(10)].map((_, i) => (
              <text
                key={i}
                x={100 + i * 22}
                y="100"
                className="fill-red-500 text-xs"
              >
                🔥
              </text>
            ))}
          </g>
        )}

        {/* Voltage label on line */}
        <text x="200" y="90" textAnchor="middle" className={`text-xs font-bold ${
          useHighVoltage ? 'fill-green-400' : 'fill-red-400'
        }`}>
          {useHighVoltage ? '400,000V / 0.6mA' : '240V / 1000A'}
        </text>

        {/* Step-down transformer */}
        {useHighVoltage && (
          <g>
            <rect x="260" y="90" width="40" height="40" rx="4" fill="#1f2937" stroke="#orange-500" strokeWidth="2" />
            <text x="280" y="115" textAnchor="middle" className="fill-orange-400 text-xs">⬇</text>
          </g>
        )}

        {/* House */}
        <rect x="320" y="80" width="60" height="60" rx="4" fill="#4b5563" />
        <text x="350" y="115" textAnchor="middle" className="fill-white text-xs">🏠</text>
        <text x="350" y="155" textAnchor="middle" className="fill-gray-400 text-xs">240V</text>

        {/* Efficiency display */}
        <rect x="140" y="150" width="120" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="168" textAnchor="middle" className="fill-gray-400 text-xs">Power Delivered</text>
        <text x="200" y="185" textAnchor="middle" className={`text-sm font-bold ${
          efficiency > 90 ? 'fill-green-400' : 'fill-red-400'
        }`}>
          {efficiency.toFixed(1)}% ({useHighVoltage ? 'Minimal' : 'Huge'} Loss)
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Why Don&apos;t Power Lines Melt?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Homes use 120-240 volts. But power lines carry <span className="text-yellow-400">400,000 volts</span>!
          If you tried to send household current through those long wires, they&apos;d glow red hot.
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-green-300 font-medium">
            ⚡ A simple device called a &quot;transformer&quot; makes our power grid possible!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how changing voltage saves energy and why AC won the &quot;War of Currents.&quot;
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        Discover the Secret →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Make Your Prediction</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          A transformer has two coils wound around an iron core. If the secondary coil
          has twice as many turns as the primary, what happens to the output voltage?
        </p>
        <div className="space-y-3">
          {[
            'Output voltage is halved',
            'Output voltage stays the same',
            'Output voltage doubles',
            'No current flows at all'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setPrediction(option);
                emitEvent('prediction', { prediction: option });
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                prediction === option
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {prediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Transformer Simulator</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderTransformer(primaryTurns, secondaryTurns, inputVoltage, isAC, acPhase)}

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-red-400 font-medium mb-2">
              Primary Turns: {primaryTurns}
            </label>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={primaryTurns}
              onChange={(e) => setPrimaryTurns(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <label className="block text-green-400 font-medium mb-2">
              Secondary Turns: {secondaryTurns}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={secondaryTurns}
              onChange={(e) => setSecondaryTurns(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-yellow-400 font-medium mb-2">
            Input Voltage: {inputVoltage}V
          </label>
          <input
            type="range"
            min="12"
            max="240"
            step="12"
            value={inputVoltage}
            onChange={(e) => setInputVoltage(Number(e.target.value))}
            className="w-full accent-yellow-500"
          />
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            <span className="text-yellow-400">Turns Ratio:</span> {turnsRatio.toFixed(2)}:1
            {' | '}
            <span className="text-green-400">Output:</span> {outputVoltage.toFixed(0)}V
            {' | '}
            <span className="text-cyan-400">Type:</span> {transformerType}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Magic of Magnetic Coupling</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <h3 className="text-yellow-400 font-bold mb-2">How Transformers Work</h3>
          <p className="text-gray-300">
            AC current in the primary creates a <span className="text-blue-400 font-bold">changing magnetic flux</span> in
            the iron core. This flux passes through the secondary coil and induces voltage by Faraday&apos;s law!
          </p>
        </div>

        <div className="p-4 bg-gray-700 rounded-lg text-center">
          <p className="text-white font-mono text-lg">V₂/V₁ = N₂/N₁</p>
          <p className="text-gray-400 text-sm mt-2">
            Output voltage / Input voltage = Secondary turns / Primary turns
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
            <h4 className="text-green-400 font-bold mb-2">Step-Up</h4>
            <p className="text-gray-300 text-sm">
              More secondary turns → Higher voltage, lower current
              <br />
              Used for: Power transmission
            </p>
          </div>
          <div className="p-4 bg-orange-900/30 rounded-lg border border-orange-600">
            <h4 className="text-orange-400 font-bold mb-2">Step-Down</h4>
            <p className="text-gray-300 text-sm">
              Fewer secondary turns → Lower voltage, higher current
              <br />
              Used for: Phone chargers, doorbells
            </p>
          </div>
        </div>

        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
          <p className="text-purple-300">
            💡 <strong>Conservation of Energy:</strong> Power in ≈ Power out.
            If voltage goes up 10×, current goes down 10×. You can&apos;t create free energy!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          What About DC? →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The DC Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          What happens if you connect a battery (DC) to the primary coil of a transformer?
        </p>
        <div className="space-y-3">
          {[
            'The transformer works normally',
            'The output voltage is doubled',
            'No output voltage - DC creates a static field',
            'The transformer becomes a motor'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setTwistPrediction(option);
                emitEvent('prediction', { prediction: option, type: 'twist' });
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                twistPrediction === option
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {twistPrediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">AC vs DC: The Critical Difference</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderTransformer(100, 200, 120, twistMode === 'ac', acPhase)}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setTwistMode('ac');
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              twistMode === 'ac' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            ∿ AC Input
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setTwistMode('dc');
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              twistMode === 'dc' ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            ═ DC Input
          </button>
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${
          twistMode === 'ac'
            ? 'bg-green-900/30 border-green-600'
            : 'bg-red-900/30 border-red-600'
        }`}>
          <p className={`text-center ${twistMode === 'ac' ? 'text-green-300' : 'text-red-300'}`}>
            {twistMode === 'ac' ? (
              <>
                <span className="font-bold">AC: Constantly changing current → changing flux → induced EMF!</span>
                <br />
                <span className="text-sm">Output: 240V AC</span>
              </>
            ) : (
              <>
                <span className="font-bold">DC: Constant current → static flux → NO induction!</span>
                <br />
                <span className="text-sm">Output: 0V (nothing happens after initial moment)</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Why This Matters →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Why AC Won the War of Currents</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">Tesla&apos;s Triumph</h3>
          <p className="text-gray-300">
            In the 1880s, Edison promoted DC while Tesla/Westinghouse championed AC.
            <span className="text-yellow-400 font-bold"> AC won because transformers work!</span>{' '}
            You can step voltage up for efficient transmission, then down for safe use.
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-bold mb-2 text-center">Power Loss Comparison</h4>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">With High Voltage Transmission (AC + Transformers):</p>
              {renderPowerTransmission(true)}
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">With Low Voltage (DC, no transformers):</p>
              {renderPowerTransmission(false)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>The Math:</strong> Power loss = I²R. If you step up voltage 1000×,
            current drops 1000×, and losses drop by 1,000,000×!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Transformers</h2>
      <p className="text-gray-400 text-center">Explore how transformers power modern life</p>

      <div className="grid grid-cols-2 gap-4">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
              emitEvent('interaction', { action: 'explore_app', app: app.title });
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-green-900/30 border-2 border-green-600'
                : 'bg-gray-800 border-2 border-gray-700 hover:border-yellow-500'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-gray-400 text-sm">{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-green-400 text-sm">✓ Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('complete'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
          >
            Take the Test →
          </button>
        </div>
      )}

      {completedApps.size < 4 && (
        <p className="text-center text-gray-500">
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (answer === TEST_QUESTIONS[i].correct ? 1 : 0),
        0
      );
      const passed = score >= 3;

      return (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">Test Complete!</h2>
          <div className={`text-6xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-gray-300">
            {passed ? 'Excellent understanding of transformers!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                nextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson →' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-4">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? testAnswers[i] === TEST_QUESTIONS[i].correct
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-yellow-500'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(i === question.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                  emitEvent('interaction', {
                    action: 'answer',
                    questionIndex: currentQuestion,
                    correct: i === question.correct
                  });
                }}
                className="w-full p-4 bg-gray-700 text-gray-300 rounded-lg text-left hover:bg-gray-600 transition-all"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-3xl font-bold text-white">Transformer Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Voltage ratio = turns ratio
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Transformers need AC (changing flux)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Power conservation: V×I = constant
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Why high voltage reduces transmission losses
          </li>
        </ul>
      </div>
      <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600 max-w-md mx-auto">
        <p className="text-yellow-300">
          ⚡ Key Insight: Transformers make our power grid possible—step up for efficient transmission, step down for safe use!
        </p>
      </div>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { phase: 'mastery', completed: true });
        }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        🎓 Claim Your Badge
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
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}

        {/* Phase indicator */}
        <div className="text-center mb-6">
          <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-sm">
            {phase.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {renderPhase()}

        {/* Navigation */}
        {phase !== 'hook' && phase !== 'mastery' && (
          <div className="mt-8 flex justify-between">
            <button
              onMouseDown={() => {
                const currentIndex = PHASES.indexOf(phase);
                if (currentIndex > 0) {
                  goToPhase(PHASES[currentIndex - 1]);
                }
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            >
              ← Back
            </button>
            <div className="text-gray-500 text-sm">
              {PHASES.indexOf(phase) + 1} / {PHASES.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
