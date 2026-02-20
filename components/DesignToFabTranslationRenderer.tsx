import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DesignToFabTranslationRendererProps {
  phase?: Phase;
  gamePhase?: Phase;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148, 163, 184, 0.7)',
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
  border: 'rgba(255,255,255,0.15)',
};

const DesignToFabTranslationRenderer: React.FC<DesignToFabTranslationRendererProps> = ({
  phase: initialPhase,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): Phase => {
    const p = gamePhase || initialPhase;
    if (p && phaseOrder.includes(p)) return p;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  useEffect(() => {
    const p = gamePhase || initialPhase;
    if (p && phaseOrder.includes(p) && p !== phase) {
      setPhase(p);
    }
  }, [gamePhase, initialPhase]);

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
  const [wireLength, setWireLength] = useState(100);
  const [wireWidth, setWireWidth] = useState(0.5);
  const [metalLayer, setMetalLayer] = useState<1 | 2>(1);
  const [numVias, setNumVias] = useState(2);
  const [spacingRule, setSpacingRule] = useState(0.2);
  const [isViolation, setIsViolation] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferApp, setTransferApp] = useState(0);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testConfirmed, setTestConfirmed] = useState<boolean[]>(new Array(10).fill(false));

  useEffect(() => {
    setIsViolation(wireWidth < spacingRule * 0.8);
  }, [wireWidth, spacingRule]);

  const calculateParasitics = useCallback(() => {
    const rhoCopper = 0.0175;
    const thickness = metalLayer === 1 ? 0.3 : 0.5;
    const resistance = (rhoCopper * wireLength) / (wireWidth * thickness);
    const epsilon = 3.9 * 8.85e-6;
    const oxidThickness = 0.2;
    const capacitance = epsilon * wireLength * wireWidth / oxidThickness;
    const viaResistance = numVias * 0.5;
    const totalR = resistance + viaResistance;
    const rcDelay = totalR * capacitance * 1000;
    const inductance = 0.001 * wireLength;
    const criticalFreq = resistance / (2 * Math.PI * inductance * 1e-9) / 1e9;
    return {
      resistance: resistance.toFixed(2),
      capacitance: (capacitance * 1000).toFixed(2),
      viaResistance: viaResistance.toFixed(2),
      totalResistance: totalR.toFixed(2),
      rcDelay: rcDelay.toFixed(2),
      inductance: (inductance * 1000).toFixed(2),
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
    { id: 'fix_layout', label: 'Just fix the spacing - the design will work fine after adjustment' },
    { id: 'need_redesign', label: 'May need to redesign the circuit to accommodate new spacing rules' },
    { id: 'ignore_rule', label: 'Spacing rules are conservative - we can violate them slightly' },
    { id: 'no_impact', label: 'Manufacturing rules don\'t affect circuit performance at all' },
  ];

  const transferApplications = [
    {
      title: 'High-Speed Serial Links',
      description: 'PCIe and USB4 run at 16-40 Gbps, where wire parasitics dominate timing. At these data rates, every picohenry of inductance and femtofarad of capacitance affects signal integrity. Engineers must use controlled impedance routing to maintain signal quality across the entire link from transmitter to receiver.',
      question: 'Why do high-speed chip layouts use "controlled impedance" routing?',
      answer: 'At GHz frequencies, wires act as transmission lines. Impedance mismatches cause reflections that corrupt signals. Designers carefully control wire width, spacing, and layer stack-up to maintain 50-ohm impedance, matching the driver and receiver. Parasitic extraction verifies the actual impedance matches design intent.',
      stats: [
        { label: 'Data Rate', value: '32 GT/s' },
        { label: 'Impedance', value: '50 ohm' },
        { label: 'Loss Budget', value: '28 dB' },
      ],
    },
    {
      title: 'DRAM Memory Timing',
      description: 'Modern DDR5 memory runs at 4800-8400 MT/s with picosecond timing margins. Each bitline in DRAM has approximately 100fF parasitic capacitance from wiring, which must charge and discharge within roughly 1ns. The memory array design is dominated by these parasitic effects.',
      question: 'How do parasitic capacitances affect memory array design?',
      answer: 'Each bitline in DRAM has ~100fF parasitic capacitance from wiring. This must charge/discharge within ~1ns. The parasitic C directly sets the minimum transistor size (to provide enough current) and limits array size. Memory designers spend months optimizing layouts to minimize bitline capacitance.',
      stats: [
        { label: 'Speed', value: '8400 MT/s' },
        { label: 'Bitline C', value: '100 fF' },
        { label: 'Timing', value: '1 ns' },
      ],
    },
    {
      title: 'RF Circuit Design',
      description: 'WiFi 6E and 5G chips operate at 2.4-28 GHz where every picohenry matters. At these radio frequencies, wire inductance creates significant impedance. A 100pH wire at 28GHz has 17 ohms of impedance, fundamentally altering circuit behavior and making layout an integral part of the design.',
      question: 'Why do RF layouts look radically different from digital layouts?',
      answer: 'At RF frequencies, wire inductance creates significant impedance (Z = 2*pi*f*L). A 100pH wire at 28GHz has 17 ohms of impedance! RF designers use short, wide traces and carefully model all parasitic L. The layout IS the circuit - you can\'t separate schematic from physical design.',
      stats: [
        { label: 'Frequency', value: '28 GHz' },
        { label: 'Wire L', value: '100 pH' },
        { label: 'Z Impact', value: '17 ohm' },
      ],
    },
    {
      title: 'Power Delivery Networks',
      description: 'Modern CPUs draw 100+ amps at less than 1V, requiring careful power grid design. With 100A flowing through 10 milliohms of parasitic resistance, the voltage can drop significantly across the chip, causing logic failures in corners far from the power supply connections.',
      question: 'How do IR drops from parasitic resistance affect chip operation?',
      answer: 'With 100A through 10 mohm of parasitic resistance, voltage drops 1V across the chip! This can cause logic failures in far corners. Designers use thick top metals (10x thicker than signal wires), massive via arrays, and on-chip capacitors. Power grid analysis is often the longest step in chip signoff.',
      stats: [
        { label: 'Current', value: '100 A' },
        { label: 'IR Drop', value: '50 mV' },
        { label: 'Metal Layers', value: '15' },
      ],
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
    if (testConfirmed[questionIndex]) return;
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const confirmAnswer = () => {
    if (testAnswers[currentTestQuestion] === null) return;
    const newConfirmed = [...testConfirmed];
    newConfirmed[currentTestQuestion] = true;
    setTestConfirmed(newConfirmed);
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

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: '#3b82f6',
  };

  const buttonTransition = 'all 0.2s ease';

  // ── SVG Visualization ───────────────────────────────────────────────────
  const renderVisualization = (interactive: boolean, showSpacingRule: boolean = false) => {
    const width = 500;
    const height = 500;
    const parasitics = calculateParasitics();

    const layoutX = 50;
    const layoutY = 50;
    const layoutW = 380;
    const layoutH = 140;

    const wireY1 = layoutY + 40;
    const wireY2 = layoutY + 90;
    const scaledWidth = Math.max(5, wireWidth * 20);

    const crossSectionY = 220;
    const crossSectionH = 80;

    // Build an RC delay curve with >= 10 L points
    const rcVal = parseFloat(parasitics.rcDelay);
    const curvePoints: string[] = [];
    const chartX = layoutX;
    const chartY = crossSectionY + crossSectionH + 15;
    const chartW = layoutW;
    const chartH = 160;
    // Normalize rcVal for curve shape: use log scale for better visibility
    const rcNorm = Math.min(1, Math.log(1 + rcVal * 0.5) / 4);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = chartX + t * chartW;
      const amplitude = 0.3 + rcNorm * 0.65;
      const y = chartY + chartH - (1 - Math.exp(-4 * t)) * chartH * amplitude;
      if (i === 0) curvePoints.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
      else curvePoints.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = curvePoints.join(' ');

    // Interactive point position - maps wireLength slider to curve position
    const interactiveT = Math.min(0.9, wireLength / 220);
    const interactiveAmplitude = 0.3 + rcNorm * 0.65;
    const interactiveX = chartX + interactiveT * chartW;
    const interactiveY = chartY + chartH - (1 - Math.exp(-4 * interactiveT)) * chartH * interactiveAmplitude;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px', maxHeight: '400px' }}
        >
          <defs>
            <linearGradient id="fabBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="fabMetal1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="fabMetal2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="25%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="75%" stopColor="#7e22ce" />
              <stop offset="100%" stopColor="#6b21a8" />
            </linearGradient>
            <linearGradient id="fabViaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <linearGradient id="fabSubstrateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="fabOxideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="fabPolyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="fabDiffusionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fabViaGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#fabBgGradient)" />

          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={`gx${i}`} x1={layoutX + i * (layoutW / 4)} y1={layoutY} x2={layoutX + i * (layoutW / 4)} y2={layoutY + layoutH} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {[0, 1, 2, 3].map(i => (
            <line key={`gy${i}`} x1={layoutX} y1={layoutY + i * (layoutH / 3)} x2={layoutX + layoutW} y2={layoutY + i * (layoutH / 3)} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          ))}

          {/* Layout area */}
          <rect x={layoutX} y={layoutY} width={layoutW} height={layoutH} fill="url(#fabSubstrateGrad)" rx={6} />

          {/* Title text */}
          <text x={width / 2} y={30} textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="bold">IC Layout Cross-Section</text>

          {/* Wire 1 */}
          <rect x={layoutX + 10} y={wireY1} width={Math.min(wireLength * 2, layoutW - 30)} height={scaledWidth} fill={metalLayer === 1 ? 'url(#fabMetal1Grad)' : 'url(#fabMetal2Grad)'} rx={2} filter={isViolation && showSpacingRule ? undefined : 'url(#glow)'} />
          <text x={layoutX + 15} y={wireY1 - 5} fill="#60a5fa" fontSize="11">Metal {metalLayer}</text>

          {/* Wire 2 */}
          <rect x={layoutX + 30} y={wireY2} width={Math.min(wireLength * 1.5, layoutW - 60)} height={scaledWidth} fill={metalLayer === 1 ? 'url(#fabMetal1Grad)' : 'url(#fabMetal2Grad)'} rx={2} />

          {/* Vertical connecting wire */}
          <rect x={layoutX + 10 + Math.min(wireLength * 2, layoutW - 30) - scaledWidth} y={wireY1} width={scaledWidth} height={wireY2 - wireY1 + scaledWidth} fill={metalLayer === 1 ? 'url(#fabMetal2Grad)' : 'url(#fabMetal1Grad)'} rx={2} />

          {/* Vias */}
          {[...Array(numVias)].map((_, i) => (
            <g key={`via${i}`}>
              <rect x={layoutX + 10 + Math.min(wireLength * 2, layoutW - 30) - scaledWidth + 2} y={wireY1 + 2 + i * 18} width={Math.max(4, scaledWidth - 4)} height={Math.max(4, scaledWidth - 4)} fill="url(#fabViaGrad)" rx={1} filter="url(#fabViaGlow)" />
            </g>
          ))}
          <text x={layoutX + 10 + Math.min(wireLength * 2, layoutW - 30) + 8} y={wireY1 + 15} fill="#4ade80" fontSize="11">Via</text>

          {/* Spacing rule indicator */}
          {showSpacingRule && (
            <g>
              <line x1={layoutX + 10} y1={wireY1 + scaledWidth + 8} x2={layoutX + 30} y2={wireY1 + scaledWidth + 8} stroke={isViolation ? colors.error : colors.success} strokeWidth={2} strokeDasharray={isViolation ? '5,3' : 'none'} />
              <text x={layoutX + layoutW - 80} y={wireY1 + 12} fill={colors.warning} fontSize="11">Spacing Rule</text>
            </g>
          )}

          {/* Cross-section view */}
          <g transform={`translate(${layoutX}, ${crossSectionY})`}>
            <text x={0} y={-8} fill={colors.textSecondary} fontSize="12" fontWeight="bold">Cross-Section View</text>
            <rect x={0} y={crossSectionH - 20} width={layoutW} height={20} fill="url(#fabSubstrateGrad)" rx={2} />
            <text x={5} y={crossSectionH - 5} fill="#94a3b8" fontSize="11">Substrate</text>
            <rect x={0} y={crossSectionH - 45} width={layoutW} height={25} fill="url(#fabOxideGrad)" rx={2} />
            <rect x={0} y={crossSectionH - 70} width={layoutW} height={25} fill="url(#fabOxideGrad)" opacity={0.7} rx={2} />
            <rect x={40} y={crossSectionH - 25} width={60} height={10} fill="url(#fabDiffusionGrad)" rx={2} />
            <text x={110} y={crossSectionH - 15} fill="#fb923c" fontSize="11">Diffusion</text>
            <rect x={150} y={crossSectionH - 25} width={60} height={10} fill="url(#fabDiffusionGrad)" rx={2} />
            <rect x={90} y={crossSectionH - 35} width={40} height={15} fill="url(#fabPolyGrad)" rx={2} />
            <text x={135} y={crossSectionH - 37} fill="#f87171" fontSize="11">Poly</text>
            <rect x={30} y={crossSectionH - 55} width={80} height={10} fill="url(#fabMetal1Grad)" rx={2} />
            <rect x={160} y={crossSectionH - 55} width={80} height={10} fill="url(#fabMetal1Grad)" rx={2} />
            <rect x={50} y={crossSectionH - 80} width={150} height={12} fill="url(#fabMetal2Grad)" rx={2} />
            <rect x={55} y={crossSectionH - 68} width={8} height={15} fill="url(#fabViaGrad)" rx={1} />
            <rect x={180} y={crossSectionH - 68} width={8} height={15} fill="url(#fabViaGrad)" rx={1} />
          </g>

          {/* RC Delay Chart - axis labels */}
          <text x={chartX + chartW / 2} y={chartY - 5} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="bold">RC Delay Response</text>
          <text x={chartX - 5} y={chartY + chartH / 2} textAnchor="end" fill={colors.textMuted} fontSize="11" transform={`rotate(-90, ${chartX - 5}, ${chartY + chartH / 2})`}>Voltage</text>
          <text x={chartX + chartW / 2} y={chartY + chartH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">Time (ps)</text>

          {/* Chart grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={`cgx${i}`} x1={chartX + i * (chartW / 4)} y1={chartY} x2={chartX + i * (chartW / 4)} y2={chartY + chartH} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {[0, 1, 2].map(i => (
            <line key={`cgy${i}`} x1={chartX} y1={chartY + i * (chartH / 2)} x2={chartX + chartW} y2={chartY + i * (chartH / 2)} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          ))}

          {/* Chart axes */}
          <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke={colors.textSecondary} strokeWidth={1.5} />
          <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke={colors.textSecondary} strokeWidth={1.5} />

          {/* RC curve */}
          <path d={curvePath} fill="none" stroke={colors.metal1} strokeWidth={2.5} />

          {/* Interactive point */}
          <circle cx={interactiveX} cy={interactiveY} r={8} fill={colors.accent} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
          <text x={interactiveX + 12} y={interactiveY - 5} fill={colors.accent} fontSize="11" fontWeight="bold">{parasitics.rcDelay} ps</text>
        </svg>

        {/* Legend */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
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
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Parasitic values */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          width: '100%',
          maxWidth: '550px',
          padding: '12px',
          background: colors.bgCard,
          borderRadius: '8px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>Wire R</div>
            <div style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 700 }}>{parasitics.resistance} ohm</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>Capacitance</div>
            <div style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 700 }}>{parasitics.capacitance} fF</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>RC Delay</div>
            <div style={{ fontSize: '14px', color: colors.warning, fontWeight: 700 }}>{parasitics.rcDelay} ps</div>
          </div>
        </div>

        {showSpacingRule && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: isViolation ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            borderRadius: '8px',
            borderLeft: `4px solid ${isViolation ? colors.error : colors.success}`,
            width: '100%',
            maxWidth: '550px',
          }}>
            <span style={{ fontSize: '14px', color: isViolation ? colors.error : colors.success, fontWeight: 700 }}>
              {isViolation ? 'DRC VIOLATION' : 'DRC PASSED'}
            </span>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>
              Min spacing: {spacingRule.toFixed(2)}um
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── Slider Controls ─────────────────────────────────────────────────────
  const renderControls = (showSpacingRule: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Wire Length (resistance increases with distance): {wireLength} um
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
          <span>20 um (low R)</span>
          <span>200 um (high R)</span>
        </div>
        <input type="range" min="20" max="200" step="10" value={wireLength} onChange={(e) => setWireLength(parseInt(e.target.value))} style={sliderStyle} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Wire Width (controls resistance and capacitance): {wireWidth.toFixed(2)} um
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
          <span>0.1 um (narrow)</span>
          <span>2.0 um (wide)</span>
        </div>
        <input type="range" min="0.1" max="2" step="0.1" value={wireWidth} onChange={(e) => setWireWidth(parseFloat(e.target.value))} style={sliderStyle} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Number of Vias (each adds contact resistance): {numVias}
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
          <span>1 (min)</span>
          <span>8 (max)</span>
        </div>
        <input type="range" min="1" max="8" step="1" value={numVias} onChange={(e) => setNumVias(parseInt(e.target.value))} style={sliderStyle} />
      </div>
      {showSpacingRule && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Minimum Spacing Rule (manufacturing constraint): {spacingRule.toFixed(2)} um
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
            <span>0.10 um (tight)</span>
            <span>0.50 um (relaxed)</span>
          </div>
          <input type="range" min="0.1" max="0.5" step="0.05" value={spacingRule} onChange={(e) => setSpacingRule(parseFloat(e.target.value))} style={sliderStyle} />
        </div>
      )}
      <div style={{
        background: 'rgba(59, 130, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.metal1}`,
      }}>
        <div style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 400 }}>
          R = rho × L / (W × t) = 0.0175 × {wireLength} / ({wireWidth} × {metalLayer === 1 ? 0.3 : 0.5})
        </div>
        <div style={{ color: colors.textPrimary, fontSize: '14px', marginTop: '4px', fontWeight: 700 }}>
          Wire R = {calculateParasitics().resistance} ohm | RC Delay = {calculateParasitics().rcDelay} ps
        </div>
      </div>
    </div>
  );

  // ── Navigation Bar (bottom, with 10 dots) ──────────────────────────────
  const renderNavBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
        gap: '8px',
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '10px 18px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            fontWeight: 600,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.3,
            fontSize: '14px',
            transition: buttonTransition,
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                width: '10px',
                height: '44px',
                minWidth: '10px',
                minHeight: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                padding: 0,
                transition: buttonTransition,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {phaseLabels[phase]}
        </span>
      </div>
    );
  };

  // ── Phase container ─────────────────────────────────────────────────────
  const renderPhaseContainer = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        {children}
      </div>
      {renderNavBar()}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // HOOK PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'hook') {
    return renderPhaseContainer(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 800 }}>
            If the Schematic is Correct, Can the Chip Still Fail?
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
            When geometry becomes physics
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 500 }}>
              A circuit schematic shows ideal connections: perfect wires with zero resistance.
              But in a real chip, wires have length, width, and thickness. They have resistance.
              They have capacitance to nearby wires. At high frequencies, they even have inductance!
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
              These "parasitic" effects can make a correct schematic fail as a real chip.
            </p>
          </div>

          <button
            onClick={goNext}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: `0 4px 20px ${colors.accentGlow}`,
              transition: buttonTransition,
              minHeight: '52px',
            }}
          >
            Start Exploring
          </button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREDICT PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'predict') {
    return renderPhaseContainer(
      <>
        {renderVisualization(false)}

        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Challenge:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            You've designed a logic circuit that works perfectly in simulation.
            Now you need to translate it into physical layout - actual metal wires on silicon.
            Two wires need to cross, requiring different metal layers and vias to connect them.
            What could go wrong?
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
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
                  border: prediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: buttonTransition,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {prediction && (
          <div style={{ padding: '0 16px', textAlign: 'center' }}>
            <button
              onClick={goNext}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '16px',
                transition: buttonTransition,
              }}
            >
              Test My Prediction
            </button>
          </div>
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAY PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'play') {
    return renderPhaseContainer(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore Parasitic Effects</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Adjust wire geometry and observe how resistance, capacitance, and delay change in real-time.
            This is important because parasitic extraction is used in every chip design flow.
          </p>
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

        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Double the wire length - how does RC delay change?</li>
            <li>Make the wire wider - what happens to resistance?</li>
            <li>Add more vias - does it help or hurt?</li>
            <li>Switch between Metal 1 and Metal 2 layers</li>
          </ul>
          <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontWeight: 400 }}>
            Wire resistance is defined as R = rho × L / (W × t), where rho is the material resistivity,
            L is length, W is width, and t is thickness. This formula shows the relationship between
            physical geometry and electrical characteristics.
          </p>
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setMetalLayer(metalLayer === 1 ? 2 : 1)}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: `linear-gradient(135deg, ${metalLayer === 1 ? colors.metal1 : colors.metal2}, ${metalLayer === 1 ? '#1d4ed8' : '#6d28d9'})`,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              transition: buttonTransition,
            }}
          >
            Layer: M{metalLayer}
          </button>
          <button
            onClick={goNext}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              transition: buttonTransition,
            }}
          >
            Continue to Review
          </button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEW PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const wasCorrect = prediction === 'parasitics';
    return renderPhaseContainer(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
            {wasCorrect ? 'Correct! Your prediction was right.' : 'Not Quite! As you observed in the experiment:'}
          </h3>
          <p style={{ color: colors.textPrimary, fontWeight: 500 }}>
            Physical geometry creates parasitic R, C, and L that don't exist in the schematic.
            These parasitics add delay, cause crosstalk, and can even cause complete failure!
          </p>
        </div>

        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>From Schematic to Silicon</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Resistance (R):</strong> Every wire has
              resistance proportional to length/(width × thickness). Long, thin wires have high R.
              The formula is R = rho × L / (W × t).
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Capacitance (C):</strong> Wires form
              capacitors with the substrate and adjacent wires. More area = more capacitance.
              C = epsilon × A / d is the relationship for parallel plates.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Inductance (L):</strong> At GHz frequencies,
              wire loops create significant inductance. Impedance Z = 2 × pi × f × L grows with frequency.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>RC Delay:</strong> The product R × C sets the
              time constant for signal transitions. A 10 ohm wire with 100fF capacitance has 1ps RC delay.
            </p>
          </div>
        </div>

        <div style={{ padding: '16px', textAlign: 'center' }}>
          <button
            onClick={goNext}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              transition: buttonTransition,
            }}
          >
            Next: Explore the Twist
          </button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TWIST PREDICT PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'twist_predict') {
    return renderPhaseContainer(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>The Twist: Manufacturing Constraints</h2>
          <p style={{ color: colors.textSecondary, fontWeight: 400 }}>
            A new manufacturing spacing rule breaks your optimized layout!
          </p>
        </div>

        {renderVisualization(false, true)}

        <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Problem:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            You've optimized your wire width for minimum RC delay. But the fab just
            updated their design rules - the minimum spacing between wires increased
            from 0.14um to 0.20um. Your carefully optimized layout now has DRC violations!
            This is completely different from the parasitic effects we explored earlier.
            Now manufacturing constraints force design trade-offs.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
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
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: buttonTransition,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {twistPrediction && (
          <div style={{ padding: '0 16px', textAlign: 'center' }}>
            <button
              onClick={goNext}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.warning}, #b45309)`,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '16px',
                transition: buttonTransition,
              }}
            >
              Test My Prediction
            </button>
          </div>
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TWIST PLAY PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'twist_play') {
    return renderPhaseContainer(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Navigate Design Rules</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Adjust wire width to fix DRC violations while minimizing RC delay impact.
            This is important for real-world chip design and manufacturing yield.
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
          <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Design Trade-offs:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Narrower wires have higher resistance but allow tighter spacing.
            Wider wires have lower R but more capacitance. Finding the optimal
            width for your target delay is a key part of physical design!
          </p>
        </div>

        <div style={{ padding: '16px', textAlign: 'center' }}>
          <button
            onClick={goNext}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              transition: buttonTransition,
            }}
          >
            See the Explanation
          </button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TWIST REVIEW PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'need_redesign';
    return renderPhaseContainer(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontWeight: 500 }}>
            Manufacturing rules reflect physical reality - violating them causes defects!
            When rules change, you may need to redesign circuits with more timing margin.
          </p>
        </div>

        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Design for Manufacturing</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
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

        <div style={{ padding: '16px', textAlign: 'center' }}>
          <button
            onClick={goNext}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              transition: buttonTransition,
            }}
          >
            Continue to Applications
          </button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;
    return renderPhaseContainer(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontWeight: 400 }}>
            Parasitic extraction is critical across all chip designs. Companies like Apple, Google, AMD, Intel, TSMC, and Samsung
            rely on these concepts for every chip they produce. From mobile processors to data center GPUs, understanding how
            physical layout creates parasitics determines whether a $500M chip design succeeds or fails.
          </p>
          <p style={{ color: colors.textMuted, textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
            App {transferApp + 1} of {transferApplications.length} | {transferCompleted.size} completed
          </p>
        </div>

        {/* All 4 app cards shown inline */}
        {transferApplications.map((app, idx) => (
          <div key={idx} style={{
            background: colors.bgCard,
            margin: '0 16px 12px',
            padding: '16px',
            borderRadius: '12px',
            border: transferCompleted.has(idx) ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>
                {app.title}
              </h3>
              {transferCompleted.has(idx) && <span style={{ color: colors.success, fontSize: '12px', fontWeight: 700 }}>Complete</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '10px', lineHeight: 1.5, fontWeight: 400 }}>
              {app.description}
            </p>

            {/* Stats with units matching pattern */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {app.stats.map((stat, si) => (
                <div key={si} style={{
                  flex: 1,
                  minWidth: '70px',
                  padding: '8px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '2px', fontWeight: 400 }}>{stat.label}</div>
                  <div style={{ fontSize: '14px', color: colors.accent, fontWeight: 700 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Question + Got It */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
              <p style={{ color: colors.metal1, fontSize: '13px', fontWeight: 700 }}>{app.question}</p>
            </div>

            {!transferCompleted.has(idx) ? (
              <button
                onClick={() => {
                  setTransferCompleted(new Set([...transferCompleted, idx]));
                  setTransferApp(idx);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  transition: buttonTransition,
                }}
              >
                Got It
              </button>
            ) : (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px', borderLeft: `3px solid ${colors.success}` }}>
                <p style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 400, lineHeight: 1.5 }}>{app.answer}</p>
              </div>
            )}
          </div>
        ))}

        {/* Take the Test button - shown after completing all apps */}
        {allCompleted && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={goNext}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
                transition: buttonTransition,
              }}
            >
              Take the Test
            </button>
          </div>
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContainer(
        <>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 800 }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: 400 }}>
              {testScore >= 8 ? 'You understand design-to-fab translation!' : 'Review the material and try again.'}
            </p>
          </div>
          {testScore >= 8 && (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <button
                onClick={goNext}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: buttonTransition,
                }}
              >
                Complete Mastery
              </button>
            </div>
          )}
        </>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const isConfirmed = testConfirmed[currentTestQuestion];
    const hasAnswer = testAnswers[currentTestQuestion] !== null;
    const allAnswered = testAnswers.every(a => a !== null) && testConfirmed.every(c => c);
    const isLast = currentTestQuestion === testQuestions.length - 1;

    return renderPhaseContainer(
      <>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 600 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', fontWeight: 400 }}>
            Apply your understanding of design-to-fabrication translation, parasitic extraction, RC delay analysis,
            design rule checking, and manufacturing constraints to answer the following questions about integrated circuit
            physical design and the relationship between layout geometry and electrical performance.
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', justifyContent: 'center' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: testConfirmed[i] ? colors.success : i === currentTestQuestion ? colors.accent : 'rgba(255,255,255,0.15)',
                  transition: buttonTransition,
                }}
              />
            ))}
          </div>

          {/* Question card */}
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 600 }}>{currentQ.question}</p>
          </div>

          {/* Answer options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {currentQ.options.map((opt, oIndex) => {
              const isSelected = testAnswers[currentTestQuestion] === oIndex;
              const showResult = isConfirmed;
              let bg = 'transparent';
              let borderColor = colors.border;
              if (isSelected && !showResult) {
                bg = 'rgba(245, 158, 11, 0.2)';
                borderColor = colors.accent;
              }
              if (showResult && isSelected) {
                bg = opt.correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                borderColor = opt.correct ? colors.success : colors.error;
              }
              if (showResult && opt.correct && !isSelected) {
                bg = 'rgba(16, 185, 129, 0.1)';
                borderColor = colors.success;
              }
              return (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  disabled={isConfirmed}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    color: colors.textPrimary,
                    cursor: isConfirmed ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: buttonTransition,
                  }}
                >
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            {!isConfirmed && hasAnswer && (
              <button
                onClick={confirmAnswer}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: buttonTransition,
                }}
              >
                Confirm Answer
              </button>
            )}

            {isConfirmed && !isLast && (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.metal1}, #1d4ed8)`,
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: buttonTransition,
                }}
              >
                Next Question
              </button>
            )}

            {isConfirmed && isLast && (
              <button
                onClick={submitTest}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: buttonTransition,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MASTERY PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'mastery') {
    return renderPhaseContainer(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 800 }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '8px', fontWeight: 400 }}>
            Congratulations! You have completed the design-to-fabrication translation lesson.
          </p>
          <p style={{ color: colors.textMuted, fontWeight: 400 }}>
            You now understand how physical geometry creates parasitics that affect chip performance.
          </p>
        </div>

        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Physical layout creates parasitic R, C, L not in schematics</li>
            <li>Wire resistance = rho × L / (W × t)</li>
            <li>RC delay limits signal transition speed</li>
            <li>Vias add resistance and reliability concerns</li>
            <li>Design rules ensure manufacturability</li>
            <li>Trade-offs between performance and manufacturing</li>
          </ul>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.metal1, marginBottom: '12px', fontWeight: 700 }}>The Full Picture:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
            Modern chip design is 80% physical design - translating logical function into
            manufacturable geometry. Parasitic extraction and analysis runs for days on
            billion-transistor chips. Your understanding of this physics bridges the gap
            between circuit theory and working silicon!
          </p>
        </div>
      </>
    );
  }

  // Fallback - should not reach here
  return renderPhaseContainer(
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Design to Fab Translation</h2>
      <p style={{ color: colors.textSecondary, fontWeight: 400 }}>Loading...</p>
    </div>
  );
};

export default DesignToFabTranslationRenderer;
