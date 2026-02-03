import React, { useState, useEffect, useCallback } from 'react';

const realWorldApps = [
  {
    icon: '📺',
    title: 'LCD Displays',
    short: 'Polarizers control light in every pixel',
    tagline: 'Billions of polarized crystals showing images',
    description: 'LCD screens use two polarizers with liquid crystals between them. Electric fields twist the crystals to rotate light polarization, controlling how much light passes through each pixel.',
    connection: 'Crossed polarizers would block all light, but liquid crystals rotate the polarization by 90°, allowing light through. Voltage removes the twist, blocking light for dark pixels.',
    howItWorks: 'Backlight passes through a polarizer. Liquid crystals in each pixel rotate light based on applied voltage. The second crossed polarizer blocks or passes light accordingly.',
    stats: [
      { value: '8K', label: 'resolution displays', icon: '📺' },
      { value: '1ms', label: 'response time', icon: '⚡' },
      { value: '$150B', label: 'display market', icon: '📈' }
    ],
    examples: ['Computer monitors', 'Smartphone screens', 'TVs', 'Smartwatches'],
    companies: ['Samsung', 'LG Display', 'BOE', 'AU Optronics'],
    futureImpact: 'OLED is replacing LCD in many applications, but LCD polarizer technology enables energy-efficient reflective displays.',
    color: '#3B82F6'
  },
  {
    icon: '🎬',
    title: '3D Cinema',
    short: 'Polarized glasses separate left and right eyes',
    tagline: 'Depth perception through physics',
    description: '3D movies project two overlapping images with different polarizations. Special glasses filter one polarization to each eye, creating the illusion of depth.',
    connection: 'Circular polarization is used so head tilting doesn\'t cause ghosting. Left-circular and right-circular polarizations remain separated regardless of viewer orientation.',
    howItWorks: 'Two projectors or alternating frames show left and right eye views with opposite circular polarizations. Glasses use quarter-wave plates to separate images by eye.',
    stats: [
      { value: '144', label: 'fps total (48 per eye)', icon: '🎞️' },
      { value: '98%', label: 'image separation', icon: '👀' },
      { value: '$15B', label: '3D cinema market', icon: '📈' }
    ],
    examples: ['IMAX 3D', 'RealD Cinema', 'Dolby 3D', 'Home 3D TVs'],
    companies: ['IMAX', 'RealD', 'Dolby', 'Sony'],
    futureImpact: 'VR headsets and glasses-free 3D displays may eventually replace polarized 3D in theaters.',
    color: '#EF4444'
  },
  {
    icon: '🕶️',
    title: 'Polarized Sunglasses',
    short: 'Blocking glare from horizontal surfaces',
    tagline: 'See clearer on water and roads',
    description: 'Light reflecting off flat surfaces like water, roads, and car hoods becomes horizontally polarized. Polarized sunglasses with vertical transmission axes block this glare.',
    connection: 'Brewster\'s angle reflection creates nearly 100% horizontally polarized light. Vertically-oriented polarizing lenses specifically reject this glare.',
    howItWorks: 'Stretched PVA film embedded in lenses contains aligned iodine chains that absorb horizontal polarization while transmitting vertical polarization.',
    stats: [
      { value: '99%', label: 'glare reduction', icon: '✨' },
      { value: '50%', label: 'light transmission', icon: '☀️' },
      { value: '$5B', label: 'sunglass market', icon: '📈' }
    ],
    examples: ['Fishing sunglasses', 'Driving glasses', 'Skiing goggles', 'Boating eyewear'],
    companies: ['Ray-Ban', 'Oakley', 'Maui Jim', 'Costa'],
    futureImpact: 'Smart sunglasses with adjustable polarization will optimize visibility for any lighting condition.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Stress Analysis Microscopy',
    short: 'Visualizing forces in transparent materials',
    tagline: 'See the invisible forces',
    description: 'Polarized light microscopy reveals stress in transparent materials. Stressed regions rotate light polarization differently, creating colorful fringe patterns between crossed polarizers.',
    connection: 'Stress causes birefringence - different refractive indices for different polarization directions. This creates phase delays that produce interference colors.',
    howItWorks: 'Samples are placed between crossed polarizers. Stressed regions rotate polarization, allowing some light through and creating patterns that map the stress field.',
    stats: [
      { value: '1nm', label: 'retardation sensitivity', icon: '🔬' },
      { value: '100+', label: 'years of technique', icon: '📅' },
      { value: '$3B', label: 'microscopy market', icon: '📈' }
    ],
    examples: ['Engineering models', 'Glass inspection', 'Polymer analysis', 'Mineral identification'],
    companies: ['Zeiss', 'Leica', 'Olympus', 'Nikon'],
    futureImpact: 'Quantitative polarimetry with digital imaging enables automated stress mapping in manufacturing.',
    color: '#8B5CF6'
  }
];

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

interface PolarizationRendererProps {
  gamePhase?: string;
  phase?: string;
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
  polarizer1: '#3b82f6',
  polarizer2: '#ef4444',
  polarizer3: '#10b981',
  lightWave: '#fbbf24',
};

const PolarizationRenderer: React.FC<PolarizationRendererProps> = ({
  gamePhase: gamePhaseFromProps,
  phase: phaseFromProps,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase state (self-managing)
  const [phase, setPhase] = useState<Phase>(() => {
    const incoming = gamePhaseFromProps || phaseFromProps;
    if (incoming && phaseOrder.includes(incoming as Phase)) return incoming as Phase;
    return 'hook';
  });

  // Sync phase with gamePhase prop
  useEffect(() => {
    const incoming = gamePhaseFromProps || phaseFromProps;
    if (incoming && phaseOrder.includes(incoming as Phase) && incoming !== phase) {
      setPhase(incoming as Phase);
    }
  }, [gamePhaseFromProps, phaseFromProps]);

  const goToPhase = (p: Phase) => setPhase(p);
  const goNext = () => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) setPhase(phaseOrder[idx + 1]);
  };
  const goBack = () => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) setPhase(phaseOrder[idx - 1]);
  };

  // Simulation state
  const [angle, setAngle] = useState(0);
  const [showThirdPolarizer, setShowThirdPolarizer] = useState(false);
  const [thirdPolarizerAngle, setThirdPolarizerAngle] = useState(45);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
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

  // Calculate intensity using Malus's Law: I = I0 * cos^2(theta)
  const calculateIntensity = useCallback(() => {
    const rad = (angle * Math.PI) / 180;
    if (showThirdPolarizer) {
      // With third polarizer: I = I0 * cos^2(theta1) * cos^2(theta2)
      const rad1 = (thirdPolarizerAngle * Math.PI) / 180;
      const rad2 = ((angle - thirdPolarizerAngle) * Math.PI) / 180;
      return Math.cos(rad1) ** 2 * Math.cos(rad2) ** 2;
    }
    return Math.cos(rad) ** 2;
  }, [angle, showThirdPolarizer, thirdPolarizerAngle]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'nothing', label: 'Nothing changes - light passes through normally' },
    { id: 'colors', label: 'Rainbow colors appear like a prism' },
    { id: 'dark', label: 'The view gets darker, nearly black at 90 degrees' },
    { id: 'flicker', label: 'The light flickers on and off rapidly' },
  ];

  const twistPredictions = [
    { id: 'darker', label: 'It gets even darker - three filters block more light' },
    { id: 'same', label: 'Nothing changes - still completely dark' },
    { id: 'brighter', label: 'Light comes back! The middle filter lets some through' },
    { id: 'rainbow', label: 'Rainbow colors appear' },
  ];

  const transferApplications = [
    {
      title: 'LCD Screens',
      description: 'Every LCD display uses two polarizers with liquid crystals between them. The crystals rotate light polarization to control what passes through each pixel.',
      question: 'Why does an LCD screen go black when you wear polarized sunglasses at certain angles?',
      answer: 'The polarized sunglasses act as a third polarizer. When aligned perpendicular to the screen\'s output polarizer, they block the light just like crossed polarizers in this experiment.',
    },
    {
      title: '3D Movies',
      description: 'Modern 3D theaters project two overlapping images with different polarizations (circular left and right). Special glasses filter one polarization to each eye.',
      question: 'Why do 3D glasses use circular polarization instead of linear?',
      answer: 'With linear polarization, tilting your head would mix the two images. Circular polarization maintains separation regardless of head angle, since it\'s based on rotation direction, not orientation.',
    },
    {
      title: 'Polarized Sunglasses',
      description: 'Polarized sunglasses block horizontally polarized light, which is the dominant direction of glare from flat surfaces like water and roads.',
      question: 'Why does polarized sunglasses reduce glare from water but not from a rough wall?',
      answer: 'When light reflects off a flat surface near Brewster\'s angle, it becomes strongly horizontally polarized. Rough surfaces scatter light in all directions, mixing polarizations, so polarized glasses don\'t help as much.',
    },
    {
      title: 'Stress Analysis',
      description: 'Transparent plastics under stress rotate light polarization. Between crossed polarizers, stress patterns appear as colorful fringes.',
      question: 'How do engineers use polarization to find stress in plastic models?',
      answer: 'Stressed plastic exhibits birefringence - different polarization directions travel at different speeds. This creates phase differences that appear as color bands between crossed polarizers, revealing stress distribution.',
    },
  ];

  const testQuestions = [
    {
      question: 'What happens when light passes through a polarizer?',
      options: [
        { text: 'It changes color', correct: false },
        { text: 'Only vibrations in one direction pass through', correct: true },
        { text: 'It speeds up', correct: false },
        { text: 'It becomes invisible', correct: false },
      ],
    },
    {
      question: 'When two polarizers are crossed at 90 degrees, the transmitted intensity is:',
      options: [
        { text: '100% - all light passes', correct: false },
        { text: '50% - half the light passes', correct: false },
        { text: 'Nearly 0% - almost no light passes', correct: true },
        { text: '25% - one quarter passes', correct: false },
      ],
    },
    {
      question: 'The relationship between transmitted intensity and angle follows:',
      options: [
        { text: 'Linear: I = I0 * (1 - theta/90)', correct: false },
        { text: 'Malus\'s Law: I = I0 * cos^2(theta)', correct: true },
        { text: 'Exponential: I = I0 * e^(-theta)', correct: false },
        { text: 'Inverse square: I = I0 / theta^2', correct: false },
      ],
    },
    {
      question: 'Adding a third polarizer at 45 degrees between two crossed polarizers:',
      options: [
        { text: 'Blocks even more light', correct: false },
        { text: 'Has no effect', correct: false },
        { text: 'Allows some light to pass through', correct: true },
        { text: 'Creates rainbow colors', correct: false },
      ],
    },
    {
      question: 'Why does glare from water become polarized?',
      options: [
        { text: 'Water molecules are polarized', correct: false },
        { text: 'Reflection at certain angles favors one polarization direction', correct: true },
        { text: 'The sun emits polarized light', correct: false },
        { text: 'Water filters out vertical vibrations', correct: false },
      ],
    },
    {
      question: 'LCD screens use polarizers because:',
      options: [
        { text: 'They make colors brighter', correct: false },
        { text: 'Liquid crystals rotate polarization to control light', correct: true },
        { text: 'They reduce eye strain', correct: false },
        { text: 'They make screens thinner', correct: false },
      ],
    },
    {
      question: 'At what angle between two polarizers is transmitted light at 50% intensity?',
      options: [
        { text: '45 degrees', correct: true },
        { text: '30 degrees', correct: false },
        { text: '60 degrees', correct: false },
        { text: '90 degrees', correct: false },
      ],
    },
    {
      question: 'Polarization describes:',
      options: [
        { text: 'The speed of light', correct: false },
        { text: 'The color of light', correct: false },
        { text: 'The direction of light wave vibration', correct: true },
        { text: 'The brightness of light', correct: false },
      ],
    },
    {
      question: 'Why do 3D movie glasses work?',
      options: [
        { text: 'They make one eye see faster than the other', correct: false },
        { text: 'They filter different polarizations to each eye', correct: true },
        { text: 'They use different colored lenses', correct: false },
        { text: 'They magnify the image differently', correct: false },
      ],
    },
    {
      question: 'Photoelastic stress analysis works because:',
      options: [
        { text: 'Stress makes materials glow', correct: false },
        { text: 'Stressed materials rotate light polarization', correct: true },
        { text: 'Stress changes the color of materials', correct: false },
        { text: 'Stress makes materials transparent', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 450;
    const height = 350;
    const intensity = calculateIntensity();
    const intensityPercent = Math.round(intensity * 100);

    // Premium polarizer rendering with gradient glass effect
    const renderPolarizer = (x: number, y: number, rotation: number, color: string, label: string, polarizerId: string) => {
      const gridSize = 60;
      const lineCount = 10;
      const lines = [];

      for (let i = 0; i <= lineCount; i++) {
        const offset = (i / lineCount - 0.5) * gridSize;
        const lineOpacity = 0.4 + 0.4 * Math.abs((i / lineCount) - 0.5) * 2;
        lines.push(
          <line
            key={`line-${i}`}
            x1={-gridSize / 2}
            y1={offset}
            x2={gridSize / 2}
            y2={offset}
            stroke={color}
            strokeWidth={1.5}
            opacity={lineOpacity}
          />
        );
      }

      return (
        <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
          {/* Outer frame with metallic effect */}
          <rect
            x={-gridSize / 2 - 8}
            y={-gridSize / 2 - 8}
            width={gridSize + 16}
            height={gridSize + 16}
            fill={`url(#polrFrame${polarizerId})`}
            stroke="#475569"
            strokeWidth={1.5}
            rx={6}
          />
          {/* Inner glass panel with gradient */}
          <rect
            x={-gridSize / 2 - 2}
            y={-gridSize / 2 - 2}
            width={gridSize + 4}
            height={gridSize + 4}
            fill={`url(#polrGlass${polarizerId})`}
            rx={3}
          />
          {/* Polarization grid lines */}
          {lines}
          {/* Glass highlight reflection */}
          <rect
            x={-gridSize / 2 + 5}
            y={-gridSize / 2 + 3}
            width={gridSize / 3}
            height={4}
            fill="white"
            opacity={0.15}
            rx={2}
          />
          {/* Label background */}
          <g transform={`rotate(${-rotation})`}>
            <rect
              x={-35}
              y={gridSize / 2 + 8}
              width={70}
              height={18}
              fill="#111827"
              stroke={color}
              strokeWidth={1}
              rx={4}
              opacity={0.9}
            />
            <text
              x={0}
              y={gridSize / 2 + 20}
              fill={color}
              fontSize={10}
              textAnchor="middle"
              fontWeight="bold"
            >
              {label}
            </text>
          </g>
        </g>
      );
    };

    // Premium light wave rendering with glow effect
    const renderLightWave = (startX: number, endX: number, y: number, amplitude: number, polarizationAngle: number, waveId: string) => {
      const points = [];
      const steps = 60;
      const wavelength = 25;

      for (let i = 0; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const phase = (x / wavelength + animationTime) * 2 * Math.PI;
        const wave = Math.sin(phase) * amplitude;
        const yOffset = wave * Math.cos(polarizationAngle * Math.PI / 180);
        points.push(`${x},${y + yOffset}`);
      }

      const waveOpacity = amplitude > 5 ? 1 : amplitude > 0 ? 0.5 : 0.15;

      return (
        <g>
          {/* Outer glow layer */}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="url(#polrWaveGlow)"
            strokeWidth={amplitude > 5 ? 6 : 3}
            opacity={waveOpacity * 0.3}
            filter="url(#polrWaveBlur)"
          />
          {/* Middle glow layer */}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="url(#polrWaveCore)"
            strokeWidth={amplitude > 5 ? 3 : 2}
            opacity={waveOpacity * 0.7}
          />
          {/* Core bright line */}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#fef3c7"
            strokeWidth={amplitude > 5 ? 1.5 : 1}
            opacity={waveOpacity}
          />
        </g>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px', transition: 'background 0.3s' }}
        >
          <defs>
            {/* === PREMIUM GRADIENT DEFINITIONS === */}

            {/* Lab background gradient with depth */}
            <linearGradient id="polrLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor={`rgba(0, 0, 0, ${1 - intensity * 0.5})`} />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Light source radial glow */}
            <radialGradient id="polrLightSource" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Light source outer halo */}
            <radialGradient id="polrLightHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>

            {/* Polarizer 1 frame (blue) - metallic brushed effect */}
            <linearGradient id="polrFrame1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="20%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="80%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>

            {/* Polarizer 1 glass with blue tint */}
            <linearGradient id="polrGlass1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#1d4ed8" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#1e40af" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>

            {/* Polarizer 2 frame (red) - metallic brushed effect */}
            <linearGradient id="polrFrame2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="20%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="80%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Polarizer 2 glass with red tint */}
            <linearGradient id="polrGlass2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#dc2626" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>

            {/* Polarizer 3 frame (green) - metallic brushed effect */}
            <linearGradient id="polrFrame3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="20%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="80%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Polarizer 3 glass with green tint */}
            <linearGradient id="polrGlass3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#059669" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#047857" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>

            {/* Light wave gradient - golden glow */}
            <linearGradient id="polrWaveGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#fcd34d" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Light wave core gradient */}
            <linearGradient id="polrWaveCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Intensity meter gradient - dynamic based on intensity */}
            <linearGradient id="polrMeterFill" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={intensity > 0.5 ? '#10b981' : intensity > 0.1 ? '#f59e0b' : '#ef4444'} />
              <stop offset="30%" stopColor={intensity > 0.5 ? '#34d399' : intensity > 0.1 ? '#fbbf24' : '#f87171'} />
              <stop offset="70%" stopColor={intensity > 0.5 ? '#6ee7b7' : intensity > 0.1 ? '#fcd34d' : '#fca5a5'} />
              <stop offset="100%" stopColor={intensity > 0.5 ? '#a7f3d0' : intensity > 0.1 ? '#fef3c7' : '#fecaca'} />
            </linearGradient>

            {/* Intensity meter frame gradient */}
            <linearGradient id="polrMeterFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="75%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* === GLOW FILTER DEFINITIONS === */}

            {/* Light source glow filter */}
            <filter id="polrSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Wave blur for soft glow effect */}
            <filter id="polrWaveBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intensity meter inner glow */}
            <filter id="polrMeterGlow" x="-20%" y="-5%" width="140%" height="110%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text shadow filter */}
            <filter id="polrTextShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern for lab background */}
            <pattern id="polrLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#polrLabBg)" />
          <rect width={width} height={height} fill="url(#polrLabGrid)" />

          {/* === PREMIUM LIGHT SOURCE === */}
          <g transform={`translate(40, ${height / 2})`}>
            {/* Outer halo */}
            <circle cx={0} cy={0} r={35} fill="url(#polrLightHalo)" />
            {/* Main light glow */}
            <circle cx={0} cy={0} r={22} fill="url(#polrLightSource)" filter="url(#polrSourceGlow)">
              <animate attributeName="r" values="20;23;20" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Core bright center */}
            <circle cx={0} cy={0} r={8} fill="#fef3c7">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Housing ring */}
            <circle cx={0} cy={0} r={25} fill="none" stroke="#475569" strokeWidth={3} />
            <circle cx={0} cy={0} r={27} fill="none" stroke="#374151" strokeWidth={1} />
          </g>
          {/* Light source label */}
          <rect x={10} y={height / 2 + 38} width={60} height={30} fill="#111827" stroke="#334155" strokeWidth={1} rx={4} opacity={0.9} />
          <text x={40} y={height / 2 + 50} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="bold">
            Unpolarized
          </text>
          <text x={40} y={height / 2 + 62} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="bold">
            Light Source
          </text>

          {/* === LIGHT WAVES === */}
          {/* Incoming light wave (unpolarized - show multiple directions) */}
          {renderLightWave(65, 105, height / 2, 12, 0, 'in1')}
          {renderLightWave(65, 105, height / 2, 10, 45, 'in2')}
          {renderLightWave(65, 105, height / 2, 10, -45, 'in3')}
          {renderLightWave(65, 105, height / 2, 12, 90, 'in4')}

          {/* === POLARIZERS === */}
          {/* First polarizer (fixed at 0 degrees - vertical) */}
          {renderPolarizer(130, height / 2, 0, colors.polarizer1, 'Polarizer 1 (0 deg)', '1')}

          {/* After first polarizer - vertically polarized */}
          {renderLightWave(160, showThirdPolarizer ? 185 : 235, height / 2, 14, 0, 'mid1')}

          {/* Third polarizer (optional, in middle) */}
          {showThirdPolarizer && (
            <>
              {renderPolarizer(210, height / 2, thirdPolarizerAngle, colors.polarizer3, `Middle (${thirdPolarizerAngle} deg)`, '3')}
              {renderLightWave(240, 285, height / 2, 14 * Math.cos(thirdPolarizerAngle * Math.PI / 180), thirdPolarizerAngle, 'mid2')}
            </>
          )}

          {/* Second polarizer (rotatable) */}
          {renderPolarizer(showThirdPolarizer ? 310 : 260, height / 2, angle, colors.polarizer2, `Polarizer 2 (${angle} deg)`, '2')}

          {/* Output light */}
          {renderLightWave(showThirdPolarizer ? 340 : 290, showThirdPolarizer ? 385 : 355, height / 2, 14 * Math.sqrt(intensity), angle, 'out')}

          {/* === PREMIUM INTENSITY METER === */}
          <g transform={`translate(${width - 55}, 15)`}>
            {/* Meter housing */}
            <rect x={-5} y={-5} width={50} height={180} fill="#111827" stroke="#334155" strokeWidth={1} rx={6} />

            {/* Meter frame with gradient */}
            <rect x={0} y={0} width={40} height={155} fill="url(#polrMeterFrame)" stroke="#4b5563" strokeWidth={1} rx={4} />

            {/* Meter background */}
            <rect x={2} y={2} width={36} height={151} fill="#030712" rx={3} />

            {/* Scale markings */}
            {[0, 25, 50, 75, 100].map((mark, i) => (
              <g key={mark}>
                <line x1={3} y1={150 - (mark / 100) * 148} x2={8} y2={150 - (mark / 100) * 148} stroke="#6b7280" strokeWidth={1} />
                <text x={-3} y={154 - (mark / 100) * 148} fill="#64748b" fontSize={7} textAnchor="end">{mark}</text>
              </g>
            ))}

            {/* Intensity fill with gradient and glow */}
            <rect
              x={4}
              y={4 + 147 * (1 - intensity)}
              width={32}
              height={147 * intensity}
              fill="url(#polrMeterFill)"
              rx={2}
              filter="url(#polrMeterGlow)"
            >
              <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite" />
            </rect>

            {/* Current value indicator line */}
            <line x1={0} y1={4 + 147 * (1 - intensity)} x2={40} y2={4 + 147 * (1 - intensity)} stroke="#f8fafc" strokeWidth={1.5} opacity={0.8} />

            {/* Value display */}
            <rect x={-2} y={158} width={44} height={22} fill="#0f172a" stroke={intensity > 0.5 ? colors.success : intensity > 0.1 ? colors.warning : colors.error} strokeWidth={1} rx={4} />
            <text x={20} y={172} fill={colors.textPrimary} fontSize={13} textAnchor="middle" fontWeight="bold" filter="url(#polrTextShadow)">
              {intensityPercent}%
            </text>

            {/* Label */}
            <text x={20} y={192} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="bold">
              Transmitted
            </text>
            <text x={20} y={202} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="bold">
              Intensity
            </text>
          </g>

          {/* === INFO PANEL === */}
          <g transform="translate(10, 10)">
            <rect x={0} y={0} width={145} height={55} fill="#0f172a" stroke="#334155" strokeWidth={1} rx={6} opacity={0.95} />
            <text x={10} y={20} fill={colors.textPrimary} fontSize={12} fontWeight="bold">
              Angle: {angle} deg
            </text>
            <text x={10} y={38} fill={colors.accent} fontSize={10}>
              I = I0 x cos2({angle} deg)
            </text>
            <text x={10} y={50} fill={colors.textSecondary} fontSize={9}>
              = {intensityPercent}% transmission
            </text>
          </g>

          {/* === MALUS'S LAW FORMULA DISPLAY === */}
          <g transform={`translate(10, ${height - 35})`}>
            <rect x={0} y={0} width={180} height={28} fill="#0f172a" stroke={colors.accent} strokeWidth={1} rx={6} opacity={0.95} />
            <text x={90} y={18} fill={colors.accent} fontSize={10} textAnchor="middle" fontWeight="bold">
              Malus's Law: I = I0 * cos^2(theta)
            </text>
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
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnimating ? 'Stop Wave' : 'Animate Wave'}
            </button>
            <button
              onClick={() => { setAngle(0); setShowThirdPolarizer(false); setThirdPolarizerAngle(45); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Rotation Angle: {angle}deg
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="1"
          value={angle}
          onChange={(e) => setAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {phase === 'twist_play' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ color: colors.textSecondary }}>Add Third Polarizer:</label>
            <button
              onClick={() => setShowThirdPolarizer(!showThirdPolarizer)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: showThirdPolarizer ? colors.success : 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {showThirdPolarizer ? 'On' : 'Off'}
            </button>
          </div>

          {showThirdPolarizer && (
            <div>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Middle Polarizer Angle: {thirdPolarizerAngle}deg
              </label>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={thirdPolarizerAngle}
                onChange={(e) => setThirdPolarizerAngle(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Transmitted Intensity: {Math.round(calculateIntensity() * 100)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Malus's Law: I = I0 * cos^2(theta)
        </div>
      </div>
    </div>
  );

  const renderBottomBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === phaseOrder.length - 1;
    const isTestActive = phase === 'test' && !testSubmitted;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            opacity: isFirst ? 0.4 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              title={phaseLabels[p]}
              onClick={() => goToPhase(p)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={isTestActive ? undefined : (isLast ? onPhaseComplete : goNext)}
          disabled={isTestActive}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: isTestActive ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
            color: isTestActive ? colors.textMuted : 'white',
            cursor: isTestActive ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            opacity: isTestActive ? 0.4 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 400 }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
              The Disappearing Light
            </h1>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '18px', marginBottom: '24px' }}>
              Can you make the world go dark without turning lights off?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Stack two polarized sunglasses lenses together. Now slowly rotate one.
                Watch as the view through both lenses gets darker and darker until
                it's nearly black - even though each lens alone barely dims the light!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Try it on your phone screen too - the LCD behaves strangely!
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Use the slider to rotate the second polarizer and watch the intensity change!
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
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Light from a source passes through two polarizers (shown as grids of lines).
              The first polarizer is fixed. The second can be rotated. The lines show
              which direction of light vibration each polarizer allows through.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you rotate the second polarizer to 90 degrees from the first, what happens?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Polarization</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Rotate the second polarizer and observe how intensity changes
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>0 degrees: Both polarizers aligned - maximum light</li>
              <li>45 degrees: Half the intensity passes through</li>
              <li>90 degrees: Crossed polarizers - nearly complete darkness!</li>
              <li>Notice how intensity follows cos^2(angle)</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'dark';

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
              Brightness drops to near-black at 90 degrees rotation!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Polarization - Understanding the Principle</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Light Waves Vibrate:</strong> Light is a
                transverse wave - it vibrates perpendicular to its direction of travel. Unpolarized
                light vibrates in all directions at once.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Polarizers are Filters:</strong> A polarizer
                only allows vibrations in one direction to pass through. It blocks all other directions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Crossed = Blocked:</strong> When two polarizers
                are crossed at 90 degrees, the second blocks the exact direction the first allowed through.
                No vibration direction can pass both filters - total darkness! This demonstrates that because
                light is a transverse wave, its vibration direction can be selectively filtered.
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
              What if we add a THIRD polarizer between the crossed pair?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You have two polarizers crossed at 90 degrees - complete darkness.
              Now you insert a third polarizer between them, angled at 45 degrees.
              You might think adding another filter would block even more light...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens when you add the third polarizer?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Third Polarizer</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              First set angle to 90deg (crossed), then add the middle polarizer
            </p>
          </div>

          {renderVisualization(true)}
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
              Light comes back! The middle polarizer rotates the polarization direction,
              allowing some light to pass the final polarizer. Maximum transmission
              through 3 polarizers occurs when the middle one is at 45 degrees.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'brighter';

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
              Adding a filter actually lets MORE light through - counterintuitive!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Adding a Filter Increases Light</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Polarization Rotation:</strong> The middle
                polarizer doesn't just block - it rotates the polarization direction of light passing through.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Breaking the 90deg Block:</strong> Light
                from polarizer 1 is partially transmitted by the 45deg middle filter. This transmitted
                light is now polarized at 45deg - no longer perpendicular to the final polarizer!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Math:</strong> With polarizer at 45deg
                between crossed filters: I = I0 * cos^2(45deg) * cos^2(45deg) = I0 * 0.5 * 0.5 = 25% of original.
                From complete darkness to 25% - just by adding a filter!
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
              Polarization is everywhere in modern technology
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {realWorldApps.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid rgba(255,255,255,0.1)`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '8px' }}>{app.icon} {app.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', lineHeight: 1.6 }}>{app.description}</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', lineHeight: 1.5 }}>{app.howItWorks}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {app.stats.map((s, si) => (
                  <div key={si} style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                    <div style={{ color: colors.accent, fontWeight: 700, fontSize: '14px' }}>{s.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>
                Examples: {app.examples.join(', ')}
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px' }}>
                Companies: {app.companies.join(', ')}
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>{app.futureImpact}</p>
            </div>
          ))}
          <div style={{ padding: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
              Polarization technology powers a $150 billion display market, with LCD screens achieving 1 ms response times.
              Polarized sunglasses reduce glare by 99%, and 3D cinema systems deliver 98% image separation at 144 fps.
              The microscopy market is worth $3 billion, with retardation sensitivity reaching 1 nm.
              Samsung, LG Display, Ray-Ban, Oakley, Zeiss, and Nikon are leading companies in polarization applications.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const labels = ['A', 'B', 'C', 'D'];
    const scenarios = [
      'A student in a physics lab is experimenting with polarizing filters. She shines a bright flashlight through a single polarizer and notices the light dims only slightly. She wonders what the filter is actually doing to the light beam as it passes through.',
      'In a classroom demonstration, two polarizers are placed in series. The teacher slowly rotates the second polarizer from 0 to 90 degrees relative to the first while students observe the dramatic change in brightness on the projection screen behind.',
      'A physics professor is deriving the mathematical relationship between the relative angle of two polarizers and the resulting transmitted light intensity. She writes Malus\'s Law on the whiteboard and asks students to predict the shape of the curve.',
      'A counterintuitive experiment puzzles an entire class: two crossed polarizers block all light completely, creating total darkness. The teacher then carefully inserts a third polarizer between them at a 45-degree angle and something unexpected happens.',
      'A student is fishing on a scenic lake on a sunny afternoon and notices intense glare from the water surface that makes it impossible to see the fish swimming below. A friend hands her a pair of polarized sunglasses to try.',
      'An engineer at Samsung is designing the pixel architecture for a next-generation LCD display panel. She must carefully choose the orientation of the liquid crystal layer between two polarizing films to maximize contrast ratio and color accuracy.',
      'A photographer uses a circular polarizing filter on a camera lens and slowly rotates it while viewing the LCD preview. At certain orientations, reflections from a glass building disappear and the sky becomes dramatically deeper blue.',
      'A physics textbook chapter introduces polarization as a fundamental property of electromagnetic waves, describing how the electric field oscillates perpendicular to the direction of propagation. The concept is key to understanding many modern technologies.',
      'A family visits an IMAX 3D movie theater. Each person receives special lightweight glasses to watch the film. The children notice that if they tilt their heads sideways, the 3D effect remains perfect, unlike older 3D systems they have tried.',
      'An engineer at Zeiss is using crossed polarizers to inspect transparent plastic parts for internal stress and defects. When stressed plastic is placed between the polarizers, colorful fringe patterns appear revealing the distribution of forces inside.',
    ];

    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
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
                {testScore >= 8 ? 'You\'ve mastered polarization!' : 'Review the material and try again.'}
              </p>
            </div>
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const selectedIdx = testAnswers[currentTestQuestion];
    const isConfirmed = confirmedIndex !== null;

    const handleConfirm = () => {
      if (selectedIdx === null) return;
      setConfirmedIndex(selectedIdx);
      if (currentQ.options[selectedIdx].correct && onCorrectAnswer) onCorrectAnswer();
    };

    const handleNextQuestion = () => {
      setConfirmedIndex(null);
      if (currentTestQuestion < testQuestions.length - 1) {
        setCurrentTestQuestion(currentTestQuestion + 1);
      } else {
        // All done
        let score = 0;
        testQuestions.forEach((q, i) => {
          if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) score++;
        });
        setTestScore(score);
        setTestSubmitted(true);
      }
    };

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>{currentTestQuestion + 1} of 10</span>
            </div>

            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }}>
                {scenarios[currentTestQuestion]}
              </p>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 600 }}>{currentQ.question}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => {
                const isSelected = selectedIdx === oIndex;
                const wasConfirmedCorrect = isConfirmed && opt.correct;
                const wasConfirmedWrong = isConfirmed && confirmedIndex === oIndex && !opt.correct;
                return (
                  <button
                    key={oIndex}
                    onClick={() => { if (!isConfirmed) handleTestAnswer(currentTestQuestion, oIndex); }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: wasConfirmedCorrect ? `2px solid ${colors.success}` : wasConfirmedWrong ? `2px solid ${colors.error}` : isSelected ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                      background: wasConfirmedCorrect ? 'rgba(16, 185, 129, 0.2)' : wasConfirmedWrong ? 'rgba(239, 68, 68, 0.2)' : isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: isConfirmed ? 'default' : 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {labels[oIndex]}) {opt.text}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
              {!isConfirmed && selectedIdx !== null && (
                <button onClick={handleConfirm} style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
                  color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}>
                  Check Answer
                </button>
              )}
              {isConfirmed && (
                <button onClick={handleNextQuestion} style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}>
                  {currentTestQuestion < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
                </button>
              )}
            </div>
          </div>
        </div>
        {renderBottomBar()}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered polarization and Malus's Law</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Polarizers pass only one vibration direction</li>
              <li>Crossed polarizers block all light (90 degrees)</li>
              <li>Intensity follows Malus's Law: I = I0 * cos^2(theta)</li>
              <li>Third polarizer can restore light by rotating polarization</li>
              <li>Applications in LCDs, 3D movies, sunglasses, stress analysis</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Polarization is fundamental to quantum mechanics - photon spin states are described
              using polarization. Quantum cryptography uses polarized photons for secure communication.
              In astrophysics, polarization of cosmic microwave background radiation reveals information
              about the early universe!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // Default: show hook
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <p style={{ color: colors.textPrimary, padding: '24px' }}>Loading...</p>
    </div>
  );
};

export default PolarizationRenderer;
