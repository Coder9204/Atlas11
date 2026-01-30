'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 185: DRAM REFRESH
// ============================================================================
// Physics: DRAM stores bits as charge in capacitors that leak over time
// Refresh cycles must periodically restore charge to prevent data loss
// Temperature and memory speed affect refresh requirements
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DRAMRefreshRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  capacitor: '#3b82f6',
  charge: '#22d3ee',
  leak: '#f97316',
  border: '#334155',
};

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Speed Tradeoff',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const TEST_QUESTIONS = [
  { text: 'DRAM stores each bit as charge in a capacitor', correct: true },
  { text: 'DRAM retains data permanently without power', correct: false },
  { text: 'Capacitor leakage causes DRAM to lose data over time', correct: true },
  { text: 'DRAM refresh reads and rewrites each cell periodically', correct: true },
  { text: 'Faster DRAM chips need less frequent refresh cycles', correct: false },
  { text: 'Refresh operations consume power and reduce available bandwidth', correct: true },
  { text: 'Retention time is how long a cell holds its charge', correct: true },
  { text: 'SRAM needs refresh cycles like DRAM', correct: false },
  { text: 'Higher temperatures increase leakage and require faster refresh', correct: true },
  { text: 'Modern DDR5 has improved refresh efficiency over DDR4', correct: true },
];

const TRANSFER_APPLICATIONS = [
  {
    title: 'Server Memory',
    description: 'Data centers run 24/7 with massive DRAM arrays. ECC (Error Correcting Code) memory adds extra bits to detect and fix errors caused by charge loss or cosmic rays.',
    question: 'Why do servers use ECC memory?',
    answer: 'ECC memory can detect and correct single-bit errors caused by charge leakage, cosmic rays, or electrical noise. This prevents crashes and data corruption in mission-critical systems.',
  },
  {
    title: 'Mobile Devices',
    description: 'Phones use LPDDR (Low Power DDR) memory with optimized refresh rates to extend battery life while maintaining performance.',
    question: 'How does LPDDR save power compared to standard DDR?',
    answer: 'LPDDR uses lower voltages, partial array self-refresh (only refreshing active sections), and temperature-compensated refresh rates to minimize power consumption.',
  },
  {
    title: 'Graphics Cards',
    description: 'GPUs use GDDR or HBM memory with extremely high bandwidth. These must balance refresh overhead with data throughput for gaming and AI workloads.',
    question: 'Why is refresh timing critical for GPU memory?',
    answer: 'GPUs need maximum bandwidth for rendering and compute. Refresh cycles steal bandwidth, so GDDR uses optimized refresh patterns that minimize interference with data transfers.',
  },
  {
    title: 'Embedded Systems',
    description: 'Cars, medical devices, and industrial controllers use special DRAM with extended temperature ranges and longer retention times for reliability.',
    question: 'Why do embedded systems need automotive-grade DRAM?',
    answer: 'Automotive environments have extreme temperatures (-40C to +125C). Higher temperatures increase leakage dramatically, requiring faster refresh rates and more robust cell designs.',
  },
];

const DRAMRefreshRenderer: React.FC<DRAMRefreshRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [refreshRate, setRefreshRate] = useState(64); // ms between refreshes
  const [temperature, setTemperature] = useState(25); // Celsius
  const [memorySpeed, setMemorySpeed] = useState(3200); // MHz
  const [isSimulating, setIsSimulating] = useState(false);
  const [time, setTime] = useState(0);
  const [cellCharges, setCellCharges] = useState<number[]>([100, 100, 100, 100, 100, 100, 100, 100]);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [dataLost, setDataLost] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(boolean | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate leakage rate based on temperature and speed
  const getLeakageRate = useCallback(() => {
    const baseLeakage = 0.5; // % per ms
    const tempFactor = 1 + (temperature - 25) * 0.03; // 3% increase per degree above 25C
    const speedFactor = 1 + (memorySpeed - 2400) / 2400 * 0.2; // Faster memory leaks slightly more
    return baseLeakage * tempFactor * speedFactor;
  }, [temperature, memorySpeed]);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTime(t => {
        const newTime = t + 1;

        // Check if refresh is due
        if (newTime - lastRefreshTime >= refreshRate) {
          setLastRefreshTime(newTime);
          setCellCharges([100, 100, 100, 100, 100, 100, 100, 100]);
          setDataLost(false);
        } else {
          // Apply leakage
          const leakage = getLeakageRate();
          setCellCharges(charges =>
            charges.map(c => {
              const newCharge = c - leakage;
              if (newCharge < 50) setDataLost(true);
              return Math.max(0, newCharge);
            })
          );
        }

        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, refreshRate, lastRefreshTime, getLeakageRate]);

  const resetSimulation = () => {
    setTime(0);
    setLastRefreshTime(0);
    setCellCharges([100, 100, 100, 100, 100, 100, 100, 100]);
    setDataLost(false);
    setIsSimulating(false);
  };

  const predictions = [
    { id: 'permanent', label: 'RAM stores data permanently in magnetic domains' },
    { id: 'capacitor', label: 'RAM stores data as electric charge that slowly leaks away' },
    { id: 'light', label: 'RAM stores data as light pulses in fiber optics' },
    { id: 'crystal', label: 'RAM stores data in crystal structures like an SSD' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Faster memory has the same refresh rate - speed does not affect storage' },
    { id: 'less', label: 'Faster memory needs less refresh - better technology means less leakage' },
    { id: 'more', label: 'Faster memory needs more frequent refresh - smaller capacitors leak faster' },
    { id: 'none', label: 'Faster memory eliminates refresh entirely with new technology' },
  ];

  const handleTestAnswer = (answer: boolean) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestIndex] = answer;
    setTestAnswers(newAnswers);
  };

  const nextTestQuestion = () => {
    if (currentTestIndex < TEST_QUESTIONS.length - 1) {
      setCurrentTestIndex(currentTestIndex + 1);
    }
  };

  const prevTestQuestion = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(currentTestIndex - 1);
    }
  };

  const submitTest = () => {
    let score = 0;
    testAnswers.forEach((answer, i) => {
      if (answer === TEST_QUESTIONS[i].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Visualization
  const renderDRAMVisualization = () => {
    const width = 400;
    const height = 300;
    const avgCharge = cellCharges.reduce((a, b) => a + b, 0) / cellCharges.length;
    const timeSinceRefresh = time - lastRefreshTime;
    const refreshProgress = Math.min(100, (timeSinceRefresh / refreshRate) * 100);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="chargeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.error} />
            <stop offset="50%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.charge} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y={25} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
          DRAM Memory Cell Array
        </text>

        {/* Memory cells grid */}
        {cellCharges.map((charge, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = 60 + col * 80;
          const y = 60 + row * 90;
          const chargeHeight = (charge / 100) * 50;

          return (
            <g key={i}>
              {/* Capacitor outline */}
              <rect
                x={x}
                y={y}
                width={50}
                height={60}
                fill="none"
                stroke={colors.capacitor}
                strokeWidth={2}
                rx={4}
              />
              {/* Charge level */}
              <rect
                x={x + 5}
                y={y + 55 - chargeHeight}
                width={40}
                height={chargeHeight}
                fill={charge > 70 ? colors.charge : charge > 50 ? colors.warning : colors.error}
                opacity={0.8}
                rx={2}
              />
              {/* Bit value */}
              <text
                x={x + 25}
                y={y + 75}
                textAnchor="middle"
                fill={charge > 50 ? colors.success : colors.error}
                fontSize={10}
                fontWeight="bold"
              >
                {charge > 50 ? '1' : '0/ERR'}
              </text>
              {/* Leakage arrows (when charge is leaking) */}
              {isSimulating && charge < 95 && (
                <g filter="url(#glow)">
                  <path
                    d={`M ${x + 25} ${y + 55} L ${x + 25} ${y + 65}`}
                    stroke={colors.leak}
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                    opacity={0.6}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={colors.leak} />
          </marker>
        </defs>

        {/* Refresh countdown bar */}
        <rect x={50} y={240} width={300} height={20} fill="rgba(255,255,255,0.1)" rx={4} />
        <rect
          x={50}
          y={240}
          width={300 * (1 - refreshProgress / 100)}
          height={20}
          fill={refreshProgress > 80 ? colors.error : colors.accent}
          rx={4}
        />
        <text x={200} y={254} textAnchor="middle" fill={colors.textPrimary} fontSize={11}>
          Refresh in: {Math.max(0, refreshRate - timeSinceRefresh).toFixed(0)}ms
        </text>

        {/* Status display */}
        <rect x={50} y={270} width={140} height={25} fill="rgba(0,0,0,0.5)" rx={4} />
        <text x={120} y={287} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
          Avg Charge: {avgCharge.toFixed(0)}%
        </text>

        <rect x={210} y={270} width={140} height={25} fill="rgba(0,0,0,0.5)" rx={4} />
        <text x={280} y={287} textAnchor="middle" fill={dataLost ? colors.error : colors.success} fontSize={11}>
          {dataLost ? 'DATA LOST!' : 'Data OK'}
        </text>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px'
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={handleNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #a78bfa 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px',
    WebkitTapHighlightColor: 'transparent' as const,
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Does RAM Forget Everything?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The physics of volatile memory
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Every time you turn off your computer, all the RAM goes blank. Programs disappear,
                unsaved work vanishes. Yet SSDs and hard drives remember everything. What makes
                RAM so forgetful?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer lies in tiny capacitors that are constantly fighting physics.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                DRAM capacitors hold charge measured in femtofarads - that is 0.000000000000001 farads!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>How Does DRAM Store Data?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Each bit needs to be stored somehow
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What stores the 1s and 0s in DRAM?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>DRAM Refresh Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch capacitors leak and see why refresh is essential
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Refresh Rate: {refreshRate}ms (every {refreshRate}ms)
              </label>
              <input
                type="range"
                min="16"
                max="128"
                value={refreshRate}
                onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Temperature: {temperature}C
              </label>
              <input
                type="range"
                min="0"
                max="85"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={{
                  ...buttonStyle,
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button
                onClick={resetSimulation}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.accent}`,
                  color: colors.accent,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Reset
              </button>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                <li>Charge leaks continuously from each capacitor</li>
                <li>Below 50% charge, data bits flip (errors!)</li>
                <li>Refresh restores all cells to 100%</li>
                <li>Higher temperature = faster leakage</li>
              </ul>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'capacitor';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              DRAM stores each bit as electric charge in a tiny capacitor. The capacitors are so
              small that charge naturally leaks away through quantum tunneling and parasitic paths.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of DRAM</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Capacitor Storage:</strong> Each DRAM cell
                has one transistor and one capacitor. A charged capacitor = 1, discharged = 0.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Charge Leakage:</strong> Capacitors lose
                charge through junction leakage, subthreshold conduction, and quantum tunneling.
                Typical retention time is 32-64ms.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Refresh Cycles:</strong> Every few
                milliseconds, the memory controller reads each row and rewrites it, restoring
                full charge to all capacitors.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Cost:</strong> Refresh consumes
                about 15-20% of DRAM power and temporarily blocks read/write operations.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: The Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Speed Paradox</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when we make memory faster?
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              DDR4-2400 runs at 2400 MHz. DDR5-6400 runs at 6400 MHz - nearly 3x faster!
              But to achieve this speed, the capacitors must be smaller and closer together.
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does faster memory affect refresh requirements?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Speed vs Power Trade-off</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore how memory speed affects refresh needs
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Memory Speed: DDR5-{memorySpeed}
              </label>
              <input
                type="range"
                min="2400"
                max="8000"
                step="400"
                value={memorySpeed}
                onChange={(e) => setMemorySpeed(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Refresh Rate: {refreshRate}ms
              </label>
              <input
                type="range"
                min="16"
                max="128"
                value={refreshRate}
                onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={{
                  ...buttonStyle,
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSimulating ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetSimulation}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.warning}`,
                  color: colors.warning,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Reset
              </button>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                <strong>Observation:</strong> At DDR5-{memorySpeed}, leakage rate is {getLeakageRate().toFixed(2)}%/ms.
                {memorySpeed > 4800 && ' Faster memory needs more frequent refresh to stay stable!'}
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Faster memory requires MORE frequent refresh, not less! Smaller capacitors at
              tighter pitches have higher leakage rates and less charge margin.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Speed-Power Trade-off</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Smaller Capacitors:</strong> Higher speed
                requires smaller cells. DDR5 cells are ~40% smaller than DDR4, holding less charge.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>More Leakage:</strong> Smaller geometry
                means more parasitic leakage paths and worse retention time.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DDR5 Solution:</strong> DDR5 uses
                same-bank refresh to refresh smaller portions more frequently, reducing
                overall power impact while maintaining data integrity.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Paradox:</strong> Faster memory
                can actually use MORE power due to increased refresh overhead!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {TRANSFER_APPLICATIONS.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    ...buttonStyle,
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${colors.accent}`,
                    color: colors.accent,
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You understand DRAM refresh!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {TEST_QUESTIONS.map((q, i) => {
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer === q.correct;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '8px' }}>{i + 1}. {q.text}</p>
                  <p style={{ color: isCorrect ? colors.success : colors.error, fontSize: '14px' }}>
                    Your answer: {userAnswer ? 'True' : 'False'} | Correct: {q.correct ? 'True' : 'False'}
                  </p>
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];
    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestIndex + 1} / {TEST_QUESTIONS.length}</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {TEST_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestIndex(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestIndex ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.text}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleTestAnswer(true)}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  padding: '16px',
                  background: testAnswers[currentTestIndex] === true ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                  border: testAnswers[currentTestIndex] === true ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                  color: colors.textPrimary,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                TRUE
              </button>
              <button
                onClick={() => handleTestAnswer(false)}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  padding: '16px',
                  background: testAnswers[currentTestIndex] === false ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                  border: testAnswers[currentTestIndex] === false ? `2px solid ${colors.error}` : '1px solid rgba(255,255,255,0.2)',
                  color: colors.textPrimary,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                FALSE
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={prevTestQuestion}
                disabled={currentTestIndex === 0}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.textMuted}`,
                  color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                  cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Previous
              </button>
              {currentTestIndex < TEST_QUESTIONS.length - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  style={{
                    ...buttonStyle,
                    background: colors.accent,
                    color: 'white',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={!allAnswered}
                  style={{
                    ...buttonStyle,
                    background: allAnswered ? colors.success : colors.textMuted,
                    color: 'white',
                    cursor: allAnswered ? 'pointer' : 'not-allowed',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand DRAM refresh and volatile memory physics
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>DRAM stores bits as charge in tiny capacitors</li>
              <li>Capacitors leak charge continuously (retention time ~64ms)</li>
              <li>Refresh cycles read and rewrite each cell periodically</li>
              <li>Faster memory has smaller cells that leak faster</li>
              <li>Temperature dramatically affects leakage rate</li>
              <li>Refresh consumes power and reduces available bandwidth</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern memory research explores alternatives like FeRAM (ferroelectric), MRAM
              (magnetic), and ReRAM (resistive) that do not need refresh. These non-volatile
              technologies could someday replace DRAM for instant-on computers!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderDRAMVisualization()}
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default DRAMRefreshRenderer;
