import React, { useState, useEffect } from 'react';

interface TapeBirefringenceRendererProps {
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
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  tape: '#94a3b8',
};

const TapeBirefringenceRenderer: React.FC<TapeBirefringenceRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [tapeLayers, setTapeLayers] = useState(3);
  const [polarizerAngle, setPolarizerAngle] = useState(45);
  const [isHeated, setIsHeated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPolarizerAngle(prev => (prev + 2) % 180);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

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
    { id: 'clear', label: 'The tape remains completely clear - no color visible' },
    { id: 'white', label: 'The tape appears white or gray' },
    { id: 'colors', label: 'Vibrant colors appear from the clear tape' },
    { id: 'dark', label: 'The tape becomes completely dark' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Colors stay exactly the same' },
    { id: 'shift', label: 'Colors shift to different hues' },
    { id: 'brighter', label: 'Colors become brighter' },
    { id: 'disappear', label: 'Colors disappear entirely' },
  ];

  const transferApplications = [
    {
      title: 'LCD Displays',
      description: 'LCD screens use liquid crystal layers that rotate polarization. Voltage changes the rotation, controlling which colors pass through.',
      question: 'How do LCD pixels create different colors?',
      answer: 'Liquid crystal molecules act like controllable birefringent layers. Voltage changes their orientation, altering polarization rotation. Combined with color filters, this controls which colors pass through.',
    },
    {
      title: '3D Glasses (Polarized)',
      description: 'Polarized 3D movie glasses use different polarization for each eye. The screen shows two overlapping images with different polarizations.',
      question: 'Why do polarized 3D glasses work?',
      answer: 'Each lens blocks one polarization while passing the other. The projector shows left-eye and right-eye images with perpendicular polarizations, so each eye sees only its intended image.',
    },
    {
      title: 'Polarized Light Microscopy',
      description: 'Biologists use polarized microscopes to study crystalline structures, starch grains, and fibers that have natural birefringence.',
      question: 'How does polarized microscopy reveal structures invisible to normal light?',
      answer: 'Birefringent structures rotate polarization while the background does not. Between crossed polarizers, only the birefringent structures appear bright against a dark background.',
    },
    {
      title: 'Security Features',
      description: 'Some security labels and documents include birefringent patterns that can only be seen through polarized light.',
      question: 'Why are birefringent security features hard to counterfeit?',
      answer: 'Creating specific birefringent patterns requires special materials and manufacturing. The patterns are invisible without polarizers, making them hard to detect and even harder to replicate.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does clear tape show colors between polarizers?',
      options: [
        { text: 'The tape contains colored dyes', correct: false },
        { text: 'Stretched polymer chains create birefringence that rotates polarization', correct: true },
        { text: 'The tape reflects colored light from the room', correct: false },
        { text: 'Chemical reactions occur in the tape', correct: false },
      ],
    },
    {
      question: 'Adding more layers of tape changes the color because:',
      options: [
        { text: 'More layers absorb more light', correct: false },
        { text: 'Total thickness determines total polarization rotation', correct: true },
        { text: 'The tape layers chemically react', correct: false },
        { text: 'Light diffracts between layers', correct: false },
      ],
    },
    {
      question: 'Rotating the analyzer polarizer causes colors to:',
      options: [
        { text: 'Stay constant', correct: false },
        { text: 'Cycle through complementary colors', correct: true },
        { text: 'Become brighter only', correct: false },
        { text: 'Disappear completely', correct: false },
      ],
    },
    {
      question: 'The birefringence in tape comes from:',
      options: [
        { text: 'The adhesive layer', correct: false },
        { text: 'Aligned polymer molecules from manufacturing stretch', correct: true },
        { text: 'Air bubbles in the tape', correct: false },
        { text: 'Reflections from the tape surface', correct: false },
      ],
    },
    {
      question: 'Heating tape causes color shifts because:',
      options: [
        { text: 'Heat makes the tape melt', correct: false },
        { text: 'Thermal expansion relaxes internal stress, reducing birefringence', correct: true },
        { text: 'Hot colors mix with tape colors', correct: false },
        { text: 'Heat creates new chemical bonds', correct: false },
      ],
    },
    {
      question: 'Different wavelengths of light through birefringent tape:',
      options: [
        { text: 'All rotate by the same amount', correct: false },
        { text: 'Rotate by different amounts, causing color separation', correct: true },
        { text: 'Are all absorbed equally', correct: false },
        { text: 'Travel at the same speed', correct: false },
      ],
    },
    {
      question: 'LCD screens use a similar principle because:',
      options: [
        { text: 'They contain actual tape layers', correct: false },
        { text: 'Liquid crystals are birefringent and can be electrically controlled', correct: true },
        { text: 'LCDs emit polarized light naturally', correct: false },
        { text: 'LCD pixels contain colored tape', correct: false },
      ],
    },
    {
      question: 'Looking at a laptop screen through polarized sunglasses sometimes shows:',
      options: [
        { text: 'Nothing unusual', correct: false },
        { text: 'Color shifts or darkness depending on angle', correct: true },
        { text: 'Magnification of the image', correct: false },
        { text: 'Sharper image quality', correct: false },
      ],
    },
    {
      question: 'Why do different tape brands show different colors?',
      options: [
        { text: 'They use different colored adhesives', correct: false },
        { text: 'Manufacturing processes create different amounts of molecular alignment', correct: true },
        { text: 'They reflect light differently', correct: false },
        { text: 'They are made at different temperatures', correct: false },
      ],
    },
    {
      question: 'To see tape birefringence colors, you need:',
      options: [
        { text: 'Only the tape', correct: false },
        { text: 'The tape between two polarizers', correct: true },
        { text: 'A laser light source', correct: false },
        { text: 'A magnifying glass', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Generate color based on tape layers and polarizer angle
  const getTapeColor = (layers: number, angle: number, heated: boolean) => {
    const heatFactor = heated ? 0.5 : 1;
    const baseRotation = layers * 30 * heatFactor;
    const effectiveAngle = (baseRotation + angle * 2) % 360;

    // Convert to HSL-like color
    const hue = effectiveAngle;
    const saturation = Math.min(90, 50 + layers * 10);
    const lightness = 50 + Math.sin(angle * Math.PI / 90) * 10;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const tapeWidth = 200;
    const tapeHeight = 30;
    const startY = 100;

    const tapeColors = [];
    for (let i = 0; i < tapeLayers; i++) {
      tapeColors.push(getTapeColor(i + 1, polarizerAngle, isHeated));
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#000000', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Top polarizer */}
          <g>
            <rect x={width / 2 - 100} y={20} width={200} height={40} fill="rgba(59, 130, 246, 0.3)" stroke={colors.accent} strokeWidth={2} />
            <text x={width / 2} y={45} fill={colors.accent} fontSize={12} textAnchor="middle">Polarizer</text>
            {/* Polarization lines */}
            {[-60, -30, 0, 30, 60].map((offset, i) => (
              <line key={i} x1={width / 2 + offset - 20} y1={30} x2={width / 2 + offset + 20} y2={30} stroke={colors.accent} strokeWidth={2} />
            ))}
          </g>

          {/* Light beam indication */}
          <line x1={width / 2} y1={60} x2={width / 2} y2={startY - 10} stroke="#fbbf24" strokeWidth={4} strokeDasharray="8,4" />
          <polygon points={`${width / 2 - 8},${startY - 10} ${width / 2 + 8},${startY - 10} ${width / 2},${startY + 5}`} fill="#fbbf24" />

          {/* Tape layers */}
          {Array.from({ length: tapeLayers }).map((_, i) => {
            const y = startY + i * (tapeHeight + 5);
            return (
              <g key={i}>
                <rect
                  x={width / 2 - tapeWidth / 2}
                  y={y}
                  width={tapeWidth}
                  height={tapeHeight}
                  fill={tapeColors[i]}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                  rx={4}
                />
                <text x={width / 2 - tapeWidth / 2 - 10} y={y + tapeHeight / 2 + 4} fill={colors.textMuted} fontSize={11} textAnchor="end">
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Combined color result */}
          <g>
            <rect
              x={width / 2 - 60}
              y={startY + tapeLayers * (tapeHeight + 5) + 20}
              width={120}
              height={40}
              fill={getTapeColor(tapeLayers, polarizerAngle, isHeated)}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
              rx={8}
            />
            <text x={width / 2} y={startY + tapeLayers * (tapeHeight + 5) + 75} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              Combined result
            </text>
          </g>

          {/* Bottom polarizer (analyzer) */}
          <g transform={`translate(${width / 2}, ${height - 60})`}>
            <rect x={-100} y={0} width={200} height={40} fill="rgba(59, 130, 246, 0.3)" stroke={colors.accent} strokeWidth={2} />
            <text x={0} y={25} fill={colors.accent} fontSize={12} textAnchor="middle">Analyzer ({polarizerAngle}deg)</text>
            {/* Rotated polarization lines */}
            {[-60, -30, 0, 30, 60].map((offset, i) => {
              const rad = (polarizerAngle * Math.PI) / 180;
              const len = 20;
              return (
                <line
                  key={i}
                  x1={offset - len * Math.cos(rad)}
                  y1={10 - len * Math.sin(rad)}
                  x2={offset + len * Math.cos(rad)}
                  y2={10 + len * Math.sin(rad)}
                  stroke={colors.accent}
                  strokeWidth={2}
                />
              );
            })}
          </g>

          {/* Heat indicator */}
          {isHeated && (
            <g>
              <text x={width - 20} y={30} fill={colors.warning} fontSize={24}>Heat</text>
              <text x={width - 60} y={55} fill={colors.warning} fontSize={12}>Applied</text>
            </g>
          )}

          {/* Labels */}
          <text x={20} y={height - 10} fill={colors.textMuted} fontSize={11}>
            Layers: {tapeLayers} | Angle: {polarizerAngle}deg {isHeated ? '| Heated' : ''}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: isAnimating ? colors.error : colors.success, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              {isAnimating ? 'Stop' : 'Rotate Analyzer'}
            </button>
            <button
              onClick={() => { setTapeLayers(3); setPolarizerAngle(45); setIsHeated(false); setIsAnimating(false); }}
              style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
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
          Number of Tape Layers: {tapeLayers}
        </label>
        <input type="range" min="1" max="8" step="1" value={tapeLayers} onChange={(e) => setTapeLayers(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Analyzer Angle: {polarizerAngle} degrees
        </label>
        <input type="range" min="0" max="180" step="5" value={polarizerAngle} onChange={(e) => setPolarizerAngle(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          More layers = more rotation = different colors. Rotating analyzer cycles through complementary colors.
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
      <button onClick={onPhaseComplete} disabled={disabled && !canProceed} style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)', color: canProceed ? 'white' : colors.textMuted, fontWeight: 'bold', cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: '16px' }}>{buttonText}</button>
    </div>
  );

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>Can clear tape create color without pigment?</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>Hidden colors in ordinary sticky tape</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Place strips of clear packing tape on glass, then view through polarized sunglasses. Brilliant colors appear from completely transparent tape!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is tape birefringence - stretched polymers interact with polarized light.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Clear cellophane tape layers placed between two polarizing filters. Polarized light enters from above, passes through the tape, and exits through an analyzer polarizer below. The tape appears completely clear in normal light.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>When you view clear tape between polarizers, what do you see?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Tape Birefringence</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Stack layers and rotate the analyzer to create different colors</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Add layers - colors change with each layer</li>
              <li>Rotate analyzer - watch colors shift through the spectrum</li>
              <li>Notice how 1 layer gives different color than 3 layers</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'colors';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Vibrant colors appear from the completely clear tape!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Tape Birefringence</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Stretched Polymers:</strong> During manufacturing, tape is stretched, aligning polymer chains. This creates birefringence - light polarized along vs across the chains travels at different speeds.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Wavelength-Dependent Rotation:</strong> Different colors (wavelengths) experience different amounts of polarization rotation. Some colors rotate to pass the analyzer, others to be blocked.</p>
              <p><strong style={{ color: colors.textPrimary }}>Subtractive Color:</strong> The colors you see are what remains after some wavelengths are blocked. More layers rotate more, changing which colors pass through.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>What happens when you heat the tape?</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Gently heat the tape with a hair dryer. The polymer chains that were stretched during manufacturing start to relax as the plastic warms up.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>When the tape is heated, the colors will:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)', background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Heat Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Toggle heat to see how colors shift</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '16px' }}>
            <button onClick={() => setIsHeated(!isHeated)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: `2px solid ${colors.warning}`, background: isHeated ? 'rgba(245, 158, 11, 0.3)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              {isHeated ? 'HEATED - Click to Cool' : 'COOL - Click to Heat'}
            </button>
          </div>
          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>When heated, the colors shift! Relaxing polymer chains reduce birefringence, changing which wavelengths are rotated and which pass through.</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'shift';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Colors shift to different hues when the tape is heated!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Stress Relaxation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Thermal Relaxation:</strong> Heat gives polymer chains energy to move. The stretched, aligned molecules gradually return toward their natural random arrangement.</p>
              <p><strong style={{ color: colors.textPrimary }}>Reduced Birefringence:</strong> As alignment decreases, so does birefringence. Less polarization rotation means different colors pass through - the same effect as having fewer layers of tape!</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Birefringence is everywhere in technology</p>
          </div>
          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}>Reveal Answer</button>
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

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error }}>{testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}</h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>{opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}</div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }
    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2><span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / 10</span></div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>{testQuestions.map((_, i) => (<div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />))}</div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}><p style={{ color: colors.textPrimary, fontSize: '16px' }}>{currentQ.question}</p></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < 9 ? <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button> : <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit</button>}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Achievement</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary }}>You understand how stretched polymers create colors from light</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Polymer chain alignment creates birefringence</li>
              <li>Different wavelengths rotate differently</li>
              <li>Thickness determines which colors pass</li>
              <li>Heat relaxes stress and shifts colors</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TapeBirefringenceRenderer;
