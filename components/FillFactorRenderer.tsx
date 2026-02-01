import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for this game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface FillFactorRendererProps {
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
  cellA: '#22c55e',
  cellB: '#ef4444',
};

const FillFactorRenderer: React.FC<FillFactorRendererProps> = ({
  gamePhase,
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
  const [seriesResistance, setSeriesResistance] = useState(0.5); // Ohm
  const [shuntResistance, setShuntResistance] = useState(1000); // Ohm
  const [recombinationFactor, setRecombinationFactor] = useState(1.0); // Ideality factor
  const [temperature, setTemperature] = useState(25); // Celsius
  const [loadResistance, setLoadResistance] = useState(5); // Ohm for operating point

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics constants
  const Voc = 0.65; // Open-circuit voltage
  const Isc = 8.0; // Short-circuit current (A)
  const q = 1.602e-19; // Electron charge
  const k = 1.381e-23; // Boltzmann constant
  const T = 273.15 + temperature; // Temperature in Kelvin

  // Calculate I-V curve
  const calculateIVCurve = useCallback(() => {
    const points: { v: number; i: number }[] = [];
    const n = recombinationFactor + 0.3; // Ideality factor (1-2 typically)

    // Thermal voltage
    const Vt = (n * k * T) / q;

    // Photogenerated current (decreases slightly with temperature)
    const Iph = Isc * (1 - 0.0005 * (temperature - 25));

    // Saturation current (increases with temperature)
    const I0 = 1e-9 * Math.exp(0.05 * (temperature - 25));

    // Generate I-V curve
    for (let v = 0; v <= Voc * 1.1; v += 0.01) {
      // Diode equation with series and shunt resistance
      // I = Iph - I0*(exp((V+I*Rs)/(n*Vt))-1) - (V+I*Rs)/Rsh
      // Simplified iterative solution
      let i = Iph;
      for (let iter = 0; iter < 10; iter++) {
        const vd = v + i * seriesResistance;
        const idiode = I0 * (Math.exp(vd / Vt) - 1);
        const ishunt = vd / shuntResistance;
        i = Iph - idiode - ishunt;
        if (i < 0) i = 0;
      }
      points.push({ v, i });
    }

    // Find maximum power point
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

    // Calculate fill factor
    const idealPower = Voc * Isc;
    const fillFactor = maxPower / idealPower;

    return {
      points,
      Voc: points.find(p => p.i < 0.1)?.v || Voc,
      Isc: points[0]?.i || Isc,
      Vmp,
      Imp,
      maxPower,
      fillFactor,
    };
  }, [seriesResistance, shuntResistance, recombinationFactor, temperature]);

  const predictions = [
    { id: 'same', label: 'Same Voc means same power output - voltage determines everything' },
    { id: 'higher', label: 'One could have higher current, giving more power despite same Voc' },
    { id: 'shape', label: 'The shape of the I-V curve matters - a "rounder" curve means less power' },
    { id: 'size', label: 'Only the physical size of the panel matters for power' },
  ];

  const twistPredictions = [
    { id: 'improve', label: 'Warming the cell improves fill factor by reducing resistance' },
    { id: 'degrade', label: 'Warming the cell degrades fill factor and reduces power' },
    { id: 'no_change', label: 'Temperature has no effect on fill factor' },
    { id: 'increase_voltage', label: 'Higher temperature increases voltage and power' },
  ];

  const transferApplications = [
    {
      title: 'Solar Panel Quality Testing',
      description: 'Manufacturing quality is assessed by measuring fill factor, not just Voc or Isc.',
      question: 'Why is fill factor used for quality control in solar manufacturing?',
      answer: 'Fill factor captures both series resistance (from poor contacts) and shunt resistance (from crystal defects) in a single number. A high-quality cell has FF > 0.75, while defective cells may drop below 0.6 even with normal Voc and Isc.',
    },
    {
      title: 'Partial Shading Effects',
      description: 'Shade on part of a panel dramatically reduces fill factor, not just proportional power.',
      question: 'Why does shading one cell reduce power more than proportional area?',
      answer: 'A shaded cell becomes reverse-biased and acts as a resistor, dramatically increasing series resistance for the entire string. This collapses the fill factor, reducing power by far more than the shaded area alone.',
    },
    {
      title: 'Cell Degradation Monitoring',
      description: 'Fill factor degradation over time indicates developing problems before catastrophic failure.',
      question: 'How can monitoring fill factor predict solar panel failure?',
      answer: 'As cells degrade from corrosion, cracking, or delamination, series resistance increases and shunt paths develop. FF drops before Voc or Isc change noticeably, providing early warning of failing modules.',
    },
    {
      title: 'Maximum Power Point Tracking',
      description: 'MPPT controllers find the optimal operating point on the I-V curve in real-time.',
      question: 'Why do MPPT controllers need to track continuously rather than use fixed settings?',
      answer: 'The I-V curve shape changes with irradiance, temperature, and aging. The maximum power point voltage shifts significantly - tracking ensures operation at peak power regardless of conditions.',
    },
  ];

  const testQuestions = [
    {
      question: 'Fill factor is defined as:',
      options: [
        { text: 'The ratio of cell area to panel area', correct: false },
        { text: 'The ratio of maximum power to the product of Voc and Isc', correct: true },
        { text: 'The percentage of light absorbed', correct: false },
        { text: 'The ratio of current to voltage', correct: false },
      ],
    },
    {
      question: 'A "squarer" I-V curve indicates:',
      options: [
        { text: 'Lower efficiency', correct: false },
        { text: 'Higher fill factor and better performance', correct: true },
        { text: 'More series resistance', correct: false },
        { text: 'Higher temperature', correct: false },
      ],
    },
    {
      question: 'Series resistance primarily affects:',
      options: [
        { text: 'Open-circuit voltage', correct: false },
        { text: 'Short-circuit current', correct: false },
        { text: 'The slope of the I-V curve near Voc', correct: true },
        { text: 'Light absorption', correct: false },
      ],
    },
    {
      question: 'Low shunt resistance causes:',
      options: [
        { text: 'Current leakage paths that reduce voltage', correct: true },
        { text: 'Increased open-circuit voltage', correct: false },
        { text: 'Better fill factor', correct: false },
        { text: 'Higher power output', correct: false },
      ],
    },
    {
      question: 'Increasing temperature typically:',
      options: [
        { text: 'Increases fill factor', correct: false },
        { text: 'Decreases fill factor and Voc', correct: true },
        { text: 'Has no effect on performance', correct: false },
        { text: 'Increases short-circuit current significantly', correct: false },
      ],
    },
    {
      question: 'Two panels with identical Voc but different fill factors will:',
      options: [
        { text: 'Produce the same power', correct: false },
        { text: 'Have different maximum power points', correct: true },
        { text: 'Have identical I-V curves', correct: false },
        { text: 'Work equally well in all conditions', correct: false },
      ],
    },
    {
      question: 'Recombination in a solar cell:',
      options: [
        { text: 'Improves efficiency', correct: false },
        { text: 'Reduces efficiency by losing charge carriers before collection', correct: true },
        { text: 'Only occurs at high temperatures', correct: false },
        { text: 'Increases the fill factor', correct: false },
      ],
    },
    {
      question: 'The ideality factor (n) in solar cells:',
      options: [
        { text: 'Should be as high as possible', correct: false },
        { text: 'Equals 1 for ideal cells, higher values indicate recombination', correct: true },
        { text: 'Is unrelated to fill factor', correct: false },
        { text: 'Only matters for silicon cells', correct: false },
      ],
    },
    {
      question: 'Maximum power point (MPP) occurs where:',
      options: [
        { text: 'Current is maximum', correct: false },
        { text: 'Voltage is maximum', correct: false },
        { text: 'The product of V and I is maximum', correct: true },
        { text: 'Fill factor equals 1', correct: false },
      ],
    },
    {
      question: 'A practical silicon solar cell typically has a fill factor of:',
      options: [
        { text: '0.3 - 0.4', correct: false },
        { text: '0.5 - 0.6', correct: false },
        { text: '0.7 - 0.85', correct: true },
        { text: '0.95 - 1.0', correct: false },
      ],
    },
  ];

  // Real-world applications data
  const realWorldApps = [
    {
      icon: 'Sun',
      title: 'Solar Panel Quality Testing',
      short: 'Photovoltaics QC',
      tagline: 'Ensuring every panel meets performance standards',
      description: 'Fill factor is the primary quality metric in solar manufacturing. By measuring how closely the I-V curve approaches the ideal rectangle, engineers can detect microscopic defects, poor solder joints, and material impurities that would otherwise go unnoticed until field failure.',
      connection: 'Fill factor directly measures the electrical losses in a cell. A manufacturing defect that increases series resistance or creates shunt paths will immediately show up as reduced FF, even if Voc and Isc appear normal.',
      howItWorks: 'Every solar cell undergoes flash testing where a brief intense light pulse illuminates the cell while the I-V curve is rapidly traced. Automated systems calculate FF in milliseconds and reject cells below threshold, typically 0.72-0.78 depending on cell technology.',
      stats: [
        { value: '< 0.5s', label: 'Test time per cell' },
        { value: '99.9%', label: 'Detection accuracy' },
        { value: '$0.02', label: 'Cost per test' },
      ],
      examples: [
        'Production line cell sorting by efficiency bins',
        'Incoming quality inspection for module assembly',
        'Warranty claim verification and failure analysis',
        'Process optimization feedback for manufacturing',
      ],
      companies: ['First Solar', 'LONGi', 'JinkoSolar', 'Canadian Solar', 'Trina Solar'],
      futureImpact: 'AI-powered vision systems are being integrated with FF testing to correlate visual defects with electrical performance, enabling predictive quality control that catches issues before they affect fill factor.',
      color: '#f59e0b',
    },
    {
      icon: 'Lightbulb',
      title: 'LED Performance Optimization',
      short: 'Lighting Efficiency',
      tagline: 'Maximizing lumens per watt through I-V analysis',
      description: 'LEDs share the same p-n junction physics as solar cells, but in reverse. The fill factor concept applies to LED efficiency - a well-designed LED has a sharp I-V knee that minimizes resistive losses and maximizes light output at the operating current.',
      connection: 'Just as solar cell FF measures how much power is extracted, LED "wall-plug efficiency" depends on minimizing voltage drop across series resistance. Poor thermal design or degraded contacts reduce the effective fill factor of the LED I-V characteristic.',
      howItWorks: 'LED binning uses I-V curve analysis to sort devices by forward voltage and efficiency. High-performance LEDs have steep I-V curves with minimal droop, analogous to high fill factor in solar cells. This ensures consistent brightness in multi-LED fixtures.',
      stats: [
        { value: '200+', label: 'Lumens per watt achieved' },
        { value: '85%', label: 'Typical wall-plug efficiency' },
        { value: '50,000h', label: 'Lifetime at rated FF' },
      ],
      examples: [
        'Automotive headlight LED selection and matching',
        'Display backlight uniformity optimization',
        'High-bay industrial lighting efficiency',
        'Horticultural grow light spectrum tuning',
      ],
      companies: ['Cree', 'Lumileds', 'Osram', 'Samsung LED', 'Nichia'],
      futureImpact: 'Micro-LED displays require millions of LEDs with matched I-V characteristics. Fill factor analysis at the microscale enables the color uniformity needed for next-generation AR/VR displays.',
      color: '#3b82f6',
    },
    {
      icon: 'Flask',
      title: 'Perovskite Solar Cell Research',
      short: 'Emerging Tech',
      tagline: 'Pushing efficiency boundaries in next-gen photovoltaics',
      description: 'Perovskite solar cells have achieved remarkable efficiency gains but struggle with fill factor stability. Researchers use FF as a key metric to understand ion migration, interface recombination, and hysteresis effects that limit commercial viability.',
      connection: 'Perovskite cells exhibit unusual I-V behavior where FF depends on scan direction and speed due to mobile ions. Understanding this hysteresis through FF analysis is critical to developing stable, high-performance devices.',
      howItWorks: 'Researchers measure I-V curves at multiple scan rates and directions, then analyze how FF changes. Stable perovskites show consistent FF regardless of measurement conditions. Interface engineering and passivation strategies are evaluated by their impact on FF stability.',
      stats: [
        { value: '26.1%', label: 'Record perovskite efficiency' },
        { value: '0.84', label: 'Best achieved fill factor' },
        { value: '10,000h', label: 'Stability target for commercialization' },
      ],
      examples: [
        'Tandem cell integration with silicon bottom cells',
        'Flexible perovskite for building-integrated PV',
        'Lead-free perovskite material development',
        'Scalable deposition process optimization',
      ],
      companies: ['Oxford PV', 'Swift Solar', 'Tandem PV', 'Saule Technologies'],
      futureImpact: 'Perovskite-silicon tandems could exceed 30% efficiency with optimized fill factors. Solving the FF stability challenge would enable the biggest leap in solar efficiency since multi-junction cells.',
      color: '#a855f7',
    },
    {
      icon: 'Rocket',
      title: 'Space Solar Arrays',
      short: 'Aerospace',
      tagline: 'Powering satellites with ultra-high efficiency cells',
      description: 'Space solar arrays use multi-junction cells with fill factors exceeding 0.85. In the harsh space environment, radiation damage gradually degrades FF, making it a critical parameter for mission lifetime predictions and power budget planning.',
      connection: 'Radiation in space creates defects that act as recombination centers, progressively degrading fill factor. Mission planners use FF degradation models to size arrays with enough margin for end-of-life power requirements.',
      howItWorks: 'Space-qualified cells undergo proton and electron irradiation testing to characterize FF degradation curves. Flight arrays include calibration cells that are periodically measured to track actual degradation versus predictions, enabling adaptive power management.',
      stats: [
        { value: '32%', label: 'Triple-junction efficiency' },
        { value: '0.87', label: 'Beginning-of-life FF' },
        { value: '15 years', label: 'GEO satellite design life' },
      ],
      examples: [
        'International Space Station solar array upgrades',
        'Mars rover power system design',
        'Starlink satellite mass-optimized arrays',
        'James Webb Space Telescope power budget',
      ],
      companies: ['Boeing Spectrolab', 'SolAero', 'Azur Space', 'Sharp', 'Airbus'],
      futureImpact: 'Space-based solar power stations would beam energy to Earth using massive arrays. Maintaining high fill factor over decades in GEO radiation environment is essential for economic viability of this transformative technology.',
      color: '#10b981',
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
    const height = 450;
    const curve = calculateIVCurve();

    // Graph dimensions
    const graphX = 60;
    const graphY = 50;
    const graphWidth = 280;
    const graphHeight = 200;

    // Scale factors
    const vScale = graphWidth / (Voc * 1.1);
    const iScale = graphHeight / (Isc * 1.1);

    // Create path for I-V curve
    const pathData = curve.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - p.i * iScale}`)
      .join(' ');

    // MPP rectangle
    const mppX = graphX + curve.Vmp * vScale;
    const mppY = graphY + graphHeight - curve.Imp * iScale;

    // Determine quality color for gradients
    const qualityColor = curve.fillFactor > 0.7 ? colors.success : curve.fillFactor > 0.5 ? colors.warning : colors.error;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        {/* Title moved outside SVG */}
        <h3 style={{
          color: colors.textPrimary,
          fontSize: typo.heading,
          fontWeight: 'bold',
          textAlign: 'center',
          margin: 0
        }}>
          I-V Curve and Fill Factor Analysis
        </h3>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '600px' }}
        >
          {/* Premium defs section with ff* prefix for unique IDs */}
          <defs>
            {/* Background gradient */}
            <linearGradient id="ffLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>

            {/* I-V curve gradient - amber to gold with 5 color stops */}
            <linearGradient id="ffIVCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Maximum power rectangle gradient - green with depth (6 stops) */}
            <linearGradient id="ffMppRectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#059669" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#047857" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#065f46" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.4" />
            </linearGradient>

            {/* Ideal power rectangle gradient - muted gray */}
            <linearGradient id="ffIdealRectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#4b5563" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#374151" stopOpacity="0.2" />
            </linearGradient>

            {/* MPP point radial glow */}
            <radialGradient id="ffMppGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Fill factor gauge gradient - good (green) */}
            <linearGradient id="ffGaugeGradientGood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="75%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            {/* Fill factor gauge gradient - warning (amber) */}
            <linearGradient id="ffGaugeGradientWarning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#fcd34d" />
              <stop offset="75%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            {/* Fill factor gauge gradient - error (red) */}
            <linearGradient id="ffGaugeGradientError" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#fca5a5" />
              <stop offset="75%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Solar cell panel gradient with reflection effect */}
            <linearGradient id="ffSolarCellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="20%" stopColor="#0c4a6e" />
              <stop offset="40%" stopColor="#0369a1" />
              <stop offset="60%" stopColor="#0284c7" />
              <stop offset="80%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>

            {/* Solar cell reflection overlay */}
            <linearGradient id="ffCellReflection" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Parameter card gradients */}
            <linearGradient id="ffParamCardGood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="ffParamCardBad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.15" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="ffInfoPanelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Quality assessment gradients */}
            <linearGradient id="ffQualityExcellent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="ffQualityWarning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="ffQualityError" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#f87171" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>

            {/* Glow filters using feGaussianBlur + feMerge pattern */}
            <filter id="ffCurveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ffMppGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ffPanelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ffInnerGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="ffTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="ffGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Premium dark background */}
          <rect width={width} height={height} fill="url(#ffLabBg)" rx={12} />
          <rect width={width} height={height} fill="url(#ffGridPattern)" rx={12} />

          {/* Graph background with depth */}
          <rect x={graphX - 2} y={graphY - 2} width={graphWidth + 4} height={graphHeight + 4} rx={6} fill="#0a0f1a" />
          <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} rx={4} fill="url(#ffInfoPanelGradient)" />

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(frac => (
            <g key={`grid-${frac}`}>
              <line
                x1={graphX}
                y1={graphY + graphHeight * (1 - frac)}
                x2={graphX + graphWidth}
                y2={graphY + graphHeight * (1 - frac)}
                stroke="#374151"
                strokeWidth={1}
                strokeDasharray="3,3"
                strokeOpacity={0.6}
              />
              <line
                x1={graphX + graphWidth * frac}
                y1={graphY}
                x2={graphX + graphWidth * frac}
                y2={graphY + graphHeight}
                stroke="#374151"
                strokeWidth={1}
                strokeDasharray="3,3"
                strokeOpacity={0.6}
              />
            </g>
          ))}

          {/* Ideal rectangle (Voc x Isc) with gradient */}
          <rect
            x={graphX}
            y={graphY + graphHeight - Isc * iScale}
            width={Voc * vScale}
            height={Isc * iScale}
            fill="url(#ffIdealRectGradient)"
            stroke={colors.textMuted}
            strokeWidth={1}
            strokeDasharray="5,3"
            strokeOpacity={0.7}
          />

          {/* Maximum power rectangle with premium gradient and glow */}
          <rect
            x={graphX}
            y={mppY}
            width={curve.Vmp * vScale}
            height={curve.Imp * iScale}
            fill="url(#ffMppRectGradient)"
            stroke={colors.success}
            strokeWidth={2}
            filter="url(#ffPanelGlow)"
          />

          {/* I-V curve with gradient and glow */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#ffIVCurveGradient)"
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#ffCurveGlow)"
          />

          {/* MPP operating point with enhanced radial glow */}
          <circle
            cx={mppX}
            cy={mppY}
            r={12}
            fill="url(#ffMppGlow)"
            filter="url(#ffMppGlowFilter)"
          />
          <circle
            cx={mppX}
            cy={mppY}
            r={5}
            fill={colors.success}
          />

          {/* Axes with premium styling */}
          <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth + 10} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
          <line x1={graphX} y1={graphY - 10} x2={graphX} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />

          {/* Axis arrow tips */}
          <polygon points={`${graphX + graphWidth + 10},${graphY + graphHeight} ${graphX + graphWidth + 2},${graphY + graphHeight - 4} ${graphX + graphWidth + 2},${graphY + graphHeight + 4}`} fill={colors.textSecondary} />
          <polygon points={`${graphX},${graphY - 10} ${graphX - 4},${graphY - 2} ${graphX + 4},${graphY - 2}`} fill={colors.textSecondary} />

          {/* Axis labels */}
          <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 30} fill={colors.textSecondary} fontSize={12} textAnchor="middle">Voltage (V)</text>
          <text x={graphX - 40} y={graphY + graphHeight / 2} fill={colors.textSecondary} fontSize={12} textAnchor="middle" transform={`rotate(-90, ${graphX - 40}, ${graphY + graphHeight / 2})`}>Current (A)</text>

          {/* Key points labels */}
          <text x={graphX + Voc * vScale} y={graphY + graphHeight + 15} fill={colors.textMuted} fontSize={10} textAnchor="middle">Voc</text>
          <text x={graphX - 5} y={graphY + graphHeight - Isc * iScale + 4} fill={colors.textMuted} fontSize={10} textAnchor="end">Isc</text>

          {/* Fill Factor info panel with premium styling */}
          <g transform={`translate(${graphX + graphWidth + 30}, ${graphY})`}>
            <rect x="-2" y="-2" width="164" height="204" rx={10} fill="#0a0f1a" />
            <rect x="0" y="0" width="160" height="200" rx={8} fill="url(#ffInfoPanelGradient)" stroke={colors.accent} strokeWidth={1} filter="url(#ffPanelGlow)" />
            <text x="80" y="20" fill={colors.accent} fontSize={12} fontWeight="bold" textAnchor="middle" filter="url(#ffTextGlow)">FILL FACTOR</text>

            {/* FF gauge background */}
            <rect x="20" y="35" width="120" height="20" rx={10} fill="#1e293b" />
            {/* FF gauge fill with dynamic gradient */}
            <rect
              x="20"
              y="35"
              width={120 * curve.fillFactor}
              height="20"
              rx={10}
              fill={curve.fillFactor > 0.7 ? 'url(#ffGaugeGradientGood)' : curve.fillFactor > 0.5 ? 'url(#ffGaugeGradientWarning)' : 'url(#ffGaugeGradientError)'}
              filter="url(#ffInnerGlow)"
            />
            <text x="80" y="50" fill="white" fontSize={14} fontWeight="bold" textAnchor="middle">
              {(curve.fillFactor * 100).toFixed(1)}%
            </text>

            {/* Key values */}
            <text x="10" y="75" fill={colors.textSecondary} fontSize={10}>Voc: {curve.Voc.toFixed(3)} V</text>
            <text x="10" y="92" fill={colors.textSecondary} fontSize={10}>Isc: {curve.Isc.toFixed(2)} A</text>
            <text x="10" y="109" fill={colors.textSecondary} fontSize={10}>Vmp: {curve.Vmp.toFixed(3)} V</text>
            <text x="10" y="126" fill={colors.textSecondary} fontSize={10}>Imp: {curve.Imp.toFixed(2)} A</text>

            <line x1="10" y1="138" x2="150" y2="138" stroke={colors.textMuted} strokeWidth={1} strokeOpacity={0.5} />

            <text x="10" y="158" fill={colors.success} fontSize={12} fontWeight="bold">Pmax: {curve.maxPower.toFixed(2)} W</text>
            <text x="10" y="178" fill={colors.textMuted} fontSize={10}>Ideal: {(Voc * Isc).toFixed(2)} W</text>
            <text x="10" y="195" fill={colors.textMuted} fontSize={9}>FF = Pmax / (Voc x Isc)</text>
          </g>

          {/* Resistance indicators panel */}
          <g transform="translate(60, 280)">
            <rect x="-2" y="-2" width="434" height="84" rx={10} fill="#0a0f1a" />
            <rect x="0" y="0" width="430" height="80" rx={8} fill="url(#ffInfoPanelGradient)" />
            <text x="215" y="20" fill={colors.textPrimary} fontSize={11} fontWeight="bold" textAnchor="middle">EQUIVALENT CIRCUIT PARAMETERS</text>

            {/* Series resistance with gradient */}
            <g transform="translate(20, 35)">
              <rect x="0" y="0" width="80" height="35" rx={6} fill={seriesResistance > 2 ? 'url(#ffParamCardBad)' : 'url(#ffParamCardGood)'} stroke={seriesResistance > 2 ? colors.error : colors.success} strokeWidth={0.5} strokeOpacity={0.5} />
              <text x="40" y="15" fill={colors.textSecondary} fontSize={9} textAnchor="middle">Series Rs</text>
              <text x="40" y="30" fill={seriesResistance > 2 ? colors.error : colors.success} fontSize={12} fontWeight="bold" textAnchor="middle">{seriesResistance.toFixed(1)} Ohm</text>
            </g>

            {/* Shunt resistance with gradient */}
            <g transform="translate(120, 35)">
              <rect x="0" y="0" width="80" height="35" rx={6} fill={shuntResistance < 100 ? 'url(#ffParamCardBad)' : 'url(#ffParamCardGood)'} stroke={shuntResistance < 100 ? colors.error : colors.success} strokeWidth={0.5} strokeOpacity={0.5} />
              <text x="40" y="15" fill={colors.textSecondary} fontSize={9} textAnchor="middle">Shunt Rsh</text>
              <text x="40" y="30" fill={shuntResistance < 100 ? colors.error : colors.success} fontSize={12} fontWeight="bold" textAnchor="middle">{shuntResistance >= 1000 ? '1k+' : shuntResistance.toFixed(0)} Ohm</text>
            </g>

            {/* Ideality factor with gradient */}
            <g transform="translate(220, 35)">
              <rect x="0" y="0" width="80" height="35" rx={6} fill={recombinationFactor > 1.5 ? 'url(#ffParamCardBad)' : 'url(#ffParamCardGood)'} stroke={recombinationFactor > 1.5 ? colors.error : colors.success} strokeWidth={0.5} strokeOpacity={0.5} />
              <text x="40" y="15" fill={colors.textSecondary} fontSize={9} textAnchor="middle">Ideality n</text>
              <text x="40" y="30" fill={recombinationFactor > 1.5 ? colors.error : colors.success} fontSize={12} fontWeight="bold" textAnchor="middle">{(recombinationFactor + 0.3).toFixed(2)}</text>
            </g>

            {/* Temperature with gradient */}
            <g transform="translate(320, 35)">
              <rect x="0" y="0" width="80" height="35" rx={6} fill={temperature > 45 ? 'url(#ffParamCardBad)' : 'url(#ffParamCardGood)'} stroke={temperature > 45 ? colors.error : colors.success} strokeWidth={0.5} strokeOpacity={0.5} />
              <text x="40" y="15" fill={colors.textSecondary} fontSize={9} textAnchor="middle">Temperature</text>
              <text x="40" y="30" fill={temperature > 45 ? colors.error : colors.success} fontSize={12} fontWeight="bold" textAnchor="middle">{temperature}C</text>
            </g>
          </g>

          {/* Quality assessment bar with premium gradient */}
          <rect x={58} y={373} width={434} height={54} rx={10} fill="#0a0f1a" />
          <rect
            x={60}
            y={375}
            width={430}
            height={50}
            rx={8}
            fill={curve.fillFactor > 0.7 ? 'url(#ffQualityExcellent)' : curve.fillFactor > 0.5 ? 'url(#ffQualityWarning)' : 'url(#ffQualityError)'}
            stroke={qualityColor}
            strokeWidth={1}
          />
          <text x={275} y={400} fill={qualityColor} fontSize={14} fontWeight="bold" textAnchor="middle" filter="url(#ffTextGlow)">
            {curve.fillFactor > 0.75 ? 'EXCELLENT CELL' : curve.fillFactor > 0.65 ? 'GOOD CELL' : curve.fillFactor > 0.5 ? 'MARGINAL CELL' : 'DEFECTIVE CELL'}
          </text>
          <text x={275} y={418} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            {curve.fillFactor > 0.75 ? 'Low resistance, minimal recombination' : curve.fillFactor > 0.65 ? 'Acceptable for most applications' : 'Check for defects or high resistance contacts'}
          </text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Series Resistance (Rs): {seriesResistance.toFixed(1)} Ω
        </label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={seriesResistance}
          onChange={(e) => setSeriesResistance(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.error }}
        />
        <div style={{ fontSize: '10px', color: colors.textMuted }}>
          Higher Rs = Poor contacts, high-resistance grid lines
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Shunt Resistance (Rsh): {shuntResistance >= 1000 ? '1000+ Ω' : shuntResistance + ' Ω'}
        </label>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={shuntResistance}
          onChange={(e) => setShuntResistance(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.blue }}
        />
        <div style={{ fontSize: '10px', color: colors.textMuted }}>
          Lower Rsh = Crystal defects, edge leakage paths
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Recombination: {(recombinationFactor * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={recombinationFactor}
          onChange={(e) => setRecombinationFactor(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.purple }}
        />
        <div style={{ fontSize: '10px', color: colors.textMuted }}>
          Higher recombination = More electron-hole pairs lost before collection
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Cell Temperature: {temperature}°C
        </label>
        <input
          type="range"
          min="0"
          max="70"
          step="5"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning }}
        />
        <div style={{ fontSize: '10px', color: colors.textMuted }}>
          Standard test condition is 25°C
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          <strong>Fill Factor</strong> = Pmax / (Voc × Isc)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Measures how "square" the I-V curve is. Ideal FF = 1.0, typical silicon: 0.75-0.85
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
              Fill Factor
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Two panels show the same Voc - can one still be worse?
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
                Two solar cells might have identical open-circuit voltage, but produce
                vastly different power outputs. The secret lies in the SHAPE of their
                I-V curves - a metric called fill factor!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Adjust series resistance, shunt resistance, and recombination to see how
                the I-V curve shape changes!
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
              If two cells have the same open-circuit voltage (Voc), can one produce less power?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Fill Factor</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust cell parameters to see how the I-V curve shape changes
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase series resistance - watch the curve bend near Voc</li>
              <li>Decrease shunt resistance - see voltage drop under load</li>
              <li>Increase recombination - ideality factor rises, FF drops</li>
              <li>Notice how max power changes even with similar Voc!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'shape';

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
              {wasCorrect ? 'Correct!' : 'Let\'s understand why!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The shape of the I-V curve determines how much power you can extract. A
              "rounder" curve has a lower fill factor and produces less power, even with
              identical Voc and Isc!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Fill Factor Physics</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Series Resistance (Rs):</strong> From
                metal contacts, grid lines, and semiconductor bulk. High Rs makes the curve droop
                near Voc, reducing the "knee" sharpness.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shunt Resistance (Rsh):</strong> From
                crystal defects and edge leakage. Low Rsh creates parallel current paths that "leak"
                current, reducing voltage under load.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Recombination:</strong> When electron-hole
                pairs recombine before reaching the contacts. This increases the ideality factor and
                makes the curve rounder.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Maximum Power Point:</strong> The point
                where V × I is maximum. Better fill factor = MPP closer to Voc × Isc.
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
              What happens when you heat up the cell?
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
              Solar panels in the real world get hot - sometimes 50°C or more above ambient.
              Will this heat help or hurt the fill factor?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to fill factor when cell temperature increases?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Temperature Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Vary temperature from 0°C to 70°C and observe fill factor changes
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Higher temperature reduces Voc significantly (about -2mV/°C for silicon).
              Fill factor also degrades because recombination increases and carrier
              mobility changes.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'degrade';

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
              {wasCorrect ? 'Correct!' : 'Important to know!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Temperature is the enemy of solar cell performance! Both Voc and fill factor
              decrease with temperature, reducing overall power output by 0.3-0.5% per °C.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Temperature Effects Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Voltage Drop:</strong> Higher temperature
                increases intrinsic carrier concentration, reducing the built-in potential. Voc drops
                about 2 mV/°C for silicon cells.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Increased Recombination:</strong> Thermal
                energy activates more recombination centers, increasing the ideality factor and
                reducing fill factor.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Practical Impact:</strong> On a hot day,
                panels at 65°C produce 15-20% less power than at 25°C! This is why ventilation and
                cooling are important for high-performance installations.
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
              Fill factor is critical for solar system performance
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
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered fill factor!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered fill factor!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Fill factor = Pmax / (Voc × Isc)</li>
              <li>Series resistance affects curve slope near Voc</li>
              <li>Shunt resistance causes voltage drop under load</li>
              <li>Recombination increases ideality factor</li>
              <li>Temperature degrades both Voc and fill factor</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              High-efficiency cells like HJT (heterojunction) achieve fill factors above 84%
              through superior passivation and contact design. Research cells have reached
              FF &gt; 87% - approaching theoretical limits!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default FillFactorRenderer;
