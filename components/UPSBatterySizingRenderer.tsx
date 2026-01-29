'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

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

interface UPSBatterySizingRendererProps {
  phase: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What does "Ah" (Amp-hours) measure in a battery?',
    options: [
      { text: 'The voltage output of the battery', correct: false },
      { text: 'The total charge capacity at a specific discharge rate', correct: true },
      { text: 'The physical size of the battery', correct: false },
      { text: 'The maximum current the battery can deliver', correct: false },
    ],
  },
  {
    question: "What is Peukert's Law?",
    options: [
      { text: 'A law about battery charging speed', correct: false },
      { text: 'A formula showing effective capacity decreases at higher discharge rates', correct: true },
      { text: 'A regulation for battery safety', correct: false },
      { text: 'The relationship between voltage and current', correct: false },
    ],
  },
  {
    question: 'A 100Ah battery at C/20 rate will deliver about how much at C/1 rate?',
    options: [
      { text: '100Ah - capacity stays the same', correct: false },
      { text: '50-60Ah - capacity is reduced at higher discharge rates', correct: true },
      { text: '200Ah - faster discharge means more capacity', correct: false },
      { text: '90-95Ah - only slight reduction', correct: false },
    ],
  },
  {
    question: 'Why do data centers typically use 10-15 minute UPS runtime?',
    options: [
      { text: "It's the cheapest option", correct: false },
      { text: 'Batteries cannot last longer', correct: false },
      { text: 'Long enough for generator startup, minimizing battery cost/weight', correct: true },
      { text: 'Government regulations require it', correct: false },
    ],
  },
  {
    question: 'What happens to lead-acid battery capacity in cold temperatures?',
    options: [
      { text: 'Capacity increases significantly', correct: false },
      { text: 'Capacity decreases - chemical reactions slow down', correct: true },
      { text: 'No change - batteries are temperature-independent', correct: false },
      { text: 'The battery charges faster', correct: false },
    ],
  },
  {
    question: 'What is the typical Peukert exponent for lead-acid batteries?',
    options: [
      { text: 'Exactly 1.0', correct: false },
      { text: 'Around 1.1-1.3', correct: true },
      { text: 'Between 2.0-3.0', correct: false },
      { text: 'Less than 1.0', correct: false },
    ],
  },
  {
    question: 'Why do lithium batteries have a lower Peukert exponent than lead-acid?',
    options: [
      { text: 'They are physically larger', correct: false },
      { text: 'Lower internal resistance and better chemical kinetics', correct: true },
      { text: 'They operate at higher voltages', correct: false },
      { text: 'They contain more electrolyte', correct: false },
    ],
  },
  {
    question: 'In UPS design, what does "N+1 redundancy" mean?',
    options: [
      { text: 'One extra UPS beyond what is needed for the load', correct: true },
      { text: 'The UPS has one battery', correct: false },
      { text: 'Network plus one backup', correct: false },
      { text: 'The newest version of UPS technology', correct: false },
    ],
  },
  {
    question: 'What is the relationship: Power (W) = ?',
    options: [
      { text: 'Voltage / Current', correct: false },
      { text: 'Voltage x Current', correct: true },
      { text: 'Voltage + Current', correct: false },
      { text: 'Current / Voltage', correct: false },
    ],
  },
  {
    question: 'Why is battery sizing more complex than just Ah x Voltage = Wh?',
    options: [
      { text: 'Marketing makes it complicated', correct: false },
      { text: 'Peukert effect, temperature, age, and depth of discharge all affect real capacity', correct: true },
      { text: 'Only applies to car batteries', correct: false },
      { text: 'The formula is incorrect', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Data Center UPS Systems',
    icon: '🏢',
    description: 'Large data centers use massive UPS systems with hundreds of battery strings. Understanding Peukert effect is critical for sizing - underestimating means downtime during outages.',
  },
  {
    title: 'Electric Vehicle Range',
    icon: '🚗',
    description: 'EV range estimates use similar principles. Aggressive driving (high discharge rate) reduces effective capacity, which is why highway driving often yields less range than city driving.',
  },
  {
    title: 'Solar Energy Storage',
    icon: '☀️',
    description: 'Home battery systems (like Powerwall) must account for discharge rates. High power appliances during outages drain batteries faster than the simple Wh rating suggests.',
  },
  {
    title: 'Medical Equipment Backup',
    icon: '🏥',
    description: 'Hospital critical systems need precise UPS sizing. Life support equipment cannot tolerate power interruption, so engineers add significant safety margins accounting for Peukert losses.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function UPSBatterySizingRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: UPSBatterySizingRendererProps) {
  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Play phase state
  const [batteryCapacity, setBatteryCapacity] = useState(100); // Ah
  const [loadPower, setLoadPower] = useState(1000); // Watts
  const [batteryVoltage] = useState(48); // Volts (fixed for simplicity)
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state
  const [dischargeRate, setDischargeRate] = useState(1); // C-rate multiplier
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const lastClickRef = useRef(0);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const peukertExponent = 1.2; // Typical for lead-acid

  const calculateIdealRuntime = useCallback(() => {
    const current = loadPower / batteryVoltage;
    const hours = batteryCapacity / current;
    return hours * 60; // minutes
  }, [batteryCapacity, loadPower, batteryVoltage]);

  const calculateActualRuntime = useCallback(() => {
    const current = loadPower / batteryVoltage;
    const ratedCurrent = batteryCapacity / 20; // C/20 rate
    const effectiveCapacity = batteryCapacity * Math.pow(ratedCurrent / current, peukertExponent - 1);
    const hours = effectiveCapacity / current;
    return Math.max(0, hours * 60); // minutes
  }, [batteryCapacity, loadPower, batteryVoltage, peukertExponent]);

  const calculateTwistRuntime = useCallback(() => {
    const baseCurrent = batteryCapacity / 20; // C/20 rate
    const actualCurrent = baseCurrent * dischargeRate * 20; // Convert C-rate to actual current
    const effectiveCapacity = batteryCapacity * Math.pow(1 / dischargeRate, peukertExponent - 1);
    const hours = effectiveCapacity / actualCurrent;
    return Math.max(0, hours * 60); // minutes
  }, [batteryCapacity, dischargeRate, peukertExponent]);

  const capacityLossPercent = useCallback(() => {
    const ideal = calculateIdealRuntime();
    const actual = calculateActualRuntime();
    if (ideal === 0) return 0;
    return ((ideal - actual) / ideal) * 100;
  }, [calculateIdealRuntime, calculateActualRuntime]);

  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleTwistSliderChange = useCallback((value: number) => {
    setDischargeRate(value);
    setHasExploredTwist(true);
  }, []);

  const handleCompleteApp = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
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
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderBatteryVisualization = () => {
    const idealMinutes = calculateIdealRuntime();
    const actualMinutes = calculateActualRuntime();
    const fillPercent = Math.min(100, (actualMinutes / Math.max(idealMinutes, 1)) * 100);

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        <defs>
          <linearGradient id="batteryFill" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="batteryLoss" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="300" fill="#1e293b" rx="12" />

        {/* Battery casing */}
        <rect x="80" y="40" width="180" height="220" fill="#374151" rx="12" stroke="#4b5563" strokeWidth="3" />
        <rect x="130" y="25" width="80" height="20" fill="#4b5563" rx="4" />

        {/* Battery fill - actual capacity */}
        <rect
          x="95"
          y={255 - (fillPercent / 100) * 195}
          width="150"
          height={(fillPercent / 100) * 195}
          fill="url(#batteryFill)"
          rx="6"
        />

        {/* Lost capacity indicator */}
        {fillPercent < 100 && (
          <rect
            x="95"
            y="60"
            width="150"
            height={195 - (fillPercent / 100) * 195}
            fill="url(#batteryLoss)"
            rx="6"
          />
        )}

        {/* Capacity labels */}
        <text x="170" y="150" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="bold">
          {actualMinutes.toFixed(1)}
        </text>
        <text x="170" y="175" textAnchor="middle" fill="#94a3b8" fontSize="12">
          minutes actual
        </text>

        {/* Side panel - stats */}
        <rect x="280" y="50" width="110" height="200" fill="#1f2937" rx="8" />

        <text x="335" y="80" textAnchor="middle" fill="#94a3b8" fontSize="10">IDEAL TIME</text>
        <text x="335" y="105" textAnchor="middle" fill="#22c55e" fontSize="18" fontWeight="bold">
          {idealMinutes.toFixed(1)} min
        </text>

        <text x="335" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">ACTUAL TIME</text>
        <text x="335" y="165" textAnchor="middle" fill="#f59e0b" fontSize="18" fontWeight="bold">
          {actualMinutes.toFixed(1)} min
        </text>

        <text x="335" y="200" textAnchor="middle" fill="#94a3b8" fontSize="10">CAPACITY LOSS</text>
        <text x="335" y="225" textAnchor="middle" fill="#ef4444" fontSize="18" fontWeight="bold">
          {capacityLossPercent().toFixed(1)}%
        </text>

        {/* Current draw indicator */}
        <g transform="translate(40, 140)">
          {[...Array(5)].map((_, i) => (
            <circle
              key={i}
              cx="15"
              cy={-30 + (animationFrame * 2 + i * 40) % 160}
              r="4"
              fill="#fbbf24"
              opacity={0.3 + ((animationFrame + i * 20) % 100) / 100 * 0.7}
            />
          ))}
          <text x="15" y="100" textAnchor="middle" fill="#fbbf24" fontSize="10">
            {(loadPower / batteryVoltage).toFixed(1)}A
          </text>
        </g>
      </svg>
    );
  };

  const renderPeukertVisualization = () => {
    const runtimes = [0.5, 1, 2, 5, 10, 20].map(rate => {
      const baseCurrent = batteryCapacity / 20;
      const actualCurrent = baseCurrent * rate;
      const effectiveCapacity = batteryCapacity * Math.pow(1 / (rate), peukertExponent - 1);
      return {
        rate,
        runtime: (effectiveCapacity / actualCurrent) * 60,
        efficiency: (effectiveCapacity / batteryCapacity) * 100,
      };
    });

    const maxRuntime = Math.max(...runtimes.map(r => r.runtime));

    return (
      <svg viewBox="0 0 400 280" className="w-full h-64">
        <defs>
          <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="280" fill="#1e293b" rx="12" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
          Peukert Effect: Discharge Rate vs Runtime
        </text>

        {/* Chart area */}
        <rect x="60" y="45" width="320" height="180" fill="#0f172a" rx="6" />

        {/* Bars */}
        {runtimes.map((r, i) => {
          const barWidth = 40;
          const barHeight = (r.runtime / maxRuntime) * 160;
          const x = 75 + i * 52;
          const isSelected = Math.abs(r.rate - dischargeRate * 20) < 0.5;

          return (
            <g key={i}>
              <rect
                x={x}
                y={205 - barHeight}
                width={barWidth}
                height={barHeight}
                fill={isSelected ? '#f59e0b' : 'url(#barGrad)'}
                rx="4"
              />
              <text x={x + 20} y="235" textAnchor="middle" fill="#94a3b8" fontSize="9">
                C/{(20 / r.rate).toFixed(0)}
              </text>
              <text x={x + 20} y="250" textAnchor="middle" fill="#64748b" fontSize="8">
                {r.rate}x
              </text>
              <text x={x + 20} y={200 - barHeight} textAnchor="middle" fill="#ffffff" fontSize="9">
                {r.runtime.toFixed(0)}m
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text x="25" y="135" textAnchor="middle" fill="#94a3b8" fontSize="10" transform="rotate(-90, 25, 135)">
          Runtime (min)
        </text>

        {/* Efficiency indicator */}
        <text x="200" y="275" textAnchor="middle" fill="#f59e0b" fontSize="11">
          Current rate: C/{(20 / dischargeRate / 20).toFixed(1)} = {(dischargeRate * 100).toFixed(0)}% of C/20 efficiency
        </text>
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30">
        <span className="text-4xl">🔋</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
        UPS Battery Sizing
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        How long can a data center run when the grid fails?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Critical Bridge</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              When power fails, UPS batteries keep servers running until generators start.
              But battery capacity isn&apos;t as simple as the label suggests - discharge rate dramatically affects actual runtime!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Battery Sizing
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-xl">🤔</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Make Your Prediction</h2>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <p className="text-blue-800 leading-relaxed">
          A UPS has a <strong>100Ah battery at 48V</strong>. The data center load is <strong>2,400W</strong>.
          Simple math says: 100Ah x 48V = 4,800Wh / 2,400W = <strong>2 hours</strong>.
        </p>
        <p className="text-blue-700 mt-2 font-medium">
          How long will it actually last?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'exact', label: 'Exactly 2 hours - math is math', icon: '📐' },
          { id: 'more', label: 'More than 2 hours - batteries have reserves', icon: '📈' },
          { id: 'less', label: 'Less than 2 hours - high discharge reduces capacity', icon: '📉' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'less'
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
        <>
          <div className={`p-5 rounded-2xl mb-6 ${
            prediction === 'less' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
          }`}>
            <p className={`leading-relaxed ${prediction === 'less' ? 'text-emerald-800' : 'text-amber-800'}`}>
              {prediction === 'less' ? (
                <><strong>Exactly right!</strong> At high discharge rates, Peukert&apos;s Law kicks in - the battery&apos;s effective capacity drops significantly. A 2-hour theoretical runtime might only give you 60-90 minutes!</>
              ) : (
                <><strong>Surprising result:</strong> High discharge rates actually reduce effective capacity! This is called Peukert&apos;s Law - the faster you drain a battery, the less total energy you get.</>
              )}
            </p>
          </div>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
          >
            See It In Action →
          </button>
        </>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">UPS Battery Simulator</h2>
          <p className="text-sm text-slate-500">Adjust load and see real vs ideal runtime</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderBatteryVisualization()}
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Battery Capacity: {batteryCapacity} Ah
          </label>
          <input
            type="range"
            min="50"
            max="200"
            value={batteryCapacity}
            onChange={(e) => handleSliderChange(setBatteryCapacity, parseInt(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>50 Ah</span>
            <span>200 Ah</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Load Power: {loadPower} W ({(loadPower / batteryVoltage).toFixed(1)} A)
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={loadPower}
            onChange={(e) => handleSliderChange(setLoadPower, parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>500 W (Low)</span>
            <span>5000 W (High)</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-amber-800 text-sm leading-relaxed">
          <strong>Notice:</strong> As you increase load power, the gap between ideal and actual runtime grows!
          This is Peukert&apos;s Law in action - high discharge rates reduce effective battery capacity.
        </p>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        disabled={!hasExperimented}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
          hasExperimented
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {hasExperimented ? 'Continue to Review →' : `Adjust sliders ${Math.max(0, 5 - experimentCount)} more times...`}
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding Peukert&apos;s Law</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">Peukert&apos;s Equation</p>
        <div className="text-2xl font-bold mb-2">t = H × (C / (I × H))^k</div>
        <p className="text-indigo-200 text-sm">
          where k = Peukert exponent (1.1-1.3 for lead-acid)
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '🔋',
            title: 'Battery Capacity Rating',
            desc: 'Batteries are rated at slow discharge (C/20 = 20 hours to fully discharge). Real-world loads discharge much faster.',
          },
          {
            icon: '⚡',
            title: 'Peukert Effect',
            desc: 'At high discharge rates, internal resistance losses increase. Chemical reactions can\'t keep up, reducing effective capacity.',
          },
          {
            icon: '📊',
            title: 'Practical Impact',
            desc: 'A 100Ah battery at C/20 might only deliver 50-60Ah at C/1 rate. UPS designers must account for this!',
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

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
      >
        Now for a Twist... →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <span className="text-xl">🔄</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The Fast Discharge Twist</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <p className="text-amber-800 leading-relaxed">
          A data center needs <strong>5 minutes of UPS backup</strong> while generators start.
          They calculate they need 100Ah based on their load.
        </p>
        <p className="text-amber-700 mt-2 font-medium">
          But 5 minutes is a very fast discharge (C/0.08)! What should they actually install?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'same', label: '100Ah - the calculation is correct', icon: '✅' },
          { id: 'double', label: '150-200Ah - need extra for Peukert losses', icon: '📈' },
          { id: 'less', label: 'Less than 100Ah - short duration is more efficient', icon: '📉' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'double'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <>
          <div className={`p-5 rounded-2xl mb-6 ${
            twistPrediction === 'double' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
          }`}>
            <p className={`leading-relaxed ${twistPrediction === 'double' ? 'text-emerald-800' : 'text-amber-800'}`}>
              {twistPrediction === 'double' ? (
                <><strong>Exactly right!</strong> At very high discharge rates, Peukert losses can be 30-50%! A 5-minute backup at high power might need 150-200% of the calculated capacity.</>
              ) : (
                <><strong>Important lesson:</strong> Fast discharge dramatically reduces effective capacity. Data centers typically install 150-200% of calculated needs to ensure reliability.</>
              )}
            </p>
          </div>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
          >
            Explore Discharge Rates →
          </button>
        </>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Discharge Rate Explorer</h2>
          <p className="text-sm text-slate-500">See how C-rate affects actual runtime</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderPeukertVisualization()}
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-6">
        <label className="text-slate-700 text-sm font-medium block mb-2">
          Discharge Rate: C/{(20 / dischargeRate / 20).toFixed(1)} ({(dischargeRate * 100).toFixed(0)}% of C/20)
        </label>
        <input
          type="range"
          min="0.05"
          max="2"
          step="0.05"
          value={dischargeRate}
          onChange={(e) => handleTwistSliderChange(parseFloat(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>C/20 (Slow)</span>
          <span>C/1 (Fast)</span>
          <span>2C (Very Fast)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{calculateTwistRuntime().toFixed(1)} min</div>
          <div className="text-sm text-emerald-700">Actual Runtime</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {(100 - (calculateTwistRuntime() / (batteryCapacity / (batteryCapacity / 20 * dischargeRate * 20) * 60)) * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-red-700">Capacity Loss</div>
        </div>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        disabled={!hasExploredTwist}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
          hasExploredTwist
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {hasExploredTwist ? 'Continue →' : 'Try the discharge rate slider...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Practical UPS Sizing</h2>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Real-World Considerations</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🌡️</div>
            <div className="text-sm text-slate-700 font-medium">Temperature</div>
            <div className="text-xs text-teal-600">Cold = less capacity</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-sm text-slate-700 font-medium">Battery Age</div>
            <div className="text-xs text-teal-600">Capacity degrades 20%+</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-700 font-medium">Peukert Effect</div>
            <div className="text-xs text-teal-600">Fast drain = 30-50% loss</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🔄</div>
            <div className="text-sm text-slate-700 font-medium">Safety Margin</div>
            <div className="text-xs text-teal-600">Design for 150-200%</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-slate-800 mb-2">Data Center Best Practices</h4>
        <ul className="text-slate-600 text-sm space-y-2">
          <li>• Size for 10-15 minute runtime (generator startup time)</li>
          <li>• Add 50-100% capacity margin for Peukert and aging</li>
          <li>• Use lithium batteries for lower Peukert effect (k ≈ 1.05)</li>
          <li>• Monitor battery health continuously</li>
        </ul>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
      >
        See Real Applications →
      </button>
    </div>
  );

  const renderTransfer = () => {
    const allAppsCompleted = completedApps.size >= 4;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-xl">🌍</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Real-World Applications</h2>
            <p className="text-sm text-slate-500">Complete all 4 to unlock assessment</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TRANSFER_APPS.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                activeAppTab === index
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {completedApps.has(index) && <span>✓</span>}
              {app.icon}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
              <h3 className="font-bold text-slate-800 text-lg">{TRANSFER_APPS[activeAppTab].title}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {TRANSFER_APPS[activeAppTab].description}
            </p>
            {!completedApps.has(activeAppTab) ? (
              <button
                onClick={() => handleCompleteApp(activeAppTab)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Mark as Complete
              </button>
            ) : (
              <div className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl font-semibold text-center">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-emerald-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedApps.size / 4) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => onPhaseComplete?.()}
          disabled={!allAppsCompleted}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
            allAppsCompleted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {allAppsCompleted ? 'Take the Assessment →' : `Complete ${4 - completedApps.size} more`}
        </button>
      </div>
    );
  };

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <span className="text-xl">📝</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Knowledge Assessment</h2>
            <p className="text-sm text-slate-500">10 questions - 70% to pass</p>
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
                      testAnswers[qIndex] !== null ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {qIndex + 1}
                    </span>
                    <p className="font-medium text-slate-800 leading-relaxed">{q.question}</p>
                  </div>
                  <div className="space-y-2 ml-10">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={`w-full p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-violet-500 text-white shadow-lg'
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

            <button
              onClick={handleSubmitTest}
              disabled={!allAnswered}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
                allAnswered
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '🔋' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7 ? 'Excellent! You understand UPS battery sizing!' : 'Review the concepts and try again.'}
            </p>

            {testScore >= 7 ? (
              <button
                onClick={() => onPhaseComplete?.()}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
              >
                Complete Lesson →
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-slate-200 text-slate-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="max-w-2xl mx-auto px-6 py-8 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 mb-6">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">UPS Battery Sizing Master!</h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand how to properly size UPS batteries for data center reliability.
      </p>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'Peukert\'s Law: High discharge rates reduce effective capacity',
            'C-rate matters: C/1 gives 50-60% of C/20 capacity',
            'Design margins: 150-200% for real-world reliability',
            'Temperature and age further reduce capacity',
            'Lithium batteries have lower Peukert effect than lead-acid',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">✓</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-semibold"
      >
        Complete
      </button>
    </div>
  );

  // Main render
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
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {renderPhase()}
    </div>
  );
}
