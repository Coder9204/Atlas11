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
    question: 'What does the formula P = I² × R tell us about power loss?',
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
      { text: 'Lower resistance means less I² × R losses and voltage drop', correct: true },
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
    question: 'What happens to I² × R losses when you double voltage (same power)?',
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
      { text: 'Dramatically reduces current and I² × R losses over long distances', correct: true },
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
    stats: [
      { value: '$50K/year', label: 'Potential waste at poor efficiency' },
      { value: '480V', label: 'Distribution voltage' },
      { value: '1MW+', label: 'Facility power capacity' },
    ],
  },
  {
    title: 'Electric Vehicle Charging',
    icon: '🚗',
    description: 'Level 3 DC fast chargers from companies like Tesla (Supercharger network), Electrify America, ChargePoint, and EVgo use high voltage (400-800V) to reduce cable sizes while delivering 350kW. ABB and Tritium manufacture the charging equipment. Porsche and Audi vehicles use 800V architecture specifically to enable faster charging with thinner cables. Otherwise cables would need to be impossibly thick and heavy for practical vehicle charging.',
    stats: [
      { value: '350kW', label: 'Max charging power' },
      { value: '800V', label: 'Max system voltage' },
      { value: '15min', label: 'Fast charge time' },
    ],
  },
  {
    title: 'Power Grid Transmission',
    icon: '⚡',
    description: 'Power lines operated by utilities like Pacific Gas and Electric (PG&E), Duke Energy, and American Electric Power run at 230-765kV because at 120V, transmitting 1GW would require cables over 10 feet in diameter! Siemens Energy, GE Vernova, and Hitachi build the transformers and switching equipment. High voltage transmission lines from companies like NextEra Energy connect renewable power across entire regions efficiently.',
    stats: [
      { value: '765kV', label: 'Max AC transmission voltage' },
      { value: '3-5%', label: 'Typical transmission losses' },
      { value: '1GW+', label: 'Power capacity per line' },
    ],
  },
  {
    title: 'Solar Farm Interconnection',
    icon: '☀️',
    description: 'Large solar farms operated by First Solar, SunPower, and NextEra Energy use central inverters from SMA Solar Technology, SolarEdge, and Enphase to boost voltage before transmission. Tesla Megapack battery installations also use high voltage DC to minimize losses. A 100MW farm might lose 5-10% of generated power in cables alone if operating at low voltage, which is why utility-scale solar always uses medium voltage collection systems.',
    stats: [
      { value: '100MW+', label: 'Farm capacity' },
      { value: '5-10%', label: 'Cable loss at low voltage' },
      { value: '34.5kV', label: 'Collection voltage' },
    ],
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
  const [loadPower, setLoadPower] = useState(10000); // Watts
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  const lastClickRef = useRef(0);

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
  }, []);

  // Calculate power loss
  const calculatePowerLoss = useCallback((current: number, resistance: number): number => {
    return current * current * resistance; // I² × R
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
  const twistResistance = calculateResistance(wireGauge, cableLength);
  const lossAt208V = calculatePowerLoss(currentAt208V, twistResistance);
  const lossAt480V = calculatePowerLoss(currentAt480V, twistResistance);

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

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR (no SVG - uses unicode arrows)
  // ──────────────────────────────────────────────────────────────────────────

  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    const progressPercent = ((currentIdx + 1) / PHASES.length) * 100;
    return (
      <nav
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid #334155' }}
        role="navigation"
        aria-label="Phase navigation"
      >
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${currentIdx + 1} of ${PHASES.length} phases`}
          style={{ height: '4px', backgroundColor: '#334155', width: '100%' }}
        >
          <div
            style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(to right, #f59e0b, #f97316)', transition: 'width 0.3s ease' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
          <button
            onClick={goBack}
            disabled={currentIdx === 0}
            aria-label="Go to previous phase"
            style={{ minHeight: '44px', minWidth: '44px', borderRadius: '8px', border: 'none', background: 'transparent', color: currentIdx === 0 ? '#475569' : '#cbd5e1', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', fontSize: '18px', transition: 'all 0.3s ease', opacity: currentIdx === 0 ? 0.3 : 1 }}
          >
            &#x2190;
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }} role="tablist" aria-label="Phase dots">
              {PHASES.map((p, i) => (
                <button
                  key={p}
                  onClick={() => goToPhase(p)}
                  role="tab"
                  aria-selected={i === currentIdx}
                  aria-label={`${PHASE_LABELS[p]}${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`}
                  style={{ minHeight: '44px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: 'none', background: 'transparent', padding: 0, borderRadius: '9999px' }}
                >
                  <span style={{
                    display: 'block',
                    height: '8px',
                    borderRadius: '9999px',
                    transition: 'all 0.3s ease',
                    width: i === currentIdx ? '24px' : '8px',
                    background: i === currentIdx ? '#f59e0b' : i < currentIdx ? '#10b981' : '#475569',
                  }} />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(148, 163, 184, 0.7)', marginLeft: '8px' }}>
              {currentIdx + 1}/{PHASES.length}
            </span>
          </div>

          <div style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '12px', fontWeight: 600 }}>
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
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid #334155', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{ minHeight: '44px', borderRadius: '12px', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', background: '#334155', color: currentIdx === 0 ? '#475569' : '#cbd5e1', border: 'none', padding: '10px 20px', fontWeight: 500, opacity: currentIdx === 0 ? 0.3 : 1 }}
        >
          Back
        </button>

        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(148, 163, 184, 0.7)' }}>
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{ minHeight: '44px', borderRadius: '12px', cursor: canGoNext ? 'pointer' : 'not-allowed', transition: 'all 0.3s ease', background: canGoNext ? 'linear-gradient(to right, #f59e0b, #f97316)' : '#334155', boxShadow: canGoNext ? '0 4px 14px 0 rgba(245, 158, 11, 0.39)' : 'none', color: canGoNext ? '#ffffff' : '#475569', border: 'none', padding: '10px 24px', fontWeight: 600 }}
        >
          {nextLabel} {canGoNext && '\u2192'}
        </button>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PLAY PHASE SVG: Power Loss vs Current Chart
  // ──────────────────────────────────────────────────────────────────────────

  const renderPlaySVG = () => {
    // Chart dimensions
    const W = 500, H = 340;
    const padL = 60, padR = 30, padT = 40, padB = 50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // Generate power loss curve: P = I² × R for current range 10-200A
    const minI = 10, maxI = 200;
    const numPoints = 20;
    const curvePoints: { x: number; y: number; current: number; loss: number }[] = [];
    let maxLoss = 0;
    for (let i = 0; i < numPoints; i++) {
      const current = minI + (maxI - minI) * (i / (numPoints - 1));
      const loss = current * current * resistance;
      if (loss > maxLoss) maxLoss = loss;
      curvePoints.push({ x: 0, y: 0, current, loss });
    }
    maxLoss = Math.max(maxLoss, 100); // minimum scale

    // Map to SVG coordinates
    curvePoints.forEach(p => {
      p.x = padL + ((p.current - minI) / (maxI - minI)) * chartW;
      p.y = padT + chartH - (p.loss / maxLoss) * chartH;
    });

    // Build path string with L (space-separated coordinates)
    const pathD = curvePoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    // Current interactive point position
    const currentLoss = loadCurrent * loadCurrent * resistance;
    const markerX = padL + ((loadCurrent - minI) / (maxI - minI)) * chartW;
    const markerY = padT + chartH - (currentLoss / maxLoss) * chartH;

    // Reference baseline point at 50A
    const refCurrent = 50;
    const refLoss = refCurrent * refCurrent * resistance;
    const refX = padL + ((refCurrent - minI) / (maxI - minI)) * chartW;
    const refY = padT + chartH - (refLoss / maxLoss) * chartH;

    // Status color
    const statusColor = voltageDropPercent > 5 ? '#ef4444' : voltageDropPercent > 3 ? '#f59e0b' : '#22c55e';

    // Grid line Y values (5 lines)
    const gridYs = [0, 0.25, 0.5, 0.75, 1.0];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="cableCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="cableAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="cableBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="cableMarkerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={statusColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#cableBgGrad)" rx="12" />

        {/* Chart area */}
        <g aria-label="Chart area">
          <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(30, 41, 59, 0.5)" rx="4" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Grid lines */}
        <g aria-label="Grid lines">
          {gridYs.map((frac, i) => {
            const gy = padT + chartH * (1 - frac);
            const label = (maxLoss * frac).toFixed(0);
            return (
              <g key={`grid-${i}`}>
                <line x1={padL} y1={gy} x2={padL + chartW} y2={gy} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                <text x={padL - 8} y={gy + 4} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="end">{label}W</text>
              </g>
            );
          })}
          {/* X-axis tick labels */}
          {[10, 50, 100, 150, 200].map(c => {
            const tx = padL + ((c - minI) / (maxI - minI)) * chartW;
            return (
              <text key={`xt-${c}`} x={tx} y={padT + chartH + 18} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">{c}A</text>
            );
          })}
        </g>

        {/* Area fill under curve */}
        <g aria-label="Power loss area">
          <path
            d={`${pathD} L ${curvePoints[curvePoints.length - 1].x.toFixed(1)} ${padT + chartH} L ${curvePoints[0].x.toFixed(1)} ${padT + chartH} Z`}
            fill="url(#cableAreaGrad)"
          />
        </g>

        {/* Main power loss curve */}
        <g aria-label="Power loss curve">
          <path d={pathD} fill="none" stroke="url(#cableCurveGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Reference point at 50A */}
        <g aria-label="Reference baseline">
          <circle cx={refX} cy={refY} r="5" fill="#94a3b8" opacity="0.6" />
          <text x={refX + 8} y={refY - 10} fill="#94a3b8" fontSize="11" opacity="0.7">ref 50A</text>
        </g>

        {/* Interactive marker - current value */}
        <g aria-label="Current value marker">
          <circle cx={markerX} cy={markerY} r="16" fill="url(#cableMarkerGlow)" />
          <circle cx={markerX} cy={markerY} r={8} fill={statusColor} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
          <text x={markerX} y={markerY - 16} fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">
            {currentLoss.toFixed(0)}W
          </text>
        </g>

        {/* Voltage drop warning zone */}
        {voltageDropPercent > 3 && (
          <g aria-label="Warning zone">
            <rect x={padL + chartW - 60} y={padT + 4} width={56} height={20} rx="4" fill={voltageDropPercent > 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'} />
            <text x={padL + chartW - 32} y={padT + 18} fill={statusColor} fontSize="11" fontWeight="bold" textAnchor="middle">
              {voltageDropPercent.toFixed(1)}% drop
            </text>
          </g>
        )}

        {/* Title */}
        <text x={W / 2} y={24} fill="#f8fafc" fontSize="15" fontWeight="bold" textAnchor="middle">
          Power Loss vs Current (AWG {wireGauge}, {cableLength}m)
        </text>

        {/* Y-axis label - positioned at top to avoid overlap with grid labels */}
        <text x={padL - 4} y={padT - 16} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="end">
          Power Loss (W)
        </text>

        {/* X-axis label */}
        <text x={padL + chartW / 2} y={H - 4} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">
          Current (A)
        </text>

        {/* Formula */}
        <text x={padL + 8} y={padT + 18} fill="#fbbf24" fontSize="11" fontWeight="bold">
          P = I² × R = {currentLoss.toFixed(0)}W
        </text>

        {/* Cable info - positioned in upper right to avoid overlap with axis labels */}
        <g aria-label="Cable specifications">
          <text x={padL + chartW - 4} y={padT + 34} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="end">
            R = {resistance.toFixed(4)}Ω
          </text>
        </g>
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TWIST PLAY SVG: 208V vs 480V Comparison
  // ──────────────────────────────────────────────────────────────────────────

  const renderTwistPlaySVG = () => {
    const W = 500, H = 340;
    const padL = 60, padR = 30, padT = 40, padB = 50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // Generate curves for both voltages across power range
    const minP = 1000, maxP = 50000;
    const numPoints = 20;
    const points208: { x: number; y: number; power: number; loss: number }[] = [];
    const points480: { x: number; y: number; power: number; loss: number }[] = [];
    let maxLoss208 = 0;
    let maxLoss480 = 0;

    for (let i = 0; i < numPoints; i++) {
      const pwr = minP + (maxP - minP) * (i / (numPoints - 1));
      const i208 = pwr / 208;
      const i480 = pwr / 480;
      const loss208 = i208 * i208 * twistResistance;
      const loss480 = i480 * i480 * twistResistance;
      if (loss208 > maxLoss208) maxLoss208 = loss208;
      if (loss480 > maxLoss480) maxLoss480 = loss480;
      points208.push({ x: 0, y: 0, power: pwr, loss: loss208 });
      points480.push({ x: 0, y: 0, power: pwr, loss: loss480 });
    }
    maxLoss208 = Math.max(maxLoss208, 100);
    maxLoss480 = Math.max(maxLoss480, 100);

    // Use shared max for both curves so scale is consistent
    const maxLossVal = maxLoss208;

    // Map 208V points using shared scale
    points208.forEach(p => {
      p.x = padL + ((p.power - minP) / (maxP - minP)) * chartW;
      p.y = padT + chartH - (p.loss / maxLossVal) * chartH;
    });

    // Map 480V points using its own scale so curve uses full vertical space
    points480.forEach(p => {
      p.x = padL + ((p.power - minP) / (maxP - minP)) * chartW;
      p.y = padT + chartH - (p.loss / maxLoss480) * chartH;
    });

    const path208 = points208.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const path480 = points480.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Interactive marker positions
    const marker208x = padL + ((loadPower - minP) / (maxP - minP)) * chartW;
    const loss208Val = (loadPower / 208) ** 2 * twistResistance;
    const marker208y = padT + chartH - (loss208Val / maxLossVal) * chartH;
    const marker208 = { x: marker208x, y: marker208y };

    const marker480x = padL + ((loadPower - minP) / (maxP - minP)) * chartW;
    const loss480Val = (loadPower / 480) ** 2 * twistResistance;
    const marker480y = padT + chartH - (loss480Val / maxLoss480) * chartH;
    const marker480 = { x: marker480x, y: marker480y };

    const gridYs = [0, 0.25, 0.5, 0.75, 1.0];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="twistBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="twist208Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="twist480Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#twistBgGrad)" rx="12" />

        {/* Chart area */}
        <g aria-label="Chart area">
          <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(30, 41, 59, 0.5)" rx="4" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Grid lines */}
        <g aria-label="Grid lines">
          {gridYs.map((frac, i) => {
            const gy = padT + chartH * (1 - frac);
            const label = (maxLossVal * frac).toFixed(0);
            return (
              <g key={`tg-${i}`}>
                <line x1={padL} y1={gy} x2={padL + chartW} y2={gy} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                <text x={padL - 8} y={gy + 4} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="end">{label}W</text>
              </g>
            );
          })}
        </g>

        {/* 208V curve */}
        <g aria-label="208V power loss curve">
          <path d={path208} fill="none" stroke="url(#twist208Grad)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* 480V curve */}
        <g aria-label="480V power loss curve">
          <path d={path480} fill="none" stroke="url(#twist480Grad)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* 208V marker */}
        <g aria-label="208V marker">
          <circle cx={marker208.x} cy={marker208.y} r={8} fill="#f59e0b" filter="url(#twistGlow)" stroke="#fff" strokeWidth={2} />
          <text x={marker208.x + 12} y={marker208.y - 8} fill="#fbbf24" fontSize="11" fontWeight="bold">208V: {lossAt208V.toFixed(0)}W</text>
        </g>

        {/* 480V marker */}
        <g aria-label="480V marker">
          <circle cx={marker480.x} cy={marker480.y} r={8} fill="#10b981" filter="url(#twistGlow)" stroke="#fff" strokeWidth={2} />
          <text x={marker480.x + 12} y={marker480.y + 18} fill="#22c55e" fontSize="11" fontWeight="bold">480V: {lossAt480V.toFixed(0)}W</text>
        </g>

        {/* Title */}
        <text x={W / 2} y={24} fill="#f8fafc" fontSize="15" fontWeight="bold" textAnchor="middle">
          Cable Losses: 208V vs 480V Distribution
        </text>

        {/* Y-axis label - positioned at top to avoid overlap with grid labels */}
        <text x={padL - 4} y={padT - 8} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="end">
          Power Loss (W)
        </text>

        {/* X-axis label */}
        <text x={padL + chartW / 2} y={H - 4} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">
          Load Power (W)
        </text>

        {/* Legend */}
        <g aria-label="Legend" transform={`translate(${padL + 10}, ${padT + 12})`}>
          <rect x="0" y="0" width="12" height="3" rx="1" fill="#f59e0b" />
          <text x="16" y="5" fill="#fbbf24" fontSize="11">208V: max {maxLoss208.toFixed(0)}W</text>
          <rect x="0" y="16" width="12" height="3" rx="1" fill="#10b981" />
          <text x="16" y="27" fill="#22c55e" fontSize="11">480V: max {maxLoss480.toFixed(0)}W</text>
        </g>

        {/* Savings text */}
        {lossAt208V > lossAt480V && (
          <text x={W / 2} y={H - 28} fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">
            480V saves {((1 - lossAt480V / lossAt208V) * 100).toFixed(0)}% in cable losses
          </text>
        )}
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PREDICT PHASE SVG
  // ──────────────────────────────────────────────────────────────────────────

  const renderPredictSVG = () => {
    const W = 500, H = 280;
    // Show conceptual I² × R curve
    const padL = 60, padR = 30, padT = 50, padB = 50;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    // Curve: P = I² (normalized)
    const pts: string[] = [];
    for (let i = 0; i <= 15; i++) {
      const frac = i / 15;
      const x = padL + frac * cW;
      const y = padT + cH - frac * frac * cH;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Marker at 100A (frac=0.5) and question at 200A (frac=1.0)
    const mark100x = padL + 0.5 * cW;
    const mark100y = padT + cH - 0.25 * cH;
    const mark200x = padL + 1.0 * cW;
    const mark200y = padT + cH - 1.0 * cH;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="predBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="predCurve" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="predGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#predBg)" rx="12" />

        {/* Chart area */}
        <g aria-label="Chart area">
          <rect x={padL} y={padT} width={cW} height={cH} fill="rgba(30, 41, 59, 0.5)" rx="4" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Grid lines */}
        <g aria-label="Grid">
          {[0, 0.25, 0.5, 0.75, 1.0].map((f, i) => {
            const gy = padT + cH * (1 - f);
            return (
              <line key={`pg-${i}`} x1={padL} y1={gy} x2={padL + cW} y2={gy} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            );
          })}
        </g>

        {/* Curve */}
        <g aria-label="Power loss curve">
          <path d={pts.join(' ')} fill="none" stroke="url(#predCurve)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* 100A point */}
        <g aria-label="100A marker">
          <circle cx={mark100x} cy={mark100y} r="6" fill="#f59e0b" filter="url(#predGlow)" stroke="#fff" strokeWidth="2" />
          <text x={mark100x} y={mark100y - 12} fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">100A: P</text>
        </g>

        {/* 200A question mark */}
        <g aria-label="200A question">
          <circle cx={mark200x} cy={mark200y} r="8" fill="#ef4444" filter="url(#predGlow)" stroke="#fff" strokeWidth="2" />
          <text x={mark200x} y={mark200y - 14} fill="#fbbf24" fontSize="16" fontWeight="bold" textAnchor="middle">?</text>
          <text x={mark200x - 20} y={mark200y + 24} fill="#e2e8f0" fontSize="11" textAnchor="middle">200A: ??</text>
        </g>

        {/* Title */}
        <text x={W / 2} y={30} fill="#f8fafc" fontSize="15" fontWeight="bold" textAnchor="middle">
          Power Loss vs Current: P = I² × R
        </text>

        {/* Y-axis */}
        <text x="16" y={padT + cH / 2} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle" transform={`rotate(-90, 16, ${padT + cH / 2})`}>
          Power Loss
        </text>

        {/* X-axis */}
        <text x={padL + cW / 2} y={H - 12} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">
          Current (A)
        </text>

        {/* Annotation */}
        <text x={padL + 8} y={padT + cH - 8} fill="rgba(148, 163, 184, 0.7)" fontSize="11">0A</text>
        <text x={padL + cW / 2} y={padT + cH + 20} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">100A</text>
        <text x={padL + cW - 4} y={padT + cH + 20} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="end">200A</text>
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '80px 24px 48px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', backgroundColor: '#fbbf24', borderRadius: '50%' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#fbbf24', letterSpacing: '0.05em' }}>DATA CENTER PHYSICS</span>
      </div>

      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3)' }}>
        <span style={{ fontSize: '36px' }}>🔌</span>
      </div>

      <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', color: '#f8fafc' }}>
        Cable Sizing &amp; Voltage Drop
      </h1>

      <p style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 0.7)', maxWidth: '400px', marginBottom: '40px' }}>
        Why do data centers use thick copper bus bars? Discover the hidden physics of power distribution.
      </p>

      <div style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '560px', width: '100%', border: '1px solid rgba(51, 65, 85, 0.5)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', textAlign: 'left' }}>
          <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
          </div>
          <div>
            <h3 style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px', fontSize: '16px' }}>The Hidden Cost</h3>
            <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '14px', lineHeight: 1.6 }}>
              Every cable has resistance. When current flows, power is lost as heat (P = I² × R).
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
      { id: 'double', label: 'Doubles (2x) - twice the current, twice the loss', icon: '2' },
      { id: 'quadruple', label: 'Quadruples (4x) - loss goes with current squared', icon: '4' },
      { id: 'same', label: 'Stays the same - cable resistance is fixed', icon: '=' },
    ];

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px' }}>🤔</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Make Your Prediction</h2>
        </div>

        {/* SVG Visualization for predict phase */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
          {renderPredictSVG()}
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: '#93c5fd', lineHeight: 1.6 }}>
            A cable carries <strong>100 Amps</strong>. If you double the current to <strong>200 Amps</strong>,
            how does the power loss (heat) in the cable change?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {predictOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handlePrediction(option.id)}
              disabled={showPredictionFeedback}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px',
                border: prediction === option.id ? (option.id === 'quadruple' ? '2px solid #22c55e' : '2px solid #ef4444') : '2px solid #334155',
                backgroundColor: prediction === option.id ? (option.id === 'quadruple' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(30, 41, 59, 0.5)',
                cursor: showPredictionFeedback ? 'default' : 'pointer', transition: 'all 0.3s ease', minHeight: '44px', color: '#e2e8f0', fontSize: '14px', fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '20px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fbbf24', fontWeight: 700 }}>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {showPredictionFeedback && (
          <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', backgroundColor: prediction === 'quadruple' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: `1px solid ${prediction === 'quadruple' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}` }}>
            <p style={{ color: prediction === 'quadruple' ? '#86efac' : '#fde68a', lineHeight: 1.6, fontSize: '14px' }}>
              {prediction === 'quadruple' ? (
                <><strong>Exactly right!</strong> P = I² × R means power loss scales with the square of current. Double the current = 4x the loss. Triple current = 9x loss! This is why cable sizing matters so much.</>
              ) : (
                <><strong>The math is surprising:</strong> P = I² × R! Power loss scales with current squared. Doubling current causes 4x the loss, not 2x. This quadratic relationship is why proper cable sizing is critical.</>
              )}
            </p>
          </div>
        )}
        {renderBottomBar(showPredictionFeedback, 'Explore I² × R Losses')}
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px' }}>🔬</span>
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Cable Loss Simulator</h2>
          <p style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>See how current and wire size affect losses</p>
        </div>
      </div>

      {/* Observation guidance */}
      <div style={{ padding: '16px', marginBottom: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px' }}>
        <p style={{ color: '#93c5fd', fontSize: '14px', lineHeight: 1.6 }}>
          <strong>Observe:</strong> Watch how the chart changes as you adjust the controls. The power loss formula P = I² × R means doubling current quadruples losses.
        </p>
      </div>

      {/* Key physics terms definition */}
      <div style={{ padding: '16px', marginBottom: '16px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px' }}>
        <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#c4b5fd', marginBottom: '8px' }}>Key Terms</h4>
        <ul style={{ lineHeight: 1.6, color: 'rgba(148, 163, 184, 0.7)', fontSize: '13px', margin: 0, paddingLeft: '16px' }}>
          <li><strong style={{ color: '#e2e8f0' }}>AWG (American Wire Gauge):</strong> Wire thickness standard - lower number means thicker wire with lower resistance</li>
          <li><strong style={{ color: '#e2e8f0' }}>I² × R Loss:</strong> Power dissipated as heat in a conductor, where P = I² × R</li>
          <li><strong style={{ color: '#e2e8f0' }}>Voltage Drop:</strong> Voltage lost along wire length, V = I × R</li>
        </ul>
      </div>

      {/* Main SVG Visualization */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        {renderPlaySVG()}
      </div>

      {/* Stats panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', border: '1px solid #334155' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cable</div>
          <div style={{ fontSize: '16px', color: '#b87333', fontWeight: 700 }}>AWG {wireGauge}</div>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)' }}>{cableLength}m</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current</div>
          <div style={{ fontSize: '16px', color: '#fbbf24', fontWeight: 700 }}>{loadCurrent}A</div>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)' }}>{resistance.toFixed(3)}Ω</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Power Loss</div>
          <div style={{ fontSize: '16px', color: powerLoss > 200 ? '#ef4444' : powerLoss > 100 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{powerLoss.toFixed(0)}W</div>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)' }}>I² × R loss</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>V Drop</div>
          <div style={{ fontSize: '16px', color: voltageDropPercent > 5 ? '#ef4444' : voltageDropPercent > 3 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{voltageDropPercent.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)' }}>{voltageDrop.toFixed(1)}V</div>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155' }}>
          <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
            Load Current: {loadCurrent} Amps
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={loadCurrent}
            onChange={(e) => handleSliderChange(setLoadCurrent, parseInt(e.target.value))}
            onInput={(e) => handleSliderChange(setLoadCurrent, parseInt((e.target as HTMLInputElement).value))}
            style={sliderStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
            <span>10A</span>
            <span>200A</span>
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155' }}>
          <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
            Wire Gauge: AWG {wireGauge} ({wireGauge <= 2 ? 'thick' : wireGauge <= 6 ? 'medium' : 'thin'})
          </label>
          <input
            type="range"
            min="0"
            max="14"
            step="2"
            value={wireGauge}
            onChange={(e) => handleSliderChange(setWireGauge, parseInt(e.target.value))}
            onInput={(e) => handleSliderChange(setWireGauge, parseInt((e.target as HTMLInputElement).value))}
            style={sliderStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
            <span>AWG 0 (Thick)</span>
            <span>AWG 14 (Thin)</span>
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155' }}>
          <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
            Cable Length: {cableLength} meters
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={cableLength}
            onChange={(e) => handleSliderChange(setCableLength, parseInt(e.target.value))}
            onInput={(e) => handleSliderChange(setCableLength, parseInt((e.target as HTMLInputElement).value))}
            style={sliderStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
            <span>10m</span>
            <span>200m</span>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div style={{ padding: '16px', marginBottom: '24px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px' }}>
        <p style={{ color: '#fde68a', fontSize: '14px', lineHeight: 1.6 }}>
          <strong>Notice:</strong> Doubling current causes 4x the power loss! Try increasing current from 50A to 100A and watch the losses jump.
        </p>
      </div>

      {/* Real-world relevance */}
      <div style={{ padding: '16px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px' }}>
        <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#93c5fd', marginBottom: '8px' }}>Real-World Relevance</h4>
        <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '14px', lineHeight: 1.6 }}>
          Data centers spend millions on properly sized cables. A 1MW facility with poor cable sizing could waste $50,000/year in I² × R losses alone.
          Every amp of unnecessary current means exponentially more heat and wasted electricity.
        </p>
      </div>

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : `Adjust sliders ${Math.max(0, 5 - experimentCount)} more times...`)}
    </div>
  );

  const renderReview = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px' }}>📖</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Understanding I² × R Losses</h2>
      </div>

      {/* Reference user's prediction */}
      <div style={{ padding: '16px', marginBottom: '24px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px' }}>
        <p style={{ color: '#fde68a', fontSize: '14px', lineHeight: 1.6 }}>
          <strong>Your prediction:</strong> You predicted that doubling current would{' '}
          {prediction === 'quadruple' ? 'quadruple the power loss - and you were right!' :
           prediction === 'double' ? 'double the power loss. Actually, it quadruples because P = I² × R!' :
           'keep losses the same. Surprisingly, losses quadruple because of the I² relationship!'}
        </p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center', color: '#f8fafc' }}>
        <p style={{ color: '#c7d2fe', fontSize: '14px', marginBottom: '8px' }}>Power Loss Formula</p>
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>P = I² × R</div>
        <p style={{ color: '#c7d2fe', fontSize: '14px' }}>
          Power (Watts) = Current² (Amps) × Resistance (Ohms)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {[
          { icon: '📐', title: 'Quadratic Relationship', desc: 'Power loss scales with current SQUARED. 2x current = 4x loss. 3x current = 9x loss. This makes high current extremely expensive.' },
          { icon: '🔌', title: 'Wire Gauge Matters', desc: 'Thicker wire (lower AWG) has lower resistance. AWG 0 has 1/10th the resistance of AWG 10. But thicker wire costs more and is harder to install.' },
          { icon: '📏', title: 'Length Adds Up', desc: 'Longer cables = more resistance. Remember: current flows there AND back, so a 50m run is actually 100m of conductor.' },
        ].map((item, i) => (
          <div key={i} style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{item.icon}</span>
              <div>
                <h3 style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px', fontSize: '15px' }}>{item.title}</h3>
                <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '14px', lineHeight: 1.6 }}>{item.desc}</p>
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
      { id: '480better', label: '480V has MUCH lower losses (about 1/5th)', icon: '↓' },
      { id: '208better', label: '208V has lower losses - less voltage stress', icon: '↑' },
    ];

    // Twist predict SVG - conceptual comparison bar chart
    const renderTwistPredictSVG = () => {
      const W = 500, H = 300;
      const padL = 60, padR = 30, padT = 50, padB = 60;
      const cW = W - padL - padR;
      const cH = H - padT - padB;

      // Show conceptual bar comparison: 208V vs 480V current and losses
      // At 10kW: I_208 = 48.1A, I_480 = 20.8A
      // Losses proportional to I²: 48.1² = 2314, 20.8² = 433 (ratio ~5.3:1)
      const barW = cW * 0.25;
      const gap = cW * 0.15;

      // Current bars (normalized to 208V)
      const cur208Frac = 1.0;
      const cur480Frac = 20.8 / 48.1;

      // Loss bars (normalized to 208V)
      const loss208Frac = 1.0;
      const loss480Frac = (20.8 * 20.8) / (48.1 * 48.1);

      const bar1x = padL + gap;
      const bar2x = padL + gap + barW + gap;
      const bar3x = padL + gap + 2 * (barW + gap);

      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          <defs>
            <linearGradient id="tpBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="tp208" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="tp480" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="tpGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={W} height={H} fill="url(#tpBg)" rx="12" />

          {/* Title */}
          <text x={W / 2} y={30} fill="#f8fafc" fontSize="15" fontWeight="bold" textAnchor="middle">
            Same 10kW Load: 208V vs 480V
          </text>

          {/* Chart area */}
          <rect x={padL} y={padT} width={cW} height={cH} fill="rgba(30, 41, 59, 0.5)" rx="4" stroke="#334155" strokeWidth="1" />

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((f, i) => {
            const gy = padT + cH * (1 - f);
            return (
              <line key={`tpg-${i}`} x1={padL} y1={gy} x2={padL + cW} y2={gy} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            );
          })}

          {/* 208V current bar */}
          <rect x={bar1x} y={padT + cH * (1 - cur208Frac)} width={barW / 2 - 4} height={cH * cur208Frac} fill="url(#tp208)" rx="4" opacity="0.8" />
          <text x={bar1x + barW / 4 - 2} y={padT + cH * (1 - cur208Frac) - 6} fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">48A</text>

          {/* 480V current bar */}
          <rect x={bar1x + barW / 2 + 4} y={padT + cH * (1 - cur480Frac)} width={barW / 2 - 4} height={cH * cur480Frac} fill="url(#tp480)" rx="4" opacity="0.8" />
          <text x={bar1x + barW * 3 / 4 + 2} y={padT + cH * (1 - cur480Frac) - 6} fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">21A</text>

          {/* Current label */}
          <text x={bar1x + barW / 2} y={padT + cH + 20} fill="rgba(148, 163, 184, 0.7)" fontSize="12" textAnchor="middle">Current</text>

          {/* 208V loss bar */}
          <rect x={bar2x} y={padT + cH * (1 - loss208Frac)} width={barW / 2 - 4} height={cH * loss208Frac} fill="url(#tp208)" rx="4" opacity="0.8" />
          <text x={bar2x + barW / 4 - 2} y={padT + cH * (1 - loss208Frac) - 6} fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">5.3x</text>

          {/* 480V loss bar */}
          <rect x={bar2x + barW / 2 + 4} y={padT + cH * (1 - loss480Frac)} width={barW / 2 - 4} height={cH * loss480Frac} fill="url(#tp480)" rx="4" opacity="0.8" />
          <text x={bar2x + barW * 3 / 4 + 2} y={padT + cH * (1 - loss480Frac) - 6} fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">1x</text>

          {/* Loss label */}
          <text x={bar2x + barW / 2} y={padT + cH + 20} fill="rgba(148, 163, 184, 0.7)" fontSize="12" textAnchor="middle">I² Losses</text>

          {/* Question mark area */}
          <text x={bar3x + barW / 2} y={padT + cH / 2} fill="#fbbf24" fontSize="32" fontWeight="bold" textAnchor="middle" filter="url(#tpGlow)">?</text>
          <text x={bar3x + barW / 2} y={padT + cH + 20} fill="rgba(148, 163, 184, 0.7)" fontSize="12" textAnchor="middle">Your prediction</text>

          {/* Y-axis label */}
          <text x="16" y={padT + cH / 2} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle" transform={`rotate(-90, 16, ${padT + cH / 2})`}>
            Relative Scale
          </text>

          {/* Legend */}
          <rect x={padL + 4} y={padT + 6} width="12" height="3" rx="1" fill="#f59e0b" />
          <text x={padL + 20} y={padT + 11} fill="#fbbf24" fontSize="11">208V</text>
          <rect x={padL + 60} y={padT + 6} width="12" height="3" rx="1" fill="#10b981" />
          <text x={padL + 76} y={padT + 11} fill="#22c55e" fontSize="11">480V</text>
        </svg>
      );
    };

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px' }}>🔄</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>The High Voltage Twist</h2>
        </div>

        {/* SVG Visualization */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
          {renderTwistPredictSVG()}
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 88, 12, 0.1))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: '#fde68a', lineHeight: 1.6, fontSize: '14px' }}>
            A data center needs to deliver <strong>10kW</strong> to a server rack.
            They can use either <strong>208V</strong> or <strong>480V</strong> distribution.
            How do the cable losses compare?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {twistOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleTwistPrediction(option.id)}
              disabled={showTwistFeedback}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px',
                border: twistPrediction === option.id ? (option.id === '480better' ? '2px solid #22c55e' : '2px solid #f59e0b') : '2px solid #334155',
                backgroundColor: twistPrediction === option.id ? (option.id === '480better' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)') : 'rgba(30, 41, 59, 0.5)',
                cursor: showTwistFeedback ? 'default' : 'pointer', transition: 'all 0.3s ease', minHeight: '44px', color: '#e2e8f0', fontSize: '14px', fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '20px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fbbf24', fontWeight: 700 }}>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {showTwistFeedback && (
          <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', backgroundColor: twistPrediction === '480better' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: `1px solid ${twistPrediction === '480better' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}` }}>
            <p style={{ color: twistPrediction === '480better' ? '#86efac' : '#fde68a', lineHeight: 1.6, fontSize: '14px' }}>
              {twistPrediction === '480better' ? (
                <><strong>Excellent!</strong> P=IV means higher V = lower I for same power. Since losses are I² × R, halving current cuts losses to 1/4! 480V vs 208V: (208/480)² = 0.19 or about 1/5 the losses!</>
              ) : (
                <><strong>The math is powerful:</strong> Higher voltage means lower current for the same power (P=IV). Since losses are I² × R, halving current reduces losses to 1/4. This is why data centers prefer higher distribution voltages!</>
              )}
            </p>
          </div>
        )}
        {renderBottomBar(showTwistFeedback, 'Compare Voltages')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(234, 88, 12, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Voltage Comparison</h2>
          <p style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>See how distribution voltage affects losses</p>
        </div>
      </div>

      {/* Observation guidance */}
      <div style={{ padding: '16px', marginBottom: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px' }}>
        <p style={{ color: '#93c5fd', fontSize: '14px', lineHeight: 1.6 }}>
          <strong>Observe:</strong> Compare the two curves showing power loss at 208V vs 480V. Notice how much lower the green curve (480V) is.
        </p>
      </div>

      {/* Main SVG Visualization */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        {renderTwistPlaySVG()}
      </div>

      {/* Slider */}
      <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', marginBottom: '24px' }}>
        <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
          Load Power: {(loadPower / 1000).toFixed(0)} kW
        </label>
        <input
          type="range"
          min="1000"
          max="50000"
          step="1000"
          value={loadPower}
          onChange={(e) => { setLoadPower(parseInt(e.target.value)); setHasExploredTwist(true); }}
          onInput={(e) => { setLoadPower(parseInt((e.target as HTMLInputElement).value)); setHasExploredTwist(true); }}
          style={sliderStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
          <span>1 kW</span>
          <span>50 kW</span>
        </div>
      </div>

      {/* Stats comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>208V</div>
          <div style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>{currentAt208V.toFixed(1)}A current</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>{lossAt208V.toFixed(0)}W loss</div>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>480V</div>
          <div style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>{currentAt480V.toFixed(1)}A current</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{lossAt480V.toFixed(0)}W loss</div>
        </div>
      </div>

      {/* Key insight */}
      <div style={{ padding: '16px', marginBottom: '24px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px' }}>
        <p style={{ color: '#6ee7b7', fontSize: '14px', lineHeight: 1.6 }}>
          <strong>Key insight:</strong> 480V distribution saves {((1 - lossAt480V / lossAt208V) * 100).toFixed(0)}% in cable losses!
          This is why large data centers use 480V/415V distribution before stepping down to 208V/120V at the rack.
        </p>
      </div>

      {renderBottomBar(hasExploredTwist, hasExploredTwist ? 'Continue' : 'Adjust the power slider...')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(20, 184, 166, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px' }}>💡</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>High Voltage Distribution</h2>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(6, 182, 212, 0.1))', border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '16px', textAlign: 'center', fontSize: '16px' }}>Why Use Higher Voltages?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { icon: '📉', title: 'Lower Current', sub: 'I = P/V' },
            { icon: '🔥', title: 'Less Heat', sub: 'P = I² × R' },
            { icon: '💰', title: 'Smaller Cables', sub: 'Less copper cost' },
            { icon: '⚡', title: 'Better Efficiency', sub: 'Lower total losses' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: '#2dd4bf' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '8px', fontSize: '15px' }}>Real World Examples</h4>
        <ul style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '14px', lineHeight: 1.8, margin: 0, paddingLeft: '16px' }}>
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
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px' }}>🌍</span>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Real-World Applications</h2>
            <p style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>Complete all 4 to unlock assessment</p>
          </div>
        </div>

        {/* Introductory context */}
        <div style={{ padding: '16px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px' }}>
          <p style={{ color: '#93c5fd', fontSize: '14px', lineHeight: 1.6 }}>
            The principles of cable sizing and voltage distribution that you have learned apply across many industries and scales.
            From massive power grid infrastructure spanning thousands of miles to the compact wiring inside electric vehicles,
            engineers use P = I squared times R to optimize every electrical system. Understanding these tradeoffs between voltage level,
            current capacity, cable thickness, and power loss is essential for designing efficient, safe, and cost-effective electrical systems.
            Explore these four real-world applications to see how the physics of cable losses drives engineering decisions worth billions of dollars annually.
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.8)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>Progress</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>{completedApps.size}/4</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedApps.size / 4) * 100}%`, background: 'linear-gradient(to right, #3b82f6, #6366f1)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
          {TRANSFER_APPS.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: '12px', fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.3s ease', border: 'none', cursor: 'pointer', minHeight: '44px',
                backgroundColor: activeAppTab === index ? '#f59e0b' : completedApps.has(index) ? 'rgba(245, 158, 11, 0.15)' : 'rgba(30, 41, 59, 0.8)',
                color: activeAppTab === index ? '#ffffff' : completedApps.has(index) ? '#fbbf24' : '#94a3b8',
              }}
            >
              {completedApps.has(index) && <span>✓</span>}
              {app.icon}
            </button>
          ))}
        </div>

        {/* Active app card */}
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>{TRANSFER_APPS[activeAppTab].icon}</span>
              <h3 style={{ fontWeight: 700, color: '#f8fafc', fontSize: '18px' }}>{TRANSFER_APPS[activeAppTab].title}</h3>
            </div>
            <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
              {TRANSFER_APPS[activeAppTab].description}
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {TRANSFER_APPS[activeAppTab].stats.map((stat, si) => (
                <div key={si} style={{ textAlign: 'center', padding: '8px', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {!completedApps.has(activeAppTab) ? (
              <button
                onClick={() => handleCompleteApp(activeAppTab)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s ease', background: 'linear-gradient(to right, #f59e0b, #f97316)', boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.39)', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '16px', minHeight: '44px' }}
              >
                Got It
              </button>
            ) : (
              <div style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600, textAlign: 'center', minHeight: '44px', fontSize: '16px' }}>
                Completed ✓
              </div>
            )}
          </div>
        </div>

        {/* Forward navigation - Continue to Test link */}
        <a
          href="#test"
          onClick={(e) => { e.preventDefault(); goNext(); }}
          style={{ display: 'block', width: '100%', padding: '16px', borderRadius: '16px', cursor: 'pointer', background: allAppsCompleted ? 'linear-gradient(to right, #f59e0b, #f97316)' : 'linear-gradient(to right, #475569, #334155)', boxShadow: allAppsCompleted ? '0 4px 14px 0 rgba(245, 158, 11, 0.39)' : 'none', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '18px', minHeight: '44px', marginBottom: '24px', transition: 'all 0.3s ease', textAlign: 'center', textDecoration: 'none' }}
        >
          Take the Test {'\u2192'}
        </a>

        {renderBottomBar(allAppsCompleted, allAppsCompleted ? 'Next \u2192' : `Complete ${4 - completedApps.size} more`)}
      </div>
    );
  };

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px' }}>📝</span>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Knowledge Assessment</h2>
            <p style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>10 questions - 70% to pass</p>
          </div>
        </div>

        {!testSubmitted ? (
          <>
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.8)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>Progress</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#8b5cf6' }}>{answeredCount}/10</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(answeredCount / 10) * 100}%`, background: 'linear-gradient(to right, #8b5cf6, #a855f7)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, backgroundColor: testAnswers[qIndex] !== null ? '#8b5cf6' : '#334155', color: testAnswers[qIndex] !== null ? '#ffffff' : '#94a3b8' }}>
                      Question {qIndex + 1} of 10
                    </span>
                  </div>
                  <p style={{ fontWeight: 500, color: '#f8fafc', lineHeight: 1.6, marginBottom: '16px', fontSize: '15px' }}>{q.question}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '12px', textAlign: 'left', fontSize: '14px',
                          transition: 'all 0.3s ease', minHeight: '44px', cursor: 'pointer',
                          border: testAnswers[qIndex] === oIndex ? '2px solid #8b5cf6' : '1px solid #334155',
                          backgroundColor: testAnswers[qIndex] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                          color: testAnswers[qIndex] === oIndex ? '#c4b5fd' : '#94a3b8',
                          fontWeight: testAnswers[qIndex] === oIndex ? 600 : 400,
                        }}
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
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 600, fontSize: '18px',
                transition: 'all 0.3s ease', border: 'none', minHeight: '44px', cursor: allAnswered ? 'pointer' : 'not-allowed',
                background: allAnswered ? 'linear-gradient(to right, #f59e0b, #f97316)' : '#334155',
                color: allAnswered ? '#ffffff' : '#475569',
                boxShadow: allAnswered ? '0 4px 14px 0 rgba(245, 158, 11, 0.39)' : 'none',
              }}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div style={{ paddingTop: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '96px', height: '96px', borderRadius: '50%', marginBottom: '24px',
                background: testScore >= 7 ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'linear-gradient(135deg, #475569, #334155)',
              }}>
                <span style={{ fontSize: '48px' }}>{testScore >= 7 ? '🔌' : '📚'}</span>
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{testScore}/10 Correct</h3>
              <p style={{ color: 'rgba(148, 163, 184, 0.7)', marginBottom: '16px', fontSize: '16px' }}>
                {testScore >= 7 ? 'Excellent! You understand cable sizing and voltage drop!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {/* Answer Review */}
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.8)', marginBottom: '24px' }}>
              <h4 style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '16px', fontSize: '16px' }}>Answer Review</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {TEST_QUESTIONS.map((q, qIndex) => {
                  const userAnswer = testAnswers[qIndex];
                  const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                  return (
                    <div key={qIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                      <span style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '14px', backgroundColor: isCorrect ? '#22c55e' : '#ef4444' }}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span style={{ fontSize: '14px', color: 'rgba(148, 163, 184, 0.7)' }}>Q{qIndex + 1}: {isCorrect ? 'Correct' : 'Incorrect'}</span>
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
                style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 600, fontSize: '18px', border: 'none', cursor: 'pointer', backgroundColor: '#334155', color: '#e2e8f0', minHeight: '44px', transition: 'all 0.3s ease' }}
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3)', marginBottom: '24px' }}>
          <span style={{ fontSize: '48px' }}>🏆</span>
        </div>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>Cable Sizing Master!</h1>

      <p style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 0.7)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
        You now understand the physics of power distribution and cable losses.
      </p>

      <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 88, 12, 0.1))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
        <h3 style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '16px', textAlign: 'center', fontSize: '16px' }}>Key Takeaways</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            'P = I² × R: Power loss scales with current squared',
            'Higher voltage = lower current = dramatically lower losses',
            'Doubling voltage cuts losses to 1/4 (for same power)',
            'Wire gauge determines resistance (lower AWG = thicker)',
            'Voltage drop should stay under 3-5% for efficiency',
          ].map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f59e0b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '14px', lineHeight: 1.6, color: '#e2e8f0' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ padding: '16px 32px', borderRadius: '16px', fontWeight: 600, fontSize: '18px', border: 'none', cursor: 'pointer', backgroundColor: '#334155', color: '#e2e8f0', minHeight: '44px', transition: 'all 0.3s ease' }}
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontWeight: 400, fontSize: '16px', lineHeight: 1.6 }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        {renderPhase()}
      </div>
    </div>
  );
}
