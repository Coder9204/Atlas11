import React, { useState, useEffect, useCallback } from 'react';

interface DopingDiffusionRendererProps {
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
  nType: '#60a5fa',
  pType: '#f472b6',
  dopant: '#fbbf24',
};

const DopingDiffusionRenderer: React.FC<DopingDiffusionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [temperature, setTemperature] = useState(800); // Celsius
  const [diffusionTime, setDiffusionTime] = useState(30); // minutes
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [junctionType, setJunctionType] = useState<'shallow' | 'deep'>('shallow');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateDiffusion = useCallback(() => {
    // Diffusion coefficient D = D0 * exp(-Ea/kT)
    // For phosphorus in silicon: D0 ~ 3.85 cm²/s, Ea ~ 3.66 eV
    const kB = 8.617e-5; // eV/K
    const TKelvin = temperature + 273;
    const D0 = 3.85; // cm²/s
    const Ea = 3.66; // eV
    const D = D0 * Math.exp(-Ea / (kB * TKelvin));

    // Diffusion length: L = 2*sqrt(D*t)
    const tSeconds = diffusionTime * 60;
    const diffusionLength = 2 * Math.sqrt(D * tSeconds) * 1e4; // Convert to micrometers

    // Junction depth (where dopant concentration equals background)
    const junctionDepth = Math.min(5, diffusionLength * 0.7); // Simplified model

    // Sheet resistance (approximate)
    const sheetResistance = Math.max(10, 1000 / (junctionDepth * Math.sqrt(temperature / 900)));

    // Generate concentration profile
    const profile: {x: number; concentration: number}[] = [];
    for (let x = 0; x <= 5; x += 0.1) {
      // Gaussian or erfc profile
      const conc = Math.exp(-Math.pow(x / diffusionLength, 2) * 2);
      profile.push({ x, concentration: conc });
    }

    return {
      D: D,
      diffusionLength: diffusionLength,
      junctionDepth: junctionDepth,
      sheetResistance: sheetResistance,
      profile: profile,
    };
  }, [temperature, diffusionTime]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => {
        const newTime = prev + 1;
        if (newTime >= diffusionTime) {
          setIsAnimating(false);
          return diffusionTime;
        }
        return newTime;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, diffusionTime]);

  const predictions = [
    { id: 'paint', label: 'Doping works like paint - atoms stick to the surface only' },
    { id: 'instant', label: 'Dopant atoms instantly distribute evenly throughout the silicon' },
    { id: 'diffusion', label: 'Dopants gradually diffuse inward over time, with temperature controlling speed' },
    { id: 'electric', label: 'Dopants are pulled in by electric fields from the crystal' },
  ];

  const twistPredictions = [
    { id: 'shallow_better', label: 'Shallow junctions are always better - they collect more blue light' },
    { id: 'deep_better', label: 'Deep junctions are always better - they collect more current' },
    { id: 'tradeoff', label: 'There\'s a tradeoff: shallow for blue response, deep for lower resistance' },
    { id: 'same', label: 'Junction depth doesn\'t affect cell performance' },
  ];

  const transferApplications = [
    {
      title: 'Solar Cell Emitters',
      description: 'The n+ emitter layer is formed by phosphorus diffusion at 850-900C. Controlling depth is critical for efficiency.',
      question: 'Why is precise emitter depth control important?',
      answer: 'Too shallow: poor blue light response (carriers recombine before reaching junction). Too deep: high sheet resistance and more Auger recombination. Optimal depth balances collection efficiency with electrical performance.',
    },
    {
      title: 'Computer Chip Manufacturing',
      description: 'Modern CPUs have billions of transistors with precisely doped source/drain regions only ~10nm deep.',
      question: 'How do chipmakers create such shallow junctions?',
      answer: 'They use rapid thermal processing (RTP) with very short, high-temperature spikes (~1000C for seconds) to precisely control diffusion. Ion implantation followed by a short anneal allows nanometer-scale depth control.',
    },
    {
      title: 'Gel Diffusion Analogy',
      description: 'Food coloring dropped on gelatin spreads outward over time, faster in warmer gelatin.',
      question: 'How does the gel experiment relate to semiconductor doping?',
      answer: 'Both follow Fick\'s laws of diffusion: concentration gradient drives movement, higher temperature provides more thermal energy for atom jumps. The dye profile in gel mimics the dopant profile in silicon.',
    },
    {
      title: 'Selective Emitter Design',
      description: 'Advanced solar cells use heavy doping under contacts but light doping elsewhere for better performance.',
      question: 'Why use different doping levels in different regions?',
      answer: 'Heavy doping under metal contacts reduces contact resistance. Light doping between fingers reduces Auger recombination and improves blue response. This requires two separate diffusion steps or laser doping.',
    },
  ];

  const testQuestions = [
    {
      question: 'What does "doping" mean in semiconductor manufacturing?',
      options: [
        { text: 'Adding paint to color the wafer', correct: false },
        { text: 'Introducing impurity atoms to control electrical properties', correct: true },
        { text: 'Cleaning the silicon surface', correct: false },
        { text: 'Making the wafer thicker', correct: false },
      ],
    },
    {
      question: 'How does temperature affect diffusion rate?',
      options: [
        { text: 'Higher temperature slows diffusion', correct: false },
        { text: 'Temperature has no effect on diffusion', correct: false },
        { text: 'Higher temperature dramatically increases diffusion rate (exponential)', correct: true },
        { text: 'Only pressure affects diffusion rate', correct: false },
      ],
    },
    {
      question: 'The diffusion coefficient D follows which relationship with temperature?',
      options: [
        { text: 'D increases linearly with T', correct: false },
        { text: 'D = D0 * exp(-Ea/kT) (Arrhenius equation)', correct: true },
        { text: 'D decreases with T', correct: false },
        { text: 'D is constant regardless of T', correct: false },
      ],
    },
    {
      question: 'What determines the junction depth in a solar cell?',
      options: [
        { text: 'Only the wafer thickness', correct: false },
        { text: 'The temperature and time of the diffusion process', correct: true },
        { text: 'The color of the light used', correct: false },
        { text: 'The size of the cell', correct: false },
      ],
    },
    {
      question: 'Why can\'t you simply use room temperature for longer times to achieve the same diffusion?',
      options: [
        { text: 'Room temperature is too comfortable', correct: false },
        { text: 'The exponential temperature dependence makes room-temperature diffusion negligible', correct: true },
        { text: 'Silicon melts at room temperature', correct: false },
        { text: 'You actually can - it just takes longer', correct: false },
      ],
    },
    {
      question: 'The dopant concentration profile typically follows what shape?',
      options: [
        { text: 'Constant throughout the depth', correct: false },
        { text: 'Decreasing exponentially or error function from surface', correct: true },
        { text: 'Increasing with depth', correct: false },
        { text: 'Random variation', correct: false },
      ],
    },
    {
      question: 'What is "sheet resistance" in a doped layer?',
      options: [
        { text: 'The resistance of a square of the layer, measured in ohms/square', correct: true },
        { text: 'The resistance to folding the wafer', correct: false },
        { text: 'The optical reflectivity', correct: false },
        { text: 'The resistance to chemical etching', correct: false },
      ],
    },
    {
      question: 'For phosphorus in silicon, what happens if you diffuse at 900C instead of 800C?',
      options: [
        { text: 'Diffusion is slightly faster', correct: false },
        { text: 'Diffusion is much faster (potentially 10x or more)', correct: true },
        { text: 'Diffusion rate stays the same', correct: false },
        { text: 'Diffusion stops completely', correct: false },
      ],
    },
    {
      question: 'Why do shallow junctions improve blue light response?',
      options: [
        { text: 'Blue light is absorbed near the surface where shallow junctions collect better', correct: true },
        { text: 'Shallow junctions are bluer in color', correct: false },
        { text: 'Blue photons have more energy', correct: false },
        { text: 'Shallow junctions filter out red light', correct: false },
      ],
    },
    {
      question: 'What is a key tradeoff when choosing junction depth?',
      options: [
        { text: 'Shallow: better blue response but higher sheet resistance', correct: true },
        { text: 'There is no tradeoff - deeper is always better', correct: false },
        { text: 'Junction depth only affects appearance', correct: false },
        { text: 'Shallow junctions are cheaper to manufacture', correct: false },
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
    const output = calculateDiffusion();

    // Calculate current diffusion profile based on animation
    const currentTime = isAnimating ? animationTime : diffusionTime;
    const timeRatio = Math.sqrt(currentTime / diffusionTime);

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
            <linearGradient id="siliconGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="dopantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.dopant} />
              <stop offset="100%" stopColor={colors.nType} />
            </linearGradient>
            <linearGradient id="heatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset={`${(temperature - 700) / 5}%`} stopColor="#ef4444" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Temperature indicator */}
          <rect x="20" y="30" width="30" height="150" fill="#1f2937" rx="4" stroke="#374151" />
          <rect
            x="24"
            y={30 + 150 * (1 - (temperature - 700) / 500)}
            width="22"
            height={150 * ((temperature - 700) / 500)}
            fill="url(#heatGrad)"
            rx="2"
          />
          <text x="35" y="200" fill={colors.textSecondary} fontSize="10" textAnchor="middle">{temperature}C</text>

          {/* Silicon wafer cross-section */}
          <rect x="80" y="60" width="240" height="160" fill="url(#siliconGrad3)" rx="4" />

          {/* Dopant concentration gradient */}
          {output.profile.map((point, i) => {
            if (i === 0) return null;
            const prevPoint = output.profile[i - 1];
            const x1 = 80;
            const x2 = 320;
            const y1 = 60 + (prevPoint.x / 5) * 160;
            const y2 = 60 + (point.x / 5) * 160;
            const alpha = Math.min(1, prevPoint.concentration * timeRatio);
            return (
              <rect
                key={i}
                x={x1}
                y={y1}
                width={x2 - x1}
                height={y2 - y1}
                fill={colors.dopant}
                opacity={alpha * 0.7}
              />
            );
          })}

          {/* Junction depth marker */}
          <line
            x1="80"
            y1={60 + (output.junctionDepth / 5) * 160 * timeRatio}
            x2="320"
            y2={60 + (output.junctionDepth / 5) * 160 * timeRatio}
            stroke={colors.error}
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text
            x="330"
            y={60 + (output.junctionDepth / 5) * 160 * timeRatio + 4}
            fill={colors.error}
            fontSize="10"
          >
            Junction
          </text>

          {/* Dopant source on top */}
          <rect x="80" y="50" width="240" height="10" fill={colors.dopant} rx="2" />
          <text x="200" y="45" fill={colors.dopant} fontSize="10" textAnchor="middle">Dopant Source (POCl3 or PH3)</text>

          {/* Diffusing atoms animation */}
          {isAnimating && [...Array(15)].map((_, i) => {
            const y = 60 + Math.random() * output.junctionDepth * 32 * timeRatio;
            const x = 100 + Math.random() * 200;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={colors.dopant}
                opacity={0.8}
              />
            );
          })}

          {/* Concentration profile graph */}
          <g transform="translate(80, 250)">
            <rect x="0" y="0" width="240" height="80" fill="rgba(0,0,0,0.4)" rx="4" />
            <text x="120" y="-5" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Concentration Profile</text>

            {/* Axes */}
            <line x1="30" y1="65" x2="220" y2="65" stroke={colors.textMuted} />
            <line x1="30" y1="15" x2="30" y2="65" stroke={colors.textMuted} />
            <text x="125" y="78" fill={colors.textMuted} fontSize="8" textAnchor="middle">Depth (um)</text>
            <text x="15" y="40" fill={colors.textMuted} fontSize="8" textAnchor="middle" transform="rotate(-90, 15, 40)">[P]</text>

            {/* Profile curve */}
            <path
              d={`M 30 ${65 - 50 * output.profile[0].concentration * timeRatio} ` +
                output.profile.map((p, i) => {
                  const x = 30 + (p.x / 5) * 190;
                  const y = 65 - 50 * p.concentration * timeRatio;
                  return `L ${x} ${y}`;
                }).join(' ')}
              fill="none"
              stroke={colors.dopant}
              strokeWidth="2"
            />

            {/* Junction depth on graph */}
            <line
              x1={30 + (output.junctionDepth / 5) * 190 * timeRatio}
              y1="15"
              x2={30 + (output.junctionDepth / 5) * 190 * timeRatio}
              y2="65"
              stroke={colors.error}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          </g>

          {/* Output panel */}
          <rect x="330" y="60" width="60" height="100" fill="rgba(0,0,0,0.6)" rx="4" stroke={colors.accent} strokeWidth="1" />
          <text x="360" y="78" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Depth</text>
          <text x="360" y="95" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="bold">
            {(output.junctionDepth * timeRatio).toFixed(2)}
          </text>
          <text x="360" y="108" fill={colors.textSecondary} fontSize="8" textAnchor="middle">um</text>

          <text x="360" y="130" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Rsheet</text>
          <text x="360" y="147" fill={colors.success} fontSize="12" textAnchor="middle" fontWeight="bold">
            {output.sheetResistance.toFixed(0)}
          </text>
          <text x="360" y="158" fill={colors.textSecondary} fontSize="8" textAnchor="middle">ohm/sq</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(true); setAnimationTime(0); }}
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
              {isAnimating ? 'Diffusing...' : 'Start Diffusion'}
            </button>
            <button
              onClick={() => { setIsAnimating(false); setAnimationTime(0); setTemperature(800); setDiffusionTime(30); }}
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
            Junction Type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['shallow', 'deep'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setJunctionType(type);
                  if (type === 'shallow') {
                    setTemperature(850);
                    setDiffusionTime(15);
                  } else {
                    setTemperature(950);
                    setDiffusionTime(60);
                  }
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: junctionType === type ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: junctionType === type ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '13px',
                  textTransform: 'capitalize',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {type} Junction
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Temperature: {temperature}C
        </label>
        <input
          type="range"
          min="700"
          max="1100"
          step="10"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Diffusion Time: {diffusionTime} minutes
        </label>
        <input
          type="range"
          min="5"
          max="120"
          step="5"
          value={diffusionTime}
          onChange={(e) => setDiffusionTime(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Diffusion Depth ~ sqrt(D * t) where D ~ exp(-Ea/kT)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Temperature has exponential effect; time has square-root effect
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
              Doping & Diffusion
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Does doping mean "painting electrons on"?
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
                To create a p-n junction in a solar cell, we need to add phosphorus atoms
                into the silicon. But phosphorus gas doesn't simply "stick" to the surface -
                it actually diffuses into the silicon like dye spreading in water!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Temperature is the key that controls how deep and how fast!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Think of it like food coloring in warm vs cold gelatin!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Process:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A silicon wafer is placed in a furnace with phosphorus-containing gas (POCl3).
              At high temperature, phosphorus atoms enter the silicon. How do they get distributed?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How do dopant atoms enter the silicon?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Diffusion Furnace Simulator</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Control temperature and time to create your junction
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
              <li>Increase temperature and watch diffusion accelerate dramatically</li>
              <li>Notice: doubling time only increases depth by sqrt(2) ~ 1.4x</li>
              <li>But increasing temperature by 100C can double or triple depth!</li>
              <li>Watch the concentration profile flatten as depth increases</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'diffusion';

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
              Dopant atoms diffuse into silicon gradually - temperature controls the rate
              exponentially, while time affects depth as a square root!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Diffusion</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal Energy:</strong> At high
                temperatures, silicon atoms vibrate more intensely, creating "jumps" between
                lattice sites. Dopant atoms hop from site to site through this thermal motion.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Arrhenius Equation:</strong> The
                diffusion coefficient follows D = D0 * exp(-Ea/kT). The exponential means small
                temperature changes have huge effects on diffusion rate.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Diffusion Length:</strong> Atoms
                spread as sqrt(D*t), meaning time has diminishing returns. To double depth, you
                need 4x the time - or just increase temperature slightly.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Concentration Profile:</strong> The
                profile follows an error function or Gaussian shape - highest at surface,
                decreasing exponentially with depth.
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
              Shallow junction vs. deep junction - which is better for solar cells?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Dilemma:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Engineers can choose to make shallow junctions (0.3 um) or deep junctions (2+ um).
              Shallow junctions have high sheet resistance but better blue response. Deep junctions
              have low resistance but poorer blue response. Which is better?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the optimal junction depth strategy?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Junction Depth Comparison</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare shallow vs deep junction characteristics
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Tradeoff:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong>Shallow (0.3-0.5 um):</strong> Better blue response (blue light absorbed at surface),
              but higher sheet resistance increases series resistance losses.<br/><br/>
              <strong>Deep (1-2 um):</strong> Lower sheet resistance, but carriers generated by blue light
              recombine before reaching the junction. Also more Auger recombination in heavily doped region.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tradeoff';

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
              There's a real engineering tradeoff! Modern cells use "selective emitters" with
              different depths in different regions to get the best of both worlds.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Solution: Selective Emitters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Under Metal Contacts:</strong> Deep,
                heavily doped regions (~120 ohm/sq) for low contact resistance.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Between Fingers:</strong> Shallow,
                lightly doped regions (~300 ohm/sq) for good blue response and less Auger recombination.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Implementation:</strong> Can be achieved
                through double diffusion, laser doping, or ion implantation with patterned masking.
                Adds 0.3-0.5% absolute efficiency improvement.
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
              Diffusion is fundamental to all semiconductor devices
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
                {testScore >= 8 ? 'You\'ve mastered doping and diffusion!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered doping and diffusion!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Diffusion as thermal atomic motion</li>
              <li>Arrhenius temperature dependence (exponential)</li>
              <li>Square-root time dependence of diffusion depth</li>
              <li>Concentration profiles and junction formation</li>
              <li>Shallow vs deep junction tradeoffs</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern solar cell manufacturing uses a combination of tube furnace diffusion,
              ion implantation, and laser doping to create precisely controlled junction profiles.
              Selective emitter designs with 2-3 different doping levels are standard in
              high-efficiency cells, achieving the optimal balance of collection efficiency
              and electrical resistance!
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

export default DopingDiffusionRenderer;
