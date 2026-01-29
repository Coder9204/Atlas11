import React, { useState, useEffect, useCallback } from 'react';

interface BypassDiodesRendererProps {
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
  solar: '#fbbf24',
  solarGlow: 'rgba(251, 191, 36, 0.3)',
  shaded: '#475569',
  hotspot: '#dc2626',
  bypass: '#22c55e',
  current: '#3b82f6',
  power: '#a855f7',
  optimizer: '#06b6d4',
};

const BypassDiodesRenderer: React.FC<BypassDiodesRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [shadedCells, setShadedCells] = useState<Set<number>>(new Set()); // Which cells are shaded (0-5 representing 6 cells)
  const [bypassEnabled, setBypassEnabled] = useState(true);
  const [showCurrentFlow, setShowCurrentFlow] = useState(true);
  const [hasOptimizers, setHasOptimizers] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Panel specifications
  const CELLS_PER_STRING = 6; // Simplified: 6 cells shown (real panels have 60-72)
  const CELL_VOLTAGE = 0.6; // V per cell
  const CELL_CURRENT = 10; // A at full sun
  const STRINGS = 3; // Three strings of cells in series

  // Physics calculations
  const calculatePanelOutput = useCallback(() => {
    const numShadedCells = shadedCells.size;

    // Without bypass diodes and optimizers
    if (!bypassEnabled && !hasOptimizers) {
      // In series, current is limited by worst cell
      // If ANY cell is shaded, it limits the entire string current
      // Shaded cell might even become reverse-biased (hot spot)
      if (numShadedCells > 0) {
        // Shaded cells can only pass ~10% of normal current
        const limitedCurrent = CELL_CURRENT * 0.1;
        const totalVoltage = CELLS_PER_STRING * STRINGS * CELL_VOLTAGE;
        const power = totalVoltage * limitedCurrent;

        // Hot spot potential: reverse voltage across shaded cell
        const reverseVoltage = (CELLS_PER_STRING - 1) * CELL_VOLTAGE;

        return {
          current: limitedCurrent,
          voltage: totalVoltage,
          power,
          efficiency: (power / (CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT)) * 100,
          hotSpotRisk: true,
          reverseVoltage,
          activeBypass: false,
          bypassedStrings: 0,
        };
      }
    }

    // With bypass diodes (standard panel)
    if (bypassEnabled && !hasOptimizers) {
      // Bypass diodes protect strings (typically 1 diode per 20-24 cells)
      // For our 6-cell demo, assume 1 string = 2 cells
      // If a cell is shaded, its string is bypassed

      // Calculate which strings are affected
      const string1Shaded = shadedCells.has(0) || shadedCells.has(1);
      const string2Shaded = shadedCells.has(2) || shadedCells.has(3);
      const string3Shaded = shadedCells.has(4) || shadedCells.has(5);

      let activeStrings = 3;
      if (string1Shaded) activeStrings--;
      if (string2Shaded) activeStrings--;
      if (string3Shaded) activeStrings--;

      const bypassedStrings = 3 - activeStrings;

      // Current flows through bypass diodes around shaded strings
      const current = CELL_CURRENT;
      // Voltage comes only from active strings (minus diode drop)
      const voltage = activeStrings * 2 * CELL_VOLTAGE - (bypassedStrings > 0 ? 0.7 * bypassedStrings : 0);
      const power = Math.max(0, voltage * current);

      return {
        current,
        voltage: Math.max(0, voltage),
        power,
        efficiency: (power / (CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT)) * 100,
        hotSpotRisk: false,
        reverseVoltage: 0,
        activeBypass: bypassedStrings > 0,
        bypassedStrings,
      };
    }

    // With optimizers (MLPE - module-level power electronics)
    if (hasOptimizers) {
      // Each cell (or small group) has its own optimizer
      // Shaded cells operate at their own MPP, don't affect others
      const activeCells = CELLS_PER_STRING - numShadedCells;
      const shadedCellPower = numShadedCells * (CELL_VOLTAGE * CELL_CURRENT * 0.1);
      const activeCellPower = activeCells * (CELL_VOLTAGE * CELL_CURRENT);

      // Optimizers convert to common bus voltage
      const totalPower = (activeCellPower + shadedCellPower) * STRINGS;

      return {
        current: CELL_CURRENT,
        voltage: STRINGS * CELLS_PER_STRING * CELL_VOLTAGE,
        power: totalPower,
        efficiency: (totalPower / (CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT)) * 100,
        hotSpotRisk: false,
        reverseVoltage: 0,
        activeBypass: false,
        bypassedStrings: 0,
      };
    }

    // No shading - full output
    const fullPower = CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT;
    return {
      current: CELL_CURRENT,
      voltage: CELLS_PER_STRING * STRINGS * CELL_VOLTAGE,
      power: fullPower,
      efficiency: 100,
      hotSpotRisk: false,
      reverseVoltage: 0,
      activeBypass: false,
      bypassedStrings: 0,
    };
  }, [shadedCells, bypassEnabled, hasOptimizers]);

  // Animation effect for current flow
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      // Animation handled by CSS
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const values = calculatePanelOutput();

  const toggleCellShade = (cellIndex: number) => {
    const newShaded = new Set(shadedCells);
    if (newShaded.has(cellIndex)) {
      newShaded.delete(cellIndex);
    } else {
      newShaded.add(cellIndex);
    }
    setShadedCells(newShaded);
  };

  const predictions = [
    { id: 'proportional', label: 'Power drops proportionally to shaded area (1/6 shade = 1/6 power loss)' },
    { id: 'worse', label: 'Power drops MORE than proportionally - shade on one cell affects the whole panel' },
    { id: 'better', label: 'Power drops LESS than proportionally - other cells compensate' },
    { id: 'no_effect', label: 'Shading one cell has no effect on total power' },
  ];

  const twistPredictions = [
    { id: 'optimizers_help', label: 'Microinverters/optimizers make each cell independent, solving the problem' },
    { id: 'bypass_enough', label: 'Bypass diodes completely solve the shading problem' },
    { id: 'nothing_helps', label: 'No technology can overcome the series connection limitation' },
    { id: 'parallel_better', label: 'Connecting cells in parallel instead would solve everything' },
  ];

  const transferApplications = [
    {
      title: 'Residential Rooftop Shading',
      description: 'A chimney shadow crosses one panel in a residential array every afternoon, causing the whole string to underperform.',
      question: 'What solutions exist for residential shading problems?',
      answer: 'Options include: 1) Module-level power optimizers (SolarEdge, Tigo) that let each panel operate independently, 2) Microinverters (Enphase) that convert DC to AC at each panel, 3) Repositioning panels or using smaller panels to avoid shadow paths, 4) String design that groups shaded panels together to minimize impact.',
    },
    {
      title: 'Commercial Solar with Rooftop Equipment',
      description: 'Commercial roofs have HVAC units, vents, and equipment that create complex shade patterns throughout the day.',
      question: 'Why are power optimizers almost standard for commercial installations?',
      answer: 'Commercial roofs have unavoidable obstructions. Without optimizers, a single shaded panel could reduce a 20-panel string by 30-50%. Optimizers cost ~$50-100/panel but can recover 10-25% of production. They also provide panel-level monitoring to identify underperforming modules, required for many commercial contracts.',
    },
    {
      title: 'Utility-Scale Hot Spot Failures',
      description: 'A large solar farm experienced panel fires traced to hot spots in cells under bird droppings and accumulated debris.',
      question: 'How do hot spots cause panel fires, and how are they prevented?',
      answer: 'When a shaded cell is forced to carry string current, it becomes reverse-biased and dissipates power as heat (P = I²R). Temperatures can exceed 150°C, melting solder and igniting encapsulant. Prevention: Bypass diodes (standard), regular cleaning, IR drone inspections to find hot spots before failure, and proper electrical design.',
    },
    {
      title: 'Solar Highways and Vehicle Shading',
      description: 'Solar panel installations along highways and in parking lots face intermittent shading from vehicles and signage.',
      question: 'What technology makes roadside and parking lot solar viable?',
      answer: 'AC microinverters or DC optimizers are essential for these applications. Rapid shade changes from passing vehicles would devastate traditional string systems. Microinverters respond in milliseconds, capturing energy from sunny panels while shaded ones recover. Some installations use bifacial panels that capture reflected light from pavement.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does shading one cell in a series string affect the entire string?',
      options: [
        { text: 'The shaded cell blocks light from reaching others', correct: false },
        { text: 'In series, current must be equal through all cells - the weakest cell limits the whole string', correct: true },
        { text: 'The shaded cell absorbs power from other cells', correct: false },
        { text: 'Shading causes the inverter to shut down', correct: false },
      ],
    },
    {
      question: 'What is a hot spot in a solar panel?',
      options: [
        { text: 'A cell that is more efficient than others', correct: false },
        { text: 'A shaded cell that becomes reverse-biased and dissipates power as heat', correct: true },
        { text: 'A cell that receives more sunlight', correct: false },
        { text: 'A defect in the manufacturing process', correct: false },
      ],
    },
    {
      question: 'What is the purpose of a bypass diode?',
      options: [
        { text: 'To increase the voltage output of the panel', correct: false },
        { text: 'To allow current to flow around shaded cell groups, preventing hot spots', correct: true },
        { text: 'To convert DC to AC power', correct: false },
        { text: 'To store excess energy', correct: false },
      ],
    },
    {
      question: 'If one cell in a string of 20 cells is completely shaded (no bypass diodes), what happens?',
      options: [
        { text: 'The string loses exactly 5% (1/20) of its power', correct: false },
        { text: 'The string loses only the power from that one cell', correct: false },
        { text: 'The entire string current is limited to what the shaded cell can pass, losing most power', correct: true },
        { text: 'The other 19 cells compensate automatically', correct: false },
      ],
    },
    {
      question: 'What is a microinverter?',
      options: [
        { text: 'A very small solar panel', correct: false },
        { text: 'A device that converts DC to AC at each individual panel', correct: true },
        { text: 'A tiny battery for each cell', correct: false },
        { text: 'A microscope for inspecting solar cells', correct: false },
      ],
    },
    {
      question: 'How do power optimizers (like SolarEdge) help with shading?',
      options: [
        { text: 'They remove shadows using mirrors', correct: false },
        { text: 'They allow each panel to operate at its own optimal point regardless of others', correct: true },
        { text: 'They make panels immune to temperature effects', correct: false },
        { text: 'They are only useful at night', correct: false },
      ],
    },
    {
      question: 'A typical bypass diode in a 72-cell panel protects how many cells?',
      options: [
        { text: 'Just 1 cell', correct: false },
        { text: 'About 24 cells (panels usually have 3 bypass diodes)', correct: true },
        { text: 'All 72 cells together', correct: false },
        { text: 'Bypass diodes are not used in modern panels', correct: false },
      ],
    },
    {
      question: 'Why might a shaded panel in a string cause more than just its proportional power loss?',
      options: [
        { text: 'Shaded panels absorb energy from sunny ones', correct: false },
        { text: 'The mismatch causes the MPPT to operate away from optimum for all panels', correct: true },
        { text: 'Shading always triggers a complete shutdown', correct: false },
        { text: 'This is a myth - losses are always proportional', correct: false },
      ],
    },
    {
      question: 'What can cause hot spot damage in a solar panel?',
      options: [
        { text: 'Only manufacturing defects', correct: false },
        { text: 'Partial shading, dirt, bird droppings, or cracked cells', correct: true },
        { text: 'Only extreme ambient temperatures', correct: false },
        { text: 'Using the panel at night', correct: false },
      ],
    },
    {
      question: 'In a system with microinverters, what happens when one panel is shaded?',
      options: [
        { text: 'The entire system shuts down', correct: false },
        { text: 'All panels lose the same percentage of power', correct: false },
        { text: 'Only the shaded panel produces less - other panels are unaffected', correct: true },
        { text: 'The microinverter overheats', correct: false },
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

  const renderVisualization = (interactive: boolean, showOptimizerOption: boolean = false) => {
    const width = 400;
    const height = 450;

    const cellWidth = 50;
    const cellHeight = 40;
    const cellGap = 8;
    const stringGap = 30;

    // Calculate which strings are bypassed
    const string1Shaded = shadedCells.has(0) || shadedCells.has(1);
    const string2Shaded = shadedCells.has(2) || shadedCells.has(3);
    const string3Shaded = shadedCells.has(4) || shadedCells.has(5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="cellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="shadedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.shaded} />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.current} />
            </marker>
          </defs>

          <text x="200" y="20" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">
            Solar Panel with {STRINGS} Strings in Series
          </text>
          <text x="200" y="38" fill={colors.textMuted} fontSize="10" textAnchor="middle">
            {interactive ? 'Click cells to toggle shade' : 'Each string has 2 cells + bypass diode'}
          </text>

          {/* Solar Panel Cells - 3 strings of 2 cells each */}
          {[0, 1, 2].map(stringIndex => {
            const stringX = 50 + stringIndex * (2 * cellWidth + cellGap + stringGap);
            const isStringBypassed = bypassEnabled && (
              (stringIndex === 0 && string1Shaded) ||
              (stringIndex === 1 && string2Shaded) ||
              (stringIndex === 2 && string3Shaded)
            );

            return (
              <g key={stringIndex} transform={`translate(${stringX}, 50)`}>
                {/* String label */}
                <text x={cellWidth + cellGap / 2} y="-8" fill={colors.textMuted} fontSize="9" textAnchor="middle">
                  String {stringIndex + 1}
                </text>

                {/* Two cells per string */}
                {[0, 1].map(cellInString => {
                  const cellIndex = stringIndex * 2 + cellInString;
                  const isShaded = shadedCells.has(cellIndex);
                  const cellX = cellInString * (cellWidth + cellGap);

                  return (
                    <g key={cellIndex}>
                      <rect
                        x={cellX}
                        y="0"
                        width={cellWidth}
                        height={cellHeight}
                        fill={isShaded ? 'url(#shadedGradient)' : 'url(#cellGradient)'}
                        rx="4"
                        stroke={isShaded ? (values.hotSpotRisk ? colors.hotspot : colors.shaded) : colors.current}
                        strokeWidth="2"
                        style={{ cursor: interactive ? 'pointer' : 'default' }}
                        onClick={() => interactive && toggleCellShade(cellIndex)}
                      />
                      {isShaded && (
                        <text x={cellX + cellWidth / 2} y={cellHeight / 2 + 4} fill={values.hotSpotRisk ? colors.hotspot : colors.textMuted} fontSize="8" textAnchor="middle">
                          {values.hotSpotRisk ? 'HOT!' : 'SHADED'}
                        </text>
                      )}
                      {!isShaded && (
                        <text x={cellX + cellWidth / 2} y={cellHeight / 2 + 4} fill={colors.solar} fontSize="10" textAnchor="middle">
                          {CELL_VOLTAGE}V
                        </text>
                      )}

                      {/* Hot spot warning */}
                      {isShaded && values.hotSpotRisk && (
                        <circle cx={cellX + cellWidth / 2} cy={cellHeight / 2} r="20" fill="none" stroke={colors.hotspot} strokeWidth="2" strokeDasharray="4,2" opacity="0.8">
                          <animate attributeName="r" values="15;22;15" dur="1s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Series connection between cells */}
                <line x1={cellWidth} y1={cellHeight / 2} x2={cellWidth + cellGap} y2={cellHeight / 2} stroke={colors.textMuted} strokeWidth="2" />

                {/* Bypass diode */}
                {bypassEnabled && (
                  <g transform={`translate(${cellWidth / 2 + cellGap / 2}, ${cellHeight + 15})`}>
                    {/* Diode symbol */}
                    <path
                      d={`M-20,0 L0,0 L0,-8 L15,0 L0,8 L0,0 M15,-8 L15,8 M15,0 L35,0`}
                      fill="none"
                      stroke={isStringBypassed ? colors.bypass : colors.textMuted}
                      strokeWidth={isStringBypassed ? 3 : 1.5}
                      filter={isStringBypassed ? 'url(#glow)' : undefined}
                    />
                    {isStringBypassed && (
                      <text x="7" y="20" fill={colors.bypass} fontSize="8" textAnchor="middle">ACTIVE</text>
                    )}
                  </g>
                )}

                {/* Optimizer symbol */}
                {hasOptimizers && (
                  <g transform={`translate(${cellWidth / 2 + cellGap / 2}, ${cellHeight + 35})`}>
                    <rect x="-15" y="-8" width="30" height="16" fill="rgba(6, 182, 212, 0.3)" rx="3" stroke={colors.optimizer} strokeWidth="2" />
                    <text x="0" y="4" fill={colors.optimizer} fontSize="7" textAnchor="middle">OPT</text>
                  </g>
                )}

                {/* Current flow arrows */}
                {showCurrentFlow && !isStringBypassed && (
                  <line
                    x1="-15"
                    y1={cellHeight / 2}
                    x2={2 * cellWidth + cellGap + 15}
                    y2={cellHeight / 2}
                    stroke={colors.current}
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    opacity="0.7"
                  />
                )}

                {/* Bypass current flow */}
                {showCurrentFlow && isStringBypassed && bypassEnabled && (
                  <path
                    d={`M-15,${cellHeight / 2} Q${cellWidth / 2 + cellGap / 2},${cellHeight + 50} ${2 * cellWidth + cellGap + 15},${cellHeight / 2}`}
                    fill="none"
                    stroke={colors.bypass}
                    strokeWidth="3"
                    markerEnd="url(#arrowhead)"
                    filter="url(#glow)"
                  />
                )}
              </g>
            );
          })}

          {/* Series connections between strings */}
          <g transform="translate(0, 70)">
            {/* String 1 to String 2 */}
            <path
              d={`M${50 + 2 * cellWidth + cellGap},${cellHeight / 2}
                  L${50 + 2 * cellWidth + cellGap + stringGap / 2},${cellHeight / 2}
                  L${50 + 2 * cellWidth + cellGap + stringGap / 2},${-15}
                  L${50 + 2 * (2 * cellWidth + cellGap) + stringGap - stringGap / 2},${-15}
                  L${50 + 2 * (2 * cellWidth + cellGap) + stringGap - stringGap / 2},${cellHeight / 2}
                  L${50 + 2 * (2 * cellWidth + cellGap) + stringGap},${cellHeight / 2}`}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth="2"
            />

            {/* String 2 to String 3 */}
            <path
              d={`M${50 + 3 * (2 * cellWidth + cellGap) + stringGap},${cellHeight / 2}
                  L${50 + 3 * (2 * cellWidth + cellGap) + 1.5 * stringGap},${cellHeight / 2}
                  L${50 + 3 * (2 * cellWidth + cellGap) + 1.5 * stringGap},${-15}
                  L${50 + 4 * (2 * cellWidth + cellGap) + 2 * stringGap - stringGap / 2},${-15}
                  L${50 + 4 * (2 * cellWidth + cellGap) + 2 * stringGap - stringGap / 2},${cellHeight / 2}
                  L${50 + 4 * (2 * cellWidth + cellGap) + 2 * stringGap},${cellHeight / 2}`}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth="2"
            />
          </g>

          {/* Output values */}
          <g transform="translate(20, 180)">
            <rect x="0" y="0" width="360" height="100" fill="rgba(0,0,0,0.4)" rx="8" stroke={colors.accent} strokeWidth="1" />

            <text x="180" y="18" fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle">
              Panel Output
            </text>

            {/* Current */}
            <text x="20" y="40" fill={colors.current} fontSize="11">Current:</text>
            <text x="90" y="40" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              {values.current.toFixed(1)} A
            </text>

            {/* Voltage */}
            <text x="180" y="40" fill={colors.solar} fontSize="11">Voltage:</text>
            <text x="250" y="40" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              {values.voltage.toFixed(1)} V
            </text>

            {/* Power */}
            <text x="20" y="65" fill={colors.power} fontSize="12" fontWeight="bold">Power:</text>
            <text x="90" y="65" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
              {values.power.toFixed(0)} W
            </text>
            <text x="150" y="65" fill={colors.textSecondary} fontSize="11">
              ({values.efficiency.toFixed(0)}% of max)
            </text>

            {/* Status messages */}
            {values.hotSpotRisk && (
              <text x="180" y="85" fill={colors.hotspot} fontSize="11" textAnchor="middle" fontWeight="bold">
                WARNING: Hot spot risk! Reverse voltage: {values.reverseVoltage.toFixed(1)}V
              </text>
            )}
            {values.activeBypass && !hasOptimizers && (
              <text x="180" y="85" fill={colors.bypass} fontSize="11" textAnchor="middle">
                Bypass active: {values.bypassedStrings} string(s) bypassed
              </text>
            )}
            {hasOptimizers && shadedCells.size > 0 && (
              <text x="180" y="85" fill={colors.optimizer} fontSize="11" textAnchor="middle">
                Optimizers: Each cell at its own MPP
              </text>
            )}
          </g>

          {/* Comparison bars */}
          <g transform="translate(20, 295)">
            <text x="180" y="0" fill={colors.textPrimary} fontSize="11" fontWeight="bold" textAnchor="middle">
              Power Output Comparison
            </text>

            {/* Max possible bar */}
            <rect x="0" y="15" width="360" height="20" fill="rgba(255,255,255,0.1)" rx="4" />
            <rect x="0" y="15" width="360" height="20" fill="rgba(16, 185, 129, 0.3)" rx="4" stroke={colors.success} strokeWidth="1" />
            <text x="10" y="29" fill={colors.success} fontSize="10">Max: {(CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT).toFixed(0)}W (100%)</text>

            {/* Actual output bar */}
            <rect x="0" y="45" width="360" height="20" fill="rgba(255,255,255,0.1)" rx="4" />
            <rect
              x="0"
              y="45"
              width={360 * values.efficiency / 100}
              height="20"
              fill={values.hotSpotRisk ? 'rgba(239, 68, 68, 0.5)' : values.efficiency > 80 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}
              rx="4"
            />
            <text x="10" y="59" fill={colors.textPrimary} fontSize="10">
              Actual: {values.power.toFixed(0)}W ({values.efficiency.toFixed(0)}%)
            </text>
          </g>

          {/* Legend */}
          <g transform="translate(20, 380)">
            <rect x="0" y="0" width="360" height="60" fill="rgba(0,0,0,0.3)" rx="6" />
            <text x="10" y="18" fill={colors.textPrimary} fontSize="10" fontWeight="bold">Configuration:</text>

            <circle cx="25" cy="35" r="6" fill={bypassEnabled ? colors.bypass : colors.textMuted} />
            <text x="40" y="39" fill={colors.textSecondary} fontSize="10">Bypass Diodes: {bypassEnabled ? 'ON' : 'OFF'}</text>

            <circle cx="160" cy="35" r="6" fill={hasOptimizers ? colors.optimizer : colors.textMuted} />
            <text x="175" y="39" fill={colors.textSecondary} fontSize="10">Optimizers: {hasOptimizers ? 'ON' : 'OFF'}</text>

            <circle cx="290" cy="35" r="6" fill={shadedCells.size > 0 ? colors.shaded : colors.solar} />
            <text x="305" y="39" fill={colors.textSecondary} fontSize="10">Shaded: {shadedCells.size}</text>

            <text x="180" y="55" fill={colors.textMuted} fontSize="9" textAnchor="middle">
              {!bypassEnabled && !hasOptimizers && 'No protection - risk of hot spots and severe power loss'}
              {bypassEnabled && !hasOptimizers && 'Bypass diodes protect against hot spots, but lose whole strings'}
              {hasOptimizers && 'Optimizers allow each cell to operate independently'}
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setBypassEnabled(!bypassEnabled)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: bypassEnabled ? colors.bypass : colors.textMuted,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Bypass: {bypassEnabled ? 'ON' : 'OFF'}
            </button>
            {showOptimizerOption && (
              <button
                onClick={() => setHasOptimizers(!hasOptimizers)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasOptimizers ? colors.optimizer : colors.textMuted,
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Optimizers: {hasOptimizers ? 'ON' : 'OFF'}
              </button>
            )}
            <button
              onClick={() => setShowCurrentFlow(!showCurrentFlow)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.current}`,
                background: showCurrentFlow ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: colors.current,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Current Flow
            </button>
            <button
              onClick={() => { setShadedCells(new Set()); setBypassEnabled(true); setHasOptimizers(false); }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
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

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.power}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          The Series Problem
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          In a series circuit, current must be the same through all components. A shaded cell
          can only pass a fraction of normal current, limiting the entire string. Without
          bypass diodes, the shaded cell is forced to dissipate the excess power as heat.
        </div>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.bypass}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Bypass Diode Solution
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          Bypass diodes provide an alternate current path around shaded cells. When a cell
          is shaded, its voltage drops, forward-biasing the bypass diode. Current flows
          through the diode instead of forcing through the shaded cell.
        </div>
      </div>
    </div>
  );

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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Bypass Diodes and Partial Shading
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why does shade on one cell ruin the whole panel?
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
                Solar cells are connected in series to build up voltage. But this creates a problem:
                <strong style={{ color: colors.hotspot }}> a single shaded cell can devastate the entire string's output</strong>.
                Even worse, it can create dangerous hot spots that damage the panel.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Click on individual cells to shade them and see what happens to power output!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try turning off bypass diodes and shading a cell - watch for the hot spot warning!
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You Are Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Six solar cells arranged in 3 series strings. Each cell produces 0.6V and can carry 10A.
              The strings are connected in series to produce higher voltage. In a real panel, there
              would be 60-72 cells.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you shade just 1 cell out of 6 (16% of area), how much power do you lose?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Shading Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Click cells to shade them, toggle bypass diodes on/off
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
              <li>Shade one cell with bypass ON vs OFF - see the difference</li>
              <li>Shade one cell in each string - compare power loss</li>
              <li>Turn off bypass and shade a cell - observe hot spot warning</li>
              <li>Note: With bypass on, you lose whole strings but avoid damage</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'worse';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
              Power drops <strong>MUCH more than proportionally!</strong> In series circuits,
              current is limited by the weakest link. Shading just 16% of the area can cause
              30-90% power loss without bypass diodes, or 33% with them (whole string lost).
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Partial Shading</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Series Current Rule:</strong> In a series
                circuit, current must be identical through all components. A shaded cell generates
                less photocurrent but the string tries to push more through it.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Reverse Bias:</strong> The good cells
                generate voltage that reverse-biases the shaded cell. The shaded cell becomes a
                resistive load, dissipating power as heat instead of generating it.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Hot Spots:</strong> Power dissipation
                P = I²R in the shaded cell can cause local temperatures exceeding 150°C, damaging
                the cell, encapsulant, and potentially causing fires.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Bypass Diodes:</strong> When a cell
                is shaded, its voltage drops. This forward-biases the bypass diode, providing an
                alternate current path. The string loses some voltage but avoids damage.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Can technology solve the shading problem?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Bypass diodes help but still lose whole strings when even one cell is shaded.
              Modern solar systems use module-level power electronics (MLPE) - either
              microinverters or DC power optimizers - that attach to each panel or even
              each cell group.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How do microinverters/optimizers change the shading equation?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Technologies</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle optimizers on and off while shading cells
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Experiment:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Shade 2-3 cells, then toggle between bypass-only and optimizer modes.
              With optimizers, each cell operates at its own maximum power point -
              shaded cells contribute what they can without dragging down the others!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'optimizers_help';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Important Insight!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              <strong>Microinverters and optimizers solve the shading problem</strong> by making
              each panel (or cell group) electrically independent. A shaded panel only loses
              its own production - other panels are completely unaffected!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>MLPE Technologies Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.optimizer }}>Power Optimizers (SolarEdge, Tigo):</strong> DC-DC
                converters at each panel that perform MPPT locally. Panels feed a central string
                inverter but operate independently. Cost: ~$50-100/panel extra.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.optimizer }}>Microinverters (Enphase, AP Systems):</strong> Each
                panel has its own DC-AC inverter. Complete independence. Easier expansion. Cost: ~$100-150/panel extra vs string inverter.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Benefits:</strong>
                <br/>- Shade on one panel does not affect others
                <br/>- Panel-level monitoring for troubleshooting
                <br/>- Improved safety (rapid shutdown capability)
                <br/>- Better performance with mismatched panels
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Trade-offs:</strong> Higher cost, more potential
                failure points, some efficiency loss from extra conversion step. Worth it for
                shaded installations or complex roofs.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Shading solutions are critical for real solar installations
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
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
                {testScore >= 8 ? 'You understand bypass diodes and partial shading!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered bypass diodes and partial shading</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Series circuits limit current to the weakest cell</li>
              <li>Partial shading causes disproportionate power loss</li>
              <li>Hot spots occur when shaded cells become reverse-biased</li>
              <li>Bypass diodes protect strings but lose whole groups</li>
              <li>Microinverters make each panel independent</li>
              <li>Power optimizers enable per-panel MPPT</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Future solar technology may include cell-level electronics, half-cut cells for better
              shade tolerance, shingled cells that reduce inactive area, and AI-powered shade
              optimization. Building-integrated PV (BIPV) faces complex shading from architectural
              elements and requires sophisticated MLPE solutions.
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

export default BypassDiodesRenderer;
