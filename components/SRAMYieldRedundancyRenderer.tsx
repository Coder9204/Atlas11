const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {};

import React, { useState, useCallback, useEffect, useRef } from 'react';


interface GameEvent {
  type: 'phase_complete' | 'answer_correct' | 'answer_incorrect' | 'interaction';
  phase?: string;
  data?: Record<string, unknown>;
}

interface SRAMYieldRedundancyRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type SRAMPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: SRAMPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseOrder: SRAMPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<SRAMPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Explain',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Mastery',
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
  good: '#10b981',
  defect: '#ef4444',
  spare: '#3b82f6',
  repaired: '#8b5cf6',
  ecc: '#06b6d4',
};

// Seeded random for reproducibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const SRAMYieldRedundancyRenderer: React.FC<SRAMYieldRedundancyRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): SRAMPhase => {
    if (gamePhase && validPhases.includes(gamePhase as SRAMPhase)) {
      return gamePhase as SRAMPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<SRAMPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const navigationRef = useRef<boolean>(false);

  // Sync with external gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as SRAMPhase)) {
      setPhase(gamePhase as SRAMPhase);
    }
  }, [gamePhase]);

  // Mobile detection
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

  // Navigation functions
  const goToPhase = useCallback((newPhase: SRAMPhase) => {
    if (navigationRef.current) return;
    navigationRef.current = true;

    playSound('transition');
    setPhase(newPhase);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_complete', phase: newPhase });
    }

    setTimeout(() => {
      navigationRef.current = false;
    }, 300);
  }, [onGameEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [arrayRows, setArrayRows] = useState(32);
  const [arrayCols, setArrayCols] = useState(32);
  const [defectDensity, setDefectDensity] = useState(0.5); // defects per 1000 bits
  const [spareRows, setSpareRows] = useState(2);
  const [spareCols, setSpareCols] = useState(2);
  const [enableECC, setEnableECC] = useState(false);
  const [eccBits, setEccBits] = useState(1); // Number of bits ECC can correct
  const [simulationSeed, setSimulationSeed] = useState(42);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Generate defect map
  const generateDefectMap = useCallback(() => {
    const defects: { row: number; col: number }[] = [];
    const totalBits = arrayRows * arrayCols;

    for (let i = 0; i < totalBits; i++) {
      const rand = seededRandom(simulationSeed * 10000 + i);
      if (rand < defectDensity / 1000) {
        defects.push({
          row: Math.floor(i / arrayCols),
          col: i % arrayCols,
        });
      }
    }

    return defects;
  }, [arrayRows, arrayCols, defectDensity, simulationSeed]);

  // Calculate yield with redundancy
  const calculateYield = useCallback(() => {
    const defects = generateDefectMap();

    // Count defects per row and column
    const rowDefects: { [key: number]: number } = {};
    const colDefects: { [key: number]: number } = {};
    defects.forEach(d => {
      rowDefects[d.row] = (rowDefects[d.row] || 0) + 1;
      colDefects[d.col] = (colDefects[d.col] || 0) + 1;
    });

    // Rows and columns with defects
    const defectiveRows = Object.keys(rowDefects).map(Number);
    const defectiveCols = Object.keys(colDefects).map(Number);

    // Simple repair algorithm: replace worst rows/cols first
    let repairedDefects = 0;

    // Repair rows (removes all defects in that row)
    const sortedRows = defectiveRows.sort((a, b) => (rowDefects[b] || 0) - (rowDefects[a] || 0));
    const repairedRows = sortedRows.slice(0, spareRows);
    repairedRows.forEach(row => {
      repairedDefects += rowDefects[row] || 0;
    });

    // Repair columns (but only count defects not already fixed by row repair)
    const sortedCols = defectiveCols.sort((a, b) => (colDefects[b] || 0) - (colDefects[a] || 0));
    const repairedCols = sortedCols.slice(0, spareCols);
    repairedCols.forEach(col => {
      defects.forEach(d => {
        if (d.col === col && !repairedRows.includes(d.row)) {
          repairedDefects++;
        }
      });
    });

    let remainingDefects = defects.length - repairedDefects;

    // ECC can correct remaining single-bit errors per word
    let eccCorrected = 0;
    if (enableECC && remainingDefects > 0) {
      // Assume 64-bit words, ECC can correct 'eccBits' per word
      const wordDefects: { [key: string]: number } = {};

      defects.forEach(d => {
        if (!repairedRows.includes(d.row) && !repairedCols.includes(d.col)) {
          const wordId = `${d.row}_${Math.floor(d.col / 64)}`;
          wordDefects[wordId] = (wordDefects[wordId] || 0) + 1;
        }
      });

      Object.values(wordDefects).forEach(count => {
        if (count <= eccBits) {
          eccCorrected += count;
        }
      });

      remainingDefects -= eccCorrected;
    }

    // Calculate yields
    const totalBits = arrayRows * arrayCols;

    return {
      totalBits,
      defects,
      defectiveRows,
      defectiveCols,
      repairedRows,
      repairedCols,
      repairedDefects,
      eccCorrected,
      remainingDefects,
      rawYield: defects.length === 0 ? 100 : Math.max(0, 100 * (1 - defects.length / 50)),
      repairedYield: Math.max(0, 100 * (remainingDefects === 0 ? 1 : (1 - remainingDefects / 20))),
    };
  }, [generateDefectMap, spareRows, spareCols, enableECC, eccBits, arrayRows, arrayCols]);

  // Animation effect
  useEffect(() => {
    if (isAnimating && animationStep < 3) {
      const timer = setTimeout(() => {
        setAnimationStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (animationStep >= 3) {
      setIsAnimating(false);
    }
  }, [isAnimating, animationStep]);

  const predictions = [
    { id: 'linear', label: 'Memory yield scales linearly with array size' },
    { id: 'exponential', label: 'Yield drops exponentially as arrays get larger' },
    { id: 'constant', label: 'Yield is constant regardless of size' },
    { id: 'quadratic', label: 'Yield drops with the square of array size' },
  ];

  const twistPredictions = [
    { id: 'redundancy_only', label: 'Redundancy alone is sufficient - ECC adds complexity' },
    { id: 'ecc_only', label: 'ECC alone is sufficient - redundancy is outdated' },
    { id: 'combined', label: 'Combining redundancy and ECC gives the best yield' },
    { id: 'neither', label: 'Neither helps significantly' },
  ];

  const transferApplications = [
    {
      title: 'DRAM Error Correction',
      description: 'Modern DRAM modules use ECC to detect and correct single-bit errors in real-time.',
      question: 'Why is ECC standard in server DRAM but optional in consumer PCs?',
      answer: 'Servers run continuously with critical data, making silent data corruption unacceptable. The ~3% cost/power overhead of ECC is justified. Consumer PCs run shorter workloads where the statistical risk is lower and cost sensitivity is higher.',
    },
    {
      title: 'Flash Memory Management',
      description: 'NAND flash has high defect rates that increase with wear, requiring sophisticated management.',
      question: 'How do SSDs maintain reliability despite flash memory wear?',
      answer: 'SSDs use multiple layers of ECC (BCH or LDPC codes), wear leveling to distribute writes, spare blocks to replace worn-out cells, and over-provisioning (hidden extra capacity). These techniques mask the underlying unreliability.',
    },
    {
      title: 'Cache Memory Design',
      description: 'CPU caches use fast SRAM that must be extremely reliable for correct program execution.',
      question: 'Why do L1 caches often use parity while L2/L3 use ECC?',
      answer: 'L1 caches prioritize speed, using parity (fast detection, no correction) and relying on cache miss to recover. L2/L3 caches are larger and slower, making ECC correction worthwhile. The latency penalty is hidden by L1.',
    },
    {
      title: 'Wafer Sort and Testing',
      description: 'Memory chips are tested at the wafer level to identify and map out defects before packaging.',
      question: 'How does redundancy repair interact with wafer testing?',
      answer: 'During wafer sort, each die is tested to create a "repair signature" - which spare rows/columns replace which defective ones. This information is programmed into on-chip fuses. Only unrepairable dice are discarded.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why is memory often the yield limiter in modern SoCs?',
      options: [
        { text: 'Memory is always the largest component', correct: false },
        { text: 'Large arrays have exponentially more exposure to defects', correct: true },
        { text: 'Memory is made with different technology', correct: false },
        { text: 'Memory is tested last in the manufacturing flow', correct: false },
      ],
    },
    {
      question: 'Spare rows and columns in SRAM provide:',
      options: [
        { text: 'Additional storage capacity', correct: false },
        { text: 'Redundancy to replace defective cells', correct: true },
        { text: 'Faster memory access', correct: false },
        { text: 'Lower power consumption', correct: false },
      ],
    },
    {
      question: 'The Poisson distribution is used for yield modeling because:',
      options: [
        { text: 'Defects are uniformly distributed', correct: false },
        { text: 'Defects occur randomly with a known average rate', correct: true },
        { text: 'It provides the most optimistic estimate', correct: false },
        { text: 'It is the simplest model', correct: false },
      ],
    },
    {
      question: 'ECC (Error Correcting Code) in memory:',
      options: [
        { text: 'Prevents defects from occurring', correct: false },
        { text: 'Detects and corrects bit errors during operation', correct: true },
        { text: 'Only works during manufacturing test', correct: false },
        { text: 'Replaces redundancy completely', correct: false },
      ],
    },
    {
      question: 'A SECDED code can:',
      options: [
        { text: 'Correct any number of errors', correct: false },
        { text: 'Correct 1 error and detect 2 errors', correct: true },
        { text: 'Only detect errors, not correct them', correct: false },
        { text: 'Correct errors in multiple words simultaneously', correct: false },
      ],
    },
    {
      question: 'Redundancy repair information is typically stored in:',
      options: [
        { text: 'External configuration files', correct: false },
        { text: 'On-chip fuses programmed during test', correct: true },
        { text: 'The operating system', correct: false },
        { text: 'Temporary registers', correct: false },
      ],
    },
    {
      question: 'The yield improvement from redundancy saturates when:',
      options: [
        { text: 'The array becomes too small', correct: false },
        { text: 'Defect rate exceeds spare capacity', correct: true },
        { text: 'Testing becomes too expensive', correct: false },
        { text: 'Power consumption is too high', correct: false },
      ],
    },
    {
      question: 'Combining redundancy with ECC is effective because:',
      options: [
        { text: 'They are identical techniques', correct: false },
        { text: 'Redundancy handles clustered defects, ECC handles random bit errors', correct: true },
        { text: 'ECC is free', correct: false },
        { text: 'Redundancy requires no area overhead', correct: false },
      ],
    },
    {
      question: 'Defect density in semiconductor manufacturing:',
      options: [
        { text: 'Is zero in modern fabs', correct: false },
        { text: 'Is typically measured in defects per square centimeter', correct: true },
        { text: 'Only affects logic, not memory', correct: false },
        { text: 'Is the same for all manufacturers', correct: false },
      ],
    },
    {
      question: 'A memory chip with 1Gb capacity and 0.1 defects/Mb has approximately:',
      options: [
        { text: '1 defect total', correct: false },
        { text: '10 defects total', correct: false },
        { text: '100 defects total', correct: true },
        { text: '1000 defects total', correct: false },
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

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    }}>
      {phaseOrder.map((p, index) => {
        const isActive = p === phase;
        const isPast = phaseOrder.indexOf(p) < phaseOrder.indexOf(phase);
        return (
          <div
            key={p}
            onClick={() => isPast && goToPhase(p)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: isPast ? 'pointer' : 'default',
              opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
            }}
          >
            <div style={{
              width: isMobile ? '10px' : '12px',
              height: isMobile ? '10px' : '12px',
              borderRadius: '50%',
              background: isActive ? colors.accent : isPast ? colors.success : 'rgba(255,255,255,0.3)',
              border: isActive ? `2px solid ${colors.accent}` : 'none',
              boxShadow: isActive ? `0 0 8px ${colors.accentGlow}` : 'none',
            }} />
            {!isMobile && (
              <span style={{
                fontSize: '9px',
                color: isActive ? colors.accent : colors.textMuted,
                marginTop: '4px',
              }}>
                {phaseLabels[p]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderVisualization = (interactive: boolean, showECC: boolean = false) => {
    const width = 500;
    const height = 450;
    const yieldData = calculateYield();

    // Calculate cell size for array display
    const cellSize = Math.min(8, Math.floor(280 / Math.max(arrayRows, arrayCols)));
    const gridStartX = 50;
    const gridStartY = 60;

    // Determine which step of repair to show
    const showDefects = animationStep >= 0 || !isAnimating;
    const showRowRepair = animationStep >= 1 || !isAnimating;
    const showColRepair = animationStep >= 2 || !isAnimating;
    const showECCRepair = animationStep >= 3 || !isAnimating;

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
            SRAM Array: {arrayRows} x {arrayCols} = {yieldData.totalBits} bits
          </text>
          <text x={250} y={45} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            Defect Density: {defectDensity} per 1000 bits | {yieldData.defects.length} defects found
          </text>

          {/* Memory array grid */}
          <rect
            x={gridStartX - 2}
            y={gridStartY - 2}
            width={arrayCols * cellSize + 4}
            height={arrayRows * cellSize + 4}
            fill="rgba(0,0,0,0.4)"
            stroke={colors.textMuted}
            strokeWidth={1}
            rx={2}
          />

          {/* Draw cells */}
          {Array.from({ length: arrayRows }).map((_, row) =>
            Array.from({ length: arrayCols }).map((_, col) => {
              const isDefect = yieldData.defects.some(d => d.row === row && d.col === col);
              const isRepairedByRow = showRowRepair && yieldData.repairedRows.includes(row);
              const isRepairedByCol = showColRepair && yieldData.repairedCols.includes(col) && !isRepairedByRow;
              const isSpareRow = row >= arrayRows - spareRows;
              const isSpareCol = col >= arrayCols - spareCols;

              let cellColor = colors.good;
              if (isSpareRow || isSpareCol) {
                cellColor = colors.spare;
              }
              if (isDefect && showDefects) {
                if (isRepairedByRow || isRepairedByCol) {
                  cellColor = colors.repaired;
                } else if (showECC && enableECC && showECCRepair) {
                  cellColor = colors.ecc;
                } else {
                  cellColor = colors.defect;
                }
              }

              return (
                <rect
                  key={`${row}-${col}`}
                  x={gridStartX + col * cellSize}
                  y={gridStartY + row * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill={cellColor}
                  opacity={0.8}
                  rx={1}
                />
              );
            })
          )}

          {/* Legend */}
          <g transform={`translate(${gridStartX + arrayCols * cellSize + 20}, ${gridStartY})`}>
            <text y={0} fill={colors.textSecondary} fontSize={10} fontWeight="bold">Legend</text>

            <rect x={0} y={10} width={12} height={12} fill={colors.good} rx={2} />
            <text x={18} y={20} fill={colors.textSecondary} fontSize={9}>Good Cell</text>

            <rect x={0} y={28} width={12} height={12} fill={colors.defect} rx={2} />
            <text x={18} y={38} fill={colors.textSecondary} fontSize={9}>Defect</text>

            <rect x={0} y={46} width={12} height={12} fill={colors.spare} rx={2} />
            <text x={18} y={56} fill={colors.textSecondary} fontSize={9}>Spare</text>

            <rect x={0} y={64} width={12} height={12} fill={colors.repaired} rx={2} />
            <text x={18} y={74} fill={colors.textSecondary} fontSize={9}>Repaired</text>

            {showECC && (
              <>
                <rect x={0} y={82} width={12} height={12} fill={colors.ecc} rx={2} />
                <text x={18} y={92} fill={colors.textSecondary} fontSize={9}>ECC Fixed</text>
              </>
            )}
          </g>

          {/* Statistics panel */}
          <rect x={10} y={gridStartY + arrayRows * cellSize + 20} width={220} height={130} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={20} y={gridStartY + arrayRows * cellSize + 38} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Repair Analysis</text>

          <text x={20} y={gridStartY + arrayRows * cellSize + 55} fill={colors.defect} fontSize={10}>
            Total Defects: {yieldData.defects.length}
          </text>
          <text x={20} y={gridStartY + arrayRows * cellSize + 70} fill={colors.textSecondary} fontSize={10}>
            Defective Rows: {yieldData.defectiveRows.length} (spare: {spareRows})
          </text>
          <text x={20} y={gridStartY + arrayRows * cellSize + 85} fill={colors.textSecondary} fontSize={10}>
            Defective Cols: {yieldData.defectiveCols.length} (spare: {spareCols})
          </text>
          <text x={20} y={gridStartY + arrayRows * cellSize + 100} fill={colors.repaired} fontSize={10}>
            Row/Col Repaired: {yieldData.repairedDefects}
          </text>
          {showECC && enableECC && (
            <text x={20} y={gridStartY + arrayRows * cellSize + 115} fill={colors.ecc} fontSize={10}>
              ECC Corrected: {yieldData.eccCorrected}
            </text>
          )}
          <text x={20} y={gridStartY + arrayRows * cellSize + 130} fill={yieldData.remainingDefects === 0 ? colors.success : colors.error} fontSize={10} fontWeight="bold">
            Remaining: {yieldData.remainingDefects}
          </text>

          {/* Yield gauge */}
          <rect x={250} y={gridStartY + arrayRows * cellSize + 20} width={240} height={130} fill="rgba(0,0,0,0.6)" rx={8} stroke={yieldData.remainingDefects === 0 ? colors.success : colors.warning} strokeWidth={1} />
          <text x={370} y={gridStartY + arrayRows * cellSize + 38} fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">Yield Status</text>

          {/* Raw yield */}
          <text x={260} y={gridStartY + arrayRows * cellSize + 58} fill={colors.textSecondary} fontSize={10}>
            Raw Yield:
          </text>
          <rect x={330} y={gridStartY + arrayRows * cellSize + 48} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
          <rect x={330} y={gridStartY + arrayRows * cellSize + 48} width={yieldData.rawYield} height={14} fill={colors.error} rx={3} />
          <text x={385} y={gridStartY + arrayRows * cellSize + 59} fill={colors.textPrimary} fontSize={9} textAnchor="middle">
            {yieldData.rawYield.toFixed(1)}%
          </text>

          {/* Repaired yield */}
          <text x={260} y={gridStartY + arrayRows * cellSize + 80} fill={colors.textSecondary} fontSize={10}>
            After Repair:
          </text>
          <rect x={330} y={gridStartY + arrayRows * cellSize + 70} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
          <rect x={330} y={gridStartY + arrayRows * cellSize + 70} width={yieldData.repairedYield} height={14} fill={yieldData.repairedYield > 80 ? colors.success : colors.warning} rx={3} />
          <text x={385} y={gridStartY + arrayRows * cellSize + 81} fill={colors.textPrimary} fontSize={9} textAnchor="middle">
            {yieldData.repairedYield.toFixed(1)}%
          </text>

          {/* Status */}
          <text x={370} y={gridStartY + arrayRows * cellSize + 110} fill={yieldData.remainingDefects === 0 ? colors.success : colors.error} fontSize={14} fontWeight="bold" textAnchor="middle">
            {yieldData.remainingDefects === 0 ? 'PASS - Fully Repaired' : 'FAIL - Unrepairable'}
          </text>

          <text x={370} y={gridStartY + arrayRows * cellSize + 130} fill={colors.textMuted} fontSize={10} textAnchor="middle">
            Spares: {spareRows}R + {spareCols}C {showECC && enableECC ? `+ ECC(${eccBits}b)` : ''}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(true); setAnimationStep(0); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.repaired,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Animate Repair
            </button>
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
              onClick={() => { setArrayRows(32); setArrayCols(32); setDefectDensity(0.5); setSpareRows(2); setSpareCols(2); setEnableECC(false); }}
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

  const renderControls = (showECCControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Array Size: {arrayRows} x {arrayCols} = {arrayRows * arrayCols} bits
        </label>
        <input
          type="range"
          min="16"
          max="64"
          step="8"
          value={arrayRows}
          onChange={(e) => { setArrayRows(parseInt(e.target.value)); setArrayCols(parseInt(e.target.value)); }}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Defect Density: {defectDensity} per 1000 bits
        </label>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={defectDensity}
          onChange={(e) => setDefectDensity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Spare Rows: {spareRows}
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

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Spare Columns: {spareCols}
        </label>
        <input
          type="range"
          min="0"
          max="8"
          step="1"
          value={spareCols}
          onChange={(e) => setSpareCols(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showECCControls && (
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
                checked={enableECC}
                onChange={(e) => setEnableECC(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable ECC (Error Correcting Code)
            </label>
          </div>

          {enableECC && (
            <div>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                ECC Correction Capability: {eccBits} bit(s) per word
              </label>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={eccBits}
                onChange={(e) => setEccBits(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
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
          Yield = exp(-defects x area x density) | Poisson model
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Redundancy overhead: {((spareRows / arrayRows + spareCols / arrayCols) * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, nextLabel: string) => (
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
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={!canGoBack}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: canGoBack ? colors.textPrimary : colors.textMuted,
          fontWeight: 'bold',
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: canGoBack ? 1 : 0.5,
        }}
      >
        Back
      </button>
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
        {nextLabel}
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
              SRAM Yield & Redundancy
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why is memory often the yield limiter?
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
                Modern chips contain billions of bits of cache memory. A single defective bit
                can make the entire chip useless. How do manufacturers achieve acceptable yield
                when every bit is a potential point of failure?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try generating new defect patterns and watch how spare rows/columns enable repair!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A memory array with random manufacturing defects. Red cells are defective.
              Blue cells are spare rows/columns that can replace defective ones.
              Purple cells show repairs where a spare replaces a defective row/column.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does memory array size affect yield?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Redundancy Repair</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust array size, defect density, and spare rows/columns
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
              <li>Increase array size - watch defect count grow</li>
              <li>Increase spare rows from 0 to 4 - see yield improve</li>
              <li>Try high defect density (2+) - can redundancy still help?</li>
              <li>Notice: more spares = more overhead but higher yield</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'exponential';

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
              Yield follows a Poisson distribution: Y = exp(-D x A), where D is defect density
              and A is area. Larger arrays have exponentially lower yield without redundancy.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Memory Yield</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Poisson Statistics:</strong> If defects
                are random with average rate D per unit area, the probability of zero defects in area A
                is exp(-D x A). This drops exponentially with size.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Redundancy Principle:</strong> Adding spare
                rows/columns allows replacing any row/column containing a defect. This converts a strict
                "no defects" requirement to "defects in repairable locations."
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Trade-off:</strong> Each spare row/column
                adds area overhead (~3-6% per spare). Too few spares and yield is low; too many wastes silicon.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Optimal Redundancy:</strong> Statistical analysis
                determines the optimal number of spares to maximize (yield x usable area).
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Next: A Twist!')}
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
              What if we add Error Correcting Codes (ECC) on top of redundancy?
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
              ECC adds extra bits to each memory word that can detect and correct bit errors
              during operation. This catches errors that escape redundancy repair, including
              soft errors from cosmic rays and aging effects.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the best approach for maximizing memory reliability?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore ECC + Redundancy</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable ECC and see how it complements row/column repair
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
              Redundancy handles clustered defects (whole rows/columns), while ECC handles
              isolated single-bit errors. Together, they catch different failure modes and
              achieve higher overall yield than either alone.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'combined';

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
              Combining redundancy and ECC gives the best yield. Each technique has different
              strengths: redundancy for clustered defects, ECC for random single-bit errors.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Defense in Depth</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>SECDED ECC:</strong> Single Error Correct,
                Double Error Detect. Uses 8 extra bits per 64-bit word. Corrects any 1-bit error,
                detects (but cannot correct) any 2-bit error.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Complementary Coverage:</strong> Redundancy
                is a one-time repair during test. ECC works continuously during operation, catching
                soft errors (cosmic rays) and aging effects that develop after shipping.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Modern Practice:</strong> Server memories
                use both, plus scrubbing (periodically reading all memory to detect/correct accumulated
                errors before they become uncorrectable).
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Apply This Knowledge')}
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
              Memory reliability is critical across all computing systems
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
        {renderBottomBar(true, transferCompleted.size >= 4, 'Take the Test')}
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
                {testScore >= 8 ? 'You\'ve mastered SRAM yield and redundancy!' : 'Review the material and try again.'}
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
          {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered SRAM yield and redundancy</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Yield follows Poisson statistics: Y = exp(-D x A)</li>
              <li>Larger arrays have exponentially lower raw yield</li>
              <li>Spare rows/columns enable defect repair during test</li>
              <li>ECC provides runtime error correction for isolated bit errors</li>
              <li>Combining redundancy + ECC gives optimal reliability</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Advanced memory designs use hierarchical redundancy (local + global spares),
              built-in self-test (BIST) for fast testing, and machine learning to predict
              optimal repair strategies. As memories scale to petabytes, even rare error
              rates become frequent events requiring sophisticated reliability engineering.
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SRAMYieldRedundancyRenderer;
