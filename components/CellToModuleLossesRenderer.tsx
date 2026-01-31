import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface CellToModuleLossesRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Compare',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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
  solar: '#3b82f6',
  cell: '#1e3a5f',
  ribbon: '#cbd5e1',
  weak: '#ef4444',
};

interface CellData {
  id: number;
  efficiency: number;
  current: number;
  voltage: number;
  ribbonResistance: number;
}

const CellToModuleLossesRenderer: React.FC<CellToModuleLossesRendererProps> = ({
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
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
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

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation refs
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Module builder state
  const [cells, setCells] = useState<CellData[]>([
    { id: 1, efficiency: 22.0, current: 10.5, voltage: 0.68, ribbonResistance: 2 },
    { id: 2, efficiency: 22.0, current: 10.5, voltage: 0.68, ribbonResistance: 2 },
    { id: 3, efficiency: 22.0, current: 10.5, voltage: 0.68, ribbonResistance: 2 },
    { id: 4, efficiency: 22.0, current: 10.5, voltage: 0.68, ribbonResistance: 2 },
    { id: 5, efficiency: 22.0, current: 10.5, voltage: 0.68, ribbonResistance: 2 },
    { id: 6, efficiency: 22.0, current: 10.5, voltage: 0.68, ribbonResistance: 2 },
  ]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [hasWeakCell, setHasWeakCell] = useState(false);
  const [weakCellIndex, setWeakCellIndex] = useState(2);
  const [ribbonResistance, setRibbonResistance] = useState(2); // mOhm per connection
  const [encapsulantTransmission, setEncapsulantTransmission] = useState(96); // %

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Update cells when weak cell toggle changes
  useEffect(() => {
    setCells(prev => prev.map((cell, idx) => {
      if (hasWeakCell && idx === weakCellIndex) {
        return { ...cell, efficiency: 18.0, current: 8.5, voltage: 0.65 };
      }
      return { ...cell, efficiency: 22.0, current: 10.5, voltage: 0.68 };
    }));
  }, [hasWeakCell, weakCellIndex]);

  // Physics calculations
  const calculateModuleOutput = useCallback(() => {
    // Series connection: current limited by weakest cell, voltages add
    const minCurrent = Math.min(...cells.map(c => c.current));
    const totalVoltage = cells.reduce((sum, c) => sum + c.voltage, 0);

    // Ribbon resistance losses (I^2*R for each connection)
    const totalRibbonResistance = ribbonResistance * (cells.length - 1); // mOhm
    const ribbonVoltageDrop = (minCurrent * totalRibbonResistance) / 1000; // V
    const ribbonPowerLoss = minCurrent * ribbonVoltageDrop; // W

    // Cell-level calculations
    const cellArea = 0.0243; // m^2 (156mm cell)
    const irradiance = 1000; // W/m^2

    // Individual cell powers (if not current-limited)
    const cellPowers = cells.map(c => c.efficiency / 100 * irradiance * cellArea);
    const idealTotalPower = cellPowers.reduce((a, b) => a + b, 0);

    // Actual power with mismatch (series connection limits current)
    const actualCurrent = minCurrent;
    const effectiveVoltage = totalVoltage - ribbonVoltageDrop;
    const stringPower = actualCurrent * effectiveVoltage;

    // Mismatch loss
    const mismatchLoss = idealTotalPower - (actualCurrent * totalVoltage);
    const mismatchPercent = (mismatchLoss / idealTotalPower) * 100;

    // Optical losses (glass, EVA, etc.)
    const opticalLoss = (1 - encapsulantTransmission / 100) * 100;

    // Final module power
    const modulePower = stringPower * (encapsulantTransmission / 100);

    // CTM ratio (Cell to Module)
    const ctmRatio = (modulePower / idealTotalPower) * 100;

    // Individual cell status
    const cellStatus = cells.map((c, i) => ({
      ...c,
      isLimiting: c.current === minCurrent,
      powerLost: c.current > minCurrent ? (c.current - minCurrent) * c.voltage : 0,
    }));

    return {
      minCurrent,
      totalVoltage,
      effectiveVoltage,
      stringPower,
      modulePower,
      ribbonPowerLoss,
      ribbonLossPercent: (ribbonPowerLoss / stringPower) * 100,
      mismatchLoss,
      mismatchPercent,
      opticalLoss,
      ctmRatio,
      idealTotalPower,
      cellStatus,
    };
  }, [cells, ribbonResistance, encapsulantTransmission]);

  const predictions = [
    { id: 'perfect', label: '6 cells at 0.6V = 3.6V module exactly, no losses' },
    { id: 'small', label: 'Small losses (~1-2%) from minor resistances' },
    { id: 'significant', label: 'Significant losses (5-10%) from ribbons, mismatch, and optics' },
    { id: 'double', label: 'Losses double the expected power output' },
  ];

  const twistPredictions = [
    { id: 'proportional', label: 'Module power drops proportionally to the weak cell\'s deficit' },
    { id: 'worse', label: 'The whole string suffers - limited by the weakest cell\'s current' },
    { id: 'no_effect', label: 'Other cells compensate, so there\'s no effect' },
    { id: 'better', label: 'Weak cells actually help by reducing overheating' },
  ];

  const transferApplications = [
    {
      title: 'Module Binning and Sorting',
      description: 'Manufacturers sort cells by current output (binning) to minimize mismatch in modules.',
      question: 'Why do manufacturers measure and sort every cell before assembly?',
      answer: 'Cells from the same batch can vary by 2-5% in current. Mixing high and low current cells causes mismatch loss. By binning cells into groups with similar current, manufacturers ensure all cells in a string operate near their maximum power point.',
    },
    {
      title: 'Half-Cut Cell Modules',
      description: 'Half-cut cells have half the current, reducing I^2R losses in ribbons by 75%.',
      question: 'How do half-cut cells improve module efficiency?',
      answer: 'Half the current means I^2R = (I/2)^2*R = I^2R/4 - a 75% reduction in resistive losses. Plus, half-cut modules have two independent strings, so shading one cell only affects half the module instead of the whole thing.',
    },
    {
      title: 'Bypass Diodes',
      description: 'Every module has bypass diodes that activate when cells are shaded or damaged.',
      question: 'What happens when a bypass diode activates?',
      answer: 'When one cell is shaded (producing very low current), it becomes reverse-biased by the string current. Without a diode, it would heat up dangerously (hot spot). The bypass diode provides an alternate current path, sacrificing that cell\'s substring but protecting it from damage.',
    },
    {
      title: 'Glass and Encapsulant Selection',
      description: 'Module efficiency depends on the optical properties of protective layers.',
      question: 'Why use low-iron glass and premium EVA for high-efficiency modules?',
      answer: 'Standard glass absorbs ~4% of light; low-iron glass absorbs only ~2%. Premium EVA has >97% transmission vs ~95% for standard. Together, better materials recover 2-3% relative efficiency. For a 400W module, that\'s 8-12W extra.',
    },
  ];

  const testQuestions = [
    {
      question: 'In a series-connected string of cells, the current is limited by:',
      options: [
        { text: 'The average of all cells', correct: false },
        { text: 'The cell with the lowest current output', correct: true },
        { text: 'The cell with the highest voltage', correct: false },
        { text: 'Current is independent of individual cells', correct: false },
      ],
    },
    {
      question: 'What is the "Cell-to-Module" (CTM) ratio?',
      options: [
        { text: 'The number of cells in a module', correct: false },
        { text: 'Module power / Sum of individual cell powers', correct: true },
        { text: 'Cell efficiency / Module efficiency', correct: false },
        { text: 'The weight ratio of cells to frame', correct: false },
      ],
    },
    {
      question: 'Why do ribbon interconnects cause power loss?',
      options: [
        { text: 'They block light from reaching cells', correct: false },
        { text: 'Current flowing through resistance creates I^2R heat losses', correct: true },
        { text: 'They conduct heat away from the cells', correct: false },
        { text: 'Ribbons reduce the cell voltage', correct: false },
      ],
    },
    {
      question: 'What is "mismatch loss" in a solar module?',
      options: [
        { text: 'Loss from mismatched bypass diodes', correct: false },
        { text: 'Power lost because series cells are limited by the weakest cell', correct: true },
        { text: 'Loss from cells facing different directions', correct: false },
        { text: 'Loss from different cell colors', correct: false },
      ],
    },
    {
      question: 'How much light do glass and EVA typically absorb in a module?',
      options: [
        { text: 'Less than 1%', correct: false },
        { text: 'About 3-5%', correct: true },
        { text: 'About 20%', correct: false },
        { text: 'They don\'t absorb any light', correct: false },
      ],
    },
    {
      question: 'Why is cell binning (sorting by current) important?',
      options: [
        { text: 'To make modules look more uniform', correct: false },
        { text: 'To minimize mismatch losses in series strings', correct: true },
        { text: 'To reduce manufacturing cost', correct: false },
        { text: 'To meet shipping weight limits', correct: false },
      ],
    },
    {
      question: 'One slightly weak cell in a 60-cell module will:',
      options: [
        { text: 'Have no effect - other cells compensate', correct: false },
        { text: 'Reduce module current to match the weak cell\'s current', correct: true },
        { text: 'Increase the module voltage', correct: false },
        { text: 'Only affect that one cell\'s power', correct: false },
      ],
    },
    {
      question: 'The purpose of bypass diodes in a module is to:',
      options: [
        { text: 'Increase voltage output', correct: false },
        { text: 'Provide alternate current path around shaded/weak cells', correct: true },
        { text: 'Convert DC to AC', correct: false },
        { text: 'Store energy during the night', correct: false },
      ],
    },
    {
      question: 'Series resistance losses scale with current as:',
      options: [
        { text: 'Linear (P = I*R)', correct: false },
        { text: 'Quadratic (P = I^2*R)', correct: true },
        { text: 'Inverse (P = R/I)', correct: false },
        { text: 'Constant regardless of current', correct: false },
      ],
    },
    {
      question: 'A typical CTM ratio for a well-made module is approximately:',
      options: [
        { text: '50-60%', correct: false },
        { text: '75-80%', correct: false },
        { text: '95-100% (or even >100% with light capture enhancements)', correct: true },
        { text: 'Over 120%', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showWeakCell: boolean = false) => {
    const width = 400;
    const height = 420;
    const output = calculateModuleOutput();

    const cellWidth = 50;
    const cellHeight = 40;
    const cellGap = 8;
    const startX = 60;
    const startY = 50;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="cellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="weakCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>

          {/* Module frame */}
          <rect x={startX - 15} y={startY - 15} width={(cellWidth + cellGap) * 3 + 20} height={(cellHeight + cellGap) * 2 + 20}
                fill="rgba(0,0,0,0.3)" rx="8" stroke="#4b5563" strokeWidth="2" />

          {/* Cells */}
          {cells.map((cell, idx) => {
            const row = Math.floor(idx / 3);
            const col = idx % 3;
            const x = startX + col * (cellWidth + cellGap);
            const y = startY + row * (cellHeight + cellGap);
            const isWeak = hasWeakCell && idx === weakCellIndex;
            const isLimiting = output.cellStatus[idx]?.isLimiting;

            return (
              <g key={cell.id}>
                {/* Cell */}
                <rect
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  fill={isWeak ? 'url(#weakCellGrad)' : 'url(#cellGrad)'}
                  rx="3"
                  stroke={isLimiting ? colors.warning : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isLimiting ? 2 : 1}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                  onClick={() => interactive && setSelectedCell(idx)}
                />

                {/* Cell info */}
                <text x={x + cellWidth / 2} y={y + 15} fill={colors.textPrimary} fontSize="9" textAnchor="middle">
                  {cell.current.toFixed(1)}A
                </text>
                <text x={x + cellWidth / 2} y={y + 28} fill={colors.textSecondary} fontSize="8" textAnchor="middle">
                  {cell.voltage.toFixed(2)}V
                </text>

                {/* Weak cell indicator */}
                {isWeak && (
                  <text x={x + cellWidth / 2} y={y - 5} fill={colors.error} fontSize="10" textAnchor="middle" fontWeight="bold">
                    WEAK
                  </text>
                )}

                {/* Limiting indicator */}
                {isLimiting && !isWeak && (
                  <circle cx={x + cellWidth - 5} cy={y + 5} r="4" fill={colors.warning} />
                )}

                {/* Ribbon interconnect */}
                {col < 2 && (
                  <rect
                    x={x + cellWidth}
                    y={y + cellHeight / 2 - 2}
                    width={cellGap}
                    height={4}
                    fill={colors.ribbon}
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}

          {/* Series connection between rows */}
          <path
            d={`M ${startX + (cellWidth + cellGap) * 3 - cellGap} ${startY + cellHeight / 2}
                L ${startX + (cellWidth + cellGap) * 3 + 5} ${startY + cellHeight / 2}
                L ${startX + (cellWidth + cellGap) * 3 + 5} ${startY + cellHeight + cellGap + cellHeight / 2}
                L ${startX + (cellWidth + cellGap) * 3 - cellGap} ${startY + cellHeight + cellGap + cellHeight / 2}`}
            fill="none"
            stroke={colors.ribbon}
            strokeWidth="3"
          />

          {/* Current flow arrows */}
          <defs>
            <marker id="arrowhead3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
            </marker>
          </defs>
          <line x1="40" y1={startY + cellHeight / 2} x2="55" y2={startY + cellHeight / 2}
                stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead3)" />
          <text x="30" y={startY + cellHeight / 2 + 15} fill={colors.accent} fontSize="10">I</text>

          {/* Output terminals */}
          <rect x="20" y={startY + cellHeight + cellGap / 2 - 5} width="15" height="10" fill={colors.error} rx="2" />
          <text x="27" y={startY + cellHeight + cellGap / 2 + 3} fill="white" fontSize="8" textAnchor="middle">-</text>

          <rect x={startX + (cellWidth + cellGap) * 3 + 10} y={startY + cellHeight + cellGap / 2 - 5} width="15" height="10" fill={colors.success} rx="2" />
          <text x={startX + (cellWidth + cellGap) * 3 + 17} y={startY + cellHeight + cellGap / 2 + 3} fill="white" fontSize="8" textAnchor="middle">+</text>

          {/* Loss waterfall */}
          <g transform="translate(20, 180)">
            <text x="180" y="0" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">Power Loss Breakdown</text>

            {/* Ideal power bar */}
            <rect x="20" y="15" width="320" height="20" fill="rgba(16, 185, 129, 0.3)" rx="4" />
            <text x="30" y="30" fill={colors.textPrimary} fontSize="9">Ideal: {output.idealTotalPower.toFixed(1)}W</text>

            {/* Mismatch loss */}
            <rect x="20" y="40" width={Math.max(1, 320 * output.mismatchPercent / 20)} height="15" fill={colors.error} rx="2" />
            <text x="30" y="52" fill={colors.textPrimary} fontSize="8">Mismatch: -{output.mismatchLoss.toFixed(2)}W ({output.mismatchPercent.toFixed(1)}%)</text>

            {/* Ribbon loss */}
            <rect x="20" y="60" width={Math.max(1, 320 * output.ribbonLossPercent / 20)} height="15" fill={colors.warning} rx="2" />
            <text x="30" y="72" fill={colors.textPrimary} fontSize="8">Ribbon Rs: -{output.ribbonPowerLoss.toFixed(2)}W ({output.ribbonLossPercent.toFixed(1)}%)</text>

            {/* Optical loss */}
            <rect x="20" y="80" width={Math.max(1, 320 * output.opticalLoss / 20)} height="15" fill={colors.solar} rx="2" />
            <text x="30" y="92" fill={colors.textPrimary} fontSize="8">Optical: -{(output.stringPower * output.opticalLoss / 100).toFixed(2)}W ({output.opticalLoss.toFixed(1)}%)</text>

            {/* Final output */}
            <rect x="20" y="105" width={320 * output.ctmRatio / 100} height="20" fill={colors.success} rx="4" />
            <text x="30" y="120" fill={colors.textPrimary} fontSize="9" fontWeight="bold">
              Module: {output.modulePower.toFixed(1)}W (CTM: {output.ctmRatio.toFixed(1)}%)
            </text>
          </g>

          {/* Module specs */}
          <g transform="translate(250, 55)">
            <rect x="0" y="0" width="130" height="90" fill="rgba(0,0,0,0.5)" rx="8" stroke={colors.accent} strokeWidth="1" />
            <text x="65" y="18" fill={colors.textSecondary} fontSize="10" textAnchor="middle">STRING OUTPUT</text>

            <text x="10" y="38" fill={colors.textMuted} fontSize="9">Voltage:</text>
            <text x="120" y="38" fill={colors.textPrimary} fontSize="10" textAnchor="end">{output.effectiveVoltage.toFixed(2)} V</text>

            <text x="10" y="55" fill={colors.textMuted} fontSize="9">Current:</text>
            <text x="120" y="55" fill={colors.textPrimary} fontSize="10" textAnchor="end">{output.minCurrent.toFixed(2)} A</text>

            <text x="10" y="72" fill={colors.textMuted} fontSize="9">Power:</text>
            <text x="120" y="72" fill={colors.success} fontSize="11" textAnchor="end" fontWeight="bold">{output.modulePower.toFixed(1)} W</text>

            <text x="10" y="85" fill={colors.textMuted} fontSize="8">CTM Ratio:</text>
            <text x="120" y="85" fill={colors.accent} fontSize="9" textAnchor="end">{output.ctmRatio.toFixed(1)}%</text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            {showWeakCell && (
              <button
                onClick={() => setHasWeakCell(!hasWeakCell)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasWeakCell ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {hasWeakCell ? 'Remove Weak Cell' : 'Add Weak Cell'}
              </button>
            )}
            <button
              onClick={() => {
                setHasWeakCell(false);
                setRibbonResistance(2);
                setEncapsulantTransmission(96);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Weak Cell Position
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <button
                key={idx}
                onClick={() => { setWeakCellIndex(idx); setHasWeakCell(true); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: weakCellIndex === idx && hasWeakCell ? `2px solid ${colors.error}` : '1px solid rgba(255,255,255,0.2)',
                  background: weakCellIndex === idx && hasWeakCell ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Cell {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Ribbon Resistance: {ribbonResistance} mOhm per joint
        </label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={ribbonResistance}
          onChange={(e) => setRibbonResistance(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Encapsulant Transmission: {encapsulantTransmission}%
        </label>
        <input
          type="range"
          min="90"
          max="99"
          step="0.5"
          value={encapsulantTransmission}
          onChange={(e) => setEncapsulantTransmission(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          CTM = (Module Power) / (Sum of Cell Powers)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Target: 95-100%+ (can exceed 100% with light capture gains)
        </div>
      </div>
    </div>
  );

  // Navigation function
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

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  const currentIdx = phaseOrder.indexOf(phase);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: currentIdx > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentIdx > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          {phaseLabels[phase]}
        </span>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={currentIdx === 0}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
          fontWeight: 'bold',
          cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: currentIdx > 0 ? 1 : 0.5,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Back
      </button>
      <span style={{ color: colors.textMuted, fontSize: '12px' }}>
        {phaseLabels[phase]}
      </span>
      <button
        onClick={goNext}
        disabled={!canProceed}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Cell-to-Module Losses
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If each cell is 0.6V, why isn't the module perfect?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                A solar module connects many cells in series. 6 cells at 0.68V each should give
                4.08V, right? But real modules lose power to ribbon resistance, cell mismatch,
                and optical absorption. Let's see where the watts go!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Understanding these losses is key to module design and optimization.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch how losses accumulate as current flows through the string!
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Assembly:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Six 22% efficient cells are connected in series with copper ribbons, then
              encapsulated in glass and EVA. The cells alone would produce about 32W. How much
              power will the assembled module actually deliver?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How much power is lost going from cells to module?
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Module Builder</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore how interconnects and encapsulation affect power
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
              <li>Increase ribbon resistance - watch I^2R losses grow</li>
              <li>Decrease encapsulant transmission - see optical losses</li>
              <li>Notice how losses compound multiplicatively</li>
              <li>Try to maximize the CTM ratio above 95%</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'significant';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
              Multiple loss mechanisms combine to reduce module power by 3-8% compared to the sum
              of individual cell powers. Understanding and minimizing these losses is crucial for
              high-performance modules!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Cell-to-Module Loss Mechanisms</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Ribbon Resistance (1-2%):</strong> Solder
                joints and ribbon cross-section create series resistance. P = I^2R scales with current
                squared, so high-current cells lose more.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Optical Losses (3-5%):</strong> Glass
                absorbs ~2%, EVA absorbs ~1-2%, and there's reflection at each interface. Premium
                low-iron glass and high-transmission EVA recover 1-2%.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Mismatch (0-3%):</strong> Series cells
                are limited by the weakest. Even small current variations cause losses. Cell binning
                minimizes this.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>CTM Ratio:</strong> Modern modules
                achieve 95-98% CTM. Some designs exceed 100% by capturing edge light with white
                backsheets or reflective frames!
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when ONE cell is slightly weaker?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine one cell in the string produces only 8.5A instead of 10.5A (maybe it's
              partially shaded or has a manufacturing defect). What happens to the whole module?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does one weak cell affect the module?
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Weak Cell Problem</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Add a weak cell and see the whole string suffer
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The series connection forces ALL cells to operate at the weakest cell's current.
              The stronger cells could produce more power, but they're forced to "throttle down."
              This is why cell matching and bypass diodes are so important!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'worse';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
              One weak cell limits the entire string! In series, current must be the same through
              all cells, so the weakest cell becomes the bottleneck. This is why manufacturers
              carefully bin cells and why bypass diodes are essential.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Series Connection Problem</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Current Limiting:</strong> In a series
                circuit, the same current flows through all cells. One cell producing 8.5A forces
                all cells to operate at 8.5A - wasting the capacity of the 10.5A cells.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Loss:</strong> If 5 cells could
                produce 10.5A but are forced to 8.5A, the loss is 5 × (10.5-8.5) × 0.68 = 6.8W from
                mismatch alone - about 20% of module power!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Solutions:</strong> Cell binning ensures
                similar currents. Bypass diodes let current skip severely limited cells (with some
                voltage loss). Half-cut cells reduce mismatch impact to half the module.
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              CTM optimization matters in commercial module manufacturing
            </p>
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
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
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
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
                {testScore >= 8 ? 'You\'ve mastered cell-to-module losses!' : 'Review the material and try again.'}
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
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered cell-to-module losses!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Series connection current limiting</li>
              <li>Ribbon/interconnect resistance (I^2R) losses</li>
              <li>Optical losses from glass and encapsulant</li>
              <li>Mismatch loss and the importance of cell binning</li>
              <li>CTM ratio optimization strategies</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Advanced module designs can actually achieve CTM ratios above 100%! Techniques include
              white backsheets that reflect stray light back into cells, bifacial modules that
              capture rear-side light, and edge collection with reflective frames. The best modern
              modules lose less than 2% in the cell-to-module transition!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default CellToModuleLossesRenderer;
