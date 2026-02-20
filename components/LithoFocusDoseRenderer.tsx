import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

type LFDPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface LithoFocusDoseRendererProps {
  gamePhase?: string; // Optional - for resume functionality
  onGameEvent?: (event: { eventType: string; gameType: string; details: Record<string, unknown> }) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  photoresist: '#fbbf24',
  exposed: '#7c3aed',
  silicon: '#475569',
  light: '#fcd34d',
  border: '#334155',
  primary: '#8b5cf6',
};

const realWorldApps = [
  {
    icon: '📱',
    title: 'Smartphone Chip Manufacturing',
    short: 'Billions of transistors per chip',
    tagline: 'Printing the future of mobile',
    description: 'Every smartphone processor is manufactured using lithography where focus and dose control determines feature quality. At 3nm process nodes, pattern placement must be accurate to fractions of a nanometer. The process window—the range of acceptable focus and dose—shrinks with each generation.',
    connection: 'The focus-dose relationship we explored directly determines chip yield. Too much dose causes pattern widening; too little leaves features undeveloped. Out-of-focus exposure blurs edges, increasing line edge roughness.',
    howItWorks: 'EUV lithography uses 13.5nm wavelength light focused through mirrors onto photoresist. Scanner focus is controlled to ±15nm accuracy. Dose meters measure exposure energy to 0.1% precision. Millions of chips are produced from each wafer.',
    stats: [
      { value: '3nm', label: 'Process node', icon: '⚡' },
      { value: '$150M', label: 'EUV scanner cost', icon: '📈' },
      { value: '95%+', label: 'Target yield', icon: '🚀' }
    ],
    examples: ['Apple A17 Pro', 'Qualcomm Snapdragon 8 Gen 3', 'Samsung Exynos 2400', 'MediaTek Dimensity 9300'],
    companies: ['ASML', 'TSMC', 'Samsung Foundry', 'Intel'],
    futureImpact: 'High-NA EUV lithography will enable 2nm and beyond, but will require even tighter focus control as the depth of focus shrinks.',
    color: '#3B82F6'
  },
  {
    icon: '🧠',
    title: 'AI Accelerator Production',
    short: 'Manufacturing intelligence',
    tagline: 'Lithography powers AI',
    description: 'AI chips like NVIDIA\'s H100 contain 80 billion transistors manufactured with cutting-edge lithography. The large die sizes make these chips extremely sensitive to focus and dose variations—any defect across the huge area can kill the chip.',
    connection: 'Large AI chips push lithography to its limits. The process window must be maintained across 800mm² of patterning. Focus and dose uniformity across the full exposure field directly impacts yield.',
    howItWorks: 'Multiple EUV exposures pattern the most critical layers. Process control monitors measure CD and edge roughness across the wafer. Advanced process control (APC) adjusts focus and dose in real-time to maintain the process window.',
    stats: [
      { value: '80B', label: 'Transistors', icon: '⚡' },
      { value: '814 mm²', label: 'Die size', icon: '📈' },
      { value: '$40,000', label: 'Chip price', icon: '🚀' }
    ],
    examples: ['NVIDIA H100/B100', 'Google TPU v5', 'AMD MI300X', 'Intel Gaudi 3'],
    companies: ['NVIDIA', 'TSMC', 'AMD', 'Google'],
    futureImpact: 'Chiplet architectures will enable even larger effective die sizes while managing lithography yield challenges through smaller individual chiplets.',
    color: '#8B5CF6'
  },
  {
    icon: '🔬',
    title: 'MEMS Sensor Fabrication',
    short: 'Microscopic machines',
    tagline: 'Lithography in three dimensions',
    description: 'MEMS accelerometers, gyroscopes, and microphones are manufactured using lithography with unique focus challenges. Multiple patterning steps on 3D structures require precise alignment and focus at different heights within the same device.',
    connection: 'MEMS lithography must maintain focus across topography—raised and recessed features on the wafer surface. Depth of focus becomes critical when patterning on non-planar surfaces.',
    howItWorks: 'MEMS devices are built up in layers with etching creating 3D structures. Lithography must focus accurately on top surfaces while ignoring recessed areas. Some processes use thick resists requiring extended depth of focus.',
    stats: [
      { value: '1-10 μm', label: 'Feature sizes', icon: '⚡' },
      { value: '100+ μm', label: 'Structure depth', icon: '📈' },
      { value: '$20B', label: 'MEMS market', icon: '🚀' }
    ],
    examples: ['iPhone accelerometers', 'Car airbag sensors', 'Digital microphones', 'Pressure sensors'],
    companies: ['Bosch', 'STMicroelectronics', 'TDK InvenSense', 'Analog Devices'],
    futureImpact: 'Advanced MEMS will combine sensing, processing, and communication on single chips, requiring hybrid lithography for mixed 2D/3D structures.',
    color: '#10B981'
  },
  {
    icon: '💾',
    title: 'Memory Chip Manufacturing',
    short: 'Storing the world\'s data',
    tagline: 'Density demands precision',
    description: 'DRAM and NAND flash memory push lithography density limits. Memory cells are repeated billions of times per chip, making pattern uniformity critical. Focus and dose variations cause cell-to-cell differences that impact storage reliability.',
    connection: 'Memory lithography requires extreme uniformity. Every cell must have identical dimensions for consistent electrical behavior. The process window must be maintained across billions of repetitions.',
    howItWorks: 'Memory uses the most aggressive lithography available at each generation. Multiple patterning (LELE, SADP) creates features smaller than the wavelength limit. 3D NAND stacks 200+ layers, each requiring precise focus.',
    stats: [
      { value: '200+ layers', label: '3D NAND height', icon: '⚡' },
      { value: '1Tb', label: 'Chip capacity', icon: '📈' },
      { value: '$130B', label: 'Memory market', icon: '🚀' }
    ],
    examples: ['Samsung 3D V-NAND', 'Micron DDR5 DRAM', 'SK Hynix HBM3', 'Kioxia BiCS flash'],
    companies: ['Samsung', 'SK Hynix', 'Micron', 'Kioxia'],
    futureImpact: 'Emerging memory technologies like MRAM and RRAM will require new lithography approaches for their unique material stacks.',
    color: '#F59E0B'
  }
];

const LithoFocusDoseRenderer: React.FC<LithoFocusDoseRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase order and labels
  const phaseOrder: LFDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<LFDPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore LER',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  // Internal phase state management
  const getInitialPhase = (): LFDPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as LFDPhase)) {
      return gamePhase as LFDPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<LFDPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as LFDPhase) && gamePhase !== phase) {
      setPhase(gamePhase as LFDPhase);
    }
  }, [gamePhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [focus, setFocus] = useState(30);
  const [dose, setDose] = useState(70);
  const [targetWidth, setTargetWidth] = useState(50);
  const [enableLER, setEnableLER] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);
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

  // Navigation function
  const goToPhase = useCallback((p: LFDPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);

    if (onGameEvent) {
      const idx = phaseOrder.indexOf(p);
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'litho_focus_dose',
        details: {
          phase: p,
          phaseLabel: phaseLabels[p],
          currentScreen: idx + 1,
          totalScreens: phaseOrder.length,
        },
      });
    }

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [onGameEvent, phaseOrder, phaseLabels]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Physics calculations for lithography
  const calculateLithoResult = useCallback(() => {
    const focusError = Math.abs(focus - 50) / 50;
    const doseError = Math.abs(dose - 50) / 50;
    const combinedError = Math.sqrt(focusError * focusError + doseError * doseError);
    const focusBlur = focusError * 20;
    const doseEffect = (dose - 50) / 5;
    const printedWidth = targetWidth + doseEffect + (focusBlur * (dose > 50 ? 1 : -1));
    const baseLER = 2;
    const lerFromFocus = focusError * 8;
    const lerFromDose = Math.abs(doseError) * 5;
    const totalLER = enableLER ? baseLER + lerFromFocus + lerFromDose + Math.random() * 2 : baseLER + lerFromFocus + lerFromDose;
    const widthError = Math.abs(printedWidth - targetWidth);
    const inSpec = widthError < 5 && totalLER < 6;
    const passesProcess = combinedError < 0.7;

    return {
      printedWidth: Math.max(10, Math.min(100, printedWidth)),
      targetWidth,
      widthError,
      ler: totalLER,
      focusError,
      doseError,
      combinedError,
      inSpec,
      passesProcess,
      quality: Math.max(0, 100 - (combinedError * 100) - (totalLER * 5)),
    };
  }, [focus, dose, targetWidth, enableLER]);

  const predictions = [
    { id: 'stamp', label: 'It prints perfectly like a stamp - the mask pattern copies exactly' },
    { id: 'window', label: 'There is a narrow "process window" - only certain focus/dose combinations work' },
    { id: 'dose_only', label: 'Only dose matters - brighter light always means sharper features' },
    { id: 'focus_only', label: 'Only focus matters - like adjusting a camera lens' },
  ];

  const twistPredictions = [
    { id: 'smooth', label: 'Line edges stay smooth regardless of process conditions' },
    { id: 'ler_focus', label: 'Line edge roughness increases mainly with defocus' },
    { id: 'ler_dose', label: 'Line edge roughness increases mainly with extreme doses' },
    { id: 'ler_both', label: 'Line edge roughness increases with both focus and dose errors' },
  ];

  const transferApplications = [
    {
      title: 'Smartphone Chip Manufacturing',
      description: 'Modern phone processors have billions of transistors with features as small as 3nm. Each layer requires precise focus-dose control.',
      question: 'Why do chip fabs spend billions on lithography equipment?',
      answer: 'Extreme precision is required: a 3nm feature with 1nm tolerance needs focus control to ~10nm and dose control to <1%. EUV scanners costing $150M+ achieve this through advanced optics and metrology.',
    },
    {
      title: 'Memory Chip Production',
      description: 'DRAM and NAND flash require uniform features across the entire wafer to ensure consistent bit storage.',
      question: 'How does focus-dose variation affect memory yield?',
      answer: 'Across a 300mm wafer, focus can vary by tens of nanometers due to wafer flatness. Fabs use focus-dose matrices on test wafers to map the process window, then optimize exposure settings region-by-region.',
    },
    {
      title: 'Photomask Making',
      description: 'The photomask itself is made using e-beam lithography, which has its own focus and dose requirements.',
      question: 'Why is mask quality so critical for chip lithography?',
      answer: 'Any defect on the mask is replicated on every chip. Masks are made with sub-nm precision and cost $100K-$1M each. A single particle or dose error during mask writing can ruin an entire production run.',
    },
    {
      title: 'Multi-Patterning Technology',
      description: 'To print features smaller than the wavelength of light, multiple exposures with different masks are used.',
      question: 'How does multi-patterning affect process window requirements?',
      answer: 'Each patterning step must align to previous layers within 1-2nm. The cumulative focus-dose variations multiply, so each individual step needs an even tighter process window than single-patterning.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the "process window" in lithography?',
      options: [
        { text: 'The physical window in the cleanroom', correct: false },
        { text: 'The range of focus and dose values that produce acceptable features', correct: true },
        { text: 'The time window for exposing the resist', correct: false },
        { text: 'The wavelength range of the light source', correct: false },
      ],
    },
    {
      question: 'What happens when the exposure dose is too high?',
      options: [
        { text: 'Features become narrower than intended', correct: false },
        { text: 'Features become wider than intended (overexposure)', correct: true },
        { text: 'The resist becomes stronger', correct: false },
        { text: 'Focus automatically compensates', correct: false },
      ],
    },
    {
      question: 'Defocus in lithography causes:',
      options: [
        { text: 'Sharper feature edges', correct: false },
        { text: 'Blurred aerial image and wider/variable features', correct: true },
        { text: 'Faster exposure times', correct: false },
        { text: 'Better resist adhesion', correct: false },
      ],
    },
    {
      question: 'Line Edge Roughness (LER) is problematic because:',
      options: [
        { text: 'It makes the chip look ugly under a microscope', correct: false },
        { text: 'It causes random variations in transistor performance', correct: true },
        { text: 'It increases the weight of the chip', correct: false },
        { text: 'It only affects optical properties', correct: false },
      ],
    },
    {
      question: 'The focus-dose matrix in lithography is:',
      options: [
        { text: 'A mathematical equation for light intensity', correct: false },
        { text: 'A test pattern that maps acceptable process conditions', correct: true },
        { text: 'The alignment grid for the wafer', correct: false },
        { text: 'A quality control document', correct: false },
      ],
    },
    {
      question: 'Why do smaller features require tighter process windows?',
      options: [
        { text: 'Smaller features need less light', correct: false },
        { text: 'The relative error becomes larger as features shrink', correct: true },
        { text: 'Larger features are harder to make', correct: false },
        { text: 'Process windows expand with smaller features', correct: false },
      ],
    },
    {
      question: 'Photoresist exposure follows which relationship?',
      options: [
        { text: 'Linear - double dose means double feature size', correct: false },
        { text: 'Threshold-based - resist switches sharply at critical dose', correct: true },
        { text: 'Exponential - dose has minimal effect', correct: false },
        { text: 'Random - dose effects are unpredictable', correct: false },
      ],
    },
    {
      question: 'The depth of focus (DOF) in lithography is:',
      options: [
        { text: 'The thickness of the photoresist', correct: false },
        { text: 'The range of focus positions that produce acceptable imaging', correct: true },
        { text: 'The distance from lens to wafer', correct: false },
        { text: 'The wavelength of the exposure light', correct: false },
      ],
    },
    {
      question: 'What is the relationship between numerical aperture (NA) and DOF?',
      options: [
        { text: 'Higher NA increases DOF', correct: false },
        { text: 'Higher NA decreases DOF (trade-off with resolution)', correct: true },
        { text: 'NA and DOF are unrelated', correct: false },
        { text: 'DOF is always constant regardless of NA', correct: false },
      ],
    },
    {
      question: 'In a focus-dose ellipse diagram, the center represents:',
      options: [
        { text: 'Maximum exposure energy', correct: false },
        { text: 'The optimal process conditions (best focus and dose)', correct: true },
        { text: 'Zero exposure', correct: false },
        { text: 'The edge of the wafer', correct: false },
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
  };

  // Progress bar rendering
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div className="navigation-bar" style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div className="navigation-dots" style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                aria-label={phaseLabels[p]}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px',
                  border: 'none',
                  padding: 0
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom bar rendering
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div className="navigation-bar" style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
          onClick={handleBack}
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
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.primary}30` : 'none',
            minHeight: '44px'
          }}
          onClick={handleNext}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = (interactive: boolean, showLER: boolean = false) => {
    const width = 500;
    const height = 400;
    const result = calculateLithoResult();

    const generateLERPoints = (baseX: number, baseWidth: number, ler: number, yStart: number, yEnd: number) => {
      const points: string[] = [];
      const numPoints = 20;
      for (let i = 0; i <= numPoints; i++) {
        const y = yStart + (i * (yEnd - yStart)) / numPoints;
        const noise = showLER && enableLER ? (Math.sin(i * 3) + Math.random() - 0.5) * ler * 0.5 : 0;
        points.push(`${baseX + noise},${y}`);
      }
      return points.join(' ');
    };

    const mapSize = 120;
    const mapX = 20;
    const mapY = 20;
    const gridN = 6; // 6x6 grid for performance
    const cellSize = mapSize / gridN;

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
            {/* Premium lab background gradient */}
            <linearGradient id="lfdLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Light source housing - premium metal gradient */}
            <linearGradient id="lfdLightSourceMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Light source emitter glow */}
            <radialGradient id="lfdEmitterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Premium optical lens gradient - glass with depth */}
            <linearGradient id="lfdLensGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
            </linearGradient>

            {/* Lens rim - metallic edge */}
            <linearGradient id="lfdLensRim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="25%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a5b4fc" />
              <stop offset="75%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            {/* Light beam gradient - focused exposure */}
            <linearGradient id="lfdLightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#fde68a" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>

            {/* Focused light cone - radial intensity */}
            <radialGradient id="lfdFocusedBeam" cx="50%" cy="100%" r="80%" fx="50%" fy="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#fde68a" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#fcd34d" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </radialGradient>

            {/* Photomask chrome pattern */}
            <linearGradient id="lfdChromeMask" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="20%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Photoresist layer gradient */}
            <linearGradient id="lfdPhotoresist" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#facc15" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#eab308" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.8" />
            </linearGradient>

            {/* Exposed resist - developed region */}
            <linearGradient id="lfdExposedResist" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#6d28d9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.9" />
            </linearGradient>

            {/* Silicon wafer substrate */}
            <linearGradient id="lfdSiliconWafer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Process window map - success region */}
            <radialGradient id="lfdProcessWindow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
            </radialGradient>

            {/* Metrics panel background */}
            <linearGradient id="lfdMetricsPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Glow filter for light source */}
            <filter id="lfdEmitterBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for exposed regions */}
            <filter id="lfdExposureGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Lens refraction glow */}
            <filter id="lfdLensGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Defocus blur filter - dynamic based on focus error */}
            <filter id="lfdDefocusBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={result.focusError * 4} />
            </filter>

            {/* Current position marker glow */}
            <filter id="lfdMarkerGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Photomask pattern with chrome absorber */}
            <pattern id="lfdMaskPattern" x="0" y="0" width="16" height="20" patternUnits="userSpaceOnUse">
              <rect width="8" height="20" fill="url(#lfdChromeMask)" />
              <rect x="8" width="8" height="20" fill="transparent" />
            </pattern>

            {/* Quality score gradient - success */}
            <linearGradient id="lfdQualitySuccess" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Quality score gradient - warning */}
            <linearGradient id="lfdQualityWarning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Quality score gradient - error */}
            <linearGradient id="lfdQualityError" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Premium background */}
          <rect width={width} height={height} fill="url(#lfdLabBg)" />

          {/* Subtle grid pattern for lab feel - sparse for performance */}
          <g opacity="0.1">
            {Array.from({ length: 6 }, (_, i) => (
              <line key={`vg${i}`} x1={(i + 1) * 80} y1="0" x2={(i + 1) * 80} y2={height} stroke="#64748b" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line key={`hg${i}`} x1="0" y1={(i + 1) * 80} x2={width} y2={(i + 1) * 80} stroke="#64748b" strokeWidth="0.5" />
            ))}
          </g>

          {/* Focus-Dose Process Window Map */}
          <g>
            <text x={mapX + mapSize / 2} y={mapY - 8} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="600">Focus-Dose Map</text>

            {/* Map background */}
            <rect x={mapX - 2} y={mapY - 2} width={mapSize + 4} height={mapSize + 4} fill="#0f172a" rx={4} stroke="#334155" strokeWidth="1" />

            {/* Process window cells - 6x6 grid for performance */}
            {Array.from({ length: gridN }, (_, i) =>
              Array.from({ length: gridN }, (_, j) => {
                const cellFocus = (i + 0.5) * (100 / gridN);
                const cellDose = (j + 0.5) * (100 / gridN);
                const cellFocusErr = Math.abs(cellFocus - 50) / 50;
                const cellDoseErr = Math.abs(cellDose - 50) / 50;
                const cellErr = Math.sqrt(cellFocusErr * cellFocusErr + cellDoseErr * cellDoseErr);
                const inWindow = cellErr < 0.7;
                return (
                  <rect
                    key={`cell${i}${j}`}
                    x={mapX + i * cellSize}
                    y={mapY + j * cellSize}
                    width={cellSize - 1}
                    height={cellSize - 1}
                    fill={inWindow ? colors.success : colors.error}
                    opacity={0.25 + (1 - cellErr) * 0.55}
                    rx={1}
                  />
                );
              })
            )}

            {/* Current position marker with glow */}
            <circle
              cx={mapX + (focus / 100) * mapSize}
              cy={mapY + (dose / 100) * mapSize}
              r={7}
              fill={result.inSpec ? colors.success : colors.error}
              filter="url(#lfdMarkerGlow)"
              opacity="0.5"
            />
            <circle
              cx={mapX + (focus / 100) * mapSize}
              cy={mapY + (dose / 100) * mapSize}
              r={5}
              fill={result.inSpec ? colors.success : colors.error}
              stroke="white"
              strokeWidth={2}
            />

            {/* Axis labels */}
            <text x={mapX + mapSize / 2} y={mapY + mapSize + 14} fill={colors.textMuted} fontSize={11} textAnchor="middle">Focus</text>
            <text x={mapX - 10} y={mapY + mapSize / 2} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform={`rotate(-90, ${mapX - 10}, ${mapY + mapSize / 2})`}>Dose</text>
          </g>

          {/* Premium Light Source Assembly */}
          <g>
            {/* Light source housing */}
            <rect x={245} y={22} width={110} height={38} fill="url(#lfdLightSourceMetal)" rx={6} />
            <rect x={247} y={24} width={106} height={34} fill="none" stroke="#475569" strokeWidth="1" rx={5} />

            {/* Emitter window */}
            <rect x={270} y={50} width={60} height={8} fill="#1e293b" rx={2} />
            <ellipse cx={300} cy={54} rx={25} ry={4} fill="url(#lfdEmitterGlow)" filter="url(#lfdEmitterBlur)" />

            {/* Light source label */}
            <text x={300} y={40} fill={colors.textPrimary} fontSize={11} textAnchor="middle" fontWeight="600">UV Light Source</text>

            {/* Intensity indicator */}
            <rect x={360} y={30} width={40} height={8} fill="#1e293b" rx={2} />
            <rect x={362} y={32} width={(dose / 100) * 36} height={4} fill={dose > 70 ? colors.warning : dose < 30 ? colors.error : colors.success} rx={1} />
          </g>

          {/* Photomask with chrome pattern */}
          <g>
            <rect x={255} y={75} width={90} height={18} fill="url(#lfdMaskPattern)" stroke="#4b5563" strokeWidth="1.5" rx={2} />
            <rect x={253} y={73} width={94} height={22} fill="none" stroke="#64748b" strokeWidth="1" rx={3} />
            <text x={300} y={108} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="500">Photomask</text>
          </g>

          {/* Premium Projection Lens System */}
          <g>
            {/* Outer lens housing */}
            <ellipse cx={300} cy={135} rx={45} ry={14} fill="url(#lfdLensRim)" opacity="0.8" />

            {/* Inner lens glass with depth effect */}
            <ellipse cx={300} cy={135} rx={38} ry={11} fill="url(#lfdLensGlass)" filter="url(#lfdLensGlow)" />

            {/* Lens surface highlight */}
            <ellipse cx={290} cy={132} rx={15} ry={4} fill="white" opacity="0.15" />

            {/* Lens center mark */}
            <circle cx={300} cy={135} r={3} fill="#60a5fa" opacity="0.6" />

            <text x={300} y={160} fill={colors.textMuted} fontSize={11} textAnchor="middle">Projection Lens (NA: 0.93)</text>
          </g>

          {/* Light Beam with focus visualization */}
          <g>
            {/* Upper beam cone (mask to lens) */}
            <polygon
              points="265,93 275,135 325,135 335,93"
              fill="url(#lfdLightBeam)"
              opacity={0.3 + (dose / 100) * 0.5}
            />

            {/* Lower beam cone (lens to wafer) - shows focus effect */}
            <polygon
              points={`${275 - result.focusError * 15},135 ${290 - result.focusError * 5},195 ${310 + result.focusError * 5},195 ${325 + result.focusError * 15},135`}
              fill="url(#lfdFocusedBeam)"
              opacity={0.4 + (dose / 100) * 0.4}
              filter={result.focusError > 0.25 ? 'url(#lfdDefocusBlur)' : undefined}
            />

            {/* Focal point indicator */}
            <ellipse
              cx={300}
              cy={195 + (focus - 50) * 0.5}
              rx={4 + result.focusError * 8}
              ry={2}
              fill="#fcd34d"
              opacity={0.8}
              filter="url(#lfdExposureGlow)"
            />
          </g>

          {/* Wafer Stack with Photoresist */}
          <g>
            {/* Silicon substrate */}
            <rect x={225} y={208} width={150} height={18} fill="url(#lfdSiliconWafer)" rx={2} />

            {/* Photoresist layer */}
            <rect x={225} y={195} width={150} height={13} fill="url(#lfdPhotoresist)" rx={2} />

            {/* Exposure region on resist (shows dose effect) */}
            <rect
              x={285 - (dose - 50) * 0.2}
              y={195}
              width={30 + (dose - 50) * 0.4}
              height={13}
              fill="url(#lfdExposedResist)"
              opacity={0.7 + (dose / 100) * 0.3}
              filter="url(#lfdExposureGlow)"
              rx={1}
            />

            {/* Wafer edge highlight */}
            <rect x={225} y={195} width={150} height={1} fill="white" opacity="0.1" />

            <text x={300} y={240} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="500">Photoresist on Silicon Wafer</text>
          </g>

          {/* Printed Feature Result with LER visualization */}
          {/* Printed Feature Profile (absolute coords, group was at translate(250,260)) */}
          <text x={300} y={255} fill={colors.textPrimary} fontSize={11} textAnchor="middle" fontWeight="600">Printed Feature Profile</text>
          {/* Silicon background */}
          <rect x={250} y={265} width={100} height={55} fill="url(#lfdSiliconWafer)" rx={3} />
          {/* Target width indicator */}
          <rect
            x={300 - targetWidth / 2}
            y={268}
            width={targetWidth}
            height={49}
            fill="none"
            stroke={colors.textMuted}
            strokeWidth={1}
            strokeDasharray="4,2"
            opacity="0.6"
          />
          {/* Printed feature with LER */}
          <polyline
            points={generateLERPoints(300 - result.printedWidth / 2, result.printedWidth, result.ler, 268, 317)}
            fill="none"
            stroke="url(#lfdExposedResist)"
            strokeWidth={2.5}
          />
          <polyline
            points={generateLERPoints(300 + result.printedWidth / 2, result.printedWidth, result.ler, 268, 317)}
            fill="none"
            stroke="url(#lfdExposedResist)"
            strokeWidth={2.5}
          />
          {/* Feature fill */}
          <rect
            x={300 - result.printedWidth / 2}
            y={268}
            width={result.printedWidth}
            height={49}
            fill="url(#lfdExposedResist)"
            opacity={0.5}
            filter="url(#lfdExposureGlow)"
          />
          {/* Width dimension annotations */}
          <line x1={300 - targetWidth / 2} y1={322} x2={300 + targetWidth / 2} y2={322} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="2,2" />
          <text x={300} y={336} fill={colors.textMuted} fontSize={11} textAnchor="middle">Target: {targetWidth}nm</text>

          {/* Premium Metrics Panel - single column to avoid overlap */}
          <g>
            <rect x={378} y={18} width={115} height={185} fill="url(#lfdMetricsPanel)" rx={10} stroke={colors.accent} strokeWidth="1.5" />

            {/* Panel header */}
            <rect x={378} y={18} width={115} height={24} fill={colors.accent} opacity="0.15" rx={10} />
            <text x={435} y={35} fill={colors.accent} fontSize={11} textAnchor="middle" fontWeight="700">METRICS</text>

            {/* Divider line */}
            <line x1={385} y1={45} x2={485} y2={45} stroke={colors.border} strokeWidth="1" />

            {/* Metrics content - single column, each on own line with 16px spacing */}
            <text x={388} y={61} fill={colors.textSecondary} fontSize={11}>Target:</text>
            <text x={446} y={61} fill={colors.textPrimary} fontSize={11} fontWeight="600">{targetWidth.toFixed(0)} nm</text>

            <text x={388} y={77} fill={colors.textSecondary} fontSize={11}>Printed:</text>
            <text x={450} y={77} fill={result.widthError < 5 ? colors.success : colors.error} fontSize={11} fontWeight="600">{result.printedWidth.toFixed(1)}</text>

            <text x={388} y={93} fill={colors.textSecondary} fontSize={11}>Error:</text>
            <text x={440} y={93} fill={result.widthError < 5 ? colors.success : colors.error} fontSize={11} fontWeight="600">{result.widthError.toFixed(1)} nm</text>

            <text x={388} y={109} fill={colors.textSecondary} fontSize={11}>LER:</text>
            <text x={418} y={109} fill={result.ler < 6 ? colors.success : colors.warning} fontSize={11} fontWeight="600">{result.ler.toFixed(1)} nm</text>

            {/* Divider */}
            <line x1={385} y1={119} x2={485} y2={119} stroke={colors.border} strokeWidth="1" opacity="0.5" />

            <text x={388} y={133} fill={colors.textMuted} fontSize={11}>F.err:</text>
            <text x={428} y={133} fill={colors.textMuted} fontSize={11} fontWeight="600">{(result.focusError * 100).toFixed(0)}%</text>

            <text x={388} y={149} fill={colors.textMuted} fontSize={11}>D.err:</text>
            <text x={428} y={149} fill={colors.textMuted} fontSize={11} fontWeight="600">{(result.doseError * 100).toFixed(0)}%</text>

            {/* Pass/Fail indicator */}
            <rect x={390} y={160} width={83} height={24} fill={result.inSpec ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} rx={6} />
            <text x={431} y={176} fill={result.inSpec ? colors.success : colors.error} fontSize={13} textAnchor="middle" fontWeight="800">{result.inSpec ? 'PASS' : 'FAIL'}</text>
          </g>

          {/* Quality Score Bar */}
          <g>
            <rect x={378} y={340} width={115} height={45} fill="url(#lfdMetricsPanel)" rx={8} stroke={colors.border} strokeWidth="1" />
            <text x={435} y={357} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="600">Quality Score</text>

            {/* Score bar background */}
            <rect x={388} y={363} width={95} height={12} fill="rgba(255,255,255,0.08)" rx={3} />

            {/* Score bar fill */}
            <rect
              x={388}
              y={363}
              width={Math.max(0, result.quality) * 0.95}
              height={12}
              fill={result.quality > 70 ? 'url(#lfdQualitySuccess)' : result.quality > 40 ? 'url(#lfdQualityWarning)' : 'url(#lfdQualityError)'}
              rx={3}
            />

            {/* Score percentage */}
            <text x={435} y={373} fill={colors.textPrimary} fontSize={11} textAnchor="middle" fontWeight="700">{Math.max(0, result.quality).toFixed(0)}%</text>
          </g>

          {/* Axis labels for process window chart */}
          <text x={250} y={395} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Focus Offset →</text>
          <text x={10} y={200} fill={colors.textSecondary} fontSize={11} textAnchor="middle" transform="rotate(-90, 10, 200)">Dose ↕</text>

          {/* Before/After comparison display */}
          <rect x={10} y={340} width={230} height={50} fill="rgba(0,0,0,0.3)" rx={4} />
          <text x={125} y={357} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="600">Process Status</text>
          <text x={70} y={377} fill={colors.success} fontSize={11} textAnchor="middle">Optimal: 50/50</text>
          <text x={170} y={377} fill={result.inSpec ? colors.success : colors.error} fontSize={11} textAnchor="middle">Current: {focus}/{dose}</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setFocus(50); setDose(50); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset to Optimal
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showLERControl: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Focus Position: {focus}% - Controls how sharp the projected image is on the wafer. When you increase focus error, the printed features become blurry. ({focus < 40 ? 'Under-focused' : focus > 60 ? 'Over-focused' : 'Optimal'})
        </label>
        <input type="range" min="0" max="100" step="2" value={focus} onChange={(e) => setFocus(parseInt(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Exposure Dose: {dose}% - Controls the light energy hitting the photoresist. Higher doses cause wider features, lower doses cause narrower features. ({dose < 40 ? 'Under-exposed' : dose > 60 ? 'Over-exposed' : 'Optimal'})
        </label>
        <input type="range" min="0" max="100" step="2" value={dose} onChange={(e) => setDose(parseInt(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Target Linewidth: {targetWidth} nm - The intended feature size. As features shrink, the process window becomes tighter.
        </label>
        <input type="range" min="20" max="100" step="5" value={targetWidth} onChange={(e) => setTargetWidth(parseInt(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }} />
      </div>
      {showLERControl && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 400 }}>
            <input type="checkbox" checked={enableLER} onChange={(e) => setEnableLER(e.target.checked)} style={{ width: '20px', height: '20px' }} />
            Enable Line Edge Roughness (LER) Simulation - When enabled, you can see how edge roughness increases with process errors.
          </label>
        </div>
      )}
      <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>Process Window: Focus within 30-70%, Dose within 30-70%</div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginTop: '4px', fontWeight: 400 }}>Combined Error = sqrt(FocusErr^2 + DoseErr^2) must be less than 0.7</div>
      </div>
    </div>
  );

  // Wrapper component
  const renderWrapper = (content: React.ReactNode, footer: React.ReactNode) => (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, transition: 'all 0.3s ease' }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '52px', paddingBottom: '16px', transition: 'all 0.3s ease' }}>
        {content}
      </div>
      {footer}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>Lithography Focus & Dose</h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>Is chip "printing" like a perfect stamp?</p>
        </div>
        {renderVisualization(true)}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
              Imagine projecting a tiny pattern onto a chip using light. It is like using a projector to show a slide, but the "screen" is coated with photosensitive material, and the pattern is nanometers small!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
              What happens when the projector is out of focus? What if the light is too bright or too dim?
            </p>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
              Adjust the focus and dose sliders to see how chip manufacturing depends on precision!
            </p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Start Predicting')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictProgress = prediction ? 1 : 0;
    return renderWrapper(
      <>
        {renderVisualization(false)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Lithography Process:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            Light passes through a patterned mask, through a lens system, and onto photoresist. Where light hits, the resist changes chemically. The focus determines sharpness, and the dose determines how much the resist is exposed.
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: colors.textPrimary, margin: 0, fontWeight: 700 }}>What determines whether the printed pattern is acceptable?</h3>
            <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>Progress: {predictProgress} / 1</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  minHeight: '44px',
                  fontWeight: 400
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>,
      renderBottomBar(true, !!prediction, 'Test My Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    const result = calculateLithoResult();
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore the Process Window</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Find the combinations of focus and dose that produce acceptable features</p>
        </div>
        {/* Side-by-side layout: SVG left, controls right */}

        <div style={{

          display: 'flex',

          flexDirection: isMobile ? 'column' : 'row',

          gap: isMobile ? '12px' : '20px',

          width: '100%',

          alignItems: isMobile ? 'center' : 'flex-start',

        }}>

          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>

            {renderVisualization(true)}

          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {renderControls()}

          </div>

        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.accent}` }}>
          <h4 style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>Observe what happens:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
            {result.inSpec
              ? 'The feature is within spec! Notice how both focus and dose are near optimal values.'
              : result.focusError > 0.3 && result.doseError > 0.3
                ? 'Both focus and dose are far from optimal. The combined error creates an unacceptable feature.'
                : result.focusError > 0.3
                  ? 'Focus is too far from optimal. Notice how the feature edges become blurry.'
                  : result.doseError > 0.3
                    ? 'Dose is too far from optimal. Notice how the feature width deviates from target.'
                    : 'Getting close! Keep adjusting to find the sweet spot.'}
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Start at optimal (50/50) then move focus to extremes</li>
            <li>Keep focus optimal, vary dose from 0 to 100</li>
            <li>Find all four corners of the process window</li>
            <li>Try smaller target linewidths - is the window the same?</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.success}` }}>
          <h4 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Real-World Connection:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
            Every smartphone chip with billions of transistors is manufactured using this exact process. At TSMC and Samsung fabs, engineers spend weeks optimizing the focus-dose window for each layer. A single nanometer of error can mean millions of defective chips!
          </p>
        </div>
      </>,
      renderBottomBar(true, true, 'Continue to Review')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'window';
    const userPredictionText = predictions.find(p => p.id === prediction)?.label || 'no prediction';
    return renderWrapper(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, marginBottom: '8px' }}>
            You predicted: "{userPredictionText}"
          </p>
          <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
            Lithography has a finite "process window" - an elliptical region in focus-dose space where features print acceptably. Outside this window, features blur, widen, narrow, or fail entirely.
          </p>
        </div>
        {/* Visual diagram for review phase */}
        <div style={{ padding: '16px' }}>
          <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px' }}>
            <defs>
              <radialGradient id="reviewProcessWindow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#059669" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
              </radialGradient>
            </defs>
            {/* Axis labels */}
            <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="700">Process Window Concept</text>
            <text x="200" y="190" fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="400">Focus</text>
            <text x="25" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="400" transform="rotate(-90, 25, 100)">Dose</text>
            {/* Grid */}
            <line x1="60" y1="50" x2="340" y2="50" stroke={colors.border} strokeWidth="1" />
            <line x1="60" y1="100" x2="340" y2="100" stroke={colors.border} strokeWidth="1" />
            <line x1="60" y1="150" x2="340" y2="150" stroke={colors.border} strokeWidth="1" />
            <line x1="100" y1="40" x2="100" y2="170" stroke={colors.border} strokeWidth="1" />
            <line x1="200" y1="40" x2="200" y2="170" stroke={colors.border} strokeWidth="1" />
            <line x1="300" y1="40" x2="300" y2="170" stroke={colors.border} strokeWidth="1" />
            {/* Process window ellipse */}
            <ellipse cx="200" cy="100" rx="80" ry="40" fill="url(#reviewProcessWindow)" stroke={colors.success} strokeWidth="2" />
            {/* Center point */}
            <circle cx="200" cy="100" r="6" fill={colors.success} />
            <text x="200" y="130" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="400">Optimal</text>
            {/* Labels */}
            <text x="320" y="105" fill={colors.error} fontSize="11" fontWeight="400">Fail Zone</text>
            <text x="80" y="105" fill={colors.error} fontSize="11" fontWeight="400">Fail Zone</text>
          </svg>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Physics of Lithography</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Focus Effect:</strong> Defocus blurs the aerial image (the light pattern at the wafer). This causes features to print with soft edges and incorrect dimensions.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Dose Effect:</strong> Photoresist has a threshold response. Too little dose leaves resist behind; too much removes extra resist. The result is features that are too narrow or too wide.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Process Window:</strong> The acceptable region forms an ellipse because focus and dose errors combine. Real fabs run extensive focus-dose matrices to characterize and center their process.</p>
            <p><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Scaling Challenge:</strong> As features shrink, the process window shrinks too. A 5nm error on a 100nm feature is 5%, but on a 10nm feature it is 50%!</p>
          </div>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.accent}` }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Key Formula:</h4>
          <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, textAlign: 'center', marginBottom: '8px' }}>
            Combined Error = sqrt(FocusError^2 + DoseError^2)
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, textAlign: 'center' }}>
            The relationship between focus and dose errors is proportional to the square root of their combined squares - this creates the elliptical process window shape.
          </p>
        </div>
      </>,
      renderBottomBar(true, true, 'Continue to Twist')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>The Twist</h2>
          <p style={{ color: colors.textSecondary, fontWeight: 400 }}>What about Line Edge Roughness (LER)?</p>
        </div>
        {renderVisualization(false, true)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The LER Challenge:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            Even when features print at the correct average width, the edges are not perfectly straight. This "Line Edge Roughness" (LER) causes random variations in transistor behavior. As features shrink, LER becomes a larger fraction of the linewidth!
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>What affects Line Edge Roughness most?</h3>
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
                  minHeight: '44px',
                  fontWeight: 400
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>,
      renderBottomBar(true, !!twistPrediction, 'Test My Prediction')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Explore Line Edge Roughness</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Enable LER and observe how process conditions affect edge quality</p>
        </div>
        {renderVisualization(true, true)}
        {renderControls(true)}
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            LER increases with both defocus and extreme doses. The roughness has both systematic (from aerial image blur) and random (from resist chemistry) components. Modern processes aim for LER below 2-3nm on critical features!
          </p>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.success}` }}>
          <h4 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Real-World Connection:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
            LER is one of the biggest challenges in EUV lithography for 3nm and smaller nodes. Each transistor gate with rough edges performs slightly differently, reducing chip performance and increasing power consumption.
          </p>
        </div>
      </>,
      renderBottomBar(true, true, 'See the Explanation')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'ler_both';
    const userTwistPredictionText = twistPredictions.find(p => p.id === twistPrediction)?.label || 'no prediction';
    return renderWrapper(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, marginBottom: '8px' }}>
            You predicted: "{userTwistPredictionText}"
          </p>
          <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
            LER increases with both focus and dose errors! Defocus creates a blurry aerial image that prints with rough edges, while extreme doses cause the resist threshold to be crossed inconsistently.
          </p>
        </div>
        {/* Visual diagram for twist_review phase */}
        <div style={{ padding: '16px' }}>
          <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px' }}>
            <defs>
              <linearGradient id="twistLERGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Title */}
            <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="700">Line Edge Roughness vs Process Conditions</text>
            {/* Axis labels */}
            <text x="200" y="190" fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="400">Process Error (Focus + Dose)</text>
            <text x="25" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="400" transform="rotate(-90, 25, 100)">LER</text>
            {/* Axis lines */}
            <line x1="60" y1="160" x2="350" y2="160" stroke={colors.border} strokeWidth="2" />
            <line x1="60" y1="40" x2="60" y2="160" stroke={colors.border} strokeWidth="2" />
            {/* LER curve */}
            <path d="M 60 150 Q 150 140, 200 100 Q 250 60, 350 40" fill="none" stroke="url(#twistLERGradient)" strokeWidth="3" />
            {/* Good zone */}
            <rect x="60" y="130" width="80" height="30" fill="rgba(16, 185, 129, 0.2)" rx="4" />
            <text x="100" y="150" fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="400">Low LER</text>
            {/* Bad zone */}
            <rect x="270" y="40" width="80" height="30" fill="rgba(239, 68, 68, 0.2)" rx="4" />
            <text x="310" y="60" fill={colors.error} fontSize="11" textAnchor="middle" fontWeight="400">High LER</text>
            {/* Feature illustrations */}
            <rect x="80" y="80" width="30" height="40" fill={colors.exposed} opacity="0.8" rx="2" />
            <rect x="290" y="70" width="30" height="50" fill={colors.exposed} opacity="0.8" rx="2" />
            {/* Rough edges on bad feature */}
            <path d="M 290 70 Q 288 80, 291 90 Q 287 100, 290 110 Q 288 115, 290 120" fill="none" stroke={colors.exposed} strokeWidth="2" />
            <path d="M 320 70 Q 322 80, 319 90 Q 323 100, 320 110 Q 322 115, 320 120" fill="none" stroke={colors.exposed} strokeWidth="2" />
          </svg>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>LER in Modern Manufacturing</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Statistical Impact:</strong> LER causes transistor-to-transistor variation in threshold voltage, leakage, and performance. This limits how aggressively chips can be designed.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Shot Noise:</strong> At EUV wavelengths, fewer photons hit each feature, causing statistical "shot noise" that directly translates to LER. This is a fundamental limit!</p>
            <p><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Mitigation:</strong> Advanced resists, post-exposure smoothing, and design rules that tolerate LER help manage this challenge in sub-7nm manufacturing.</p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Apply This Knowledge')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Litho Focus Dose"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const [currentAppIndex, setCurrentAppIndex] = useState(0);
    const currentApp = realWorldApps[currentAppIndex];
    const appCompleted = transferCompleted.has(currentAppIndex);

    return renderWrapper(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>Real-World Applications</h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontWeight: 400 }}>Focus-dose control affects every modern electronic device</p>
          <p style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
            Progress: {transferCompleted.size} / {realWorldApps.length} applications
          </p>
          {/* App navigation dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            {realWorldApps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentAppIndex(i)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: transferCompleted.has(i) ? colors.success : i === currentAppIndex ? colors.accent : colors.border,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                aria-label={`Application ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px', border: appCompleted ? `2px solid ${colors.success}` : `1px solid ${colors.border}`, transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{currentApp.icon}</span>
            <div>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', margin: 0, fontWeight: 700 }}>{currentApp.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0, fontWeight: 400 }}>{currentApp.tagline}</p>
            </div>
          </div>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', fontWeight: 400 }}>{currentApp.description}</p>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>How Focus-Dose Control Applies:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>{currentApp.connection}</p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <h4 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Technical Details:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>{currentApp.howItWorks}</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {currentApp.stats.map((stat, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', flex: '1 1 100px', textAlign: 'center' }}>
                <div style={{ color: colors.accent, fontSize: '16px', fontWeight: 700 }}>{stat.value}</div>
                <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Industry Examples:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>
              {currentApp.examples.join(', ')} - all manufactured using the same lithography principles you just learned.
            </p>
          </div>

          {!appCompleted ? (
            <button
              onClick={() => setTransferCompleted(new Set([...transferCompleted, currentAppIndex]))}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                minHeight: '44px',
                transition: 'all 0.2s ease'
              }}
            >
              Got It
            </button>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ color: colors.success, fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>Understood!</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, fontWeight: 400 }}>{currentApp.futureImpact}</p>
            </div>
          )}
        </div>

        {/* Navigation between apps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 16px 16px' }}>
          <button
            onClick={() => setCurrentAppIndex(Math.max(0, currentAppIndex - 1))}
            disabled={currentAppIndex === 0}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: currentAppIndex === 0 ? colors.textMuted : colors.textSecondary,
              cursor: currentAppIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              minHeight: '44px',
              transition: 'all 0.2s ease'
            }}
          >
            Previous App
          </button>
          <button
            onClick={() => setCurrentAppIndex(Math.min(realWorldApps.length - 1, currentAppIndex + 1))}
            disabled={currentAppIndex === realWorldApps.length - 1}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: currentAppIndex === realWorldApps.length - 1 ? colors.textMuted : colors.textSecondary,
              cursor: currentAppIndex === realWorldApps.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              minHeight: '44px',
              transition: 'all 0.2s ease'
            }}
          >
            Next App
          </button>
        </div>
      </>,
      renderBottomBar(true, transferCompleted.size >= realWorldApps.length, 'Continue')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderWrapper(
        <>
          <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>{testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}</h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px' }}>{testScore >= 8 ? 'You understand lithography process windows!' : 'Review the material and try again.'}</p>
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
        </>,
        renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); goToPhase('hook'); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderWrapper(
      <>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 400, fontSize: '14px' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, lineHeight: 1.5 }}>
              In a semiconductor fab, a process engineer is optimizing the lithography step for a new 5nm chip design. The scanner uses EUV light at 13.5nm wavelength with a numerical aperture of 0.33. The process window must accommodate wafer flatness variations of plus or minus 30nm across the 300mm wafer. Answer the following questions about focus-dose control in lithography manufacturing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s ease' }} />
            ))}
          </div>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px', fontWeight: 400 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</p>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, margin: 0, fontWeight: 700 }}>{currentQ.question}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: 400, minHeight: '44px' }}>
                {opt.text}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
            Previous
          </button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', minHeight: '44px' }}>
              Continue
            </button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
              Submit Test
            </button>
          )}
        </div>
      </>,
      <div style={{ height: '1px' }} /> // Empty footer since we have inline navigation
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Semiconductor Icon</div>
          <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 400 }}>You understand lithography focus and dose control</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Process window concept (focus-dose ellipse)</li>
            <li>Defocus causes image blur and feature variation</li>
            <li>Dose controls resist threshold and feature width</li>
            <li>Line Edge Roughness (LER) and its sources</li>
            <li>Scaling challenges as features shrink</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
            Modern EUV lithography at 13.5nm wavelength enables 3nm and smaller features, but requires even tighter process control. Machine learning is now used to predict and correct for focus-dose variations across the wafer in real-time!
          </p>
        </div>
        {renderVisualization(true, true)}
      </>,
      renderBottomBar(true, true, 'Complete Game')
    );
  }

  return null;
};

export default LithoFocusDoseRenderer;
