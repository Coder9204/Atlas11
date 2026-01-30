import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface BifacialAlbedoRendererProps {
  phase?: Phase; // Optional - for resume functionality
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
  solar: '#3b82f6',
  snow: '#e0f2fe',
  grass: '#22c55e',
  sand: '#fcd34d',
  asphalt: '#374151',
  water: '#0ea5e9',
};

const BifacialAlbedoRenderer: React.FC<BifacialAlbedoRendererProps> = ({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase management - internal state
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Ground Surfaces',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const getInitialPhase = (): Phase => {
    if (initialPhase && phaseOrder.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && phaseOrder.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

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

  // Simulation state
  const [albedo, setAlbedo] = useState(30); // 0-100%
  const [groundType, setGroundType] = useState<'grass' | 'sand' | 'snow' | 'asphalt' | 'water'>('grass');
  const [panelHeight, setPanelHeight] = useState(1.5); // meters
  const [tiltAngle, setTiltAngle] = useState(30); // degrees
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Albedo presets
  const albedoPresets: Record<string, number> = {
    grass: 25,
    sand: 40,
    snow: 80,
    asphalt: 10,
    water: 8,
  };

  // Update albedo when ground type changes
  useEffect(() => {
    setAlbedo(albedoPresets[groundType]);
  }, [groundType]);

  // Physics calculations - Bifacial gain model
  const calculateBifacialGain = useCallback(() => {
    // Bifaciality factor (rear vs front efficiency, typically 70-90%)
    const bifaciality = 0.75;

    // View factor from ground to rear of panel
    // Simplified model: depends on height and tilt
    const heightFactor = Math.min(1, panelHeight / 2);
    const tiltFactor = Math.cos((tiltAngle * Math.PI) / 180);
    const viewFactor = heightFactor * (0.3 + 0.4 * tiltFactor);

    // Ground-reflected irradiance reaching rear
    const frontIrradiance = 1000; // W/m2 (standard test condition)
    const groundIrradiance = frontIrradiance * (albedo / 100) * viewFactor;

    // Rear power contribution
    const rearPower = groundIrradiance * bifaciality;
    const frontPower = frontIrradiance * 0.20; // 20% efficient cell
    const rearPowerContribution = rearPower * 0.20;

    // Total bifacial gain
    const bifacialGain = (rearPowerContribution / frontPower) * 100;

    // Annual yield estimate (simplified)
    const annualFrontYield = 1800; // kWh/kWp typical
    const annualRearYield = annualFrontYield * (bifacialGain / 100);
    const totalAnnualYield = annualFrontYield + annualRearYield;

    return {
      albedo,
      viewFactor: viewFactor * 100,
      groundIrradiance,
      rearPower,
      bifacialGain: Math.min(bifacialGain, 30),
      annualFrontYield,
      annualRearYield,
      totalAnnualYield,
      bifaciality: bifaciality * 100,
    };
  }, [albedo, panelHeight, tiltAngle]);

  // Animation for seasonal albedo changes
  useEffect(() => {
    if (!isAnimating) return;
    const groundTypes: Array<'grass' | 'sand' | 'snow' | 'asphalt' | 'water'> = ['grass', 'sand', 'snow', 'asphalt', 'water'];
    let index = 0;
    const interval = setInterval(() => {
      setGroundType(groundTypes[index % groundTypes.length]);
      index++;
      if (index >= groundTypes.length * 2) {
        setIsAnimating(false);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'no_effect', label: 'Ground reflection has no effect - panels only capture direct sunlight' },
    { id: 'small_boost', label: 'Small boost (1-5%) from reflected light on the rear side' },
    { id: 'significant', label: 'Significant boost (10-30%) depending on ground reflectivity' },
    { id: 'double', label: 'Double the output because both sides receive equal light' },
  ];

  const twistPredictions = [
    { id: 'snow_best', label: 'Snow gives the highest bifacial gain due to 80%+ albedo' },
    { id: 'all_same', label: 'All ground types give similar gains - it\'s mostly about panel design' },
    { id: 'sand_best', label: 'Sand is optimal because it stays consistent year-round' },
    { id: 'water_best', label: 'Water gives highest gains due to specular reflection' },
  ];

  const transferApplications = [
    {
      title: 'Agrivoltaics',
      description: 'Solar panels mounted high above crops allow farming underneath while generating power.',
      question: 'How do different crops underneath affect bifacial performance?',
      answer: 'Light-colored crops like wheat (albedo ~25%) provide better bifacial gain than dark leafy greens (albedo ~10-15%). Some farmers install white reflective tarps between panel rows, boosting albedo to 60%+ and increasing bifacial gain by 5-10% additional.',
    },
    {
      title: 'Desert Solar Farms',
      description: 'Large utility-scale installations in deserts can optimize ground conditions.',
      question: 'Why do some desert bifacial projects install white gravel under panels?',
      answer: 'Natural desert sand has ~30-40% albedo, but white gravel can reach 50-60%. This increases bifacial gain from ~10% to ~15-18%. For a 100MW project, this 5% boost adds 9 GWh/year of production worth $500k+ annually at typical utility rates.',
    },
    {
      title: 'Snow Belt Installations',
      description: 'Regions with seasonal snow cover experience dramatic albedo swings.',
      question: 'How should bifacial system designers account for seasonal snow?',
      answer: 'Winter months with snow can boost bifacial gain to 25-30% (from ~10% typical), partially compensating for shorter days. However, snow also covers panels! Optimal designs use steep tilts (40-50) to shed snow faster while still capturing high-albedo reflected light.',
    },
    {
      title: 'Floating Solar (Floatovoltaics)',
      description: 'Panels floating on water reservoirs face unique albedo conditions.',
      question: 'Why is water\'s low albedo (~8%) sometimes beneficial for bifacial panels?',
      answer: 'While water has low diffuse albedo, it can create strong specular (mirror-like) reflections at certain sun angles. Floating bifacial panels also run cooler due to water\'s thermal mass, gaining 3-5% from reduced temperature losses. The net effect often exceeds land-based low-albedo installations.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is albedo in the context of solar energy?',
      options: [
        { text: 'The efficiency of a solar cell', correct: false },
        { text: 'The fraction of sunlight reflected by a surface', correct: true },
        { text: 'The angle of the sun above the horizon', correct: false },
        { text: 'The temperature coefficient of a panel', correct: false },
      ],
    },
    {
      question: 'Typical fresh snow has an albedo of approximately:',
      options: [
        { text: '10-20%', correct: false },
        { text: '30-40%', correct: false },
        { text: '50-60%', correct: false },
        { text: '70-90%', correct: true },
      ],
    },
    {
      question: 'Bifacial solar panels can capture reflected light because:',
      options: [
        { text: 'They have solar cells on both front and rear surfaces', correct: true },
        { text: 'They use special mirrors to redirect light', correct: false },
        { text: 'They are mounted on tracking systems', correct: false },
        { text: 'They have higher efficiency cells', correct: false },
      ],
    },
    {
      question: 'The "bifaciality factor" of a panel refers to:',
      options: [
        { text: 'The number of cells on each side', correct: false },
        { text: 'The ratio of rear-side efficiency to front-side efficiency', correct: true },
        { text: 'The angle at which bifacial gain is maximized', correct: false },
        { text: 'The percentage of ground coverage', correct: false },
      ],
    },
    {
      question: 'What is a typical bifacial gain for a system with 25% ground albedo?',
      options: [
        { text: '1-3%', correct: false },
        { text: '5-12%', correct: true },
        { text: '25-30%', correct: false },
        { text: '50% or more', correct: false },
      ],
    },
    {
      question: 'How does panel mounting height affect bifacial gain?',
      options: [
        { text: 'Higher mounting increases the view factor to the ground', correct: true },
        { text: 'Lower mounting is always better for bifacial', correct: false },
        { text: 'Height has no effect on bifacial performance', correct: false },
        { text: 'Higher mounting decreases albedo effectiveness', correct: false },
      ],
    },
    {
      question: 'Which ground surface typically has the LOWEST albedo?',
      options: [
        { text: 'Light-colored gravel', correct: false },
        { text: 'Fresh snow', correct: false },
        { text: 'Dark asphalt', correct: true },
        { text: 'Dry sand', correct: false },
      ],
    },
    {
      question: 'Bifacial panels perform best when:',
      options: [
        { text: 'Mounted flat on dark rooftops', correct: false },
        { text: 'Elevated above high-albedo ground surfaces', correct: true },
        { text: 'Covered with anti-reflective coatings on the rear', correct: false },
        { text: 'Facing away from the equator', correct: false },
      ],
    },
    {
      question: 'For vertical (90 tilt) bifacial panels, the optimal albedo surface is:',
      options: [
        { text: 'Not relevant since vertical panels don\'t see the ground', correct: false },
        { text: 'Dark surfaces to reduce glare', correct: false },
        { text: 'High-albedo surfaces like white concrete on both sides', correct: true },
        { text: 'Water for cooling effects', correct: false },
      ],
    },
    {
      question: 'Installing white reflective material under bifacial panels can increase annual yield by:',
      options: [
        { text: 'Less than 1%', correct: false },
        { text: '3-8% additional energy', correct: true },
        { text: '25-50% additional energy', correct: false },
        { text: 'It actually decreases yield due to overheating', correct: false },
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

  const getGroundColor = (type: string) => {
    switch (type) {
      case 'snow': return colors.snow;
      case 'grass': return colors.grass;
      case 'sand': return colors.sand;
      case 'asphalt': return colors.asphalt;
      case 'water': return colors.water;
      default: return colors.grass;
    }
  };

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 500;
    const height = 420;
    const output = calculateBifacialGain();

    // Panel geometry
    const panelCenterX = 250;
    const panelCenterY = 150;
    const panelWidth = 120;
    const panelHeight = 8;
    const groundY = 320;

    // Light ray calculations
    const numRays = 6;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0c4a6e 0%, #1e3a5f 50%, #0f172a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
            <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getGroundColor(groundType)} />
              <stop offset="100%" stopColor={getGroundColor(groundType)} stopOpacity="0.7" />
            </linearGradient>
            <filter id="sunGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sun */}
          <circle cx={80} cy={50} r={30} fill={colors.warning} filter="url(#sunGlow)" />
          <circle cx={80} cy={50} r={20} fill="#fef3c7" />

          {/* Ground surface */}
          <rect x={0} y={groundY} width={width} height={100} fill="url(#groundGrad)" />
          <text x={250} y={groundY + 40} fill={colors.textPrimary} fontSize={12} textAnchor="middle">
            {groundType.charAt(0).toUpperCase() + groundType.slice(1)} Surface (Albedo: {albedo}%)
          </text>

          {/* Direct sunlight rays to front of panel */}
          {[...Array(numRays)].map((_, i) => {
            const startX = 80 + i * 15;
            const startY = 60 + i * 8;
            const endX = panelCenterX - panelWidth / 2 + 20 + i * 15;
            const endY = panelCenterY - 30;
            return (
              <line
                key={`direct${i}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={colors.warning}
                strokeWidth={2}
                opacity={0.7}
                strokeDasharray="8,4"
              />
            );
          })}

          {/* Reflected light rays from ground to rear of panel */}
          {[...Array(numRays)].map((_, i) => {
            const groundX = 150 + i * 30;
            const panelX = panelCenterX - panelWidth / 2 + 10 + i * 18;
            const intensity = (albedo / 100) * 0.8;
            return (
              <g key={`reflect${i}`}>
                {/* Incoming ray to ground */}
                <line
                  x1={groundX - 30}
                  y1={groundY - 100}
                  x2={groundX}
                  y2={groundY}
                  stroke={colors.warning}
                  strokeWidth={1}
                  opacity={0.4}
                />
                {/* Reflected ray to panel rear */}
                <line
                  x1={groundX}
                  y1={groundY}
                  x2={panelX}
                  y2={panelCenterY + 10}
                  stroke={colors.warning}
                  strokeWidth={2}
                  opacity={intensity}
                />
              </g>
            );
          })}

          {/* Solar panel (bifacial) */}
          <g transform={`rotate(${-tiltAngle}, ${panelCenterX}, ${panelCenterY})`}>
            {/* Panel frame */}
            <rect
              x={panelCenterX - panelWidth / 2 - 3}
              y={panelCenterY - panelHeight / 2 - 3}
              width={panelWidth + 6}
              height={panelHeight + 6}
              fill="#1e3a5f"
              rx={2}
            />
            {/* Front side (blue) */}
            <rect
              x={panelCenterX - panelWidth / 2}
              y={panelCenterY - panelHeight / 2}
              width={panelWidth}
              height={panelHeight / 2}
              fill={colors.solar}
            />
            {/* Rear side (slightly different shade) */}
            <rect
              x={panelCenterX - panelWidth / 2}
              y={panelCenterY}
              width={panelWidth}
              height={panelHeight / 2}
              fill="#60a5fa"
            />
            {/* Label */}
            <text
              x={panelCenterX}
              y={panelCenterY - 15}
              fill={colors.textPrimary}
              fontSize={10}
              textAnchor="middle"
            >
              Bifacial Panel
            </text>
          </g>

          {/* Panel mounting pole */}
          <line
            x1={panelCenterX}
            y1={panelCenterY + 10}
            x2={panelCenterX}
            y2={groundY}
            stroke="#4b5563"
            strokeWidth={4}
          />
          <text
            x={panelCenterX + 15}
            y={(panelCenterY + groundY) / 2}
            fill={colors.textMuted}
            fontSize={10}
          >
            {panelHeight.toFixed(1)}m
          </text>

          {/* Data panel - Albedo info */}
          <g transform="translate(10, 10)">
            <rect x={0} y={0} width={150} height={100} fill="rgba(0,0,0,0.6)" rx={8} />
            <text x={10} y={20} fill={colors.accent} fontSize={11} fontWeight="bold">Albedo Values</text>

            <circle cx={20} cy={38} r={6} fill={colors.snow} />
            <text x={32} y={42} fill={colors.textSecondary} fontSize={10}>Snow: 80%</text>

            <circle cx={20} cy={55} r={6} fill={colors.sand} />
            <text x={32} y={59} fill={colors.textSecondary} fontSize={10}>Sand: 40%</text>

            <circle cx={20} cy={72} r={6} fill={colors.grass} />
            <text x={32} y={76} fill={colors.textSecondary} fontSize={10}>Grass: 25%</text>

            <circle cx={20} cy={89} r={6} fill={colors.asphalt} />
            <text x={32} y={93} fill={colors.textSecondary} fontSize={10}>Asphalt: 10%</text>
          </g>

          {/* Performance metrics */}
          <g transform="translate(340, 10)">
            <rect x={0} y={0} width={150} height={130} fill="rgba(0,0,0,0.6)" rx={8} />
            <text x={10} y={20} fill={colors.accent} fontSize={11} fontWeight="bold">Bifacial Performance</text>

            <text x={10} y={42} fill={colors.textSecondary} fontSize={10}>Ground Irradiance:</text>
            <text x={10} y={55} fill={colors.textPrimary} fontSize={11}>{output.groundIrradiance.toFixed(0)} W/m2</text>

            <text x={10} y={75} fill={colors.textSecondary} fontSize={10}>Bifacial Gain:</text>
            <text x={10} y={88} fill={colors.success} fontSize={14} fontWeight="bold">+{output.bifacialGain.toFixed(1)}%</text>

            <text x={10} y={108} fill={colors.textSecondary} fontSize={10}>Annual Boost:</text>
            <text x={10} y={121} fill={colors.textPrimary} fontSize={11}>+{output.annualRearYield.toFixed(0)} kWh/kWp</text>
          </g>

          {/* Comparison chart if enabled */}
          {showComparison && (
            <g transform="translate(10, 220)">
              <rect x={0} y={0} width={180} height={90} fill="rgba(0,0,0,0.5)" rx={8} />
              <text x={10} y={18} fill={colors.accent} fontSize={11} fontWeight="bold">Annual Yield by Surface</text>

              {(['snow', 'sand', 'grass', 'asphalt'] as const).map((type, i) => {
                const typeAlbedo = albedoPresets[type];
                const gain = (typeAlbedo / 100) * 15;
                const barWidth = gain * 5;
                return (
                  <g key={type} transform={`translate(10, ${30 + i * 15})`}>
                    <rect x={0} y={0} width={barWidth} height={10} fill={getGroundColor(type)} rx={2} />
                    <text x={barWidth + 5} y={9} fill={colors.textSecondary} fontSize={9}>
                      {type}: +{gain.toFixed(0)}%
                    </text>
                  </g>
                );
              })}
            </g>
          )}
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
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop' : 'Cycle Surfaces'}
            </button>
            <button
              onClick={() => { setGroundType('grass'); setPanelHeight(1.5); setTiltAngle(30); }}
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

  const renderControls = (showComparison: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Ground Surface:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['grass', 'sand', 'snow', 'asphalt', 'water'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setGroundType(type)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: groundType === type ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: groundType === type ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: getGroundColor(type) }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Albedo: {albedo}%
        </label>
        <input
          type="range"
          min="5"
          max="90"
          step="5"
          value={albedo}
          onChange={(e) => setAlbedo(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Panel Height: {panelHeight.toFixed(1)} m
        </label>
        <input
          type="range"
          min="0.3"
          max="3"
          step="0.1"
          value={panelHeight}
          onChange={(e) => setPanelHeight(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Tilt Angle: {tiltAngle}deg
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="5"
          value={tiltAngle}
          onChange={(e) => setTiltAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(16, 185, 129, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.success}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Bifacial Gain = Albedo x View Factor x Bifaciality
        </div>
        <div style={{ color: colors.textPrimary, fontSize: '14px', marginTop: '4px', fontWeight: 'bold' }}>
          {albedo}% x {calculateBifacialGain().viewFactor.toFixed(0)}% x 75% = +{calculateBifacialGain().bifacialGain.toFixed(1)}%
        </div>
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
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

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    const handleNext = () => {
      if (!canProceed) return;
      if (onNext) {
        onNext();
      } else {
        goNext();
      }
    };

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
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={handleNext}
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
          {nextLabel}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Can Snow Make Solar Better?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Harvesting light from below
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
                Traditional solar panels only capture light on their front surface. But bifacial
                panels have cells on both sides! They can harvest light reflected from the ground,
                boosting output by 10-30% in the right conditions.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The secret? Albedo - how much light the ground reflects back up.
              </p>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.success}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try different ground surfaces - snow reflects up to 80% of incoming light!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A bifacial solar panel mounted 1.5m above the ground. The front side captures
              direct and diffuse sunlight. The rear side can capture light reflected from
              the ground surface below. Different surfaces reflect different amounts of light.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How much extra energy can ground-reflected light provide?
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
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Bifacial Gains</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust ground type, height, and tilt to maximize rear-side capture
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
              <li>Compare snow (80%) vs asphalt (10%) - how much difference?</li>
              <li>Raise panel height from 0.3m to 3m - does gain increase?</li>
              <li>Try vertical (90 degree) tilt - what happens?</li>
              <li>Find the configuration for maximum bifacial gain</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'significant';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              Bifacial panels can gain 10-30% additional energy depending on ground albedo.
              High-albedo surfaces like snow can boost output significantly!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Science of Albedo</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Albedo Definition:</strong> The fraction
                of incident light that a surface reflects. Fresh snow reflects ~80%, while dark asphalt
                reflects only ~10%.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Bifaciality Factor:</strong> Modern bifacial
                panels have rear-side efficiency ~70-85% of the front. This limits how much reflected
                light can be converted.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>View Factor:</strong> Higher mounting
                increases the ground area visible to the rear of the panel, capturing more reflected light.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Real-World Gains:</strong> Utility-scale
                bifacial installations typically see 5-15% gain over monofacial panels with the same
                ground conditions.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Compare different ground surfaces for annual energy yield
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A solar developer is choosing a site for a bifacial installation.
              They can install over grass, sand, or artificial white surfaces.
              Snow is only present 3 months per year. Which surface provides
              the best annual energy production?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which ground type gives the best annual bifacial gain?
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Ground Surfaces</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Cycle through surfaces to see annual yield differences
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              While snow has the highest albedo, it's seasonal. For year-round optimization,
              many projects install white gravel or reflective membranes beneath panels.
              This can boost albedo from ~25% (grass) to 50-60%, adding 5-8% annual yield.
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'snow_best';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'It\'s Nuanced!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Snow gives the highest instantaneous bifacial gain when present. However, for annual
              optimization, artificial high-albedo surfaces provide consistent year-round benefits.
              The "best" choice depends on climate, cost, and project specifics.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Optimizing Ground Albedo</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>White Gravel:</strong> Installing
                crushed white limestone or marble chips can raise albedo to 50-60% year-round,
                often the most cost-effective enhancement.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Reflective Membranes:</strong>
                White TPO or PVC roofing material can achieve 70%+ albedo, rivaling snow.
                Common in rooftop bifacial installations.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Natural Variation:</strong>
                Even without modifications, bifacial panels benefit from seasonal albedo changes.
                Winter snow boosts production when days are shortest!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Bifacial technology is reshaping solar project design
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
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.success, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
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
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
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
                {testScore >= 8 ? 'You understand bifacial and albedo physics!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setCurrentTestQuestion(0); })}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand bifacial solar and albedo optimization</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Albedo = fraction of light reflected by a surface</li>
              <li>Bifacial panels capture light on both front and rear</li>
              <li>Bifacial gain = Albedo x View Factor x Bifaciality Factor</li>
              <li>Snow has highest albedo (~80%), asphalt lowest (~10%)</li>
              <li>Panel height affects ground view factor</li>
              <li>Artificial high-albedo surfaces boost annual yield</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.success, marginBottom: '12px' }}>Industry Trend:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Bifacial modules now represent over 40% of new utility-scale installations.
              As prices approach parity with monofacial panels, the 5-15% additional energy
              makes bifacial the default choice for ground-mount systems. Your understanding
              of albedo physics helps optimize these billion-dollar projects!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default BifacialAlbedoRenderer;
