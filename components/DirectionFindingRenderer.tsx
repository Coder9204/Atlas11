import React, { useState, useEffect, useCallback } from 'react';

interface DirectionFindingRendererProps {
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
  soundWave: '#3b82f6',
  shadow: '#ef4444',
  ear: '#22c55e',
};

const DirectionFindingRenderer: React.FC<DirectionFindingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [frequency, setFrequency] = useState(2000); // Hz
  const [sourceAngle, setSourceAngle] = useState(45); // degrees from front
  const [headSize, setHeadSize] = useState(17); // cm (average head diameter)
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [earCovered, setEarCovered] = useState<'none' | 'left' | 'right'>('none');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics constants
  const SPEED_OF_SOUND = 343; // m/s at 20C
  const headDiameterM = headSize / 100; // Convert cm to m

  // Calculate wavelength
  const wavelength = SPEED_OF_SOUND / frequency;
  const wavelengthCm = wavelength * 100;

  // Calculate ITD (Interaural Time Difference)
  // ITD max ~ (head diameter / speed of sound) * sin(angle)
  const angleRad = (sourceAngle * Math.PI) / 180;
  const itdMs = ((headDiameterM / SPEED_OF_SOUND) * Math.sin(angleRad)) * 1000;

  // Calculate ILD (Interaural Level Difference)
  // ILD is frequency dependent - stronger at high frequencies
  // Simplified model: ILD increases with frequency and angle
  const headShadowFactor = Math.min(headDiameterM / wavelength, 3); // How many wavelengths fit in head
  const ildDb = headShadowFactor * Math.sin(angleRad) * 8; // Simplified approximation

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Bass and treble are equally easy to locate' },
    { id: 'bass_easier', label: 'Bass is easier to locate because it penetrates better' },
    { id: 'treble_easier', label: 'Treble is easier to locate because of stronger head shadow' },
    { id: 'neither', label: 'Neither can be located accurately by ears alone' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Localization stays the same - one ear is enough' },
    { id: 'worse_horizontal', label: 'Worse for sounds on the covered side only' },
    { id: 'worse_all', label: 'Dramatically worse for all directions' },
    { id: 'better', label: 'Actually improves because less confusion' },
  ];

  const transferApplications = [
    {
      title: 'Surround Sound Systems',
      description: 'Home theater and gaming systems use multiple speakers to create spatial audio. They exploit ITD and ILD cues to place sounds around you.',
      question: 'Why do surround systems often use a single subwoofer rather than multiple bass speakers?',
      answer: 'Bass frequencies have long wavelengths that create weak head shadow and ITD cues. Our brains cannot localize bass well anyway, so one subwoofer placed anywhere sounds the same. Higher frequencies need proper speaker placement for localization.',
    },
    {
      title: 'Hearing Aids',
      description: 'Modern hearing aids use binaural processing - both aids communicate to preserve spatial cues. Early aids often only amplified one ear.',
      question: 'Why do audiologists strongly recommend hearing aids in both ears when needed?',
      answer: 'Single-ear amplification destroys the ITD and ILD differences that enable localization. Binaural hearing aids preserve or even enhance these cues, maintaining spatial awareness crucial for safety (traffic, voices) and speech comprehension in noise.',
    },
    {
      title: 'Animal Hunting and Predation',
      description: 'Owls can catch mice in complete darkness using sound alone. Their ears are asymmetrically placed on their skulls.',
      question: 'Why are owl ears at different heights on their head?',
      answer: 'Asymmetric ears create vertical ITD and ILD differences, not just horizontal. This gives owls 3D sound localization - they can determine both direction AND elevation of prey sounds with remarkable precision, even in total darkness.',
    },
    {
      title: 'Radar and Sonar Systems',
      description: 'Military systems use multiple receivers to locate targets. The same physics of time and intensity differences applies to electromagnetic and sound waves.',
      question: 'How do submarines locate other vessels using passive sonar?',
      answer: 'Submarines use hydrophone arrays (multiple underwater microphones) to measure time delays and intensity differences of incoming sounds. Like ears spaced apart, the array creates ITD/ILD-like cues that triangulate target position without revealing the submarine\'s location.',
    },
  ];

  const testQuestions = [
    {
      question: 'What creates the "head shadow" effect?',
      options: [
        { text: 'The head blocks high-frequency sounds better than low-frequency sounds', correct: true },
        { text: 'The head creates an echo that confuses localization', correct: false },
        { text: 'The head amplifies sounds on one side', correct: false },
        { text: 'The head changes the pitch of sounds', correct: false },
      ],
    },
    {
      question: 'ITD (Interaural Time Difference) is most useful for locating:',
      options: [
        { text: 'Only high-frequency sounds', correct: false },
        { text: 'Only low-frequency sounds', correct: false },
        { text: 'Sounds of any frequency', correct: true },
        { text: 'Only sounds directly in front', correct: false },
      ],
    },
    {
      question: 'ILD (Interaural Level Difference) is most effective at:',
      options: [
        { text: 'Low frequencies (bass)', correct: false },
        { text: 'High frequencies (treble)', correct: true },
        { text: 'All frequencies equally', correct: false },
        { text: 'Only ultrasonic frequencies', correct: false },
      ],
    },
    {
      question: 'Why is locating bass frequencies difficult?',
      options: [
        { text: 'Bass is too quiet to hear clearly', correct: false },
        { text: 'Bass wavelengths are larger than the head, creating weak shadow', correct: true },
        { text: 'Bass damages hearing localization', correct: false },
        { text: 'Bass travels slower than treble', correct: false },
      ],
    },
    {
      question: 'The maximum ITD for a human head is approximately:',
      options: [
        { text: '0.006 seconds (6 ms)', correct: false },
        { text: '0.0006 seconds (0.6 ms)', correct: true },
        { text: '0.06 seconds (60 ms)', correct: false },
        { text: '0.6 seconds (600 ms)', correct: false },
      ],
    },
    {
      question: 'Covering one ear dramatically worsens localization because:',
      options: [
        { text: 'Half the sound information is lost', correct: false },
        { text: 'Both ITD and ILD comparisons become impossible', correct: true },
        { text: 'The brain gets confused by asymmetric input', correct: false },
        { text: 'Sound cannot reach the covered ear at all', correct: false },
      ],
    },
    {
      question: 'A sound directly in front creates:',
      options: [
        { text: 'Maximum ITD and ILD', correct: false },
        { text: 'Zero ITD and zero ILD', correct: true },
        { text: 'Maximum ITD, zero ILD', correct: false },
        { text: 'Zero ITD, maximum ILD', correct: false },
      ],
    },
    {
      question: 'Why do surround sound systems typically use a single subwoofer?',
      options: [
        { text: 'Bass is expensive to produce', correct: false },
        { text: 'Bass cannot be localized well anyway', correct: true },
        { text: 'Multiple subwoofers would be too loud', correct: false },
        { text: 'Bass needs to be in the center for balance', correct: false },
      ],
    },
    {
      question: 'An owl\'s asymmetric ear placement provides:',
      options: [
        { text: 'Better hearing sensitivity', correct: false },
        { text: 'Vertical as well as horizontal localization', correct: true },
        { text: 'Protection from loud sounds', correct: false },
        { text: 'Improved echo cancellation', correct: false },
      ],
    },
    {
      question: 'For a 3000 Hz sound at 90 degrees to the side, the head shadow creates:',
      options: [
        { text: 'Only a time difference, no level difference', correct: false },
        { text: 'Both significant time and level differences', correct: true },
        { text: 'Only a level difference, no time difference', correct: false },
        { text: 'Neither time nor level differences', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const centerX = width / 2;
    const centerY = height / 2;
    const headRadius = 50;
    const earOffset = 8;

    // Sound source position
    const sourceDistance = 140;
    const sourceX = centerX + sourceDistance * Math.sin(angleRad);
    const sourceY = centerY - sourceDistance * Math.cos(angleRad);

    // Calculate shadow region (cone behind head opposite to source)
    const shadowAngle = Math.PI / 3; // 60 degree shadow cone
    const shadowStartAngle = angleRad + Math.PI - shadowAngle / 2;
    const shadowEndAngle = angleRad + Math.PI + shadowAngle / 2;

    // Generate wave fronts
    const generateWaveFronts = () => {
      const waveFronts = [];
      const numWaves = 6;
      const waveSpacing = wavelengthCm * 2; // Scale for visualization

      for (let i = 0; i < numWaves; i++) {
        const baseRadius = (animationTime * 50 + i * waveSpacing) % (sourceDistance + 50);
        if (baseRadius > 10) {
          waveFronts.push(
            <circle
              key={`wave${i}`}
              cx={sourceX}
              cy={sourceY}
              r={baseRadius}
              fill="none"
              stroke={colors.soundWave}
              strokeWidth={2}
              opacity={Math.max(0, 1 - baseRadius / (sourceDistance + 50))}
            />
          );
        }
      }
      return waveFronts;
    };

    // Intensity indicator calculation
    const leftEarX = centerX - headRadius - earOffset;
    const rightEarX = centerX + headRadius + earOffset;

    // Determine which ear is closer to source
    const leftEarDistance = Math.sqrt((leftEarX - sourceX) ** 2 + (centerY - sourceY) ** 2);
    const rightEarDistance = Math.sqrt((rightEarX - sourceX) ** 2 + (centerY - sourceY) ** 2);

    const nearEar = leftEarDistance < rightEarDistance ? 'left' : 'right';
    const leftIntensity = nearEar === 'left' ? 1 : Math.max(0.2, 1 - ildDb / 20);
    const rightIntensity = nearEar === 'right' ? 1 : Math.max(0.2, 1 - ildDb / 20);

    // Adjust for covered ear
    const effectiveLeftIntensity = earCovered === 'left' ? 0.1 : leftIntensity;
    const effectiveRightIntensity = earCovered === 'right' ? 0.1 : rightIntensity;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Shadow region */}
          <path
            d={`M ${centerX} ${centerY}
                L ${centerX + 200 * Math.cos(shadowStartAngle)} ${centerY + 200 * Math.sin(shadowStartAngle)}
                A 200 200 0 0 1 ${centerX + 200 * Math.cos(shadowEndAngle)} ${centerY + 200 * Math.sin(shadowEndAngle)}
                Z`}
            fill={colors.shadow}
            opacity={0.15 + headShadowFactor * 0.1}
          />

          {/* Sound waves */}
          {isAnimating && generateWaveFronts()}

          {/* Head (top view) */}
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={headRadius}
            ry={headRadius * 0.85}
            fill="#475569"
            stroke={colors.textSecondary}
            strokeWidth={2}
          />

          {/* Nose indicator (shows front) */}
          <ellipse
            cx={centerX}
            cy={centerY - headRadius * 0.85 - 8}
            rx={8}
            ry={6}
            fill="#475569"
            stroke={colors.textSecondary}
            strokeWidth={2}
          />

          {/* Left ear */}
          <ellipse
            cx={leftEarX}
            cy={centerY}
            rx={8}
            ry={14}
            fill={earCovered === 'left' ? '#64748b' : colors.ear}
            stroke={earCovered === 'left' ? colors.textMuted : colors.ear}
            strokeWidth={2}
            opacity={effectiveLeftIntensity}
          />
          {earCovered === 'left' && (
            <text x={leftEarX} y={centerY + 4} textAnchor="middle" fill={colors.textMuted} fontSize={10}>X</text>
          )}

          {/* Right ear */}
          <ellipse
            cx={rightEarX}
            cy={centerY}
            rx={8}
            ry={14}
            fill={earCovered === 'right' ? '#64748b' : colors.ear}
            stroke={earCovered === 'right' ? colors.textMuted : colors.ear}
            strokeWidth={2}
            opacity={effectiveRightIntensity}
          />
          {earCovered === 'right' && (
            <text x={rightEarX} y={centerY + 4} textAnchor="middle" fill={colors.textMuted} fontSize={10}>X</text>
          )}

          {/* Sound source */}
          <circle
            cx={sourceX}
            cy={sourceY}
            r={12}
            fill={colors.soundWave}
            stroke="white"
            strokeWidth={2}
          />
          <text x={sourceX} y={sourceY + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
            {frequency >= 1000 ? `${(frequency/1000).toFixed(1)}k` : frequency}
          </text>

          {/* Direction line from head to source */}
          <line
            x1={centerX}
            y1={centerY}
            x2={sourceX}
            y2={sourceY}
            stroke={colors.accent}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />

          {/* Labels */}
          <text x={20} y={25} fill={colors.textPrimary} fontSize={12}>
            Frequency: {frequency} Hz
          </text>
          <text x={20} y={42} fill={colors.textPrimary} fontSize={12}>
            Wavelength: {wavelengthCm.toFixed(1)} cm
          </text>
          <text x={20} y={59} fill={colors.textSecondary} fontSize={11}>
            Head: {headSize} cm
          </text>

          {/* ITD/ILD display */}
          <rect x={width - 130} y={10} width={120} height={70} rx={6} fill="rgba(0,0,0,0.3)" />
          <text x={width - 120} y={30} fill={colors.textSecondary} fontSize={11}>
            ITD: {itdMs.toFixed(3)} ms
          </text>
          <text x={width - 120} y={48} fill={colors.textSecondary} fontSize={11}>
            ILD: {ildDb.toFixed(1)} dB
          </text>
          <text x={width - 120} y={66} fill={headShadowFactor > 1 ? colors.success : colors.warning} fontSize={10}>
            Shadow: {headShadowFactor > 1 ? 'Strong' : 'Weak'}
          </text>

          {/* Angle indicator */}
          <text x={centerX} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
            Source angle: {sourceAngle}° from front
          </text>

          {/* Ear labels */}
          <text x={leftEarX} y={centerY + 30} textAnchor="middle" fill={colors.textMuted} fontSize={9}>L</text>
          <text x={rightEarX} y={centerY + 30} textAnchor="middle" fill={colors.textMuted} fontSize={9}>R</text>

          {/* Legend */}
          <rect x={10} y={height - 50} width={100} height={35} rx={4} fill="rgba(0,0,0,0.3)" />
          <circle cx={22} cy={height - 37} r={5} fill={colors.soundWave} />
          <text x={32} y={height - 33} fill={colors.textMuted} fontSize={9}>Sound source</text>
          <rect x={17} y={height - 25} width={10} height={10} fill={colors.shadow} opacity={0.4} />
          <text x={32} y={height - 17} fill={colors.textMuted} fontSize={9}>Shadow region</text>
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
              {isAnimating ? 'Stop Waves' : 'Show Waves'}
            </button>
            <button
              onClick={() => {
                setFrequency(2000);
                setSourceAngle(45);
                setHeadSize(17);
                setEarCovered('none');
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
          Sound Frequency: {frequency} Hz ({frequency < 500 ? 'Bass' : frequency < 2000 ? 'Mid' : 'Treble'})
        </label>
        <input
          type="range"
          min="100"
          max="8000"
          step="100"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>100 Hz (Bass)</span>
          <span>8000 Hz (Treble)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Source Angle: {sourceAngle}° from front
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="5"
          value={sourceAngle}
          onChange={(e) => setSourceAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0° (Front)</span>
          <span>90° (Side)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Head Diameter: {headSize} cm
        </label>
        <input
          type="range"
          min="12"
          max="22"
          step="1"
          value={headSize}
          onChange={(e) => setHeadSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Head Shadow Effect:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Wavelength ({wavelengthCm.toFixed(1)} cm) vs Head ({headSize} cm)
        </div>
        <div style={{
          color: headShadowFactor > 1 ? colors.success : colors.warning,
          fontSize: '12px',
          marginTop: '4px'
        }}>
          {headShadowFactor > 1
            ? `Strong shadow - head blocks ~${Math.round(headShadowFactor)} wavelengths`
            : `Weak shadow - wavelength larger than head, sound bends around`
          }
        </div>
      </div>
    </div>
  );

  const renderEarControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ color: colors.textSecondary }}>Cover an ear:</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['none', 'left', 'right'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setEarCovered(option)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: earCovered === option ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
              background: earCovered === option ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {option === 'none' ? 'Both Open' : option === 'left' ? 'Cover Left' : 'Cover Right'}
          </button>
        ))}
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
              Why is locating bass harder than treble?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Your ears are acoustic detectors with built-in direction finding
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
                Close your eyes and a friend snaps their fingers - you can point right at them.
                But when the bass kicks in at a concert, the thumping seems to come from everywhere.
                Why the difference?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer involves your head casting an acoustic "shadow."
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Show Waves" and drag the frequency slider to see how wavelength affects the head shadow!
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
              A top-down view of a head with two ears. A sound source emits waves at a certain frequency.
              The red shaded area shows the "shadow" region where the head blocks sound.
              ITD shows time delay between ears; ILD shows volume difference.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you compare localizing bass (100-500 Hz) vs treble (2000+ Hz), which is easier?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Head Shadow Effect</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust frequency and angle to see how localization cues change
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
              <li>Set frequency to 100 Hz (bass) - notice weak shadow</li>
              <li>Set frequency to 4000 Hz (treble) - notice strong shadow</li>
              <li>Move source to 90° - maximum ITD and ILD</li>
              <li>Move source to 0° (front) - zero ITD and ILD!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'treble_easier';

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
              Treble is easier to locate because high frequencies create stronger head shadow effects.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Sound Localization</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>ITD (Interaural Time Difference):</strong> Sound
                reaches your near ear before your far ear. Maximum ITD is about 0.6-0.7 ms (head diameter / speed of sound).
                Your brain detects differences as small as 10 microseconds!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>ILD (Interaural Level Difference):</strong> Your
                head casts an acoustic shadow, making sounds quieter at your far ear. This works best when the
                wavelength is smaller than your head (high frequencies).
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Why bass is hard:</strong> Bass wavelengths
                (e.g., 3.4m at 100 Hz) are much larger than your head (~17 cm). The sound simply bends around
                your head, creating almost no shadow or level difference.
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
              What happens if you cover one ear gently?
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
              Imagine covering one ear with your hand or an earplug. You can still hear sounds,
              just muffled on one side. How does this affect your ability to locate sounds?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you cover one ear, localization becomes:
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test One-Ear Localization</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Cover an ear and observe how ITD and ILD information is lost
            </p>
          </div>

          {renderVisualization(true)}
          {renderEarControls()}
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
              With one ear covered, you lose the ability to compare arrival times (ITD) and
              loudness levels (ILD) between ears. The brain needs BOTH ears to triangulate sound position!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'worse_all';

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
              Covering one ear dramatically worsens localization for ALL directions!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Both Ears Matter</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Comparison is key:</strong> Sound localization
                works by COMPARING signals between ears. One ear alone cannot determine if a sound is
                louder because it's closer or just a loud source far away.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>ITD requires timing reference:</strong> You
                need two ears to measure "the sound arrived HERE before THERE." With one ear, there's no reference.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Real-world impact:</strong> People with
                single-sided deafness often struggle with sound localization and hearing speech in noisy
                environments, even though they can hear sounds perfectly well.
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
              ITD and ILD principles are used everywhere from home theaters to hunting owls
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Completed</span>}
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
                {testScore >= 8 ? 'You\'ve mastered sound localization!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered the physics of sound localization</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Head shadow effect and wavelength dependence</li>
              <li>Interaural Time Difference (ITD) - up to 0.6-0.7 ms</li>
              <li>Interaural Level Difference (ILD) - stronger at high frequencies</li>
              <li>Why bass is hard to localize (wavelength larger than head)</li>
              <li>Binaural hearing is essential for spatial awareness</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The "Duplex Theory" explains that ITD dominates for low frequencies (below ~1500 Hz)
              while ILD dominates for high frequencies. The "cone of confusion" exists because sounds
              at different elevations can produce identical ITD/ILD - your brain uses pinna (outer ear)
              reflections to resolve vertical ambiguity!
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

export default DirectionFindingRenderer;
