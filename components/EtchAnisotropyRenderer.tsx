import React, { useState, useEffect, useCallback } from 'react';

interface EtchAnisotropyRendererProps {
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
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  material: '#64748b',
  mask: '#7c3aed',
  plasma: '#60a5fa',
  substrate: '#1e293b',
  etched: '#0f172a',
};

const EtchAnisotropyRenderer: React.FC<EtchAnisotropyRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [etchTime, setEtchTime] = useState(0); // 0-100%
  const [isIsotropic, setIsIsotropic] = useState(true);
  const [etchRate, setEtchRate] = useState(50); // nm/s
  const [sidewallPassivation, setSidewallPassivation] = useState(50); // 0-100%
  const [isAnimating, setIsAnimating] = useState(false);
  const [showUndercut, setShowUndercut] = useState(false);

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
      setEtchTime(prev => {
        if (prev >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations for etch profiles
  const calculateEtchProfile = useCallback(() => {
    const depth = (etchTime / 100) * 100; // max 100nm depth

    // Isotropic etch: lateral etch = vertical etch
    // Anisotropic etch: lateral etch << vertical etch
    const anisotropyFactor = isIsotropic ? 1.0 : (100 - sidewallPassivation) / 100;
    const lateralEtch = depth * anisotropyFactor;

    // Undercut under mask
    const undercutAmount = lateralEtch;

    // Feature dimensions
    const maskWidth = 60; // nm
    const openingWidth = maskWidth + (2 * lateralEtch);

    // Critical dimension (CD) at bottom
    const bottomCD = maskWidth - (2 * undercutAmount * (isIsotropic ? 1 : anisotropyFactor * 0.3));

    // Sidewall angle (90 = perfectly vertical)
    const sidewallAngle = isIsotropic
      ? 45 + (45 * (1 - etchTime / 100))
      : 90 - (10 * anisotropyFactor);

    // Profile quality metrics
    const verticalityError = Math.abs(90 - sidewallAngle);
    const cdVariation = Math.abs(openingWidth - maskWidth);
    const profileQuality = 100 - verticalityError - (cdVariation / 2);

    return {
      depth,
      lateralEtch,
      undercutAmount,
      maskWidth,
      openingWidth,
      bottomCD: Math.max(0, bottomCD),
      sidewallAngle,
      verticalityError,
      cdVariation,
      profileQuality: Math.max(0, profileQuality),
      anisotropyRatio: depth > 0 ? depth / Math.max(1, lateralEtch) : Infinity,
    };
  }, [etchTime, isIsotropic, sidewallPassivation]);

  const predictions = [
    { id: 'equal', label: 'Etching dissolves material equally in all directions' },
    { id: 'directional', label: 'Some etch processes can be made directional, preserving edges' },
    { id: 'top_only', label: 'Etching only removes material from the top surface' },
    { id: 'random', label: 'Etch direction is random and cannot be controlled' },
  ];

  const twistPredictions = [
    { id: 'no_undercut', label: 'Undercut never happens in anisotropic etching' },
    { id: 'small_undercut', label: 'Some undercut still occurs but can be minimized with sidewall passivation' },
    { id: 'same_undercut', label: 'Undercut is the same regardless of etch type' },
    { id: 'more_undercut', label: 'Anisotropic etching has more undercut than isotropic' },
  ];

  const transferApplications = [
    {
      title: 'Transistor Gate Patterning',
      description: 'The transistor gate must have near-vertical sidewalls to control channel length precisely.',
      question: 'Why is anisotropic etching critical for transistor gates?',
      answer: 'The gate length determines transistor speed. Isotropic etching would undercut the mask, making the gate shorter than designed. At 5nm node, even 1nm of undercut represents a 20% variation in gate length!',
    },
    {
      title: 'Via and Contact Holes',
      description: 'Vias connect metal layers through holes in dielectric material.',
      question: 'How does etch profile affect via resistance?',
      answer: 'A tapered (isotropic) etch creates a cone-shaped via with smaller bottom area, increasing contact resistance. Anisotropic etching creates vertical vias with maximum contact area and consistent resistance.',
    },
    {
      title: 'MEMS Fabrication',
      description: 'Micro-Electro-Mechanical Systems require precise 3D structures.',
      question: 'When would isotropic etching be preferred in MEMS?',
      answer: 'Isotropic etching creates smooth, rounded profiles useful for fluid channels and release of suspended structures. The Bosch process alternates anisotropic and isotropic steps to create high-aspect-ratio structures.',
    },
    {
      title: 'Memory Cell Trenches',
      description: 'DRAM capacitors are built in deep trenches to maximize storage density.',
      question: 'How do aspect ratios challenge anisotropic etching?',
      answer: 'Deep narrow trenches (aspect ratio more than 50:1) make it hard to maintain passivation at the bottom while removing material. Ion shadowing and etch gas depletion cause profile bowing and tapered bottoms.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is "isotropic" etching?',
      options: [
        { text: 'Etching that only occurs vertically', correct: false },
        { text: 'Etching that proceeds equally in all directions', correct: true },
        { text: 'Etching that only removes the mask', correct: false },
        { text: 'Etching at very low temperatures', correct: false },
      ],
    },
    {
      question: 'What is "anisotropic" etching?',
      options: [
        { text: 'Etching that is completely random', correct: false },
        { text: 'Etching that proceeds preferentially in one direction (typically vertical)', correct: true },
        { text: 'Etching that uses only chemicals', correct: false },
        { text: 'Etching without a mask', correct: false },
      ],
    },
    {
      question: 'What causes undercut in etching?',
      options: [
        { text: 'The mask being too thick', correct: false },
        { text: 'Lateral etching beneath the mask edges', correct: true },
        { text: 'The substrate being too hard', correct: false },
        { text: 'Using too much power', correct: false },
      ],
    },
    {
      question: 'Plasma etching achieves anisotropy through:',
      options: [
        { text: 'Using colder temperatures', correct: false },
        { text: 'Directional ion bombardment and sidewall passivation', correct: true },
        { text: 'Faster etch rates', correct: false },
        { text: 'Thicker masks', correct: false },
      ],
    },
    {
      question: 'Sidewall passivation in RIE (Reactive Ion Etching) works by:',
      options: [
        { text: 'Heating the sidewalls', correct: false },
        { text: 'Depositing a protective layer that prevents lateral etching', correct: true },
        { text: 'Making the sidewalls thicker', correct: false },
        { text: 'Removing all ions from the plasma', correct: false },
      ],
    },
    {
      question: 'A sugar cube dissolving in water is an example of:',
      options: [
        { text: 'Anisotropic etching', correct: false },
        { text: 'Isotropic etching (dissolves equally from all surfaces)', correct: true },
        { text: 'Directional etching', correct: false },
        { text: 'No etching', correct: false },
      ],
    },
    {
      question: 'The aspect ratio in etching refers to:',
      options: [
        { text: 'The ratio of mask thickness to opening width', correct: false },
        { text: 'The ratio of etch depth to opening width', correct: true },
        { text: 'The ratio of horizontal to vertical etch rate', correct: false },
        { text: 'The ratio of etch time to depth', correct: false },
      ],
    },
    {
      question: 'High aspect ratio etching is challenging because:',
      options: [
        { text: 'The etch rate becomes too fast', correct: false },
        { text: 'It is harder to maintain profile and remove byproducts from deep features', correct: true },
        { text: 'The mask always fails', correct: false },
        { text: 'It requires less precise control', correct: false },
      ],
    },
    {
      question: 'The Bosch process for silicon etching:',
      options: [
        { text: 'Uses only isotropic etching', correct: false },
        { text: 'Alternates between etching and passivation steps', correct: true },
        { text: 'Is only used for wet chemistry', correct: false },
        { text: 'Cannot achieve vertical sidewalls', correct: false },
      ],
    },
    {
      question: 'For transistor fabrication, the ideal sidewall angle is:',
      options: [
        { text: '45 degrees', correct: false },
        { text: 'Close to 90 degrees (vertical)', correct: true },
        { text: '0 degrees (horizontal)', correct: false },
        { text: 'Any angle works equally well', correct: false },
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

  const renderVisualization = (interactive: boolean, showUndercutMode: boolean = false) => {
    const width = 500;
    const height = 420;
    const result = calculateEtchProfile();

    // Scale factor for visualization
    const scale = 1.5;
    const centerX = 180;
    const surfaceY = 150;
    const maxDepth = 150;

    // Calculate etch profile points
    const maskWidth = 60;
    const halfMask = maskWidth / 2;

    // Profile path for isotropic vs anisotropic
    const generateEtchProfile = () => {
      const depth = result.depth * scale;
      const lateral = result.lateralEtch * scale;
      const undercut = result.undercutAmount * scale;

      if (etchTime === 0) {
        return `M ${centerX - halfMask},${surfaceY} L ${centerX + halfMask},${surfaceY}`;
      }

      if (isIsotropic) {
        // Isotropic: rounded profile with undercut
        const curveRadius = depth;
        return `
          M ${centerX - halfMask - undercut},${surfaceY}
          Q ${centerX - halfMask - undercut},${surfaceY + depth} ${centerX},${surfaceY + depth}
          Q ${centerX + halfMask + undercut},${surfaceY + depth} ${centerX + halfMask + undercut},${surfaceY}
        `;
      } else {
        // Anisotropic: near-vertical sidewalls with small taper
        const taper = lateral * 0.3;
        return `
          M ${centerX - halfMask - undercut * 0.1},${surfaceY}
          L ${centerX - halfMask + taper},${surfaceY + depth}
          L ${centerX + halfMask - taper},${surfaceY + depth}
          L ${centerX + halfMask + undercut * 0.1},${surfaceY}
        `;
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="materialGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="plasmaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.plasma} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.plasma} stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={centerX} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            {isIsotropic ? 'Isotropic Etch (Chemical)' : 'Anisotropic Etch (Plasma RIE)'}
          </text>

          {/* Plasma/etchant arrows (only during etching) */}
          {etchTime > 0 && etchTime < 100 && (
            <g filter="url(#glow)">
              {!isIsotropic && (
                <>
                  {[-30, -10, 10, 30].map((offset, i) => (
                    <g key={i}>
                      <line
                        x1={centerX + offset}
                        y1={60}
                        x2={centerX + offset}
                        y2={surfaceY - 10}
                        stroke={colors.plasma}
                        strokeWidth={2}
                        markerEnd="url(#arrow)"
                      />
                      <circle
                        cx={centerX + offset}
                        cy={80 + (etchTime % 30)}
                        r={3}
                        fill={colors.plasma}
                      />
                    </g>
                  ))}
                  <text x={centerX} y={50} fill={colors.plasma} fontSize={10} textAnchor="middle">
                    Ion Bombardment
                  </text>
                </>
              )}
              {isIsotropic && (
                <>
                  <text x={centerX} y={50} fill={colors.warning} fontSize={10} textAnchor="middle">
                    Chemical Etchant (all directions)
                  </text>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const r = 40;
                    return (
                      <circle
                        key={i}
                        cx={centerX + Math.cos(rad) * r}
                        cy={surfaceY + result.depth * scale / 2 + Math.sin(rad) * r}
                        r={2}
                        fill={colors.warning}
                        opacity={0.6}
                      />
                    );
                  })}
                </>
              )}
            </g>
          )}

          {/* Substrate material */}
          <rect x={centerX - 100} y={surfaceY} width={200} height={maxDepth} fill="url(#materialGrad)" />

          {/* Etch profile (cut out from material) */}
          <path
            d={generateEtchProfile()}
            fill={colors.etched}
            stroke={colors.accent}
            strokeWidth={1}
          />

          {/* Mask on top */}
          <rect x={centerX - 100} y={surfaceY - 15} width={100 - halfMask - 5} height={15} fill={colors.mask} rx={2} />
          <rect x={centerX + halfMask + 5} y={surfaceY - 15} width={100 - halfMask - 5} height={15} fill={colors.mask} rx={2} />
          <text x={centerX - 80} y={surfaceY - 5} fill={colors.textPrimary} fontSize={8}>Mask</text>
          <text x={centerX + 60} y={surfaceY - 5} fill={colors.textPrimary} fontSize={8}>Mask</text>

          {/* Dimension lines */}
          {etchTime > 0 && (
            <g>
              {/* Depth marker */}
              <line
                x1={centerX + 80}
                y1={surfaceY}
                x2={centerX + 80}
                y2={surfaceY + result.depth * scale}
                stroke={colors.success}
                strokeWidth={1}
                markerStart="url(#startArrow)"
                markerEnd="url(#endArrow)"
              />
              <text x={centerX + 90} y={surfaceY + result.depth * scale / 2} fill={colors.success} fontSize={9}>
                {result.depth.toFixed(0)}nm
              </text>

              {/* Undercut marker (if significant) */}
              {result.undercutAmount > 5 && (
                <>
                  <line
                    x1={centerX - halfMask}
                    y1={surfaceY + 5}
                    x2={centerX - halfMask - result.undercutAmount * scale}
                    y2={surfaceY + 5}
                    stroke={colors.error}
                    strokeWidth={1}
                  />
                  <text
                    x={centerX - halfMask - result.undercutAmount * scale / 2}
                    y={surfaceY + 20}
                    fill={colors.error}
                    fontSize={8}
                    textAnchor="middle"
                  >
                    Undercut: {result.undercutAmount.toFixed(0)}nm
                  </text>
                </>
              )}
            </g>
          )}

          {/* Arrow markers */}
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.plasma} />
            </marker>
            <marker id="startArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <line x1="0" y1="3" x2="6" y2="3" stroke={colors.success} strokeWidth="1" />
            </marker>
            <marker id="endArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <line x1="0" y1="3" x2="6" y2="3" stroke={colors.success} strokeWidth="1" />
            </marker>
          </defs>

          {/* Comparison diagram */}
          <g transform="translate(340, 50)">
            <text x={60} y={0} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Profile Comparison</text>

            {/* Isotropic example */}
            <rect x={10} y={20} width={100} height={60} fill={colors.substrate} />
            <rect x={10} y={20} width={100} height={60} fill={colors.material} />
            <path d="M 30,20 Q 30,60 60,60 Q 90,60 90,20" fill={colors.etched} />
            <rect x={10} y={10} width={20} height={10} fill={colors.mask} />
            <rect x={90} y={10} width={20} height={10} fill={colors.mask} />
            <text x={60} y={90} fill={colors.textMuted} fontSize={9} textAnchor="middle">Isotropic</text>
            <text x={60} y={100} fill={colors.error} fontSize={8} textAnchor="middle">(Undercut)</text>

            {/* Anisotropic example */}
            <rect x={10} y={120} width={100} height={60} fill={colors.material} />
            <rect x={35} y={120} width={50} height={60} fill={colors.etched} />
            <rect x={10} y={110} width={25} height={10} fill={colors.mask} />
            <rect x={85} y={110} width={25} height={10} fill={colors.mask} />
            <text x={60} y={190} fill={colors.textMuted} fontSize={9} textAnchor="middle">Anisotropic</text>
            <text x={60} y={200} fill={colors.success} fontSize={8} textAnchor="middle">(Vertical)</text>
          </g>

          {/* Metrics panel */}
          <rect x={20} y={320} width={200} height={90} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={30} y={340} fill={colors.textSecondary} fontSize={10}>ETCH METRICS</text>

          <text x={30} y={358} fill={colors.textPrimary} fontSize={10}>
            Depth: {result.depth.toFixed(0)} nm
          </text>
          <text x={30} y={373} fill={colors.textPrimary} fontSize={10}>
            Lateral: {result.lateralEtch.toFixed(1)} nm
          </text>
          <text x={30} y={388} fill={result.sidewallAngle > 80 ? colors.success : colors.warning} fontSize={10}>
            Sidewall: {result.sidewallAngle.toFixed(0)} deg
          </text>
          <text x={30} y={403} fill={colors.accent} fontSize={10}>
            Anisotropy: {result.anisotropyRatio === Infinity ? 'Perfect' : result.anisotropyRatio.toFixed(1) + ':1'}
          </text>

          {/* Quality indicator */}
          <rect x={240} y={320} width={120} height={90} fill="rgba(0,0,0,0.4)" rx={8} />
          <text x={300} y={340} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Profile Quality</text>
          <rect x={250} y={355} width={100} height={10} fill="rgba(255,255,255,0.1)" rx={3} />
          <rect
            x={250}
            y={355}
            width={result.profileQuality}
            height={10}
            fill={result.profileQuality > 70 ? colors.success : result.profileQuality > 40 ? colors.warning : colors.error}
            rx={3}
          />
          <text x={300} y={383} fill={colors.textPrimary} fontSize={12} textAnchor="middle">
            {result.profileQuality.toFixed(0)}%
          </text>
          <text x={300} y={400} fill={result.profileQuality > 70 ? colors.success : colors.error} fontSize={10} textAnchor="middle">
            {result.profileQuality > 70 ? 'Good Profile' : 'Poor Profile'}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => {
                setEtchTime(0);
                setIsAnimating(true);
              }}
              disabled={isAnimating}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.textMuted : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Etching...' : 'Start Etch'}
            </button>
            <button
              onClick={() => { setEtchTime(0); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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

  const renderControls = (showPassivation: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Etch Progress: {etchTime}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={etchTime}
          onChange={(e) => { setEtchTime(parseInt(e.target.value)); setIsAnimating(false); }}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={!isIsotropic}
            onChange={(e) => setIsIsotropic(!e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          Use Anisotropic (Plasma RIE) Etching
        </label>
      </div>

      {showPassivation && !isIsotropic && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Sidewall Passivation: {sidewallPassivation}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={sidewallPassivation}
            onChange={(e) => setSidewallPassivation(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(249, 115, 22, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Isotropic: Etches equally in all directions (chemical etching)
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
          Anisotropic: Etches preferentially downward (plasma + passivation)
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Etch Anisotropy
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If you "etch" material, will it dissolve equally in all directions?
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
                Think of dissolving a sugar cube in water - it dissolves from all surfaces equally.
                But what if you wanted to carve a precise vertical trench? Dissolving would
                create a rounded bowl, not a sharp-edged feature!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Chip manufacturing requires etching precise patterns. How can we control the etch direction?
              </p>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Compare isotropic and anisotropic etching to see the difference!
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
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Etching in Chip Manufacturing:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A mask protects some areas while others are exposed to etchant. The pattern transfers
              from mask to material. But if etching is like dissolving, the material would undercut
              the mask edges and lose the precise pattern shape.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Can etching be controlled to preserve feature edges?
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
                    background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Etch Profiles</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare isotropic and anisotropic etching behavior
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
              <li>Run isotropic etch to 100% - observe the profile shape</li>
              <li>Reset and switch to anisotropic - compare the result</li>
              <li>Notice the undercut amount in each case</li>
              <li>Compare sidewall angles between the two methods</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'directional';

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
              Plasma etching can be made highly directional (anisotropic) by combining directional
              ion bombardment with sidewall passivation chemistry. This preserves precise feature edges!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Etch Anisotropy</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Isotropic Etching:</strong> Chemical
                etching (wet or vapor) proceeds equally in all directions. The etch rate depends
                only on the chemistry, not direction. This creates rounded profiles with undercut.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Anisotropic Etching:</strong> Plasma
                (dry) etching uses energetic ions accelerated perpendicular to the surface. These
                ions enhance the etch rate in the vertical direction only.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sidewall Passivation:</strong> Special
                gases deposit a protective layer on sidewalls. Vertical ion bombardment removes this
                layer from the bottom, but it protects the sidewalls from lateral etching.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Result:</strong> Near-vertical sidewalls
                with anisotropy ratios of 20:1 or better - essential for nanometer-scale features!
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
              What about undercut in anisotropic etching?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Undercut Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Even with plasma etching, some undercut can occur. Sidewall passivation is not perfect -
              if the passivation layer is too thin, some lateral etching happens. If it is too thick,
              the etch may not reach the bottom properly.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does undercut behave in anisotropic etching?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Sidewall Passivation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust passivation strength and observe undercut behavior
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
              Increasing sidewall passivation reduces undercut but can cause other issues like
              grass formation or residue buildup. The optimal process balances vertical profile
              with clean, complete etching. This is why etch recipe development is critical!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'small_undercut';

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
              Even anisotropic etching has some undercut, but it can be minimized with proper
              sidewall passivation. The goal is to balance profile control with etch completion.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Undercut Control Techniques</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Passivation Chemistry:</strong> Gases
                like CHF3, C4F8, or SiCl4 deposit protective films on sidewalls. The balance
                between etch and deposition gases controls the profile.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Process Cycling:</strong> The Bosch
                process alternates etch (SF6) and passivation (C4F8) steps to create highly
                vertical profiles, even in deep trenches.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Ion Energy:</strong> Higher ion
                energy improves anisotropy but can damage underlying layers. Process engineers
                optimize voltage, pressure, and gas flows together.
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
              Etch anisotropy enables precise nanofabrication
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
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You understand etch anisotropy!' : 'Review the material and try again.'}
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
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Etch Icon</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand etch anisotropy and profile control</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Isotropic vs anisotropic etching mechanisms</li>
              <li>Sidewall passivation for profile control</li>
              <li>Undercut and its minimization</li>
              <li>Plasma RIE for directional etching</li>
              <li>Aspect ratio challenges in deep etching</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(249, 115, 22, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Advanced etch technologies include atomic layer etching (ALE) for Angstrom-level control,
              cryogenic etching for extreme anisotropy, and selective etching that removes one material
              while leaving others intact. These enable 3nm transistors and 200+ layer 3D NAND!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default EtchAnisotropyRenderer;
