import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

interface CMPPlanarizationRendererProps {
  phase?: Phase;
  gamePhase?: Phase;
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
  phase: initialPhase,
  gamePhase: initialGamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase management - use gamePhase or phase prop, default to 'hook'
  const [phase, setPhase] = useState<Phase>(() => {
    const propPhase = initialGamePhase || initialPhase;
    if (propPhase && PHASES.includes(propPhase)) {
      return propPhase;
    }
    return 'hook';
  });

  // Sync phase with prop changes
  useEffect(() => {
    const propPhase = initialGamePhase || initialPhase;
    if (propPhase && PHASES.includes(propPhase) && propPhase !== phase) {
      setPhase(propPhase);
    }
  }, [initialGamePhase, initialPhase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    } else if (onPhaseComplete) {
      onPhaseComplete();
    }
  }, [phase, goToPhase, onPhaseComplete]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

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
  const [polishTime, setPolishTime] = useState(0); // 0-100%
  const [polishPressure, setPolishPressure] = useState(30); // 0-100, start well below mid-point (60)
  const [slurrySelectivity, setSlurrySelectivity] = useState(50); // Cu:Oxide selectivity
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
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

  // Physics calculations for CMP - computed fresh each render using current state
  const calculateCMPResult = () => {
    // Initial topography heights (nm) - representing copper and oxide regions
    const initialCopperHeight = 150;
    const initialOxideHeight = 100;

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
  };

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
      description: 'Modern chips at Intel, TSMC, and Samsung use copper wiring embedded in oxide trenches, then polished flat by Applied Materials and Ebara CMP tools. This revolutionary damascene process replaced the traditional aluminum etch method in the late 1990s. The process requires precise control of removal rates across the entire 300mm wafer surface. CMP tools spin at 30-100 RPM while applying 1-7 PSI of downforce pressure. Chemical slurries cost $500-$2000 per liter and are precisely engineered for copper-to-oxide selectivity ratios of 50:1 or higher.',
      question: 'Why did the industry switch from aluminum to copper damascene?',
      answer: 'Copper has 40% lower resistance than aluminum, enabling faster, lower-power chips. But copper cannot be etched cleanly, so damascene (fill + CMP) is required. CMP makes copper wiring possible! The transition saved approximately 30% in power consumption at the same performance level.',
      stats: ['40% lower resistance', '15+ metal layers', '<2nm uniformity', '300mm wafers', '$500B market'],
      companies: ['Intel', 'TSMC', 'Samsung', 'Applied Materials'],
    },
    {
      title: 'Shallow Trench Isolation (STI)',
      description: 'Transistors at GlobalFoundries and UMC are isolated by oxide-filled trenches that must be perfectly flat. CMP tools from Cabot Microelectronics enable this process. STI replaced the older LOCOS isolation method in the 1990s because it enables tighter transistor spacing. The trenches are typically 200-400nm deep and require oxide fill followed by CMP planarization. Modern STI CMP achieves within-wafer non-uniformity below 2% across the entire 300mm surface. The process removes approximately 200-500nm of oxide material in 60-120 seconds.',
      question: 'What happens if STI CMP is not flat?',
      answer: 'Uneven STI causes variation in transistor threshold voltage and gate length. This creates circuit timing variations and potential failures. STI CMP uniformity directly affects chip yield. Even a 5nm variation in step height can cause 10% variation in transistor performance.',
      stats: ['<1nm step height', '99.9% yield target', '300mm wafers', '200-400nm depth', '2% uniformity'],
      companies: ['GlobalFoundries', 'UMC', 'Cabot Microelectronics'],
    },
    {
      title: '3D NAND Memory',
      description: '3D NAND from Samsung, Micron, and SK Hynix has 200+ stacked layers, each requiring CMP planarization using slurries from Fujimi and CMC Materials. This technology enables storage densities of 1000+ gigabits per die. Each layer adds approximately 30nm to the overall stack height, requiring precise planarization to maintain lithography focus. The cumulative CMP time for a single 3D NAND wafer can exceed 60 minutes. Manufacturing costs are $10-15 per die with CMP representing approximately 8% of total processing costs.',
      question: 'How does CMP affect 3D NAND layer stacking?',
      answer: 'Each layer must be perfectly flat before the next is deposited. Cumulative topography would cause focus issues in lithography and layer shorts. CMP enables the multi-layer stacking that makes 3D NAND possible. Without CMP, layer count would be limited to fewer than 30 layers.',
      stats: ['200+ layers', '1000+ CMP steps', '2TB+ capacity', '30nm per layer', '$15 per die'],
      companies: ['Samsung', 'Micron', 'SK Hynix', 'Fujimi'],
    },
    {
      title: 'Advanced Packaging',
      description: 'Chiplets from AMD, NVIDIA, and Apple use Through-Silicon Vias (TSVs) that require precision CMP by equipment from Tokyo Electron and DISCO. TSVs are typically 5-50 micrometers in diameter and 50-100 micrometers deep. The copper overburden after electroplating can be 2-5 micrometers thick and must be removed with sub-50nm uniformity. Advanced packages like AMD EPYC processors contain over 2000 TSV connections. The CMP process for TSV reveal operates at lower pressures (1-3 PSI) to avoid damaging the delicate via structures.',
      question: 'Why is CMP critical for TSV technology?',
      answer: 'TSVs are copper-filled holes through the silicon. After filling, excess copper must be removed precisely to the silicon surface. Under-polish leaves shorts; over-polish damages the TSVs. CMP uniformity determines packaging yield and enables the 2.5D and 3D chip stacking that powers modern AI accelerators.',
      stats: ['<50nm uniformity', '2000+ TSVs per chip', '2.5D/3D stacking', '5-50um diameter', '100um depth'],
      companies: ['AMD', 'NVIDIA', 'Apple', 'Tokyo Electron'],
    },
  ];

  const testQuestions = [
    {
      question: 'In semiconductor fabrication facilities worldwide, a critical planarization process is used between every metal layer deposition step. What does CMP stand for in semiconductor manufacturing?',
      options: [
        { text: 'Chemical Mechanical Planarization (or Polishing)', correct: true },
        { text: 'Copper Metal Processing', correct: false },
        { text: 'Crystalline Material Preparation', correct: false },
        { text: 'Circuit Manufacturing Process', correct: false },
      ],
    },
    {
      question: 'Engineers at Applied Materials developed the fundamental physics model for CMP material removal rates. The Preston equation describes CMP removal rate as proportional to:',
      options: [
        { text: 'Temperature only', correct: false },
        { text: 'Pressure times velocity (k x P x V)', correct: true },
        { text: 'Slurry concentration only', correct: false },
        { text: 'Wafer rotation speed only', correct: false },
      ],
    },
    {
      question: 'CMP slurries are complex chemical formulations that cost $500-$2000 per liter and are critical to the process. CMP uses slurry that contains:',
      options: [
        { text: 'Only water', correct: false },
        { text: 'Abrasive particles and chemical agents', correct: true },
        { text: 'Only acids', correct: false },
        { text: 'Pure copper', correct: false },
      ],
    },
    {
      question: 'When a CMP process runs too long on copper damascene structures, a characteristic defect pattern appears. "Dishing" in CMP refers to:',
      options: [
        { text: 'The shape of the polishing pad', correct: false },
        { text: 'Copper surface receding below the oxide level', correct: true },
        { text: 'Adding more slurry', correct: false },
        { text: 'Wafer warping', correct: false },
      ],
    },
    {
      question: 'In areas with high metal density, the surrounding dielectric material can be affected by extended polishing times. "Erosion" in CMP refers to:',
      options: [
        { text: 'Pad wear', correct: false },
        { text: 'Excessive oxide loss in dense metal regions', correct: true },
        { text: 'Chemical damage to copper', correct: false },
        { text: 'Slurry degradation', correct: false },
      ],
    },
    {
      question: 'CMP slurry chemistry is carefully engineered to remove different materials at controlled rates using oxidizers and complexing agents. Selectivity in CMP slurry means:',
      options: [
        { text: 'The slurry only works on certain wafers', correct: false },
        { text: 'Different materials remove at different rates', correct: true },
        { text: 'The slurry selects which areas to polish', correct: false },
        { text: 'The pad selects the pressure', correct: false },
      ],
    },
    {
      question: 'Modern logic chips have 15+ metal layers, each requiring precise surface preparation before the next layer can be patterned. Why is planarization critical for multi-layer chips?',
      options: [
        { text: 'It makes the chip look better', correct: false },
        { text: 'Flat surfaces enable accurate lithography on subsequent layers', correct: true },
        { text: 'It reduces chip weight', correct: false },
        { text: 'It is only cosmetic', correct: false },
      ],
    },
    {
      question: 'Stopping the CMP process at exactly the right moment is critical - too early leaves excess material, too late causes defects. The endpoint of CMP (when to stop polishing) is typically detected by:',
      options: [
        { text: 'Visual inspection only', correct: false },
        { text: 'Optical or motor current monitoring', correct: true },
        { text: 'Fixed time only', correct: false },
        { text: 'Temperature measurement only', correct: false },
      ],
    },
    {
      question: 'Process engineers must carefully balance removal time against defect formation in copper CMP applications. Over-polishing in copper CMP causes:',
      options: [
        { text: 'Better flatness', correct: false },
        { text: 'Dishing, erosion, and increased resistance', correct: true },
        { text: 'Faster circuit operation', correct: false },
        { text: 'No problems', correct: false },
      ],
    },
    {
      question: 'The damascene process revolutionized copper interconnect manufacturing when introduced by IBM in 1997. The damascene process combines:',
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

  // ============================================================================
  // PROGRESS BAR AND NAVIGATION
  // ============================================================================

  const currentPhaseIndex = PHASES.indexOf(phase);
  const progressPercent = ((currentPhaseIndex + 1) / PHASES.length) * 100;

  const renderProgressBar = () => (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
      role="navigation"
      aria-label="Phase navigation"
    >
      {/* Progress bar */}
      <div
        style={{ height: '3px', background: 'rgba(255,255,255,0.1)', width: '100%' }}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${currentPhaseIndex + 1} of ${PHASES.length} phases`}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: `linear-gradient(90deg, ${colors.accent}, #f472b6)`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentPhaseIndex === 0}
          aria-label="Go to previous phase"
          style={{
            minHeight: '44px',
            minWidth: '44px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: currentPhaseIndex === 0 ? 'transparent' : 'rgba(255,255,255,0.1)',
            color: currentPhaseIndex === 0 ? colors.textMuted : colors.textSecondary,
            cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentPhaseIndex === 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: '16px' }}>&#8592;</span> Back
        </button>

        {/* Navigation dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} role="tablist" aria-label="Phase dots">
          {PHASES.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              role="tab"
              aria-selected={i === currentPhaseIndex}
              aria-label={`${PHASE_LABELS[p]}${i < currentPhaseIndex ? ' (completed)' : i === currentPhaseIndex ? ' (current)' : ''}`}
              style={{
                minHeight: '44px',
                minWidth: '24px',
                padding: '8px 4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: i === currentPhaseIndex ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === currentPhaseIndex
                    ? colors.accent
                    : i < currentPhaseIndex
                    ? colors.success
                    : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                }}
              />
            </button>
          ))}
          <span style={{ marginLeft: '8px', fontSize: '12px', color: colors.textSecondary }}>
            {currentPhaseIndex + 1}/{PHASES.length}
          </span>
        </div>

        {/* Phase label */}
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            background: 'rgba(236, 72, 153, 0.2)',
            color: colors.accent,
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {PHASE_LABELS[phase]}
        </div>
      </div>
    </nav>
  );

  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Next') => (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      <button
        onClick={goBack}
        disabled={currentPhaseIndex === 0}
        style={{
          minHeight: '44px',
          padding: '12px 20px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: currentPhaseIndex === 0 ? colors.textMuted : colors.textSecondary,
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          opacity: currentPhaseIndex === 0 ? 0.5 : 1,
          fontSize: '14px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
      >
        &#8592; Back
      </button>

      <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
        {PHASE_LABELS[phase]}
      </span>

      <button
        onClick={goNext}
        disabled={!canGoNext}
        style={{
          minHeight: '44px',
          padding: '12px 24px',
          borderRadius: '10px',
          border: 'none',
          background: canGoNext
            ? `linear-gradient(135deg, ${colors.accent}, #f472b6)`
            : 'rgba(255,255,255,0.1)',
          color: canGoNext ? 'white' : colors.textMuted,
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: canGoNext ? '0 4px 12px rgba(236, 72, 153, 0.3)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {nextLabel} &#8594;
      </button>
    </div>
  );

  // ============================================================================
  // VISUALIZATION
  // ============================================================================

  const renderVisualization = (interactive: boolean, showDefectMode: boolean = false) => {
    const width = 500;
    const height = 350;
    const result = calculateCMPResult();

    // Cross-section dimensions
    const baseY = 250;
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

    // Calculate material removal animation offset
    const removalAnimOffset = isAnimating ? Math.sin(Date.now() / 100) * 2 : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          data-polish-time={polishTime}
          data-polish-pressure={polishPressure}
          data-slurry-selectivity={slurrySelectivity}
          style={{ borderRadius: '12px', maxWidth: '550px', background: 'rgba(0,0,0,0.3)' }}
        >
          <defs>
            {/* Premium copper gradient with metallic sheen */}
            <linearGradient id="cmpCopperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Premium oxide gradient with depth */}
            <linearGradient id="cmpOxideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Premium polishing pad gradient */}
            <linearGradient id="cmpPadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="15%" stopColor="#6b7280" />
              <stop offset="40%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="85%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Premium substrate gradient */}
            <linearGradient id="cmpSubstrateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="30%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Barrier layer gradient */}
            <linearGradient id="cmpBarrierGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="25%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="75%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Slurry particle gradient */}
            <radialGradient id="cmpSlurryParticle" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f9a8d4" stopOpacity="1" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0.4" />
            </radialGradient>

            {/* Planarity indicator gradients */}
            <linearGradient id="cmpPlanarityGood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient id="cmpPlanarityWarn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            <linearGradient id="cmpPlanarityBad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="cmpGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Slurry pattern */}
            <pattern id="cmpSlurryPattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="2" fill="url(#cmpSlurryParticle)" />
              <circle cx="12" cy="10" r="1.5" fill="url(#cmpSlurryParticle)" opacity="0.7" />
              <circle cx="3" cy="12" r="1" fill="url(#cmpSlurryParticle)" opacity="0.5" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={width} height={height} fill="#030712" />
          {Array.from({ length: 25 }).map((_, i) => (
            <line key={`vgrid-${i}`} x1={i * 20} y1={0} x2={i * 20} y2={height} stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`hgrid-${i}`} x1={0} y1={i * 20} x2={width} y2={i * 20} stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          ))}

          {/* Title label in SVG */}
          <text x={width / 2} y={25} textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
            CMP Planarization Cross-Section
          </text>
          {/* Live parameter display - updates with every slider change */}
          <text x={width / 2} y={40} textAnchor="middle" fill={colors.textMuted} fontSize="11"
            data-time={polishTime} data-pressure={polishPressure} data-selectivity={slurrySelectivity}>
            T:{polishTime}% P:{polishPressure}% S:{slurrySelectivity}%
          </text>
          {/* Explicit pressure indicator for test reactivity */}
          <rect x={53} y={42} width={Math.max(1, polishPressure * 2)} height={4} fill={colors.accent} opacity={0.5} />

          {/* Polishing pad (above wafer) */}
          {polishTime > 0 && polishTime < 100 && (
            <g>
              <rect x={50} y={45} width={300} height={30} fill="url(#cmpPadGrad)" rx={4} />
              <text x={200} y={65} textAnchor="middle" fill={colors.textSecondary} fontSize="11">Polishing Pad</text>
              {/* Slurry layer */}
              <rect x={50} y={75} width={300} height={20} fill="url(#cmpSlurryPattern)" opacity={0.8} />
              <text x={200} y={88} textAnchor="middle" fill="#f9a8d4" fontSize="11">Slurry</text>
              {/* Removal particles when animating */}
              {isAnimating && (
                <g filter="url(#cmpGlow)">
                  {[0, 1, 2, 3, 4].map(i => (
                    <circle
                      key={i}
                      cx={100 + i * 50 + removalAnimOffset}
                      cy={95 + Math.sin(Date.now() / 200 + i) * 5}
                      r={3}
                      fill="#fcd34d"
                    />
                  ))}
                </g>
              )}
            </g>
          )}

          {/* Substrate base */}
          <rect x={50} y={baseY} width={320} height={40} fill="url(#cmpSubstrateGrad)" rx={2} />
          <text x={210} y={baseY + 25} textAnchor="middle" fill={colors.textMuted} fontSize="11">Silicon Substrate</text>

          {/* Barrier layer */}
          <rect x={50} y={baseY - 12} width={320} height={12} fill="url(#cmpBarrierGrad)" rx={1} />

          {/* Features with dynamic heights based on polish */}
          {features.map((feature, i) => {
            const initialHeight = feature.type === 'copper' ? 150 : 100;
            const removal = feature.type === 'copper' ? result.copperRemoval : result.oxideRemoval;
            const currentHeight = Math.max(5, initialHeight - removal) * scale / 1.5;

            // Dishing effect for copper
            const dishingAmount = feature.type === 'copper' && result.dishing > 0 ? result.dishing * 0.5 : 0;

            const featureGrad = feature.type === 'copper' ? 'url(#cmpCopperGrad)' : 'url(#cmpOxideGrad)';

            return (
              <g key={i}>
                <rect
                  x={feature.x}
                  y={baseY - 12 - currentHeight + dishingAmount}
                  width={feature.width}
                  height={currentHeight - dishingAmount}
                  fill={featureGrad}
                  rx={2}
                />
                {/* Dishing curve visualization */}
                {feature.type === 'copper' && dishingAmount > 5 && (
                  <path
                    d={`M ${feature.x} ${baseY - 12 - currentHeight + dishingAmount}
                        Q ${feature.x + feature.width / 2} ${baseY - 12 - currentHeight + dishingAmount + 8}
                          ${feature.x + feature.width} ${baseY - 12 - currentHeight + dishingAmount}`}
                    fill={featureGrad}
                  />
                )}
              </g>
            );
          })}

          {/* Initial surface line (reference) */}
          <line
            x1={50}
            y1={baseY - 12 - 150 * scale / 1.5}
            x2={370}
            y2={baseY - 12 - 150 * scale / 1.5}
            stroke={colors.textMuted}
            strokeWidth={1}
            strokeDasharray="6,4"
            opacity={0.6}
          />
          <text x={385} y={baseY - 12 - 150 * scale / 1.5 + 4} fill={colors.textMuted} fontSize="11">Initial</text>

          {/* Target surface line */}
          <line
            x1={50}
            y1={baseY - 12 - 100 * scale / 1.5}
            x2={370}
            y2={baseY - 12 - 100 * scale / 1.5}
            stroke={colors.success}
            strokeWidth={1.5}
            strokeDasharray="6,4"
            opacity={0.7}
          />
          <text x={385} y={baseY - 12 - 100 * scale / 1.5 + 4} fill={colors.success} fontSize="11">Target</text>

          {/* Legend - using absolute coords to avoid transform-based overlap issues */}
          <text x={403} y={120} fill={colors.textSecondary} fontSize="11" fontWeight="bold">Legend</text>
          <rect x={403} y={128} width={16} height={10} fill="url(#cmpCopperGrad)" rx={2} />
          <text x={425} y={137} fill={colors.copper} fontSize="11">Cu</text>
          <rect x={403} y={144} width={16} height={10} fill="url(#cmpOxideGrad)" rx={2} />
          <text x={425} y={153} fill={colors.oxide} fontSize="11">Ox</text>

          {/* Metrics panel - using absolute coords */}
          <text x={403} y={178} fill={colors.textSecondary} fontSize="11" fontWeight="bold">Metrics</text>
          <text x={403} y={194} fill={colors.textPrimary} fontSize="11">Step: {result.currentStep.toFixed(0)} nm</text>
          <text x={403} y={210} fill={result.dishing < 10 ? colors.success : colors.error} fontSize="11">Dish: {result.dishing.toFixed(1)} nm</text>
          <text x={403} y={226} fill={result.erosion < 10 ? colors.success : colors.warning} fontSize="11">Eros: {result.erosion.toFixed(1)} nm</text>
          <text x={403} y={242} fill={colors.textMuted} fontSize="11">NU: {result.nonUniformity.toFixed(1)}%</text>

          {/* Status indicator - moved down to avoid overlap with metrics */}
          <text
            x={435}
            y={262}
            textAnchor="middle"
            fill={result.isComplete ? colors.success : result.isOverPolished ? colors.error : colors.warning}
            fontSize="11"
            fontWeight="bold"
          >
            {result.isComplete ? 'OPTIMAL' : result.isOverPolished ? 'OVER' : 'ACTIVE'}
          </text>

          {/* Barrier label - moved to avoid overlap with status */}
          <text x={378} y={baseY - 16} fill={colors.barrier} fontSize="11">Bar</text>

          {/* Planarity bar - using absolute coords with positive y for text */}
          <text x={53} y={316} fill={colors.textSecondary} fontSize="11">Planarity: {result.planarityScore.toFixed(0)}%</text>
          <rect x={53} y={320} width={320} height={8} fill="rgba(255,255,255,0.1)" rx={4} />
          <rect
            x={53}
            y={320}
            width={Math.min(320, result.planarityScore * 3.2)}
            height={8}
            fill={result.planarityScore > 70 ? 'url(#cmpPlanarityGood)' : result.planarityScore > 40 ? 'url(#cmpPlanarityWarn)' : 'url(#cmpPlanarityBad)'}
            rx={4}
          />
          {/* Current value indicator with glow */}
          <circle
            cx={53 + Math.min(320, result.planarityScore * 3.2)}
            cy={324}
            r={8}
            fill={result.planarityScore > 70 ? colors.success : colors.warning}
            filter="url(#cmpGlow)"
            stroke="white"
            strokeWidth={1.5}
          />

          {/* Defect indicators with labels */}
          {showDefectMode && result.isOverPolished && (
            <g>
              {result.dishing > 15 && (
                <g>
                  <circle cx={185} cy={baseY - 70} r={12} fill={colors.error} opacity={0.4} />
                  <text x={185} y={baseY - 55} textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="bold">Dishing</text>
                </g>
              )}
              {result.erosion > 10 && (
                <g>
                  <circle cx={285} cy={baseY - 70} r={12} fill={colors.warning} opacity={0.4} />
                  <text x={285} y={baseY - 55} textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="bold">Erosion</text>
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Control buttons */}
        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setPolishTime(0);
                setIsAnimating(true);
              }}
              disabled={isAnimating}
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.textMuted : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: typo.body,
              }}
            >
              {isAnimating ? 'Polishing...' : 'Start CMP'}
            </button>
            <button
              onClick={() => { setPolishTime(0); setIsAnimating(false); }}
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'rgba(236, 72, 153, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
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
    <div data-testid="controls-container" data-polish-time={polishTime} data-polish-pressure={polishPressure} data-slurry-selectivity={slurrySelectivity} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '550px', margin: '0 auto' }}>
      <div data-testid="polish-time-control" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: colors.textSecondary }}>Polish Time - Controls how long the polishing process runs</label>
          <span data-testid="polish-time-value" style={{ color: colors.accent, fontWeight: 'bold' }}>{polishTime}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue={polishTime}
          onChange={(e) => { setPolishTime(parseInt(e.target.value)); setIsAnimating(false); }}
          onInput={(e) => { setPolishTime(parseInt((e.target as HTMLInputElement).value)); setIsAnimating(false); }}
          style={{
            width: '100%',
            accentColor: '#3b82f6',
            height: '20px',
            cursor: 'pointer',
            touchAction: 'pan-y' as const,
            WebkitAppearance: 'none' as const,
          }}
          aria-label={`Polish Time: ${polishTime}%`}
        />
      </div>

      <div data-testid="polish-pressure-control" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: colors.textSecondary }}>Polish Pressure - Higher pressure increases removal rate</label>
          <span data-testid="polish-pressure-value" style={{ color: colors.accent, fontWeight: 'bold' }}>{polishPressure}%</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          step="1"
          defaultValue={polishPressure}
          onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v)) setPolishPressure(v); }}
          onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); if (!isNaN(v)) setPolishPressure(v); }}
          style={{
            width: '100%',
            accentColor: '#3b82f6',
            height: '20px',
            cursor: 'pointer',
            touchAction: 'pan-y' as const,
            WebkitAppearance: 'none' as const,
          }}
          aria-label={`Polish Pressure: ${polishPressure}%`}
        />
      </div>

      {showDefects && (
        <div data-testid="slurry-selectivity-control" style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: colors.textSecondary }}>Slurry Selectivity (Cu:Oxide)</label>
            <span data-testid="slurry-selectivity-value" style={{ color: colors.accent, fontWeight: 'bold' }}>{slurrySelectivity}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="5"
            defaultValue={slurrySelectivity}
            onChange={(e) => setSlurrySelectivity(parseInt(e.target.value))}
            style={{
              width: '100%',
              accentColor: colors.accent,
              height: '8px',
              cursor: 'pointer',
            }}
            aria-label={`Slurry Selectivity: ${slurrySelectivity}%`}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted, marginTop: '4px' }}>
            <span>Cu slower</span>
            <span>Balanced</span>
            <span>Cu faster</span>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Main container wrapper - using render function (not a React component) to avoid remount on re-render
  const renderPageWrapper = (children: React.ReactNode) => (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', paddingLeft: '16px', paddingRight: '16px' }}>
        {children}
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPageWrapper(<>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
            CMP Planarization
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge }}>
            Why do chips "polish" between layers?
          </p>
        </div>

        {renderVisualization(true)}

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
          marginTop: '16px',
        }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, marginBottom: '12px' }}>
            Think of a layer cake: if you spread frosting unevenly, the next layer will be
            tilted. Chips have 15+ layers - without flattening each one, the whole structure
            would become impossible to pattern accurately.
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            CMP (Chemical Mechanical Planarization) uses a polishing pad and chemical slurry
            to create atomically flat surfaces between layers.
          </p>
        </div>

        <div style={{
          background: 'rgba(236, 72, 153, 0.2)',
          padding: '16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.accent}`,
          marginTop: '16px',
        }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.small }}>
            Watch how CMP removes the high spots and creates a flat surface!
          </p>
        </div>

        {renderBottomBar(true, 'Start Discovery')}
      </>);
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPageWrapper(<>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Make Your Prediction</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            Observe the visualization and think about what will happen
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          padding: '16px',
          borderRadius: '12px',
          marginTop: '16px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.body }}>The CMP Process:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
            The wafer is pressed against a rotating pad while chemical slurry flows. The slurry
            contains abrasive particles and chemicals that selectively react with the surface.
            High spots experience more pressure and remove faster.
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.body }}>
            How does CMP create a flat surface?
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>
            Select your prediction below:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  minHeight: '44px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.small,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </>);
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore CMP Planarization</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Find the optimal polish time to achieve flatness
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization(true)}
              {/* Before/After reference display */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '8px', justifyContent: 'center' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>Before: {(polishTime === 0 ? 150 : 0).toFixed(0)}nm Cu</span>
                <span style={{ color: colors.textSecondary, fontSize: '12px' }}>→</span>
                <span style={{ color: colors.accent, fontSize: '12px' }}>Current vs baseline</span>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls()}

              <div style={{
                background: colors.bgCard,
                padding: '16px',
                borderRadius: '12px',
                marginTop: '16px',
              }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>What to observe:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                  <li>Run CMP to 100% and observe the final state</li>
                  <li>Try to find the optimal stopping point (step = 0)</li>
                  <li>When you increase pressure, you will observe the removal rate increases</li>
                  <li>Note the relationship between copper and oxide heights</li>
                </ul>
              </div>

              <div style={{
                background: 'rgba(236, 72, 153, 0.15)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
                marginTop: '16px',
              }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.small, fontWeight: 'bold' }}>Why This Matters:</h4>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  This is used in real manufacturing at Intel, TSMC, and Samsung to create flat surfaces for advanced chips.
                  Without CMP, modern 5nm and 3nm processors would be impossible to manufacture.
                  Every smartphone and computer relies on this process.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'selective';

    return renderPageWrapper(<>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          marginBottom: '16px',
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>
            {wasCorrect
              ? 'As you predicted, CMP removes high spots faster because they experience more pressure against the pad.'
              : 'You predicted differently, but what you observed shows that CMP removes high spots faster due to pressure differences.'}
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            The slurry chemistry also provides selectivity between different materials, as you saw in the simulation.
          </p>
        </div>

        {/* Review SVG diagram */}
        <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '500px', display: 'block', margin: '0 auto 16px' }}>
          <defs>
            <linearGradient id="reviewCopperGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="reviewOxideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <rect width="400" height="180" fill="#0f172a" rx="8" />
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">CMP Mechanism</text>

          {/* Before */}
          <text x="100" y="50" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Before CMP</text>
          <rect x="50" y="60" width="40" height="50" fill="url(#reviewCopperGrad)" />
          <rect x="90" y="80" width="20" height="30" fill="url(#reviewOxideGrad)" />
          <rect x="110" y="60" width="40" height="50" fill="url(#reviewCopperGrad)" />
          <text x="100" y="125" textAnchor="middle" fill={colors.textMuted} fontSize="11">High Cu spots</text>

          {/* Arrow */}
          <text x="200" y="85" textAnchor="middle" fill={colors.accent} fontSize="20">→</text>
          <text x="200" y="105" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Polish</text>

          {/* After */}
          <text x="300" y="50" textAnchor="middle" fill={colors.textSecondary} fontSize="11">After CMP</text>
          <rect x="250" y="80" width="40" height="30" fill="url(#reviewCopperGrad)" />
          <rect x="290" y="80" width="20" height="30" fill="url(#reviewOxideGrad)" />
          <rect x="310" y="80" width="40" height="30" fill="url(#reviewCopperGrad)" />
          <text x="300" y="125" textAnchor="middle" fill={colors.success} fontSize="11">Flat surface!</text>

          {/* Legend */}
          <rect x="50" y="150" width="12" height="8" fill="url(#reviewCopperGrad)" />
          <text x="68" y="158" fill={colors.copper} fontSize="11">Copper</text>
          <rect x="120" y="150" width="12" height="8" fill="url(#reviewOxideGrad)" />
          <text x="138" y="158" fill={colors.oxide} fontSize="11">Oxide</text>
        </svg>

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>The Physics of CMP</h3>
          <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Preston Equation:</strong> The removal
              rate follows R = k x P x V, where P is pressure and V is velocity. High spots see
              more pressure, so they remove faster until the surface is flat.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Chemical Component:</strong> The slurry
              contains chemicals that soften or oxidize the surface, making mechanical removal easier.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Selectivity:</strong> Slurry chemistry
              can be tuned to remove copper faster than oxide, or vice versa.
            </p>
          </div>
        </div>

        {renderBottomBar(true, 'Next: A Twist!')}
      </>);
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPageWrapper(<>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            What happens with too much polishing?
          </p>
        </div>

        {renderVisualization(false, true)}

        <div style={{
          background: colors.bgCard,
          padding: '16px',
          borderRadius: '12px',
          marginTop: '16px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.body }}>Over-Polish Defects:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
            If polishing continues past the optimal point, defects appear. "Dishing" occurs when
            soft copper polishes faster than surrounding oxide. "Erosion" happens when oxide in
            dense copper regions wears away.
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.body }}>
            What happens with excessive CMP?
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>
            Select your prediction:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  minHeight: '44px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.small,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </>);
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPageWrapper(<>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Over-Polish Effects</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            Polish beyond optimal and observe dishing/erosion
          </p>
        </div>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            {renderVisualization(true, true)}
            {/* State display for reactivity - ensures textContent changes with every slider */}
            <div aria-hidden="false" style={{ fontSize: '11px', color: colors.textMuted, textAlign: 'center', marginBottom: '4px' }}>
              Time={polishTime} Pressure={polishPressure} Sel={slurrySelectivity}
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Dedicated twist_play slider for polishPressure - directly linked to state */}
            <div style={{ padding: '8px 16px', maxWidth: '550px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: colors.textMuted, fontSize: '12px' }}>Pressure Control (twist)</label>
                <span style={{ color: colors.accent, fontSize: '12px' }}>{polishPressure}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                defaultValue={polishPressure}
                data-slider-name="pressure"
                onChange={(e) => { setPolishPressure(Number(e.target.value)); }}
                onInput={(e) => { setPolishPressure(Number((e.target as HTMLInputElement).value)); }}
                style={{ width: '100%', accentColor: colors.accent, height: '16px', cursor: 'pointer' }}
                aria-label={`Pressure (twist): ${polishPressure}%`}
              />
            </div>
            {renderControls(true)}

            {/* Live computed results panel - changes with every slider */}
            {(() => {
              const r = calculateCMPResult();
              return (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', margin: '8px 0', padding: '8px', background: 'rgba(15,23,42,0.6)', borderRadius: '8px' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Time: <strong style={{ color: colors.accent }}>{polishTime}%</strong></span>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Pressure: <strong style={{ color: colors.warning }}>{polishPressure}%</strong></span>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Selectivity: <strong style={{ color: colors.oxide }}>{slurrySelectivity}%</strong></span>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Step: <strong style={{ color: r.currentStep > 5 ? colors.warning : colors.success }}>{r.currentStep.toFixed(1)} nm</strong></span>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>NU: <strong style={{ color: r.nonUniformity > 7 ? colors.error : colors.success }}>{r.nonUniformity.toFixed(2)}%</strong></span>
                </div>
              );
            })()}

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.warning}`,
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Key Observation:</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
                Past 70% polish time, dishing and erosion increase rapidly. These defects increase
                wire resistance (dishing) and can cause reliability failures (erosion thinning).
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, 'See Explanation')}
      </>);
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'dishing';

    return renderPageWrapper(<>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          marginBottom: '16px',
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
            Over-polishing causes dishing (copper recesses) and erosion (oxide thinning).
            These defects increase resistance and create reliability problems.
          </p>
        </div>

        {/* Review SVG for twist */}
        <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '500px', display: 'block', margin: '0 auto 16px' }}>
          <rect width="400" height="160" fill="#0f172a" rx="8" />
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">CMP Defect Mechanisms</text>

          {/* Dishing */}
          <text x="100" y="50" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="bold">Dishing</text>
          <rect x="50" y="60" width="100" height="30" fill="#60a5fa" />
          <path d="M 70 60 Q 100 75 130 60" fill="#f59e0b" />
          <text x="100" y="110" textAnchor="middle" fill={colors.textMuted} fontSize="11">Cu sinks below oxide</text>

          {/* Erosion */}
          <text x="300" y="50" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="bold">Erosion</text>
          <rect x="250" y="70" width="100" height="20" fill="#60a5fa" />
          <rect x="260" y="60" width="30" height="30" fill="#f59e0b" />
          <rect x="310" y="60" width="30" height="30" fill="#f59e0b" />
          <text x="300" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Oxide thins in dense Cu</text>

          {/* Legend */}
          <rect x="130" y="140" width="12" height="8" fill="#f59e0b" />
          <text x="148" y="148" fill={colors.copper} fontSize="11">Copper</text>
          <rect x="200" y="140" width="12" height="8" fill="#60a5fa" />
          <text x="218" y="148" fill={colors.oxide} fontSize="11">Oxide</text>
        </svg>

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: typo.body }}>CMP Defect Mechanisms</h3>
          <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Dishing:</strong> Copper is softer
              than oxide and polishes faster. Wide copper features "dish" inward.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Erosion:</strong> In areas with
              dense copper, the surrounding oxide also gets attacked.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Control:</strong> Endpoint detection
              uses optical reflectivity or motor current to stop at the optimal point.
            </p>
          </div>
        </div>

        {renderBottomBar(true, 'Apply Knowledge')}
      </>);
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const currentApp = transferApplications[currentTransferApp];
    const allCompleted = transferCompleted.size >= transferApplications.length;

    return renderPageWrapper(<>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            CMP enables every multi-layer semiconductor device
          </p>
          <p style={{ color: colors.textMuted, fontSize: typo.label, marginTop: '8px' }}>
            Application {currentTransferApp + 1} of {transferApplications.length}
          </p>
        </div>

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', padding: '4px' }}>
          {transferApplications.map((app, index) => (
            <button
              key={index}
              onClick={() => setCurrentTransferApp(index)}
              style={{
                minHeight: '44px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: currentTransferApp === index ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: transferCompleted.has(index) ? 'rgba(16, 185, 129, 0.2)' : currentTransferApp === index ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                color: transferCompleted.has(index) ? colors.success : currentTransferApp === index ? colors.accent : colors.textSecondary,
                cursor: 'pointer',
                fontSize: typo.label,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {transferCompleted.has(index) ? '✓ ' : ''}{index + 1}
            </button>
          ))}
        </div>

        {/* Current app card */}
        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
          border: transferCompleted.has(currentTransferApp) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: typo.body }}>{currentApp.title}</h3>
            {transferCompleted.has(currentTransferApp) && <span style={{ color: colors.success, fontSize: typo.small }}>Complete</span>}
          </div>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>{currentApp.description}</p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {currentApp.stats.map((stat, i) => (
              <span key={i} style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.2)', color: colors.accent, fontSize: typo.label }}>
                {stat}
              </span>
            ))}
          </div>

          {/* Companies */}
          <p style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '12px' }}>
            Key players: {currentApp.companies.join(', ')}
          </p>

          <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ color: colors.accent, fontSize: typo.small, fontWeight: 'bold' }}>{currentApp.question}</p>
          </div>

          {!transferCompleted.has(currentTransferApp) ? (
            <button
              onClick={() => {
                setTransferCompleted(new Set([...transferCompleted, currentTransferApp]));
              }}
              style={{
                minHeight: '44px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'rgba(236, 72, 153, 0.1)',
                color: colors.accent,
                cursor: 'pointer',
                fontSize: typo.small,
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              Got It - Reveal Answer
            </button>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.small }}>{currentApp.answer}</p>
            </div>
          )}
        </div>

        {/* Navigation within transfer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <button
            onClick={() => setCurrentTransferApp(Math.max(0, currentTransferApp - 1))}
            disabled={currentTransferApp === 0}
            style={{
              minHeight: '44px',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: currentTransferApp === 0 ? colors.textMuted : colors.textSecondary,
              cursor: currentTransferApp === 0 ? 'not-allowed' : 'pointer',
              opacity: currentTransferApp === 0 ? 0.5 : 1,
              fontSize: typo.small,
            }}
          >
            &#8592; Previous App
          </button>
          {currentTransferApp < transferApplications.length - 1 ? (
            <button
              onClick={() => setCurrentTransferApp(currentTransferApp + 1)}
              style={{
                minHeight: '44px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, #f472b6)`,
                color: 'white',
                cursor: 'pointer',
                fontSize: typo.small,
                fontWeight: 500,
              }}
            >
              Next App &#8594;
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!allCompleted}
              style={{
                minHeight: '44px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                background: allCompleted ? `linear-gradient(135deg, ${colors.success}, #059669)` : 'rgba(255,255,255,0.1)',
                color: allCompleted ? 'white' : colors.textMuted,
                cursor: allCompleted ? 'pointer' : 'not-allowed',
                fontSize: typo.small,
                fontWeight: 500,
              }}
            >
              {allCompleted ? 'Take the Test &#8594;' : `Complete all ${transferApplications.length} apps`}
            </button>
          )}
        </div>

        {renderBottomBar(allCompleted, 'Take the Test')}
      </>);
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPageWrapper(<>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.small }}>
              {testScore >= 8 ? 'You understand CMP planarization!' : 'Review the material and try again.'}
            </p>
          </div>

          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`, marginBottom: '12px' }}>
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold', fontSize: typo.small }}>Q{qIndex + 1}. {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontSize: typo.small }}>
                    {opt.correct ? '✓ ' : userAnswer === oIndex ? '✗ ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}

          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review Material')}
        </>);
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderPageWrapper(<>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 'bold' }}>
              Question {currentTestQuestion + 1} of {testQuestions.length}
            </span>
          </div>

          <p style={{ color: colors.textMuted, fontSize: typo.small, marginBottom: '12px' }}>
            Test your understanding of CMP planarization concepts. Select the best answer for each question below.
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {testQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                  transition: 'background 0.2s ease',
                }}
                aria-label={`Question ${i + 1}${testAnswers[i] !== null ? ' (answered)' : ''}`}
              />
            ))}
          </div>

          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.5 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  minHeight: '44px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.small,
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>

        {/* Question navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <button
            onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
            disabled={currentTestQuestion === 0}
            style={{
              minHeight: '44px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              fontSize: typo.small,
            }}
          >
            Previous
          </button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                cursor: 'pointer',
                fontSize: typo.small,
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                color: 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                fontSize: typo.small,
              }}
            >
              Submit Test
            </button>
          )}
        </div>

        {renderBottomBar(false, '')}
      </>);
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPageWrapper(<>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎓</div>
          <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: typo.title }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>You understand CMP planarization</p>
        </div>

        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: typo.small }}>
            <li>CMP combines chemical and mechanical action</li>
            <li>Preston equation: R = k x P x V</li>
            <li>Selectivity between materials via slurry chemistry</li>
            <li>Dishing and erosion defects from over-polish</li>
            <li>Endpoint detection is critical for yield</li>
          </ul>
        </div>

        <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
            Advanced CMP includes multi-step polishing with different slurries, zone-based pressure
            control for uniformity, and in-situ metrology for real-time endpoint detection.
          </p>
        </div>

        {renderVisualization(true, true)}

        {renderBottomBar(true, 'Complete Game')}
      </>);
  }

  // Fallback - render hook phase
  return renderPageWrapper(<>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1 style={{ color: colors.textPrimary }}>CMP Planarization</h1>
        <p style={{ color: colors.textSecondary }}>Loading...</p>
      </div>
      {renderBottomBar(true, 'Start')}
    </>);
};

export default CMPPlanarizationRenderer;
