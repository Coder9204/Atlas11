import React, { useState, useEffect, useCallback } from 'react';

interface ThinFilmInterferenceRendererProps {
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
  filmTop: '#60a5fa',
  filmBottom: '#3b82f6',
  lightRay: '#fbbf24',
};

const ThinFilmInterferenceRenderer: React.FC<ThinFilmInterferenceRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [thickness, setThickness] = useState(400);
  const [viewAngle, setViewAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation for draining effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);
      setThickness(prev => {
        const newThickness = prev - 2;
        return newThickness < 100 ? 800 : newThickness;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Calculate interference color based on thickness and angle
  const calculateInterferenceColor = (t: number, angle: number = 0): string => {
    const n = 1.33; // Refractive index of soap film
    const cosAngle = Math.cos((angle * Math.PI) / 180);
    const pathDiff = 2 * n * t * cosAngle;

    // Calculate interference for RGB wavelengths
    const wavelengthR = 650; // Red
    const wavelengthG = 550; // Green
    const wavelengthB = 450; // Blue

    const intensityR = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthR), 2);
    const intensityG = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthG), 2);
    const intensityB = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthB), 2);

    const r = Math.round(intensityR * 255);
    const g = Math.round(intensityG * 255);
    const b = Math.round(intensityB * 255);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const predictions = [
    { id: 'pigment', label: 'The colors come from pigments dissolved in the soap' },
    { id: 'rainbow', label: 'Light is splitting into a rainbow like a prism' },
    { id: 'interference', label: 'Reflections from front and back surfaces interfere' },
    { id: 'absorption', label: 'The soap absorbs certain colors from white light' },
  ];

  const twistPredictions = [
    { id: 'brighter', label: 'The colors become brighter and more vivid' },
    { id: 'darker', label: 'Some colors become darker or disappear' },
    { id: 'same', label: 'Nothing changes - polarization has no effect' },
    { id: 'rainbow', label: 'A new rainbow appears' },
  ];

  const transferApplications = [
    {
      title: 'Anti-Reflection Coatings',
      description: 'Camera lenses, glasses, and solar panels use thin coatings to reduce unwanted reflections and increase light transmission.',
      question: 'How does a thin coating eliminate reflections?',
      answer: 'The coating thickness is chosen so reflections from its top and bottom surfaces destructively interfere at visible wavelengths. The reflected waves cancel out, allowing more light through.',
    },
    {
      title: 'Oil Slicks on Water',
      description: 'Oil spilled on water creates swirling rainbow patterns that shift as the oil spreads and thins.',
      question: 'Why do oil slicks show different colors in different regions?',
      answer: 'The oil layer varies in thickness across its surface. Each thickness selectively reinforces different wavelengths through interference, creating bands of color that trace the thickness contours.',
    },
    {
      title: 'Butterfly Wings',
      description: 'Morpho butterflies display brilliant iridescent blue despite having no blue pigment in their wings.',
      question: 'How do butterflies create colors without pigments?',
      answer: 'Their wing scales contain nanoscale structures with precise layer thicknesses. Light reflecting from multiple layers interferes constructively only for blue wavelengths, creating structural color that shifts with viewing angle.',
    },
    {
      title: 'Soap Bubble Art',
      description: 'Artists create stunning images by photographing soap films as they drain, capturing the ever-changing interference patterns.',
      question: 'Why do the colors constantly change in a vertical soap film?',
      answer: 'Gravity pulls soap solution downward, making the film progressively thinner at the top. As thickness changes, the interference condition shifts, causing each spot to cycle through colors until the film becomes too thin and appears black.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes the colors in a soap film?',
      options: [
        { text: 'Pigments dissolved in the soap solution', correct: false },
        { text: 'Interference between reflections from front and back surfaces', correct: true },
        { text: 'Refraction splitting white light into colors', correct: false },
        { text: 'Fluorescence from soap molecules', correct: false },
      ],
    },
    {
      question: 'When a soap film appears black (no color), it means:',
      options: [
        { text: 'The film has absorbed all light', correct: false },
        { text: 'The film is too thick for interference', correct: false },
        { text: 'The film is extremely thin - reflections destructively interfere', correct: true },
        { text: 'The soap has evaporated completely', correct: false },
      ],
    },
    {
      question: 'As a soap film drains and becomes thinner, the colors:',
      options: [
        { text: 'Stay the same', correct: false },
        { text: 'Shift through a sequence as different wavelengths interfere constructively', correct: true },
        { text: 'Always become more blue', correct: false },
        { text: 'Fade to white', correct: false },
      ],
    },
    {
      question: 'The path difference for thin-film interference depends on:',
      options: [
        { text: 'Film thickness and refractive index only', correct: false },
        { text: 'Film thickness, refractive index, and viewing angle', correct: true },
        { text: 'Only the color of incident light', correct: false },
        { text: 'Only the viewing angle', correct: false },
      ],
    },
    {
      question: 'Anti-reflection coatings work by:',
      options: [
        { text: 'Absorbing reflected light', correct: false },
        { text: 'Making reflections destructively interfere', correct: true },
        { text: 'Bending light around the surface', correct: false },
        { text: 'Scattering light in all directions', correct: false },
      ],
    },
    {
      question: 'Why do butterfly wing colors change with viewing angle?',
      options: [
        { text: 'The pigments are angle-sensitive', correct: false },
        { text: 'The effective path difference changes with angle', correct: true },
        { text: 'Light is polarized differently at different angles', correct: false },
        { text: 'The wing surface is curved', correct: false },
      ],
    },
    {
      question: 'For constructive interference in a thin film, the path difference should equal:',
      options: [
        { text: 'Any multiple of the wavelength', correct: false },
        { text: 'An integer number of wavelengths (accounting for phase shifts)', correct: true },
        { text: 'Exactly one wavelength', correct: false },
        { text: 'Half a wavelength', correct: false },
      ],
    },
    {
      question: 'Oil on water shows colors because:',
      options: [
        { text: 'Oil contains colored chemicals', correct: false },
        { text: 'Water refracts light into colors', correct: false },
        { text: 'The thin oil layer creates interference patterns', correct: true },
        { text: 'Sunlight heats the oil to glow', correct: false },
      ],
    },
    {
      question: 'Polarizing sunglasses can affect thin-film colors because:',
      options: [
        { text: 'They filter out specific wavelengths', correct: false },
        { text: 'They can reduce glare from reflections, altering perceived brightness', correct: true },
        { text: 'Polarization changes the film thickness', correct: false },
        { text: 'They have their own thin-film coating', correct: false },
      ],
    },
    {
      question: 'A coating designed to eliminate reflection of green light would:',
      options: [
        { text: 'Appear green because green is absorbed', correct: false },
        { text: 'Appear purple/magenta because green is not reflected', correct: true },
        { text: 'Appear black', correct: false },
        { text: 'Be invisible', correct: false },
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
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 400;
    const filmLeft = 100;
    const filmRight = 300;
    const filmTop = 80;
    const filmHeight = 200;

    // Generate thickness gradient colors
    const gradientStops = [];
    for (let i = 0; i <= 10; i++) {
      const t = thickness - (i * 50);
      const color = calculateInterferenceColor(Math.max(t, 50), viewAngle);
      gradientStops.push({ offset: i * 10, color });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Film gradient based on thickness */}
            <linearGradient id="filmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              {gradientStops.map((stop, i) => (
                <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
              ))}
            </linearGradient>

            {/* Glow effect for light rays */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background label */}
          <text x={width / 2} y={25} fill={colors.textSecondary} fontSize={14} textAnchor="middle">
            Soap Film Cross-Section
          </text>

          {/* Light source */}
          <circle cx={50} cy={50} r={15} fill={colors.lightRay} filter="url(#glow)" />
          <text x={50} y={80} fill={colors.textMuted} fontSize={10} textAnchor="middle">Light</text>

          {/* Incident light ray */}
          <line
            x1={60}
            y1={55}
            x2={filmLeft + 50}
            y2={filmTop + 20}
            stroke={colors.lightRay}
            strokeWidth={3}
            filter="url(#glow)"
          />
          <polygon
            points={`${filmLeft + 50},${filmTop + 20} ${filmLeft + 45},${filmTop + 10} ${filmLeft + 55},${filmTop + 10}`}
            fill={colors.lightRay}
          />

          {/* The soap film */}
          <rect
            x={filmLeft}
            y={filmTop}
            width={filmRight - filmLeft}
            height={filmHeight}
            fill="url(#filmGradient)"
            stroke={colors.filmTop}
            strokeWidth={2}
            rx={4}
          />

          {/* Film surface labels */}
          <text x={filmRight + 10} y={filmTop + 10} fill={colors.filmTop} fontSize={10}>
            Top surface
          </text>
          <text x={filmRight + 10} y={filmTop + filmHeight - 5} fill={colors.filmBottom} fontSize={10}>
            Bottom surface
          </text>

          {/* Reflection from top surface */}
          <line
            x1={filmLeft + 50}
            y1={filmTop + 20}
            x2={filmLeft + 100}
            y2={filmTop - 30}
            stroke={colors.filmTop}
            strokeWidth={2}
            strokeDasharray="5,3"
          />
          <text x={filmLeft + 105} y={filmTop - 35} fill={colors.filmTop} fontSize={9}>
            Ray 1
          </text>

          {/* Light entering film and reflecting from bottom */}
          <line
            x1={filmLeft + 50}
            y1={filmTop + 20}
            x2={filmLeft + 70}
            y2={filmTop + filmHeight - 20}
            stroke={colors.lightRay}
            strokeWidth={2}
            opacity={0.7}
          />
          <line
            x1={filmLeft + 70}
            y1={filmTop + filmHeight - 20}
            x2={filmLeft + 120}
            y2={filmTop - 30}
            stroke={colors.filmBottom}
            strokeWidth={2}
            strokeDasharray="5,3"
          />
          <text x={filmLeft + 125} y={filmTop - 15} fill={colors.filmBottom} fontSize={9}>
            Ray 2
          </text>

          {/* Path difference indicator */}
          <line
            x1={filmLeft + 70}
            y1={filmTop + 20}
            x2={filmLeft + 70}
            y2={filmTop + filmHeight - 20}
            stroke={colors.accent}
            strokeWidth={2}
            strokeDasharray="3,3"
          />
          <text x={filmLeft + 75} y={filmTop + filmHeight / 2} fill={colors.accent} fontSize={10}>
            Path diff
          </text>

          {/* Resulting color display */}
          <rect
            x={filmLeft + 40}
            y={filmTop + filmHeight + 30}
            width={120}
            height={40}
            fill={calculateInterferenceColor(thickness, viewAngle)}
            stroke={colors.textMuted}
            strokeWidth={1}
            rx={8}
          />
          <text x={filmLeft + 100} y={filmTop + filmHeight + 90} fill={colors.textSecondary} fontSize={12} textAnchor="middle">
            Resulting Color
          </text>

          {/* Info display */}
          <text x={20} y={height - 40} fill={colors.textSecondary} fontSize={11}>
            Thickness: {thickness.toFixed(0)} nm
          </text>
          <text x={20} y={height - 20} fill={colors.textSecondary} fontSize={11}>
            View Angle: {viewAngle.toFixed(0)}°
          </text>
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
              }}
            >
              {isAnimating ? 'Stop Draining' : 'Simulate Draining'}
            </button>
            <button
              onClick={() => { setThickness(400); setViewAngle(0); setIsAnimating(false); }}
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
          Film Thickness: {thickness.toFixed(0)} nm
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="10"
          value={thickness}
          onChange={(e) => setThickness(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Viewing Angle: {viewAngle.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="60"
          step="5"
          value={viewAngle}
          onChange={(e) => setViewAngle(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Path difference = 2 x n x t x cos(angle)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          n = 1.33 (soap film), t = thickness
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
              The Colors of Nothing
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Are those colors in the soap, or created by light?
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
                Dip a wire loop in soap solution and hold it up to the light.
                Brilliant colors swirl across the surface - colors that shift
                and change as the film drains and thins.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The soap has no pigment. Where do these colors come from?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Simulate Draining" to watch the film thin and colors shift!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Light hits a thin soap film. Some reflects from the top surface,
              some enters the film and reflects from the bottom surface. These
              two reflections travel different distances before reaching your eye.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Why does a soap film show swirling colors?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Thin-Film Interference</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust thickness and angle to see how colors change
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Slowly decrease thickness - watch colors cycle</li>
              <li>At very thin (~100nm) the film appears dark</li>
              <li>Change viewing angle - colors shift!</li>
              <li>Notice: same thickness, different angle = different color</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'interference';

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
              The colors arise from interference between reflections from the top and bottom surfaces!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Thin-Film Interference</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Two Reflections:</strong> When light hits
                a thin film, part reflects from the top surface and part enters, reflects from the
                bottom, and exits. These two rays can interfere.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Path Difference:</strong> The ray reflecting
                from the bottom travels extra distance (through the film twice). This path difference
                determines which wavelengths constructively or destructively interfere.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thickness Selects Color:</strong> Different
                thicknesses create different path differences. A 400nm film might boost blue while
                canceling red. As thickness changes, so does the color!
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
              What if you view the soap film through polarizing sunglasses?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Polarizing sunglasses filter light based on its vibration direction.
              Reflections from surfaces often become partially polarized.
              What happens when you view thin-film colors through polarized lenses?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Through polarizing sunglasses, the thin-film colors will:
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Polarization Effect</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Observe how polarization affects the brightness of reflections
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Polarizing filters reduce glare from reflections. Since thin-film colors come from
              reflected light, the filter can reduce the brightness of certain reflections more
              than others, altering the apparent intensity but not eliminating the colors entirely.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'darker';

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
              Polarizing filters can reduce the brightness of reflections, making some colors appear darker!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Polarization and Thin Films</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Partial Polarization:</strong> Light reflecting
                from surfaces becomes partially polarized, especially at certain angles (Brewster's angle).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Selective Reduction:</strong> Polarizing sunglasses
                filter out horizontally polarized light (glare). This reduces the intensity of some
                reflections more than others.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Color Persistence:</strong> The interference
                colors don't disappear because they depend on path difference, not polarization.
                But the overall brightness and contrast can change significantly!
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
              Thin-film interference creates colors in nature and technology
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
                {testScore >= 8 ? 'You\'ve mastered thin-film interference!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered thin-film interference</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Interference between front and back surface reflections</li>
              <li>Path difference determines which colors are enhanced</li>
              <li>Thickness and viewing angle both affect colors</li>
              <li>Applications from anti-reflection coatings to butterfly wings</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Multi-layer coatings stack many thin films to create highly selective filters -
              like the dichroic mirrors in projectors. Interference filters can transmit only
              a narrow band of wavelengths, crucial for spectroscopy and laser optics.
              Nature uses similar structures for camouflage and communication!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ThinFilmInterferenceRenderer;
