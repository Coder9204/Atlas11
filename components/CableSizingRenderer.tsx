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

interface CableSizingRendererProps {
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
    question: 'What does the formula P = I²R tell us about power loss?',
    options: [
      { text: 'Power loss is proportional to current', correct: false },
      { text: 'Power loss increases with the square of current', correct: true },
      { text: 'Power loss decreases with resistance', correct: false },
      { text: 'Power loss is independent of current', correct: false },
    ],
  },
  {
    question: 'Why do data centers use thick copper bus bars?',
    options: [
      { text: 'They look more professional', correct: false },
      { text: 'Lower resistance means less I²R losses and voltage drop', correct: true },
      { text: 'Copper is cheaper than aluminum', correct: false },
      { text: 'Regulations require specific sizes', correct: false },
    ],
  },
  {
    question: 'If you double the voltage while keeping power the same, what happens to current?',
    options: [
      { text: 'Current doubles', correct: false },
      { text: 'Current stays the same', correct: false },
      { text: 'Current is halved', correct: true },
      { text: 'Current quadruples', correct: false },
    ],
  },
  {
    question: 'What happens to I²R losses when you double voltage (same power)?',
    options: [
      { text: 'Losses double', correct: false },
      { text: 'Losses stay the same', correct: false },
      { text: 'Losses are reduced to 1/4', correct: true },
      { text: 'Losses quadruple', correct: false },
    ],
  },
  {
    question: 'Why does transmission use 400kV+ instead of 120V?',
    options: [
      { text: 'High voltage is safer', correct: false },
      { text: 'Dramatically reduces current and I²R losses over long distances', correct: true },
      { text: 'It is cheaper to generate', correct: false },
      { text: 'Lower voltage would blow fuses', correct: false },
    ],
  },
  {
    question: 'What is "ampacity"?',
    options: [
      { text: 'The voltage rating of a cable', correct: false },
      { text: 'Maximum continuous current a conductor can carry safely', correct: true },
      { text: 'The resistance per meter', correct: false },
      { text: 'The cost per amp of capacity', correct: false },
    ],
  },
  {
    question: 'How does cable resistance change with temperature?',
    options: [
      { text: 'Resistance decreases as temperature rises', correct: false },
      { text: 'Resistance increases as temperature rises', correct: true },
      { text: 'Temperature has no effect', correct: false },
      { text: 'Only affects aluminum, not copper', correct: false },
    ],
  },
  {
    question: 'What voltage drop is typically acceptable for branch circuits?',
    options: [
      { text: '10% maximum', correct: false },
      { text: '3-5% maximum', correct: true },
      { text: '15% maximum', correct: false },
      { text: 'Any amount is acceptable', correct: false },
    ],
  },
  {
    question: 'Why might a data center choose 480V distribution over 208V?',
    options: [
      { text: '480V equipment is more common', correct: false },
      { text: 'Higher voltage = lower current = smaller/cheaper cables', correct: true },
      { text: '480V is safer than 208V', correct: false },
      { text: 'Government incentives for 480V', correct: false },
    ],
  },
  {
    question: 'What is the relationship between wire gauge (AWG) and resistance?',
    options: [
      { text: 'Higher AWG number = lower resistance', correct: false },
      { text: 'Higher AWG number = higher resistance (thinner wire)', correct: true },
      { text: 'AWG has no relation to resistance', correct: false },
      { text: 'AWG only applies to aluminum', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Data Center PDUs',
    icon: '🏢',
    description: 'Power Distribution Units in data centers use thick copper bus bars and operate at 480V/415V to minimize losses. A 1MW facility could waste $50,000/year at poor efficiency.',
  },
  {
    title: 'Electric Vehicle Charging',
    icon: '🚗',
    description: 'Level 3 DC fast chargers use high voltage (400-800V) to reduce cable sizes while delivering 350kW. Otherwise cables would need to be impossibly thick and heavy.',
  },
  {
    title: 'Power Grid Transmission',
    icon: '⚡',
    description: 'Power lines operate at 230-765kV because at 120V, transmitting 1GW would require cables 10+ feet diameter! High voltage makes long-distance transmission practical.',
  },
  {
    title: 'Solar Farm Interconnection',
    icon: '☀️',
    description: 'Large solar farms use central inverters to boost voltage before transmission. A 100MW farm might lose 5-10% in cables alone at low voltage.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function CableSizingRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: CableSizingRendererProps) {
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
  const [cableLength, setCableLength] = useState(50); // meters
  const [loadCurrent, setLoadCurrent] = useState(100); // Amps
  const [wireGauge, setWireGauge] = useState(4); // AWG
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state
  const [distributionVoltage, setDistributionVoltage] = useState(208);
  const [loadPower, setLoadPower] = useState(10000); // Watts
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

  // Wire gauge to resistance (ohms per 1000 feet)
  const gaugeResistance: Record<number, number> = {
    14: 2.525,
    12: 1.588,
    10: 0.999,
    8: 0.628,
    6: 0.395,
    4: 0.249,
    2: 0.156,
    0: 0.0983,
  };

  // Calculate resistance for given length (meters)
  const calculateResistance = useCallback((gauge: number, lengthM: number): number => {
    const ohmsPer1000ft = gaugeResistance[gauge] || 0.249;
    const lengthFt = lengthM * 3.281;
    return (ohmsPer1000ft / 1000) * lengthFt * 2; // Round trip
  }, [gaugeResistance]);

  // Calculate power loss
  const calculatePowerLoss = useCallback((current: number, resistance: number): number => {
    return current * current * resistance; // I²R
  }, []);

  // Calculate voltage drop
  const calculateVoltageDrop = useCallback((current: number, resistance: number): number => {
    return current * resistance; // V = IR
  }, []);

  // Play phase calculations
  const resistance = calculateResistance(wireGauge, cableLength);
  const powerLoss = calculatePowerLoss(loadCurrent, resistance);
  const voltageDrop = calculateVoltageDrop(loadCurrent, resistance);
  const voltageDropPercent = (voltageDrop / 240) * 100;

  // Twist phase calculations
  const currentAt208V = loadPower / 208;
  const currentAt480V = loadPower / 480;
  const lossAt208V = calculatePowerLoss(currentAt208V, resistance);
  const lossAt480V = calculatePowerLoss(currentAt480V, resistance);

  // Handlers
  const handleSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) setHasExperimented(true);
      return newCount;
    });
  }, []);

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

  const handleVoltageChange = useCallback((voltage: number) => {
    setDistributionVoltage(voltage);
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

  const renderCableVisualization = () => {
    const cableThickness = Math.max(4, 20 - wireGauge);
    const heatIntensity = Math.min(1, powerLoss / 500);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-64">
        <defs>
          <linearGradient id="copperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>
          <linearGradient id="heatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="280" fill="#1e293b" rx="12" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
          Cable Power Loss: I²R
        </text>

        {/* Power source */}
        <rect x="30" y="80" width="60" height="80" fill="#374151" rx="8" stroke="#4b5563" strokeWidth="2" />
        <text x="60" y="115" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">240V</text>
        <text x="60" y="135" textAnchor="middle" fill="#94a3b8" fontSize="10">Source</text>

        {/* Cable - top conductor */}
        <rect
          x="90"
          y={110 - cableThickness / 2}
          width="180"
          height={cableThickness}
          fill="url(#copperGrad)"
          rx={cableThickness / 2}
        />

        {/* Cable - bottom conductor */}
        <rect
          x="90"
          y={140 - cableThickness / 2}
          width="180"
          height={cableThickness}
          fill="url(#copperGrad)"
          rx={cableThickness / 2}
        />

        {/* Heat waves */}
        {heatIntensity > 0.1 && [...Array(Math.ceil(heatIntensity * 6))].map((_, i) => (
          <path
            key={i}
            d={`M ${110 + i * 30} ${80 - (animationFrame + i * 20) % 30}
                Q ${115 + i * 30} ${70 - (animationFrame + i * 20) % 30},
                  ${120 + i * 30} ${80 - (animationFrame + i * 20) % 30}`}
            fill="none"
            stroke={`rgba(239, 68, 68, ${0.5 - ((animationFrame + i * 20) % 30) / 60})`}
            strokeWidth="2"
          />
        ))}

        {/* Current flow animation */}
        {[...Array(5)].map((_, i) => (
          <circle
            key={i}
            cx={90 + ((animationFrame * 2 + i * 40) % 180)}
            cy={110}
            r="4"
            fill="#fbbf24"
            opacity={0.7}
          />
        ))}

        {/* Load */}
        <rect x="270" y="80" width="60" height="80" fill="#374151" rx="8" stroke="#3b82f6" strokeWidth="2" />
        <text x="300" y="115" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold">
          {(240 - voltageDrop).toFixed(1)}V
        </text>
        <text x="300" y="135" textAnchor="middle" fill="#94a3b8" fontSize="10">Load</text>

        {/* Stats panel */}
        <rect x="30" y="180" width="340" height="85" fill="#0f172a" rx="8" />

        <g transform="translate(50, 200)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">CABLE</text>
          <text x="0" y="18" fill="#f97316" fontSize="12" fontWeight="bold">AWG {wireGauge}</text>
          <text x="0" y="35" fill="#64748b" fontSize="9">{cableLength}m length</text>
        </g>

        <g transform="translate(130, 200)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">CURRENT</text>
          <text x="0" y="18" fill="#fbbf24" fontSize="12" fontWeight="bold">{loadCurrent}A</text>
          <text x="0" y="35" fill="#64748b" fontSize="9">{resistance.toFixed(3)}Ω</text>
        </g>

        <g transform="translate(210, 200)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">POWER LOSS</text>
          <text x="0" y="18" fill={powerLoss > 200 ? '#ef4444' : powerLoss > 100 ? '#fbbf24' : '#22c55e'} fontSize="12" fontWeight="bold">
            {powerLoss.toFixed(0)}W
          </text>
          <text x="0" y="35" fill="#64748b" fontSize="9">I²R loss</text>
        </g>

        <g transform="translate(290, 200)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">V DROP</text>
          <text x="0" y="18" fill={voltageDropPercent > 5 ? '#ef4444' : voltageDropPercent > 3 ? '#fbbf24' : '#22c55e'} fontSize="12" fontWeight="bold">
            {voltageDropPercent.toFixed(1)}%
          </text>
          <text x="0" y="35" fill="#64748b" fontSize="9">{voltageDrop.toFixed(1)}V</text>
        </g>
      </svg>
    );
  };

  const renderVoltageComparisonVisualization = () => {
    const maxLoss = Math.max(lossAt208V, lossAt480V, 100);
    const bar208Height = (lossAt208V / maxLoss) * 150;
    const bar480Height = (lossAt480V / maxLoss) * 150;

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        <defs>
          <linearGradient id="bar208Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="bar480Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="300" fill="#1e293b" rx="12" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
          Higher Voltage = Lower Losses
        </text>
        <text x="200" y="45" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Same {(loadPower / 1000).toFixed(0)}kW load, different distribution voltage
        </text>

        {/* Chart area */}
        <rect x="50" y="60" width="300" height="180" fill="#0f172a" rx="8" />

        {/* 208V Bar */}
        <g transform="translate(100, 220)">
          <rect
            x="0"
            y={-bar208Height}
            width="80"
            height={bar208Height}
            fill="url(#bar208Grad)"
            rx="4"
          />
          <text x="40" y="-bar208Height - 10" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">
            {lossAt208V.toFixed(0)}W
          </text>
          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="12">208V</text>
          <text x="40" y="35" textAnchor="middle" fill="#94a3b8" fontSize="10">
            {currentAt208V.toFixed(1)}A
          </text>
        </g>

        {/* 480V Bar */}
        <g transform="translate(220, 220)">
          <rect
            x="0"
            y={-bar480Height}
            width="80"
            height={bar480Height}
            fill="url(#bar480Grad)"
            rx="4"
          />
          <text x="40" y={-bar480Height - 10} textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
            {lossAt480V.toFixed(0)}W
          </text>
          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="12">480V</text>
          <text x="40" y="35" textAnchor="middle" fill="#94a3b8" fontSize="10">
            {currentAt480V.toFixed(1)}A
          </text>
        </g>

        {/* Savings indicator */}
        {lossAt208V > lossAt480V && (
          <g transform="translate(200, 275)">
            <text x="0" y="0" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
              480V saves {((1 - lossAt480V / lossAt208V) * 100).toFixed(0)}% in cable losses!
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
        <span className="text-4xl">🔌</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
        Cable Sizing & Voltage Drop
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do data centers use thick copper bus bars?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Hidden Cost</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every cable has resistance. When current flows, power is lost as heat (I²R).
              In a data center moving megawatts, poor cable sizing can waste hundreds of kilowatts!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Cable Physics
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
          A cable carries <strong>100 Amps</strong>. If you double the current to <strong>200 Amps</strong>,
          how does the power loss (heat) in the cable change?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'double', label: 'Doubles (2x) - twice the current, twice the loss', icon: '2️⃣' },
          { id: 'quadruple', label: 'Quadruples (4x) - loss goes with current squared', icon: '4️⃣' },
          { id: 'same', label: 'Stays the same - cable resistance is fixed', icon: '➡️' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'quadruple'
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
            prediction === 'quadruple' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
          }`}>
            <p className={`leading-relaxed ${prediction === 'quadruple' ? 'text-emerald-800' : 'text-amber-800'}`}>
              {prediction === 'quadruple' ? (
                <><strong>Exactly right!</strong> P = I²R means power loss scales with the <em>square</em> of current. Double the current = 4x the loss. Triple current = 9x loss! This is why cable sizing matters so much.</>
              ) : (
                <><strong>The math is surprising:</strong> P = I²R! Power loss scales with current <em>squared</em>. Doubling current causes 4x the loss, not 2x. This quadratic relationship is why proper cable sizing is critical.</>
              )}
            </p>
          </div>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
          >
            Explore I²R Losses →
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
          <h2 className="text-xl font-bold text-slate-800">Cable Loss Simulator</h2>
          <p className="text-sm text-slate-500">See how current and wire size affect losses</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderCableVisualization()}
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Load Current: {loadCurrent} Amps
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={loadCurrent}
            onChange={(e) => handleSliderChange(setLoadCurrent, parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10A</span>
            <span>200A</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Wire Gauge: AWG {wireGauge} ({wireGauge <= 2 ? 'thick' : wireGauge <= 6 ? 'medium' : 'thin'})
          </label>
          <input
            type="range"
            min="0"
            max="14"
            step="2"
            value={wireGauge}
            onChange={(e) => handleSliderChange(setWireGauge, parseInt(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>AWG 0 (Thick)</span>
            <span>AWG 14 (Thin)</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Cable Length: {cableLength} meters
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={cableLength}
            onChange={(e) => handleSliderChange(setCableLength, parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10m</span>
            <span>200m</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-amber-800 text-sm leading-relaxed">
          <strong>Notice:</strong> Doubling current causes 4x the power loss! Try increasing current from 50A to 100A and watch the losses jump.
        </p>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        disabled={!hasExperimented}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
          hasExperimented
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
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
        <h2 className="text-xl font-bold text-slate-800">Understanding I²R Losses</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">Power Loss Formula</p>
        <div className="text-3xl font-bold mb-2">P = I²R</div>
        <p className="text-indigo-200 text-sm">
          Power (Watts) = Current² (Amps) x Resistance (Ohms)
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '📐',
            title: 'Quadratic Relationship',
            desc: 'Power loss scales with current SQUARED. 2x current = 4x loss. 3x current = 9x loss. This makes high current extremely expensive.',
          },
          {
            icon: '🔌',
            title: 'Wire Gauge Matters',
            desc: 'Thicker wire (lower AWG) has lower resistance. AWG 0 has 1/10th the resistance of AWG 10. But thicker wire costs more and is harder to install.',
          },
          {
            icon: '📏',
            title: 'Length Adds Up',
            desc: 'Longer cables = more resistance. Remember: current flows there AND back, so a 50m run is actually 100m of conductor.',
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
        className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
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
        <h2 className="text-xl font-bold text-slate-800">The High Voltage Twist</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <p className="text-amber-800 leading-relaxed">
          A data center needs to deliver <strong>10kW</strong> to a server rack.
          They can use either <strong>208V</strong> or <strong>480V</strong> distribution.
        </p>
        <p className="text-amber-700 mt-2 font-medium">
          How do the cable losses compare?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'same', label: 'Same losses - power delivered is the same', icon: '=' },
          { id: '480better', label: '480V has MUCH lower losses (about 1/5th)', icon: '📉' },
          { id: '208better', label: '208V has lower losses - less voltage stress', icon: '📈' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === '480better'
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
            twistPrediction === '480better' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
          }`}>
            <p className={`leading-relaxed ${twistPrediction === '480better' ? 'text-emerald-800' : 'text-amber-800'}`}>
              {twistPrediction === '480better' ? (
                <><strong>Excellent!</strong> P=IV means higher V = lower I for same power. Since losses are I²R, halving current cuts losses to 1/4! 480V vs 208V: (208/480)² = 0.19 or about 1/5 the losses!</>
              ) : (
                <><strong>The math is powerful:</strong> Higher voltage means lower current for the same power (P=IV). Since losses are I²R, halving current reduces losses to 1/4. This is why data centers prefer higher distribution voltages!</>
              )}
            </p>
          </div>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
          >
            Compare Voltages →
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
          <h2 className="text-xl font-bold text-slate-800">Voltage Comparison</h2>
          <p className="text-sm text-slate-500">See how distribution voltage affects losses</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderVoltageComparisonVisualization()}
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-6">
        <label className="text-slate-700 text-sm font-medium block mb-2">
          Load Power: {(loadPower / 1000).toFixed(0)} kW
        </label>
        <input
          type="range"
          min="1000"
          max="50000"
          step="1000"
          value={loadPower}
          onChange={(e) => { setLoadPower(parseInt(e.target.value)); handleVoltageChange(distributionVoltage); }}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1 kW</span>
          <span>50 kW</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-lg font-bold text-amber-600">208V</div>
          <div className="text-sm text-slate-600">{currentAt208V.toFixed(1)}A current</div>
          <div className="text-xl font-bold text-amber-700">{lossAt208V.toFixed(0)}W loss</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-lg font-bold text-green-600">480V</div>
          <div className="text-sm text-slate-600">{currentAt480V.toFixed(1)}A current</div>
          <div className="text-xl font-bold text-green-700">{lossAt480V.toFixed(0)}W loss</div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
        <p className="text-green-800 text-sm leading-relaxed">
          <strong>Key insight:</strong> 480V distribution saves {((1 - lossAt480V / lossAt208V) * 100).toFixed(0)}% in cable losses!
          This is why large data centers use 480V/415V distribution before stepping down to 208V/120V at the rack.
        </p>
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
        {hasExploredTwist ? 'Continue →' : 'Adjust the power slider...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">High Voltage Distribution</h2>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Why Use Higher Voltages?</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">📉</div>
            <div className="text-sm text-slate-700 font-medium">Lower Current</div>
            <div className="text-xs text-teal-600">I = P/V</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-sm text-slate-700 font-medium">Less Heat</div>
            <div className="text-xs text-teal-600">P = I²R</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-sm text-slate-700 font-medium">Smaller Cables</div>
            <div className="text-xs text-teal-600">Less copper cost</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-700 font-medium">Better Efficiency</div>
            <div className="text-xs text-teal-600">Lower total losses</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-slate-800 mb-2">Real World Examples</h4>
        <ul className="text-slate-600 text-sm space-y-2">
          <li>Power transmission: 230-765 kV (minimizes losses over 100s of miles)</li>
          <li>Data centers: 480V primary, 208V to racks</li>
          <li>EV fast charging: 400-800V DC</li>
          <li>Home: 240V for high-power appliances (dryers, AC)</li>
        </ul>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
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
                  ? 'bg-amber-500 text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
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
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Mark as Complete
              </button>
            ) : (
              <div className="w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-semibold text-center">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-amber-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
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
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
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
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7 ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '🔌' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7 ? 'Excellent! You understand cable sizing and voltage drop!' : 'Review the concepts and try again.'}
            </p>

            {testScore >= 7 ? (
              <button
                onClick={() => onPhaseComplete?.()}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
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
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30 mb-6">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">Cable Sizing Master!</h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand the physics of power distribution and cable losses.
      </p>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'P = I²R: Power loss scales with current squared',
            'Higher voltage = lower current = dramatically lower losses',
            'Doubling voltage cuts losses to 1/4 (for same power)',
            'Wire gauge determines resistance (lower AWG = thicker)',
            'Voltage drop should stay under 3-5% for efficiency',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm">✓</span>
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
