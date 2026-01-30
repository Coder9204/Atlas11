import React, { useState, useEffect, useCallback } from 'react';

interface EncapsulationUVAgingRendererProps {
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
  solar: '#3b82f6',
  uv: '#8b5cf6',
  yellowed: '#d97706',
  fresh: '#60a5fa',
};

const EncapsulationUVAgingRenderer: React.FC<EncapsulationUVAgingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [uvExposureYears, setUvExposureYears] = useState(0);
  const [materialType, setMaterialType] = useState<'eva' | 'poe' | 'silicone'>('eva');
  const [isAnimating, setIsAnimating] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'glass_glass' | 'glass_backsheet'>('glass_backsheet');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations - UV degradation model
  const calculateDegradation = useCallback(() => {
    // Different materials have different UV stability
    const degradationRates: Record<string, number> = {
      eva: 0.015,      // EVA degrades ~1.5% per year
      poe: 0.008,      // POE is more stable
      silicone: 0.003, // Silicone is most stable
    };

    const rate = degradationRates[materialType];

    // Yellowing index increases exponentially with UV dose
    const yellowingIndex = 100 * (1 - Math.exp(-rate * uvExposureYears * 1.5));

    // Transmittance decreases with yellowing (fresh EVA ~91%, aged can drop to ~80%)
    const baseTransmittance = materialType === 'silicone' ? 93 : materialType === 'poe' ? 92 : 91;
    const transmittance = baseTransmittance - (yellowingIndex * 0.15);

    // Power loss due to reduced transmittance
    const powerLoss = ((baseTransmittance - transmittance) / baseTransmittance) * 100;

    // Chain scission rate (molecular breakdown)
    const chainScission = 100 * (1 - Math.exp(-rate * uvExposureYears * 2));

    return {
      yellowingIndex: Math.min(yellowingIndex, 100),
      transmittance: Math.max(transmittance, 70),
      powerLoss: Math.min(powerLoss, 25),
      chainScission: Math.min(chainScission, 100),
      degradationRate: rate * 100,
    };
  }, [uvExposureYears, materialType]);

  // Glass/glass vs glass/backsheet comparison
  const calculateDurabilityComparison = useCallback(() => {
    const baseYears = uvExposureYears;

    // Glass/glass modules last longer due to better moisture barrier
    const glassGlassFactor = 0.6;  // 40% less degradation
    const glassBacksheetFactor = 1.0;

    const factor = comparisonMode === 'glass_glass' ? glassGlassFactor : glassBacksheetFactor;

    const effectiveAge = baseYears * factor;
    const degradation = 100 * (1 - Math.exp(-0.012 * effectiveAge));
    const expectedLifespan = comparisonMode === 'glass_glass' ? 35 : 25;

    return {
      effectiveAge,
      degradation: Math.min(degradation, 50),
      expectedLifespan,
      moistureIngress: comparisonMode === 'glass_glass' ? 'Very Low' : 'Moderate',
    };
  }, [uvExposureYears, comparisonMode]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setUvExposureYears(prev => {
        const newVal = prev + 0.5;
        if (newVal >= 30) {
          setIsAnimating(false);
          return 30;
        }
        return newVal;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Yellowing increases linearly with time - 10 years = 2x the yellowing of 5 years' },
    { id: 'exponential', label: 'Yellowing accelerates over time - later years show more damage' },
    { id: 'saturating', label: 'Yellowing slows down over time - initial damage is fastest' },
    { id: 'threshold', label: 'No yellowing until a critical UV dose is reached, then sudden failure' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Both module types degrade at the same rate - only the encapsulant matters' },
    { id: 'glass_better', label: 'Glass/glass lasts longer because glass blocks more UV and moisture' },
    { id: 'backsheet_better', label: 'Glass/backsheet lasts longer because it runs cooler' },
    { id: 'depends', label: 'It depends entirely on the encapsulant material used' },
  ];

  const transferApplications = [
    {
      title: 'Desert Solar Farms',
      description: 'Solar installations in deserts face extreme UV exposure, high temperatures, and sand abrasion.',
      question: 'Why do desert solar farms often choose POE or silicone encapsulants over standard EVA?',
      answer: 'Desert conditions accelerate UV degradation due to higher irradiance (~2000 kWh/m2/year vs ~1000 in temperate zones). POE and silicone have lower UV sensitivity and better thermal stability, reducing yellowing and maintaining higher transmittance over the 25-30 year lifespan.',
    },
    {
      title: 'Building-Integrated PV (BIPV)',
      description: 'Solar panels integrated into building facades and windows must maintain aesthetics for decades.',
      question: 'Why is visual appearance especially critical for BIPV encapsulant selection?',
      answer: 'BIPV modules are architectural features where yellowing is immediately visible and unacceptable. These applications often use silicone encapsulants despite higher cost, or glass/glass construction with UV-stabilized EVA to maintain clarity for 30+ years.',
    },
    {
      title: 'Floating Solar (Floatovoltaics)',
      description: 'Solar panels on water bodies face high humidity, reflected UV, and salt spray in coastal installations.',
      question: 'What additional stress does water reflection create for floating solar encapsulants?',
      answer: 'Water reflects 5-10% of incident sunlight back up at the panels, increasing rear-side UV exposure. Combined with high humidity accelerating hydrolysis of EVA, floating solar often requires glass/glass modules with POE encapsulants for durability.',
    },
    {
      title: 'Warranty and Degradation Guarantees',
      description: 'Solar manufacturers provide 25-year warranties guaranteeing minimum power output.',
      question: 'How do encapsulant yellowing models inform warranty calculations?',
      answer: 'Manufacturers use accelerated UV aging tests (IEC 61215) to predict 25-year yellowing. A module warranted for 80% power at 25 years must account for ~3-5% loss from encapsulant yellowing alone, requiring materials with <0.5%/year transmittance loss.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes the yellowing of solar panel encapsulants over time?',
      options: [
        { text: 'Dust accumulation between the glass layers', correct: false },
        { text: 'UV radiation breaking polymer chains (photodegradation)', correct: true },
        { text: 'Chemical reaction with rainwater', correct: false },
        { text: 'Natural color change in silicon cells', correct: false },
      ],
    },
    {
      question: 'Which encapsulant material typically shows the most UV resistance?',
      options: [
        { text: 'Standard EVA (ethylene-vinyl acetate)', correct: false },
        { text: 'POE (polyolefin elastomer)', correct: false },
        { text: 'Silicone', correct: true },
        { text: 'PVB (polyvinyl butyral)', correct: false },
      ],
    },
    {
      question: 'How does encapsulant yellowing affect solar panel output?',
      options: [
        { text: 'It increases electrical resistance in the cells', correct: false },
        { text: 'It reduces light transmission to the cells, lowering current', correct: true },
        { text: 'It causes short circuits between cells', correct: false },
        { text: 'It has no effect on electrical output', correct: false },
      ],
    },
    {
      question: 'Why do glass/glass modules typically show less encapsulant degradation?',
      options: [
        { text: 'The glass absorbs heat that would damage the encapsulant', correct: false },
        { text: 'Glass provides a better moisture barrier, reducing hydrolysis', correct: true },
        { text: 'Glass reflects UV away from the encapsulant', correct: false },
        { text: 'Glass/glass modules are always made with better encapsulants', correct: false },
      ],
    },
    {
      question: 'What is chain scission in polymer degradation?',
      options: [
        { text: 'The linking of polymer chains to form a network', correct: false },
        { text: 'The breaking of polymer chains into shorter fragments', correct: true },
        { text: 'The crystallization of polymer molecules', correct: false },
        { text: 'The absorption of water by polymer chains', correct: false },
      ],
    },
    {
      question: 'Typical EVA encapsulant starts with about 91% transmittance. After 25 years of UV exposure, a well-designed module might drop to:',
      options: [
        { text: '50-60% transmittance (major loss)', correct: false },
        { text: '70-75% transmittance (significant loss)', correct: false },
        { text: '85-88% transmittance (moderate loss)', correct: true },
        { text: '90-91% transmittance (negligible loss)', correct: false },
      ],
    },
    {
      question: 'The yellowing index of an encapsulant typically follows which pattern over time?',
      options: [
        { text: 'Linear increase throughout the lifetime', correct: false },
        { text: 'Rapid initial yellowing that slows down (saturating exponential)', correct: true },
        { text: 'No change for 20 years, then sudden yellowing', correct: false },
        { text: 'Yellowing decreases after initial increase', correct: false },
      ],
    },
    {
      question: 'What role do UV stabilizers play in encapsulant formulations?',
      options: [
        { text: 'They absorb UV and convert it to heat, protecting the polymer', correct: true },
        { text: 'They make the encapsulant harder and more rigid', correct: false },
        { text: 'They increase the initial transparency of the encapsulant', correct: false },
        { text: 'They prevent the encapsulant from melting in hot weather', correct: false },
      ],
    },
    {
      question: 'In accelerated aging tests, how is 25 years of outdoor UV exposure typically simulated?',
      options: [
        { text: 'Exposure to high temperature for 25 days', correct: false },
        { text: 'Intense UV lamps for 1000+ hours at elevated temperature', correct: true },
        { text: 'Soaking in salt water for several months', correct: false },
        { text: 'Repeated freeze-thaw cycles over 6 months', correct: false },
      ],
    },
    {
      question: 'Why is the combination of UV exposure and moisture particularly damaging to EVA?',
      options: [
        { text: 'Water conducts electricity through the damaged encapsulant', correct: false },
        { text: 'UV creates radicals, and moisture enables hydrolysis of acetate groups, forming acetic acid', correct: true },
        { text: 'Moisture blocks UV from being absorbed evenly', correct: false },
        { text: 'Water makes the EVA expand and crack', correct: false },
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

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 500;
    const height = 400;
    const output = calculateDegradation();
    const durability = calculateDurabilityComparison();

    // Color interpolation for yellowing
    const yellowFactor = output.yellowingIndex / 100;
    const panelColor = `rgb(${96 + yellowFactor * 120}, ${165 - yellowFactor * 80}, ${250 - yellowFactor * 200})`;

    // Transmittance visualization
    const transmittanceHeight = (output.transmittance / 100) * 120;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="uvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.uv} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.uv} stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="solarPanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={panelColor} />
              <stop offset="100%" stopColor={`rgb(${40 + yellowFactor * 80}, ${80 - yellowFactor * 40}, ${150 - yellowFactor * 100})`} />
            </linearGradient>
            <filter id="glowUV">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* UV rays from top */}
          {[...Array(12)].map((_, i) => (
            <line
              key={`uv${i}`}
              x1={50 + i * 35}
              y1={10}
              x2={50 + i * 35 + (Math.random() - 0.5) * 20}
              y2={80}
              stroke={colors.uv}
              strokeWidth={2}
              opacity={0.6}
              filter="url(#glowUV)"
              strokeDasharray="8,4"
            />
          ))}

          {/* Sun indicator */}
          <circle cx={250} cy={30} r={25} fill={colors.warning} opacity={0.8} />
          <text x={250} y={35} fill={colors.bgPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">UV</text>

          {/* Main solar panel */}
          <g transform="translate(100, 100)">
            {/* Glass layer */}
            <rect x={0} y={0} width={300} height={15} fill="rgba(200, 220, 255, 0.3)" stroke={colors.textMuted} strokeWidth={1} rx={2} />
            <text x={150} y={11} fill={colors.textSecondary} fontSize={9} textAnchor="middle">Glass</text>

            {/* Encapsulant layer */}
            <rect x={0} y={18} width={300} height={30} fill="url(#solarPanelGrad)" rx={2} />
            <text x={150} y={37} fill={yellowFactor > 0.5 ? colors.bgPrimary : colors.textPrimary} fontSize={10} textAnchor="middle">
              {materialType.toUpperCase()} Encapsulant ({uvExposureYears.toFixed(1)} years)
            </text>

            {/* Solar cells */}
            <rect x={10} y={52} width={280} height={40} fill="#1e3a5f" rx={2} />
            {[...Array(6)].map((_, i) => (
              <rect key={`cell${i}`} x={15 + i * 46} y={55} width={40} height={34} fill="#2563eb" stroke="#1e40af" strokeWidth={1} rx={1} />
            ))}

            {/* Back encapsulant */}
            <rect x={0} y={95} width={300} height={20} fill="url(#solarPanelGrad)" rx={2} />

            {/* Backsheet or glass */}
            {showComparison ? (
              <rect
                x={0}
                y={118}
                width={300}
                height={15}
                fill={comparisonMode === 'glass_glass' ? 'rgba(200, 220, 255, 0.3)' : '#374151'}
                stroke={colors.textMuted}
                strokeWidth={1}
                rx={2}
              />
            ) : (
              <rect x={0} y={118} width={300} height={15} fill="#374151" rx={2} />
            )}
            <text x={150} y={129} fill={colors.textSecondary} fontSize={9} textAnchor="middle">
              {showComparison ? (comparisonMode === 'glass_glass' ? 'Rear Glass' : 'Backsheet') : 'Backsheet'}
            </text>
          </g>

          {/* Degradation indicators */}
          <g transform="translate(20, 260)">
            <text x={0} y={0} fill={colors.accent} fontSize={12} fontWeight="bold">Degradation Metrics</text>

            {/* Yellowing index bar */}
            <text x={0} y={25} fill={colors.textSecondary} fontSize={11}>Yellowing Index:</text>
            <rect x={110} y={13} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
            <rect x={110} y={13} width={output.yellowingIndex} height={14} fill={colors.yellowed} rx={3} />
            <text x={220} y={25} fill={colors.textPrimary} fontSize={11}>{output.yellowingIndex.toFixed(1)}%</text>

            {/* Transmittance bar */}
            <text x={0} y={50} fill={colors.textSecondary} fontSize={11}>Transmittance:</text>
            <rect x={110} y={38} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
            <rect x={110} y={38} width={(output.transmittance / 100) * 100} height={14} fill={colors.fresh} rx={3} />
            <text x={220} y={50} fill={colors.textPrimary} fontSize={11}>{output.transmittance.toFixed(1)}%</text>

            {/* Power loss bar */}
            <text x={0} y={75} fill={colors.textSecondary} fontSize={11}>Power Loss:</text>
            <rect x={110} y={63} width={100} height={14} fill="rgba(255,255,255,0.1)" rx={3} />
            <rect x={110} y={63} width={output.powerLoss * 4} height={14} fill={colors.error} rx={3} />
            <text x={220} y={75} fill={colors.textPrimary} fontSize={11}>{output.powerLoss.toFixed(1)}%</text>
          </g>

          {/* Power loss curve */}
          <g transform="translate(280, 250)">
            <text x={100} y={0} fill={colors.accent} fontSize={12} fontWeight="bold" textAnchor="middle">Power vs Age</text>
            <rect x={0} y={10} width={200} height={100} fill="rgba(0,0,0,0.3)" rx={4} />

            {/* Axes */}
            <line x1={20} y1={100} x2={190} y2={100} stroke={colors.textMuted} strokeWidth={1} />
            <line x1={20} y1={20} x2={20} y2={100} stroke={colors.textMuted} strokeWidth={1} />

            {/* Curve */}
            <path
              d={`M 20,25 ${[...Array(30)].map((_, i) => {
                const year = i;
                const loss = 100 * (1 - Math.exp(-0.015 * year * 1.5)) * 0.15;
                const x = 20 + (i / 30) * 170;
                const y = 25 + loss * 4;
                return `L ${x},${y}`;
              }).join(' ')}`}
              fill="none"
              stroke={colors.solar}
              strokeWidth={2}
            />

            {/* Current position marker */}
            <circle
              cx={20 + (uvExposureYears / 30) * 170}
              cy={25 + output.powerLoss * 4}
              r={5}
              fill={colors.accent}
            />

            <text x={100} y={118} fill={colors.textMuted} fontSize={9} textAnchor="middle">Years</text>
            <text x={8} y={60} fill={colors.textMuted} fontSize={9} textAnchor="middle" transform="rotate(-90, 8, 60)">Power</text>
          </g>

          {/* Comparison info if enabled */}
          {showComparison && (
            <g transform="translate(280, 100)">
              <rect x={0} y={0} width={200} height={80} fill="rgba(0,0,0,0.4)" rx={8} />
              <text x={10} y={20} fill={colors.accent} fontSize={11} fontWeight="bold">
                {comparisonMode === 'glass_glass' ? 'Glass/Glass Module' : 'Glass/Backsheet Module'}
              </text>
              <text x={10} y={40} fill={colors.textSecondary} fontSize={10}>
                Expected Life: {durability.expectedLifespan} years
              </text>
              <text x={10} y={55} fill={colors.textSecondary} fontSize={10}>
                Moisture Ingress: {durability.moistureIngress}
              </text>
              <text x={10} y={70} fill={colors.textSecondary} fontSize={10}>
                Degradation: {durability.degradation.toFixed(1)}%
              </text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(!isAnimating); }}
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
              {isAnimating ? 'Pause Aging' : 'Simulate Aging'}
            </button>
            <button
              onClick={() => { setUvExposureYears(0); setIsAnimating(false); }}
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
          UV Exposure: {uvExposureYears.toFixed(1)} years
        </label>
        <input
          type="range"
          min="0"
          max="30"
          step="0.5"
          value={uvExposureYears}
          onChange={(e) => setUvExposureYears(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Encapsulant Material:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['eva', 'poe', 'silicone'] as const).map((mat) => (
            <button
              key={mat}
              onClick={() => setMaterialType(mat)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: materialType === mat ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: materialType === mat ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {mat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {showComparison && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Module Construction:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setComparisonMode('glass_backsheet')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: comparisonMode === 'glass_backsheet' ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: comparisonMode === 'glass_backsheet' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Glass/Backsheet
            </button>
            <button
              onClick={() => setComparisonMode('glass_glass')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: comparisonMode === 'glass_glass' ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: comparisonMode === 'glass_glass' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Glass/Glass
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.uv}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Material: {materialType.toUpperCase()} | Degradation Rate: {(calculateDegradation().degradationRate).toFixed(2)}%/year
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Yellowing = 100 x (1 - e^(-k x t)) where k depends on material UV stability
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
              Why Do Old Panels Yellow?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The invisible damage of UV radiation
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
                Solar panels are built to last 25+ years in harsh sunlight. But look closely at
                old panels - they often have a yellow or brown tint. This isn't dirt - it's
                chemical damage happening at the molecular level!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The transparent encapsulant protecting the cells slowly breaks down under UV exposure.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.uv}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try different encapsulant materials and watch how they age differently over time!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Observing:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A solar panel cross-section showing the encapsulant layer that protects the cells.
              UV radiation from sunlight continuously bombards this polymer layer, breaking chemical bonds.
              The display tracks yellowing, transmittance, and power loss over simulated years.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does yellowing change over a panel's 25-year lifetime?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore UV Aging</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare different encapsulant materials over time
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
              <li>Run all three materials to 25 years - which yellows least?</li>
              <li>Note the relationship between yellowing and power loss</li>
              <li>Observe how transmittance drops as yellowing increases</li>
              <li>Find the year when power loss exceeds 5%</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'saturating';

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
              Yellowing follows a saturating exponential pattern - the most vulnerable polymer bonds break first,
              then the rate slows as remaining bonds become harder to reach.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Science of UV Degradation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chain Scission:</strong> UV photons have enough energy
                (3-4 eV) to break C-C and C-O bonds in polymers. This fragments long polymer chains into shorter pieces.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chromophore Formation:</strong> Broken bonds create
                conjugated structures that absorb blue light, making the material appear yellow/brown.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Transmittance Loss:</strong> Yellowing reduces the light
                reaching cells. A 5% transmittance drop means 5% less power output!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Material Choice:</strong> Silicone resists UV best
                (Si-O backbone), POE is intermediate, and EVA degrades fastest (acetate groups hydrolyze).
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
              What about the module construction - glass/glass vs glass/backsheet?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Traditional panels use a polymer backsheet behind the cells, while glass/glass modules
              use a second glass sheet. Both use the same encapsulant. How does this affect
              long-term durability and encapsulant degradation?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which module type will show less encapsulant degradation over 25 years?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Module Types</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle between glass/glass and glass/backsheet construction
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
              Glass/glass modules show significantly less degradation because the rear glass
              provides a better moisture barrier. Moisture accelerates UV-induced degradation!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'glass_better';

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
              Glass/glass modules typically last 30-35 years vs 25 years for glass/backsheet,
              primarily due to superior moisture barrier properties!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Moisture + UV: A Destructive Combination</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Water Vapor Transmission:</strong> Polymer backsheets
                allow moisture to slowly penetrate (~1-5 g/m2/day). Glass is essentially impermeable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Hydrolysis:</strong> Water attacks the acetate groups
                in EVA, producing acetic acid. This accelerates chain scission and creates corrosive conditions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Bifacial Bonus:</strong> Glass/glass modules can also
                harvest light from both sides, adding 5-20% more energy while lasting longer!
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
              Encapsulant selection impacts solar project economics worldwide
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
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.uv, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
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
                {testScore >= 8 ? 'You understand UV aging in solar panels!' : 'Review the material and try again.'}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand UV aging and encapsulant degradation</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>UV photons break polymer chains (photodegradation)</li>
              <li>Yellowing follows saturating exponential kinetics</li>
              <li>Transmittance loss directly reduces power output</li>
              <li>Material choice: Silicone {">"} POE {">"} EVA for UV stability</li>
              <li>Glass/glass construction blocks moisture, extending life</li>
              <li>Combined UV + moisture damage through hydrolysis</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.uv, marginBottom: '12px' }}>Industry Impact:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The global solar industry invests billions in encapsulant R&D. Moving from standard EVA
              to advanced materials like POE or silicone can add 5-10 years to module lifetime,
              dramatically improving project economics. Your understanding of degradation physics
              enables better material selection and lifetime predictions!
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

export default EncapsulationUVAgingRenderer;
