'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
  {
    icon: '💻',
    title: 'Processor Manufacturing',
    short: 'EUV lithography enables 3nm transistors',
    tagline: 'Printing circuits smaller than viruses',
    description: 'Modern processor manufacturing uses extreme ultraviolet (EUV) lithography with 13.5nm wavelength light to pattern transistors at 3nm and below. This enables billions of transistors on a single chip.',
    connection: 'The Rayleigh criterion limits resolution to approximately half the wavelength. EUV\'s short wavelength enables much finer features than traditional DUV (193nm) lithography.',
    howItWorks: 'EUV light is produced by hitting tin droplets with a laser. Mirrors collect the light and project circuit patterns through masks onto silicon wafers coated with photoresist.',
    stats: [
      { value: '13.5', label: 'nm EUV wavelength', icon: '🔬' },
      { value: '$150M', label: 'per EUV tool', icon: '💰' },
      { value: '100B', label: 'transistors per chip', icon: '⚡' }
    ],
    examples: ['Apple M3 chips', 'AMD Ryzen 7000', 'Intel Core Ultra', 'NVIDIA H100'],
    companies: ['ASML', 'TSMC', 'Samsung', 'Intel'],
    futureImpact: 'High-NA EUV will enable 2nm and beyond, continuing Moore\'s Law for another decade.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'Smartphone Chips',
    short: 'Mobile processors rely on advanced lithography',
    tagline: 'Pocket supercomputers from light patterns',
    description: 'The processor in your smartphone contains billions of transistors fabricated using cutting-edge lithography. Each transistor is smaller than a coronavirus, yet they work reliably for years.',
    connection: 'Multiple patterning techniques allow printing features smaller than the lithography wavelength by exposing patterns in multiple steps that interleave.',
    howItWorks: 'Self-aligned multiple patterning uses spacer deposition to subdivide patterns. EUV simplifies this by enabling single-exposure patterning at the finest pitches.',
    stats: [
      { value: '3nm', label: 'process node', icon: '📏' },
      { value: '15B', label: 'transistors (A17)', icon: '🔢' },
      { value: '$580B', label: 'semiconductor market', icon: '📈' }
    ],
    examples: ['Apple A17 Pro', 'Qualcomm Snapdragon 8 Gen 3', 'MediaTek Dimensity 9300', 'Samsung Exynos'],
    companies: ['Apple', 'Qualcomm', 'MediaTek', 'Samsung'],
    futureImpact: 'Continued scaling will enable AI capabilities currently requiring data center GPUs to run on mobile devices.',
    color: '#22C55E'
  },
  {
    icon: '🔬',
    title: 'Memory Chip Fabrication',
    short: 'High-density storage through lithography',
    tagline: 'Trillions of bits in your pocket',
    description: 'Flash memory and DRAM chips use lithography to create incredibly dense storage cells. 3D NAND stacks hundreds of layers of storage cells, each patterned with lithography.',
    connection: 'Memory density depends on how small each cell can be patterned. Advanced lithography enables terabit-scale storage on a single chip.',
    howItWorks: 'DRAM uses capacitors patterned at the tightest pitches. 3D NAND stacks cells vertically after patterning, multiplying density without requiring finer lithography.',
    stats: [
      { value: '200+', label: 'NAND layers', icon: '📚' },
      { value: '1Tb', label: 'per NAND die', icon: '💾' },
      { value: '$150B', label: 'memory market', icon: '📈' }
    ],
    examples: ['Samsung V-NAND', 'SK Hynix NAND', 'Micron DRAM', 'Western Digital BiCS'],
    companies: ['Samsung', 'SK Hynix', 'Micron', 'Kioxia'],
    futureImpact: 'Advanced lithography and 3D stacking will enable 100+ TB SSDs by 2030.',
    color: '#06B6D4'
  },
  {
    icon: '🌐',
    title: 'Advanced Packaging',
    short: 'Chiplets connected through lithographed interconnects',
    tagline: 'Beyond single-chip limits',
    description: 'Modern processors combine multiple chiplets using advanced packaging with lithographed silicon interposers and bridges. This enables combining different manufacturing processes on one package.',
    connection: 'Packaging lithography creates fine-pitch interconnects between chiplets. While less demanding than transistor lithography, it still requires nanometer-scale precision.',
    howItWorks: 'Silicon interposers are patterned with fine-pitch wiring. Through-silicon vias connect layers. Hybrid bonding achieves micron-scale chip-to-chip connections.',
    stats: [
      { value: '10μm', label: 'interconnect pitch', icon: '📏' },
      { value: '1000+', label: 'I/O per mm²', icon: '🔌' },
      { value: '$45B', label: 'packaging market', icon: '📈' }
    ],
    examples: ['AMD 3D V-Cache', 'Intel Foveros', 'TSMC CoWoS', 'Samsung I-Cube'],
    companies: ['TSMC', 'Intel', 'ASE', 'Amkor'],
    futureImpact: 'Chiplet architectures will dominate high-performance computing, enabled by advanced packaging lithography.',
    color: '#F59E0B'
  }
];

// ============================================================================
// GAME 183: PHOTOLITHOGRAPHY RESOLUTION
// ============================================================================
// Physics: Rayleigh criterion limits resolution to ~wavelength/2
// EUV (13.5nm) enables smaller features than DUV (193nm)
// Multiple patterning techniques overcome the diffraction limit
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PhotolithographyRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  uv: '#8b5cf6',
  euv: '#06b6d4',
  photoresist: '#f97316',
  silicon: '#475569',
  border: '#334155',
};

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Patterning',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const PhotolithographyRenderer: React.FC<PhotolithographyRendererProps> = ({
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

  // Responsive design
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

  // Simulation state
  const [wavelength, setWavelength] = useState(193); // nm (DUV default)
  const [numericalAperture, setNumericalAperture] = useState(1.35); // NA
  const [k1Factor, setK1Factor] = useState(0.4); // process factor
  const [useMultiplePatterning, setUseMultiplePatterning] = useState(false);
  const [patterningSteps, setPatterningSteps] = useState(1);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set([0]));
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations
  const calculateResolution = useCallback(() => {
    // Rayleigh criterion: Resolution = k1 * wavelength / NA
    const baseResolution = k1Factor * wavelength / numericalAperture;

    // Multiple patterning divides the pitch
    const effectiveResolution = useMultiplePatterning ? baseResolution / patterningSteps : baseResolution;

    // Theoretical minimum (diffraction limit)
    const diffractionLimit = wavelength / (2 * numericalAperture);

    // Depth of focus: DOF = k2 * wavelength / NA^2
    const depthOfFocus = 0.5 * wavelength / Math.pow(numericalAperture, 2);

    // Cost estimate (relative, EUV is much more expensive)
    let costFactor = 1;
    if (wavelength <= 13.5) costFactor = 10; // EUV
    if (useMultiplePatterning) costFactor *= patterningSteps * 1.5;

    // Process node achievable
    const processNode = Math.round(effectiveResolution * 0.7);

    return {
      baseResolution,
      effectiveResolution,
      diffractionLimit,
      depthOfFocus,
      costFactor,
      processNode,
      isEUV: wavelength <= 13.5,
      isDUV: wavelength > 13.5 && wavelength < 300,
      canReach7nm: effectiveResolution < 15,
      canReach5nm: effectiveResolution < 10,
    };
  }, [wavelength, numericalAperture, k1Factor, useMultiplePatterning, patterningSteps]);

  const predictions = [
    { id: 'no_limit', label: 'There is no fundamental limit - just make the lenses better' },
    { id: 'wavelength', label: 'Features cannot be smaller than the wavelength of light used' },
    { id: 'half_wavelength', label: 'The limit is roughly half the wavelength (diffraction limit)' },
    { id: 'tenth_wavelength', label: 'Advanced optics can print features 1/10th the wavelength' },
  ];

  const twistPredictions = [
    { id: 'impossible', label: 'It is physically impossible to print features smaller than wavelength' },
    { id: 'euv_only', label: 'You must switch to shorter wavelength EUV light (13.5nm)' },
    { id: 'multiple', label: 'Multiple patterning can effectively beat the diffraction limit' },
    { id: 'quantum', label: 'Quantum effects allow printing at any size' },
  ];

  const transferApplications = [
    {
      title: 'ASML EUV Machines',
      description: 'ASML is the only company making EUV lithography machines, which cost over $150 million each and are essential for cutting-edge chips.',
      question: 'Why is EUV lithography so expensive and complex?',
      answer: 'EUV light (13.5nm) is absorbed by everything including air, requiring the entire optical path to be in vacuum. The light source uses tin droplets hit by lasers, producing only 250W of usable light. Mirrors must be atomically perfect with 40+ coating layers.',
    },
    {
      title: 'Moore\'s Law Economics',
      description: 'Each new process node costs billions more in fab construction. A leading-edge fab now costs $20+ billion to build.',
      question: 'Why does each smaller node cost exponentially more?',
      answer: 'Smaller features require more precise equipment, cleaner environments, and more processing steps. Multiple patterning multiplies mask costs. EUV machines are scarce. Yields are lower initially. The economics now limit who can afford leading-edge manufacturing.',
    },
    {
      title: 'Computational Lithography',
      description: 'Modern chips require "optical proximity correction" where mask shapes are deliberately distorted to produce the desired pattern after diffraction.',
      question: 'Why do mask patterns not match the final chip patterns?',
      answer: 'Diffraction and interference cause patterns to blur and interact. OPC (Optical Proximity Correction) pre-distorts mask features so that after all optical effects, the final pattern is correct. This requires massive computation for each mask layer.',
    },
    {
      title: 'Immersion Lithography',
      description: 'DUV lithography uses water between the lens and wafer (immersion) to increase the effective numerical aperture beyond 1.0.',
      question: 'How does water improve lithography resolution?',
      answer: 'Light slows down in water (n=1.44), effectively reducing wavelength. This increases NA beyond 1.0 (impossible in air) to ~1.35. The shorter effective wavelength and higher NA both improve resolution per the Rayleigh equation.',
    },
  ];

  const testQuestions = [
    {
      question: 'A semiconductor fab is planning to upgrade their lithography equipment and wants to calculate the minimum feature size they can achieve. Their new lithography system uses 193nm ArF DUV light with a numerical aperture NA=1.35 (immersion) and a process k1 factor of 0.4. What is the correct Rayleigh criterion formula they should use to calculate the resolution limit?',
      options: [
        { text: 'Resolution = wavelength x NA', correct: false },
        { text: 'Resolution = k1 x wavelength / NA', correct: true },
        { text: 'Resolution = wavelength / 2', correct: false },
        { text: 'Resolution = NA / wavelength', correct: false },
      ],
    },
    {
      question: 'In the 1990s, chip manufacturers transitioned from KrF (248nm) to ArF (193nm) lithography tools despite the massive cost of retooling entire fabs. Why did the industry move from 248nm to 193nm DUV light?',
      options: [
        { text: 'It was cheaper to produce', correct: false },
        { text: 'Shorter wavelength enables smaller feature sizes', correct: true },
        { text: 'It produces brighter light', correct: false },
        { text: 'It works better with silicon', correct: false },
      ],
    },
    {
      question: 'TSMC and Samsung invested billions in ASML\'s most advanced lithography machines for their 3nm and 2nm nodes. What is the wavelength of EUV light used in these advanced lithography systems?',
      options: [
        { text: '193nm', correct: false },
        { text: '50nm', correct: false },
        { text: '13.5nm', correct: true },
        { text: '1nm', correct: false },
      ],
    },
    {
      question: 'Intel and TSMC use "immersion lithography" where purified water fills the gap between the final lens and the silicon wafer during exposure. How does immersion lithography improve resolution?',
      options: [
        { text: 'Water cools the wafer allowing higher power', correct: false },
        { text: 'Water between lens and wafer increases effective NA', correct: true },
        { text: 'Water filters out unwanted wavelengths', correct: false },
        { text: 'Water acts as a secondary lens', correct: false },
      ],
    },
    {
      question: 'Before EUV became available, foundries had to print 14nm and 10nm features using 193nm DUV light—features far smaller than the theoretical single-exposure limit. What technique did they use called "multiple patterning"?',
      options: [
        { text: 'Printing multiple chips at once', correct: false },
        { text: 'Using multiple exposures to create features smaller than single-exposure limit', correct: true },
        { text: 'Stacking multiple wafers', correct: false },
        { text: 'Using multiple colors of light simultaneously', correct: false },
      ],
    },
    {
      question: 'ASML\'s EUV machines require the entire beam path from light source to wafer to operate in vacuum, adding enormous complexity and cost. Why is EUV lithography performed in vacuum?',
      options: [
        { text: 'To prevent wafer contamination', correct: false },
        { text: 'EUV light is absorbed by air', correct: true },
        { text: 'To improve heat dissipation', correct: false },
        { text: 'To reduce vibration', correct: false },
      ],
    },
    {
      question: 'When spec\'ing a lithography system, engineers evaluate the "numerical aperture" (NA) as a key performance metric that directly affects achievable resolution. What is numerical aperture (NA) in lithography?',
      options: [
        { text: 'The number of lenses in the system', correct: false },
        { text: 'A measure of light-gathering ability related to acceptance angle', correct: true },
        { text: 'The aperture size in millimeters', correct: false },
        { text: 'The number of exposure steps', correct: false },
      ],
    },
    {
      question: 'Modern photomask patterns look bizarre—with extra shapes, serifs, and corrections that don\'t match the final desired circuit pattern. Computational lithography software deliberately distorts the mask design. Why do modern masks require Optical Proximity Correction (OPC)?',
      options: [
        { text: 'To correct for lens aberrations only', correct: false },
        { text: 'To pre-distort patterns to account for diffraction effects', correct: true },
        { text: 'To make masks easier to manufacture', correct: false },
        { text: 'To reduce the cost of masks', correct: false },
      ],
    },
    {
      question: 'In theory, the k1 factor in the Rayleigh equation can be pushed toward 0.25 or even lower for ultimate resolution. However, real fabs typically operate around k1=0.35-0.4. What limits how small k1 factor can be in practice?',
      options: [
        { text: 'The speed of the exposure system', correct: false },
        { text: 'Process complexity and yield considerations', correct: true },
        { text: 'The wavelength of light used', correct: false },
        { text: 'The size of the wafer', correct: false },
      ],
    },
    {
      question: 'ASML is the only company in the world that manufactures EUV lithography equipment. Each machine is the size of a bus, weighs 180 tons, and contains over 100,000 parts. Approximately how much does an ASML EUV lithography machine cost?',
      options: [
        { text: '$1 million', correct: false },
        { text: '$10 million', correct: false },
        { text: '$150+ million', correct: true },
        { text: '$1 billion', correct: false },
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
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 500;
    const output = calculateResolution();

    // Pattern visualization
    const featureWidth = Math.max(2, output.effectiveResolution / 5);
    const numFeatures = Math.floor(180 / (featureWidth * 2));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          {/* ============================================ */}
          {/* PREMIUM DEFS SECTION - Gradients & Filters */}
          {/* ============================================ */}
          <defs>
            {/* Premium dark lab background gradient */}
            <linearGradient id="phlithLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* UV Light Source Gradient - DUV (violet) */}
            <linearGradient id="phlithDUVSource" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="25%" stopColor="#9333ea" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="75%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>

            {/* EUV Light Source Gradient (cyan) */}
            <linearGradient id="phlithEUVSource" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="75%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#155e75" />
            </linearGradient>

            {/* UV Beam Radial Glow - DUV */}
            <radialGradient id="phlithDUVGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
              <stop offset="30%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>

            {/* UV Beam Radial Glow - EUV */}
            <radialGradient id="phlithEUVGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Premium lens glass gradient with depth */}
            <linearGradient id="phlithLensGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="80%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3" />
            </linearGradient>

            {/* Lens edge highlight */}
            <linearGradient id="phlithLensEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
            </linearGradient>

            {/* Mask chrome gradient with brushed metal effect */}
            <linearGradient id="phlithMaskChrome" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="15%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="85%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Mask glass substrate */}
            <linearGradient id="phlithMaskGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </linearGradient>

            {/* Silicon wafer gradient with realistic depth */}
            <linearGradient id="phlithSiliconWafer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Photoresist layer gradient */}
            <linearGradient id="phlithPhotoresist" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="30%" stopColor="#fb923c" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>

            {/* Exposed photoresist (developed areas) */}
            <linearGradient id="phlithExposedResist" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Housing metal gradient */}
            <linearGradient id="phlithHousingMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Control panel gradient */}
            <linearGradient id="phlithControlPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* UV Beam linear gradient for exposure visualization */}
            <linearGradient id="phlithUVBeamDUV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
              <stop offset="20%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="phlithUVBeamEUV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="20%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>

            {/* Power indicator glow */}
            <radialGradient id="phlithPowerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter for UV light effect */}
            <filter id="phlithUVGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow filter for general use */}
            <filter id="phlithSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow filter for beam core */}
            <filter id="phlithIntenseGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow filter for depth */}
            <filter id="phlithInnerShadow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Lab grid pattern */}
            <pattern id="phlithLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ============================================ */}
          {/* BACKGROUND */}
          {/* ============================================ */}
          <rect width={width} height={height} fill="url(#phlithLabBg)" />
          <rect width={width} height={height} fill="url(#phlithLabGrid)" />

          {/* ============================================ */}
          {/* PREMIUM UV LIGHT SOURCE */}
          {/* ============================================ */}
          <g transform="translate(50, 35)">
            {/* Housing */}
            <rect x={0} y={0} width={90} height={45} rx={6} fill="url(#phlithHousingMetal)" stroke="#475569" strokeWidth="1" />
            <rect x={3} y={3} width={84} height={39} rx={5} fill="#111827" opacity="0.5" />

            {/* Light source window */}
            <rect x={10} y={8} width={70} height={30} rx={4} fill={output.isEUV ? 'url(#phlithEUVSource)' : 'url(#phlithDUVSource)'} />

            {/* Glowing core */}
            <ellipse cx={45} cy={23} rx={25} ry={10} fill={output.isEUV ? 'url(#phlithEUVGlow)' : 'url(#phlithDUVGlow)'} filter="url(#phlithUVGlow)">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite" />
            </ellipse>

            {/* Source label */}
            <text x={45} y={27} fill="white" fontSize={11} textAnchor="middle" fontWeight="bold" fontFamily="system-ui, sans-serif">
              {output.isEUV ? 'EUV' : 'DUV'}
            </text>

            {/* Power indicator */}
            <circle cx={85} cy={10} r={4} fill="url(#phlithPowerGlow)" filter="url(#phlithSoftGlow)">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x={45} y={400} transform="translate(0,-407)" fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600">
              LIGHT SOURCE
            </text>
          </g>

          {/* Wavelength indicator */}
          <g transform="translate(150, 45)">
            <rect x={0} y={0} width={60} height={20} rx={4} fill="#111827" stroke="#334155" strokeWidth="0.5" />
            <text x={30} y={14} fill={output.isEUV ? colors.euv : colors.uv} fontSize={11} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {'\u03BB'}={wavelength}nm
            </text>
          </g>

          {/* ============================================ */}
          {/* UV EXPOSURE BEAM VISUALIZATION */}
          {/* ============================================ */}
          <g>
            {/* Main beam from source to mask */}
            <rect x={70} y={80} width={50} height={30} fill={output.isEUV ? 'url(#phlithUVBeamEUV)' : 'url(#phlithUVBeamDUV)'} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.2s" repeatCount="indefinite" />
            </rect>

            {/* Animated beam particles */}
            {[...Array(6)].map((_, i) => (
              <circle
                key={i}
                cx={75 + i * 8}
                r={2}
                fill={output.isEUV ? '#67e8f9' : '#c084fc'}
                filter="url(#phlithSoftGlow)"
              >
                <animate
                  attributeName="cy"
                  values="82;108;82"
                  dur="0.8s"
                  repeatCount="indefinite"
                  begin={`${i * 0.1}s`}
                />
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  dur="0.8s"
                  repeatCount="indefinite"
                  begin={`${i * 0.1}s`}
                />
              </circle>
            ))}
          </g>

          {/* ============================================ */}
          {/* PREMIUM PHOTOMASK */}
          {/* ============================================ */}
          <g transform="translate(30, 110)">
            {/* Mask frame */}
            <rect x={0} y={0} width={200} height={32} rx={4} fill="url(#phlithHousingMetal)" stroke="#4b5563" strokeWidth="1" />

            {/* Mask glass substrate */}
            <rect x={5} y={4} width={190} height={24} rx={2} fill="url(#phlithMaskGlass)" />

            {/* Chrome pattern layer (mask absorber pattern) */}
            <g>
              {[...Array(9)].map((_, i) => (
                <rect
                  key={i}
                  x={15 + i * 20}
                  y={6}
                  width={10}
                  height={20}
                  fill={i % 2 === 0 ? 'url(#phlithMaskChrome)' : 'transparent'}
                  rx={1}
                />
              ))}
            </g>

            {/* Mask edge highlights */}
            <line x1={5} y1={4} x2={195} y2={4} stroke="#6b7280" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1={5} y1={28} x2={195} y2={28} stroke="#1f2937" strokeWidth="0.5" />

            {/* Label */}
            <text x={100} y={450} transform="translate(0,-458)" fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600">
              PHOTOMASK (RETICLE)
            </text>
          </g>

          {/* ============================================ */}
          {/* PREMIUM LENS SYSTEM */}
          {/* ============================================ */}
          <g transform="translate(250, 50)">
            {/* Lens housing */}
            <rect x={-15} y={0} width={90} height={105} rx={6} fill="url(#phlithHousingMetal)" stroke="#475569" strokeWidth="1" />
            <rect x={-12} y={3} width={84} height={99} rx={5} fill="#0f172a" opacity="0.4" />

            {/* Upper condenser lens */}
            <ellipse cx={30} cy={25} rx={28} ry={12} fill="url(#phlithLensGlass)" stroke="url(#phlithLensEdge)" strokeWidth="1.5" />
            <ellipse cx={30} cy={25} rx={24} ry={9} fill="none" stroke="#93c5fd" strokeWidth="0.5" strokeOpacity="0.4" />

            {/* Middle projection lens (larger) */}
            <ellipse cx={30} cy={55} rx={32} ry={14} fill="url(#phlithLensGlass)" stroke="url(#phlithLensEdge)" strokeWidth="1.5" />
            <ellipse cx={30} cy={55} rx={28} ry={11} fill="none" stroke="#93c5fd" strokeWidth="0.5" strokeOpacity="0.4" />

            {/* Lower objective lens */}
            <ellipse cx={30} cy={85} rx={26} ry={11} fill="url(#phlithLensGlass)" stroke="url(#phlithLensEdge)" strokeWidth="1.5" />
            <ellipse cx={30} cy={85} rx={22} ry={8} fill="none" stroke="#93c5fd" strokeWidth="0.5" strokeOpacity="0.4" />

            {/* Light path through lenses */}
            <path
              d={`M30,5 L30,38 L10,70 L50,70 L30,38 L30,140`}
              fill="none"
              stroke={output.isEUV ? colors.euv : colors.uv}
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="3 2"
            />

            {/* NA indicator */}
            <rect x={68} y={45} width={50} height={20} rx={4} fill="#111827" stroke="#334155" strokeWidth="0.5" />
            <text x={93} y={250} transform="translate(0,-192)" fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontFamily="monospace">
              NA={numericalAperture.toFixed(2)}
            </text>

            {/* Label */}
            <text x={30} y={505} transform="translate(0,-515)" fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600">
              PROJECTION OPTICS
            </text>
          </g>

          {/* ============================================ */}
          {/* UV BEAM FROM LENS TO WAFER */}
          {/* ============================================ */}
          <g>
            {/* Converging beam visualization */}
            <polygon
              points="280,155 250,175 310,175"
              fill={output.isEUV ? 'url(#phlithUVBeamEUV)' : 'url(#phlithUVBeamDUV)'}
              opacity="0.4"
            >
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1s" repeatCount="indefinite" />
            </polygon>

            {/* Pattern projection beams through mask openings */}
            {[...Array(5)].map((_, i) => {
              const startX = 50 + i * 40;
              const endX = 70 + i * 35;
              return (
                <line
                  key={i}
                  x1={startX}
                  y1={142}
                  x2={endX}
                  y2={195}
                  stroke={output.isEUV ? colors.euv : colors.uv}
                  strokeWidth="2"
                  strokeOpacity="0.3"
                  filter="url(#phlithSoftGlow)"
                >
                  <animate
                    attributeName="strokeOpacity"
                    values="0.2;0.5;0.2"
                    dur="0.6s"
                    repeatCount="indefinite"
                    begin={`${i * 0.1}s`}
                  />
                </line>
              );
            })}
          </g>

          {/* ============================================ */}
          {/* PREMIUM WAFER WITH PHOTORESIST */}
          {/* ============================================ */}
          <g transform="translate(50, 210)">
            {/* Stage/chuck */}
            <rect x={-15} y={55} width={230} height={20} rx={4} fill="url(#phlithHousingMetal)" stroke="#334155" strokeWidth="1" />
            <rect x={-12} y={58} width={224} height={14} rx={3} fill="#111827" opacity="0.5" />

            {/* Silicon wafer substrate */}
            <rect x={0} y={30} width={200} height={30} rx={3} fill="url(#phlithSiliconWafer)" />
            <rect x={2} y={32} width={196} height={2} fill="#94a3b8" opacity="0.3" />

            {/* Photoresist layer */}
            <rect x={0} y={8} width={200} height={22} rx={2} fill="url(#phlithPhotoresist)" />

            {/* Exposed pattern on photoresist */}
            {[...Array(numFeatures)].map((_, i) => {
              const x = 10 + i * featureWidth * 2.2;
              const blurAmount = output.effectiveResolution > 40 ? 1 : 0;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={10}
                    width={Math.max(2, featureWidth)}
                    height={18}
                    fill="url(#phlithExposedResist)"
                    rx={1}
                    style={{ filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none' }}
                  />
                  {/* Pattern highlight */}
                  <line
                    x1={x}
                    y1={10}
                    x2={x + Math.max(2, featureWidth)}
                    y2={10}
                    stroke={output.isEUV ? colors.euv : colors.uv}
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                </g>
              );
            })}

            {/* Resolution indicator */}
            <g transform="translate(10, -15)">
              <line x1={0} y1={0} x2={Math.max(8, featureWidth)} y2={0} stroke={colors.accent} strokeWidth="2" />
              <line x1={0} y1={-3} x2={0} y2={3} stroke={colors.accent} strokeWidth="1" />
              <line x1={Math.max(8, featureWidth)} y1={-3} x2={Math.max(8, featureWidth)} y2={3} stroke={colors.accent} strokeWidth="1" />
              <text x={Math.max(8, featureWidth) / 2} y={300} transform="translate(0,-306)" fill={colors.accent} fontSize={11} textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                {output.effectiveResolution.toFixed(0)}nm
              </text>
            </g>

            {/* Labels */}
            <text x={100} y={-28} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600">
              WAFER WITH PHOTORESIST
            </text>
            <text x={220} y={170} transform="translate(0,-152)" fill={colors.photoresist} fontSize={11} fontFamily="system-ui, sans-serif">Photoresist</text>
            <text x={220} y={185} transform="translate(0,-137)" fill={colors.silicon} fontSize={11} fontFamily="system-ui, sans-serif">Silicon</text>
          </g>

          {/* ============================================ */}
          {/* MULTIPLE PATTERNING INDICATOR */}
          {/* ============================================ */}
          {useMultiplePatterning && (
            <g transform="translate(370, 100)">
              <rect x={0} y={0} width={110} height={70} rx={8} fill="rgba(245, 158, 11, 0.15)" stroke={colors.accent} strokeWidth="1" strokeOpacity="0.5" />
              <rect x={3} y={3} width={104} height={64} rx={6} fill="rgba(0,0,0,0.3)" />

              <text x={55} y={22} fill={colors.accent} fontSize={11} textAnchor="middle" fontWeight="bold" fontFamily="system-ui, sans-serif">
                MULTI-PATTERN
              </text>
              <text x={55} y={40} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontFamily="system-ui, sans-serif">
                {patterningSteps}x exposures
              </text>
              <text x={55} y={58} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontFamily="system-ui, sans-serif">
                Cost: {output.costFactor.toFixed(1)}x
              </text>
            </g>
          )}

          {/* ============================================ */}
          {/* METRICS PANEL */}
          {/* ============================================ */}
          <g transform="translate(20, 345)">
            <rect x={0} y={0} width={460} height={135} rx={8} fill="url(#phlithControlPanel)" stroke="#334155" strokeWidth="1" />
            <rect x={2} y={2} width={456} height={131} rx={7} fill="rgba(0,0,0,0.2)" />

            {/* Panel title */}
            <text x={230} y={24} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold" fontFamily="system-ui, sans-serif">
              SYSTEM PARAMETERS
            </text>
            <line x1={20} y1={33} x2={440} y2={33} stroke="#334155" strokeWidth="0.5" />

            {/* Left column */}
            <text x={25} y={55} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              Resolution: <tspan fill={colors.textPrimary} fontWeight="bold">{output.effectiveResolution.toFixed(1)}nm</tspan>
            </text>
            <text x={25} y={78} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              Diffraction limit: <tspan fill={colors.textPrimary}>{output.diffractionLimit.toFixed(1)}nm</tspan>
            </text>
            <text x={25} y={101} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              Depth of focus: <tspan fill={colors.textPrimary}>{output.depthOfFocus.toFixed(1)}nm</tspan>
            </text>

            {/* Right column */}
            <text x={250} y={55} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              Process node: <tspan fill={colors.textPrimary} fontWeight="bold">~{output.processNode}nm</tspan>
            </text>
            <text x={250} y={78} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              7nm capable: <tspan fill={output.canReach7nm ? colors.success : colors.error} fontWeight="bold">{output.canReach7nm ? 'YES' : 'NO'}</tspan>
            </text>
            <text x={250} y={101} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              5nm capable: <tspan fill={output.canReach5nm ? colors.success : colors.error} fontWeight="bold">{output.canReach5nm ? 'YES' : 'NO'}</tspan>
            </text>

            {/* Formula display */}
            <rect x={25} y={110} width={410} height={20} rx={4} fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
            <text x={230} y={124} fill={colors.accent} fontSize={11} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              Resolution = k1 x {'\u03BB'} / NA = {k1Factor.toFixed(2)} x {wavelength}nm / {numericalAperture.toFixed(2)} = {output.effectiveResolution.toFixed(1)}nm
            </text>
          </g>

          {/* Technology badge */}
          <g transform="translate(400, 35)">
            <rect x={0} y={0} width={70} height={28} rx={6} fill={output.isEUV ? 'rgba(6, 182, 212, 0.2)' : 'rgba(139, 92, 246, 0.2)'} stroke={output.isEUV ? colors.euv : colors.uv} strokeWidth="1" />
            <text x={35} y={200} transform="translate(0,-181)" fill={output.isEUV ? colors.euv : colors.uv} fontSize={14} textAnchor="middle" fontWeight="bold" fontFamily="system-ui, sans-serif">
              {output.isEUV ? 'EUV' : 'DUV'}
            </text>
          </g>

          {/* Axis labels for educational clarity */}
          <g>
            <text x={10} y={480} transform="translate(0,-460)" fill={colors.textMuted} fontSize={12} fontFamily="system-ui, sans-serif" fontWeight="600">
              Y-axis: Light Path (top to bottom)
            </text>
            <text x={250} y={495} fill={colors.textMuted} fontSize={12} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600">
              X-axis: Wafer Position →
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setWavelength(wavelength === 193 ? 13.5 : 193)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: wavelength === 13.5 ? `linear-gradient(135deg, ${colors.euv} 0%, #0e7490 100%)` : `linear-gradient(135deg, ${colors.uv} 0%, #6d28d9 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: `0 4px 15px ${wavelength === 13.5 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {wavelength === 13.5 ? 'Switch to DUV' : 'Switch to EUV'}
            </button>
            <button
              onClick={() => { setWavelength(193); setNumericalAperture(1.35); setK1Factor(0.4); setUseMultiplePatterning(false); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
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

  const renderControls = () => {
    const output = calculateResolution();

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            💡 Wavelength: {wavelength}nm ({wavelength <= 13.5 ? 'EUV' : wavelength < 300 ? 'DUV' : 'UV'})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => setWavelength(365)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 365 ? `2px solid ${colors.uv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>365nm (i-line)</button>
            <button onClick={() => setWavelength(248)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 248 ? `2px solid ${colors.uv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>248nm (KrF)</button>
            <button onClick={() => setWavelength(193)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 193 ? `2px solid ${colors.uv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>193nm (ArF)</button>
            <button onClick={() => setWavelength(13.5)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 13.5 ? `2px solid ${colors.euv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>13.5nm (EUV)</button>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            📐 Numerical Aperture (NA): {numericalAperture.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={numericalAperture}
            onChange={(e) => setNumericalAperture(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '18px',
              borderRadius: '9px',
              background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((numericalAperture - 0.5) / (1.5 - 0.5)) * 100}%, ${colors.border} ${((numericalAperture - 0.5) / (1.5 - 0.5)) * 100}%, ${colors.border} 100%)`,
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              touchAction: 'none',
              cursor: 'pointer'
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              -webkit-appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: ${colors.accent};
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
            }
            input[type="range"]::-moz-range-thumb {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: ${colors.accent};
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
            <span>0.5 (air)</span>
            <span>1.0 (air limit)</span>
            <span>1.35+ (immersion)</span>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            🎯 k1 Factor: {k1Factor.toFixed(2)} (process complexity)
          </label>
          <input
            type="range"
            min="0.25"
            max="0.6"
            step="0.01"
            value={k1Factor}
            onChange={(e) => setK1Factor(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '18px',
              borderRadius: '9px',
              background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((k1Factor - 0.25) / (0.6 - 0.25)) * 100}%, ${colors.border} ${((k1Factor - 0.25) / (0.6 - 0.25)) * 100}%, ${colors.border} 100%)`,
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              touchAction: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
            <span>0.25 (aggressive)</span>
            <span>0.35 (typical)</span>
            <span>0.6 (relaxed)</span>
          </div>
        </div>

        <div>
          <label style={{
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '8px',
          }}>
            <input
              type="checkbox"
              checked={useMultiplePatterning}
              onChange={(e) => setUseMultiplePatterning(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Enable Multiple Patterning
          </label>
          {useMultiplePatterning && (
            <div>
              <label style={{ color: colors.textMuted, fontSize: '13px', fontWeight: 600 }}>
                🔁 Patterning Steps: {patterningSteps}x
              </label>
              <input
                type="range"
                min="2"
                max="4"
                step="1"
                value={patterningSteps}
                onChange={(e) => setPatterningSteps(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '18px',
                  borderRadius: '9px',
                  background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((patterningSteps - 2) / (4 - 2)) * 100}%, ${colors.border} ${((patterningSteps - 2) / (4 - 2)) * 100}%, ${colors.border} 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  touchAction: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
        </div>

        <div style={{
          background: output.canReach7nm ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${output.canReach7nm ? colors.success : colors.error}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            Resolution = k1 x lambda / NA = {output.effectiveResolution.toFixed(1)}nm
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Relative cost: {output.costFactor.toFixed(1)}x | Achievable node: ~{output.processNode}nm
          </div>
        </div>
      </div>
    );
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px'
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
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

  // Bottom navigation bar
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          onMouseEnter={(e) => canBack && (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease-in-out, opacity 0.2s ease-in-out',
            transform: 'scale(1)',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          Go Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 'normal'
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={handleNext}
          onMouseEnter={(e) => canGoNext && (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            transform: 'scale(1)',
            WebkitTapHighlightColor: 'transparent'
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Photolithography Resolution
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How do they print features smaller than light wavelength?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Modern chips have features just 3-5 nanometers wide, yet they are printed using
                light with wavelengths of 13.5nm (EUV) or 193nm (DUV). How is this possible
                when physics says you cannot focus light smaller than its wavelength?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Switch between DUV and EUV to see how wavelength affects resolution!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                Light with wavelength 193nm is used to print chip patterns.
                What is the fundamental limit on the smallest feature size?
              </p>
            </div>

            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Your Prediction:
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Lithography Parameters</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust wavelength, NA, and k1 factor to see how they affect resolution
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>📊 What You're Seeing:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              This visualization shows a photolithography system printing nanoscale patterns on silicon wafers.
              The light beam passes through a photomask and lens system to create features on a photoresist-coated wafer.
            </p>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>🔬 How It Works:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              When you adjust the sliders, you control fundamental physics: <strong>shorter wavelengths</strong> enable finer features,
              <strong>higher NA</strong> (numerical aperture) increases resolution, and <strong>lower k1</strong> pushes closer to the diffraction limit.
              Watch the feature size on the wafer shrink as you optimize these parameters!
            </p>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>🌍 Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Photolithography is the foundation of modern computing. Every processor, memory chip, and smartphone relies on printing
              billions of transistors smaller than viruses. The physics you're exploring determines whether we can build 3nm chips or must
              stop at 10nm—directly impacting computing power, energy efficiency, and technological progress.
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

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🧪 Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Compare 193nm DUV vs 13.5nm EUV resolution</li>
              <li>Increase NA beyond 1.0 (immersion lithography)</li>
              <li>Lower k1 factor (more aggressive processing)</li>
              <li>Enable multiple patterning to beat single-exposure limits</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'half_wavelength';
    const predictionText = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: 'rgba(100, 116, 139, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `4px solid ${colors.textMuted}`,
          }}>
            <h4 style={{ color: colors.textMuted, marginBottom: '8px', fontSize: '14px' }}>📝 Your Prediction:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {predictionText}
            </p>
          </div>

          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✅ Correct!' : '❌ Not quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The diffraction limit is approximately half the wavelength. This is the Rayleigh criterion:
              the minimum resolvable feature size is about lambda / (2 x NA).
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Rayleigh Equation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resolution = k1 x lambda / NA</strong>
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Wavelength (lambda):</strong> Shorter is better.
                EUV at 13.5nm enables much smaller features than DUV at 193nm.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Numerical Aperture (NA):</strong> Higher NA
                means better resolution. Immersion lithography (water between lens and wafer) enables NA greater than 1.0.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>k1 Factor:</strong> Process-dependent constant.
                More aggressive lithography techniques can push k1 below 0.3, but at increasing cost and complexity.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist: Beyond the Limit</h2>
            <p style={{ color: colors.textSecondary }}>
              How do chips have 7nm features with 193nm light?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Puzzle:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              The diffraction limit for 193nm DUV is about 70nm with immersion. Yet foundries
              produced 7nm chips using DUV. How did they beat the physics?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How can you print features smaller than the diffraction limit?
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Multiple Patterning</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Use multiple exposures to beat the limit
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

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Multiple Patterning Magic:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Instead of printing all features at once, use 2-4 separate exposures with
              offset patterns. Each exposure is within the diffraction limit, but combined
              they create features at half or quarter the pitch. The tradeoff? Cost and complexity!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'multiple';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'The Engineering Solution!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Multiple patterning (double, triple, or quadruple) allows printing features
              smaller than single-exposure limits. This is how 7nm chips were made with 193nm DUV light!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Cost of Smaller</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Multiple Patterning Cost:</strong> Each
                additional exposure requires another expensive mask ($100K+ each) and more processing
                time, roughly doubling cost per patterning step.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>EUV Advantage:</strong> EUV at 13.5nm
                can print 7nm features in a single exposure, but each EUV machine costs $150M+ and
                requires complex vacuum and extreme precision.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Economic Limit:</strong> The exponentially
                increasing cost per node is why only a few companies (TSMC, Samsung, Intel) can
                afford leading-edge fabs.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
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
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease-in-out',
                    transform: 'scale(1)',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>{app.answer}</p>
                  </div>
                  <button
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: colors.success,
                      color: 'white',
                      cursor: 'default',
                      fontSize: '13px',
                      fontWeight: 600,
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    ✓ Got It
                  </button>
                </>
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
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand photolithography!' : 'Review the material and try again.'}
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
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <div style={{
                background: colors.accent,
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '18px',
                color: colors.bgPrimary
              }}>
                Question {currentTestQuestion + 1} / {testQuestions.length}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{
                display: 'inline-block',
                background: colors.accent,
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '12px',
                color: colors.bgPrimary
              }}>
                Q{currentTestQuestion + 1}
              </div>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered photolithography resolution!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Rayleigh criterion: Resolution = k1 x lambda / NA</li>
              <li>EUV (13.5nm) vs DUV (193nm) lithography</li>
              <li>Immersion lithography for NA greater than 1.0</li>
              <li>Multiple patterning to beat diffraction limits</li>
              <li>Economic challenges of advanced nodes</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Future:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              High-NA EUV (NA=0.55) is the next frontier, enabling 2nm and beyond. Directed
              self-assembly and nanoimprint lithography may eventually complement or replace
              optical lithography. The physics of light continues to drive semiconductor innovation!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default PhotolithographyRenderer;
