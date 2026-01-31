import React, { useState, useEffect, useCallback } from 'react';

interface PolarizationRendererProps {
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
  polarizer1: '#3b82f6',
  polarizer2: '#ef4444',
  polarizer3: '#10b981',
  lightWave: '#fbbf24',
};

const PolarizationRenderer: React.FC<PolarizationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [angle, setAngle] = useState(0);
  const [showThirdPolarizer, setShowThirdPolarizer] = useState(false);
  const [thirdPolarizerAngle, setThirdPolarizerAngle] = useState(45);
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

  // Calculate intensity using Malus's Law: I = I0 * cos^2(theta)
  const calculateIntensity = useCallback(() => {
    const rad = (angle * Math.PI) / 180;
    if (showThirdPolarizer) {
      // With third polarizer: I = I0 * cos^2(theta1) * cos^2(theta2)
      const rad1 = (thirdPolarizerAngle * Math.PI) / 180;
      const rad2 = ((angle - thirdPolarizerAngle) * Math.PI) / 180;
      return Math.cos(rad1) ** 2 * Math.cos(rad2) ** 2;
    }
    return Math.cos(rad) ** 2;
  }, [angle, showThirdPolarizer, thirdPolarizerAngle]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'nothing', label: 'Nothing changes - light passes through normally' },
    { id: 'colors', label: 'Rainbow colors appear like a prism' },
    { id: 'dark', label: 'The view gets darker, nearly black at 90 degrees' },
    { id: 'flicker', label: 'The light flickers on and off rapidly' },
  ];

  const twistPredictions = [
    { id: 'darker', label: 'It gets even darker - three filters block more light' },
    { id: 'same', label: 'Nothing changes - still completely dark' },
    { id: 'brighter', label: 'Light comes back! The middle filter lets some through' },
    { id: 'rainbow', label: 'Rainbow colors appear' },
  ];

  const transferApplications = [
    {
      title: 'LCD Screens',
      description: 'Every LCD display uses two polarizers with liquid crystals between them. The crystals rotate light polarization to control what passes through each pixel.',
      question: 'Why does an LCD screen go black when you wear polarized sunglasses at certain angles?',
      answer: 'The polarized sunglasses act as a third polarizer. When aligned perpendicular to the screen\'s output polarizer, they block the light just like crossed polarizers in this experiment.',
    },
    {
      title: '3D Movies',
      description: 'Modern 3D theaters project two overlapping images with different polarizations (circular left and right). Special glasses filter one polarization to each eye.',
      question: 'Why do 3D glasses use circular polarization instead of linear?',
      answer: 'With linear polarization, tilting your head would mix the two images. Circular polarization maintains separation regardless of head angle, since it\'s based on rotation direction, not orientation.',
    },
    {
      title: 'Polarized Sunglasses',
      description: 'Polarized sunglasses block horizontally polarized light, which is the dominant direction of glare from flat surfaces like water and roads.',
      question: 'Why does polarized sunglasses reduce glare from water but not from a rough wall?',
      answer: 'When light reflects off a flat surface near Brewster\'s angle, it becomes strongly horizontally polarized. Rough surfaces scatter light in all directions, mixing polarizations, so polarized glasses don\'t help as much.',
    },
    {
      title: 'Stress Analysis',
      description: 'Transparent plastics under stress rotate light polarization. Between crossed polarizers, stress patterns appear as colorful fringes.',
      question: 'How do engineers use polarization to find stress in plastic models?',
      answer: 'Stressed plastic exhibits birefringence - different polarization directions travel at different speeds. This creates phase differences that appear as color bands between crossed polarizers, revealing stress distribution.',
    },
  ];

  const testQuestions = [
    {
      question: 'What happens when light passes through a polarizer?',
      options: [
        { text: 'It changes color', correct: false },
        { text: 'Only vibrations in one direction pass through', correct: true },
        { text: 'It speeds up', correct: false },
        { text: 'It becomes invisible', correct: false },
      ],
    },
    {
      question: 'When two polarizers are crossed at 90 degrees, the transmitted intensity is:',
      options: [
        { text: '100% - all light passes', correct: false },
        { text: '50% - half the light passes', correct: false },
        { text: 'Nearly 0% - almost no light passes', correct: true },
        { text: '25% - one quarter passes', correct: false },
      ],
    },
    {
      question: 'The relationship between transmitted intensity and angle follows:',
      options: [
        { text: 'Linear: I = I0 * (1 - theta/90)', correct: false },
        { text: 'Malus\'s Law: I = I0 * cos^2(theta)', correct: true },
        { text: 'Exponential: I = I0 * e^(-theta)', correct: false },
        { text: 'Inverse square: I = I0 / theta^2', correct: false },
      ],
    },
    {
      question: 'Adding a third polarizer at 45 degrees between two crossed polarizers:',
      options: [
        { text: 'Blocks even more light', correct: false },
        { text: 'Has no effect', correct: false },
        { text: 'Allows some light to pass through', correct: true },
        { text: 'Creates rainbow colors', correct: false },
      ],
    },
    {
      question: 'Why does glare from water become polarized?',
      options: [
        { text: 'Water molecules are polarized', correct: false },
        { text: 'Reflection at certain angles favors one polarization direction', correct: true },
        { text: 'The sun emits polarized light', correct: false },
        { text: 'Water filters out vertical vibrations', correct: false },
      ],
    },
    {
      question: 'LCD screens use polarizers because:',
      options: [
        { text: 'They make colors brighter', correct: false },
        { text: 'Liquid crystals rotate polarization to control light', correct: true },
        { text: 'They reduce eye strain', correct: false },
        { text: 'They make screens thinner', correct: false },
      ],
    },
    {
      question: 'At what angle between two polarizers is transmitted light at 50% intensity?',
      options: [
        { text: '45 degrees', correct: true },
        { text: '30 degrees', correct: false },
        { text: '60 degrees', correct: false },
        { text: '90 degrees', correct: false },
      ],
    },
    {
      question: 'Polarization describes:',
      options: [
        { text: 'The speed of light', correct: false },
        { text: 'The color of light', correct: false },
        { text: 'The direction of light wave vibration', correct: true },
        { text: 'The brightness of light', correct: false },
      ],
    },
    {
      question: 'Why do 3D movie glasses work?',
      options: [
        { text: 'They make one eye see faster than the other', correct: false },
        { text: 'They filter different polarizations to each eye', correct: true },
        { text: 'They use different colored lenses', correct: false },
        { text: 'They magnify the image differently', correct: false },
      ],
    },
    {
      question: 'Photoelastic stress analysis works because:',
      options: [
        { text: 'Stress makes materials glow', correct: false },
        { text: 'Stressed materials rotate light polarization', correct: true },
        { text: 'Stress changes the color of materials', correct: false },
        { text: 'Stress makes materials transparent', correct: false },
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
    const intensity = calculateIntensity();
    const intensityPercent = Math.round(intensity * 100);

    // Polarizer grid rendering
    const renderPolarizer = (x: number, y: number, rotation: number, color: string, label: string) => {
      const gridSize = 60;
      const lineCount = 8;
      const lines = [];

      for (let i = 0; i <= lineCount; i++) {
        const offset = (i / lineCount - 0.5) * gridSize;
        lines.push(
          <line
            key={`line-${i}`}
            x1={-gridSize / 2}
            y1={offset}
            x2={gridSize / 2}
            y2={offset}
            stroke={color}
            strokeWidth={2}
            opacity={0.8}
          />
        );
      }

      return (
        <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
          <rect
            x={-gridSize / 2 - 5}
            y={-gridSize / 2 - 5}
            width={gridSize + 10}
            height={gridSize + 10}
            fill="rgba(255,255,255,0.1)"
            stroke={color}
            strokeWidth={2}
            rx={4}
          />
          {lines}
          <text
            x={0}
            y={gridSize / 2 + 20}
            fill={color}
            fontSize={11}
            textAnchor="middle"
            transform={`rotate(${-rotation})`}
          >
            {label}
          </text>
        </g>
      );
    };

    // Light wave rendering
    const renderLightWave = (startX: number, endX: number, y: number, amplitude: number, polarizationAngle: number) => {
      const points = [];
      const steps = 50;
      const wavelength = 30;

      for (let i = 0; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const phase = (x / wavelength + animationTime) * 2 * Math.PI;
        const wave = Math.sin(phase) * amplitude;
        // Apply polarization direction
        const yOffset = wave * Math.cos(polarizationAngle * Math.PI / 180);
        points.push(`${x},${y + yOffset}`);
      }

      return (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={colors.lightWave}
          strokeWidth={2}
          opacity={amplitude > 0 ? 0.8 : 0.2}
        />
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: `rgba(0, 0, 0, ${1 - intensity * 0.7})`, borderRadius: '12px', maxWidth: '500px', transition: 'background 0.3s' }}
        >
          {/* Light source */}
          <circle cx={40} cy={height / 2} r={20} fill={colors.lightWave} opacity={0.8} />
          <text x={40} y={height / 2 + 45} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Unpolarized
          </text>
          <text x={40} y={height / 2 + 56} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Light
          </text>

          {/* Incoming light wave (unpolarized - show multiple directions) */}
          {renderLightWave(60, 110, height / 2, 15, 0)}
          {renderLightWave(60, 110, height / 2, 15, 45)}
          {renderLightWave(60, 110, height / 2, 15, 90)}

          {/* First polarizer (fixed at 0 degrees - vertical) */}
          {renderPolarizer(130, height / 2, 0, colors.polarizer1, 'Polarizer 1 (0deg)')}

          {/* After first polarizer - vertically polarized */}
          {renderLightWave(160, showThirdPolarizer ? 190 : 240, height / 2, 15, 0)}

          {/* Third polarizer (optional, in middle) */}
          {showThirdPolarizer && (
            <>
              {renderPolarizer(210, height / 2, thirdPolarizerAngle, colors.polarizer3, `Middle (${thirdPolarizerAngle}deg)`)}
              {renderLightWave(240, 290, height / 2, 15 * Math.cos(thirdPolarizerAngle * Math.PI / 180), thirdPolarizerAngle)}
            </>
          )}

          {/* Second polarizer (rotatable) */}
          {renderPolarizer(showThirdPolarizer ? 310 : 260, height / 2, angle, colors.polarizer2, `Polarizer 2 (${angle}deg)`)}

          {/* Output light */}
          {renderLightWave(showThirdPolarizer ? 340 : 290, showThirdPolarizer ? 380 : 360, height / 2, 15 * Math.sqrt(intensity), angle)}

          {/* Intensity meter */}
          <rect x={width - 60} y={20} width={40} height={150} fill="rgba(255,255,255,0.1)" stroke={colors.textMuted} strokeWidth={1} rx={4} />
          <rect
            x={width - 58}
            y={20 + 148 * (1 - intensity)}
            width={36}
            height={148 * intensity}
            fill={intensity > 0.5 ? colors.success : intensity > 0.1 ? colors.warning : colors.error}
            rx={2}
          />
          <text x={width - 40} y={185} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">
            {intensityPercent}%
          </text>
          <text x={width - 40} y={200} fill={colors.textSecondary} fontSize={9} textAnchor="middle">
            Intensity
          </text>

          {/* Angle indicator */}
          <text x={20} y={25} fill={colors.textPrimary} fontSize={12}>
            Angle: {angle}deg
          </text>
          <text x={20} y={42} fill={colors.textSecondary} fontSize={11}>
            I = I0 * cos^2({angle}deg) = {intensityPercent}%
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
              {isAnimating ? 'Stop Wave' : 'Animate Wave'}
            </button>
            <button
              onClick={() => { setAngle(0); setShowThirdPolarizer(false); setThirdPolarizerAngle(45); }}
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
          Rotation Angle: {angle}deg
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="1"
          value={angle}
          onChange={(e) => setAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {phase === 'twist_play' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ color: colors.textSecondary }}>Add Third Polarizer:</label>
            <button
              onClick={() => setShowThirdPolarizer(!showThirdPolarizer)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: showThirdPolarizer ? colors.success : 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {showThirdPolarizer ? 'On' : 'Off'}
            </button>
          </div>

          {showThirdPolarizer && (
            <div>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Middle Polarizer Angle: {thirdPolarizerAngle}deg
              </label>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={thirdPolarizerAngle}
                onChange={(e) => setThirdPolarizerAngle(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Transmitted Intensity: {Math.round(calculateIntensity() * 100)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Malus's Law: I = I0 * cos^2(theta)
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
              The Disappearing Light
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can you make the world go dark without turning lights off?
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
                Stack two polarized sunglasses lenses together. Now slowly rotate one.
                Watch as the view through both lenses gets darker and darker until
                it's nearly black - even though each lens alone barely dims the light!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Try it on your phone screen too - the LCD behaves strangely!
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Use the slider to rotate the second polarizer and watch the intensity change!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction ->')}
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
              Light from a source passes through two polarizers (shown as grids of lines).
              The first polarizer is fixed. The second can be rotated. The lines show
              which direction of light vibration each polarizer allows through.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you rotate the second polarizer to 90 degrees from the first, what happens?
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction ->')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Polarization</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Rotate the second polarizer and observe how intensity changes
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
              <li>0 degrees: Both polarizers aligned - maximum light</li>
              <li>45 degrees: Half the intensity passes through</li>
              <li>90 degrees: Crossed polarizers - nearly complete darkness!</li>
              <li>Notice how intensity follows cos^2(angle)</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review ->')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'dark';

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
              Brightness drops to near-black at 90 degrees rotation!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Polarization</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Light Waves Vibrate:</strong> Light is a
                transverse wave - it vibrates perpendicular to its direction of travel. Unpolarized
                light vibrates in all directions at once.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Polarizers are Filters:</strong> A polarizer
                only allows vibrations in one direction to pass through. It blocks all other directions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Crossed = Blocked:</strong> When two polarizers
                are crossed at 90 degrees, the second blocks the exact direction the first allowed through.
                No vibration direction can pass both filters - total darkness!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! ->')}
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
              What if we add a THIRD polarizer between the crossed pair?
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
              You have two polarizers crossed at 90 degrees - complete darkness.
              Now you insert a third polarizer between them, angled at 45 degrees.
              You might think adding another filter would block even more light...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens when you add the third polarizer?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction ->')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Third Polarizer</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              First set angle to 90deg (crossed), then add the middle polarizer
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
              Light comes back! The middle polarizer rotates the polarization direction,
              allowing some light to pass the final polarizer. Maximum transmission
              through 3 polarizers occurs when the middle one is at 45 degrees.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation ->')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'brighter';

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
              Adding a filter actually lets MORE light through - counterintuitive!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Adding a Filter Increases Light</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Polarization Rotation:</strong> The middle
                polarizer doesn't just block - it rotates the polarization direction of light passing through.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Breaking the 90deg Block:</strong> Light
                from polarizer 1 is partially transmitted by the 45deg middle filter. This transmitted
                light is now polarized at 45deg - no longer perpendicular to the final polarizer!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Math:</strong> With polarizer at 45deg
                between crossed filters: I = I0 * cos^2(45deg) * cos^2(45deg) = I0 * 0.5 * 0.5 = 25% of original.
                From complete darkness to 25% - just by adding a filter!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge ->')}
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
              Polarization is everywhere in modern technology
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test ->')}
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
                {testScore >= 8 ? 'You\'ve mastered polarization!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : '-'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery ->' : 'Review & Retry')}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered polarization and Malus's Law</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Polarizers pass only one vibration direction</li>
              <li>Crossed polarizers block all light (90 degrees)</li>
              <li>Intensity follows Malus's Law: I = I0 * cos^2(theta)</li>
              <li>Third polarizer can restore light by rotating polarization</li>
              <li>Applications in LCDs, 3D movies, sunglasses, stress analysis</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Polarization is fundamental to quantum mechanics - photon spin states are described
              using polarization. Quantum cryptography uses polarized photons for secure communication.
              In astrophysics, polarization of cosmic microwave background radiation reveals information
              about the early universe!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game ->')}
      </div>
    );
  }

  return null;
};

export default PolarizationRenderer;
