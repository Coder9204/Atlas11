'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 184: SRAM CELL STABILITY
// ============================================================================
// Physics: 6T SRAM uses cross-coupled inverters for bistable storage
// Read disturb: accessing the cell can flip its state
// Write margin: cell must be weak enough to overwrite
// SNM (Static Noise Margin) quantifies stability
// ============================================================================

interface SRAMCellRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  high: '#22c55e',
  low: '#3b82f6',
  transistor: '#8b5cf6',
  wordline: '#f97316',
  bitline: '#06b6d4',
};

const SRAMCellRenderer: React.FC<SRAMCellRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // SRAM cell state
  const [storedBit, setStoredBit] = useState(1); // 0 or 1
  const [wordLineActive, setWordLineActive] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [writeValue, setWriteValue] = useState(0);

  // Simulation parameters
  const [cellRatio, setCellRatio] = useState(1.5); // Pull-down to access transistor ratio
  const [supplyVoltage, setSupplyVoltage] = useState(1.0);
  const [processVariation, setProcessVariation] = useState(0); // % variation
  const [temperature, setTemperature] = useState(25);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Stability event tracking
  const [readDisturbOccurred, setReadDisturbOccurred] = useState(false);
  const [writeFailureOccurred, setWriteFailureOccurred] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations
  const calculateStability = useCallback(() => {
    // Static Noise Margin depends on cell ratio, voltage, and variations
    // Higher cell ratio = better read stability but worse write margin
    const baseSnm = 0.3 * supplyVoltage * Math.sqrt(cellRatio);

    // Process variation degrades SNM
    const variationFactor = 1 - (processVariation / 100) * 0.5;

    // Temperature effect (higher temp = lower SNM)
    const tempFactor = 1 - (temperature - 25) / 200;

    const snm = baseSnm * variationFactor * tempFactor;

    // Read margin (ability to read without disturbing)
    const readMargin = snm * 1.2;

    // Write margin (ability to overwrite the cell)
    // Higher cell ratio makes writing harder
    const writeMargin = (supplyVoltage * 0.4) / Math.sqrt(cellRatio) * variationFactor;

    // Failure probabilities (simplified model)
    const readDisturbProb = Math.max(0, (0.3 - snm) / 0.3) * 100;
    const writeFailureProb = Math.max(0, (0.2 - writeMargin) / 0.2) * 100;

    // Overall stability score
    const stabilityScore = Math.min(snm, writeMargin) * 100;

    return {
      snm,
      readMargin,
      writeMargin,
      readDisturbProb,
      writeFailureProb,
      stabilityScore,
      isStable: snm > 0.1 && writeMargin > 0.1,
      readStable: readDisturbProb < 10,
      writeCapable: writeFailureProb < 10,
    };
  }, [cellRatio, supplyVoltage, processVariation, temperature]);

  // Perform read operation
  const performRead = useCallback(() => {
    const stability = calculateStability();
    setWordLineActive(true);
    setIsReading(true);

    // Simulate read disturb probability
    const random = Math.random() * 100;
    if (random < stability.readDisturbProb) {
      setTimeout(() => {
        setStoredBit(prev => 1 - prev); // Flip bit!
        setReadDisturbOccurred(true);
      }, 500);
    }

    setTimeout(() => {
      setWordLineActive(false);
      setIsReading(false);
    }, 1000);
  }, [calculateStability]);

  // Perform write operation
  const performWrite = useCallback((value: number) => {
    const stability = calculateStability();
    setWordLineActive(true);
    setIsWriting(true);
    setWriteValue(value);

    // Simulate write failure probability
    const random = Math.random() * 100;
    if (random < stability.writeFailureProb) {
      setWriteFailureOccurred(true);
      // Write fails - bit doesn't change
    } else {
      setTimeout(() => {
        setStoredBit(value);
      }, 500);
    }

    setTimeout(() => {
      setWordLineActive(false);
      setIsWriting(false);
    }, 1000);
  }, [calculateStability]);

  const predictions = [
    { id: 'simple', label: 'It is just a simple latch - turn on power and it remembers' },
    { id: 'bistable', label: 'Two cross-coupled inverters create a bistable circuit that locks into 0 or 1' },
    { id: 'capacitor', label: 'A tiny capacitor stores the charge representing the bit' },
    { id: 'magnetic', label: 'Magnetic domains in the transistors store the information' },
  ];

  const twistPredictions = [
    { id: 'always_stable', label: 'SRAM cells are always stable once written' },
    { id: 'read_disturb', label: 'Reading the cell can accidentally flip its stored value' },
    { id: 'write_easy', label: 'Writing is always easy because the cell is designed to be overwritten' },
    { id: 'size_irrelevant', label: 'Cell size does not affect stability' },
  ];

  const transferApplications = [
    {
      title: 'CPU Cache Memory',
      description: 'L1/L2/L3 caches use SRAM for fast access. Stability directly impacts reliability - a flipped bit could crash your program!',
      question: 'Why do CPU caches use SRAM instead of DRAM?',
      answer: 'SRAM is much faster (no refresh needed, direct access) and can be placed close to the CPU core. The tradeoff is 6 transistors per bit vs 1 transistor + capacitor for DRAM, making SRAM ~6x larger and more expensive per bit.',
    },
    {
      title: 'Register Files',
      description: 'CPU registers are the fastest memory, holding data being actively computed. They use specially designed high-performance SRAM.',
      question: 'Why are register files even more critical for stability than caches?',
      answer: 'Registers are accessed every clock cycle (billions of times per second). Even a tiny failure probability compounds into significant risk. Register SRAM uses larger transistors and higher cell ratios for maximum stability.',
    },
    {
      title: 'Embedded SRAM in SoCs',
      description: 'Modern chips embed megabytes of SRAM for buffers, FIFOs, and scratchpads. Each must be reliable across all operating conditions.',
      question: 'How do designers handle SRAM stability across voltage/temperature variations?',
      answer: 'Designs include margin for worst-case corners (low voltage, high temperature, process variation). Some chips use adaptive body biasing to tune transistor characteristics, and redundant bit cells allow error correction.',
    },
    {
      title: 'Low-Power IoT Devices',
      description: 'Battery-powered devices need to retain SRAM contents during sleep modes at very low voltage to save power.',
      question: 'Why is ultra-low voltage SRAM operation challenging?',
      answer: 'SNM decreases with voltage - at 0.5V, the noise margin may be only 50-100mV. Process variations that were tolerable at 1V become critical at low voltage. Special 8T or 10T cells with separate read/write paths improve low-voltage stability.',
    },
  ];

  const testQuestions = [
    {
      question: 'How many transistors are in a standard SRAM cell?',
      options: [
        { text: '1 transistor (1T)', correct: false },
        { text: '4 transistors (4T)', correct: false },
        { text: '6 transistors (6T)', correct: true },
        { text: '8 transistors (8T)', correct: false },
      ],
    },
    {
      question: 'What creates the bistable storage in an SRAM cell?',
      options: [
        { text: 'A charged capacitor', correct: false },
        { text: 'Two cross-coupled inverters', correct: true },
        { text: 'Magnetic polarization', correct: false },
        { text: 'Floating gate charge', correct: false },
      ],
    },
    {
      question: 'What is "read disturb" in SRAM?',
      options: [
        { text: 'Noise from adjacent cells during read', correct: false },
        { text: 'The read operation accidentally flipping the stored bit', correct: true },
        { text: 'Slow read access time', correct: false },
        { text: 'Power consumption during read', correct: false },
      ],
    },
    {
      question: 'What is Static Noise Margin (SNM)?',
      options: [
        { text: 'The maximum frequency of operation', correct: false },
        { text: 'The minimum voltage difference the cell can distinguish', correct: false },
        { text: 'A measure of how much noise the cell can tolerate without flipping', correct: true },
        { text: 'The power consumed during standby', correct: false },
      ],
    },
    {
      question: 'How does the cell ratio affect SRAM stability?',
      options: [
        { text: 'Higher ratio improves read stability but worsens write margin', correct: true },
        { text: 'Higher ratio improves both read and write', correct: false },
        { text: 'Cell ratio has no effect on stability', correct: false },
        { text: 'Lower ratio always improves stability', correct: false },
      ],
    },
    {
      question: 'Why does lowering supply voltage hurt SRAM stability?',
      options: [
        { text: 'It slows down the transistors', correct: false },
        { text: 'It reduces the noise margin between high and low states', correct: true },
        { text: 'It increases leakage current', correct: false },
        { text: 'It has no effect on stability', correct: false },
      ],
    },
    {
      question: 'What is the purpose of access transistors in a 6T SRAM cell?',
      options: [
        { text: 'To provide power to the cell', correct: false },
        { text: 'To connect the cell to bit lines when word line is active', correct: true },
        { text: 'To store the data bit', correct: false },
        { text: 'To amplify the signal', correct: false },
      ],
    },
    {
      question: 'How does process variation affect SRAM yield?',
      options: [
        { text: 'It has no effect on modern processes', correct: false },
        { text: 'Random transistor mismatches can make some cells unstable', correct: true },
        { text: 'It only affects read speed, not stability', correct: false },
        { text: 'Larger cells are more affected by variation', correct: false },
      ],
    },
    {
      question: 'Why do some designs use 8T SRAM cells instead of 6T?',
      options: [
        { text: 'To store more bits', correct: false },
        { text: 'To separate read and write paths for better stability', correct: true },
        { text: 'To reduce power consumption', correct: false },
        { text: 'To decrease cell size', correct: false },
      ],
    },
    {
      question: 'What happens during a write operation in a 6T SRAM cell?',
      options: [
        { text: 'The capacitor is charged or discharged', correct: false },
        { text: 'The access transistors connect bit lines which overpower the inverters', correct: true },
        { text: 'Current flows through the word line', correct: false },
        { text: 'The cell is first erased then written', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const output = calculateStability();

    // Node voltages based on stored bit
    const qVoltage = storedBit === 1 ? supplyVoltage : 0;
    const qBarVoltage = storedBit === 1 ? 0 : supplyVoltage;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            6T SRAM Cell - Stored: {storedBit}
          </text>

          {/* VDD rail */}
          <line x1={80} y1={50} x2={320} y2={50} stroke={colors.high} strokeWidth={3} />
          <text x={200} y={45} fill={colors.high} fontSize={10} textAnchor="middle">VDD ({supplyVoltage.toFixed(1)}V)</text>

          {/* Left inverter (P1, N1) */}
          <g transform="translate(100, 70)">
            {/* PMOS P1 */}
            <rect x={0} y={0} width={30} height={25} fill={colors.transistor} rx={4} opacity={0.8} />
            <text x={15} y={16} fill="white" fontSize={9} textAnchor="middle">P1</text>

            {/* NMOS N1 */}
            <rect x={0} y={60} width={30} height={25} fill={colors.transistor} rx={4} opacity={0.8} />
            <text x={15} y={76} fill="white" fontSize={9} textAnchor="middle">N1</text>

            {/* Connections */}
            <line x1={15} y1={25} x2={15} y2={60} stroke={colors.textSecondary} strokeWidth={2} />

            {/* Q node */}
            <circle cx={15} cy={42} r={8} fill={qVoltage > 0.5 ? colors.high : colors.low} />
            <text x={15} y={46} fill="white" fontSize={8} textAnchor="middle">Q</text>
          </g>

          {/* Right inverter (P2, N2) */}
          <g transform="translate(270, 70)">
            {/* PMOS P2 */}
            <rect x={0} y={0} width={30} height={25} fill={colors.transistor} rx={4} opacity={0.8} />
            <text x={15} y={16} fill="white" fontSize={9} textAnchor="middle">P2</text>

            {/* NMOS N2 */}
            <rect x={0} y={60} width={30} height={25} fill={colors.transistor} rx={4} opacity={0.8} />
            <text x={15} y={76} fill="white" fontSize={9} textAnchor="middle">N2</text>

            {/* Connections */}
            <line x1={15} y1={25} x2={15} y2={60} stroke={colors.textSecondary} strokeWidth={2} />

            {/* Q-bar node */}
            <circle cx={15} cy={42} r={8} fill={qBarVoltage > 0.5 ? colors.high : colors.low} />
            <text x={15} y={46} fill="white" fontSize={7} textAnchor="middle">Q</text>
          </g>

          {/* Cross-coupling connections */}
          <path d="M 145 112 C 180 112, 180 90, 235 90" stroke={colors.accent} strokeWidth={2} fill="none" strokeDasharray={wordLineActive ? "none" : "4,2"} />
          <path d="M 255 112 C 220 112, 220 90, 165 90" stroke={colors.accent} strokeWidth={2} fill="none" strokeDasharray={wordLineActive ? "none" : "4,2"} />

          {/* Access transistors */}
          <g transform="translate(60, 140)">
            {/* Left access transistor */}
            <rect x={0} y={0} width={25} height={20} fill={wordLineActive ? colors.wordline : colors.transistor} rx={3} opacity={0.8} />
            <text x={12} y={14} fill="white" fontSize={8} textAnchor="middle">A1</text>
          </g>

          <g transform="translate(315, 140)">
            {/* Right access transistor */}
            <rect x={0} y={0} width={25} height={20} fill={wordLineActive ? colors.wordline : colors.transistor} rx={3} opacity={0.8} />
            <text x={12} y={14} fill="white" fontSize={8} textAnchor="middle">A2</text>
          </g>

          {/* Word line */}
          <line x1={30} y1={150} x2={370} y2={150} stroke={wordLineActive ? colors.wordline : colors.textMuted} strokeWidth={wordLineActive ? 3 : 2} />
          <text x={20} y={150} fill={wordLineActive ? colors.wordline : colors.textMuted} fontSize={9} textAnchor="end">WL</text>

          {/* Bit lines */}
          <line x1={72} y1={165} x2={72} y2={220} stroke={colors.bitline} strokeWidth={2} />
          <text x={72} y={235} fill={colors.bitline} fontSize={9} textAnchor="middle">BL</text>

          <line x1={327} y1={165} x2={327} y2={220} stroke={colors.bitline} strokeWidth={2} />
          <text x={327} y={235} fill={colors.bitline} fontSize={9} textAnchor="middle">BL</text>

          {/* GND rail */}
          <line x1={80} y1={175} x2={320} y2={175} stroke={colors.low} strokeWidth={3} />
          <text x={200} y={190} fill={colors.low} fontSize={10} textAnchor="middle">GND</text>

          {/* Status indicators */}
          {isReading && (
            <g>
              <rect x={150} y={200} width={100} height={25} fill="rgba(6, 182, 212, 0.3)" rx={4} />
              <text x={200} y={217} fill={colors.bitline} fontSize={11} textAnchor="middle" fontWeight="bold">
                READING...
              </text>
            </g>
          )}

          {isWriting && (
            <g>
              <rect x={150} y={200} width={100} height={25} fill="rgba(249, 115, 22, 0.3)" rx={4} />
              <text x={200} y={217} fill={colors.wordline} fontSize={11} textAnchor="middle" fontWeight="bold">
                WRITING {writeValue}...
              </text>
            </g>
          )}

          {readDisturbOccurred && (
            <g>
              <rect x={120} y={200} width={160} height={25} fill="rgba(239, 68, 68, 0.3)" rx={4} />
              <text x={200} y={217} fill={colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">
                READ DISTURB!
              </text>
            </g>
          )}

          {/* Metrics panel */}
          <rect x={20} y={250} width={360} height={120} fill="rgba(0,0,0,0.4)" rx={8} />

          <text x={35} y={275} fill={colors.textSecondary} fontSize={11}>SNM: {(output.snm * 1000).toFixed(0)} mV</text>
          <text x={35} y={295} fill={colors.textSecondary} fontSize={11}>Read Margin: {(output.readMargin * 1000).toFixed(0)} mV</text>
          <text x={35} y={315} fill={colors.textSecondary} fontSize={11}>Write Margin: {(output.writeMargin * 1000).toFixed(0)} mV</text>

          <text x={200} y={275} fill={colors.textSecondary} fontSize={11}>Cell Ratio: {cellRatio.toFixed(1)}</text>
          <text x={200} y={295} fill={output.readStable ? colors.success : colors.error} fontSize={11}>
            Read Disturb Risk: {output.readDisturbProb.toFixed(1)}%
          </text>
          <text x={200} y={315} fill={output.writeCapable ? colors.success : colors.error} fontSize={11}>
            Write Failure Risk: {output.writeFailureProb.toFixed(1)}%
          </text>

          <text x={35} y={350} fill={colors.textSecondary} fontSize={11}>
            Stability: {output.isStable ? 'STABLE' : 'UNSTABLE'} | Q={qVoltage.toFixed(1)}V, Q={qBarVoltage.toFixed(1)}V
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setReadDisturbOccurred(false); performRead(); }}
              disabled={isReading || isWriting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isReading || isWriting ? colors.textMuted : colors.bitline,
                color: 'white',
                fontWeight: 'bold',
                cursor: isReading || isWriting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Read
            </button>
            <button
              onClick={() => { setWriteFailureOccurred(false); performWrite(0); }}
              disabled={isReading || isWriting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isReading || isWriting ? colors.textMuted : colors.wordline,
                color: 'white',
                fontWeight: 'bold',
                cursor: isReading || isWriting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Write 0
            </button>
            <button
              onClick={() => { setWriteFailureOccurred(false); performWrite(1); }}
              disabled={isReading || isWriting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isReading || isWriting ? colors.textMuted : colors.wordline,
                color: 'white',
                fontWeight: 'bold',
                cursor: isReading || isWriting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Write 1
            </button>
            <button
              onClick={() => { setStoredBit(1); setReadDisturbOccurred(false); setWriteFailureOccurred(false); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => {
    const output = calculateStability();

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Cell Ratio (beta): {cellRatio.toFixed(1)}
          </label>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={cellRatio}
            onChange={(e) => setCellRatio(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
            <span>1.0 (weak read)</span>
            <span>2.0 (balanced)</span>
            <span>3.0 (strong read)</span>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Supply Voltage: {supplyVoltage.toFixed(2)}V
          </label>
          <input
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={supplyVoltage}
            onChange={(e) => setSupplyVoltage(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Process Variation: {processVariation}%
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={processVariation}
            onChange={(e) => setProcessVariation(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Temperature: {temperature}C
          </label>
          <input
            type="range"
            min="-40"
            max="125"
            step="5"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{
          background: output.isStable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${output.isStable ? colors.success : colors.error}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            {output.isStable ? 'Cell is Stable' : 'Warning: Stability Issues!'}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Higher cell ratio helps read stability but hurts write margin. Find the balance!
          </div>
        </div>
      </div>
    );
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              SRAM Cell Stability
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How does a 6-transistor SRAM cell remember a bit?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Every bit of cache in your CPU is stored in a tiny SRAM cell with just 6 transistors.
                These cells must reliably hold data through billions of read and write cycles.
                But the physics of making them smaller creates surprising challenges!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try reading and writing to the cell. Watch the Q and Q-bar nodes change!
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                A 6T SRAM cell uses 6 transistors to store a single bit.
                How does such a small circuit remember whether it is storing a 0 or 1?
              </p>
            </div>

            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Your Prediction:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore SRAM Cell Operation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Read and write to the cell, adjust parameters
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Read the cell multiple times - watch for read disturb</li>
              <li>Lower voltage and increase variation - see stability degrade</li>
              <li>Adjust cell ratio - balance read vs write stability</li>
              <li>Try writing at low voltage - observe write failures</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'bistable';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Good try!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The 6T SRAM cell uses two cross-coupled inverters to create a bistable circuit.
              Once set, it naturally locks into one of two stable states (0 or 1).
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>How 6T SRAM Works</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cross-Coupled Inverters:</strong> Each inverter
                output connects to the other inverter input. If one outputs HIGH, it forces the other LOW,
                which reinforces the first to stay HIGH. This creates two stable states.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Access Transistors:</strong> Two additional
                transistors (A1, A2) act as switches connecting the cell to bit lines only when the
                word line is activated.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Read Operation:</strong> Word line activates,
                the stored values drive the bit lines, and sense amplifiers detect which bit line is higher.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Write Operation:</strong> Word line activates,
                and strong drivers on the bit lines force the cell nodes to the desired state,
                overpowering the inverters.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist: Stability Challenges</h2>
            <p style={{ color: colors.textSecondary }}>
              What can go wrong with tiny SRAM cells?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              As SRAM cells shrink, they become more susceptible to noise and variations.
              What unexpected problem can occur during normal operation?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is a major stability concern for small SRAM cells?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Inducing Read Disturb</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Lower voltage and increase variation to see instability
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Read Disturb Explained:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              During read, the bit lines connect to the cell nodes through access transistors.
              If the cell is weak (low voltage, high variation), the bit line charge sharing
              can disturb the stored value enough to flip it! This is called read disturb.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'read_disturb';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'Surprising Result!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Read disturb is a real phenomenon! Simply reading an SRAM cell can flip its value
              if the cell is not designed with enough stability margin.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Design Dilemma</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Read vs Write Conflict:</strong> To prevent
                read disturb, you want strong pull-down transistors (high cell ratio). But this makes
                writing harder because the bit lines must overpower the cell.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Static Noise Margin:</strong> SNM measures
                how much noise the cell can tolerate. Lower voltage and more process variation both
                reduce SNM, making cells more vulnerable.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Solutions:</strong> Use 8T cells with
                separate read ports, add error correction (ECC), or use larger transistors at the cost
                of density. Advanced nodes use all of these techniques.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
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
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', WebkitTapHighlightColor: 'transparent' }}
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
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand SRAM cell stability!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered SRAM cell stability!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>6T SRAM cell structure with cross-coupled inverters</li>
              <li>Read disturb and Static Noise Margin (SNM)</li>
              <li>Cell ratio and the read/write stability tradeoff</li>
              <li>Impact of voltage and process variation</li>
              <li>8T cells and other stability solutions</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Industry Challenges:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              At advanced nodes (5nm and below), process variation is so severe that many cells
              would fail without assist circuits, ECC, and redundancy. SRAM bit cell area is often
              the limiting factor for cache density. Understanding these physics is essential for
              chip architects balancing performance, power, and reliability!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default SRAMCellRenderer;
