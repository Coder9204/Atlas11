import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DesignToFabTranslationRendererProps {
  phase?: Phase; // Optional - for resume functionality
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
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  metal1: '#3b82f6',
  metal2: '#8b5cf6',
  via: '#22c55e',
  poly: '#ef4444',
  diffusion: '#f97316',
  substrate: '#1e293b',
};

const DesignToFabTranslationRenderer: React.FC<DesignToFabTranslationRendererProps> = ({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
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

  // Phase management - internal state
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Design Rules',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const getInitialPhase = (): Phase => {
    if (initialPhase && phaseOrder.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && phaseOrder.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

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
  const [wireLength, setWireLength] = useState(100); // micrometers
  const [wireWidth, setWireWidth] = useState(0.5); // micrometers
  const [metalLayer, setMetalLayer] = useState<1 | 2>(1);
  const [numVias, setNumVias] = useState(2);
  const [spacingRule, setSpacingRule] = useState(0.2); // minimum spacing in um
  const [isViolation, setIsViolation] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Check for spacing violations
  useEffect(() => {
    // Simple violation check based on wire width vs spacing rule
    setIsViolation(wireWidth < spacingRule * 0.8);
  }, [wireWidth, spacingRule]);

  // Physics calculations - Parasitic extraction
  const calculateParasitics = useCallback(() => {
    // Resistivity of copper (ohm-um)
    const rhoCopper = 0.0175;

    // Wire resistance: R = rho * L / (W * t)
    // Assume thickness = 0.3um for metal1, 0.5um for metal2
    const thickness = metalLayer === 1 ? 0.3 : 0.5;
    const resistance = (rhoCopper * wireLength) / (wireWidth * thickness);

    // Wire capacitance (simplified parallel plate model)
    // C = epsilon * area / distance
    const epsilon = 3.9 * 8.85e-6; // SiO2 permittivity in pF/um
    const oxidThickness = 0.2; // um between layers
    const capacitance = epsilon * wireLength * wireWidth / oxidThickness;

    // Via resistance (~0.5 ohm per via typically)
    const viaResistance = numVias * 0.5;

    // Total parasitic delay (RC time constant)
    const totalR = resistance + viaResistance;
    const rcDelay = totalR * capacitance * 1000; // ps

    // Inductance (rough approximation for long wires)
    const inductance = 0.001 * wireLength; // nH

    // Critical frequency where L matters
    const criticalFreq = resistance / (2 * Math.PI * inductance * 1e-9) / 1e9; // GHz

    return {
      resistance: resistance.toFixed(2),
      capacitance: (capacitance * 1000).toFixed(2), // fF
      viaResistance: viaResistance.toFixed(2),
      totalResistance: totalR.toFixed(2),
      rcDelay: rcDelay.toFixed(2),
      inductance: (inductance * 1000).toFixed(2), // pH
      criticalFreq: criticalFreq.toFixed(1),
    };
  }, [wireLength, wireWidth, metalLayer, numVias]);

  const predictions = [
    { id: 'no_effect', label: 'Physical layout doesn\'t matter - only the logical connections count' },
    { id: 'just_delay', label: 'Layout adds some delay but doesn\'t affect functionality' },
    { id: 'parasitics', label: 'Physical geometry creates parasitic R/C/L that can cause failures' },
    { id: 'density', label: 'Only transistor density matters, wiring is negligible' },
  ];

  const twistPredictions = [
    { id: 'fix_layout', label: 'Just fix the spacing - the design will work fine' },
    { id: 'need_redesign', label: 'May need to redesign the circuit to accommodate spacing rules' },
    { id: 'ignore_rule', label: 'Spacing rules are conservative - we can violate them slightly' },
    { id: 'no_impact', label: 'Manufacturing rules don\'t affect circuit performance' },
  ];

  const transferApplications = [
    {
      title: 'High-Speed Serial Links',
      description: 'PCIe and USB4 run at 16-40 Gbps, where wire parasitics dominate timing.',
      question: 'Why do high-speed chip layouts use "controlled impedance" routing?',
      answer: 'At GHz frequencies, wires act as transmission lines. Impedance mismatches cause reflections that corrupt signals. Designers carefully control wire width, spacing, and layer stack-up to maintain 50-ohm impedance, matching the driver and receiver. Parasitic extraction verifies the actual impedance matches design intent.',
    },
    {
      title: 'DRAM Memory Timing',
      description: 'Modern DDR5 memory runs at 4800-8400 MT/s with picosecond timing margins.',
      question: 'How do parasitic capacitances affect memory array design?',
      answer: 'Each bitline in DRAM has ~100fF parasitic capacitance from wiring. This must charge/discharge within ~1ns. The parasitic C directly sets the minimum transistor size (to provide enough current) and limits array size. Memory designers spend months optimizing layouts to minimize bitline capacitance.',
    },
    {
      title: 'RF Circuit Design',
      description: 'WiFi and 5G chips operate at 2.4-28 GHz where every picohenry matters.',
      question: 'Why do RF layouts look radically different from digital layouts?',
      answer: 'At RF frequencies, wire inductance creates significant impedance (Z = 2*pi*f*L). A 100pH wire at 28GHz has 17 ohms of impedance! RF designers use short, wide traces and carefully model all parasitic L. The layout IS the circuit - you can\'t separate schematic from physical design.',
    },
    {
      title: 'Power Delivery Networks',
      description: 'CPUs draw 100+ amps at <1V, requiring careful power grid design.',
      question: 'How do IR drops from parasitic resistance affect chip operation?',
      answer: 'With 100A through 10 mohm of parasitic resistance, voltage drops 1V across the chip! This can cause logic failures in far corners. Designers use thick top metals (10x thicker than signal wires), massive via arrays, and on-chip capacitors. Power grid analysis is often the longest step in chip signoff.',
    },
  ];

  const testQuestions = [
    {
      question: 'What are "parasitics" in integrated circuit design?',
      options: [
        { text: 'Intentional circuit elements added for protection', correct: false },
        { text: 'Unwanted R, L, and C that arise from physical layout geometry', correct: true },
        { text: 'Defects introduced during manufacturing', correct: false },
        { text: 'Power consumed by inactive circuits', correct: false },
      ],
    },
    {
      question: 'Wire resistance in a metal interconnect depends on:',
      options: [
        { text: 'Only the length of the wire', correct: false },
        { text: 'Length, width, thickness, and material resistivity', correct: true },
        { text: 'Only the operating voltage', correct: false },
        { text: 'The number of transistors it connects', correct: false },
      ],
    },
    {
      question: 'The RC time constant of a wire affects circuit speed because:',
      options: [
        { text: 'It determines the voltage drop across the wire', correct: false },
        { text: 'It sets the minimum time for signal transitions to complete', correct: true },
        { text: 'It controls the power consumption of the wire', correct: false },
        { text: 'It limits the number of connections possible', correct: false },
      ],
    },
    {
      question: 'Vias in IC layouts contribute to:',
      options: [
        { text: 'Only visual appearance of the layout', correct: false },
        { text: 'Additional resistance and potential reliability issues', correct: true },
        { text: 'Reducing parasitic capacitance', correct: false },
        { text: 'Increasing wire inductance', correct: false },
      ],
    },
    {
      question: 'Design Rule Check (DRC) violations typically indicate:',
      options: [
        { text: 'The circuit will definitely fail electrically', correct: false },
        { text: 'The layout may not manufacture correctly', correct: true },
        { text: 'The schematic has logical errors', correct: false },
        { text: 'The power consumption is too high', correct: false },
      ],
    },
    {
      question: 'Why do upper metal layers in a chip tend to be thicker?',
      options: [
        { text: 'They are less critical for timing', correct: false },
        { text: 'To reduce resistance for long global wires and power distribution', correct: true },
        { text: 'Manufacturing is easier with thicker metals', correct: false },
        { text: 'They need more current capacity for logic gates', correct: false },
      ],
    },
    {
      question: 'Parasitic inductance becomes important at high frequencies because:',
      options: [
        { text: 'Inductance increases with frequency', correct: false },
        { text: 'Inductive impedance (2*pi*f*L) increases with frequency', correct: true },
        { text: 'Resistance decreases at high frequency', correct: false },
        { text: 'Capacitance is negligible at high frequency', correct: false },
      ],
    },
    {
      question: 'The minimum spacing rule between wires exists to:',
      options: [
        { text: 'Make the layout easier to read', correct: false },
        { text: 'Ensure reliable manufacturing without shorts', correct: true },
        { text: 'Reduce parasitic capacitance', correct: false },
        { text: 'Minimize power consumption', correct: false },
      ],
    },
    {
      question: 'Signal integrity issues in chip layouts are primarily caused by:',
      options: [
        { text: 'Incorrect transistor sizing', correct: false },
        { text: 'Parasitic R/L/C interactions causing delay, crosstalk, and reflections', correct: true },
        { text: 'Manufacturing defects only', correct: false },
        { text: 'Software bugs in the design tools', correct: false },
      ],
    },
    {
      question: 'A parasitic extractor tool is used to:',
      options: [
        { text: 'Remove unwanted parasitics from the layout', correct: false },
        { text: 'Calculate the R, L, C values from physical layout geometry', correct: true },
        { text: 'Check for design rule violations', correct: false },
        { text: 'Optimize transistor placement', correct: false },
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

  const renderVisualization = (interactive: boolean, showSpacingRule: boolean = false) => {
    const width = 500;
    const height = 520;
    const parasitics = calculateParasitics();

    // Layout dimensions
    const layoutX = 50;
    const layoutY = 60;
    const layoutW = 400;
    const layoutH = 180;

    // Wire visualization
    const wireY1 = layoutY + 50;
    const wireY2 = layoutY + 120;
    const scaledWidth = Math.max(5, wireWidth * 20);

    // Cross-section dimensions
    const crossSectionY = 280;
    const crossSectionH = 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="fabBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Grid pattern */}
            <pattern id="fabGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#475569" strokeWidth="0.3" opacity="0.4" />
            </pattern>

            {/* Metal 1 layer gradient - copper tones with 5 stops */}
            <linearGradient id="fabMetal1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Metal 2 layer gradient - purple tones with 5 stops */}
            <linearGradient id="fabMetal2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="25%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="75%" stopColor="#7e22ce" />
              <stop offset="100%" stopColor="#6b21a8" />
            </linearGradient>

            {/* Via gradient - green with metallic sheen */}
            <linearGradient id="fabViaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Substrate layer gradient */}
            <linearGradient id="fabSubstrateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Oxide layer gradient */}
            <linearGradient id="fabOxideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
            </linearGradient>

            {/* Polysilicon gate gradient */}
            <linearGradient id="fabPolyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Diffusion layer gradient */}
            <linearGradient id="fabDiffusionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Mask pattern gradient */}
            <linearGradient id="fabMaskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Premium wire glow filter */}
            <filter id="fabWireGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Via glow filter */}
            <filter id="fabViaGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Error glow filter for DRC violations */}
            <filter id="fabErrorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Success glow filter */}
            <filter id="fabSuccessGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="fabInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="black" floodOpacity="0.3" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>

            {/* Process step indicator glow */}
            <filter id="fabProcessGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium dark background */}
          <rect width={width} height={height} fill="url(#fabBgGradient)" />

          {/* Layout area with grid */}
          <rect x={layoutX} y={layoutY} width={layoutW} height={layoutH} fill="url(#fabSubstrateGrad)" rx={6} filter="url(#fabInnerShadow)" />
          <rect x={layoutX} y={layoutY} width={layoutW} height={layoutH} fill="url(#fabGridPattern)" rx={6} />

          {/* Wire 1 (horizontal) */}
          <rect
            x={layoutX + 10}
            y={wireY1}
            width={wireLength * 2}
            height={scaledWidth}
            fill={metalLayer === 1 ? 'url(#fabMetal1Grad)' : 'url(#fabMetal2Grad)'}
            rx={2}
            filter={isViolation && showSpacingRule ? 'url(#fabErrorGlow)' : 'url(#fabWireGlow)'}
          />

          {/* Wire 2 (horizontal, below) */}
          <rect
            x={layoutX + 30}
            y={wireY2}
            width={wireLength * 1.5}
            height={scaledWidth}
            fill={metalLayer === 1 ? 'url(#fabMetal1Grad)' : 'url(#fabMetal2Grad)'}
            rx={2}
            filter={isViolation && showSpacingRule ? 'url(#fabErrorGlow)' : 'url(#fabWireGlow)'}
          />

          {/* Vertical connecting wire with vias */}
          <rect
            x={layoutX + 10 + wireLength * 2 - scaledWidth}
            y={wireY1}
            width={scaledWidth}
            height={wireY2 - wireY1 + scaledWidth}
            fill={metalLayer === 1 ? 'url(#fabMetal2Grad)' : 'url(#fabMetal1Grad)'}
            rx={2}
            filter="url(#fabWireGlow)"
          />

          {/* Vias with premium styling */}
          {[...Array(numVias)].map((_, i) => (
            <g key={`via${i}`}>
              <rect
                x={layoutX + 10 + wireLength * 2 - scaledWidth + 2}
                y={wireY1 + 2 + i * 18}
                width={Math.max(4, scaledWidth - 4)}
                height={Math.max(4, scaledWidth - 4)}
                fill="url(#fabViaGrad)"
                rx={1}
                filter="url(#fabViaGlow)"
              />
            </g>
          ))}

          {/* Spacing rule violation indicator */}
          {showSpacingRule && (
            <g>
              {/* Spacing measurement line */}
              <line
                x1={layoutX + 10}
                y1={wireY1 + scaledWidth + 8}
                x2={layoutX + 30}
                y2={wireY1 + scaledWidth + 8}
                stroke={isViolation ? colors.error : colors.success}
                strokeWidth={2}
                strokeDasharray={isViolation ? '5,3' : 'none'}
                filter={isViolation ? 'url(#fabErrorGlow)' : 'url(#fabSuccessGlow)'}
              />

              {/* Minimum spacing rule indicator */}
              <line
                x1={layoutX + layoutW - 60}
                y1={wireY1}
                x2={layoutX + layoutW - 60}
                y2={wireY1 + spacingRule * 50}
                stroke={colors.warning}
                strokeWidth={3}
                filter="url(#fabProcessGlow)"
              />
              <circle
                cx={layoutX + layoutW - 60}
                cy={wireY1}
                r={4}
                fill={colors.warning}
                filter="url(#fabProcessGlow)"
              />
              <circle
                cx={layoutX + layoutW - 60}
                cy={wireY1 + spacingRule * 50}
                r={4}
                fill={colors.warning}
                filter="url(#fabProcessGlow)"
              />
            </g>
          )}

          {/* Cross-section view */}
          <g transform={`translate(${layoutX}, ${crossSectionY})`}>
            {/* Section label - moved outside SVG via typo system below */}

            {/* Silicon substrate */}
            <rect x={0} y={crossSectionH - 20} width={layoutW} height={20} fill="url(#fabSubstrateGrad)" rx={2} />

            {/* Oxide layers */}
            <rect x={0} y={crossSectionH - 45} width={layoutW} height={25} fill="url(#fabOxideGrad)" rx={2} />
            <rect x={0} y={crossSectionH - 70} width={layoutW} height={25} fill="url(#fabOxideGrad)" opacity={0.7} rx={2} />

            {/* Diffusion regions */}
            <rect x={40} y={crossSectionH - 25} width={60} height={10} fill="url(#fabDiffusionGrad)" rx={2} filter="url(#fabWireGlow)" />
            <rect x={150} y={crossSectionH - 25} width={60} height={10} fill="url(#fabDiffusionGrad)" rx={2} filter="url(#fabWireGlow)" />

            {/* Polysilicon gate */}
            <rect x={90} y={crossSectionH - 35} width={40} height={15} fill="url(#fabPolyGrad)" rx={2} filter="url(#fabWireGlow)" />

            {/* Metal 1 layer */}
            <rect x={30} y={crossSectionH - 55} width={80} height={10} fill="url(#fabMetal1Grad)" rx={2} filter="url(#fabWireGlow)" />
            <rect x={160} y={crossSectionH - 55} width={80} height={10} fill="url(#fabMetal1Grad)" rx={2} filter="url(#fabWireGlow)" />

            {/* Metal 2 layer */}
            <rect x={50} y={crossSectionH - 80} width={150} height={12} fill="url(#fabMetal2Grad)" rx={2} filter="url(#fabWireGlow)" />

            {/* Vias connecting layers */}
            <rect x={55} y={crossSectionH - 68} width={8} height={15} fill="url(#fabViaGrad)" rx={1} filter="url(#fabViaGlow)" />
            <rect x={180} y={crossSectionH - 68} width={8} height={15} fill="url(#fabViaGrad)" rx={1} filter="url(#fabViaGlow)" />

            {/* Contacts to diffusion */}
            <rect x={60} y={crossSectionH - 45} width={6} height={12} fill="url(#fabViaGrad)" rx={1} filter="url(#fabViaGlow)" />
            <rect x={170} y={crossSectionH - 45} width={6} height={12} fill="url(#fabViaGrad)" rx={1} filter="url(#fabViaGlow)" />

            {/* Contact to gate */}
            <rect x={105} y={crossSectionH - 45} width={6} height={10} fill="url(#fabViaGrad)" rx={1} filter="url(#fabViaGlow)" />

            {/* Mask visualization (when spacing rule shown) */}
            {showSpacingRule && (
              <g>
                <rect x={280} y={0} width={100} height={crossSectionH - 5} fill="url(#fabMaskGrad)" rx={4} stroke={colors.warning} strokeWidth={1} strokeDasharray="4,2" />
                {/* Mask apertures */}
                <rect x={290} y={20} width={30} height={25} fill="url(#fabBgGradient)" rx={2} />
                <rect x={340} y={20} width={30} height={25} fill="url(#fabBgGradient)" rx={2} />
                <rect x={305} y={55} width={40} height={20} fill="url(#fabBgGradient)" rx={2} />
              </g>
            )}
          </g>

          {/* Process step indicators */}
          <g transform={`translate(${layoutX + layoutW + 20}, ${layoutY})`}>
            {/* Process flow arrows */}
            {['Diffusion', 'Poly Gate', 'Metal 1', 'Via', 'Metal 2'].map((step, i) => (
              <g key={step} transform={`translate(0, ${i * 28})`}>
                <circle
                  cx={8}
                  cy={8}
                  r={6}
                  fill={i <= (metalLayer === 1 ? 2 : 4) ? (i === (metalLayer === 1 ? 2 : 4) ? colors.accent : colors.success) : colors.textMuted}
                  filter={i === (metalLayer === 1 ? 2 : 4) ? 'url(#fabProcessGlow)' : undefined}
                />
                {i < 4 && (
                  <line
                    x1={8}
                    y1={14}
                    x2={8}
                    y2={28}
                    stroke={i < (metalLayer === 1 ? 2 : 4) ? colors.success : colors.textMuted}
                    strokeWidth={2}
                    strokeDasharray={i >= (metalLayer === 1 ? 2 : 4) ? '2,2' : 'none'}
                  />
                )}
              </g>
            ))}
          </g>

          {/* Timing impact visualization */}
          <g transform={`translate(${layoutX}, ${crossSectionY + crossSectionH + 15})`}>
            <rect x={0} y={10} width={layoutW} height={35} fill="rgba(0,0,0,0.4)" rx={6} />

            {/* Ideal signal */}
            <path
              d="M 15,38 L 15,18 L 90,18 L 90,38 L 180,38 L 180,18 L 270,18 L 270,38 L 360,38"
              fill="none"
              stroke={colors.success}
              strokeWidth={2}
              opacity={0.6}
            />

            {/* Actual signal with RC delay */}
            <path
              d={`M 15,38 Q 25,38 ${25 + parseFloat(parasitics.rcDelay) * 0.4},18 L 90,18
                  Q 100,18 ${100 + parseFloat(parasitics.rcDelay) * 0.4},38 L 180,38
                  Q 190,38 ${190 + parseFloat(parasitics.rcDelay) * 0.4},18 L 270,18
                  Q 280,18 ${280 + parseFloat(parasitics.rcDelay) * 0.4},38 L 360,38`}
              fill="none"
              stroke={colors.error}
              strokeWidth={2}
              filter="url(#fabErrorGlow)"
            />
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '550px',
          padding: '0 16px',
          marginTop: '-8px'
        }}>
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: typo.label,
              color: colors.accent,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              IC Layout View - {metalLayer === 1 ? 'Metal 1' : 'Metal 2'} Layer
            </span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <span style={{
              fontSize: typo.label,
              color: colors.textMuted,
              fontWeight: 600
            }}>
              Cross-Section View
            </span>
          </div>
        </div>

        {/* Parasitic values panel outside SVG */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: typo.elementGap,
          width: '100%',
          maxWidth: '550px',
          padding: typo.cardPadding,
          background: colors.bgCard,
          borderRadius: '8px',
          marginTop: typo.elementGap,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px' }}>Wire R</div>
            <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 700 }}>{parasitics.resistance} ohm</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px' }}>Capacitance</div>
            <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 700 }}>{parasitics.capacitance} fF</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px' }}>RC Delay</div>
            <div style={{ fontSize: typo.body, color: colors.warning, fontWeight: 700 }}>{parasitics.rcDelay} ps</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px' }}>Via R</div>
            <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 700 }}>{parasitics.viaResistance} ohm</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px' }}>Inductance</div>
            <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 700 }}>{parasitics.inductance} pH</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px' }}>L Critical</div>
            <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 700 }}>{parasitics.criticalFreq} GHz</div>
          </div>
        </div>

        {/* Spacing rule status */}
        {showSpacingRule && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: typo.elementGap,
            padding: typo.cardPadding,
            background: isViolation ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            borderRadius: '8px',
            borderLeft: `4px solid ${isViolation ? colors.error : colors.success}`,
            width: '100%',
            maxWidth: '550px',
          }}>
            <span style={{ fontSize: typo.body, color: isViolation ? colors.error : colors.success, fontWeight: 700 }}>
              {isViolation ? 'DRC VIOLATION' : 'DRC PASSED'}
            </span>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>
              Min spacing: {spacingRule.toFixed(2)}um
            </span>
          </div>
        )}

        {/* Legend outside SVG */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: typo.elementGap,
          justifyContent: 'center',
          width: '100%',
          maxWidth: '550px',
        }}>
          {[
            { label: 'Metal 1', color: colors.metal1 },
            { label: 'Metal 2', color: colors.metal2 },
            { label: 'Via', color: colors.via },
            { label: 'Poly', color: colors.poly },
            { label: 'Diffusion', color: colors.diffusion },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>{label}</span>
            </div>
          ))}
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setMetalLayer(metalLayer === 1 ? 2 : 1)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: metalLayer === 1 ? `linear-gradient(135deg, ${colors.metal1} 0%, #1d4ed8 100%)` : `linear-gradient(135deg, ${colors.metal2} 0%, #6d28d9 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                boxShadow: `0 4px 12px ${metalLayer === 1 ? colors.metal1 : colors.metal2}40`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Layer: M{metalLayer}
            </button>
            <button
              onClick={() => { setWireLength(100); setWireWidth(0.5); setNumVias(2); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
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

  const renderControls = (showSpacingRule: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Length: {wireLength} um
        </label>
        <input
          type="range"
          min="20"
          max="200"
          step="10"
          value={wireLength}
          onChange={(e) => setWireLength(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Width: {wireWidth.toFixed(2)} um
        </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={wireWidth}
          onChange={(e) => setWireWidth(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of Vias: {numVias}
        </label>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          value={numVias}
          onChange={(e) => setNumVias(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showSpacingRule && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Minimum Spacing Rule: {spacingRule.toFixed(2)} um
          </label>
          <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.05"
            value={spacingRule}
            onChange={(e) => setSpacingRule(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: isViolation && showSpacingRule ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${isViolation && showSpacingRule ? colors.error : colors.metal1}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          R = rho x L / (W x t) = 0.0175 x {wireLength} / ({wireWidth} x {metalLayer === 1 ? 0.3 : 0.5})
        </div>
        <div style={{ color: colors.textPrimary, fontSize: '14px', marginTop: '4px', fontWeight: 'bold' }}>
          Wire R = {calculateParasitics().resistance} ohm | RC Delay = {calculateParasitics().rcDelay} ps
        </div>
        {isViolation && showSpacingRule && (
          <div style={{ color: colors.error, fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>
            Warning: Wire width violates minimum spacing rule!
          </div>
        )}
      </div>
    </div>
  );

  // Real-world applications data
  const realWorldApps = [
    {
      icon: '🔲',
      title: 'ASIC Design Flow',
      short: 'Custom Chips',
      tagline: 'From RTL to silicon in 12-18 months',
      description: 'Application-Specific Integrated Circuits (ASICs) are custom-designed chips optimized for specific tasks. The design-to-fabrication translation is the most critical phase, where abstract logic becomes physical geometry that must meet timing, power, and manufacturability constraints.',
      connection: 'The parasitic extraction and DRC concepts you learned are performed millions of times during ASIC tapeout. A single DRC violation can delay production by months and cost millions in re-spins.',
      howItWorks: 'ASIC design starts with RTL (Register Transfer Level) code, which is synthesized into gates, then placed and routed into physical layout. Parasitic extraction generates a SPEF (Standard Parasitic Exchange Format) file containing R/C values for every net. This feeds into timing analysis to verify the chip meets speed targets.',
      stats: [
        { label: 'Design Cost', value: '$50-500M', detail: 'Full custom ASIC at advanced nodes' },
        { label: 'Tapeout Time', value: '12-18 months', detail: 'RTL to GDS2 handoff' },
        { label: 'Parasitic Nets', value: '1B+', detail: 'Extraction points per chip' },
      ],
      examples: [
        'Apple M-series chips - custom ARM cores with integrated GPU, neural engine',
        'Google TPU - tensor processing optimized for AI workloads',
        'Bitcoin mining ASICs - SHA-256 hash computation at maximum efficiency',
        'Cisco network processors - packet routing at terabit speeds',
      ],
      companies: ['Apple', 'Google', 'Amazon (Graviton)', 'Tesla (FSD Chip)', 'Bitmain'],
      futureImpact: 'As Moores Law slows, ASIC design becomes more critical for achieving performance gains. Domain-specific accelerators will dominate, requiring engineers who understand the full design-to-fab flow.',
      color: '#3b82f6',
    },
    {
      icon: '🧩',
      title: 'FPGA Development',
      short: 'Programmable Logic',
      tagline: 'Reconfigurable hardware for rapid prototyping',
      description: 'Field-Programmable Gate Arrays contain millions of configurable logic blocks connected by programmable interconnects. Understanding wire parasitics is crucial because FPGA routing dominates timing - the same logic placed differently can run at vastly different speeds.',
      connection: 'FPGA place-and-route tools perform the same parasitic-aware optimization you explored. The routing resources have known R/C characteristics, and timing closure requires understanding how wire length affects delay.',
      howItWorks: 'FPGA synthesis maps HDL code to Look-Up Tables (LUTs) and flip-flops. The place-and-route tool assigns logic to specific tiles and routes signals through the programmable interconnect matrix. Each routing segment has characterized parasitics, and the tool iteratively optimizes placement to meet timing.',
      stats: [
        { label: 'Logic Cells', value: '5M+', detail: 'In high-end FPGAs' },
        { label: 'Routing Delay', value: '60-80%', detail: 'Of total path delay' },
        { label: 'Reconfig Time', value: '<100ms', detail: 'Full device reprogram' },
      ],
      examples: [
        'Data center SmartNICs - programmable network acceleration',
        'Broadcast video processing - real-time 8K encoding/decoding',
        'Radar/sonar systems - adaptive signal processing',
        'Quantitative trading - sub-microsecond market data processing',
      ],
      companies: ['AMD/Xilinx', 'Intel/Altera', 'Lattice', 'Microchip', 'Efinix'],
      futureImpact: 'FPGAs are becoming the platform for AI inference at the edge, enabling hardware that adapts to evolving neural network architectures without chip redesign.',
      color: '#8b5cf6',
    },
    {
      icon: '🔌',
      title: 'PCB Manufacturing',
      short: 'Circuit Boards',
      tagline: 'Connecting chips with controlled impedance',
      description: 'Printed Circuit Boards connect ICs with copper traces on laminated substrates. At multi-gigabit speeds, PCB traces exhibit transmission line behavior where parasitic L and C determine characteristic impedance. Impedance mismatches cause reflections that corrupt signals.',
      connection: 'The same R/L/C extraction principles apply at the PCB level, but at larger scales. A 50-ohm trace requires specific width-to-height ratios, and via transitions between layers need careful modeling to avoid signal integrity problems.',
      howItWorks: 'PCB design tools calculate trace impedance from geometry (width, thickness, dielectric height) and material properties (Dk, Df). Designers route differential pairs with matched lengths, add ground vias for return current, and simulate S-parameters to verify signal integrity. Manufacturing tolerances directly affect parasitic values.',
      stats: [
        { label: 'Layer Count', value: '20-50', detail: 'In server motherboards' },
        { label: 'Trace Width', value: '75-100μm', detail: 'Minimum for high-speed' },
        { label: 'Via Stub Effect', value: '>5GHz', detail: 'Requires back-drilling' },
      ],
      examples: [
        'DDR5 memory channels - 4800-8400 MT/s with tight timing margins',
        'PCIe Gen5/Gen6 backplanes - 32-64 GT/s per lane',
        '5G mmWave antennas - 28GHz signals on PCB substrates',
        'Automotive radar modules - 77GHz with laminate antenna arrays',
      ],
      companies: ['TTM Technologies', 'AT&S', 'Unimicron', 'Ibiden', 'Shinko'],
      futureImpact: 'PCB technology is evolving toward embedded components (capacitors/resistors inside layers) and glass substrates for lower loss at mmWave frequencies.',
      color: '#22c55e',
    },
    {
      icon: '📦',
      title: '3D IC Packaging',
      short: 'Advanced Packaging',
      tagline: 'Stacking dies for heterogeneous integration',
      description: '3D IC packaging stacks multiple silicon dies vertically with Through-Silicon Vias (TSVs) or bonds them side-by-side on silicon interposers. This creates new parasitic challenges: TSVs add capacitance and stress, interposer traces have different characteristics than on-chip metal, and thermal coupling affects performance.',
      connection: 'Advanced packaging extends parasitic extraction beyond single chips. Engineers must model TSV arrays (each adding ~50fF), micro-bump connections, and interposer RDL (redistribution layers). The design-to-fab translation now spans multiple dies and substrates.',
      howItWorks: 'Chiplets (smaller dies with specific functions) are designed with standardized interfaces like UCIe. The package designer places dies on an interposer, routes power/signals through RDL layers, and connects to the substrate with micro-bumps. Full-system parasitic extraction captures die-to-die coupling and package-level resonances.',
      stats: [
        { label: 'TSV Pitch', value: '9-36μm', detail: 'Density vs. stress tradeoff' },
        { label: 'Micro-bump', value: '25-55μm', detail: 'Pitch for HBM memory' },
        { label: 'Interposer Size', value: '2500mm²', detail: 'Largest production reticle' },
      ],
      examples: [
        'AMD MI300 - CPU + GPU + HBM3 in single package',
        'Apple M2 Ultra - two M2 Max dies with UltraFusion interconnect',
        'NVIDIA H100 - GPU with HBM3 on CoWoS interposer',
        'Intel Ponte Vecchio - 47 chiplets with EMIB and Foveros',
      ],
      companies: ['TSMC (CoWoS/InFO)', 'Intel (EMIB/Foveros)', 'Samsung (I-Cube)', 'ASE', 'Amkor'],
      futureImpact: 'Chiplet-based design enables mixing process nodes (3nm logic + mature analog) and reduces design cost by reusing proven IP blocks. This is the future of high-performance computing.',
      color: '#f59e0b',
    },
  ];

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
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

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    const handleNext = () => {
      if (!canProceed) return;
      if (onNext) {
        onNext();
      } else {
        goNext();
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={handleNext}
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
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              If the Schematic is Correct, Can the Chip Still Fail?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              When geometry becomes physics
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
                A circuit schematic shows ideal connections: perfect wires with zero resistance.
                But in a real chip, wires have length, width, and thickness. They have resistance.
                They have capacitance to nearby wires. At high frequencies, they even have inductance!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                These "parasitic" effects can make a correct schematic fail as a real chip.
              </p>
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.metal1}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Adjust wire dimensions and see how parasitics change the timing!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You've designed a logic circuit that works perfectly in simulation.
              Now you need to translate it into physical layout - actual metal wires on silicon.
              Two wires need to cross, requiring different metal layers and vias to connect them.
              What could go wrong?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens when you translate a schematic to physical layout?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Parasitic Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust wire geometry and see how R, C, L change
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
              <li>Double the wire length - how does RC delay change?</li>
              <li>Make the wire wider - what happens to resistance?</li>
              <li>Add more vias - does it help or hurt?</li>
              <li>Switch between Metal 1 and Metal 2 layers</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'parasitics';

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
              Physical geometry creates parasitic R, C, and L that don't exist in the schematic.
              These parasitics add delay, cause crosstalk, and can even cause complete failure!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>From Schematic to Silicon</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resistance (R):</strong> Every wire has
                resistance proportional to length/(width x thickness). Long, thin wires have high R.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Capacitance (C):</strong> Wires form
                capacitors with the substrate and adjacent wires. More area = more capacitance.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Inductance (L):</strong> At GHz frequencies,
                wire loops create significant inductance. Long wires act like transmission lines.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>RC Delay:</strong> The product RC sets the
                time constant for signal transitions. A 10 ohm wire with 100fF capacitance has 1ps RC delay.
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
              A manufacturing spacing rule breaks your layout!
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Problem:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You've optimized your wire width for minimum RC delay. But the fab just
              updated their design rules - the minimum spacing between wires increased
              from 0.14um to 0.20um. Your carefully optimized layout now has DRC violations!
              What do you do?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How should you handle this manufacturing rule change?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Navigate Design Rules</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust wire width to fix violations while minimizing RC impact
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Design Trade-offs:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Narrower wires have higher resistance but allow tighter spacing.
              Wider wires have lower R but more capacitance. Finding the optimal
              width for your target delay is a key part of physical design!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'need_redesign';

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
              Manufacturing rules reflect physical reality - violating them causes defects!
              When rules change, you may need to redesign circuits with more timing margin.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Design for Manufacturing</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DRC Rules:</strong> Design Rule Checks
                ensure layouts can be manufactured. Minimum width, spacing, and enclosure rules
                prevent shorts and opens during lithography and etching.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Process Corners:</strong> Real chips
                have manufacturing variation. Designers simulate worst-case combinations of
                "slow" and "fast" process conditions to ensure functionality.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Design Margin:</strong> Smart designers
                include extra timing margin (10-20%) to absorb rule changes and process variation.
                It's better to be slightly suboptimal than to fail manufacturing!
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
              Parasitic extraction is critical across all chip designs
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
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.metal1, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
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
                {testScore >= 8 ? 'You understand design-to-fab translation!' : 'Review the material and try again.'}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand design-to-fabrication translation</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Physical layout creates parasitic R, C, L not in schematics</li>
              <li>Wire resistance = rho x L / (W x t)</li>
              <li>RC delay limits signal transition speed</li>
              <li>Vias add resistance and reliability concerns</li>
              <li>Design rules ensure manufacturability</li>
              <li>Trade-offs between performance and manufacturing</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.metal1, marginBottom: '12px' }}>The Full Picture:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern chip design is 80% physical design - translating logical function into
              manufacturable geometry. Parasitic extraction and analysis runs for days on
              billion-transistor chips. Your understanding of this physics bridges the gap
              between circuit theory and working silicon!
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

export default DesignToFabTranslationRenderer;
