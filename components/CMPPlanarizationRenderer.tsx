import React, { useState, useEffect, useCallback } from 'react';

interface CMPPlanarizationRendererProps {
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
  accent: '#ec4899',
  accentGlow: 'rgba(236, 72, 153, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  copper: '#f59e0b',
  oxide: '#60a5fa',
  barrier: '#a855f7',
  substrate: '#1e293b',
};

const CMPPlanarizationRenderer: React.FC<CMPPlanarizationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [polishTime, setPolishTime] = useState(0); // 0-100%
  const [polishPressure, setPolishPressure] = useState(50); // 0-100
  const [slurrySelectivity, setSlurrySelectivity] = useState(50); // Cu:Oxide selectivity
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDefects, setShowDefects] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPolishTime(prev => {
        if (prev >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations for CMP
  const calculateCMPResult = useCallback(() => {
    // Initial topography heights (nm) - representing copper and oxide regions
    const initialCopperHeight = 150;
    const initialOxideHeight = 100;
    const initialStep = initialCopperHeight - initialOxideHeight;

    // Preston equation: Removal rate = k * P * V
    // k depends on slurry chemistry, V is velocity (constant), P is pressure
    const removalRateBase = polishPressure / 50; // normalized

    // Selectivity affects how fast copper removes vs oxide
    // Higher selectivity means copper removes faster
    const copperSelectivity = 1 + (slurrySelectivity - 50) / 50; // 0.5 to 1.5
    const oxideSelectivity = 1 - (slurrySelectivity - 50) / 100; // 0.5 to 1.0

    // Calculate removal over time
    const copperRemoval = (polishTime / 100) * 100 * removalRateBase * copperSelectivity;
    const oxideRemoval = (polishTime / 100) * 60 * removalRateBase * oxideSelectivity;

    // Current heights
    const copperHeight = Math.max(0, initialCopperHeight - copperRemoval);
    const oxideHeight = Math.max(0, initialOxideHeight - oxideRemoval);

    // Step height (should approach zero for good planarization)
    const currentStep = copperHeight - oxideHeight;

    // Dishing: copper surface dips below oxide (over-polish)
    const dishing = Math.max(0, oxideHeight - copperHeight);

    // Erosion: oxide loss in dense copper areas
    const erosion = oxideRemoval > initialOxideHeight * 0.3 ? (oxideRemoval - initialOxideHeight * 0.3) : 0;

    // Within-wafer non-uniformity (increases with aggressive polish)
    const nonUniformity = (polishPressure / 100) * 10 + (polishTime > 80 ? (polishTime - 80) * 0.5 : 0);

    // Planarity quality score
    const planarityScore = Math.max(0, 100 - Math.abs(currentStep) * 2 - dishing * 3 - erosion * 2);

    // Determine if CMP is complete (copper cleared from field, minimal defects)
    const isComplete = copperHeight <= oxideHeight && dishing < 20 && erosion < 15;

    // Over-polish detection
    const isOverPolished = polishTime > 70 && (dishing > 15 || erosion > 10);

    return {
      copperHeight,
      oxideHeight,
      currentStep,
      dishing,
      erosion,
      nonUniformity,
      planarityScore,
      isComplete,
      isOverPolished,
      copperRemoval,
      oxideRemoval,
    };
  }, [polishTime, polishPressure, slurrySelectivity]);

  const predictions = [
    { id: 'same', label: 'All materials polish at the same rate' },
    { id: 'selective', label: 'Polishing removes high spots faster, creating a flat surface' },
    { id: 'scratches', label: 'Polishing always creates scratches and cannot make things flat' },
    { id: 'impossible', label: 'It is impossible to polish nanometer-scale features flat' },
  ];

  const twistPredictions = [
    { id: 'more_better', label: 'More polishing always gives better results' },
    { id: 'dishing', label: 'Too much polishing causes dishing (copper sinks below oxide)' },
    { id: 'no_defects', label: 'CMP never creates defects' },
    { id: 'stops_auto', label: 'CMP automatically stops when the surface is flat' },
  ];

  const transferApplications = [
    {
      title: 'Copper Damascene Interconnects',
      description: 'Modern chips use copper wiring embedded in trenches, then polished flat.',
      question: 'Why did the industry switch from aluminum to copper damascene?',
      answer: 'Copper has 40% lower resistance than aluminum, enabling faster, lower-power chips. But copper cannot be etched cleanly, so damascene (fill + CMP) is required. CMP makes copper wiring possible!',
    },
    {
      title: 'Shallow Trench Isolation (STI)',
      description: 'Transistors are isolated by oxide-filled trenches that must be perfectly flat.',
      question: 'What happens if STI CMP is not flat?',
      answer: 'Uneven STI causes variation in transistor threshold voltage and gate length. This creates circuit timing variations and potential failures. STI CMP uniformity directly affects chip yield.',
    },
    {
      title: '3D NAND Memory',
      description: '3D NAND has 100+ stacked layers, each requiring planarization.',
      question: 'How does CMP affect 3D NAND layer stacking?',
      answer: 'Each layer must be perfectly flat before the next is deposited. Cumulative topography would cause focus issues in lithography and layer shorts. CMP enables the multi-layer stacking that makes 3D NAND possible.',
    },
    {
      title: 'Advanced Packaging',
      description: 'Chiplets and advanced packages use Through-Silicon Vias (TSVs) that require CMP.',
      question: 'Why is CMP critical for TSV technology?',
      answer: 'TSVs are copper-filled holes through the silicon. After filling, excess copper must be removed precisely to the silicon surface. Under-polish leaves shorts; over-polish damages the TSVs. CMP uniformity determines packaging yield.',
    },
  ];

  const testQuestions = [
    {
      question: 'What does CMP stand for in semiconductor manufacturing?',
      options: [
        { text: 'Chemical Mechanical Planarization (or Polishing)', correct: true },
        { text: 'Copper Metal Processing', correct: false },
        { text: 'Crystalline Material Preparation', correct: false },
        { text: 'Circuit Manufacturing Process', correct: false },
      ],
    },
    {
      question: 'The Preston equation describes CMP removal rate as proportional to:',
      options: [
        { text: 'Temperature only', correct: false },
        { text: 'Pressure times velocity (k x P x V)', correct: true },
        { text: 'Slurry concentration only', correct: false },
        { text: 'Wafer rotation speed only', correct: false },
      ],
    },
    {
      question: 'CMP uses slurry that contains:',
      options: [
        { text: 'Only water', correct: false },
        { text: 'Abrasive particles and chemical agents', correct: true },
        { text: 'Only acids', correct: false },
        { text: 'Pure copper', correct: false },
      ],
    },
    {
      question: '"Dishing" in CMP refers to:',
      options: [
        { text: 'The shape of the polishing pad', correct: false },
        { text: 'Copper surface receding below the oxide level', correct: true },
        { text: 'Adding more slurry', correct: false },
        { text: 'Wafer warping', correct: false },
      ],
    },
    {
      question: '"Erosion" in CMP refers to:',
      options: [
        { text: 'Pad wear', correct: false },
        { text: 'Excessive oxide loss in dense metal regions', correct: true },
        { text: 'Chemical damage to copper', correct: false },
        { text: 'Slurry degradation', correct: false },
      ],
    },
    {
      question: 'Selectivity in CMP slurry means:',
      options: [
        { text: 'The slurry only works on certain wafers', correct: false },
        { text: 'Different materials remove at different rates', correct: true },
        { text: 'The slurry selects which areas to polish', correct: false },
        { text: 'The pad selects the pressure', correct: false },
      ],
    },
    {
      question: 'Why is planarization critical for multi-layer chips?',
      options: [
        { text: 'It makes the chip look better', correct: false },
        { text: 'Flat surfaces enable accurate lithography on subsequent layers', correct: true },
        { text: 'It reduces chip weight', correct: false },
        { text: 'It is only cosmetic', correct: false },
      ],
    },
    {
      question: 'The endpoint of CMP (when to stop polishing) is typically detected by:',
      options: [
        { text: 'Visual inspection only', correct: false },
        { text: 'Optical or motor current monitoring', correct: true },
        { text: 'Fixed time only', correct: false },
        { text: 'Temperature measurement only', correct: false },
      ],
    },
    {
      question: 'Over-polishing in copper CMP causes:',
      options: [
        { text: 'Better flatness', correct: false },
        { text: 'Dishing, erosion, and increased resistance', correct: true },
        { text: 'Faster circuit operation', correct: false },
        { text: 'No problems', correct: false },
      ],
    },
    {
      question: 'The damascene process combines:',
      options: [
        { text: 'Etching copper patterns', correct: false },
        { text: 'Trenching, filling with copper, then CMP to remove excess', correct: true },
        { text: 'Only CMP without deposition', correct: false },
        { text: 'Only copper deposition', correct: false },
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showDefectMode: boolean = false) => {
    const width = 500;
    const height = 420;
    const result = calculateCMPResult();

    // Cross-section dimensions
    const baseY = 280;
    const scale = 1.5;

    // Feature positions
    const features = [
      { x: 80, width: 40, type: 'copper' },
      { x: 130, width: 25, type: 'oxide' },
      { x: 165, width: 60, type: 'copper' },
      { x: 235, width: 30, type: 'oxide' },
      { x: 275, width: 35, type: 'copper' },
      { x: 320, width: 40, type: 'oxide' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="copperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="oxideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="padGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
            <pattern id="slurryPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.5" fill={colors.accent} opacity="0.6" />
            </pattern>
          </defs>

          {/* Title */}
          <text x={width / 2} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            CMP Planarization Process
          </text>
          <text x={width / 2} y={42} fill={colors.accent} fontSize={11} textAnchor="middle">
            Polishing Time: {polishTime}% | Pressure: {polishPressure}%
          </text>

          {/* Polishing pad (above wafer) */}
          {polishTime > 0 && polishTime < 100 && (
            <g>
              <rect x={50} y={60} width={300} height={30} fill="url(#padGrad)" rx={4} />
              <text x={200} y={80} fill={colors.textPrimary} fontSize={10} textAnchor="middle">
                Polishing Pad
              </text>
              {/* Slurry particles */}
              <rect x={50} y={90} width={300} height={20} fill="url(#slurryPattern)" />
              <text x={200} y={125} fill={colors.accent} fontSize={9} textAnchor="middle">
                Slurry (abrasive + chemistry)
              </text>
              {/* Movement arrows */}
              <g opacity={0.7}>
                <line x1={100} y1={75} x2={150} y2={75} stroke={colors.textPrimary} strokeWidth={2} markerEnd="url(#moveArrow)" />
                <line x1={250} y1={75} x2={300} y2={75} stroke={colors.textPrimary} strokeWidth={2} markerEnd="url(#moveArrow)" />
              </g>
            </g>
          )}

          {/* Arrow marker */}
          <defs>
            <marker id="moveArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill={colors.textPrimary} />
            </marker>
          </defs>

          {/* Substrate base */}
          <rect x={50} y={baseY} width={320} height={50} fill={colors.substrate} />
          <text x={210} y={baseY + 30} fill={colors.textMuted} fontSize={9} textAnchor="middle">
            Silicon Substrate
          </text>

          {/* Barrier layer */}
          <rect x={50} y={baseY - 10} width={320} height={10} fill={colors.barrier} opacity={0.7} />

          {/* Features with dynamic heights based on polish */}
          {features.map((feature, i) => {
            const initialHeight = feature.type === 'copper' ? 150 : 100;
            const removal = feature.type === 'copper' ? result.copperRemoval : result.oxideRemoval;
            const currentHeight = Math.max(5, initialHeight - removal) * scale / 1.5;

            // Dishing effect for copper
            const dishingAmount = feature.type === 'copper' && result.dishing > 0 ? result.dishing * 0.5 : 0;

            return (
              <g key={i}>
                <rect
                  x={feature.x}
                  y={baseY - 10 - currentHeight + dishingAmount}
                  width={feature.width}
                  height={currentHeight - dishingAmount}
                  fill={feature.type === 'copper' ? 'url(#copperGrad)' : 'url(#oxideGrad)'}
                  rx={1}
                />
                {/* Dishing visualization */}
                {feature.type === 'copper' && dishingAmount > 5 && (
                  <path
                    d={`M ${feature.x} ${baseY - 10 - currentHeight + dishingAmount}
                        Q ${feature.x + feature.width / 2} ${baseY - 10 - currentHeight + dishingAmount + 5}
                          ${feature.x + feature.width} ${baseY - 10 - currentHeight + dishingAmount}`}
                    fill="url(#copperGrad)"
                  />
                )}
              </g>
            );
          })}

          {/* Initial surface line (reference) */}
          <line
            x1={50}
            y1={baseY - 10 - 150 * scale / 1.5}
            x2={370}
            y2={baseY - 10 - 150 * scale / 1.5}
            stroke={colors.textMuted}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
          <text x={380} y={baseY - 10 - 150 * scale / 1.5 + 4} fill={colors.textMuted} fontSize={8}>
            Initial
          </text>

          {/* Target surface line */}
          <line
            x1={50}
            y1={baseY - 10 - 100 * scale / 1.5}
            x2={370}
            y2={baseY - 10 - 100 * scale / 1.5}
            stroke={colors.success}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
          <text x={380} y={baseY - 10 - 100 * scale / 1.5 + 4} fill={colors.success} fontSize={8}>
            Target
          </text>

          {/* Defect indicators */}
          {showDefectMode && result.isOverPolished && (
            <g>
              {result.dishing > 15 && (
                <g>
                  <circle cx={185} cy={baseY - 60} r={12} fill={colors.error} opacity={0.3} />
                  <text x={185} y={baseY - 56} fill={colors.error} fontSize={10} textAnchor="middle">D</text>
                  <text x={185} y={baseY - 40} fill={colors.error} fontSize={8} textAnchor="middle">Dishing</text>
                </g>
              )}
              {result.erosion > 10 && (
                <g>
                  <circle cx={285} cy={baseY - 60} r={12} fill={colors.warning} opacity={0.3} />
                  <text x={285} y={baseY - 56} fill={colors.warning} fontSize={10} textAnchor="middle">E</text>
                  <text x={285} y={baseY - 40} fill={colors.warning} fontSize={8} textAnchor="middle">Erosion</text>
                </g>
              )}
            </g>
          )}

          {/* Before/After comparison */}
          <g transform="translate(380, 140)">
            <text x={50} y={0} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Topography</text>

            {/* Before */}
            <rect x={0} y={15} width={100} height={35} fill="rgba(0,0,0,0.3)" rx={4} />
            <text x={50} y={30} fill={colors.textMuted} fontSize={8} textAnchor="middle">Before CMP</text>
            <rect x={10} y={38} width={30} height={8} fill={colors.copper} />
            <rect x={40} y={42} width={20} height={4} fill={colors.oxide} />
            <rect x={60} y={38} width={30} height={8} fill={colors.copper} />

            {/* After */}
            <rect x={0} y={55} width={100} height={35} fill="rgba(0,0,0,0.3)" rx={4} />
            <text x={50} y={70} fill={colors.textMuted} fontSize={8} textAnchor="middle">After CMP</text>
            <rect x={10} y={78} width={30} height={4} fill={colors.copper} />
            <rect x={40} y={78} width={20} height={4} fill={colors.oxide} />
            <rect x={60} y={78} width={30} height={4} fill={colors.copper} />
          </g>

          {/* Legend */}
          <g transform="translate(380, 240)">
            <rect x={5} y={5} width={12} height={12} fill={colors.copper} rx={2} />
            <text x={22} y={15} fill={colors.textSecondary} fontSize={9}>Copper</text>
            <rect x={55} y={5} width={12} height={12} fill={colors.oxide} rx={2} />
            <text x={72} y={15} fill={colors.textSecondary} fontSize={9}>Oxide</text>
          </g>

          {/* Metrics panel */}
          <rect x={20} y={320} width={180} height={90} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={30} y={340} fill={colors.textSecondary} fontSize={10}>CMP METRICS</text>

          <text x={30} y={358} fill={colors.textPrimary} fontSize={10}>
            Step Height: {result.currentStep.toFixed(0)} nm
          </text>
          <text x={30} y={373} fill={result.dishing < 10 ? colors.success : colors.error} fontSize={10}>
            Dishing: {result.dishing.toFixed(1)} nm
          </text>
          <text x={30} y={388} fill={result.erosion < 10 ? colors.success : colors.warning} fontSize={10}>
            Erosion: {result.erosion.toFixed(1)} nm
          </text>
          <text x={30} y={403} fill={colors.textMuted} fontSize={10}>
            Non-uniformity: {result.nonUniformity.toFixed(1)}%
          </text>

          {/* Quality indicator */}
          <rect x={220} y={320} width={140} height={90} fill="rgba(0,0,0,0.4)" rx={8} />
          <text x={290} y={340} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Process Quality</text>
          <rect x={230} y={355} width={120} height={10} fill="rgba(255,255,255,0.1)" rx={3} />
          <rect
            x={230}
            y={355}
            width={result.planarityScore * 1.2}
            height={10}
            fill={result.planarityScore > 70 ? colors.success : result.planarityScore > 40 ? colors.warning : colors.error}
            rx={3}
          />
          <text
            x={290}
            y={385}
            fill={result.isComplete ? colors.success : result.isOverPolished ? colors.error : colors.warning}
            fontSize={14}
            fontWeight="bold"
            textAnchor="middle"
          >
            {result.isComplete ? 'OPTIMAL' : result.isOverPolished ? 'OVER-POLISH' : 'IN PROGRESS'}
          </text>
          <text x={290} y={403} fill={colors.textMuted} fontSize={9} textAnchor="middle">
            Planarity: {result.planarityScore.toFixed(0)}%
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => {
                setPolishTime(0);
                setIsAnimating(true);
              }}
              disabled={isAnimating}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.textMuted : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Polishing...' : 'Start CMP'}
            </button>
            <button
              onClick={() => { setPolishTime(0); setIsAnimating(false); }}
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

  const renderControls = (showDefects: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Polish Time: {polishTime}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={polishTime}
          onChange={(e) => { setPolishTime(parseInt(e.target.value)); setIsAnimating(false); }}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Polish Pressure: {polishPressure}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={polishPressure}
          onChange={(e) => setPolishPressure(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showDefects && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Slurry Selectivity (Cu:Oxide): {slurrySelectivity}%
          </label>
          <input
            type="range"
            min="20"
            max="80"
            step="5"
            value={slurrySelectivity}
            onChange={(e) => setSlurrySelectivity(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
            <span>Cu slower</span>
            <span>Balanced</span>
            <span>Cu faster</span>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(236, 72, 153, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Goal: Remove copper overfill and create flat surface
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
          Watch for: Dishing (too much Cu removal), Erosion (oxide loss)
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
              CMP Planarization
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do chips "polish" between layers?
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
                Think of a layer cake: if you spread frosting unevenly, the next layer will be
                tilted. Chips have 15+ layers - without flattening each one, the whole structure
                would become impossible to pattern accurately.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                CMP (Chemical Mechanical Planarization) uses a polishing pad and chemical slurry
                to create atomically flat surfaces between layers.
              </p>
            </div>

            <div style={{
              background: 'rgba(236, 72, 153, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch how CMP removes the high spots and creates a flat surface!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The CMP Process:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              The wafer is pressed against a rotating pad while chemical slurry flows. The slurry
              contains abrasive particles and chemicals that selectively react with the surface.
              High spots experience more pressure and remove faster.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does CMP create a flat surface?
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
                    background: prediction === p.id ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore CMP Planarization</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Find the optimal polish time to achieve flatness
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
              <li>Run CMP to 100% and observe the final state</li>
              <li>Try to find the optimal stopping point (step = 0)</li>
              <li>Increase pressure and observe the removal rate</li>
              <li>Note the relationship between copper and oxide heights</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'selective';

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
              CMP removes high spots faster because they experience more pressure against the pad.
              The slurry chemistry also provides selectivity between different materials.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of CMP</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Preston Equation:</strong> The removal
                rate follows R = k x P x V, where P is pressure and V is velocity. High spots see
                more pressure, so they remove faster until the surface is flat.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chemical Component:</strong> The slurry
                contains chemicals that soften or oxidize the surface, making mechanical removal easier.
                Different chemicals target different materials.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Selectivity:</strong> Slurry chemistry
                can be tuned to remove copper faster than oxide, or vice versa. This helps control
                the endpoint and minimize defects.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Result:</strong> Nanometer-level flatness
                across a 300mm wafer, enabling precise lithography on subsequent layers.
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
              What happens with too much polishing?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Over-Polish Defects:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              If polishing continues past the optimal point, defects appear. "Dishing" occurs when
              soft copper polishes faster than surrounding oxide. "Erosion" happens when oxide in
              dense copper regions wears away. Both hurt chip performance.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens with excessive CMP?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Over-Polish Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Polish beyond optimal and observe dishing/erosion
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
              Past 70% polish time, dishing and erosion increase rapidly. These defects increase
              wire resistance (dishing) and can cause reliability failures (erosion thinning).
              Finding the optimal endpoint is critical!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'dishing';

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
              Over-polishing causes dishing (copper recesses) and erosion (oxide thinning).
              These defects increase resistance and create reliability problems. CMP endpoint
              detection is critical for production yield.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>CMP Defect Mechanisms</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Dishing:</strong> Copper is softer
                than oxide and polishes faster. Wide copper features "dish" inward as the softer
                material removes more under the same pressure.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Erosion:</strong> In areas with
                dense copper, the pad conforms to the copper surface and also attacks the
                surrounding oxide, thinning it excessively.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Control:</strong> Endpoint detection
                uses optical reflectivity or motor current changes to stop at the optimal point.
                Slurry chemistry and pad design also help minimize defects.
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
              CMP enables every multi-layer semiconductor device
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
              <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
                {testScore >= 8 ? 'You understand CMP planarization!' : 'Review the material and try again.'}
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
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>CMP Icon</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand CMP planarization</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>CMP combines chemical and mechanical action</li>
              <li>Preston equation: R = k x P x V</li>
              <li>Selectivity between materials via slurry chemistry</li>
              <li>Dishing and erosion defects from over-polish</li>
              <li>Endpoint detection is critical for yield</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(236, 72, 153, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Advanced CMP includes multi-step polishing with different slurries, zone-based pressure
              control for uniformity, and in-situ metrology for real-time endpoint detection.
              CMP consumables (slurry and pads) are a multi-billion dollar industry enabling
              continued chip scaling!
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

export default CMPPlanarizationRenderer;
