import React, { useState, useCallback, useEffect, useMemo } from 'react';

interface ChipletsVsMonolithsRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
type Phase = typeof PHASES[number];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Deep Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1', // Brightened from #94a3b8 for better contrast
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  monolithic: '#f87171', // Brightened from #ef4444 for better contrast
  chiplet: '#60a5fa', // Brightened from #3b82f6 for better contrast
  interconnect: '#a78bfa', // Brightened from #8b5cf6 for better contrast
  good: '#34d399', // Brightened from #10b981 for better contrast
  defect: '#f87171', // Brightened from #ef4444 for better contrast
  cost: '#fbbf24', // Brightened from #f59e0b for better contrast
};

// Format cost values to prevent excessively long text
const formatCost = (val: number): string => {
  if (!isFinite(val)) return 'N/A';
  if (val >= 1e9) return `${(val / 1e9).toFixed(0)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return val.toFixed(0);
};

// Seeded random for reproducibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const ChipletsVsMonolithsRenderer: React.FC<ChipletsVsMonolithsRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');

  // Use gamePhase or phase prop, or internal state for self-managed navigation
  // Validate phase and default to 'hook' for invalid values
  const rawPhase = gamePhase || phaseProp || internalPhase;
  const phase = PHASES.includes(rawPhase as Phase) ? rawPhase : 'hook';

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => setInternalPhase(p), []);
  const goBack = useCallback(() => {
    const currentIdx = PHASES.indexOf(phase);
    if (currentIdx > 0) setInternalPhase(PHASES[currentIdx - 1]);
  }, [phase]);
  const goNext = useCallback(() => {
    const currentIdx = PHASES.indexOf(phase);
    if (currentIdx < PHASES.length - 1) {
      setInternalPhase(PHASES[currentIdx + 1]);
      onPhaseComplete?.();
    }
  }, [phase, onPhaseComplete]);

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
  const calculateYieldAndCost = useMemo(() => {
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
    const width = 700;
    const height = 500;
    const calc = calculateYieldAndCost;

    // Create a unique key based on state for SVG reactivity tracking
    const svgKey = `${totalDieArea}-${numChiplets}-${defectDensity}-${interconnectCost}-${advancedPackaging}-${simulationSeed}`;

    // Generate wafer visualizations
    const monoWafer = generateWaferData(calc.monolithic.area, calc.monolithic.yield);
    const chipletWafer = generateWaferData(calc.chiplet.areaEach, calc.chiplet.yieldEach);

    const waferRadius = 85;
    const monoWaferX = 140;
    const chipletWaferX = 380;
    const waferY = 150;
    const packageY = 320;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
          data-testid="main-svg"
          data-state={svgKey}
          aria-label="Chiplets vs Monolithic visualization"
        >
          {/* Premium Defs Section */}
          <defs>
            {/* Background gradient - clean room environment */}
            <linearGradient id="cvmLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1a1f2e" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>

            {/* Silicon wafer gradient - realistic gray silicon with subtle blue tint */}
            <radialGradient id="cvmWaferSilicon" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="85%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>

            {/* Wafer edge bevel highlight */}
            <linearGradient id="cvmWaferEdge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="20%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            {/* Good die gradient - silicon with green tint */}
            <linearGradient id="cvmGoodDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Defective die gradient - red warning */}
            <linearGradient id="cvmDefectDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Chiplet silicon - blue for distinction */}
            <linearGradient id="cvmChipletSilicon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Package substrate gradient - organic/ceramic look */}
            <linearGradient id="cvmPackageSubstrate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#44403c" />
              <stop offset="20%" stopColor="#292524" />
              <stop offset="40%" stopColor="#1c1917" />
              <stop offset="60%" stopColor="#292524" />
              <stop offset="80%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>

            {/* Interposer gradient - silicon interposer for 2.5D */}
            <linearGradient id="cvmInterposer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="75%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>

            {/* Interconnect metal traces - copper/gold appearance */}
            <linearGradient id="cvmMetalTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="80%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* High bandwidth interconnect */}
            <linearGradient id="cvmHBMTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#d8b4fe" stopOpacity="1" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.3" />
            </linearGradient>

            {/* Cost panel gradient */}
            <linearGradient id="cvmCostPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#451a03" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#78350f" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.8" />
            </linearGradient>

            {/* Performance panel gradient */}
            <linearGradient id="cvmPerfPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#334155" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
            </linearGradient>

            {/* Radial glow for active elements */}
            <radialGradient id="cvmActiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>

            {/* Radial glow for chiplet */}
            <radialGradient id="cvmChipletGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>

            {/* Circuit pattern for die surface */}
            <pattern id="cvmCircuitPattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="transparent" />
              <line x1="0" y1="4" x2="3" y2="4" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <line x1="3" y1="4" x2="3" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <line x1="5" y1="4" x2="8" y2="4" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <line x1="4" y1="5" x2="4" y2="8" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <circle cx="4" cy="4" r="0.8" fill="rgba(255,255,255,0.2)" />
            </pattern>

            {/* Fine circuit pattern for chiplets */}
            <pattern id="cvmFineCircuit" patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill="transparent" />
              <line x1="0" y1="2" x2="2" y2="2" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
              <line x1="2" y1="2" x2="2" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
              <line x1="2" y1="2" x2="4" y2="2" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
              <line x1="2" y1="2" x2="2" y2="4" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
              <circle cx="2" cy="2" r="0.4" fill="rgba(255,255,255,0.15)" />
            </pattern>

            {/* Glow filter for good dice */}
            <filter id="cvmGoodGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Defect glow filter */}
            <filter id="cvmDefectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Package shadow filter */}
            <filter id="cvmPackageShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="shadow" />
              <feOffset dx="2" dy="3" result="offsetShadow" />
              <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Interconnect glow */}
            <filter id="cvmInterconnectGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow for panels */}
            <filter id="cvmInnerGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Text shadow for labels */}
            <filter id="cvmTextShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="shadow" />
              <feOffset dx="1" dy="1" result="offsetShadow" />
              <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium lab background */}
          <rect width="700" height="500" fill="url(#cvmLabBg)" />

          {/* Subtle grid pattern overlay */}
          <g opacity="0.03">
            {Array.from({ length: 35 }).map((_, i) => (
              <line key={`vg-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="500" stroke="#fff" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 26 }).map((_, i) => (
              <line key={`hg-${i}`} x1="0" y1={i * 20} x2="700" y2={i * 20} stroke="#fff" strokeWidth="0.5" />
            ))}
          </g>

          {/* Title with premium styling */}
          <text x={350} y={28} fill={colors.textPrimary} fontSize={16} textAnchor="middle" fontWeight="bold" filter="url(#cvmTextShadow)" className="svg-label">
            Chiplets vs Monolithic: {totalDieArea}mm Total Area
          </text>
          <text x={350} y={48} fill={colors.textSecondary} fontSize={12} textAnchor="middle" className="svg-label">
            Defect Density: {defectDensity.toFixed(2)} /mm | {showLatencyMode ? 'Performance Analysis' : 'Cost Analysis'}
          </text>

          {/* Section labels - below subtitle to avoid overlap */}
          <text x={monoWaferX} y={66} fill={colors.monolithic} fontSize={11} textAnchor="middle" fontWeight="bold" filter="url(#cvmTextShadow)" className="svg-label" data-label="monolithic">
            Mono ({calc.monolithic.area}mm)
          </text>
          <text x={chipletWaferX + 80} y={66} fill={colors.chiplet} fontSize={11} textAnchor="middle" fontWeight="bold" filter="url(#cvmTextShadow)" className="svg-label" data-label="chiplet">
            {numChiplets}x{calc.chiplet.areaEach.toFixed(0)}mm Chiplets
          </text>

          {/* Monolithic wafer with premium styling */}
          <g transform={`translate(${monoWaferX}, ${waferY})`}>
            {/* Wafer base with shadow */}
            <circle cx={0} cy={0} r={waferRadius + 3} fill="#000" opacity="0.4" />
            {/* Main wafer surface */}
            <circle cx={0} cy={0} r={waferRadius} fill="url(#cvmWaferSilicon)" />
            {/* Wafer edge highlight */}
            <circle cx={0} cy={0} r={waferRadius} fill="none" stroke="url(#cvmWaferEdge)" strokeWidth="3" />
            {/* Wafer notch */}
            <path d={`M${waferRadius - 5},8 L${waferRadius},0 L${waferRadius - 5},-8`} fill="#1f2937" />

            {/* Die grid on wafer */}
            {Array.from({ length: Math.min(monoWafer.dicePerRow, 6) }).map((_, row) =>
              Array.from({ length: Math.min(monoWafer.dicePerRow, 6) }).map((_, col) => {
                const dieSize = (waferRadius * 1.6) / Math.min(monoWafer.dicePerRow, 6);
                const x = -(Math.min(monoWafer.dicePerRow, 6) * dieSize) / 2 + col * dieSize;
                const y = -(Math.min(monoWafer.dicePerRow, 6) * dieSize) / 2 + row * dieSize;
                const idx = row * monoWafer.dicePerRow + col;
                const isGood = monoWafer.dice[idx] ?? false;
                const dx = x + dieSize/2;
                const dy = y + dieSize/2;
                if (Math.sqrt(dx*dx + dy*dy) > waferRadius - 8) return null;
                return (
                  <g key={`mono-${row}-${col}`}>
                    <rect
                      x={x}
                      y={y}
                      width={dieSize - 2}
                      height={dieSize - 2}
                      fill={isGood ? 'url(#cvmGoodDie)' : 'url(#cvmDefectDie)'}
                      rx={2}
                    />
                    {/* Die edge highlight */}
                    <rect
                      x={x}
                      y={y}
                      width={dieSize - 2}
                      height={dieSize - 2}
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.5"
                      rx={2}
                    />
                  </g>
                );
              })
            )}
          </g>

          {/* Chiplet wafer with premium styling */}
          <g transform={`translate(${chipletWaferX}, ${waferY})`}>
            {/* Wafer base with shadow */}
            <circle cx={0} cy={0} r={waferRadius + 3} fill="#000" opacity="0.4" />
            {/* Main wafer surface */}
            <circle cx={0} cy={0} r={waferRadius} fill="url(#cvmWaferSilicon)" />
            {/* Wafer edge highlight */}
            <circle cx={0} cy={0} r={waferRadius} fill="none" stroke="url(#cvmWaferEdge)" strokeWidth="3" />
            {/* Wafer notch */}
            <path d={`M${waferRadius - 5},8 L${waferRadius},0 L${waferRadius - 5},-8`} fill="#1f2937" />

            {/* Die grid on wafer */}
            {Array.from({ length: Math.min(chipletWafer.dicePerRow, 8) }).map((_, row) =>
              Array.from({ length: Math.min(chipletWafer.dicePerRow, 8) }).map((_, col) => {
                const dieSize = (waferRadius * 1.6) / Math.min(chipletWafer.dicePerRow, 8);
                const x = -(Math.min(chipletWafer.dicePerRow, 8) * dieSize) / 2 + col * dieSize;
                const y = -(Math.min(chipletWafer.dicePerRow, 8) * dieSize) / 2 + row * dieSize;
                const idx = row * chipletWafer.dicePerRow + col;
                const isGood = chipletWafer.dice[idx] ?? false;
                const dx = x + dieSize/2;
                const dy = y + dieSize/2;
                if (Math.sqrt(dx*dx + dy*dy) > waferRadius - 8) return null;
                return (
                  <rect
                    key={`chip-${row}-${col}`}
                    x={x}
                    y={y}
                    width={dieSize - 1}
                    height={dieSize - 1}
                    fill={isGood ? 'url(#cvmGoodDie)' : 'url(#cvmDefectDie)'}
                    rx={1}
                  />
                );
              })
            )}
          </g>

          {/* Yield statistics with premium styling */}
          <rect x={monoWaferX - 55} y={waferY + waferRadius + 15} width={110} height={40} rx={6} fill="rgba(0,0,0,0.5)" />
          <text x={monoWaferX} y={waferY + waferRadius + 30} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="bold">
            Yield: {calc.monolithic.yield.toFixed(1)}%
          </text>
          <text x={monoWaferX} y={waferY + waferRadius + 48} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            {calc.monolithic.goodPerWafer.toFixed(0)} good/wafer
          </text>

          <rect x={chipletWaferX - 55} y={waferY + waferRadius + 15} width={110} height={40} rx={6} fill="rgba(0,0,0,0.5)" />
          <text x={chipletWaferX} y={waferY + waferRadius + 30} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="bold">
            Per-die: {calc.chiplet.yieldEach.toFixed(1)}%
          </text>
          <text x={chipletWaferX} y={waferY + waferRadius + 48} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            System: {calc.chiplet.systemYield.toFixed(1)}%
          </text>

          {/* Package Assembly Visualization */}
          {(() => {
            const pkgX = chipletWaferX + 70;
            const pkgY = packageY;
            return (
              <g filter="url(#cvmPackageShadow)">
                {/* Package substrate */}
                <rect x={pkgX} y={pkgY} width={100} height={70} rx={6} fill="url(#cvmPackageSubstrate)" />
                <rect x={pkgX} y={pkgY} width={100} height={70} rx={6} fill="none" stroke="#78716c" strokeWidth="2" />

                {/* Interposer layer (if advanced packaging) */}
                {advancedPackaging && showAdvanced && (
                  <rect x={pkgX + 5} y={pkgY + 5} width={90} height={60} rx={4} fill="url(#cvmInterposer)" opacity="0.8" />
                )}

                {/* Chiplet arrangement inside package */}
                {Array.from({ length: Math.min(numChiplets, 4) }).map((_, i) => {
                  const cols = Math.min(numChiplets, 2);
                  const rows = Math.ceil(Math.min(numChiplets, 4) / cols);
                  const chipW = 35;
                  const chipH = 22;
                  const gapX = (90 - cols * chipW) / (cols + 1);
                  const gapY = (60 - rows * chipH) / (rows + 1);
                  const px = pkgX + 5 + gapX + (i % cols) * (chipW + gapX);
                  const py = pkgY + 5 + gapY + Math.floor(i / cols) * (chipH + gapY);
                  return (
                    <g key={`pkg-${i}`}>
                      <rect x={px - 2} y={py - 2} width={chipW + 4} height={chipH + 4} rx={3} fill="url(#cvmChipletGlow)" />
                      <rect x={px} y={py} width={chipW} height={chipH} rx={2} fill="url(#cvmChipletSilicon)" />
                      <rect x={px} y={py} width={chipW} height={chipH} rx={2} fill="url(#cvmFineCircuit)" />
                      <rect x={px} y={py} width={chipW} height={chipH} rx={2} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                    </g>
                  );
                })}

                {/* Interconnect traces between chiplets */}
                {advancedPackaging && showAdvanced && numChiplets >= 2 && (
                  <g filter="url(#cvmInterconnectGlow)">
                    <line x1={pkgX + 42} y1={pkgY + 25} x2={pkgX + 58} y2={pkgY + 25} stroke="url(#cvmHBMTrace)" strokeWidth="3" />
                    <line x1={pkgX + 42} y1={pkgY + 30} x2={pkgX + 58} y2={pkgY + 30} stroke="url(#cvmHBMTrace)" strokeWidth="2" />
                    {numChiplets >= 3 && (
                      <>
                        <line x1={pkgX + 42} y1={pkgY + 48} x2={pkgX + 58} y2={pkgY + 48} stroke="url(#cvmHBMTrace)" strokeWidth="3" />
                        <line x1={pkgX + 42} y1={pkgY + 53} x2={pkgX + 58} y2={pkgY + 53} stroke="url(#cvmHBMTrace)" strokeWidth="2" />
                      </>
                    )}
                    {numChiplets >= 3 && (
                      <>
                        <line x1={pkgX + 25} y1={pkgY + 33} x2={pkgX + 25} y2={pkgY + 42} stroke="url(#cvmHBMTrace)" strokeWidth="3" />
                        <line x1={pkgX + 75} y1={pkgY + 33} x2={pkgX + 75} y2={pkgY + 42} stroke="url(#cvmHBMTrace)" strokeWidth="3" />
                      </>
                    )}
                  </g>
                )}

                {/* Standard interconnect (when not advanced) */}
                {!advancedPackaging && numChiplets >= 2 && (
                  <g opacity="0.5">
                    <line x1={pkgX + 42} y1={pkgY + 27} x2={pkgX + 58} y2={pkgY + 27} stroke="url(#cvmMetalTrace)" strokeWidth="1.5" />
                    {numChiplets >= 3 && (
                      <line x1={pkgX + 25} y1={pkgY + 33} x2={pkgX + 25} y2={pkgY + 42} stroke="url(#cvmMetalTrace)" strokeWidth="1.5" />
                    )}
                  </g>
                )}

                {/* Package label */}
                <text x={pkgX + 50} y={pkgY - 8} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="bold">
                  {advancedPackaging && showAdvanced ? '2.5D/3D Package' : 'Standard Package'}
                </text>

                {/* Ball grid array (BGA) indicators at bottom */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <circle key={`bga-${i}`} cx={pkgX + 12 + i * 11} cy={pkgY + 77} r={3} fill="#c9b037" stroke="#a08c2e" strokeWidth="0.5" />
                ))}
              </g>
            );
          })()}

          {/* Arrow from wafer to package */}
          <g opacity="0.6">
            <path d={`M${chipletWaferX + 50},${waferY + waferRadius + 50} Q${chipletWaferX + 80},${packageY - 20} ${chipletWaferX + 90},${packageY - 5}`}
              fill="none" stroke={colors.chiplet} strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#cvmArrow)" />
          </g>
          <defs>
            <marker id="cvmArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.chiplet} />
            </marker>
          </defs>

          {/* Cost comparison panel with premium styling */}
          <rect x={10} y={400} width={220} height={96} rx={10} fill="url(#cvmCostPanel)" filter="url(#cvmInnerGlow)" />
          <rect x={10} y={400} width={220} height={96} rx={10} fill="none" stroke={colors.cost} strokeWidth="1.5" opacity="0.8" />

          <text x={25} y={416} fill={colors.cost} fontSize={13} fontWeight="bold">Cost Analysis</text>
          <line x1={25} y1={422} x2={215} y2={422} stroke={colors.cost} strokeWidth="0.5" opacity="0.5" />

          <text x={25} y={438} fill={colors.monolithic} fontSize={11} fontWeight="bold">
            Mono: ${formatCost(calc.monolithic.costPerGood)}/die
          </text>
          <text x={25} y={454} fill={colors.chiplet} fontSize={11} fontWeight="bold">
            Chiplets: ${formatCost(calc.chiplet.totalCost)}/sys
          </text>
          <text x={25} y={470} fill={colors.textMuted} fontSize={11}>
            ({numChiplets} chiplets + pkg)
          </text>

          <rect x={25} y={478} width={190} height={16} rx={4} fill={calc.comparison.chipletsWin ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'} />
          <text x={120} y={491} fill={calc.comparison.chipletsWin ? colors.success : colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">
            {calc.comparison.chipletsWin ? 'Chiplets win' : 'Mono wins'}
          </text>

          {/* Performance panel with premium styling */}
          <rect x={250} y={400} width={230} height={96} rx={10} fill="url(#cvmPerfPanel)" filter="url(#cvmInnerGlow)" />
          <rect x={250} y={400} width={230} height={96} rx={10} fill="none" stroke={colors.textSecondary} strokeWidth="1.5" opacity="0.6" />

          <text x={265} y={416} fill={colors.textSecondary} fontSize={13} fontWeight="bold">Performance</text>
          <line x1={265} y1={422} x2={465} y2={422} stroke={colors.textSecondary} strokeWidth="0.5" opacity="0.5" />

          <text x={265} y={438} fill={colors.monolithic} fontSize={11}>
            Mono: {calc.monolithic.latency} ns
          </text>
          <text x={265} y={454} fill={colors.chiplet} fontSize={11}>
            Chiplet: {calc.chiplet.latency.toFixed(1)} ns
          </text>
          <text x={265} y={470} fill={colors.textMuted} fontSize={11}>
            +{calc.comparison.latencyPenalty.toFixed(1)} ns penalty
          </text>

          {showAdvanced && (
            <text x={265} y={486} fill={advancedPackaging ? colors.interconnect : colors.textMuted} fontSize={11} fontWeight={advancedPackaging ? 'bold' : 'normal'}>
              {advancedPackaging ? 'Adv Pkg: ON' : 'Standard pkg'}
            </text>
          )}

          {/* Legend */}
          <rect x={500} y={400} width={190} height={96} rx={10} fill="rgba(0,0,0,0.4)" />
          <text x={515} y={422} fill={colors.textSecondary} fontSize={12} fontWeight="bold">Legend</text>
          <line x1={515} y1={430} x2={675} y2={430} stroke={colors.textSecondary} strokeWidth="0.5" opacity="0.5" />

          <rect x={515} y={440} width={16} height={12} rx={2} fill="url(#cvmGoodDie)" />
          <text x={538} y={450} fill={colors.textSecondary} fontSize={11}>Good Die</text>

          <rect x={600} y={440} width={16} height={12} rx={2} fill="url(#cvmDefectDie)" />
          <text x={623} y={450} fill={colors.textSecondary} fontSize={11}>Defective</text>

          <rect x={515} y={460} width={16} height={12} rx={2} fill="url(#cvmChipletSilicon)" />
          <text x={538} y={470} fill={colors.textSecondary} fontSize={11}>Chiplet</text>

          {showAdvanced && (
            <>
              <rect x={600} y={460} width={16} height={12} rx={2} fill="url(#cvmInterposer)" />
              <text x={623} y={470} fill={colors.textSecondary} fontSize={11}>Interposer</text>
            </>
          )}

          <line x1={515} y1={486} x2={530} y2={486} stroke="url(#cvmMetalTrace)" strokeWidth="2" />
          <text x={538} y={490} fill={colors.textSecondary} fontSize={11}>Interconnect</text>

          {showAdvanced && advancedPackaging && (
            <>
              <line x1={600} y1={486} x2={615} y2={486} stroke="url(#cvmHBMTrace)" strokeWidth="3" />
              <text x={623} y={490} fill={colors.textSecondary} fontSize={11}>HBM Link</text>
            </>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setSimulationSeed(Math.random() * 10000)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: '8px',
                border: 'none',
                background: colors.defect,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
              aria-label="Generate new defect pattern"
            >
              New Defects
            </button>
            <button
              onClick={() => setShowLatencyMode(!showLatencyMode)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: '8px',
                border: 'none',
                background: showLatencyMode ? colors.interconnect : colors.cost,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
              aria-label={showLatencyMode ? 'Switch to cost analysis' : 'Switch to latency analysis'}
            >
              {showLatencyMode ? 'Show Cost' : 'Show Latency'}
            </button>
            <button
              onClick={() => { setTotalDieArea(400); setNumChiplets(4); setDefectDensity(0.1); setInterconnectCost(20); setAdvancedPackaging(false); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
              aria-label="Reset all parameters to defaults"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    cursor: 'pointer',
    accentColor: colors.accent,
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    touchAction: 'pan-y',
  };

  const sliderContainerStyle: React.CSSProperties = {
    background: 'rgba(30, 41, 59, 0.6)',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  const renderControls = (showAdvancedControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={sliderContainerStyle}>
        <label style={{ touchAction: 'pan-y', color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Total Die Area: <span style={{ height: '20px', color: colors.accent, fontWeight: 'bold' }}>{totalDieArea} mm²</span>
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="50"
          value={totalDieArea}
          onChange={(e) => setTotalDieArea(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Total Die Area slider"
          aria-valuemin={100}
          aria-valuemax={800}
          aria-valuenow={totalDieArea}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>100 mm²</span>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>800 mm²</span>
        </div>
      </div>

      <div style={sliderContainerStyle}>
        <label style={{ touchAction: 'pan-y', color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of Chiplets: <span style={{ height: '20px', color: colors.accent, fontWeight: 'bold' }}>{numChiplets}</span>
        </label>
        <input
          type="range"
          min="2"
          max="16"
          step="1"
          value={numChiplets}
          onChange={(e) => setNumChiplets(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Number of Chiplets slider"
          aria-valuemin={2}
          aria-valuemax={16}
          aria-valuenow={numChiplets}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>2</span>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>16</span>
        </div>
      </div>

      <div style={sliderContainerStyle}>
        <label style={{ touchAction: 'pan-y', color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Defect Density: <span style={{ height: '20px', color: colors.accent, fontWeight: 'bold' }}>{defectDensity.toFixed(2)} /mm²</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="0.5"
          step="0.01"
          value={defectDensity}
          onChange={(e) => setDefectDensity(parseFloat(e.target.value))}
          style={sliderStyle}
          aria-label="Defect Density slider"
          aria-valuemin={0.01}
          aria-valuemax={0.5}
          aria-valuenow={defectDensity}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>0.01 /mm²</span>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>0.5 /mm²</span>
        </div>
      </div>

      <div style={sliderContainerStyle}>
        <label style={{ touchAction: 'pan-y', color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Packaging Cost: <span style={{ height: '20px', color: colors.accent, fontWeight: 'bold' }}>${interconnectCost}/chiplet</span>
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={interconnectCost}
          onChange={(e) => setInterconnectCost(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Packaging Cost slider"
          aria-valuemin={5}
          aria-valuemax={100}
          aria-valuenow={interconnectCost}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>$5</span>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>$100</span>
        </div>
      </div>

      {showAdvancedControls && (
        <>
          <div style={sliderContainerStyle}>
            <label style={{
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              minHeight: '44px',
            }}>
              <input
                type="checkbox"
                checked={advancedPackaging}
                onChange={(e) => setAdvancedPackaging(e.target.checked)}
                style={{ width: '24px', height: '24px', accentColor: colors.accent }}
                aria-label="Enable Advanced Packaging"
              />
              Enable Advanced Packaging (2.5D/3D)
            </label>
          </div>

          {advancedPackaging && (
            <>
              <div style={sliderContainerStyle}>
                <label style={{ touchAction: 'pan-y', color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Advanced Package Cost Multiplier: <span style={{ height: '20px', color: colors.accent, fontWeight: 'bold' }}>{advPackagingCostMult}x</span>
                </label>
                <input
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.5"
                  value={advPackagingCostMult}
                  onChange={(e) => setAdvPackagingCostMult(parseFloat(e.target.value))}
                  style={sliderStyle}
                  aria-label="Advanced Package Cost Multiplier slider"
                  aria-valuemin={1.5}
                  aria-valuemax={5}
                  aria-valuenow={advPackagingCostMult}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '11px' }}>1.5x</span>
                  <span style={{ color: colors.textMuted, fontSize: '11px' }}>5x</span>
                </div>
              </div>

              <div style={sliderContainerStyle}>
                <label style={{ touchAction: 'pan-y', color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Base Latency Penalty: <span style={{ height: '20px', color: colors.accent, fontWeight: 'bold' }}>{latencyPenalty} ns/hop</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={latencyPenalty}
                  onChange={(e) => setLatencyPenalty(parseInt(e.target.value))}
                  style={sliderStyle}
                  aria-label="Base Latency Penalty slider"
                  aria-valuemin={1}
                  aria-valuemax={20}
                  aria-valuenow={latencyPenalty}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '11px' }}>1 ns</span>
                  <span style={{ color: colors.textMuted, fontSize: '11px' }}>20 ns</span>
                </div>
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
          Yield = exp(-D × A) | Mono: {calculateYieldAndCost.monolithic.yield.toFixed(1)}% | Chiplet: {calculateYieldAndCost.chiplet.yieldEach.toFixed(1)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Cost advantage: {calculateYieldAndCost.comparison.chipletsWin ? 'Chiplets' : 'Monolithic'} by {Math.abs(1 - calculateYieldAndCost.comparison.costRatio).toFixed(0)}%
        </div>
      </div>
    </div>
  );

  // Top navigation bar with progress and phase dots
  const renderTopNav = () => {
    const currentIdx = PHASES.indexOf(phase);
    const progressPercent = ((currentIdx + 1) / PHASES.length) * 100;
    return (
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
        role="navigation"
        aria-label="Phase navigation"
      >
        {/* Progress bar */}
        <div
          style={{ height: '4px', background: 'rgba(255,255,255,0.1)', width: '100%' }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${currentIdx + 1} of ${PHASES.length} phases`}
        >
          <div
            style={{
              height: '100%',
              background: `linear-gradient(to right, ${colors.accent}, #f97316)`,
              width: `${progressPercent}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <button
            onClick={goBack}
            disabled={currentIdx === 0}
            aria-label="Go to previous phase"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: currentIdx === 0 ? colors.textMuted : colors.textSecondary,
              cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIdx === 0 ? 0.3 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '20px' }} aria-hidden="true">&larr;</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }} role="tablist" aria-label="Phase dots">
              {PHASES.map((p, i) => (
                <button
                  key={p}
                  onClick={() => goToPhase(p)}
                  role="tab"
                  aria-selected={i === currentIdx}
                  aria-label={`${PHASE_LABELS[p]}${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`}
                  style={{
                    minHeight: '44px',
                    minWidth: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                  }}
                >
                  <span style={{
                    display: 'block',
                    height: '8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    width: i === currentIdx ? '24px' : '8px',
                    background: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
                  }} />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, marginLeft: '8px', color: colors.textSecondary }}>
              {currentIdx + 1}/{PHASES.length}
            </span>
          </div>

          <div style={{
            padding: '4px 12px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.2)',
            color: colors.accent,
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {PHASE_LABELS[phase]}
          </div>
        </div>
      </nav>
    );
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          aria-label="Go to previous phase"
          style={{
            padding: '12px 20px',
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: currentIdx === 0 ? colors.textMuted : colors.textSecondary,
            fontWeight: 500,
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIdx === 0 ? 0.3 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.textSecondary }}>
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={disabled && !canProceed}
          aria-label={buttonText}
          style={{
            padding: '12px 24px',
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? `linear-gradient(to right, ${colors.accent}, #f97316)` : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Real-world applications data for chiplets vs monolithic
  const realWorldApps = [
    {
      icon: 'Server',
      title: 'Server Processors',
      short: 'Data Center Economics',
      tagline: 'Powering the cloud with modular silicon',
      description: 'Modern server processors leverage chiplet architectures to deliver unprecedented core counts and performance while maintaining manufacturable die sizes. By disaggregating compute, I/O, and memory controllers onto separate optimized dies, server chips achieve better yield economics and enable flexible product configurations from a common silicon building block.',
      connection: 'Server processors exemplify the yield economics we explored. A 64-core monolithic die would exceed 800mm² with catastrophic yield. Chiplets allow AMD EPYC and Intel Xeon to scale core counts while keeping individual dies at manufacturable sizes around 75-100mm² each.',
      howItWorks: 'Server chiplet designs typically use identical compute complex dies (CCDs) containing 8-16 cores each, connected to a central I/O die (IOD) that handles memory controllers, PCIe lanes, and inter-socket links. This separation allows compute chiplets to use the most advanced process node for performance, while I/O dies use mature nodes for cost efficiency and robust analog circuits.',
      stats: [
        { label: 'Core Count', value: '64-128', detail: 'cores per socket' },
        { label: 'Chiplet Yield', value: '85-92%', detail: 'vs 15-25% monolithic equivalent' },
        { label: 'TCO Savings', value: '30-50%', detail: 'total cost of ownership improvement' },
      ],
      examples: [
        'AMD EPYC Genoa uses 12 CCD chiplets plus 1 IOD for 96 cores',
        'Intel Xeon Max uses HBM memory tiles with Sapphire Rapids compute',
        'AWS Graviton3 uses custom Arm chiplets for cloud-native workloads',
        'Google TPU v4 uses multiple tensor processing chiplets interconnected',
      ],
      companies: ['AMD', 'Intel', 'AWS', 'Google', 'Ampere'],
      futureImpact: 'Server chiplets will continue scaling with UCIe standardization enabling multi-vendor chiplet ecosystems. Expect 256+ core processors using 3D-stacked cache chiplets and CXL-connected memory expansion, fundamentally changing data center architectures.',
      color: '#ef4444',
    },
    {
      icon: 'Cpu',
      title: 'Consumer CPUs',
      short: 'Desktop & Laptop Chips',
      tagline: 'Bringing datacenter innovation to your desk',
      description: 'Consumer processors are increasingly adopting chiplet designs to deliver better performance per watt and enable product segmentation without multiple unique silicon designs. This approach allows manufacturers to offer a range of products from mainstream to enthusiast using common building blocks.',
      connection: 'Consumer CPUs demonstrate how chiplet economics apply beyond servers. While desktop dies are smaller than server parts, the yield benefits and product flexibility still provide advantages. AMD Ryzen uses the same CCD chiplets as EPYC, amortizing design costs across consumer and enterprise markets.',
      howItWorks: 'Consumer chiplet CPUs typically combine compute chiplets with an I/O die that includes memory controllers, display outputs, and platform connectivity. Some designs like Apple M-series use monolithic for mainstream products but transition to chiplets (M1 Ultra, M2 Ultra) for high-end variants requiring more compute than a single die can provide.',
      stats: [
        { label: 'Performance', value: '+40%', detail: 'gen-over-gen improvement' },
        { label: 'Power Efficiency', value: '2-3x', detail: 'better than 5 years ago' },
        { label: 'Product Variants', value: '8-12', detail: 'SKUs from common chiplets' },
      ],
      examples: [
        'AMD Ryzen 7000 series uses Zen 4 CCDs with RDNA3 iGPU IOD',
        'Intel Core Ultra uses compute, GPU, and SoC tiles on Foveros 3D',
        'Apple M1/M2 Ultra connects two dies via UltraFusion bridge',
        'AMD Ryzen 9 7950X3D uses 3D V-Cache stacked chiplet for gaming',
      ],
      companies: ['AMD', 'Intel', 'Apple', 'Qualcomm'],
      futureImpact: 'Consumer chiplets will enable unprecedented customization, with users potentially selecting core count, cache size, and GPU capability independently. 3D stacking will become standard, putting massive caches directly on compute dies for latency-sensitive applications.',
      color: '#3b82f6',
    },
    {
      icon: 'Smartphone',
      title: 'Mobile SoCs',
      short: 'Smartphone Processors',
      tagline: 'Maximum integration meets modular design',
      description: 'Mobile system-on-chips face unique challenges balancing performance, power consumption, and thermal constraints in thin devices. While traditionally monolithic for maximum integration density, mobile SoCs are exploring disaggregated designs to enable heterogeneous integration of memory, modems, and specialized accelerators.',
      connection: 'Mobile SoCs showcase the trade-off between monolithic integration (lower power, smaller package) and chiplet flexibility. As die sizes grow with more AI accelerators and camera ISPs, the yield economics we studied increasingly favor disaggregation even in mobile.',
      howItWorks: 'Current mobile designs primarily use monolithic SoCs integrating CPU, GPU, NPU, ISP, and connectivity. However, flagship phones increasingly use separate modem chiplets for 5G, and future designs will disaggregate components further using advanced fan-out packaging and 3D stacking to meet diverse requirements.',
      stats: [
        { label: 'Transistors', value: '15-20B', detail: 'per flagship SoC' },
        { label: 'AI Performance', value: '30+ TOPS', detail: 'neural engine capability' },
        { label: 'Power Budget', value: '5-8W', detail: 'sustained thermal limit' },
      ],
      examples: [
        'Apple A17 Pro uses industry-first 3nm process for main SoC',
        'Qualcomm Snapdragon 8 Gen 3 separates modem for flexibility',
        'MediaTek Dimensity 9300 uses all big-core heterogeneous design',
        'Google Tensor G3 integrates custom TPU for on-device AI',
      ],
      companies: ['Apple', 'Qualcomm', 'MediaTek', 'Samsung', 'Google'],
      futureImpact: 'Mobile chiplets will enable mix-and-match of modem generations, AI accelerator updates, and memory technology independent of main SoC redesigns. Expect disaggregated smartphone SoCs by 2026-2027 as advanced packaging costs decrease.',
      color: '#10b981',
    },
    {
      icon: 'Car',
      title: 'Automotive Chips',
      short: 'Vehicle Computing',
      tagline: 'Safety-critical silicon for the road ahead',
      description: 'Automotive processors demand exceptional reliability, long product lifecycles, and the ability to integrate diverse functions from infotainment to autonomous driving. Chiplet architectures enable automotive manufacturers to update compute capabilities while maintaining certified safety-critical components.',
      connection: 'Automotive chips uniquely benefit from chiplet modularity. Safety-certified components can remain unchanged while compute chiplets are upgraded. This addresses the long automotive development cycles (5-7 years) where technology evolves faster than vehicle platforms.',
      howItWorks: 'Automotive chiplet designs separate safety-critical real-time processors (ASIL-D certified) from high-performance AI accelerators and general compute. This allows the safety cores to maintain certification while compute elements are upgraded. Redundant chiplet configurations enable fail-operational systems required for autonomous driving.',
      stats: [
        { label: 'Compute Power', value: '500+ TOPS', detail: 'for L4 autonomy' },
        { label: 'Operating Range', value: '-40 to 125C', detail: 'automotive grade' },
        { label: 'Lifespan', value: '15+ years', detail: 'reliability requirement' },
      ],
      examples: [
        'NVIDIA DRIVE Thor uses chiplet architecture for 2000 TOPS',
        'Mobileye EyeQ Ultra combines radar and vision processing tiles',
        'Tesla FSD computer uses dual redundant AI chiplets',
        'Qualcomm Snapdragon Ride Flex scales via chiplet configurations',
      ],
      companies: ['NVIDIA', 'Mobileye', 'Tesla', 'Qualcomm', 'AMD'],
      futureImpact: 'Automotive chiplets will enable software-defined vehicles where compute capability can be upgraded throughout the vehicle lifecycle. Expect standardized automotive chiplet interfaces and centralized compute architectures replacing dozens of distributed ECUs.',
      color: '#f59e0b',
    },
  ];

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Chiplets vs Monolithic
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '8px' }}>
              Welcome! Discover how semiconductor economics work
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px' }}>
              Let's explore why not make one giant die for everything
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
        {renderBottomBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          {/* Progress indicator */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Step 1 of 2: Make your prediction
            </p>
          </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-label="Prediction options">
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  aria-pressed={prediction === p.id}
                  aria-label={p.label}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    minWidth: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease',
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
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Trade-offs</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Find the break-even point between chiplets and monolithic
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            margin: '0 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.chiplet}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.chiplet }}>Observe:</strong> Watch how the visualization changes as you adjust the sliders. Notice the relationship between die area and yield.
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
              <li>Start small (100mm) - monolithic usually wins</li>
              <li>Go large (600mm) - watch chiplets take over</li>
              <li>Increase defect density - chiplet advantage grows</li>
              <li>Increase packaging cost - monolithic becomes competitive</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '0 16px 16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Understanding the Physics</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              When you increase die area, yield decreases exponentially because larger dice are more likely to contain a defect. The yield is calculated as Y = exp(-D x A) where D is defect density and A is area. This relationship means that as area doubles, yield drops much more than half. When you increase the number of chiplets, each individual chiplet has higher yield because it is smaller. This is important in semiconductor industry design because it directly affects manufacturing cost and determines whether a product is economically viable. Companies like AMD and Intel use this technology to build high-performance processors.
            </p>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
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
              As you observed in the simulation, chiplets can win on yield and cost for large designs.
              This is because the exponential yield drop with area (Y = exp(-D x A)) means large monolithic
              dice have terrible yield. Therefore, chiplets avoid this problem, and the reason packaging costs must be overcome
              demonstrates how the economics work in practice.
            </p>
          </div>

          {/* Review SVG diagram */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <svg width="100%" height="150" viewBox="0 0 400 150" style={{ maxWidth: '400px' }}>
              <defs>
                <linearGradient id="reviewYieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.success} />
                  <stop offset="100%" stopColor={colors.error} />
                </linearGradient>
              </defs>
              <rect x="20" y="20" width="360" height="110" fill="rgba(30, 41, 59, 0.8)" rx="8" />
              <text x="200" y="45" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">Yield vs Die Area</text>
              <path d="M50,110 Q150,105 200,80 T350,40" stroke="url(#reviewYieldGrad)" strokeWidth="3" fill="none" />
              <text x="60" y="125" fill={colors.textSecondary} fontSize="11">Small Die</text>
              <text x="300" y="125" fill={colors.textSecondary} fontSize="11">Large Die</text>
              <circle cx="100" cy="105" r="5" fill={colors.success} />
              <circle cx="300" cy="50" r="5" fill={colors.error} />
            </svg>
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
                <strong style={{ color: colors.textPrimary }}>Exponential Yield:</strong> A 400mm die
                at 0.1 defects/mm has only 1.8% yield! Four 100mm chiplets each have 36% yield.
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
                depends on area, defect density, and packaging costs. Typically greater than 300mm favors chiplets.
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What about advanced packaging technologies?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              Step 1 of 2: Make your prediction
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-label="Twist prediction options">
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  aria-pressed={twistPrediction === p.id}
                  aria-label={p.label}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    minWidth: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease',
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
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Advanced Packaging</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable advanced packaging and observe the cost-performance shift
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            margin: '0 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.interconnect}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.interconnect }}>Observe:</strong> Toggle advanced packaging on and off. Watch how latency and cost trade-offs shift between chiplets and monolithic.
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
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

          {/* Twist review SVG diagram */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <svg width="100%" height="150" viewBox="0 0 400 150" style={{ maxWidth: '400px' }}>
              <rect x="20" y="20" width="360" height="110" fill="rgba(30, 41, 59, 0.8)" rx="8" />
              <text x="200" y="45" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">Advanced Packaging Trade-off</text>
              <rect x="50" y="60" width="80" height="50" fill={colors.chiplet} rx="4" opacity="0.7" />
              <text x="90" y="90" fill="white" fontSize="11" textAnchor="middle">Standard</text>
              <rect x="160" y="55" width="80" height="55" fill={colors.interconnect} rx="4" opacity="0.8" />
              <text x="200" y="88" fill="white" fontSize="11" textAnchor="middle">Advanced</text>
              <rect x="270" y="70" width="80" height="40" fill={colors.monolithic} rx="4" opacity="0.7" />
              <text x="310" y="95" fill="white" fontSize="11" textAnchor="middle">Monolithic</text>
              <text x="90" y="125" fill={colors.textSecondary} fontSize="11">Low Cost</text>
              <text x="200" y="125" fill={colors.textSecondary} fontSize="11">Best Perf</text>
              <text x="310" y="125" fill={colors.textSecondary} fontSize="11">Low Latency</text>
            </svg>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Chiplets are transforming the semiconductor industry
            </p>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: colors.chiplet, fontSize: '13px' }}>85% chiplet yield</span>
              <span style={{ color: colors.monolithic, fontSize: '13px' }}>800 mm total area</span>
              <span style={{ color: colors.cost, fontSize: '13px' }}>$5000 per wafer</span>
              <span style={{ color: colors.success, fontSize: '13px' }}>3nm process node</span>
            </div>
            {/* Progress indicator */}
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
              Application {transferCompleted.size + 1} of {transferApplications.length}
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
                  aria-label={`Continue to reveal answer for ${app.title}`}
                  style={{
                    padding: '12px 20px',
                    minHeight: '44px',
                    minWidth: '44px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Continue - Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => {
                      // Advance to next incomplete app or do nothing if all done
                      const nextIndex = transferApplications.findIndex((_, i) => !transferCompleted.has(i) && i > index);
                      if (nextIndex !== -1) {
                        // Could scroll to next
                      }
                    }}
                    aria-label={`Got it - ${app.title} complete`}
                    style={{
                      padding: '10px 16px',
                      minHeight: '44px',
                      minWidth: '44px',
                      borderRadius: '6px',
                      border: 'none',
                      background: colors.success,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Got It
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderTopNav()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
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
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>Q{qIndex + 1} of {testQuestions.length}: {q.question}</p>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '8px',
                    borderRadius: '4px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    border: 'none',
                    padding: 0,
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label={`Go to question ${i + 1}`}
                >
                  <span style={{
                    display: 'block',
                    height: '8px',
                    width: '100%',
                    borderRadius: '4px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)',
                  }} />
                </button>
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</p>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, marginBottom: '12px' }}>{currentQ.question}</p>
              <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: 1.4 }}>
                Consider what you learned about semiconductor manufacturing yield, defect density,
                packaging overhead, and the economic trade-offs between monolithic and chiplet architectures.
                Think about how the exponential yield relationship Y = exp(-D x A) affects larger dies,
                and how advanced packaging technologies like 2.5D interposers and 3D stacking change the equation.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-label="Answer options">
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  aria-pressed={testAnswers[currentTestQuestion] === oIndex}
                  aria-label={`Answer option ${String.fromCharCode(65 + oIndex)}: ${opt.text}`}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    minWidth: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontWeight: 'bold', marginRight: '8px', color: colors.accent }}>{String.fromCharCode(65 + oIndex)}.</span>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              aria-label="Previous question"
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textSecondary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                aria-label="Next question"
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  minWidth: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                aria-label="Submit your answers"
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  minWidth: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease',
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
        {renderTopNav()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }} aria-label="Trophy">&#127942;</div>
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
