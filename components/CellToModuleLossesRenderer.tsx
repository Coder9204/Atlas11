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
    const startY = 30;

    // Generate a power curve path with 12+ data points for the loss waterfall chart
    const curveStartY = 200;
    const curveHeight = 180;
    const curvePoints: { x: number; y: number }[] = [];
    const numPoints = 15;
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const px = 30 + t * 340;
      // Create a curve that drops from ideal power to module power
      const lossProgress = t * t; // quadratic drop
      const py = curveStartY + lossProgress * curveHeight;
      curvePoints.push({ x: px, y: py });
    }
    const curvePath = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Compute interactive point position based on ribbon resistance (slider-driven)
    // ribbonResistance ranges from 0.5 to 10
    const resistanceFraction = Math.min(1, Math.max(0, (ribbonResistance - 0.5) / 9.5));
    const markerIdx = Math.min(numPoints - 1, Math.max(0, Math.round(resistanceFraction * (numPoints - 1))));
    const markerCx = curvePoints[markerIdx].x;
    const markerCy = curvePoints[markerIdx].y;

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
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
          </defs>

          {/* Grid lines for visual reference */}
          <line x1="30" y1="100" x2="370" y2="100" stroke="#4b5563" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="200" x2="370" y2="200" stroke="#4b5563" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="300" x2="370" y2="300" stroke="#4b5563" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="400" x2="370" y2="400" stroke="#4b5563" strokeDasharray="4 4" opacity="0.3" />

          {/* Module frame */}
          <rect x={startX - 15} y={startY - 10} width={(cellWidth + cellGap) * 3 + 20} height={(cellHeight + cellGap) * 2 + 15}
                fill="rgba(0,0,0,0.3)" rx="8" stroke="#4b5563" strokeWidth="2" filter="url(#shadow)" />

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

                {/* Cell current */}
                <text x={x + cellWidth / 2} y={y + 18} fill={colors.textPrimary} fontSize="11" textAnchor="middle">
                  {cell.current.toFixed(1)}A
                </text>
                {/* Cell voltage */}
                <text x={x + cellWidth / 2} y={y + 33} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
                  {cell.voltage.toFixed(2)}V
                </text>

                {/* Weak cell indicator */}
                {isWeak && (
                  <text x={x + cellWidth / 2} y={startY - 14} fill={colors.error} fontSize="11" textAnchor="middle" fontWeight="bold">
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
          <line x1={startX + (cellWidth + cellGap) * 3 - cellGap} y1={startY + cellHeight / 2} x2={startX + (cellWidth + cellGap) * 3 + 5} y2={startY + cellHeight / 2} stroke={colors.ribbon} strokeWidth="3" />
          <line x1={startX + (cellWidth + cellGap) * 3 + 5} y1={startY + cellHeight / 2} x2={startX + (cellWidth + cellGap) * 3 + 5} y2={startY + cellHeight + cellGap + cellHeight / 2} stroke={colors.ribbon} strokeWidth="3" />
          <line x1={startX + (cellWidth + cellGap) * 3 + 5} y1={startY + cellHeight + cellGap + cellHeight / 2} x2={startX + (cellWidth + cellGap) * 3 - cellGap} y2={startY + cellHeight + cellGap + cellHeight / 2} stroke={colors.ribbon} strokeWidth="3" />

          {/* Current flow arrow */}
          <defs>
            <marker id="arrowhead3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
            </marker>
          </defs>
          <line x1="40" y1={startY + cellHeight / 2} x2="55" y2={startY + cellHeight / 2}
                stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead3)" />
          <text x="15" y={startY + cellHeight / 2 + 4} fill={colors.accent} fontSize="12">Current</text>

          {/* Power curve showing loss progression */}
          <path d={curvePath} fill="none" stroke={colors.accent} strokeWidth="2" />

          {/* Interactive point on curve - position scales with total losses */}
          <circle
            cx={markerCx}
            cy={markerCy}
            r={8}
            fill={colors.accent}
            filter="url(#glow)"
            stroke="#fff"
            strokeWidth={2}
          />

          {/* Axis labels */}
          <text x="200" y="195" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Power Loss Breakdown</text>

          {/* Loss labels - positioned to avoid overlap */}
          <text x="40" y="220" fill={colors.textPrimary} fontSize="11" textAnchor="start">
            Ideal: {output.idealTotalPower.toFixed(1)}W
          </text>
          <text x="40" y="250" fill={colors.error} fontSize="11" textAnchor="start">
            Mismatch: -{output.mismatchLoss.toFixed(2)}W
          </text>
          <text x="40" y="270" fill={colors.warning} fontSize="11" textAnchor="start">
            Ribbon: -{output.ribbonPowerLoss.toFixed(2)}W
          </text>
          <text x="40" y="290" fill={colors.solar} fontSize="11" textAnchor="start">
            Optical: -{(output.stringPower * output.opticalLoss / 100).toFixed(2)}W
          </text>

          {/* Loss bars */}
          <rect x="240" y="236" width={Math.max(2, 120 * output.mismatchPercent / 10)} height="12" fill={colors.error} rx="2" />
          <rect x="240" y="256" width={Math.max(2, 120 * output.ribbonLossPercent / 10)} height="12" fill={colors.warning} rx="2" />
          <rect x="240" y="276" width={Math.max(2, 120 * output.opticalLoss / 10)} height="12" fill={colors.solar} rx="2" />

          {/* Module output */}
          <rect x="40" y="310" width={320 * output.ctmRatio / 100} height="18" fill={colors.success} rx="4" />
          <text x="200" y="324" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="bold">
            Module: {output.modulePower.toFixed(1)}W (CTM: {output.ctmRatio.toFixed(1)}%)
          </text>

          {/* String output specs */}
          <text x="40" y="360" fill={colors.textMuted} fontSize="11">Voltage: {output.effectiveVoltage.toFixed(2)} V</text>
          <text x="200" y="360" fill={colors.textMuted} fontSize="11">Current: {output.minCurrent.toFixed(2)} A</text>
          <text x="310" y="360" fill={colors.success} fontSize="12" fontWeight="bold">Power: {output.modulePower.toFixed(1)} W</text>

          {/* CTM label at bottom */}
          <text x="200" y="400" fill={colors.accent} fontSize="12" textAnchor="middle">CTM Ratio: {output.ctmRatio.toFixed(1)}%</text>
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
          aria-label="Ribbon Resistance slider"
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          aria-label="Encapsulant Transmission slider"
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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

  // Real-world applications data
  const realWorldApps = [
    {
      icon: '🏭',
      title: 'Solar Module Manufacturing',
      short: 'Yield Optimization',
      tagline: 'Maximizing watt output per manufacturing dollar',
      description: 'Solar module manufacturing is a precision process where understanding and minimizing cell-to-module (CTM) losses directly impacts profitability. Every percentage point of CTM improvement translates to millions of dollars in revenue for gigawatt-scale manufacturers.',
      connection: 'Manufacturing lines must optimize every loss mechanism we explored: ribbon soldering quality affects series resistance, cell binning reduces mismatch losses, and encapsulant selection determines optical transmission. A 1% CTM improvement on a 5 GW annual production line represents 50 MW of additional power output.',
      howItWorks: 'Automated optical inspection systems measure cell current output before assembly, sorting cells into bins with matching characteristics. Precision soldering robots apply optimized ribbon geometries with controlled solder volume. Lamination processes are tuned for maximum EVA transmission while ensuring 25-year durability. Statistical process control monitors CTM ratios in real-time.',
      stats: [
        { value: '98-100%', label: 'Modern CTM ratio targets' },
        { value: '0.1%', label: 'Binning precision tolerance' },
        { value: '$2-5M', label: 'Value of 1% CTM improvement per GW' },
      ],
      examples: [
        'High-efficiency PERC and TOPCon module production',
        'Heterojunction cell assembly with ultra-thin wafers',
        'Shingled cell module manufacturing',
        'Tandem cell integration requiring precise matching',
      ],
      companies: [
        'LONGi Green Energy',
        'JinkoSolar',
        'Trina Solar',
        'Canadian Solar',
        'JA Solar',
      ],
      futureImpact: 'AI-powered manufacturing is enabling real-time CTM optimization. Machine learning algorithms predict optimal cell pairing, adjust soldering parameters on-the-fly, and identify process drift before yield impacts occur. The goal is zero-loss CTM ratios where module power exceeds cell power sum through light capture enhancements.',
      color: '#f59e0b',
    },
    {
      icon: '🚗',
      title: 'Electric Vehicle Solar Roofs',
      short: 'Integrated PV',
      tagline: 'Harvesting sunlight to extend EV driving range',
      description: 'Automotive-integrated photovoltaics embed solar cells into vehicle body panels, particularly roofs, to generate supplemental charging power. The curved, space-constrained environment makes CTM optimization critical for maximizing the limited available area.',
      connection: 'EV solar roofs face unique CTM challenges: cells must follow compound curves, interconnects must survive vehicle vibration, and optical layers must meet automotive durability standards. Mismatch losses are amplified because partial shading from buildings, trees, and roof racks is constant during driving.',
      howItWorks: 'Flexible or segmented cells conform to roof curvature using specialized interconnect designs that accommodate thermal expansion mismatch between cells and metal body panels. Multi-string architectures with per-string power optimizers minimize shading losses. Automotive-grade lamination uses tough materials that maintain optical clarity after years of UV exposure and car washes.',
      stats: [
        { value: '200W', label: 'Typical EV solar roof peak output' },
        { value: '1000-1500', label: 'Annual km range extension' },
        { value: '3-5%', label: 'Additional CTM loss vs flat panels' },
      ],
      examples: [
        'Hyundai Ioniq 5/6 solar roof option',
        'Toyota Prius Prime solar package',
        'Lightyear 0 full-body solar integration',
        'Sono Sion 456-cell solar body panels',
      ],
      companies: [
        'Hyundai',
        'Toyota',
        'Lightyear',
        'Sono Motors',
        'Panasonic',
      ],
      futureImpact: 'Vehicle-integrated solar is advancing toward full-body coverage with cells embedded in hoods, doors, and rear panels. Perovskite-silicon tandem cells may double efficiency in the same area. Smart routing algorithms will optimize power flow as different body sections experience varying shade patterns throughout the day.',
      color: '#3b82f6',
    },
    {
      icon: '🏢',
      title: 'Building-Integrated Photovoltaics',
      short: 'BIPV',
      tagline: 'Turning building facades into power plants',
      description: 'Building-integrated photovoltaics replace conventional building materials with electricity-generating components. Facades, skylights, and cladding become active power sources, but architectural constraints create significant CTM optimization challenges.',
      connection: 'BIPV installations face extreme CTM challenges: vertical facades receive oblique sunlight, partial shading from neighboring structures is unavoidable, and aesthetic requirements may prohibit optimal cell arrangements. Understanding mismatch and optical losses is essential for predicting realistic BIPV output.',
      howItWorks: 'BIPV modules use specialized glass-glass construction for structural integrity and fire safety. Cells may be spaced apart for semi-transparency, accepting optical losses for daylighting benefits. Multiple independent strings with micro-inverters handle the varying irradiance across building surfaces. Low-iron glass and anti-reflective coatings recover precious photons from low sun angles.',
      stats: [
        { value: '50-70%', label: 'BIPV output vs optimal rooftop' },
        { value: '40%', label: 'Of building energy from facades possible' },
        { value: '25-30yr', label: 'BIPV system design life' },
      ],
      examples: [
        'Solar facade cladding on commercial towers',
        'Semi-transparent solar skylights and atriums',
        'Solar shading louvers and awnings',
        'Photovoltaic noise barriers along highways',
      ],
      companies: [
        'Onyx Solar',
        'SunPower',
        'Hanwha Q Cells',
        'Tesla Solar Glass',
        'Mitrex',
      ],
      futureImpact: 'Colored and patterned solar cells are enabling BIPV that matches any architectural vision without visible solar cell appearance. Transparent solar windows using organic or quantum dot technology may turn entire glass facades into power sources. Digital twin modeling optimizes cell string layouts for each building unique shadow patterns.',
      color: '#10b981',
    },
    {
      icon: '🛰️',
      title: 'Space Solar Panels',
      short: 'Extreme Efficiency',
      tagline: 'Where every watt matters for mission success',
      description: 'Space solar arrays power satellites and spacecraft where mass and reliability are paramount. CTM losses in space applications are engineered to absolute minimums because every gram of solar panel mass costs thousands of dollars to launch, and there are no repair options.',
      connection: 'Space solar pushes CTM optimization to extremes: triple-junction cells costing $300/watt demand zero mismatch losses, interconnects must survive 10,000+ thermal cycles from -150°C to +150°C, and optical coatings must resist atomic oxygen and UV degradation for 15+ year missions.',
      howItWorks: 'Space-grade cells are individually characterized and matched within 0.5% current tolerance. Welded interconnects using specialized alloys maintain conductivity through extreme thermal cycling. Coverglass with anti-reflective coatings optimized for the AM0 spectrum maximizes absorption. Bypass diodes protect strings from single-cell failures that would otherwise cascade.',
      stats: [
        { value: '>30%', label: 'Triple-junction cell efficiency' },
        { value: '99%+', label: 'Space solar CTM ratio target' },
        { value: '$1M/kg', label: 'Cost to launch to GEO orbit' },
      ],
      examples: [
        'International Space Station solar arrays',
        'Mars rovers and landers solar power',
        'Geostationary communication satellites',
        'Deep space probe deployable arrays',
      ],
      companies: [
        'SpaceX',
        'Boeing',
        'Airbus Defence and Space',
        'Northrop Grumman',
        'SolAero Technologies',
      ],
      futureImpact: 'Space-based solar power stations may beam gigawatts of energy to Earth using microwave transmission. Six-junction cells approaching 50% efficiency are in development. Autonomous assembly robots could construct massive solar arrays in orbit, making CTM losses from manufacturing imperfections a thing of the past through in-space quality control.',
      color: '#8b5cf6',
    },
  ];

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            minHeight: '44px',
            borderRadius: '6px',
            border: 'none',
            background: currentIdx > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentIdx > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            transition: 'all 0.3s ease',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            role="button"
            aria-label={`${phaseLabels[p]} phase`}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
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
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
          fontWeight: 'bold',
          cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: currentIdx > 0 ? 1 : 0.5,
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.3s ease',
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
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #d97706)` : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.3s ease',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                A solar module connects many cells in series. 6 cells at 0.68V each should give
                4.08V, right? But real modules lose power to ribbon resistance, cell mismatch,
                and optical absorption. Let's see where the watts go!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                Understanding these losses is key to module design and optimization.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                Watch how losses accumulate as current flows through the string!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 1 of 2: Make your prediction</span>
          </div>
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
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.3s ease',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Module Builder</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore how interconnects and encapsulation affect power
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.solar}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
              Observe how the power loss breakdown changes as you adjust the sliders below. This is important for real-world solar module design and engineering - every 1% improvement in CTM ratio is useful for increasing power output and reducing cost per watt in the industry.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
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
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              As you predicted, multiple loss mechanisms combine to reduce module power by 3-8% compared to the sum
              of individual cell powers. You saw how ribbons, optics, and mismatch each contribute. Understanding and minimizing these losses is crucial for
              high-performance modules!
            </p>
          </div>

          {/* Visual diagram for review phase */}
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Cell-to-Module Loss Mechanisms</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px', fontWeight: 'normal' }}>
                <strong style={{ color: colors.textPrimary }}>Ribbon Resistance (1-2%):</strong> Solder
                joints and ribbon cross-section create series resistance. P = I^2R scales with current
                squared, so high-current cells lose more.
              </p>
              <p style={{ marginBottom: '12px', fontWeight: 'normal' }}>
                <strong style={{ color: colors.textPrimary }}>Optical Losses (3-5%):</strong> Glass
                absorbs ~2%, EVA absorbs ~1-2%, and there's reflection at each interface. Premium
                low-iron glass and high-transmission EVA recover 1-2%.
              </p>
              <p style={{ marginBottom: '12px', fontWeight: 'normal' }}>
                <strong style={{ color: colors.textPrimary }}>Mismatch (0-3%):</strong> Series cells
                are limited by the weakest. Even small current variations cause losses. Cell binning
                minimizes this.
              </p>
              <p style={{ fontWeight: 'normal' }}>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when ONE cell is slightly weaker?
            </p>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 1 of 2: Make your prediction</span>
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
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.3s ease',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Weak Cell Problem</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Add a weak cell and see the whole string suffer
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.solar}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
              Observe how adding a weak cell affects the entire string's power output.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
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
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              One weak cell limits the entire string! In series, current must be the same through
              all cells, so the weakest cell becomes the bottleneck. This is why manufacturers
              carefully bin cells and why bypass diodes are essential.
            </p>
          </div>

          {/* Visual diagram for twist_review phase */}
          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Series Connection Problem</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px', fontWeight: 'normal' }}>
                <strong style={{ color: colors.textPrimary }}>Current Limiting:</strong> In a series
                circuit, the same current flows through all cells. One cell producing 8.5A forces
                all cells to operate at 8.5A - wasting the capacity of the 10.5A cells.
              </p>
              <p style={{ marginBottom: '12px', fontWeight: 'normal' }}>
                <strong style={{ color: colors.textPrimary }}>Power Loss:</strong> If 5 cells could
                produce 10.5A but are forced to 8.5A, the loss is 5 × (10.5-8.5) × 0.68 = 6.8W from
                mismatch alone - about 20% of module power!
              </p>
              <p style={{ fontWeight: 'normal' }}>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
              CTM optimization matters because it directly affects the economics of solar energy. A 1% improvement in CTM ratio saves $2-5M per GW of production, which is why manufacturers invest heavily in precision cell matching, premium encapsulants, and quality control.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
              Application {transferCompleted.size + 1} of {transferApplications.length} - Complete all to unlock the test
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
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '8px 16px',
                      minHeight: '44px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.accent}`,
                      background: 'transparent',
                      color: colors.accent,
                      cursor: 'pointer',
                      fontSize: '13px',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Reveal Answer
                  </button>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '8px 16px',
                      minHeight: '44px',
                      borderRadius: '6px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '12px' }}>{app.answer}</p>
                  <button
                    onClick={() => {}}
                    style={{
                      padding: '8px 16px',
                      minHeight: '44px',
                      borderRadius: '6px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      WebkitTapHighlightColor: 'transparent',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Continue
                  </button>
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
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', fontWeight: 400 }}>
              Test your understanding of cell-to-module (CTM) losses in solar modules. These questions cover series connections, ribbon resistance, mismatch losses, and optimization strategies that are critical for real-world module manufacturing and power output maximization.
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s ease' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                Q{currentTestQuestion + 1} of {testQuestions.length}
              </p>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 400 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.3s ease',
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
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.3s ease',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.3s ease',
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
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.3s ease',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }} role="img" aria-label="trophy">{'\u{1F3C6}'}</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 400 }}>You've mastered cell-to-module losses!</p>
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
