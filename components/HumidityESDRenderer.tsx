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

interface HumidityESDRendererProps {
  phase?: Phase; // Optional - used for resume functionality
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase labels for progress bar
const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What is the optimal humidity range for data centers?',
    options: [
      { text: '10-20% RH (very dry)', correct: false },
      { text: '40-60% RH (moderate)', correct: true },
      { text: '80-90% RH (very humid)', correct: false },
      { text: 'Humidity does not matter', correct: false },
    ],
  },
  {
    question: 'What does ESD stand for?',
    options: [
      { text: 'Electronic System Design', correct: false },
      { text: 'Electrostatic Discharge', correct: true },
      { text: 'Electrical Safety Device', correct: false },
      { text: 'Energy Storage Device', correct: false },
    ],
  },
  {
    question: 'Why does low humidity increase ESD risk?',
    options: [
      { text: 'Low humidity makes equipment run hotter', correct: false },
      { text: 'Dry air is a better insulator, allowing more charge to accumulate', correct: true },
      { text: 'Low humidity damages components directly', correct: false },
      { text: 'It does not affect ESD', correct: false },
    ],
  },
  {
    question: 'What voltage can a typical static shock reach?',
    options: [
      { text: '12V - like a car battery', correct: false },
      { text: '120V - like wall outlet', correct: false },
      { text: '3,000-25,000V - thousands of volts', correct: true },
      { text: '1V - barely noticeable', correct: false },
    ],
  },
  {
    question: 'What happens when humidity is too high (>60%)?',
    options: [
      { text: 'Equipment runs faster', correct: false },
      { text: 'Condensation and corrosion risk increases', correct: true },
      { text: 'ESD becomes more dangerous', correct: false },
      { text: 'No negative effects', correct: false },
    ],
  },
  {
    question: 'What is the dew point temperature?',
    options: [
      { text: 'When electronics overheat', correct: false },
      { text: 'Temperature at which air becomes saturated and moisture condenses', correct: true },
      { text: 'The coldest temperature in a data center', correct: false },
      { text: 'The temperature of morning dew', correct: false },
    ],
  },
  {
    question: 'How much voltage can damage a sensitive IC chip?',
    options: [
      { text: 'Over 10,000V only', correct: false },
      { text: 'Less than 100V can damage sensitive components', correct: true },
      { text: 'Only visible sparks cause damage', correct: false },
      { text: 'ICs are immune to ESD', correct: false },
    ],
  },
  {
    question: 'What is an ESD wrist strap designed to do?',
    options: [
      { text: 'Keep your wrist warm', correct: false },
      { text: 'Ground the technician to prevent static buildup', correct: true },
      { text: 'Measure static voltage', correct: false },
      { text: 'Prevent electric shock', correct: false },
    ],
  },
  {
    question: 'Why do data centers monitor both humidity AND dew point?',
    options: [
      { text: 'Only for regulatory compliance', correct: false },
      { text: 'To prevent both ESD (low humidity) AND condensation (dew point)', correct: true },
      { text: 'Humidity and dew point are the same thing', correct: false },
      { text: 'To calculate energy costs', correct: false },
    ],
  },
  {
    question: 'What material is most likely to generate static electricity?',
    options: [
      { text: 'Metal surfaces', correct: false },
      { text: 'Grounded equipment', correct: false },
      { text: 'Synthetic materials like carpet and plastic', correct: true },
      { text: 'Water', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Data Center HVAC Design',
    icon: '🏢',
    description: 'Modern data centers maintain 40-60% RH with precision HVAC systems. Too dry = ESD damage. Too humid = condensation on cold surfaces. Millions of dollars in equipment depend on this balance.',
  },
  {
    title: 'Semiconductor Manufacturing',
    icon: '💻',
    description: 'Chip fabs maintain extreme humidity control (45% +/- 2%). A single static discharge can destroy chips worth thousands. Workers wear special suits and use ionizing air bars.',
  },
  {
    title: 'Hospital Operating Rooms',
    icon: '🏥',
    description: 'OR humidity is kept at 40-60% to prevent static sparks near flammable anesthetics and oxygen, while avoiding bacterial growth from high humidity.',
  },
  {
    title: 'Winter Static Shocks',
    icon: '❄️',
    description: 'Indoor humidity drops to 10-20% in winter when heating cold air. This is why you get shocked touching doorknobs! Humidifiers help, but too much causes window condensation.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function HumidityESDRenderer({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: HumidityESDRendererProps) {
  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPhase && PHASES.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  });

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && PHASES.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

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
  const [humidity, setHumidity] = useState(50);
  const [temperature, setTemperature] = useState(22);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [staticCharge, setStaticCharge] = useState(0);
  const [showSpark, setShowSpark] = useState(false);

  // Twist phase state
  const [twistHumidity, setTwistHumidity] = useState(70);
  const [coldSurfaceTemp, setColdSurfaceTemp] = useState(15);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);
  const [showCondensation, setShowCondensation] = useState(false);

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

  // Calculate dew point (simplified Magnus formula)
  const calculateDewPoint = useCallback((temp: number, rh: number): number => {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100);
    return (b * alpha) / (a - alpha);
  }, []);

  // Calculate ESD risk based on humidity
  const calculateESDRisk = useCallback((rh: number): { risk: string; voltage: number; color: string } => {
    if (rh < 20) return { risk: 'CRITICAL', voltage: 25000, color: '#ef4444' };
    if (rh < 30) return { risk: 'HIGH', voltage: 15000, color: '#f97316' };
    if (rh < 40) return { risk: 'MODERATE', voltage: 5000, color: '#eab308' };
    if (rh < 60) return { risk: 'LOW', voltage: 1500, color: '#22c55e' };
    return { risk: 'MINIMAL', voltage: 500, color: '#3b82f6' };
  }, []);

  // Check for condensation risk
  const hasCondensationRisk = useCallback((surfaceTemp: number, ambientTemp: number, rh: number): boolean => {
    const dewPoint = calculateDewPoint(ambientTemp, rh);
    return surfaceTemp <= dewPoint;
  }, [calculateDewPoint]);

  const dewPoint = calculateDewPoint(temperature, humidity);
  const esdRisk = calculateESDRisk(humidity);
  const twistDewPoint = calculateDewPoint(22, twistHumidity);
  const condensationRisk = hasCondensationRisk(coldSurfaceTemp, 22, twistHumidity);

  // Handlers
  const handleSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleSimulateSpark = useCallback(() => {
    if (humidity < 40) {
      setStaticCharge(esdRisk.voltage);
      setShowSpark(true);
      setTimeout(() => setShowSpark(false), 500);
    }
  }, [humidity, esdRisk.voltage]);

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

  const handleTwistSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(value);
    setHasExploredTwist(true);
    setShowCondensation(hasCondensationRisk(coldSurfaceTemp, 22, twistHumidity));
  }, [hasCondensationRisk, coldSurfaceTemp, twistHumidity]);

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

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className={`p-2 rounded-lg transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-slate-700 text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 bg-cyan-500'
                    : i < currentIdx
                    ? 'w-2 bg-emerald-500 cursor-pointer hover:bg-emerald-400'
                    : 'w-2 bg-slate-600'
                }`}
                title={PHASE_LABELS[p]}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400 ml-2">
            {currentIdx + 1}/{PHASES.length}
          </span>
        </div>

        <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
          {PHASE_LABELS[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex justify-between items-center px-6 py-4 bg-slate-900/80 border-t border-slate-700">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Back
        </button>

        <span className="text-sm text-slate-500 font-medium">
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            canGoNext
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {nextLabel} {canGoNext && <span className="ml-1">→</span>}
        </button>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHumidityVisualization = () => {
    const waterMolecules = Math.floor(humidity / 5);

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        <defs>
          <linearGradient id="airGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background - air */}
        <rect width="400" height="300" fill="url(#airGrad)" rx="12" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
          Humidity & Static Discharge
        </text>

        {/* Water molecules in air */}
        {[...Array(waterMolecules)].map((_, i) => (
          <circle
            key={i}
            cx={30 + (i % 10) * 35 + Math.sin(animationFrame / 20 + i) * 10}
            cy={60 + Math.floor(i / 10) * 40 + Math.cos(animationFrame / 25 + i) * 8}
            r={4}
            fill="rgba(96, 165, 250, 0.5)"
          />
        ))}

        {/* Person silhouette */}
        <g transform="translate(100, 120)">
          <ellipse cx="0" cy="0" rx="15" ry="20" fill="#6b7280" /> {/* Head */}
          <rect x="-25" y="20" width="50" height="70" fill="#6b7280" rx="10" /> {/* Body */}
          <rect x="-35" y="30" width="15" height="50" fill="#6b7280" rx="5" /> {/* Left arm */}
          <rect x="20" y="30" width="15" height="50" fill="#6b7280" rx="5" /> {/* Right arm */}

          {/* Static charge indicators */}
          {humidity < 40 && (
            <>
              {[...Array(Math.floor((40 - humidity) / 5))].map((_, i) => (
                <text
                  key={i}
                  x={-20 + i * 15}
                  y={-30 - (animationFrame + i * 10) % 20}
                  fill="#fbbf24"
                  fontSize="12"
                  opacity={0.5 + Math.sin(animationFrame / 10 + i) * 0.5}
                >
                  +
                </text>
              ))}
            </>
          )}
        </g>

        {/* Doorknob/metal surface */}
        <g transform="translate(280, 170)">
          <rect x="-5" y="-50" width="10" height="100" fill="#4b5563" /> {/* Door frame */}
          <circle cx="0" cy="0" r="20" fill="#9ca3af" stroke="#d1d5db" strokeWidth="2" /> {/* Knob */}
          <circle cx="0" cy="0" r="8" fill="#6b7280" />

          {/* Spark effect */}
          {showSpark && (
            <g filter="url(#glow)">
              <path
                d="M -20 0 L -50 -20 L -35 0 L -60 20 L -20 0"
                fill="#fbbf24"
                opacity="0.9"
              />
              <circle cx="-30" cy="0" r="15" fill="#fef08a" opacity="0.7">
                <animate attributeName="r" values="10;25;10" dur="0.3s" />
              </circle>
            </g>
          )}
        </g>

        {/* Stats panel */}
        <rect x="20" y="220" width="360" height="70" fill="#0f172a" rx="8" />

        <g transform="translate(50, 240)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">HUMIDITY</text>
          <text x="0" y="20" fill={esdRisk.color} fontSize="14" fontWeight="bold">{humidity}% RH</text>
        </g>

        <g transform="translate(140, 240)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">ESD RISK</text>
          <text x="0" y="20" fill={esdRisk.color} fontSize="14" fontWeight="bold">{esdRisk.risk}</text>
        </g>

        <g transform="translate(230, 240)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">MAX STATIC</text>
          <text x="0" y="20" fill={esdRisk.color} fontSize="14" fontWeight="bold">{(esdRisk.voltage / 1000).toFixed(0)}kV</text>
        </g>

        <g transform="translate(320, 240)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">DEW POINT</text>
          <text x="0" y="20" fill="#60a5fa" fontSize="14" fontWeight="bold">{dewPoint.toFixed(1)}C</text>
        </g>

        {/* Humidity meter */}
        <rect x="350" y="50" width="30" height="150" fill="#1f2937" rx="4" stroke="#374151" strokeWidth="2" />
        <rect
          x="355"
          y={195 - humidity * 1.4}
          width="20"
          height={humidity * 1.4}
          fill={humidity < 30 ? '#ef4444' : humidity < 40 ? '#f59e0b' : humidity > 60 ? '#3b82f6' : '#22c55e'}
          rx="2"
        />
        <text x="365" y="215" textAnchor="middle" fill="#94a3b8" fontSize="9">RH%</text>
      </svg>
    );
  };

  const renderCondensationVisualization = () => {
    const isCondensing = coldSurfaceTemp <= twistDewPoint;

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        <defs>
          <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="300" fill="#1e293b" rx="12" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
          Condensation Risk: Dew Point Analysis
        </text>

        {/* Cold pipe/surface */}
        <rect x="100" y="80" width="200" height="40" fill="url(#pipeGrad)" rx="20" />
        <text x="200" y="145" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Cold Surface: {coldSurfaceTemp}C
        </text>

        {/* Condensation droplets */}
        {isCondensing && (
          <g>
            {[...Array(15)].map((_, i) => {
              const x = 110 + (i % 8) * 25;
              const baseY = 125;
              const dropY = baseY + ((animationFrame + i * 20) % 60);
              const opacity = 1 - ((animationFrame + i * 20) % 60) / 60;

              return (
                <g key={i}>
                  {/* Droplet on surface */}
                  <ellipse
                    cx={x}
                    cy={120}
                    rx={4 + Math.sin(animationFrame / 10 + i) * 2}
                    ry={3}
                    fill="rgba(96, 165, 250, 0.7)"
                  />
                  {/* Falling droplet */}
                  {(animationFrame + i * 20) % 120 < 60 && (
                    <ellipse
                      cx={x}
                      cy={dropY}
                      rx={3}
                      ry={5}
                      fill={`rgba(96, 165, 250, ${opacity})`}
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Temperature/humidity diagram */}
        <rect x="50" y="170" width="300" height="100" fill="#0f172a" rx="8" />

        {/* Dew point line */}
        <line x1="70" y1="220" x2="330" y2="220" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5,5" />
        <text x="60" y="225" fill="#60a5fa" fontSize="10" textAnchor="end">Dew: {twistDewPoint.toFixed(1)}C</text>

        {/* Surface temp indicator */}
        <circle
          cx={70 + (coldSurfaceTemp / 30) * 260}
          cy={220}
          r="8"
          fill={isCondensing ? '#ef4444' : '#22c55e'}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          x={70 + (coldSurfaceTemp / 30) * 260}
          y="250"
          textAnchor="middle"
          fill={isCondensing ? '#ef4444' : '#22c55e'}
          fontSize="11"
          fontWeight="bold"
        >
          {coldSurfaceTemp}C
        </text>

        {/* Status indicator */}
        <rect
          x="120"
          y="175"
          width="160"
          height="30"
          fill={isCondensing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}
          rx="6"
        />
        <text
          x="200"
          y="195"
          textAnchor="middle"
          fill={isCondensing ? '#ef4444' : '#22c55e'}
          fontSize="12"
          fontWeight="bold"
        >
          {isCondensing ? 'CONDENSATION OCCURRING!' : 'No Condensation Risk'}
        </text>

        {/* Side info */}
        <g transform="translate(320, 80)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">Humidity</text>
          <text x="0" y="18" fill="#60a5fa" fontSize="14" fontWeight="bold">{twistHumidity}%</text>
          <text x="0" y="45" fill="#94a3b8" fontSize="10">Dew Point</text>
          <text x="0" y="63" fill="#60a5fa" fontSize="14" fontWeight="bold">{twistDewPoint.toFixed(1)}C</text>
        </g>
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/30">
        <span className="text-4xl">💧</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Humidity & Static Discharge
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do data centers control humidity so precisely?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Goldilocks Zone</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Too dry = static discharge fries components. Too humid = condensation corrodes circuits.
              Data centers walk a tightrope between these two failure modes.
            </p>
          </div>
        </div>
      </div>

      {renderBottomBar(true, 'Explore Humidity Control')}
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
          It&apos;s a dry winter day with <strong>15% relative humidity</strong>.
          You walk across a carpet and reach for a server&apos;s metal case.
        </p>
        <p className="text-blue-700 mt-2 font-medium">
          What voltage might the static spark reach?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'low', label: '12V - like touching a battery', icon: '🔋' },
          { id: 'medium', label: '120V - like a wall outlet', icon: '🔌' },
          { id: 'high', label: '25,000V - thousands of volts!', icon: '⚡' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'high'
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
          prediction === 'high' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${prediction === 'high' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {prediction === 'high' ? (
              <><strong>Exactly right!</strong> Static discharge can reach 25,000V or more! You feel sparks above ~3,000V, but even unfelt discharges below 100V can damage sensitive electronics. Dry air is an excellent insulator, allowing massive charge buildup.</>
            ) : (
              <><strong>Much higher!</strong> Static sparks routinely reach 3,000-25,000V. The spark you see/feel is thousands of volts! Even unfelt ESD under 100V can damage sensitive chips. This is why humidity control is critical.</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showPredictionFeedback, 'Explore ESD Physics')}
    </div>
  );

  const renderPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Static Discharge Simulator</h2>
          <p className="text-sm text-slate-500">See how humidity affects ESD risk</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderHumidityVisualization()}
      </div>

      <div className="space-y-4 mb-4">
        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Relative Humidity: {humidity}%
          </label>
          <input
            type="range"
            min="10"
            max="80"
            value={humidity}
            onChange={(e) => handleSliderChange(setHumidity, parseInt(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10% (Desert)</span>
            <span>40-60% (Optimal)</span>
            <span>80% (Tropical)</span>
          </div>
        </div>
      </div>

      {humidity < 40 && (
        <button
          onClick={handleSimulateSpark}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="w-full py-3 mb-4 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
        >
          Simulate Static Discharge
        </button>
      )}

      <div className={`rounded-2xl p-4 mb-6 ${
        humidity < 30 ? 'bg-red-50 border border-red-200' :
        humidity < 40 ? 'bg-amber-50 border border-amber-200' :
        humidity > 60 ? 'bg-blue-50 border border-blue-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <p className={`text-sm leading-relaxed ${
          humidity < 30 ? 'text-red-800' :
          humidity < 40 ? 'text-amber-800' :
          humidity > 60 ? 'text-blue-800' :
          'text-green-800'
        }`}>
          {humidity < 30 ? (
            <><strong>DANGER!</strong> Extremely dry. Static can build to 25,000V+. High risk of component damage from ESD.</>
          ) : humidity < 40 ? (
            <><strong>Warning:</strong> Low humidity. Static voltages can reach 5,000-15,000V. Use ESD protection.</>
          ) : humidity > 60 ? (
            <><strong>Caution:</strong> High humidity. ESD risk is low, but watch for condensation on cold surfaces.</>
          ) : (
            <><strong>Optimal range!</strong> 40-60% RH balances ESD prevention and condensation risk. This is the data center sweet spot.</>
          )}
        </p>
      </div>

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : `Adjust humidity ${Math.max(0, 5 - experimentCount)} more times...`)}
    </div>
  );

  const renderReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding ESD and Humidity</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">Optimal Data Center Humidity</p>
        <div className="text-4xl font-bold mb-2">40-60% RH</div>
        <p className="text-indigo-200 text-sm">
          The Goldilocks zone: not too dry, not too humid
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '⚡',
            title: 'ESD Mechanism',
            desc: 'Dry air is an excellent insulator. Walking on carpet separates electrons, building thousands of volts. When you touch metal, discharge occurs in nanoseconds!',
          },
          {
            icon: '🛡️',
            title: 'Why Humidity Helps',
            desc: 'Humid air conducts slightly, allowing charge to dissipate before it builds up. Above 40% RH, dangerous charge accumulation is much harder.',
          },
          {
            icon: '💔',
            title: 'Component Damage',
            desc: 'Modern ICs can be damaged by <100V - you would not even feel it. CMOS gates, MOSFET transistors, and memory chips are especially vulnerable.',
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

      {renderBottomBar(true, 'Now for a Twist...')}
    </div>
  );

  const renderTwistPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <span className="text-xl">🔄</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The High Humidity Twist</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <p className="text-amber-800 leading-relaxed">
          If low humidity causes ESD, why not just run data centers at <strong>80% humidity</strong>?
          That would eliminate static completely!
        </p>
        <p className="text-amber-700 mt-2 font-medium">
          What&apos;s wrong with this plan?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'nothing', label: 'Nothing - high humidity would be better', icon: '✅' },
          { id: 'condensation', label: 'Condensation! Water forms on cold surfaces', icon: '💧' },
          { id: 'cost', label: 'Too expensive to maintain', icon: '💰' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'condensation'
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
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'condensation' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${twistPrediction === 'condensation' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {twistPrediction === 'condensation' ? (
              <><strong>Exactly!</strong> High humidity causes condensation on any surface below the dew point. Cold water pipes, air conditioning coils, and even server intake fans can collect water droplets - leading to short circuits and corrosion.</>
            ) : (
              <><strong>The real danger:</strong> Condensation! When humid air contacts cold surfaces (pipes, AC coils, server intakes), water condenses. Liquid water + electronics = short circuits and corrosion. Too humid is just as bad as too dry!</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showTwistFeedback, 'Explore Dew Point')}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-xl">💧</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Condensation Simulator</h2>
          <p className="text-sm text-slate-500">See when moisture forms on cold surfaces</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderCondensationVisualization()}
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Room Humidity: {twistHumidity}% (Dew Point: {twistDewPoint.toFixed(1)}C)
          </label>
          <input
            type="range"
            min="30"
            max="90"
            value={twistHumidity}
            onChange={(e) => handleTwistSliderChange(setTwistHumidity, parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Cold Surface Temperature: {coldSurfaceTemp}C
          </label>
          <input
            type="range"
            min="5"
            max="25"
            value={coldSurfaceTemp}
            onChange={(e) => handleTwistSliderChange(setColdSurfaceTemp, parseInt(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5C (Cold pipe)</span>
            <span>15C (AC vent)</span>
            <span>25C (Room temp)</span>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl p-4 mb-6 ${
        condensationRisk ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
      }`}>
        <p className={`text-sm leading-relaxed ${condensationRisk ? 'text-red-800' : 'text-green-800'}`}>
          {condensationRisk ? (
            <><strong>CONDENSATION!</strong> Surface ({coldSurfaceTemp}C) is below dew point ({twistDewPoint.toFixed(1)}C). Water is forming! This can cause short circuits and corrosion.</>
          ) : (
            <><strong>Safe:</strong> Surface ({coldSurfaceTemp}C) is above dew point ({twistDewPoint.toFixed(1)}C). No condensation will form.</>
          )}
        </p>
      </div>

      {renderBottomBar(hasExploredTwist, hasExploredTwist ? 'Continue' : 'Adjust the sliders...')}
    </div>
  );

  const renderTwistReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The Complete Picture</h2>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Two Failure Modes, One Solution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4 border-2 border-red-200">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-700 font-medium">Too Dry (&lt;40%)</div>
            <div className="text-xs text-red-600 font-bold">ESD Damage</div>
            <div className="text-xs text-slate-500">Up to 25,000V</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4 border-2 border-blue-200">
            <div className="text-3xl mb-2">💧</div>
            <div className="text-sm text-slate-700 font-medium">Too Humid (&gt;60%)</div>
            <div className="text-xs text-blue-600 font-bold">Condensation</div>
            <div className="text-xs text-slate-500">Corrosion, shorts</div>
          </div>
        </div>
        <div className="mt-4 text-center bg-green-100 rounded-xl p-4 border-2 border-green-300">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-sm text-slate-700 font-medium">40-60% RH</div>
          <div className="text-xs text-green-600 font-bold">The Safe Zone</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-slate-800 mb-2">Data Center Best Practices</h4>
        <ul className="text-slate-600 text-sm space-y-2">
          <li>Monitor both humidity AND dew point continuously</li>
          <li>Keep surfaces above dew point (especially cold pipes)</li>
          <li>Use precision HVAC with humidity control</li>
          <li>Implement ESD procedures regardless of humidity</li>
        </ul>
      </div>

      {renderBottomBar(true, 'See Real Applications')}
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
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
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
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Mark as Complete
              </button>
            ) : (
              <div className="w-full py-3 bg-cyan-100 text-cyan-700 rounded-xl font-semibold text-center">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-cyan-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedApps.size / 4) * 100}%` }}
            />
          </div>
        </div>

        {renderBottomBar(allAppsCompleted, allAppsCompleted ? 'Take the Assessment' : `Complete ${4 - completedApps.size} more`)}
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
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7 ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '💧' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7 ? 'Excellent! You understand humidity and ESD!' : 'Review the concepts and try again.'}
            </p>

            {testScore < 7 && (
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-slate-200 text-slate-700 mb-4"
              >
                Try Again
              </button>
            )}
            {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Lesson' : 'Review and Retry')}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="max-w-2xl mx-auto px-6 py-8 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/30 mb-6">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">Humidity Control Master!</h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand the critical balance between ESD prevention and condensation control.
      </p>

      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'Optimal humidity: 40-60% RH for data centers',
            'Low humidity (<30%) allows 25,000V+ static buildup',
            'High humidity (>60%) causes condensation on cold surfaces',
            'Dew point temperature determines when water condenses',
            'Monitor both humidity AND dew point for complete protection',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm">✓</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {renderBottomBar(true, 'Complete')}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {renderProgressBar()}
      <div className="flex-1 overflow-auto">
        {renderPhase()}
      </div>
    </div>
  );
}
