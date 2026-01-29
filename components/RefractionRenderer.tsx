import React, { useState, useEffect, useCallback } from 'react';

interface RefractionRendererProps {
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
  accent: '#3b82f6',
  accentGlow: 'rgba(59, 130, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  water: '#60a5fa',
  straw: '#fbbf24',
  glass: 'rgba(255, 255, 255, 0.2)',
};

const RefractionRenderer: React.FC<RefractionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [viewingAngle, setViewingAngle] = useState(0);
  const [refractiveIndex, setRefractiveIndex] = useState(1.33); // Water
  const [waterLevel, setWaterLevel] = useState(60);
  const [showRayPaths, setShowRayPaths] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const predictions = [
    { id: 'cup', label: 'Moving the cup causes more bending' },
    { id: 'head', label: 'Moving your head left-right changes the apparent break' },
    { id: 'same', label: 'Both cause equal changes to the break' },
    { id: 'none', label: 'Neither affects the break - it stays constant' },
  ];

  const twistPredictions = [
    { id: 'less', label: 'Sugar water bends light less' },
    { id: 'more', label: 'Sugar water bends light more (bigger apparent break)' },
    { id: 'same', label: 'Sugar water has no different effect' },
    { id: 'color', label: 'Sugar water adds colors to the break' },
  ];

  const transferApplications = [
    {
      title: 'Spearfishing Compensation',
      description: 'Fish appear closer to the surface than they actually are. Skilled spearfishers learn to aim below the apparent position.',
      question: 'Why must spearfishers aim below where they see the fish?',
      answer: 'Light bends away from normal when exiting water. Your brain traces rays straight back, placing the fish higher than its true position.',
    },
    {
      title: 'Swimming Pool Depth',
      description: 'Pools look shallower than they are. A 2m pool might appear only 1.5m deep from above.',
      question: 'Why do pools look shallower than they are?',
      answer: 'Light from the bottom bends at the surface. Your brain assumes straight-line paths, making the bottom appear raised.',
    },
    {
      title: 'Corrective Lenses',
      description: 'Eyeglasses bend light to compensate for eyes that focus incorrectly. The lens curvature determines bending strength.',
      question: 'How do glasses correct vision using refraction?',
      answer: 'Curved lenses bend light before it enters the eye, effectively moving the focal point onto the retina where the eye\'s natural lens fails.',
    },
    {
      title: 'Fiber Optic Communication',
      description: 'Light bounces inside glass fibers by total internal reflection, carrying data across continents.',
      question: 'How does refraction enable fiber optic cables?',
      answer: 'The fiber\'s core has higher refractive index than cladding. Light hitting the boundary at shallow angles reflects totally, staying trapped inside.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes a straw to appear "broken" in water?',
      options: [
        { text: 'Water magnifies part of the straw', correct: false },
        { text: 'Light changes speed at the water surface, bending rays', correct: true },
        { text: 'The straw actually bends when wet', correct: false },
        { text: 'Air bubbles distort the image', correct: false },
      ],
    },
    {
      question: 'Why does your brain perceive the straw in the wrong position?',
      options: [
        { text: 'Eyes have built-in errors', correct: false },
        { text: 'Brain assumes light travels in straight lines', correct: true },
        { text: 'Water creates a mirror effect', correct: false },
        { text: 'The straw reflects light differently underwater', correct: false },
      ],
    },
    {
      question: 'When light goes from air into water, it bends:',
      options: [
        { text: 'Away from the normal (perpendicular)', correct: false },
        { text: 'Toward the normal (perpendicular)', correct: true },
        { text: 'Parallel to the surface', correct: false },
        { text: 'It doesn\'t bend at all', correct: false },
      ],
    },
    {
      question: 'What determines how much light bends at a boundary?',
      options: [
        { text: 'Only the color of light', correct: false },
        { text: 'The difference in refractive indices of the two materials', correct: true },
        { text: 'Only the temperature', correct: false },
        { text: 'The brightness of the light', correct: false },
      ],
    },
    {
      question: 'Sugar water has a higher refractive index than plain water. This means:',
      options: [
        { text: 'Light travels faster in sugar water', correct: false },
        { text: 'Light bends more when entering sugar water', correct: true },
        { text: 'Light cannot enter sugar water', correct: false },
        { text: 'Sugar water is opaque', correct: false },
      ],
    },
    {
      question: 'The refractive index of a material compares:',
      options: [
        { text: 'Light speed in vacuum to light speed in that material', correct: true },
        { text: 'Material density to water density', correct: false },
        { text: 'Material hardness to glass hardness', correct: false },
        { text: 'Material color to white light', correct: false },
      ],
    },
    {
      question: 'Why does the break in the straw change when you move your viewing angle?',
      options: [
        { text: 'The straw is flexible', correct: false },
        { text: 'Different viewing angles mean different ray paths through the water', correct: true },
        { text: 'Your eyes adjust focus', correct: false },
        { text: 'The water ripples', correct: false },
      ],
    },
    {
      question: 'A fish in water appears at position A. Where is its actual position?',
      options: [
        { text: 'Higher than A (closer to surface)', correct: false },
        { text: 'Lower than A (deeper in water)', correct: true },
        { text: 'Exactly at position A', correct: false },
        { text: 'Horizontally offset from A', correct: false },
      ],
    },
    {
      question: 'Diamond has a very high refractive index (~2.4). Compared to glass (~1.5):',
      options: [
        { text: 'Diamond bends light less', correct: false },
        { text: 'Diamond bends light more, creating more sparkle', correct: true },
        { text: 'Both bend light equally', correct: false },
        { text: 'Diamond doesn\'t bend light', correct: false },
      ],
    },
    {
      question: 'If you look straight down (perpendicular) at a straw in water:',
      options: [
        { text: 'Maximum bending occurs', correct: false },
        { text: 'No apparent displacement - the straw looks straight', correct: true },
        { text: 'The straw disappears', correct: false },
        { text: 'Colors separate', correct: false },
      ],
    },
  ];

  // Calculate apparent straw position based on refraction
  const calculateApparentShift = useCallback(() => {
    const angleRad = (viewingAngle * Math.PI) / 180;
    const n = refractiveIndex;
    // Simplified apparent depth calculation
    const shift = Math.tan(angleRad) * (1 - 1/n) * waterLevel * 0.5;
    return Math.min(Math.max(shift, -30), 30);
  }, [viewingAngle, refractiveIndex, waterLevel]);

  const apparentShift = calculateApparentShift();

  // Render the glass with straw visualization
  const renderVisualization = () => {
    const glassWidth = 120;
    const glassHeight = 200;
    const waterHeight = (waterLevel / 100) * glassHeight * 0.8;

    return (
      <svg width="300" height="280" viewBox="0 0 300 280">
        {/* Background */}
        <rect x="0" y="0" width="300" height="280" fill={colors.bgPrimary} />

        {/* Grid pattern behind */}
        {Array.from({ length: 15 }).map((_, i) => (
          <React.Fragment key={i}>
            <line x1={i * 20} y1="0" x2={i * 20} y2="280" stroke="#1e3a5f" strokeWidth="1" />
            <line x1="0" y1={i * 20} x2="300" y2={i * 20} stroke="#1e3a5f" strokeWidth="1" />
          </React.Fragment>
        ))}

        {/* Glass container */}
        <rect
          x={(300 - glassWidth) / 2}
          y="40"
          width={glassWidth}
          height={glassHeight}
          fill="none"
          stroke={colors.glass}
          strokeWidth="3"
          rx="5"
        />

        {/* Water */}
        <rect
          x={(300 - glassWidth) / 2 + 3}
          y={40 + glassHeight - waterHeight - 3}
          width={glassWidth - 6}
          height={waterHeight}
          fill={colors.water}
          opacity="0.4"
        />

        {/* Water surface line */}
        <line
          x1={(300 - glassWidth) / 2 + 3}
          y1={40 + glassHeight - waterHeight - 3}
          x2={(300 - glassWidth) / 2 + glassWidth - 3}
          y2={40 + glassHeight - waterHeight - 3}
          stroke={colors.water}
          strokeWidth="2"
        />

        {/* Straw - above water (actual position) */}
        <line
          x1="150"
          y1="20"
          x2="150"
          y2={40 + glassHeight - waterHeight - 3}
          stroke={colors.straw}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Straw - underwater (actual position, dashed) */}
        <line
          x1="150"
          y1={40 + glassHeight - waterHeight - 3}
          x2="150"
          y2={40 + glassHeight - 10}
          stroke={colors.straw}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="4,4"
          opacity="0.4"
        />

        {/* Straw - underwater (apparent position) */}
        <line
          x1="150"
          y1={40 + glassHeight - waterHeight - 3}
          x2={150 + apparentShift}
          y2={40 + glassHeight - 10}
          stroke={colors.straw}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Ray paths if enabled */}
        {showRayPaths && (
          <>
            {/* Light ray from underwater straw to eye */}
            <line
              x1={150 + apparentShift}
              y1={40 + glassHeight - 50}
              x2={150}
              y2={40 + glassHeight - waterHeight - 3}
              stroke={colors.error}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="150"
              y1={40 + glassHeight - waterHeight - 3}
              x2={200 + viewingAngle}
              y2="10"
              stroke={colors.error}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            {/* Apparent path (what brain thinks) */}
            <line
              x1={150 + apparentShift}
              y1={40 + glassHeight - 50}
              x2={200 + viewingAngle}
              y2="10"
              stroke={colors.success}
              strokeWidth="2"
              opacity="0.5"
            />
          </>
        )}

        {/* Eye icon */}
        <g transform={`translate(${200 + viewingAngle}, 5)`}>
          <ellipse cx="0" cy="8" rx="10" ry="6" fill="white" stroke={colors.textPrimary} strokeWidth="2" />
          <circle cx="0" cy="8" r="3" fill={colors.accent} />
        </g>

        {/* Labels */}
        <text x="150" y="270" textAnchor="middle" fill={colors.textSecondary} fontSize="12">
          Apparent shift: {apparentShift.toFixed(1)}px
        </text>
      </svg>
    );
  };

  const handleTestAnswer = (answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestQuestion] = answerIndex;
    setTestAnswers(newAnswers);

    if (currentTestQuestion < testQuestions.length - 1) {
      setCurrentTestQuestion(currentTestQuestion + 1);
    }
  };

  const submitTest = () => {
    let score = 0;
    testAnswers.forEach((answer, i) => {
      if (answer !== null && testQuestions[i].options[answer]?.correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7) {
      onCorrectAnswer?.();
    } else {
      onIncorrectAnswer?.();
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              The Broken Straw Illusion
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Will the straw look more bent when you move your head left-right, or when you move the cup?
            </p>
            {renderVisualization()}
            <div style={{ marginTop: '24px' }}>
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>
                Notice how the straw appears to "break" at the water surface. The underwater portion seems shifted from where it should be.
              </p>
            </div>
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Make Your Prediction
            </h2>
            <div style={{ marginBottom: '24px' }}>
              {renderVisualization()}
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '8px' }}>
                What You're Looking At
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                A straw in a glass of water viewed from an angle. The grid behind helps you see the apparent displacement.
                The dashed line shows where the straw actually is; the solid line shows where it appears.
              </p>
            </div>
            <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
              Which action will change the apparent break MORE?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    background: prediction === p.id ? colors.accent : colors.bgCard,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '16px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Explore Refraction
            </h2>
            {renderVisualization()}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Viewing Angle: {viewingAngle}°
                </label>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={viewingAngle}
                  onChange={(e) => setViewingAngle(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Refractive Index: {refractiveIndex.toFixed(2)} ({refractiveIndex < 1.4 ? 'Water' : refractiveIndex < 1.5 ? 'Sugar Water' : 'Glass'})
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="1.6"
                  step="0.01"
                  value={refractiveIndex}
                  onChange={(e) => setRefractiveIndex(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Water Level: {waterLevel}%
                </label>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={waterLevel}
                  onChange={(e) => setWaterLevel(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={() => setShowRayPaths(!showRayPaths)}
                style={{
                  padding: '12px 24px',
                  background: showRayPaths ? colors.accent : colors.bgCard,
                  color: colors.textPrimary,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {showRayPaths ? 'Hide Ray Paths' : 'Show Ray Paths'}
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Understanding Refraction
            </h2>
            <div style={{
              background: prediction === 'head' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '18px' }}>
                {prediction === 'head' ? '✓ Correct!' : '✗ Not quite!'} Moving your viewing angle changes how the light rays reach your eye through the refracting surface.
              </p>
            </div>
            {renderVisualization()}
            <div style={{ marginTop: '24px', color: colors.textSecondary }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics:</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>Light changes speed when entering water (slower than in air)</li>
                <li>This speed change causes the light ray to bend at the surface</li>
                <li>Your brain assumes light travels in straight lines</li>
                <li>So you see the underwater portion in the wrong position</li>
                <li>The apparent shift depends on viewing angle and how different the materials are</li>
              </ul>
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              The Twist: Sugar Water
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              What if we dissolve sugar in the water? Sugar increases the refractive index.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id ? colors.accent : colors.bgCard,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '16px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Compare Water vs Sugar Water
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
              Increase the refractive index to simulate adding sugar:
            </p>
            {renderVisualization()}
            <div style={{ marginTop: '24px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Refractive Index: {refractiveIndex.toFixed(2)}
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: colors.textMuted }}>Water (1.33)</span>
                <input
                  type="range"
                  min="1.33"
                  max="1.50"
                  step="0.01"
                  value={refractiveIndex}
                  onChange={(e) => setRefractiveIndex(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ color: colors.textMuted }}>Sugar Water (1.50)</span>
              </div>
            </div>
          </div>
        );

      case 'twist_review':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Higher Index = More Bending
            </h2>
            <div style={{
              background: twistPrediction === 'more' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '18px' }}>
                {twistPrediction === 'more' ? '✓ Correct!' : '✗ Actually,'} Sugar water has a higher refractive index, causing more bending!
              </p>
            </div>
            <div style={{ color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                The refractive index tells us how much slower light travels in a medium compared to vacuum:
              </p>
              <ul style={{ lineHeight: '1.8' }}>
                <li>Air: n ≈ 1.00</li>
                <li>Water: n ≈ 1.33</li>
                <li>Sugar water: n ≈ 1.40-1.50</li>
                <li>Glass: n ≈ 1.50</li>
                <li>Diamond: n ≈ 2.42</li>
              </ul>
              <p style={{ marginTop: '12px' }}>
                Greater difference in n between materials = more bending at the boundary.
              </p>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Real-World Applications
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {transferApplications.map((app, index) => (
                <div
                  key={index}
                  style={{
                    background: colors.bgCard,
                    padding: '20px',
                    borderRadius: '12px',
                    border: transferCompleted.has(index) ? `2px solid ${colors.success}` : 'none',
                  }}
                >
                  <h3 style={{ color: colors.accent, marginBottom: '8px' }}>{app.title}</h3>
                  <p style={{ color: colors.textSecondary, marginBottom: '12px' }}>{app.description}</p>
                  <p style={{ color: colors.textMuted, fontStyle: 'italic', marginBottom: '8px' }}>
                    {app.question}
                  </p>
                  {!transferCompleted.has(index) ? (
                    <button
                      onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                      style={{
                        padding: '8px 16px',
                        background: colors.accent,
                        color: colors.textPrimary,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      Reveal Answer
                    </button>
                  ) : (
                    <p style={{ color: colors.success }}>{app.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'test':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Test Your Knowledge
            </h2>
            {!testSubmitted ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.textMuted }}>
                    Question {currentTestQuestion + 1} of {testQuestions.length}
                  </span>
                  <div style={{
                    height: '4px',
                    background: colors.bgCard,
                    borderRadius: '2px',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${((currentTestQuestion + 1) / testQuestions.length) * 100}%`,
                      background: colors.accent,
                      borderRadius: '2px',
                    }} />
                  </div>
                </div>
                <p style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '20px' }}>
                  {testQuestions[currentTestQuestion].question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {testQuestions[currentTestQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleTestAnswer(index)}
                      style={{
                        padding: '16px',
                        background: testAnswers[currentTestQuestion] === index ? colors.accent : colors.bgCard,
                        color: colors.textPrimary,
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
                {testAnswers.every(a => a !== null) && (
                  <button
                    onClick={submitTest}
                    style={{
                      marginTop: '24px',
                      padding: '16px 32px',
                      background: colors.success,
                      color: colors.textPrimary,
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      width: '100%',
                    }}
                  >
                    Submit Test
                  </button>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  {testScore >= 7 ? '🎉' : '📚'}
                </div>
                <p style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '8px' }}>
                  You scored {testScore} out of {testQuestions.length}
                </p>
                <p style={{ color: colors.textSecondary }}>
                  {testScore >= 7 ? 'Excellent understanding of refraction!' : 'Review the concepts and try again!'}
                </p>
              </div>
            )}
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h2 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '16px' }}>
              Refraction Mastered!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              You now understand how light bends at boundaries between materials.
            </p>
            <div style={{
              background: colors.bgCard,
              padding: '24px',
              borderRadius: '16px',
              textAlign: 'left'
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
                <li>Light changes speed in different materials</li>
                <li>Speed change causes bending at boundaries</li>
                <li>Refractive index quantifies how much light slows</li>
                <li>Your brain assumes straight-line light paths</li>
                <li>Greater index difference = more bending</li>
              </ul>
            </div>
            <button
              onClick={() => onPhaseComplete?.()}
              style={{
                marginTop: '24px',
                padding: '16px 32px',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`,
                color: colors.textPrimary,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              Complete Lesson
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      paddingBottom: '100px',
    }}>
      {renderPhaseContent()}

      {/* Fixed Footer Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgDark,
        borderTop: `1px solid ${colors.bgCard}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <span style={{ color: colors.textMuted, fontSize: '14px' }}>
          Refraction (Broken Straw)
        </span>
        {phase !== 'mastery' && phase !== 'test' && (
          <button
            onClick={() => onPhaseComplete?.()}
            disabled={
              (phase === 'predict' && !prediction) ||
              (phase === 'twist_predict' && !twistPrediction) ||
              (phase === 'transfer' && transferCompleted.size < 4)
            }
            style={{
              padding: '12px 24px',
              background: colors.accent,
              color: colors.textPrimary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: (
                (phase === 'predict' && !prediction) ||
                (phase === 'twist_predict' && !twistPrediction) ||
                (phase === 'transfer' && transferCompleted.size < 4)
              ) ? 0.5 : 1,
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default RefractionRenderer;
