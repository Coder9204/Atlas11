import React, { useState, useEffect, useCallback } from 'react';

interface ViscoelasticityRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
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
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  elastic: '#3b82f6',
  viscous: '#ef4444',
  material: '#a855f7',
};

const realWorldApps = [
  {
    icon: '👟',
    title: 'Athletic Shoe Technology',
    short: 'Cushioning that adapts to your stride',
    tagline: 'Energy return meets protection',
    description: 'Running shoe midsoles use viscoelastic foams that absorb impact energy on landing (viscous response) but return energy during push-off (elastic response). The Deborah number changes with footstrike speed.',
    connection: 'Fast impacts from heel strike trigger solid-like behavior for protection. Slower push-off allows elastic energy return for efficiency.',
    howItWorks: 'EVA and TPU foams have tuned relaxation times. Fast compression causes high stress (cushioning). Energy stored elastically releases during toe-off, improving running economy.',
    stats: [
      { value: '85%', label: 'Energy return (top foams)', icon: '⚡' },
      { value: '10ms', label: 'Impact duration', icon: '⏱️' },
      { value: '40mm', label: 'Max stack height', icon: '📏' }
    ],
    examples: ['Nike ZoomX', 'Adidas Boost', 'ASICS Gel', 'Hoka Profly'],
    companies: ['Nike', 'Adidas', 'ASICS', 'Brooks'],
    futureImpact: 'Smart foams with adjustable stiffness will adapt to running speed and terrain.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Automotive Suspension',
    short: 'Balancing comfort and control',
    tagline: 'The ride quality equation',
    description: 'Car suspension uses viscoelastic bushings and dampers that feel stiff during quick maneuvers (solid-like) but soft over gradual bumps (fluid-like). This dual behavior optimizes both handling and comfort.',
    connection: 'High Deborah number during cornering provides precise control. Low Deborah number over slow undulations delivers smooth ride quality.',
    howItWorks: 'Rubber bushings isolate vibration. Hydraulic dampers control oscillation. Frequency-dependent stiffness filters high-frequency harshness while maintaining body control.',
    stats: [
      { value: '10Hz', label: 'Body resonance', icon: '📊' },
      { value: '2Hz', label: 'Wheel hop frequency', icon: '🔄' },
      { value: '40%', label: 'NVH reduction', icon: '📉' }
    ],
    examples: ['Luxury sedan suspension', 'Adaptive dampers', 'Engine mounts', 'Subframe bushings'],
    companies: ['Bilstein', 'KYB', 'ZF', 'Continental'],
    futureImpact: 'Magnetorheological dampers with real-time control will eliminate the comfort/handling tradeoff.',
    color: '#10B981'
  },
  {
    icon: '🎾',
    title: 'Sports Equipment Design',
    short: 'Power transfer through flexible materials',
    tagline: 'Timing is everything',
    description: 'Tennis rackets, golf clubs, and baseball bats use viscoelastic polymers to optimize energy transfer. The material must be stiff enough during the quick impact to transfer power, but damped enough to reduce vibration.',
    connection: 'Impact duration determines effective stiffness. Shorter impact = higher De = stiffer feel. Post-impact, lower De allows vibration damping.',
    howItWorks: 'Composite layups and polymer grips tune frequency response. High-frequency vibrations are damped; low-frequency bending transmits power. Sweet spot optimization maximizes effective hitting area.',
    stats: [
      { value: '5ms', label: 'Ball contact time', icon: '⏱️' },
      { value: '150mph', label: 'Golf ball speed', icon: '⛳' },
      { value: '30%', label: 'Vibration reduction', icon: '📉' }
    ],
    examples: ['Tennis rackets', 'Golf clubs', 'Baseball bats', 'Hockey sticks'],
    companies: ['Wilson', 'Callaway', 'Titleist', 'Bauer'],
    futureImpact: 'Personalized equipment tuned to individual swing characteristics and preferences.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Polymer Processing',
    short: 'Shaping materials through controlled flow',
    tagline: 'Timing the transition',
    description: 'Manufacturing plastics requires understanding viscoelastic flow. Injection molding, extrusion, and blow molding all depend on managing the solid-to-liquid transition through temperature and strain rate control.',
    connection: 'The Deborah number determines whether polymer acts moldable (low De) or resists flow (high De). Process parameters control this transition.',
    howItWorks: 'Heating reduces relaxation time, making polymers flow. Rapid cooling freezes the shape. Strain rate during filling must stay in the moldable regime.',
    stats: [
      { value: '200-300C', label: 'Processing temp', icon: '🌡️' },
      { value: '0.1-10s', label: 'Fill time range', icon: '⏱️' },
      { value: '1000+ psi', label: 'Injection pressure', icon: '📈' }
    ],
    examples: ['Injection molding', 'Blow molding', 'Extrusion', '3D printing'],
    companies: ['BASF', 'DuPont', 'Arburg', 'Engel'],
    futureImpact: 'AI-controlled processing will optimize cycle times while eliminating defects.',
    color: '#8B5CF6'
  }
];

const ViscoelasticityRenderer: React.FC<ViscoelasticityRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [strainRate, setStrainRate] = useState(50); // 0 = very slow, 100 = very fast
  const [temperature, setTemperature] = useState(50); // 0 = cold, 100 = hot
  const [time, setTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stretchAmount, setStretchAmount] = useState(0);
  const [stressHistory, setStressHistory] = useState<{ strain: number; stress: number }[]>([]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate material properties based on strain rate and temperature
  const relaxationTime = useCallback(() => {
    // Higher temperature = shorter relaxation time (flows easier)
    // Base relaxation time modified by temperature
    const baseRelax = 2.0;
    const tempFactor = Math.exp(-temperature / 30);
    return baseRelax * tempFactor;
  }, [temperature]);

  const deborahNumber = useCallback(() => {
    // De = relaxation time / observation time
    // observation time inversely proportional to strain rate
    const observationTime = 10 / (strainRate + 1);
    return relaxationTime() / observationTime;
  }, [strainRate, relaxationTime]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setTime(prev => prev + 0.05);

      // Calculate stretch based on time and strain rate
      const rate = (strainRate / 50) * 2;
      const newStretch = Math.sin(time * rate) * 50;
      setStretchAmount(newStretch);

      // Calculate stress (Maxwell model: spring + dashpot in series)
      const De = deborahNumber();
      const strain = newStretch / 50;
      // For viscoelastic: stress depends on strain rate more than strain itself
      const elasticStress = strain * (De > 1 ? 1 : De);
      const viscousStress = rate * (1 - (De > 1 ? 1 : De));
      const totalStress = elasticStress + viscousStress * 0.3;

      setStressHistory(prev => {
        const newHistory = [...prev, { strain: strain * 100, stress: totalStress * 100 }];
        return newHistory.slice(-100);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, time, strainRate, deborahNumber]);

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

  const predictions = [
    { id: 'always_solid', label: 'It always acts like a solid - bounces and holds shape' },
    { id: 'always_liquid', label: 'It always acts like a liquid - flows and drips' },
    { id: 'rate_depends', label: 'Fast = solid-like (bounces); Slow = liquid-like (flows)' },
    { id: 'random', label: 'It behaves randomly depending on how you touch it' },
  ];

  const twistPredictions = [
    { id: 'no_change', label: 'Temperature has no effect on the behavior' },
    { id: 'cold_flows', label: 'Cold makes it flow more; warm makes it stiffer' },
    { id: 'cold_brittle', label: 'Cold makes it more brittle/solid; warm makes it flow more' },
    { id: 'melts', label: 'It melts completely when warm' },
  ];

  const transferApplications = [
    {
      title: 'Shock Absorbers',
      description: 'Car suspension systems use viscoelastic materials that resist fast impacts but allow slow movements for comfort.',
      question: 'Why do shock absorbers need viscoelastic behavior?',
      answer: 'They must absorb sudden bumps quickly (high De - solid-like response) while allowing the car to settle slowly over rough terrain (low De - fluid-like response). Pure springs would bounce; pure dampers would be too stiff.',
    },
    {
      title: 'Running Shoes',
      description: 'Shoe foam cushioning is viscoelastic - it absorbs impact energy on landing but returns energy during push-off.',
      question: 'How does viscoelasticity improve athletic performance?',
      answer: 'During fast impact (landing), the foam acts solid-like, spreading force over time. During slower push-off, some stored elastic energy returns. The material "knows" when to absorb vs return energy based on the timescale of deformation.',
    },
    {
      title: 'Polymer Processing',
      description: 'Manufacturing plastics requires understanding how melted polymers flow at different rates and temperatures.',
      question: 'Why must engineers control strain rate when molding plastics?',
      answer: 'Too fast and the polymer acts solid, cracking or not filling molds. Too slow and production is inefficient. The Deborah number guides process design - keeping De in the optimal range for smooth flow without defects.',
    },
    {
      title: 'Biological Tissues',
      description: 'Your muscles, tendons, and organs are viscoelastic - they respond differently to slow stretches vs sudden impacts.',
      question: 'How does viscoelasticity protect your body?',
      answer: 'Tendons absorb sudden loads (solid-like at high De) preventing tears, while allowing slow stretching during movement. Organs distribute impact forces over time. This dual behavior is why slow stretching is safe but sudden jerks cause injury.',
    },
  ];

  const testQuestions = [
    {
      question: 'What makes a material viscoelastic?',
      options: [
        { text: 'It has both viscous (flow) and elastic (spring) properties', correct: true },
        { text: 'It changes color under stress', correct: false },
        { text: 'It is always liquid at room temperature', correct: false },
        { text: 'It conducts electricity well', correct: false },
      ],
    },
    {
      question: 'The Deborah number (De) compares:',
      options: [
        { text: 'Temperature to pressure', correct: false },
        { text: 'Mass to volume', correct: false },
        { text: 'Relaxation time to observation time', correct: true },
        { text: 'Length to width', correct: false },
      ],
    },
    {
      question: 'When De >> 1 (much greater than 1), the material behaves more like a:',
      options: [
        { text: 'Liquid - it flows easily', correct: false },
        { text: 'Solid - it responds elastically', correct: true },
        { text: 'Gas - it expands', correct: false },
        { text: 'Neither - it disappears', correct: false },
      ],
    },
    {
      question: 'Silly putty bounces when thrown because:',
      options: [
        { text: 'It is chemically different from normal putty', correct: false },
        { text: 'Fast deformation gives high De, so it acts elastic', correct: true },
        { text: 'Gravity affects it differently', correct: false },
        { text: 'It is magnetic', correct: false },
      ],
    },
    {
      question: 'Silly putty flows slowly when left on a table because:',
      options: [
        { text: 'It is attracted to the table surface', correct: false },
        { text: 'Slow deformation gives low De, so it acts viscous', correct: true },
        { text: 'Air pressure pushes it down', correct: false },
        { text: 'It is evaporating', correct: false },
      ],
    },
    {
      question: 'Increasing temperature typically causes a viscoelastic material to:',
      options: [
        { text: 'Become more solid-like', correct: false },
        { text: 'Become more fluid-like (shorter relaxation time)', correct: true },
        { text: 'Stay exactly the same', correct: false },
        { text: 'Become invisible', correct: false },
      ],
    },
    {
      question: 'The Maxwell model represents viscoelasticity as:',
      options: [
        { text: 'Two springs in parallel', correct: false },
        { text: 'A spring and dashpot in series', correct: true },
        { text: 'Three dashpots in series', correct: false },
        { text: 'A single rigid rod', correct: false },
      ],
    },
    {
      question: 'Polymer chains in viscoelastic materials:',
      options: [
        { text: 'Are completely rigid and never move', correct: false },
        { text: 'Can stretch quickly but take time to flow past each other', correct: true },
        { text: 'Are always in liquid form', correct: false },
        { text: 'Do not affect material behavior', correct: false },
      ],
    },
    {
      question: 'In a stress-strain curve for a viscoelastic material, strain rate affects:',
      options: [
        { text: 'Only the color of the curve', correct: false },
        { text: 'The slope and shape of the curve significantly', correct: true },
        { text: 'Nothing - the curve is always the same', correct: false },
        { text: 'Only the units of measurement', correct: false },
      ],
    },
    {
      question: 'Which real-world application relies on viscoelastic behavior?',
      options: [
        { text: 'Light bulbs', correct: false },
        { text: 'Shock absorbers and running shoe foam', correct: true },
        { text: 'Window glass', correct: false },
        { text: 'Copper wiring', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderMaterialBlob = (interactive: boolean, showGraph: boolean = false) => {
    const width = 700;
    const height = 450;
    const centerX = width / 2;
    const centerY = 200;

    // Material blob deformation based on stretch
    const De = deborahNumber();
    const blobWidth = 90 + stretchAmount * (De > 1 ? 0.5 : 1.5);
    const blobHeight = 65 - stretchAmount * 0.3 * (De > 1 ? 0.5 : 1.5);

    // Behavior ratio for visual effects
    const behaviorRatio = Math.min(De / 2, 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '750px' }}
        >
          {/* ============ PREMIUM DEFS SECTION ============ */}
          <defs>
            {/* Premium dark laboratory background gradient */}
            <linearGradient id="viscLabBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Viscoelastic material gradient - elastic (blue-purple) to viscous (red-orange) */}
            <linearGradient id="viscMaterialElastic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="25%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="75%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>

            <linearGradient id="viscMaterialViscous" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="75%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>

            {/* Radial glow for material center */}
            <radialGradient id="viscMaterialGlow" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor={behaviorRatio > 0.5 ? "#a5b4fc" : "#fed7aa"} stopOpacity="0.8" />
              <stop offset="40%" stopColor={behaviorRatio > 0.5 ? "#6366f1" : "#f97316"} stopOpacity="0.5" />
              <stop offset="70%" stopColor={behaviorRatio > 0.5 ? "#4338ca" : "#c2410c"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={behaviorRatio > 0.5 ? "#1e1b4b" : "#431407"} stopOpacity="0" />
            </radialGradient>

            {/* Polymer chain highlight gradient */}
            <linearGradient id="viscPolymerChain" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Spring metal gradient for Maxwell model */}
            <linearGradient id="viscSpringMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="80%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Dashpot cylinder gradient */}
            <linearGradient id="viscDashpotCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="15%" stopColor="#334155" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="85%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Dashpot fluid gradient */}
            <linearGradient id="viscDashpotFluid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#ea580c" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#c2410c" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
            </linearGradient>

            {/* Temperature bar gradient - cold to hot */}
            <linearGradient id="viscTempGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Stress indicator gradient */}
            <linearGradient id="viscStressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="33%" stopColor="#eab308" />
              <stop offset="66%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Graph background gradient */}
            <linearGradient id="viscGraphBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Force arrow gradient */}
            <linearGradient id="viscForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#67e8f9" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>

            {/* Premium glow filters */}
            <filter id="viscMaterialGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="viscSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="viscInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="viscTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="viscArrowRight" markerWidth={12} markerHeight={12} refX={0} refY={6} orient="auto">
              <path d="M0,0 L0,12 L12,6 z" fill="url(#viscForceArrow)" />
            </marker>
            <marker id="viscArrowLeft" markerWidth={12} markerHeight={12} refX={12} refY={6} orient="auto">
              <path d="M12,0 L12,12 L0,6 z" fill="url(#viscForceArrow)" />
            </marker>

            {/* Lab grid pattern */}
            <pattern id="viscLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* ============ BACKGROUND ============ */}
          <rect width={width} height={height} fill="url(#viscLabBackground)" />
          <rect width={width} height={height} fill="url(#viscLabGrid)" />

          {/* ============ HEADER PANEL ============ */}
          <g transform="translate(20, 15)">
            {/* Deborah Number display */}
            <rect x="0" y="0" width="180" height="55" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <rect x="0" y="0" width="180" height="55" rx="8" fill="url(#viscGraphBg)" opacity="0.5" />
            <text x="90" y="18" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">DEBORAH NUMBER</text>
            <text x="90" y="42" fill={De > 1 ? "#818cf8" : "#fb923c"} fontSize="22" textAnchor="middle" fontWeight="bold" filter="url(#viscTextGlow)">
              De = {De.toFixed(2)}
            </text>
          </g>

          {/* Behavior indicator */}
          <g transform={`translate(${width - 200}, 15)`}>
            <rect x="0" y="0" width="180" height="55" rx="8" fill={De > 1.5 ? "rgba(99, 102, 241, 0.2)" : De < 0.5 ? "rgba(249, 115, 22, 0.2)" : "rgba(234, 179, 8, 0.2)"} stroke={De > 1.5 ? "#6366f1" : De < 0.5 ? "#f97316" : "#eab308"} strokeWidth="1.5" />
            <text x="90" y="18" fill="#e2e8f0" fontSize="10" textAnchor="middle" fontWeight="bold">MATERIAL BEHAVIOR</text>
            <text x="90" y="42" fill={De > 1.5 ? "#a5b4fc" : De < 0.5 ? "#fed7aa" : "#fef08a"} fontSize="16" textAnchor="middle" fontWeight="bold">
              {De > 1.5 ? 'SOLID-LIKE (Elastic)' : De < 0.5 ? 'FLUID-LIKE (Viscous)' : 'TRANSITIONAL'}
            </text>
          </g>

          {/* Strain rate indicator */}
          <g transform={`translate(${width / 2 - 100}, 15)`}>
            <rect x="0" y="0" width="200" height="55" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="100" y="18" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">STRAIN RATE</text>
            <rect x="15" y="28" width="170" height="10" rx="5" fill="#1e293b" />
            <rect x="15" y="28" width={strainRate * 1.7} height="10" rx="5" fill="url(#viscStressGradient)" />
            <text x="100" y="50" fill="#e2e8f0" fontSize="11" textAnchor="middle">
              {strainRate < 30 ? 'SLOW (flows)' : strainRate > 70 ? 'FAST (bounces)' : 'MEDIUM'}
            </text>
          </g>

          {/* ============ MAIN VISUALIZATION AREA ============ */}

          {/* Left force arrow */}
          <g>
            <path
              d={`M ${centerX - blobWidth - 80} ${centerY} L ${centerX - blobWidth - 20} ${centerY}`}
              stroke="url(#viscForceArrow)"
              strokeWidth={4}
              markerEnd="url(#viscArrowRight)"
              filter="url(#viscSoftGlow)"
            />
            <rect x={centerX - blobWidth - 130} y={centerY - 20} width="50" height="40" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x={centerX - blobWidth - 105} y={centerY - 5} fill="#94a3b8" fontSize="9" textAnchor="middle">FORCE</text>
            <text x={centerX - blobWidth - 105} y={centerY + 10} fill="#22d3ee" fontSize="12" textAnchor="middle" fontWeight="bold">PULL</text>
          </g>

          {/* Right force arrow */}
          <g>
            <path
              d={`M ${centerX + blobWidth + 80} ${centerY} L ${centerX + blobWidth + 20} ${centerY}`}
              stroke="url(#viscForceArrow)"
              strokeWidth={4}
              markerEnd="url(#viscArrowLeft)"
              filter="url(#viscSoftGlow)"
            />
            <rect x={centerX + blobWidth + 80} y={centerY - 20} width="50" height="40" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x={centerX + blobWidth + 105} y={centerY - 5} fill="#94a3b8" fontSize="9" textAnchor="middle">FORCE</text>
            <text x={centerX + blobWidth + 105} y={centerY + 10} fill="#22d3ee" fontSize="12" textAnchor="middle" fontWeight="bold">PULL</text>
          </g>

          {/* ============ VISCOELASTIC MATERIAL BLOB ============ */}
          <g filter="url(#viscMaterialGlowFilter)">
            {/* Outer glow */}
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={Math.max(35, blobWidth) + 15}
              ry={Math.max(25, blobHeight) + 12}
              fill={behaviorRatio > 0.5 ? "rgba(99, 102, 241, 0.15)" : "rgba(249, 115, 22, 0.15)"}
            />

            {/* Main material blob */}
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={Math.max(35, blobWidth)}
              ry={Math.max(25, blobHeight)}
              fill={behaviorRatio > 0.5 ? "url(#viscMaterialElastic)" : "url(#viscMaterialViscous)"}
              stroke={behaviorRatio > 0.5 ? "#818cf8" : "#fb923c"}
              strokeWidth={2}
            />

            {/* Inner highlight */}
            <ellipse
              cx={centerX - blobWidth * 0.2}
              cy={centerY - blobHeight * 0.3}
              rx={Math.max(15, blobWidth * 0.4)}
              ry={Math.max(10, blobHeight * 0.3)}
              fill="url(#viscMaterialGlow)"
              opacity="0.6"
            />
          </g>

          {/* Polymer chains inside material */}
          {[...Array(7)].map((_, i) => {
            const yBase = centerY - 40 + i * 13;
            const waveAmplitude = De > 1 ? 2 : 10;
            const waveFreq = De > 1 ? 0.08 : 0.04;
            const chainOpacity = 0.3 + (i % 2) * 0.2;
            return (
              <path
                key={i}
                d={`M ${centerX - blobWidth + 25} ${yBase} ${[...Array(12)].map((_, j) => {
                  const x = centerX - blobWidth + 25 + j * (blobWidth * 2 - 50) / 12;
                  const yOffset = Math.sin((x + time * 40 + i * 20) * waveFreq) * waveAmplitude;
                  return `L ${x} ${yBase + yOffset}`;
                }).join(' ')}`}
                stroke="url(#viscPolymerChain)"
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                opacity={chainOpacity}
              />
            );
          })}

          {/* Material behavior label */}
          <g transform={`translate(${centerX}, ${centerY + blobHeight + 35})`}>
            <rect
              x="-60"
              y="-12"
              width="120"
              height="28"
              rx="14"
              fill={De > 1 ? "rgba(99, 102, 241, 0.3)" : "rgba(249, 115, 22, 0.3)"}
              stroke={De > 1 ? "#6366f1" : "#f97316"}
              strokeWidth="1.5"
            />
            <text
              y="5"
              fill={De > 1 ? "#c7d2fe" : "#fed7aa"}
              fontSize="13"
              textAnchor="middle"
              fontWeight="bold"
            >
              {De > 1 ? 'ELASTIC RESPONSE' : 'VISCOUS FLOW'}
            </text>
          </g>

          {/* ============ MAXWELL MODEL VISUALIZATION ============ */}
          <g transform="translate(50, 300)">
            <rect x="-10" y="-10" width="280" height="80" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="130" y="8" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">MAXWELL MODEL (Series)</text>

            {/* Fixed anchor */}
            <rect x="10" y="25" width="15" height="30" fill="#475569" rx="2" />
            <line x1="10" y1="28" x2="10" y2="52" stroke="#64748b" strokeWidth="2" />

            {/* Spring element */}
            <g transform="translate(25, 40)">
              {/* Spring coils */}
              <path
                d={`M 0 0 ${[...Array(6)].map((_, i) => {
                  const x = 10 + i * 15 + (isAnimating ? stretchAmount * 0.2 : 0);
                  const y = i % 2 === 0 ? -10 : 10;
                  return `L ${x} ${y}`;
                }).join(' ')} L ${100 + (isAnimating ? stretchAmount * 0.2 : 0)} 0`}
                stroke="url(#viscSpringMetal)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </g>
            <text x="75" y="65" fill="#818cf8" fontSize="9" textAnchor="middle">Spring (E)</text>

            {/* Dashpot element */}
            <g transform={`translate(${130 + (isAnimating ? stretchAmount * 0.1 : 0)}, 25)`}>
              {/* Cylinder */}
              <rect x="0" y="0" width="60" height="30" rx="3" fill="url(#viscDashpotCylinder)" stroke="#64748b" strokeWidth="1" />
              {/* Piston */}
              <rect x={-15 + (isAnimating ? stretchAmount * 0.15 : 0)} y="8" width="45" height="14" rx="2" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
              {/* Fluid */}
              <rect x="5" y="5" width="50" height="20" rx="2" fill="url(#viscDashpotFluid)" opacity="0.6" />
            </g>
            <text x={160 + (isAnimating ? stretchAmount * 0.1 : 0)} y="65" fill="#fb923c" fontSize="9" textAnchor="middle">Dashpot (eta)</text>

            {/* Moving anchor */}
            <g transform={`translate(${195 + (isAnimating ? stretchAmount * 0.25 : 0)}, 25)`}>
              <rect x="0" y="0" width="15" height="30" fill="#475569" rx="2" />
              <path d="M 18 5 L 28 15 L 18 25" stroke="#22d3ee" strokeWidth="2" fill="none" />
            </g>
          </g>

          {/* ============ KELVIN-VOIGT MODEL VISUALIZATION ============ */}
          <g transform="translate(370, 300)">
            <rect x="-10" y="-10" width="280" height="80" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="130" y="8" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">KELVIN-VOIGT MODEL (Parallel)</text>

            {/* Fixed anchor */}
            <rect x="10" y="20" width="15" height="40" fill="#475569" rx="2" />

            {/* Parallel arrangement */}
            {/* Top: Spring */}
            <g transform="translate(30, 28)">
              <path
                d={`M 0 0 ${[...Array(5)].map((_, i) => {
                  const x = 8 + i * 12 + (isAnimating ? stretchAmount * 0.15 : 0);
                  const y = i % 2 === 0 ? -6 : 6;
                  return `L ${x} ${y}`;
                }).join(' ')} L ${70 + (isAnimating ? stretchAmount * 0.15 : 0)} 0`}
                stroke="url(#viscSpringMetal)"
                strokeWidth="3"
                fill="none"
              />
            </g>
            <text x="65" y="22" fill="#818cf8" fontSize="8" textAnchor="middle">E</text>

            {/* Bottom: Dashpot */}
            <g transform={`translate(30, 42)`}>
              <rect x="0" y="0" width="45" height="18" rx="2" fill="url(#viscDashpotCylinder)" stroke="#64748b" strokeWidth="0.5" />
              <rect x={-8 + (isAnimating ? stretchAmount * 0.1 : 0)} y="4" width="30" height="10" rx="1" fill="#94a3b8" />
              <rect x="5" y="2" width="35" height="14" rx="1" fill="url(#viscDashpotFluid)" opacity="0.5" />
              <line x1={45} y1="9" x2={70 + (isAnimating ? stretchAmount * 0.15 : 0)} y2="9" stroke="#64748b" strokeWidth="2" />
            </g>
            <text x="55" y="68" fill="#fb923c" fontSize="8" textAnchor="middle">eta</text>

            {/* Connecting bars */}
            <line x1="25" y1="28" x2="25" y2="51" stroke="#64748b" strokeWidth="2" />
            <line x1={100 + (isAnimating ? stretchAmount * 0.15 : 0)} y1="28" x2={100 + (isAnimating ? stretchAmount * 0.15 : 0)} y2="51" stroke="#64748b" strokeWidth="2" />

            {/* Moving anchor */}
            <g transform={`translate(${105 + (isAnimating ? stretchAmount * 0.15 : 0)}, 20)`}>
              <rect x="0" y="0" width="15" height="40" fill="#475569" rx="2" />
              <path d="M 18 10 L 28 20 L 18 30" stroke="#22d3ee" strokeWidth="2" fill="none" />
            </g>

            {/* Behavior note */}
            <text x="200" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">Creep &</text>
            <text x="200" y="47" fill="#94a3b8" fontSize="8" textAnchor="middle">Recovery</text>
          </g>

          {/* ============ TEMPERATURE INDICATOR ============ */}
          <g transform={`translate(${width - 50}, 90)`}>
            <rect x="-20" y="-10" width="40" height="170" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="0" y="8" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold">TEMP</text>

            {/* Temperature bar background */}
            <rect x="-8" y="20" width="16" height="120" rx="8" fill="#1e293b" />

            {/* Temperature bar fill */}
            <rect
              x="-8"
              y={20 + (100 - temperature) * 1.2}
              width="16"
              height={temperature * 1.2}
              rx="8"
              fill="url(#viscTempGradient)"
              filter="url(#viscSoftGlow)"
            />

            {/* Temperature markers */}
            <text x="0" y="148" fill="#3b82f6" fontSize="8" textAnchor="middle">COLD</text>
            <text x="0" y="30" fill="#ef4444" fontSize="8" textAnchor="middle">HOT</text>

            {/* Current value */}
            <text x="0" y="162" fill="#e2e8f0" fontSize="10" textAnchor="middle" fontWeight="bold">{temperature}%</text>
          </g>
        </svg>

        {/* ============ STRESS-STRAIN GRAPH ============ */}
        {showGraph && (
          <div style={{ width: '100%', maxWidth: '700px', marginTop: '16px' }}>
            <svg width="100%" height={180} viewBox="0 0 700 180">
              <defs>
                <linearGradient id="viscCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
                <linearGradient id="viscAxisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
              </defs>

              {/* Graph background */}
              <rect width="700" height="180" fill="#0f172a" rx="12" />
              <rect x="60" y="20" width="600" height="130" fill="#020617" rx="4" />

              {/* Grid lines */}
              {[...Array(6)].map((_, i) => (
                <line key={`h${i}`} x1="60" y1={20 + i * 26} x2="660" y2={20 + i * 26} stroke="#1e293b" strokeWidth="1" />
              ))}
              {[...Array(7)].map((_, i) => (
                <line key={`v${i}`} x1={60 + i * 100} y1="20" x2={60 + i * 100} y2="150" stroke="#1e293b" strokeWidth="1" />
              ))}

              {/* Axes */}
              <line x1="60" y1="150" x2="660" y2="150" stroke="url(#viscAxisGradient)" strokeWidth="2" />
              <line x1="60" y1="20" x2="60" y2="150" stroke="url(#viscAxisGradient)" strokeWidth="2" />

              {/* Axis labels */}
              <text x="360" y="172" fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold">STRAIN (%)</text>
              <text x="25" y="90" fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold" transform="rotate(-90, 25, 90)">STRESS</text>

              {/* Title */}
              <text x="360" y="15" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="bold">STRESS-STRAIN CURVE (Rate-Dependent)</text>

              {/* Reference elastic line */}
              <line x1="60" y1="150" x2="660" y2="30" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.4" />
              <text x="620" y="45" fill="#6366f1" fontSize="9">Pure Elastic</text>

              {/* Reference viscous line */}
              <line x1="60" y1="150" x2="660" y2="120" stroke="#f97316" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.4" />
              <text x="620" y="115" fill="#f97316" fontSize="9">Pure Viscous</text>

              {/* Actual stress-strain curve */}
              {stressHistory.length > 1 && (
                <path
                  d={`M ${60 + (stressHistory[0].strain + 50) * 5.5} ${150 - (stressHistory[0].stress + 50) * 1.2} ${stressHistory.slice(1).map(p =>
                    `L ${60 + Math.max(0, Math.min(100, p.strain + 50)) * 5.5} ${150 - Math.max(0, Math.min(100, p.stress + 50)) * 1.2}`
                  ).join(' ')}`}
                  stroke="url(#viscCurveGradient)"
                  strokeWidth="3"
                  fill="none"
                  filter="url(#viscSoftGlow)"
                />
              )}

              {/* Legend */}
              <rect x="80" y="25" width="120" height="50" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
              <line x1="90" y1="40" x2="110" y2="40" stroke="#a855f7" strokeWidth="2" />
              <text x="115" y="44" fill="#e2e8f0" fontSize="9">Viscoelastic</text>
              <line x1="90" y1="55" x2="110" y2="55" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="115" y="59" fill="#94a3b8" fontSize="9">Elastic ref.</text>
              <line x1="90" y1="70" x2="110" y2="70" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="115" y="74" fill="#94a3b8" fontSize="9">Viscous ref.</text>
            </svg>
          </div>
        )}

        {/* ============ INTERACTIVE CONTROLS ============ */}
        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '12px' }}>
            <button
              onClick={() => {
                setIsAnimating(!isAnimating);
                if (!isAnimating) {
                  setStressHistory([]);
                }
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating
                  ? '0 4px 20px rgba(239, 68, 68, 0.4)'
                  : '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isAnimating ? 'Stop Deformation' : 'Start Stretch/Compress'}
            </button>
            <button
              onClick={() => {
                setStrainRate(50);
                setTemperature(50);
                setStretchAmount(0);
                setTime(0);
                setStressHistory([]);
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              Reset Simulation
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Strain Rate: {strainRate < 30 ? 'SLOW (like leaving putty on table)' : strainRate > 70 ? 'FAST (like throwing putty)' : 'MEDIUM'}
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={strainRate}
          onChange={(e) => setStrainRate(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Slow (flows)</span>
          <span>Fast (bounces)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Temperature: {temperature < 30 ? 'COLD' : temperature > 70 ? 'WARM' : 'ROOM TEMP'}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Cold (brittle)</span>
          <span>Warm (flows more)</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Deborah Number (De) = {deborahNumber().toFixed(2)}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          De {'>'} 1: Solid-like | De {'<'} 1: Fluid-like
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Silly Putty Science
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can one material act like a solid AND a liquid?
            </p>
          </div>

          {renderMaterialBlob(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Throw silly putty at the wall - it bounces like a rubber ball.
                Leave it on a table - it slowly flows into a puddle.
                Same material, opposite behaviors!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is viscoelasticity - materials that remember they're both solid and liquid.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Stretch/Compress" to see how the material responds to deformation!
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
          {renderMaterialBlob(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A blob of viscoelastic material (like silly putty or polymer slime) being
              stretched at different rates. The internal wavy lines represent tangled
              polymer chains. The Deborah number (De) tells us if the material will
              act more like a solid or liquid.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What determines whether silly putty bounces or flows?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Viscoelasticity</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust strain rate to see solid-like vs liquid-like behavior
            </p>
          </div>

          {renderMaterialBlob(true, true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Fast rate (high De) - material bounces back elastically</li>
              <li>Slow rate (low De) - material flows like thick honey</li>
              <li>Watch the stress-strain curve change shape!</li>
              <li>Notice how polymer chains respond differently</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'rate_depends';

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
              The deformation rate determines behavior: fast = solid-like, slow = fluid-like!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Viscoelasticity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Deborah Number:</strong> De = relaxation time / observation time.
                Named after the biblical prophetess who said "the mountains flowed before the Lord" -
                given enough time, even mountains flow!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>High De (fast deformation):</strong> The material
                doesn't have time to rearrange its polymer chains. It stores energy elastically and bounces back.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Low De (slow deformation):</strong> Polymer chains
                have time to slide past each other. Energy dissipates as heat, and the material flows.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Maxwell Model:</strong> Spring (elastic) + dashpot
                (viscous) in series. The spring stores energy; the dashpot dissipates it over time.
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
              What if we change the temperature?
            </p>
          </div>

          {renderMaterialBlob(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You have two pieces of the same silly putty. You put one in the freezer and
              warm the other in your hands. Now you try to stretch both at the same rate.
              How does temperature affect the viscoelastic behavior?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does temperature change the material's behavior?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Temperature Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change temperature and observe how the same strain rate produces different behavior
            </p>
          </div>

          {renderMaterialBlob(true, true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Cold materials have longer relaxation times (higher De at same rate) - more brittle and solid-like.
              Warm materials have shorter relaxation times (lower De) - more fluid and flowing.
              This is why cold silly putty can shatter, but warm putty stretches endlessly!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'cold_brittle';

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
              Chill it and it becomes more brittle; warm it and it flows more!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Temperature and Relaxation Time</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cold Materials:</strong> Polymer chains move
                sluggishly. Relaxation time increases dramatically. Even moderate strain rates give high De,
                making the material act glassy and brittle - it can shatter!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Warm Materials:</strong> Polymer chains wiggle
                energetically and slide past each other easily. Relaxation time decreases. Even fast
                deformation may give low De, so the material flows smoothly.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Glass Transition:</strong> Below a critical
                temperature, many polymers "freeze" into a glassy state where they behave almost purely
                elastic (and brittle). This is why rubber bands snap when frozen!
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
              Viscoelasticity is everywhere in engineering and biology
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
                {testScore >= 8 ? 'You\'ve mastered viscoelasticity!' : 'Review the material and try again.'}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered viscoelasticity and time-dependent material behavior</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Deborah number: De = relaxation time / observation time</li>
              <li>High De = solid-like elastic response</li>
              <li>Low De = liquid-like viscous flow</li>
              <li>Temperature affects relaxation time</li>
              <li>Maxwell model: spring + dashpot in series</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Real materials often require more complex models like the Kelvin-Voigt (parallel spring-dashpot)
              or Standard Linear Solid. Rheology, the study of flow, uses these models to predict everything
              from paint dripping to blood flow to earthquake response. The time-temperature superposition
              principle lets engineers predict long-term behavior from short tests!
            </p>
          </div>
          {renderMaterialBlob(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ViscoelasticityRenderer;
