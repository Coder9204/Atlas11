import React, { useState, useEffect } from 'react';

interface PhotoelasticityRendererProps {
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
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  polarizer: '#3b82f6',
  stress: '#ef4444',
};

const PhotoelasticityRenderer: React.FC<PhotoelasticityRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [bendAmount, setBendAmount] = useState(30);
  const [polarizerEnabled, setPolarizerEnabled] = useState(true);
  const [isThick, setIsThick] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setBendAmount(prev => {
        const newVal = prev + 2;
        if (newVal > 60) return 10;
        return newVal;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'nothing', label: 'Nothing visible - plastic remains clear and uniform' },
    { id: 'dark', label: 'The plastic becomes darker where bent' },
    { id: 'fringes', label: 'Rainbow-colored bands appear showing stress patterns' },
    { id: 'glow', label: 'The plastic glows with a single color' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Same fringe pattern regardless of thickness' },
    { id: 'more', label: 'Thicker plastic shows more closely-spaced fringes' },
    { id: 'fewer', label: 'Thicker plastic shows fewer, wider-spaced fringes' },
    { id: 'none', label: 'Thicker plastic shows no fringes at all' },
  ];

  const transferApplications = [
    {
      title: 'Engineering Stress Analysis',
      description: 'Engineers create transparent plastic models of bridges, gears, and structures. Under load, photoelastic fringes reveal where stress concentrates.',
      question: 'Why is photoelasticity valuable for finding structural weak points?',
      answer: 'Stress concentrations that could cause failure become visually obvious as dense fringe patterns. This lets engineers see the full stress distribution at once, not just point measurements.',
    },
    {
      title: 'Optical Fiber Sensors',
      description: 'Optical fibers can detect pressure and strain. Stress changes the fiber\'s birefringence, altering light polarization.',
      question: 'How do fiber optic sensors measure pressure without electronics?',
      answer: 'Pressure creates stress in the fiber, changing its birefringence. Polarized light passing through rotates differently under stress, which can be measured at the fiber end.',
    },
    {
      title: 'Tempered Glass Safety',
      description: 'Car windows and phone screens use tempered glass with built-in stress. Polarized sunglasses can reveal stress patterns.',
      question: 'Why can you sometimes see patterns in car windows with polarized sunglasses?',
      answer: 'Tempering creates residual stress patterns in the glass. The birefringence from this stress rotates polarized light, creating visible patterns when viewed through polarized lenses.',
    },
    {
      title: 'Geology - Mineral Identification',
      description: 'Geologists use polarized microscopes to identify minerals. Different minerals have characteristic birefringence colors.',
      question: 'How do geologists identify minerals using polarized light?',
      answer: 'Each mineral has specific crystal structure creating unique birefringence. The interference colors seen between crossed polarizers serve as a fingerprint for mineral identification.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes rainbow fringes in photoelasticity?',
      options: [
        { text: 'Temperature gradients in the plastic', correct: false },
        { text: 'Stress-induced birefringence rotating polarized light differently by wavelength', correct: true },
        { text: 'Chemical reactions in the material', correct: false },
        { text: 'Diffraction from surface scratches', correct: false },
      ],
    },
    {
      question: 'Birefringence means a material has:',
      options: [
        { text: 'Two different colors', correct: false },
        { text: 'Two different refractive indices for different polarization directions', correct: true },
        { text: 'Two layers of different materials', correct: false },
        { text: 'Fluorescent properties', correct: false },
      ],
    },
    {
      question: 'Crossed polarizers means:',
      options: [
        { text: 'The polarizers are at 90 degrees to each other, blocking light', correct: true },
        { text: 'The polarizers are parallel and add together', correct: false },
        { text: 'The polarizers spin in opposite directions', correct: false },
        { text: 'The polarizers have crossed scratch patterns', correct: false },
      ],
    },
    {
      question: 'Without any stressed material between crossed polarizers:',
      options: [
        { text: 'Bright white light passes through', correct: false },
        { text: 'No light passes through (dark field)', correct: true },
        { text: 'Only red light passes through', correct: false },
        { text: 'A rainbow pattern appears', correct: false },
      ],
    },
    {
      question: 'In photoelasticity, regions of high stress show:',
      options: [
        { text: 'No color at all', correct: false },
        { text: 'Dense, closely-spaced fringe patterns', correct: true },
        { text: 'Only black coloring', correct: false },
        { text: 'Uniform single color', correct: false },
      ],
    },
    {
      question: 'Different colors in photoelastic fringes represent:',
      options: [
        { text: 'Different temperatures', correct: false },
        { text: 'Different amounts of polarization rotation (related to stress)', correct: true },
        { text: 'Different plastic compositions', correct: false },
        { text: 'Different light source colors', correct: false },
      ],
    },
    {
      question: 'A thicker stressed sample compared to a thinner one shows:',
      options: [
        { text: 'The same fringe pattern', correct: false },
        { text: 'More fringes because light travels through more stressed material', correct: true },
        { text: 'Fewer fringes because stress is distributed', correct: false },
        { text: 'No fringes because light is absorbed', correct: false },
      ],
    },
    {
      question: 'Photoelasticity is useful in engineering because:',
      options: [
        { text: 'It makes structures stronger', correct: false },
        { text: 'It reveals the full stress field visually in model structures', correct: true },
        { text: 'It only works on metal parts', correct: false },
        { text: 'It eliminates the need for calculations', correct: false },
      ],
    },
    {
      question: 'The patterns seen in tempered glass through polarized sunglasses are due to:',
      options: [
        { text: 'Surface contamination', correct: false },
        { text: 'Residual stress from the tempering process', correct: true },
        { text: 'Scratches on the glass', correct: false },
        { text: 'Reflections from the car interior', correct: false },
      ],
    },
    {
      question: 'To see photoelastic effects, you need:',
      options: [
        { text: 'Only a transparent stressed material', correct: false },
        { text: 'A birefringent material between two polarizers', correct: true },
        { text: 'A laser light source', correct: false },
        { text: 'A microscope', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const beamWidth = 200;
    const beamHeight = isThick ? 50 : 25;
    const beamY = height / 2 - 20;

    // Generate stress fringe colors based on bend amount
    const generateFringes = () => {
      if (!polarizerEnabled) return null;

      const fringes = [];
      const numFringes = isThick ? Math.floor(bendAmount / 5) : Math.floor(bendAmount / 10);
      const fringeColors = [
        '#000000', '#4a4a4a', '#1e3a5f', '#2563eb', '#0ea5e9',
        '#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444',
        '#ec4899', '#a855f7', '#6366f1',
      ];

      for (let i = 0; i < numFringes; i++) {
        const t = i / Math.max(numFringes - 1, 1);
        const colorIndex = i % fringeColors.length;
        const bendOffset = Math.sin(t * Math.PI) * bendAmount * 0.5;

        fringes.push(
          <ellipse
            key={i}
            cx={width / 2}
            cy={beamY + beamHeight / 2 + bendOffset * 0.3}
            rx={beamWidth / 2 - i * 8}
            ry={beamHeight / 2 + Math.abs(bendOffset) * 0.2}
            fill="none"
            stroke={fringeColors[colorIndex]}
            strokeWidth={3}
            opacity={0.8}
          />
        );
      }
      return fringes;
    };

    // Generate curved beam path based on bend
    const generateBeamPath = () => {
      const leftX = width / 2 - beamWidth / 2;
      const rightX = width / 2 + beamWidth / 2;
      const bendY = bendAmount * 0.8;

      return `M ${leftX} ${beamY}
              Q ${width / 2} ${beamY + bendY} ${rightX} ${beamY}
              L ${rightX} ${beamY + beamHeight}
              Q ${width / 2} ${beamY + beamHeight + bendY} ${leftX} ${beamY + beamHeight}
              Z`;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: polarizerEnabled ? '#0a0a0a' : '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Polarizer indicators */}
          <g>
            <rect x={20} y={30} width={40} height={height - 60} fill="none" stroke={colors.polarizer} strokeWidth={2} strokeDasharray="4,4" opacity={0.5} />
            <text x={40} y={20} fill={colors.polarizer} fontSize={10} textAnchor="middle">Polarizer</text>
            <line x1={30} y1={50} x2={50} y2={50} stroke={colors.polarizer} strokeWidth={2} />
            <line x1={30} y1={70} x2={50} y2={70} stroke={colors.polarizer} strokeWidth={2} />
            <line x1={30} y1={90} x2={50} y2={90} stroke={colors.polarizer} strokeWidth={2} />
          </g>

          <g>
            <rect x={width - 60} y={30} width={40} height={height - 60} fill="none" stroke={colors.polarizer} strokeWidth={2} strokeDasharray="4,4" opacity={polarizerEnabled ? 0.5 : 0.2} />
            <text x={width - 40} y={20} fill={colors.polarizer} fontSize={10} textAnchor="middle">Analyzer</text>
            <line x1={width - 50} y1={50} x2={width - 50} y2={70} stroke={colors.polarizer} strokeWidth={2} opacity={polarizerEnabled ? 1 : 0.3} />
            <line x1={width - 40} y1={50} x2={width - 40} y2={70} stroke={colors.polarizer} strokeWidth={2} opacity={polarizerEnabled ? 1 : 0.3} />
            <line x1={width - 30} y1={50} x2={width - 30} y2={70} stroke={colors.polarizer} strokeWidth={2} opacity={polarizerEnabled ? 1 : 0.3} />
          </g>

          {/* Force arrows */}
          <g>
            <line x1={width / 2 - beamWidth / 2 - 20} y1={beamY + beamHeight / 2} x2={width / 2 - beamWidth / 2} y2={beamY + beamHeight / 2} stroke={colors.stress} strokeWidth={3} />
            <polygon points={`${width / 2 - beamWidth / 2 - 20},${beamY + beamHeight / 2 - 8} ${width / 2 - beamWidth / 2 - 20},${beamY + beamHeight / 2 + 8} ${width / 2 - beamWidth / 2 - 35},${beamY + beamHeight / 2}`} fill={colors.stress} />
          </g>
          <g>
            <line x1={width / 2 + beamWidth / 2} y1={beamY + beamHeight / 2} x2={width / 2 + beamWidth / 2 + 20} y2={beamY + beamHeight / 2} stroke={colors.stress} strokeWidth={3} />
            <polygon points={`${width / 2 + beamWidth / 2 + 20},${beamY + beamHeight / 2 - 8} ${width / 2 + beamWidth / 2 + 20},${beamY + beamHeight / 2 + 8} ${width / 2 + beamWidth / 2 + 35},${beamY + beamHeight / 2}`} fill={colors.stress} />
          </g>

          {/* Downward force arrow */}
          <g>
            <line x1={width / 2} y1={beamY - 30} x2={width / 2} y2={beamY - 5} stroke={colors.warning} strokeWidth={3} />
            <polygon points={`${width / 2 - 8},${beamY - 5} ${width / 2 + 8},${beamY - 5} ${width / 2},${beamY + 10}`} fill={colors.warning} />
            <text x={width / 2} y={beamY - 40} fill={colors.warning} fontSize={12} textAnchor="middle">Force</text>
          </g>

          {/* Bent beam with stress fringes */}
          <path
            d={generateBeamPath()}
            fill={polarizerEnabled ? 'rgba(100, 116, 139, 0.3)' : 'rgba(148, 163, 184, 0.6)'}
            stroke={colors.textMuted}
            strokeWidth={1}
          />

          {/* Stress fringes overlay */}
          <g clipPath="url(#beamClip)">
            {generateFringes()}
          </g>

          <defs>
            <clipPath id="beamClip">
              <path d={generateBeamPath()} />
            </clipPath>
          </defs>

          {/* Labels */}
          <text x={width / 2} y={height - 30} fill={colors.textSecondary} fontSize={12} textAnchor="middle">
            {isThick ? 'Thick' : 'Thin'} plastic beam under stress
          </text>
          <text x={width / 2} y={height - 12} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Bend: {bendAmount}% | Polarizers: {polarizerEnabled ? 'ON' : 'OFF'}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: isAnimating ? colors.error : colors.success, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              {isAnimating ? 'Stop' : 'Animate Bend'}
            </button>
            <button
              onClick={() => { setBendAmount(30); setIsAnimating(false); setPolarizerEnabled(true); }}
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
          Bend Amount: {bendAmount}%
        </label>
        <input type="range" min="5" max="80" step="5" value={bendAmount} onChange={(e) => setBendAmount(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" checked={polarizerEnabled} onChange={(e) => setPolarizerEnabled(e.target.checked)} />
        Crossed Polarizers Active
      </label>
      <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          More bending = more stress = more fringe colors visible
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
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>Can you see forces inside a solid?</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>Revealing hidden stress with polarized light</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Bend a clear plastic ruler between two polarizing filters. Rainbow colors appear where the plastic is stressed - invisible forces become visible!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is photoelasticity - stress changes how materials interact with polarized light.
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
              A transparent plastic beam placed between two crossed polarizers (filters at 90 degrees). The beam is being bent by forces from both sides and above. Light enters through the first polarizer and exits through the second.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>When you bend the plastic between crossed polarizers, what appears?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Photoelasticity</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Bend the beam and toggle polarizers to see stress patterns</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase bend - more fringes appear</li>
              <li>Turn off polarizers - fringes disappear!</li>
              <li>Notice how fringe density shows stress concentration</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'fringes';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Rainbow-colored bands appear showing where stress is concentrated!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Photoelasticity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Stress-Induced Birefringence:</strong> When transparent plastics are stressed, they become birefringent - light polarized in different directions travels at different speeds through the material.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Polarization Rotation:</strong> This speed difference rotates the polarization of light. Different wavelengths (colors) rotate by different amounts.</p>
              <p><strong style={{ color: colors.textPrimary }}>Crossed Polarizer Colors:</strong> Between crossed polarizers, some colors pass through while others are blocked, creating rainbow fringes that map the stress field.</p>
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
            <p style={{ color: colors.textSecondary }}>What happens with thicker plastic?</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Now compare a thin piece of plastic to a thick piece, both bent by the same amount. The light must travel through more material in the thick sample.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>How does thickness affect the fringe pattern?</h3>
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Thick vs Thin</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Toggle thickness to see how fringe patterns change</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '16px' }}>
            <button onClick={() => setIsThick(!isThick)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: `2px solid ${colors.warning}`, background: isThick ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              Currently: {isThick ? 'THICK' : 'THIN'} Plastic - Click to Toggle
            </button>
          </div>
          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Thicker material means light travels through more stressed material, accumulating more polarization rotation. This creates more fringe orders!</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Thicker plastic shows more closely-spaced fringes!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Path Length Matters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Accumulated Rotation:</strong> Light traveling through thicker material accumulates more polarization rotation. The effect is proportional to thickness times stress.</p>
              <p><strong style={{ color: colors.textPrimary }}>Fringe Order:</strong> Each complete color cycle represents one "fringe order." Thicker samples show higher fringe orders, letting engineers measure stress more precisely.</p>
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
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Photoelasticity helps engineers see stress fields</p>
          </div>
          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
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
            <p style={{ color: colors.textSecondary }}>You understand how stress becomes visible through polarized light</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Stress-induced birefringence in transparent materials</li>
              <li>Polarization rotation creates interference colors</li>
              <li>Fringe patterns map stress distribution</li>
              <li>Thickness affects fringe count</li>
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

export default PhotoelasticityRenderer;
