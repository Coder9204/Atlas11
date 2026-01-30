import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface HotspotsRendererProps {
  phase?: Phase; // Optional - for resume functionality
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
  hot: '#dc2626',
  warm: '#f97316',
  cool: '#3b82f6',
  cold: '#1d4ed8',
};

const HotspotsRenderer: React.FC<HotspotsRendererProps> = ({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase management - internal state
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Bypass Diodes',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const getInitialPhase = (): Phase => {
    if (initialPhase && phaseOrder.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && phaseOrder.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

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

  // Simulation state
  const [shadedCellIndex, setShadedCellIndex] = useState(5);
  const [shadingLevel, setShadingLevel] = useState(80); // 0-100, higher = more shaded
  const [stringCurrent, setStringCurrent] = useState(8); // Amps
  const [bypassDiodeEnabled, setBypassDiodeEnabled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations - Hotspot power dissipation
  const calculateHotspot = useCallback(() => {
    const numCells = 12;
    const cellVoc = 0.6; // Open circuit voltage per cell

    // Shaded cell generates much less current
    const shadedCellCurrent = stringCurrent * (1 - shadingLevel / 100);

    // In series string, current is limited by weakest cell
    // But if string is forced to carry more current, shaded cell goes reverse-biased
    const currentMismatch = stringCurrent - shadedCellCurrent;

    // Reverse bias voltage on shaded cell
    // Can be up to (N-1) * Voc in worst case
    const reverseVoltage = bypassDiodeEnabled
      ? Math.min(0.7, currentMismatch * 0.1) // Bypass limits to ~0.7V
      : Math.min((numCells - 1) * cellVoc, currentMismatch * 2);

    // Power dissipated as heat in shaded cell
    const heatPower = stringCurrent * reverseVoltage;

    // Temperature rise (simplified thermal model)
    // Assume 0.5 deg C per watt for a typical cell
    const temperatureRise = heatPower * 0.5;
    const cellTemperature = 25 + temperatureRise;

    // Risk assessment
    const riskLevel = cellTemperature > 150 ? 'Critical' :
                      cellTemperature > 100 ? 'High' :
                      cellTemperature > 60 ? 'Moderate' : 'Low';

    return {
      shadedCellCurrent,
      currentMismatch,
      reverseVoltage: Math.max(0, reverseVoltage),
      heatPower: Math.max(0, heatPower),
      cellTemperature,
      temperatureRise,
      riskLevel,
      bypassActive: bypassDiodeEnabled && reverseVoltage > 0.5,
    };
  }, [shadedCellIndex, shadingLevel, stringCurrent, bypassDiodeEnabled]);

  // Animation for thermal buildup
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setShadingLevel(prev => {
        const newVal = prev + 2;
        if (newVal >= 95) {
          setIsAnimating(false);
          return 95;
        }
        return newVal;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'no_effect', label: 'Nothing happens - the shaded cell just produces less power' },
    { id: 'string_stops', label: 'The entire string stops working because one cell is shaded' },
    { id: 'heats_up', label: 'The shaded cell gets hot because it dissipates power instead of generating it' },
    { id: 'other_cells', label: 'The other cells work harder and get hot to compensate' },
  ];

  const twistPredictions = [
    { id: 'no_help', label: 'Bypass diodes don\'t help - the cell still heats up the same' },
    { id: 'stops_heat', label: 'Bypass diodes completely eliminate heating by skipping the shaded cell' },
    { id: 'reduces_heat', label: 'Bypass diodes reduce heating by limiting reverse voltage' },
    { id: 'makes_worse', label: 'Bypass diodes make heating worse by concentrating current' },
  ];

  const transferApplications = [
    {
      title: 'Rooftop Solar Maintenance',
      description: 'Residential solar systems often experience partial shading from chimneys, trees, or debris.',
      question: 'Why should homeowners keep their panels clean and check for hotspots periodically?',
      answer: 'Even small debris like leaves can create localized shading that causes hotspots. Over time, repeated thermal stress can crack cells, melt solder joints, or damage encapsulant. Regular inspection with a thermal camera can catch developing hotspots before permanent damage occurs.',
    },
    {
      title: 'Utility-Scale Solar Design',
      description: 'Large solar farms use sophisticated designs to minimize hotspot risk across thousands of panels.',
      question: 'Why do modern panels have bypass diodes for every 20-24 cells instead of the whole panel?',
      answer: 'Having bypass diodes for smaller cell groups limits the reverse voltage any single shaded cell can experience. With 3 bypass diodes per 60-cell panel, a shaded cell sees at most 19 cells of reverse voltage instead of 59, reducing hotspot power by ~70% and dramatically improving reliability.',
    },
    {
      title: 'Half-Cut Cell Technology',
      description: 'Modern panels use cells cut in half, creating 120 or 144 half-cells instead of 60 or 72 full cells.',
      question: 'How do half-cut cells reduce hotspot severity?',
      answer: 'Half-cut cells carry half the current of full cells. Since hotspot power = I x V, halving the current cuts hotspot power by half. Additionally, half-cell panels typically have 6 bypass diodes protecting smaller cell groups, further reducing the maximum reverse voltage.',
    },
    {
      title: 'IR Thermography Inspection',
      description: 'Professional solar inspectors use infrared cameras to detect hotspots during O&M.',
      question: 'What temperature difference indicates a problematic hotspot during IR inspection?',
      answer: 'Industry standards flag cells that are 10-20C warmer than neighbors as concerning, and cells 40C+ warmer as critical failures requiring immediate attention. Regular IR inspections can identify degrading cells before they cause fires or major damage.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes a solar cell to become a "hotspot" when shaded?',
      options: [
        { text: 'The cell absorbs extra sunlight from other cells', correct: false },
        { text: 'Series current forces the shaded cell into reverse bias, dissipating power as heat', correct: true },
        { text: 'The cell\'s internal resistance increases when shaded', correct: false },
        { text: 'Thermal radiation from neighboring cells heats the shaded cell', correct: false },
      ],
    },
    {
      question: 'In a series string of cells, when one cell is shaded:',
      options: [
        { text: 'Current increases through the shaded cell', correct: false },
        { text: 'Current decreases through the entire string', correct: false },
        { text: 'The shaded cell becomes reverse-biased if string current is forced', correct: true },
        { text: 'Voltage across the shaded cell increases normally', correct: false },
      ],
    },
    {
      question: 'The power dissipated as heat in a hotspot is calculated as:',
      options: [
        { text: 'String voltage divided by cell current', correct: false },
        { text: 'String current multiplied by reverse voltage across the shaded cell', correct: true },
        { text: 'Total string power divided by number of cells', correct: false },
        { text: 'Cell current squared times cell resistance', correct: false },
      ],
    },
    {
      question: 'How do bypass diodes protect against hotspots?',
      options: [
        { text: 'They increase current through shaded cells', correct: false },
        { text: 'They provide an alternate current path, limiting reverse voltage', correct: true },
        { text: 'They cool the cells through thermoelectric effect', correct: false },
        { text: 'They increase the voltage across shaded cells', correct: false },
      ],
    },
    {
      question: 'A typical bypass diode limits the reverse voltage across a shaded cell group to approximately:',
      options: [
        { text: '0.1 volts', correct: false },
        { text: '0.6-0.7 volts', correct: true },
        { text: '5-10 volts', correct: false },
        { text: '20-30 volts', correct: false },
      ],
    },
    {
      question: 'Why are hotspots more dangerous than just reduced power output?',
      options: [
        { text: 'They can cause cell cracking, encapsulant damage, and even fires', correct: true },
        { text: 'They only affect the shaded cell\'s efficiency', correct: false },
        { text: 'They are only a problem in cold weather', correct: false },
        { text: 'They reduce the warranty period', correct: false },
      ],
    },
    {
      question: 'What is the typical temperature threshold for a "critical" hotspot?',
      options: [
        { text: '50-60C above ambient', correct: false },
        { text: '10-20C above neighboring cells', correct: false },
        { text: '100-150C or more (absolute temperature)', correct: true },
        { text: 'Any temperature above 25C', correct: false },
      ],
    },
    {
      question: 'Half-cut cell panels reduce hotspot severity because:',
      options: [
        { text: 'Half-cut cells have higher voltage', correct: false },
        { text: 'Half-cut cells carry half the current, reducing P = I x V', correct: true },
        { text: 'Half-cut cells are more resistant to shading', correct: false },
        { text: 'Half-cut cells don\'t need bypass diodes', correct: false },
      ],
    },
    {
      question: 'Which shading scenario creates the worst hotspot?',
      options: [
        { text: 'Uniform light reduction across all cells', correct: false },
        { text: 'One cell completely shaded while others receive full sun', correct: true },
        { text: 'All cells in the string equally shaded', correct: false },
        { text: 'Shading that varies slowly throughout the day', correct: false },
      ],
    },
    {
      question: 'In a string with no bypass diode, a shaded cell can experience reverse voltage up to:',
      options: [
        { text: 'The shaded cell\'s own open-circuit voltage', correct: false },
        { text: 'The sum of all other cells\' voltages (N-1) x Voc', correct: true },
        { text: 'The inverter input voltage', correct: false },
        { text: 'Zero volts (cells don\'t reverse bias)', correct: false },
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

  const getTemperatureColor = (temp: number) => {
    if (temp > 120) return colors.hot;
    if (temp > 80) return colors.warm;
    if (temp > 50) return colors.warning;
    return colors.cool;
  };

  const renderVisualization = (interactive: boolean, showBypass: boolean = false) => {
    const width = 500;
    const height = 420;
    const output = calculateHotspot();

    const numCells = 12;
    const cellWidth = 35;
    const cellHeight = 50;
    const cellGap = 3;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="hotGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.hot} />
              <stop offset="100%" stopColor={colors.warm} />
            </linearGradient>
            <linearGradient id="coolGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.cool} />
              <stop offset="100%" stopColor={colors.cold} />
            </linearGradient>
            <filter id="heatGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={250} y={25} fill={colors.accent} fontSize={14} fontWeight="bold" textAnchor="middle">
            Series String of Solar Cells
          </text>

          {/* Sun rays on non-shaded cells */}
          {[...Array(numCells)].map((_, i) => {
            if (i === shadedCellIndex) return null;
            const x = 40 + i * (cellWidth + cellGap) + cellWidth / 2;
            return (
              <g key={`sun${i}`}>
                <line x1={x} y1={35} x2={x} y2={55} stroke={colors.warning} strokeWidth={2} opacity={0.6} />
                <line x1={x - 8} y1={40} x2={x - 4} y2={55} stroke={colors.warning} strokeWidth={1} opacity={0.4} />
                <line x1={x + 8} y1={40} x2={x + 4} y2={55} stroke={colors.warning} strokeWidth={1} opacity={0.4} />
              </g>
            );
          })}

          {/* Shade cloud over shaded cell */}
          <ellipse
            cx={40 + shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2}
            cy={45}
            rx={25}
            ry={15}
            fill="#374151"
            opacity={shadingLevel / 100}
          />

          {/* Solar cells */}
          <g transform="translate(40, 60)">
            {[...Array(numCells)].map((_, i) => {
              const isShaded = i === shadedCellIndex;
              const cellTemp = isShaded ? output.cellTemperature : 25 + Math.random() * 5;
              const cellColor = isShaded ? getTemperatureColor(output.cellTemperature) : colors.cool;

              return (
                <g key={`cell${i}`}>
                  {/* Cell body */}
                  <rect
                    x={i * (cellWidth + cellGap)}
                    y={0}
                    width={cellWidth}
                    height={cellHeight}
                    fill={cellColor}
                    stroke={isShaded ? colors.hot : colors.textMuted}
                    strokeWidth={isShaded ? 2 : 1}
                    rx={2}
                    filter={isShaded && output.cellTemperature > 80 ? 'url(#heatGlow)' : undefined}
                    opacity={isShaded ? 0.5 + shadingLevel / 200 : 1}
                  />

                  {/* Cell label */}
                  <text
                    x={i * (cellWidth + cellGap) + cellWidth / 2}
                    y={cellHeight + 15}
                    fill={isShaded ? colors.hot : colors.textSecondary}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {isShaded ? `${cellTemp.toFixed(0)}C` : `${cellTemp.toFixed(0)}C`}
                  </text>

                  {/* Series connection lines */}
                  {i < numCells - 1 && (
                    <line
                      x1={i * (cellWidth + cellGap) + cellWidth}
                      y1={cellHeight / 2}
                      x2={(i + 1) * (cellWidth + cellGap)}
                      y2={cellHeight / 2}
                      stroke={colors.warning}
                      strokeWidth={2}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Current flow arrows */}
          <g transform="translate(40, 130)">
            <text x={-20} y={5} fill={colors.textSecondary} fontSize={11}>I=</text>
            <text x={-5} y={5} fill={colors.warning} fontSize={11}>{stringCurrent}A</text>
            {[...Array(6)].map((_, i) => (
              <polygon
                key={`arrow${i}`}
                points={`${50 + i * 70},0 ${60 + i * 70},-5 ${60 + i * 70},5`}
                fill={colors.warning}
                opacity={0.8}
              />
            ))}
          </g>

          {/* Bypass diode visualization */}
          {showBypass && (
            <g transform="translate(40, 60)">
              {/* Bypass diode over shaded cell group */}
              <path
                d={`M ${(shadedCellIndex - 1) * (cellWidth + cellGap) + cellWidth / 2} ${-10}
                    Q ${shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2} ${-25}
                    ${(shadedCellIndex + 1) * (cellWidth + cellGap) + cellWidth / 2} ${-10}`}
                fill="none"
                stroke={bypassDiodeEnabled ? colors.success : colors.textMuted}
                strokeWidth={bypassDiodeEnabled ? 3 : 2}
                strokeDasharray={bypassDiodeEnabled ? 'none' : '5,5'}
              />
              <circle
                cx={shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2}
                cy={-20}
                r={8}
                fill={bypassDiodeEnabled && output.bypassActive ? colors.success : colors.bgCard}
                stroke={bypassDiodeEnabled ? colors.success : colors.textMuted}
                strokeWidth={2}
              />
              <text
                x={shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2}
                y={-16}
                fill={bypassDiodeEnabled ? colors.textPrimary : colors.textMuted}
                fontSize={10}
                textAnchor="middle"
              >
                D
              </text>
            </g>
          )}

          {/* Thermal heatmap bar */}
          <g transform="translate(40, 160)">
            <text x={0} y={0} fill={colors.accent} fontSize={12} fontWeight="bold">Thermal Heatmap View</text>
            <rect x={0} y={10} width={420} height={30} fill="rgba(0,0,0,0.3)" rx={4} />

            {[...Array(numCells)].map((_, i) => {
              const isShaded = i === shadedCellIndex;
              const temp = isShaded ? output.cellTemperature : 25 + Math.random() * 5;
              const heatIntensity = Math.min((temp - 25) / 125, 1);

              return (
                <rect
                  key={`heat${i}`}
                  x={5 + i * 35}
                  y={15}
                  width={30}
                  height={20}
                  fill={`rgb(${Math.floor(heatIntensity * 255)}, ${Math.floor((1 - heatIntensity) * 100)}, ${Math.floor((1 - heatIntensity) * 200)})`}
                  rx={2}
                />
              );
            })}
          </g>

          {/* Data panel */}
          <g transform="translate(20, 220)">
            <rect x={0} y={0} width={220} height={130} fill="rgba(0,0,0,0.5)" rx={8} />
            <text x={10} y={20} fill={colors.accent} fontSize={12} fontWeight="bold">Hotspot Analysis</text>

            <text x={10} y={42} fill={colors.textSecondary} fontSize={11}>Shading Level:</text>
            <text x={130} y={42} fill={colors.textPrimary} fontSize={11}>{shadingLevel}%</text>

            <text x={10} y={60} fill={colors.textSecondary} fontSize={11}>Reverse Voltage:</text>
            <text x={130} y={60} fill={output.reverseVoltage > 5 ? colors.hot : colors.textPrimary} fontSize={11}>
              {output.reverseVoltage.toFixed(1)} V
            </text>

            <text x={10} y={78} fill={colors.textSecondary} fontSize={11}>Heat Power:</text>
            <text x={130} y={78} fill={output.heatPower > 20 ? colors.hot : colors.textPrimary} fontSize={11}>
              {output.heatPower.toFixed(1)} W
            </text>

            <text x={10} y={96} fill={colors.textSecondary} fontSize={11}>Cell Temperature:</text>
            <text x={130} y={96} fill={getTemperatureColor(output.cellTemperature)} fontSize={11} fontWeight="bold">
              {output.cellTemperature.toFixed(0)}C
            </text>

            <text x={10} y={118} fill={colors.textSecondary} fontSize={11}>Risk Level:</text>
            <text
              x={130}
              y={118}
              fill={output.riskLevel === 'Critical' ? colors.hot : output.riskLevel === 'High' ? colors.warm : colors.success}
              fontSize={11}
              fontWeight="bold"
            >
              {output.riskLevel}
            </text>
          </g>

          {/* Reverse bias power curve */}
          <g transform="translate(260, 220)">
            <rect x={0} y={0} width={220} height={130} fill="rgba(0,0,0,0.5)" rx={8} />
            <text x={10} y={20} fill={colors.accent} fontSize={12} fontWeight="bold">Power vs Shading</text>

            {/* Axes */}
            <line x1={30} y1={110} x2={200} y2={110} stroke={colors.textMuted} strokeWidth={1} />
            <line x1={30} y1={35} x2={30} y2={110} stroke={colors.textMuted} strokeWidth={1} />

            {/* Curve */}
            <path
              d={`M 30,105 ${[...Array(20)].map((_, i) => {
                const shade = (i / 19) * 100;
                const power = stringCurrent * Math.min((11 * 0.6), (stringCurrent * shade / 100) * 2);
                const x = 30 + i * 8.5;
                const y = 105 - (power / 80) * 70;
                return `L ${x},${Math.max(35, y)}`;
              }).join(' ')}`}
              fill="none"
              stroke={bypassDiodeEnabled ? colors.success : colors.hot}
              strokeWidth={2}
            />

            {/* Current position marker */}
            <circle
              cx={30 + (shadingLevel / 100) * 170}
              cy={105 - (output.heatPower / 80) * 70}
              r={5}
              fill={colors.accent}
            />

            <text x={115} y={125} fill={colors.textMuted} fontSize={9} textAnchor="middle">Shading %</text>
            <text x={15} y={70} fill={colors.textMuted} fontSize={9} textAnchor="middle" transform="rotate(-90, 15, 70)">Heat (W)</text>

            {showBypass && output.bypassActive && (
              <text x={115} y={50} fill={colors.success} fontSize={10} textAnchor="middle">
                Bypass Active!
              </text>
            )}
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(!isAnimating); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause' : 'Animate Shading'}
            </button>
            <button
              onClick={() => { setShadingLevel(0); setIsAnimating(false); }}
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

  const renderControls = (showBypass: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Shading Level: {shadingLevel}%
        </label>
        <input
          type="range"
          min="0"
          max="95"
          step="5"
          value={shadingLevel}
          onChange={(e) => setShadingLevel(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          String Current: {stringCurrent} A
        </label>
        <input
          type="range"
          min="1"
          max="12"
          step="0.5"
          value={stringCurrent}
          onChange={(e) => setStringCurrent(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Shaded Cell Position: Cell {shadedCellIndex + 1}
        </label>
        <input
          type="range"
          min="0"
          max="11"
          step="1"
          value={shadedCellIndex}
          onChange={(e) => setShadedCellIndex(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showBypass && (
        <div>
          <label style={{
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={bypassDiodeEnabled}
              onChange={(e) => setBypassDiodeEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Enable Bypass Diode
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(220, 38, 38, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.hot}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Heat Power = I_string x V_reverse = {stringCurrent}A x {calculateHotspot().reverseVoltage.toFixed(1)}V = {calculateHotspot().heatPower.toFixed(1)}W
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Temperature rise approx. {calculateHotspot().temperatureRise.toFixed(0)}C above ambient
        </div>
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgCard,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
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

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    const handleNext = () => {
      if (!canProceed) return;
      if (onNext) {
        onNext();
      } else {
        goNext();
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={handleNext}
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
          {nextLabel}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Can a Solar Cell Become a Heater?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The dangerous physics of hotspots
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
                Solar cells are designed to generate electricity from light. But what happens when
                one cell in a series string gets shaded while the others remain in full sun?
                The answer might surprise you - and it involves some serious heat!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is one of the most important reliability challenges in solar panel design.
              </p>
            </div>

            <div style={{
              background: 'rgba(220, 38, 38, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.hot}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Shade one cell and watch the thermal camera view - things get hot!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A string of 12 solar cells connected in series (like a chain of batteries).
              Full sunlight hits 11 cells, but one cell is shaded by a leaf or bird dropping.
              The inverter tries to draw current through the entire string...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the shaded cell?
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
        {renderBottomBar(!!prediction, 'Test My Prediction')}
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Hotspot Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust shading and current to see how hotspots form
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
              <li>Increase shading from 0% to 95% - watch temperature rise</li>
              <li>Try different string currents - how does it affect heat?</li>
              <li>Find the shading level where temperature exceeds 100C</li>
              <li>Move the shaded cell - does position matter?</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'heats_up';

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
              The shaded cell becomes a hotspot! It goes into reverse bias and dissipates power as heat,
              potentially reaching temperatures that can damage the cell and surrounding materials.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Hotspots</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Series Current Constraint:</strong> In a series string,
                all cells must carry the same current. A shaded cell that can't generate this current becomes a load instead of a source.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Reverse Bias:</strong> The other 11 cells collectively
                push current through the shaded cell, creating a reverse voltage across it. The cell acts like a resistor.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Dissipation:</strong> Heat power = I x V.
                With 8A current and 5V reverse bias, that's 40W concentrated in a single small cell!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Damage Risk:</strong> Temperatures above 150C can
                melt solder, crack cells, burn encapsulant, and even start fires in extreme cases.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
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
              What if we add bypass diodes to the string?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Solution:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A bypass diode is connected in parallel with each cell (or group of cells).
              When a cell goes into reverse bias, the diode provides an alternate current path.
              How much will this help with the hotspot problem?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How will bypass diodes affect the hotspot?
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Bypass Diodes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle the bypass diode and compare temperatures
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <h4 style={{ color: colors.success, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The bypass diode limits reverse voltage to about 0.7V (its forward drop).
              This dramatically reduces heat power: instead of 40W, the hotspot might only be 5W!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'reduces_heat';

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
              Bypass diodes reduce but don't eliminate hotspot heating.
              They limit reverse voltage to ~0.7V, cutting heat power by 85-95%!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>How Bypass Diodes Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Forward Voltage Drop:</strong> When the shaded cell's
                reverse voltage exceeds ~0.6V, the bypass diode conducts, clamping the voltage.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Current Sharing:</strong> The string current splits
                between the diode and the cell, with most current taking the lower-resistance diode path.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Modern Panels:</strong> Commercial panels typically
                have 3 bypass diodes protecting 20-cell groups. This balances cost against protection.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
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
              Hotspot management is critical for solar reliability
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
              <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.hot, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
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
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
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
                {testScore >= 8 ? 'You understand hotspot physics!' : 'Review the material and try again.'}
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
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setCurrentTestQuestion(0); })}
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
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand solar cell hotspot physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Series current constraint forces shaded cells into reverse bias</li>
              <li>Hotspot power = I_string x V_reverse</li>
              <li>Temperatures can exceed 150C, causing permanent damage</li>
              <li>Bypass diodes limit reverse voltage to ~0.7V</li>
              <li>Half-cut cells and more bypass diodes reduce hotspot severity</li>
              <li>IR thermography detects hotspots before failure</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(220, 38, 38, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.hot, marginBottom: '12px' }}>Safety First:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Hotspots are a leading cause of solar panel fires and premature failure.
              Understanding this physics helps engineers design safer panels, installers avoid
              shading issues, and operators detect problems before they become dangerous.
              Your knowledge could literally prevent fires!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default HotspotsRenderer;
