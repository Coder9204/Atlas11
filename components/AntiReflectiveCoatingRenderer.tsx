import React, { useState, useCallback } from 'react';

interface AntiReflectiveCoatingRendererProps {
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
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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
    const width = 550;
    const height = 480;
    const result = calculateReflectivity();
    const coating = coatings[coatingMaterial];

    // Reflectivity spectrum graph
    const graphX = 40;
    const graphY = 50;
    const graphWidth = 260;
    const graphHeight = 140;

    // Scale factors
    const wlScale = graphWidth / (1100 - 350);
    const rScale = graphHeight / 0.4; // 0-40% reflectivity

    // Create spectrum path
    const spectrumPath = result.spectrum
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + (p.wavelength - 350) * wlScale} ${graphY + graphHeight - p.reflectivity * rScale}`)
      .join(' ');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '600px' }}
        >
          <defs>
            <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.purple} />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width / 2} y={25} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle">
            Anti-Reflective Coating - Thin Film Interference
          </text>

          {/* Reflectivity Spectrum Graph */}
          <g transform="translate(0, 0)">
            <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill="#111827" rx={4} />

            {/* Grid lines */}
            {[0.1, 0.2, 0.3].map(frac => (
              <g key={`grid-${frac}`}>
                <line x1={graphX} y1={graphY + graphHeight - frac * rScale} x2={graphX + graphWidth} y2={graphY + graphHeight - frac * rScale} stroke="#374151" strokeWidth={1} strokeDasharray="2,2" />
                <text x={graphX - 5} y={graphY + graphHeight - frac * rScale + 4} fill={colors.textMuted} fontSize={8} textAnchor="end">{(frac * 100).toFixed(0)}%</text>
              </g>
            ))}

            {/* Bare silicon reference line */}
            <line x1={graphX} y1={graphY + graphHeight - 0.31 * rScale} x2={graphX + graphWidth} y2={graphY + graphHeight - 0.31 * rScale} stroke={colors.error} strokeWidth={1} strokeDasharray="5,3" />
            <text x={graphX + graphWidth + 5} y={graphY + graphHeight - 0.31 * rScale + 4} fill={colors.error} fontSize={8}>Bare Si</text>

            {/* Reflectivity spectrum */}
            <path d={spectrumPath} fill="none" stroke={coating.color} strokeWidth={2} />

            {/* Spectrum color bar */}
            <rect x={graphX} y={graphY + graphHeight + 5} width={graphWidth} height={8} fill="url(#spectrumGrad)" rx={2} />

            {/* Axes */}
            <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={1} />
            <line x1={graphX} y1={graphY} x2={graphX} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={1} />

            {/* Labels */}
            <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 25} fill={colors.textMuted} fontSize={10} textAnchor="middle">Wavelength (nm)</text>
            <text x={graphX + 30} y={graphY + graphHeight + 17} fill={colors.textMuted} fontSize={8}>UV</text>
            <text x={graphX + graphWidth - 30} y={graphY + graphHeight + 17} fill={colors.textMuted} fontSize={8}>IR</text>
            <text x={graphX - 30} y={graphY + graphHeight / 2} fill={colors.textMuted} fontSize={9} textAnchor="middle" transform={`rotate(-90, ${graphX - 30}, ${graphY + graphHeight / 2})`}>Reflectivity</text>

            {/* Optimal point marker */}
            {coatingMaterial !== 'none' && (
              <g>
                <circle cx={graphX + (result.minPoint.wavelength - 350) * wlScale} cy={graphY + graphHeight - result.minPoint.R * rScale} r={5} fill={colors.success} />
                <text x={graphX + (result.minPoint.wavelength - 350) * wlScale} y={graphY + graphHeight - result.minPoint.R * rScale - 10} fill={colors.success} fontSize={9} textAnchor="middle">{result.minPoint.wavelength}nm</text>
              </g>
            )}
          </g>

          {/* Thin Film Diagram */}
          <g transform="translate(330, 50)">
            <rect x="0" y="0" width="190" height="140" rx={8} fill="#111827" stroke={colors.textMuted} strokeWidth={1} />
            <text x="95" y="18" fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">Thin Film Structure</text>

            {/* Air layer */}
            <rect x="20" y="30" width="150" height="25" fill="transparent" stroke={colors.textMuted} strokeWidth={1} strokeDasharray="3,2" />
            <text x="95" y="46" fill={colors.textMuted} fontSize={9} textAnchor="middle">Air (n=1.0)</text>

            {/* AR Coating layer */}
            <rect x="20" y="55" width="150" height={coatingMaterial === 'none' ? 5 : 30} fill={coating.color} opacity={coatingMaterial === 'none' ? 0.2 : 0.6} />
            {coatingMaterial !== 'none' && (
              <text x="95" y="74" fill="white" fontSize={9} textAnchor="middle">{coating.name.split(' ')[0]} (n={coating.n})</text>
            )}

            {/* Silicon substrate */}
            <rect x="20" y={coatingMaterial === 'none' ? 60 : 85} width="150" height="45" fill={colors.silicon} />
            <text x="95" y={coatingMaterial === 'none' ? 85 : 112} fill={colors.textSecondary} fontSize={9} textAnchor="middle">Silicon (n=3.5)</text>

            {/* Light ray arrows */}
            {/* Incident ray */}
            <line x1="50" y1="5" x2="70" y2="30" stroke={colors.accent} strokeWidth={2} markerEnd="url(#arrowhead)" />
            <text x="40" y="20" fill={colors.accent} fontSize={8}>Incident</text>

            {/* Reflected ray */}
            <line x1="70" y1="30" x2="50" y2="5" stroke={colors.error} strokeWidth={1.5} strokeDasharray="3,2" />
            <text x="55" y="10" fill={colors.error} fontSize={7}>R1</text>

            {/* Interface reflection (back surface of coating) */}
            {coatingMaterial !== 'none' && (
              <g>
                <line x1="90" y1="30" x2="90" y2="85" stroke={colors.accent} strokeWidth={1} />
                <line x1="90" y1="85" x2="70" y2="5" stroke={colors.error} strokeWidth={1.5} strokeDasharray="3,2" />
                <text x="100" y="60" fill={colors.error} fontSize={7}>R2</text>
              </g>
            )}

            {/* Transmitted ray */}
            <line x1="110" y1="30" x2="130" y2={coatingMaterial === 'none' ? 100 : 130} stroke={colors.success} strokeWidth={2} />
            <text x="135" y="115" fill={colors.success} fontSize={8}>Transmitted</text>
          </g>

          {/* Performance Metrics */}
          <g transform="translate(40, 220)">
            <rect x="0" y="0" width="260" height="100" rx={8} fill="#111827" stroke={coating.color} strokeWidth={1} />
            <text x="130" y="18" fill={coating.color} fontSize={12} fontWeight="bold" textAnchor="middle">{coating.name}</text>

            {/* Thickness */}
            <text x="15" y="40" fill={colors.textSecondary} fontSize={10}>Coating Thickness:</text>
            <text x="245" y="40" fill={colors.textPrimary} fontSize={11} fontWeight="bold" textAnchor="end">{coatingThickness} nm</text>

            {/* Optimal thickness */}
            {coatingMaterial !== 'none' && (
              <>
                <text x="15" y="55" fill={colors.textSecondary} fontSize={10}>Optimal for {targetWavelength}nm:</text>
                <text x="245" y="55" fill={colors.success} fontSize={11} fontWeight="bold" textAnchor="end">{result.optimalThickness.toFixed(0)} nm</text>
              </>
            )}

            {/* Average reflectivity */}
            <text x="15" y="75" fill={colors.textSecondary} fontSize={10}>Average Reflectivity:</text>
            <text x="245" y="75" fill={result.avgReflectivity < 10 ? colors.success : colors.warning} fontSize={14} fontWeight="bold" textAnchor="end">{result.avgReflectivity.toFixed(1)}%</text>

            {/* Current gain */}
            <text x="15" y="92" fill={colors.textSecondary} fontSize={10}>Current Gain vs Bare:</text>
            <text x="245" y="92" fill={colors.success} fontSize={14} fontWeight="bold" textAnchor="end">+{result.currentGain.toFixed(1)}%</text>
          </g>

          {/* Current Gain Bar */}
          <g transform="translate(330, 220)">
            <rect x="0" y="0" width="190" height="100" rx={8} fill="#111827" stroke={colors.success} strokeWidth={1} />
            <text x="95" y="18" fill={colors.success} fontSize={11} fontWeight="bold" textAnchor="middle">Current Gain Estimate</text>

            {/* Gain bar */}
            <rect x="20" y="35" width="150" height="25" rx={4} fill="#374151" />
            <rect x="20" y="35" width={150 * Math.min(result.currentGain / 35, 1)} height="25" rx={4} fill={colors.success} />
            <text x="95" y="52" fill="white" fontSize={14} fontWeight="bold" textAnchor="middle">
              +{result.currentGain.toFixed(1)}%
            </text>

            <text x="95" y="80" fill={colors.textMuted} fontSize={9} textAnchor="middle">
              {result.currentGain > 25 ? 'Excellent' : result.currentGain > 15 ? 'Good' : result.currentGain > 5 ? 'Moderate' : 'Poor'} AR Performance
            </text>
            <text x="95" y="92" fill={colors.textMuted} fontSize={8} textAnchor="middle">
              (Bare silicon reflects ~31%)
            </text>
          </g>

          {/* Visual comparison */}
          <g transform="translate(40, 340)">
            <rect x="0" y="0" width="470" height="55" rx={8} fill="rgba(245, 158, 11, 0.1)" stroke={colors.accent} strokeWidth={1} />

            <text x="20" y="18" fill={colors.textSecondary} fontSize={10}>Reflection Comparison:</text>

            {/* Bare silicon */}
            <rect x="20" y="25" width={100} height="18" rx={4} fill={colors.error} opacity={0.6} />
            <text x="70" y="37" fill="white" fontSize={9} textAnchor="middle">Bare Si: 31%</text>

            {/* With coating */}
            <rect x="140" y="25" width={100 * (result.avgReflectivity / 31)} height="18" rx={4} fill={colors.success} opacity={0.8} />
            <text x={140 + 50 * (result.avgReflectivity / 31)} y="37" fill="white" fontSize={9} textAnchor="middle">AR: {result.avgReflectivity.toFixed(0)}%</text>

            {/* Reduction arrow */}
            <text x="300" y="37" fill={colors.success} fontSize={11} fontWeight="bold">
              Reflection reduced by {(31 - result.avgReflectivity).toFixed(0)}%
            </text>
          </g>

          {/* Wavelength indicator */}
          <g transform="translate(40, 410)">
            <rect x="0" y="0" width="470" height="50" rx={8} fill="#111827" />
            <text x="20" y="18" fill={colors.textSecondary} fontSize={10}>Target Wavelength: {targetWavelength}nm</text>
            <rect x="20" y="25" width="430" height="6} rx={2}" fill="#374151" />
            <circle cx={20 + ((targetWavelength - 350) / 750) * 430} cy="28" r="8" fill={wavelengthToColor(targetWavelength)} stroke="white" strokeWidth={2} />
            <text x="20" y="45" fill={colors.textMuted} fontSize={8}>350nm (UV)</text>
            <text x="450" y="45" fill={colors.textMuted} fontSize={8} textAnchor="end">1100nm (IR)</text>
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
          WebkitTapHighlightColor: 'transparent',
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
        {renderBottomBar(false, true, 'Make a Prediction')}
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
        {renderBottomBar(false, true, 'Continue to Review')}
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
        {renderBottomBar(false, true, 'See the Explanation')}
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
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default AntiReflectiveCoatingRenderer;
