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
  twist_review: 'Insight',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const realWorldApps = [
  {
    icon: '🏭',
    title: 'Semiconductor Manufacturing',
    short: 'Maximizing chip yield through redundancy',
    tagline: 'Making perfect from imperfect',
    description: 'Modern chips contain billions of transistors, and manufacturing defects are inevitable. SRAM redundancy allows fabs to repair defective memory cells, dramatically improving yield and reducing costs.',
    connection: 'Yield improvement through redundancy directly applies defect statistics. By including spare rows and columns, chips with random defects can be repaired rather than discarded.',
    howItWorks: 'During wafer testing, defective cells are mapped. Laser fuses or electrical fuses permanently redirect access from defective to spare cells. This happens before chips are packaged.',
    stats: [
      { value: '90%+', label: 'Yield with redundancy', icon: '📈' },
      { value: '10-20%', label: 'Typical spare cells', icon: '🔧' },
      { value: '$10B+', label: 'Saved per year industry-wide', icon: '💰' }
    ],
    examples: ['CPU cache repair', 'Memory chip production', 'FPGA block repair', 'ASIC manufacturing'],
    companies: ['TSMC', 'Samsung', 'Intel', 'GlobalFoundries'],
    futureImpact: 'As transistors shrink below 3nm, defect densities increase. Advanced redundancy schemes with AI-guided repair will be essential for economic manufacturing.',
    color: '#f59e0b'
  },
  {
    icon: '🛡️',
    title: 'ECC Memory Systems',
    short: 'Detecting and correcting bit errors',
    tagline: 'Data integrity guaranteed',
    description: 'Error-correcting code (ECC) memory detects and fixes bit errors caused by cosmic rays, electrical noise, or aging. This is mandatory in servers, aerospace, and medical systems where data corruption is unacceptable.',
    connection: 'ECC adds redundant bits that encode parity information. Single-bit errors can be corrected; multi-bit errors detected. This complements physical redundancy with algorithmic redundancy.',
    howItWorks: 'Hamming codes or more advanced SECDED codes add 12.5% overhead. Each read computes syndrome bits to locate errors. Hardware correction happens transparently at memory controller speed.',
    stats: [
      { value: '1E-15', label: 'Uncorrectable error rate', icon: '🎯' },
      { value: '99.999%', label: 'Server uptime enabled', icon: '⏱️' },
      { value: '72bit', label: 'Words for 64bit data', icon: '🔢' }
    ],
    examples: ['Server farms', 'Medical devices', 'Spacecraft computers', 'Banking systems'],
    companies: ['Micron', 'SK Hynix', 'Samsung', 'Kingston'],
    futureImpact: 'Quantum computing and extreme environments will require even stronger error correction, with multiple levels of protection against various error mechanisms.',
    color: '#3b82f6'
  },
  {
    icon: '🚀',
    title: 'Radiation-Hardened Electronics',
    short: 'Space-grade memory for harsh environments',
    tagline: 'Surviving cosmic rays',
    description: 'Space and nuclear environments bombard electronics with high-energy particles that flip bits. Radiation-hardened memory combines physical hardening with aggressive redundancy to maintain reliability.',
    connection: 'Single-event upsets (SEUs) from radiation randomly flip SRAM bits. Triple modular redundancy (TMR) and scrubbing continuously repair errors faster than they accumulate.',
    howItWorks: 'Rad-hard designs use larger transistors, special layouts, and triple-redundant storage. Voting logic detects disagreements. Continuous scrubbing reads all memory and rewrites corrected values.',
    stats: [
      { value: '1000x', label: 'Higher radiation tolerance', icon: '☢️' },
      { value: '10yr+', label: 'Mission duration', icon: '🛰️' },
      { value: '3x', label: 'Storage overhead for TMR', icon: '📦' }
    ],
    examples: ['Mars rovers', 'GPS satellites', 'Nuclear plant controls', 'Particle accelerators'],
    companies: ['BAE Systems', 'Cobham', 'Honeywell', 'Microchip'],
    futureImpact: 'Deep space missions to Jupiter and beyond will require new hardening approaches for the intense radiation environments of gas giant magnetospheres.',
    color: '#8b5cf6'
  },
  {
    icon: '💻',
    title: 'High-Reliability Computing',
    short: 'Fault-tolerant systems for critical applications',
    tagline: 'Failure is not an option',
    description: 'Mission-critical systems in aviation, healthcare, and finance require extreme reliability. Multiple layers of redundancy at cell, chip, and system levels ensure continuous operation despite failures.',
    connection: 'System-level redundancy extends SRAM repair concepts. Hot spares, checksums, and replicated computation catch errors at every level, applying the same probabilistic principles.',
    howItWorks: 'Lockstep processors run identical computations and compare results. RAID-like memory striping distributes data. Watchdog timers detect hangs. Failover switches to backup systems seamlessly.',
    stats: [
      { value: '99.9999%', label: 'Required uptime', icon: '✅' },
      { value: '5min', label: 'Max yearly downtime', icon: '⏰' },
      { value: '0', label: 'Data loss tolerance', icon: '🛡️' }
    ],
    examples: ['Air traffic control', 'Stock exchanges', 'Hospital ICU monitors', 'Nuclear plant SCRAM systems'],
    companies: ['Stratus', 'HPE NonStop', 'Cisco', 'Dell EMC'],
    futureImpact: 'Autonomous vehicles and AI-controlled infrastructure will extend high-reliability requirements to billions of edge devices, requiring cost-effective redundancy at scale.',
    color: '#22c55e'
  }
];

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
    playSound('transition');
    setPhase(newPhase);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_complete', phase: newPhase });
    }
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
      description: 'Modern DRAM modules use ECC to detect and correct single-bit errors in real-time. A typical 64GB server module processes over 10 billion reads per second.',
      question: 'Why is ECC standard in server DRAM but optional in consumer PCs?',
      answer: 'Servers run continuously with critical data, making silent data corruption unacceptable. The ~3% cost/power overhead of ECC is justified. Consumer PCs run shorter workloads where the statistical risk is lower and cost sensitivity is higher.',
    },
    {
      title: 'Flash Memory Management',
      description: 'NAND flash has high defect rates that increase with wear, requiring sophisticated management. Modern SSDs use 1TB+ capacity with over 100 billion memory cells.',
      question: 'How do SSDs maintain reliability despite flash memory wear?',
      answer: 'SSDs use multiple layers of ECC (BCH or LDPC codes), wear leveling to distribute writes, spare blocks to replace worn-out cells, and over-provisioning (hidden extra capacity). These techniques mask the underlying unreliability.',
    },
    {
      title: 'Cache Memory Design',
      description: 'CPU caches use fast SRAM that must be extremely reliable for correct program execution. Modern CPUs have 32MB+ of L3 cache operating at over 4 GHz.',
      question: 'Why do L1 caches often use parity while L2/L3 use ECC?',
      answer: 'L1 caches prioritize speed, using parity (fast detection, no correction) and relying on cache miss to recover. L2/L3 caches are larger and slower, making ECC correction worthwhile. The latency penalty is hidden by L1.',
    },
    {
      title: 'Wafer Sort and Testing',
      description: 'Memory chips are tested at the wafer level to identify and map out defects before packaging. A 300mm wafer can yield over 500 memory dies, each tested in under 200ms.',
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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      zIndex: 1001,
    }}>
      {phaseOrder.map((p, index) => {
        const isActive = p === phase;
        const isPast = phaseOrder.indexOf(p) < phaseOrder.indexOf(phase);
        const isClickable = isPast || isActive;
        return (
          <div
            key={p}
            onClick={() => isClickable && isPast && goToPhase(p)}
            aria-label={`${phaseLabels[p]} phase${isActive ? ' (current)' : isPast ? ' (completed)' : ''}`}
            tabIndex={isClickable ? 0 : -1}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: isPast ? 'pointer' : 'default',
              opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
              background: 'transparent',
            }}
          >
            <div
              title={`${phaseLabels[p]} phase${isActive ? ' (current)' : isPast ? ' (completed)' : ''}`}
              style={{
              width: isMobile ? '10px' : '12px',
              height: isMobile ? '10px' : '12px',
              borderRadius: '50%',
              background: isActive ? colors.accent : isPast ? colors.success : 'rgba(255,255,255,0.3)',
              border: isActive ? `2px solid ${colors.accent}` : 'none',
              boxShadow: isActive ? `0 0 8px ${colors.accentGlow}` : 'none',
              cursor: isPast ? 'pointer' : 'default',
            }} />
            <span style={{
              fontSize: '10px',
              color: isActive ? colors.accent : colors.textSecondary,
              marginTop: '4px',
            }}>
              {phaseLabels[p]}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderVisualization = (interactive: boolean, showECC: boolean = false) => {
    const width = 500;
    const height = 550;
    const yieldData = calculateYield();

    // Calculate cell size for array display (capped at 32x32 visual grid)
    const displayRowCount = Math.min(arrayRows, 32);
    const displayColCount = Math.min(arrayCols, 32);
    const cellSize = Math.min(8, Math.floor(280 / Math.max(displayRowCount, displayColCount)));
    const gridStartX = 50;
    const gridStartY = 60;

    // Determine which step of repair to show
    const showDefects = animationStep >= 0 || !isAnimating;
    const showRowRepair = animationStep >= 1 || !isAnimating;
    const showColRepair = animationStep >= 2 || !isAnimating;
    const showECCRepair = animationStep >= 3 || !isAnimating;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        {/* Title moved outside SVG */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{
            fontSize: typo.bodyLarge,
            fontWeight: 'bold',
            color: colors.textPrimary,
            marginBottom: '4px'
          }}>
            SRAM Array: {arrayRows} x {arrayCols} = {yieldData.totalBits} bits
          </div>
          <div style={{
            fontSize: typo.small,
            color: colors.textSecondary
          }}>
            Defect Density: {defectDensity} per 1000 bits | {yieldData.defects.length} defects found
          </div>
        </div>

        <svg
          width="100%"
          height={height - 50}
          viewBox={`0 0 ${width} ${height - 50}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="sramyLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1a1a2e" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>

            {/* Memory array substrate gradient */}
            <linearGradient id="sramySubstrate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Good cell gradient - emerald tones */}
            <linearGradient id="sramyGoodCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Defect cell gradient - red danger tones */}
            <linearGradient id="sramyDefectCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Spare cell gradient - blue tones */}
            <linearGradient id="sramySpareCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="35%" stopColor="#3b82f6" />
              <stop offset="65%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Repaired cell gradient - purple tones */}
            <linearGradient id="sramyRepairedCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="30%" stopColor="#a855f7" />
              <stop offset="60%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* ECC corrected cell gradient - cyan tones */}
            <linearGradient id="sramyECCCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="35%" stopColor="#22d3ee" />
              <stop offset="65%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            {/* Statistics panel gradient */}
            <linearGradient id="sramyPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
            </linearGradient>

            {/* Yield bar success gradient */}
            <linearGradient id="sramyYieldSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Yield bar warning gradient */}
            <linearGradient id="sramyYieldWarning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Yield bar error gradient */}
            <linearGradient id="sramyYieldError" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Defect glow filter */}
            <filter id="sramyDefectGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Repair pulse glow filter */}
            <filter id="sramyRepairGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Status indicator glow */}
            <filter id="sramyStatusGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for memory array */}
            <pattern id="sramyGridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>

            {/* Spare row highlight gradient */}
            <linearGradient id="sramySpareRowHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="10%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="90%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>

            {/* Spare column highlight gradient */}
            <linearGradient id="sramySpareColHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="10%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="90%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height - 50} fill="url(#sramyLabBg)" />

          {/* Subtle grid overlay */}
          <rect width={width} height={height - 50} fill="url(#sramyGridPattern)" opacity="0.5" />

          {/* Memory array substrate with border */}
          <rect
            x={gridStartX - 6}
            y={gridStartY - 56}
            width={displayColCount * cellSize + 12}
            height={displayRowCount * cellSize + 12}
            fill="url(#sramySubstrate)"
            stroke="#475569"
            strokeWidth={2}
            rx={6}
          />

          {/* Spare row highlight bands */}
          {Array.from({ length: Math.min(spareRows, displayRowCount) }).map((_, i) => {
            const rowIndex = displayRowCount - Math.min(spareRows, displayRowCount) + i;
            return (
              <rect
                key={`spare-row-${i}`}
                x={gridStartX - 4}
                y={gridStartY - 54 + rowIndex * cellSize}
                width={displayColCount * cellSize + 8}
                height={cellSize}
                fill="url(#sramySpareRowHighlight)"
                rx={2}
              />
            );
          })}

          {/* Spare column highlight bands */}
          {Array.from({ length: Math.min(spareCols, displayColCount) }).map((_, i) => {
            const colIndex = displayColCount - Math.min(spareCols, displayColCount) + i;
            return (
              <rect
                key={`spare-col-${i}`}
                x={gridStartX + colIndex * cellSize}
                y={gridStartY - 56}
                width={cellSize}
                height={displayRowCount * cellSize + 8}
                fill="url(#sramySpareColHighlight)"
                rx={2}
              />
            );
          })}

          {/* Draw cells with premium gradients */}
          {(() => {
            const defectSet = new Set(yieldData.defects.map(d => `${d.row},${d.col}`));
            const repairedRowSet = new Set(yieldData.repairedRows);
            const repairedColSet = new Set(yieldData.repairedCols);
            // Limit visual rendering to max 32x32 for performance; use sampling for larger arrays
            const rowStep = arrayRows / displayRowCount;
            const colStep = arrayCols / displayColCount;
            return Array.from({ length: displayRowCount }).map((_, ri) => {
            const row = Math.floor(ri * rowStep);
            return Array.from({ length: displayColCount }).map((_, ci) => {
              const col = Math.floor(ci * colStep);
              const isDefect = defectSet.has(`${row},${col}`);
              const isRepairedByRow = showRowRepair && repairedRowSet.has(row);
              const isRepairedByCol = showColRepair && repairedColSet.has(col) && !isRepairedByRow;
              const isSpareRow = row >= arrayRows - spareRows;
              const isSpareCol = col >= arrayCols - spareCols;

              let cellFill = 'url(#sramyGoodCell)';
              let cellFilter = undefined;

              if (isSpareRow || isSpareCol) {
                cellFill = 'url(#sramySpareCell)';
              }
              if (isDefect && showDefects) {
                if (isRepairedByRow || isRepairedByCol) {
                  cellFill = 'url(#sramyRepairedCell)';
                  cellFilter = isAnimating ? 'url(#sramyRepairGlow)' : undefined;
                } else if (showECC && enableECC && showECCRepair) {
                  cellFill = 'url(#sramyECCCell)';
                  cellFilter = isAnimating ? 'url(#sramyRepairGlow)' : undefined;
                } else {
                  cellFill = 'url(#sramyDefectCell)';
                  cellFilter = 'url(#sramyDefectGlow)';
                }
              }

              return (
                <rect
                  key={`${ri}-${ci}`}
                  x={gridStartX + ci * cellSize}
                  y={gridStartY - 54 + ri * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill={cellFill}
                  filter={cellFilter}
                  rx={1}
                />
              );
            });
          });
          })()}

          {/* Statistics panel with premium gradient */}
          <rect
            x={10}
            y={gridStartY + displayRowCount * cellSize - 30}
            width={220}
            height={120}
            fill="url(#sramyPanelBg)"
            rx={8}
            stroke={colors.accent}
            strokeWidth={1.5}
          />

          {/* Yield gauge panel */}
          <rect
            x={250}
            y={gridStartY + displayRowCount * cellSize - 30}
            width={240}
            height={120}
            fill="url(#sramyPanelBg)"
            rx={8}
            stroke={yieldData.remainingDefects === 0 ? colors.success : colors.warning}
            strokeWidth={1.5}
          />

          {/* Repair status indicator */}
          <circle
            cx={460}
            cy={gridStartY + displayRowCount * cellSize - 15}
            r={5}
            fill={yieldData.remainingDefects === 0 ? colors.success : colors.error}
          >
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* SVG labels for educational context */}
          <g>
            <text x={20} y={gridStartY + displayRowCount * cellSize - 12} fill={colors.accent} fontSize="12" fontWeight="bold">Repair Analysis</text>
            <text x={20} y={gridStartY + displayRowCount * cellSize + 5} fill={colors.textSecondary} fontSize="11">Defects: {yieldData.defects.length}</text>
            <text x={20} y={gridStartY + displayRowCount * cellSize + 20} fill={colors.textSecondary} fontSize="11">Repaired: {yieldData.repairedDefects}</text>
            <text x={20} y={gridStartY + displayRowCount * cellSize + 35} fill={yieldData.remainingDefects === 0 ? colors.success : colors.error} fontSize="11">Remaining: {yieldData.remainingDefects}</text>
            <text x={20} y={gridStartY + displayRowCount * cellSize + 50} fill={colors.repaired} fontSize="11">Spare Rows: {spareRows} | Spare Cols: {spareCols}</text>
          </g>

          <g>
            <text x={260} y={gridStartY + displayRowCount * cellSize - 12} fill={yieldData.remainingDefects === 0 ? colors.success : colors.warning} fontSize="12" fontWeight="bold">Yield Status</text>
            <text x={260} y={gridStartY + displayRowCount * cellSize + 5} fill={colors.textSecondary} fontSize="11">Raw Yield: {yieldData.rawYield.toFixed(1)}%</text>
            <text x={260} y={gridStartY + displayRowCount * cellSize + 20} fill={colors.textSecondary} fontSize="11">After Repair: {yieldData.repairedYield.toFixed(1)}%</text>
            <text x={260} y={gridStartY + displayRowCount * cellSize + 35} fill={yieldData.remainingDefects === 0 ? colors.success : colors.error} fontSize="12" fontWeight="bold">
              {yieldData.remainingDefects === 0 ? 'PASS' : 'FAIL'}
            </text>
          </g>

          {/* Array dimension labels */}
          <text x={gridStartX} y={12} fill={colors.textMuted} fontSize="11">Memory Array ({arrayRows}x{arrayCols})</text>

          {/* Raw yield bar background */}
          <rect x={330} y={gridStartY + displayRowCount * cellSize + 8} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
          {/* Raw yield bar fill */}
          <rect
            x={330}
            y={gridStartY + displayRowCount * cellSize + 8}
            width={yieldData.rawYield}
            height={14}
            fill="url(#sramyYieldError)"
            rx={3}
          />

          {/* Repaired yield bar background */}
          <rect x={330} y={gridStartY + displayRowCount * cellSize + 30} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
          {/* Repaired yield bar fill */}
          <rect
            x={330}
            y={gridStartY + displayRowCount * cellSize + 30}
            width={yieldData.repairedYield}
            height={14}
            fill={yieldData.repairedYield > 80 ? 'url(#sramyYieldSuccess)' : 'url(#sramyYieldWarning)'}
            rx={3}
          />

          {/* Yield bar labels */}
          <text x={435} y={gridStartY + displayRowCount * cellSize + 19} fill={colors.textMuted} fontSize="11">Raw</text>
          <text x={435} y={gridStartY + displayRowCount * cellSize + 41} fill={colors.textMuted} fontSize="11">Repaired</text>

          {/* Axis labels for educational clarity */}
          <text x={gridStartX + displayColCount * cellSize / 2} y={gridStartY + displayRowCount * cellSize + 115} fill={colors.textMuted} fontSize="11" textAnchor="middle">Density (defects/1000 bits)</text>

          {/* Grid reference lines with opacity for visual reference */}
          <line x1={gridStartX} y1={gridStartY - 54} x2={gridStartX + displayColCount * cellSize} y2={gridStartY - 54} stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
          <line x1={gridStartX} y1={gridStartY - 54 + displayRowCount * cellSize / 2} x2={gridStartX + displayColCount * cellSize} y2={gridStartY - 54 + displayRowCount * cellSize / 2} stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
          <line x1={gridStartX} y1={gridStartY - 54 + displayRowCount * cellSize} x2={gridStartX + displayColCount * cellSize} y2={gridStartY - 54 + displayRowCount * cellSize} stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
          <line x1={gridStartX + displayColCount * cellSize / 2} y1={gridStartY - 54} x2={gridStartX + displayColCount * cellSize / 2} y2={gridStartY - 54 + displayRowCount * cellSize} stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />

          {/* Yield curve path showing defect density vs yield relationship */}
          {(() => {
            const curveBaseY = gridStartY + displayRowCount * cellSize + 95;
            const curveH = 140;
            const curveW = Math.max(displayColCount * cellSize, 200);
            return (
              <g>
                <path
                  d={`M ${gridStartX} ${curveBaseY} ` +
                    Array.from({ length: 20 }, (_, i) => {
                      const x = gridStartX + (i / 19) * curveW;
                      const densityVal = (i / 19) * 3;
                      const yieldVal = Math.exp(-densityVal * arrayRows * arrayCols / 1000);
                      const y = curveBaseY - yieldVal * curveH;
                      return `L ${x} ${y}`;
                    }).join(' ')}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={2}
                />
                {/* Reference yield path without redundancy */}
                <path
                  d={`M ${gridStartX} ${curveBaseY} ` +
                    Array.from({ length: 20 }, (_, i) => {
                      const x = gridStartX + (i / 19) * curveW;
                      const densityVal = (i / 19) * 3;
                      const yieldVal = Math.exp(-densityVal * arrayRows * arrayCols / 500);
                      const y = curveBaseY - yieldVal * curveH;
                      return `L ${x} ${y}`;
                    }).join(' ')}
                  fill="none"
                  stroke={colors.error}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                />
                {/* Decorative area fill under curve */}
                <path
                  d={`M ${gridStartX} ${curveBaseY} ` +
                    Array.from({ length: 20 }, (_, i) => {
                      const x = gridStartX + (i / 19) * curveW;
                      const densityVal = (i / 19) * 3;
                      const yieldVal = Math.exp(-densityVal * arrayRows * arrayCols / 1000);
                      const y = curveBaseY - yieldVal * curveH;
                      return `L ${x} ${y}`;
                    }).join(' ') + ` L ${gridStartX + curveW} ${curveBaseY} Z`}
                  fill={colors.accent}
                  fillOpacity={0.1}
                />
                {/* Interactive marker showing current defect density position */}
                <circle
                  cx={gridStartX + (defectDensity / 3) * curveW}
                  cy={curveBaseY - Math.exp(-defectDensity * arrayRows * arrayCols / 1000) * curveH}
                  r={8}
                  fill={colors.accent}
                  stroke="#ffffff"
                  strokeWidth={2}
                  filter="url(#sramyDefectGlow)"
                />
              </g>
            );
          })()}
        </svg>

        {/* Legend moved outside SVG */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          padding: '8px 16px',
          background: colors.bgCard,
          borderRadius: '8px',
          maxWidth: '500px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #34d399 0%, #047857 100%)', borderRadius: '3px' }} />
            <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Good Cell</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #f87171 0%, #b91c1c 100%)', borderRadius: '3px' }} />
            <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Defect</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)', borderRadius: '3px' }} />
            <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Spare</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)', borderRadius: '3px' }} />
            <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Repaired</span>
          </div>
          {showECC && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #67e8f9 0%, #0891b2 100%)', borderRadius: '3px' }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>ECC Fixed</span>
            </div>
          )}
        </div>

        {/* Statistics panel moved outside SVG */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          maxWidth: '520px',
          width: '100%'
        }}>
          {/* Repair Analysis Panel */}
          <div style={{
            flex: '1 1 220px',
            background: colors.bgCard,
            padding: typo.cardPadding,
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <div style={{ fontSize: typo.small, fontWeight: 'bold', color: colors.textPrimary, marginBottom: '8px' }}>
              Repair Analysis
            </div>
            <div style={{ fontSize: typo.label, color: colors.defect, marginBottom: '4px' }}>
              Total Defects: {yieldData.defects.length}
            </div>
            <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '4px' }}>
              Defective Rows: {yieldData.defectiveRows.length} (spare: {spareRows})
            </div>
            <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '4px' }}>
              Defective Cols: {yieldData.defectiveCols.length} (spare: {spareCols})
            </div>
            <div style={{ fontSize: typo.label, color: colors.repaired, marginBottom: '4px' }}>
              Row/Col Repaired: {yieldData.repairedDefects}
            </div>
            {showECC && enableECC && (
              <div style={{ fontSize: typo.label, color: colors.ecc, marginBottom: '4px' }}>
                ECC Corrected: {yieldData.eccCorrected}
              </div>
            )}
            <div style={{
              fontSize: typo.label,
              fontWeight: 'bold',
              color: yieldData.remainingDefects === 0 ? colors.success : colors.error
            }}>
              Remaining: {yieldData.remainingDefects}
            </div>
          </div>

          {/* Yield Status Panel */}
          <div style={{
            flex: '1 1 220px',
            background: colors.bgCard,
            padding: typo.cardPadding,
            borderRadius: '8px',
            borderLeft: `3px solid ${yieldData.remainingDefects === 0 ? colors.success : colors.warning}`,
          }}>
            <div style={{ fontSize: typo.small, fontWeight: 'bold', color: colors.textPrimary, marginBottom: '8px' }}>
              Yield Status
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '4px' }}>
                Raw Yield: {yieldData.rawYield.toFixed(1)}%
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${yieldData.rawYield}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f87171 0%, #dc2626 100%)',
                  borderRadius: '4px'
                }} />
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '4px' }}>
                After Repair: {yieldData.repairedYield.toFixed(1)}%
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${yieldData.repairedYield}%`,
                  height: '100%',
                  background: yieldData.repairedYield > 80
                    ? 'linear-gradient(90deg, #34d399 0%, #059669 100%)'
                    : 'linear-gradient(90deg, #fcd34d 0%, #d97706 100%)',
                  borderRadius: '4px'
                }} />
              </div>
            </div>
            <div style={{
              fontSize: typo.body,
              fontWeight: 'bold',
              color: yieldData.remainingDefects === 0 ? colors.success : colors.error,
              textAlign: 'center',
              padding: '4px',
              background: yieldData.remainingDefects === 0
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              borderRadius: '4px'
            }}>
              {yieldData.remainingDefects === 0 ? 'PASS - Fully Repaired' : 'FAIL - Unrepairable'}
            </div>
            <div style={{ fontSize: typo.label, color: colors.textMuted, textAlign: 'center', marginTop: '4px' }}>
              Spares: {spareRows}R + {spareCols}C {showECC && enableECC ? `+ ECC(${eccBits}b)` : ''}
            </div>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(true); setAnimationStep(0); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.repaired} 0%, #7c3aed 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
                boxShadow: `0 4px 14px rgba(139, 92, 246, 0.4)`,
                transition: 'all 0.3s ease',
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
                background: `linear-gradient(135deg, ${colors.defect} 0%, #b91c1c 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
                boxShadow: `0 4px 14px rgba(239, 68, 68, 0.4)`,
                transition: 'all 0.3s ease',
              }}
            >
              New Defects
            </button>
            <button
              onClick={() => { setArrayRows(32); setArrayCols(32); setDefectDensity(0.5); setSpareRows(2); setSpareCols(2); setEnableECC(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.3s ease',
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
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Array Size: {arrayRows} x {arrayCols} = {arrayRows * arrayCols} bits
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, fontWeight: 400, marginBottom: '2px' }}>
          <span>16</span>
          <span>64</span>
        </div>
        <input
          type="range"
          min="16"
          max="64"
          step="8"
          value={arrayRows}
          onChange={(e) => { const v = Math.max(16, Math.min(64, parseInt(e.target.value) || 16)); setArrayRows(v); setArrayCols(v); }}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Defect Density: {defectDensity} per 1000 bits
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, fontWeight: 400, marginBottom: '2px' }}>
          <span>0.1</span>
          <span>3</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={defectDensity}
          onChange={(e) => setDefectDensity(Math.max(0.1, Math.min(3, parseFloat(e.target.value) || 0.1)))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Spare Rows: {spareRows}
        </label>
        <input
          type="range"
          min="0"
          max="8"
          step="1"
          value={spareRows}
          onChange={(e) => setSpareRows(Math.max(0, Math.min(8, parseInt(e.target.value) || 0)))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Spare Columns: {spareCols}
        </label>
        <input
          type="range"
          min="0"
          max="8"
          step="1"
          value={spareCols}
          onChange={(e) => setSpareCols(Math.max(0, Math.min(8, parseInt(e.target.value) || 0)))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
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
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
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
      zIndex: 1001,
    }}>
      <button
        onClick={goBack}
        disabled={!canGoBack}
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textSecondary}`,
          background: 'transparent',
          color: canGoBack ? colors.textPrimary : colors.textSecondary,
          fontWeight: 'bold',
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: canGoBack ? 1 : 0.5,
          transition: 'all 0.3s ease',
        }}
      >
        Back
      </button>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textSecondary,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.3s ease',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              SRAM Yield & Redundancy
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
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
        {renderBottomBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Redundancy Repair</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust array size, defect density, and spare rows/columns
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic' }}>
              Observe how changing parameters affects yield and repair success
            </p>
          </div>

          {renderVisualization(true)}

          {/* Real-time calculated values */}
          {(() => {
            const yieldInfo = calculateYield();
            const repairRatio = yieldInfo.defects.length > 0 ? (yieldInfo.repairedDefects / yieldInfo.defects.length * 100).toFixed(1) : '100.0';
            return (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                padding: '0 16px',
                marginBottom: '8px',
                transition: 'all 0.3s ease',
              }}>
                <div style={{ background: colors.bgCard, padding: '10px 14px', borderRadius: '8px', textAlign: 'center', flex: '1 1 100px', transition: 'background 0.3s ease' }}>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 400 }}>Defect Rate</div>
                  <div style={{ color: colors.defect, fontSize: '16px', fontWeight: 'bold' }}>{defectDensity.toFixed(1)}/1000</div>
                </div>
                <div style={{ background: colors.bgCard, padding: '10px 14px', borderRadius: '8px', textAlign: 'center', flex: '1 1 100px', transition: 'background 0.3s ease' }}>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 400 }}>Repair Ratio</div>
                  <div style={{ color: colors.repaired, fontSize: '16px', fontWeight: 'bold' }}>{repairRatio}%</div>
                </div>
                <div style={{ background: colors.bgCard, padding: '10px 14px', borderRadius: '8px', textAlign: 'center', flex: '1 1 100px', transition: 'background 0.3s ease' }}>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 400 }}>Yield Factor</div>
                  <div style={{ color: yieldInfo.remainingDefects === 0 ? colors.success : colors.warning, fontSize: '16px', fontWeight: 'bold' }}>{yieldInfo.repairedYield.toFixed(1)}%</div>
                </div>
              </div>
            );
          })()}

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
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '12px' }}>
              This concept is important in real-world semiconductor industry and technology design.
              Engineers use redundancy to make practical manufacturing economically viable, enabling
              the production of billions of chips used in everyday applications from phones to servers.
            </p>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct! Your prediction was right.' : 'Not Quite! As you predicted, let\'s see what actually happens.'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Yield follows a Poisson distribution: Y = exp(-D x A), where D is defect density
              and A is area. As you observed in the experiment, larger arrays have exponentially lower yield without redundancy.
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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

          <div style={{ padding: '0 16px', marginBottom: '8px' }}>
            <button
              onClick={goNext}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Continue to Test
            </button>
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
        {renderBottomBar(true, true, 'Next')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 'bold', fontSize: typo.body }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px' }}>
              Test your understanding of SRAM yield, redundancy repair, and error correction.
              Answer all questions to demonstrate mastery of semiconductor memory reliability concepts.
              Each question covers a key aspect of how manufacturers achieve acceptable yield despite inevitable defects.
            </p>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\ud83c\udfc6'}</div>
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
