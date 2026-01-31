import React, { useState, useEffect, useCallback } from 'react';

interface MoirePatternsRendererProps {
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
  grid1: '#3b82f6',
  grid2: '#ef4444',
  moire: '#10b981',
};

const MoirePatternsRenderer: React.FC<MoirePatternsRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [angle, setAngle] = useState(5);
  const [spacing1, setSpacing1] = useState(10);
  const [spacing2, setSpacing2] = useState(10);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAngle(prev => (prev + 0.2) % 90);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'nothing', label: 'Nothing special - just two overlapping grids' },
    { id: 'blur', label: 'The pattern becomes blurry and hard to see' },
    { id: 'moire', label: 'Large-scale bands or waves appear that drift as you rotate' },
    { id: 'colors', label: 'Rainbow colors emerge from the interference' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The moiré pattern stays exactly the same' },
    { id: 'speed', label: 'The pattern bands move faster or in a different direction' },
    { id: 'disappear', label: 'The moiré pattern disappears completely' },
    { id: 'color', label: 'The pattern changes color' },
  ];

  const transferApplications = [
    {
      title: 'Anti-Counterfeiting Security',
      description: 'Currency and documents use moiré patterns as security features. When photocopied, hidden patterns become visible or distorted.',
      question: 'Why do moiré patterns help detect counterfeit money?',
      answer: 'Copiers and scanners use fixed sampling grids. When these interact with the document\'s fine patterns, moiré fringes appear that aren\'t on the original, revealing the copy.',
    },
    {
      title: 'Screen Door Effect in VR',
      description: 'Early VR headsets showed visible pixel grids. When your eyes\' accommodation changed, moiré patterns could appear.',
      question: 'How do modern VR displays reduce the screen door effect?',
      answer: 'Higher pixel density reduces the grid spacing until it\'s below visual resolution. Some displays also use pentile layouts or diffusers to break up regular patterns.',
    },
    {
      title: 'Strain Measurement',
      description: 'Engineers overlay reference grids on structures. When the structure deforms under load, moiré fringes reveal the strain pattern.',
      question: 'How do moiré fringes measure tiny deformations?',
      answer: 'Small displacement changes the relative alignment of overlaid grids. This creates large-scale fringe shifts that are easy to measure, amplifying tiny strains into visible patterns.',
    },
    {
      title: 'TV/Monitor Filming',
      description: 'When filming screens, moiré patterns often appear as wavy rainbow bands rolling across the image.',
      question: 'Why do moiré patterns appear when filming screens?',
      answer: 'The camera sensor\'s pixel grid interacts with the screen\'s pixel grid. Different sampling rates create beat frequencies that appear as moving bands.',
    },
  ];

  const testQuestions = [
    {
      question: 'What creates moiré patterns?',
      options: [
        { text: 'Wave interference like light diffraction', correct: false },
        { text: 'Spatial beating between two similar periodic patterns', correct: true },
        { text: 'Chemical reactions between overlapping materials', correct: false },
        { text: 'Magnetic field interactions', correct: false },
      ],
    },
    {
      question: 'When two identical grids are overlaid at a small angle, the moiré bands are:',
      options: [
        { text: 'Parallel to the grids', correct: false },
        { text: 'Perpendicular to the grids', correct: false },
        { text: 'At an angle bisecting the two grid orientations', correct: true },
        { text: 'Circular', correct: false },
      ],
    },
    {
      question: 'As the angle between two grids increases (up to a point), the moiré pattern:',
      options: [
        { text: 'Gets larger and more spaced out', correct: false },
        { text: 'Gets smaller and more closely spaced', correct: true },
        { text: 'Stays the same size', correct: false },
        { text: 'Changes color', correct: false },
      ],
    },
    {
      question: 'Moiré patterns are an example of:',
      options: [
        { text: 'Optical illusion with no physical basis', correct: false },
        { text: 'Spatial aliasing or beat phenomenon', correct: true },
        { text: 'Quantum interference', correct: false },
        { text: 'Thermal effects', correct: false },
      ],
    },
    {
      question: 'If one grid has slightly different spacing than the other, the moiré pattern:',
      options: [
        { text: 'Disappears completely', correct: false },
        { text: 'Shows bands even at zero rotation angle', correct: true },
        { text: 'Becomes three-dimensional', correct: false },
        { text: 'Only appears under UV light', correct: false },
      ],
    },
    {
      question: 'Moving one grid relative to the other causes the moiré pattern to:',
      options: [
        { text: 'Stay stationary', correct: false },
        { text: 'Move in an amplified way (faster than the grid motion)', correct: true },
        { text: 'Move slower than the grid motion', correct: false },
        { text: 'Fade away', correct: false },
      ],
    },
    {
      question: 'The wavelength of moiré fringes depends on:',
      options: [
        { text: 'The color of light used', correct: false },
        { text: 'The temperature of the room', correct: false },
        { text: 'The angle and spacing differences between grids', correct: true },
        { text: 'The thickness of the grids', correct: false },
      ],
    },
    {
      question: 'Why are moiré patterns useful for measuring small displacements?',
      options: [
        { text: 'They amplify small changes into large visible effects', correct: true },
        { text: 'They are very colorful and easy to photograph', correct: false },
        { text: 'They require no equipment', correct: false },
        { text: 'They work at any scale', correct: false },
      ],
    },
    {
      question: 'Scanning a document with fine line patterns often produces moiré because:',
      options: [
        { text: 'The scanner light is too bright', correct: false },
        { text: 'Scanner pixels interact with document patterns', correct: true },
        { text: 'The paper is too thin', correct: false },
        { text: 'The document is old', correct: false },
      ],
    },
    {
      question: 'To minimize moiré when photographing fabric patterns, you should:',
      options: [
        { text: 'Use a higher resolution camera only', correct: false },
        { text: 'Rotate the camera or subject to avoid alignment', correct: true },
        { text: 'Use black and white mode', correct: false },
        { text: 'Move closer to the subject', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2;
    const gridSize = 150;

    // Generate grid lines
    const generateGridLines = (spacing: number, rotation: number, color: string, ox: number, oy: number) => {
      const lines = [];
      const numLines = Math.ceil(gridSize * 2 / spacing) + 2;
      const rad = (rotation * Math.PI) / 180;

      for (let i = -numLines; i <= numLines; i++) {
        const offset = i * spacing + ox;
        // Vertical lines rotated
        const x1 = centerX + offset * Math.cos(rad) - gridSize * Math.sin(rad);
        const y1 = centerY + offset * Math.sin(rad) + gridSize * Math.cos(rad);
        const x2 = centerX + offset * Math.cos(rad) + gridSize * Math.sin(rad);
        const y2 = centerY + offset * Math.sin(rad) - gridSize * Math.cos(rad);

        lines.push(
          <line
            key={`v${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={1}
            opacity={0.7}
          />
        );
      }
      return lines;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#f8fafc', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Clip path for circular view */}
          <defs>
            <clipPath id="gridClip">
              <circle cx={centerX} cy={centerY} r={gridSize} />
            </clipPath>
          </defs>

          {/* Grid container */}
          <g clipPath="url(#gridClip)">
            {/* First grid (blue) - no rotation */}
            {generateGridLines(spacing1, 0, colors.grid1, 0, 0)}

            {/* Second grid (red) - rotated */}
            {generateGridLines(spacing2, angle, colors.grid2, offsetX, offsetY)}
          </g>

          {/* Border circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={gridSize}
            fill="none"
            stroke={colors.accent}
            strokeWidth={3}
          />

          {/* Labels */}
          <text x={20} y={25} fill={colors.bgPrimary} fontSize={12}>
            Angle: {angle.toFixed(1)}°
          </text>
          <text x={20} y={42} fill={colors.bgPrimary} fontSize={12}>
            Grid 1: {spacing1}px | Grid 2: {spacing2}px
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
              {isAnimating ? '⏸ Stop' : '▶ Animate'}
            </button>
            <button
              onClick={() => { setAngle(5); setSpacing1(10); setSpacing2(10); setOffsetX(0); setOffsetY(0); }}
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
              🔄 Reset
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
          Rotation Angle: {angle.toFixed(1)}°
        </label>
        <input
          type="range"
          min="0"
          max="45"
          step="0.5"
          value={angle}
          onChange={(e) => setAngle(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Grid 1 Spacing: {spacing1}px
        </label>
        <input
          type="range"
          min="6"
          max="20"
          step="1"
          value={spacing1}
          onChange={(e) => setSpacing1(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Grid 2 Spacing: {spacing2}px
        </label>
        <input
          type="range"
          min="6"
          max="20"
          step="1"
          value={spacing2}
          onChange={(e) => setSpacing2(parseInt(e.target.value))}
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
          Moiré period ≈ {(spacing1 / (2 * Math.sin(angle * Math.PI / 360))).toFixed(1)}px
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Smaller angle or spacing difference → larger moiré bands
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
              🔲 The Ghost Patterns
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How can two simple grids create giant moving patterns?
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
                Overlay two window screens, or look through two layers of sheer fabric.
                Rotate one slightly and mysterious waves appear - waves that don't
                exist in either pattern alone!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                These are moiré patterns - interference without waves.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Click "Animate" to slowly rotate one grid and watch the moiré dance!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →')}
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Two identical line grids overlaid on each other. The blue grid is fixed.
              The red grid can be rotated. Where lines overlap or nearly align, the
              combined density creates patterns.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When you slowly rotate one grid relative to the other, what happens?
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Moiré Patterns</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust angle and spacing to see how moiré fringes change
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Small angle (1-5°) → large, slow-moving bands</li>
              <li>Larger angle (15-30°) → smaller, faster bands</li>
              <li>Change one grid's spacing → bands even at 0°!</li>
              <li>Animate to see the pattern drift</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'moire';

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
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Large-scale bands appear and drift - the moiré effect!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Moiré</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Spatial Beating:</strong> Just as two
                similar frequencies create audible "beats," two similar spatial frequencies create
                visible moiré bands. The pattern is the "beat frequency" in space.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Amplification:</strong> Small differences
                in spacing or angle create large-scale patterns. Moving one grid slightly causes
                the moiré to shift dramatically - amplifying tiny motions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>No Waves Required:</strong> Unlike
                diffraction, moiré patterns are purely geometric - they arise from the overlap
                of two periodic structures.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if one grid is slightly stretched (different spacing)?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine one grid is printed on stretched plastic, so its line spacing is
              slightly different from the other grid. Now the grids have different periods.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 With different grid spacings, what happens to the moiré?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Spacing Differences</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change the spacing of Grid 2 and observe the effects
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>💡 Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Even at zero angle, spacing differences create moiré bands! As you rotate,
              the bands move faster or change direction depending on which effect dominates.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'speed';

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
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Spacing differences change the pattern's speed and direction of movement!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Two Types of Moiré</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Rotational Moiré:</strong> From angle
                differences. Bands are perpendicular to the rotation bisector.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Scaling Moiré:</strong> From spacing
                differences. Creates bands even at zero angle.
              </p>
              <p>
                When both are present, they combine to determine the final pattern's
                orientation and sensitivity to motion. This is why stretching or
                compressing one grid dramatically changes the pattern behavior!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →')}
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
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Moiré patterns appear in technology, security, and measurement
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✓</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>💭 {app.question}</p>
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
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
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered moiré patterns!' : 'Review the material and try again.'}
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
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
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
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>← Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next →</button>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered moiré patterns and spatial beating</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Spatial beating between periodic patterns</li>
              <li>Rotational vs scaling moiré</li>
              <li>Amplification of small differences</li>
              <li>Applications in security and measurement</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Moiré interferometry is used to measure nanometer-scale displacements in materials
              science. In displays, careful anti-aliasing and screen design prevents unwanted moiré.
              The mathematics connects to Fourier analysis and sampling theory!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default MoirePatternsRenderer;
