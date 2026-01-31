import React, { useState, useCallback, useEffect } from 'react';

interface ChipletsVsMonolithsRendererProps {
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
  monolithic: '#ef4444',
  chiplet: '#3b82f6',
  interconnect: '#8b5cf6',
  good: '#10b981',
  defect: '#ef4444',
  cost: '#f59e0b',
};

// Seeded random for reproducibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const ChipletsVsMonolithsRenderer: React.FC<ChipletsVsMonolithsRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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

  // Simulation state
  const [totalDieArea, setTotalDieArea] = useState(400); // mm^2
  const [numChiplets, setNumChiplets] = useState(4);
  const [defectDensity, setDefectDensity] = useState(0.1); // defects per mm^2
  const [interconnectCost, setInterconnectCost] = useState(20); // $ per chiplet for packaging
  const [advancedPackaging, setAdvancedPackaging] = useState(false);
  const [advPackagingCostMult, setAdvPackagingCostMult] = useState(2); // cost multiplier
  const [latencyPenalty, setLatencyPenalty] = useState(5); // ns per chiplet hop
  const [simulationSeed, setSimulationSeed] = useState(42);
  const [showLatencyMode, setShowLatencyMode] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics/economics calculations
  const calculateYieldAndCost = useCallback(() => {
    // Monolithic die
    const monoArea = totalDieArea;
    // Poisson yield model: Y = exp(-D * A)
    const monoYield = Math.exp(-defectDensity * monoArea);
    const monoWaferCost = 5000; // $ per 300mm wafer
    const monoGrossPerWafer = Math.floor(70000 / monoArea); // ~70000 mm^2 usable on 300mm wafer
    const monoGoodPerWafer = monoGrossPerWafer * monoYield;
    const monoCostPerGood = monoGoodPerWafer > 0 ? monoWaferCost / monoGoodPerWafer : Infinity;

    // Chiplet approach
    const chipletArea = totalDieArea / numChiplets;
    const chipletYield = Math.exp(-defectDensity * chipletArea);
    // System yield = product of all chiplet yields (need all to work)
    const systemYield = Math.pow(chipletYield, numChiplets);
    const chipletGrossPerWafer = Math.floor(70000 / chipletArea);
    const chipletGoodPerWafer = chipletGrossPerWafer * chipletYield;
    const chipletCostPerGood = chipletGoodPerWafer > 0 ? monoWaferCost / chipletGoodPerWafer : Infinity;

    // Total cost per good system (all chiplets + packaging)
    const packagingBase = interconnectCost * numChiplets;
    const packagingTotal = advancedPackaging ? packagingBase * advPackagingCostMult : packagingBase;
    const chipletSystemCost = (chipletCostPerGood * numChiplets) + packagingTotal;

    // Cost comparison
    const costRatio = monoCostPerGood / chipletSystemCost;

    // Latency analysis
    const monoLatency = 2; // ns base latency within die
    const chipletLatency = advancedPackaging ?
      monoLatency + latencyPenalty * 0.3 : // Advanced packaging reduces penalty
      monoLatency + latencyPenalty;
    const maxChipletHops = Math.ceil(Math.sqrt(numChiplets)); // Worst case hops
    const worstCaseLatency = chipletLatency * maxChipletHops;

    // Power overhead for inter-chiplet communication
    const interChipletPower = advancedPackaging ? 0.5 : 2; // pJ/bit
    const monoInternalPower = 0.1; // pJ/bit

    return {
      monolithic: {
        area: monoArea,
        yield: monoYield * 100,
        goodPerWafer: monoGoodPerWafer,
        costPerGood: monoCostPerGood,
        latency: monoLatency,
        power: monoInternalPower,
      },
      chiplet: {
        areaEach: chipletArea,
        yieldEach: chipletYield * 100,
        systemYield: systemYield * 100,
        goodPerWafer: chipletGoodPerWafer,
        costPerGood: chipletCostPerGood,
        packagingCost: packagingTotal,
        totalCost: chipletSystemCost,
        latency: worstCaseLatency,
        power: interChipletPower,
      },
      comparison: {
        costRatio,
        chipletsWin: chipletSystemCost < monoCostPerGood,
        yieldAdvantage: chipletYield * 100 - monoYield * 100,
        latencyPenalty: worstCaseLatency - monoLatency,
      },
    };
  }, [totalDieArea, numChiplets, defectDensity, interconnectCost, advancedPackaging, advPackagingCostMult, latencyPenalty]);

  // Generate wafer visualization data
  const generateWaferData = useCallback((area: number, yield_pct: number) => {
    const dicePerRow = Math.floor(200 / Math.sqrt(area));
    const totalDice = dicePerRow * dicePerRow;
    const dice: boolean[] = [];

    for (let i = 0; i < totalDice; i++) {
      const rand = seededRandom(simulationSeed * 10000 + i + area);
      dice.push(rand < yield_pct / 100);
    }

    return { dicePerRow, dice };
  }, [simulationSeed]);

  const predictions = [
    { id: 'same', label: 'Monolithic and chiplets have the same yield and cost' },
    { id: 'mono_better', label: 'Monolithic is better - no packaging overhead' },
    { id: 'chiplet_better', label: 'Chiplets can win on yield and cost for large designs' },
    { id: 'always_chiplet', label: 'Chiplets are always better regardless of size' },
  ];

  const twistPredictions = [
    { id: 'cost_only', label: 'Advanced packaging only adds cost with no benefit' },
    { id: 'latency_fix', label: 'Advanced packaging fixes the latency/power penalty' },
    { id: 'breakeven', label: 'Advanced packaging shifts the cost-performance break-even point' },
    { id: 'no_effect', label: 'Advanced packaging has no effect on the trade-offs' },
  ];

  const transferApplications = [
    {
      title: 'AMD EPYC Processors',
      description: 'AMD\'s EPYC server CPUs use multiple chiplets connected by Infinity Fabric.',
      question: 'Why does AMD use 8 CPU chiplets instead of one large die?',
      answer: 'A 64-core monolithic die would be enormous (~800mm²) with terrible yield. By using 8 identical 8-core chiplets (~75mm² each), AMD achieves much better yield. The I/O die handles memory and connectivity, allowing the CPU chiplets to use the most advanced node while the I/O die uses an older, cheaper node.',
    },
    {
      title: 'Apple M-Series',
      description: 'Apple uses a monolithic design for M1/M2 but moves to chiplets for higher-end parts.',
      question: 'Why does Apple use monolithic for some chips but chiplets for others?',
      answer: 'For moderate die sizes (~120mm²), monolithic provides lower latency and simpler design. As Apple scales to M1 Ultra and beyond, the die would exceed yield limits. They use die-to-die connections to double capacity while maintaining acceptable yield.',
    },
    {
      title: 'Intel Ponte Vecchio',
      description: 'Intel\'s GPU for HPC uses 47 tiles (chiplets) with multiple fabrication processes.',
      question: 'How does Intel benefit from using different process nodes for different tiles?',
      answer: 'Compute tiles use leading-edge process for performance. Memory tiles use mature process optimized for HB memory. I/O tiles use yet another process for SerDes. Each function gets its optimal technology without forcing everything onto one expensive leading-edge node.',
    },
    {
      title: 'Heterogeneous Integration',
      description: 'Future chips combine logic, memory, sensors, and analog on one package.',
      question: 'Why is heterogeneous integration the future of semiconductor packaging?',
      answer: 'Different functions have different optimal technologies: logic needs density, analog needs voltage range, memory needs capacitors, sensors need MEMS. Chiplets allow each to be manufactured optimally, then combined. This enables capabilities impossible with monolithic integration.',
    },
  ];

  const testQuestions = [
    {
      question: 'Yield follows the Poisson model Y = exp(-D × A), which means:',
      options: [
        { text: 'Yield increases linearly with area', correct: false },
        { text: 'Yield decreases exponentially with area', correct: true },
        { text: 'Yield is independent of area', correct: false },
        { text: 'Yield increases exponentially with area', correct: false },
      ],
    },
    {
      question: 'Splitting a 400mm² die into four 100mm² chiplets improves yield because:',
      options: [
        { text: 'Smaller dice are faster to manufacture', correct: false },
        { text: 'Each chiplet has exponentially higher yield than the large die', correct: true },
        { text: 'Defects are eliminated in smaller dice', correct: false },
        { text: 'Packaging removes all defects', correct: false },
      ],
    },
    {
      question: 'The main cost disadvantage of chiplets compared to monolithic is:',
      options: [
        { text: 'Lower yield per chiplet', correct: false },
        { text: 'Additional packaging and interconnect costs', correct: true },
        { text: 'Larger total silicon area', correct: false },
        { text: 'More expensive wafer processing', correct: false },
      ],
    },
    {
      question: 'Inter-chiplet communication compared to on-die communication typically has:',
      options: [
        { text: 'Lower latency and power', correct: false },
        { text: 'Higher latency and power', correct: true },
        { text: 'The same latency but lower power', correct: false },
        { text: 'No difference in performance', correct: false },
      ],
    },
    {
      question: 'Advanced packaging technologies like 2.5D/3D help chiplets by:',
      options: [
        { text: 'Eliminating the need for interconnects', correct: false },
        { text: 'Reducing inter-chiplet latency and power', correct: true },
        { text: 'Increasing die size limits', correct: false },
        { text: 'Reducing defect density', correct: false },
      ],
    },
    {
      question: 'For small die sizes (<100mm²), monolithic is often preferred because:',
      options: [
        { text: 'Packaging overhead exceeds yield benefit', correct: true },
        { text: 'Small dice cannot be manufactured', correct: false },
        { text: 'Chiplets cannot be made small', correct: false },
        { text: 'Monolithic has zero defects', correct: false },
      ],
    },
    {
      question: 'System yield for N identical chiplets (all must work) is:',
      options: [
        { text: 'Sum of individual yields', correct: false },
        { text: 'Product of individual yields (Y^N)', correct: true },
        { text: 'Average of individual yields', correct: false },
        { text: 'Maximum of individual yields', correct: false },
      ],
    },
    {
      question: 'Heterogeneous integration allows:',
      options: [
        { text: 'Only using one process technology', correct: false },
        { text: 'Mixing different process nodes optimized for each function', correct: true },
        { text: 'Eliminating the need for packaging', correct: false },
        { text: 'Zero interconnect latency', correct: false },
      ],
    },
    {
      question: 'The break-even point for chiplets vs monolithic depends on:',
      options: [
        { text: 'Only die area', correct: false },
        { text: 'Die area, defect density, and packaging costs', correct: true },
        { text: 'Only packaging technology', correct: false },
        { text: 'Only defect density', correct: false },
      ],
    },
    {
      question: 'Companies like AMD use identical chiplets (like 8-core CCDs) to:',
      options: [
        { text: 'Reduce design complexity and increase manufacturing volume', correct: true },
        { text: 'Eliminate performance variation', correct: false },
        { text: 'Avoid using advanced packaging', correct: false },
        { text: 'Increase power consumption', correct: false },
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

  const renderVisualization = (interactive: boolean, showAdvanced: boolean = false) => {
    const width = 500;
    const height = 480;
    const calc = calculateYieldAndCost();

    // Generate wafer visualizations
    const monoWafer = generateWaferData(calc.monolithic.area, calc.monolithic.yield);
    const chipletWafer = generateWaferData(calc.chiplet.areaEach, calc.chiplet.yieldEach);

    const waferRadius = 70;
    const monoWaferX = 130;
    const chipletWaferX = 370;
    const waferY = 140;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          {/* Title */}
          <text x={250} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            Chiplets vs Monolithic: {totalDieArea}mm² Total
          </text>
          <text x={250} y={42} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            Defect Density: {defectDensity} /mm² | {showLatencyMode ? 'Latency Mode' : 'Cost Mode'}
          </text>

          {/* Wafer labels */}
          <text x={monoWaferX} y={60} fill={colors.monolithic} fontSize={12} textAnchor="middle" fontWeight="bold">
            Monolithic ({calc.monolithic.area}mm²)
          </text>
          <text x={chipletWaferX} y={60} fill={colors.chiplet} fontSize={12} textAnchor="middle" fontWeight="bold">
            Chiplets ({numChiplets}×{calc.chiplet.areaEach.toFixed(0)}mm²)
          </text>

          {/* Monolithic wafer */}
          <circle cx={monoWaferX} cy={waferY} r={waferRadius} fill="rgba(100,100,100,0.3)" stroke={colors.textMuted} strokeWidth={2} />
          {/* Die grid on wafer */}
          {Array.from({ length: Math.min(monoWafer.dicePerRow, 6) }).map((_, row) =>
            Array.from({ length: Math.min(monoWafer.dicePerRow, 6) }).map((_, col) => {
              const dieSize = (waferRadius * 1.6) / Math.min(monoWafer.dicePerRow, 6);
              const x = monoWaferX - (Math.min(monoWafer.dicePerRow, 6) * dieSize) / 2 + col * dieSize;
              const y = waferY - (Math.min(monoWafer.dicePerRow, 6) * dieSize) / 2 + row * dieSize;
              const idx = row * monoWafer.dicePerRow + col;
              const isGood = monoWafer.dice[idx] ?? false;
              // Check if die is within wafer circle
              const dx = x + dieSize/2 - monoWaferX;
              const dy = y + dieSize/2 - waferY;
              if (Math.sqrt(dx*dx + dy*dy) > waferRadius - 5) return null;
              return (
                <rect
                  key={`mono-${row}-${col}`}
                  x={x}
                  y={y}
                  width={dieSize - 2}
                  height={dieSize - 2}
                  fill={isGood ? colors.good : colors.defect}
                  opacity={0.8}
                  rx={1}
                />
              );
            })
          )}

          {/* Chiplet wafer */}
          <circle cx={chipletWaferX} cy={waferY} r={waferRadius} fill="rgba(100,100,100,0.3)" stroke={colors.textMuted} strokeWidth={2} />
          {/* Die grid on wafer */}
          {Array.from({ length: Math.min(chipletWafer.dicePerRow, 10) }).map((_, row) =>
            Array.from({ length: Math.min(chipletWafer.dicePerRow, 10) }).map((_, col) => {
              const dieSize = (waferRadius * 1.6) / Math.min(chipletWafer.dicePerRow, 10);
              const x = chipletWaferX - (Math.min(chipletWafer.dicePerRow, 10) * dieSize) / 2 + col * dieSize;
              const y = waferY - (Math.min(chipletWafer.dicePerRow, 10) * dieSize) / 2 + row * dieSize;
              const idx = row * chipletWafer.dicePerRow + col;
              const isGood = chipletWafer.dice[idx] ?? false;
              const dx = x + dieSize/2 - chipletWaferX;
              const dy = y + dieSize/2 - waferY;
              if (Math.sqrt(dx*dx + dy*dy) > waferRadius - 5) return null;
              return (
                <rect
                  key={`chip-${row}-${col}`}
                  x={x}
                  y={y}
                  width={dieSize - 1}
                  height={dieSize - 1}
                  fill={isGood ? colors.good : colors.defect}
                  opacity={0.8}
                  rx={1}
                />
              );
            })
          )}

          {/* Yield stats under wafers */}
          <text x={monoWaferX} y={waferY + waferRadius + 20} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Yield: {calc.monolithic.yield.toFixed(1)}%
          </text>
          <text x={monoWaferX} y={waferY + waferRadius + 35} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Good/wafer: {calc.monolithic.goodPerWafer.toFixed(0)}
          </text>

          <text x={chipletWaferX} y={waferY + waferRadius + 20} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Per-chiplet: {calc.chiplet.yieldEach.toFixed(1)}%
          </text>
          <text x={chipletWaferX} y={waferY + waferRadius + 35} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            System: {calc.chiplet.systemYield.toFixed(1)}%
          </text>

          {/* Package illustration - middle */}
          <rect x={220} y={250} width={60} height={50} fill={colors.bgCard} stroke={colors.interconnect} strokeWidth={2} rx={4} />
          <text x={250} y={268} fill={colors.textSecondary} fontSize={8} textAnchor="middle">Package</text>
          {/* Chiplet arrangement inside package */}
          {Array.from({ length: Math.min(numChiplets, 4) }).map((_, i) => {
            const px = 228 + (i % 2) * 22;
            const py = 272 + Math.floor(i / 2) * 14;
            return (
              <rect key={`pkg-${i}`} x={px} y={py} width={18} height={12} fill={colors.chiplet} rx={1} />
            );
          })}
          {/* Interconnect lines */}
          {advancedPackaging && showAdvanced && (
            <g opacity={0.6}>
              <line x1={237} y1={280} x2={259} y2={280} stroke={colors.interconnect} strokeWidth={2} />
              <line x1={248} y1={278} x2={248} y2={292} stroke={colors.interconnect} strokeWidth={2} />
            </g>
          )}

          {/* Cost comparison panel */}
          <rect x={10} y={320} width={230} height={150} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.cost} strokeWidth={1} />
          <text x={20} y={340} fill={colors.cost} fontSize={12} fontWeight="bold">Cost Analysis</text>

          <text x={20} y={360} fill={colors.monolithic} fontSize={10}>
            Monolithic: ${calc.monolithic.costPerGood.toFixed(0)}/good die
          </text>
          <text x={20} y={378} fill={colors.chiplet} fontSize={10}>
            Chiplets: ${calc.chiplet.totalCost.toFixed(0)}/good system
          </text>
          <text x={30} y={393} fill={colors.textMuted} fontSize={9}>
            (${calc.chiplet.costPerGood.toFixed(0)} × {numChiplets} + ${calc.chiplet.packagingCost.toFixed(0)} pkg)
          </text>

          <text x={20} y={415} fill={calc.comparison.chipletsWin ? colors.success : colors.error} fontSize={11} fontWeight="bold">
            Winner: {calc.comparison.chipletsWin ? 'Chiplets' : 'Monolithic'}
          </text>
          <text x={20} y={432} fill={colors.textSecondary} fontSize={10}>
            Ratio: {calc.comparison.costRatio.toFixed(2)}x
          </text>

          {showAdvanced && (
            <text x={20} y={450} fill={advancedPackaging ? colors.interconnect : colors.textMuted} fontSize={9}>
              Adv Pkg: {advancedPackaging ? 'Enabled' : 'Disabled'} ({advPackagingCostMult}x cost)
            </text>
          )}

          {/* Performance panel */}
          <rect x={260} y={320} width={230} height={150} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.textSecondary} strokeWidth={1} />
          <text x={270} y={340} fill={colors.textSecondary} fontSize={12} fontWeight="bold">Performance Trade-offs</text>

          <text x={270} y={360} fill={colors.monolithic} fontSize={10}>
            Mono Latency: {calc.monolithic.latency} ns
          </text>
          <text x={270} y={378} fill={colors.chiplet} fontSize={10}>
            Chiplet Latency: {calc.chiplet.latency.toFixed(1)} ns (worst case)
          </text>
          <text x={270} y={396} fill={colors.textSecondary} fontSize={10}>
            Penalty: +{calc.comparison.latencyPenalty.toFixed(1)} ns
          </text>

          <text x={270} y={420} fill={colors.monolithic} fontSize={10}>
            Mono Power: {calc.monolithic.power} pJ/bit
          </text>
          <text x={270} y={438} fill={colors.chiplet} fontSize={10}>
            Chiplet Power: {calc.chiplet.power} pJ/bit (inter-chip)
          </text>
          <text x={270} y={456} fill={colors.textMuted} fontSize={9}>
            {advancedPackaging ? 'Advanced packaging reduces penalty' : 'Standard packaging'}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setSimulationSeed(Math.random() * 10000)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.defect,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              New Defects
            </button>
            <button
              onClick={() => setShowLatencyMode(!showLatencyMode)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: showLatencyMode ? colors.interconnect : colors.cost,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {showLatencyMode ? 'Show Cost' : 'Show Latency'}
            </button>
            <button
              onClick={() => { setTotalDieArea(400); setNumChiplets(4); setDefectDensity(0.1); setInterconnectCost(20); setAdvancedPackaging(false); }}
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

  const renderControls = (showAdvancedControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Total Die Area: {totalDieArea} mm²
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="50"
          value={totalDieArea}
          onChange={(e) => setTotalDieArea(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of Chiplets: {numChiplets}
        </label>
        <input
          type="range"
          min="2"
          max="16"
          step="1"
          value={numChiplets}
          onChange={(e) => setNumChiplets(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Defect Density: {defectDensity} /mm²
        </label>
        <input
          type="range"
          min="0.01"
          max="0.5"
          step="0.01"
          value={defectDensity}
          onChange={(e) => setDefectDensity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Packaging Cost: ${interconnectCost}/chiplet
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={interconnectCost}
          onChange={(e) => setInterconnectCost(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showAdvancedControls && (
        <>
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
                checked={advancedPackaging}
                onChange={(e) => setAdvancedPackaging(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Advanced Packaging (2.5D/3D)
            </label>
          </div>

          {advancedPackaging && (
            <>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Advanced Package Cost Multiplier: {advPackagingCostMult}x
                </label>
                <input
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.5"
                  value={advPackagingCostMult}
                  onChange={(e) => setAdvPackagingCostMult(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Base Latency Penalty: {latencyPenalty} ns/hop
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={latencyPenalty}
                  onChange={(e) => setLatencyPenalty(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Yield = exp(-D × A) | Mono: {calculateYieldAndCost().monolithic.yield.toFixed(1)}% | Chiplet: {calculateYieldAndCost().chiplet.yieldEach.toFixed(1)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Cost advantage: {calculateYieldAndCost().comparison.chipletsWin ? 'Chiplets' : 'Monolithic'} by {Math.abs(1 - calculateYieldAndCost().comparison.costRatio).toFixed(0)}%
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
      borderTop: `1px solid rgba(255,255,255,0.1)`,
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
              Chiplets vs Monolithic
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why not make one giant die for everything?
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
                Larger dice are more capable, but defects are random - and the probability of
                hitting at least one defect grows with area. Chiplets split the design into
                smaller pieces, but add packaging overhead. When does each approach win?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Adjust die area and chiplet count to find the crossover point!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Two wafers: left shows large monolithic dice (few per wafer, many defective).
              Right shows small chiplets (many per wafer, mostly good). Green = good, red = defective.
              But chiplets need packaging to combine into a system.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How do chiplets compare to monolithic for large designs?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Trade-offs</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Find the break-even point between chiplets and monolithic
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Start small (100mm²) - monolithic usually wins</li>
              <li>Go large (600mm²) - watch chiplets take over</li>
              <li>Increase defect density - chiplet advantage grows</li>
              <li>Increase packaging cost - monolithic becomes competitive</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'chiplet_better';

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
              Chiplets can win on yield and cost for large designs. The exponential yield drop
              with area (Y = exp(-D×A)) means large monolithic dice have terrible yield.
              Chiplets avoid this, but add packaging costs that must be overcome.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Economics of Chiplets</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Exponential Yield:</strong> A 400mm² die
                at 0.1 defects/mm² has only 1.8% yield! Four 100mm² chiplets each have 36% yield.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>System Yield:</strong> To build a system,
                all chiplets must work. System yield = (individual yield)^N. But this is still better
                than the monolithic case for large total areas.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Packaging Overhead:</strong> Chiplets need
                interposers, high-density interconnects, and careful assembly. This adds cost per system.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Break-Even:</strong> The crossover point
                depends on area, defect density, and packaging costs. Typically {'>'} 300mm² favors chiplets.
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
              What about advanced packaging technologies?
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
              Advanced packaging (2.5D interposers, 3D stacking, hybrid bonding) provides
              much higher bandwidth and lower latency between chiplets than standard packages.
              But these technologies cost more. How does this change the trade-off?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does advanced packaging affect the chiplet vs monolithic trade-off?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Advanced Packaging</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable advanced packaging and observe the cost-performance shift
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
              Advanced packaging reduces the latency/power penalty of chiplets (making them more
              competitive with monolithic on performance), but increases cost (raising the break-even
              point). The optimal choice depends on whether cost or performance is the priority.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'breakeven';

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
              Advanced packaging shifts the break-even point by adding cost but reducing performance
              penalties. For performance-critical applications, the higher cost is justified by
              narrowing the gap with monolithic performance.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Advanced Packaging Technologies</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>2.5D Interposers:</strong> Silicon or organic
                interposers provide high-density wiring between chiplets. Intel EMIB, AMD's IF, TSMC CoWoS.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>3D Stacking:</strong> Direct die-to-die bonding
                with through-silicon vias (TSVs). Highest bandwidth, but thermal challenges.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Hybrid Bonding:</strong> Direct copper-to-copper
                connections at sub-micron pitch. Approaching monolithic-like interconnect density.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Cost-Performance Trade:</strong> Each technology
                has different cost, bandwidth, power, and thermal characteristics. System architects
                choose based on application requirements.
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
              Chiplets are transforming the semiconductor industry
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
                {testScore >= 8 ? 'You\'ve mastered chiplet economics!' : 'Review the material and try again.'}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered chiplet vs monolithic trade-offs</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Yield drops exponentially with area: Y = exp(-D x A)</li>
              <li>Chiplets improve individual yield but need packaging</li>
              <li>System yield = (chiplet yield)^N for N chiplets</li>
              <li>Break-even depends on area, defects, and packaging cost</li>
              <li>Advanced packaging reduces latency/power at higher cost</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The industry is rapidly adopting chiplets and advanced packaging. UCIe (Universal Chiplet
              Interconnect Express) is emerging as a standard. Heterogeneous integration enables mixing
              of process nodes, memory types, and even materials. The future of semiconductors is
              system-in-package, not system-on-chip.
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

export default ChipletsVsMonolithsRenderer;
