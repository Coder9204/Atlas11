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
  textMuted: '#e2e8f0', // Use high contrast color (brightness >= 180)
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
  const [currentApp, setCurrentApp] = useState(0);
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
      stats: '99.9% transmission, 15+ layers, 0.1% reflection per surface',
      question: 'Why do expensive lenses have more coating layers?',
      answer: 'Single-layer AR works well at one wavelength but poorly at others. Multi-layer coatings stack different thicknesses to cancel reflections across the visible spectrum (400-700nm), reducing total reflection from ~4% to under 0.5%.',
    },
    {
      title: 'Eyeglasses',
      description: 'AR coatings on glasses reduce reflections that cause glare and "ghost" images.',
      stats: '99.5% light transmission, 8x glare reduction, 7 coating layers',
      question: 'Why do AR-coated glasses sometimes look purple or green?',
      answer: 'The coating is optimized for the middle of the visible spectrum (green-yellow). Residual reflection at the blue and red ends creates a slight purple or green tint. Higher quality coatings have more layers to reduce this color.',
    },
    {
      title: 'PERC Solar Cells',
      description: 'Modern PERC cells use optimized SiNx coatings for both AR and passivation.',
      stats: '30% power gain, 75nm optimal thickness, <5% reflection',
      question: 'Why is silicon nitride the dominant AR coating for solar cells?',
      answer: 'SiNx (n~2.0) provides excellent AR for silicon (n~3.5) with just one layer. It also passivates surface defects, reducing recombination. The coating serves dual optical and electrical purposes.',
    },
    {
      title: 'Stealth Technology',
      description: 'Radar-absorbing coatings use the same thin-film interference principles.',
      stats: '90% radar absorption, cm-scale thickness, GHz frequency range',
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

  // Real-world applications of anti-reflective coatings
  const realWorldApps = [
    {
      icon: '👓',
      title: 'Eyeglasses and Lenses',
      short: 'Vision Clarity',
      tagline: 'See the world, not reflections',
      description: 'Anti-reflective coatings on eyeglasses eliminate distracting reflections that cause eye strain and reduce visual clarity. Modern AR coatings use multiple thin-film layers to minimize reflections across the visible spectrum, making lenses nearly invisible.',
      connection: 'The same quarter-wave interference principle used in solar cells applies to eyeglass lenses. Multiple coating layers are tuned to cancel reflections at different wavelengths, achieving less than 0.5% reflection compared to 8% for uncoated glass.',
      howItWorks: 'Eyeglass AR coatings typically use 4-7 alternating layers of high and low refractive index materials (like titanium dioxide and silicon dioxide). Each layer is precisely deposited at quarter-wave thickness for specific wavelengths, creating destructive interference that cancels reflected light across 400-700nm.',
      stats: [
        { value: '99.5%', label: 'Light transmission', icon: '💡' },
        { value: '8x', label: 'Glare reduction', icon: '✨' },
        { value: '7', label: 'Coating layers typical', icon: '📚' },
      ],
      examples: [
        'Premium prescription glasses',
        'High-end sunglasses',
        'Computer glasses for blue light',
        'Safety goggles and visors',
      ],
      companies: ['Zeiss', 'Essilor', 'Hoya', 'Nikon', 'Crizal'],
      futureImpact: 'Next-generation AR coatings will incorporate self-cleaning hydrophobic properties, blue-light filtering, and adaptive tinting while maintaining superior anti-reflective performance.',
      color: '#3b82f6',
    },
    {
      icon: '☀️',
      title: 'Solar Panels',
      short: 'Energy Efficiency',
      tagline: 'Capturing more sunlight, generating more power',
      description: 'Solar cells use silicon nitride AR coatings to reduce reflection from over 30% to under 5%. This single improvement increases power output by 25-30%, making solar energy more economically viable worldwide.',
      connection: 'Silicon nitride (n≈2.0) is nearly ideal for silicon substrates (n≈3.5) because it approximates the geometric mean √(1×3.5)≈1.87. A 75nm coating creates quarter-wave interference at peak solar wavelengths, dramatically reducing reflection losses.',
      howItWorks: 'Solar cell AR coatings are deposited using plasma-enhanced chemical vapor deposition (PECVD). The silicon nitride layer serves dual purposes: reducing optical reflection through thin-film interference and passivating surface defects that would otherwise cause electron recombination losses.',
      stats: [
        { value: '30%', label: 'Power gain from AR', icon: '⚡' },
        { value: '75nm', label: 'Optimal coating thickness', icon: '📏' },
        { value: '<5%', label: 'Reflection with coating', icon: '🎯' },
      ],
      examples: [
        'Rooftop solar installations',
        'Utility-scale solar farms',
        'Space satellite solar arrays',
        'Portable solar chargers',
      ],
      companies: ['First Solar', 'SunPower', 'JinkoSolar', 'LONGi', 'Canadian Solar'],
      futureImpact: 'Advanced multi-layer and nano-textured AR coatings could push solar cell efficiency beyond 30% for single-junction cells, while tandem cells with optimized AR could exceed 40% efficiency.',
      color: '#f59e0b',
    },
    {
      icon: '📷',
      title: 'Camera Lenses',
      short: 'Photography Quality',
      tagline: 'Crystal clear images, zero ghosting',
      description: 'Professional camera lenses use sophisticated multi-layer AR coatings to eliminate lens flare, ghosting, and contrast loss. Without AR coatings, each glass-air interface would reflect 4% of light, severely degrading image quality in complex lens systems.',
      connection: 'Camera lenses with 10-15 glass elements would lose over 50% of light to reflections without AR coatings. Multi-layer thin-film coatings using the same interference principles reduce total reflection to under 0.2%, preserving contrast and preventing ghost images.',
      howItWorks: 'Modern camera lens coatings use nano-structured surfaces combined with traditional thin-film layers. Technologies like Canon\'s SWC (Subwavelength Structure Coating) create gradient refractive index surfaces that virtually eliminate reflections even at extreme angles of incidence.',
      stats: [
        { value: '0.1%', label: 'Reflection per surface', icon: '🔍' },
        { value: '15+', label: 'Coating layers on premium lenses', icon: '🎨' },
        { value: '99.9%', label: 'Light transmission achieved', icon: '💫' },
      ],
      examples: [
        'Professional DSLR lenses',
        'Cinema camera optics',
        'Smartphone camera modules',
        'Telescope and microscope optics',
      ],
      companies: ['Canon', 'Nikon', 'Sony', 'Zeiss', 'Leica'],
      futureImpact: 'Nano-imprint AR coatings and metamaterial surfaces will enable even thinner smartphone cameras with superior low-light performance and zero lens flare artifacts.',
      color: '#8b5cf6',
    },
    {
      icon: '📱',
      title: 'Smartphone Screens',
      short: 'Display Visibility',
      tagline: 'Brilliant displays in any light',
      description: 'Smartphone displays use anti-reflective coatings to remain visible in bright sunlight. AR treatments reduce surface reflections that wash out screen content, improving readability while reducing eye strain during extended use.',
      connection: 'Display AR coatings must balance reflection reduction with durability and fingerprint resistance. Multi-layer designs minimize reflection while oleophobic top layers repel oils. The interference principles are identical to other AR applications but optimized for touch-screen durability.',
      howItWorks: 'Smartphone AR coatings combine thin-film interference layers with nano-textured surfaces. Some displays use circular polarizers that block external reflections while passing display light. Advanced coatings integrate anti-fingerprint oleophobic layers without compromising AR performance.',
      stats: [
        { value: '50%', label: 'Reflection reduction', icon: '📉' },
        { value: '2x', label: 'Sunlight readability improvement', icon: '☀️' },
        { value: '10K', label: 'Touch cycles durability', icon: '👆' },
      ],
      examples: [
        'Flagship smartphone displays',
        'Tablet screens',
        'Smartwatch faces',
        'Automotive touchscreens',
      ],
      companies: ['Apple', 'Samsung', 'Corning', 'AGC', 'Schott'],
      futureImpact: 'Self-healing AR coatings and integrated anti-microbial properties will become standard, while foldable displays will require flexible AR solutions that maintain performance through thousands of fold cycles.',
      color: '#10b981',
    },
  ];

  const renderVisualization = () => {
    const width = 700;
    const height = 500;
    const result = calculateReflectivity();
    const coating = coatings[coatingMaterial];

    // Reflectivity spectrum graph - using absolute coordinates (no g transform offsets)
    const graphX = 40;
    const graphY = 55;
    const graphWidth = 280;
    const graphHeight = 195;

    // Scale factors
    const wlScale = graphWidth / (1100 - 350);
    const rScale = graphHeight / 0.4; // 0-40% reflectivity

    // Create spectrum path with space-separated coords for test parsing
    const spectrumPath = result.spectrum
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + (p.wavelength - 350) * wlScale} ${graphY + graphHeight - p.reflectivity * rScale}`)
      .join(' ');

    // Create filled area under spectrum curve
    const spectrumAreaPath = spectrumPath + ` L ${graphX + graphWidth} ${graphY + graphHeight} L ${graphX} ${graphY + graphHeight} Z`;

    // Thin film diagram offsets (absolute)
    const tfX = 370;
    const tfY = 55;

    // Performance metrics offsets (absolute)
    const pmX = 40;
    const pmY = 290;

    // Gain bar offsets (absolute)
    const gbX = 370;
    const gbY = 290;

    // Wavelength indicator offsets (absolute)
    const wlX = 40;
    const wlY = 400;

    // Interactive point: current thickness position on the spectrum curve
    const currentWl = coatingMaterial === 'none' ? 550 : targetWavelength;
    const currentR = result.spectrum.find(p => Math.abs(p.wavelength - currentWl) < 10)?.reflectivity || result.avgReflectivity / 100;
    const pointCx = graphX + (currentWl - 350) * wlScale;
    const pointCy = graphY + graphHeight - currentR * rScale;

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
            <linearGradient id="arcSiliconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="arcSiNxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            <linearGradient id="arcTiO2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="25%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="75%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            <linearGradient id="arcMgF2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="25%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            <linearGradient id="arcGlassReflection" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* === RADIAL GRADIENTS FOR 3D EFFECTS === */}
            <radialGradient id="arcLightSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="30%" stopColor="#fde047" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#facc15" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="arcOptimalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="arcGraphAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={coating.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={coating.color} stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="arcPerformanceBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient id="arcCardBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            <filter id="arcSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="arcStrongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="arcSpectrumGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="arcDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.3" />
            </filter>

            {/* === PATTERNS === */}
            <pattern id="arcGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

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
          <text x={width / 2} y={48} fill="#e2e8f0" fontSize={12} textAnchor="middle">
            Quarter-wave optical coating simulation
          </text>

          {/* === REFLECTIVITY SPECTRUM GRAPH === */}
          {/* Graph panel */}
          <rect x={graphX - 5} y={graphY - 5} width={graphWidth + 10} height={graphHeight + 50} rx={8} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
          <rect x={graphX - 5} y={graphY - 5} width={graphWidth + 10} height={graphHeight + 50} rx={8} fill="none" stroke="#334155" strokeWidth={1} />
          <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill="#0f172a" rx={4} />

          {/* Grid lines */}
          {[0.1, 0.2, 0.3].map(frac => (
            <line key={`grid-${frac}`} x1={graphX} y1={graphY + graphHeight - frac * rScale} x2={graphX + graphWidth} y2={graphY + graphHeight - frac * rScale} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          ))}

          {/* Y-axis label (rotated) */}
          <g transform={`translate(${graphX - 30}, ${graphY + graphHeight / 2}) rotate(-90)`}>
            <text x={0} y={0} fill="#94a3b8" fontSize={11} textAnchor="middle" fontWeight="600">Reflectivity (%)</text>
          </g>

          {/* Y-axis tick labels - positioned far left to avoid overlap */}
          <text x={graphX - 6} y={graphY + graphHeight - 0.1 * rScale + 4} fill="#94a3b8" fontSize={11} textAnchor="end">10</text>
          <text x={graphX - 6} y={graphY + graphHeight - 0.2 * rScale + 4} fill="#94a3b8" fontSize={11} textAnchor="end">20</text>
          <text x={graphX - 6} y={graphY + graphHeight - 0.3 * rScale + 4} fill="#94a3b8" fontSize={11} textAnchor="end">30</text>

          {/* Bare silicon reference line */}
          <line x1={graphX} y1={graphY + graphHeight - 0.31 * rScale} x2={graphX + graphWidth} y2={graphY + graphHeight - 0.31 * rScale} stroke="#ef4444" strokeWidth={2} strokeDasharray="8,4" filter="url(#arcSoftGlow)" />
          <rect x={graphX + graphWidth + 5} y={graphY + graphHeight - 0.31 * rScale - 10} width={60} height={18} rx={4} fill="#7f1d1d" />
          <text x={graphX + graphWidth + 35} y={graphY + graphHeight - 0.31 * rScale + 3} fill="#fca5a5" fontSize={11} textAnchor="middle" fontWeight="bold">Bare 31%</text>

          {/* Filled area under curve */}
          <path d={spectrumAreaPath} fill="url(#arcGraphAreaFill)" />

          {/* Reflectivity spectrum line with glow */}
          <path d={spectrumPath} fill="none" stroke={coating.color} strokeWidth={3} filter="url(#arcSpectrumGlow)" />

          {/* Interactive point that responds to slider */}
          <circle cx={pointCx} cy={pointCy} r={8} fill={coating.color} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

          {/* Spectrum color bar */}
          <rect x={graphX} y={graphY + graphHeight + 8} width={graphWidth} height={12} fill="url(#arcSpectrumGrad)" rx={6} />
          <rect x={graphX} y={graphY + graphHeight + 8} width={graphWidth} height={6} fill="url(#arcGlassReflection)" rx={3} />

          {/* Axes */}
          <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth} y2={graphY + graphHeight} stroke="#475569" strokeWidth={2} />
          <line x1={graphX} y1={graphY} x2={graphX} y2={graphY + graphHeight} stroke="#475569" strokeWidth={2} />

          {/* X-axis labels - absolute coords */}
          <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 35} fill="#e2e8f0" fontSize={11} textAnchor="middle" fontWeight="600">Wavelength (nm)</text>
          <text x={graphX + 5} y={graphY + graphHeight + 25} fill="#a78bfa" fontSize={11} fontWeight="bold">UV</text>
          <text x={graphX + graphWidth - 5} y={graphY + graphHeight + 25} fill="#f87171" fontSize={11} fontWeight="bold" textAnchor="end">IR</text>

          {/* Optimal point marker */}
          {coatingMaterial !== 'none' && (
            <g>
              <circle cx={graphX + (result.minPoint.wavelength - 350) * wlScale} cy={graphY + graphHeight - result.minPoint.R * rScale} r={12} fill="url(#arcOptimalGlow)">
                <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={graphX + (result.minPoint.wavelength - 350) * wlScale} cy={graphY + graphHeight - result.minPoint.R * rScale} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />
              <rect x={graphX + (result.minPoint.wavelength - 350) * wlScale - 25} y={graphY + graphHeight - result.minPoint.R * rScale - 28} width={50} height={18} rx={4} fill="#065f46" />
              <text x={graphX + (result.minPoint.wavelength - 350) * wlScale} y={graphY + graphHeight - result.minPoint.R * rScale - 15} fill="#6ee7b7" fontSize={11} textAnchor="middle" fontWeight="bold">{result.minPoint.wavelength}nm</text>
            </g>
          )}

          {/* === THIN FILM DIAGRAM === (non-text elements in group, text absolute) */}
          <g transform={`translate(${tfX}, ${tfY})`}>
            <rect x="0" y="0" width="300" height="200" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="300" height="200" rx={10} fill="none" stroke="#334155" strokeWidth={1} />

            {/* Light source */}
            <circle cx="30" cy="55" r="20" fill="url(#arcLightSourceGlow)" filter="url(#arcStrongGlow)">
              <animate attributeName="r" values="18;22;18" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="30" cy="55" r="10" fill="#fef08a" />

            {/* Air layer */}
            <rect x="70" y="40" width="180" height="30" fill="transparent" stroke="#475569" strokeWidth={1} strokeDasharray="4,3" />

            {/* AR Coating layer */}
            <rect x="70" y="70" width="180" height={coatingMaterial === 'none' ? 8 : 40}
              fill={coatingMaterial === 'sin' ? 'url(#arcSiNxGrad)' : coatingMaterial === 'tio2' ? 'url(#arcTiO2Grad)' : coatingMaterial === 'mgf2' ? 'url(#arcMgF2Grad)' : '#374151'}
              opacity={coatingMaterial === 'none' ? 0.3 : 1} rx={2} />
            {coatingMaterial !== 'none' && (
              <rect x="70" y="70" width="180" height="15" fill="url(#arcGlassReflection)" rx={2} />
            )}

            {/* Silicon substrate */}
            <rect x="70" y={coatingMaterial === 'none' ? 78 : 110} width="180" height="70" fill="url(#arcSiliconGrad)" rx={2} />
            <rect x="70" y={coatingMaterial === 'none' ? 78 : 110} width="180" height="25" fill="url(#arcGlassReflection)" rx={2} />

            {/* Incident ray */}
            <g filter="url(#arcSoftGlow)">
              <line x1="45" y1="50" x2="100" y2="70" stroke="#fbbf24" strokeWidth={4} markerEnd="url(#arcArrowhead)" />
              <line x1="45" y1="50" x2="100" y2="70" stroke="#fef3c7" strokeWidth={2} />
            </g>

            {/* R1 reflection */}
            <g filter="url(#arcSoftGlow)">
              <line x1="100" y1="70" x2="55" y2="42" stroke="#ef4444" strokeWidth={3} strokeDasharray="6,3" markerEnd="url(#arcArrowheadRed)" />
            </g>
            <rect x="89" y="28" width="22" height="14" rx={3} fill="#7f1d1d" />

            {/* R2 reflection */}
            {coatingMaterial !== 'none' && (
              <g>
                <line x1="140" y1="70" x2="140" y2="110" stroke="#fbbf24" strokeWidth={2} opacity={0.6} />
                <g filter="url(#arcSoftGlow)">
                  <line x1="140" y1="110" x2="95" y2="42" stroke="#ef4444" strokeWidth={3} strokeDasharray="6,3" markerEnd="url(#arcArrowheadRed)" />
                </g>
                <rect x="115" y="78" width="22" height="14" rx={3} fill="#7f1d1d" />
                <line x1="260" y1="70" x2="260" y2="110" stroke="#f59e0b" strokeWidth={2} />
                <line x1="255" y1="70" x2="265" y2="70" stroke="#f59e0b" strokeWidth={2} />
                <line x1="255" y1="110" x2="265" y2="110" stroke="#f59e0b" strokeWidth={2} />
              </g>
            )}

            {/* Transmitted ray */}
            <g filter="url(#arcSoftGlow)">
              <line x1="180" y1="70" x2="220" y2={coatingMaterial === 'none' ? 148 : 180} stroke="#22c55e" strokeWidth={4} markerEnd="url(#arcArrowheadGreen)" />
              <line x1="180" y1="70" x2="220" y2={coatingMaterial === 'none' ? 148 : 180} stroke="#86efac" strokeWidth={2} />
            </g>
          </g>

          {/* Thin film text labels - absolute coords to avoid overlap */}
          <text x={tfX + 150} y={tfY + 22} fill="#e2e8f0" fontSize={13} fontWeight="bold" textAnchor="middle">Thin Film Structure</text>
          <text x={tfX + 30} y={tfY + 100} fill="#fbbf24" fontSize={11} textAnchor="middle" fontWeight="bold">Light</text>
          <text x={tfX + 160} y={tfY + 58} fill="#94a3b8" fontSize={11} textAnchor="middle">Air (n=1.0)</text>
          {coatingMaterial !== 'none' && (
            <text x={tfX + 160} y={tfY + 95} fill="#ffffff" fontSize={11} textAnchor="middle" fontWeight="bold">{coating.name.split(' ')[0]} (n={coating.n})</text>
          )}
          <text x={tfX + 160} y={coatingMaterial === 'none' ? tfY + 118 : tfY + 150} fill="#94a3b8" fontSize={11} textAnchor="middle" fontWeight="bold">Silicon (n=3.5)</text>
          <text x={tfX + 38} y={tfY + 42} fill="#fbbf24" fontSize={11} fontWeight="bold">Incident</text>
          <text x={tfX + 100} y={tfY + 40} fill="#fca5a5" fontSize={11} textAnchor="middle" fontWeight="bold">R1</text>
          {coatingMaterial !== 'none' && (
            <>
              <text x={tfX + 126} y={tfY + 78} fill="#fca5a5" fontSize={11} textAnchor="middle" fontWeight="bold">R2</text>
              <text x={tfX + 275} y={tfY + 95} fill="#fbbf24" fontSize={11} fontWeight="bold">{coatingThickness}nm</text>
            </>
          )}
          <text x={tfX + 235} y={coatingMaterial === 'none' ? tfY + 155 : tfY + 192} fill="#22c55e" fontSize={11} fontWeight="bold">Transmitted</text>

          {/* === PERFORMANCE METRICS PANEL === (non-text in group, text absolute) */}
          <g transform={`translate(${pmX}, ${pmY})`}>
            <rect x="0" y="0" width="290" height="100" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="290" height="100" rx={10} fill="none" stroke={coating.color} strokeWidth={2} />
            <rect x="0" y="0" width="290" height="24" rx={10} fill={coating.color} opacity={0.2} />
            <rect x="0" y="12" width="290" height="12" fill={coating.color} opacity={0.2} />
          </g>
          <text x={pmX + 145} y={pmY + 18} fill={coating.color} fontSize={13} fontWeight="bold" textAnchor="middle">{coating.name}</text>
          <text x={pmX + 15} y={pmY + 40} fill="#94a3b8" fontSize={11}>Coating Thickness:</text>
          <text x={pmX + 275} y={pmY + 40} fill="#f8fafc" fontSize={12} fontWeight="bold" textAnchor="end">{coatingThickness} nm</text>
          {coatingMaterial !== 'none' && (
            <>
              <text x={pmX + 15} y={pmY + 56} fill="#94a3b8" fontSize={11}>Optimal for {targetWavelength}nm:</text>
              <text x={pmX + 275} y={pmY + 56} fill="#10b981" fontSize={12} fontWeight="bold" textAnchor="end">{result.optimalThickness.toFixed(0)} nm</text>
            </>
          )}
          <text x={pmX + 15} y={pmY + 73} fill="#94a3b8" fontSize={11}>Average Reflectivity:</text>
          <text x={pmX + 275} y={pmY + 73} fill={result.avgReflectivity < 10 ? '#10b981' : '#f59e0b'} fontSize={15} fontWeight="bold" textAnchor="end">{result.avgReflectivity.toFixed(1)}%</text>
          <text x={pmX + 15} y={pmY + 92} fill="#94a3b8" fontSize={11}>Current Gain vs Bare:</text>
          <text x={pmX + 275} y={pmY + 92} fill="#10b981" fontSize={15} fontWeight="bold" textAnchor="end">+{result.currentGain.toFixed(1)}%</text>

          {/* === GAIN PERFORMANCE BAR === (non-text in group, text absolute) */}
          <g transform={`translate(${gbX}, ${gbY})`}>
            <rect x="0" y="0" width="300" height="100" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="300" height="100" rx={10} fill="none" stroke="#10b981" strokeWidth={2} />
            <rect x="20" y="32" width="260" height="28" rx={6} fill="#1e293b" />
            <rect x="20" y="32" width={260 * Math.min(result.currentGain / 35, 1)} height="28" rx={6} fill="url(#arcPerformanceBar)">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
            </rect>
            <rect x="20" y="32" width={260 * Math.min(result.currentGain / 35, 1)} height="10" rx={3} fill="url(#arcGlassReflection)" />
            <rect x="80" y="70" width="140" height="22" rx={6} fill={result.currentGain > 25 ? '#065f46' : result.currentGain > 15 ? '#854d0e' : result.currentGain > 5 ? '#78350f' : '#7f1d1d'} />
          </g>
          <text x={gbX + 150} y={gbY + 20} fill="#10b981" fontSize={13} fontWeight="bold" textAnchor="middle">Performance Gain</text>
          <text x={gbX + 150} y={gbY + 52} fill="#ffffff" fontSize={16} fontWeight="bold" textAnchor="middle">+{result.currentGain.toFixed(1)}%</text>
          <text x={gbX + 150} y={gbY + 86} fill={result.currentGain > 25 ? '#6ee7b7' : result.currentGain > 15 ? '#fcd34d' : result.currentGain > 5 ? '#fdba74' : '#fca5a5'} fontSize={11} fontWeight="bold" textAnchor="middle">
            {result.currentGain > 25 ? 'EXCELLENT' : result.currentGain > 15 ? 'GOOD' : result.currentGain > 5 ? 'MODERATE' : 'POOR'} AR Performance
          </text>

          {/* === WAVELENGTH INDICATOR === (non-text in group, text absolute) */}
          <g transform={`translate(${wlX}, ${wlY})`}>
            <rect x="0" y="0" width="630" height="70" rx={10} fill="url(#arcCardBg)" filter="url(#arcDropShadow)" />
            <rect x="0" y="0" width="630" height="70" rx={10} fill="none" stroke="#334155" strokeWidth={1} />
            <rect x="20" y="25" width="590" height="14" rx={7} fill="url(#arcSpectrumGrad)" />
            <rect x="20" y="25" width="590" height="7" rx={3.5} fill="url(#arcGlassReflection)" />
            <circle cx={20 + ((targetWavelength - 350) / 750) * 590} cy={32} r="10" fill={wavelengthToColor(targetWavelength)} stroke="#ffffff" strokeWidth={3} />
          </g>
          <text x={wlX + 20} y={wlY + 18} fill="#e2e8f0" fontSize={12} fontWeight="bold">Target: {targetWavelength}nm</text>
          <text x={wlX + 20} y={wlY + 58} fill="#a78bfa" fontSize={11} fontWeight="bold">350nm UV</text>
          <text x={wlX + 315} y={wlY + 58} fill="#22c55e" fontSize={11} fontWeight="bold" textAnchor="middle">Visible</text>
          <text x={wlX + 610} y={wlY + 58} fill="#f87171" fontSize={11} fontWeight="bold" textAnchor="end">1100nm IR</text>
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
              style={{ width: '100%', height: '20px', touchAction: 'pan-y', accentColor: coatings[coatingMaterial].color }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>20</span>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>200</span>
            </div>
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
              style={{ width: '100%', height: '20px', touchAction: 'pan-y', accentColor: wavelengthToColor(targetWavelength) }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>400</span>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>900</span>
            </div>
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

  // Top navigation bar with Back/Next navigation
  const renderNavBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
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
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${isFirst ? 'transparent' : colors.accent}`,
              background: isFirst ? 'transparent' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))',
              color: isFirst ? colors.textMuted : colors.accent,
              fontWeight: 'bold',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isFirst ? 0.5 : 1,
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Back
          </button>
          <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>
            {phaseLabels[phase]}
          </span>
          <button
            onClick={goNext}
            disabled={isLast}
            style={{
              padding: '10px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: isLast ? `linear-gradient(135deg, ${colors.success}, #059669)` : `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 'bold',
              cursor: isLast ? 'default' : 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 'bold' }}>
              Anti-Reflective Coatings
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Bare silicon reflects over 30% of sunlight - a huge loss! But a thin coating
                just 75nm thick (1000x thinner than paper) can reduce this to under 5%.
                The magic? Thin-film interference!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Step 1 of 2</p>
          </div>
          {renderVisualization()}

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>
              What happens when you add a thin coating to a solar cell?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5))',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 400,
                    transition: 'all 0.2s ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore AR Coatings</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust coating material and thickness to minimize reflection
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.blue}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.blue }}>Observe:</strong> Watch how changing coating thickness affects the reflectivity spectrum and overall performance.
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
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <h4 style={{ color: colors.success, marginBottom: '8px' }}>Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              AR coatings are used in important real-world applications every day. This technology enables solar panels
              to capture 30% more sunlight, helps engineers design better camera lenses with near-perfect clarity,
              and makes eyeglasses practically invisible. Understanding thin-film interference is essential for
              the photovoltaics industry and modern optical design.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'increase';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
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
              As you predicted, a thin coating uses destructive interference to cancel reflections! Light reflected
              from the top and bottom of the coating can interfere destructively, allowing more
              light to enter the silicon - just as you observed in the simulation.
            </p>
          </div>

          {/* Visual diagram for review */}
          <div style={{ margin: '16px', display: 'flex', justifyContent: 'center' }}>
            <svg width="300" height="200" viewBox="0 0 300 200">
              <defs>
                <linearGradient id="reviewCoatingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
                <linearGradient id="reviewSiliconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="300" height="200" fill="#0f172a" rx="8" />
              <text x="150" y="25" fill="#e2e8f0" fontSize="14" textAnchor="middle" fontWeight="bold">Destructive Interference</text>

              {/* Air layer */}
              <rect x="50" y="40" width="200" height="30" fill="transparent" stroke="#475569" strokeDasharray="4,3" />
              <text x="150" y="58" fill="#94a3b8" fontSize="11" textAnchor="middle">Air (n=1.0)</text>

              {/* Coating */}
              <rect x="50" y="70" width="200" height="40" fill="url(#reviewCoatingGrad)" rx="2" />
              <text x="150" y="95" fill="#fff" fontSize="11" textAnchor="middle">AR Coating (n=2.0)</text>

              {/* Silicon */}
              <rect x="50" y="110" width="200" height="50" fill="url(#reviewSiliconGrad)" rx="2" />
              <text x="150" y="140" fill="#94a3b8" fontSize="11" textAnchor="middle">Silicon (n=3.5)</text>

              {/* Light rays */}
              <line x1="80" y1="35" x2="120" y2="70" stroke="#fbbf24" strokeWidth="3" />
              <line x1="120" y1="70" x2="90" y2="35" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,3" />
              <line x1="160" y1="70" x2="160" y2="110" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
              <line x1="160" y1="110" x2="130" y2="35" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,3" />

              <text x="150" y="180" fill="#10b981" fontSize="11" textAnchor="middle">R1 + R2 = Cancellation (180° phase shift)</text>
            </svg>
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
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 2 of 2</p>
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
              {twistPredictions.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5))',
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
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Tune for Different Colors</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust target wavelength and see how optimal thickness changes
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.blue}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.blue }}>Observe:</strong> Notice how the minimum point in the reflectivity spectrum shifts as you change the target wavelength.
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
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tuned';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
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

          {/* Visual diagram for twist review */}
          <div style={{ margin: '16px', display: 'flex', justifyContent: 'center' }}>
            <svg width="300" height="180" viewBox="0 0 300 180">
              <defs>
                <linearGradient id="twistSpectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="25%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="75%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="300" height="180" fill="#0f172a" rx="8" />
              <text x="150" y="25" fill="#e2e8f0" fontSize="14" textAnchor="middle" fontWeight="bold">Multi-Layer AR Coating</text>

              {/* Spectrum bar */}
              <rect x="30" y="45" width="240" height="15" fill="url(#twistSpectrumGrad)" rx="4" />

              {/* Multiple coating layers */}
              <rect x="50" y="80" width="200" height="12" fill="#60a5fa" rx="2" />
              <rect x="50" y="94" width="200" height="10" fill="#a855f7" rx="2" />
              <rect x="50" y="106" width="200" height="8" fill="#22d3ee" rx="2" />
              <rect x="50" y="116" width="200" height="40" fill="#475569" rx="2" />

              <text x="55" y="89" fill="#fff" fontSize="11" textAnchor="end">Layer 1</text>
              <text x="260" y="100" fill="#fff" fontSize="11">Layer 2</text>
              <text x="55" y="112" fill="#fff" fontSize="11" textAnchor="end">Layer 3</text>
              <text x="150" y="142" fill="#94a3b8" fontSize="11" textAnchor="middle">Silicon</text>

              <text x="150" y="170" fill="#10b981" fontSize="11" textAnchor="middle">Broadband AR: &lt;1% reflection across spectrum</text>
            </svg>
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
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              AR coatings are everywhere!
            </p>
            <p style={{ color: colors.accent, textAlign: 'center', fontSize: '14px' }}>
              App {currentApp + 1} of {transferApplications.length}
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✓ Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>{app.description}</p>
              <p style={{ color: colors.blue, fontSize: '12px', marginBottom: '12px', fontWeight: 'bold' }}>Key Stats: {app.stats}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setTransferCompleted(new Set([...transferCompleted, index]));
                      setCurrentApp(Math.min(index + 1, transferApplications.length - 1));
                    }}
                    style={{
                      padding: '12px 20px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))',
                      color: colors.accent,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Reveal Answer
                  </button>
                  <button
                    onClick={() => {
                      setTransferCompleted(new Set([...transferCompleted, index]));
                      if (index < transferApplications.length - 1) {
                        setCurrentApp(index + 1);
                      }
                    }}
                    style={{
                      padding: '12px 20px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  {index < transferApplications.length - 1 && (
                    <button
                      onClick={() => setCurrentApp(index + 1)}
                      style={{
                        padding: '12px 20px',
                        minHeight: '44px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      Got It - Next App
                    </button>
                  )}
                  {index === transferApplications.length - 1 && (
                    <button
                      onClick={goNext}
                      style={{
                        padding: '12px 20px',
                        minHeight: '44px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      Got It - Continue
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderNavBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold', margin: 0 }}>Q{qIndex + 1} of {testQuestions.length}: {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? '✓ Correct: ' : userAnswer === oIndex ? '✗ Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.blue}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                Test your understanding of anti-reflective coating principles. These questions cover thin-film interference,
                quarter-wave conditions, coating materials, and real-world applications in solar cells, eyeglasses, and camera lenses.
                Answer all {testQuestions.length} questions based on what you learned about how AR coatings reduce reflection through
                destructive interference.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                Q{currentTestQuestion + 1} of {testQuestions.length}
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
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5))',
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
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: `1px solid ${colors.textSecondary}`, background: currentTestQuestion === 0 ? 'transparent' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5))', color: currentTestQuestion === 0 ? colors.textSecondary : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', opacity: currentTestQuestion === 0 ? 0.5 : 1, WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textSecondary : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', opacity: testAnswers.includes(null) ? 0.5 : 1, WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
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
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '100px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
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
      </div>
    );
  }

  return null;
};

export default AntiReflectiveCoatingRenderer;
