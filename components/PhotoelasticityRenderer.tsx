import React, { useState, useEffect } from 'react';

const realWorldApps = [
  {
    icon: '🔧',
    title: 'Engineering Stress Analysis',
    short: 'Visualizing forces in transparent models',
    tagline: 'See stress before it causes failure',
    description: 'Engineers create transparent plastic models of structures and machine parts. Under load, photoelastic fringes reveal where stress concentrates, helping identify potential failure points before production.',
    connection: 'Stress causes birefringence in transparent materials. Between crossed polarizers, different stress levels produce different colors, creating a visual stress map.',
    howItWorks: 'Plastic models are loaded in polariscopes. The fringe patterns directly correlate to principal stress differences. High stress areas show dense, closely-spaced fringes.',
    stats: [
      { value: '±2%', label: 'stress accuracy', icon: '🎯' },
      { value: '100+', label: 'years of use', icon: '📅' },
      { value: '$5B', label: 'testing market', icon: '📈' }
    ],
    examples: ['Gear tooth stress', 'Bolt hole concentrations', 'Aircraft components', 'Automotive parts'],
    companies: ['Vishay', 'Magnaflux', 'TestResources', 'MTS Systems'],
    futureImpact: 'Digital image correlation combined with photoelasticity enables full-field dynamic stress analysis for complex loading scenarios.',
    color: '#A855F7'
  },
  {
    icon: '📺',
    title: 'LCD Display Quality',
    short: 'Detecting residual stress in display glass',
    tagline: 'Every pixel needs stress-free glass',
    description: 'LCD and OLED displays use polarizers as part of their operation. Residual stress in glass substrates causes unwanted birefringence that degrades image quality and color accuracy.',
    connection: 'Stressed glass rotates polarization differently across the display, causing color shifts and contrast variations. Quality control uses polarimetry to detect these defects.',
    howItWorks: 'Displays are viewed between crossed polarizers during manufacturing. Stress patterns appear as color variations. Thermal annealing reduces stress to acceptable levels.',
    stats: [
      { value: '<5nm', label: 'retardation limit', icon: '🔬' },
      { value: '8K', label: 'resolution displays', icon: '📺' },
      { value: '$150B', label: 'display market', icon: '📈' }
    ],
    examples: ['OLED smartphone screens', 'Monitor panels', 'TV displays', 'Automotive HUDs'],
    companies: ['Samsung Display', 'LG Display', 'BOE', 'Corning'],
    futureImpact: 'Flexible and foldable displays require new approaches to stress management while maintaining optical quality.',
    color: '#3B82F6'
  },
  {
    icon: '🌡️',
    title: 'Tempered Glass Inspection',
    short: 'Polarized light reveals safety glass quality',
    tagline: 'Stress patterns ensure strength',
    description: 'Tempered glass is strengthened by deliberately introducing surface compression stress. Polarized light inspection verifies proper tempering by revealing the characteristic stress pattern.',
    connection: 'The tempering process creates a specific stress distribution: compression at surfaces, tension in the core. This pattern is visible as birefringence under polarized light.',
    howItWorks: 'Glass is viewed between polarizers or with a polarimeter. Properly tempered glass shows uniform stress patterns. Defects or improper tempering create irregular fringes.',
    stats: [
      { value: '4-5x', label: 'stronger than annealed', icon: '💪' },
      { value: '10K', label: 'PSI surface stress', icon: '⚡' },
      { value: '$4B', label: 'safety glass market', icon: '📈' }
    ],
    examples: ['Car side windows', 'Smartphone screens', 'Shower doors', 'Building facades'],
    companies: ['AGC Glass', 'Saint-Gobain', 'Guardian', 'Pilkington'],
    futureImpact: 'Chemically strengthened glass for devices requires polarimetric inspection to verify stress profiles meet specifications.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Geological Mineral ID',
    short: 'Identifying rocks through optical properties',
    tagline: 'Every mineral tells a story in polarized light',
    description: 'Geologists use polarized light microscopy to identify minerals in thin rock sections. Different minerals have characteristic birefringence and interference colors that serve as fingerprints.',
    connection: 'Crystal structure determines birefringence. The interference colors between crossed polarizers are diagnostic for mineral identification.',
    howItWorks: 'Rock sections are ground to 30 microns thin. In polarized light, each mineral shows distinctive interference colors, extinction angles, and crystal habits.',
    stats: [
      { value: '4,000+', label: 'minerals identified', icon: '💎' },
      { value: '30', label: 'micron section thickness', icon: '📏' },
      { value: '200+', label: 'years of technique', icon: '📅' }
    ],
    examples: ['Quartz identification', 'Feldspar analysis', 'Ore microscopy', 'Metamorphic studies'],
    companies: ['Zeiss', 'Leica', 'Olympus', 'Nikon'],
    futureImpact: 'Automated mineral identification using AI and polarimetry accelerates geological survey and mining exploration.',
    color: '#F59E0B'
  }
];

interface PhotoelasticityRendererProps {
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
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  polarizer: '#3b82f6',
  stress: '#ef4444',
};

const PhotoelasticityRenderer: React.FC<PhotoelasticityRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [bendAmount, setBendAmount] = useState(30);
  const [polarizerEnabled, setPolarizerEnabled] = useState(true);
  const [isThick, setIsThick] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setBendAmount(prev => {
        const newVal = prev + 2;
        if (newVal > 60) return 10;
        return newVal;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'nothing', label: 'Nothing visible - plastic remains clear and uniform' },
    { id: 'dark', label: 'The plastic becomes darker where bent' },
    { id: 'fringes', label: 'Rainbow-colored bands appear showing stress patterns' },
    { id: 'glow', label: 'The plastic glows with a single color' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Same fringe pattern regardless of thickness' },
    { id: 'more', label: 'Thicker plastic shows more closely-spaced fringes' },
    { id: 'fewer', label: 'Thicker plastic shows fewer, wider-spaced fringes' },
    { id: 'none', label: 'Thicker plastic shows no fringes at all' },
  ];

  const transferApplications = [
    {
      title: 'Engineering Stress Analysis',
      description: 'Engineers create transparent plastic models of bridges, gears, and structures. Under load, photoelastic fringes reveal where stress concentrates.',
      question: 'Why is photoelasticity valuable for finding structural weak points?',
      answer: 'Stress concentrations that could cause failure become visually obvious as dense fringe patterns. This lets engineers see the full stress distribution at once, not just point measurements.',
    },
    {
      title: 'Optical Fiber Sensors',
      description: 'Optical fibers can detect pressure and strain. Stress changes the fiber\'s birefringence, altering light polarization.',
      question: 'How do fiber optic sensors measure pressure without electronics?',
      answer: 'Pressure creates stress in the fiber, changing its birefringence. Polarized light passing through rotates differently under stress, which can be measured at the fiber end.',
    },
    {
      title: 'Tempered Glass Safety',
      description: 'Car windows and phone screens use tempered glass with built-in stress. Polarized sunglasses can reveal stress patterns.',
      question: 'Why can you sometimes see patterns in car windows with polarized sunglasses?',
      answer: 'Tempering creates residual stress patterns in the glass. The birefringence from this stress rotates polarized light, creating visible patterns when viewed through polarized lenses.',
    },
    {
      title: 'Geology - Mineral Identification',
      description: 'Geologists use polarized microscopes to identify minerals. Different minerals have characteristic birefringence colors.',
      question: 'How do geologists identify minerals using polarized light?',
      answer: 'Each mineral has specific crystal structure creating unique birefringence. The interference colors seen between crossed polarizers serve as a fingerprint for mineral identification.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes rainbow fringes in photoelasticity?',
      options: [
        { text: 'Temperature gradients in the plastic', correct: false },
        { text: 'Stress-induced birefringence rotating polarized light differently by wavelength', correct: true },
        { text: 'Chemical reactions in the material', correct: false },
        { text: 'Diffraction from surface scratches', correct: false },
      ],
    },
    {
      question: 'Birefringence means a material has:',
      options: [
        { text: 'Two different colors', correct: false },
        { text: 'Two different refractive indices for different polarization directions', correct: true },
        { text: 'Two layers of different materials', correct: false },
        { text: 'Fluorescent properties', correct: false },
      ],
    },
    {
      question: 'Crossed polarizers means:',
      options: [
        { text: 'The polarizers are at 90 degrees to each other, blocking light', correct: true },
        { text: 'The polarizers are parallel and add together', correct: false },
        { text: 'The polarizers spin in opposite directions', correct: false },
        { text: 'The polarizers have crossed scratch patterns', correct: false },
      ],
    },
    {
      question: 'Without any stressed material between crossed polarizers:',
      options: [
        { text: 'Bright white light passes through', correct: false },
        { text: 'No light passes through (dark field)', correct: true },
        { text: 'Only red light passes through', correct: false },
        { text: 'A rainbow pattern appears', correct: false },
      ],
    },
    {
      question: 'In photoelasticity, regions of high stress show:',
      options: [
        { text: 'No color at all', correct: false },
        { text: 'Dense, closely-spaced fringe patterns', correct: true },
        { text: 'Only black coloring', correct: false },
        { text: 'Uniform single color', correct: false },
      ],
    },
    {
      question: 'Different colors in photoelastic fringes represent:',
      options: [
        { text: 'Different temperatures', correct: false },
        { text: 'Different amounts of polarization rotation (related to stress)', correct: true },
        { text: 'Different plastic compositions', correct: false },
        { text: 'Different light source colors', correct: false },
      ],
    },
    {
      question: 'A thicker stressed sample compared to a thinner one shows:',
      options: [
        { text: 'The same fringe pattern', correct: false },
        { text: 'More fringes because light travels through more stressed material', correct: true },
        { text: 'Fewer fringes because stress is distributed', correct: false },
        { text: 'No fringes because light is absorbed', correct: false },
      ],
    },
    {
      question: 'Photoelasticity is useful in engineering because:',
      options: [
        { text: 'It makes structures stronger', correct: false },
        { text: 'It reveals the full stress field visually in model structures', correct: true },
        { text: 'It only works on metal parts', correct: false },
        { text: 'It eliminates the need for calculations', correct: false },
      ],
    },
    {
      question: 'The patterns seen in tempered glass through polarized sunglasses are due to:',
      options: [
        { text: 'Surface contamination', correct: false },
        { text: 'Residual stress from the tempering process', correct: true },
        { text: 'Scratches on the glass', correct: false },
        { text: 'Reflections from the car interior', correct: false },
      ],
    },
    {
      question: 'To see photoelastic effects, you need:',
      options: [
        { text: 'Only a transparent stressed material', correct: false },
        { text: 'A birefringent material between two polarizers', correct: true },
        { text: 'A laser light source', correct: false },
        { text: 'A microscope', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 420;
    const beamWidth = 260;
    const beamHeight = isThick ? 60 : 32;
    const beamY = height / 2 - 60; // Moved up to allow more vertical deflection

    // Generate stress fringe colors based on bend amount
    const generateFringes = () => {
      if (!polarizerEnabled) return null;

      const fringes = [];
      const numFringes = isThick ? Math.floor(bendAmount / 4) : Math.floor(bendAmount / 8);
      // Photoelastic interference colors - realistic sequence
      const fringeColors = [
        '#1a1a2e', '#2d3561', '#1e3a5f', '#0ea5e9', '#22d3ee',
        '#10b981', '#84cc16', '#fbbf24', '#f97316', '#ef4444',
        '#ec4899', '#a855f7', '#6366f1', '#3b82f6',
      ];

      for (let i = 0; i < numFringes; i++) {
        const t = i / Math.max(numFringes - 1, 1);
        const colorIndex = i % fringeColors.length;
        const bendOffset = Math.sin(t * Math.PI) * bendAmount * 0.6;

        // Main fringe ellipse
        fringes.push(
          <ellipse
            key={`fringe-${i}`}
            cx={width / 2}
            cy={beamY + beamHeight / 2 + bendOffset * 0.35}
            rx={beamWidth / 2 - i * 10 - 5}
            ry={beamHeight / 2 + Math.abs(bendOffset) * 0.25}
            fill="none"
            stroke={fringeColors[colorIndex]}
            strokeWidth={isThick ? 4 : 3}
            opacity={0.85}
            filter="url(#phoelFringeGlow)"
          />
        );

        // Secondary inner contour for depth
        if (i < numFringes - 2 && i % 2 === 0) {
          fringes.push(
            <ellipse
              key={`fringe-inner-${i}`}
              cx={width / 2}
              cy={beamY + beamHeight / 2 + bendOffset * 0.35}
              rx={beamWidth / 2 - i * 10 - 8}
              ry={beamHeight / 2 + Math.abs(bendOffset) * 0.2}
              fill="none"
              stroke={fringeColors[(colorIndex + 1) % fringeColors.length]}
              strokeWidth={1.5}
              opacity={0.5}
            />
          );
        }
      }
      return fringes;
    };

    // Generate curved beam path based on bend
    const generateBeamPath = () => {
      const leftX = width / 2 - beamWidth / 2;
      const rightX = width / 2 + beamWidth / 2;
      const bendY = bendAmount * 2.5; // Increased to use more vertical space (>25% of height)

      return `M ${leftX} ${beamY}
              Q ${width / 2} ${beamY + bendY} ${rightX} ${beamY}
              L ${rightX} ${beamY + beamHeight}
              Q ${width / 2} ${beamY + beamHeight + bendY} ${leftX} ${beamY + beamHeight}
              Z`;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '720px' }}
        >
          <defs>
            {/* === PREMIUM GRADIENT DEFINITIONS === */}

            {/* Lab background gradient with depth */}
            <linearGradient id="phoelLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor={polarizerEnabled ? '#050810' : '#111827'} />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Polarizer filter glass gradient */}
            <linearGradient id="phoelPolarizerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#2563eb" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#2563eb" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.9" />
            </linearGradient>

            {/* Analyzer filter glass (crossed polarizer) */}
            <linearGradient id="phoelAnalyzerGlass" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#312e81" stopOpacity={polarizerEnabled ? 0.9 : 0.3} />
              <stop offset="25%" stopColor="#4338ca" stopOpacity={polarizerEnabled ? 0.7 : 0.25} />
              <stop offset="50%" stopColor="#6366f1" stopOpacity={polarizerEnabled ? 0.5 : 0.2} />
              <stop offset="75%" stopColor="#4338ca" stopOpacity={polarizerEnabled ? 0.7 : 0.25} />
              <stop offset="100%" stopColor="#312e81" stopOpacity={polarizerEnabled ? 0.9 : 0.3} />
            </linearGradient>

            {/* Transparent plastic material gradient */}
            <linearGradient id="phoelPlasticMaterial" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={polarizerEnabled ? 0.15 : 0.5} />
              <stop offset="20%" stopColor="#cbd5e1" stopOpacity={polarizerEnabled ? 0.1 : 0.4} />
              <stop offset="50%" stopColor="#e2e8f0" stopOpacity={polarizerEnabled ? 0.08 : 0.35} />
              <stop offset="80%" stopColor="#cbd5e1" stopOpacity={polarizerEnabled ? 0.1 : 0.4} />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity={polarizerEnabled ? 0.15 : 0.5} />
            </linearGradient>

            {/* Stress concentration radial gradient */}
            <radialGradient id="phoelStressCenter" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>

            {/* Light source glow */}
            <radialGradient id="phoelLightSource" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Force arrow gradient - compression */}
            <linearGradient id="phoelForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Downward load gradient */}
            <linearGradient id="phoelLoadArrow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            {/* Optical table surface */}
            <linearGradient id="phoelOpticalTable" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="20%" stopColor="#111827" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Polarizer frame metal */}
            <linearGradient id="phoelPolarizerFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Light beam through system */}
            <linearGradient id="phoelLightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
              <stop offset="20%" stopColor="#fcd34d" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={polarizerEnabled ? 0.4 : 0.6} />
              <stop offset="80%" stopColor="#a855f7" stopOpacity={polarizerEnabled ? 0.3 : 0.5} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={polarizerEnabled ? 0.2 : 0.4} />
            </linearGradient>

            {/* === FILTER DEFINITIONS === */}

            {/* Glow filter for fringes */}
            <filter id="phoelFringeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow for light source */}
            <filter id="phoelLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for polarizers */}
            <filter id="phoelPolarizerGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force arrow glow */}
            <filter id="phoelForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stress center glow */}
            <filter id="phoelStressGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="phoelInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Beam clip path */}
            <clipPath id="phoelBeamClip">
              <path d={generateBeamPath()} />
            </clipPath>

            {/* Grid pattern for optical table */}
            <pattern id="phoelTableGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#phoelLabBg)" />
          <rect width={width} height={height} fill="url(#phoelTableGrid)" opacity="0.5" />

          {/* === OPTICAL TABLE === */}
          <rect x="5" y={height - 50} width={width - 10} height="48" rx="4" fill="url(#phoelOpticalTable)" />
          <rect x="5" y={height - 50} width={width - 10} height="3" fill="#374151" opacity="0.6" />
          {/* Table mounting holes */}
          {[80, 180, 280, 380, 480, 580].map(x => (
            <circle key={`hole-${x}`} cx={x} cy={height - 26} r="3" fill="#0a0a0a" />
          ))}

          {/* === LIGHT SOURCE === */}
          <g transform="translate(35, 140)">
            {/* Light housing */}
            <rect x="-15" y="-30" width="30" height="100" rx="4" fill="url(#phoelPolarizerFrame)" />
            <rect x="-12" y="-27" width="24" height="94" rx="3" fill="#1a1a2e" />
            {/* Light bulb */}
            <circle cx="0" cy="20" r="15" fill="url(#phoelLightSource)" filter="url(#phoelLightGlow)" />
            <circle cx="0" cy="20" r="8" fill="#fef9c3" />
            {/* Label */}
            <text x="0" y="-43" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="600">LIGHT</text>
          </g>

          {/* === LIGHT BEAM (before polarizer) === */}
          <rect x="50" y={beamY + beamHeight / 2 - 20} width="40" height="40" fill="url(#phoelLightBeam)" opacity="0.5" />

          {/* === FIRST POLARIZER (Polarizer) === */}
          <g transform={`translate(100, ${beamY - 60})`}>
            {/* Frame */}
            <rect x="-8" y="-10" width="16" height={beamHeight + 140} rx="3" fill="url(#phoelPolarizerFrame)" />
            {/* Glass filter */}
            <rect x="-5" y="0" width="10" height={beamHeight + 120} fill="url(#phoelPolarizerGlass)" filter="url(#phoelPolarizerGlow)" />
            {/* Polarization lines (horizontal) */}
            {[...Array(12)].map((_, i) => (
              <line
                key={`pol-line-${i}`}
                x1="-4"
                y1={10 + i * 10}
                x2="4"
                y2={10 + i * 10}
                stroke="#60a5fa"
                strokeWidth="1.5"
                opacity="0.7"
              />
            ))}
            {/* Label */}
            <text x="0" y="-23" fill="#3b82f6" fontSize="9" textAnchor="middle" fontWeight="700">POL 1 (H)</text>
          </g>

          {/* === POLARIZED LIGHT BEAM === */}
          <rect x="110" y={beamY + beamHeight / 2 - 15} width={width / 2 - beamWidth / 2 - 120} height="30" fill="url(#phoelLightBeam)" opacity="0.4" />

          {/* === SUPPORT CLAMPS (Left) === */}
          <g transform={`translate(${width / 2 - beamWidth / 2 - 25}, ${beamY + beamHeight / 2})`}>
            <rect x="-12" y="-25" width="24" height="50" rx="2" fill="url(#phoelPolarizerFrame)" />
            <rect x="-8" y="-20" width="16" height="40" fill="#0f172a" />
            <text x="-35" y="5" fill="#64748b" fontSize="7" textAnchor="middle">CLAMP</text>
          </g>

          {/* === HORIZONTAL FORCE ARROWS (Compression) === */}
          <g filter="url(#phoelForceGlow)">
            {/* Left force arrow */}
            <line
              x1={width / 2 - beamWidth / 2 - 60}
              y1={beamY + beamHeight / 2}
              x2={width / 2 - beamWidth / 2 - 25}
              y2={beamY + beamHeight / 2}
              stroke="url(#phoelForceArrow)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points={`${width / 2 - beamWidth / 2 - 60},${beamY + beamHeight / 2 - 10} ${width / 2 - beamWidth / 2 - 60},${beamY + beamHeight / 2 + 10} ${width / 2 - beamWidth / 2 - 80},${beamY + beamHeight / 2}`}
              fill="url(#phoelForceArrow)"
            />
            <text x={width / 2 - beamWidth / 2 - 70} y={beamY + beamHeight / 2 - 18} fill="#f87171" fontSize="9" textAnchor="middle" fontWeight="600">F</text>

            {/* Right force arrow */}
            <line
              x1={width / 2 + beamWidth / 2 + 25}
              y1={beamY + beamHeight / 2}
              x2={width / 2 + beamWidth / 2 + 60}
              y2={beamY + beamHeight / 2}
              stroke="url(#phoelForceArrow)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points={`${width / 2 + beamWidth / 2 + 60},${beamY + beamHeight / 2 - 10} ${width / 2 + beamWidth / 2 + 60},${beamY + beamHeight / 2 + 10} ${width / 2 + beamWidth / 2 + 80},${beamY + beamHeight / 2}`}
              fill="url(#phoelForceArrow)"
            />
            <text x={width / 2 + beamWidth / 2 + 70} y={beamY + beamHeight / 2 - 18} fill="#f87171" fontSize="9" textAnchor="middle" fontWeight="600">F</text>
          </g>

          {/* === DOWNWARD LOAD ARROW === */}
          <g filter="url(#phoelForceGlow)">
            <line
              x1={width / 2}
              y1={beamY - 50}
              x2={width / 2}
              y2={beamY - 10}
              stroke="url(#phoelLoadArrow)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <polygon
              points={`${width / 2 - 12},${beamY - 10} ${width / 2 + 12},${beamY - 10} ${width / 2},${beamY + 8}`}
              fill="url(#phoelLoadArrow)"
            />
            <text x={width / 2} y={beamY - 60} fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="700">APPLIED LOAD</text>
            <text x={width / 2} y={beamY - 48} fill="#f59e0b" fontSize="9" textAnchor="middle">({bendAmount}%)</text>
          </g>

          {/* === TRANSPARENT PLASTIC SPECIMEN (Bent Beam) === */}
          <g>
            {/* Beam outline with gradient fill */}
            <path
              d={generateBeamPath()}
              fill="url(#phoelPlasticMaterial)"
              stroke={polarizerEnabled ? '#475569' : '#64748b'}
              strokeWidth="2"
              filter="url(#phoelInnerShadow)"
            />

            {/* Stress concentration indicator at bend point */}
            {polarizerEnabled && bendAmount > 20 && (
              <ellipse
                cx={width / 2}
                cy={beamY + beamHeight / 2 + bendAmount * 1.25}
                rx={30 + bendAmount * 0.3}
                ry={15 + bendAmount * 0.2}
                fill="url(#phoelStressCenter)"
                filter="url(#phoelStressGlow)"
                opacity={bendAmount / 100}
              />
            )}

            {/* Stress fringes overlay (only with polarizers) */}
            <g clipPath="url(#phoelBeamClip)">
              {generateFringes()}
            </g>

            {/* Interactive marker showing maximum deflection point - moves with bend */}
            <circle
              cx={width / 2}
              cy={beamY + beamHeight / 2 + bendAmount * 2.5}
              r="6"
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth="2"
              opacity="0.9"
            />
            <text
              x={width / 2 + 15}
              y={beamY + beamHeight / 2 + bendAmount * 2.5 + 4}
              fill="#fbbf24"
              fontSize="10"
              fontWeight="bold"
            >
              Max Stress
            </text>

            {/* Specimen label */}
            <text
              x={width / 2}
              y={beamY + beamHeight + bendAmount * 2.5 + 35}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="middle"
              fontWeight="500"
            >
              {isThick ? 'Thick' : 'Thin'} Photoelastic Specimen
            </text>
          </g>

          {/* === SUPPORT CLAMPS (Right) === */}
          <g transform={`translate(${width / 2 + beamWidth / 2 + 25}, ${beamY + beamHeight / 2})`}>
            <rect x="-12" y="-25" width="24" height="50" rx="2" fill="url(#phoelPolarizerFrame)" />
            <rect x="-8" y="-20" width="16" height="40" fill="#0f172a" />
            <text x="35" y="5" fill="#64748b" fontSize="7" textAnchor="middle">CLAMP</text>
          </g>

          {/* === TRANSMITTED LIGHT BEAM === */}
          <rect
            x={width / 2 + beamWidth / 2 + 40}
            y={beamY + beamHeight / 2 - 15}
            width={width - (width / 2 + beamWidth / 2 + 40) - 120}
            height="30"
            fill="url(#phoelLightBeam)"
            opacity={polarizerEnabled ? 0.25 : 0.5}
          />

          {/* === SECOND POLARIZER (Analyzer) === */}
          <g transform={`translate(${width - 100}, ${beamY - 60})`}>
            {/* Frame */}
            <rect x="-8" y="-10" width="16" height={beamHeight + 140} rx="3" fill="url(#phoelPolarizerFrame)" />
            {/* Glass filter */}
            <rect x="-5" y="0" width="10" height={beamHeight + 120} fill="url(#phoelAnalyzerGlass)" filter="url(#phoelPolarizerGlow)" />
            {/* Polarization lines (vertical - crossed at 90 degrees) */}
            {[...Array(10)].map((_, i) => (
              <line
                key={`ana-line-${i}`}
                x1={-4 + i * 1}
                y1="5"
                x2={-4 + i * 1}
                y2={beamHeight + 115}
                stroke={polarizerEnabled ? '#818cf8' : '#475569'}
                strokeWidth="1"
                opacity={polarizerEnabled ? 0.7 : 0.3}
              />
            ))}
            {/* Label */}
            <text x="0" y="-23" fill={polarizerEnabled ? '#818cf8' : '#64748b'} fontSize="9" textAnchor="middle" fontWeight="700">POL 2 (V 90°)</text>
          </g>

          {/* === DETECTOR/SCREEN === */}
          <g transform={`translate(${width - 45}, ${beamY - 60})`}>
            <rect x="-15" y="0" width="30" height={beamHeight + 120} rx="3" fill="#1a1a2e" stroke="#334155" strokeWidth="1" />
            <rect x="-12" y="3" width="24" height={beamHeight + 114} rx="2" fill={polarizerEnabled ? '#0a0a0a' : '#1e293b'} />
            {/* Detected pattern preview */}
            {polarizerEnabled && bendAmount > 15 && (
              <g>
                {[...Array(5)].map((_, i) => (
                  <rect
                    key={`detect-${i}`}
                    x="-8"
                    y={20 + i * 20}
                    width="16"
                    height="8"
                    rx="1"
                    fill={['#3b82f6', '#10b981', '#fbbf24', '#ef4444', '#a855f7'][i % 5]}
                    opacity={0.6}
                  />
                ))}
              </g>
            )}
            <text x="0" y="-8" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="600">DETECTOR</text>
          </g>

          {/* === INFO PANEL === */}
          <g transform={`translate(${width - 175}, 15)`}>
            <rect x="0" y="0" width="160" height="65" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />
            <text x="80" y="16" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontWeight="700">STATUS</text>
            <line x1="10" y1="22" x2="150" y2="22" stroke="#334155" strokeWidth="1" />
            <text x="15" y="36" fill="#94a3b8" fontSize="8">Bend:</text>
            <text x="145" y="36" fill="#f59e0b" fontSize="8" textAnchor="end" fontWeight="600">{bendAmount}%</text>
            <text x="15" y="48" fill="#94a3b8" fontSize="8">Specimen:</text>
            <text x="145" y="48" fill="#a855f7" fontSize="8" textAnchor="end" fontWeight="600">{isThick ? 'Thick' : 'Thin'}</text>
            <text x="15" y="60" fill="#94a3b8" fontSize="8">Polarizers:</text>
            <text x="145" y="60" fill={polarizerEnabled ? '#10b981' : '#ef4444'} fontSize="8" textAnchor="end" fontWeight="600">
              {polarizerEnabled ? 'ON' : 'OFF'}
            </text>
          </g>

          {/* === LEGEND === */}
          <g>
            <rect x="500" y="310" width="180" height="35" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />
            <text x="590" y="323" fill="#e2e8f0" fontSize="8" textAnchor="middle" fontWeight="700">STRESS LEVEL</text>
            <line x1="510" y1="327" x2="670" y2="327" stroke="#334155" strokeWidth="1" />
            <g>
              <rect x="512" y="332" width="8" height="6" rx="1" fill="#3b82f6" />
              <text x="524" y="337" fill="#94a3b8" fontSize="7">Low</text>
              <rect x="553" y="332" width="8" height="6" rx="1" fill="#10b981" />
              <text x="565" y="337" fill="#94a3b8" fontSize="7">Mod</text>
              <rect x="595" y="332" width="8" height="6" rx="1" fill="#fbbf24" />
              <text x="607" y="337" fill="#94a3b8" fontSize="7">High</text>
              <rect x="635" y="332" width="8" height="6" rx="1" fill="#ef4444" />
              <text x="647" y="337" fill="#94a3b8" fontSize="7">Peak</text>
            </g>
          </g>

          {/* === BOTTOM LABELS === */}
          <text x={width / 2} y={height - 60} fill="#e2e8f0" fontSize="12" textAnchor="middle" fontWeight="600">
            Stress-Induced Birefringence Visualization
          </text>
          <text x={width / 2} y={height - 45} fill="#64748b" fontSize="10" textAnchor="middle">
            Light polarization rotates through stressed transparent material, creating interference fringes
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? '0 4px 20px rgba(239, 68, 68, 0.4)' : '0 4px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              {isAnimating ? 'Stop Animation' : 'Animate Bend'}
            </button>
            <button
              onClick={() => { setBendAmount(30); setIsAnimating(false); setPolarizerEnabled(true); }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Mechanical Stress (Bending Force): {bendAmount}%
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: colors.textMuted, fontSize: '12px', minWidth: '60px' }}>Low (5%)</span>
          <input
            type="range"
            min="5"
            max="80"
            step="5"
            value={bendAmount}
            onChange={(e) => setBendAmount(parseInt(e.target.value))}
            style={{
              width: '100%',
              touchAction: 'pan-y',
              transition: 'all 0.3s ease'
            }}
          />
          <span style={{ color: colors.textMuted, fontSize: '12px', minWidth: '70px', textAlign: 'right' }}>High (80%)</span>
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Adjusts mechanical stress causing birefringence and fringe patterns
        </div>
      </div>
      <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" checked={polarizerEnabled} onChange={(e) => setPolarizerEnabled(e.target.checked)} />
        Crossed Polarizers Active
      </label>
      <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          More bending = more stress = more fringe colors visible
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
      <button onClick={onPhaseComplete} disabled={disabled && !canProceed} style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)', color: canProceed ? 'white' : colors.textMuted, fontWeight: 'bold', cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: '16px' }}>{buttonText}</button>
    </div>
  );

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>Can you see forces inside a solid object using light?</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>Revealing hidden stress patterns with polarized light and transparent materials</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Bend a clear plastic ruler between two polarizing filters. Rainbow colors appear where the plastic is stressed - invisible forces become visible!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is photoelasticity - stress changes how materials interact with polarized light.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A transparent plastic beam placed between two crossed polarizers (filters at 90 degrees). The beam is being bent by forces from both sides and above. Light enters through the first polarizer and exits through the second.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>When you bend the plastic between crossed polarizers, what appears?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Photoelasticity</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Bend the beam and toggle polarizers to see stress patterns</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}

          {/* Before/After Comparison Display */}
          <div style={{ margin: '16px', background: colors.bgCard, padding: '12px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', textAlign: 'center' }}>Comparison: Effect of Polarizers</h4>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px', maxWidth: '200px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.textMuted, marginBottom: '4px', fontSize: '12px' }}>Without Polarizers</div>
                <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: colors.textSecondary, fontSize: '11px' }}>Clear plastic visible</div>
                  <div style={{ color: colors.error, fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>No stress pattern</div>
                </div>
              </div>
              <div style={{ flex: '1 1 150px', maxWidth: '200px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.success, marginBottom: '4px', fontSize: '12px' }}>With Polarizers ON</div>
                <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '12px', border: `2px solid ${colors.success}` }}>
                  <div style={{ color: colors.textSecondary, fontSize: '11px' }}>Rainbow fringes visible</div>
                  <div style={{ color: colors.success, fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Stress revealed!</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase bend - more fringes appear</li>
              <li>Turn off polarizers - fringes disappear!</li>
              <li>Notice how fringe density shows stress concentration</li>
              <li>Watch the yellow "Max Stress" marker move as you adjust bend</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'fringes';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Rainbow-colored bands appear showing where stress is concentrated!</p>
          </div>

          {/* Side-by-side Comparison View */}
          <div style={{ margin: '16px' }}>
            <h3 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '12px' }}>Comparison: With vs Without Crossed Polarizers</h3>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
              <div style={{ flex: '1 1 250px', maxWidth: '350px', background: colors.bgCard, padding: '12px', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.warning, textAlign: 'center' }}>Polarizers OFF</div>
                <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', marginBottom: '8px' }}>
                  <svg viewBox="0 0 700 420" style={{ width: '100%', maxWidth: '350px', borderRadius: '8px' }}>
                    <defs>
                      <linearGradient id="simpleBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#030712" />
                        <stop offset="50%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#030712" />
                      </linearGradient>
                    </defs>
                    <rect width="700" height="420" fill="url(#simpleBg)" />
                    <rect x="220" y="190" width="260" height="40" fill="#cbd5e1" opacity="0.3" rx="4" />
                    <text x="350" y="240" fill="#94a3b8" fontSize="16" textAnchor="middle">Clear Plastic - No Fringes</text>
                  </svg>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>Without polarizers, stress is invisible</div>
              </div>
              <div style={{ flex: '1 1 250px', maxWidth: '350px', background: colors.bgCard, padding: '12px', borderRadius: '8px', border: '2px solid ' + colors.success }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.success, textAlign: 'center' }}>Polarizers ON</div>
                <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
                  {renderVisualization(false)}
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>Stress patterns become visible as colored fringes!</div>
              </div>
            </div>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Photoelasticity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Stress-Induced Birefringence:</strong> When transparent plastics are stressed, they become birefringent - light polarized in different directions travels at different speeds through the material.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Polarization Rotation:</strong> This speed difference rotates the polarization of light. Different wavelengths (colors) rotate by different amounts.</p>
              <p><strong style={{ color: colors.textPrimary }}>Crossed Polarizer Colors:</strong> Between crossed polarizers, some colors pass through while others are blocked, creating rainbow fringes that map the stress field.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>What happens with thicker plastic?</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Now compare a thin piece of plastic to a thick piece, both bent by the same amount. The light must travel through more material in the thick sample.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>How does thickness affect the fringe pattern?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)', background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Thick vs Thin</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Toggle thickness to see how fringe patterns change</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '16px' }}>
            <button onClick={() => setIsThick(!isThick)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: `2px solid ${colors.warning}`, background: isThick ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              Currently: {isThick ? 'THICK' : 'THIN'} Plastic - Click to Toggle
            </button>
          </div>

          {/* Before/After Comparison Display for Thickness */}
          <div style={{ margin: '16px', background: colors.bgCard, padding: '12px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', textAlign: 'center' }}>Comparison: Effect of Thickness</h4>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px', maxWidth: '200px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.textMuted, marginBottom: '4px', fontSize: '12px' }}>Thin Specimen</div>
                <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: colors.textSecondary, fontSize: '11px' }}>Fewer fringes</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Less path length</div>
                </div>
              </div>
              <div style={{ flex: '1 1 150px', maxWidth: '200px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.warning, marginBottom: '4px', fontSize: '12px' }}>Thick Specimen</div>
                <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '12px', border: `2px solid ${colors.warning}` }}>
                  <div style={{ color: colors.textSecondary, fontSize: '11px' }}>More fringes</div>
                  <div style={{ color: colors.warning, fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Greater rotation!</div>
                </div>
              </div>
            </div>
          </div>

          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Thicker material means light travels through more stressed material, accumulating more polarization rotation. This creates more fringe orders!</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Thicker plastic shows more closely-spaced fringes!</p>
          </div>

          {/* Visual diagram showing thin vs thick comparison */}
          <div style={{ margin: '16px' }}>
            <h3 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '12px' }}>Comparison: Thin vs Thick Specimen</h3>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
              <div style={{ flex: '1 1 250px', maxWidth: '350px', background: colors.bgCard, padding: '12px', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.accent, textAlign: 'center' }}>THIN Specimen</div>
                <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', marginBottom: '8px' }}>
                  <svg viewBox="0 0 300 200" style={{ width: '100%', borderRadius: '8px' }}>
                    <rect width="300" height="200" fill="#0f172a" />
                    <rect x="100" y="80" width="100" height="20" fill="#3b82f6" opacity="0.6" />
                    <text x="150" y="130" fill="#94a3b8" fontSize="12" textAnchor="middle">Thin = Fewer Fringes</text>
                    <circle cx="80" cy="90" r="4" fill="#fbbf24" />
                    <circle cx="150" cy="90" r="4" fill="#10b981" />
                    <circle cx="220" cy="90" r="4" fill="#ef4444" />
                  </svg>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>Less path length = fewer fringes</div>
              </div>
              <div style={{ flex: '1 1 250px', maxWidth: '350px', background: colors.bgCard, padding: '12px', borderRadius: '8px', border: '2px solid ' + colors.warning }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.warning, textAlign: 'center' }}>THICK Specimen</div>
                <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', marginBottom: '8px' }}>
                  <svg viewBox="0 0 300 200" style={{ width: '100%', borderRadius: '8px' }}>
                    <rect width="300" height="200" fill="#0f172a" />
                    <rect x="100" y="70" width="100" height="40" fill="#3b82f6" opacity="0.6" />
                    <text x="150" y="140" fill="#94a3b8" fontSize="12" textAnchor="middle">Thick = More Fringes</text>
                    <circle cx="60" cy="90" r="4" fill="#fbbf24" />
                    <circle cx="100" cy="90" r="4" fill="#10b981" />
                    <circle cx="140" cy="90" r="4" fill="#ef4444" />
                    <circle cx="180" cy="90" r="4" fill="#a855f7" />
                    <circle cx="220" cy="90" r="4" fill="#3b82f6" />
                  </svg>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>Greater path length = more fringes</div>
              </div>
            </div>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Path Length Matters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Accumulated Rotation:</strong> Light traveling through thicker material accumulates more polarization rotation. The effect is proportional to thickness times stress.</p>
              <p><strong style={{ color: colors.textPrimary }}>Fringe Order:</strong> Each complete color cycle represents one "fringe order." Thicker samples show higher fringe orders, letting engineers measure stress more precisely.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Photoelasticity helps engineers see stress fields</p>
          </div>
          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}>Reveal Answer</button>
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

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error }}>{testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}</h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>{opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}</div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }
    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2><span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / 10</span></div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>{testQuestions.map((_, i) => (<div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />))}</div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}><p style={{ color: colors.textPrimary, fontSize: '16px' }}>{currentQ.question}</p></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < 9 ? <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button> : <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit</button>}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Achievement</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary }}>You understand how stress becomes visible through polarized light</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Stress-induced birefringence in transparent materials</li>
              <li>Polarization rotation creates interference colors</li>
              <li>Fringe patterns map stress distribution</li>
              <li>Thickness affects fringe count</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default PhotoelasticityRenderer;
