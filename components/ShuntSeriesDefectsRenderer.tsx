import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for this game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ShuntSeriesDefectsRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Test Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
  hotspot: '#ff4500',
  crack: '#8b4513',
};

const ShuntSeriesDefectsRenderer: React.FC<ShuntSeriesDefectsRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Navigation functions
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
  const [defectType, setDefectType] = useState<'none' | 'crack' | 'shunt' | 'contact' | 'hotspot'>('none');
  const [defectSeverity, setDefectSeverity] = useState(50); // 0-100
  const [currentFlow, setCurrentFlow] = useState(100); // Percentage of normal current
  const [showHotspot, setShowHotspot] = useState(false);

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

  // Defect characteristics
  const defects = {
    none: {
      name: 'Healthy Cell',
      description: 'No defects - optimal performance',
      seriesR: 0.5,
      shuntR: 1000,
      icon: 'check',
      color: colors.success,
    },
    crack: {
      name: 'Cell Crack',
      description: 'Physical crack increases series resistance by interrupting current flow',
      seriesR: 2 + defectSeverity * 0.05,
      shuntR: 500,
      icon: 'crack',
      color: colors.crack,
    },
    shunt: {
      name: 'Shunt Path',
      description: 'Crystal defect or edge damage creates parallel leakage path',
      seriesR: 0.5,
      shuntR: 50 + (100 - defectSeverity) * 3,
      icon: 'leak',
      color: colors.purple,
    },
    contact: {
      name: 'Poor Contact',
      description: 'Degraded solder joint or corroded busbar increases series resistance',
      seriesR: 1 + defectSeverity * 0.08,
      shuntR: 1000,
      icon: 'plug',
      color: colors.warning,
    },
    hotspot: {
      name: 'Hotspot Cell',
      description: 'Shaded/damaged cell in series forces reverse bias - creates dangerous heat',
      seriesR: 0.5,
      shuntR: 20 + (100 - defectSeverity) * 2,
      icon: 'fire',
      color: colors.hotspot,
    },
  };

  // Physics calculations
  const calculateIVCurve = useCallback(() => {
    const defect = defects[defectType];
    const Rs = defect.seriesR;
    const Rsh = defect.shuntR;

    const Isc = 8.0;
    const Voc = 0.65;
    const n = 1.3;
    const Vt = 0.026 * n;

    const points: { v: number; i: number }[] = [];

    for (let v = 0; v <= Voc * 1.15; v += 0.01) {
      let i = Isc;
      for (let iter = 0; iter < 15; iter++) {
        const vd = v + i * Rs;
        const idiode = 1e-9 * (Math.exp(vd / Vt) - 1);
        const ishunt = vd / Rsh;
        i = Isc - idiode - ishunt;
        if (i < 0) i = 0;
      }
      points.push({ v, i });
    }

    // Find MPP
    let maxPower = 0;
    let Vmp = 0;
    let Imp = 0;
    points.forEach(({ v, i }) => {
      const p = v * i;
      if (p > maxPower) {
        maxPower = p;
        Vmp = v;
        Imp = i;
      }
    });

    const fillFactor = maxPower / (Voc * Isc);

    // Hotspot risk calculation
    const hotspotRisk = defectType === 'hotspot' ? defectSeverity : defectType === 'shunt' ? defectSeverity * 0.5 : 0;

    return {
      points,
      Voc: points.find(p => p.i < 0.1)?.v || Voc,
      Isc: points[0]?.i || Isc,
      Vmp,
      Imp,
      maxPower,
      fillFactor,
      seriesR: Rs,
      shuntR: Rsh,
      hotspotRisk,
    };
  }, [defectType, defectSeverity]);

  const predictions = [
    { id: 'less_area', label: 'A crack acts like "less area" - proportionally less current' },
    { id: 'leak', label: 'A crack creates a "leak" - voltage drops disproportionately' },
    { id: 'both', label: 'Different defects cause different effects - series vs parallel' },
    { id: 'no_effect', label: 'Small defects have minimal effect on performance' },
  ];

  const twistPredictions = [
    { id: 'no_risk', label: 'Defective cells just produce less power - no danger' },
    { id: 'low_risk', label: 'Hotspots are rare and easily detected' },
    { id: 'high_risk', label: 'Forcing current through a defective cell can cause dangerous heating' },
    { id: 'fire', label: 'All defects immediately cause fires' },
  ];

  const transferApplications = [
    {
      title: 'Electroluminescence Testing',
      description: 'EL imaging reveals cell defects by applying current and photographing infrared emission.',
      question: 'Why does electroluminescence show cracks as dark lines?',
      answer: 'Cracks increase local resistance, so less current flows through damaged regions. Less current means fewer radiative recombination events, so cracked areas appear dark in EL images while healthy areas glow.',
    },
    {
      title: 'Bypass Diodes',
      description: 'Solar modules include bypass diodes to protect against hotspots from shaded cells.',
      question: 'How do bypass diodes prevent hotspot damage?',
      answer: 'When a cell is shaded or defective, it becomes reverse-biased by healthy cells trying to push current through it. A bypass diode provides an alternative current path, limiting reverse voltage to ~0.6V and preventing dangerous heating.',
    },
    {
      title: 'Infrared Thermography',
      description: 'IR cameras can detect hotspots and defects in operating solar arrays.',
      question: 'Why do shunt defects show up as hot spots on IR cameras?',
      answer: 'Shunt paths allow current to flow through localized regions of high resistance. Power dissipated as heat (P = I²R) concentrates in tiny areas, creating hot spots visible in thermal imaging even from several meters away.',
    },
    {
      title: 'String Inverter Protection',
      description: 'Modern inverters monitor string performance to detect degradation early.',
      question: 'How can inverter data reveal developing defects?',
      answer: 'Inverters track voltage, current, and power of each string. A string with developing defects shows reduced fill factor before significant power loss. Smart inverters can alert operators to investigate specific strings.',
    },
  ];

  const testQuestions = [
    {
      question: 'A cell crack primarily increases:',
      options: [
        { text: 'Shunt resistance', correct: false },
        { text: 'Series resistance', correct: true },
        { text: 'Open-circuit voltage', correct: false },
        { text: 'Short-circuit current only', correct: false },
      ],
    },
    {
      question: 'A shunt defect (parallel leakage path) primarily causes:',
      options: [
        { text: 'Voltage drop due to current bypassing the junction', correct: true },
        { text: 'Current increase', correct: false },
        { text: 'No change in output', correct: false },
        { text: 'Higher fill factor', correct: false },
      ],
    },
    {
      question: 'The equivalent circuit model of a solar cell includes:',
      options: [
        { text: 'Only a current source', correct: false },
        { text: 'Current source, diode, series and shunt resistances', correct: true },
        { text: 'Only voltage and resistance', correct: false },
        { text: 'Capacitors and inductors', correct: false },
      ],
    },
    {
      question: 'A hotspot occurs when:',
      options: [
        { text: 'A cell produces too much current', correct: false },
        { text: 'Current is forced through a high-resistance or reverse-biased cell', correct: true },
        { text: 'The panel is properly bypassed', correct: false },
        { text: 'Voltage is too high', correct: false },
      ],
    },
    {
      question: 'Bypass diodes in solar modules:',
      options: [
        { text: 'Increase power output', correct: false },
        { text: 'Provide alternative current path around defective cells', correct: true },
        { text: 'Convert AC to DC', correct: false },
        { text: 'Store energy', correct: false },
      ],
    },
    {
      question: 'In electroluminescence imaging, a crack appears as:',
      options: [
        { text: 'A bright spot', correct: false },
        { text: 'A dark line or region', correct: true },
        { text: 'Normal brightness', correct: false },
        { text: 'A blue glow', correct: false },
      ],
    },
    {
      question: 'High series resistance causes the I-V curve to:',
      options: [
        { text: 'Become steeper near Voc (reduced fill factor)', correct: true },
        { text: 'Shift right', correct: false },
        { text: 'Become perfectly rectangular', correct: false },
        { text: 'Increase short-circuit current', correct: false },
      ],
    },
    {
      question: 'Low shunt resistance causes:',
      options: [
        { text: 'Higher open-circuit voltage', correct: false },
        { text: 'Reduced voltage under load as current leaks through', correct: true },
        { text: 'No effect on the curve', correct: false },
        { text: 'Increased fill factor', correct: false },
      ],
    },
    {
      question: 'A corroded solder joint would manifest as:',
      options: [
        { text: 'A shunt defect', correct: false },
        { text: 'A series resistance increase', correct: true },
        { text: 'No electrical effect', correct: false },
        { text: 'Higher voltage output', correct: false },
      ],
    },
    {
      question: 'Thermal imaging of solar panels can detect defects because:',
      options: [
        { text: 'Defective cells are always hotter', correct: false },
        { text: 'Resistive losses create localized heating at defect sites', correct: true },
        { text: 'All panels glow uniformly', correct: false },
        { text: 'Temperature has no effect on detection', correct: false },
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

  const renderVisualization = () => {
    const width = 700;
    const height = 580;
    const curve = calculateIVCurve();
    const defect = defects[defectType];

    // Graph dimensions
    const graphX = 50;
    const graphY = 55;
    const graphWidth = 260;
    const graphHeight = 180;

    const Isc = 8.0;
    const Voc = 0.65;
    const vScale = graphWidth / (Voc * 1.15);
    const iScale = graphHeight / (Isc * 1.1);

    // Create path for I-V curve
    const pathData = curve.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - p.i * iScale}`)
      .join(' ');

    // Power curve (P = V * I)
    const powerPath = curve.points
      .map((p, i) => {
        const power = p.v * p.i;
        const maxP = 4.0; // Scale for power display
        return `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - (power / maxP) * graphHeight}`;
      })
      .join(' ');

    // Healthy cell curve for comparison
    const healthyDefect = defects['none'];
    const healthyPoints: { v: number; i: number }[] = [];
    for (let v = 0; v <= Voc * 1.15; v += 0.01) {
      let i = Isc;
      const Rs = healthyDefect.seriesR;
      const Rsh = healthyDefect.shuntR;
      for (let iter = 0; iter < 15; iter++) {
        const vd = v + i * Rs;
        const idiode = 1e-9 * (Math.exp(vd / (0.026 * 1.3)) - 1);
        const ishunt = vd / Rsh;
        i = Isc - idiode - ishunt;
        if (i < 0) i = 0;
      }
      healthyPoints.push({ v, i });
    }
    const healthyPath = healthyPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - p.i * iScale}`)
      .join(' ');

    // Healthy power curve
    const healthyPowerPath = healthyPoints
      .map((p, i) => {
        const power = p.v * p.i;
        const maxP = 4.0;
        return `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - (power / maxP) * graphHeight}`;
      })
      .join(' ');

    // MPP point coordinates
    const mppX = graphX + curve.Vmp * vScale;
    const mppY = graphY + graphHeight - curve.Imp * iScale;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          {/* ============ PREMIUM DEFS SECTION ============ */}
          <defs>
            {/* Premium dark background gradient */}
            <linearGradient id="ssdBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0a1a" />
              <stop offset="25%" stopColor="#0f1629" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="75%" stopColor="#0f1629" />
              <stop offset="100%" stopColor="#0a0a1a" />
            </linearGradient>

            {/* Solar cell silicon gradient with depth */}
            <linearGradient id="ssdSiliconGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="15%" stopColor="#2563eb" />
              <stop offset="40%" stopColor="#1d4ed8" />
              <stop offset="60%" stopColor="#1e40af" />
              <stop offset="85%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>

            {/* Busbar metallic gradient */}
            <linearGradient id="ssdBusbarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4d4d8" />
              <stop offset="20%" stopColor="#a1a1aa" />
              <stop offset="50%" stopColor="#71717a" />
              <stop offset="80%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#d4d4d8" />
            </linearGradient>

            {/* Graph area gradient */}
            <linearGradient id="ssdGraphBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c1222" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0c1222" />
            </linearGradient>

            {/* I-V Curve gradient - healthy */}
            <linearGradient id="ssdHealthyCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>

            {/* Power curve gradient */}
            <linearGradient id="ssdPowerCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            {/* Circuit panel gradient */}
            <linearGradient id="ssdCircuitBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Hotspot radial gradient - intense center */}
            <radialGradient id="ssdHotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff4500" stopOpacity="1" />
              <stop offset="20%" stopColor="#ff6b35" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#ff8c42" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#ffa94d" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#ffcc5c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
            </radialGradient>

            {/* Shunt defect radial gradient - purple leak effect */}
            <radialGradient id="ssdShuntGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#9333ea" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#6d28d9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
            </radialGradient>

            {/* Crack defect gradient - dark fracture */}
            <linearGradient id="ssdCrackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="30%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#92400e" />
              <stop offset="70%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Contact corrosion gradient */}
            <linearGradient id="ssdCorrosionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="20%" stopColor="#a16207" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="80%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Current source glow */}
            <radialGradient id="ssdCurrentSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#059669" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#047857" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
            </radialGradient>

            {/* Diode gradient */}
            <linearGradient id="ssdDiodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Risk meter gradient - low to high */}
            <linearGradient id="ssdRiskMeterBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* MPP point glow */}
            <radialGradient id="ssdMppGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#0891b2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>

            {/* Premium glow filter for curves */}
            <filter id="ssdCurveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense hotspot glow filter */}
            <filter id="ssdHotspotFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shunt leak glow filter */}
            <filter id="ssdShuntFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Defect indicator glow */}
            <filter id="ssdDefectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* MPP marker glow */}
            <filter id="ssdMppFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text shadow filter */}
            <filter id="ssdTextShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for solar cell */}
            <pattern id="ssdCellGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <line x1="0" y1="0" x2="0" y2="20" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1="0" y1="0" x2="20" y2="0" stroke="#3b82f6" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ============ BACKGROUND ============ */}
          <rect width={width} height={height} fill="url(#ssdBgGradient)" />

          {/* Title with premium styling */}
          <text x={width / 2} y={28} fill={colors.textPrimary} fontSize={18} fontWeight="bold" textAnchor="middle" filter="url(#ssdTextShadow)">
            Solar Cell Defect Analysis - Shunt vs Series
          </text>
          <text x={width / 2} y={46} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Circuit Model & I-V Characteristic Impact
          </text>

          {/* ============ I-V CURVE GRAPH (Left Side) ============ */}
          <g transform="translate(0, 10)">
            {/* Graph background with gradient */}
            <rect x={graphX - 10} y={graphY - 15} width={graphWidth + 40} height={graphHeight + 50} rx={8} fill="url(#ssdGraphBg)" stroke="#334155" strokeWidth={1} />

            {/* Graph title */}
            <text x={graphX + graphWidth / 2} y={graphY - 2} fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">I-V & Power Curves</text>

            {/* Grid lines with subtle gradient */}
            {[0.2, 0.4, 0.6, 0.8].map(frac => (
              <g key={`grid-${frac}`}>
                <line x1={graphX} y1={graphY + graphHeight * (1 - frac)} x2={graphX + graphWidth} y2={graphY + graphHeight * (1 - frac)} stroke="#334155" strokeWidth={0.5} strokeDasharray="4,4" />
                <line x1={graphX + graphWidth * frac} y1={graphY} x2={graphX + graphWidth * frac} y2={graphY + graphHeight} stroke="#334155" strokeWidth={0.5} strokeDasharray="4,4" />
              </g>
            ))}

            {/* Fill area under defective curve */}
            <path d={`${pathData} L ${graphX + graphWidth} ${graphY + graphHeight} L ${graphX} ${graphY + graphHeight} Z`} fill={defect.color} fillOpacity={0.1} />

            {/* Healthy I-V curve (reference - dashed) */}
            <path d={healthyPath} fill="none" stroke="url(#ssdHealthyCurve)" strokeWidth={2} strokeDasharray="6,4" opacity={0.6} />

            {/* Healthy power curve (dashed) */}
            <path d={healthyPowerPath} fill="none" stroke="url(#ssdPowerCurve)" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.4} />

            {/* Defective I-V curve with glow */}
            <path d={pathData} fill="none" stroke={defect.color} strokeWidth={3.5} filter="url(#ssdCurveGlow)" />
            <path d={pathData} fill="none" stroke={defect.color} strokeWidth={2.5} />

            {/* Defective power curve */}
            <path d={powerPath} fill="none" stroke={colors.accent} strokeWidth={2} opacity={0.8} />

            {/* MPP point with glow */}
            <g filter="url(#ssdMppFilter)">
              <circle cx={mppX} cy={mppY} r={12} fill="url(#ssdMppGlow)" />
            </g>
            <circle cx={mppX} cy={mppY} r={5} fill="#22d3ee" stroke="white" strokeWidth={1.5} />
            <text x={mppX + 15} y={mppY - 8} fill="#22d3ee" fontSize={9} fontWeight="bold">MPP</text>
            <text x={mppX + 15} y={mppY + 4} fill={colors.textMuted} fontSize={8}>{curve.maxPower.toFixed(2)}W</text>

            {/* Axes with proper styling */}
            <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth + 15} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} />
            <line x1={graphX} y1={graphY - 5} x2={graphX} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} />

            {/* Axis arrows */}
            <polygon points={`${graphX + graphWidth + 15},${graphY + graphHeight} ${graphX + graphWidth + 8},${graphY + graphHeight - 4} ${graphX + graphWidth + 8},${graphY + graphHeight + 4}`} fill={colors.textSecondary} />
            <polygon points={`${graphX},${graphY - 5} ${graphX - 4},${graphY + 2} ${graphX + 4},${graphY + 2}`} fill={colors.textSecondary} />

            {/* Axis labels */}
            <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 22} fill={colors.textMuted} fontSize={10} textAnchor="middle">Voltage (V)</text>
            <text x={graphX - 15} y={graphY + graphHeight / 2} fill={colors.textMuted} fontSize={10} textAnchor="middle" transform={`rotate(-90, ${graphX - 15}, ${graphY + graphHeight / 2})`}>Current (A)</text>

            {/* Scale markers */}
            <text x={graphX + graphWidth} y={graphY + graphHeight + 12} fill={colors.textMuted} fontSize={8} textAnchor="middle">0.7V</text>
            <text x={graphX} y={graphY + graphHeight + 12} fill={colors.textMuted} fontSize={8} textAnchor="middle">0</text>
            <text x={graphX - 5} y={graphY + 5} fill={colors.textMuted} fontSize={8} textAnchor="end">8A</text>

            {/* Legend */}
            <g transform={`translate(${graphX + graphWidth - 85}, ${graphY + 8})`}>
              <rect x={0} y={0} width={90} height={55} rx={4} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth={0.5} />
              <line x1={8} y1={12} x2={28} y2={12} stroke="url(#ssdHealthyCurve)" strokeWidth={2} strokeDasharray="4,2" />
              <text x={33} y={15} fill={colors.textMuted} fontSize={8}>Healthy</text>
              <line x1={8} y1={27} x2={28} y2={27} stroke={defect.color} strokeWidth={2} />
              <text x={33} y={30} fill={defect.color} fontSize={8}>{defect.name}</text>
              <line x1={8} y1={42} x2={28} y2={42} stroke={colors.accent} strokeWidth={2} />
              <text x={33} y={45} fill={colors.accent} fontSize={8}>Power</text>
            </g>
          </g>

          {/* ============ EQUIVALENT CIRCUIT (Right Side) ============ */}
          <g transform="translate(355, 55)">
            <rect x="0" y="0" width="320" height="185" rx={10} fill="url(#ssdCircuitBg)" stroke="#475569" strokeWidth={1.5} />
            <text x="160" y="20" fill={colors.textSecondary} fontSize={12} fontWeight="bold" textAnchor="middle">Solar Cell Equivalent Circuit</text>

            {/* Circuit frame */}
            <rect x="15" y="35" width="290" height="135" rx={6} fill="rgba(15, 23, 42, 0.5)" stroke="#334155" strokeWidth={0.5} />

            {/* Current source (Iph) with glow */}
            <g transform="translate(40, 80)">
              <circle cx="0" cy="0" r="22" fill="url(#ssdCurrentSourceGlow)" />
              <circle cx="0" cy="0" r="18" fill="none" stroke={colors.success} strokeWidth={2.5} />
              <line x1="0" y1="-10" x2="0" y2="10" stroke={colors.success} strokeWidth={2} />
              <polygon points="0,-10 -4,-4 4,-4" fill={colors.success} />
              <text x="0" y="35" fill={colors.success} fontSize={10} fontWeight="bold" textAnchor="middle">Iph</text>
              <text x="0" y="47" fill={colors.textMuted} fontSize={8} textAnchor="middle">Photocurrent</text>
            </g>

            {/* Diode with gradient */}
            <g transform="translate(95, 65)">
              <path d="M 0 0 L 20 15 L 0 30 Z" fill="url(#ssdDiodeGradient)" stroke="#d97706" strokeWidth={1.5} />
              <line x1="20" y1="0" x2="20" y2="30" stroke="#d97706" strokeWidth={2.5} />
              <text x="10" y="48" fill={colors.accent} fontSize={9} fontWeight="bold" textAnchor="middle">D</text>
            </g>

            {/* Shunt resistance (Rsh) */}
            <g transform="translate(145, 52)">
              <rect x="0" y="0" width="12" height="56" rx={2} fill="none" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={2.5} />
              {/* Resistance zigzag pattern */}
              <path d={`M 6 0 L 6 5 L 2 10 L 10 15 L 2 20 L 10 25 L 2 30 L 10 35 L 2 40 L 10 45 L 6 50 L 6 56`} fill="none" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
              <text x="6" y="72" fill={curve.shuntR < 100 ? colors.error : colors.textMuted} fontSize={9} fontWeight="bold" textAnchor="middle">Rsh</text>
              <text x="6" y="84" fill={curve.shuntR < 100 ? colors.error : colors.textMuted} fontSize={8} textAnchor="middle">{curve.shuntR.toFixed(0)}Ω</text>
              {curve.shuntR < 100 && (
                <g filter="url(#ssdDefectGlow)">
                  <text x="6" y="96" fill={colors.error} fontSize={7} fontWeight="bold" textAnchor="middle">LOW!</text>
                </g>
              )}
            </g>

            {/* Series resistance (Rs) */}
            <g transform="translate(190, 72)">
              <rect x="0" y="0" width="50" height="12" rx={2} fill="none" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={2.5} />
              {/* Resistance zigzag pattern */}
              <path d={`M 0 6 L 5 6 L 8 2 L 14 10 L 20 2 L 26 10 L 32 2 L 38 10 L 44 2 L 50 6`} fill="none" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
              <text x="25" y="28" fill={curve.seriesR > 1.5 ? colors.error : colors.textMuted} fontSize={9} fontWeight="bold" textAnchor="middle">Rs</text>
              <text x="25" y="40" fill={curve.seriesR > 1.5 ? colors.error : colors.textMuted} fontSize={8} textAnchor="middle">{curve.seriesR.toFixed(2)}Ω</text>
              {curve.seriesR > 1.5 && (
                <g filter="url(#ssdDefectGlow)">
                  <text x="25" y="52" fill={colors.error} fontSize={7} fontWeight="bold" textAnchor="middle">HIGH!</text>
                </g>
              )}
            </g>

            {/* Load resistor */}
            <g transform="translate(260, 55)">
              <rect x="0" y="0" width="20" height="50" rx={3} fill="none" stroke={colors.textSecondary} strokeWidth={2} />
              <line x1="5" y1="10" x2="15" y2="10" stroke={colors.textSecondary} strokeWidth={1} />
              <line x1="5" y1="20" x2="15" y2="20" stroke={colors.textSecondary} strokeWidth={1} />
              <line x1="5" y1="30" x2="15" y2="30" stroke={colors.textSecondary} strokeWidth={1} />
              <line x1="5" y1="40" x2="15" y2="40" stroke={colors.textSecondary} strokeWidth={1} />
              <text x="10" y="65" fill={colors.textMuted} fontSize={9} fontWeight="bold" textAnchor="middle">Load</text>
            </g>

            {/* Connection wires */}
            <g stroke={colors.textSecondary} strokeWidth={1.5} fill="none">
              {/* Top rail */}
              <line x1="40" y1="55" x2="40" y2="45" />
              <line x1="40" y1="45" x2="280" y2="45" />
              <line x1="280" y1="45" x2="280" y2="55" />

              {/* Bottom rail */}
              <line x1="40" y1="105" x2="40" y2="120" />
              <line x1="40" y1="120" x2="280" y2="120" />
              <line x1="280" y1="120" x2="280" y2="105" />

              {/* Component connections */}
              <line x1="58" y1="80" x2="95" y2="80" />
              <line x1="115" y1="80" x2="145" y2="80" />
              <line x1="151" y1="52" x2="151" y2="45" />
              <line x1="151" y1="108" x2="151" y2="120" />
              <line x1="157" y1="78" x2="190" y2="78" />
              <line x1="240" y1="78" x2="260" y2="78" />
              <line x1="270" y1="55" x2="270" y2="45" />
            </g>

            {/* Current flow animation when defective */}
            {defectType !== 'none' && curve.shuntR < 200 && (
              <g>
                <circle cx="151" cy="80" r="4" fill={colors.error} filter="url(#ssdDefectGlow)">
                  <animate attributeName="cy" values="108;52;108" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <text x="165" y="145" fill={colors.error} fontSize={8} fontWeight="bold">Current Leaking!</text>
              </g>
            )}
          </g>

          {/* ============ SOLAR CELL VISUALIZATION ============ */}
          <g transform="translate(50, 275)">
            {/* Cell frame with premium gradient */}
            <rect x="0" y="0" width="255" height="130" rx={6} fill="url(#ssdSiliconGradient)" stroke="#3b82f6" strokeWidth={2} />

            {/* Cell grid pattern overlay */}
            <rect x="0" y="0" width="255" height="130" rx={6} fill="url(#ssdCellGrid)" />

            {/* Busbars (horizontal silver lines) */}
            {[1, 2, 3].map(i => (
              <rect key={`busbar-${i}`} x="0" y={i * 32 - 3} width="255" height="6" rx={1} fill="url(#ssdBusbarGradient)" />
            ))}

            {/* Fingers (vertical thin lines) */}
            {Array.from({ length: 25 }).map((_, i) => (
              <line key={`finger-${i}`} x1={10 + i * 10} y1="0" x2={10 + i * 10} y2="130" stroke="#a1a1aa" strokeWidth={0.5} opacity={0.6} />
            ))}

            {/* Cell label */}
            <text x="127" y="-10" fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">Solar Cell Cross-Section</text>

            {/* ============ DEFECT VISUALIZATIONS ============ */}
            {defectType === 'crack' && (
              <g>
                {/* Main crack with gradient and glow */}
                <g filter="url(#ssdDefectGlow)">
                  <path d="M 75 0 L 80 20 L 70 45 L 85 70 L 72 95 L 78 130" fill="none" stroke="url(#ssdCrackGradient)" strokeWidth={4} strokeLinecap="round" />
                  <path d="M 75 0 L 80 20 L 70 45 L 85 70 L 72 95 L 78 130" fill="none" stroke={colors.crack} strokeWidth={2} strokeLinecap="round" />
                </g>
                {/* Secondary crack */}
                <path d="M 175 0 L 170 25 L 180 55 L 168 85 L 175 130" fill="none" stroke="url(#ssdCrackGradient)" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
                {/* Crack effect - dark voids */}
                <ellipse cx="77" cy="45" rx="8" ry="4" fill="#1c1917" opacity={0.8} />
                <ellipse cx="174" cy="60" rx="6" ry="3" fill="#1c1917" opacity={0.6} />
                {/* Label */}
                <text x="127" y="150" fill={colors.crack} fontSize={10} fontWeight="bold" textAnchor="middle">Cell Cracks - Series Resistance Increase</text>
              </g>
            )}

            {defectType === 'shunt' && (
              <g>
                {/* Multiple shunt defect spots with radial glow */}
                <g filter="url(#ssdShuntFilter)">
                  <circle cx="90" cy="50" r={18 + defectSeverity * 0.12} fill="url(#ssdShuntGlow)">
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="180" cy="85" r={14 + defectSeverity * 0.08} fill="url(#ssdShuntGlow)">
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="50" cy="100" r={10 + defectSeverity * 0.05} fill="url(#ssdShuntGlow)">
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>
                {/* Leakage current arrows */}
                <g stroke={colors.purple} strokeWidth={1.5} fill={colors.purple} opacity={0.8}>
                  <line x1="90" y1="35" x2="90" y2="65">
                    <animate attributeName="y2" values="65;50;65" dur="0.6s" repeatCount="indefinite" />
                  </line>
                  <polygon points="90,65 87,58 93,58">
                    <animate attributeName="points" values="90,65 87,58 93,58;90,50 87,43 93,43;90,65 87,58 93,58" dur="0.6s" repeatCount="indefinite" />
                  </polygon>
                </g>
                {/* Label */}
                <text x="127" y="150" fill={colors.purple} fontSize={10} fontWeight="bold" textAnchor="middle">Shunt Defects - Parallel Leakage Paths</text>
              </g>
            )}

            {defectType === 'contact' && (
              <g>
                {/* Corroded contact areas on busbars */}
                <rect x="0" y="-8" width="255" height="8" rx={2} fill="url(#ssdCorrosionGradient)" opacity={0.9} />
                <rect x="0" y="130" width="255" height="8" rx={2} fill="url(#ssdCorrosionGradient)" opacity={0.9} />
                {/* Degraded spots on busbars */}
                {[40, 100, 160, 220].map(x => (
                  <g key={`corrosion-${x}`}>
                    <ellipse cx={x} cy={32} rx="12" ry="4" fill={colors.warning} opacity={0.7}>
                      <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
                    </ellipse>
                    <ellipse cx={x + 15} cy={64} rx="10" ry="3" fill={colors.warning} opacity={0.6}>
                      <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2.2s" repeatCount="indefinite" />
                    </ellipse>
                  </g>
                ))}
                {/* Resistance symbol */}
                <text x="127" y="150" fill={colors.warning} fontSize={10} fontWeight="bold" textAnchor="middle">Poor Contacts - Series Resistance at Busbars</text>
              </g>
            )}

            {defectType === 'hotspot' && (
              <g>
                {/* Intense hotspot with multiple glow layers */}
                <g filter="url(#ssdHotspotFilter)">
                  <circle cx="127" cy="65" r={35 + defectSeverity * 0.25} fill="url(#ssdHotspotGlow)">
                    <animate attributeName="r" values={`${30 + defectSeverity * 0.2};${40 + defectSeverity * 0.3};${30 + defectSeverity * 0.2}`} dur="0.6s" repeatCount="indefinite" />
                  </circle>
                </g>
                {/* Inner hot core */}
                <circle cx="127" cy="65" r={15 + defectSeverity * 0.1} fill="#ff4500" opacity={0.9}>
                  <animate attributeName="r" values={`${12 + defectSeverity * 0.08};${18 + defectSeverity * 0.12};${12 + defectSeverity * 0.08}`} dur="0.4s" repeatCount="indefinite" />
                </circle>
                {/* Heat wave lines */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <line
                    key={`heat-${i}`}
                    x1={127 + Math.cos(angle * Math.PI / 180) * 45}
                    y1={65 + Math.sin(angle * Math.PI / 180) * 45}
                    x2={127 + Math.cos(angle * Math.PI / 180) * 60}
                    y2={65 + Math.sin(angle * Math.PI / 180) * 60}
                    stroke={colors.hotspot}
                    strokeWidth={2}
                    opacity={0.6}
                  >
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
                  </line>
                ))}
                {/* Warning label */}
                <text x="127" y="150" fill={colors.hotspot} fontSize={11} fontWeight="bold" textAnchor="middle" filter="url(#ssdTextShadow)">
                  HOTSPOT - Dangerous Localized Heating!
                </text>
              </g>
            )}

            {defectType === 'none' && (
              <g>
                {/* Healthy cell glow effect */}
                <rect x="5" y="5" width="245" height="120" rx={4} fill="none" stroke={colors.success} strokeWidth={1} opacity={0.5}>
                  <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
                </rect>
                {/* Checkmark */}
                <circle cx="230" cy="20" r="12" fill={colors.success} opacity={0.2} />
                <path d="M 222 20 L 228 26 L 238 14" fill="none" stroke={colors.success} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {/* Label */}
                <text x="127" y="150" fill={colors.success} fontSize={10} fontWeight="bold" textAnchor="middle">Healthy Cell - Optimal Performance</text>
              </g>
            )}
          </g>

          {/* ============ METRICS PANEL ============ */}
          <g transform="translate(355, 275)">
            <rect x="0" y="0" width="320" height="130" rx={10} fill="url(#ssdCircuitBg)" stroke={defect.color} strokeWidth={2} />

            {/* Panel header */}
            <rect x="0" y="0" width="320" height="28" rx={10} fill={defect.color} fillOpacity={0.2} />
            <text x="160" y="19" fill={defect.color} fontSize={13} fontWeight="bold" textAnchor="middle">{defect.name} - Performance Metrics</text>

            {/* Metrics grid */}
            <g transform="translate(15, 40)">
              {/* Left column */}
              <text x="0" y="15" fill={colors.textMuted} fontSize={10}>Max Power:</text>
              <text x="80" y="15" fill={colors.textPrimary} fontSize={11} fontWeight="bold">{curve.maxPower.toFixed(2)} W</text>

              <text x="0" y="35" fill={colors.textMuted} fontSize={10}>Fill Factor:</text>
              <text x="80" y="35" fill={curve.fillFactor > 0.7 ? colors.success : curve.fillFactor > 0.5 ? colors.warning : colors.error} fontSize={11} fontWeight="bold">{(curve.fillFactor * 100).toFixed(1)}%</text>

              <text x="0" y="55" fill={colors.textMuted} fontSize={10}>Voc:</text>
              <text x="80" y="55" fill={colors.textPrimary} fontSize={11} fontWeight="bold">{curve.Voc.toFixed(3)} V</text>

              <text x="0" y="75" fill={colors.textMuted} fontSize={10}>Isc:</text>
              <text x="80" y="75" fill={colors.textPrimary} fontSize={11} fontWeight="bold">{curve.Isc.toFixed(2)} A</text>
            </g>

            <g transform="translate(165, 40)">
              {/* Right column */}
              <text x="0" y="15" fill={colors.textMuted} fontSize={10}>Series R:</text>
              <text x="70" y="15" fill={curve.seriesR > 1.5 ? colors.error : colors.textPrimary} fontSize={11} fontWeight="bold">{curve.seriesR.toFixed(2)} Ω</text>

              <text x="0" y="35" fill={colors.textMuted} fontSize={10}>Shunt R:</text>
              <text x="70" y="35" fill={curve.shuntR < 100 ? colors.error : colors.textPrimary} fontSize={11} fontWeight="bold">{curve.shuntR.toFixed(0)} Ω</text>

              {/* Power loss indicator */}
              {defectType !== 'none' && (
                <g transform="translate(-5, 50)">
                  <rect x="0" y="0" width="140" height="35" rx={6} fill="rgba(239, 68, 68, 0.15)" stroke={colors.error} strokeWidth={1} />
                  <text x="70" y="15" fill={colors.error} fontSize={9} textAnchor="middle">Power Loss</text>
                  <text x="70" y="30" fill={colors.error} fontSize={16} fontWeight="bold" textAnchor="middle">
                    -{((1 - curve.maxPower / 3.5) * 100).toFixed(1)}%
                  </text>
                </g>
              )}
            </g>
          </g>

          {/* ============ HOTSPOT RISK METER ============ */}
          <g transform="translate(50, 425)">
            <rect x="0" y="0" width="625" height="70" rx={10} fill="url(#ssdCircuitBg)" stroke={curve.hotspotRisk > 50 ? colors.hotspot : "#475569"} strokeWidth={curve.hotspotRisk > 50 ? 2 : 1} />

            {/* Header */}
            <text x="312" y="20" fill={colors.textSecondary} fontSize={12} fontWeight="bold" textAnchor="middle">HOTSPOT RISK ASSESSMENT</text>

            {/* Risk meter background */}
            <rect x="25" y="32" width="575" height="24" rx={6} fill="#1e293b" />

            {/* Gradient scale markers */}
            <rect x="25" y="32" width="575" height="24" rx={6} fill="url(#ssdRiskMeterBg)" opacity={0.3} />

            {/* Active risk level */}
            <rect x="25" y="32" width={575 * Math.min(curve.hotspotRisk / 100, 1)} height="24" rx={6} fill={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot}>
              {curve.hotspotRisk > 50 && (
                <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" />
              )}
            </rect>

            {/* Risk level indicator */}
            <circle cx={25 + 575 * Math.min(curve.hotspotRisk / 100, 1)} cy="44" r="14" fill="white" stroke={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot} strokeWidth={3} />
            <text x={25 + 575 * Math.min(curve.hotspotRisk / 100, 1)} y="48" fill={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot} fontSize={10} fontWeight="bold" textAnchor="middle">
              {curve.hotspotRisk.toFixed(0)}
            </text>

            {/* Scale labels */}
            <text x="45" y="66" fill={colors.success} fontSize={8} textAnchor="start">LOW</text>
            <text x="312" y="66" fill={colors.warning} fontSize={8} textAnchor="middle">MODERATE</text>
            <text x="580" y="66" fill={colors.hotspot} fontSize={8} textAnchor="end">CRITICAL</text>
          </g>

          {/* ============ EXPLANATION PANEL ============ */}
          <g transform="translate(50, 510)">
            <rect x="0" y="0" width="625" height="55" rx={10} fill="rgba(245, 158, 11, 0.1)" stroke={colors.accent} strokeWidth={1} />

            {/* Defect icon indicator */}
            <circle cx="30" cy="27" r="18" fill={defect.color} fillOpacity={0.2} stroke={defect.color} strokeWidth={1.5} />
            <text x="30" y="32" fill={defect.color} fontSize={14} textAnchor="middle">
              {defectType === 'none' ? '✓' : defectType === 'crack' ? '⚡' : defectType === 'shunt' ? '↯' : defectType === 'contact' ? '⊗' : '🔥'}
            </text>

            {/* Description text */}
            <text x="65" y="22" fill={colors.textSecondary} fontSize={11}>{defect.description}</text>
            <text x="65" y="42" fill={colors.textMuted} fontSize={10}>
              {defectType === 'crack' || defectType === 'contact'
                ? 'Series defect signature: I-V curve slope increases near Voc, reducing fill factor'
                : defectType === 'shunt' || defectType === 'hotspot'
                  ? 'Shunt defect signature: Voltage drops under load as current leaks through parallel paths'
                  : 'Optimal cell: High shunt resistance, low series resistance, rectangular I-V curve'}
            </text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Defect Type:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(defects).map(([key, def]) => (
            <button
              key={key}
              onClick={() => setDefectType(key as typeof defectType)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: defectType === key ? `2px solid ${def.color}` : '1px solid rgba(255,255,255,0.2)',
                background: defectType === key ? `${def.color}22` : 'transparent',
                color: def.color,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {def.name}
            </button>
          ))}
        </div>
      </div>

      {defectType !== 'none' && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Defect Severity: {defectSeverity}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={defectSeverity}
            onChange={(e) => setDefectSeverity(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: defects[defectType].color }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          <strong>Key Insight:</strong> Series defects kill current/FF; Shunt defects kill voltage
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Different defects map to different circuit equivalent changes
        </div>
      </div>
    </div>
  );

  // Progress bar showing all phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 16px',
      }}>
        {phaseOrder.map((p, idx) => (
          <div
            key={p}
            onClick={() => idx <= currentIdx && goToPhase(p)}
            title={phaseLabels[p]}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: idx === currentIdx ? colors.accent : idx < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
              cursor: idx <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    );
  };

  // Bottom bar with Back/Next navigation
  const renderBottomBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
        zIndex: 1000,
      }}>
        {renderProgressBar()}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}>
          <button
            onClick={goBack}
            disabled={isFirst}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: `1px solid ${isFirst ? 'transparent' : colors.accent}`,
              background: 'transparent',
              color: isFirst ? colors.textMuted : colors.accent,
              fontWeight: 'bold',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isFirst ? 0.5 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Back
          </button>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>
            {phaseLabels[phase]}
          </span>
          <button
            onClick={goNext}
            disabled={isLast}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isLast ? colors.success : colors.accent,
              color: 'white',
              fontWeight: 'bold',
              cursor: isLast ? 'default' : 'pointer',
              fontSize: '14px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isLast ? 'Complete' : 'Next'}
          </button>
        </div>
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
              Shunt vs Series Defects
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If a panel has a crack, does it act like 'less area' or a 'leak'?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Not all solar cell defects are created equal. Some act like adding resistance
                in series (blocking current), while others create parallel paths that leak
                voltage. Understanding the difference is crucial for diagnosis!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization()}

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does a cell crack affect solar panel performance?
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
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Compare Defect Types</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Select different defects and observe how the I-V curve changes
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Cracks and poor contacts → Series resistance → Curve bends near Voc</li>
              <li>Shunt defects → Parallel leakage → Voltage drops under load</li>
              <li>Hotspots → Extreme local heating → Fire hazard!</li>
              <li>Compare the I-V signatures of each defect type</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'both';

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
              {wasCorrect ? 'Correct!' : 'Important distinction!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Different defects have different electrical signatures! Series defects (cracks, contacts)
              reduce fill factor by bending the curve near Voc. Shunt defects create parallel paths
              that reduce voltage under load.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Defect Physics</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Series Resistance (Rs):</strong> Cracks
                and poor contacts add resistance in the current path. Current must flow through the
                high-resistance region, causing voltage drop (IR loss) at high currents.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shunt Resistance (Rsh):</strong> Crystal
                defects and edge damage create parallel paths. Current "leaks" through these paths
                instead of the load, reducing effective voltage.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>I-V Signature:</strong> High Rs makes
                the curve droop near Voc. Low Rsh makes voltage drop as current increases. Both
                reduce fill factor but in different ways!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
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
              What happens when current is forced through a defective cell?
            </p>
          </div>

          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              In a series-connected string, all cells must carry the same current. If one
              cell is defective or shaded, it becomes a load rather than a generator.
              What happens to that cell?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is the "hotspot risk" with defective cells?
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
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Hotspot Risk Analysis</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Try the "Hotspot" defect type and increase severity
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(255, 69, 0, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.hotspot}`,
          }}>
            <h4 style={{ color: colors.hotspot, marginBottom: '8px' }}>DANGER: Hotspot Formation</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              When a cell is shaded or severely defective, series-connected cells force
              current through it in reverse. The cell becomes a resistive load, dissipating
              power as heat. Temperatures can exceed 150°C - enough to melt solder and
              ignite backsheets!
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'high_risk';

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
              {wasCorrect ? 'Correct - Safety critical!' : 'This is a real safety hazard!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Hotspots are one of the main causes of solar panel fires. A single shaded or
              defective cell can reach temperatures that damage the module and pose fire risk.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.hotspot, marginBottom: '12px' }}>Hotspot Prevention</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Bypass Diodes:</strong> Every module
                has bypass diodes (typically 1 per 20 cells) that activate when a cell is reverse-biased,
                providing an alternative current path.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Design Limits:</strong> Cell breakdown
                voltage and bypass diode triggering are carefully matched to prevent dangerous
                reverse voltages before the diode activates.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thermal Inspection:</strong> Regular IR
                imaging can detect developing hotspots before they become dangerous. Temperature
                differences of 10°C or more indicate potential problems.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
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
              Defect analysis is critical for solar O&M
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
        {renderBottomBar()}
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
          {renderBottomBar()}
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
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered defect analysis!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Series vs shunt defects have different I-V signatures</li>
              <li>Cracks and contacts increase series resistance</li>
              <li>Crystal defects create shunt paths</li>
              <li>Hotspots are dangerous reverse-bias conditions</li>
              <li>Bypass diodes protect against hotspot damage</li>
            </ul>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default ShuntSeriesDefectsRenderer;
