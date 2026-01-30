import React, { useState, useEffect, useCallback, useRef } from 'react';

type OEPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface OverlayErrorRendererProps {
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
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  metal1: '#64748b',
  metal2: '#3b82f6',
  via: '#fbbf24',
  contact: '#a855f7',
  silicon: '#1e293b',
  border: '#334155',
  primary: '#06b6d4',
};

const OverlayErrorRenderer: React.FC<OverlayErrorRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase order and labels
  const phaseOrder: OEPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<OEPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Self-Aligned',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  // Internal phase state management
  const getInitialPhase = (): OEPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as OEPhase)) {
      return gamePhase as OEPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<OEPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as OEPhase) && gamePhase !== phase) {
      setPhase(gamePhase as OEPhase);
    }
  }, [gamePhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [overlayX, setOverlayX] = useState(0);
  const [overlayY, setOverlayY] = useState(0);
  const [useSelfAligned, setUseSelfAligned] = useState(false);
  const [viaSize, setViaSize] = useState(20);
  const [contactSize, setContactSize] = useState(25);

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

  // Navigation function
  const goToPhase = useCallback((p: OEPhase) => {
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
        gameType: 'overlay_error',
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

  // Physics calculations for overlay
  const calculateOverlayResult = useCallback(() => {
    const totalOverlay = Math.sqrt(overlayX * overlayX + overlayY * overlayY);
    const effectiveOverlayX = useSelfAligned ? overlayX * 0.1 : overlayX;
    const effectiveOverlayY = useSelfAligned ? overlayY * 0.1 : overlayY;
    const effectiveOverlay = Math.sqrt(effectiveOverlayX * effectiveOverlayX + effectiveOverlayY * effectiveOverlayY);
    const viaRadius = viaSize / 2;
    const contactRadius = contactSize / 2;
    const centerDistance = effectiveOverlay;

    let overlapPercent = 0;
    if (centerDistance >= viaRadius + contactRadius) {
      overlapPercent = 0;
    } else if (centerDistance <= Math.abs(contactRadius - viaRadius)) {
      overlapPercent = 100;
    } else {
      const maxOverlap = Math.min(viaRadius, contactRadius) * 2;
      const actualOverlap = Math.max(0, viaRadius + contactRadius - centerDistance);
      overlapPercent = (actualOverlap / maxOverlap) * 100;
    }

    const minOverlapRequired = 30;
    const isOpen = overlapPercent < minOverlapRequired;
    const adjacentMetalSpacing = 30;
    const shortRisk = totalOverlay > adjacentMetalSpacing * 0.8;
    const isShort = totalOverlay > adjacentMetalSpacing && !useSelfAligned;
    const nominalResistance = 100;
    const contactResistance = overlapPercent > 0 ? nominalResistance / (overlapPercent / 100) : Infinity;
    const overlayBudget = (viaSize + contactSize) / 2 - 5;
    const withinBudget = totalOverlay <= overlayBudget;

    return {
      totalOverlay,
      effectiveOverlay,
      overlapPercent,
      isOpen,
      isShort,
      shortRisk,
      contactResistance: Math.min(contactResistance, 10000),
      overlayBudget,
      withinBudget,
      status: isOpen ? 'OPEN' : isShort ? 'SHORT' : 'OK',
    };
  }, [overlayX, overlayY, useSelfAligned, viaSize, contactSize]);

  const predictions = [
    { id: 'fine', label: '5nm is tiny - it will not affect the chip at all' },
    { id: 'problem', label: 'Small shifts can cause vias to miss contacts, creating opens or shorts' },
    { id: 'auto', label: 'The chip automatically compensates for any misalignment' },
    { id: 'only_big', label: 'Only misalignments over 50nm would cause problems' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Self-aligned processes have the same overlay tolerance' },
    { id: 'better', label: 'Self-aligned processes tolerate much larger overlay errors' },
    { id: 'worse', label: 'Self-aligned processes are more sensitive to overlay' },
    { id: 'unrelated', label: 'Self-alignment only affects other parameters, not overlay' },
  ];

  const transferApplications = [
    {
      title: '3D NAND Flash Memory',
      description: '3D NAND stacks 100+ layers of memory cells. Each layer must align to the one below it.',
      question: 'How does overlay accumulate in 3D NAND?',
      answer: 'Each layer adds its own overlay error. With 100+ layers, even 0.1nm per layer compounds to 10nm+ total. Advanced fabs use self-aligned processes and layer-to-layer correction algorithms to maintain sub-nm overlay.',
    },
    {
      title: 'Advanced Logic Chips',
      description: 'Modern CPUs have 15+ metal layers, each requiring precise alignment to the layer below.',
      question: 'Why is overlay more critical in smaller nodes?',
      answer: 'At 5nm node, metal lines are ~20nm wide with 20nm spacing. A 5nm overlay error uses 25% of the available margin. The overlay budget scales with feature size, but overlay control does not improve as fast!',
    },
    {
      title: 'Image Sensor Manufacturing',
      description: 'CMOS image sensors align pixel circuitry to color filter arrays and microlenses.',
      question: 'How does overlay affect image sensor performance?',
      answer: 'Misaligned color filters cause color crosstalk between pixels. Misaligned microlenses reduce light collection efficiency. Both degrade image quality and require overlay control to ~50nm for modern sensors.',
    },
    {
      title: 'MEMS Devices',
      description: 'Micro-Electro-Mechanical Systems combine mechanical structures with electronics.',
      question: 'Why is overlay critical in MEMS manufacturing?',
      answer: 'MEMS devices have moving parts that must align precisely to their actuators and sensors. A misaligned accelerometer beam may have incorrect sensitivity or even fail to move. Overlay affects both electrical and mechanical function.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is "overlay" in semiconductor manufacturing?',
      options: [
        { text: 'The thickness of deposited films', correct: false },
        { text: 'The alignment accuracy between different lithography layers', correct: true },
        { text: 'The number of metal layers in a chip', correct: false },
        { text: 'The size of the transistors', correct: false },
      ],
    },
    {
      question: 'An "open" defect in a via connection means:',
      options: [
        { text: 'The via is too large', correct: false },
        { text: 'The via does not make electrical contact (high resistance)', correct: true },
        { text: 'The via is perfectly aligned', correct: false },
        { text: 'The via connects to too many layers', correct: false },
      ],
    },
    {
      question: 'A "short" defect in metal layers means:',
      options: [
        { text: 'The metal line is too short', correct: false },
        { text: 'Two lines that should be separate are electrically connected', correct: true },
        { text: 'The metal layer is too thin', correct: false },
        { text: 'The exposure time was too short', correct: false },
      ],
    },
    {
      question: 'Overlay error is typically measured in:',
      options: [
        { text: 'Micrometers (um)', correct: false },
        { text: 'Nanometers (nm)', correct: true },
        { text: 'Millimeters (mm)', correct: false },
        { text: 'Degrees of rotation', correct: false },
      ],
    },
    {
      question: 'The "overlay budget" refers to:',
      options: [
        { text: 'The cost of overlay measurement equipment', correct: false },
        { text: 'The maximum allowable misalignment between layers', correct: true },
        { text: 'The number of overlay marks on a wafer', correct: false },
        { text: 'The time allocated for alignment', correct: false },
      ],
    },
    {
      question: 'Self-aligned processes improve overlay tolerance by:',
      options: [
        { text: 'Using more expensive materials', correct: false },
        { text: 'Making features automatically align to underlying structures', correct: true },
        { text: 'Running the process more slowly', correct: false },
        { text: 'Using larger features', correct: false },
      ],
    },
    {
      question: 'As feature sizes shrink, overlay requirements:',
      options: [
        { text: 'Become less strict', correct: false },
        { text: 'Become more strict (tighter tolerances needed)', correct: true },
        { text: 'Stay the same', correct: false },
        { text: 'Become irrelevant', correct: false },
      ],
    },
    {
      question: 'Overlay metrology typically uses:',
      options: [
        { text: 'Special alignment marks measured by optical or SEM tools', correct: true },
        { text: 'Weight measurements', correct: false },
        { text: 'Color analysis', correct: false },
        { text: 'Temperature sensors', correct: false },
      ],
    },
    {
      question: 'Contact resistance increases when overlay error is large because:',
      options: [
        { text: 'The via material changes', correct: false },
        { text: 'The effective contact area between via and metal decreases', correct: true },
        { text: 'The temperature increases', correct: false },
        { text: 'The current increases', correct: false },
      ],
    },
    {
      question: 'Multi-patterning increases overlay challenges because:',
      options: [
        { text: 'More masks mean more opportunities for alignment errors', correct: true },
        { text: 'The patterns become simpler', correct: false },
        { text: 'Fewer layers are needed', correct: false },
        { text: 'The wafer becomes thinner', correct: false },
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

  const renderVisualization = (interactive: boolean, showSelfAligned: boolean = false) => {
    const width = 500;
    const height = 420;
    const result = calculateOverlayResult();
    const scale = 3;
    const effectiveShiftX = useSelfAligned ? overlayX * 0.1 : overlayX;
    const effectiveShiftY = useSelfAligned ? overlayY * 0.1 : overlayY;

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
            <linearGradient id="metalGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="metalGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="8" height="8">
              <path d="M0,0 l8,8 M8,0 l-8,8" stroke="#334155" strokeWidth="0.5" />
            </pattern>
          </defs>

          <text x={width / 2} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">Layer-to-Layer Overlay</text>
          <text x={130} y={50} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Cross-Section View</text>

          <rect x={30} y={200} width={200} height={40} fill={colors.silicon} />
          <text x={130} y={225} fill={colors.textMuted} fontSize={9} textAnchor="middle">Silicon</text>

          <rect x={60} y={170} width={60} height={30} fill="url(#metalGrad1)" rx={2} />
          <rect x={140} y={170} width={60} height={30} fill="url(#metalGrad1)" rx={2} />
          <text x={90} y={190} fill={colors.textPrimary} fontSize={8} textAnchor="middle">M1</text>
          <text x={170} y={190} fill={colors.textPrimary} fontSize={8} textAnchor="middle">M1</text>

          <rect x={30} y={130} width={200} height={40} fill="url(#crosshatch)" opacity={0.5} />

          <rect x={80 + effectiveShiftX * scale} y={130 + effectiveShiftY * scale} width={viaSize * 0.8} height={40} fill={colors.via} opacity={result.isOpen ? 0.3 : 0.9} />
          <rect x={160 + effectiveShiftX * scale} y={130 + effectiveShiftY * scale} width={viaSize * 0.8} height={40} fill={colors.via} opacity={result.isOpen ? 0.3 : 0.9} />

          <rect x={50 + effectiveShiftX * scale} y={100} width={80} height={30} fill="url(#metalGrad2)" rx={2} />
          <rect x={150 + effectiveShiftX * scale} y={100} width={80} height={30} fill="url(#metalGrad2)" rx={2} />
          <text x={90 + effectiveShiftX * scale} y={120} fill={colors.textPrimary} fontSize={8} textAnchor="middle">M2</text>
          <text x={190 + effectiveShiftX * scale} y={120} fill={colors.textPrimary} fontSize={8} textAnchor="middle">M2</text>

          {result.isOpen && (
            <g>
              <circle cx={90 + effectiveShiftX * scale} cy={150} r={8} fill={colors.error} opacity={0.8} />
              <text x={90 + effectiveShiftX * scale} y={154} fill="white" fontSize={10} textAnchor="middle">X</text>
              <text x={90 + effectiveShiftX * scale} y={85} fill={colors.error} fontSize={9} textAnchor="middle">OPEN!</text>
            </g>
          )}
          {result.isShort && (
            <g>
              <line x1={130 + effectiveShiftX * scale} y1={115} x2={150 + effectiveShiftX * scale} y2={115} stroke={colors.error} strokeWidth={3} />
              <text x={140 + effectiveShiftX * scale} y={95} fill={colors.error} fontSize={9} textAnchor="middle">SHORT!</text>
            </g>
          )}

          <text x={380} y={50} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Top-Down View</text>
          <rect x={300} y={70} width={160} height={160} fill={colors.silicon} stroke={colors.textMuted} strokeWidth={1} rx={4} />

          <circle cx={350} cy={130} r={contactSize * 0.6} fill={colors.metal1} stroke="#94a3b8" strokeWidth={1} />
          <circle cx={410} cy={130} r={contactSize * 0.6} fill={colors.metal1} stroke="#94a3b8" strokeWidth={1} />
          <circle cx={350} cy={190} r={contactSize * 0.6} fill={colors.metal1} stroke="#94a3b8" strokeWidth={1} />
          <circle cx={410} cy={190} r={contactSize * 0.6} fill={colors.metal1} stroke="#94a3b8" strokeWidth={1} />

          <circle cx={350 + effectiveShiftX * scale} cy={130 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} />
          <circle cx={410 + effectiveShiftX * scale} cy={130 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} />
          <circle cx={350 + effectiveShiftX * scale} cy={190 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} />
          <circle cx={410 + effectiveShiftX * scale} cy={190 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} />

          {(overlayX !== 0 || overlayY !== 0) && (
            <g>
              <line x1={380} y1={160} x2={380 + effectiveShiftX * scale * 2} y2={160 + effectiveShiftY * scale * 2} stroke={colors.accent} strokeWidth={2} markerEnd="url(#arrowhead)" />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
                </marker>
              </defs>
            </g>
          )}

          <g transform="translate(300, 240)">
            <circle cx={10} cy={8} r={6} fill={colors.metal1} />
            <text x={25} y={12} fill={colors.textSecondary} fontSize={9}>M1 Contact</text>
            <circle cx={90} cy={8} r={5} fill={colors.via} />
            <text x={105} y={12} fill={colors.textSecondary} fontSize={9}>Via (shifted)</text>
          </g>

          <rect x={30} y={260} width={200} height={130} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={40} y={280} fill={colors.textSecondary} fontSize={10}>OVERLAY METRICS</text>
          <text x={40} y={300} fill={colors.textPrimary} fontSize={10}>X shift: {overlayX} nm {useSelfAligned ? `(eff: ${effectiveShiftX.toFixed(1)})` : ''}</text>
          <text x={40} y={318} fill={colors.textPrimary} fontSize={10}>Y shift: {overlayY} nm {useSelfAligned ? `(eff: ${effectiveShiftY.toFixed(1)})` : ''}</text>
          <text x={40} y={336} fill={colors.accent} fontSize={10}>Total: {result.totalOverlay.toFixed(1)} nm</text>
          <text x={40} y={354} fill={result.withinBudget ? colors.success : colors.error} fontSize={10}>Budget: {result.overlayBudget.toFixed(0)} nm {result.withinBudget ? '(OK)' : '(EXCEEDED)'}</text>
          <text x={40} y={372} fill={result.overlapPercent > 30 ? colors.success : colors.error} fontSize={10}>Overlap: {result.overlapPercent.toFixed(0)}%</text>

          <rect x={300} y={280} width={160} height={50} fill={result.status === 'OK' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} rx={8} stroke={result.status === 'OK' ? colors.success : colors.error} strokeWidth={2} />
          <text x={380} y={310} fill={result.status === 'OK' ? colors.success : colors.error} fontSize={24} fontWeight="bold" textAnchor="middle">{result.status}</text>

          {showSelfAligned && useSelfAligned && (
            <text x={380} y={350} fill={colors.accent} fontSize={10} textAnchor="middle">Self-Aligned: 90% error reduction</text>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setOverlayX(0); setOverlayY(0); }}
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
              Reset Alignment
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showSelfAligned: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>X Overlay Error: {overlayX} nm</label>
        <input type="range" min="-20" max="20" step="1" value={overlayX} onChange={(e) => setOverlayX(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>Y Overlay Error: {overlayY} nm</label>
        <input type="range" min="-20" max="20" step="1" value={overlayY} onChange={(e) => setOverlayY(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>Via Size: {viaSize} nm</label>
        <input type="range" min="10" max="40" step="2" value={viaSize} onChange={(e) => setViaSize(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>Contact Pad Size: {contactSize} nm</label>
        <input type="range" min="15" max="50" step="2" value={contactSize} onChange={(e) => setContactSize(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      {showSelfAligned && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={useSelfAligned} onChange={(e) => setUseSelfAligned(e.target.checked)} style={{ width: '20px', height: '20px' }} />
            Enable Self-Aligned Process (reduces effective overlay by 90%)
          </label>
        </div>
      )}
      <div style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Overlay Budget: Must keep total overlay less than ~{((viaSize + contactSize) / 2 - 5).toFixed(0)} nm</div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>Total = sqrt(X^2 + Y^2) | Need more than 30% overlap for good contact</div>
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
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>Overlay Error in Chips</h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>If each layer is off by 5nm, is that okay?</p>
        </div>
        {renderVisualization(true)}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
              Imagine stacking printed transparencies with patterns that must connect through tiny holes. If each layer shifts slightly, the holes may not line up! In chips, these "vias" connect metal layers and must align within nanometers.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              A chip can have 15+ metal layers. What happens when alignment drifts?
            </p>
          </div>
          <div style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Use the sliders to shift the layers and see what happens to the via connections!
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
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Multi-Layer Chip Structure:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Each metal layer is patterned separately. Vias connect one layer to the next. If the via does not land on the contact pad below, the connection fails. The "overlay error" is how far off the alignment is from perfect.
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>What happens with a 5nm layer misalignment?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
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
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Overlay Errors</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Shift the layers and observe opens and shorts</p>
        </div>
        {renderVisualization(true)}
        {renderControls()}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Find the maximum X shift before an open occurs</li>
            <li>Combine X and Y shifts - how does the vector sum matter?</li>
            <li>Reduce via and contact sizes - does the margin shrink?</li>
            <li>Note when the status changes from OK to OPEN or SHORT</li>
          </ul>
        </div>
      </>,
      renderBottomBar(true, true, 'Continue to Review')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'problem';
    return renderWrapper(
      <>
        <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textPrimary }}>
            Even small overlay errors matter! A 5nm shift on a 20nm via means 25% of the contact area is lost. Too much shift causes opens (no contact) or shorts (unintended connections).
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Overlay</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Opens:</strong> When a via does not overlap enough with the contact pad, the electrical connection has very high resistance or fails completely. This is called an "open" defect.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Shorts:</strong> When overlay error pushes a via or metal line too close to an adjacent structure, they may connect when they should not. This is a "short" defect.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Contact Resistance:</strong> Even partial overlay reduces contact area, increasing resistance. At nanometer scales, this affects circuit timing and power consumption.</p>
            <p><strong style={{ color: colors.textPrimary }}>Overlay Budget:</strong> Chip designers allocate an "overlay budget" - the maximum allowed misalignment. Modern chips need sub-2nm overlay control!</p>
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
          <p style={{ color: colors.textSecondary }}>What if we use "self-aligned" processes?</p>
        </div>
        {renderVisualization(false, true)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Self-Aligned Processes:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            In a self-aligned process, the via automatically forms centered on the underlying structure, rather than being positioned by a separate mask. The via "finds" the contact through selective chemistry, reducing effective overlay error dramatically.
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>How do self-aligned processes affect overlay tolerance?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)', background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
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
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Self-Aligned Process</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Toggle self-aligned mode and compare overlay tolerance</p>
        </div>
        {renderVisualization(true, true)}
        {renderControls(true)}
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Self-aligned processes can reduce effective overlay error by 90% or more! The via automatically centers on the contact, regardless of mask misalignment. This is why self-aligned contacts (SAC) are essential for advanced nodes.
          </p>
        </div>
      </>,
      renderBottomBar(true, true, 'See the Explanation')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'better';
    return renderWrapper(
      <>
        <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textPrimary }}>
            Self-aligned processes dramatically increase overlay tolerance. By making structures automatically align through selective chemistry, the effective overlay error is reduced by 90% or more.
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Self-Aligned Technology</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Self-Aligned Contacts (SAC):</strong> Contacts to transistor gates automatically center on the gate, regardless of contact mask position. A dielectric cap on the gate prevents shorts.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Self-Aligned Vias (SAV):</strong> Vias form only where metal lines are exposed, automatically aligning to the metal pattern below.</p>
            <p><strong style={{ color: colors.textPrimary }}>Trade-offs:</strong> Self-aligned processes add complexity and cost, but enable continued scaling where overlay-limited processes would fail.</p>
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
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Overlay control affects every multi-layer electronic device</p>
          <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>Complete all 4 applications to unlock the test</p>
        </div>
        {transferApplications.map((app, index) => (
          <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
              {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
            <p style={{ color: colors.textSecondary, marginTop: '8px' }}>{testScore >= 8 ? 'You understand overlay errors!' : 'Review the material and try again.'}</p>
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
              <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
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
      <div style={{ height: '1px' }} />
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Alignment Icon</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand overlay error and alignment</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Overlay error causes opens and shorts</li>
            <li>Overlay budget shrinks with feature size</li>
            <li>Vector sum of X and Y errors matters</li>
            <li>Self-aligned processes dramatically improve tolerance</li>
            <li>Contact resistance increases with poor overlay</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(6, 182, 212, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Advanced overlay metrology uses diffraction-based measurement with sub-0.1nm precision. Machine learning predicts and corrects for systematic overlay errors across wafers. At 3nm node, overlay control to under 1.5nm is required - less than 10 atomic spacings!
          </p>
        </div>
        {renderVisualization(true, true)}
      </>,
      renderBottomBar(true, true, 'Complete Game')
    );
  }

  return null;
};

export default OverlayErrorRenderer;
