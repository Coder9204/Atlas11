import React, { useState, useEffect, useCallback } from 'react';

interface CleanroomYieldRendererProps {
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
  wafer: '#6366f1',
  goodDie: '#22c55e',
  badDie: '#ef4444',
  defect: '#f97316',
  spare: '#8b5cf6',
};

const CleanroomYieldRenderer: React.FC<CleanroomYieldRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [defectDensity, setDefectDensity] = useState(0.5); // defects per cm^2
  const [dieArea, setDieArea] = useState(100); // mm^2
  const [redundancyEnabled, setRedundancyEnabled] = useState(false);
  const [spareRows, setSpareRows] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [defectPositions, setDefectPositions] = useState<Array<{x: number, y: number}>>([]);

  // Generate random defect positions
  useEffect(() => {
    const waferArea = 706.86; // 300mm wafer in cm^2
    const numDefects = Math.floor(defectDensity * waferArea);
    const positions = [];
    for (let i = 0; i < numDefects; i++) {
      // Random position within circular wafer
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random()) * 140; // radius up to 140 (wafer edge)
      positions.push({
        x: 150 + r * Math.cos(angle),
        y: 150 + r * Math.sin(angle),
      });
    }
    setDefectPositions(positions);
  }, [defectDensity]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations - Yield model (Poisson)
  const calculateYield = useCallback(() => {
    // Die area in cm^2
    const dieAreaCm2 = dieArea / 100;

    // Poisson yield model: Y = exp(-D * A)
    // D = defect density, A = die area
    const poissonYield = Math.exp(-defectDensity * dieAreaCm2);

    // Murphy yield model (more realistic): Y = ((1 - exp(-D*A)) / (D*A))^2
    const da = defectDensity * dieAreaCm2;
    const murphyYield = da > 0.01 ? Math.pow((1 - Math.exp(-da)) / da, 2) : 1;

    // With redundancy (spare rows can repair some defects)
    // Simplified: each spare row can absorb defects in that row
    const repairProbability = redundancyEnabled ? Math.min(0.9, spareRows * 0.2) : 0;
    const redundantYield = poissonYield + (1 - poissonYield) * repairProbability;

    // Die count on 300mm wafer
    const waferArea = 70686; // mm^2
    const diesPerWafer = Math.floor(waferArea / dieArea * 0.85); // 85% utilization

    // Good dies
    const goodDiesPoisson = Math.round(diesPerWafer * poissonYield);
    const goodDiesRedundant = Math.round(diesPerWafer * redundantYield);

    // Cost impact
    const costPerWafer = 10000; // $10k per wafer (simplified)
    const costPerGoodDie = diesPerWafer > 0 ? costPerWafer / goodDiesPoisson : Infinity;
    const costPerGoodDieRedundant = diesPerWafer > 0 ? costPerWafer / goodDiesRedundant : Infinity;

    return {
      poissonYield: poissonYield * 100,
      murphyYield: murphyYield * 100,
      redundantYield: redundantYield * 100,
      diesPerWafer,
      goodDiesPoisson,
      goodDiesRedundant,
      costPerGoodDie,
      costPerGoodDieRedundant,
      defectsPerWafer: Math.round(defectDensity * 706.86),
    };
  }, [defectDensity, dieArea, redundancyEnabled, spareRows]);

  // Animation for defect density sweep
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setDefectDensity(prev => {
        const newVal = prev + 0.1;
        if (newVal >= 3) {
          setIsAnimating(false);
          return 3;
        }
        return newVal;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Yield decreases linearly - 2x defects = 2x fewer good dies' },
    { id: 'exponential', label: 'Yield drops exponentially - small defect increase causes big yield loss' },
    { id: 'threshold', label: 'Yield stays high until defects reach a critical density, then collapses' },
    { id: 'random', label: 'Yield is random - defect impact is unpredictable' },
  ];

  const twistPredictions = [
    { id: 'no_help', label: 'Redundancy doesn\'t help - defects still kill dies' },
    { id: 'small_help', label: 'Small improvement (5-10%) in yield' },
    { id: 'big_help', label: 'Significant improvement (20-40%) in yield recovery' },
    { id: 'perfect', label: 'Redundancy makes yield nearly 100%' },
  ];

  const transferApplications = [
    {
      title: 'DRAM Memory Manufacturing',
      description: 'Memory chips use extensive redundancy with spare rows and columns.',
      question: 'Why do memory chips use more redundancy than logic chips?',
      answer: 'Memory arrays are highly regular structures where any row or column can be replaced by a spare. A 16Gb DRAM has ~32 billion cells - with 0.1 defects/cm2, each die would have ~10 defects! Spare rows/columns let the chip "repair" around defects during testing, recovering what would otherwise be dead dies.',
    },
    {
      title: 'GPU and AI Chip Binning',
      description: 'NVIDIA and AMD sell the same chip design at different performance levels.',
      question: 'How do companies profit from partially defective chips?',
      answer: 'A die with a defective compute unit isn\'t dead - it\'s a lower-tier product! An RTX 4090 with one bad streaming multiprocessor becomes an RTX 4080. This "binning" recovers revenue from imperfect dies. High-defect wafers produce more mid-tier chips, while clean wafers yield the flagship products.',
    },
    {
      title: 'Apple M-Series Chips',
      description: 'Apple\'s chips are among the largest consumer processors ever made.',
      question: 'Why does Apple\'s M1 Ultra use a "die-to-die" connection approach?',
      answer: 'The M1 Ultra is two M1 Max dies connected together. At ~420mm2 each, making a single 840mm2 die would have terrible yield (<10% at typical defect densities). By connecting two smaller dies, Apple achieves better effective yield: even if one die is bad, the other can be used in an M1 Max product.',
    },
    {
      title: 'Cleanroom Contamination Events',
      description: 'A single contamination event can ruin weeks of production.',
      question: 'How do fabs detect and respond to contamination excursions?',
      answer: 'Fabs monitor particle counts continuously and run "short loop" test wafers through critical steps. When defect density spikes, they quarantine in-process wafers, identify the contamination source (often a failing filter or human error), and may scrap hundreds of wafers worth millions of dollars. Prevention through extreme cleanliness is far cheaper than recovery.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does a single particle defect "kill" a billion transistors?',
      options: [
        { text: 'Particles are radioactive and damage surrounding areas', correct: false },
        { text: 'A particle can short or open critical interconnects, breaking the circuit', correct: true },
        { text: 'Particles change the chemical composition of silicon', correct: false },
        { text: 'Particles only affect transistors directly underneath them', correct: false },
      ],
    },
    {
      question: 'The Poisson yield model predicts that yield equals:',
      options: [
        { text: 'Y = 1 - (D x A) for small defect densities', correct: false },
        { text: 'Y = exp(-D x A) where D is defect density and A is die area', correct: true },
        { text: 'Y = D / A for all conditions', correct: false },
        { text: 'Y is always constant for a given fab', correct: false },
      ],
    },
    {
      question: 'If you double the die area while keeping defect density constant:',
      options: [
        { text: 'Yield stays the same', correct: false },
        { text: 'Yield decreases linearly (by half)', correct: false },
        { text: 'Yield decreases exponentially (by more than half)', correct: true },
        { text: 'Yield increases because larger dies are easier to inspect', correct: false },
      ],
    },
    {
      question: 'What is the typical defect density in a modern leading-edge fab?',
      options: [
        { text: '100-1000 defects per cm2', correct: false },
        { text: '10-50 defects per cm2', correct: false },
        { text: '0.05-0.3 defects per cm2', correct: true },
        { text: 'Zero defects per cm2 (perfect process)', correct: false },
      ],
    },
    {
      question: 'Redundancy in memory chips works by:',
      options: [
        { text: 'Making transistors larger and more defect-resistant', correct: false },
        { text: 'Including spare rows/columns that can replace defective ones', correct: true },
        { text: 'Running the chip at lower speed to avoid defective areas', correct: false },
        { text: 'Using error correction to fix wrong bits', correct: false },
      ],
    },
    {
      question: '"Binning" in chip manufacturing refers to:',
      options: [
        { text: 'Throwing away defective chips in bins', correct: false },
        { text: 'Sorting chips by performance level based on defects and speed', correct: true },
        { text: 'Packaging chips in protective bins for shipping', correct: false },
        { text: 'Storing wafers in cleanroom bins', correct: false },
      ],
    },
    {
      question: 'Why do chipmakers prefer many small dies over fewer large dies?',
      options: [
        { text: 'Small dies are easier to design', correct: false },
        { text: 'Small dies have exponentially higher yield and lower cost per function', correct: true },
        { text: 'Large dies require special equipment', correct: false },
        { text: 'Customers prefer small chips', correct: false },
      ],
    },
    {
      question: 'A 300mm wafer can produce approximately how many 100mm2 dies?',
      options: [
        { text: '50-100 dies', correct: false },
        { text: '200-400 dies', correct: false },
        { text: '500-700 dies', correct: true },
        { text: '1000+ dies', correct: false },
      ],
    },
    {
      question: 'If defect density is 0.5/cm2 and die area is 2 cm2, expected yield is approximately:',
      options: [
        { text: '90%', correct: false },
        { text: '63% (e^-1)', correct: false },
        { text: '37% (e^-1)', correct: true },
        { text: '13% (e^-2)', correct: false },
      ],
    },
    {
      question: 'Cleanroom classification "Class 1" means:',
      options: [
        { text: 'No more than 1 particle per cubic foot of air', correct: true },
        { text: 'The room was cleaned once per day', correct: false },
        { text: 'Only 1 worker is allowed inside', correct: false },
        { text: 'The first room in the facility', correct: false },
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

  const renderVisualization = (interactive: boolean, showRedundancy: boolean = false) => {
    const width = 500;
    const height = 480;
    const yieldData = calculateYield();

    // Wafer visualization
    const waferCenterX = 150;
    const waferCenterY = 160;
    const waferRadius = 130;

    // Calculate die grid
    const dieSide = Math.sqrt(dieArea);
    const dieDisplaySize = Math.max(8, Math.min(20, 200 / Math.sqrt(yieldData.diesPerWafer)));

    // Generate die positions within wafer
    const dies: Array<{x: number, y: number, good: boolean, hasDefect: boolean, repaired: boolean}> = [];
    const gridSize = Math.ceil(waferRadius * 2 / dieDisplaySize);
    const startX = waferCenterX - gridSize * dieDisplaySize / 2;
    const startY = waferCenterY - gridSize * dieDisplaySize / 2;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = startX + col * dieDisplaySize + dieDisplaySize / 2;
        const y = startY + row * dieDisplaySize + dieDisplaySize / 2;
        const distFromCenter = Math.sqrt((x - waferCenterX) ** 2 + (y - waferCenterY) ** 2);

        if (distFromCenter < waferRadius - 5) {
          // Check if any defect hits this die
          const hasDefect = defectPositions.some(def => {
            const dx = def.x - x;
            const dy = def.y - y;
            return Math.abs(dx) < dieDisplaySize / 2 && Math.abs(dy) < dieDisplaySize / 2;
          });

          // With redundancy, some defective dies can be repaired
          const repaired = hasDefect && showRedundancy && redundancyEnabled && Math.random() < spareRows * 0.2;
          const good = !hasDefect || repaired;

          dies.push({ x, y, good, hasDefect, repaired });
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <radialGradient id="waferGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.wafer} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.wafer} stopOpacity="0.1" />
            </radialGradient>
            <filter id="defectGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={250} y={25} fill={colors.accent} fontSize={14} fontWeight="bold" textAnchor="middle">
            300mm Wafer - Yield Simulation
          </text>

          {/* Wafer circle */}
          <circle
            cx={waferCenterX}
            cy={waferCenterY}
            r={waferRadius}
            fill="url(#waferGrad)"
            stroke={colors.wafer}
            strokeWidth={2}
          />

          {/* Wafer notch */}
          <rect
            x={waferCenterX - 5}
            y={waferCenterY + waferRadius - 8}
            width={10}
            height={10}
            fill={colors.bgPrimary}
          />

          {/* Dies */}
          {dies.map((die, i) => (
            <rect
              key={`die${i}`}
              x={die.x - dieDisplaySize / 2 + 1}
              y={die.y - dieDisplaySize / 2 + 1}
              width={dieDisplaySize - 2}
              height={dieDisplaySize - 2}
              fill={die.repaired ? colors.spare : die.good ? colors.goodDie : colors.badDie}
              opacity={die.good ? 0.8 : 0.6}
              rx={1}
            />
          ))}

          {/* Defect markers */}
          {defectPositions.slice(0, 50).map((def, i) => (
            <circle
              key={`defect${i}`}
              cx={def.x}
              cy={def.y}
              r={3}
              fill={colors.defect}
              filter="url(#defectGlow)"
            />
          ))}

          {/* Legend */}
          <g transform="translate(10, 310)">
            <rect x={0} y={0} width={120} height={80} fill="rgba(0,0,0,0.5)" rx={8} />
            <text x={10} y={18} fill={colors.accent} fontSize={10} fontWeight="bold">Legend</text>

            <rect x={10} y={28} width={12} height={12} fill={colors.goodDie} rx={2} />
            <text x={28} y={38} fill={colors.textSecondary} fontSize={9}>Good Die</text>

            <rect x={10} y={45} width={12} height={12} fill={colors.badDie} rx={2} />
            <text x={28} y={55} fill={colors.textSecondary} fontSize={9}>Defective</text>

            {showRedundancy && (
              <>
                <rect x={10} y={62} width={12} height={12} fill={colors.spare} rx={2} />
                <text x={28} y={72} fill={colors.textSecondary} fontSize={9}>Repaired</text>
              </>
            )}
          </g>

          {/* Stats panel */}
          <g transform="translate(300, 50)">
            <rect x={0} y={0} width={190} height={140} fill="rgba(0,0,0,0.5)" rx={8} />
            <text x={10} y={20} fill={colors.accent} fontSize={11} fontWeight="bold">Yield Statistics</text>

            <text x={10} y={42} fill={colors.textSecondary} fontSize={10}>Defect Density:</text>
            <text x={110} y={42} fill={colors.textPrimary} fontSize={10}>{defectDensity.toFixed(2)} /cm2</text>

            <text x={10} y={58} fill={colors.textSecondary} fontSize={10}>Die Area:</text>
            <text x={110} y={58} fill={colors.textPrimary} fontSize={10}>{dieArea} mm2</text>

            <text x={10} y={74} fill={colors.textSecondary} fontSize={10}>Dies per Wafer:</text>
            <text x={110} y={74} fill={colors.textPrimary} fontSize={10}>{yieldData.diesPerWafer}</text>

            <text x={10} y={94} fill={colors.textSecondary} fontSize={10}>Poisson Yield:</text>
            <text x={110} y={94} fill={yieldData.poissonYield > 50 ? colors.success : colors.error} fontSize={10} fontWeight="bold">
              {yieldData.poissonYield.toFixed(1)}%
            </text>

            <text x={10} y={110} fill={colors.textSecondary} fontSize={10}>Good Dies:</text>
            <text x={110} y={110} fill={colors.success} fontSize={10} fontWeight="bold">
              {showRedundancy && redundancyEnabled ? yieldData.goodDiesRedundant : yieldData.goodDiesPoisson}
            </text>

            <text x={10} y={130} fill={colors.textSecondary} fontSize={10}>Cost/Die:</text>
            <text x={110} y={130} fill={colors.textPrimary} fontSize={10}>
              ${(showRedundancy && redundancyEnabled ? yieldData.costPerGoodDieRedundant : yieldData.costPerGoodDie).toFixed(0)}
            </text>
          </g>

          {/* Yield curve */}
          <g transform="translate(300, 200)">
            <rect x={0} y={0} width={190} height={120} fill="rgba(0,0,0,0.5)" rx={8} />
            <text x={95} y={18} fill={colors.accent} fontSize={10} fontWeight="bold" textAnchor="middle">
              Yield vs Defect Density
            </text>

            {/* Axes */}
            <line x1={30} y1={100} x2={180} y2={100} stroke={colors.textMuted} strokeWidth={1} />
            <line x1={30} y1={30} x2={30} y2={100} stroke={colors.textMuted} strokeWidth={1} />

            {/* Y-axis labels */}
            <text x={25} y={35} fill={colors.textMuted} fontSize={8} textAnchor="end">100%</text>
            <text x={25} y={65} fill={colors.textMuted} fontSize={8} textAnchor="end">50%</text>
            <text x={25} y={100} fill={colors.textMuted} fontSize={8} textAnchor="end">0%</text>

            {/* X-axis labels */}
            <text x={30} y={112} fill={colors.textMuted} fontSize={8}>0</text>
            <text x={105} y={112} fill={colors.textMuted} fontSize={8}>1.5</text>
            <text x={175} y={112} fill={colors.textMuted} fontSize={8}>3</text>

            {/* Yield curve */}
            <path
              d={`M 30,${100 - Math.exp(-0 * dieArea / 100) * 70}
                  ${[...Array(30)].map((_, i) => {
                    const d = (i / 29) * 3;
                    const y = Math.exp(-d * dieArea / 100);
                    return `L ${30 + i * 5},${100 - y * 70}`;
                  }).join(' ')}`}
              fill="none"
              stroke={colors.success}
              strokeWidth={2}
            />

            {/* Current position marker */}
            <circle
              cx={30 + (defectDensity / 3) * 150}
              cy={100 - yieldData.poissonYield / 100 * 70}
              r={5}
              fill={colors.accent}
            />

            {/* Redundancy curve if enabled */}
            {showRedundancy && redundancyEnabled && (
              <path
                d={`M 30,${100 - 70}
                    ${[...Array(30)].map((_, i) => {
                      const d = (i / 29) * 3;
                      const baseY = Math.exp(-d * dieArea / 100);
                      const repairProb = spareRows * 0.2;
                      const redY = baseY + (1 - baseY) * repairProb;
                      return `L ${30 + i * 5},${100 - redY * 70}`;
                    }).join(' ')}`}
                fill="none"
                stroke={colors.spare}
                strokeWidth={2}
                strokeDasharray="4,2"
              />
            )}
          </g>

          {/* Redundancy indicator */}
          {showRedundancy && redundancyEnabled && (
            <g transform="translate(300, 330)">
              <rect x={0} y={0} width={190} height={50} fill="rgba(139, 92, 246, 0.2)" rx={8} />
              <text x={10} y={18} fill={colors.spare} fontSize={10} fontWeight="bold">
                Redundancy Active
              </text>
              <text x={10} y={35} fill={colors.textSecondary} fontSize={9}>
                Spare Rows: {spareRows} | Repair Rate: {(spareRows * 20).toFixed(0)}%
              </text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setDefectDensity(0.1); setIsAnimating(true); }}
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
              {isAnimating ? 'Simulating...' : 'Sweep Defects'}
            </button>
            <button
              onClick={() => { setDefectDensity(0.5); setIsAnimating(false); }}
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

  const renderControls = (showRedundancy: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Defect Density: {defectDensity.toFixed(2)} defects/cm2
        </label>
        <input
          type="range"
          min="0.05"
          max="3"
          step="0.05"
          value={defectDensity}
          onChange={(e) => setDefectDensity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Die Area: {dieArea} mm2
        </label>
        <input
          type="range"
          min="20"
          max="500"
          step="20"
          value={dieArea}
          onChange={(e) => setDieArea(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showRedundancy && (
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
                checked={redundancyEnabled}
                onChange={(e) => setRedundancyEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Spare Row Redundancy
            </label>
          </div>

          {redundancyEnabled && (
            <div>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Spare Rows per Block: {spareRows}
              </label>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={spareRows}
                onChange={(e) => setSpareRows(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(99, 102, 241, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.wafer}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Poisson Model: Y = e^(-D x A) = e^(-{defectDensity.toFixed(2)} x {(dieArea/100).toFixed(2)})
        </div>
        <div style={{ color: colors.textPrimary, fontSize: '14px', marginTop: '4px', fontWeight: 'bold' }}>
          Yield = {calculateYield().poissonYield.toFixed(1)}% | Good Dies = {calculateYield().goodDiesPoisson}
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
              How Can ONE Speck Kill a Billion Transistors?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The exponential physics of chip yield
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
                A modern chip has billions of transistors in an area smaller than your fingernail.
                A single microscopic particle - a speck of dust, a flake of skin - landing on the
                wafer during manufacturing can short-circuit or open critical connections.
                That one particle can kill an entire die worth $50-500!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is why chip fabs are the cleanest places on Earth.
              </p>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.wafer}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch how yield collapses as defect density increases!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A 300mm wafer contains hundreds of individual dies (chips). Random particle defects
              are distributed across the wafer during processing. Each defect that lands on a die
              has a chance of killing that die. How does yield (percentage of good dies) change
              as defect density increases?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does yield change as defect density increases?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Yield Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust defect density and die size to see yield impact
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
              <li>Start at 0.1 defects/cm2 and increase to 2.0 - watch yield curve</li>
              <li>Compare small (50mm2) vs large (400mm2) dies at same defect density</li>
              <li>Find the defect density where yield drops below 50%</li>
              <li>Calculate cost per good die at different yields</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'exponential';

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
              Yield follows an exponential decay: Y = e^(-D x A). This means even a small increase
              in defect density causes a dramatic drop in yield, especially for large dies!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Poisson Yield Model</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Random Defects:</strong> Particles fall
                randomly on the wafer following a Poisson distribution. The probability of a die
                having zero defects is e^(-average defects per die).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Area Matters:</strong> A 100mm2 die
                is 4x more likely to be hit than a 25mm2 die. This is why chipmakers prefer smaller
                dies - yield is exponentially better!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Fab Cleanliness:</strong> Reducing
                defect density from 0.5 to 0.1 /cm2 can increase yield from 60% to 90% for a typical die.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Economic Impact:</strong> At $10k/wafer,
                going from 50% to 90% yield cuts die cost by nearly half!
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
              What if we add spare rows that can replace defective ones?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Redundancy Design:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Memory chips include extra "spare" rows and columns. During testing, if a defect
              is found, the defective row can be electrically replaced by a spare using laser
              fuses or electronic switches. Can this recover our lost yield?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How much can spare-row redundancy improve yield?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Redundancy</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable spare rows and see how yield recovers
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.spare}`,
          }}>
            <h4 style={{ color: colors.spare, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              With 4 spare rows per block, a die that would otherwise be dead due to a single
              defect can be "repaired" during testing. This converts bad dies to good dies,
              recovering significant yield at moderate defect densities!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'big_help';

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
              Redundancy can recover 20-40% of otherwise-dead dies, especially at moderate
              defect densities. This is why all modern memory chips use extensive redundancy!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Redundancy Strategies</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Spare Rows/Columns:</strong> Memory
                arrays include extra rows and columns that can substitute for defective ones.
                DRAM typically has 1-2% redundancy overhead.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Laser Repair:</strong> After testing,
                a laser blows tiny fuses to reroute connections from defective to spare elements.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Limits of Redundancy:</strong> Redundancy
                can't fix every defect. If too many defects cluster in one area, or if defects hit
                non-redundant logic, the die is still dead. Cleanliness remains essential!
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
              Yield engineering drives semiconductor economics
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
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.wafer, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
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
                {testScore >= 8 ? 'You understand cleanroom yield physics!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand cleanroom yield and defect physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Yield = e^(-D x A) - exponential relationship</li>
              <li>Larger dies have exponentially worse yield</li>
              <li>Defect density is critical to fab economics</li>
              <li>Redundancy can recover 20-40% of defective dies</li>
              <li>Binning converts partial defects to lower-tier products</li>
              <li>Cost per good die depends strongly on yield</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.wafer, marginBottom: '12px' }}>The Billion-Dollar Clean:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fabs spend billions on cleanrooms because the physics is unforgiving.
              At 3nm process nodes, a single 50nm particle can kill a die worth $500.
              Your understanding of yield physics explains why semiconductor companies obsess
              over cleanliness - it's not perfectionism, it's pure economics!
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

export default CleanroomYieldRenderer;
