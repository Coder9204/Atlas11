import React, { useState, useCallback, useEffect } from 'react';

interface SnellsLawRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ============================================================================
// SNELL'S LAW - Premium Design System (Apple/Airbnb Quality)
// ============================================================================

const colors = {
  // Backgrounds
  bgDeep: '#030712',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  bgElevated: '#1e293b',
  bgHover: '#334155',

  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  textTertiary: '#64748b',

  // Brand
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  primary: '#3b82f6',

  // Semantic
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',

  // Physics-specific
  beam: '#fbbf24',
  beamLight: '#fcd34d',
  beamDark: '#d97706',
  water: '#60a5fa',
  waterLight: '#93c5fd',
  waterDark: '#2563eb',
  oil: '#84cc16',
  oilLight: '#a3e635',
  oilDark: '#65a30d',
  glass: '#94a3b8',
  glassLight: '#cbd5e1',
  glassDark: '#64748b',
  air: '#e0f2fe',
};

const RefractionRenderer: React.FC<SnellsLawRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [incidentAngle, setIncidentAngle] = useState(45);
  const [medium, setMedium] = useState<'water' | 'oil' | 'glass'>('water');
  const [showMeasurements, setShowMeasurements] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography system
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    svgLabel: isMobile ? '11px' : '13px',
    svgValue: isMobile ? '12px' : '14px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  const refractiveIndices: Record<string, number> = {
    air: 1.00,
    water: 1.33,
    oil: 1.47,
    glass: 1.52,
  };

  const predictions = [
    { id: 'more', label: 'Steeper entry angle = MORE bending' },
    { id: 'less', label: 'Steeper entry angle = LESS bending' },
    { id: 'same', label: 'Entry angle doesn\'t affect bending amount' },
    { id: 'reverse', label: 'Steep angles bend one way, shallow angles the other' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Oil bends light the same as water' },
    { id: 'more', label: 'Oil bends light MORE than water' },
    { id: 'less', label: 'Oil bends light LESS than water' },
    { id: 'opposite', label: 'Oil bends light in the opposite direction' },
  ];

  const transferApplications = [
    {
      title: 'Optical Fibers',
      description: 'Light stays trapped inside glass fibers by total internal reflection, bouncing thousands of times per meter.',
      question: 'Why doesn\'t light escape from optical fibers at bends?',
      answer: 'As long as the bend isn\'t too sharp, light hits the fiber walls at angles beyond the critical angle, causing total internal reflection.',
    },
    {
      title: 'Mirages',
      description: 'Hot air near the ground has lower density and lower refractive index. Light gradually bends upward, creating the illusion of water.',
      question: 'Why do mirages look like water on hot roads?',
      answer: 'Light from the sky curves upward near the hot surface due to the refractive index gradient. Your brain interprets this as reflection from water.',
    },
    {
      title: 'Gemstone Cutting',
      description: 'Diamond cutters angle facets to maximize internal reflections, creating the characteristic sparkle.',
      question: 'Why are diamonds cut with specific angles?',
      answer: 'Diamond\'s high refractive index (2.42) means a small critical angle (~24°). Proper facet angles ensure light bounces inside before exiting the top.',
    },
    {
      title: 'Underwater Photography',
      description: 'Camera housings must account for refraction at the water-glass-air interfaces to focus correctly.',
      question: 'Why do underwater cameras need special lenses?',
      answer: 'Refraction at the dome port changes the apparent distance to subjects. Dome ports minimize this by keeping light perpendicular to the curved surface.',
    },
  ];

  const testQuestions = [
    {
      question: 'Snell\'s Law states that n₁sin(θ₁) equals:',
      options: [
        { text: 'n₂sin(θ₂)', correct: true },
        { text: 'n₂cos(θ₂)', correct: false },
        { text: 'n₂/sin(θ₂)', correct: false },
        { text: 'n₁ + n₂', correct: false },
      ],
    },
    {
      question: 'When light enters a denser medium (higher n), it bends:',
      options: [
        { text: 'Away from the normal', correct: false },
        { text: 'Toward the normal', correct: true },
        { text: 'Parallel to the surface', correct: false },
        { text: 'It doesn\'t bend', correct: false },
      ],
    },
    {
      question: 'If light enters perpendicular to a surface (θ₁ = 0°), what happens?',
      options: [
        { text: 'Maximum bending occurs', correct: false },
        { text: 'No bending occurs (θ₂ = 0° too)', correct: true },
        { text: 'Total internal reflection', correct: false },
        { text: 'Light is absorbed', correct: false },
      ],
    },
    {
      question: 'The "normal" in Snell\'s Law refers to:',
      options: [
        { text: 'A line parallel to the surface', correct: false },
        { text: 'A line perpendicular to the surface at the point of incidence', correct: true },
        { text: 'The average of both rays', correct: false },
        { text: 'The light beam itself', correct: false },
      ],
    },
    {
      question: 'If n₁ = 1.0 (air) and n₂ = 1.5, and θ₁ = 30°, then sin(θ₂) equals:',
      options: [
        { text: 'sin(30°) × 1.5 = 0.75', correct: false },
        { text: 'sin(30°) / 1.5 = 0.33', correct: true },
        { text: 'sin(30°) + 1.5 = 2.0', correct: false },
        { text: '1.5 / sin(30°) = 3.0', correct: false },
      ],
    },
    {
      question: 'Why does the ratio sin(θ₁)/sin(θ₂) stay constant for a given pair of materials?',
      options: [
        { text: 'It\'s a coincidence', correct: false },
        { text: 'The ratio equals n₂/n₁, which is fixed for those materials', correct: true },
        { text: 'Temperature keeps it constant', correct: false },
        { text: 'It only appears constant due to measurement error', correct: false },
      ],
    },
    {
      question: 'Total internal reflection occurs when:',
      options: [
        { text: 'Light enters a denser medium', correct: false },
        { text: 'Light tries to exit to a less dense medium at a shallow angle', correct: true },
        { text: 'Light hits any surface at 45°', correct: false },
        { text: 'The surface is a mirror', correct: false },
      ],
    },
    {
      question: 'The critical angle depends on:',
      options: [
        { text: 'Only the incident light intensity', correct: false },
        { text: 'The ratio of refractive indices of the two media', correct: true },
        { text: 'Only the wavelength of light', correct: false },
        { text: 'The thickness of the materials', correct: false },
      ],
    },
    {
      question: 'Vegetable oil has n ≈ 1.47, water has n ≈ 1.33. Light entering oil from water:',
      options: [
        { text: 'Bends toward the normal', correct: true },
        { text: 'Bends away from the normal', correct: false },
        { text: 'Doesn\'t bend (same n)', correct: false },
        { text: 'Is completely reflected', correct: false },
      ],
    },
    {
      question: 'Why is Snell\'s Law useful even without the exact formula?',
      options: [
        { text: 'It\'s not useful without math', correct: false },
        { text: 'It tells us direction and relative amount of bending', correct: true },
        { text: 'Only the formula matters', correct: false },
        { text: 'It only works for visible light', correct: false },
      ],
    },
  ];

  // Calculate refracted angle using Snell's law
  const calculateRefractedAngle = useCallback(() => {
    const n1 = refractiveIndices.air;
    const n2 = refractiveIndices[medium];
    const theta1Rad = (incidentAngle * Math.PI) / 180;
    const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);

    if (sinTheta2 > 1) return 90; // Total internal reflection (wouldn't happen air->denser)
    return (Math.asin(sinTheta2) * 180) / Math.PI;
  }, [incidentAngle, medium]);

  const refractedAngle = calculateRefractedAngle();

  // Premium SVG visualization with gradients and glow effects
  const renderVisualization = () => {
    const centerX = 150;
    const centerY = 140;
    const beamLength = 100;

    const incidentRad = (incidentAngle * Math.PI) / 180;
    const refractedRad = (refractedAngle * Math.PI) / 180;

    // Calculate beam endpoints
    const incidentEndX = centerX - Math.sin(incidentRad) * beamLength;
    const incidentEndY = centerY - Math.cos(incidentRad) * beamLength;
    const refractedEndX = centerX + Math.sin(refractedRad) * beamLength;
    const refractedEndY = centerY + Math.cos(refractedRad) * beamLength;

    // Medium-specific colors
    const getMediumColors = () => {
      switch (medium) {
        case 'water':
          return { main: colors.water, light: colors.waterLight, dark: colors.waterDark };
        case 'oil':
          return { main: colors.oil, light: colors.oilLight, dark: colors.oilDark };
        case 'glass':
          return { main: colors.glass, light: colors.glassLight, dark: colors.glassDark };
        default:
          return { main: colors.water, light: colors.waterLight, dark: colors.waterDark };
      }
    };
    const mediumColors = getMediumColors();

    // Arc radius for angle indicators
    const arcRadius = 35;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Legend outside SVG using typo system */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          padding: '8px 16px',
          background: colors.bgElevated,
          borderRadius: '8px',
          border: `1px solid ${colors.bgHover}`,
        }}>
          <span style={{ fontSize: typo.small, color: colors.textMuted }}>
            <span style={{ color: colors.air }}>Air</span> n=1.00
          </span>
          <span style={{ fontSize: typo.small, color: colors.textMuted }}>
            <span style={{ color: mediumColors.main }}>{medium.charAt(0).toUpperCase() + medium.slice(1)}</span> n={refractiveIndices[medium].toFixed(2)}
          </span>
        </div>

        <svg width="300" height="260" viewBox="0 0 300 260">
          {/* Premium defs section */}
          <defs>
            {/* Background gradient with depth */}
            <linearGradient id="snellBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a"/>
              <stop offset="50%" stopColor="#0a0f1a"/>
              <stop offset="100%" stopColor="#030712"/>
            </linearGradient>

            {/* Air medium gradient - subtle atmosphere */}
            <linearGradient id="snellAirGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.air} stopOpacity="0.08"/>
              <stop offset="50%" stopColor={colors.air} stopOpacity="0.05"/>
              <stop offset="100%" stopColor={colors.air} stopOpacity="0.02"/>
            </linearGradient>

            {/* Water medium gradient */}
            <linearGradient id="snellWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.waterDark} stopOpacity="0.15"/>
              <stop offset="50%" stopColor={colors.water} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={colors.waterLight} stopOpacity="0.35"/>
            </linearGradient>

            {/* Oil medium gradient */}
            <linearGradient id="snellOilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.oilDark} stopOpacity="0.15"/>
              <stop offset="50%" stopColor={colors.oil} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={colors.oilLight} stopOpacity="0.35"/>
            </linearGradient>

            {/* Glass medium gradient */}
            <linearGradient id="snellGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.glassDark} stopOpacity="0.2"/>
              <stop offset="50%" stopColor={colors.glass} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={colors.glassLight} stopOpacity="0.4"/>
            </linearGradient>

            {/* Light beam gradient */}
            <linearGradient id="snellBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.beamDark}/>
              <stop offset="30%" stopColor={colors.beam}/>
              <stop offset="50%" stopColor={colors.beamLight}/>
              <stop offset="70%" stopColor={colors.beam}/>
              <stop offset="100%" stopColor={colors.beamDark}/>
            </linearGradient>

            {/* Interface line gradient */}
            <linearGradient id="snellInterfaceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.textMuted} stopOpacity="0.2"/>
              <stop offset="30%" stopColor={colors.textMuted} stopOpacity="0.8"/>
              <stop offset="50%" stopColor={colors.textSecondary} stopOpacity="1"/>
              <stop offset="70%" stopColor={colors.textMuted} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={colors.textMuted} stopOpacity="0.2"/>
            </linearGradient>

            {/* Normal line gradient */}
            <linearGradient id="snellNormalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.1"/>
              <stop offset="30%" stopColor={colors.accent} stopOpacity="0.6"/>
              <stop offset="50%" stopColor={colors.accent} stopOpacity="0.8"/>
              <stop offset="70%" stopColor={colors.accent} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.1"/>
            </linearGradient>

            {/* Incident angle arc gradient */}
            <linearGradient id="snellIncidentArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.warning} stopOpacity="0.5"/>
              <stop offset="50%" stopColor={colors.warningLight} stopOpacity="1"/>
              <stop offset="100%" stopColor={colors.warning} stopOpacity="0.5"/>
            </linearGradient>

            {/* Refracted angle arc gradient */}
            <linearGradient id="snellRefractedArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.success} stopOpacity="0.5"/>
              <stop offset="50%" stopColor={colors.successLight} stopOpacity="1"/>
              <stop offset="100%" stopColor={colors.success} stopOpacity="0.5"/>
            </linearGradient>

            {/* Light beam glow filter */}
            <filter id="snellBeamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Soft glow for interface */}
            <filter id="snellInterfaceGlow" x="-10%" y="-100%" width="120%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Incidence point glow */}
            <filter id="snellPointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Arc glow filter */}
            <filter id="snellArcGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background with gradient */}
          <rect x="0" y="0" width="300" height="260" fill="url(#snellBgGrad)" rx="8"/>

          {/* Air region (top) with atmosphere effect */}
          <rect x="0" y="0" width="300" height={centerY} fill="url(#snellAirGrad)" rx="8 8 0 0"/>

          {/* Medium region (bottom) with realistic gradient */}
          <rect
            x="0"
            y={centerY}
            width="300"
            height={260 - centerY}
            fill={`url(#snell${medium.charAt(0).toUpperCase() + medium.slice(1)}Grad)`}
          />

          {/* Interface transition zone */}
          <rect
            x="0"
            y={centerY - 3}
            width="300"
            height="6"
            fill="url(#snellInterfaceGrad)"
            opacity="0.5"
          />

          {/* Interface line with glow */}
          <line
            x1="0"
            y1={centerY}
            x2="300"
            y2={centerY}
            stroke="url(#snellInterfaceGrad)"
            strokeWidth="2"
            filter="url(#snellInterfaceGlow)"
          />

          {/* Normal line (dashed) with gradient */}
          <line
            x1={centerX}
            y1={centerY - 100}
            x2={centerX}
            y2={centerY + 100}
            stroke="url(#snellNormalGrad)"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />

          {/* Angle arcs - always visible for clarity */}
          {/* Incident angle arc */}
          <path
            d={`M ${centerX} ${centerY - arcRadius} A ${arcRadius} ${arcRadius} 0 0 0 ${centerX - Math.sin(incidentRad) * arcRadius} ${centerY - Math.cos(incidentRad) * arcRadius}`}
            fill="none"
            stroke="url(#snellIncidentArcGrad)"
            strokeWidth="2.5"
            filter="url(#snellArcGlow)"
          />

          {/* Refracted angle arc */}
          <path
            d={`M ${centerX} ${centerY + arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + Math.sin(refractedRad) * arcRadius} ${centerY + Math.cos(refractedRad) * arcRadius}`}
            fill="none"
            stroke="url(#snellRefractedArcGrad)"
            strokeWidth="2.5"
            filter="url(#snellArcGlow)"
          />

          {/* Incident beam with glow */}
          <line
            x1={incidentEndX}
            y1={incidentEndY}
            x2={centerX}
            y2={centerY}
            stroke={colors.beam}
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#snellBeamGlow)"
          />
          <line
            x1={incidentEndX}
            y1={incidentEndY}
            x2={centerX}
            y2={centerY}
            stroke="url(#snellBeamGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Arrow head for incident beam */}
          <polygon
            points={`${centerX},${centerY} ${centerX - 6},${centerY - 12} ${centerX + 4},${centerY - 10}`}
            fill={colors.beam}
            transform={`rotate(${-incidentAngle}, ${centerX}, ${centerY})`}
            filter="url(#snellBeamGlow)"
          />

          {/* Refracted beam with glow */}
          <line
            x1={centerX}
            y1={centerY}
            x2={refractedEndX}
            y2={refractedEndY}
            stroke={colors.beam}
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#snellBeamGlow)"
          />
          <line
            x1={centerX}
            y1={centerY}
            x2={refractedEndX}
            y2={refractedEndY}
            stroke="url(#snellBeamGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Incidence point with glow */}
          <circle
            cx={centerX}
            cy={centerY}
            r="5"
            fill={colors.beamLight}
            filter="url(#snellPointGlow)"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill="#fff"
          />
        </svg>

        {/* Measurements outside SVG using typo system */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          padding: '10px 16px',
          background: colors.bgElevated,
          borderRadius: '8px',
          border: `1px solid ${colors.bgHover}`,
        }}>
          <span style={{ fontSize: typo.svgValue, color: colors.warning, fontWeight: 600 }}>
            Incident: {incidentAngle.toFixed(0)}deg
          </span>
          <span style={{ fontSize: typo.svgValue, color: colors.success, fontWeight: 600 }}>
            Refracted: {refractedAngle.toFixed(1)}deg
          </span>
        </div>

        {/* Extended Snell's Law display when measurements shown */}
        {showMeasurements && (
          <div style={{
            padding: '12px 16px',
            background: `linear-gradient(135deg, ${colors.bgElevated} 0%, ${colors.bgHover} 100%)`,
            borderRadius: '10px',
            border: `1px solid ${colors.accent}30`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
              <span style={{ color: colors.accent, fontWeight: 600 }}>Snells Law:</span>{' '}
              sin({incidentAngle}deg) / sin({refractedAngle.toFixed(1)}deg) ={' '}
              <span style={{ color: colors.beamLight, fontWeight: 600 }}>
                {(Math.sin(incidentRad) / Math.sin(refractedRad * Math.PI / 180)).toFixed(2)}
              </span>{' '}
              ~ n2/n1
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleTestAnswer = (answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestQuestion] = answerIndex;
    setTestAnswers(newAnswers);

    if (currentTestQuestion < testQuestions.length - 1) {
      setCurrentTestQuestion(currentTestQuestion + 1);
    }
  };

  const submitTest = () => {
    let score = 0;
    testAnswers.forEach((answer, i) => {
      if (answer !== null && testQuestions[i].options[answer]?.correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7) {
      onCorrectAnswer?.();
    } else {
      onIncorrectAnswer?.();
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Measuring the Bend
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If the beam enters at a steeper angle, does it bend more or less?
            </p>
            {renderVisualization()}
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '16px' }}>
              Watch how light bends at the boundary between air and another medium.
            </p>
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Make Your Prediction
            </h2>
            <div style={{ marginBottom: '24px' }}>
              {renderVisualization()}
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '8px' }}>
                What You're Looking At
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                A light beam enters water from air. The dashed line is the "normal" (perpendicular to surface).
                Angles are measured from the normal, not the surface.
              </p>
            </div>
            <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
              As you increase the incident angle (steeper entry):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    background: prediction === p.id ? colors.accent : colors.bgCard,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Explore Snell's Law
            </h2>
            {renderVisualization()}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Incident Angle (θ₁): {incidentAngle}°
                </label>
                <input
                  type="range"
                  min="5"
                  max="85"
                  value={incidentAngle}
                  onChange={(e) => setIncidentAngle(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Medium:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['water', 'oil', 'glass'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMedium(m)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: medium === m ? colors.accent : colors.bgCard,
                        color: colors.textPrimary,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)} (n={refractiveIndices[m]})
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowMeasurements(!showMeasurements)}
                style={{
                  padding: '12px 24px',
                  background: showMeasurements ? colors.success : colors.bgCard,
                  color: colors.textPrimary,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {showMeasurements ? 'Hide Measurements' : 'Show Angle Measurements'}
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Understanding Snell's Law
            </h2>
            <div style={{
              background: prediction === 'more' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '18px' }}>
                {prediction === 'more' ? '✓ Correct!' : '✗ Actually,'} steeper incident angles produce more absolute bending!
              </p>
            </div>
            {renderVisualization()}
            <div style={{ marginTop: '24px', color: colors.textSecondary }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Pattern:</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>n₁ sin(θ₁) = n₂ sin(θ₂) — Snell's Law</li>
                <li>The ratio sin(θ₁)/sin(θ₂) stays constant for a given material pair</li>
                <li>Light going into denser medium: bends toward normal</li>
                <li>Light going into less dense medium: bends away from normal</li>
                <li>At θ₁ = 0° (perpendicular): no bending at all</li>
              </ul>
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              The Twist: Different Medium
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              What if we use vegetable oil (n ≈ 1.47) instead of water (n ≈ 1.33)?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id ? colors.accent : colors.bgCard,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Compare Water vs Oil
            </h2>
            {renderVisualization()}
            <div style={{ marginTop: '24px' }}>
              <p style={{ color: colors.textSecondary, marginBottom: '12px' }}>
                Switch between media to compare bending:
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setMedium('water')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: medium === 'water' ? colors.water : colors.bgCard,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Water (n=1.33)
                </button>
                <button
                  onClick={() => setMedium('oil')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: medium === 'oil' ? colors.oil : colors.bgCard,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Oil (n=1.47)
                </button>
              </div>
              <p style={{ color: colors.textMuted, marginTop: '16px', textAlign: 'center' }}>
                Current refracted angle: {refractedAngle.toFixed(1)}°
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Higher Index = More Bending
            </h2>
            <div style={{
              background: twistPrediction === 'more' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '18px' }}>
                {twistPrediction === 'more' ? '✓ Correct!' : '✗ Actually,'} oil has a higher refractive index, so light bends MORE toward the normal.
              </p>
            </div>
            <div style={{ color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>From Snell's Law: n₁ sin(θ₁) = n₂ sin(θ₂)</p>
              <p style={{ marginBottom: '12px' }}>Rearranging: sin(θ₂) = (n₁/n₂) sin(θ₁)</p>
              <p style={{ marginBottom: '12px' }}>Higher n₂ → smaller sin(θ₂) → smaller θ₂ → more bending toward normal!</p>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Real-World Applications
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {transferApplications.map((app, index) => (
                <div
                  key={index}
                  style={{
                    background: colors.bgCard,
                    padding: '20px',
                    borderRadius: '12px',
                    border: transferCompleted.has(index) ? `2px solid ${colors.success}` : 'none',
                  }}
                >
                  <h3 style={{ color: colors.accent, marginBottom: '8px' }}>{app.title}</h3>
                  <p style={{ color: colors.textSecondary, marginBottom: '12px' }}>{app.description}</p>
                  <p style={{ color: colors.textMuted, fontStyle: 'italic', marginBottom: '8px' }}>
                    {app.question}
                  </p>
                  {!transferCompleted.has(index) ? (
                    <button
                      onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                      style={{
                        padding: '8px 16px',
                        background: colors.accent,
                        color: colors.textPrimary,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      Reveal Answer
                    </button>
                  ) : (
                    <p style={{ color: colors.success }}>{app.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'test':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Test Your Knowledge
            </h2>
            {!testSubmitted ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.textMuted }}>
                    Question {currentTestQuestion + 1} of {testQuestions.length}
                  </span>
                </div>
                <p style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '20px' }}>
                  {testQuestions[currentTestQuestion].question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {testQuestions[currentTestQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleTestAnswer(index)}
                      style={{
                        padding: '16px',
                        background: testAnswers[currentTestQuestion] === index ? colors.accent : colors.bgCard,
                        color: colors.textPrimary,
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
                {testAnswers.every(a => a !== null) && (
                  <button
                    onClick={submitTest}
                    style={{
                      marginTop: '24px',
                      padding: '16px 32px',
                      background: colors.success,
                      color: colors.textPrimary,
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Submit Test
                  </button>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  {testScore >= 7 ? '🎉' : '📚'}
                </div>
                <p style={{ color: colors.textPrimary, fontSize: '24px' }}>
                  You scored {testScore} out of {testQuestions.length}
                </p>
              </div>
            )}
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h2 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '16px' }}>
              Snell's Law Mastered!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              You understand the mathematical relationship governing refraction.
            </p>
            <div style={{
              background: colors.bgCard,
              padding: '24px',
              borderRadius: '16px',
              textAlign: 'left'
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
                <li>n₁ sin(θ₁) = n₂ sin(θ₂)</li>
                <li>Higher n = more bending toward normal</li>
                <li>Ratio of sines = ratio of indices (inverted)</li>
                <li>Perpendicular entry = no bending</li>
              </ul>
            </div>
            <button
              onClick={() => onPhaseComplete?.()}
              style={{
                marginTop: '24px',
                padding: '16px 32px',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`,
                color: colors.textPrimary,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              Complete Lesson
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      paddingBottom: '100px',
    }}>
      {renderPhaseContent()}

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgDark,
        borderTop: `1px solid ${colors.bgCard}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <span style={{ color: colors.textMuted, fontSize: '14px' }}>
          Snell's Law
        </span>
        {phase !== 'mastery' && phase !== 'test' && (
          <button
            onClick={() => onPhaseComplete?.()}
            disabled={
              (phase === 'predict' && !prediction) ||
              (phase === 'twist_predict' && !twistPrediction) ||
              (phase === 'transfer' && transferCompleted.size < 4)
            }
            style={{
              padding: '12px 24px',
              background: colors.accent,
              color: colors.textPrimary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: (
                (phase === 'predict' && !prediction) ||
                (phase === 'twist_predict' && !twistPrediction) ||
                (phase === 'transfer' && transferCompleted.size < 4)
              ) ? 0.5 : 1,
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default RefractionRenderer;
