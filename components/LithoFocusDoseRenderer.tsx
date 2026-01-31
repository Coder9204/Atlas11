import React, { useState, useEffect, useCallback, useRef } from 'react';

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
    twist_play: 'LER Effect',
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
  const [focus, setFocus] = useState(50);
  const [dose, setDose] = useState(50);
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px'
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
      <div style={{
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
    const cellSize = mapSize / 10;

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
            <linearGradient id="lightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.light} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.light} stopOpacity="0.2" />
            </linearGradient>
            <pattern id="maskPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="10" height="20" fill="black" />
              <rect x="10" width="10" height="20" fill="transparent" />
            </pattern>
            <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={result.focusError * 3} />
            </filter>
          </defs>

          <text x={mapX + mapSize / 2} y={mapY - 5} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Focus-Dose Map</text>
          {Array.from({ length: 10 }, (_, i) =>
            Array.from({ length: 10 }, (_, j) => {
              const cellFocus = (i + 0.5) * 10;
              const cellDose = (j + 0.5) * 10;
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
                  opacity={0.3 + (1 - cellErr) * 0.5}
                />
              );
            })
          )}
          <circle
            cx={mapX + (focus / 100) * mapSize}
            cy={mapY + (dose / 100) * mapSize}
            r={5}
            fill={result.inSpec ? colors.success : colors.error}
            stroke="white"
            strokeWidth={2}
          />
          <text x={mapX} y={mapY + mapSize + 15} fill={colors.textMuted} fontSize={9}>Focus</text>
          <text x={mapX - 15} y={mapY + mapSize / 2} fill={colors.textMuted} fontSize={9} transform={`rotate(-90, ${mapX - 15}, ${mapY + mapSize / 2})`}>Dose</text>

          <rect x={250} y={30} width={100} height={30} fill="#4b5563" rx={4} />
          <text x={300} y={50} fill={colors.textPrimary} fontSize={10} textAnchor="middle">Light Source</text>

          <rect x={260} y={80} width={80} height={15} fill="url(#maskPattern)" stroke={colors.textMuted} />
          <text x={300} y={110} fill={colors.textSecondary} fontSize={9} textAnchor="middle">Photomask</text>

          <ellipse cx={300} cy={140} rx={35} ry={10} fill="rgba(100, 180, 255, 0.3)" stroke={colors.accent} strokeWidth={2} />
          <text x={300} y={160} fill={colors.textMuted} fontSize={8} textAnchor="middle">Projection Lens</text>

          <polygon
            points="265,95 270,140 290,200 310,200 330,140 335,95"
            fill="url(#lightBeam)"
            opacity={dose / 100}
            filter={result.focusError > 0.3 ? 'url(#blur)' : undefined}
          />

          <rect x={230} y={200} width={140} height={20} fill={colors.silicon} />
          <rect x={230} y={200} width={140} height={10} fill={colors.photoresist} opacity={0.8} />
          <text x={300} y={235} fill={colors.textSecondary} fontSize={9} textAnchor="middle">Photoresist on Silicon</text>

          <text x={300} y={260} fill={colors.textPrimary} fontSize={11} textAnchor="middle">Printed Feature:</text>

          <g transform="translate(250, 270)">
            <rect x={0} y={0} width={100} height={60} fill={colors.silicon} rx={2} />
            <rect
              x={50 - targetWidth / 2}
              y={5}
              width={targetWidth}
              height={50}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <polyline
              points={generateLERPoints(50 - result.printedWidth / 2, result.printedWidth, result.ler, 5, 55)}
              fill="none"
              stroke={colors.exposed}
              strokeWidth={2}
            />
            <polyline
              points={generateLERPoints(50 + result.printedWidth / 2, result.printedWidth, result.ler, 5, 55)}
              fill="none"
              stroke={colors.exposed}
              strokeWidth={2}
            />
            <rect
              x={50 - result.printedWidth / 2}
              y={5}
              width={result.printedWidth}
              height={50}
              fill={colors.exposed}
              opacity={0.4}
            />
          </g>

          <rect x={380} y={20} width={110} height={180} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={390} y={40} fill={colors.textSecondary} fontSize={10}>METRICS</text>
          <text x={390} y={60} fill={colors.textPrimary} fontSize={10}>Target: {targetWidth.toFixed(0)} nm</text>
          <text x={390} y={78} fill={colors.textPrimary} fontSize={10}>Printed: {result.printedWidth.toFixed(1)} nm</text>
          <text x={390} y={96} fill={result.widthError < 5 ? colors.success : colors.error} fontSize={10}>Error: {result.widthError.toFixed(1)} nm</text>
          <text x={390} y={114} fill={result.ler < 6 ? colors.success : colors.warning} fontSize={10}>LER: {result.ler.toFixed(1)} nm</text>
          <text x={390} y={140} fill={colors.textMuted} fontSize={9}>Focus err: {(result.focusError * 100).toFixed(0)}%</text>
          <text x={390} y={155} fill={colors.textMuted} fontSize={9}>Dose err: {(result.doseError * 100).toFixed(0)}%</text>
          <text x={390} y={180} fill={result.inSpec ? colors.success : colors.error} fontSize={12} fontWeight="bold">{result.inSpec ? 'PASS' : 'FAIL'}</text>

          <rect x={380} y={340} width={110} height={40} fill="rgba(0,0,0,0.4)" rx={4} />
          <text x={390} y={358} fill={colors.textSecondary} fontSize={9}>Quality Score</text>
          <rect x={390} y={365} width={90} height={8} fill="rgba(255,255,255,0.1)" rx={2} />
          <rect x={390} y={365} width={Math.max(0, result.quality) * 0.9} height={8} fill={result.quality > 70 ? colors.success : result.quality > 40 ? colors.warning : colors.error} rx={2} />
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
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Focus Position: {focus}% ({focus < 40 ? 'Under-focused' : focus > 60 ? 'Over-focused' : 'Optimal'})
        </label>
        <input type="range" min="0" max="100" step="2" value={focus} onChange={(e) => setFocus(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Exposure Dose: {dose}% ({dose < 40 ? 'Under-exposed' : dose > 60 ? 'Over-exposed' : 'Optimal'})
        </label>
        <input type="range" min="0" max="100" step="2" value={dose} onChange={(e) => setDose(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Target Linewidth: {targetWidth} nm
        </label>
        <input type="range" min="20" max="100" step="5" value={targetWidth} onChange={(e) => setTargetWidth(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      {showLERControl && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={enableLER} onChange={(e) => setEnableLER(e.target.checked)} style={{ width: '20px', height: '20px' }} />
            Enable Line Edge Roughness (LER) Simulation
          </label>
        </div>
      )}
      <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Process Window: Focus within 30-70%, Dose within 30-70%</div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>Combined Error = sqrt(FocusErr^2 + DoseErr^2) must be less than 0.7</div>
      </div>
    </div>
  );

  // Wrapper component
  const renderWrapper = (content: React.ReactNode, footer: React.ReactNode) => (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>Lithography Focus & Dose</h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>Is chip "printing" like a perfect stamp?</p>
        </div>
        {renderVisualization(true)}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
              Imagine projecting a tiny pattern onto a chip using light. It is like using a projector to show a slide, but the "screen" is coated with photosensitive material, and the pattern is nanometers small!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              What happens when the projector is out of focus? What if the light is too bright or too dim?
            </p>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Adjust the focus and dose sliders to see how chip manufacturing depends on precision!
            </p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Make a Prediction')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderWrapper(
      <>
        {renderVisualization(false)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Lithography Process:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Light passes through a patterned mask, through a lens system, and onto photoresist. Where light hits, the resist changes chemically. The focus determines sharpness, and the dose determines how much the resist is exposed.
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>What determines whether the printed pattern is acceptable?</h3>
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
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Process Window</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Find the combinations of focus and dose that produce acceptable features</p>
        </div>
        {renderVisualization(true)}
        {renderControls()}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Start at optimal (50/50) then move focus to extremes</li>
            <li>Keep focus optimal, vary dose from 0 to 100</li>
            <li>Find all four corners of the process window</li>
            <li>Try smaller target linewidths - is the window the same?</li>
          </ul>
        </div>
      </>,
      renderBottomBar(true, true, 'Continue to Review')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'window';
    return renderWrapper(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textPrimary }}>
            Lithography has a finite "process window" - an elliptical region in focus-dose space where features print acceptably. Outside this window, features blur, widen, narrow, or fail entirely.
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Lithography</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Focus Effect:</strong> Defocus blurs the aerial image (the light pattern at the wafer). This causes features to print with soft edges and incorrect dimensions.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Dose Effect:</strong> Photoresist has a threshold response. Too little dose leaves resist behind; too much removes extra resist. The result is features that are too narrow or too wide.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Process Window:</strong> The acceptable region forms an ellipse because focus and dose errors combine. Real fabs run extensive focus-dose matrices to characterize and center their process.</p>
            <p><strong style={{ color: colors.textPrimary }}>Scaling Challenge:</strong> As features shrink, the process window shrinks too. A 5nm error on a 100nm feature is 5%, but on a 10nm feature it is 50%!</p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Next: A Twist!')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary }}>What about Line Edge Roughness (LER)?</p>
        </div>
        {renderVisualization(false, true)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The LER Challenge:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Even when features print at the correct average width, the edges are not perfectly straight. This "Line Edge Roughness" (LER) causes random variations in transistor behavior. As features shrink, LER becomes a larger fraction of the linewidth!
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>What affects Line Edge Roughness most?</h3>
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
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Line Edge Roughness</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Enable LER and observe how process conditions affect edge quality</p>
        </div>
        {renderVisualization(true, true)}
        {renderControls(true)}
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            LER increases with both defocus and extreme doses. The roughness has both systematic (from aerial image blur) and random (from resist chemistry) components. Modern processes aim for LER below 2-3nm on critical features!
          </p>
        </div>
      </>,
      renderBottomBar(true, true, 'See the Explanation')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'ler_both';
    return renderWrapper(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textPrimary }}>
            LER increases with both focus and dose errors! Defocus creates a blurry aerial image that prints with rough edges, while extreme doses cause the resist threshold to be crossed inconsistently.
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>LER in Modern Manufacturing</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Statistical Impact:</strong> LER causes transistor-to-transistor variation in threshold voltage, leakage, and performance. This limits how aggressively chips can be designed.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Shot Noise:</strong> At EUV wavelengths, fewer photons hit each feature, causing statistical "shot noise" that directly translates to LER. This is a fundamental limit!</p>
            <p><strong style={{ color: colors.textPrimary }}>Mitigation:</strong> Advanced resists, post-exposure smoothing, and design rules that tolerate LER help manage this challenge in sub-7nm manufacturing.</p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Apply This Knowledge')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Real-World Applications</h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Focus-dose control affects every modern electronic device</p>
          <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>Complete all 4 applications to unlock the test</p>
        </div>
        {transferApplications.map((app, index) => (
          <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
              {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
            </div>
            {!transferCompleted.has(index) ? (
              <button onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}>
                Reveal Answer
              </button>
            ) : (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
              </div>
            )}
          </div>
        ))}
      </>,
      renderBottomBar(true, transferCompleted.size >= 4, 'Take the Test')
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
              <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                {opt.text}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>
            Previous
          </button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>
              Next
            </button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>
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
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand lithography focus and dose control</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Process window concept (focus-dose ellipse)</li>
            <li>Defocus causes image blur and feature variation</li>
            <li>Dose controls resist threshold and feature width</li>
            <li>Line Edge Roughness (LER) and its sources</li>
            <li>Scaling challenges as features shrink</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
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
