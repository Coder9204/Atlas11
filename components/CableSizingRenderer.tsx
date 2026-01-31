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
  phase: initialPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: CableSizingRendererProps) {
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

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#f59e0b',       // amber-500 (electrical/energy)
    primaryDark: '#d97706',   // amber-600
    accent: '#ef4444',        // red-500 (for heat/loss)
    secondary: '#3b82f6',     // blue-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    copper: '#b87333',        // copper color
    heat: '#ef4444',          // for power loss
    energy: '#fbbf24',        // amber-400
  };

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
                    ? 'w-6 bg-amber-500'
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

        <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
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
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
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

  const renderCableVisualization = () => {
    const cableThickness = Math.max(8, 24 - wireGauge);
    const heatIntensity = Math.min(1, powerLoss / 500);
    const copperCoreRadius = cableThickness * 0.4;
    const insulationThickness = cableThickness * 0.3;

    return (
      <div>
        <svg viewBox="0 0 400 220" className="w-full h-56">
          <defs>
            {/* Premium copper core gradient with realistic metallic sheen */}
            <linearGradient id="cableCopperCore" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f5a54a" />
              <stop offset="25%" stopColor="#e07d31" />
              <stop offset="50%" stopColor="#b87333" />
              <stop offset="75%" stopColor="#a05a20" />
              <stop offset="100%" stopColor="#8b4513" />
            </linearGradient>

            {/* Copper highlight for 3D effect */}
            <linearGradient id="cableCopperHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#f5a54a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b4513" stopOpacity="0" />
            </linearGradient>

            {/* Insulation gradient - dark rubber look */}
            <linearGradient id="cableInsulation" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4a4a4a" />
              <stop offset="30%" stopColor="#2d2d2d" />
              <stop offset="70%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#0f0f0f" />
            </linearGradient>

            {/* Outer jacket gradient */}
            <linearGradient id="cableJacket" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#1f2937" />
              <stop offset="75%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Power source housing gradient */}
            <linearGradient id="cableSourceHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Load housing gradient */}
            <linearGradient id="cableLoadHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="30%" stopColor="#1e3a8a" />
              <stop offset="70%" stopColor="#172554" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Heat gradient for temperature indicator */}
            <linearGradient id="cableHeatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="33%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Current flow particle glow */}
            <radialGradient id="cableCurrentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Heat wave glow */}
            <radialGradient id="cableHeatWaveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Premium electron glow filter */}
            <filter id="cableElectronGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat wave blur filter */}
            <filter id="cableHeatBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow for components */}
            <filter id="cableInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Background gradient */}
            <linearGradient id="cableBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Subtle grid pattern */}
            <pattern id="cableGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium background */}
          <rect width="400" height="220" fill="url(#cableBackground)" rx="12" />
          <rect width="400" height="220" fill="url(#cableGridPattern)" rx="12" />

          {/* === POWER SOURCE === */}
          <g transform="translate(20, 60)">
            {/* Main housing */}
            <rect x="0" y="0" width="60" height="80" rx="8" fill="url(#cableSourceHousing)" stroke="#4b5563" strokeWidth="1.5" />
            {/* Inner panel */}
            <rect x="5" y="5" width="50" height="70" rx="6" fill="#0f172a" opacity="0.5" />
            {/* Voltage indicator light */}
            <circle cx="30" cy="20" r="6" fill="#fbbf24" filter="url(#cableElectronGlow)" />
            <circle cx="30" cy="20" r="3" fill="#fef3c7" />
            {/* Terminal connections */}
            <rect x="50" y="30" width="15" height="8" rx="2" fill="url(#cableCopperCore)" />
            <rect x="50" y="62" width="15" height="8" rx="2" fill="url(#cableCopperCore)" />
          </g>

          {/* === CABLE CROSS-SECTION INDICATOR === */}
          <g transform="translate(180, 150)">
            {/* Cable cross-section showing layers */}
            <circle cx="0" cy="0" r={cableThickness} fill="url(#cableJacket)" />
            <circle cx="0" cy="0" r={cableThickness - 2} fill="url(#cableInsulation)" />
            <circle cx="0" cy="0" r={copperCoreRadius + insulationThickness} fill="#1a1a1a" />
            <circle cx="0" cy="0" r={copperCoreRadius} fill="url(#cableCopperCore)" />
            <circle cx="0" cy="0" r={copperCoreRadius * 0.6} fill="url(#cableCopperHighlight)" />
          </g>

          {/* === TOP CABLE WITH LAYERS === */}
          <g>
            {/* Outer jacket */}
            <rect
              x="80"
              y={95 - cableThickness / 2}
              width="180"
              height={cableThickness}
              fill="url(#cableJacket)"
              rx={cableThickness / 2}
            />
            {/* Insulation layer */}
            <rect
              x="82"
              y={95 - (cableThickness - 4) / 2}
              width="176"
              height={cableThickness - 4}
              fill="url(#cableInsulation)"
              rx={(cableThickness - 4) / 2}
            />
            {/* Copper core */}
            <rect
              x="84"
              y={95 - copperCoreRadius}
              width="172"
              height={copperCoreRadius * 2}
              fill="url(#cableCopperCore)"
              rx={copperCoreRadius}
            />
            {/* Copper highlight */}
            <rect
              x="84"
              y={95 - copperCoreRadius}
              width="172"
              height={copperCoreRadius}
              fill="url(#cableCopperHighlight)"
              rx={copperCoreRadius}
              opacity="0.5"
            />
          </g>

          {/* === BOTTOM CABLE WITH LAYERS === */}
          <g>
            {/* Outer jacket */}
            <rect
              x="80"
              y={125 - cableThickness / 2}
              width="180"
              height={cableThickness}
              fill="url(#cableJacket)"
              rx={cableThickness / 2}
            />
            {/* Insulation layer */}
            <rect
              x="82"
              y={125 - (cableThickness - 4) / 2}
              width="176"
              height={cableThickness - 4}
              fill="url(#cableInsulation)"
              rx={(cableThickness - 4) / 2}
            />
            {/* Copper core */}
            <rect
              x="84"
              y={125 - copperCoreRadius}
              width="172"
              height={copperCoreRadius * 2}
              fill="url(#cableCopperCore)"
              rx={copperCoreRadius}
            />
            {/* Copper highlight */}
            <rect
              x="84"
              y={125 - copperCoreRadius}
              width="172"
              height={copperCoreRadius}
              fill="url(#cableCopperHighlight)"
              rx={copperCoreRadius}
              opacity="0.5"
            />
          </g>

          {/* === HEAT WAVES (animated) === */}
          {heatIntensity > 0.1 && [...Array(Math.ceil(heatIntensity * 8))].map((_, i) => {
            const xPos = 100 + i * 25;
            const yOffset = (animationFrame * 1.5 + i * 30) % 40;
            const opacity = Math.max(0, 0.6 - yOffset / 60);
            return (
              <g key={`heat-${i}`} filter="url(#cableHeatBlur)">
                <path
                  d={`M ${xPos} ${75 - yOffset}
                      Q ${xPos + 5} ${65 - yOffset}, ${xPos + 10} ${75 - yOffset}
                      Q ${xPos + 15} ${85 - yOffset}, ${xPos + 20} ${75 - yOffset}`}
                  fill="none"
                  stroke={`rgba(239, 68, 68, ${opacity})`}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* === CURRENT FLOW PARTICLES (top cable) === */}
          {[...Array(6)].map((_, i) => {
            const xPos = 90 + ((animationFrame * 2.5 + i * 30) % 170);
            return (
              <g key={`current-top-${i}`} filter="url(#cableElectronGlow)">
                <circle
                  cx={xPos}
                  cy={95}
                  r="5"
                  fill="url(#cableCurrentGlow)"
                />
                <circle
                  cx={xPos}
                  cy={95}
                  r="2"
                  fill="#fef3c7"
                />
              </g>
            );
          })}

          {/* === CURRENT FLOW PARTICLES (bottom cable - return) === */}
          {[...Array(6)].map((_, i) => {
            const xPos = 260 - ((animationFrame * 2.5 + i * 30) % 170);
            return (
              <g key={`current-bottom-${i}`} filter="url(#cableElectronGlow)">
                <circle
                  cx={xPos}
                  cy={125}
                  r="5"
                  fill="url(#cableCurrentGlow)"
                />
                <circle
                  cx={xPos}
                  cy={125}
                  r="2"
                  fill="#fef3c7"
                />
              </g>
            );
          })}

          {/* === LOAD === */}
          <g transform="translate(260, 60)">
            {/* Main housing */}
            <rect x="0" y="0" width="60" height="80" rx="8" fill="url(#cableLoadHousing)" stroke="#3b82f6" strokeWidth="1.5" />
            {/* Inner panel */}
            <rect x="5" y="5" width="50" height="70" rx="6" fill="#0f172a" opacity="0.5" />
            {/* Status LED based on voltage drop */}
            <circle
              cx="30"
              cy="20"
              r="6"
              fill={voltageDropPercent > 5 ? '#ef4444' : voltageDropPercent > 3 ? '#fbbf24' : '#22c55e'}
              filter="url(#cableElectronGlow)"
            />
            <circle
              cx="30"
              cy="20"
              r="3"
              fill={voltageDropPercent > 5 ? '#fecaca' : voltageDropPercent > 3 ? '#fef3c7' : '#bbf7d0'}
            />
            {/* Terminal connections */}
            <rect x="-5" y="30" width="15" height="8" rx="2" fill="url(#cableCopperCore)" />
            <rect x="-5" y="62" width="15" height="8" rx="2" fill="url(#cableCopperCore)" />
          </g>

          {/* === TEMPERATURE/RESISTANCE INDICATOR BAR === */}
          <g transform="translate(20, 195)">
            {/* Background bar */}
            <rect x="0" y="0" width="360" height="12" rx="6" fill="#1e293b" />
            {/* Gradient fill */}
            <rect x="1" y="1" width="358" height="10" rx="5" fill="url(#cableHeatGradient)" opacity="0.3" />
            {/* Active fill based on heat intensity */}
            <rect
              x="1"
              y="1"
              width={Math.max(10, heatIntensity * 358)}
              height="10"
              rx="5"
              fill="url(#cableHeatGradient)"
            />
            {/* Indicator position */}
            <circle
              cx={Math.max(10, heatIntensity * 358)}
              cy="6"
              r="8"
              fill="#ffffff"
              stroke={heatIntensity > 0.6 ? '#ef4444' : heatIntensity > 0.3 ? '#fbbf24' : '#22c55e'}
              strokeWidth="2"
            />
          </g>
        </svg>

        {/* Stats panel - moved outside SVG using typo system */}
        <div
          className="grid grid-cols-4 gap-2 mt-3 p-3 rounded-xl"
          style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}
        >
          <div className="text-center">
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cable</div>
            <div style={{ fontSize: typo.body, color: colors.copper, fontWeight: 700 }}>AWG {wireGauge}</div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>{cableLength}m</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current</div>
            <div style={{ fontSize: typo.body, color: colors.energy, fontWeight: 700 }}>{loadCurrent}A</div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>{resistance.toFixed(3)}Ω</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Power Loss</div>
            <div style={{ fontSize: typo.body, color: powerLoss > 200 ? colors.danger : powerLoss > 100 ? colors.warning : colors.success, fontWeight: 700 }}>
              {powerLoss.toFixed(0)}W
            </div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>I²R loss</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>V Drop</div>
            <div style={{ fontSize: typo.body, color: voltageDropPercent > 5 ? colors.danger : voltageDropPercent > 3 ? colors.warning : colors.success, fontWeight: 700 }}>
              {voltageDropPercent.toFixed(1)}%
            </div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>{voltageDrop.toFixed(1)}V</div>
          </div>
        </div>
      </div>
    );
  };

  const renderVoltageComparisonVisualization = () => {
    const maxLoss = Math.max(lossAt208V, lossAt480V, 100);
    const bar208Height = (lossAt208V / maxLoss) * 120;
    const bar480Height = (lossAt480V / maxLoss) * 120;
    const savingsPercent = lossAt208V > 0 ? ((1 - lossAt480V / lossAt208V) * 100).toFixed(0) : '0';

    return (
      <div>
        <svg viewBox="0 0 400 220" className="w-full h-56">
          <defs>
            {/* 208V bar gradient - amber/orange warning colors */}
            <linearGradient id="cableBar208Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* 480V bar gradient - green success colors */}
            <linearGradient id="cableBar480Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="25%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="75%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Bar glow effect for 208V */}
            <filter id="cableBar208Glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bar glow effect for 480V */}
            <filter id="cableBar480Glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current flow indicators */}
            <radialGradient id="cableCurrentDot208" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="cableCurrentDot480" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d1fae5" stopOpacity="1" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>

            {/* Premium background */}
            <linearGradient id="cableVoltBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Chart area background */}
            <linearGradient id="cableChartBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
            </linearGradient>

            {/* Grid pattern */}
            <pattern id="cableVoltGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.2" />
            </pattern>

            {/* Savings arrow gradient */}
            <linearGradient id="cableSavingsArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="400" height="220" fill="url(#cableVoltBg)" rx="12" />
          <rect width="400" height="220" fill="url(#cableVoltGrid)" rx="12" />

          {/* Chart area */}
          <rect x="40" y="30" width="320" height="150" fill="url(#cableChartBg)" rx="8" stroke="#334155" strokeWidth="1" />

          {/* Horizontal grid lines */}
          {[0, 1, 2, 3].map(i => (
            <line
              key={`grid-${i}`}
              x1="50"
              y1={165 - i * 35}
              x2="350"
              y2={165 - i * 35}
              stroke="#334155"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          ))}

          {/* 208V Column */}
          <g transform="translate(90, 165)">
            {/* Bar shadow */}
            <rect
              x="5"
              y={-bar208Height + 3}
              width="70"
              height={bar208Height}
              fill="#000"
              opacity="0.3"
              rx="6"
            />
            {/* Main bar */}
            <rect
              x="0"
              y={-bar208Height}
              width="70"
              height={bar208Height}
              fill="url(#cableBar208Grad)"
              rx="6"
              filter="url(#cableBar208Glow)"
            />
            {/* Bar highlight */}
            <rect
              x="5"
              y={-bar208Height + 5}
              width="20"
              height={bar208Height - 10}
              fill="rgba(255,255,255,0.1)"
              rx="4"
            />
            {/* Current flow dots */}
            {[...Array(Math.min(5, Math.ceil(currentAt208V / 20)))].map((_, i) => (
              <circle
                key={`dot208-${i}`}
                cx="35"
                cy={-10 - i * 20 - ((animationFrame * 2) % 20)}
                r="4"
                fill="url(#cableCurrentDot208)"
                opacity={0.8 - i * 0.15}
              />
            ))}
          </g>

          {/* 480V Column */}
          <g transform="translate(240, 165)">
            {/* Bar shadow */}
            <rect
              x="5"
              y={-bar480Height + 3}
              width="70"
              height={bar480Height}
              fill="#000"
              opacity="0.3"
              rx="6"
            />
            {/* Main bar */}
            <rect
              x="0"
              y={-bar480Height}
              width="70"
              height={bar480Height}
              fill="url(#cableBar480Grad)"
              rx="6"
              filter="url(#cableBar480Glow)"
            />
            {/* Bar highlight */}
            <rect
              x="5"
              y={-bar480Height + 5}
              width="20"
              height={Math.max(0, bar480Height - 10)}
              fill="rgba(255,255,255,0.1)"
              rx="4"
            />
            {/* Current flow dots (fewer because lower current) */}
            {[...Array(Math.min(3, Math.ceil(currentAt480V / 20)))].map((_, i) => (
              <circle
                key={`dot480-${i}`}
                cx="35"
                cy={-10 - i * 20 - ((animationFrame * 2) % 20)}
                r="4"
                fill="url(#cableCurrentDot480)"
                opacity={0.8 - i * 0.15}
              />
            ))}
          </g>

          {/* Savings arrow connecting the bars */}
          {lossAt208V > lossAt480V && (
            <g>
              <path
                d={`M 165 ${165 - bar208Height / 2}
                    C 200 ${165 - bar208Height / 2},
                      200 ${165 - bar480Height / 2},
                      235 ${165 - bar480Height / 2}`}
                fill="none"
                stroke="url(#cableSavingsArrow)"
                strokeWidth="3"
                strokeDasharray="6 3"
                opacity="0.7"
              />
              <polygon
                points={`235,${165 - bar480Height / 2 - 5} 245,${165 - bar480Height / 2} 235,${165 - bar480Height / 2 + 5}`}
                fill="#10b981"
              />
            </g>
          )}

          {/* Y-axis label */}
          <text
            x="25"
            y="100"
            fill="#64748b"
            fontSize="10"
            transform="rotate(-90, 25, 100)"
            textAnchor="middle"
          >
            Power Loss (W)
          </text>
        </svg>

        {/* Stats panel - moved outside SVG using typo system */}
        <div
          className="grid grid-cols-2 gap-4 mt-3 p-4 rounded-xl"
          style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}
        >
          {/* 208V Stats */}
          <div
            className="p-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
          >
            <div style={{ fontSize: typo.heading, color: colors.warning, fontWeight: 700 }}>208V</div>
            <div style={{ fontSize: typo.body, color: colors.textSecondary }}>{currentAt208V.toFixed(1)}A current</div>
            <div style={{ fontSize: typo.bodyLarge, color: colors.warning, fontWeight: 700, marginTop: '4px' }}>
              {lossAt208V.toFixed(0)}W loss
            </div>
          </div>

          {/* 480V Stats */}
          <div
            className="p-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
          >
            <div style={{ fontSize: typo.heading, color: colors.success, fontWeight: 700 }}>480V</div>
            <div style={{ fontSize: typo.body, color: colors.textSecondary }}>{currentAt480V.toFixed(1)}A current</div>
            <div style={{ fontSize: typo.bodyLarge, color: colors.success, fontWeight: 700, marginTop: '4px' }}>
              {lossAt480V.toFixed(0)}W loss
            </div>
          </div>
        </div>

        {/* Savings indicator */}
        {lossAt208V > lossAt480V && (
          <div
            className="mt-3 p-3 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            <span style={{ fontSize: typo.bodyLarge, color: colors.success, fontWeight: 700 }}>
              480V saves {savingsPercent}% in cable losses!
            </span>
          </div>
        )}
      </div>
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

      {renderBottomBar(true, 'Explore Cable Physics')}
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
      )}
      {renderBottomBar(showPredictionFeedback, 'Explore I²R Losses')}
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

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : `Adjust sliders ${Math.max(0, 5 - experimentCount)} more times...`)}
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

      {renderBottomBar(true, 'Now for a Twist...')}
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
      )}
      {renderBottomBar(showTwistFeedback, 'Compare Voltages')}
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

      {renderBottomBar(hasExploredTwist, hasExploredTwist ? 'Continue' : 'Adjust the power slider...')}
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
              renderBottomBar(true, 'Complete Lesson')
            ) : (
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-slate-200 text-slate-700"
              >
                Try Again
              </button>
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

      <div className="flex justify-center">
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-semibold"
        >
          Complete
        </button>
      </div>
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
