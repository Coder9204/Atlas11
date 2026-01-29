'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 183: PHOTOLITHOGRAPHY RESOLUTION
// ============================================================================
// Physics: Rayleigh criterion limits resolution to ~wavelength/2
// EUV (13.5nm) enables smaller features than DUV (193nm)
// Multiple patterning techniques overcome the diffraction limit
// ============================================================================

interface PhotolithographyRendererProps {
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
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  uv: '#8b5cf6',
  euv: '#06b6d4',
  photoresist: '#f97316',
  silicon: '#475569',
};

const PhotolithographyRenderer: React.FC<PhotolithographyRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
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
      question: 'What is the Rayleigh criterion for optical resolution?',
      options: [
        { text: 'Resolution = wavelength x NA', correct: false },
        { text: 'Resolution = k1 x wavelength / NA', correct: true },
        { text: 'Resolution = wavelength / 2', correct: false },
        { text: 'Resolution = NA / wavelength', correct: false },
      ],
    },
    {
      question: 'Why did the industry move from 248nm to 193nm DUV light?',
      options: [
        { text: 'It was cheaper to produce', correct: false },
        { text: 'Shorter wavelength enables smaller feature sizes', correct: true },
        { text: 'It produces brighter light', correct: false },
        { text: 'It works better with silicon', correct: false },
      ],
    },
    {
      question: 'What is the wavelength of EUV light used in advanced lithography?',
      options: [
        { text: '193nm', correct: false },
        { text: '50nm', correct: false },
        { text: '13.5nm', correct: true },
        { text: '1nm', correct: false },
      ],
    },
    {
      question: 'How does immersion lithography improve resolution?',
      options: [
        { text: 'Water cools the wafer allowing higher power', correct: false },
        { text: 'Water between lens and wafer increases effective NA', correct: true },
        { text: 'Water filters out unwanted wavelengths', correct: false },
        { text: 'Water acts as a secondary lens', correct: false },
      ],
    },
    {
      question: 'What is "multiple patterning" in lithography?',
      options: [
        { text: 'Printing multiple chips at once', correct: false },
        { text: 'Using multiple exposures to create features smaller than single-exposure limit', correct: true },
        { text: 'Stacking multiple wafers', correct: false },
        { text: 'Using multiple colors of light simultaneously', correct: false },
      ],
    },
    {
      question: 'Why is EUV lithography performed in vacuum?',
      options: [
        { text: 'To prevent wafer contamination', correct: false },
        { text: 'EUV light is absorbed by air', correct: true },
        { text: 'To improve heat dissipation', correct: false },
        { text: 'To reduce vibration', correct: false },
      ],
    },
    {
      question: 'What is numerical aperture (NA) in lithography?',
      options: [
        { text: 'The number of lenses in the system', correct: false },
        { text: 'A measure of light-gathering ability related to acceptance angle', correct: true },
        { text: 'The aperture size in millimeters', correct: false },
        { text: 'The number of exposure steps', correct: false },
      ],
    },
    {
      question: 'Why do modern masks require Optical Proximity Correction (OPC)?',
      options: [
        { text: 'To correct for lens aberrations only', correct: false },
        { text: 'To pre-distort patterns to account for diffraction effects', correct: true },
        { text: 'To make masks easier to manufacture', correct: false },
        { text: 'To reduce the cost of masks', correct: false },
      ],
    },
    {
      question: 'What limits how small k1 factor can be in practice?',
      options: [
        { text: 'The speed of the exposure system', correct: false },
        { text: 'Process complexity and yield considerations', correct: true },
        { text: 'The wavelength of light used', correct: false },
        { text: 'The size of the wafer', correct: false },
      ],
    },
    {
      question: 'Approximately how much does an ASML EUV lithography machine cost?',
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
    const width = 400;
    const height = 380;
    const output = calculateResolution();

    // Pattern visualization
    const patternY = 180;
    const featureWidth = Math.max(2, output.effectiveResolution / 5);
    const numFeatures = Math.floor(300 / (featureWidth * 2));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            Photolithography: {output.isEUV ? 'EUV' : 'DUV'} at {wavelength}nm
          </text>

          {/* Light source */}
          <g transform="translate(50, 45)">
            <rect x={0} y={0} width={60} height={30} fill={output.isEUV ? colors.euv : colors.uv} rx={4} />
            <text x={30} y={20} fill="white" fontSize={10} textAnchor="middle" fontWeight="bold">
              {output.isEUV ? 'EUV' : 'DUV'}
            </text>
            {/* Light rays */}
            {[...Array(5)].map((_, i) => (
              <line
                key={i}
                x1={10 + i * 10}
                y1={30}
                x2={10 + i * 10}
                y2={55}
                stroke={output.isEUV ? colors.euv : colors.uv}
                strokeWidth={2}
                opacity={0.7}
              >
                <animate
                  attributeName="y2"
                  values="55;60;55"
                  dur="1s"
                  repeatCount="indefinite"
                  begin={`${i * 0.1}s`}
                />
              </line>
            ))}
          </g>

          {/* Wavelength indicator */}
          <text x={130} y={65} fill={colors.textMuted} fontSize={10}>
            lambda = {wavelength}nm
          </text>

          {/* Mask */}
          <g transform="translate(50, 105)">
            <rect x={0} y={0} width={140} height={20} fill="#1f2937" />
            {/* Mask pattern - alternating clear/opaque */}
            {[...Array(7)].map((_, i) => (
              <rect
                key={i}
                x={10 + i * 20}
                y={0}
                width={10}
                height={20}
                fill={i % 2 === 0 ? 'transparent' : '#0f172a'}
              />
            ))}
            <text x={70} y={-5} fill={colors.textMuted} fontSize={9} textAnchor="middle">Mask</text>
          </g>

          {/* Lens system */}
          <g transform="translate(200, 55)">
            <ellipse cx={40} cy={30} rx={35} ry={15} fill="none" stroke={colors.textSecondary} strokeWidth={2} />
            <ellipse cx={40} cy={60} rx={40} ry={18} fill="none" stroke={colors.textSecondary} strokeWidth={2} />
            <text x={40} y={90} fill={colors.textMuted} fontSize={9} textAnchor="middle">Lens (NA={numericalAperture})</text>
          </g>

          {/* Wafer with pattern */}
          <g transform="translate(50, patternY)">
            {/* Silicon substrate */}
            <rect x={0} y={20} width={300} height={40} fill={colors.silicon} rx={4} />
            <text x={150} y={50} fill={colors.textMuted} fontSize={9} textAnchor="middle">Silicon Wafer</text>

            {/* Photoresist layer */}
            <rect x={0} y={0} width={300} height={20} fill={colors.photoresist} opacity={0.6} rx={2} />

            {/* Exposed pattern */}
            {[...Array(numFeatures)].map((_, i) => {
              const x = 10 + i * featureWidth * 2;
              // Add diffraction blur effect for larger features relative to wavelength
              const blur = output.effectiveResolution > 30 ? 2 : 0;
              return (
                <rect
                  key={i}
                  x={x}
                  y={2}
                  width={featureWidth}
                  height={16}
                  fill="#1f2937"
                  opacity={0.8}
                  style={{ filter: blur > 0 ? `blur(${blur}px)` : 'none' }}
                />
              );
            })}

            {/* Resolution indicator */}
            <line x1={10} y1={-10} x2={10 + featureWidth} y2={-10} stroke={colors.accent} strokeWidth={2} />
            <text x={10 + featureWidth / 2} y={-15} fill={colors.accent} fontSize={9} textAnchor="middle">
              {output.effectiveResolution.toFixed(0)}nm
            </text>
          </g>

          {/* Multiple patterning indicator */}
          {useMultiplePatterning && (
            <g transform="translate(280, 100)">
              <rect x={0} y={0} width={100} height={60} fill="rgba(245, 158, 11, 0.2)" rx={8} />
              <text x={50} y={20} fill={colors.accent} fontSize={10} textAnchor="middle" fontWeight="bold">
                Multi-Pattern
              </text>
              <text x={50} y={38} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
                {patterningSteps}x steps
              </text>
              <text x={50} y={52} fill={colors.textMuted} fontSize={9} textAnchor="middle">
                Cost: {output.costFactor.toFixed(1)}x
              </text>
            </g>
          )}

          {/* Metrics panel */}
          <rect x={20} y={280} width={360} height={90} fill="rgba(0,0,0,0.4)" rx={8} />

          <text x={35} y={305} fill={colors.textSecondary} fontSize={11}>
            Resolution: {output.effectiveResolution.toFixed(1)}nm
          </text>
          <text x={35} y={325} fill={colors.textSecondary} fontSize={11}>
            Diffraction limit: {output.diffractionLimit.toFixed(1)}nm
          </text>
          <text x={35} y={345} fill={colors.textSecondary} fontSize={11}>
            Depth of focus: {output.depthOfFocus.toFixed(1)}nm
          </text>

          <text x={220} y={305} fill={colors.textSecondary} fontSize={11}>
            Process node: ~{output.processNode}nm
          </text>
          <text x={220} y={325} fill={output.canReach7nm ? colors.success : colors.error} fontSize={11}>
            7nm capable: {output.canReach7nm ? 'Yes' : 'No'}
          </text>
          <text x={220} y={345} fill={output.canReach5nm ? colors.success : colors.error} fontSize={11}>
            5nm capable: {output.canReach5nm ? 'Yes' : 'No'}
          </text>

          {/* Technology indicator */}
          <rect x={320} y={50} width={60} height={25} fill={output.isEUV ? colors.euv : colors.uv} rx={4} opacity={0.3} />
          <text x={350} y={67} fill={output.isEUV ? colors.euv : colors.uv} fontSize={11} textAnchor="middle" fontWeight="bold">
            {output.isEUV ? 'EUV' : 'DUV'}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setWavelength(wavelength === 193 ? 13.5 : 193)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: wavelength === 13.5 ? colors.euv : colors.uv,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
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
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Wavelength: {wavelength}nm ({wavelength <= 13.5 ? 'EUV' : wavelength < 300 ? 'DUV' : 'UV'})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => setWavelength(365)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 365 ? `2px solid ${colors.uv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>365nm (i-line)</button>
            <button onClick={() => setWavelength(248)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 248 ? `2px solid ${colors.uv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>248nm (KrF)</button>
            <button onClick={() => setWavelength(193)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 193 ? `2px solid ${colors.uv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>193nm (ArF)</button>
            <button onClick={() => setWavelength(13.5)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: wavelength === 13.5 ? `2px solid ${colors.euv}` : '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>13.5nm (EUV)</button>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Numerical Aperture (NA): {numericalAperture.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={numericalAperture}
            onChange={(e) => setNumericalAperture(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
            <span>0.5 (air)</span>
            <span>1.0 (air limit)</span>
            <span>1.35+ (immersion)</span>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            k1 Factor: {k1Factor.toFixed(2)} (process complexity)
          </label>
          <input
            type="range"
            min="0.25"
            max="0.6"
            step="0.01"
            value={k1Factor}
            onChange={(e) => setK1Factor(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
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
              <label style={{ color: colors.textMuted, fontSize: '12px' }}>
                Patterning Steps: {patterningSteps}x
              </label>
              <input
                type="range"
                min="2"
                max="4"
                step="1"
                value={patterningSteps}
                onChange={(e) => setPatterningSteps(parseInt(e.target.value))}
                style={{ width: '100%' }}
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

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Lithography Parameters</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust wavelength, NA, and k1 factor
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

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Close!'}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Multiple Patterning</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Use multiple exposures to beat the limit
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', WebkitTapHighlightColor: 'transparent' }}
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
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
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
