import React, { useState, useEffect, useCallback } from 'react';

interface ScreenPrintingMetallizationRendererProps {
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
  metal: '#cbd5e1',
  silver: '#e2e8f0',
  silicon: '#1e3a5f',
};

const ScreenPrintingMetallizationRenderer: React.FC<ScreenPrintingMetallizationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [fingerWidth, setFingerWidth] = useState(50); // micrometers
  const [fingerPitch, setFingerPitch] = useState(2); // mm
  const [numBusbars, setNumBusbars] = useState(4);
  const [designType, setDesignType] = useState<'standard' | 'mbb' | 'busbarless'>('standard');
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculatePerformance = useCallback(() => {
    // Cell dimensions (156mm standard cell)
    const cellWidth = 156; // mm
    const cellHeight = 156; // mm
    const cellArea = cellWidth * cellHeight; // mm^2

    // Calculate number of fingers
    const numFingers = Math.floor(cellWidth / fingerPitch);

    // Shading losses
    const fingerAreaPerFinger = (fingerWidth / 1000) * cellHeight; // mm^2
    const totalFingerArea = numFingers * fingerAreaPerFinger;

    // Busbar shading (standard busbars are ~1mm wide)
    let busbarWidth = 1; // mm
    if (designType === 'mbb') {
      busbarWidth = 0.3; // mm for multi-busbar
    } else if (designType === 'busbarless') {
      busbarWidth = 0;
    }
    const totalBusbarArea = numBusbars * busbarWidth * cellHeight;

    const totalShadingArea = totalFingerArea + totalBusbarArea;
    const shadingLoss = (totalShadingArea / cellArea) * 100;

    // Series resistance calculation
    // Finger resistance: R_finger ~ (rho * L) / (w * h)
    const silverResistivity = 3e-6; // Ohm-cm (after firing)
    const fingerHeight = 25e-4; // 25 um in cm
    const fingerLengthToMidpoint = fingerPitch / 2 / 10; // cm
    const fingerRes = (silverResistivity * fingerLengthToMidpoint) / ((fingerWidth / 1e4) * fingerHeight);

    // Collection distance (how far carriers travel in silicon before reaching finger)
    const collectionDistance = fingerPitch / 2; // mm
    const emitterSheetRes = 80; // ohm/sq
    const emitterRes = emitterSheetRes * collectionDistance * collectionDistance / (cellHeight * fingerPitch / 3);

    // Busbar contribution
    let busbarRes = 0.001; // ohm
    if (designType === 'mbb') {
      busbarRes = 0.0005; // lower due to shorter paths
    } else if (designType === 'busbarless') {
      busbarRes = 0; // collected by wires instead
    }

    const totalSeriesRes = fingerRes + emitterRes + busbarRes;

    // Power output calculation
    const Jsc = 42; // mA/cm^2 (typical short-circuit current density)
    const Voc = 0.72; // V
    const area = cellArea / 100; // cm^2

    // Approximate fill factor loss from series resistance
    // FF ~ FF0 * (1 - Rs*Jsc/Voc)
    const FF0 = 0.84;
    const rsEffect = Math.min(0.15, totalSeriesRes * (Jsc / 1000) * area / Voc);
    const FF = FF0 * (1 - rsEffect);

    // Efficiency calculation
    const shadingFactor = 1 - shadingLoss / 100;
    const Pout = Voc * (Jsc * area / 1000) * FF * shadingFactor;
    const Pin = area * 0.1; // 100 mW/cm^2 = 0.1 W/cm^2
    const efficiency = (Pout / Pin) * 100;

    // Optimal metric (balance of shading and resistance)
    const powerLoss = shadingLoss + rsEffect * 100;

    return {
      numFingers,
      shadingLoss,
      seriesResistance: totalSeriesRes * 1000, // mOhm
      fillFactor: FF * 100,
      efficiency,
      powerLoss,
      collectionDistance,
    };
  }, [fingerWidth, fingerPitch, numBusbars, designType]);

  // Animation for finger optimization
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setFingerPitch(prev => {
        const newVal = prev + 0.1;
        if (newVal > 4) {
          setIsAnimating(false);
          return 2;
        }
        return newVal;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'full_cover', label: 'More metal = better collection, so cover the whole cell' },
    { id: 'no_metal', label: 'Metal blocks light, so use as little as possible' },
    { id: 'tradeoff', label: 'There\'s an optimal amount - balancing shading against resistance' },
    { id: 'doesnt_matter', label: 'The amount of metal doesn\'t affect efficiency' },
  ];

  const twistPredictions = [
    { id: 'std_best', label: 'Standard 4-5 busbars work best for all cells' },
    { id: 'mbb_best', label: 'Multi-busbar (MBB) with 9+ thin wires is always better' },
    { id: 'busbarless_best', label: 'Busbarless designs eliminate all busbar shading' },
    { id: 'depends', label: 'Each design has tradeoffs depending on cell technology' },
  ];

  const transferApplications = [
    {
      title: 'Half-Cut Cell Technology',
      description: 'Modern modules cut cells in half, reducing current by 50% and resistive losses by 75%.',
      question: 'Why does cutting cells in half reduce power loss?',
      answer: 'Resistive power loss = I^2*R. Half-cells carry half the current, so loss = (I/2)^2*R = I^2*R/4. Additionally, shorter current paths mean lower total resistance. Combined, this can recover 2-3W per module.',
    },
    {
      title: 'Printed Circuit Boards',
      description: 'PCB trace width design involves the same tradeoff: wider traces have lower resistance but take more space.',
      question: 'How is PCB design similar to solar cell metallization?',
      answer: 'Both optimize conductor geometry: wide enough for low resistance and current capacity, but narrow enough to leave room for other traces (or not block light). The math is identical - minimize I^2*R losses while meeting space constraints.',
    },
    {
      title: 'SMBB and Shingled Cells',
      description: 'Super Multi-Busbar (SMBB) uses 12-16 round wires, while shingled cells overlap like roof tiles.',
      question: 'Why are newer interconnect designs more complex?',
      answer: 'Round wires reflect some light back into the cell (gain back 1% shading). Shingled cells eliminate busbars entirely by overlapping cell edges. These designs extract every fraction of efficiency from the metallization tradeoff.',
    },
    {
      title: 'Copper vs Silver Metallization',
      description: 'Silver costs ~$0.05/Wp but copper is 100x cheaper. Industry is transitioning to copper plating.',
      question: 'Why has silver dominated despite copper\'s cost advantage?',
      answer: 'Silver paste can be screen-printed and fired directly - simple, fast, reliable. Copper requires plating through masks and barrier layers to prevent diffusion into silicon. But with silver prices rising, Cu plating is becoming cost-effective for high-efficiency cells.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why can\'t you cover the entire solar cell with metal to maximize current collection?',
      options: [
        { text: 'Metal is too expensive', correct: false },
        { text: 'Metal blocks light that would otherwise generate electricity', correct: true },
        { text: 'Metal would melt from the heat', correct: false },
        { text: 'It would make the cell too heavy', correct: false },
      ],
    },
    {
      question: 'What is the main purpose of finger electrodes on a solar cell?',
      options: [
        { text: 'To make the cell look nice', correct: false },
        { text: 'To collect current from the emitter with minimum shading', correct: true },
        { text: 'To protect the silicon from damage', correct: false },
        { text: 'To reflect light into the cell', correct: false },
      ],
    },
    {
      question: 'If you double the finger spacing (pitch), what happens?',
      options: [
        { text: 'Shading decreases, but series resistance increases significantly', correct: true },
        { text: 'Both shading and resistance decrease', correct: false },
        { text: 'Nothing changes - spacing doesn\'t matter', correct: false },
        { text: 'The cell generates more voltage', correct: false },
      ],
    },
    {
      question: 'The optimal finger width balances which two factors?',
      options: [
        { text: 'Color and temperature', correct: false },
        { text: 'Shading loss and finger resistance', correct: true },
        { text: 'Cost and appearance', correct: false },
        { text: 'Weight and flexibility', correct: false },
      ],
    },
    {
      question: 'What is "sheet resistance" in the context of solar cells?',
      options: [
        { text: 'Resistance to bending the cell', correct: false },
        { text: 'Resistance of a square of the emitter layer (ohm/square)', correct: true },
        { text: 'Resistance to water penetration', correct: false },
        { text: 'Resistance of the encapsulant', correct: false },
      ],
    },
    {
      question: 'How do multi-busbar (MBB) designs improve efficiency?',
      options: [
        { text: 'By using more silver', correct: false },
        { text: 'Thinner busbars reduce shading; shorter paths reduce resistance', correct: true },
        { text: 'By increasing the cell voltage', correct: false },
        { text: 'By making the cell darker', correct: false },
      ],
    },
    {
      question: 'Why does resistive power loss scale as I^2*R?',
      options: [
        { text: 'Because Ohm said so', correct: false },
        { text: 'P = V*I = (I*R)*I = I^2*R from Ohm\'s law', correct: true },
        { text: 'It doesn\'t - loss is linear with current', correct: false },
        { text: 'Due to quantum effects', correct: false },
      ],
    },
    {
      question: 'What is the typical shading loss from front metallization on a modern cell?',
      options: [
        { text: 'Less than 1%', correct: false },
        { text: 'About 3-5%', correct: true },
        { text: 'About 20-30%', correct: false },
        { text: 'Over 50%', correct: false },
      ],
    },
    {
      question: 'Why might "busbarless" designs still need metal lines?',
      options: [
        { text: 'For decoration', correct: false },
        { text: 'Fingers still needed to collect current; external wires replace busbars', correct: true },
        { text: 'Busbarless cells use no metal at all', correct: false },
        { text: 'To create electrical insulation', correct: false },
      ],
    },
    {
      question: 'How does half-cutting cells reduce resistive losses?',
      options: [
        { text: 'By using thicker metal', correct: false },
        { text: 'Half the current means 1/4 the I^2*R loss; shorter paths reduce R too', correct: true },
        { text: 'It doesn\'t - half-cut is just for aesthetics', correct: false },
        { text: 'By increasing cell temperature', correct: false },
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
    const width = 400;
    const height = 380;
    const output = calculatePerformance();

    // Cell visual parameters
    const cellX = 80;
    const cellY = 40;
    const cellW = 200;
    const cellH = 200;

    // Calculate finger positions
    const fingerSpacing = cellW / output.numFingers;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="solarCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <pattern id="cellTexture" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#1e3a5f" />
              <rect x="0" y="0" width="5" height="5" fill="#1e4080" opacity="0.3" />
            </pattern>
          </defs>

          {/* Solar cell */}
          <rect x={cellX} y={cellY} width={cellW} height={cellH} fill="url(#cellTexture)" rx="4" />

          {/* Busbars (vertical) */}
          {designType !== 'busbarless' && [...Array(numBusbars)].map((_, i) => {
            const busbarWidth = designType === 'mbb' ? 2 : 8;
            const x = cellX + (i + 1) * cellW / (numBusbars + 1) - busbarWidth / 2;
            return (
              <rect
                key={`busbar-${i}`}
                x={x}
                y={cellY}
                width={busbarWidth}
                height={cellH}
                fill={colors.silver}
                opacity={0.9}
              />
            );
          })}

          {/* Fingers (horizontal) */}
          {[...Array(Math.min(output.numFingers, 50))].map((_, i) => {
            const y = cellY + (i + 0.5) * fingerSpacing;
            const fingerH = Math.max(1, fingerWidth / 50); // Scale for visibility
            return (
              <rect
                key={`finger-${i}`}
                x={cellX}
                y={y - fingerH / 2}
                width={cellW}
                height={fingerH}
                fill={colors.metal}
                opacity={0.8}
              />
            );
          })}

          {/* Current flow arrows */}
          {interactive && (
            <g opacity={0.6}>
              <defs>
                <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
                </marker>
              </defs>
              {/* Current from silicon to finger */}
              <line x1={cellX + 30} y1={cellY + cellH / 2 - 20} x2={cellX + 30} y2={cellY + cellH / 2 - 5}
                    stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead2)" />
              <text x={cellX + 35} y={cellY + cellH / 2 - 10} fill={colors.accent} fontSize="8">I</text>

              {/* Current along finger to busbar */}
              <line x1={cellX + 50} y1={cellY + cellH / 2} x2={cellX + 80} y2={cellY + cellH / 2}
                    stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead2)" />
            </g>
          )}

          {/* Labels */}
          <text x={cellX + cellW / 2} y={cellY + cellH + 20} fill={colors.textSecondary} fontSize="10" textAnchor="middle">
            {designType === 'standard' ? `${numBusbars} Busbars` : designType === 'mbb' ? 'Multi-Busbar (12 wires)' : 'Busbarless'}
          </text>
          <text x={cellX + cellW / 2} y={cellY + cellH + 35} fill={colors.textMuted} fontSize="9" textAnchor="middle">
            {output.numFingers} fingers, {fingerPitch.toFixed(1)}mm pitch
          </text>

          {/* Performance meters */}
          <g transform="translate(300, 50)">
            <rect x="0" y="0" width="90" height="190" fill="rgba(0,0,0,0.6)" rx="8" stroke={colors.accent} strokeWidth="1" />
            <text x="45" y="20" fill={colors.textSecondary} fontSize="10" textAnchor="middle">METRICS</text>

            {/* Shading loss */}
            <text x="10" y="45" fill={colors.textMuted} fontSize="9">Shading</text>
            <rect x="10" y="50" width="70" height="8" fill="rgba(255,255,255,0.1)" rx="2" />
            <rect x="10" y="50" width={Math.min(70, 70 * output.shadingLoss / 10)} height="8" fill={colors.error} rx="2" />
            <text x="45" y="72" fill={colors.textPrimary} fontSize="10" textAnchor="middle">{output.shadingLoss.toFixed(1)}%</text>

            {/* Series resistance */}
            <text x="10" y="92" fill={colors.textMuted} fontSize="9">Rs Loss</text>
            <rect x="10" y="97" width="70" height="8" fill="rgba(255,255,255,0.1)" rx="2" />
            <rect x="10" y="97" width={Math.min(70, 70 * output.seriesResistance / 100)} height="8" fill={colors.warning} rx="2" />
            <text x="45" y="119" fill={colors.textPrimary} fontSize="10" textAnchor="middle">{output.seriesResistance.toFixed(1)} mOhm</text>

            {/* Fill Factor */}
            <text x="10" y="139" fill={colors.textMuted} fontSize="9">Fill Factor</text>
            <text x="45" y="158" fill={colors.success} fontSize="14" fontWeight="bold" textAnchor="middle">{output.fillFactor.toFixed(1)}%</text>

            {/* Efficiency */}
            <text x="10" y="178" fill={colors.textMuted} fontSize="9">Efficiency</text>
            <text x="45" y="197" fill={colors.accent} fontSize="14" fontWeight="bold" textAnchor="middle">{output.efficiency.toFixed(2)}%</text>
          </g>

          {/* Shading illustration */}
          <g transform="translate(80, 260)">
            <text x="100" y="0" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Light Blocked vs Collection Distance</text>
            <rect x="0" y="10" width="200" height="40" fill="rgba(0,0,0,0.3)" rx="4" />

            {/* Light blocked by metal */}
            <rect x="10" y="15" width={80 * output.shadingLoss / 10} height="12" fill={colors.error} rx="2" />
            <text x="10" y="40" fill={colors.textMuted} fontSize="8">Shaded: {output.shadingLoss.toFixed(1)}%</text>

            {/* Collection distance */}
            <rect x="110" y="15" width={70 * output.collectionDistance / 2} height="12" fill={colors.solar} rx="2" />
            <text x="110" y="40" fill={colors.textMuted} fontSize="8">Path: {output.collectionDistance.toFixed(1)}mm</text>
          </g>
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
              {isAnimating ? 'Stop' : 'Sweep Pitch'}
            </button>
            <button
              onClick={() => { setFingerWidth(50); setFingerPitch(2); setNumBusbars(4); setDesignType('standard'); }}
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

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Metallization Design
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'standard', label: 'Standard (4-5 BB)' },
              { key: 'mbb', label: 'Multi-Busbar (12+)' },
              { key: 'busbarless', label: 'Busbarless' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setDesignType(key as 'standard' | 'mbb' | 'busbarless');
                  if (key === 'mbb') setNumBusbars(12);
                  else if (key === 'standard') setNumBusbars(4);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: designType === key ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: designType === key ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Finger Width: {fingerWidth} um
        </label>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={fingerWidth}
          onChange={(e) => setFingerWidth(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Finger Pitch: {fingerPitch.toFixed(1)} mm
        </label>
        <input
          type="range"
          min="0.8"
          max="4"
          step="0.1"
          value={fingerPitch}
          onChange={(e) => setFingerPitch(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {!showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Number of Busbars: {numBusbars}
          </label>
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            value={numBusbars}
            onChange={(e) => setNumBusbars(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Total Loss = Shading + I^2R Resistance Loss
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Find the sweet spot that minimizes both!
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
              Screen Printing Metallization
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why not cover the whole cell with metal to collect more charge?
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
                Solar cells need metal contacts to collect the generated electricity. But here's
                the paradox: more metal means better collection but also more shading. Less metal
                means less shading but higher resistance. What's the optimal design?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer involves a careful balance of competing factors!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting finger width and spacing to optimize power output!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Dilemma:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Metal contacts collect current but block light. Wide, closely-spaced fingers
              give low resistance but high shading. Narrow, widely-spaced fingers give low
              shading but high resistance. What strategy maximizes power output?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the best metallization strategy?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Metallization Optimizer</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Find the optimal finger design for maximum power
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
              <li>Increase finger pitch - watch shading drop but resistance rise</li>
              <li>Increase finger width - resistance drops, shading increases</li>
              <li>Find the pitch that maximizes efficiency</li>
              <li>Try different busbar counts - more = lower resistance</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'tradeoff';

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
              There's an optimal balance! Too much metal blocks light; too little creates
              resistance losses. Modern cells carefully optimize finger width, pitch, and
              busbar design to maximize power output.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Metallization Tradeoff</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shading Loss:</strong> Every bit of
                metal blocks sunlight. Modern cells achieve 3-5% shading. Each 1% shading costs
                about 0.2% absolute efficiency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resistive Loss:</strong> Current
                flows through the emitter to fingers, then along fingers to busbars. Power loss
                = I^2*R increases quadratically with current path length.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Optimal Design:</strong> Fingers
                are typically 40-60 um wide, spaced 1.5-2.5 mm apart. This gives ~3% shading and
                manageable series resistance.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Fill Factor:</strong> Series
                resistance reduces fill factor. FF drops from ~84% ideal to ~80% actual due to
                metallization and contact resistances.
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
              What about busbarless and multi-wire designs?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>New Designs:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Industry is moving beyond traditional busbars. Multi-busbar (MBB) uses 9-16 thin
              wires instead of 4-5 wide busbars. Busbarless designs eliminate printed busbars
              entirely, using only fingers contacted by external wires. Which approach is best?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which metallization approach is best?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Designs</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between standard, MBB, and busbarless
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observations:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong>MBB:</strong> Thinner busbars reduce shading by ~1%. Shorter paths to wires reduce finger resistance.<br/><br/>
              <strong>Busbarless:</strong> Eliminates all busbar shading. But requires precise wire alignment during module assembly.<br/><br/>
              Each approach has manufacturing and reliability tradeoffs beyond just electrical performance.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'depends';

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
              Each design has tradeoffs! MBB is becoming mainstream for its balance of efficiency
              gain and manufacturability. Busbarless offers the best efficiency but needs careful
              handling.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Design Comparison</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Standard (4-5 BB):</strong> Proven,
                reliable, simple manufacturing. But ~1.5% shading from busbars alone.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Multi-Busbar (9-16):</strong> Round
                wires can reflect light back in. Shorter current paths in fingers. ~0.5% efficiency
                gain. Now dominant in new production.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Busbarless:</strong> Maximum efficiency
                potential. But cell handling is tricky - wires must align precisely during stringing.
                Used mainly in premium/specialty applications.
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
              Metallization optimization appears everywhere in electronics
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
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered metallization design!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered metallization design!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Shading vs resistance tradeoff</li>
              <li>Optimal finger width and pitch design</li>
              <li>I^2*R power loss in conductors</li>
              <li>Multi-busbar and busbarless technologies</li>
              <li>Half-cut cell current reduction benefits</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Leading cell manufacturers now use copper plating instead of silver paste,
              enabling thinner fingers (25-30 um) with lower resistance. Combined with
              shingled cell designs that eliminate busbars entirely, next-generation
              modules can achieve over 23% efficiency at the module level!
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

export default ScreenPrintingMetallizationRenderer;
