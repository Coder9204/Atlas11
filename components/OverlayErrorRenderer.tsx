import React, { useState, useEffect, useCallback, useRef } from 'react';

type OEPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface OverlayErrorRendererProps {
  gamePhase?: string;
  onGameEvent?: (event: { eventType: string; gameType: string; details: Record<string, unknown> }) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: 'rgba(226,232,240,0.9)',
  textMuted: 'rgba(200,210,220,0.8)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  metal1: '#64748b',
  metal2: '#3b82f6',
  via: '#fbbf24',
  contact: '#a855f7',
  silicon: '#1e293b',
  border: '#334155',
  primary: '#06b6d4',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  borderRadius: '4px',
  cursor: 'pointer',
  accentColor: '#3b82f6',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
};

const buttonTransition = 'all 0.15s ease-in-out';

const OverlayErrorRenderer: React.FC<OverlayErrorRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  const phaseOrder: OEPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<OEPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Self-Aligned',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): OEPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as OEPhase)) {
      return gamePhase as OEPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<OEPhase>(getInitialPhase);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as OEPhase) && gamePhase !== phase) {
      setPhase(gamePhase as OEPhase);
    }
  }, [gamePhase]);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const [overlayX, setOverlayX] = useState(0);
  const [overlayY, setOverlayY] = useState(0);
  const [useSelfAligned, setUseSelfAligned] = useState(false);
  const [viaSize, setViaSize] = useState(20);
  const [contactSize, setContactSize] = useState(25);

  // Twist play sliders (numeric, modifying SVG)
  const [twistOverlayX, setTwistOverlayX] = useState(8);
  const [twistSelfAlignedReduction, setTwistSelfAlignedReduction] = useState(90);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  }, [onGameEvent]);

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
      description: '3D NAND stacks 100+ layers of memory cells. Each layer must align to the one below it. Modern 3D NAND uses overlay control to within 2nm across 128 layers.',
      question: 'How does overlay accumulate in 3D NAND?',
      answer: 'Each layer adds its own overlay error. With 100+ layers, even 0.1nm per layer compounds to 10nm+ total. Advanced fabs use self-aligned processes and layer-to-layer correction algorithms to maintain sub-nm overlay. Samsung and Micron report ~1.5nm overlay in production 3D NAND at 176+ layers.',
    },
    {
      title: 'Advanced Logic Chips (5nm node)',
      description: 'Modern CPUs have 15+ metal layers, each requiring precise alignment to the layer below. At 5nm, metal lines are ~20nm wide with 20nm spacing.',
      question: 'Why is overlay more critical at 5nm vs 28nm node?',
      answer: 'At 5nm node, a 5nm overlay error uses 25% of the available margin (20nm spacing). At 28nm node, the same 5nm error uses only ~9% of the 55nm spacing. The overlay budget scales linearly with feature size - shrinking from ~8nm at 28nm node to ~1.5nm at 3nm node. TSMC N3 requires sub-1.5nm overlay control across 300mm wafers.',
    },
    {
      title: 'CMOS Image Sensors',
      description: 'CMOS image sensors align pixel circuitry to color filter arrays and microlenses. Modern 50MP sensors have pixel pitches of ~0.7 micrometers.',
      question: 'How does overlay affect image sensor performance?',
      answer: 'Misaligned color filters cause color crosstalk between pixels - a red pixel captures blue light. Misaligned microlenses reduce light collection efficiency by 15-30%. Both degrade image quality. Sony and Samsung require overlay control to ~50nm for modern sensors. Multi-layer BSI (Back-Side Illumination) sensors add additional alignment challenges.',
    },
    {
      title: 'MEMS Accelerometers',
      description: 'Micro-Electro-Mechanical Systems combine mechanical structures with CMOS electronics. MEMS accelerometers in smartphones sense 3-axis motion.',
      question: 'Why is overlay critical in MEMS manufacturing?',
      answer: 'MEMS devices have moving parts that must align precisely to their actuators and sensors. A misaligned accelerometer beam may have incorrect spring constant (±10% per 100nm misalignment), causing wrong g-force readings. The electrode gap (~2 micrometers) requires <50nm overlay to maintain correct capacitance. Poor overlay causes drift, offset errors, and reduced sensitivity in IMUs used for navigation.',
    },
  ];

  const testQuestions = [
    {
      question: 'In lithography, "overlay" refers to the alignment accuracy between different mask layers. If X-shift = 3nm and Y-shift = 4nm, what is the total overlay error?',
      options: [
        { text: '3.5nm (average of X and Y)', correct: false },
        { text: '7nm (sum of X and Y)', correct: false },
        { text: '5nm (vector sum: √(3²+4²))', correct: true },
        { text: '12nm (product of X and Y)', correct: false },
      ],
    },
    {
      question: 'An "open" defect in a via connection means the effective contact area is too small. What causes this in overlay errors?',
      options: [
        { text: 'The via is too large', correct: false },
        { text: 'The via does not make electrical contact - high resistance or complete failure', correct: true },
        { text: 'The via is perfectly aligned to center', correct: false },
        { text: 'The via connects to too many layers', correct: false },
      ],
    },
    {
      question: 'A "short" defect occurs when overlay error pushes a via too close to adjacent metal. What is the result?',
      options: [
        { text: 'The metal line is too short in length', correct: false },
        { text: 'Two lines that should be separate are electrically connected', correct: true },
        { text: 'The metal layer deposited too thin', correct: false },
        { text: 'The lithography exposure time was too short', correct: false },
      ],
    },
    {
      question: 'Overlay error is typically specified in nanometers. For a 5nm process node with 20nm metal pitch, what overlay budget is typical?',
      options: [
        { text: '~100nm - generous margin', correct: false },
        { text: '~1.5-2nm - very tight control required', correct: true },
        { text: '~50nm - moderate tolerance', correct: false },
        { text: '~10-15nm - standard tolerance', correct: false },
      ],
    },
    {
      question: 'The overlay budget formula is: Budget ≈ (via_size + contact_size)/2 - margin. If via=20nm, contact=25nm, margin=5nm, what is the budget?',
      options: [
        { text: '17.5nm', correct: true },
        { text: '22.5nm', correct: false },
        { text: '10nm', correct: false },
        { text: '45nm', correct: false },
      ],
    },
    {
      question: 'Self-aligned processes improve overlay tolerance by making features align automatically. By approximately how much can they reduce effective overlay error?',
      options: [
        { text: '~10% reduction', correct: false },
        { text: '~50% reduction', correct: false },
        { text: '~90% or more reduction', correct: true },
        { text: 'No improvement - same tolerance', correct: false },
      ],
    },
    {
      question: 'As feature sizes shrink from 28nm to 5nm node, overlay requirements become:',
      options: [
        { text: 'Less strict - smaller features are easier to align', correct: false },
        { text: 'More strict - overlay budget scales with feature size', correct: true },
        { text: 'Same absolute tolerance in nanometers', correct: false },
        { text: 'Irrelevant at small nodes', correct: false },
      ],
    },
    {
      question: 'Overlay metrology uses special alignment marks (Box-in-Box or AIM targets). These are measured by:',
      options: [
        { text: 'Special alignment marks measured by optical scatterometry or SEM tools', correct: true },
        { text: 'Weight measurements of the wafer', correct: false },
        { text: 'Color spectroscopy of the film', correct: false },
        { text: 'Temperature sensors embedded in the chuck', correct: false },
      ],
    },
    {
      question: 'Contact resistance formula: R_contact = R_nominal / (overlap_fraction). If overlap is 50%, how does contact resistance change vs perfect alignment?',
      options: [
        { text: 'Halves (0.5×) because area is smaller', correct: false },
        { text: 'Doubles (2×) because effective area is halved', correct: true },
        { text: 'Stays the same - resistance is independent of area', correct: false },
        { text: 'Increases by 10× due to quantum effects', correct: false },
      ],
    },
    {
      question: 'Multi-patterning (SADP/SAQP) increases overlay challenges in advanced nodes because:',
      options: [
        { text: 'More masks/exposures create more opportunities for alignment errors to accumulate', correct: true },
        { text: 'The patterns become simpler and easier to align', correct: false },
        { text: 'Fewer metal layers are needed overall', correct: false },
        { text: 'The wafer substrate becomes thinner', correct: false },
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

  // Navigation dots
  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            aria-label={phaseLabels[p]}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s ease-in-out',
              padding: 0,
            }}
          />
        ))}
      </div>
    );
  };

  // Progress bar
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: '48px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>
          {currentIdx + 1} / {phaseOrder.length}
        </span>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700,
        }}>
          {phaseLabels[phase]}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              style={{
                width: i === currentIdx ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                transition: 'all 0.3s ease-in-out',
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Bottom nav bar
  const renderBottomNav = (canBack: boolean, canNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const backDisabled = !canBack || currentIdx === 0;

    const handleBack = () => {
      if (!backDisabled) goBack();
    };
    const handleNext = () => {
      if (!canNext) return;
      if (onNext) onNext();
      else goNext();
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        zIndex: 100,
        height: '64px',
      }}>
        <button
          onClick={handleBack}
          disabled={backDisabled}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: colors.bgCardLight,
            color: backDisabled ? 'rgba(200,210,220,0.4)' : colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: backDisabled ? 'not-allowed' : 'pointer',
            opacity: backDisabled ? 0.4 : 1,
            minHeight: '44px',
            transition: buttonTransition,
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canNext}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canNext ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
            color: canNext ? colors.textPrimary : 'rgba(200,210,220,0.4)',
            border: 'none',
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.4,
            boxShadow: canNext ? `0 2px 12px ${colors.primary}30` : 'none',
            minHeight: '44px',
            transition: buttonTransition,
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Wrapper
  const renderWrapper = (content: React.ReactNode, footer?: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '68px', paddingBottom: '80px' }}>
        {content}
        {renderNavDots()}
      </div>
      {footer}
    </div>
  );

  // Main SVG visualization
  const renderVisualization = (interactive: boolean, showSelfAligned: boolean = false) => {
    const svgWidth = 500;
    const svgHeight = 340;
    const result = calculateOverlayResult();
    const scale = 3;
    const effectiveShiftX = useSelfAligned ? overlayX * 0.1 : overlayX;
    const effectiveShiftY = useSelfAligned ? overlayY * 0.1 : overlayY;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px' }}>
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
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
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0f0f1a" />
            </linearGradient>
            <filter id="viaGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowAlert" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="8" height="8">
              <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#334155" strokeWidth="0.5" />
            </pattern>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
            </marker>
          </defs>

          {/* Grid lines - cross-section region */}
          <g opacity="0.25" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4">
            <line x1="30" y1="80" x2="250" y2="80" />
            <line x1="30" y1="120" x2="250" y2="120" />
            <line x1="30" y1="160" x2="250" y2="160" />
            <line x1="30" y1="200" x2="250" y2="200" />
            <line x1="70" y1="70" x2="70" y2="240" />
            <line x1="130" y1="70" x2="130" y2="240" />
            <line x1="190" y1="70" x2="190" y2="240" />
          </g>

          {/* Cross-section title */}
          <text x={130} y={20} fill={colors.textPrimary} fontSize={13} textAnchor="middle" fontWeight="bold">Cross-Section View</text>

          {/* Axis labels */}
          <text x={130} y={335} fill={colors.textMuted} fontSize={11} textAnchor="middle">X Overlay Error (nm)</text>
          <text x={14} y={160} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform="rotate(-90 14 160)">Layer Position</text>

          {/* Silicon substrate */}
          <rect x={30} y={200} width={200} height={35} fill={colors.silicon} />
          <text x={130} y={222} fill={colors.textMuted} fontSize={10} textAnchor="middle">Silicon Substrate</text>

          {/* M1 contacts (reference/baseline - stationary) */}
          <rect x={60} y={170} width={50} height={30} fill="url(#metalGrad1)" rx={2} />
          <rect x={140} y={170} width={50} height={30} fill="url(#metalGrad1)" rx={2} />
          <text x={85} y={189} fill={colors.textPrimary} fontSize={9} textAnchor="middle" fontWeight="600">M1</text>
          <text x={165} y={189} fill={colors.textPrimary} fontSize={9} textAnchor="middle" fontWeight="600">M1</text>

          {/* Reference marker - baseline perfect alignment */}
          <line x1={80} y1={130} x2={80} y2={168} stroke="rgba(100,200,100,0.4)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={80} y={128} fill="rgba(100,200,100,0.7)" fontSize={9} textAnchor="middle">Ideal</text>

          {/* Dielectric layer */}
          <rect x={30} y={130} width={200} height={40} fill="url(#crosshatch)" opacity={0.5} />
          <text x={30} y={126} fill={colors.textMuted} fontSize={9}>Dielectric</text>

          {/* Vias (shifted) */}
          <rect x={75 + effectiveShiftX * scale} y={130 + effectiveShiftY * scale} width={viaSize * 0.8} height={40} fill={colors.via} opacity={result.isOpen ? 0.3 : 0.9} filter="url(#viaGlow)" rx={1} />
          <rect x={155 + effectiveShiftX * scale} y={130 + effectiveShiftY * scale} width={viaSize * 0.8} height={40} fill={colors.via} opacity={result.isOpen ? 0.3 : 0.9} filter="url(#viaGlow)" rx={1} />

          {/* M2 upper metal */}
          <rect x={50 + effectiveShiftX * scale} y={100} width={70} height={30} fill="url(#metalGrad2)" rx={2} />
          <rect x={150 + effectiveShiftX * scale} y={100} width={70} height={30} fill="url(#metalGrad2)" rx={2} />
          <text x={85 + effectiveShiftX * scale} y={119} fill={colors.textPrimary} fontSize={9} textAnchor="middle" fontWeight="600">M2</text>
          <text x={185 + effectiveShiftX * scale} y={119} fill={colors.textPrimary} fontSize={9} textAnchor="middle" fontWeight="600">M2</text>

          {/* Open/Short indicators */}
          {result.isOpen && (
            <g filter="url(#glowAlert)">
              <circle cx={90 + effectiveShiftX * scale} cy={152} r={10} fill={colors.error} opacity={0.8} />
              <text x={90 + effectiveShiftX * scale} y={156} fill="white" fontSize={11} textAnchor="middle" fontWeight="bold">!</text>
              <text x={90 + effectiveShiftX * scale} y={88} fill={colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">OPEN</text>
            </g>
          )}
          {result.isShort && (
            <g filter="url(#glowAlert)">
              <line x1={130 + effectiveShiftX * scale} y1={115} x2={150 + effectiveShiftX * scale} y2={115} stroke={colors.error} strokeWidth={3} />
              <text x={140 + effectiveShiftX * scale} y={95} fill={colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">SHORT</text>
            </g>
          )}

          {/* Top-down view */}
          <text x={380} y={20} fill={colors.textPrimary} fontSize={13} textAnchor="middle" fontWeight="bold">Top-Down View</text>
          <text x={380} y={35} fill={colors.textMuted} fontSize={10} textAnchor="middle">Via alignment to contact pad</text>

          {/* Grid in top-down region */}
          <g opacity="0.2" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4">
            <line x1="300" y1="60" x2="460" y2="60" />
            <line x1="300" y1="100" x2="460" y2="100" />
            <line x1="300" y1="140" x2="460" y2="140" />
            <line x1="300" y1="180" x2="460" y2="180" />
            <line x1="300" y1="220" x2="460" y2="220" />
            <line x1="340" y1="50" x2="340" y2="235" />
            <line x1="380" y1="50" x2="380" y2="235" />
            <line x1="420" y1="50" x2="420" y2="235" />
          </g>

          <rect x={300} y={50} width={160} height={185} fill={colors.silicon} stroke={colors.textMuted} strokeWidth={1} rx={4} opacity={0.5} />

          {/* Contact pads (baseline - stationary) */}
          <circle cx={350} cy={110} r={contactSize * 0.6} fill={colors.metal1} stroke="rgba(148,163,184,0.6)" strokeWidth={1} />
          <circle cx={410} cy={110} r={contactSize * 0.6} fill={colors.metal1} stroke="rgba(148,163,184,0.6)" strokeWidth={1} />
          <circle cx={350} cy={180} r={contactSize * 0.6} fill={colors.metal1} stroke="rgba(148,163,184,0.6)" strokeWidth={1} />
          <circle cx={410} cy={180} r={contactSize * 0.6} fill={colors.metal1} stroke="rgba(148,163,184,0.6)" strokeWidth={1} />

          {/* Reference crosshairs on contacts */}
          <g stroke="rgba(100,200,100,0.3)" strokeWidth="0.5">
            <line x1={342} y1={110} x2={358} y2={110} />
            <line x1={350} y1={102} x2={350} y2={118} />
            <line x1={402} y1={110} x2={418} y2={110} />
            <line x1={410} y1={102} x2={410} y2={118} />
          </g>

          {/* Vias (shifted) */}
          <circle cx={350 + effectiveShiftX * scale} cy={110 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} filter="url(#viaGlow)" />
          <circle cx={410 + effectiveShiftX * scale} cy={110 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} filter="url(#viaGlow)" />
          <circle cx={350 + effectiveShiftX * scale} cy={180 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} filter="url(#viaGlow)" />
          <circle cx={410 + effectiveShiftX * scale} cy={180 + effectiveShiftY * scale} r={viaSize * 0.5} fill={colors.via} stroke={result.overlapPercent < 30 ? colors.error : colors.success} strokeWidth={2} opacity={0.8} filter="url(#viaGlow)" />

          {/* Overlay arrow */}
          {(overlayX !== 0 || overlayY !== 0) && (
            <line x1={380} y1={145} x2={380 + effectiveShiftX * scale * 2} y2={145 + effectiveShiftY * scale * 2} stroke={colors.accent} strokeWidth={2} markerEnd="url(#arrowhead)" />
          )}

          {/* Legend */}
          <g transform="translate(300, 243)">
            <circle cx={10} cy={8} r={6} fill={colors.metal1} />
            <text x={20} y={12} fill={colors.textSecondary} fontSize={10} fontWeight="500">M1 Contact (fixed)</text>
            <circle cx={110} cy={8} r={5} fill={colors.via} />
            <text x={120} y={12} fill={colors.textSecondary} fontSize={10} fontWeight="500">Via (shifted)</text>
          </g>

          {/* Metrics panel */}
          <rect x={30} y={260} width={200} height={70} fill="rgba(0,0,0,0.7)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={38} y={276} fill={colors.textSecondary} fontSize={10} fontWeight="700">OVERLAY METRICS</text>
          <text x={38} y={293} fill={colors.textPrimary} fontSize={10}>X: {overlayX}nm, Y: {overlayY}nm → Total: {calculateOverlayResult().totalOverlay.toFixed(1)}nm</text>
          <text x={38} y={308} fill={calculateOverlayResult().withinBudget ? colors.success : colors.error} fontSize={10}>Budget: {calculateOverlayResult().overlayBudget.toFixed(0)}nm {calculateOverlayResult().withinBudget ? '✓ OK' : '✗ EXCEEDED'}</text>
          <text x={38} y={323} fill={calculateOverlayResult().overlapPercent > 30 ? colors.success : colors.error} fontSize={10}>Overlap: {calculateOverlayResult().overlapPercent.toFixed(0)}% (need &gt;30%)</text>

          {/* Status badge */}
          <rect x={295} y={265} width={170} height={50} fill={result.status === 'OK' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)'} rx={8} stroke={result.status === 'OK' ? colors.success : colors.error} strokeWidth={2} />
          <text x={380} y={297} fill={result.status === 'OK' ? colors.success : colors.error} fontSize={22} fontWeight="bold" textAnchor="middle">{result.status}</text>

          {showSelfAligned && useSelfAligned && (
            <text x={380} y={328} fill={colors.accent} fontSize={10} textAnchor="middle">Self-Aligned: 90% error reduction active</text>
          )}
        </svg>
      </div>
    );
  };

  // Twist play visualization (numeric sliders, different from main play)
  const renderTwistVisualization = () => {
    const effectiveOverlay = twistOverlayX * (1 - twistSelfAlignedReduction / 100);
    const nominalOverlapAt20 = 70; // percent at 0 overlay
    const overlapAtEffective = Math.max(0, nominalOverlapAt20 - effectiveOverlay * 3);

    return (
      <div style={{ padding: '8px' }}>
        <svg width="100%" height={220} viewBox="0 0 500 220" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px', display: 'block', margin: '0 auto' }}>
          <defs>
            <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="goodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="badGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid */}
          <g opacity="0.2" stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4">
            <line x1="60" y1="20" x2="480" y2="20" />
            <line x1="60" y1="60" x2="480" y2="60" />
            <line x1="60" y1="100" x2="480" y2="100" />
            <line x1="60" y1="140" x2="480" y2="140" />
            <line x1="60" y1="180" x2="480" y2="180" />
          </g>

          {/* Title */}
          <text x={270} y={15} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">Self-Aligned Process: Overlay Tolerance Comparison</text>

          {/* Y-axis */}
          <line x1={60} y1={20} x2={60} y2={190} stroke={colors.textMuted} strokeWidth={1} />
          <text x={14} y={105} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform="rotate(-90 14 105)">Contact Overlap %</text>
          <text x={55} y={190} fill={colors.textMuted} fontSize={9} textAnchor="end">0%</text>
          <text x={55} y={105} fill={colors.textMuted} fontSize={9} textAnchor="end">50%</text>
          <text x={55} y={22} fill={colors.textMuted} fontSize={9} textAnchor="end">100%</text>

          {/* X-axis */}
          <line x1={60} y1={190} x2={480} y2={190} stroke={colors.textMuted} strokeWidth={1} />
          <text x={270} y={210} fill={colors.textMuted} fontSize={11} textAnchor="middle">Overlay Error X (nm)</text>
          {[0, 5, 10, 15, 20].map((v, i) => (
            <text key={v} x={60 + i * 85} y={203} fill={colors.textMuted} fontSize={9} textAnchor="middle">{v}</text>
          ))}

          {/* Without self-aligned - steep drop */}
          <path
            d={`M 60 22 L 145 50 L 230 100 L 315 150 L 400 185 L 480 188`}
            fill="none"
            stroke={colors.error}
            strokeWidth={2.5}
            filter="url(#twistGlow)"
          />
          <text x={485} y={188} fill={colors.error} fontSize={10}>Standard</text>

          {/* With self-aligned - gentle slope */}
          {(() => {
            const reduction = twistSelfAlignedReduction / 100;
            // At reduction=0.9, slope is 10% of standard
            const endY = 22 + (188 - 22) * (1 - reduction) * 0.85;
            return (
              <>
                <path
                  d={`M 60 22 L 145 ${22 + (30 * (1 - reduction))} L 230 ${22 + (60 * (1 - reduction))} L 315 ${22 + (90 * (1 - reduction))} L 400 ${22 + (120 * (1 - reduction))} L 480 ${endY.toFixed(0)}`}
                  fill="none"
                  stroke={colors.success}
                  strokeWidth={2.5}
                  filter="url(#twistGlow)"
                />
                <text x={485} y={Math.max(18, endY - 2)} fill={colors.success} fontSize={10}>SA ({twistSelfAlignedReduction}%)</text>
              </>
            );
          })()}

          {/* Current overlay position marker */}
          {(() => {
            const xPos = 60 + twistOverlayX * 21;
            const standardY = 22 + (twistOverlayX / 20) * 166;
            const saY = 22 + (twistOverlayX / 20) * 166 * (1 - twistSelfAlignedReduction / 100) * 0.85;
            return (
              <>
                <line x1={xPos} y1={20} x2={xPos} y2={190} stroke={colors.accent} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
                <circle cx={xPos} cy={standardY} r={6} fill={colors.error} filter="url(#twistGlow)" />
                <circle cx={xPos} cy={saY} r={6} fill={colors.success} filter="url(#twistGlow)" />
                <text x={xPos + 8} y={Math.min(190, standardY + 4)} fill={colors.error} fontSize={9}>{Math.max(0, 100 - (twistOverlayX / 20) * 95).toFixed(0)}%</text>
                <text x={xPos + 8} y={Math.max(16, saY + 4)} fill={colors.success} fontSize={9}>{Math.max(0, 100 - (twistOverlayX / 20) * 95 * (1 - twistSelfAlignedReduction / 100) * 0.85).toFixed(0)}%</text>
              </>
            );
          })()}
        </svg>
      </div>
    );
  };

  const renderControls = (showSelfAligned: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          X Overlay Error: <span style={{ color: '#93c5fd', fontWeight: 700 }}>{overlayX} nm</span>
        </label>
        <input
          type="range"
          min="-20"
          max="20"
          step="1"
          value={overlayX}
          onChange={(e) => setOverlayX(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="X overlay error in nanometers"
        />
        <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
          <strong style={{ color: colors.textSecondary }}>Effect:</strong> Increasing X overlay error shifts the via horizontally. When |X| exceeds the overlay budget (~{((viaSize + contactSize) / 2 - 5).toFixed(0)} nm), the via misses the contact pad, creating an OPEN defect.
        </p>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Y Overlay Error: <span style={{ color: '#93c5fd', fontWeight: 700 }}>{overlayY} nm</span>
        </label>
        <input
          type="range"
          min="-20"
          max="20"
          step="1"
          value={overlayY}
          onChange={(e) => setOverlayY(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Y overlay error in nanometers"
        />
        <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
          <strong style={{ color: colors.textSecondary }}>Effect:</strong> Total overlay = √(X² + Y²). Combined X and Y shifts compound - diagonal errors are worse than single-axis. Both axes must stay within budget simultaneously.
        </p>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Via Size: <span style={{ color: '#fcd34d', fontWeight: 700 }}>{viaSize} nm</span>
        </label>
        <input
          type="range"
          min="10"
          max="40"
          step="2"
          value={viaSize}
          onChange={(e) => setViaSize(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Via size in nanometers"
        />
        <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
          <strong style={{ color: colors.textSecondary }}>Effect:</strong> Larger vias increase overlay budget. Budget ≈ (via + contact)/2 − 5nm. Bigger vias tolerate more error but use more chip area.
        </p>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Contact Pad Size: <span style={{ color: '#fcd34d', fontWeight: 700 }}>{contactSize} nm</span>
        </label>
        <input
          type="range"
          min="15"
          max="50"
          step="2"
          value={contactSize}
          onChange={(e) => setContactSize(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Contact pad size in nanometers"
        />
        <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
          <strong style={{ color: colors.textSecondary }}>Effect:</strong> Larger contact pads provide more landing area for the via. Increasing contact size is one way to relax overlay requirements, but costs area and may violate design rules.
        </p>
      </div>
      {showSelfAligned && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={useSelfAligned} onChange={(e) => setUseSelfAligned(e.target.checked)} style={{ width: '20px', height: '20px' }} />
            Enable Self-Aligned Process (reduces effective overlay by 90%)
          </label>
        </div>
      )}
      <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 700 }}>
          Overlay Budget: ~{((viaSize + contactSize) / 2 - 5).toFixed(0)} nm
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Formula: Budget ≈ (via + contact) / 2 − 5 | Total = √(X² + Y²) | Need &gt;30% overlap
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => { setOverlayX(0); setOverlayY(0); }}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.accent}`,
            background: 'transparent',
            color: colors.accent,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            transition: buttonTransition,
          }}
        >
          Reset Alignment
        </button>
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 800 }}>Overlay Error in Chips</h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '8px', fontWeight: 500 }}>If each layer is off by 5nm, does it matter?</p>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>Explore layer-to-layer alignment in semiconductor manufacturing</p>
        </div>
        {renderVisualization(true)}
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginTop: '16px', marginBottom: '16px' }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
            Imagine stacking printed transparencies with patterns that must connect through tiny holes. If each layer shifts slightly, the holes may not line up! In chips, these <strong style={{ color: colors.accent, fontWeight: 700 }}>vias</strong> connect metal layers and must align within nanometers.
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
            A chip can have 15+ metal layers. What happens when alignment drifts?
          </p>
        </div>
        <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}`, marginBottom: '16px' }}>
          <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 500 }}>
            Use the sliders to shift the layers and see what happens to the via connections!
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={goNext}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: colors.textPrimary,
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${colors.primary}40`,
              transition: buttonTransition,
            }}
          >
            Start Exploring
          </button>
        </div>
      </div>,
      renderBottomNav(false, true, 'Start Exploring')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        {renderVisualization(false)}
        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Multi-Layer Chip Structure:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            Each metal layer is patterned separately. Vias connect one layer to the next. If the via does not land on the contact pad below, the connection fails.
          </p>
        </div>
        <div>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>What happens with a 5nm layer misalignment?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: prediction === p.id ? 600 : 400,
                  transition: buttonTransition,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomNav(true, !!prediction, 'Test My Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700, fontSize: '22px' }}>Discover Overlay Errors</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Shift the layers and observe opens and shorts</p>
        </div>
        {renderVisualization(true)}
        {renderControls()}
        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Find the maximum X shift before an open occurs</li>
            <li>Combine X and Y shifts - note the vector sum matters</li>
            <li>Reduce via and contact sizes - does the margin shrink?</li>
            <li>Note when the status changes from OK to OPEN or SHORT</li>
          </ul>
        </div>
      </div>,
      renderBottomNav(true, true, 'Continue to Review')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'problem';
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ background: wasCorrect ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`, marginBottom: '16px' }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>{wasCorrect ? 'Correct! Small errors matter a lot.' : 'Not Quite - Small errors matter a lot!'}</h3>
          <p style={{ color: colors.textPrimary, fontWeight: 400, lineHeight: 1.5 }}>
            Even small overlay errors matter! A 5nm shift on a 20nm via means 25% of the contact area is lost. Too much shift causes opens or shorts.
          </p>
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Formula: Overlay Budget</h3>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.accent, fontSize: '16px', fontWeight: 700, textAlign: 'center', margin: 0 }}>
              Budget ≈ (via_size + contact_size) / 2 − margin
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
              Total error = √(X² + Y²) &lt; Budget for good contact
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px', textAlign: 'center' }}>
              Contact resistance ∝ 1 / overlap_fraction — resistance increases as alignment worsens
            </p>
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Opens:</strong> When a via does not overlap enough with the contact pad, the electrical connection has very high resistance or fails completely.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Shorts:</strong> When overlay error pushes a via too close to an adjacent structure, they may connect when they should not.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Prediction check:</strong> You predicted &quot;{predictions.find(p => p.id === prediction)?.label || 'nothing'}&quot;. The correct answer is that even small shifts matter because they reduce contact area proportionally to misalignment.</p>
            <p><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Modern requirement:</strong> At 5nm node, overlay must be controlled to &lt;1.5nm across 300mm wafers!</p>
          </div>
        </div>
      </div>,
      renderBottomNav(true, true, 'Next: A Twist!')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>The Twist</h2>
          <p style={{ color: colors.textSecondary, fontWeight: 400 }}>What if we use &quot;self-aligned&quot; processes?</p>
        </div>
        {renderVisualization(false, true)}
        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Self-Aligned Processes:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            In a self-aligned process, the via automatically forms centered on the underlying structure, rather than being positioned by a separate mask. The via &quot;finds&quot; the contact through selective chemistry, reducing effective overlay error by 90%+ dramatically.
          </p>
        </div>
        <div>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>How do self-aligned processes affect overlay tolerance?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: twistPrediction === p.id ? 600 : 400,
                  transition: buttonTransition,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomNav(true, !!twistPrediction, 'Test My Prediction')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Explore Self-Aligned Tolerance</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Adjust overlay and self-alignment reduction to compare tolerance</p>
        </div>
        {renderTwistVisualization()}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Overlay Error X: <span style={{ color: '#93c5fd', fontWeight: 700 }}>{twistOverlayX} nm</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={twistOverlayX}
              onChange={(e) => setTwistOverlayX(parseInt(e.target.value))}
              style={sliderStyle}
              aria-label="Overlay error X for self-aligned comparison"
            />
            <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
              <strong style={{ color: colors.textSecondary }}>Effect:</strong> Increasing overlay error X reduces contact overlap. Watch how the standard process (red) drops much faster than self-aligned (green).
            </p>
          </div>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Self-Aligned Reduction: <span style={{ color: '#86efac', fontWeight: 700 }}>{twistSelfAlignedReduction}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="99"
              step="5"
              value={twistSelfAlignedReduction}
              onChange={(e) => setTwistSelfAlignedReduction(parseInt(e.target.value))}
              style={sliderStyle}
              aria-label="Self-aligned error reduction percentage"
            />
            <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
              <strong style={{ color: colors.textSecondary }}>Effect:</strong> Self-alignment reduces effective overlay error by this percentage. At 90%, a 20nm error becomes only 2nm effective — allowing 10× larger overlay tolerance. The green curve flattens as reduction increases.
            </p>
          </div>
        </div>
        <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}`, margin: '0 0 16px 0' }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Self-aligned processes can reduce effective overlay error by 90% or more! The via automatically centers on the contact. This is why self-aligned contacts (SAC) are essential for advanced nodes.
          </p>
        </div>
      </div>,
      renderBottomNav(true, true, 'See the Explanation')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'better';
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ background: wasCorrect ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`, marginBottom: '16px' }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
          <p style={{ color: colors.textPrimary, fontWeight: 400, lineHeight: 1.5 }}>
            Self-aligned processes dramatically increase overlay tolerance. By making structures automatically align through selective chemistry, effective overlay error is reduced by 90% or more.
          </p>
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Self-Aligned Technology</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Self-Aligned Contacts (SAC):</strong> Contacts to transistor gates automatically center on the gate, regardless of contact mask position. A dielectric cap on the gate prevents shorts.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Self-Aligned Vias (SAV):</strong> Vias form only where metal lines are exposed, automatically aligning to the metal pattern below. Used at 7nm node and below.</p>
            <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Your prediction:</strong> You chose &quot;{twistPredictions.find(p => p.id === twistPrediction)?.label || 'nothing'}&quot;. Self-aligned processes DO tolerate much larger overlay errors — the effective error is reduced by 90%+.</p>
            <p><strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Trade-offs:</strong> Self-aligned processes add complexity and cost, but enable continued scaling where overlay-limited processes would fail at 5nm and below.</p>
          </div>
        </div>
      </div>,
      renderBottomNav(true, true, 'Apply This Knowledge')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const completedCount = transferCompleted.size;
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Real-World Applications</h2>
          <p style={{ color: colors.textSecondary, marginBottom: '8px', fontWeight: 400 }}>Overlay control affects every multi-layer electronic device</p>
          <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 500 }}>App {Math.min(completedCount + 1, 4)} of 4 — Complete all to unlock the test</p>
        </div>
        {transferApplications.map((app, index) => (
          <div
            key={index}
            style={{
              background: colors.bgCard,
              marginBottom: '16px',
              padding: '16px',
              borderRadius: '12px',
              border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              transition: buttonTransition,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.title}</h3>
              {transferCompleted.has(index) && (
                <span style={{ color: colors.success, fontSize: '13px', fontWeight: 600 }}>Complete</span>
              )}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>{app.description}</p>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 700 }}>{app.question}</p>
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
                  fontWeight: 600,
                  transition: buttonTransition,
                }}
              >
                Reveal Answer
              </button>
            ) : (
              <>
                <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400, lineHeight: 1.6 }}>{app.answer}</p>
                </div>
                <button
                  onClick={() => {}}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.success}`,
                    background: 'rgba(74, 222, 128, 0.1)',
                    color: colors.success,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: buttonTransition,
                  }}
                >
                  Got It
                </button>
              </>
            )}
          </div>
        ))}
      </div>,
      renderBottomNav(true, completedCount >= 4, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderWrapper(
        <div style={{ padding: '16px' }}>
          <div style={{ background: testScore >= 8 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>{testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}</h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 800 }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: 400 }}>{testScore >= 8 ? 'You understand overlay errors!' : 'Review the material and try again.'}</p>
          </div>
          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{ background: colors.bgCard, marginBottom: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>Q{qIndex + 1}. {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(74, 222, 128, 0.15)' : userAnswer === oIndex ? 'rgba(248, 113, 113, 0.15)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                    {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>,
        renderBottomNav(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); goToPhase('hook'); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderWrapper(
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
          <span style={{ color: colors.textSecondary, fontWeight: 600 }}>Q{currentTestQuestion + 1} / {testQuestions.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
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
        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</p>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 500 }}>{currentQ.question}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {currentQ.options.map((opt, oIndex) => (
            <button
              key={oIndex}
              onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: testAnswers[currentTestQuestion] === oIndex ? 600 : 400,
                transition: buttonTransition,
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
            disabled={currentTestQuestion === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: currentTestQuestion === 0 ? 'rgba(200,210,220,0.4)' : colors.textPrimary,
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: buttonTransition,
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
                fontWeight: 700,
                transition: buttonTransition,
              }}
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? colors.border : colors.success,
                color: 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                transition: buttonTransition,
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>,
      <div style={{ height: '1px' }} />
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderWrapper(
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#9881;</div>
          <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 800 }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 400 }}>You understand overlay error and alignment</p>
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Overlay error causes opens (missed contacts) and shorts (unintended connections)</li>
            <li>Budget formula: Budget ≈ (via + contact) / 2 − margin</li>
            <li>Vector sum: Total error = √(X² + Y²)</li>
            <li>Overlay budget shrinks proportionally with feature size</li>
            <li>Self-aligned processes reduce effective error by 90%+</li>
            <li>Contact resistance ∝ 1 / overlap_fraction</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
            Advanced overlay metrology uses diffraction-based measurement (scatterometry) with sub-0.1nm precision. Machine learning predicts and corrects for systematic overlay errors across wafers. At 3nm node, overlay must be controlled to under 1.5nm — less than 10 atomic spacings! EUV lithography achieves this through vibration isolation, temperature control to ±0.01°C, and real-time wafer-stage correction.
          </p>
        </div>
        {renderVisualization(true, true)}
      </div>,
      renderBottomNav(true, true, 'Complete Game')
    );
  }

  return null;
};

export default OverlayErrorRenderer;
