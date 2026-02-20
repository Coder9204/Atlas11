import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
   {
      icon: '☀️',
      title: 'PERC Solar Cells',
      short: 'Mainstream high-efficiency',
      tagline: 'Fine-line printing for 23%+ efficiency',
      description: 'PERC (Passivated Emitter Rear Cell) technology dominates the solar market. Advanced screen printing creates ultra-fine silver fingers under 40 micrometers wide, minimizing shading while maintaining low resistance.',
      connection: 'The metallization tradeoff is critical in PERC cells. Finer fingers reduce shading losses but require precise paste rheology and screen mesh selection to avoid breaks and high resistance.',
      howItWorks: 'Multi-busbar designs with 9-12 thin busbars replace traditional 4-5 wide busbars. Combined with finer fingers and selective emitter patterns, modern PERC achieves the optimal balance of shading and resistance.',
      stats: [
         { value: '23.5%', label: 'Record efficiency', icon: '⚡' },
         { value: '35μm', label: 'Min finger width', icon: '📏' },
         { value: '~70%', label: 'Market share', icon: '📊' }
      ],
      examples: ['Rooftop solar', 'Utility-scale farms', 'Bifacial modules', 'Building-integrated PV'],
      companies: ['LONGi', 'JA Solar', 'Trina Solar', 'Canadian Solar'],
      futureImpact: 'PERC is transitioning to TOPCon and HJT technologies with even finer metallization requirements.',
      color: '#F59E0B'
   },
   {
      icon: '🔬',
      title: 'Heterojunction (HJT) Cells',
      short: 'Low-temperature metallization',
      tagline: 'Silver paste at room temperature',
      description: 'HJT cells use thin amorphous silicon layers that cannot survive high temperatures. Special low-temperature silver pastes cure below 200°C, requiring different formulations and printing strategies.',
      connection: 'The metallization challenge in HJT is achieving low contact resistance without the high-temperature firing that traditional cells use. Paste chemistry and print optimization are critical.',
      howItWorks: 'Low-temperature pastes use polymer binders instead of glass frit. Curing occurs via UV or mild thermal treatment. Ultra-fine printing with copper plating is emerging to reduce silver usage.',
      stats: [
         { value: '26%+', label: 'Lab efficiency', icon: '⚡' },
         { value: '<200°C', label: 'Process temp', icon: '🌡️' },
         { value: '0.7%/yr', label: 'Degradation rate', icon: '📉' }
      ],
      examples: ['Premium residential', 'High-efficiency modules', 'Bifacial installations', 'Space applications'],
      companies: ['REC Solar', 'Meyer Burger', 'Panasonic', 'Risen Energy'],
      futureImpact: 'Copper plating may replace silver entirely in HJT cells, dramatically reducing costs.',
      color: '#10B981'
   },
   {
      icon: '🏭',
      title: 'Printed Circuit Boards',
      short: 'Same tradeoffs, different scale',
      tagline: 'Trace width optimization',
      description: 'PCB design involves the same fundamental tradeoff as solar metallization: wider traces have lower resistance but take more space. High-frequency and high-power designs require careful optimization.',
      connection: 'Just like solar cell fingers, PCB traces must balance current capacity (wider = better) against routing density (narrower = better). The I²R power loss equation applies identically.',
      howItWorks: 'PCB designers use trace width calculators based on IPC standards. Current capacity scales with cross-sectional area while resistance drops with width. Thermal management often drives trace sizing.',
      stats: [
         { value: '3mil', label: 'Min trace width', icon: '📏' },
         { value: '1oz', label: 'Standard copper', icon: '🔧' },
         { value: '$50B', label: 'PCB market size', icon: '💰' }
      ],
      examples: ['Smartphones', 'Computer motherboards', 'Automotive electronics', 'Medical devices'],
      companies: ['TTM Technologies', 'Zhen Ding', 'Unimicron', 'AT&S'],
      futureImpact: 'HDI and substrate-like PCBs push trace widths below 25 micrometers for advanced packaging.',
      color: '#3B82F6'
   },
   {
      icon: '🔋',
      title: 'Battery Electrode Coating',
      short: 'Slurry coating precision',
      tagline: 'Uniform active material deposition',
      description: 'Lithium-ion battery electrodes are manufactured using slot-die coating of slurries containing active materials, binders, and conductive additives. Coating uniformity directly impacts cell performance.',
      connection: 'Like screen printing solar paste, battery coating requires precise rheology control. Too thin reduces capacity; too thick increases resistance and limits rate capability.',
      howItWorks: 'Slurry flows through a precision slot die onto moving foil. Coating weight is controlled by gap, speed, and slurry properties. Calendering compresses the coating to achieve target density.',
      stats: [
         { value: '100μm', label: 'Typical thickness', icon: '📏' },
         { value: '±2%', label: 'Weight tolerance', icon: '⚖️' },
         { value: '60m/min', label: 'Line speed', icon: '🏃' }
      ],
      examples: ['EV batteries', 'Consumer electronics', 'Grid storage', 'Power tools'],
      companies: ['CATL', 'LG Energy', 'Panasonic', 'Samsung SDI'],
      futureImpact: 'Dry electrode coating may replace wet processes, eliminating solvents and reducing energy consumption.',
      color: '#8B5CF6'
   }
];

// Phase type for internal state management
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ScreenPrintingMetallizationRendererProps {
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
  twist_play: 'Compare',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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
  solar: '#3b82f6',
  metal: '#cbd5e1',
  silver: '#e2e8f0',
  silicon: '#1e3a5f',
};

const ScreenPrintingMetallizationRenderer: React.FC<ScreenPrintingMetallizationRendererProps> = ({
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
  }, [gamePhase]);

  // Navigation refs
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [fingerWidth, setFingerWidth] = useState(50); // micrometers
  const [fingerPitch, setFingerPitch] = useState(2); // mm
  const [numBusbars, setNumBusbars] = useState(4);
  const [designType, setDesignType] = useState<'standard' | 'mbb' | 'busbarless'>('standard');
  const [isAnimating, setIsAnimating] = useState(false);

  // Screen printing animation state
  const [squeegeePos, setSqueegeePos] = useState(0);
  const [pasteDroplets, setPasteDroplets] = useState<Array<{x: number, y: number, id: number}>>([]);

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

  // Physics calculations
  const calculatePerformance = useCallback(() => {
    // Cell dimensions (156mm standard cell)
    const cellWidth = 156; // mm
    const cellHeight = 156; // mm
    const cellArea = cellWidth * cellHeight; // mm^2

    // Calculate number of fingers
    const numFingers = Math.floor(cellWidth / fingerPitch);

    // Shading losses
    const fingerAreaPerFinger = (fingerWidth / 1000) * cellHeight; // mm^2
    const totalFingerArea = numFingers * fingerAreaPerFinger;

    // Busbar shading (standard busbars are ~1mm wide)
    let busbarWidth = 1; // mm
    if (designType === 'mbb') {
      busbarWidth = 0.3; // mm for multi-busbar
    } else if (designType === 'busbarless') {
      busbarWidth = 0;
    }
    const totalBusbarArea = numBusbars * busbarWidth * cellHeight;

    const totalShadingArea = totalFingerArea + totalBusbarArea;
    const shadingLoss = (totalShadingArea / cellArea) * 100;

    // Series resistance calculation
    // Finger resistance: R_finger ~ (rho * L) / (w * h)
    const silverResistivity = 3e-6; // Ohm-cm (after firing)
    const fingerHeight = 25e-4; // 25 um in cm
    const fingerLengthToMidpoint = fingerPitch / 2 / 10; // cm
    const fingerRes = (silverResistivity * fingerLengthToMidpoint) / ((fingerWidth / 1e4) * fingerHeight);

    // Collection distance (how far carriers travel in silicon before reaching finger)
    const collectionDistance = fingerPitch / 2; // mm
    const emitterSheetRes = 80; // ohm/sq
    const emitterRes = emitterSheetRes * collectionDistance * collectionDistance / (cellHeight * fingerPitch / 3);

    // Busbar contribution
    let busbarRes = 0.001; // ohm
    if (designType === 'mbb') {
      busbarRes = 0.0005; // lower due to shorter paths
    } else if (designType === 'busbarless') {
      busbarRes = 0; // collected by wires instead
    }

    const totalSeriesRes = fingerRes + emitterRes + busbarRes;

    // Power output calculation
    const Jsc = 42; // mA/cm^2 (typical short-circuit current density)
    const Voc = 0.72; // V
    const area = cellArea / 100; // cm^2

    // Approximate fill factor loss from series resistance
    // FF ~ FF0 * (1 - Rs*Jsc/Voc)
    const FF0 = 0.84;
    const rsEffect = Math.min(0.15, totalSeriesRes * (Jsc / 1000) * area / Voc);
    const FF = FF0 * (1 - rsEffect);

    // Efficiency calculation
    const shadingFactor = 1 - shadingLoss / 100;
    const Pout = Voc * (Jsc * area / 1000) * FF * shadingFactor;
    const Pin = area * 0.1; // 100 mW/cm^2 = 0.1 W/cm^2
    const efficiency = (Pout / Pin) * 100;

    // Optimal metric (balance of shading and resistance)
    const powerLoss = shadingLoss + rsEffect * 100;

    return {
      numFingers,
      shadingLoss,
      seriesResistance: totalSeriesRes * 1000, // mOhm
      fillFactor: FF * 100,
      efficiency,
      powerLoss,
      collectionDistance,
    };
  }, [fingerWidth, fingerPitch, numBusbars, designType]);

  // Animation for screen printing squeegee
  useEffect(() => {
    if (!isAnimating) {
      setPasteDroplets([]);
      return;
    }
    const cellX = 60;
    const cellY = 80;
    const cellW = 220;
    const cellH = 220;

    const interval = setInterval(() => {
      setSqueegeePos(prev => (prev + 3) % (cellW + 40));
      // Add paste droplets as squeegee moves
      if (Math.random() > 0.6) {
        setPasteDroplets(prev => [...prev.slice(-15), {
          x: cellX + (squeegeePos % (cellW + 40)) + Math.random() * 10,
          y: cellY + Math.random() * cellH,
          id: Date.now() + Math.random()
        }]);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, squeegeePos]);

  const predictions = [
    { id: 'full_cover', label: 'More metal = better collection, so cover the whole cell' },
    { id: 'no_metal', label: 'Metal blocks light, so use as little as possible' },
    { id: 'tradeoff', label: 'There\'s an optimal amount - balancing shading against resistance' },
    { id: 'doesnt_matter', label: 'The amount of metal doesn\'t affect efficiency' },
  ];

  const twistPredictions = [
    { id: 'std_best', label: 'Standard 4-5 busbars work best for all cells' },
    { id: 'mbb_best', label: 'Multi-busbar (MBB) with 9+ thin wires is always better' },
    { id: 'busbarless_best', label: 'Busbarless designs eliminate all busbar shading' },
    { id: 'depends', label: 'Each design has tradeoffs depending on cell technology' },
  ];

  const transferApplications = [
    {
      title: 'Half-Cut Cell Technology',
      description: 'Modern modules cut cells in half, reducing current by 50% and resistive losses by 75%.',
      question: 'Why does cutting cells in half reduce power loss?',
      answer: 'Resistive power loss = I^2*R. Half-cells carry half the current, so loss = (I/2)^2*R = I^2*R/4. Additionally, shorter current paths mean lower total resistance. Combined, this can recover 2-3W per module.',
    },
    {
      title: 'Printed Circuit Boards',
      description: 'PCB trace width design involves the same tradeoff: wider traces have lower resistance but take more space.',
      question: 'How is PCB design similar to solar cell metallization?',
      answer: 'Both optimize conductor geometry: wide enough for low resistance and current capacity, but narrow enough to leave room for other traces (or not block light). The math is identical - minimize I^2*R losses while meeting space constraints.',
    },
    {
      title: 'SMBB and Shingled Cells',
      description: 'Super Multi-Busbar (SMBB) uses 12-16 round wires, while shingled cells overlap like roof tiles.',
      question: 'Why are newer interconnect designs more complex?',
      answer: 'Round wires reflect some light back into the cell (gain back 1% shading). Shingled cells eliminate busbars entirely by overlapping cell edges. These designs extract every fraction of efficiency from the metallization tradeoff.',
    },
    {
      title: 'Copper vs Silver Metallization',
      description: 'Silver costs ~$0.05/Wp but copper is 100x cheaper. Industry is transitioning to copper plating.',
      question: 'Why has silver dominated despite copper\'s cost advantage?',
      answer: 'Silver paste can be screen-printed and fired directly - simple, fast, reliable. Copper requires plating through masks and barrier layers to prevent diffusion into silicon. But with silver prices rising, Cu plating is becoming cost-effective for high-efficiency cells.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why can\'t you cover the entire solar cell with metal to maximize current collection?',
      options: [
        { text: 'Metal is too expensive', correct: false },
        { text: 'Metal blocks light that would otherwise generate electricity', correct: true },
        { text: 'Metal would melt from the heat', correct: false },
        { text: 'It would make the cell too heavy', correct: false },
      ],
    },
    {
      question: 'What is the main purpose of finger electrodes on a solar cell?',
      options: [
        { text: 'To make the cell look nice', correct: false },
        { text: 'To collect current from the emitter with minimum shading', correct: true },
        { text: 'To protect the silicon from damage', correct: false },
        { text: 'To reflect light into the cell', correct: false },
      ],
    },
    {
      question: 'If you double the finger spacing (pitch), what happens?',
      options: [
        { text: 'Shading decreases, but series resistance increases significantly', correct: true },
        { text: 'Both shading and resistance decrease', correct: false },
        { text: 'Nothing changes - spacing doesn\'t matter', correct: false },
        { text: 'The cell generates more voltage', correct: false },
      ],
    },
    {
      question: 'The optimal finger width balances which two factors?',
      options: [
        { text: 'Color and temperature', correct: false },
        { text: 'Shading loss and finger resistance', correct: true },
        { text: 'Cost and appearance', correct: false },
        { text: 'Weight and flexibility', correct: false },
      ],
    },
    {
      question: 'What is "sheet resistance" in the context of solar cells?',
      options: [
        { text: 'Resistance to bending the cell', correct: false },
        { text: 'Resistance of a square of the emitter layer (ohm/square)', correct: true },
        { text: 'Resistance to water penetration', correct: false },
        { text: 'Resistance of the encapsulant', correct: false },
      ],
    },
    {
      question: 'How do multi-busbar (MBB) designs improve efficiency?',
      options: [
        { text: 'By using more silver', correct: false },
        { text: 'Thinner busbars reduce shading; shorter paths reduce resistance', correct: true },
        { text: 'By increasing the cell voltage', correct: false },
        { text: 'By making the cell darker', correct: false },
      ],
    },
    {
      question: 'Why does resistive power loss scale as I^2*R?',
      options: [
        { text: 'Because Ohm said so', correct: false },
        { text: 'P = V*I = (I*R)*I = I^2*R from Ohm\'s law', correct: true },
        { text: 'It doesn\'t - loss is linear with current', correct: false },
        { text: 'Due to quantum effects', correct: false },
      ],
    },
    {
      question: 'What is the typical shading loss from front metallization on a modern cell?',
      options: [
        { text: 'Less than 1%', correct: false },
        { text: 'About 3-5%', correct: true },
        { text: 'About 20-30%', correct: false },
        { text: 'Over 50%', correct: false },
      ],
    },
    {
      question: 'Why might "busbarless" designs still need metal lines?',
      options: [
        { text: 'For decoration', correct: false },
        { text: 'Fingers still needed to collect current; external wires replace busbars', correct: true },
        { text: 'Busbarless cells use no metal at all', correct: false },
        { text: 'To create electrical insulation', correct: false },
      ],
    },
    {
      question: 'How does half-cutting cells reduce resistive losses?',
      options: [
        { text: 'By using thicker metal', correct: false },
        { text: 'Half the current means 1/4 the I^2*R loss; shorter paths reduce R too', correct: true },
        { text: 'It doesn\'t - half-cut is just for aesthetics', correct: false },
        { text: 'By increasing cell temperature', correct: false },
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

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 700;
    const height = 420;
    const output = calculatePerformance();

    // Cell visual parameters - premium layout
    const cellX = 60;
    const cellY = 80;
    const cellW = 220;
    const cellH = 220;

    // Calculate finger positions
    const fingerSpacing = cellH / output.numFingers;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '700px' }}
        >
          <defs>
            {/* === PREMIUM GRADIENTS === */}

            {/* Lab background gradient */}
            <linearGradient id="scrpmLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Silicon wafer gradient with realistic blue-gray */}
            <linearGradient id="scrpmSiliconWafer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="20%" stopColor="#1e40af" />
              <stop offset="40%" stopColor="#1e3a8a" />
              <stop offset="60%" stopColor="#1e40af" />
              <stop offset="80%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>

            {/* Radial silicon reflection */}
            <radialGradient id="scrpmSiliconSheen" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#1e40af" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0" />
            </radialGradient>

            {/* Silver paste metallic gradient */}
            <linearGradient id="scrpmSilverPaste" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="20%" stopColor="#e2e8f0" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#e2e8f0" />
              <stop offset="80%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Radial paste droplet effect */}
            <radialGradient id="scrpmPasteDroplet" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="1" />
              <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
            </radialGradient>

            {/* Screen mesh gradient */}
            <linearGradient id="scrpmScreenMesh" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="75%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Squeegee rubber gradient */}
            <linearGradient id="scrpmSqueegee" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="20%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="80%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Squeegee handle brushed metal */}
            <linearGradient id="scrpmSqueegeeHandle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="20%" stopColor="#9ca3af" />
              <stop offset="40%" stopColor="#6b7280" />
              <stop offset="60%" stopColor="#9ca3af" />
              <stop offset="80%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Busbar metallic gradient */}
            <linearGradient id="scrpmBusbarMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="75%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Finger electrode gradient */}
            <linearGradient id="scrpmFingerMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="30%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Metrics panel gradient */}
            <linearGradient id="scrpmMetricsPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* === PREMIUM GLOW FILTERS === */}

            {/* Silver paste glow */}
            <filter id="scrpmPasteGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Squeegee motion glow */}
            <filter id="scrpmSqueegeeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Accent glow for highlights */}
            <filter id="scrpmAccentGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft inner glow */}
            <filter id="scrpmInnerGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Screen mesh pattern */}
            <pattern id="scrpmMeshPattern" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#374151" />
              <rect x="0" y="0" width="2" height="2" fill="#4b5563" />
              <rect x="2" y="2" width="2" height="2" fill="#4b5563" />
            </pattern>

            {/* Lab grid pattern */}
            <pattern id="scrpmLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Current flow arrow marker */}
            <marker id="scrpmArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
            </marker>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width="700" height="420" fill="url(#scrpmLabBg)" />
          <rect width="700" height="420" fill="url(#scrpmLabGrid)" />

          {/* Title */}
          <text x="350" y="30" fill={colors.textPrimary} fontSize="16" fontWeight="bold" textAnchor="middle">
            Screen Printing Metallization
          </text>
          <text x="350" y="50" fill={colors.textMuted} fontSize="11" textAnchor="middle">
            Silver Paste Deposition Process
          </text>

          {/* === SCREEN PRINTING APPARATUS === */}

          {/* Screen frame */}
          <rect x={cellX - 15} y={cellY - 35} width={cellW + 30} height="25" rx="3" fill="url(#scrpmScreenMesh)" stroke="#4b5563" strokeWidth="1" />
          <rect x={cellX - 15} y={cellY - 35} width={cellW + 30} height="25" fill="url(#scrpmMeshPattern)" opacity="0.5" />
          <text x={cellX + cellW / 2} y={cellY - 18} fill={colors.textMuted} fontSize="11" textAnchor="middle">SCREEN MESH</text>

          {/* Squeegee (animated) */}
          <g transform={`translate(${cellX - 20 + squeegeePos}, ${cellY - 50})`} filter="url(#scrpmSqueegeeGlow)">
            <rect x="0" y="0" width="8" height="40" rx="2" fill="url(#scrpmSqueegeeHandle)" />
            <rect x="-2" y="35" width="12" height="20" rx="1" fill="url(#scrpmSqueegee)" />
          </g>

          {/* Silver paste reservoir */}
          <ellipse cx={cellX - 5 + squeegeePos} cy={cellY - 8} rx="15" ry="6" fill="url(#scrpmPasteDroplet)" filter="url(#scrpmPasteGlow)" />

          {/* === SOLAR CELL WAFER === */}

          {/* Wafer base with silicon gradient */}
          <rect x={cellX} y={cellY} width={cellW} height={cellH} fill="url(#scrpmSiliconWafer)" rx="4" stroke="#1e3a5f" strokeWidth="2" />
          <rect x={cellX} y={cellY} width={cellW} height={cellH} fill="url(#scrpmSiliconSheen)" rx="4" />

          {/* Texture pyramids (simplified) */}
          {[...Array(12)].map((_, i) => (
            <g key={`texture-${i}`} opacity="0.15">
              {[...Array(12)].map((_, j) => (
                <polygon
                  key={`pyr-${i}-${j}`}
                  points={`${cellX + 8 + i * 18},${cellY + 8 + j * 18} ${cellX + 14 + i * 18},${cellY + 2 + j * 18} ${cellX + 20 + i * 18},${cellY + 8 + j * 18}`}
                  fill="#3b82f6"
                />
              ))}
            </g>
          ))}

          {/* === METALLIZATION PATTERN === */}

          {/* Busbars (vertical) */}
          {designType !== 'busbarless' && [...Array(numBusbars)].map((_, i) => {
            const busbarWidth = designType === 'mbb' ? 3 : 10;
            const x = cellX + (i + 1) * cellW / (numBusbars + 1) - busbarWidth / 2;
            return (
              <g key={`busbar-${i}`}>
                <rect
                  x={x}
                  y={cellY}
                  width={busbarWidth}
                  height={cellH}
                  fill="url(#scrpmBusbarMetal)"
                  filter="url(#scrpmPasteGlow)"
                />
                {/* Busbar highlight */}
                <rect
                  x={x + busbarWidth * 0.3}
                  y={cellY}
                  width={busbarWidth * 0.2}
                  height={cellH}
                  fill="white"
                  opacity="0.3"
                />
              </g>
            );
          })}

          {/* Fingers (horizontal) */}
          {[...Array(Math.min(output.numFingers, 40))].map((_, i) => {
            const y = cellY + (i + 0.5) * fingerSpacing;
            const fingerH = Math.max(1.5, fingerWidth / 40);
            return (
              <g key={`finger-${i}`}>
                <rect
                  x={cellX}
                  y={y - fingerH / 2}
                  width={cellW}
                  height={fingerH}
                  fill="url(#scrpmFingerMetal)"
                  filter="url(#scrpmInnerGlow)"
                />
              </g>
            );
          })}

          {/* Paste droplets animation */}
          {pasteDroplets.map(drop => (
            <circle
              key={drop.id}
              cx={drop.x}
              cy={drop.y}
              r="2"
              fill="url(#scrpmPasteDroplet)"
              filter="url(#scrpmPasteGlow)"
              opacity="0.8"
            />
          ))}

          {/* Current flow visualization */}
          {interactive && (
            <g opacity={0.7}>
              {/* Current from silicon to finger */}
              <line x1={cellX + 40} y1={cellY + cellH / 2 - 25} x2={cellX + 40} y2={cellY + cellH / 2 - 8}
                    stroke={colors.accent} strokeWidth="2" markerEnd="url(#scrpmArrowhead)" />
              <text x={cellX + 48} y={cellY + cellH / 2 - 15} fill={colors.accent} fontSize="11" fontWeight="bold">I (current)</text>

              {/* Current along finger to busbar */}
              <line x1={cellX + 55} y1={cellY + cellH / 2} x2={cellX + 85} y2={cellY + cellH / 2}
                    stroke={colors.accent} strokeWidth="2" markerEnd="url(#scrpmArrowhead)" />

              {/* Collection path label */}
              <text x={cellX + 30} y={cellY + cellH / 2 + 28} fill={colors.textMuted} fontSize="11" textAnchor="middle">collection</text>
              <text x={cellX + 110} y={cellY + cellH / 2 + 28} fill={colors.textMuted} fontSize="11" textAnchor="middle">transport</text>
            </g>
          )}

          {/* Wafer labels */}
          <text x={cellX + cellW / 2} y={cellY + cellH + 18} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">
            {designType === 'standard' ? `${numBusbars} Busbars` : designType === 'mbb' ? 'Multi-Busbar (12 wires)' : 'Busbarless'}
          </text>
          <text x={cellX + cellW / 2} y={cellY + cellH + 34} fill={colors.textMuted} fontSize="11" textAnchor="middle">
            {output.numFingers} fingers @ {fingerPitch.toFixed(1)}mm pitch | {fingerWidth}um width
          </text>

          {/* === LEGEND === */}
          <g transform="translate(60, 340)">
            <rect x="0" y="0" width="220" height="55" fill="rgba(15,23,42,0.8)" rx="6" stroke={colors.accent} strokeWidth="0.5" strokeOpacity="0.3" />
            <rect x="10" y="25" width="20" height="8" fill="url(#scrpmSiliconWafer)" rx="1" />
            <rect x="10" y="42" width="20" height="8" fill="url(#scrpmFingerMetal)" rx="1" />
            <rect x="115" y="25" width="20" height="8" fill="url(#scrpmBusbarMetal)" rx="1" />
            <rect x="115" y="42" width="20" height="8" fill="url(#scrpmSqueegee)" rx="1" />
          </g>
          {/* LEGEND texts at absolute SVG coordinates (60+offset, 340+offset) */}
          <text x="170" y="355" fill={colors.textSecondary} fontSize="11" fontWeight="bold" textAnchor="middle">COMPONENTS</text>
          <text x="95" y="374" fill={colors.textMuted} fontSize="11">Silicon Wafer</text>
          <text x="95" y="391" fill={colors.textMuted} fontSize="11">Ag Fingers</text>
          <text x="200" y="374" fill={colors.textMuted} fontSize="11">Ag Busbars</text>
          <text x="200" y="391" fill={colors.textMuted} fontSize="11">Squeegee</text>

          {/* === EFFICIENCY INDICATOR === */}
          {/* Pulsing indicator circle showing current efficiency level */}
          <circle
            cx={320 + Math.min(100, Math.max(0, (output.efficiency - 15) * 6))}
            cy={400}
            r="5"
            fill={colors.accent}
            filter="url(#scrpmAccentGlow)"
          >
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={320}
            cy={400}
            r="3"
            fill="none"
            stroke={colors.textMuted}
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.4"
          />
          <ellipse cx={430} cy={405} rx="60" ry="4" fill={colors.accent} opacity="0.1" />

          {/* === REFERENCE GRID LINES === */}
          <line x1={cellX} y1={cellY} x2={cellX + cellW} y2={cellY} stroke="#334155" strokeDasharray="4,4" opacity="0.4" />
          <line x1={cellX} y1={cellY + cellH/2} x2={cellX + cellW} y2={cellY + cellH/2} stroke="#334155" strokeDasharray="4,4" opacity="0.3" />
          <line x1={cellX} y1={cellY + cellH} x2={cellX + cellW} y2={cellY + cellH} stroke="#334155" strokeDasharray="4,4" opacity="0.4" />
          {/* Tick marks */}
          <line x1={cellX - 5} y1={cellY} x2={cellX} y2={cellY} stroke={colors.textMuted} strokeWidth="1" opacity="0.6" />
          <line x1={cellX - 5} y1={cellY + cellH/2} x2={cellX} y2={cellY + cellH/2} stroke={colors.textMuted} strokeWidth="1" opacity="0.6" />
          <line x1={cellX - 5} y1={cellY + cellH} x2={cellX} y2={cellY + cellH} stroke={colors.textMuted} strokeWidth="1" opacity="0.6" />

          {/* === PERFORMANCE METRICS PANEL === */}
          <g transform="translate(520, 70)">
            <rect x="0" y="0" width="160" height="280" fill="url(#scrpmMetricsPanel)" rx="10" stroke={colors.accent} strokeWidth="1" strokeOpacity="0.5" />
            {/* Shading loss meter rects */}
            <rect x="15" y="62" width="130" height="10" fill="rgba(255,255,255,0.1)" rx="3" />
            <rect x="15" y="62" width={Math.min(130, 130 * output.shadingLoss / 10)} height="10" fill={colors.error} rx="3" filter="url(#scrpmAccentGlow)" />
            {/* Series resistance meter rects */}
            <rect x="15" y="117" width="130" height="10" fill="rgba(255,255,255,0.1)" rx="3" />
            <rect x="15" y="117" width={Math.min(130, 130 * output.seriesResistance / 100)} height="10" fill={colors.warning} rx="3" />
            {/* Fill Factor meter rects */}
            <rect x="15" y="172" width="130" height="10" fill="rgba(255,255,255,0.1)" rx="3" />
            <rect x="15" y="172" width={130 * output.fillFactor / 100} height="10" fill={colors.success} rx="3" />
            {/* Efficiency highlight rect */}
            <rect x="10" y="210" width="140" height="60" fill="rgba(245,158,11,0.1)" rx="8" stroke={colors.accent} strokeWidth="1" />
          </g>
          {/* PERFORMANCE METRICS texts at absolute SVG coordinates (520+offset, 70+offset) */}
          <text x="600" y="95" fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle">PERFORMANCE</text>
          <text x="535" y="125" fill={colors.textMuted} fontSize="11">Shading Loss</text>
          <text x="600" y="158" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">{output.shadingLoss.toFixed(2)}%</text>
          <text x="535" y="180" fill={colors.textMuted} fontSize="11">Series Resistance</text>
          <text x="600" y="213" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">{output.seriesResistance.toFixed(1)} mΩ</text>
          <text x="535" y="235" fill={colors.textMuted} fontSize="11">Fill Factor</text>
          <text x="600" y="268" fill={colors.success} fontSize="16" fontWeight="bold" textAnchor="middle" filter="url(#scrpmAccentGlow)">{output.fillFactor.toFixed(1)}%</text>
          <text x="600" y="302" fill={colors.textMuted} fontSize="11" textAnchor="middle">Cell Efficiency</text>
          <text x="600" y="328" fill={colors.accent} fontSize="22" fontWeight="bold" textAnchor="middle" filter="url(#scrpmAccentGlow)">{output.efficiency.toFixed(2)}%</text>

          {/* === PROCESS INFO === */}
          <g transform="translate(320, 335)">
            <rect x="0" y="0" width="180" height="70" fill="rgba(15,23,42,0.8)" rx="6" stroke={colors.warning} strokeWidth="0.5" strokeOpacity="0.3" />
          </g>
          {/* PROCESS INFO texts at absolute SVG coordinates (320+offset, 335+offset) */}
          <text x="410" y="351" fill={colors.warning} fontSize="11" fontWeight="bold" textAnchor="middle">TRADEOFF</text>
          <text x="410" y="366" fill={colors.textSecondary} fontSize="11" textAnchor="middle">More metal → Better collection</text>
          <text x="410" y="381" fill={colors.textSecondary} fontSize="11" textAnchor="middle">More metal → More shading</text>
          <text x="410" y="396" fill={colors.accent} fontSize="11" fontWeight="bold" textAnchor="middle">Find the optimal balance!</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)` : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? `0 4px 20px ${colors.error}40` : `0 4px 20px ${colors.success}40`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop Animation' : 'Animate Printing'}
            </button>
            <button
              onClick={() => { setFingerWidth(50); setFingerPitch(2); setNumBusbars(4); setDesignType('standard'); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Metallization Design
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'standard', label: 'Standard (4-5 BB)' },
              { key: 'mbb', label: 'Multi-Busbar (12+)' },
              { key: 'busbarless', label: 'Busbarless' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setDesignType(key as 'standard' | 'mbb' | 'busbarless');
                  if (key === 'mbb') setNumBusbars(12);
                  else if (key === 'standard') setNumBusbars(4);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: designType === key ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: designType === key ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Finger Width (current path width): {fingerWidth} μm
        </label>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={fingerWidth}
          onChange={(e) => setFingerWidth(parseInt(e.target.value))}
          onInput={(e) => setFingerWidth(parseInt((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            accentColor: colors.accent,
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            appearance: 'none',
            height: '20px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Finger Pitch (current collection spacing): {fingerPitch.toFixed(1)} mm
        </label>
        <input
          type="range"
          min="0.8"
          max="4"
          step="0.1"
          value={fingerPitch}
          onChange={(e) => setFingerPitch(parseFloat(e.target.value))}
          onInput={(e) => setFingerPitch(parseFloat((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            accentColor: colors.accent,
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            appearance: 'none',
            height: '20px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        />
      </div>

      {!showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Number of Busbars (current transport paths): {numBusbars}
          </label>
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            value={numBusbars}
            onChange={(e) => setNumBusbars(parseInt(e.target.value))}
            onInput={(e) => setNumBusbars(parseInt((e.target as HTMLInputElement).value))}
            style={{
              width: '100%',
              accentColor: colors.accent,
              touchAction: 'pan-y',
              WebkitAppearance: 'none',
              appearance: 'none',
              height: '20px',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
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
          Total Loss = Shading + I^2R Resistance Loss
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Find the sweet spot that minimizes both!
        </div>
      </div>
    </div>
  );

  // Navigation function
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

  const currentIdx = phaseOrder.indexOf(phase);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: currentIdx > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentIdx > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            role="button"
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              minHeight: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          {phaseLabels[phase]}
        </span>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1001,
    }}>
      <button
        onClick={goBack}
        disabled={currentIdx === 0}
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
          fontWeight: 400,
          cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: currentIdx > 0 ? 1 : 0.5,
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        Back
      </button>
      <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
        {phaseLabels[phase]}
      </span>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Screen Printing Metallization
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why not cover the whole cell with metal to collect more charge?
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
                Solar cells need metal contacts to collect the generated electricity. But here's
                the paradox: more metal means better collection but also more shading. Less metal
                means less shading but higher resistance. What's the optimal design?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer involves a careful balance of competing factors!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting finger width and spacing to optimize power output!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Experiment')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Dilemma:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Metal contacts collect current but block light. Wide, closely-spaced fingers
              give low resistance but high shading. Narrow, widely-spaced fingers give low
              shading but high resistance. What strategy maximizes power output?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the best metallization strategy?
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Metallization Optimizer</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Find the optimal finger design for maximum power
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

          <div style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '16px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Observe the Tradeoff:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
              Watch the power output visualization as you adjust. Wider fingers → lower resistance but more shading loss. Finer pitch → less shading but higher resistance losses.
            </p>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
              <li>Increase finger pitch → observe shading drop but resistance rise</li>
              <li>Increase finger width → resistance drops, shading increases</li>
              <li>Notice the optimal efficiency sweet spot in between</li>
              <li>Try different busbar counts → observe current resistance changes</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(30, 58, 95, 0.5)', margin: '16px', padding: '14px', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.3)' }}>
            <p style={{ color: '#93c5fd', fontSize: '13px', fontWeight: 400 }}>
              <strong>The visualization shows</strong> how the silver finger pattern on a solar cell affects both shading (blocking light) and current collection (reducing resistance). When you increase finger width, more light is blocked — but current flows with less resistance.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'tradeoff';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px' }}>
              Your prediction: {prediction ? `"${predictions.find(p => p.id === prediction)?.label || prediction}"` : 'No prediction made'}
            </p>
            <p style={{ color: colors.textPrimary }}>
              As you observed in the simulation, there's an optimal balance! Too much metal blocks light; too little creates
              resistance losses. Modern cells carefully optimize finger width, pitch, and
              busbar design to maximize power output.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Metallization Tradeoff</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shading Loss:</strong> Every bit of
                metal blocks sunlight. Modern cells achieve 3-5% shading. Each 1% shading costs
                about 0.2% absolute efficiency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resistive Loss:</strong> Current
                flows through the emitter to fingers, then along fingers to busbars. Power loss
                = I^2*R increases quadratically with current path length.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Optimal Design:</strong> Fingers
                are typically 40-60 um wide, spaced 1.5-2.5 mm apart. This gives ~3% shading and
                manageable series resistance.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Fill Factor:</strong> Series
                resistance reduces fill factor. FF drops from ~84% ideal to ~80% actual due to
                metallization and contact resistances.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What about busbarless and multi-wire designs?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>New Designs:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Industry is moving beyond traditional busbars. Multi-busbar (MBB) uses 9-16 thin
              wires instead of 4-5 wide busbars. Busbarless designs eliminate printed busbars
              entirely, using only fingers contacted by external wires. Which approach is best?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which metallization approach is best?
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Designs</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between standard, MBB, and busbarless
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observations:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong>MBB:</strong> Thinner busbars reduce shading by ~1%. Shorter paths to wires reduce finger resistance.<br/><br/>
              <strong>Busbarless:</strong> Eliminates all busbar shading. But requires precise wire alignment during module assembly.<br/><br/>
              Each approach has manufacturing and reliability tradeoffs beyond just electrical performance.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'depends';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
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
              Each design has tradeoffs! MBB is becoming mainstream for its balance of efficiency
              gain and manufacturability. Busbarless offers the best efficiency but needs careful
              handling.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Design Comparison</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Standard (4-5 BB):</strong> Proven,
                reliable, simple manufacturing. But ~1.5% shading from busbars alone.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Multi-Busbar (9-16):</strong> Round
                wires can reflect light back in. Shorter current paths in fingers. ~0.5% efficiency
                gain. Now dominant in new production.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Busbarless:</strong> Maximum efficiency
                potential. But cell handling is tricky - wires must align precisely during stringing.
                Used mainly in premium/specialty applications.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Metallization optimization appears everywhere in electronics
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
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
                    transition: 'all 0.2s ease',
                  }}
                >
                  Got It
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
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
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
                {testScore >= 8 ? 'You\'ve mastered metallization design!' : 'Review the material and try again.'}
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
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>
                A solar cell engineer is optimizing screen-printed silver metallization to maximize power output. Consider the tradeoffs between shading loss and resistive losses as you answer.
              </p>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered metallization design!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Shading vs resistance tradeoff</li>
              <li>Optimal finger width and pitch design</li>
              <li>I^2*R power loss in conductors</li>
              <li>Multi-busbar and busbarless technologies</li>
              <li>Half-cut cell current reduction benefits</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Leading cell manufacturers now use copper plating instead of silver paste,
              enabling thinner fingers (25-30 um) with lower resistance. Combined with
              shingled cell designs that eliminate busbars entirely, next-generation
              modules can achieve over 23% efficiency at the module level!
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

export default ScreenPrintingMetallizationRenderer;
