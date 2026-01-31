import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type DTPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DepositionTypesRendererProps {
  gamePhase?: DTPhase; // Optional for resume functionality
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
  accent: '#22c55e',
  accentGlow: 'rgba(34, 197, 94, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  pvd: '#3b82f6',
  cvd: '#a855f7',
  ald: '#22c55e',
  substrate: '#1e293b',
  deposited: '#64748b',
};

// Phase order and labels for navigation
const phaseOrder: DTPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<DTPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Test Twist',
  twist_review: 'Twist Review',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Mastery',
};

const DepositionTypesRenderer: React.FC<DepositionTypesRendererProps> = ({
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
  const [phase, setPhase] = useState<DTPhase>(() => gamePhase || 'hook');
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop when it changes (for resume)
  useEffect(() => {
    if (gamePhase && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation functions with debouncing
  const goToPhase = useCallback((targetPhase: DTPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300 || isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(targetPhase);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [depositionType, setDepositionType] = useState<'pvd' | 'cvd' | 'ald'>('pvd');
  const [aspectRatio, setAspectRatio] = useState(2); // Width to Depth ratio
  const [depositionTime, setDepositionTime] = useState(50); // 0-100%
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setDepositionTime(prev => {
        if (prev >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations for step coverage
  const calculateDeposition = useCallback(() => {
    const thickness = (depositionTime / 100) * 30; // max 30nm

    // Step coverage calculation based on deposition type
    let topCoverage = 1.0;
    let sidewallCoverage = 0;
    let bottomCoverage = 0;

    // PVD (Physical Vapor Deposition) - line of sight, poor step coverage
    if (depositionType === 'pvd') {
      topCoverage = 1.0;
      // Sidewall coverage decreases with aspect ratio (shadowing effect)
      sidewallCoverage = Math.max(0, 1 - aspectRatio * 0.3);
      // Bottom coverage affected by both aspect ratio and overhang formation
      bottomCoverage = Math.max(0, 1 - aspectRatio * 0.4);
      // Overhang forms at top edges
    }
    // CVD (Chemical Vapor Deposition) - better conformality
    else if (depositionType === 'cvd') {
      topCoverage = 1.0;
      // Better sidewall coverage, but still aspect ratio dependent
      sidewallCoverage = Math.max(0.3, 1 - aspectRatio * 0.15);
      // Better bottom coverage
      bottomCoverage = Math.max(0.4, 1 - aspectRatio * 0.12);
    }
    // ALD (Atomic Layer Deposition) - excellent conformality
    else if (depositionType === 'ald') {
      topCoverage = 1.0;
      // Nearly perfect sidewall coverage
      sidewallCoverage = Math.max(0.9, 1 - aspectRatio * 0.02);
      // Excellent bottom coverage
      bottomCoverage = Math.max(0.9, 1 - aspectRatio * 0.02);
    }

    // Calculate step coverage percentage
    const stepCoverage = (bottomCoverage / topCoverage) * 100;

    // Calculate void formation risk (PVD can pinch off)
    const voidRisk = depositionType === 'pvd' && aspectRatio > 2 && depositionTime > 60;

    // Calculate actual thicknesses
    const topThickness = thickness * topCoverage;
    const sidewallThickness = thickness * sidewallCoverage;
    const bottomThickness = thickness * bottomCoverage;

    return {
      thickness,
      topThickness,
      sidewallThickness,
      bottomThickness,
      topCoverage,
      sidewallCoverage,
      bottomCoverage,
      stepCoverage,
      voidRisk,
      conformality: depositionType === 'ald' ? 'Excellent' : depositionType === 'cvd' ? 'Good' : 'Poor',
    };
  }, [depositionType, aspectRatio, depositionTime]);

  const predictions = [
    { id: 'same', label: 'All deposition methods coat surfaces equally' },
    { id: 'directional', label: 'Some methods are directional (like spray paint) and miss sidewalls' },
    { id: 'bottom', label: 'Deposition always reaches the bottom first' },
    { id: 'trench_easy', label: 'Trenches are easy to coat evenly' },
  ];

  const twistPredictions = [
    { id: 'always_works', label: 'PVD can coat any aspect ratio if given enough time' },
    { id: 'voids', label: 'High aspect ratios cause PVD to form voids (pinch off at top)' },
    { id: 'ald_fails', label: 'ALD also fails at high aspect ratios' },
    { id: 'same_ar', label: 'Aspect ratio does not affect any deposition method' },
  ];

  const transferApplications = [
    {
      title: 'Gate Dielectric in Transistors',
      description: 'Modern transistors use atomic-layer-deposited high-k dielectrics for the gate insulator.',
      question: 'Why is ALD essential for FinFET transistor gates?',
      answer: 'FinFET gates wrap around 3D fins with very high aspect ratios. ALD deposits uniformly on all surfaces of the fin, ensuring consistent electrical properties. PVD or CVD would leave thin spots or voids, causing gate leakage and device failure.',
    },
    {
      title: 'Copper Interconnect Barriers',
      description: 'Copper wiring requires a thin barrier layer to prevent diffusion into silicon.',
      question: 'How does step coverage affect barrier layer effectiveness?',
      answer: 'A barrier layer with poor step coverage (thin sidewalls) allows copper to diffuse through weak spots, contaminating the transistors. ALD TaN/TiN barriers with more than 95% step coverage are standard for advanced nodes.',
    },
    {
      title: '3D NAND Flash Memory',
      description: '3D NAND stacks 100+ memory layers with extremely high aspect ratio channels.',
      question: 'Why can only ALD coat 3D NAND channel holes?',
      answer: 'Channel holes in 3D NAND have aspect ratios over 50:1. Only ALD can deposit conformal ONO (oxide-nitride-oxide) stacks and channel poly-Si throughout these extreme structures. CVD would create voids; PVD cannot even reach the bottom.',
    },
    {
      title: 'MEMS Sensor Coatings',
      description: 'MEMS devices have complex 3D structures requiring uniform protective coatings.',
      question: 'When might CVD be preferred over ALD for MEMS?',
      answer: 'CVD is faster and cheaper than ALD. For moderate aspect ratios (less than 5:1) and non-critical uniformity requirements, CVD provides adequate step coverage at higher throughput. The choice depends on aspect ratio, uniformity needs, and cost constraints.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is "step coverage" in thin film deposition?',
      options: [
        { text: 'The speed of the deposition process', correct: false },
        { text: 'The ratio of film thickness on sidewalls/bottom to the top surface', correct: true },
        { text: 'The number of steps in the process', correct: false },
        { text: 'The temperature during deposition', correct: false },
      ],
    },
    {
      question: 'PVD (Physical Vapor Deposition) has poor step coverage because:',
      options: [
        { text: 'It uses dangerous chemicals', correct: false },
        { text: 'Atoms travel in straight lines (line-of-sight deposition)', correct: true },
        { text: 'It is too slow', correct: false },
        { text: 'It only works on flat surfaces', correct: false },
      ],
    },
    {
      question: 'ALD (Atomic Layer Deposition) achieves excellent conformality by:',
      options: [
        { text: 'Using very high pressures', correct: false },
        { text: 'Depositing one atomic layer at a time with self-limiting reactions', correct: true },
        { text: 'Heating the substrate to very high temperatures', correct: false },
        { text: 'Using thicker films', correct: false },
      ],
    },
    {
      question: 'The "aspect ratio" of a trench is:',
      options: [
        { text: 'Width divided by length', correct: false },
        { text: 'Depth divided by width (or height/opening)', correct: true },
        { text: 'The angle of the sidewalls', correct: false },
        { text: 'The total surface area', correct: false },
      ],
    },
    {
      question: 'What is a "void" in the context of trench filling?',
      options: [
        { text: 'A perfectly filled trench', correct: false },
        { text: 'An empty space trapped inside the deposited film', correct: true },
        { text: 'A type of deposition equipment', correct: false },
        { text: 'The substrate material', correct: false },
      ],
    },
    {
      question: 'CVD (Chemical Vapor Deposition) achieves better conformality than PVD because:',
      options: [
        { text: 'It uses solid sources', correct: false },
        { text: 'Gas-phase precursors can diffuse into trenches before reacting', correct: true },
        { text: 'It is faster', correct: false },
        { text: 'It uses higher voltages', correct: false },
      ],
    },
    {
      question: 'For coating the inside of a 10:1 aspect ratio via, you should use:',
      options: [
        { text: 'PVD because it is fastest', correct: false },
        { text: 'ALD because it provides the best step coverage', correct: true },
        { text: 'Any method works equally well', correct: false },
        { text: 'No method can coat such high aspect ratios', correct: false },
      ],
    },
    {
      question: 'PVD creates "overhang" at trench openings because:',
      options: [
        { text: 'Material deposits faster on edges with line-of-sight to the source', correct: true },
        { text: 'The trench is too deep', correct: false },
        { text: 'The substrate is too cold', correct: false },
        { text: 'Overhang is intentional', correct: false },
      ],
    },
    {
      question: 'The main disadvantage of ALD compared to PVD/CVD is:',
      options: [
        { text: 'Poor step coverage', correct: false },
        { text: 'Much slower deposition rate (thin films only)', correct: true },
        { text: 'Cannot deposit metals', correct: false },
        { text: 'Requires higher temperatures', correct: false },
      ],
    },
    {
      question: 'In semiconductor manufacturing, conformal deposition is critical for:',
      options: [
        { text: 'Depositing flat layers only', correct: false },
        { text: 'Coating 3D structures like FinFETs and deep vias uniformly', correct: true },
        { text: 'Reducing film thickness', correct: false },
        { text: 'Increasing deposition speed', correct: false },
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showAspectRatioControl: boolean = false) => {
    const width = 500;
    const height = 420;
    const result = calculateDeposition();

    // Trench dimensions
    const trenchWidth = 60;
    const trenchDepth = trenchWidth * aspectRatio;
    const trenchX = 180;
    const trenchTopY = 120;

    // Scale to fit
    const scale = Math.min(1, 200 / trenchDepth);
    const scaledDepth = trenchDepth * scale;
    const scaledWidth = trenchWidth * scale;

    // Film thickness (scaled)
    const filmScale = 2;
    const topFilm = result.topThickness * filmScale;
    const sideFilm = result.sidewallThickness * filmScale;
    const bottomFilm = result.bottomThickness * filmScale;

    // Animation time for particles
    const animPhase = (depositionTime / 100) * Math.PI * 2;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="depLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Subtle grid pattern for lab background */}
            <pattern id="depLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Premium substrate silicon gradient with depth */}
            <linearGradient id="depSubstrateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="15%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Substrate side highlight for 3D effect */}
            <linearGradient id="depSubstrateHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#475569" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </linearGradient>

            {/* PVD metal target gradient - brushed metal look */}
            <linearGradient id="depPvdTarget" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* PVD film gradient */}
            <linearGradient id="depPvdFilm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* CVD film gradient - purple tones */}
            <linearGradient id="depCvdFilm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="30%" stopColor="#a855f7" />
              <stop offset="70%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>

            {/* ALD film gradient - green tones */}
            <linearGradient id="depAldFilm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Chamber metallic gradient */}
            <linearGradient id="depChamberMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Plasma/vapor glow for CVD */}
            <radialGradient id="depPlasmaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
            </radialGradient>

            {/* PVD particle glow */}
            <radialGradient id="depPvdParticleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </radialGradient>

            {/* CVD molecule glow */}
            <radialGradient id="depCvdMoleculeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e9d5ff" stopOpacity="1" />
              <stop offset="40%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
            </radialGradient>

            {/* ALD layer glow */}
            <radialGradient id="depAldLayerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Void warning glow */}
            <radialGradient id="depVoidGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.5" />
            </radialGradient>

            {/* Coverage meter gradients */}
            <linearGradient id="depMeterSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            <linearGradient id="depMeterWarning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            <linearGradient id="depMeterError" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Panel background gradient */}
            <linearGradient id="depPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </linearGradient>

            {/* Glow filters using feGaussianBlur + feMerge pattern */}
            <filter id="depParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="depFilmGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="depPlasmaFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="depVoidFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="depTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Film growth animation keyframes via CSS */}
            <style>{`
              @keyframes depPulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
              @keyframes depFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
              }
              @keyframes depPlasmaSwirl {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .dep-particle-anim {
                animation: depPulse 1s ease-in-out infinite;
              }
              .dep-plasma-anim {
                animation: depPlasmaSwirl 3s linear infinite;
              }
            `}</style>
          </defs>

          {/* Premium lab background */}
          <rect width={width} height={height} fill="url(#depLabBg)" />
          <rect width={width} height={height} fill="url(#depLabGrid)" />

          {/* Deposition chamber frame */}
          <rect x={15} y={45} width={width - 30} height={265} rx={8}
            fill="none" stroke="url(#depChamberMetal)" strokeWidth={2} opacity={0.6} />

          {/* Source illustration with premium graphics */}
          {depositionType === 'pvd' && (
            <g>
              {/* PVD Metal Target - premium brushed metal */}
              <rect x={trenchX - 35} y={50} width={70 + scaledWidth} height={25}
                fill="url(#depPvdTarget)" rx={4} />
              <rect x={trenchX - 35} y={50} width={70 + scaledWidth} height={3}
                fill="#94a3b8" opacity={0.4} rx={1} />

              {/* Sputtering particles with glow */}
              {depositionTime > 0 && depositionTime < 100 && (
                <g filter="url(#depParticleGlow)">
                  {[-25, -10, 5, 20, 35].map((offset, i) => {
                    const particleY = 78 + ((depositionTime * 0.4 + i * 8) % 35);
                    return (
                      <g key={i}>
                        <circle
                          cx={trenchX + offset}
                          cy={particleY}
                          r={3}
                          fill="url(#depPvdParticleGlow)"
                          className="dep-particle-anim"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                        {/* Particle trail */}
                        <line
                          x1={trenchX + offset}
                          y1={particleY - 8}
                          x2={trenchX + offset}
                          y2={particleY}
                          stroke="#3b82f6"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          opacity={0.5}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {depositionType === 'cvd' && (
            <g>
              {/* Gas inlet pipes */}
              <rect x={trenchX - 50} y={50} width={12} height={30} fill="url(#depChamberMetal)" rx={2} />
              <rect x={trenchX + scaledWidth + 38} y={50} width={12} height={30} fill="url(#depChamberMetal)" rx={2} />

              {/* Plasma/vapor cloud with glow */}
              {depositionTime > 0 && depositionTime < 100 && (
                <g filter="url(#depPlasmaFilter)">
                  {/* Central plasma glow */}
                  <ellipse
                    cx={trenchX + scaledWidth / 2}
                    cy={85}
                    rx={50}
                    ry={25}
                    fill="url(#depPlasmaGlow)"
                    opacity={0.6 + Math.sin(animPhase) * 0.2}
                  />
                  {/* Diffusing molecules */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                    const dist = 25 + Math.sin(animPhase + i) * 10;
                    return (
                      <circle
                        key={i}
                        cx={trenchX + scaledWidth / 2 + Math.cos(angle * Math.PI / 180) * dist}
                        cy={85 + Math.sin(angle * Math.PI / 180) * dist * 0.6}
                        r={4}
                        fill="url(#depCvdMoleculeGlow)"
                        opacity={0.7}
                        className="dep-particle-anim"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {depositionType === 'ald' && (
            <g>
              {/* ALD precursor pulse indicators */}
              <g>
                {/* Precursor A indicator */}
                <rect x={trenchX - 60} y={55} width={40} height={20} rx={3}
                  fill={depositionTime % 20 < 10 ? 'url(#depAldFilm)' : '#1e293b'}
                  stroke="#22c55e" strokeWidth={1} opacity={0.8} />
                {/* Precursor B indicator */}
                <rect x={trenchX + scaledWidth + 20} y={55} width={40} height={20} rx={3}
                  fill={depositionTime % 20 >= 10 ? 'url(#depAldFilm)' : '#1e293b'}
                  stroke="#22c55e" strokeWidth={1} opacity={0.8} />
              </g>

              {/* ALD layer-by-layer visualization */}
              {depositionTime > 0 && depositionTime < 100 && (
                <g filter="url(#depParticleGlow)">
                  {/* Surface saturation effect */}
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const layerOpacity = Math.min(1, (depositionTime / 100) * 1.5);
                    return (
                      <rect
                        key={i}
                        x={trenchX - 50 + i * 25}
                        y={90 + Math.sin(animPhase + i * 0.5) * 2}
                        width={20}
                        height={4}
                        fill="url(#depAldLayerGlow)"
                        opacity={layerOpacity * (0.7 + Math.sin(animPhase + i) * 0.3)}
                        rx={2}
                      />
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* Substrate with trench - premium 3D effect */}
          <g transform={`translate(${trenchX}, ${trenchTopY})`}>
            {/* Substrate bulk with gradient */}
            <rect x={-60} y={0} width={60} height={scaledDepth + 50} fill="url(#depSubstrateGrad)" />
            <rect x={scaledWidth} y={0} width={60} height={scaledDepth + 50} fill="url(#depSubstrateGrad)" />
            <rect x={0} y={scaledDepth} width={scaledWidth} height={50} fill="url(#depSubstrateGrad)" />

            {/* 3D edge highlights */}
            <rect x={-60} y={0} width={2} height={scaledDepth + 50} fill="url(#depSubstrateHighlight)" />
            <rect x={scaledWidth + 58} y={0} width={2} height={scaledDepth + 50} fill="url(#depSubstrateHighlight)" opacity={0.3} />

            {/* Trench walls inner shadow */}
            <rect x={0} y={0} width={3} height={scaledDepth} fill="#020617" opacity={0.5} />
            <rect x={scaledWidth - 3} y={0} width={3} height={scaledDepth} fill="#020617" opacity={0.3} />

            {/* Deposited film with gradient and glow */}
            {depositionTime > 0 && (
              <g filter="url(#depFilmGlow)">
                {/* Top film - left side */}
                <rect x={-60} y={-topFilm} width={60} height={topFilm}
                  fill={depositionType === 'pvd' ? 'url(#depPvdFilm)' :
                        depositionType === 'cvd' ? 'url(#depCvdFilm)' : 'url(#depAldFilm)'} />
                {/* Top film - right side */}
                <rect x={scaledWidth} y={-topFilm} width={60} height={topFilm}
                  fill={depositionType === 'pvd' ? 'url(#depPvdFilm)' :
                        depositionType === 'cvd' ? 'url(#depCvdFilm)' : 'url(#depAldFilm)'} />

                {/* PVD overhang effect with gradient */}
                {depositionType === 'pvd' && topFilm > 5 && (
                  <>
                    <polygon
                      points={`0,${-topFilm} ${-topFilm * 0.8},${-topFilm} 0,0`}
                      fill="url(#depPvdFilm)"
                    />
                    <polygon
                      points={`${scaledWidth},${-topFilm} ${scaledWidth + topFilm * 0.8},${-topFilm} ${scaledWidth},0`}
                      fill="url(#depPvdFilm)"
                    />
                  </>
                )}

                {/* Sidewall film with gradient */}
                <rect x={0} y={0} width={sideFilm} height={scaledDepth}
                  fill={depositionType === 'pvd' ? 'url(#depPvdFilm)' :
                        depositionType === 'cvd' ? 'url(#depCvdFilm)' : 'url(#depAldFilm)'}
                  opacity={0.85} />
                <rect x={scaledWidth - sideFilm} y={0} width={sideFilm} height={scaledDepth}
                  fill={depositionType === 'pvd' ? 'url(#depPvdFilm)' :
                        depositionType === 'cvd' ? 'url(#depCvdFilm)' : 'url(#depAldFilm)'}
                  opacity={0.85} />

                {/* Bottom film with gradient */}
                <rect x={sideFilm} y={scaledDepth - bottomFilm} width={scaledWidth - 2 * sideFilm} height={bottomFilm}
                  fill={depositionType === 'pvd' ? 'url(#depPvdFilm)' :
                        depositionType === 'cvd' ? 'url(#depCvdFilm)' : 'url(#depAldFilm)'}
                  opacity={0.85} />

                {/* Void indicator for PVD at high aspect ratio */}
                {result.voidRisk && (
                  <g filter="url(#depVoidFilter)">
                    <ellipse
                      cx={scaledWidth / 2}
                      cy={scaledDepth * 0.4}
                      rx={scaledWidth * 0.3}
                      ry={scaledDepth * 0.2}
                      fill="url(#depVoidGlow)"
                      stroke={colors.error}
                      strokeWidth={2}
                      strokeDasharray="4,2"
                    />
                  </g>
                )}
              </g>
            )}
          </g>

          {/* Step coverage meter - premium panel */}
          <g transform="translate(340, 100)">
            <rect x={-5} y={5} width={130} height={115} fill="url(#depPanelBg)" rx={10}
              stroke="#334155" strokeWidth={1} />

            <text x={60} y={28} fill={colors.textPrimary} fontSize={10} textAnchor="middle" fontWeight="bold">
              STEP COVERAGE
            </text>

            {/* Top coverage bar */}
            <text x={8} y={48} fill={colors.textSecondary} fontSize={9}>Top</text>
            <text x={110} y={48} fill={colors.textPrimary} fontSize={9} textAnchor="end">
              {(result.topCoverage * 100).toFixed(0)}%
            </text>
            <rect x={8} y={52} width={104} height={6} fill="rgba(255,255,255,0.1)" rx={3} />
            <rect x={8} y={52} width={result.topCoverage * 104} height={6} fill="url(#depMeterSuccess)" rx={3} />

            {/* Side coverage bar */}
            <text x={8} y={70} fill={colors.textSecondary} fontSize={9}>Side</text>
            <text x={110} y={70} fill={colors.textPrimary} fontSize={9} textAnchor="end">
              {(result.sidewallCoverage * 100).toFixed(0)}%
            </text>
            <rect x={8} y={74} width={104} height={6} fill="rgba(255,255,255,0.1)" rx={3} />
            <rect x={8} y={74} width={result.sidewallCoverage * 104} height={6}
              fill={result.sidewallCoverage > 0.5 ? 'url(#depMeterSuccess)' : 'url(#depMeterWarning)'} rx={3} />

            {/* Bottom coverage bar */}
            <text x={8} y={92} fill={colors.textSecondary} fontSize={9}>Bottom</text>
            <text x={110} y={92} fill={colors.textPrimary} fontSize={9} textAnchor="end">
              {(result.bottomCoverage * 100).toFixed(0)}%
            </text>
            <rect x={8} y={96} width={104} height={6} fill="rgba(255,255,255,0.1)" rx={3} />
            <rect x={8} y={96} width={result.bottomCoverage * 104} height={6}
              fill={result.bottomCoverage > 0.5 ? 'url(#depMeterSuccess)' : 'url(#depMeterError)'} rx={3} />
          </g>

          {/* Method comparison legend - premium panel */}
          <g transform="translate(340, 230)">
            <rect x={-5} y={0} width={130} height={78} fill="url(#depPanelBg)" rx={10}
              stroke="#334155" strokeWidth={1} />

            <circle cx={15} cy={22} r={6} fill="url(#depPvdFilm)" filter="url(#depParticleGlow)" />
            <circle cx={15} cy={44} r={6} fill="url(#depCvdFilm)" filter="url(#depParticleGlow)" />
            <circle cx={15} cy={66} r={6} fill="url(#depAldFilm)" filter="url(#depParticleGlow)" />
          </g>

          {/* Metrics panel - premium design */}
          <rect x={18} y={318} width={185} height={95} fill="url(#depPanelBg)" rx={10}
            stroke={depositionType === 'pvd' ? '#3b82f6' : depositionType === 'cvd' ? '#a855f7' : '#22c55e'}
            strokeWidth={1.5} />

          {/* Quality indicator panel */}
          <rect x={218} y={318} width={145} height={95} fill="url(#depPanelBg)" rx={10}
            stroke="#334155" strokeWidth={1} />
          <text
            x={290}
            y={370}
            fill={result.stepCoverage > 90 ? colors.success : result.stepCoverage > 60 ? colors.warning : colors.error}
            fontSize={26}
            fontWeight="bold"
            textAnchor="middle"
            filter="url(#depTextGlow)"
          >
            {result.stepCoverage > 90 ? 'Excellent' : result.stepCoverage > 60 ? 'Fair' : 'Poor'}
          </text>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '550px',
          padding: '0 20px',
          marginTop: '-80px',
          pointerEvents: 'none'
        }}>
          {/* Left metrics labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            <span style={{ fontSize: typo.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Deposition Metrics
            </span>
            <span style={{ fontSize: typo.small, color: colors.textPrimary }}>
              Aspect Ratio: {aspectRatio.toFixed(1)}:1
            </span>
            <span style={{ fontSize: typo.small, color: colors.textPrimary }}>
              Film Thickness: {result.thickness.toFixed(1)} nm
            </span>
            <span style={{
              fontSize: typo.small,
              color: result.stepCoverage > 80 ? colors.success : result.stepCoverage > 50 ? colors.warning : colors.error
            }}>
              Conformality: {result.conformality}
            </span>
            {result.voidRisk && (
              <span style={{ fontSize: typo.small, color: colors.error, fontWeight: 'bold' }}>
                Void Formation Risk!
              </span>
            )}
          </div>

          {/* Right quality labels */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <span style={{ fontSize: typo.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Process Quality
            </span>
            <span style={{ fontSize: typo.small, color: colors.textMuted, textAlign: 'center' }}>
              {result.stepCoverage > 90 ? 'Uniform coating' : result.stepCoverage > 60 ? 'Some thin spots' : 'Significant gaps'}
            </span>
          </div>
        </div>

        {/* Method comparison labels */}
        <div style={{
          position: 'relative',
          marginTop: '-30px',
          marginLeft: 'auto',
          marginRight: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>PVD: Directional</span>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>CVD: Semi-conformal</span>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>ALD: Conformal</span>
        </div>

        {/* Title labels outside SVG */}
        <div style={{
          textAlign: 'center',
          marginTop: '-380px',
          marginBottom: '340px',
          pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: typo.bodyLarge,
            color: colors.textPrimary,
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            {depositionType.toUpperCase()} Deposition - Trench Filling
          </div>
          <div style={{
            fontSize: typo.small,
            color: depositionType === 'pvd' ? colors.pvd : depositionType === 'cvd' ? colors.cvd : colors.ald
          }}>
            {depositionType === 'pvd' ? 'Physical Vapor Deposition (Directional)' :
              depositionType === 'cvd' ? 'Chemical Vapor Deposition (Semi-conformal)' :
                'Atomic Layer Deposition (Conformal)'}
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px', marginTop: '16px' }}>
            <button
              onClick={() => {
                setDepositionTime(0);
                setIsAnimating(true);
              }}
              disabled={isAnimating}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.textMuted : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: typo.body,
                boxShadow: isAnimating ? 'none' : `0 4px 20px ${colors.accentGlow}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Depositing...' : 'Start Deposition'}
            </button>
            <button
              onClick={() => { setDepositionTime(0); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
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

  const renderControls = (showAspectRatio: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Deposition Method:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['pvd', 'cvd', 'ald'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setDepositionType(type)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: depositionType === type ? `2px solid ${type === 'pvd' ? colors.pvd : type === 'cvd' ? colors.cvd : colors.ald}` : '1px solid rgba(255,255,255,0.2)',
                background: depositionType === type ? `${type === 'pvd' ? colors.pvd : type === 'cvd' ? colors.cvd : colors.ald}20` : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: depositionType === type ? 'bold' : 'normal',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Deposition Progress: {depositionTime}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={depositionTime}
          onChange={(e) => { setDepositionTime(parseInt(e.target.value)); setIsAnimating(false); }}
          style={{ width: '100%' }}
        />
      </div>

      {showAspectRatio && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Aspect Ratio: {aspectRatio.toFixed(1)}:1
          </label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(34, 197, 94, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          PVD: Line-of-sight (like spray paint from above)
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
          CVD: Gas diffusion (like fog filling a valley)
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
          ALD: Layer-by-layer (perfect conformal coating)
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        overflowX: 'auto',
      }}>
        {phaseOrder.map((p, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div
              key={p}
              onClick={() => isCompleted && goToPhase(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: isCompleted ? 'pointer' : 'default',
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span style={{
                fontSize: '10px',
                color: isCurrent ? colors.accent : colors.textMuted,
                whiteSpace: 'nowrap',
                display: index < 4 || isCurrent ? 'block' : 'none',
              }}>
                {phaseLabels[p]}
              </span>
              {index < phaseOrder.length - 1 && (
                <div style={{
                  width: '12px',
                  height: '2px',
                  background: isCompleted ? colors.success : 'rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Bottom bar with Back/Next navigation
  const renderBottomBar = (canProceed: boolean, nextLabel: string = 'Next') => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 'bold',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed || isLast}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed && !isLast ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed && !isLast ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed && !isLast ? 'pointer' : 'not-allowed',
            fontSize: '16px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Wrapper for consistent layout
  const renderWrapper = (content: React.ReactNode, canProceed: boolean, nextLabel: string = 'Next') => (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        {content}
      </div>
      {renderBottomBar(canProceed, nextLabel)}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            Deposition Types
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            Can you coat the inside of a tiny trench evenly?
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
              Imagine trying to paint the inside of a deep, narrow hole. Spray paint from above
              would only coat the top and maybe some of the sides. A fog-like coating would do better.
              But what about going layer-by-layer, like carefully painting each surface?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              Chip manufacturing needs to coat trenches with aspect ratios over 50:1!
            </p>
          </div>

          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Compare PVD, CVD, and ALD to see how they coat trench sidewalls and bottoms!
            </p>
          </div>
        </div>
      </>,
      true,
      'Make a Prediction'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderWrapper(
      <>
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Thin Film Deposition:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Chips are built by depositing thin films (nanometers thick) of metals, insulators,
            and semiconductors. These films must coat complex 3D structures including deep
            trenches and narrow holes. Different deposition methods have very different coverage.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            How do different deposition methods coat trench sidewalls?
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
                  background: prediction === p.id ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
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
      </>,
      !!prediction,
      'Test My Prediction'
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Deposition Methods</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Compare how PVD, CVD, and ALD coat trench structures
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
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Run each method to 100% and compare step coverage</li>
            <li>Note where PVD deposits most of its material</li>
            <li>Observe the sidewall vs bottom thickness for each method</li>
            <li>Compare the "conformality" ratings</li>
          </ul>
        </div>
      </>,
      true,
      'Continue to Review'
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'directional';

    return renderWrapper(
      <>
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
            PVD is highly directional, like spray paint. CVD is semi-conformal as gases can diffuse.
            ALD achieves near-perfect conformality by depositing one atomic layer at a time.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Deposition Methods</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.pvd }}>PVD (Physical Vapor Deposition):</strong> Atoms
              are ejected from a target (sputtering) or evaporated. They travel in straight lines
              and deposit where they land. Great for flat surfaces, poor for 3D structures.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.cvd }}>CVD (Chemical Vapor Deposition):</strong> Gas
              precursors flow over the surface and react to deposit a film. Gases can diffuse
              into trenches, but reaction at the top can starve the bottom.
            </p>
            <p>
              <strong style={{ color: colors.ald }}>ALD (Atomic Layer Deposition):</strong> Precursor
              A saturates all surfaces (self-limiting). Precursor B reacts with A to form one
              layer. Repeat. Every surface gets exactly the same thickness!
            </p>
          </div>
        </div>
      </>,
      true,
      'Next: A Twist!'
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary }}>
            What happens at very high aspect ratios?
          </p>
        </div>

        {renderVisualization(false, true)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>High Aspect Ratio Challenge:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Modern chips have trenches with aspect ratios of 10:1 to 50:1 or more. As the
            aspect ratio increases, even good deposition methods struggle to coat the bottom.
            PVD can actually seal off the top before filling the bottom!
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            What happens to PVD at very high aspect ratios?
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
      </>,
      !!twistPrediction,
      'Test My Prediction'
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test High Aspect Ratios</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Increase aspect ratio and observe void formation
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
          <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            At high aspect ratios, PVD forms overhangs at the trench opening that can pinch off,
            trapping a void inside. This is called "breadloafing." Only ALD can reliably coat
            extreme aspect ratio structures without voids.
          </p>
        </div>
      </>,
      true,
      'See the Explanation'
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'voids';

    return renderWrapper(
      <>
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
            PVD at high aspect ratios causes the top of the trench to close before the bottom
            fills, creating trapped voids. These voids cause reliability failures in chips.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Void Formation and Prevention</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Void Problems:</strong> Voids are
              empty spaces inside deposited films. They increase resistance, cause electromigration
              failures, and can trap contaminants. Void-free filling is critical for reliability.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Bottom-Up Fill:</strong> Some processes
              deposit faster at the bottom than the top (superfilling). This uses additives that
              suppress top deposition while accelerating bottom growth.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>ALD Advantage:</strong> ALD is the
              only method that can conformally coat aspect ratios over 100:1. It is essential for
              3D NAND, FinFETs, and advanced DRAM.
            </p>
          </div>
        </div>
      </>,
      true,
      'Apply This Knowledge'
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Deposition methods determine what structures are possible
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
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
      </>,
      transferCompleted.size >= 4,
      'Take the Test'
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderWrapper(
        <>
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
              {testScore >= 8 ? 'You understand deposition methods!' : 'Review the material and try again.'}
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
        </>,
        testScore >= 8,
        testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderWrapper(
      <>
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
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
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
      </>,
      !testAnswers.includes(null),
      'Submit Test'
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Deposition Icon</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand deposition methods and step coverage</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>PVD: Line-of-sight, poor step coverage</li>
            <li>CVD: Semi-conformal via gas diffusion</li>
            <li>ALD: Perfect conformality, layer-by-layer</li>
            <li>Step coverage and aspect ratio relationship</li>
            <li>Void formation at high aspect ratios</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Advanced deposition includes selective deposition (only on certain surfaces), area-selective
            ALD, and hybrid processes that combine multiple methods. These enable self-aligned structures
            and further miniaturization beyond what lithography alone can achieve!
          </p>
        </div>
        {renderVisualization(true, true)}
      </>,
      true,
      'Complete Game'
    );
  }

  return null;
};

export default DepositionTypesRenderer;
