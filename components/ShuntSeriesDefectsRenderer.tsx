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
    const width = 550;
    const height = 500;
    const curve = calculateIVCurve();
    const defect = defects[defectType];

    // Graph dimensions
    const graphX = 60;
    const graphY = 50;
    const graphWidth = 200;
    const graphHeight = 150;

    const Isc = 8.0;
    const Voc = 0.65;
    const vScale = graphWidth / (Voc * 1.15);
    const iScale = graphHeight / (Isc * 1.1);

    // Create path for I-V curve
    const pathData = curve.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - p.i * iScale}`)
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '600px' }}
        >
          {/* Title */}
          <text x={width / 2} y={25} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle">
            Shunt vs Series Defects - Circuit Analysis
          </text>

          {/* I-V Curve Graph */}
          <g transform="translate(0, 0)">
            <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill="#111827" rx={4} />

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(frac => (
              <g key={`grid-${frac}`}>
                <line x1={graphX} y1={graphY + graphHeight * (1 - frac)} x2={graphX + graphWidth} y2={graphY + graphHeight * (1 - frac)} stroke="#374151" strokeWidth={1} strokeDasharray="2,2" />
                <line x1={graphX + graphWidth * frac} y1={graphY} x2={graphX + graphWidth * frac} y2={graphY + graphHeight} stroke="#374151" strokeWidth={1} strokeDasharray="2,2" />
              </g>
            ))}

            {/* Healthy curve (reference) */}
            <path d={healthyPath} fill="none" stroke={colors.success} strokeWidth={2} strokeDasharray="5,3" opacity={0.5} />

            {/* Defective curve */}
            <path d={pathData} fill="none" stroke={defect.color} strokeWidth={3} />

            {/* Axes */}
            <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth + 10} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} />
            <line x1={graphX} y1={graphY - 5} x2={graphX} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} />
            <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 18} fill={colors.textMuted} fontSize={10} textAnchor="middle">Voltage</text>
            <text x={graphX - 8} y={graphY + graphHeight / 2} fill={colors.textMuted} fontSize={10} textAnchor="middle" transform={`rotate(-90, ${graphX - 8}, ${graphY + graphHeight / 2})`}>Current</text>

            {/* Legend */}
            <line x1={graphX + 10} y1={graphY + 10} x2={graphX + 30} y2={graphY + 10} stroke={colors.success} strokeWidth={2} strokeDasharray="5,3" />
            <text x={graphX + 35} y={graphY + 13} fill={colors.textMuted} fontSize={9}>Healthy</text>
            <line x1={graphX + 10} y1={graphY + 23} x2={graphX + 30} y2={graphY + 23} stroke={defect.color} strokeWidth={2} />
            <text x={graphX + 35} y={graphY + 26} fill={defect.color} fontSize={9}>{defect.name}</text>
          </g>

          {/* Equivalent Circuit Diagram */}
          <g transform="translate(290, 50)">
            <rect x="0" y="0" width="230" height="150" rx={8} fill="#111827" stroke={colors.textMuted} strokeWidth={1} />
            <text x="115" y="18" fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">Equivalent Circuit</text>

            {/* Circuit components */}
            {/* Current source (Iph) */}
            <circle cx="40" cy="75" r="15" fill="none" stroke={colors.success} strokeWidth={2} />
            <text x="40" y="79" fill={colors.success} fontSize={10} textAnchor="middle">Iph</text>

            {/* Diode */}
            <path d="M 70 60 L 85 75 L 70 90 Z" fill="none" stroke={colors.accent} strokeWidth={2} />
            <line x1="85" y1="60" x2="85" y2="90" stroke={colors.accent} strokeWidth={2} />

            {/* Shunt resistance */}
            <g transform="translate(110, 55)">
              <rect x="0" y="0" width="8" height="40" fill="none" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={2} />
              <text x="4" y="55" fill={curve.shuntR < 100 ? colors.error : colors.textMuted} fontSize={9} textAnchor="middle">Rsh</text>
              <text x="4" y="67" fill={curve.shuntR < 100 ? colors.error : colors.textMuted} fontSize={8} textAnchor="middle">{curve.shuntR.toFixed(0)}Ω</text>
            </g>

            {/* Series resistance */}
            <g transform="translate(145, 65)">
              <rect x="0" y="0" width="35" height="8" fill="none" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={2} />
              <text x="17" y="20" fill={curve.seriesR > 1.5 ? colors.error : colors.textMuted} fontSize={9} textAnchor="middle">Rs</text>
              <text x="17" y="32" fill={curve.seriesR > 1.5 ? colors.error : colors.textMuted} fontSize={8} textAnchor="middle">{curve.seriesR.toFixed(1)}Ω</text>
            </g>

            {/* Load */}
            <rect x="195" y="55" width="20" height="40" fill="none" stroke={colors.textSecondary} strokeWidth={2} />
            <text x="205" y="110" fill={colors.textMuted} fontSize={9} textAnchor="middle">Load</text>

            {/* Connection lines */}
            <line x1="55" y1="75" x2="70" y2="75" stroke={colors.textSecondary} strokeWidth={1} />
            <line x1="85" y1="75" x2="110" y2="75" stroke={colors.textSecondary} strokeWidth={1} />
            <line x1="118" y1="75" x2="145" y2="75" stroke={colors.textSecondary} strokeWidth={1} />
            <line x1="180" y1="69" x2="195" y2="69" stroke={colors.textSecondary} strokeWidth={1} />

            {/* Current flow indicators */}
            {defectType !== 'none' && (
              <>
                {curve.shuntR < 200 && (
                  <g>
                    <circle cx="114" cy="95" r="4" fill={colors.error} opacity={0.8}>
                      <animate attributeName="cy" values="95;55;95" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <text x="125" y="130" fill={colors.error} fontSize={8}>Leakage!</text>
                  </g>
                )}
                {curve.seriesR > 1.5 && (
                  <g>
                    <text x="163" y="55" fill={colors.error} fontSize={8}>Resistance!</text>
                  </g>
                )}
              </>
            )}
          </g>

          {/* Cell Visualization */}
          <g transform="translate(60, 220)">
            <rect x="0" y="0" width="200" height="100" rx={4} fill="#1e40af" stroke="#3b82f6" strokeWidth={2} />
            <text x="100" y="-8" fill={colors.textSecondary} fontSize={11} textAnchor="middle">Solar Cell</text>

            {/* Grid lines */}
            {[1, 2, 3, 4].map(i => (
              <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} stroke="#3b82f6" strokeWidth={1} opacity={0.5} />
            ))}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="100" stroke="#3b82f6" strokeWidth={1} opacity={0.3} />
            ))}

            {/* Defect visualization */}
            {defectType === 'crack' && (
              <g>
                <path d="M 60 0 L 65 25 L 55 50 L 70 75 L 60 100" fill="none" stroke={colors.crack} strokeWidth={3} />
                <path d="M 140 0 L 135 30 L 145 60 L 130 100" fill="none" stroke={colors.crack} strokeWidth={2} opacity={0.6} />
                <text x="100" y="120" fill={colors.crack} fontSize={10} textAnchor="middle">Cracks interrupt current flow</text>
              </g>
            )}
            {defectType === 'shunt' && (
              <g>
                <circle cx="80" cy="40" r="15" fill={colors.purple} opacity={0.5}>
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="70" r="10" fill={colors.purple} opacity={0.4}>
                  <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <text x="100" y="120" fill={colors.purple} fontSize={10} textAnchor="middle">Shunt paths leak current</text>
              </g>
            )}
            {defectType === 'contact' && (
              <g>
                <rect x="0" y="-5" width="200" height="5" fill={colors.warning} opacity={0.6} />
                <rect x="0" y="100" width="200" height="5" fill={colors.warning} opacity={0.6} />
                <text x="100" y="120" fill={colors.warning} fontSize={10} textAnchor="middle">Poor contacts add resistance</text>
              </g>
            )}
            {defectType === 'hotspot' && (
              <g>
                <circle cx="100" cy="50" r={25 + defectSeverity * 0.15} fill={colors.hotspot} opacity={0.5 + defectSeverity * 0.004}>
                  <animate attributeName="r" values={`${20 + defectSeverity * 0.1};${30 + defectSeverity * 0.15};${20 + defectSeverity * 0.1}`} dur="0.8s" repeatCount="indefinite" />
                </circle>
                <text x="100" y="120" fill={colors.hotspot} fontSize={10} textAnchor="middle">HOTSPOT - Dangerous Heat!</text>
              </g>
            )}
            {defectType === 'none' && (
              <text x="100" y="120" fill={colors.success} fontSize={10} textAnchor="middle">Healthy Cell - No Defects</text>
            )}
          </g>

          {/* Output Metrics */}
          <g transform="translate(290, 220)">
            <rect x="0" y="0" width="230" height="100" rx={8} fill="#111827" stroke={defect.color} strokeWidth={1} />
            <text x="115" y="18" fill={defect.color} fontSize={12} fontWeight="bold" textAnchor="middle">{defect.name}</text>

            <text x="15" y="40" fill={colors.textSecondary} fontSize={10}>Power: <tspan fill={colors.textPrimary} fontWeight="bold">{curve.maxPower.toFixed(1)} W</tspan></text>
            <text x="15" y="55" fill={colors.textSecondary} fontSize={10}>Fill Factor: <tspan fill={curve.fillFactor > 0.7 ? colors.success : colors.warning} fontWeight="bold">{(curve.fillFactor * 100).toFixed(1)}%</tspan></text>
            <text x="15" y="70" fill={colors.textSecondary} fontSize={10}>Series R: <tspan fill={curve.seriesR > 1.5 ? colors.error : colors.textPrimary} fontWeight="bold">{curve.seriesR.toFixed(1)} Ω</tspan></text>
            <text x="15" y="85" fill={colors.textSecondary} fontSize={10}>Shunt R: <tspan fill={curve.shuntR < 100 ? colors.error : colors.textPrimary} fontWeight="bold">{curve.shuntR.toFixed(0)} Ω</tspan></text>

            {/* Power loss indicator */}
            {defectType !== 'none' && (
              <g transform="translate(130, 30)">
                <rect x="0" y="0" width="90" height="60" rx={4} fill="rgba(239, 68, 68, 0.2)" />
                <text x="45" y="15" fill={colors.error} fontSize={9} textAnchor="middle">Power Loss</text>
                <text x="45" y="40" fill={colors.error} fontSize={18} fontWeight="bold" textAnchor="middle">
                  {((1 - curve.maxPower / 3.5) * 100).toFixed(0)}%
                </text>
              </g>
            )}
          </g>

          {/* Hotspot Risk Meter */}
          <g transform="translate(60, 340)">
            <rect x="0" y="0" width="460" height="60" rx={8} fill="#111827" stroke={curve.hotspotRisk > 50 ? colors.hotspot : colors.textMuted} strokeWidth={curve.hotspotRisk > 50 ? 2 : 1} />
            <text x="230" y="18" fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">HOTSPOT RISK INDICATOR</text>

            <rect x="20" y="28" width="420" height="20" rx={4} fill="#374151" />
            <rect x="20" y="28" width={420 * curve.hotspotRisk / 100} height="20" rx={4} fill={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot} />

            <text x="230" y="42" fill="white" fontSize={12} fontWeight="bold" textAnchor="middle">
              {curve.hotspotRisk < 30 ? 'LOW' : curve.hotspotRisk < 60 ? 'MODERATE' : 'HIGH RISK'}
            </text>
          </g>

          {/* Explanation */}
          <rect x={60} y={420} width={430} height={55} rx={8} fill="rgba(245, 158, 11, 0.15)" stroke={colors.accent} strokeWidth={1} />
          <text x={275} y={442} fill={colors.textSecondary} fontSize={10} textAnchor="middle">{defect.description}</text>
          <text x={275} y={460} fill={colors.textMuted} fontSize={9} textAnchor="middle">
            {defectType === 'crack' || defectType === 'contact' ? 'Series defect → Slope change near Voc' : defectType === 'shunt' || defectType === 'hotspot' ? 'Shunt defect → Voltage drop under load' : 'Optimal circuit parameters'}
          </text>
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
