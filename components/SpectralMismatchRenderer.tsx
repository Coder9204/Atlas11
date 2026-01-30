import React, { useState, useCallback } from 'react';

interface SpectralMismatchRendererProps {
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
  incandescent: '#ffb347',
  led: '#f0f8ff',
  sunlight: '#fffacd',
  uv: '#7c3aed',
  ir: '#991b1b',
};

const SpectralMismatchRenderer: React.FC<SpectralMismatchRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [lightSource, setLightSource] = useState<'incandescent' | 'led' | 'sunlight'>('sunlight');
  const [hasUVFilter, setHasUVFilter] = useState(false);
  const [hasIRFilter, setHasIRFilter] = useState(false);
  const [cellBandgap, setCellBandgap] = useState(1.1); // Silicon bandgap in eV

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Light source spectra (simplified model)
  const lightSources = {
    incandescent: {
      name: 'Incandescent (2700K)',
      color: colors.incandescent,
      uvContent: 0.01,
      visibleContent: 0.12,
      irContent: 0.87,
      humanBrightness: 85, // Perceived brightness
      pvPower: 35, // Relative PV output
      description: 'Warm, mostly infrared',
    },
    led: {
      name: 'LED (5000K)',
      color: colors.led,
      uvContent: 0.0,
      visibleContent: 0.95,
      irContent: 0.05,
      humanBrightness: 90,
      pvPower: 78,
      description: 'Cool, mostly visible',
    },
    sunlight: {
      name: 'Sunlight (AM1.5)',
      color: colors.sunlight,
      uvContent: 0.05,
      visibleContent: 0.43,
      irContent: 0.52,
      humanBrightness: 100,
      pvPower: 100,
      description: 'Full spectrum',
    },
  };

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const source = lightSources[lightSource];

    // Spectral content after filters
    let uvRemaining = hasUVFilter ? source.uvContent * 0.1 : source.uvContent;
    let irRemaining = hasIRFilter ? source.irContent * 0.2 : source.irContent;
    let visibleRemaining = source.visibleContent;

    // PV cell response - depends on bandgap
    // Silicon (1.1 eV) responds to wavelengths < 1127 nm
    // This means some IR is usable, UV/visible is all usable
    const usableUV = uvRemaining * 1.0; // All UV has enough energy
    const usableVisible = visibleRemaining * 1.0; // All visible has enough energy

    // For silicon, IR up to 1127nm is usable (roughly half of IR spectrum)
    const usableIR = irRemaining * 0.4;

    // Calculate total usable power
    const totalUsable = usableUV + usableVisible + usableIR;

    // Quantum efficiency loss from thermalization (excess energy wasted as heat)
    // Higher energy photons lose more energy
    const uvLoss = uvRemaining * 0.6; // UV loses 60% to heat
    const visibleLoss = visibleRemaining * 0.3; // Visible loses 30%
    const irLoss = usableIR * 0.1; // Usable IR loses only 10%

    const effectivePower = totalUsable - uvLoss - visibleLoss - irLoss;

    // Current proportional to number of photons above bandgap
    const current = effectivePower * source.pvPower * 0.4; // mA/cm²

    // Voltage determined by bandgap
    const voltage = cellBandgap * 0.7; // Approximate Voc

    // Power output
    const power = voltage * current;

    // Spectral mismatch factor (ratio of actual output to ideal)
    const spectralMismatch = effectivePower / (source.uvContent + source.visibleContent + source.irContent * 0.4);

    return {
      current,
      voltage,
      power,
      spectralMismatch: spectralMismatch * 100,
      uvContent: uvRemaining * 100,
      visibleContent: visibleRemaining * 100,
      irContent: irRemaining * 100,
      humanBrightness: source.humanBrightness,
    };
  }, [lightSource, hasUVFilter, hasIRFilter, cellBandgap]);

  const predictions = [
    { id: 'same', label: 'Similar-looking brightness means similar PV power output' },
    { id: 'warmer', label: 'Warmer (incandescent) light gives more power because it feels hotter' },
    { id: 'cooler', label: 'Cooler (LED) light gives more power because it\'s more efficient' },
    { id: 'spectrum', label: 'PV output depends on spectrum, not perceived brightness' },
  ];

  const twistPredictions = [
    { id: 'uv_helps', label: 'Blocking UV increases power (less heat damage)' },
    { id: 'ir_helps', label: 'Blocking IR increases power (less thermal stress)' },
    { id: 'both_hurt', label: 'Blocking either UV or IR reduces power (less usable photons)' },
    { id: 'no_effect', label: 'Filters have minimal effect on power output' },
  ];

  const transferApplications = [
    {
      title: 'Indoor Solar Lighting',
      description: 'Solar panels under artificial lighting behave very differently than outdoors.',
      question: 'Why do solar calculators work poorly under incandescent bulbs?',
      answer: 'Incandescent bulbs emit mostly infrared (heat) with little visible light. The amorphous silicon in calculators has a higher bandgap, so it can\'t use IR. LED or fluorescent lighting provides much more usable spectrum.',
    },
    {
      title: 'Multi-Junction Solar Cells',
      description: 'Space-grade solar cells use multiple layers to capture different parts of the spectrum.',
      question: 'How do multi-junction cells reduce spectral mismatch losses?',
      answer: 'Each junction has a different bandgap optimized for a different wavelength range. The top junction captures UV/blue, middle captures green/red, bottom captures IR. This minimizes thermalization losses from excess photon energy.',
    },
    {
      title: 'Solar Panel Testing',
      description: 'Solar simulators must match the sun\'s spectrum for accurate testing.',
      question: 'Why can\'t any bright light source test solar panels accurately?',
      answer: 'A halogen lamp might match the sun\'s intensity but has too much IR and too little blue. The panel\'s output would be lower than under real sunlight because silicon can\'t efficiently convert the excess IR.',
    },
    {
      title: 'Greenhouse Solar Panels',
      description: 'Transparent solar panels in greenhouses must balance electricity and plant growth.',
      question: 'What spectrum trade-offs exist for transparent solar panels?',
      answer: 'Plants need red and blue light for photosynthesis but don\'t use green. Transparent PV can absorb UV and some visible while letting through photosynthetically active radiation. But blocking too much reduces PV output.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why might an incandescent bulb and LED of equal perceived brightness produce different PV power?',
      options: [
        { text: 'The LED is more expensive', correct: false },
        { text: 'They have different spectral power distributions', correct: true },
        { text: 'Incandescent bulbs are hotter', correct: false },
        { text: 'The PV cell prefers warm colors', correct: false },
      ],
    },
    {
      question: 'Spectral mismatch loss occurs because:',
      options: [
        { text: 'Some photons have too little energy to generate current', correct: false },
        { text: 'Excess photon energy is wasted as heat', correct: false },
        { text: 'Both of the above', correct: true },
        { text: 'The light source is too bright', correct: false },
      ],
    },
    {
      question: 'A silicon solar cell (1.1 eV bandgap) under incandescent light performs poorly because:',
      options: [
        { text: 'Most of the spectrum is infrared beyond 1127 nm', correct: true },
        { text: 'Incandescent light is too dim', correct: false },
        { text: 'Silicon absorbs only blue light', correct: false },
        { text: 'The bulb is too efficient', correct: false },
      ],
    },
    {
      question: 'Photon energy is related to wavelength by:',
      options: [
        { text: 'Longer wavelength = higher energy', correct: false },
        { text: 'Shorter wavelength = higher energy', correct: true },
        { text: 'Wavelength doesn\'t affect energy', correct: false },
        { text: 'Only visible light has energy', correct: false },
      ],
    },
    {
      question: 'Thermalization loss refers to:',
      options: [
        { text: 'Heat from the environment damaging the cell', correct: false },
        { text: 'Excess photon energy converted to heat instead of electricity', correct: true },
        { text: 'The cell getting too cold to work', correct: false },
        { text: 'Thermal expansion breaking the cell', correct: false },
      ],
    },
    {
      question: 'An IR-blocking filter on a silicon cell under sunlight will:',
      options: [
        { text: 'Increase power by reducing heat', correct: false },
        { text: 'Decrease power by blocking usable IR photons', correct: true },
        { text: 'Have no effect on power', correct: false },
        { text: 'Double the output voltage', correct: false },
      ],
    },
    {
      question: 'Human eyes are most sensitive to which wavelengths?',
      options: [
        { text: 'Ultraviolet (300-400 nm)', correct: false },
        { text: 'Green-yellow (500-600 nm)', correct: true },
        { text: 'Near-infrared (700-1000 nm)', correct: false },
        { text: 'All wavelengths equally', correct: false },
      ],
    },
    {
      question: 'Why do solar panel specifications use AM1.5 sunlight as a standard?',
      options: [
        { text: 'It\'s the brightest possible sunlight', correct: false },
        { text: 'It represents average terrestrial sunlight spectrum', correct: true },
        { text: 'It\'s easier to measure than real sunlight', correct: false },
        { text: 'It\'s required by law', correct: false },
      ],
    },
    {
      question: 'Multi-junction solar cells achieve higher efficiency by:',
      options: [
        { text: 'Using more silicon', correct: false },
        { text: 'Having multiple bandgaps to match different spectral regions', correct: true },
        { text: 'Operating at higher temperatures', correct: false },
        { text: 'Using only visible light', correct: false },
      ],
    },
    {
      question: 'The photovoltaic response of a cell depends on photon energy rather than:',
      options: [
        { text: 'Photon number', correct: false },
        { text: 'Human-perceived brightness', correct: true },
        { text: 'Light intensity', correct: false },
        { text: 'Cell temperature', correct: false },
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

  const renderVisualization = () => {
    const width = 550;
    const height = 420;
    const output = calculateOutput();
    const source = lightSources[lightSource];

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
              <stop offset="0%" stopColor={colors.uv} />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#ef4444" />
              <stop offset="100%" stopColor={colors.ir} />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width / 2} y={25} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle">
            Spectral Mismatch - Light Source Comparison
          </text>

          {/* Light source selector visual */}
          <g transform="translate(80, 80)">
            <text x="60" y="-10" fill={colors.textSecondary} fontSize={12} textAnchor="middle">Light Source</text>

            {/* Bulb icon */}
            <circle cx="60" cy="40" r={35} fill={source.color} opacity={0.8}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="60" cy="40" r={20} fill="#fff" opacity={0.4} />

            <text x="60" y={95} fill={colors.textPrimary} fontSize={11} fontWeight="bold" textAnchor="middle">{source.name}</text>
            <text x="60" y={110} fill={colors.textSecondary} fontSize={10} textAnchor="middle">{source.description}</text>
          </g>

          {/* Spectral power distribution graph */}
          <g transform="translate(200, 60)">
            <text x="130" y="0" fill={colors.textSecondary} fontSize={11} textAnchor="middle">Spectral Power Distribution</text>

            {/* Graph background */}
            <rect x="0" y="10" width="260" height="100" fill="#111827" rx={4} />

            {/* Wavelength axis */}
            <line x1="0" y1="110" x2="260" y2="110" stroke={colors.textMuted} strokeWidth={1} />
            <text x="0" y="125" fill={colors.textMuted} fontSize={8}>300nm</text>
            <text x="65" y="125" fill={colors.textMuted} fontSize={8}>500nm</text>
            <text x="130" y="125" fill={colors.textMuted} fontSize={8}>700nm</text>
            <text x="195" y="125" fill={colors.textMuted} fontSize={8}>900nm</text>
            <text x="250" y="125" fill={colors.textMuted} fontSize={8}>1100nm</text>

            {/* Spectrum bars */}
            {/* UV */}
            <rect x="10" y={110 - source.uvContent * 80} width="40" height={source.uvContent * 80} fill={colors.uv} opacity={hasUVFilter ? 0.2 : 0.8} />
            {/* Visible */}
            <rect x="60" y={110 - source.visibleContent * 80} width="80" height={source.visibleContent * 80} fill="url(#spectrumGrad)" opacity={0.8} />
            {/* IR */}
            <rect x="150" y={110 - source.irContent * 80} width="100" height={source.irContent * 80} fill={colors.ir} opacity={hasIRFilter ? 0.2 : 0.8} />

            {/* Bandgap threshold line */}
            <line x1="195" y1="10" x2="195" y2="110" stroke={colors.error} strokeWidth={2} strokeDasharray="5,3" />
            <text x="200" y="25" fill={colors.error} fontSize={8}>Bandgap</text>
            <text x="200" y="35" fill={colors.error} fontSize={8}>limit</text>

            {/* Filter indicators */}
            {hasUVFilter && (
              <g>
                <line x1="0" y1="10" x2="50" y2="110" stroke={colors.accent} strokeWidth={3} />
                <text x="25" y="60" fill={colors.accent} fontSize={8} transform="rotate(-70, 25, 60)">UV Filter</text>
              </g>
            )}
            {hasIRFilter && (
              <g>
                <line x1="150" y1="10" x2="260" y2="110" stroke={colors.accent} strokeWidth={3} />
                <text x="205" y="60" fill={colors.accent} fontSize={8}>IR Filter</text>
              </g>
            )}
          </g>

          {/* Solar cell */}
          <g transform="translate(80, 220)">
            <rect x="0" y="0" width="100" height="60" rx={4} fill="#1e40af" />
            <rect x="5" y="5" width="90" height="50" rx={2} fill="#3b82f6" />
            {/* Grid lines */}
            {[1, 2, 3, 4].map(i => (
              <line key={`h${i}`} x1="5" y1={5 + i * 10} x2="95" y2={5 + i * 10} stroke="#1e3a8a" strokeWidth={1} />
            ))}
            {[1, 2, 3, 4, 5].map(i => (
              <line key={`v${i}`} x1={5 + i * 15} y1="5" x2={5 + i * 15} y2="55" stroke="#1e3a8a" strokeWidth={1} />
            ))}
            <text x="50" y="80" fill={colors.textSecondary} fontSize={11} textAnchor="middle">Silicon Cell</text>
            <text x="50" y="95" fill={colors.textMuted} fontSize={9} textAnchor="middle">Bandgap: {cellBandgap} eV</text>
          </g>

          {/* Output display */}
          <g transform="translate(220, 200)">
            <rect x="0" y="0" width="240" height="130" rx={8} fill="#111827" stroke={colors.accent} strokeWidth={1} />
            <text x="120" y="20" fill={colors.accent} fontSize={12} fontWeight="bold" textAnchor="middle">PV OUTPUT COMPARISON</text>

            {/* Human brightness bar */}
            <text x="10" y="45" fill={colors.textSecondary} fontSize={10}>Human Brightness:</text>
            <rect x="120" y="35" width={output.humanBrightness} height="12" rx={2} fill={colors.led} />
            <text x="225" y="45" fill={colors.textPrimary} fontSize={10}>{output.humanBrightness}%</text>

            {/* PV Power bar */}
            <text x="10" y="70" fill={colors.textSecondary} fontSize={10}>PV Power Output:</text>
            <rect x="120" y="60" width={output.power / 30 * 100} height="12" rx={2} fill={colors.success} />
            <text x="225" y="70" fill={colors.success} fontSize={10} fontWeight="bold">{output.power.toFixed(1)}</text>

            {/* Spectral mismatch */}
            <text x="10" y="95" fill={colors.textSecondary} fontSize={10}>Spectral Match:</text>
            <rect x="120" y="85" width={output.spectralMismatch} height="12" rx={2} fill={colors.warning} />
            <text x="225" y="95" fill={colors.warning} fontSize={10}>{output.spectralMismatch.toFixed(0)}%</text>

            {/* Current and Voltage */}
            <text x="10" y="118" fill={colors.textMuted} fontSize={9}>Current: {output.current.toFixed(1)} mA/cm²</text>
            <text x="130" y="118" fill={colors.textMuted} fontSize={9}>Voltage: {output.voltage.toFixed(2)} V</text>
          </g>

          {/* Key insight */}
          <rect x={30} y={350} width={490} height={55} rx={8} fill="rgba(245, 158, 11, 0.15)" stroke={colors.accent} strokeWidth={1} />
          <text x={275} y={372} fill={colors.accent} fontSize={11} fontWeight="bold" textAnchor="middle">
            Key Insight: Same brightness ≠ Same PV power!
          </text>
          <text x={275} y={392} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            PV cells respond to photon energy distribution, not human-perceived brightness
          </text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Source:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(lightSources).map(([key, source]) => (
            <button
              key={key}
              onClick={() => setLightSource(key as 'incandescent' | 'led' | 'sunlight')}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: lightSource === key ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: lightSource === key ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: source.color,
                cursor: 'pointer',
                fontWeight: 'bold',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {source.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={hasUVFilter}
            onChange={(e) => setHasUVFilter(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          UV Blocking Filter
        </label>

        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={hasIRFilter}
            onChange={(e) => setHasIRFilter(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          IR Blocking Filter
        </label>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          <strong>Physics:</strong> Photon energy E = hc/λ
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Silicon absorbs photons with E &gt; 1.1 eV (λ &lt; 1127 nm)
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
              Spectral Mismatch
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Does a warm lamp and cool lamp produce the same panel output?
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
                An incandescent bulb and an LED might look equally bright to your eyes,
                but a solar panel tells a different story. The spectrum of light - not
                just the brightness - determines how much electricity you get.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Compare different light sources to see how spectrum affects power output!
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
              If two light sources look equally bright, will they produce equal PV power?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Compare Light Sources</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between sources to see how spectrum affects PV output
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
              <li>Compare incandescent vs LED - which gives more PV power?</li>
              <li>Why does sunlight give the best results?</li>
              <li>Notice the mismatch between human brightness and PV power</li>
              <li>Look at where each source's spectrum falls</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'spectrum';

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
              {wasCorrect ? 'Correct!' : 'Not quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              PV output depends on the spectral power distribution, not human-perceived brightness.
              Our eyes evolved for daylight but weight green wavelengths heavily. Solar cells care
              about photon energy!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Spectral Mismatch Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Incandescent Bulbs:</strong> 87% of
                their output is infrared - heat you can feel but can't see. Most of this IR is
                beyond silicon's absorption limit, so it's wasted.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>LEDs:</strong> Nearly all output is
                in the visible range, which silicon can efficiently convert. That's why LEDs give
                more PV power despite similar perceived brightness.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sunlight:</strong> The optimal mix -
                balanced UV, visible, and usable IR. Solar cells are optimized for this spectrum.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thermalization:</strong> Even absorbed
                photons waste some energy. UV photons have far more energy than the 1.1 eV bandgap,
                and the excess becomes heat.
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
              What if we add UV/IR blocking films?
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
              We'll add optical filters that block UV or IR radiation. These are common
              in windows and some solar applications. Will blocking "useless" spectrum
              help or hurt?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens when you add UV or IR blocking filters?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Filters</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle UV and IR filters to see their effect on power output
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
              Both UV and usable IR contribute to power output! Blocking them reduces
              current even though it might seem like we're removing "waste" heat or
              damaging radiation.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'both_hurt';

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
              {wasCorrect ? 'Exactly right!' : 'Counterintuitive but true!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Blocking UV or IR reduces power because both contain usable photons!
              UV has extra energy (wasted as heat), but still generates current.
              Near-IR up to 1127nm is fully usable by silicon.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Filter Trade-offs</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>UV Filters:</strong> Block high-energy
                photons that can degrade cell materials over time. Trade-off: lose ~5% of current
                but extend cell lifetime. Used in some long-duration applications.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>IR Filters:</strong> Block heat-causing
                wavelengths. But silicon uses IR up to 1127nm! Blocking all IR loses significant
                power. Only far-IR (&gt;1200nm) is truly wasted as heat.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Smart Coatings:</strong> Advanced solar
                cells use selective coatings that enhance useful wavelengths while managing thermal
                load from truly unusable far-IR.
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
              Spectral mismatch affects many technologies
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
                {testScore >= 8 ? 'You\'ve mastered spectral mismatch!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered spectral mismatch!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Light spectrum varies by source type</li>
              <li>PV response depends on photon energy, not brightness</li>
              <li>Incandescent light is mostly unusable IR</li>
              <li>Thermalization wastes excess photon energy</li>
              <li>Multi-junction cells reduce spectral losses</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Spectral mismatch is one of the biggest efficiency losses in solar cells.
              Researchers are developing hot-carrier cells, intermediate band cells, and
              spectrum-splitting systems to capture more of the sun's energy!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SpectralMismatchRenderer;
