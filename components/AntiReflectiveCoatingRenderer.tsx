import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for this game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface AntiReflectiveCoatingRendererProps {
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
  silicon: '#4b5563',
  coating: '#06b6d4',
};

const AntiReflectiveCoatingRenderer: React.FC<AntiReflectiveCoatingRendererProps> = ({
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
  const [coatingThickness, setCoatingThickness] = useState(75); // nm
  const [targetWavelength, setTargetWavelength] = useState(550); // nm
  const [coatingMaterial, setCoatingMaterial] = useState<'none' | 'sin' | 'tio2' | 'mgf2'>('sin');
  const [incidenceAngle, setIncidenceAngle] = useState(0); // degrees

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Coating material properties
  const coatings = {
    none: { name: 'No Coating (Bare Si)', n: 1.0, color: colors.silicon, optimalThickness: 0 },
    sin: { name: 'Silicon Nitride (SiNx)', n: 2.0, color: '#2563eb', optimalThickness: 75 },
    tio2: { name: 'Titanium Dioxide (TiO2)', n: 2.4, color: '#7c3aed', optimalThickness: 60 },
    mgf2: { name: 'Magnesium Fluoride (MgF2)', n: 1.38, color: '#06b6d4', optimalThickness: 100 },
  };

  // Physics calculations
  const calculateReflectivity = useCallback(() => {
    const coating = coatings[coatingMaterial];
    const n1 = 1.0; // Air
    const n2 = coating.n; // Coating
    const n3 = 3.5; // Silicon

    // Optimal thickness for quarter-wave at target wavelength
    const optimalThickness = targetWavelength / (4 * n2);

    // Calculate reflectivity spectrum
    const spectrum: { wavelength: number; reflectivity: number }[] = [];
    const minReflectivities: { wavelength: number; R: number }[] = [];

    for (let wl = 350; wl <= 1100; wl += 10) {
      let R: number;

      if (coatingMaterial === 'none') {
        // Bare silicon - simple Fresnel reflection
        R = Math.pow((n3 - n1) / (n3 + n1), 2);
      } else {
        // Thin-film interference calculation
        const delta = (2 * Math.PI * n2 * coatingThickness) / wl;

        // Fresnel coefficients at interfaces
        const r12 = (n1 - n2) / (n1 + n2);
        const r23 = (n2 - n3) / (n2 + n3);

        // Total reflection with interference
        const numerator = r12 * r12 + r23 * r23 + 2 * r12 * r23 * Math.cos(2 * delta);
        const denominator = 1 + r12 * r12 * r23 * r23 + 2 * r12 * r23 * Math.cos(2 * delta);
        R = numerator / denominator;

        // Adjust for angle of incidence
        const angleRad = (incidenceAngle * Math.PI) / 180;
        const angleFactor = 1 + 0.3 * Math.pow(Math.sin(angleRad), 2);
        R = R * angleFactor;
      }

      spectrum.push({ wavelength: wl, reflectivity: Math.min(R, 1) });

      // Track minimum reflectivity point
      if (spectrum.length > 1) {
        const prev = spectrum[spectrum.length - 2];
        if (prev.reflectivity < R && minReflectivities.length === 0) {
          minReflectivities.push({ wavelength: prev.wavelength, R: prev.reflectivity });
        }
      }
    }

    // Calculate weighted average reflectivity (solar spectrum weighted)
    let totalR = 0;
    let weightSum = 0;
    spectrum.forEach(({ wavelength, reflectivity }) => {
      // Simple solar spectrum weighting (peaks around 500nm)
      const weight = Math.exp(-Math.pow((wavelength - 550) / 200, 2));
      totalR += reflectivity * weight;
      weightSum += weight;
    });
    const avgReflectivity = totalR / weightSum;

    // Current gain from reduced reflection
    const bareReflectivity = Math.pow((3.5 - 1) / (3.5 + 1), 2);
    const currentGain = ((bareReflectivity - avgReflectivity) / bareReflectivity) * 100;

    return {
      spectrum,
      optimalThickness,
      avgReflectivity: avgReflectivity * 100,
      currentGain: Math.max(0, currentGain),
      minPoint: minReflectivities[0] || { wavelength: targetWavelength, R: avgReflectivity },
    };
  }, [coatingMaterial, coatingThickness, targetWavelength, incidenceAngle]);

  const predictions = [
    { id: 'block', label: 'A thin layer blocks some light from entering - reduces absorption' },
    { id: 'same', label: 'A thin layer has no effect - light passes through unchanged' },
    { id: 'increase', label: 'A thin layer can increase light entering through interference' },
    { id: 'heat', label: 'Coatings only affect heat, not light absorption' },
  ];

  const twistPredictions = [
    { id: 'universal', label: 'One coating works equally well for all wavelengths' },
    { id: 'tuned', label: 'Coating thickness must be tuned for optimal wavelength' },
    { id: 'thicker', label: 'Thicker is always better - more coating means less reflection' },
    { id: 'material_only', label: 'Only the coating material matters, not thickness' },
  ];

  const transferApplications = [
    {
      title: 'Camera Lens Coatings',
      description: 'Multi-layer AR coatings on camera lenses reduce flare and increase contrast.',
      question: 'Why do expensive lenses have more coating layers?',
      answer: 'Single-layer AR works well at one wavelength but poorly at others. Multi-layer coatings stack different thicknesses to cancel reflections across the visible spectrum (400-700nm), reducing total reflection from ~4% to under 0.5%.',
    },
    {
      title: 'Eyeglasses',
      description: 'AR coatings on glasses reduce reflections that cause glare and "ghost" images.',
      question: 'Why do AR-coated glasses sometimes look purple or green?',
      answer: 'The coating is optimized for the middle of the visible spectrum (green-yellow). Residual reflection at the blue and red ends creates a slight purple or green tint. Higher quality coatings have more layers to reduce this color.',
    },
    {
      title: 'PERC Solar Cells',
      description: 'Modern PERC cells use optimized SiNx coatings for both AR and passivation.',
      question: 'Why is silicon nitride the dominant AR coating for solar cells?',
      answer: 'SiNx (n~2.0) provides excellent AR for silicon (n~3.5) with just one layer. It also passivates surface defects, reducing recombination. The coating serves dual optical and electrical purposes.',
    },
    {
      title: 'Stealth Technology',
      description: 'Radar-absorbing coatings use the same thin-film interference principles.',
      question: 'How do stealth aircraft use thin-film principles?',
      answer: 'Radar-absorbing materials (RAM) are designed as quarter-wave absorbers at radar frequencies. The coating thickness is matched to microwave wavelengths (cm scale), causing destructive interference of reflected radar signals.',
    },
  ];

  const testQuestions = [
    {
      question: 'Anti-reflective coatings reduce reflection by:',
      options: [
        { text: 'Absorbing incoming light', correct: false },
        { text: 'Destructive interference between front and back surface reflections', correct: true },
        { text: 'Converting light to heat', correct: false },
        { text: 'Bending light around the surface', correct: false },
      ],
    },
    {
      question: 'The optimal thickness for a single-layer AR coating is:',
      options: [
        { text: 'As thin as possible', correct: false },
        { text: 'Quarter-wave (λ/4n) at the target wavelength', correct: true },
        { text: 'Half-wave (λ/2n) at the target wavelength', correct: false },
        { text: 'As thick as possible', correct: false },
      ],
    },
    {
      question: 'For a single-layer AR coating, the ideal refractive index is:',
      options: [
        { text: 'Equal to the substrate', correct: false },
        { text: 'The geometric mean of air and substrate (√(n₁×n₃))', correct: true },
        { text: 'Lower than air', correct: false },
        { text: 'Higher than the substrate', correct: false },
      ],
    },
    {
      question: 'Silicon nitride (SiNx) is popular for solar cells because:',
      options: [
        { text: 'It provides both AR and surface passivation', correct: true },
        { text: 'It is the cheapest material', correct: false },
        { text: 'It works without any thickness control', correct: false },
        { text: 'It only works at one wavelength', correct: false },
      ],
    },
    {
      question: 'Bare silicon reflects approximately what percentage of sunlight?',
      options: [
        { text: '5%', correct: false },
        { text: '15%', correct: false },
        { text: '30-35%', correct: true },
        { text: '50%', correct: false },
      ],
    },
    {
      question: 'As the angle of incidence increases, AR coating performance:',
      options: [
        { text: 'Improves significantly', correct: false },
        { text: 'Decreases as the effective path length changes', correct: true },
        { text: 'Stays exactly the same', correct: false },
        { text: 'Becomes perfect at 45 degrees', correct: false },
      ],
    },
    {
      question: 'Multi-layer AR coatings are used to:',
      options: [
        { text: 'Save money on materials', correct: false },
        { text: 'Achieve low reflectivity across a broader wavelength range', correct: true },
        { text: 'Increase the weight of the panel', correct: false },
        { text: 'Block ultraviolet light', correct: false },
      ],
    },
    {
      question: 'The refractive index of silicon is approximately:',
      options: [
        { text: '1.0 (same as air)', correct: false },
        { text: '1.5 (like glass)', correct: false },
        { text: '3.5', correct: true },
        { text: '10.0', correct: false },
      ],
    },
    {
      question: 'A quarter-wave coating works because:',
      options: [
        { text: 'Light travels λ/4 down and λ/4 back, creating λ/2 total path difference', correct: true },
        { text: 'It blocks a quarter of the light', correct: false },
        { text: 'Only 25% of photons interact with it', correct: false },
        { text: 'The coating vibrates at quarter frequency', correct: false },
      ],
    },
    {
      question: 'The blue-ish appearance of solar cells is due to:',
      options: [
        { text: 'Blue dye in the silicon', correct: false },
        { text: 'The AR coating being optimized for longer wavelengths, reflecting blue', correct: true },
        { text: 'The glass cover', correct: false },
        { text: 'Temperature effects', correct: false },
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

  const wavelengthToColor = (wl: number): string => {
    if (wl < 380) return '#7c3aed';
    if (wl < 450) return '#3b82f6';
    if (wl < 495) return '#06b6d4';
    if (wl < 570) return '#22c55e';
    if (wl < 590) return '#eab308';
    if (wl < 620) return '#f97316';
    if (wl < 700) return '#ef4444';
    return '#991b1b';
  };

  const renderVisualization = () => {
    const width = 700;
    const height = 520;
    const result = calculateReflectivity();
    const coating = coatings[coatingMaterial];

    // Reflectivity spectrum graph
    const graphX = 40;
    const graphY = 60;
    const graphWidth = 280;
    const graphHeight = 150;

    // Scale factors
    const wlScale = graphWidth / (1100 - 350);
    const rScale = graphHeight / 0.4; // 0-40% reflectivity

    // Create spectrum path
    const spectrumPath = result.spectrum
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + (p.wavelength - 350) * wlScale} ${graphY + graphHeight - p.reflectivity * rScale}`)
      .join(' ');

    // Create filled area under spectrum curve
    const spectrumAreaPath = spectrumPath + ` L ${graphX + graphWidth} ${graphY + graphHeight} L ${graphX} ${graphY + graphHeight} Z`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          <defs>
            {/* === PREMIUM BACKGROUND GRADIENTS === */}
            <linearGradient id="arcLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Spectrum color bar gradient */}
            <linearGradient id="arcSpectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="15%" stopColor="#3b82f6" />
              <stop offset="35%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="65%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* === METALLIC AND GLASS GRADIENTS === */}
            {/* Premium silicon wafer gradient with depth */}
            <linearGradient id="arcSiliconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Silicon nitride coating - blue metallic */}
            <linearGradient id="arcSiNxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Titanium dioxide coating - purple metallic */}
            <linearGradient id="arcTiO2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="25%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="75%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            {/* Magnesium fluoride coating - cyan glass */}
            <linearGradient id="arcMgF2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="25%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            {/* Glass surface reflection gradient */}
            <linearGradient id="arcGlassReflection" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* === RADIAL GRADIENTS FOR 3D EFFECTS === */}
            {/* Light source glow */}
            <radialGradient id="arcLightSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="30%" stopColor="#fde047" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#facc15" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* Incident light beam radial */}
            <radialGradient id="arcIncidentBeamGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="40%" stopColor="#fde68a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>

            {/* Reflected ray glow - red */}
            <radialGradient id="arcReflectedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="40%" stopColor="#f87171" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Transmitted ray glow - green */}
            <radialGradient id="arcTransmittedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
              <stop offset="40%" stopColor="#4ade80" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>

            {/* Optimal point marker glow */}
            <radialGradient id="arcOptimalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>

            {/* Graph area fill gradient */}
            <linearGradient id="arcGraphAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={coating.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={coating.color} stopOpacity="0.05" />
            </linearGradient>

            {/* Performance bar gradient */}
            <linearGradient id="arcPerformanceBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Card background gradient */}
            <linearGradient id="arcCardBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            {/* Soft glow filter for light rays */}
            <filter id="arcSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow for light source */}
            <filter id="arcStrongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner glow for panels */}
            <filter id="arcInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
              <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
              <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
            </filter>

            {/* Spectrum line glow */}
            <filter id="arcSpectrumGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Drop shadow for cards */}
            <filter id="arcDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.3" />
            </filter>

            {/* === PATTERNS === */}
            <pattern id="arcGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Arrowhead marker */}
            <marker id="arcArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
            </marker>

            <marker id="arcArrowheadRed" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>

            <marker id="arcArrowheadGreen" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
            </marker>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#arcLabBg)" />
          <rect width={width} height={height} fill="url(#arcGridPattern)" />

          {/* Title with premium styling */}
          <text x={width / 2} y={30} fill="#f8fafc" fontSize={18} fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Anti-Reflective Coating - Thin Film Interference
          </text>
          <text x={width / 2} y={48} fill="#94a3b8" fontSize={11} textAnchor="middle">
            Quarter-wave optical coating simulation
          </text>

          {/* === REFLECTIVITY SPECTRUM GRAPH === */}
          <g transform="translate(0, 10)">
            {/* Graph panel with shadow */}
            <rect x={graphX - 5} y={graphY - 5} width={graphWidth + 10} height={graphHeight + 50} rx={8} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x={graphX - 5} y={graphY - 5} width={graphWidth + 10} height={graphHeight + 50} rx={8} fill="none" stroke="#334155" strokeWidth={1} />

            {/* Graph area background */}
            <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill="#0f172a" rx={4} />

            {/* Grid lines with subtle styling */}
            {[0.1, 0.2, 0.3].map(frac => (
              <g key={`grid-${frac}`}>
                <line x1={graphX} y1={graphY + graphHeight - frac * rScale} x2={graphX + graphWidth} y2={graphY + graphHeight - frac * rScale} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
                <text x={graphX - 8} y={graphY + graphHeight - frac * rScale + 4} fill="#64748b" fontSize={9} textAnchor="end" fontWeight="600">{(frac * 100).toFixed(0)}%</text>
              </g>
            ))}

            {/* Bare silicon reference line with glow */}
            <line x1={graphX} y1={graphY + graphHeight - 0.31 * rScale} x2={graphX + graphWidth} y2={graphY + graphHeight - 0.31 * rScale} stroke="#ef4444" strokeWidth={2} strokeDasharray="8,4" filter="url(#arcSoftGlow)" />
            <rect x={graphX + graphWidth + 5} y={graphY + graphHeight - 0.31 * rScale - 10} width={55} height={18} rx={4} fill="#7f1d1d" />
            <text x={graphX + graphWidth + 32} y={graphY + graphHeight - 0.31 * rScale + 3} fill="#fca5a5" fontSize={9} textAnchor="middle" fontWeight="bold">Bare Si 31%</text>

            {/* Filled area under curve */}
            <path d={spectrumAreaPath} fill="url(#arcGraphAreaFill)" />

            {/* Reflectivity spectrum line with glow */}
            <path d={spectrumPath} fill="none" stroke={coating.color} strokeWidth={3} filter="url(#arcSpectrumGlow)" />

            {/* Spectrum color bar with glass effect */}
            <rect x={graphX} y={graphY + graphHeight + 8} width={graphWidth} height={12} fill="url(#arcSpectrumGrad)" rx={6} />
            <rect x={graphX} y={graphY + graphHeight + 8} width={graphWidth} height={6} fill="url(#arcGlassReflection)" rx={3} />

            {/* Axes */}
            <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth} y2={graphY + graphHeight} stroke="#475569" strokeWidth={2} />
            <line x1={graphX} y1={graphY} x2={graphX} y2={graphY + graphHeight} stroke="#475569" strokeWidth={2} />

            {/* Labels */}
            <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 35} fill="#94a3b8" fontSize={11} textAnchor="middle" fontWeight="600">Wavelength (nm)</text>
            <text x={graphX + 15} y={graphY + graphHeight + 25} fill="#a78bfa" fontSize={9} fontWeight="bold">UV</text>
            <text x={graphX + graphWidth - 15} y={graphY + graphHeight + 25} fill="#f87171" fontSize={9} fontWeight="bold">IR</text>

            {/* Optimal point marker with animated glow */}
            {coatingMaterial !== 'none' && (
              <g>
                <circle cx={graphX + (result.minPoint.wavelength - 350) * wlScale} cy={graphY + graphHeight - result.minPoint.R * rScale} r={12} fill="url(#arcOptimalGlow)">
                  <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={graphX + (result.minPoint.wavelength - 350) * wlScale} cy={graphY + graphHeight - result.minPoint.R * rScale} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />
                <rect x={graphX + (result.minPoint.wavelength - 350) * wlScale - 25} y={graphY + graphHeight - result.minPoint.R * rScale - 28} width={50} height={18} rx={4} fill="#065f46" />
                <text x={graphX + (result.minPoint.wavelength - 350) * wlScale} y={graphY + graphHeight - result.minPoint.R * rScale - 15} fill="#6ee7b7" fontSize={10} textAnchor="middle" fontWeight="bold">{result.minPoint.wavelength}nm</text>
              </g>
            )}
          </g>

          {/* === THIN FILM DIAGRAM === */}
          <g transform="translate(370, 60)">
            {/* Panel background */}
            <rect x="0" y="0" width="300" height="200" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="300" height="200" rx={10} fill="none" stroke="#334155" strokeWidth={1} />

            <text x="150" y="22" fill="#e2e8f0" fontSize={13} fontWeight="bold" textAnchor="middle">Thin Film Structure</text>

            {/* Light source with animated glow */}
            <g transform="translate(30, 55)">
              <circle cx="0" cy="0" r="20" fill="url(#arcLightSourceGlow)" filter="url(#arcStrongGlow)">
                <animate attributeName="r" values="18;22;18" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="10" fill="#fef08a" />
              <text x="0" y="35" fill="#fbbf24" fontSize={9} textAnchor="middle" fontWeight="bold">Light Source</text>
            </g>

            {/* Air layer */}
            <rect x="70" y="40" width="180" height="30" fill="transparent" stroke="#475569" strokeWidth={1} strokeDasharray="4,3" />
            <text x="160" y="58" fill="#64748b" fontSize={10} textAnchor="middle">Air (n = 1.0)</text>

            {/* AR Coating layer with premium gradient */}
            <rect x="70" y="70" width="180" height={coatingMaterial === 'none' ? 8 : 40}
              fill={coatingMaterial === 'sin' ? 'url(#arcSiNxGrad)' : coatingMaterial === 'tio2' ? 'url(#arcTiO2Grad)' : coatingMaterial === 'mgf2' ? 'url(#arcMgF2Grad)' : '#374151'}
              opacity={coatingMaterial === 'none' ? 0.3 : 1}
              rx={2}
            />
            {/* Glass reflection on coating */}
            {coatingMaterial !== 'none' && (
              <rect x="70" y="70" width="180" height="15" fill="url(#arcGlassReflection)" rx={2} />
            )}
            {coatingMaterial !== 'none' && (
              <text x="160" y="95" fill="#ffffff" fontSize={10} textAnchor="middle" fontWeight="bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{coating.name.split(' ')[0]} (n = {coating.n})</text>
            )}

            {/* Silicon substrate with metallic gradient */}
            <rect x="70" y={coatingMaterial === 'none' ? 78 : 110} width="180" height="70" fill="url(#arcSiliconGrad)" rx={2} />
            <rect x="70" y={coatingMaterial === 'none' ? 78 : 110} width="180" height="25" fill="url(#arcGlassReflection)" rx={2} />
            <text x="160" y={coatingMaterial === 'none' ? 118 : 150} fill="#94a3b8" fontSize={10} textAnchor="middle" fontWeight="bold">Silicon (n = 3.5)</text>

            {/* === ANIMATED LIGHT RAYS === */}
            {/* Incident ray with glow */}
            <g filter="url(#arcSoftGlow)">
              <line x1="45" y1="50" x2="100" y2="70" stroke="#fbbf24" strokeWidth={4} markerEnd="url(#arcArrowhead)">
                <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
              </line>
              <line x1="45" y1="50" x2="100" y2="70" stroke="#fef3c7" strokeWidth={2}>
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              </line>
            </g>
            <text x="55" y="45" fill="#fbbf24" fontSize={9} fontWeight="bold">Incident</text>

            {/* R1 - First surface reflection */}
            <g filter="url(#arcSoftGlow)">
              <line x1="100" y1="70" x2="55" y2="42" stroke="#ef4444" strokeWidth={3} strokeDasharray="6,3" markerEnd="url(#arcArrowheadRed)">
                <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </line>
            </g>
            <rect x="68" y="48" width="22" height="14" rx={3} fill="#7f1d1d" />
            <text x="79" y="58" fill="#fca5a5" fontSize={8} textAnchor="middle" fontWeight="bold">R1</text>

            {/* R2 - Second surface reflection (coating-silicon interface) */}
            {coatingMaterial !== 'none' && (
              <g>
                <line x1="140" y1="70" x2="140" y2="110" stroke="#fbbf24" strokeWidth={2} opacity={0.6}>
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
                </line>
                <g filter="url(#arcSoftGlow)">
                  <line x1="140" y1="110" x2="95" y2="42" stroke="#ef4444" strokeWidth={3} strokeDasharray="6,3" markerEnd="url(#arcArrowheadRed)">
                    <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.5s" />
                  </line>
                </g>
                <rect x="115" y="78" width="22" height="14" rx={3} fill="#7f1d1d" />
                <text x="126" y="88" fill="#fca5a5" fontSize={8} textAnchor="middle" fontWeight="bold">R2</text>

                {/* Phase shift indicator */}
                <text x="85" y="35" fill="#f87171" fontSize={8} fontWeight="bold">180deg phase shift</text>
              </g>
            )}

            {/* Transmitted ray with glow */}
            <g filter="url(#arcSoftGlow)">
              <line x1="180" y1="70" x2="220" y2={coatingMaterial === 'none' ? 148 : 180} stroke="#22c55e" strokeWidth={4} markerEnd="url(#arcArrowheadGreen)">
                <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
              </line>
              <line x1="180" y1="70" x2="220" y2={coatingMaterial === 'none' ? 148 : 180} stroke="#86efac" strokeWidth={2}>
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              </line>
            </g>
            <text x="235" y={coatingMaterial === 'none' ? 155 : 185} fill="#22c55e" fontSize={9} fontWeight="bold">Transmitted</text>

            {/* Thickness annotation */}
            {coatingMaterial !== 'none' && (
              <g>
                <line x1="260" y1="70" x2="260" y2="110" stroke="#f59e0b" strokeWidth={2} />
                <line x1="255" y1="70" x2="265" y2="70" stroke="#f59e0b" strokeWidth={2} />
                <line x1="255" y1="110" x2="265" y2="110" stroke="#f59e0b" strokeWidth={2} />
                <text x="275" y="95" fill="#fbbf24" fontSize={9} fontWeight="bold">{coatingThickness}nm</text>
              </g>
            )}
          </g>

          {/* === PERFORMANCE METRICS PANEL === */}
          <g transform="translate(40, 290)">
            <rect x="0" y="0" width="290" height="110" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="290" height="110" rx={10} fill="none" stroke={coating.color} strokeWidth={2} />

            {/* Material name header */}
            <rect x="0" y="0" width="290" height="28" rx={10} fill={coating.color} opacity={0.2} />
            <rect x="0" y="14" width="290" height="14" fill={coating.color} opacity={0.2} />
            <text x="145" y="20" fill={coating.color} fontSize={13} fontWeight="bold" textAnchor="middle">{coating.name}</text>

            {/* Metrics with improved styling */}
            <text x="15" y="48" fill="#94a3b8" fontSize={11}>Coating Thickness:</text>
            <text x="275" y="48" fill="#f8fafc" fontSize={12} fontWeight="bold" textAnchor="end">{coatingThickness} nm</text>

            {coatingMaterial !== 'none' && (
              <>
                <text x="15" y="66" fill="#94a3b8" fontSize={11}>Optimal for {targetWavelength}nm:</text>
                <text x="275" y="66" fill="#10b981" fontSize={12} fontWeight="bold" textAnchor="end">{result.optimalThickness.toFixed(0)} nm</text>
              </>
            )}

            <text x="15" y="86" fill="#94a3b8" fontSize={11}>Average Reflectivity:</text>
            <text x="275" y="86" fill={result.avgReflectivity < 10 ? '#10b981' : '#f59e0b'} fontSize={15} fontWeight="bold" textAnchor="end">{result.avgReflectivity.toFixed(1)}%</text>

            <text x="15" y="104" fill="#94a3b8" fontSize={11}>Current Gain vs Bare:</text>
            <text x="275" y="104" fill="#10b981" fontSize={15} fontWeight="bold" textAnchor="end">+{result.currentGain.toFixed(1)}%</text>
          </g>

          {/* === GAIN PERFORMANCE BAR === */}
          <g transform="translate(370, 290)">
            <rect x="0" y="0" width="300" height="110" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="300" height="110" rx={10} fill="none" stroke="#10b981" strokeWidth={2} />

            <text x="150" y="22" fill="#10b981" fontSize={13} fontWeight="bold" textAnchor="middle">Performance Gain</text>

            {/* Animated performance bar */}
            <rect x="20" y="38" width="260" height="30" rx={6} fill="#1e293b" />
            <rect x="20" y="38" width={260 * Math.min(result.currentGain / 35, 1)} height="30" rx={6} fill="url(#arcPerformanceBar)">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
            </rect>
            <rect x="20" y="38" width={260 * Math.min(result.currentGain / 35, 1)} height="10" rx={3} fill="url(#arcGlassReflection)" />
            <text x="150" y="58" fill="#ffffff" fontSize={16} fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              +{result.currentGain.toFixed(1)}%
            </text>

            {/* Performance rating */}
            <rect x="80" y="78" width="140" height="22" rx={6} fill={result.currentGain > 25 ? '#065f46' : result.currentGain > 15 ? '#854d0e' : result.currentGain > 5 ? '#78350f' : '#7f1d1d'} />
            <text x="150" y="93" fill={result.currentGain > 25 ? '#6ee7b7' : result.currentGain > 15 ? '#fcd34d' : result.currentGain > 5 ? '#fdba74' : '#fca5a5'} fontSize={11} fontWeight="bold" textAnchor="middle">
              {result.currentGain > 25 ? 'EXCELLENT' : result.currentGain > 15 ? 'GOOD' : result.currentGain > 5 ? 'MODERATE' : 'POOR'} AR Performance
            </text>
          </g>

          {/* === WAVELENGTH INDICATOR === */}
          <g transform="translate(40, 420)">
            <rect x="0" y="0" width="630" height="80" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="630" height="80" rx={10} fill="none" stroke="#334155" strokeWidth={1} />

            <text x="20" y="22" fill="#e2e8f0" fontSize={12} fontWeight="bold">Target Wavelength: <tspan fill={wavelengthToColor(targetWavelength)}>{targetWavelength}nm</tspan></text>

            {/* Spectrum bar with interactive indicator */}
            <rect x="20" y="35" width="590" height="14" rx={7} fill="url(#arcSpectrumGrad)" />
            <rect x="20" y="35" width="590" height="7" rx={3.5} fill="url(#arcGlassReflection)" />

            {/* Animated wavelength indicator */}
            <g transform={`translate(${20 + ((targetWavelength - 350) / 750) * 590}, 42)`}>
              <circle cx="0" cy="0" r="14" fill={wavelengthToColor(targetWavelength)} opacity="0.4">
                <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="10" fill={wavelengthToColor(targetWavelength)} stroke="#ffffff" strokeWidth={3} />
            </g>

            <text x="20" y="70" fill="#a78bfa" fontSize={10} fontWeight="bold">350nm (UV)</text>
            <text x="315" y="70" fill="#22c55e" fontSize={10} fontWeight="bold" textAnchor="middle">Visible</text>
            <text x="610" y="70" fill="#f87171" fontSize={10} fontWeight="bold" textAnchor="end">1100nm (IR)</text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Coating Material:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(coatings).map(([key, mat]) => (
            <button
              key={key}
              onClick={() => setCoatingMaterial(key as typeof coatingMaterial)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: coatingMaterial === key ? `2px solid ${mat.color}` : '1px solid rgba(255,255,255,0.2)',
                background: coatingMaterial === key ? `${mat.color}22` : 'transparent',
                color: mat.color,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '11px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {mat.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {coatingMaterial !== 'none' && (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Coating Thickness: {coatingThickness} nm
            </label>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={coatingThickness}
              onChange={(e) => setCoatingThickness(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: coatings[coatingMaterial].color }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Target Wavelength: {targetWavelength} nm
            </label>
            <input
              type="range"
              min="400"
              max="900"
              step="10"
              value={targetWavelength}
              onChange={(e) => setTargetWavelength(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: wavelengthToColor(targetWavelength) }}
            />
          </div>
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          <strong>Quarter-Wave Rule:</strong> Optimal thickness = λ / (4 × n)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          For {targetWavelength}nm with n={coatings[coatingMaterial].n}: {(targetWavelength / (4 * coatings[coatingMaterial].n)).toFixed(0)}nm
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
              Anti-Reflective Coatings
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can a thin layer increase light entering silicon?
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
                Bare silicon reflects over 30% of sunlight - a huge loss! But a thin coating
                just 75nm thick (1000x thinner than paper) can reduce this to under 5%.
                The magic? Thin-film interference!
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
              What happens when you add a thin coating to a solar cell?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore AR Coatings</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust coating material and thickness to minimize reflection
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
              <li>Find the optimal thickness for 550nm (peak solar spectrum)</li>
              <li>Compare different coating materials</li>
              <li>Notice how wrong thickness can make reflection worse!</li>
              <li>See why solar cells look blue (optimized for red)</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'increase';

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
              {wasCorrect ? 'Correct!' : 'Counterintuitive but true!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              A thin coating uses destructive interference to cancel reflections! Light reflected
              from the top and bottom of the coating can interfere destructively, allowing more
              light to enter the silicon.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Thin-Film Interference</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Quarter-Wave Condition:</strong> When
                thickness = λ/(4n), light travels λ/4 down and λ/4 back through the coating.
                This creates a λ/2 path difference, causing destructive interference.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Ideal Refractive Index:</strong> For
                perfect cancellation, the coating's n should equal √(n_air × n_silicon) ≈ 1.87.
                Silicon nitride (n ≈ 2.0) is close to ideal!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Why Blue?</strong> Solar cells optimize
                the coating for ~600-650nm (orange-red) where solar intensity peaks. This leaves
                blue light partially reflected, giving cells their characteristic color.
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
              What if we want to optimize for different colors?
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
              The sun emits light across a wide spectrum. A single coating thickness can
              only be optimal at one wavelength. How do we deal with this limitation?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does coating thickness affect performance at different wavelengths?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Tune for Different Colors</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust target wavelength and see how optimal thickness changes
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
              Each wavelength has a different optimal thickness. Commercial cells optimize
              for 600-650nm where solar power peaks. Multi-layer coatings can broaden
              the low-reflection region across more of the spectrum!
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tuned';

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
              {wasCorrect ? 'Correct!' : 'Thickness is critical!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The optimal thickness changes with wavelength. A coating perfect for 550nm
              won't work as well at 400nm or 700nm. This is why multi-layer coatings
              are used for broadband AR.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Broadband AR Strategies</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Multi-Layer Coatings:</strong> Stack
                multiple layers with different thicknesses. Each layer cancels reflections at
                different wavelengths, creating broadband AR.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Graded Index:</strong> Gradually
                transition from n=1 (air) to n=3.5 (Si) using nanostructured surfaces. This
                eliminates abrupt interfaces that cause reflection.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Moth-Eye Structures:</strong>
                Nanoscale textures inspired by moth eyes create effective n gradients, achieving
                reflection below 1% across visible and near-IR!
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
              AR coatings are everywhere!
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered AR coatings!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Thin-film interference cancels reflections</li>
              <li>Quarter-wave condition: d = λ/(4n)</li>
              <li>Ideal n = √(n_air × n_substrate)</li>
              <li>Single layers optimize one wavelength</li>
              <li>Multi-layer provides broadband AR</li>
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

export default AntiReflectiveCoatingRenderer;
