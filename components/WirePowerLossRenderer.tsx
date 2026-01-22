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
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery',
];

interface SavedState {
  phase: Phase;
  completedApps: number[];
  testAnswers: number[];
  testScore: number | null;
}

interface GameEvent {
  type: 'state_update' | 'completion' | 'tool_call';
  phase: Phase;
  data: Record<string, unknown>;
}

interface WirePowerLossRendererProps {
  onStateChange?: (state: SavedState) => void;
  onEvent?: (event: GameEvent) => void;
  savedState?: SavedState | null;
}

// ────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS (10 questions)
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What is the formula for power loss in a wire?',
    options: ['P = IR', 'P = I²R', 'P = V/R', 'P = R/I'],
    correct: 1,
  },
  {
    question: 'If you double the current, power loss becomes:',
    options: ['2× more', '4× more', 'Same', 'Half'],
    correct: 1,
  },
  {
    question: 'Why do power companies use high voltage transmission?',
    options: ['Faster electricity', 'Lower current means less I²R loss', 'Cheaper wires', 'Looks better'],
    correct: 1,
  },
  {
    question: 'What happens to resistance when wire length doubles?',
    options: ['Halves', 'Stays same', 'Doubles', 'Quadruples'],
    correct: 2,
  },
  {
    question: 'Thicker wire gauge means:',
    options: ['More resistance', 'Less resistance', 'Same resistance', 'No current flow'],
    correct: 1,
  },
  {
    question: 'Why does your phone charger get warm?',
    options: ['Battery chemical reaction', 'I²R power loss in cable', 'Phone screen heat', 'Air friction'],
    correct: 1,
  },
  {
    question: 'A transformer is used to:',
    options: ['Store electricity', 'Change voltage levels', 'Generate power', 'Measure current'],
    correct: 1,
  },
  {
    question: 'Power lines typically operate at:',
    options: ['120V', '240V', '100,000V+', '12V'],
    correct: 2,
  },
  {
    question: 'Extension cord amp ratings exist because:',
    options: ['Legal requirement only', 'Prevent overheating from I²R loss', 'Marketing', 'Color coding'],
    correct: 1,
  },
  {
    question: 'To deliver 1000W with less loss, you should:',
    options: ['Use thin wires', 'Increase current', 'Increase voltage', 'Use longer wires'],
    correct: 2,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function WirePowerLossRenderer({
  onStateChange,
  onEvent,
  savedState,
}: WirePowerLossRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [testAnswers, setTestAnswers] = useState<number[]>(
    savedState?.testAnswers || Array(10).fill(-1)
  );
  const [testScore, setTestScore] = useState<number | null>(
    savedState?.testScore ?? null
  );

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase state
  const [current, setCurrent] = useState(3);
  const [wireGauge, setWireGauge] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [wireLength, setWireLength] = useState(1);
  const [hasExperimented, setHasExperimented] = useState(false);

  // Twist phase state
  const [transmissionVoltage, setTransmissionVoltage] = useState<'low' | 'high'>('low');
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Transfer phase
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Navigation lock
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const state: SavedState = {
      phase,
      completedApps: Array.from(completedApps),
      testAnswers,
      testScore,
    };
    onStateChange?.(state);
  }, [phase, completedApps, testAnswers, testScore, onStateChange]);

  useEffect(() => {
    const event: GameEvent = {
      type: phase === 'mastery' ? 'completion' : 'state_update',
      phase,
      data: { testScore },
    };
    onEvent?.(event);
  }, [phase, testScore, onEvent]);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // PHYSICS CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getWireResistance = useCallback(() => {
    const gaugeResistance = wireGauge === 'thin' ? 1.0 : wireGauge === 'medium' ? 0.3 : 0.1;
    return gaugeResistance * wireLength;
  }, [wireGauge, wireLength]);

  const getPowerLoss = useCallback(() => {
    const R = getWireResistance();
    return current * current * R;
  }, [current, getWireResistance]);

  const getTemperature = useCallback(() => {
    const loss = getPowerLoss();
    return 20 + loss * 5;
  }, [getPowerLoss]);

  const getTransmissionLoss = useCallback(() => {
    const power = 1000;
    const voltage = transmissionVoltage === 'low' ? 120 : 12000;
    const lineCurrent = power / voltage;
    const lineResistance = 10;
    return lineCurrent * lineCurrent * lineResistance;
  }, [transmissionVoltage]);

  const getTransmissionEfficiency = useCallback(() => {
    const power = 1000;
    const loss = getTransmissionLoss();
    return ((power - loss) / power) * 100;
  }, [getTransmissionLoss]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = useCallback((choice: string) => {
    if (showPredictionFeedback) return;
    playSound('click');
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, [showPredictionFeedback]);

  const handleTwistPrediction = useCallback((choice: string) => {
    if (showTwistFeedback) return;
    playSound('click');
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, [showTwistFeedback]);

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
      if (answer === TEST_QUESTIONS[index].correct) score++;
    });
    setTestScore(score);
    playSound(score >= 7 ? 'success' : 'failure');
  }, [testAnswers]);

  // ──────────────────────────────────────────────────────────────────────────
  // COMPONENTS
  // ──────────────────────────────────────────────────────────────────────────

  const ProgressIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-1.5">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < PHASES.indexOf(phase)
                ? 'bg-orange-500 w-8'
                : i === PHASES.indexOf(phase)
                ? 'bg-orange-400 w-10'
                : 'bg-gray-200 w-6'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-400 tabular-nums">
        {PHASES.indexOf(phase) + 1}/{PHASES.length}
      </span>
    </div>
  );

  const PrimaryButton = ({
    children,
    onClick,
    disabled = false,
    variant = 'primary'
  }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={`
        w-full py-4 px-6 rounded-2xl font-semibold text-lg
        transition-all duration-200 transform
        ${disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : variant === 'primary'
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
    >
      {children}
    </button>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GRAPHICS
  // ──────────────────────────────────────────────────────────────────────────

  const WireSimulatorGraphic = () => {
    const loss = getPowerLoss();
    const temp = getTemperature();
    const resistance = getWireResistance();

    const getWireColor = () => {
      if (temp < 35) return '#3B82F6';
      if (temp < 50) return '#22C55E';
      if (temp < 70) return '#F59E0B';
      return '#EF4444';
    };

    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-6">
        <svg viewBox="0 0 400 180" className="w-full h-44">
          <defs>
            <linearGradient id="wireHeat" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={getWireColor()} />
              <stop offset="50%" stopColor={temp > 50 ? '#EF4444' : getWireColor()} />
              <stop offset="100%" stopColor={getWireColor()} />
            </linearGradient>
          </defs>

          {/* Power Source */}
          <rect x="20" y="55" width="60" height="70" rx="8" fill="#374151" />
          <text x="50" y="85" textAnchor="middle" fill="#9CA3AF" fontSize="10">SOURCE</text>
          <text x="50" y="105" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{current}A</text>

          {/* Wire */}
          <line
            x1="80"
            y1="90"
            x2={80 + 140 * wireLength}
            y2="90"
            stroke="url(#wireHeat)"
            strokeWidth={wireGauge === 'thin' ? 6 : wireGauge === 'medium' ? 12 : 20}
            strokeLinecap="round"
          />

          {/* Heat waves */}
          {temp > 40 && (
            <>
              {[0, 1, 2].map(i => (
                <path
                  key={i}
                  d={`M ${100 + i * 40 * wireLength} 65 Q ${110 + i * 40 * wireLength} 50 ${100 + i * 40 * wireLength} 35`}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  opacity={Math.min((temp - 40) / 40, 0.8)}
                >
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1s" repeatCount="indefinite" />
                </path>
              ))}
            </>
          )}

          {/* Load */}
          <circle cx={100 + 140 * wireLength} cy="90" r="30" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
          <text x={100 + 140 * wireLength} y="95" textAnchor="middle" fill="#92400E" fontSize="20">💡</text>

          {/* Stats Panel */}
          <g transform="translate(300, 20)">
            <rect width="90" height="140" rx="12" fill="rgba(255,255,255,0.1)" />
            <text x="45" y="22" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="600">STATS</text>

            <rect x="8" y="30" width="74" height="32" rx="6" fill="rgba(239,68,68,0.2)" />
            <text x="45" y="45" textAnchor="middle" fill="#fca5a5" fontSize="8">POWER LOSS</text>
            <text x="45" y="58" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="700">{loss.toFixed(1)}W</text>

            <rect x="8" y="68" width="74" height="32" rx="6" fill="rgba(251,191,36,0.2)" />
            <text x="45" y="83" textAnchor="middle" fill="#fcd34d" fontSize="8">TEMP</text>
            <text x="45" y="96" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">{temp.toFixed(0)}°C</text>

            <rect x="8" y="106" width="74" height="28" rx="6" fill="rgba(59,130,246,0.2)" />
            <text x="45" y="119" textAnchor="middle" fill="#60a5fa" fontSize="8">RESISTANCE</text>
            <text x="45" y="130" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="700">{resistance.toFixed(2)}Ω</text>
          </g>

          {/* Wire label */}
          <text x={80 + 70 * wireLength} y="140" textAnchor="middle" fill="#9ca3af" fontSize="10">
            {wireLength}m {wireGauge} wire
          </text>
        </svg>
      </div>
    );
  };

  const TransmissionLineGraphic = () => {
    const loss = getTransmissionLoss();
    const efficiency = getTransmissionEfficiency();
    const isHighVoltage = transmissionVoltage === 'high';

    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-6">
        <svg viewBox="0 0 400 160" className="w-full h-40">
          {/* Power Plant */}
          <rect x="15" y="50" width="50" height="50" rx="6" fill="#374151" />
          <text x="40" y="80" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">1kW</text>

          {/* Step-up Transformer */}
          <rect x="80" y="60" width="30" height="30" rx="4" fill="#6366F1" />
          <text x="95" y="80" textAnchor="middle" fill="white" fontSize="12">⚡</text>

          {/* Transmission Line */}
          <line
            x1="110"
            y1="75"
            x2="260"
            y2="75"
            stroke={isHighVoltage ? '#22C55E' : '#EF4444'}
            strokeWidth="6"
          />

          {/* Heat loss indicators for low voltage */}
          {!isHighVoltage && (
            <>
              {[140, 170, 200, 230].map(x => (
                <path
                  key={x}
                  d={`M ${x} 55 Q ${x + 5} 45 ${x} 35`}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                >
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
                </path>
              ))}
            </>
          )}

          {/* Step-down Transformer */}
          <rect x="260" y="60" width="30" height="30" rx="4" fill="#6366F1" />
          <text x="275" y="80" textAnchor="middle" fill="white" fontSize="12">⚡</text>

          {/* House */}
          <polygon points="320,75 340,50 360,75" fill="#F59E0B" />
          <rect x="325" y="75" width="30" height="25" fill="#FEF3C7" />
          <rect x="335" y="85" width="10" height="15" fill="#92400E" />

          {/* Voltage label */}
          <text x="185" y="100" textAnchor="middle" fill="#9ca3af" fontSize="10">
            {isHighVoltage ? '12,000V • 0.08A' : '120V • 8.3A'}
          </text>

          {/* Results */}
          <rect x="130" y="115" width="140" height="40" rx="8" fill={isHighVoltage ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'} />
          <text x="200" y="132" textAnchor="middle" fill={isHighVoltage ? '#22c55e' : '#ef4444'} fontSize="10">
            Loss: {loss.toFixed(0)}W
          </text>
          <text x="200" y="148" textAnchor="middle" fill={isHighVoltage ? '#22c55e' : '#ef4444'} fontSize="14" fontWeight="bold">
            {efficiency.toFixed(1)}% Efficient
          </text>
        </svg>
      </div>
    );
  };

  // Application Graphics
  const AppGraphic1 = () => (
    <svg viewBox="0 0 300 140" className="w-full h-36">
      <rect x="100" y="20" width="100" height="100" rx="12" fill="#374151" />
      <rect x="110" y="30" width="80" height="50" rx="4" fill="#1f2937" />
      <text x="150" y="60" textAnchor="middle" fill="#22c55e" fontSize="12">5V → 20V</text>
      <rect x="115" y="90" width="70" height="20" rx="4" fill="#3b82f6" />
      <text x="150" y="104" textAnchor="middle" fill="white" fontSize="9">USB-C PD</text>
      <path d="M 150 5 L 150 20" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="150" cy="5" r="3" fill="#f59e0b" />
    </svg>
  );

  const AppGraphic2 = () => (
    <svg viewBox="0 0 300 140" className="w-full h-36">
      <rect x="80" y="40" width="140" height="60" rx="8" fill="#374151" />
      <rect x="90" y="50" width="30" height="40" rx="4" fill="#22c55e" />
      <text x="105" y="75" textAnchor="middle" fill="white" fontSize="8">400V</text>
      <line x1="120" y1="70" x2="150" y2="70" stroke="#f59e0b" strokeWidth="4" />
      <rect x="150" y="55" width="60" height="30" rx="4" fill="#1f2937" />
      <text x="180" y="72" textAnchor="middle" fill="#60a5fa" fontSize="8">BATTERY</text>
      <text x="150" y="120" textAnchor="middle" fill="#9ca3af" fontSize="10">EV Fast Charging</text>
    </svg>
  );

  const AppGraphic3 = () => (
    <svg viewBox="0 0 300 140" className="w-full h-36">
      <line x1="50" y1="60" x2="250" y2="60" stroke="#6b7280" strokeWidth="8" />
      <rect x="120" y="70" width="60" height="30" rx="4" fill="#374151" />
      <text x="150" y="90" textAnchor="middle" fill="white" fontSize="9">15A MAX</text>
      <circle cx="70" cy="60" r="12" fill="#f59e0b" />
      <circle cx="230" cy="60" r="12" fill="#f59e0b" />
      <text x="150" y="120" textAnchor="middle" fill="#9ca3af" fontSize="10">Extension Cord Rating</text>
    </svg>
  );

  const AppGraphic4 = () => (
    <svg viewBox="0 0 300 140" className="w-full h-36">
      <rect x="60" y="30" width="180" height="80" rx="8" fill="#1f2937" />
      {[80, 130, 180, 220].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="50" x2={x} y2="90" stroke="#ef4444" strokeWidth="2" />
          <circle cx={x} cy="50" r="4" fill="#ef4444">
            <animate attributeName="opacity" values="0.5;1;0.5" dur={`${0.5 + i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      <text x="150" y="75" textAnchor="middle" fill="#9ca3af" fontSize="9">Heating Elements</text>
      <text x="150" y="125" textAnchor="middle" fill="#9ca3af" fontSize="10">Resistive Heating</text>
    </svg>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/30">
        <span className="text-4xl">🔌</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        Why Cables Get Hot
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Ever noticed your phone charger warming up? That heat is wasted energy
        following the famous I²R power loss equation.
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Big Idea</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Power loss = I²R. Doubling current quadruples the heat!
              This is why power lines use incredibly high voltages.
            </p>
          </div>
        </div>
      </div>

      {/* Feature indicators */}
      <div className="flex justify-center gap-8 mb-10">
        {[
          { icon: '🔥', label: 'I²R Heating' },
          { icon: '⚡', label: 'High Voltage' },
          { icon: '📐', label: 'Wire Gauges' },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-xs text-slate-500 font-medium">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('click'); goToPhase('predict'); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Learning
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div>
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          Prediction
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          What do you think?
        </h2>
        <p className="text-gray-600">
          A wire carries electrical current. If you <strong>double the current</strong>,
          how much more heat will the wire produce?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'same', label: 'Same heat', desc: 'Current doesn\'t affect heating' },
          { id: 'double', label: '2× more heat', desc: 'Doubles with current' },
          { id: 'quadruple', label: '4× more heat', desc: 'Squares with current' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePrediction(option.id);
            }}
            disabled={showPredictionFeedback}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
              prediction === option.id
                ? option.id === 'quadruple'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : showPredictionFeedback
                ? 'border-gray-100 bg-gray-50 opacity-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50 cursor-pointer'
            }`}
          >
            <div className="font-semibold text-gray-900">{option.label}</div>
            <div className="text-sm text-gray-500">{option.desc}</div>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          prediction === 'quadruple'
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{prediction === 'quadruple' ? '✓' : '→'}</span>
            <p className={prediction === 'quadruple' ? 'text-green-800' : 'text-amber-800'}>
              {prediction === 'quadruple'
                ? 'Exactly right! P = I²R means doubling current gives 2² = 4× the heat!'
                : 'Actually, heat follows P = I²R. Current is squared, so double current = 4× heat!'}
            </p>
          </div>
        </div>
      )}

      {showPredictionFeedback && (
        <PrimaryButton onClick={nextPhase}>
          Test It Out
        </PrimaryButton>
      )}
    </div>
  );

  const renderPlay = () => (
    <div>
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-3">
          Interactive Lab
        </span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Wire Heating Simulator
        </h2>
        <p className="text-gray-500 text-sm">
          Adjust current, wire thickness, and length to see power loss change.
        </p>
      </div>

      <WireSimulatorGraphic />

      <div className="space-y-5 mb-6">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Current</label>
            <span className="text-sm font-semibold text-orange-600">{current}A</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={current}
            onChange={e => { setCurrent(Number(e.target.value)); setHasExperimented(true); }}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Wire Gauge</label>
          <div className="flex gap-2">
            {(['thin', 'medium', 'thick'] as const).map(gauge => (
              <button
                key={gauge}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setWireGauge(gauge);
                  setHasExperimented(true);
                }}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  wireGauge === gauge
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {gauge.charAt(0).toUpperCase() + gauge.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Wire Length</label>
            <span className="text-sm font-semibold text-orange-600">{wireLength}m</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.5"
            value={wireLength}
            onChange={e => { setWireLength(Number(e.target.value)); setHasExperimented(true); }}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-blue-800 text-sm">
          <strong>Key insight:</strong> Power loss = I²R. Current matters most because it&apos;s squared!
          Thicker/shorter wires have less resistance = less loss.
        </p>
      </div>

      <PrimaryButton onClick={nextPhase} disabled={!hasExperimented}>
        {hasExperimented ? 'Continue' : 'Try the controls first...'}
      </PrimaryButton>
    </div>
  );

  const renderReview = () => (
    <div>
      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
        Key Concepts
      </span>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Understanding I²R Loss
      </h2>

      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-6 mb-6 text-center">
        <div className="text-3xl font-bold text-gray-800 mb-2">P = I²R</div>
        <p className="text-orange-700 text-sm">Power loss = Current² × Resistance</p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          { icon: '⚡', title: 'Current (I)', desc: 'Squared in the equation—doubling current = 4× heat loss!' },
          { icon: '📏', title: 'Resistance (R)', desc: 'Longer/thinner wires = more resistance = more loss' },
          { icon: '🔥', title: 'Power Loss (P)', desc: 'Energy converted to heat every second. This is why cables warm up!' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={nextPhase}>
        Discover the Twist
      </PrimaryButton>
    </div>
  );

  const renderTwistPredict = () => (
    <div>
      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
        Plot Twist
      </span>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        The Power Grid Puzzle
      </h2>
      <p className="text-gray-600 mb-6">
        Power companies need to transmit electricity over long distances while minimizing I²R losses.
        What strategy do they use?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'thick', label: 'Extremely thick cables', desc: 'Reduce resistance' },
          { id: 'superconductor', label: 'Superconducting cables', desc: 'Zero resistance' },
          { id: 'highvoltage', label: 'Very high voltage', desc: 'Low current for same power' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleTwistPrediction(option.id);
            }}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? option.id === 'highvoltage'
                  ? 'border-green-500 bg-green-50'
                  : 'border-amber-300 bg-amber-50'
                : showTwistFeedback
                ? 'border-gray-100 bg-gray-50 opacity-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
            }`}
          >
            <div className="font-semibold text-gray-900">{option.label}</div>
            <div className="text-sm text-gray-500">{option.desc}</div>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'highvoltage'
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className={twistPrediction === 'highvoltage' ? 'text-green-800' : 'text-amber-800'}>
            {twistPrediction === 'highvoltage'
              ? 'Brilliant! High voltage means low current for same power. Since P = I²R, reducing current dramatically cuts losses!'
              : 'The clever trick is high voltage. P = V × I, so high V means low I for same power—and losses drop dramatically!'}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <PrimaryButton onClick={nextPhase}>
          See It In Action
        </PrimaryButton>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div>
      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-3">
        Interactive Demo
      </span>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Transmission Line Simulator
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        Compare transmitting 1000W at low vs. high voltage.
      </p>

      <TransmissionLineGraphic />

      <div className="flex gap-3 mb-6">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setTransmissionVoltage('low');
            setHasExploredTwist(true);
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            transmissionVoltage === 'low'
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Low Voltage (120V)
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setTransmissionVoltage('high');
            setHasExploredTwist(true);
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            transmissionVoltage === 'high'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          High Voltage (12kV)
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-blue-800 text-sm">
          <strong>The math:</strong> At 120V, 1000W needs 8.3A → Loss = (8.3)² × 10Ω = 694W!
          At 12kV, same power needs only 0.083A → Loss = (0.083)² × 10Ω = 0.07W!
        </p>
      </div>

      <PrimaryButton onClick={nextPhase} disabled={!hasExploredTwist}>
        {hasExploredTwist ? 'Continue' : 'Try both voltage levels...'}
      </PrimaryButton>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        The High-Voltage Solution
      </h2>

      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-gray-800 text-center mb-4">Power Grid Strategy</h3>
        <div className="flex items-center justify-center gap-3 text-sm">
          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-gray-600">Generate</div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">⬆️</div>
            <div className="text-green-600 font-semibold">Step Up</div>
            <div className="text-xs text-gray-500">100kV+</div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">〰️</div>
            <div className="text-gray-600">Transmit</div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">⬇️</div>
            <div className="text-blue-600 font-semibold">Step Down</div>
            <div className="text-xs text-gray-500">120V</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-1">Transformers</h4>
          <p className="text-gray-600 text-sm">Convert between voltage levels with minimal loss.</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-1">100× Voltage Increase</h4>
          <p className="text-gray-600 text-sm">Reduces current by 100×, cutting I²R losses by 10,000×!</p>
        </div>
      </div>

      <PrimaryButton onClick={nextPhase}>
        Real-World Applications
      </PrimaryButton>
    </div>
  );

  const renderTransfer = () => {
    const apps = [
      {
        title: 'USB-C Power Delivery',
        icon: '📱',
        desc: 'Fast chargers use higher voltage (up to 20V) instead of more current to reduce heating in thin cables.',
        graphic: <AppGraphic1 />,
      },
      {
        title: 'EV Fast Charging',
        icon: '🚗',
        desc: 'DC fast chargers use 400-800V to push high power through manageable cable sizes without melting.',
        graphic: <AppGraphic2 />,
      },
      {
        title: 'Extension Cord Ratings',
        icon: '🔌',
        desc: 'Amp ratings ensure wires won\'t overheat. Higher loads need thicker gauge (lower number = thicker).',
        graphic: <AppGraphic3 />,
      },
      {
        title: 'Resistive Heating',
        icon: '🔥',
        desc: 'Space heaters and toasters intentionally use I²R loss! High-resistance elements convert electricity to heat.',
        graphic: <AppGraphic4 />,
      },
    ];

    return (
      <div>
        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
          Applications
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Real-World Uses
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Explore all 4 applications to unlock the knowledge test.
        </p>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {apps.map((app, i) => (
            <button
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppTab(i);
                if (!completedApps.has(i)) {
                  handleCompleteApp(i);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeAppTab === i
                  ? 'bg-orange-500 text-white shadow-lg'
                  : completedApps.has(i)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{app.icon}</span>
              <span>{app.title}</span>
              {completedApps.has(i) && activeAppTab !== i && <span>✓</span>}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 mb-6">
          <div className="bg-white rounded-xl mb-4 overflow-hidden">
            {apps[activeAppTab].graphic}
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            {apps[activeAppTab].title}
          </h3>
          <p className="text-gray-600">
            {apps[activeAppTab].desc}
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-gray-500">
            {completedApps.size}/4 applications reviewed
          </span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  completedApps.has(i) ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <PrimaryButton onClick={nextPhase} disabled={completedApps.size < 4}>
          {completedApps.size >= 4 ? 'Take Knowledge Test' : 'Review all 4 applications first'}
        </PrimaryButton>
      </div>
    );
  };

  const renderTest = () => {
    const allAnswered = !testAnswers.includes(-1);

    if (testScore !== null) {
      const passed = testScore >= 7;
      return (
        <div className="text-center py-6">
          <div className={`text-7xl mb-6 ${passed ? 'animate-bounce' : ''}`}>
            {passed ? '🎉' : '📚'}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {testScore}/10 Correct
          </h2>
          <p className="text-gray-600 mb-8">
            {passed
              ? 'Excellent! You\'ve mastered I²R power loss concepts!'
              : 'Review the material and try again to improve your score.'}
          </p>
          <PrimaryButton onClick={nextPhase}>
            {passed ? 'Complete Lesson' : 'See Summary'}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div>
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          Knowledge Test
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Test Your Understanding
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Answer all 10 questions. You need 7 correct to pass.
        </p>

        <div className="space-y-6 mb-6">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-gray-50 rounded-2xl p-4">
              <p className="font-medium text-gray-900 mb-3 text-sm">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`p-3 rounded-xl text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <PrimaryButton onClick={handleSubmitTest} disabled={!allAnswered}>
          {allAnswered ? 'Submit Answers' : `Answer all questions (${testAnswers.filter(a => a !== -1).length}/10)`}
        </PrimaryButton>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center py-6">
      <div className="text-7xl mb-6">🏆</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Congratulations!
      </h2>
      <p className="text-gray-600 mb-8">
        You&apos;ve mastered I²R Power Loss concepts.
      </p>

      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-gray-900 mb-4">Key Takeaways</h3>
        <ul className="space-y-3">
          {[
            'Power loss in wires = I²R (current squared × resistance)',
            'Doubling current quadruples heat loss',
            'High voltage transmission dramatically reduces losses',
            'Wire gauge ratings prevent dangerous overheating',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-orange-500 font-bold">✓</span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <PrimaryButton onClick={() => goToPhase('hook')} variant="secondary">
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Wire Power Loss</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">
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
