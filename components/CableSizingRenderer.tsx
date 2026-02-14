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

const realWorldApps = [
  {
    icon: '🏢',
    title: 'Data Center Power Distribution',
    short: 'Massive copper infrastructure',
    tagline: 'Minimizing I²R losses at scale',
    description: 'Data centers consume megawatts of power. Properly sized cables and bus bars minimize I²R losses, preventing millions of dollars in wasted electricity and avoiding dangerous heat buildup.',
    connection: 'Power loss scales with I²R. Data centers use thick copper bus bars (low R) and higher voltages (lower I for same power) to minimize losses in their distribution systems.',
    howItWorks: 'Power enters at medium voltage (15kV), steps down through transformers, and distributes via massive bus bars to PDUs. Each stage is sized to keep voltage drop under 2% and prevent overheating.',
    stats: [
      { value: '2-3%', label: 'Distribution losses', icon: '📉' },
      { value: '500MW+', label: 'Large DC capacity', icon: '⚡' },
      { value: '$10M/year', label: 'Loss cost savings', icon: '💰' }
    ],
    examples: ['Google data centers', 'AWS facilities', 'Meta campuses', 'Microsoft Azure'],
    companies: ['Vertiv', 'Schneider Electric', 'Eaton', 'ABB'],
    futureImpact: 'Superconducting power distribution and 48V direct-to-server power are emerging to eliminate I²R losses in next-generation data centers.',
    color: '#3B82F6'
  },
  {
    icon: '⚡',
    title: 'High-Voltage Transmission',
    short: 'Moving power across continents',
    tagline: 'Why we transmit at 500,000 volts',
    description: 'Power transmission lines operate at extreme voltages (up to 765kV AC or 1100kV DC) to minimize I²R losses over long distances. Higher voltage means lower current for the same power.',
    connection: 'For P = VI, doubling voltage halves current. Since losses are I²R, halving current reduces losses to 1/4. This is why transmission uses ultra-high voltages despite insulation challenges.',
    howItWorks: 'Step-up transformers boost voltage at power plants. HVDC is even more efficient for long distances. Step-down transformers reduce voltage for distribution. Each stage sized for minimal loss.',
    stats: [
      { value: '765kV', label: 'Max AC transmission', icon: '⚡' },
      { value: '1100kV', label: 'Max HVDC', icon: '🔌' },
      { value: '3-5%', label: 'Transmission losses', icon: '📊' }
    ],
    examples: ['Cross-country grid ties', 'Offshore wind connections', 'Hydro power export', 'International interconnects'],
    companies: ['Siemens Energy', 'Hitachi', 'GE Vernova', 'ABB'],
    futureImpact: 'Superconducting transmission cables could eliminate losses entirely, enabling efficient global power grids that balance renewable generation across continents.',
    color: '#F59E0B'
  },
  {
    icon: '🔋',
    title: 'EV Charging Infrastructure',
    short: 'Delivering 350kW to vehicles',
    tagline: 'High-power charging demands thick cables',
    description: 'DC fast chargers deliver up to 350kW to electric vehicles. The cables from grid to car must handle massive currents while staying cool enough to touch - demanding careful sizing.',
    connection: 'At 350kW and 400V, current exceeds 875A. Cable resistance causes I²R heating. Liquid-cooled cables allow higher currents in smaller packages by actively removing heat.',
    howItWorks: 'Grid power is rectified to DC, voltage matched to battery. Liquid-cooled cables carry high current to the vehicle. The CCS connector handles up to 500A continuous with active cooling.',
    stats: [
      { value: '350kW', label: 'Max charging power', icon: '⚡' },
      { value: '500A', label: 'Peak current', icon: '🔌' },
      { value: '15min', label: '10-80% charge time', icon: '⏱️' }
    ],
    examples: ['Tesla Superchargers', 'Electrify America', 'IONITY network', 'ChargePoint'],
    companies: ['ABB', 'Tritium', 'ChargePoint', 'EVBox'],
    futureImpact: 'Megawatt charging for trucks (3MW+) will require even more sophisticated cable and cooling systems, potentially including superconducting connectors.',
    color: '#10B981'
  },
  {
    icon: '🏭',
    title: 'Industrial Motor Feeds',
    short: 'Powering heavy machinery',
    tagline: 'Sizing cables for motors that move mountains',
    description: 'Large industrial motors can draw thousands of amps. Properly sized cables ensure motors receive full voltage at startup (avoiding damaging voltage sag) and run efficiently under load.',
    connection: 'Motor starting current can be 6-8x running current. Cables must handle this inrush without excessive voltage drop (which weakens starting torque) while dissipating steady-state I²R heat.',
    howItWorks: 'NEC tables specify wire sizes for current capacity (ampacity) and voltage drop. Large motors often use paralleled conductors or bus duct. VFDs can reduce starting current requirements.',
    stats: [
      { value: '5000+ HP', label: 'Large motor size', icon: '🏭' },
      { value: '6-8x', label: 'Starting current multiplier', icon: '⚡' },
      { value: '3%', label: 'Max voltage drop', icon: '📉' }
    ],
    examples: ['Mining conveyors', 'Steel rolling mills', 'Water pumping stations', 'HVAC chillers'],
    companies: ['Siemens', 'ABB', 'WEG', 'Nidec'],
    futureImpact: 'Direct-drive permanent magnet motors and advanced VFDs are improving efficiency while reducing cable sizing requirements for new industrial installations.',
    color: '#8B5CF6'
  }
];

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
    description: 'Power Distribution Units in data centers use thick copper bus bars and operate at 480V/415V to minimize losses. Companies like Google, Microsoft, Amazon AWS, and Meta operate massive data centers where power efficiency is critical. A 1MW facility could waste $50,000/year at poor efficiency. Schneider Electric and Eaton are leading PDU manufacturers that design systems specifically to minimize I squared R losses in high-density computing environments.',
  },
  {
    title: 'Electric Vehicle Charging',
    icon: '🚗',
    description: 'Level 3 DC fast chargers from companies like Tesla (Supercharger network), Electrify America, ChargePoint, and EVgo use high voltage (400-800V) to reduce cable sizes while delivering 350kW. ABB and Tritium manufacture the charging equipment. Porsche and Audi vehicles use 800V architecture specifically to enable faster charging with thinner cables. Otherwise cables would need to be impossibly thick and heavy for practical vehicle charging.',
  },
  {
    title: 'Power Grid Transmission',
    icon: '⚡',
    description: 'Power lines operated by utilities like Pacific Gas and Electric (PG&E), Duke Energy, and American Electric Power run at 230-765kV because at 120V, transmitting 1GW would require cables over 10 feet in diameter! Siemens Energy, GE Vernova, and Hitachi build the transformers and switching equipment. High voltage transmission lines from companies like NextEra Energy connect renewable power across entire regions efficiently.',
  },
  {
    title: 'Solar Farm Interconnection',
    icon: '☀️',
    description: 'Large solar farms operated by First Solar, SunPower, and NextEra Energy use central inverters from SMA Solar Technology, SolarEdge, and Enphase to boost voltage before transmission. Tesla Megapack battery installations also use high voltage DC to minimize losses. A 100MW farm might lose 5-10% of generated power in cables alone if operating at low voltage, which is why utility-scale solar always uses medium voltage collection systems.',
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
    textSecondary: '#e2e8f0', // slate-200 - improved contrast
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
    const progressPercent = ((currentIdx + 1) / PHASES.length) * 100;
    return (
      <nav
        className="flex flex-col bg-slate-900/80 border-b border-slate-700"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}
        role="navigation"
        aria-label="Phase navigation"
      >
        {/* Progress bar */}
        <div
          className="h-1 bg-slate-700 w-full"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${currentIdx + 1} of ${PHASES.length} phases`}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={goBack}
            disabled={currentIdx === 0}
            aria-label="Go to previous phase"
            style={{ minHeight: '44px', minWidth: '44px' }}
            className={`p-2 rounded-lg transition-all ${
              currentIdx === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 200 200" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={16} d="M125 158l-58-58 58-58" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex gap-1" role="tablist" aria-label="Phase dots">
              {PHASES.map((p, i) => (
                <button
                  key={p}
                  onClick={() => goToPhase(p)}
                  role="tab"
                  aria-selected={i === currentIdx}
                  aria-label={`${PHASE_LABELS[p]}${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`}
                  style={{ minHeight: '44px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease' }}
                  className="transition-all cursor-pointer"
                >
                  <span className={`block h-2 rounded-full transition-all ${
                    i === currentIdx
                      ? 'w-6 bg-amber-500'
                      : i < currentIdx
                      ? 'w-2 bg-emerald-500 hover:bg-emerald-400'
                      : 'w-2 bg-slate-600 hover:bg-slate-500'
                  }`} />
                </button>
              ))}
            </div>
            <span className="text-xs font-medium ml-2" style={{ color: '#e2e8f0' }}>
              {currentIdx + 1}/{PHASES.length}
            </span>
          </div>

          <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
            {PHASE_LABELS[phase]}
          </div>
        </div>
      </nav>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex justify-between items-center px-6 py-4 bg-slate-900/80 border-t border-slate-700" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)', borderTop: '1px solid #334155' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{ minHeight: '44px', borderRadius: '12px', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', background: '#334155' }}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Back
        </button>

        <span className="text-sm font-medium" style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{ minHeight: '44px', borderRadius: '12px', cursor: canGoNext ? 'pointer' : 'not-allowed', transition: 'all 0.3s ease', background: canGoNext ? 'linear-gradient(to right, #f59e0b, #f97316)' : '#334155', boxShadow: canGoNext ? '0 4px 14px 0 rgba(245, 158, 11, 0.39)' : 'none' }}
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

          {/* SVG Labels for educational clarity */}
          <text x="50" y="55" fill="#e2e8f0" fontSize="11" fontWeight="bold">Power Source</text>
          <text x="50" y="68" fill="#e2e8f0" fontSize="9">240V Supply</text>
          <text x="265" y="55" fill="#e2e8f0" fontSize="11" fontWeight="bold">Load</text>
          <text x="265" y="68" fill="#e2e8f0" fontSize="9">{loadCurrent}A Draw</text>
          <text x="150" y="145" fill="#b87333" fontSize="10" fontWeight="bold">AWG {wireGauge} Cable</text>
          <text x="150" y="158" fill="#e2e8f0" fontSize="9">{cableLength}m length</text>
          <text x="180" y="175" fill="#e2e8f0" fontSize="9">R={resistance.toFixed(3)}Ω</text>
          <text x="180" y="188" fill={powerLoss > 200 ? '#ef4444' : '#fbbf24'} fontSize="10" fontWeight="bold">Loss: {powerLoss.toFixed(0)}W</text>

          {/* Legend */}
          <g transform="translate(280, 150)">
            <text x="0" y="0" fill="#e2e8f0" fontSize="10" fontWeight="bold">Legend:</text>
            <circle cx="8" cy="12" r="4" fill="#fbbf24" />
            <text x="16" y="16" fill="#e2e8f0" fontSize="9">Current Flow</text>
            <circle cx="8" cy="28" r="4" fill="#ef4444" />
            <text x="16" y="32" fill="#e2e8f0" fontSize="9">Heat Loss</text>
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
  // SCENARIO-BASED TEST QUESTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    {
      scenario: "A homeowner is installing a new electric dryer 50 feet from the breaker panel. The electrician mentions that using undersized wire could cause problems.",
      question: "Why does cable size matter for electrical installations?",
      options: [
        { id: 'a', label: "Thicker cables look more professional and meet building aesthetics", correct: false },
        { id: 'b', label: "Undersized cables have higher resistance, causing voltage drop and heat buildup that wastes energy and creates fire hazards", correct: true },
        { id: 'c', label: "Cable size only affects the initial installation cost, not performance", correct: false },
        { id: 'd', label: "Larger cables are required by law regardless of the electrical load", correct: false },
      ],
      explanation: "Cable resistance is inversely proportional to cross-sectional area. Undersized cables have higher resistance, which causes I²R power losses (dissipated as heat) and voltage drop. This wastes energy, can damage equipment that receives insufficient voltage, and creates fire hazards when cables overheat beyond their insulation ratings.",
    },
    {
      scenario: "An engineer is designing a 200-foot circuit to power a workshop. The load draws 30 amps at 240V. She calculates the voltage drop using V = I × R, where R depends on wire gauge and length.",
      question: "If she switches from 10 AWG wire (1.0 Ω/1000ft) to 8 AWG wire (0.63 Ω/1000ft), approximately how much will the voltage drop decrease?",
      options: [
        { id: 'a', label: "The voltage drop will decrease by about 37%, from 12V to 7.6V", correct: true },
        { id: 'b', label: "The voltage drop will stay the same since current hasn't changed", correct: false },
        { id: 'c', label: "The voltage drop will double because thicker wire carries more current", correct: false },
        { id: 'd', label: "The voltage drop will decrease by exactly 50%", correct: false },
      ],
      explanation: "Voltage drop V = I × R. For 10 AWG: R = 1.0 × (400/1000) = 0.4Ω, so V = 30 × 0.4 = 12V. For 8 AWG: R = 0.63 × (400/1000) = 0.252Ω, so V = 30 × 0.252 = 7.56V. The reduction is (12-7.56)/12 = 37%. Note: 400 feet accounts for round-trip (200ft × 2).",
    },
    {
      scenario: "A data center technician is selecting cables for a new server rack that will draw 80 amps continuously. The cable manufacturer provides ampacity ratings for different wire gauges in their catalog.",
      question: "What does the ampacity rating of a cable indicate?",
      options: [
        { id: 'a', label: "The maximum voltage the cable insulation can withstand", correct: false },
        { id: 'b', label: "The maximum continuous current the conductor can safely carry without exceeding temperature limits", correct: true },
        { id: 'c', label: "The total power in watts the cable can transmit", correct: false },
        { id: 'd', label: "The resistance of the cable per unit length", correct: false },
      ],
      explanation: "Ampacity is the maximum current a conductor can carry continuously under specified conditions without exceeding its temperature rating. When current exceeds ampacity, I²R heating causes the conductor to exceed safe temperatures, degrading insulation and creating fire hazards. Ampacity depends on conductor material, size, insulation type, ambient temperature, and installation method.",
    },
    {
      scenario: "A solar installer is running cables from rooftop panels to an inverter 150 feet away. The system operates at 48V DC and carries 40 amps. The customer complains about lower-than-expected power output.",
      question: "How does cable length affect the power delivered to the inverter?",
      options: [
        { id: 'a', label: "Cable length has no effect since the panels produce constant power", correct: false },
        { id: 'b', label: "Longer cables have proportionally higher resistance, causing greater I²R losses and voltage drop that reduces delivered power", correct: true },
        { id: 'c', label: "Longer cables only affect AC systems, not DC solar installations", correct: false },
        { id: 'd', label: "Cable length only matters if the cable is undersized for the current", correct: false },
      ],
      explanation: "Cable resistance is directly proportional to length (R = ρL/A). Doubling the length doubles the resistance, which doubles both voltage drop (V=IR) and power loss (P=I²R). In this 48V system with long runs, voltage drop can significantly reduce the voltage reaching the inverter, decreasing efficiency and potentially preventing proper operation if voltage falls below minimum thresholds.",
    },
    {
      scenario: "An industrial facility in Arizona runs cables through conduits exposed to summer heat where ambient temperature reaches 45°C (113°F). The standard ampacity tables are rated for 30°C ambient.",
      question: "How should the electrician adjust the cable sizing for this high-temperature environment?",
      options: [
        { id: 'a', label: "No adjustment needed; copper handles heat well", correct: false },
        { id: 'b', label: "Apply a derating factor to reduce allowable ampacity, or use larger gauge wire to compensate", correct: true },
        { id: 'c', label: "Simply add more insulation to protect the cables", correct: false },
        { id: 'd', label: "Switch from copper to aluminum which handles heat better", correct: false },
      ],
      explanation: "Higher ambient temperatures reduce a cable's ability to dissipate heat, requiring derating. NEC Table 310.15(B)(1) provides correction factors—at 45°C, THHN cable's ampacity must be multiplied by 0.87 (13% reduction). Additionally, conductor resistance increases with temperature (about 0.4% per °C for copper), further increasing I²R losses. Using larger wire compensates by providing lower resistance and better heat dissipation.",
    },
    {
      scenario: "An electrician is installing six current-carrying conductors in a single conduit for a commercial building. The NEC requires ampacity adjustment when more than three current-carrying conductors share a raceway.",
      question: "Why must ampacity be derated when multiple conductors share a conduit?",
      options: [
        { id: 'a', label: "Multiple wires create electromagnetic interference that reduces capacity", correct: false },
        { id: 'b', label: "The combined heat from multiple conductors reduces each wire's ability to dissipate heat, requiring lower current per conductor", correct: true },
        { id: 'c', label: "Conduit fill limits require smaller wires when adding more conductors", correct: false },
        { id: 'd', label: "Voltage drop increases proportionally with the number of conductors", correct: false },
      ],
      explanation: "When conductors are bundled together, each wire's I²R heat adds to the thermal environment, reducing the ability of each conductor to dissipate its own heat. Per NEC 310.15(C)(1), 4-6 conductors require 80% ampacity adjustment, 7-9 require 70%, and 10-20 require 50%. This ensures no conductor exceeds its temperature rating. The derating applies only to current-carrying conductors—equipment grounding conductors don't count.",
    },
    {
      scenario: "A manufacturing plant is installing a 100 HP motor (approximately 75kW) that draws 124 amps at full load. During startup, the motor briefly draws 600-700 amps for several seconds.",
      question: "How should the cable be sized to handle the motor's starting current?",
      options: [
        { id: 'a', label: "Size the cable for 700 amps to handle maximum starting current", correct: false },
        { id: 'b', label: "Size for 125% of full-load current (155A) per NEC 430.22; cables can handle brief starting surge without overheating", correct: true },
        { id: 'c', label: "Size for exactly 124 amps since that's the continuous operating current", correct: false },
        { id: 'd', label: "Use a cable rated for 300 amps as a compromise between starting and running current", correct: false },
      ],
      explanation: "Motor cables are sized based on full-load current, not starting current, because the thermal mass of conductors can absorb brief current surges without exceeding temperature limits. NEC 430.22 requires conductors rated at 125% of motor full-load current. The starting surge (typically 5-7× full load) lasts only seconds—not long enough to overheat properly sized conductors. Oversizing for starting current would be wasteful and unnecessary.",
    },
    {
      scenario: "A data center is being designed to deliver 500kW to server racks. The engineering team must choose between 208V and 480V distribution systems for the main bus.",
      question: "Why do large data centers prefer 480V distribution over 208V for main power runs?",
      options: [
        { id: 'a', label: "480V equipment is more readily available and cheaper", correct: false },
        { id: 'b', label: "Higher voltage means proportionally lower current for the same power, resulting in dramatically smaller cables and roughly 80% less I²R losses", correct: true },
        { id: 'c', label: "480V systems are safer because less current flows through the wires", correct: false },
        { id: 'd', label: "208V systems would require three-phase power which is more complex", correct: false },
      ],
      explanation: "Power = Voltage × Current, so P = 500kW at 208V requires 2,400A, while 480V requires only 1,042A. Since I²R losses scale with current squared, the 208V system has (2400/1042)² = 5.3× higher losses. At 480V: cables can be 60% smaller (less copper cost), losses are reduced by ~80%, less cooling needed, and voltage drop is proportionally lower. PDUs step down to 208V/120V only at the rack level.",
    },
    {
      scenario: "A residential solar installation includes a ground-mounted array 200 feet from the house. The system produces 10kW and the installer must choose between string inverters (600V DC from panels) or microinverters (240V AC at each panel).",
      question: "From a cable sizing perspective, what advantage does the high-voltage string inverter approach offer?",
      options: [
        { id: 'a', label: "String inverters require no DC wiring, eliminating cable loss concerns", correct: false },
        { id: 'b', label: "Higher DC voltage (600V) means 60% less current and roughly 85% lower cable losses compared to 240V AC for the same power", correct: true },
        { id: 'c', label: "Microinverters eliminate the need for proper cable sizing calculations", correct: false },
        { id: 'd', label: "String inverters use specialized low-resistance cables not available for AC systems", correct: false },
      ],
      explanation: "At 10kW: 600V DC needs ~17A, while 240V AC needs ~42A. Current ratio is 42/17 = 2.5×, so I²R losses at 240V are 2.5² = 6.25× higher (~85% more losses). For a 200ft run with significant current, this difference substantially impacts system efficiency and cable costs. String inverters place the inverter near the panels and run AC, or consolidate DC power at high voltage—either approach reduces long cable run losses.",
    },
    {
      scenario: "An electrical contractor is bidding a job to run a 120V, 20-amp circuit 150 feet to a detached garage workshop. The NEC recommends limiting voltage drop to 3% for branch circuits (3.6V at 120V).",
      question: "Which wire gauge should the contractor specify to meet the NEC voltage drop recommendation?",
      options: [
        { id: 'a', label: "12 AWG (standard 20A circuit wire) since it meets ampacity requirements", correct: false },
        { id: 'b', label: "10 AWG, because the 300-foot round trip at 20A with 12 AWG would exceed 3% voltage drop; 10 AWG reduces drop to acceptable levels", correct: true },
        { id: 'c', label: "14 AWG is sufficient for 20 amps over any distance", correct: false },
        { id: 'd', label: "8 AWG to ensure maximum performance regardless of NEC minimums", correct: false },
      ],
      explanation: "For 300ft round trip: 12 AWG (1.588Ω/1000ft) has R = 0.476Ω, giving V = 20A × 0.476Ω = 9.5V drop (7.9%—exceeds 3%). 10 AWG (0.999Ω/1000ft) has R = 0.3Ω, giving V = 20A × 0.3Ω = 6V drop (5%—still over but closer). Actually, 8 AWG (0.628Ω/1000ft) with R = 0.188Ω gives V = 3.77V (3.1%), just meeting requirements. This shows why long runs often require upsizing beyond minimum ampacity requirements.",
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center" style={{ paddingTop: '80px' }}>
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

  const renderPredict = () => {
    const predictOptions = [
      { id: 'double', label: 'Doubles (2x) - twice the current, twice the loss', icon: '2️⃣' },
      { id: 'quadruple', label: 'Quadruples (4x) - loss goes with current squared', icon: '4️⃣' },
      { id: 'same', label: 'Stays the same - cable resistance is fixed', icon: '➡️' },
    ];
    const answeredCount = prediction ? 1 : 0;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-xl">🤔</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Make Your Prediction</h2>
        </div>

        {/* Progress indicator */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-blue-600">{answeredCount}/1</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${answeredCount * 100}%` }}
            />
          </div>
        </div>

        {/* SVG Visualization for predict phase */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
          <svg viewBox="0 0 400 200" className="w-full h-48">
            <defs>
              <linearGradient id="predictCableGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f5a54a" />
                <stop offset="50%" stopColor="#b87333" />
                <stop offset="100%" stopColor="#8b4513" />
              </linearGradient>
              <linearGradient id="predictGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Background */}
            <rect width="400" height="200" fill="#0f172a" rx="8" />

            {/* Cable representation */}
            <rect x="50" y="80" width="300" height="40" rx="8" fill="url(#predictCableGrad)" />

            {/* Current flow animation */}
            <rect x="50" y="95" width="300" height="10" fill="url(#predictGlow)" opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
            </rect>

            {/* Labels */}
            <text x="200" y="40" fill="#e2e8f0" fontSize="16" textAnchor="middle" fontWeight="bold">Current Flow Through Cable</text>
            <text x="200" y="60" fill="#e2e8f0" fontSize="12" textAnchor="middle">100A → 200A</text>

            {/* Question mark */}
            <text x="200" y="160" fill="#fbbf24" fontSize="24" textAnchor="middle">What happens to power loss?</text>

            {/* Heat indicators */}
            <circle cx="120" cy="100" r="4" fill="#ef4444" opacity="0.6">
              <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="100" r="4" fill="#ef4444" opacity="0.6">
              <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx="280" cy="100" r="4" fill="#ef4444" opacity="0.6">
              <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" begin="0.6s" />
            </circle>
          </svg>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <p className="text-blue-800 leading-relaxed">
            A cable carries <strong>100 Amps</strong>. If you double the current to <strong>200 Amps</strong>,
            how does the power loss (heat) in the cable change?
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {predictOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handlePrediction(option.id)}
              disabled={showPredictionFeedback}
              style={{ WebkitTapHighlightColor: 'transparent', minHeight: '44px' }}
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
  };

  const renderPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px', gap: '16px' }}>
      <div className="flex items-center gap-3 mb-4" style={{ marginBottom: '16px', gap: '12px' }}>
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cable Loss Simulator</h2>
          <p className="text-sm text-slate-500">See how current and wire size affect losses</p>
        </div>
      </div>

      {/* Observation guidance */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4" style={{ padding: '16px', marginBottom: '16px', backgroundColor: 'rgba(239, 246, 255, 0.9)', borderRadius: '16px' }}>
        <p className="text-blue-800 text-sm leading-relaxed">
          <strong>Observe:</strong> Watch how the visualization changes as you adjust the controls. Pay attention to heat buildup and power loss values.
        </p>
      </div>

      {/* Key physics terms definition */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 mb-4" style={{ padding: '16px', marginBottom: '16px', borderRadius: '16px' }}>
        <h4 className="font-bold text-purple-800 mb-2" style={{ fontWeight: 700, fontSize: '14px' }}>Key Terms</h4>
        <ul className="text-purple-700 text-sm space-y-1" style={{ lineHeight: 1.5 }}>
          <li><strong>AWG (American Wire Gauge):</strong> Wire thickness standard - lower number means thicker wire with lower resistance</li>
          <li><strong>I squared R Loss:</strong> Power dissipated as heat in a conductor, where P equals I squared times R</li>
          <li><strong>Voltage Drop:</strong> Voltage lost along wire length due to resistance, calculated as V equals I times R</li>
          <li><strong>Resistance:</strong> Opposition to current flow, measured in Ohms, increases with wire length</li>
        </ul>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6" style={{ padding: '16px', marginBottom: '24px', borderRadius: '16px', backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
        {renderCableVisualization()}
      </div>

      <div className="space-y-4 mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div className="bg-slate-100 rounded-xl p-4" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(241, 245, 249, 0.95)' }}>
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
            style={{ touchAction: 'pan-y', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #f59e0b, #f97316)', cursor: 'pointer' }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10A</span>
            <span>200A</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(241, 245, 249, 0.95)' }}>
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
            style={{ touchAction: 'pan-y', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #f97316, #ea580c)', cursor: 'pointer' }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>AWG 0 (Thick)</span>
            <span>AWG 14 (Thin)</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(241, 245, 249, 0.95)' }}>
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
            style={{ touchAction: 'pan-y', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', cursor: 'pointer' }}
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

      {/* Real-world relevance */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6" style={{ padding: '16px', marginBottom: '24px', gap: '12px' }}>
        <h4 className="font-bold text-blue-800 mb-2">Real-World Relevance</h4>
        <p className="text-blue-700 text-sm leading-relaxed">
          Data centers spend millions on properly sized cables. A 1MW facility with poor cable sizing could waste $50,000/year in I squared R losses alone.
          Every amp of unnecessary current means exponentially more heat and wasted electricity.
        </p>
      </div>

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : `Adjust sliders ${Math.max(0, 5 - experimentCount)} more times...`)}
    </div>
  );

  const renderReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding I²R Losses</h2>
      </div>

      {/* Reference user's prediction */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6" style={{ padding: '16px', marginBottom: '24px' }}>
        <p className="text-amber-800 text-sm leading-relaxed">
          <strong>Your prediction:</strong> You predicted that doubling current would{' '}
          {prediction === 'quadruple' ? 'quadruple the power loss - and you were right!' :
           prediction === 'double' ? 'double the power loss. Actually, it quadruples because P = I squared R!' :
           'keep losses the same. Surprisingly, losses quadruple because of the I squared relationship!'}
        </p>
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

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'same', label: 'Same losses - power delivered is the same', icon: '=' },
      { id: '480better', label: '480V has MUCH lower losses (about 1/5th)', icon: '📉' },
      { id: '208better', label: '208V has lower losses - less voltage stress', icon: '📈' },
    ];
    const answeredCount = twistPrediction ? 1 : 0;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <span className="text-xl">🔄</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">The High Voltage Twist</h2>
        </div>

        {/* Progress indicator */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-amber-600">{answeredCount}/1</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${answeredCount * 100}%` }}
            />
          </div>
        </div>

        {/* SVG Visualization for twist_predict phase */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
          <svg viewBox="0 0 400 200" className="w-full h-48">
            <defs>
              <linearGradient id="twistVoltGrad208" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="twistVoltGrad480" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Background */}
            <rect width="400" height="200" fill="#0f172a" rx="8" />

            {/* 208V side */}
            <rect x="40" y="60" width="140" height="80" rx="8" fill="url(#twistVoltGrad208)" opacity="0.3" />
            <text x="110" y="90" fill="#fbbf24" fontSize="20" textAnchor="middle" fontWeight="bold">208V</text>
            <text x="110" y="115" fill="#e2e8f0" fontSize="12" textAnchor="middle">48A current</text>
            <text x="110" y="130" fill="#e2e8f0" fontSize="10" textAnchor="middle">Higher I²R loss</text>

            {/* VS */}
            <text x="200" y="105" fill="#64748b" fontSize="14" textAnchor="middle">vs</text>

            {/* 480V side */}
            <rect x="220" y="60" width="140" height="80" rx="8" fill="url(#twistVoltGrad480)" opacity="0.3" />
            <text x="290" y="90" fill="#34d399" fontSize="20" textAnchor="middle" fontWeight="bold">480V</text>
            <text x="290" y="115" fill="#e2e8f0" fontSize="12" textAnchor="middle">21A current</text>
            <text x="290" y="130" fill="#e2e8f0" fontSize="10" textAnchor="middle">Lower I²R loss</text>

            {/* Title */}
            <text x="200" y="35" fill="#e2e8f0" fontSize="14" textAnchor="middle" fontWeight="bold">Same 10kW Power - Different Voltages</text>

            {/* Question */}
            <text x="200" y="175" fill="#fbbf24" fontSize="14" textAnchor="middle">Which has lower cable losses?</text>
          </svg>
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
          {twistOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleTwistPrediction(option.id)}
              disabled={showTwistFeedback}
              style={{ WebkitTapHighlightColor: 'transparent', minHeight: '44px' }}
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
  };

  const renderTwistPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Voltage Comparison</h2>
          <p className="text-sm text-slate-500">See how distribution voltage affects losses</p>
        </div>
      </div>

      {/* Observation guidance */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
        <p className="text-blue-800 text-sm leading-relaxed">
          <strong>Observe:</strong> Compare the bar heights showing power loss at 208V vs 480V. Notice how much lower the losses are at higher voltage.
        </p>
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
          style={{ touchAction: 'pan-y', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #f59e0b, #f97316)', cursor: 'pointer' }}
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
    <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
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
      <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-xl">🌍</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Real-World Applications</h2>
            <p className="text-sm text-slate-500">Complete all 4 to unlock assessment</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-blue-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedApps.size / 4) * 100}%` }}
            />
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
                style={{ WebkitTapHighlightColor: 'transparent', minHeight: '44px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s ease', background: 'linear-gradient(to right, #f59e0b, #f97316)', boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.39)' }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Got It
              </button>
            ) : (
              <div className="w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-semibold text-center" style={{ minHeight: '44px', borderRadius: '12px', background: '#fef3c7' }}>
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
      <div className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: '80px' }}>
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
                    <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-sm font-bold ${
                      testAnswers[qIndex] !== null ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      Question {qIndex + 1} of 10
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 leading-relaxed mb-4">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          minHeight: '44px',
                          transform: testAnswers[qIndex] === oIndex ? 'scale(1.02)' : 'scale(1)',
                          borderWidth: testAnswers[qIndex] === oIndex ? '2px' : '1px',
                        }}
                        className={`w-full p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-violet-500 text-white shadow-lg border-violet-600'
                            : 'bg-slate-50 text-slate-700 hover:bg-violet-50 border-slate-200'
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
              style={{ WebkitTapHighlightColor: 'transparent', minHeight: '44px' }}
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
          <div className="py-8">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
                testScore >= 7 ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
              }`}>
                <span className="text-5xl">{testScore >= 7 ? '🔌' : '📚'}</span>
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
              <p className="text-slate-600 mb-4">
                {testScore >= 7 ? 'Excellent! You understand cable sizing and voltage drop!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {/* Answer Review Section */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
              <h4 className="font-bold text-slate-800 mb-4">Answer Review</h4>
              <div className="space-y-3">
                {TEST_QUESTIONS.map((q, qIndex) => {
                  const userAnswer = testAnswers[qIndex];
                  const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                  return (
                    <div key={qIndex} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                      }`}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-slate-700">Q{qIndex + 1}: {isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {testScore >= 7 ? (
              renderBottomBar(true, 'Complete Lesson')
            ) : (
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                style={{ WebkitTapHighlightColor: 'transparent', minHeight: '44px' }}
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
    <div className="max-w-2xl mx-auto px-6 py-8 text-center" style={{ paddingTop: '80px' }}>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col" style={{ fontWeight: 400, fontSize: '16px', lineHeight: 1.6, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', maxWidth: '100vw' }}>
      {renderProgressBar()}
      <div className="flex-1" style={{ overflowY: 'auto', paddingBottom: '80px' }}>
        {renderPhase()}
      </div>
    </div>
  );
}
