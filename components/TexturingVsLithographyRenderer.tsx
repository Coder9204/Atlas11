import React, { useState, useCallback, useEffect, useRef } from 'react';

interface TexturingVsLithographyRendererProps {
  gamePhase?: string; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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
  solar: '#3b82f6',
  litho: '#8b5cf6',
  light: '#fcd34d',
  euv: '#a855f7',
  visible: '#22c55e',
  border: '#334155',
};

const realWorldApps = [
  {
    icon: '☀️',
    title: 'Solar Panel Manufacturing',
    short: 'Maximizing light capture through surface texturing',
    tagline: 'Making every photon count',
    description: 'Solar cell manufacturers use pyramid texturing on silicon wafers to trap incoming light and reduce reflection. The rough surface causes photons to bounce multiple times, increasing absorption from 70% to over 95%.',
    connection: 'Surface texturing exploits wave optics to maximize scattering - the opposite goal of lithography which minimizes it.',
    howItWorks: 'Chemical etching creates random pyramids 1-10 micrometers tall. Light entering at any angle bounces between pyramids, getting multiple chances to be absorbed. Anti-reflection coatings further reduce surface losses.',
    stats: [
      { value: '25%', label: 'Efficiency boost', icon: '⚡' },
      { value: '$170B', label: 'Solar market size', icon: '📈' },
      { value: '95%', label: 'Light absorption', icon: '🔆' }
    ],
    examples: ['Monocrystalline panels', 'PERC cells', 'Black silicon cells', 'Bifacial modules'],
    companies: ['First Solar', 'LONGi', 'JA Solar', 'Canadian Solar'],
    futureImpact: 'Next-gen texturing with nanowire arrays could push absorption to 99%, enabling solar cells thinner than a human hair.',
    color: '#3B82F6'
  },
  {
    icon: '💻',
    title: 'EUV Lithography',
    short: 'Printing 3nm transistors with extreme UV light',
    tagline: 'Where atomically flat means everything',
    description: 'Extreme Ultraviolet lithography uses 13.5nm wavelength light to print transistor features smaller than 10nm. Unlike solar texturing, any surface roughness destroys the pattern by causing unwanted scattering.',
    connection: 'EUV lithography demands the smoothest surfaces ever made because shorter wavelengths make scattering from imperfections catastrophic.',
    howItWorks: 'Multilayer mirrors with atomic-scale precision reflect EUV light through photomasks onto wafers. Surface roughness must be below 0.1nm - smoother than anything in nature.',
    stats: [
      { value: '$150M', label: 'Per EUV machine', icon: '💰' },
      { value: '3nm', label: 'Feature size', icon: '🔬' },
      { value: '250W', label: 'EUV source power', icon: '⚡' }
    ],
    examples: ['Apple M3 chips', 'AMD Ryzen 7000', 'NVIDIA H100', 'iPhone processors'],
    companies: ['ASML', 'TSMC', 'Samsung', 'Intel'],
    futureImpact: 'High-NA EUV will enable 1nm transistors by 2030, continuing Moore\'s Law through ever-shorter wavelengths.',
    color: '#8B5CF6'
  },
  {
    icon: '🔬',
    title: 'Anti-Reflection Coatings',
    short: 'Controlling interference for optical clarity',
    tagline: 'Making glass invisible',
    description: 'Camera lenses, glasses, and solar panels use thin-film coatings to eliminate reflections. By choosing the right film thickness, reflected waves destructively interfere and cancel out.',
    connection: 'Anti-reflection coatings use the same wave physics as both texturing and lithography, but engineer specific thicknesses for interference.',
    howItWorks: 'Quarter-wavelength thick films create a 180-degree phase shift between surface and interface reflections. When these waves combine, they cancel, eliminating glare and increasing transmission.',
    stats: [
      { value: '99.9%', label: 'Light transmission', icon: '✨' },
      { value: '$12B', label: 'Optical coatings market', icon: '📈' },
      { value: '<0.1%', label: 'Reflection loss', icon: '🎯' }
    ],
    examples: ['Camera lenses', 'Prescription glasses', 'Telescope mirrors', 'Smartphone screens'],
    companies: ['Zeiss', 'Essilor', 'Corning', 'Schott'],
    futureImpact: 'Metamaterial coatings will create perfect anti-reflection across all wavelengths simultaneously.',
    color: '#10B981'
  },
  {
    icon: '🌈',
    title: 'Photonic Crystals',
    short: 'Engineering light with periodic nanostructures',
    tagline: 'Building materials that bend light',
    description: 'Photonic crystals use periodic nanoscale structures to control light propagation. Like semiconductors for electrons, they create bandgaps where certain light frequencies cannot propagate.',
    connection: 'Photonic crystals combine the scattering concepts from texturing with the precision of lithography to create entirely new optical behaviors.',
    howItWorks: 'Regular arrays of holes or pillars create interference patterns that block specific wavelengths. The periodicity determines which colors are reflected, transmitted, or guided.',
    stats: [
      { value: '1000x', label: 'Light slowdown', icon: '🐢' },
      { value: '$5B', label: 'Market by 2028', icon: '📈' },
      { value: '100%', label: 'Reflection at bandgap', icon: '🔄' }
    ],
    examples: ['Optical fibers', 'LED efficiency', 'Biosensors', 'Butterfly wings'],
    companies: ['NKT Photonics', 'Lumentum', 'II-VI', 'Thorlabs'],
    futureImpact: 'Photonic computing could process data 1000x faster than electronics by manipulating light instead of electrons.',
    color: '#F59E0B'
  }
];

const TexturingVsLithographyRenderer: React.FC<TexturingVsLithographyRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase navigation
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',  // changed from 'Wavelength Effects' to match getNavDots pattern
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

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

  // Simulation state
  const [mode, setMode] = useState<'solar' | 'litho'>('solar');
  const [wavelength, setWavelength] = useState(550); // nm
  const [textureDepth, setTextureDepth] = useState(5); // microns
  const [featureSize, setFeatureSize] = useState(7); // nm for litho

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateMetrics = useCallback(() => {
    // Solar texturing
    const scatteringFactor = textureDepth / 10;
    const lightTrapping = Math.min(95, 40 + textureDepth * 10);
    const absorptionBoost = Math.min(40, textureDepth * 6);
    const reflectionReduction = Math.min(90, textureDepth * 15);

    // Lithography
    const resolutionLimit = wavelength / 2; // Rayleigh criterion approximation
    const canPrint = featureSize >= resolutionLimit / 100;
    const edgeSharpness = canPrint ? Math.max(10, 100 - (wavelength / 10)) : 0;
    const diffractionBlur = wavelength / 50;

    // EUV specific (13.5nm)
    const euvResolution = 13.5 / 2;
    const euvEnabled = wavelength < 100;

    return {
      scatteringFactor,
      lightTrapping,
      absorptionBoost,
      reflectionReduction,
      resolutionLimit,
      canPrint,
      edgeSharpness,
      diffractionBlur,
      euvResolution,
      euvEnabled,
    };
  }, [textureDepth, featureSize, wavelength]);

  const predictions = [
    { id: 'same', label: 'Both want the same thing - maximum light interaction with the surface' },
    { id: 'opposite', label: 'They want opposite things - solar wants scattering, litho wants precision' },
    { id: 'solar_smooth', label: 'Solar cells need smooth surfaces for efficient current flow' },
    { id: 'litho_rough', label: 'Lithography benefits from rough surfaces to reduce reflections' },
  ];

  const twistPredictions = [
    { id: 'same_wavelength', label: 'Both work best at the same wavelength (visible light)' },
    { id: 'solar_long', label: 'Solar uses longer wavelengths, litho uses shorter' },
    { id: 'litho_short', label: 'Litho uses extremely short wavelengths (EUV) for smaller features' },
    { id: 'no_effect', label: 'Wavelength does not matter for either application' },
  ];

  const transferApplications = [
    {
      title: 'Solar Panel Anti-Reflection',
      description: 'Modern solar panels use pyramid-textured surfaces to trap light and reduce reflection.',
      question: 'Why do solar cell manufacturers deliberately roughen the silicon surface?',
      answer: 'Rough pyramid textures cause light to bounce multiple times, increasing absorption. Each bounce gives another chance for photons to create electron-hole pairs, boosting efficiency by up to 30%.',
    },
    {
      title: 'EUV Lithography Masks',
      description: 'EUV systems use 13.5nm wavelength light and require near-perfect flat surfaces.',
      question: 'Why must EUV lithography masks be atomically flat?',
      answer: 'At 13.5nm wavelength, even atomic-scale roughness causes scattering that blurs the pattern. A bump of just a few atoms can destroy the sharp edges needed for 5nm transistor features.',
    },
    {
      title: 'Photoresist Chemistry',
      description: 'Photoresist is the light-sensitive material that captures the pattern in lithography.',
      question: 'How does wavelength affect photoresist design?',
      answer: 'Shorter wavelengths (EUV) require chemically amplified resists that respond to individual photon events. Visible light resists can be simpler because more photons are available for the reaction.',
    },
    {
      title: 'Black Silicon Solar Cells',
      description: 'Black silicon absorbs nearly 100% of incident light using nanoscale texturing.',
      question: 'How does black silicon achieve near-perfect light absorption?',
      answer: 'Nanoscale needle-like structures create a gradient refractive index that eliminates reflection. Light enters and bounces between needles until fully absorbed - the opposite of what lithography needs.',
    },
  ];

  const testQuestions = [
    {
      question: 'A solar cell engineer wants to maximize efficiency by treating the silicon surface. The goal is to capture as much incoming sunlight as possible and convert it to electricity. In solar cell texturing, the primary engineering goal is to:',
      options: [
        { text: 'Create sharp, well-defined edges for precise current paths', correct: false },
        { text: 'Maximize light scattering and absorption by trapping photons', correct: true },
        { text: 'Produce smooth, reflective surfaces that redirect unwanted wavelengths', correct: false },
        { text: 'Minimize photon interaction with the surface to reduce heat', correct: false },
      ],
    },
    {
      question: 'A chip fabrication engineer is designing the lithography process for a new 3nm chip generation. They need to transfer circuit patterns from a mask onto a silicon wafer with nanometer precision. In lithography, the primary engineering goal is to:',
      options: [
        { text: 'Scatter light as broadly as possible to expose more area uniformly', correct: false },
        { text: 'Create precise, sharp-edged patterns with minimal diffraction blur', correct: true },
        { text: 'Maximize light absorption in the photoresist for sensitivity', correct: false },
        { text: 'Increase surface roughness to improve adhesion of the photoresist', correct: false },
      ],
    },
    {
      question: 'ASML, the only company that makes EUV lithography machines, chose an unusual light source for their systems. This choice was driven by the fundamental physics of wave optics and the Rayleigh criterion for resolution. EUV lithography uses a wavelength of:',
      options: [
        { text: '550nm (green visible light, the most available)', correct: false },
        { text: '193nm (deep UV, previously used for 7nm nodes)', correct: false },
        { text: '13.5nm (extreme UV, enabling sub-10nm features)', correct: true },
        { text: '1000nm (near infrared, for deep penetration)', correct: false },
      ],
    },
    {
      question: 'The semiconductor industry has progressively moved from visible light to deep UV to extreme UV over the past decades. Each transition enabled a new generation of smaller transistors. The physical reason why shorter wavelength enables smaller features in lithography is that:',
      options: [
        { text: 'Shorter wavelengths carry more energy, burning away more photoresist', correct: false },
        { text: 'Diffraction limits resolution to roughly half the wavelength used', correct: true },
        { text: 'Shorter wavelengths are absorbed more quickly in the resist material', correct: false },
        { text: 'Photoresist chemistry only responds efficiently to UV wavelengths', correct: false },
      ],
    },
    {
      question: 'A manufacturing engineer is designing the texturing process for monocrystalline silicon solar cells. The chemical etching process creates pyramid-shaped features on the surface. Solar cell pyramid texturing typically creates features on the scale of:',
      options: [
        { text: 'Nanometers (1-10nm), similar to chip transistor dimensions', correct: false },
        { text: 'Micrometers (1-10um), comparable to the wavelength of light', correct: true },
        { text: 'Millimeters (1-10mm), visible to the naked eye as a rough texture', correct: false },
        { text: 'Centimeters (1-10cm), creating large geometric patterns on the panel', correct: false },
      ],
    },
    {
      question: 'A physicist studying optical systems notices that wave optics — specifically diffraction and interference — governs both solar texturing and semiconductor lithography. Yet these two technologies have completely different engineering requirements. The same wave optics principle applied to both solar texturing and lithography produces:',
      options: [
        { text: 'Identical results in both applications since physics is universal', correct: false },
        { text: 'Opposite optimization goals: maximize scattering vs. minimize it', correct: true },
        { text: 'No useful effects in either case, wave optics being negligible', correct: false },
        { text: 'Effects only visible under an electron microscope due to small scale', correct: false },
      ],
    },
    {
      question: 'Researchers at MIT developed "black silicon" - a material that appears completely black because it absorbs virtually all incident light. Unlike conventional silicon that reflects 30-35% of light, black silicon has near-perfect absorption. Black silicon achieves this high absorption by:',
      options: [
        { text: 'Using special carbon dyes embedded in the silicon to absorb light', correct: false },
        { text: 'Creating nanoscale needle-like textures that trap and absorb light', correct: true },
        { text: 'Making the silicon layer thicker so more photons interact with it', correct: false },
        { text: 'Heating the silicon to make it glow and reabsorb its own emission', correct: false },
      ],
    },
    {
      question: 'An EUV lithography system requires mirrors to redirect the 13.5nm light beam. Unlike conventional optics, EUV cannot use glass lenses. A quality engineer is inspecting the mirror surfaces before installation. In lithography systems, surface roughness causes:',
      options: [
        { text: 'Better pattern transfer by creating multiple interference paths', correct: false },
        { text: 'Unwanted scattering that blurs pattern edges and reduces resolution', correct: true },
        { text: 'Faster processing speed by diffusing the beam more efficiently', correct: false },
        { text: 'Reduced mask cost by decreasing the precision requirements', correct: false },
      ],
    },
    {
      question: 'Lord Rayleigh derived a fundamental criterion for optical resolution in the 19th century that still governs modern semiconductor manufacturing. This criterion is used to calculate the minimum feature size achievable with a given light source. The Rayleigh criterion specifically relates:',
      options: [
        { text: 'Temperature to electrical resistance in semiconductor materials', correct: false },
        { text: 'Wavelength to the minimum resolvable feature size in optics', correct: true },
        { text: 'Voltage to current flow in photovoltaic junctions', correct: false },
        { text: 'Mass to energy in photoelectric interactions', correct: false },
      ],
    },
    {
      question: 'A materials science professor is teaching about wave optics applications in industry. She shows her students that the same fundamental physics appears in billion-dollar industries with very different objectives. Both solar texturing and lithography use wave physics, but:',
      options: [
        { text: 'Solar maximizes scattering while litho minimizes it for opposite goals', correct: true },
        { text: 'Both try to maximize scattering for maximum light-material interaction', correct: false },
        { text: 'Both try to minimize scattering to preserve photon coherence', correct: false },
        { text: 'Neither actually uses wave physics - they rely on geometric optics only', correct: false },
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
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 400;
    const metrics = calculateMetrics();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="solarSurface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="lithoSurface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={width/2} y={22} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            {mode === 'solar' ? 'Solar Cell Texturing' : 'Lithography Patterning'}
          </text>
          <text x={width/2} y={40} fill={colors.textSecondary} fontSize={12} textAnchor="middle">
            {mode === 'solar' ? 'Goal: Maximize Light Trapping' : 'Goal: Maximize Pattern Precision'}
          </text>

          {/* Axis labels */}
          <text x={12} y={height / 2 - 10} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform={`rotate(-90, 12, ${height/2})`}>
            {mode === 'solar' ? 'Intensity →' : 'Intensity →'}
          </text>
          <text x={width / 2} y={height - 2} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            {mode === 'solar' ? 'Wavelength →' : 'Wavelength →'}
          </text>

          {mode === 'solar' ? (
            <>
              {/* Solar cell textured surface */}
              <rect x={50} y={200} width={300} height={150} fill="url(#solarSurface)" />

              {/* Pyramid textures */}
              {[...Array(10)].map((_, i) => {
                const baseX = 65 + i * 30;
                const pyramidH = 20 + textureDepth * 10;
                return (
                  <polygon
                    key={i}
                    points={`${baseX},200 ${baseX + 15},${200 - pyramidH} ${baseX + 30},200`}
                    fill="#2563eb"
                    stroke="#3b82f6"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Incoming light rays */}
              {[...Array(5)].map((_, i) => {
                const startX = 80 + i * 60;
                const pyramidHeight = 20 + textureDepth * 10;
                return (
                  <g key={`ray${i}`} filter="url(#glow)">
                    {/* Primary ray */}
                    <line
                      x1={startX}
                      y1={70}
                      x2={startX + 15}
                      y2={200 - pyramidHeight}
                      stroke={colors.light}
                      strokeWidth={2}
                      opacity={0.8}
                    />
                    {/* Scattered rays */}
                    {textureDepth > 2 && (
                      <>
                        <line
                          x1={startX + 15}
                          y1={200 - pyramidHeight}
                          x2={startX + 40}
                          y2={200 - pyramidHeight + 30}
                          stroke={colors.light}
                          strokeWidth={1.5}
                          opacity={0.5}
                          strokeDasharray="3,3"
                        />
                        <line
                          x1={startX + 15}
                          y1={200 - pyramidHeight}
                          x2={startX - 10}
                          y2={200 - pyramidHeight + 40}
                          stroke={colors.light}
                          strokeWidth={1.5}
                          opacity={0.5}
                          strokeDasharray="3,3"
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Grid lines for reference */}
              <line x1={50} y1={130} x2={350} y2={130} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              <line x1={50} y1={160} x2={350} y2={160} stroke={colors.border} strokeDasharray="4 4" opacity="0.2" />
              <line x1={50} y1={90} x2={350} y2={90} stroke={colors.border} strokeDasharray="2 6" opacity="0.15" />
              {/* Absorption efficiency bar */}
              <rect x={55} y={330} width={metrics.lightTrapping * 2.9} height={12} fill={colors.solar} opacity="0.6" rx={3} />
              <rect x={55} y={330} width={290} height={12} fill="none" stroke={colors.border} strokeWidth="1" rx={3} />
              <text x={55} y={325} fill={colors.textMuted} fontSize={11}>Efficiency</text>

              {/* Metrics panel */}
              <rect x={50} y={355} width={300} height={38} fill={colors.bgCard} rx={6} />
              <text x={60} y={373} fill={colors.textSecondary} fontSize={11}>Trapping: {metrics.lightTrapping.toFixed(0)}%</text>
              <text x={170} y={373} fill={colors.textSecondary} fontSize={11}>Absorb: +{metrics.absorptionBoost.toFixed(0)}%</text>
              <text x={270} y={373} fill={colors.textSecondary} fontSize={11}>Reflect: -{metrics.reflectionReduction.toFixed(0)}%</text>

              {/* Good indicator */}
              <text x={width/2} y={80} fill={colors.success} fontSize={12} textAnchor="middle" filter="url(#glow)">
                More scattering = GOOD for solar
              </text>
              {/* White highlight label */}
              <text x={width/2} y={58} fill="white" fontSize={11} textAnchor="middle" opacity="0.6">
                Incoming Photons
              </text>
              {/* Photon dots with animation */}
              <circle cx={100} cy={100} r={4} fill={colors.light} opacity={0.7}>
                <animate attributeName="cy" values="100;110;100" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={200} cy={95} r={4} fill={colors.light} opacity={0.7}>
                <animate attributeName="cy" values="95;105;95" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={300} cy={102} r={4} fill={colors.light} opacity={0.7}>
                <animate attributeName="cy" values="102;112;102" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </>
          ) : (
            <>
              {/* Lithography setup */}
              <rect x={50} y={250} width={300} height={100} fill="url(#lithoSurface)" />

              {/* Mask pattern */}
              <rect x={100} y={120} width={200} height={20} fill="#1e1b4b" stroke="#6366f1" strokeWidth={2} />
              {[...Array(5)].map((_, i) => (
                <rect key={i} x={110 + i * 40} y={120} width={20} height={20} fill="transparent" stroke="#a855f7" strokeWidth={1} />
              ))}
              <text x={200} y={115} fill={colors.textMuted} fontSize={11} textAnchor="middle">Mask Pattern</text>

              {/* Light cone from lens */}
              <polygon
                points="200,145 120,220 280,220"
                fill={wavelength < 100 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(250, 204, 21, 0.3)'}
                stroke={wavelength < 100 ? colors.euv : colors.light}
                strokeWidth={1}
              />

              {/* Projected pattern with blur based on wavelength */}
              {[...Array(5)].map((_, i) => {
                const blur = metrics.diffractionBlur;
                const baseX = 110 + i * 40;
                return (
                  <rect
                    key={i}
                    x={baseX - blur}
                    y={250}
                    width={20 + blur * 2}
                    height={30}
                    fill={metrics.canPrint ? '#a855f7' : '#ef4444'}
                    opacity={0.7}
                    rx={blur}
                  />
                );
              })}

              {/* Grid lines for reference */}
              <line x1={50} y1={200} x2={350} y2={200} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              <line x1={50} y1={230} x2={350} y2={230} stroke={colors.border} strokeDasharray="4 4" opacity="0.2" />

              {/* Edge sharpness indicator */}
              <text x={width/2} y={305} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
                Edge Sharpness: {metrics.edgeSharpness.toFixed(0)}%
              </text>

              {/* Metrics panel */}
              <rect x={50} y={355} width={300} height={38} fill={colors.bgCard} rx={6} />
              <text x={60} y={373} fill={colors.textSecondary} fontSize={11}>Wavelength: {wavelength}nm</text>
              <text x={165} y={373} fill={colors.textSecondary} fontSize={11}>Res: {(metrics.resolutionLimit/100).toFixed(1)}nm</text>
              <text x={275} y={373} fill={metrics.canPrint ? colors.success : colors.error} fontSize={11}>
                {metrics.canPrint ? 'Sharp' : 'Blurred'}
              </text>

              {/* Good indicator */}
              <text x={width/2} y={80} fill={colors.success} fontSize={12} textAnchor="middle" filter="url(#glow)">
                Less diffraction = GOOD for litho
              </text>
            </>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setMode('solar')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: mode === 'solar' ? `2px solid ${colors.solar}` : '1px solid rgba(255,255,255,0.2)',
                background: mode === 'solar' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: colors.solar,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              Solar Texturing
            </button>
            <button
              onClick={() => setMode('litho')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: mode === 'litho' ? `2px solid ${colors.litho}` : '1px solid rgba(255,255,255,0.2)',
                background: mode === 'litho' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.litho,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              Lithography
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {mode === 'solar' ? (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
            Texture Depth: {textureDepth} micrometers
          </label>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '8px', fontWeight: 400 }}>
            Controls how deeply light penetrates the pyramid structures — deeper textures trap more photons
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={textureDepth}
            onChange={(e) => setTextureDepth(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: colors.accent,
              WebkitAppearance: 'none',
              appearance: 'none',
              touchAction: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: colors.textMuted, fontSize: '11px' }}>Shallow (more reflection)</span>
            <span style={{ color: colors.textMuted, fontSize: '11px' }}>Deep (more trapping)</span>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Light Wavelength: {wavelength}nm {wavelength < 100 ? '(EUV)' : wavelength < 300 ? '(DUV)' : '(Visible)'}
            </label>
            <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '8px', fontWeight: 400 }}>
              Controls minimum feature size — shorter wavelength allows smaller, sharper transistor patterns
            </div>
            <input
              type="range"
              min="13"
              max="700"
              step="1"
              value={wavelength}
              onChange={(e) => setWavelength(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: colors.accent,
                WebkitAppearance: 'none',
                appearance: 'none',
                touchAction: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ color: colors.euv, fontSize: '11px' }}>13.5nm EUV</span>
              <span style={{ color: colors.visible, fontSize: '11px' }}>700nm Visible</span>
            </div>
          </div>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Target Feature Size: {featureSize}nm
            </label>
            <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '8px', fontWeight: 400 }}>
              Controls the transistor dimension — must be larger than ~half the wavelength to print successfully
            </div>
            <input
              type="range"
              min="3"
              max="100"
              step="1"
              value={featureSize}
              onChange={(e) => setFeatureSize(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: colors.accent,
                WebkitAppearance: 'none',
                appearance: 'none',
                touchAction: 'none',
              }}
            />
          </div>
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 500 }}>
          {mode === 'solar'
            ? 'When you increase texture depth, scattering increases and absorption boosts. Real-world solar panels use 5-8 micrometer pyramids for optimal trapping.'
            : 'When wavelength decreases, resolution limit drops, enabling sharper features. EUV at 13.5nm enables sub-10nm transistors — impossible with visible light.'}
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
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
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease-in-out',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 500, color: colors.textSecondary }}>
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

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 500,
            fontSize: '14px',
            backgroundColor: colors.bgDark,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 400
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!canGoNext) return;
            if (onNext) {
              onNext();
            } else {
              goNext();
            }
          }}
          disabled={!canGoNext}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : colors.bgDark,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            transition: 'all 0.2s ease-in-out',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
              Texturing vs Lithography
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '8px', fontWeight: 400 }}>
              Can the same physics help both chips and solar?
            </p>
            <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '14px', marginBottom: '16px', fontWeight: 400 }}>
              Discover how wave optics drives two opposite engineering goals
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
              <p style={{ color: '#f1f5f9', fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Both solar cells and computer chips manipulate light with silicon surfaces.
                But they want completely different outcomes! Solar cells want to trap every
                photon, while lithography needs razor-sharp patterns.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 500 }}>
                Toggle between modes to see how the same wave physics produces opposite goals!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Predicting')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 600 }}>
              How do solar texturing and lithography differ in their goals?
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
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease-in-out',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore Both Modes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Compare solar texturing with lithography patterning
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
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, fontWeight: 400, marginBottom: '12px' }}>
              These two technologies represent a $500B+ industry. Solar texturing powers the renewable energy revolution;
              lithography enables Moore's Law and every smartphone, AI chip, and server. Understanding their opposing
              physics helps engineers design better systems for both.
            </p>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
              <li>Solar mode: Increase texture depth — watch scattering increase as pyramids grow</li>
              <li>Litho mode: Decrease wavelength — see resolution improve dramatically</li>
              <li>Try to print 7nm features with visible light (550nm) vs EUV (13.5nm)</li>
              <li>Notice how optimization goals are completely opposite!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'opposite';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
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
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              {prediction ? `You predicted: "${predictions.find(p => p.id === prediction)?.label}" — ` : ''}
              As you observed in the simulation, they want opposite things! Solar texturing maximizes scattering to trap light,
              while lithography minimizes scattering to create sharp patterns.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Same Physics, Opposite Goals</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.solar }}>Solar Texturing:</strong> Random pyramids
                cause light to bounce multiple times. Each bounce = another chance for absorption.
                More scattering = better efficiency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.litho }}>Lithography:</strong> Precise patterns require
                light to travel in straight lines. Any scattering blurs the edges. Less scattering
                = sharper features.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Physics:</strong> Both use diffraction
                and wave optics. The difference is whether scattering helps or hurts your goal.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>The Twist</h2>
            <p style={{ color: colors.textSecondary, fontWeight: 400 }}>
              How does wavelength affect each application?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 600 }}>
              What wavelengths work best for solar vs lithography?
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
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease-in-out',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Wavelength Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Compare EUV (13.5nm) to visible light (550nm) in lithography
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
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              EUV at 13.5nm can print 7nm features. Visible light at 550nm cannot - the wavelength
              is too long! Solar cells happily use visible light because they dont need precision.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'litho_short';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
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
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              Modern lithography uses EUV (13.5nm) to print transistors smaller than 10nm.
              Solar cells use the full visible spectrum - wavelength precision doesnt matter.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Wavelength and Resolution</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Rayleigh Criterion:</strong> You cannot
                resolve features smaller than about half the wavelength. This fundamental limit
                drove the move from visible light to EUV.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.euv }}>EUV Revolution:</strong> At 13.5nm, EUV can
                print features below 10nm. But it requires vacuum, special mirrors, and costs
                over $100 million per machine!
              </p>
              <p>
                <strong style={{ color: colors.visible }}>Solar Flexibility:</strong> Solar cells
                work across 400-1100nm. They dont care about wavelength precision - just total
                photon absorption.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
              Real-World Applications
            </h2>
            <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '12px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
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
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 600 }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success, fontWeight: 500 }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 600 }}>{app.question}</p>
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
                    fontWeight: 500,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Got It — Show Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(true, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 700 }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 600 }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontWeight: opt.correct || userAnswer === oIndex ? 500 : 400 }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => {
            setTestSubmitted(false);
            setTestAnswers(new Array(10).fill(null));
            setCurrentTestQuestion(0);
          })}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 500 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 400 }}>{currentQ.question}</p>
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
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease-in-out',
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
                fontWeight: 500,
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease-in-out',
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
                  fontWeight: 600,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Next Question
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
                  fontWeight: 600,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease-in-out',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Achievement</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 400 }}>
              You understand wave physics in solar texturing and lithography
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
              <li>Solar texturing maximizes light scattering for absorption</li>
              <li>Lithography minimizes scattering for sharp patterns</li>
              <li>Shorter wavelengths enable smaller features (Rayleigh criterion)</li>
              <li>EUV lithography uses 13.5nm light for sub-10nm transistors</li>
              <li>Same wave physics, completely opposite optimization goals</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TexturingVsLithographyRenderer;
