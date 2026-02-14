import React, { useState, useCallback, useEffect, useRef } from 'react';

const realWorldApps = [
  {
    icon: '🔌',
    title: 'Semiconductor Manufacturing',
    short: 'Chip fabs require the purest materials on Earth',
    tagline: 'Purity at atomic scale',
    description: 'Modern microprocessors contain billions of transistors measuring just 3-5 nanometers. At this scale, a single impurity atom can cause a transistor to fail. The semiconductor industry has driven silicon purification to unimaginable levels.',
    connection: 'This simulation shows why IC-grade silicon requires 9-11 nines of purity (99.9999999%+). Even one impurity atom per billion can create defects that ruin chip performance or cause random failures.',
    howItWorks: 'The Siemens process converts metallurgical silicon to trichlorosilane gas, which is repeatedly distilled to remove impurities. Czochralski crystal growth then pulls a single crystal ingot from molten ultra-pure silicon in an inert atmosphere.',
    stats: [
      { value: '11N', label: 'Nines of purity for ICs', icon: '💎' },
      { value: '$580B', label: 'Global chip market', icon: '💰' },
      { value: '3nm', label: 'Current transistor size', icon: '🔬' }
    ],
    examples: ['CPUs and GPUs', 'Memory chips', 'Power semiconductors', 'RF chips'],
    companies: ['TSMC', 'Intel', 'Samsung', 'GlobalFoundries'],
    futureImpact: 'As transistors shrink to 1nm and below, even isotopic purity (silicon-28 only) may be required, pushing purification technology to new extremes.',
    color: '#8B5CF6'
  },
  {
    icon: '☀️',
    title: 'Solar Cell Production',
    short: 'Solar panels use lower-grade but still remarkably pure silicon',
    tagline: 'Clean energy economics',
    description: 'Solar cells work well with 6-7 nines purity (99.9999%), 1000x less pure than IC-grade. This dramatic difference in requirements is why solar panel costs have dropped 99% since 1976 - they can use "reject" silicon and simpler processes.',
    connection: 'The simulation demonstrates that solar cells tolerate more impurities because they rely on bulk material properties, not individual atomic-scale features. Carrier lifetime decreases with impurities but remains adequate for photovoltaic operation.',
    howItWorks: 'Solar-grade silicon uses the upgraded metallurgical silicon (UMG) process or simplified Siemens processes. Multicrystalline casting is cheaper than single-crystal growth. Higher impurity tolerance means faster, cheaper production.',
    stats: [
      { value: '6N', label: 'Nines of purity for solar', icon: '☀️' },
      { value: '99%', label: 'Cost drop since 1976', icon: '📉' },
      { value: '1.2 TW', label: 'Global solar capacity', icon: '⚡' }
    ],
    examples: ['Rooftop panels', 'Utility solar farms', 'Portable chargers', 'Space solar arrays'],
    companies: ['JinkoSolar', 'LONGi', 'First Solar', 'Canadian Solar'],
    futureImpact: 'New purification methods and thin-film alternatives may further reduce material requirements, making solar even more affordable and sustainable.',
    color: '#F59E0B'
  },
  {
    icon: '♻️',
    title: 'Silicon Recycling Industry',
    short: 'IC rejects become solar gold, waste becomes resource',
    tagline: 'Circular silicon economy',
    description: 'Rejected IC-grade silicon wafers and chips contain ultra-pure material that far exceeds solar requirements. A growing recycling industry collects this waste and reprocesses it for solar panel production.',
    connection: 'This simulation shows why silicon that fails IC specs (8N purity) still far exceeds solar requirements (6N). Understanding this gap reveals the economic opportunity in recycling "impure" semiconductor waste.',
    howItWorks: 'Silicon recyclers collect pot scrap, broken wafers, and off-spec material from chip fabs. After testing for purity, material is melted, recast, and often mixed with new polysilicon. Some recyclers achieve 90% material recovery rates.',
    stats: [
      { value: '$1.2B', label: 'Silicon recycling market', icon: '♻️' },
      { value: '90%', label: 'Material recovery rate', icon: '📊' },
      { value: '50%', label: 'Energy savings vs virgin', icon: '⚡' }
    ],
    examples: ['Wafer scrap recovery', 'Solar panel recycling', 'Electronic waste processing', 'Industrial silicon reuse'],
    companies: ['Silrec', 'SiC Processing', 'NPC', 'ROSI Solar'],
    futureImpact: 'As millions of solar panels reach end-of-life, a massive new recycling industry will recover silicon and other materials for circular reuse.',
    color: '#10B981'
  },
  {
    icon: '⚛️',
    title: 'Quantum Computing Silicon',
    short: 'Quantum bits need isotopically pure silicon-28',
    tagline: 'Beyond chemical purity',
    description: 'Silicon-based quantum computers require not just chemical purity but isotopic purity. Natural silicon contains 4.7% silicon-29, whose nuclear spin disrupts quantum coherence. Quantum silicon must be 99.99%+ silicon-28.',
    connection: 'This simulation focuses on chemical impurities, but quantum computing adds another dimension. Even chemically pure silicon fails if it contains the wrong isotopes - a new frontier in material purity.',
    howItWorks: 'Isotope separation uses gas centrifuges with silane (SiH₄) gas, similar to uranium enrichment. The heavier Si-29 and Si-30 isotopes separate slightly, requiring thousands of cascade stages. The enriched gas is then deposited as epitaxial layers.',
    stats: [
      { value: '99.995%', label: 'Si-28 purity for quantum', icon: '⚛️' },
      { value: '$100K', label: 'Per gram isotopically pure', icon: '💎' },
      { value: '1000x', label: 'Coherence time improvement', icon: '⏱️' }
    ],
    examples: ['Quantum processors', 'Quantum memory', 'Single-spin qubits', 'Quantum sensors'],
    companies: ['Intel', 'UNSW', 'TU Delft', 'Archer Materials'],
    futureImpact: 'Scalable quantum computers may require tons of isotopically pure silicon, creating an entirely new ultra-premium materials industry.',
    color: '#3B82F6'
  }
];

interface SolarVsICPurityRendererProps {
  gamePhase?: string; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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
  silicon: '#4f46e5',
  solarPanel: '#3b82f6',
  chip: '#8b5cf6',
  impurity: '#ef4444',
  border: '#334155',
};

const SolarVsICPurityRenderer: React.FC<SolarVsICPurityRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase navigation
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Cost Scaling',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

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
  const [purityLevel, setPurityLevel] = useState(99.9999); // 9s of purity
  const [viewMode, setViewMode] = useState<'solar' | 'ic'>('solar');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
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

  // Physics calculations
  const calculateMetrics = useCallback(() => {
    const nines = Math.log10(100 / (100 - purityLevel));
    const impurityPPM = (100 - purityLevel) * 10000;

    // Solar cell metrics
    const solarCarrierLifetime = Math.min(1000, 50 * Math.pow(nines, 1.5)); // microseconds
    const solarEfficiency = Math.min(24, 10 + 3 * nines); // %
    const solarCost = 10 + 5 * nines; // $/kg relative

    // IC metrics
    const icLeakageCurrent = Math.max(0.01, 1000 / Math.pow(10, nines - 3)); // nA
    const icTransistorYield = Math.min(99, 20 * nines - 20); // %
    const icCost = 10 * Math.pow(2, nines - 5); // $/kg relative

    // Defect density
    const defectDensity = impurityPPM * 1000; // atoms per million

    return {
      nines,
      impurityPPM,
      solarCarrierLifetime,
      solarEfficiency,
      solarCost,
      icLeakageCurrent,
      icTransistorYield,
      icCost,
      defectDensity,
    };
  }, [purityLevel]);

  const predictions = [
    { id: 'same', label: 'Both need the same ultra-high purity - silicon is silicon' },
    { id: 'solar_higher', label: 'Solar cells need higher purity because they convert light to electricity' },
    { id: 'ic_higher', label: 'IC chips need much higher purity for tiny transistors to work reliably' },
    { id: 'neither', label: 'Neither needs very high purity - modern processing compensates' },
  ];

  const twistPredictions = [
    { id: 'linear', label: 'Cost increases linearly with purity - 2x purer costs 2x more' },
    { id: 'exponential', label: 'Cost increases exponentially - each extra 9 costs much more' },
    { id: 'diminishing', label: 'Cost increases but with diminishing returns at high purity' },
    { id: 'step', label: 'Cost jumps in steps based on different purification technologies' },
  ];

  const transferApplications = [
    {
      title: 'Semiconductor Fabs',
      description: 'Chip manufacturing facilities spend billions on contamination control systems.',
      question: 'Why do chip fabs require cleanrooms with less than 1 particle per cubic meter?',
      answer: 'A single dust particle can destroy transistors measuring only 5nm. With billions of transistors per chip, even tiny contamination causes failures. The extreme purity of silicon must be maintained throughout processing.',
    },
    {
      title: 'Solar Panel Economics',
      description: 'Solar panel prices dropped 99% since 1976, partly due to using lower-grade silicon.',
      question: 'How does using less pure silicon help make solar power affordable?',
      answer: 'Solar cells work with 99.9999% pure silicon (6 nines) while ICs need 99.9999999% (9+ nines). This 1000x lower purity requirement makes solar silicon 10-100x cheaper, enabling affordable renewable energy.',
    },
    {
      title: 'Recycled Silicon',
      description: 'Broken solar panels and rejected IC wafers can be recycled for different uses.',
      question: 'Why might rejected IC-grade silicon be perfect for solar cells?',
      answer: 'IC fabrication rejects wafers with defect counts too high for chip yield. These same wafers often exceed solar-grade purity requirements, making recycled IC rejects valuable for solar panel production.',
    },
    {
      title: 'Quantum Computing',
      description: 'Quantum computers require even more extreme silicon purity than classical ICs.',
      question: 'Why do quantum bits (qubits) need isotopically pure silicon?',
      answer: 'Quantum coherence is destroyed by nuclear spin from Si-29 isotopes. Quantum silicon must be 99.995% Si-28, removing impurities AND unwanted isotopes - an extra level of purity beyond even IC-grade.',
    },
  ];

  const testQuestions = [
    {
      question: 'Which application requires higher silicon purity?',
      options: [
        { text: 'Solar photovoltaic cells', correct: false },
        { text: 'Integrated circuit chips', correct: true },
        { text: 'Both require identical purity', correct: false },
        { text: 'Purity does not matter for either', correct: false },
      ],
    },
    {
      question: 'What is the typical purity level for IC-grade silicon?',
      options: [
        { text: '99.9% (3 nines)', correct: false },
        { text: '99.9999% (6 nines)', correct: false },
        { text: '99.9999999% (9+ nines)', correct: true },
        { text: '99.99% (4 nines)', correct: false },
      ],
    },
    {
      question: 'Why can solar cells tolerate more impurities than ICs?',
      options: [
        { text: 'Solar cells operate at higher temperatures', correct: false },
        { text: 'Solar cells have no transistors requiring precise electrical control', correct: true },
        { text: 'Solar cells use a different type of silicon', correct: false },
        { text: 'Solar cells are much larger in physical size', correct: false },
      ],
    },
    {
      question: 'How do impurities affect carrier lifetime in solar cells?',
      options: [
        { text: 'Impurities increase carrier lifetime', correct: false },
        { text: 'Impurities decrease carrier lifetime by creating recombination centers', correct: true },
        { text: 'Impurities have no effect on carrier lifetime', correct: false },
        { text: 'Impurities only affect voltage, not carrier lifetime', correct: false },
      ],
    },
    {
      question: 'What happens to IC leakage current as purity decreases?',
      options: [
        { text: 'Leakage current decreases', correct: false },
        { text: 'Leakage current increases significantly', correct: true },
        { text: 'Leakage current stays constant', correct: false },
        { text: 'Leakage current becomes oscillating', correct: false },
      ],
    },
    {
      question: 'Why does the cost of silicon purification increase exponentially?',
      options: [
        { text: 'Equipment becomes less efficient at higher purity', correct: false },
        { text: 'Each additional 9 requires removing 10x fewer impurities', correct: true },
        { text: 'Higher purity silicon is heavier', correct: false },
        { text: 'Patents on purification technology', correct: false },
      ],
    },
    {
      question: 'The Czochralski process is used to create:',
      options: [
        { text: 'Only solar-grade silicon', correct: false },
        { text: 'Only IC-grade silicon', correct: false },
        { text: 'Both solar and IC silicon with different process parameters', correct: true },
        { text: 'Neither - it is obsolete technology', correct: false },
      ],
    },
    {
      question: 'What is a major advantage of using lower-purity silicon for solar?',
      options: [
        { text: 'Higher efficiency than pure silicon', correct: false },
        { text: 'Significantly lower cost per watt of power', correct: true },
        { text: 'Better performance in low light', correct: false },
        { text: 'Longer lifespan panels', correct: false },
      ],
    },
    {
      question: 'Metallurgical-grade silicon (99%) can be used for:',
      options: [
        { text: 'High-performance CPUs', correct: false },
        { text: 'Basic solar cells in some applications', correct: true },
        { text: 'Quantum computers', correct: false },
        { text: 'Memory chips', correct: false },
      ],
    },
    {
      question: 'The economic tradeoff in silicon purity is:',
      options: [
        { text: 'Higher purity always better regardless of cost', correct: false },
        { text: 'Match purity to application requirements for optimal cost-performance', correct: true },
        { text: 'Lower purity is always preferred to reduce costs', correct: false },
        { text: 'Purity has no impact on final product cost', correct: false },
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
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const metrics = calculateMetrics();

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
            <linearGradient id="siliconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="impurityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.error} />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            Silicon Purity: {purityLevel.toFixed(6)}% ({metrics.nines.toFixed(1)} nines)
          </text>

          {/* Silicon crystal lattice visualization */}
          <rect x={50} y={50} width={140} height={140} fill="url(#siliconGradient)" rx={8} opacity={0.3} />
          <text x={120} y={75} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Silicon Crystal</text>

          {/* Draw lattice points */}
          {[...Array(5)].map((_, row) =>
            [...Array(5)].map((_, col) => {
              const x = 70 + col * 25;
              const y = 90 + row * 22;
              const isImpurity = Math.random() < metrics.impurityPPM / 100000;
              return (
                <circle
                  key={`${row}-${col}`}
                  cx={x}
                  cy={y}
                  r={isImpurity ? 6 : 5}
                  fill={isImpurity ? colors.error : colors.silicon}
                  opacity={isImpurity ? 1 : 0.8}
                />
              );
            })
          )}

          {/* Impurity indicator */}
          <text x={120} y={205} fill={colors.textMuted} fontSize={10} textAnchor="middle">
            Impurity: {metrics.impurityPPM.toFixed(2)} ppm
          </text>

          {/* Application comparison */}
          <rect x={210} y={50} width={170} height={65} fill={colors.bgCard} rx={8} stroke={viewMode === 'solar' ? colors.solarPanel : 'transparent'} strokeWidth={2} />
          <text x={295} y={70} fill={colors.solarPanel} fontSize={12} textAnchor="middle" fontWeight="bold">Solar Cell</text>
          <text x={220} y={90} fill={colors.textSecondary} fontSize={10}>Carrier Lifetime: {metrics.solarCarrierLifetime.toFixed(0)} us</text>
          <text x={220} y={105} fill={colors.textSecondary} fontSize={10}>Efficiency: {metrics.solarEfficiency.toFixed(1)}%</text>

          <rect x={210} y={125} width={170} height={65} fill={colors.bgCard} rx={8} stroke={viewMode === 'ic' ? colors.chip : 'transparent'} strokeWidth={2} />
          <text x={295} y={145} fill={colors.chip} fontSize={12} textAnchor="middle" fontWeight="bold">IC Chip</text>
          <text x={220} y={165} fill={colors.textSecondary} fontSize={10}>Leakage: {metrics.icLeakageCurrent.toFixed(2)} nA</text>
          <text x={220} y={180} fill={metrics.icTransistorYield > 50 ? colors.success : colors.error} fontSize={10}>
            Transistor Yield: {Math.max(0, metrics.icTransistorYield).toFixed(0)}%
          </text>

          {/* Cost comparison bars */}
          <text x={width/2} y={220} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">
            Relative Cost ($/kg)
          </text>

          {/* Solar cost bar */}
          <rect x={50} y={235} width={Math.min(150, metrics.solarCost * 3)} height={20} fill={colors.solarPanel} rx={4} />
          <text x={55} y={250} fill={colors.textPrimary} fontSize={10}>Solar: ${metrics.solarCost.toFixed(0)}</text>

          {/* IC cost bar */}
          <rect x={50} y={265} width={Math.min(300, metrics.icCost * 0.5)} height={20} fill={colors.chip} rx={4} />
          <text x={55} y={280} fill={colors.textPrimary} fontSize={10}>IC: ${metrics.icCost.toFixed(0)}</text>

          {/* Requirements indicators */}
          <text x={width/2} y={310} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">
            Purity Requirements
          </text>

          {/* Purity scale */}
          <rect x={50} y={325} width={300} height={8} fill="#374151" rx={4} />

          {/* Solar requirement marker */}
          <rect x={50 + 6 * 30} y={325} width={4} height={16} fill={colors.solarPanel} />
          <text x={50 + 6 * 30} y={355} fill={colors.solarPanel} fontSize={9} textAnchor="middle">6N</text>

          {/* IC requirement marker */}
          <rect x={50 + 9 * 30} y={325} width={4} height={16} fill={colors.chip} />
          <text x={50 + 9 * 30} y={355} fill={colors.chip} fontSize={9} textAnchor="middle">9N+</text>

          {/* Current purity marker */}
          <polygon
            points={`${50 + metrics.nines * 30 - 5},320 ${50 + metrics.nines * 30 + 5},320 ${50 + metrics.nines * 30},328`}
            fill={colors.accent}
          />
          <text x={50 + metrics.nines * 30} y={370} fill={colors.accent} fontSize={9} textAnchor="middle">Current</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setViewMode('solar')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: viewMode === 'solar' ? `2px solid ${colors.solarPanel}` : '1px solid rgba(255,255,255,0.2)',
                background: viewMode === 'solar' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: colors.solarPanel,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Solar View
            </button>
            <button
              onClick={() => setViewMode('ic')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: viewMode === 'ic' ? `2px solid ${colors.chip}` : '1px solid rgba(255,255,255,0.2)',
                background: viewMode === 'ic' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.chip,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              IC Chip View
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Silicon Purity: {purityLevel.toFixed(6)}% ({calculateMetrics().nines.toFixed(1)} nines)
        </label>
        <input
          type="range"
          min="99"
          max="99.9999999"
          step="0.0000001"
          value={purityLevel}
          onChange={(e) => setPurityLevel(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>99% (2N)</span>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>99.9999999% (9N)</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {viewMode === 'solar'
            ? `Solar cells need ~6 nines (99.9999%) for good efficiency`
            : `ICs need 9+ nines (99.9999999%) for transistor reliability`}
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
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
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
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

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: colors.bgDark,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!canGoNext) return;
            if (onNext) {
              onNext();
            } else {
              goNext();
            }
          }}
          disabled={!canGoNext}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : colors.bgDark,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px'
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Solar vs IC Silicon Purity
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Is solar silicon as pure as CPU silicon?
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
                Both solar panels and computer chips are made from silicon. But do they
                need the same level of purity? The answer reveals a fascinating economic
                and physics tradeoff that shapes entire industries.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Adjust the purity slider to see how impurities affect both technologies!
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which technology requires higher silicon purity?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Purity Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust purity and compare solar vs IC requirements
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic' }}>
              Observe how impurity levels affect carrier lifetime, transistor yield, and cost for each application.
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
              <li>Set purity to 99.9999% (6 nines) - good for solar, bad for ICs</li>
              <li>Set purity to 99.9999999% (9 nines) - good for both, but expensive</li>
              <li>Watch how leakage current explodes at lower purity</li>
              <li>Compare the cost curves for each application</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'ic_higher';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
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
              IC chips require MUCH higher purity than solar cells. ICs need 9+ nines while
              solar cells work well with just 6 nines - a 1000x difference in impurity tolerance!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why ICs Need Higher Purity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Tiny Transistors:</strong> Modern
                transistors are only 5-7nm wide. A single impurity atom can completely change
                the electrical behavior.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Leakage Current:</strong> Impurities
                create unwanted conduction paths. With billions of transistors, even tiny leakage
                per transistor adds up to significant power loss.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Solar Tolerance:</strong> Solar cells
                just need electrons to flow from light absorption. Impurities reduce efficiency but
                dont cause catastrophic failure.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              How does cost scale with increasing purity?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              As you increase purity from 6 nines to 9 nines, how does cost change?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore the Cost Curve</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch how cost scales with each additional 9 of purity
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic' }}>
              Observe how the cost bars grow as you increase purity levels.
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Each additional 9 of purity means removing 10x fewer remaining impurities.
              This gets exponentially harder and more expensive!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'exponential';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
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
              Cost increases exponentially! Going from 6 to 9 nines can cost 10-100x more
              because youre removing ever-smaller amounts of impurities.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Economics of Purity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Solar Silicon:</strong> ~$20-50/kg
                for 6-nines purity. Acceptable tradeoff between efficiency and cost.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Electronic Silicon:</strong> ~$50-200/kg
                for 9+ nines. The premium is worth it for billions of transistors.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>This drives innovation:</strong> Solar
                industry focuses on getting more from cheaper silicon, while IC industry focuses on
                purification and defect control.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
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
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => {
                      // Find next incomplete application
                      const nextIndex = transferApplications.findIndex((_, i) => i > index && !transferCompleted.has(i));
                      if (nextIndex !== -1) {
                        // Scroll to next application
                        const cards = document.querySelectorAll('[data-transfer-card]');
                        if (cards[nextIndex]) {
                          cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: colors.success,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {index < transferApplications.length - 1 ? 'Next Application' : 'Got It'}
                  </button>
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
          <div style={{ flex: 1, overflowY: 'auto' }}>
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
          {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => {
            setTestSubmitted(false);
            setTestAnswers(new Array(10).fill(null));
            setCurrentTestQuestion(0);
          })}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
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
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Achievement</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand silicon purity tradeoffs in semiconductor manufacturing
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>IC chips require 9+ nines purity, solar cells need only 6 nines</li>
              <li>Impurities cause leakage current in transistors</li>
              <li>Impurities create recombination centers in solar cells</li>
              <li>Purification cost increases exponentially with each 9</li>
              <li>Economic optimization matches purity to application</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SolarVsICPurityRenderer;
