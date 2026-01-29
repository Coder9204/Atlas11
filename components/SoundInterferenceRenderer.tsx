import React, { useState, useEffect, useCallback } from 'react';

interface SoundInterferenceRendererProps {
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
  speaker: '#3b82f6',
  constructive: '#10b981',
  destructive: '#ef4444',
  neutral: '#6366f1',
};

const SoundInterferenceRenderer: React.FC<SoundInterferenceRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [frequency, setFrequency] = useState(340); // Hz
  const [speakerSeparation, setSpeakerSeparation] = useState(2); // meters
  const [listenerX, setListenerX] = useState(0); // meters from center
  const [listenerY, setListenerY] = useState(3); // meters from speakers
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics constants
  const speedOfSound = 343; // m/s at room temperature
  const wavelength = speedOfSound / frequency;

  // Calculate path difference and interference
  const speaker1X = -speakerSeparation / 2;
  const speaker2X = speakerSeparation / 2;
  const speakerY = 0;

  const distance1 = Math.sqrt((listenerX - speaker1X) ** 2 + (listenerY - speakerY) ** 2);
  const distance2 = Math.sqrt((listenerX - speaker2X) ** 2 + (listenerY - speakerY) ** 2);
  const pathDifference = Math.abs(distance2 - distance1);
  const phaseRatio = (pathDifference % wavelength) / wavelength;

  // Interference: 0 = destructive, 0.5 = neutral, 1 = constructive
  const interferenceValue = Math.cos(2 * Math.PI * pathDifference / wavelength);
  const isDestructive = Math.abs(interferenceValue) < 0.3;
  const isConstructive = interferenceValue > 0.7;

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.05) % (2 * Math.PI));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'always_loud', label: 'Both speakers always make it louder everywhere' },
    { id: 'dead_spots', label: 'Some spots are silent (dead spots) while others are extra loud' },
    { id: 'average', label: 'Sound is the same volume everywhere - they average out' },
    { id: 'cancel_all', label: 'The two sounds completely cancel each other out' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The dead spots stay in exactly the same places' },
    { id: 'move', label: 'The dead spots move - their spacing changes' },
    { id: 'disappear', label: 'All dead spots disappear' },
    { id: 'more', label: 'More dead spots appear but they stay in the same positions' },
  ];

  const transferApplications = [
    {
      title: 'Concert Hall Acoustics',
      description: 'Large venues with multiple speaker arrays must carefully manage interference patterns to ensure all seats hear balanced sound.',
      question: 'Why do sound engineers position speakers at specific angles?',
      answer: 'By controlling speaker placement and timing, engineers minimize destructive interference in seating areas. Some systems use delay lines to align wavefronts, ensuring constructive interference where audiences sit.',
    },
    {
      title: 'Noise-Canceling Headphones',
      description: 'Active noise cancellation creates "anti-sound" that interferes destructively with incoming noise.',
      question: 'How do noise-canceling headphones use interference?',
      answer: 'Microphones detect external noise, and speakers emit an inverted waveform (180 degrees out of phase). This creates destructive interference, canceling the noise. The path difference is essentially zero at your ear.',
    },
    {
      title: 'Sonar and Radar Arrays',
      description: 'Phased arrays use multiple transmitters with controlled timing to create directional beams through interference.',
      question: 'How do phased arrays "steer" their beams without moving?',
      answer: 'By adjusting the phase delay between elements, the array creates constructive interference in a chosen direction. Signals in other directions interfere destructively, creating a focused, steerable beam.',
    },
    {
      title: 'Radio Antenna Arrays',
      description: 'AM radio stations often use multiple towers to direct their signal toward populated areas.',
      question: 'Why do some radio stations have multiple transmission towers?',
      answer: 'Multiple towers create interference patterns that concentrate signal strength in desired directions (toward cities) while reducing it in others (toward other stations or the ocean). This is called a directional antenna pattern.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes "dead spots" in sound when two speakers play the same tone?',
      options: [
        { text: 'The speakers are too far apart', correct: false },
        { text: 'Destructive interference where path difference equals half-wavelengths', correct: true },
        { text: 'The sound waves run out of energy', correct: false },
        { text: 'Echo effects from the walls', correct: false },
      ],
    },
    {
      question: 'For destructive interference to occur, the path difference must be:',
      options: [
        { text: 'Zero', correct: false },
        { text: 'A whole number of wavelengths (n times lambda)', correct: false },
        { text: 'An odd number of half-wavelengths ((n + 1/2) times lambda)', correct: true },
        { text: 'Greater than 10 meters', correct: false },
      ],
    },
    {
      question: 'If you double the frequency of the sound, the spacing between dead spots:',
      options: [
        { text: 'Doubles', correct: false },
        { text: 'Halves', correct: true },
        { text: 'Stays the same', correct: false },
        { text: 'Becomes random', correct: false },
      ],
    },
    {
      question: 'At a point equidistant from both speakers, you experience:',
      options: [
        { text: 'Destructive interference - silence', correct: false },
        { text: 'Constructive interference - louder sound', correct: true },
        { text: 'No sound at all', correct: false },
        { text: 'Sound from only one speaker', correct: false },
      ],
    },
    {
      question: 'The wavelength of sound in air is given by:',
      options: [
        { text: 'Wavelength = frequency times speed', correct: false },
        { text: 'Wavelength = speed divided by frequency', correct: true },
        { text: 'Wavelength = frequency divided by speed', correct: false },
        { text: 'Wavelength = speed minus frequency', correct: false },
      ],
    },
    {
      question: 'Why are sound interference patterns easier to notice with pure tones than music?',
      options: [
        { text: 'Music is always quieter', correct: false },
        { text: 'Pure tones have a single wavelength, creating stable interference patterns', correct: true },
        { text: 'Musicians avoid standing in dead spots', correct: false },
        { text: 'Music creates more echoes', correct: false },
      ],
    },
    {
      question: 'Noise-canceling headphones work by:',
      options: [
        { text: 'Blocking sound with thick padding only', correct: false },
        { text: 'Creating sound waves that destructively interfere with noise', correct: true },
        { text: 'Amplifying desired sounds to mask noise', correct: false },
        { text: 'Filtering sound electronically after it enters the ear', correct: false },
      ],
    },
    {
      question: 'Moving the listener perpendicular to the line between speakers causes:',
      options: [
        { text: 'No change in interference pattern', correct: false },
        { text: 'Alternating loud and quiet zones', correct: true },
        { text: 'The sound to get steadily quieter', correct: false },
        { text: 'Both speakers to sound muffled', correct: false },
      ],
    },
    {
      question: 'Increasing the speaker separation while keeping frequency constant:',
      options: [
        { text: 'Creates more dead spots in the same area', correct: true },
        { text: 'Eliminates all dead spots', correct: false },
        { text: 'Has no effect on the interference pattern', correct: false },
        { text: 'Makes all sound quieter', correct: false },
      ],
    },
    {
      question: 'For a 343 Hz tone (wavelength = 1m), at what path difference is there complete destructive interference?',
      options: [
        { text: '0.25 m', correct: false },
        { text: '0.5 m', correct: true },
        { text: '1.0 m', correct: false },
        { text: '2.0 m', correct: false },
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

  const handleVisualizationMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
  }, []);

  const handleVisualizationMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVisualizationMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 8 - 4; // -4 to 4 meters
    const y = ((e.clientY - rect.top) / rect.height) * 6; // 0 to 6 meters (inverted)
    setListenerX(Math.max(-3.5, Math.min(3.5, x)));
    setListenerY(Math.max(0.5, Math.min(5.5, 6 - y)));
  }, [isDragging]);

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;
    const scale = 50; // pixels per meter
    const centerX = width / 2;
    const speakerYPx = height - 50;

    // Generate interference pattern
    const patternElements = [];
    const resolution = 10;
    for (let px = 0; px < width; px += resolution) {
      for (let py = 30; py < height - 30; py += resolution) {
        const x = (px - centerX) / scale;
        const y = (speakerYPx - py) / scale;

        const d1 = Math.sqrt((x - speaker1X) ** 2 + y ** 2);
        const d2 = Math.sqrt((x - speaker2X) ** 2 + y ** 2);
        const pd = Math.abs(d2 - d1);
        const interference = Math.cos(2 * Math.PI * pd / wavelength);

        // Color based on interference
        let fillColor;
        if (interference > 0.3) {
          const intensity = (interference - 0.3) / 0.7;
          fillColor = `rgba(16, 185, 129, ${0.2 + intensity * 0.5})`; // Green for constructive
        } else if (interference < -0.3) {
          const intensity = (-interference - 0.3) / 0.7;
          fillColor = `rgba(239, 68, 68, ${0.2 + intensity * 0.5})`; // Red for destructive
        } else {
          fillColor = 'rgba(99, 102, 241, 0.15)'; // Purple for neutral
        }

        patternElements.push(
          <rect
            key={`${px}-${py}`}
            x={px}
            y={py}
            width={resolution}
            height={resolution}
            fill={fillColor}
          />
        );
      }
    }

    // Speaker positions in pixels
    const speaker1Px = centerX + speaker1X * scale;
    const speaker2Px = centerX + speaker2X * scale;

    // Listener position in pixels
    const listenerPxX = centerX + listenerX * scale;
    const listenerPxY = speakerYPx - listenerY * scale;

    // Animated wave circles
    const waveCircles = [];
    if (isAnimating) {
      const numWaves = 8;
      for (let i = 0; i < numWaves; i++) {
        const radius = ((animationTime + i * (2 * Math.PI / numWaves)) % (2 * Math.PI)) / (2 * Math.PI) * 200;
        const opacity = 1 - radius / 200;
        if (opacity > 0) {
          waveCircles.push(
            <circle
              key={`wave1-${i}`}
              cx={speaker1Px}
              cy={speakerYPx}
              r={radius}
              fill="none"
              stroke={colors.speaker}
              strokeWidth={2}
              opacity={opacity * 0.5}
            />,
            <circle
              key={`wave2-${i}`}
              cx={speaker2Px}
              cy={speakerYPx}
              r={radius}
              fill="none"
              stroke={colors.speaker}
              strokeWidth={2}
              opacity={opacity * 0.5}
            />
          );
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px', cursor: interactive ? 'crosshair' : 'default' }}
          onMouseDown={interactive ? handleVisualizationMouseDown : undefined}
          onMouseUp={interactive ? handleVisualizationMouseUp : undefined}
          onMouseMove={interactive ? handleVisualizationMouseMove : undefined}
          onMouseLeave={interactive ? handleVisualizationMouseUp : undefined}
        >
          {/* Interference pattern */}
          {patternElements}

          {/* Animated waves */}
          {waveCircles}

          {/* Path lines from speakers to listener */}
          {interactive && (
            <>
              <line
                x1={speaker1Px}
                y1={speakerYPx}
                x2={listenerPxX}
                y2={listenerPxY}
                stroke={colors.speaker}
                strokeWidth={2}
                strokeDasharray="5,5"
                opacity={0.7}
              />
              <line
                x1={speaker2Px}
                y1={speakerYPx}
                x2={listenerPxX}
                y2={listenerPxY}
                stroke={colors.speaker}
                strokeWidth={2}
                strokeDasharray="5,5"
                opacity={0.7}
              />
            </>
          )}

          {/* Speakers */}
          <rect
            x={speaker1Px - 15}
            y={speakerYPx - 10}
            width={30}
            height={20}
            fill={colors.speaker}
            rx={4}
          />
          <rect
            x={speaker2Px - 15}
            y={speakerYPx - 10}
            width={30}
            height={20}
            fill={colors.speaker}
            rx={4}
          />
          <text x={speaker1Px} y={speakerYPx + 25} textAnchor="middle" fill={colors.textSecondary} fontSize={10}>Speaker 1</text>
          <text x={speaker2Px} y={speakerYPx + 25} textAnchor="middle" fill={colors.textSecondary} fontSize={10}>Speaker 2</text>

          {/* Listener */}
          {interactive && (
            <>
              <circle
                cx={listenerPxX}
                cy={listenerPxY}
                r={12}
                fill={isDestructive ? colors.destructive : isConstructive ? colors.constructive : colors.neutral}
                stroke={colors.textPrimary}
                strokeWidth={2}
              />
              <text x={listenerPxX} y={listenerPxY + 4} textAnchor="middle" fill={colors.textPrimary} fontSize={10} fontWeight="bold">
                {isDestructive ? 'X' : isConstructive ? '+' : 'o'}
              </text>
            </>
          )}

          {/* Legend */}
          <rect x={10} y={10} width={12} height={12} fill="rgba(16, 185, 129, 0.6)" />
          <text x={26} y={20} fill={colors.textSecondary} fontSize={10}>Loud (constructive)</text>
          <rect x={10} y={26} width={12} height={12} fill="rgba(239, 68, 68, 0.6)" />
          <text x={26} y={36} fill={colors.textSecondary} fontSize={10}>Quiet (destructive)</text>

          {/* Info box */}
          {interactive && (
            <g>
              <rect x={width - 140} y={10} width={130} height={55} fill="rgba(0,0,0,0.7)" rx={6} />
              <text x={width - 135} y={26} fill={colors.textSecondary} fontSize={10}>d1: {distance1.toFixed(2)} m</text>
              <text x={width - 135} y={40} fill={colors.textSecondary} fontSize={10}>d2: {distance2.toFixed(2)} m</text>
              <text x={width - 135} y={54} fill={colors.textSecondary} fontSize={10}>Delta: {pathDifference.toFixed(3)} m</text>
            </g>
          )}
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
              onClick={() => { setFrequency(340); setSpeakerSeparation(2); setListenerX(0); setListenerY(3); }}
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
          Frequency: {frequency} Hz (wavelength = {wavelength.toFixed(2)} m)
        </label>
        <input
          type="range"
          min="100"
          max="1000"
          step="10"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Speaker Separation: {speakerSeparation.toFixed(1)} m
        </label>
        <input
          type="range"
          min="0.5"
          max="4"
          step="0.1"
          value={speakerSeparation}
          onChange={(e) => setSpeakerSeparation(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: isDestructive ? 'rgba(239, 68, 68, 0.2)' : isConstructive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${isDestructive ? colors.destructive : isConstructive ? colors.constructive : colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
          {isDestructive ? 'DEAD SPOT - Destructive Interference!' : isConstructive ? 'LOUD - Constructive Interference!' : 'Partial Interference'}
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Path difference: {pathDifference.toFixed(3)} m = {(pathDifference / wavelength).toFixed(2)} wavelengths
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          {isDestructive
            ? 'Waves arrive out of phase and cancel!'
            : isConstructive
            ? 'Waves arrive in phase and add!'
            : 'Waves partially cancel'}
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        padding: '12px',
        borderRadius: '8px',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '12px' }}>
          Drag the listener (circle) around the room to explore the interference pattern!
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
              Sound Dead Spots
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can two loud speakers make silence in certain spots?
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
                Imagine standing between two speakers playing the same pure tone.
                Walk sideways and the sound gets loud, quiet, loud, quiet...
                There are spots where two loud speakers create silence!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is sound wave interference - and it reveals something profound about waves.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Drag the listener around the room to find the dead spots (red zones)!
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
              A top-down view of a room with two speakers at the bottom, both playing the same
              frequency tone. The colored pattern shows where sound is loud (green) and quiet (red).
              The stripes are interference patterns created by the overlapping sound waves.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When two speakers play the same tone, what do you expect to hear as you walk sideways?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Sound Interference</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Drag the listener and adjust controls to find dead spots
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
              <li>Move directly between the speakers - notice it's always loud on the center line</li>
              <li>Move sideways and count the loud/quiet bands</li>
              <li>Change frequency and watch the stripe spacing change</li>
              <li>Increase speaker separation and observe more stripes appear</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'dead_spots';

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
              Yes! Some spots are silent (dead spots) while others are extra loud - this is interference!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Sound Interference</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Path Difference:</strong> Sound from each speaker
                travels a different distance to reach you. The path difference determines whether waves
                add up or cancel out.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Constructive (Loud):</strong> When path difference = 0, 1, 2, 3...
                wavelengths, waves arrive "in phase" and add together. Sound is louder!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Destructive (Quiet):</strong> When path difference = 0.5, 1.5, 2.5...
                wavelengths, waves arrive "out of phase" and cancel. Dead spot!
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                fontFamily: 'monospace',
              }}>
                <div>Constructive: Delta d = n times lambda (n = 0, 1, 2...)</div>
                <div>Destructive: Delta d = (n + 1/2) times lambda</div>
                <div>Wavelength: lambda = v / f = {speedOfSound} / f</div>
              </div>
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
              What happens when you change the frequency?
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
              You've found a dead spot at a certain frequency. Now the sound engineer
              changes the frequency to a higher pitch. The speakers stay in the same positions.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When frequency increases, what happens to the dead spots?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Frequency Changes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change the frequency and watch the interference pattern shift
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
              Higher frequency means shorter wavelength. Shorter wavelength means the path
              difference needed for destructive interference is smaller - so the stripes
              get closer together!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'move';

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
              The dead spots move - their spacing changes with frequency!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Frequency Changes the Pattern</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Wavelength and Frequency:</strong> Higher frequency
                means shorter wavelength (lambda = v/f). Since destructive interference occurs at half-wavelength
                path differences, shorter wavelengths mean the dead spots are closer together.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Practical Implication:</strong> At concerts, bass
                notes (low frequency, long wavelength) have widely-spaced interference zones, while treble notes
                (high frequency, short wavelength) have tightly-packed zones. This is why bass feels more "even"
                across a room!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Formula:</strong> Stripe spacing is proportional
                to wavelength divided by speaker separation. Double the frequency, halve the stripe spacing!
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
              Wave interference appears in acoustics, electronics, and communication
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
                {testScore >= 8 ? 'You\'ve mastered sound interference!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered sound wave interference</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Path difference determines interference type</li>
              <li>Constructive: waves in phase, path diff = n wavelengths</li>
              <li>Destructive: waves out of phase, path diff = (n+1/2) wavelengths</li>
              <li>Wavelength = speed / frequency</li>
              <li>Higher frequency = shorter wavelength = tighter stripe pattern</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The same physics applies to light! Young's double-slit experiment demonstrated that light
              behaves as a wave by showing interference patterns. Modern applications include
              holography, interferometric measurement, noise cancellation, and phased array systems
              in radar, sonar, and 5G antennas.
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

export default SoundInterferenceRenderer;
