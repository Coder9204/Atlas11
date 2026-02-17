import React, { useState, useEffect } from 'react';

interface TapeBirefringenceRendererProps {
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '📺',
    title: 'LCD Displays',
    short: 'Controlling light with liquid crystals',
    tagline: 'Every pixel is a polarization switch',
    description: 'LCD screens use liquid crystal layers that rotate polarization based on applied voltage. Combined with polarizing filters, this controls which pixels are bright or dark, creating images.',
    connection: 'LCD panels are sophisticated birefringent systems. Liquid crystals act like adjustable waveplates, rotating light polarization by controlled amounts. The same physics as tape between polarizers, but voltage-controlled.',
    howItWorks: 'Light enters through a polarizer, passes through liquid crystal layer, then exit polarizer. Voltage changes crystal orientation, altering polarization rotation. Color filters create RGB subpixels.',
    stats: [
      { value: '8K', label: 'Resolution (33M pixels)', icon: '📊' },
      { value: '1ms', label: 'Response time', icon: '⚡' },
      { value: '1000:1', label: 'Contrast ratio', icon: '🌓' }
    ],
    examples: ['Smartphones', 'Computer monitors', 'Televisions', 'Digital signage'],
    companies: ['Samsung', 'LG Display', 'BOE', 'AU Optronics'],
    futureImpact: 'Mini-LED and micro-LED backlights will provide perfect blacks and HDR, while new LC materials enable faster switching for VR displays.',
    color: '#3b82f6'
  },
  {
    icon: '🔬',
    title: 'Stress Analysis',
    short: 'Visualizing mechanical stress through colors',
    tagline: 'See stress before things break',
    description: 'Photoelastic stress analysis uses birefringence to visualize stress distributions in transparent materials. Engineers use this to identify stress concentrations before failures occur.',
    connection: 'Mechanical stress induces birefringence in plastics. Polarized light reveals the stress field as color patterns. Higher stress creates more birefringence and different colors - exactly like stacking tape layers.',
    howItWorks: 'Models are made from photoelastic plastic and loaded in a polariscope. Isochromatic fringes (color bands) show stress magnitude. Isoclinic lines show stress direction. Full-field visualization reveals weak points.',
    stats: [
      { value: '1MPa', label: 'Stress resolution', icon: '📊' },
      { value: '100+yr', label: 'Technology history', icon: '📅' },
      { value: '10x', label: 'Faster than simulation', icon: '⚡' }
    ],
    examples: ['Dental implant design', 'Aircraft components', 'Consumer product testing', 'Civil engineering'],
    companies: ['Vishay Measurements', 'Instron', 'Dantec Dynamics', 'Various universities'],
    futureImpact: 'Digital photoelasticity with high-speed cameras will enable real-time stress visualization during dynamic loading and impact events.',
    color: '#f59e0b'
  },
  {
    icon: '🎬',
    title: '3D Cinema',
    short: 'Polarized glasses for depth perception',
    tagline: 'Two views make three dimensions',
    description: '3D movies use polarization to deliver different images to each eye. Special screens preserve polarization while reflecting light to audience wearing polarized glasses.',
    connection: 'Each eye receives light with different polarization state. Linear or circular polarization separates left and right views. The same polarization optics as birefringence experiments create the 3D illusion.',
    howItWorks: 'Two projectors or alternating frames produce left/right images with orthogonal polarizations. Silver screens preserve polarization. Glasses have matched polarizing filters for each eye.',
    stats: [
      { value: '144Hz', label: 'Refresh rate per eye', icon: '🔄' },
      { value: '99%', label: 'Separation efficiency', icon: '🎯' },
      { value: '$3B', label: '3D cinema revenue', icon: '💰' }
    ],
    examples: ['RealD 3D', 'IMAX 3D', '3D theme park rides', 'VR headsets'],
    companies: ['RealD', 'IMAX', 'Dolby', 'Sony'],
    futureImpact: 'Glasses-free 3D displays using lenticular or directional backlighting will eliminate the need for polarized glasses in future entertainment.',
    color: '#8b5cf6'
  },
  {
    icon: '💎',
    title: 'Mineralogy & Gemology',
    short: 'Identifying crystals by optical properties',
    tagline: 'Every mineral has a signature',
    description: 'Geologists identify minerals using polarized light microscopy. Each mineral has characteristic birefringence, interference colors, and extinction angles that uniquely identify it.',
    connection: 'Mineral crystals are naturally birefringent due to their atomic structure. Between crossed polarizers, thin sections show interference colors determined by birefringence and thickness - the same physics as tape layers.',
    howItWorks: 'Thin rock sections (30 microns) are examined between crossed polarizers. Birefringent minerals show colors from Michel-Levy chart. Rotation reveals extinction angles. Conoscopic patterns show optical axis orientation.',
    stats: [
      { value: '0.009', label: 'Quartz birefringence', icon: '💎' },
      { value: '1000+', label: 'Identifiable minerals', icon: '🔬' },
      { value: '100x', label: 'Typical magnification', icon: '🔍' }
    ],
    examples: ['Petrography', 'Gem identification', 'Ore microscopy', 'Forensic geology'],
    companies: ['Zeiss', 'Leica', 'Olympus', 'Nikon'],
    futureImpact: 'AI-assisted mineral identification will automatically classify thin sections, accelerating geological surveys and mineral exploration.',
    color: '#22c55e'
  }
];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  tape: '#e2e8f0',
  border: 'rgba(255,255,255,0.1)',
};

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const TapeBirefringenceRenderer: React.FC<TapeBirefringenceRendererProps> = ({
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [tapeLayers, setTapeLayers] = useState(3);
  const [polarizerAngle, setPolarizerAngle] = useState(45);
  const [isHeated, setIsHeated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPolarizerAngle(prev => (prev + 2) % 180);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const [isMobile, setIsMobile] = useState(false);
  const [currentAppIndex, setCurrentAppIndex] = useState(0);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase navigation
  const phaseLabels: Record<Phase, string> = {
    hook: 'Explore Birefringence',
    predict: 'Predict',
    play: 'Experiment Interactive',
    review: 'Review Explanation',
    twist_predict: 'New Variable Heat',
    twist_play: 'Apply Heat Experiment',
    twist_review: 'Transfer Deep Insight',
    transfer: 'Transfer Applications',
    test: 'Knowledge Test Quiz',
    mastery: 'Mastery Achieved'
  };

  const goToPhase = (p: Phase) => {
    setPhase(p);
  };

  const nextPhase = () => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) {
      setPhase(validPhases[idx + 1]);
    } else if (onPhaseComplete) {
      onPhaseComplete();
    }
  };

  const prevPhase = () => {
    const idx = validPhases.indexOf(phase);
    if (idx > 0) {
      setPhase(validPhases[idx - 1]);
    }
  };

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
    { id: 'clear', label: 'The tape remains completely clear - no color visible' },
    { id: 'white', label: 'The tape appears white or gray' },
    { id: 'colors', label: 'Vibrant colors appear from the clear tape' },
    { id: 'dark', label: 'The tape becomes completely dark' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Colors stay exactly the same' },
    { id: 'shift', label: 'Colors shift to different hues' },
    { id: 'brighter', label: 'Colors become brighter' },
    { id: 'disappear', label: 'Colors disappear entirely' },
  ];

  const transferApplications = [
    {
      title: 'LCD Displays',
      description: 'LCD screens use liquid crystal layers that rotate polarization. Voltage changes the rotation, controlling which colors pass through.',
      question: 'How do LCD pixels create different colors?',
      answer: 'Liquid crystal molecules act like controllable birefringent layers. Voltage changes their orientation, altering polarization rotation. Combined with color filters, this controls which colors pass through.',
    },
    {
      title: '3D Glasses (Polarized)',
      description: 'Polarized 3D movie glasses use different polarization for each eye. The screen shows two overlapping images with different polarizations.',
      question: 'Why do polarized 3D glasses work?',
      answer: 'Each lens blocks one polarization while passing the other. The projector shows left-eye and right-eye images with perpendicular polarizations, so each eye sees only its intended image.',
    },
    {
      title: 'Polarized Light Microscopy',
      description: 'Biologists use polarized microscopes to study crystalline structures, starch grains, and fibers that have natural birefringence.',
      question: 'How does polarized microscopy reveal structures invisible to normal light?',
      answer: 'Birefringent structures rotate polarization while the background does not. Between crossed polarizers, only the birefringent structures appear bright against a dark background.',
    },
    {
      title: 'Security Features',
      description: 'Some security labels and documents include birefringent patterns that can only be seen through polarized light.',
      question: 'Why are birefringent security features hard to counterfeit?',
      answer: 'Creating specific birefringent patterns requires special materials and manufacturing. The patterns are invisible without polarizers, making them hard to detect and even harder to replicate.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does clear tape show colors between polarizers?',
      options: [
        { text: 'The tape contains colored dyes', correct: false },
        { text: 'Stretched polymer chains create birefringence that rotates polarization', correct: true },
        { text: 'The tape reflects colored light from the room', correct: false },
        { text: 'Chemical reactions occur in the tape', correct: false },
      ],
    },
    {
      question: 'Adding more layers of tape changes the color because:',
      options: [
        { text: 'More layers absorb more light', correct: false },
        { text: 'Total thickness determines total polarization rotation', correct: true },
        { text: 'The tape layers chemically react', correct: false },
        { text: 'Light diffracts between layers', correct: false },
      ],
    },
    {
      question: 'Rotating the analyzer polarizer causes colors to:',
      options: [
        { text: 'Stay constant', correct: false },
        { text: 'Cycle through complementary colors', correct: true },
        { text: 'Become brighter only', correct: false },
        { text: 'Disappear completely', correct: false },
      ],
    },
    {
      question: 'The birefringence in tape comes from:',
      options: [
        { text: 'The adhesive layer', correct: false },
        { text: 'Aligned polymer molecules from manufacturing stretch', correct: true },
        { text: 'Air bubbles in the tape', correct: false },
        { text: 'Reflections from the tape surface', correct: false },
      ],
    },
    {
      question: 'Heating tape causes color shifts because:',
      options: [
        { text: 'Heat makes the tape melt', correct: false },
        { text: 'Thermal expansion relaxes internal stress, reducing birefringence', correct: true },
        { text: 'Hot colors mix with tape colors', correct: false },
        { text: 'Heat creates new chemical bonds', correct: false },
      ],
    },
    {
      question: 'Different wavelengths of light through birefringent tape:',
      options: [
        { text: 'All rotate by the same amount', correct: false },
        { text: 'Rotate by different amounts, causing color separation', correct: true },
        { text: 'Are all absorbed equally', correct: false },
        { text: 'Travel at the same speed', correct: false },
      ],
    },
    {
      question: 'LCD screens use a similar principle because:',
      options: [
        { text: 'They contain actual tape layers', correct: false },
        { text: 'Liquid crystals are birefringent and can be electrically controlled', correct: true },
        { text: 'LCDs emit polarized light naturally', correct: false },
        { text: 'LCD pixels contain colored tape', correct: false },
      ],
    },
    {
      question: 'Looking at a laptop screen through polarized sunglasses sometimes shows:',
      options: [
        { text: 'Nothing unusual', correct: false },
        { text: 'Color shifts or darkness depending on angle', correct: true },
        { text: 'Magnification of the image', correct: false },
        { text: 'Sharper image quality', correct: false },
      ],
    },
    {
      question: 'Why do different tape brands show different colors?',
      options: [
        { text: 'They use different colored adhesives', correct: false },
        { text: 'Manufacturing processes create different amounts of molecular alignment', correct: true },
        { text: 'They reflect light differently', correct: false },
        { text: 'They are made at different temperatures', correct: false },
      ],
    },
    {
      question: 'To see tape birefringence colors, you need:',
      options: [
        { text: 'Only the tape', correct: false },
        { text: 'The tape between two polarizers', correct: true },
        { text: 'A laser light source', correct: false },
        { text: 'A magnifying glass', correct: false },
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

  // Generate color based on tape layers and polarizer angle
  const getTapeColor = (layers: number, angle: number, heated: boolean) => {
    const heatFactor = heated ? 0.5 : 1;
    const baseRotation = layers * 30 * heatFactor;
    const effectiveAngle = (baseRotation + angle * 2) % 360;

    // Convert to HSL-like color
    const hue = effectiveAngle;
    const saturation = Math.min(90, 50 + layers * 10);
    const lightness = 50 + Math.sin(angle * Math.PI / 90) * 10;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 480;
    const tapeWidth = 240;
    const tapeHeight = 28;
    const startY = 120;

    const tapeColors = [];
    for (let i = 0; i < tapeLayers; i++) {
      tapeColors.push(getTapeColor(i + 1, polarizerAngle, isHeated));
    }

    // Calculate tape area end for positioning elements below
    const tapeAreaEnd = startY + tapeLayers * (tapeHeight + 6) + 10;
    const resultY = tapeAreaEnd + 15;
    const spectrumY = resultY + 90;
    const analyzerY = height - 75;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          {/* ============ COMPREHENSIVE DEFS SECTION ============ */}
          <defs>
            {/* === LINEAR GRADIENTS === */}

            {/* Premium dark lab background gradient */}
            <linearGradient id="tbireBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Polarizer glass gradient with depth */}
            <linearGradient id="tbirePolarizer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#0c4a6e" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#0369a1" stopOpacity="0.7" />
              <stop offset="80%" stopColor="#0c4a6e" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.9" />
            </linearGradient>

            {/* Polarizer frame metallic gradient */}
            <linearGradient id="tbirePolarizerFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Light beam gradient - white to yellow */}
            <linearGradient id="tbireLightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.9" />
            </linearGradient>

            {/* Tape layer gradient - creates 3D effect */}
            <linearGradient id="tbireTapeBase" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="15%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="85%" stopColor="rgba(0,0,0,0.1)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
            </linearGradient>

            {/* Tape adhesive layer gradient */}
            <linearGradient id="tbireTapeAdhesive" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(251,191,36,0.15)" />
              <stop offset="50%" stopColor="rgba(251,191,36,0.05)" />
              <stop offset="100%" stopColor="rgba(251,191,36,0)" />
            </linearGradient>

            {/* Interference spectrum gradient - rainbow effect */}
            <linearGradient id="tbireSpectrum" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="16%" stopColor="#3b82f6" />
              <stop offset="33%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="66%" stopColor="#fbbf24" />
              <stop offset="83%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Heat gradient for thermal indicator */}
            <linearGradient id="tbireHeatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.9" />
            </linearGradient>

            {/* Result display gradient */}
            <linearGradient id="tbireResultFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* === RADIAL GRADIENTS === */}

            {/* Light source glow effect */}
            <radialGradient id="tbireLightGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Polarizer center highlight */}
            <radialGradient id="tbirePolarizerHighlight" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
            </radialGradient>

            {/* Heat wave effect */}
            <radialGradient id="tbireHeatWave" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>

            {/* Color result glow */}
            <radialGradient id="tbireResultGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="white" stopOpacity="0.2" />
              <stop offset="50%" stopColor="white" stopOpacity="0.1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS === */}

            {/* Soft glow filter for light beam */}
            <filter id="tbireLightGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Polarizer edge glow */}
            <filter id="tbirePolarizerGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Tape color glow effect */}
            <filter id="tbireTapeGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat shimmer effect */}
            <filter id="tbireHeatShimmer" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur1" />
              <feGaussianBlur stdDeviation="5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Result color glow */}
            <filter id="tbireResultGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="tbireInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* === PATTERNS === */}

            {/* Subtle grid pattern for background */}
            <pattern id="tbireLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>

            {/* Polarization line pattern */}
            <pattern id="tbirePolarLines" width="8" height="8" patternUnits="userSpaceOnUse">
              <line x1="0" y1="4" x2="8" y2="4" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
            </pattern>
          </defs>

          {/* ============ BACKGROUND ============ */}
          <rect width={width} height={height} fill="url(#tbireBgGradient)" />
          <rect width={width} height={height} fill="url(#tbireLabGrid)" />

          {/* ============ LIGHT SOURCE ============ */}
          <g transform={`translate(${width / 2}, 25)`}>
            {/* Light source housing */}
            <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect x="-26" y="-8" width="52" height="16" rx="2" fill="#0f172a" />

            {/* Light bulb glow */}
            <ellipse cx="0" cy="0" rx="15" ry="8" fill="url(#tbireLightGlow)" filter="url(#tbireLightGlowFilter)">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
            </ellipse>

          </g>
          <text x={width / 2} y={25 + 22} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">LIGHT SOURCE</text>

          {/* ============ TOP POLARIZER ============ */}
          <g transform={`translate(${width / 2}, 65)`}>
            {/* Outer frame with metallic look */}
            <rect x="-115" y="-18" width="230" height="36" rx="4" fill="url(#tbirePolarizerFrame)" stroke="#475569" strokeWidth="1" />

            {/* Polarizer glass */}
            <rect x="-105" y="-12" width="210" height="24" rx="2" fill="url(#tbirePolarizer)" filter="url(#tbirePolarizerGlow)" />

            {/* Highlight effect */}
            <rect x="-105" y="-12" width="210" height="24" rx="2" fill="url(#tbirePolarizerHighlight)" />

            {/* Polarization direction lines - horizontal (0 degrees) */}
            {[-80, -50, -20, 10, 40, 70].map((offset, i) => (
              <g key={i}>
                <line x1={offset - 12} y1="0" x2={offset + 12} y2="0" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.8" />
                <line x1={offset - 10} y1="0" x2={offset + 10} y2="0" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.6" />
              </g>
            ))}

            {/* Label with background */}
            <rect x="-40" y="20" width="80" height="18" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
          </g>
          <text x={width / 2} y={65 + 33} fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="bold">POLARIZER</text>

          {/* ============ POLARIZED LIGHT BEAM ============ */}
          <g filter="url(#tbireLightGlowFilter)">
            <rect x={width / 2 - 4} y={90} width={8} height={startY - 100} fill="url(#tbireLightBeam)" rx="2" />
            {/* Light wave visualization - sinusoidal wave using significant vertical space */}
            <path
              d={`M 20 ${height * 0.50} C 80 ${height * 0.15} 160 ${height * 0.15} 220 ${height * 0.50} C 280 ${height * 0.85} 360 ${height * 0.85} 420 ${height * 0.50}`}
              fill="none"
              stroke="#fef3c7"
              strokeWidth="2"
              strokeOpacity="0.3"
            />
            {/* Polarization rotation wave showing birefringence effect */}
            <path
              d={`M 20 ${height * 0.45} C 80 ${height * 0.10} 160 ${height * 0.10} 220 ${height * 0.45} C 280 ${height * 0.80} 360 ${height * 0.80} 420 ${height * 0.45}`}
              fill="none"
              stroke={getTapeColor(tapeLayers, polarizerAngle, isHeated)}
              strokeWidth="2.5"
              strokeOpacity="0.5"
            />
          </g>

          {/* Arrow indicator */}
          <polygon
            points={`${width / 2 - 10},${startY - 8} ${width / 2 + 10},${startY - 8} ${width / 2},${startY + 8}`}
            fill="url(#tbireLightBeam)"
            filter="url(#tbireLightGlowFilter)"
          />

          {/* ============ TAPE LAYERS ============ */}
          <g>
            {/* Tape stack container */}
            <rect
              x={width / 2 - tapeWidth / 2 - 15}
              y={startY - 10}
              width={tapeWidth + 30}
              height={tapeLayers * (tapeHeight + 6) + 20}
              rx="8"
              fill="rgba(15, 23, 42, 0.6)"
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Individual tape layers */}
            {Array.from({ length: tapeLayers }).map((_, i) => {
              const y = startY + i * (tapeHeight + 6);
              const layerColor = tapeColors[i];

              return (
                <g key={i}>
                  {/* Tape shadow */}
                  <rect
                    x={width / 2 - tapeWidth / 2 + 3}
                    y={y + 3}
                    width={tapeWidth}
                    height={tapeHeight}
                    rx="4"
                    fill="rgba(0,0,0,0.3)"
                  />

                  {/* Main tape layer with birefringence color */}
                  <rect
                    x={width / 2 - tapeWidth / 2}
                    y={y}
                    width={tapeWidth}
                    height={tapeHeight}
                    rx="4"
                    fill={layerColor}
                    filter="url(#tbireTapeGlow)"
                  />

                  {/* Tape 3D effect overlay */}
                  <rect
                    x={width / 2 - tapeWidth / 2}
                    y={y}
                    width={tapeWidth}
                    height={tapeHeight}
                    rx="4"
                    fill="url(#tbireTapeBase)"
                  />

                  {/* Adhesive layer hint at bottom */}
                  <rect
                    x={width / 2 - tapeWidth / 2}
                    y={y + tapeHeight - 4}
                    width={tapeWidth}
                    height={4}
                    rx="0 0 4 4"
                    fill="url(#tbireTapeAdhesive)"
                  />

                  {/* Tape edge highlight */}
                  <line
                    x1={width / 2 - tapeWidth / 2}
                    y1={y + 1}
                    x2={width / 2 + tapeWidth / 2}
                    y2={y + 1}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1"
                  />

                  {/* Layer number label */}
                  <circle cx={width / 2 - tapeWidth / 2 - 25} cy={y + tapeHeight / 2} r="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <text x={width / 2 - tapeWidth / 2 - 25} y={y + tapeHeight / 2 + 4} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">
                    {i + 1}
                  </text>

                  {/* Thickness indicator on right */}
                  <text
                    x={width / 2 + tapeWidth / 2 + 10}
                    y={y + tapeHeight / 2 + 4}
                    fill="#64748b"
                    fontSize="11"
                    textAnchor="start"
                  >
                    {(i + 1) * 50}um
                  </text>
                </g>
              );
            })}

            {/* Stack label */}
            <text x={width / 2} y={startY - 8} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">
              TAPE LAYERS
            </text>
          </g>

          {/* ============ COMBINED COLOR RESULT ============ */}
          <g transform={`translate(${width / 2}, ${resultY})`}>
            {/* Result frame */}
            <rect x="-75" y="-5" width="150" height="55" rx="8" fill="url(#tbireResultFrame)" stroke="#475569" strokeWidth="1" />

            {/* Glow behind result */}
            <ellipse cx="0" cy="20" rx="50" ry="18" fill={getTapeColor(tapeLayers, polarizerAngle, isHeated)} filter="url(#tbireResultGlowFilter)" opacity="0.5" />

            {/* Main color display */}
            <rect
              x="-55"
              y="5"
              width="110"
              height="35"
              rx="6"
              fill={getTapeColor(tapeLayers, polarizerAngle, isHeated)}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              filter="url(#tbireResultGlowFilter)"
            />

            {/* Inner highlight */}
            <rect x="-55" y="5" width="110" height="35" rx="6" fill="url(#tbireResultGlow)" />

            {/* Label */}
            <text x="0" y="50" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
              OBSERVED COLOR
            </text>
          </g>

          {/* ============ INTERFERENCE COLOR SPECTRUM ============ */}
          <g transform={`translate(${width / 2}, ${spectrumY})`}>
            {/* Spectrum background */}
            <rect x="-120" y="-5" width="240" height="35" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />

            {/* Rainbow spectrum bar */}
            <rect x="-110" y="2" width="220" height="14" rx="2" fill="url(#tbireSpectrum)" />

            {/* Current position indicator */}
            {(() => {
              const hue = (tapeLayers * 30 * (isHeated ? 0.5 : 1) + polarizerAngle * 2) % 360;
              const indicatorX = -110 + (hue / 360) * 220;
              return (
                <g transform={`translate(${indicatorX}, 9)`}>
                  <polygon points="-6,-12 6,-12 0,-4" fill="#f8fafc" />
                  <polygon points="-6,18 6,18 0,10" fill="#f8fafc" />
                  <line x1="0" y1="-4" x2="0" y2="10" stroke="#f8fafc" strokeWidth="2" />
                </g>
              );
            })()}

            {/* Spectrum labels - spaced to avoid overlap */}
            <text x="-105" y="30" fill="#a855f7" fontSize="11" textAnchor="start">V</text>
            <text x="110" y="30" fill="#ef4444" fontSize="11" textAnchor="end">R</text>

            {/* Title */}
            <text x="0" y="-18" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">
              INTERFERENCE SPECTRUM
            </text>
          </g>

          {/* ============ BOTTOM POLARIZER (ANALYZER) ============ */}
          <g transform={`translate(${width / 2}, ${analyzerY})`}>
            {/* Outer frame */}
            <rect x="-115" y="-18" width="230" height="36" rx="4" fill="url(#tbirePolarizerFrame)" stroke="#475569" strokeWidth="1" />

            {/* Analyzer glass */}
            <rect x="-105" y="-12" width="210" height="24" rx="2" fill="url(#tbirePolarizer)" filter="url(#tbirePolarizerGlow)" />

            {/* Highlight */}
            <rect x="-105" y="-12" width="210" height="24" rx="2" fill="url(#tbirePolarizerHighlight)" />

            {/* Rotated polarization lines */}
            {[-80, -50, -20, 10, 40, 70].map((offset, i) => {
              const rad = (polarizerAngle * Math.PI) / 180;
              const len = 12;
              return (
                <g key={i}>
                  <line
                    x1={offset - len * Math.cos(rad)}
                    y1={-len * Math.sin(rad)}
                    x2={offset + len * Math.cos(rad)}
                    y2={len * Math.sin(rad)}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeOpacity="0.8"
                  />
                  <line
                    x1={offset - (len - 2) * Math.cos(rad)}
                    y1={-(len - 2) * Math.sin(rad)}
                    x2={offset + (len - 2) * Math.cos(rad)}
                    y2={(len - 2) * Math.sin(rad)}
                    stroke="#67e8f9"
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                </g>
              );
            })}

            {/* Label and angle - moved to absolute positions outside group */}

            {/* Rotation arrow indicator */}
            <g transform="translate(-130, 0)">
              <path
                d="M 0 -8 A 8 8 0 1 1 0 8"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <polygon points="-3,8 3,8 0,12" fill="#64748b" />
            </g>
          </g>
          <text x={width / 2} y={analyzerY + 33} fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="bold">ANALYZER</text>
          <text x={width / 2 + 120} y={analyzerY + 6} fill={colors.accent} fontSize="11" textAnchor="start" fontWeight="bold">{polarizerAngle}°</text>

          {/* ============ HEAT INDICATOR ============ */}
          {isHeated && (
            <g transform={`translate(${width - 60}, 60)`} filter="url(#tbireHeatShimmer)">
              {/* Heat waves */}
              <ellipse cx="0" cy="0" rx="35" ry="35" fill="url(#tbireHeatWave)">
                <animate attributeName="rx" values="30;40;30" dur="1s" repeatCount="indefinite" />
                <animate attributeName="ry" values="30;40;30" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
              </ellipse>

              {/* Heat icon */}
              <rect x="-20" y="-20" width="40" height="40" rx="8" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="2" />
              <path
                d="M 0 -8 Q -6 -2 0 4 Q 6 10 0 15"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <animate attributeName="d"
                  values="M 0 -8 Q -6 -2 0 4 Q 6 10 0 15;M 0 -10 Q -8 -4 0 2 Q 8 8 0 13;M 0 -8 Q -6 -2 0 4 Q 6 10 0 15"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </path>

              {/* Label */}
              <text x="0" y="35" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">HEAT</text>
              <text x="0" y="48" fill="#f97316" fontSize="11" textAnchor="middle">ON</text>
            </g>
          )}

          {/* ============ INFO PANEL ============ */}
          <g transform={`translate(15, ${height - 30})`}>
            <rect x="-5" y="-14" width={width - 20} height="26" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
            <text x="5" y="2" fill="#94a3b8" fontSize="11" fontWeight="600">Layers: <tspan fill="#06b6d4" fontWeight="bold">{tapeLayers}</tspan></text>
            <text x="85" y="2" fill="#94a3b8" fontSize="11" fontWeight="600">Angle: <tspan fill="#06b6d4" fontWeight="bold">{polarizerAngle}°</tspan></text>
            <text x="200" y="2" fill="#94a3b8" fontSize="11" fontWeight="600">Retardation: <tspan fill="#a855f7" fontWeight="bold">{tapeLayers * 50 * (isHeated ? 0.5 : 1)}nm</tspan></text>
            {isHeated && <text x="370" y="2" fill="#ef4444" fontSize="11" fontWeight="bold">HEATED</text>}
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
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
              {isAnimating ? 'Stop Rotation' : 'Rotate Analyzer'}
            </button>
            <button
              onClick={() => { setTapeLayers(3); setPolarizerAngle(45); setIsHeated(false); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(6, 182, 212, 0.1)',
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
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Tape Layers (controls total birefringence): {tapeLayers}
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
          <span>1 layer</span><span>8 layers</span>
        </div>
        <input type="range" min="1" max="8" step="1" value={tapeLayers}
          onChange={(e) => setTapeLayers(parseInt(e.target.value))}
          onInput={(e) => setTapeLayers(parseInt((e.target as HTMLInputElement).value))}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', cursor: 'pointer' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Analyzer Angle (controls wavelength selection): {polarizerAngle}°
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
          <span>0°</span><span>180°</span>
        </div>
        <input type="range" min="0" max="180" step="5" value={polarizerAngle}
          onChange={(e) => setPolarizerAngle(parseInt(e.target.value))}
          onInput={(e) => setPolarizerAngle(parseInt((e.target as HTMLInputElement).value))}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', cursor: 'pointer' }} />
      </div>
      <div style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          More layers = more rotation = different colors. Rotating analyzer cycles through complementary colors.
        </div>
      </div>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'rgba(30, 41, 59, 0.8)',
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((validPhases.indexOf(phase) + 1) / validPhases.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '8px 0',
    }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: '0',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  const renderBottomBar = (canProceed: boolean, buttonText: string, _onNext?: () => void) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: colors.bgDark, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
      <button
        onClick={prevPhase}
        disabled={phase === 'hook'}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: phase === 'hook' ? 'rgba(255,255,255,0.3)' : colors.textSecondary,
          fontWeight: 'bold',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          minHeight: '44px',
        }}>
        Back
      </button>
      {renderNavDots()}
      <button
        onClick={nextPhase}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : 'rgba(255,255,255,0.3)',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          minHeight: '44px',
        }}>
        {buttonText}
      </button>
    </div>
  );

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>Welcome: Discover colors in clear tape!</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>Introduction to tape birefringence — hidden colors in ordinary sticky tape</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Place strips of clear packing tape on glass, then view through polarized sunglasses. Brilliant colors appear from completely transparent tape!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is tape birefringence - stretched polymers interact with polarized light.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Start: Make a Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Clear cellophane tape layers placed between two polarizing filters. Polarized light enters from above, passes through the tape, and exits through an analyzer polarizer below. The tape appears completely clear in normal light.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Make your prediction: what will you see when clear tape is placed between polarizers?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`, background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', minHeight: '44px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'See the Experiment')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Experiment: Tape Birefringence</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Stack layers and rotate the analyzer to create different colors</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
              This is how LCD screens work! Liquid crystal molecules act as electrically-controlled birefringent layers. By applying voltage, engineers control which colors pass through - creating every pixel in your smartphone display. Understanding birefringence is fundamental to optical engineering.
            </p>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Add layers - colors change with each layer (more retardation)</li>
              <li>Rotate analyzer - watch colors shift through the spectrum</li>
              <li>Compare: 1 layer vs 4 layers at the same angle</li>
            </ul>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '12px' }}>
              <div style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'rgba(6,182,212,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: colors.accent }}>1 Layer</div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>Low retardation</div>
              </div>
              <div style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'rgba(168,85,247,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#a855f7' }}>4 Layers</div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>High retardation</div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'colors';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? '✅ Correct!' : '❌ Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Vibrant colors appear from the completely clear tape!</p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>
              Your prediction: <strong style={{ color: wasCorrect ? colors.success : colors.warning }}>
                {prediction === 'colors' ? 'Colors appear ✓' : prediction === 'clear' ? 'Remains clear' : prediction === 'white' ? 'Appears white' : 'Becomes dark'}
              </strong>
            </p>
          </div>
          <div style={{ background: 'rgba(6,182,212,0.1)', margin: '16px', padding: '16px', borderRadius: '12px', border: `1px solid ${colors.accent}40` }}>
            <p style={{ fontSize: '14px', color: colors.accent, margin: 0, fontWeight: 600 }}>
              Formula: Retardation Γ = Δn × d | Color ≈ f(Γ mod λ)
            </p>
            <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '4px 0 0' }}>
              Δn = birefringence, d = thickness (layers × 50μm), λ = wavelength
            </p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Birefringence Creates Color</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Stretched Polymers:</strong> During manufacturing, tape is stretched, aligning polymer chains. This creates birefringence - light polarized along vs across the chains travels at different speeds.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Wavelength-Dependent Rotation:</strong> Different colors (wavelengths) experience different amounts of polarization rotation. Some colors rotate to pass the analyzer, others to be blocked.</p>
              <p><strong style={{ color: colors.textPrimary }}>Subtractive Color:</strong> The colors you see are what remains after some wavelengths are blocked. More layers (more thickness) rotate more, changing which colors pass through.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>What happens when you heat the tape?</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Gently heat the tape with a hair dryer. The polymer chains that were stretched during manufacturing start to relax as the plastic warms up.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>When the tape is heated, the colors will:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`, background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', minHeight: '44px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Heat Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Toggle heat to see how colors shift</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '16px' }}>
            <button onClick={() => setIsHeated(!isHeated)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: `2px solid ${colors.warning}`, background: isHeated ? 'rgba(245, 158, 11, 0.3)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', minHeight: '44px' }}>
              {isHeated ? 'HEATED - Click to Cool' : 'COOL - Click to Heat'}
            </button>
          </div>
          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Observation Guide:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>Toggle the heat button and watch how colors shift. Compare the heated and cooled states at the same number of layers.</p>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>When heated, the colors shift! Relaxing polymer chains reduce birefringence, changing which wavelengths are rotated and which pass through.</p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'shift';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Colors shift to different hues when the tape is heated!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Stress Relaxation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Thermal Relaxation:</strong> Heat gives polymer chains energy to move. The stretched, aligned molecules gradually return toward their natural random arrangement.</p>
              <p><strong style={{ color: colors.textPrimary }}>Reduced Birefringence:</strong> As alignment decreases, so does birefringence. Less polarization rotation means different colors pass through - the same effect as having fewer layers of tape!</p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>Real-World Applications</h2>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '16px' }}>Birefringence is everywhere in technology</p>
            <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '13px', marginBottom: '8px' }}>
              App {Math.min(currentAppIndex + 1, realWorldApps.length)} of {realWorldApps.length}
            </p>
          </div>
          {realWorldApps.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.icon} {app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✅ Got it</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '12px' }}>
                {app.stats.map((stat, si) => (
                  <div key={si} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: `${app.color}15`, textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: app.color }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.connection}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button onClick={() => { setTransferCompleted(new Set([...transferCompleted, index])); setCurrentAppIndex(index + 1); }}
                  style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600, minHeight: '44px', width: '100%', transition: 'all 0.2s ease' }}>
                  Got It ✓
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.howItWorks}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= realWorldApps.length, 'Take the Test')}
      </div>
    );
  }

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }
    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2><span style={{ color: colors.accent, fontWeight: 700, fontSize: '16px' }}>Question {currentTestQuestion + 1} of 10</span></div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>{testQuestions.map((_, i) => (<div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />))}</div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Scenario: In an optics lab, a researcher places clear cellophane tape layers between two polarizing filters and observes colorful interference patterns under white light illumination. The tape is birefringent due to molecular alignment from manufacturing stretch.</p>
              <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 600 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < 9 ? <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button> : <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit</button>}
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '8px 24px', background: colors.bgDark, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          {renderNavDots()}
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary }}>You understand how stretched polymers create colors from light</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Polymer chain alignment creates birefringence</li>
              <li>Different wavelengths rotate differently</li>
              <li>Thickness determines which colors pass</li>
              <li>Heat relaxes stress and shifts colors</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TapeBirefringenceRenderer;
