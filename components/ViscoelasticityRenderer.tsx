import React, { useState, useEffect, useCallback } from 'react';

interface ViscoelasticityRendererProps {
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
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  elastic: '#3b82f6',
  viscous: '#ef4444',
  material: '#a855f7',
};

const ViscoelasticityRenderer: React.FC<ViscoelasticityRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [strainRate, setStrainRate] = useState(50); // 0 = very slow, 100 = very fast
  const [temperature, setTemperature] = useState(50); // 0 = cold, 100 = hot
  const [time, setTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stretchAmount, setStretchAmount] = useState(0);
  const [stressHistory, setStressHistory] = useState<{ strain: number; stress: number }[]>([]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate material properties based on strain rate and temperature
  const relaxationTime = useCallback(() => {
    // Higher temperature = shorter relaxation time (flows easier)
    // Base relaxation time modified by temperature
    const baseRelax = 2.0;
    const tempFactor = Math.exp(-temperature / 30);
    return baseRelax * tempFactor;
  }, [temperature]);

  const deborahNumber = useCallback(() => {
    // De = relaxation time / observation time
    // observation time inversely proportional to strain rate
    const observationTime = 10 / (strainRate + 1);
    return relaxationTime() / observationTime;
  }, [strainRate, relaxationTime]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setTime(prev => prev + 0.05);

      // Calculate stretch based on time and strain rate
      const rate = (strainRate / 50) * 2;
      const newStretch = Math.sin(time * rate) * 50;
      setStretchAmount(newStretch);

      // Calculate stress (Maxwell model: spring + dashpot in series)
      const De = deborahNumber();
      const strain = newStretch / 50;
      // For viscoelastic: stress depends on strain rate more than strain itself
      const elasticStress = strain * (De > 1 ? 1 : De);
      const viscousStress = rate * (1 - (De > 1 ? 1 : De));
      const totalStress = elasticStress + viscousStress * 0.3;

      setStressHistory(prev => {
        const newHistory = [...prev, { strain: strain * 100, stress: totalStress * 100 }];
        return newHistory.slice(-100);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, time, strainRate, deborahNumber]);

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

  const predictions = [
    { id: 'always_solid', label: 'It always acts like a solid - bounces and holds shape' },
    { id: 'always_liquid', label: 'It always acts like a liquid - flows and drips' },
    { id: 'rate_depends', label: 'Fast = solid-like (bounces); Slow = liquid-like (flows)' },
    { id: 'random', label: 'It behaves randomly depending on how you touch it' },
  ];

  const twistPredictions = [
    { id: 'no_change', label: 'Temperature has no effect on the behavior' },
    { id: 'cold_flows', label: 'Cold makes it flow more; warm makes it stiffer' },
    { id: 'cold_brittle', label: 'Cold makes it more brittle/solid; warm makes it flow more' },
    { id: 'melts', label: 'It melts completely when warm' },
  ];

  const transferApplications = [
    {
      title: 'Shock Absorbers',
      description: 'Car suspension systems use viscoelastic materials that resist fast impacts but allow slow movements for comfort.',
      question: 'Why do shock absorbers need viscoelastic behavior?',
      answer: 'They must absorb sudden bumps quickly (high De - solid-like response) while allowing the car to settle slowly over rough terrain (low De - fluid-like response). Pure springs would bounce; pure dampers would be too stiff.',
    },
    {
      title: 'Running Shoes',
      description: 'Shoe foam cushioning is viscoelastic - it absorbs impact energy on landing but returns energy during push-off.',
      question: 'How does viscoelasticity improve athletic performance?',
      answer: 'During fast impact (landing), the foam acts solid-like, spreading force over time. During slower push-off, some stored elastic energy returns. The material "knows" when to absorb vs return energy based on the timescale of deformation.',
    },
    {
      title: 'Polymer Processing',
      description: 'Manufacturing plastics requires understanding how melted polymers flow at different rates and temperatures.',
      question: 'Why must engineers control strain rate when molding plastics?',
      answer: 'Too fast and the polymer acts solid, cracking or not filling molds. Too slow and production is inefficient. The Deborah number guides process design - keeping De in the optimal range for smooth flow without defects.',
    },
    {
      title: 'Biological Tissues',
      description: 'Your muscles, tendons, and organs are viscoelastic - they respond differently to slow stretches vs sudden impacts.',
      question: 'How does viscoelasticity protect your body?',
      answer: 'Tendons absorb sudden loads (solid-like at high De) preventing tears, while allowing slow stretching during movement. Organs distribute impact forces over time. This dual behavior is why slow stretching is safe but sudden jerks cause injury.',
    },
  ];

  const testQuestions = [
    {
      question: 'What makes a material viscoelastic?',
      options: [
        { text: 'It has both viscous (flow) and elastic (spring) properties', correct: true },
        { text: 'It changes color under stress', correct: false },
        { text: 'It is always liquid at room temperature', correct: false },
        { text: 'It conducts electricity well', correct: false },
      ],
    },
    {
      question: 'The Deborah number (De) compares:',
      options: [
        { text: 'Temperature to pressure', correct: false },
        { text: 'Mass to volume', correct: false },
        { text: 'Relaxation time to observation time', correct: true },
        { text: 'Length to width', correct: false },
      ],
    },
    {
      question: 'When De >> 1 (much greater than 1), the material behaves more like a:',
      options: [
        { text: 'Liquid - it flows easily', correct: false },
        { text: 'Solid - it responds elastically', correct: true },
        { text: 'Gas - it expands', correct: false },
        { text: 'Neither - it disappears', correct: false },
      ],
    },
    {
      question: 'Silly putty bounces when thrown because:',
      options: [
        { text: 'It is chemically different from normal putty', correct: false },
        { text: 'Fast deformation gives high De, so it acts elastic', correct: true },
        { text: 'Gravity affects it differently', correct: false },
        { text: 'It is magnetic', correct: false },
      ],
    },
    {
      question: 'Silly putty flows slowly when left on a table because:',
      options: [
        { text: 'It is attracted to the table surface', correct: false },
        { text: 'Slow deformation gives low De, so it acts viscous', correct: true },
        { text: 'Air pressure pushes it down', correct: false },
        { text: 'It is evaporating', correct: false },
      ],
    },
    {
      question: 'Increasing temperature typically causes a viscoelastic material to:',
      options: [
        { text: 'Become more solid-like', correct: false },
        { text: 'Become more fluid-like (shorter relaxation time)', correct: true },
        { text: 'Stay exactly the same', correct: false },
        { text: 'Become invisible', correct: false },
      ],
    },
    {
      question: 'The Maxwell model represents viscoelasticity as:',
      options: [
        { text: 'Two springs in parallel', correct: false },
        { text: 'A spring and dashpot in series', correct: true },
        { text: 'Three dashpots in series', correct: false },
        { text: 'A single rigid rod', correct: false },
      ],
    },
    {
      question: 'Polymer chains in viscoelastic materials:',
      options: [
        { text: 'Are completely rigid and never move', correct: false },
        { text: 'Can stretch quickly but take time to flow past each other', correct: true },
        { text: 'Are always in liquid form', correct: false },
        { text: 'Do not affect material behavior', correct: false },
      ],
    },
    {
      question: 'In a stress-strain curve for a viscoelastic material, strain rate affects:',
      options: [
        { text: 'Only the color of the curve', correct: false },
        { text: 'The slope and shape of the curve significantly', correct: true },
        { text: 'Nothing - the curve is always the same', correct: false },
        { text: 'Only the units of measurement', correct: false },
      ],
    },
    {
      question: 'Which real-world application relies on viscoelastic behavior?',
      options: [
        { text: 'Light bulbs', correct: false },
        { text: 'Shock absorbers and running shoe foam', correct: true },
        { text: 'Window glass', correct: false },
        { text: 'Copper wiring', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderMaterialBlob = (interactive: boolean, showGraph: boolean = false) => {
    const width = 400;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;

    // Material blob deformation based on stretch
    const De = deborahNumber();
    const blobWidth = 80 + stretchAmount * (De > 1 ? 0.5 : 1.5);
    const blobHeight = 60 - stretchAmount * 0.3 * (De > 1 ? 0.5 : 1.5);

    // Color based on behavior - more purple = elastic, more red = viscous
    const behaviorRatio = Math.min(De / 2, 1);
    const blobColor = `rgb(${Math.round(168 + (59 - 168) * behaviorRatio)}, ${Math.round(85 + (130 - 85) * behaviorRatio)}, ${Math.round(247 + (246 - 247) * behaviorRatio)})`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#f8fafc', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Background indicators */}
          <text x={20} y={25} fill={colors.bgPrimary} fontSize={12} fontWeight="bold">
            Deborah Number: {De.toFixed(2)}
          </text>
          <text x={20} y={42} fill={colors.bgPrimary} fontSize={11}>
            {De > 1.5 ? 'SOLID-LIKE (elastic)' : De < 0.5 ? 'FLUID-LIKE (viscous)' : 'TRANSITIONAL'}
          </text>

          {/* Strain rate indicator */}
          <rect x={width - 100} y={15} width={80} height={8} fill="#ddd" rx={4} />
          <rect x={width - 100} y={15} width={strainRate * 0.8} height={8} fill={colors.accent} rx={4} />
          <text x={width - 100} y={38} fill={colors.bgPrimary} fontSize={10}>
            Rate: {strainRate < 30 ? 'SLOW' : strainRate > 70 ? 'FAST' : 'MEDIUM'}
          </text>

          {/* Pulling hands/arrows */}
          <g>
            {/* Left arrow */}
            <path
              d={`M ${centerX - blobWidth - 30} ${centerY} L ${centerX - blobWidth - 10} ${centerY}`}
              stroke={colors.elastic}
              strokeWidth={3}
              markerEnd="url(#arrowRight)"
            />
            <text x={centerX - blobWidth - 60} y={centerY + 5} fill={colors.bgPrimary} fontSize={12}>Pull</text>

            {/* Right arrow */}
            <path
              d={`M ${centerX + blobWidth + 30} ${centerY} L ${centerX + blobWidth + 10} ${centerY}`}
              stroke={colors.elastic}
              strokeWidth={3}
              markerEnd="url(#arrowLeft)"
            />
            <text x={centerX + blobWidth + 35} y={centerY + 5} fill={colors.bgPrimary} fontSize={12}>Pull</text>
          </g>

          {/* Arrow markers */}
          <defs>
            <marker id="arrowRight" markerWidth={10} markerHeight={10} refX={0} refY={3} orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill={colors.elastic} />
            </marker>
            <marker id="arrowLeft" markerWidth={10} markerHeight={10} refX={9} refY={3} orient="auto">
              <path d="M9,0 L9,6 L0,3 z" fill={colors.elastic} />
            </marker>
          </defs>

          {/* Material blob with viscoelastic deformation */}
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={Math.max(30, blobWidth)}
            ry={Math.max(20, blobHeight)}
            fill={blobColor}
            stroke={colors.material}
            strokeWidth={3}
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
          />

          {/* Internal structure lines showing polymer chains */}
          {[...Array(5)].map((_, i) => {
            const y = centerY - 30 + i * 15;
            const waveAmplitude = De > 1 ? 2 : 8;
            const waveFreq = De > 1 ? 0.1 : 0.05;
            return (
              <path
                key={i}
                d={`M ${centerX - blobWidth + 20} ${y} ${[...Array(10)].map((_, j) => {
                  const x = centerX - blobWidth + 20 + j * (blobWidth * 2 - 40) / 10;
                  const yOffset = Math.sin((x + time * 50) * waveFreq) * waveAmplitude;
                  return `L ${x} ${y + yOffset}`;
                }).join(' ')}`}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.5}
                fill="none"
              />
            );
          })}

          {/* Behavior label */}
          <rect
            x={centerX - 50}
            y={centerY + blobHeight + 20}
            width={100}
            height={24}
            fill={De > 1 ? colors.elastic : colors.viscous}
            rx={12}
          />
          <text
            x={centerX}
            y={centerY + blobHeight + 36}
            fill="white"
            fontSize={12}
            textAnchor="middle"
            fontWeight="bold"
          >
            {De > 1 ? 'ELASTIC' : 'VISCOUS'}
          </text>

          {/* Temperature indicator */}
          <rect x={15} y={height - 60} width={12} height={50} fill="#ddd" rx={6} />
          <rect
            x={15}
            y={height - 60 + (100 - temperature) * 0.5}
            width={12}
            height={temperature * 0.5}
            fill={temperature > 60 ? colors.error : temperature < 40 ? colors.elastic : colors.warning}
            rx={6}
          />
          <text x={10} y={height - 5} fill={colors.bgPrimary} fontSize={9}>TEMP</text>
        </svg>

        {showGraph && (
          <div style={{ width: '100%', maxWidth: '500px', marginTop: '16px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
              <div style={{ color: colors.bgPrimary, fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                Stress-Strain Curve (changes with strain rate)
              </div>
              <svg width="100%" height={120} viewBox="0 0 200 120">
                {/* Axes */}
                <line x1={30} y1={100} x2={190} y2={100} stroke={colors.bgPrimary} strokeWidth={1} />
                <line x1={30} y1={10} x2={30} y2={100} stroke={colors.bgPrimary} strokeWidth={1} />
                <text x={100} y={115} fill={colors.bgPrimary} fontSize={10} textAnchor="middle">Strain</text>
                <text x={15} y={55} fill={colors.bgPrimary} fontSize={10} textAnchor="middle" transform="rotate(-90, 15, 55)">Stress</text>

                {/* Plot stress-strain history */}
                {stressHistory.length > 1 && (
                  <path
                    d={`M ${30 + stressHistory[0].strain * 1.5} ${100 - stressHistory[0].stress * 0.8} ${stressHistory.slice(1).map(p =>
                      `L ${30 + Math.max(0, Math.min(100, p.strain + 50)) * 1.5} ${100 - Math.max(0, Math.min(100, p.stress + 50)) * 0.8}`
                    ).join(' ')}`}
                    stroke={colors.material}
                    strokeWidth={2}
                    fill="none"
                  />
                )}

                {/* Reference lines */}
                <line x1={30} y1={100} x2={190} y2={10} stroke={colors.elastic} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
                <text x={160} y={30} fill={colors.elastic} fontSize={8}>Elastic</text>
              </svg>
            </div>
          </div>
        )}

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => {
                setIsAnimating(!isAnimating);
                if (!isAnimating) {
                  setStressHistory([]);
                }
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnimating ? 'Stop' : 'Stretch/Compress'}
            </button>
            <button
              onClick={() => {
                setStrainRate(50);
                setTemperature(50);
                setStretchAmount(0);
                setTime(0);
                setStressHistory([]);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Strain Rate: {strainRate < 30 ? 'SLOW (like leaving putty on table)' : strainRate > 70 ? 'FAST (like throwing putty)' : 'MEDIUM'}
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={strainRate}
          onChange={(e) => setStrainRate(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Slow (flows)</span>
          <span>Fast (bounces)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Temperature: {temperature < 30 ? 'COLD' : temperature > 70 ? 'WARM' : 'ROOM TEMP'}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Cold (brittle)</span>
          <span>Warm (flows more)</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Deborah Number (De) = {deborahNumber().toFixed(2)}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          De {'>'} 1: Solid-like | De {'<'} 1: Fluid-like
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
              Silly Putty Science
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can one material act like a solid AND a liquid?
            </p>
          </div>

          {renderMaterialBlob(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Throw silly putty at the wall - it bounces like a rubber ball.
                Leave it on a table - it slowly flows into a puddle.
                Same material, opposite behaviors!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is viscoelasticity - materials that remember they're both solid and liquid.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Stretch/Compress" to see how the material responds to deformation!
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
          {renderMaterialBlob(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A blob of viscoelastic material (like silly putty or polymer slime) being
              stretched at different rates. The internal wavy lines represent tangled
              polymer chains. The Deborah number (De) tells us if the material will
              act more like a solid or liquid.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What determines whether silly putty bounces or flows?
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
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Viscoelasticity</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust strain rate to see solid-like vs liquid-like behavior
            </p>
          </div>

          {renderMaterialBlob(true, true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Fast rate (high De) - material bounces back elastically</li>
              <li>Slow rate (low De) - material flows like thick honey</li>
              <li>Watch the stress-strain curve change shape!</li>
              <li>Notice how polymer chains respond differently</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'rate_depends';

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
              The deformation rate determines behavior: fast = solid-like, slow = fluid-like!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Viscoelasticity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Deborah Number:</strong> De = relaxation time / observation time.
                Named after the biblical prophetess who said "the mountains flowed before the Lord" -
                given enough time, even mountains flow!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>High De (fast deformation):</strong> The material
                doesn't have time to rearrange its polymer chains. It stores energy elastically and bounces back.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Low De (slow deformation):</strong> Polymer chains
                have time to slide past each other. Energy dissipates as heat, and the material flows.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Maxwell Model:</strong> Spring (elastic) + dashpot
                (viscous) in series. The spring stores energy; the dashpot dissipates it over time.
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
              What if we change the temperature?
            </p>
          </div>

          {renderMaterialBlob(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You have two pieces of the same silly putty. You put one in the freezer and
              warm the other in your hands. Now you try to stretch both at the same rate.
              How does temperature affect the viscoelastic behavior?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does temperature change the material's behavior?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Temperature Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change temperature and observe how the same strain rate produces different behavior
            </p>
          </div>

          {renderMaterialBlob(true, true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Cold materials have longer relaxation times (higher De at same rate) - more brittle and solid-like.
              Warm materials have shorter relaxation times (lower De) - more fluid and flowing.
              This is why cold silly putty can shatter, but warm putty stretches endlessly!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'cold_brittle';

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
              Chill it and it becomes more brittle; warm it and it flows more!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Temperature and Relaxation Time</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cold Materials:</strong> Polymer chains move
                sluggishly. Relaxation time increases dramatically. Even moderate strain rates give high De,
                making the material act glassy and brittle - it can shatter!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Warm Materials:</strong> Polymer chains wiggle
                energetically and slide past each other easily. Relaxation time decreases. Even fast
                deformation may give low De, so the material flows smoothly.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Glass Transition:</strong> Below a critical
                temperature, many polymers "freeze" into a glassy state where they behave almost purely
                elastic (and brittle). This is why rubber bands snap when frozen!
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
              Viscoelasticity is everywhere in engineering and biology
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
                {testScore >= 8 ? 'You\'ve mastered viscoelasticity!' : 'Review the material and try again.'}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered viscoelasticity and time-dependent material behavior</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Deborah number: De = relaxation time / observation time</li>
              <li>High De = solid-like elastic response</li>
              <li>Low De = liquid-like viscous flow</li>
              <li>Temperature affects relaxation time</li>
              <li>Maxwell model: spring + dashpot in series</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Real materials often require more complex models like the Kelvin-Voigt (parallel spring-dashpot)
              or Standard Linear Solid. Rheology, the study of flow, uses these models to predict everything
              from paint dripping to blood flow to earthquake response. The time-temperature superposition
              principle lets engineers predict long-term behavior from short tests!
            </p>
          </div>
          {renderMaterialBlob(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ViscoelasticityRenderer;
