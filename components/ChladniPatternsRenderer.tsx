import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface ChladniPatternsRendererProps {
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
  accent: '#14b8a6',
  accentGlow: 'rgba(20, 184, 166, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  plate: '#475569',
  sand: '#fbbf24',
  nodal: '#0ea5e9',
};

const ChladniPatternsRenderer: React.FC<ChladniPatternsRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography system
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

  // Simulation state
  const [frequency, setFrequency] = useState(200);
  const [modeM, setModeM] = useState(2);
  const [modeN, setModeN] = useState(2);
  const [isVibrating, setIsVibrating] = useState(false);
  const [showNodalLines, setShowNodalLines] = useState(true);
  const [plateShape, setPlateShape] = useState<'square' | 'circle'>('square');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation time
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!isVibrating) return;

    const interval = setInterval(() => {
      setTime(prev => prev + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isVibrating]);

  // Map frequency to mode numbers (simplified)
  useEffect(() => {
    // Simplified mapping: frequency determines complexity
    const modeFromFreq = Math.floor(frequency / 100);
    if (frequency < 150) {
      setModeM(1);
      setModeN(1);
    } else if (frequency < 250) {
      setModeM(2);
      setModeN(1);
    } else if (frequency < 350) {
      setModeM(2);
      setModeN(2);
    } else if (frequency < 450) {
      setModeM(3);
      setModeN(2);
    } else if (frequency < 550) {
      setModeM(3);
      setModeN(3);
    } else {
      setModeM(4);
      setModeN(3);
    }
  }, [frequency]);

  const predictions = [
    { id: 'center', label: 'Sand collects in the center of the plate' },
    { id: 'nodal', label: 'Sand collects along lines where the plate doesn\'t move' },
    { id: 'edges', label: 'Sand flies off the edges of the plate' },
    { id: 'random', label: 'Sand spreads randomly across the plate' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The pattern stays the same' },
    { id: 'more', label: 'The pattern becomes more complex (more lines)' },
    { id: 'less', label: 'The pattern becomes simpler (fewer lines)' },
    { id: 'disappear', label: 'The pattern disappears completely' },
  ];

  const transferApplications = [
    {
      title: 'Musical Instrument Design',
      description: 'Violin makers use Chladni patterns to see how the top plate vibrates. The patterns reveal if the wood is properly shaped for good sound.',
      question: 'Why do luthiers want to see specific Chladni patterns on violins?',
      answer: 'Certain patterns indicate the wood will vibrate efficiently at frequencies important for the violin\'s tone. Symmetrical patterns mean even vibration, which produces a balanced, resonant sound.',
    },
    {
      title: 'Speaker Cone Testing',
      description: 'Audio engineers use laser vibrometry (modern Chladni patterns) to identify "breakup modes" where speaker cones stop moving as a piston.',
      question: 'What do complex Chladni patterns on a speaker cone indicate?',
      answer: 'Complex patterns show the cone is breaking up into multiple vibrating zones at that frequency. This causes distortion. Good speakers are designed so breakup occurs above the audible range.',
    },
    {
      title: 'Earthquake Engineering',
      description: 'Building vibration modes are like 3D Chladni patterns. Engineers identify nodal floors (floors that don\'t move much) during earthquakes.',
      question: 'Where would you want critical equipment in a vibrating building?',
      answer: 'At nodal points (floors) where vibration amplitude is minimal, like sand collecting on nodal lines. Different earthquake frequencies excite different modes, so design must consider multiple scenarios.',
    },
    {
      title: 'Cymbal Manufacturing',
      description: 'Cymbal makers hammer specific areas based on how they want the cymbal to vibrate. Different zones produce different overtones.',
      question: 'How do Chladni patterns help cymbal design?',
      answer: 'Patterns show which areas move most for each frequency. Hammering nodal lines changes the cymbal\'s overtone structure minimally, while hammering antinodal areas (where sand moves away) has maximum effect on that frequency.',
    },
  ];

  const testQuestions = [
    {
      question: 'Where does sand collect on a vibrating Chladni plate?',
      options: [
        { text: 'Where the plate vibrates most', correct: false },
        { text: 'Along nodal lines where the plate doesn\'t move', correct: true },
        { text: 'At the center of the plate', correct: false },
        { text: 'Randomly across the surface', correct: false },
      ],
    },
    {
      question: 'What do nodal lines represent on a Chladni plate?',
      options: [
        { text: 'Lines of maximum vibration amplitude', correct: false },
        { text: 'Lines of zero vibration amplitude', correct: true },
        { text: 'Lines where frequency is highest', correct: false },
        { text: 'Lines connecting the sound source to edges', correct: false },
      ],
    },
    {
      question: 'What happens to Chladni patterns as frequency increases?',
      options: [
        { text: 'Patterns become simpler with fewer lines', correct: false },
        { text: 'Patterns become more complex with more lines', correct: true },
        { text: 'Patterns remain the same', correct: false },
        { text: 'Patterns disappear entirely', correct: false },
      ],
    },
    {
      question: 'What is the physical cause of Chladni patterns?',
      options: [
        { text: 'Electromagnetic forces from the speaker', correct: false },
        { text: 'Standing waves creating stationary nodes', correct: true },
        { text: 'Air pressure pushing sand around', correct: false },
        { text: 'Static electricity on the plate', correct: false },
      ],
    },
    {
      question: 'Why do only certain frequencies produce clear patterns?',
      options: [
        { text: 'Other frequencies are absorbed by the sand', correct: false },
        { text: 'Only resonant frequencies create stable standing waves', correct: true },
        { text: 'The speaker can only produce certain frequencies', correct: false },
        { text: 'Sand particles only respond to certain frequencies', correct: false },
      ],
    },
    {
      question: 'What determines the shape of a Chladni pattern?',
      options: [
        { text: 'The type of sand used', correct: false },
        { text: 'The plate geometry and vibration frequency (mode)', correct: true },
        { text: 'The loudness of the sound', correct: false },
        { text: 'The temperature of the plate', correct: false },
      ],
    },
    {
      question: 'On a square plate, why are patterns often symmetric?',
      options: [
        { text: 'Sound waves prefer symmetry', correct: false },
        { text: 'The boundary conditions enforce symmetry in modes', correct: true },
        { text: 'Square plates are more rigid', correct: false },
        { text: 'It\'s just a coincidence', correct: false },
      ],
    },
    {
      question: 'What is the relationship between mode number and pattern complexity?',
      options: [
        { text: 'Higher mode numbers = simpler patterns', correct: false },
        { text: 'Higher mode numbers = more nodal lines', correct: true },
        { text: 'Mode number doesn\'t affect pattern', correct: false },
        { text: 'Mode number only affects pattern size', correct: false },
      ],
    },
    {
      question: 'If you touched the plate at a nodal line during vibration, what would you feel?',
      options: [
        { text: 'Maximum vibration', correct: false },
        { text: 'Almost no vibration', correct: true },
        { text: 'The plate would stop vibrating', correct: false },
        { text: 'Electric shock from static', correct: false },
      ],
    },
    {
      question: 'Why are Chladni patterns useful in acoustics?',
      options: [
        { text: 'They make pretty art', correct: false },
        { text: 'They visualize invisible vibration modes', correct: true },
        { text: 'They amplify sound', correct: false },
        { text: 'They reduce noise', correct: false },
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

  // Generate sand particles based on Chladni pattern
  const generateSandParticles = useMemo(() => {
    const particles: { x: number; y: number; size: number }[] = [];
    const size = 300;
    const numParticles = 800;

    for (let i = 0; i < numParticles; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size;

      if (isVibrating) {
        // Move particles toward nodal lines using Chladni equation
        // For a square plate: cos(mπx/L)cos(nπy/L) - cos(nπx/L)cos(mπy/L) = 0
        for (let iter = 0; iter < 5; iter++) {
          const z1 = Math.cos(modeM * Math.PI * x / size) * Math.cos(modeN * Math.PI * y / size);
          const z2 = Math.cos(modeN * Math.PI * x / size) * Math.cos(modeM * Math.PI * y / size);
          const amplitude = Math.abs(z1 - z2);

          // Move toward lower amplitude
          const gradient = 0.5 + amplitude * 2;
          x += (Math.random() - 0.5) * 10 / gradient;
          y += (Math.random() - 0.5) * 10 / gradient;

          // Keep in bounds
          x = Math.max(5, Math.min(size - 5, x));
          y = Math.max(5, Math.min(size - 5, y));
        }
      }

      particles.push({
        x,
        y,
        size: 2 + Math.random() * 2,
      });
    }

    return particles;
  }, [isVibrating, modeM, modeN]);

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const plateSize = 280;
    const plateX = (width - plateSize) / 2;
    const plateY = 40;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Plate background */}
          <rect
            x={plateX}
            y={plateY}
            width={plateSize}
            height={plateSize}
            fill={colors.plate}
            stroke="#64748b"
            strokeWidth={2}
          />

          {/* Nodal lines visualization */}
          {showNodalLines && isVibrating && (
            <g>
              {/* Draw approximate nodal lines for current mode */}
              {Array.from({ length: modeM }).map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={plateX + (plateSize * (i + 0.5)) / modeM}
                  y1={plateY}
                  x2={plateX + (plateSize * (i + 0.5)) / modeM}
                  y2={plateY + plateSize}
                  stroke={colors.nodal}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  opacity={0.5}
                />
              ))}
              {Array.from({ length: modeN }).map((_, i) => (
                <line
                  key={`h${i}`}
                  x1={plateX}
                  y1={plateY + (plateSize * (i + 0.5)) / modeN}
                  x2={plateX + plateSize}
                  y2={plateY + (plateSize * (i + 0.5)) / modeN}
                  stroke={colors.nodal}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  opacity={0.5}
                />
              ))}
            </g>
          )}

          {/* Sand particles */}
          {generateSandParticles.map((p, i) => (
            <circle
              key={i}
              cx={plateX + (p.x * plateSize) / 300}
              cy={plateY + (p.y * plateSize) / 300}
              r={p.size}
              fill={colors.sand}
              opacity={0.8}
            />
          ))}

          {/* Vibration indicator */}
          {isVibrating && (
            <g>
              <circle
                cx={width / 2}
                cy={plateY + plateSize + 30}
                r={15 + Math.sin(time * 10) * 5}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2}
                opacity={0.5 + Math.sin(time * 10) * 0.3}
              />
              <text
                x={width / 2}
                y={plateY + plateSize + 55}
                textAnchor="middle"
                fill={colors.accent}
                fontSize={12}
              >
                ♪ {frequency} Hz
              </text>
            </g>
          )}

          {/* Mode indicator */}
          <text
            x={width - 20}
            y={height - 15}
            textAnchor="end"
            fill={colors.textMuted}
            fontSize={12}
          >
            Mode ({modeM}, {modeN})
          </text>

          {/* Legend */}
          <g transform={`translate(20, ${height - 30})`}>
            <circle cx={0} cy={0} r={4} fill={colors.sand} />
            <text x={10} y={4} fill={colors.textMuted} fontSize={10}>Sand</text>
            {showNodalLines && (
              <>
                <line x1={60} y1={0} x2={80} y2={0} stroke={colors.nodal} strokeWidth={2} strokeDasharray="3,3" />
                <text x={85} y={4} fill={colors.textMuted} fontSize={10}>Nodal lines</text>
              </>
            )}
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsVibrating(!isVibrating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isVibrating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isVibrating ? '⏹ Stop' : '🔊 Vibrate'}
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
          Frequency: {frequency} Hz
        </label>
        <input
          type="range"
          min="100"
          max="600"
          step="50"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label style={{ color: colors.textSecondary }}>
          <input
            type="checkbox"
            checked={showNodalLines}
            onChange={(e) => setShowNodalLines(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show nodal lines
        </label>
      </div>

      <div style={{
        background: 'rgba(20, 184, 166, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Current Mode: ({modeM}, {modeN})
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Higher frequency → More complex pattern
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
              🎵 Seeing Sound
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              What if you could see the patterns hidden in vibrations?
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
                In 1787, Ernst Chladni discovered that sprinkling sand on a vibrating metal
                plate reveals beautiful geometric patterns - different for each musical note!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                These "Chladni figures" let us see the hidden structure of sound waves.
              </p>
            </div>

            <div style={{
              background: 'rgba(20, 184, 166, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Press "Vibrate" to see where the sand collects!
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
              A metal plate covered with sand particles (yellow dots). The plate can be
              vibrated at different frequencies by a speaker underneath.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When the plate vibrates, where will the sand go?
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
                    background: prediction === p.id ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Chladni Patterns</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change the frequency to see different vibration modes
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
              <li>Start at low frequency (100 Hz) - simple pattern</li>
              <li>Increase to 300 Hz - more complex pattern</li>
              <li>Go to 500+ Hz - intricate nodal lines</li>
              <li>Toggle nodal lines to understand the structure</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'nodal';

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
              Sand collects along nodal lines - places where the plate doesn't move!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Standing Waves</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Standing Waves:</strong> When a plate
                vibrates at resonant frequencies, waves reflect from the edges and interfere, creating
                standing waves with fixed nodal lines.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Nodes vs Antinodes:</strong> Nodal lines
                are where destructive interference creates zero motion. Antinodes have maximum vibration.
                Sand is bounced away from antinodes and settles at nodes.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Modes:</strong> Each resonant frequency
                creates a unique "mode" with its own pattern. Higher frequencies = more complex patterns
                with more nodal lines.
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
              What happens if we double the frequency?
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
              You've seen a pattern at 200 Hz. Now imagine we increase to 400 Hz -
              a higher-pitched sound with more energy vibrating the plate.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When we double the frequency, what happens to the pattern?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Frequency vs Pattern</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Sweep through frequencies and watch the pattern evolve
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
              Higher frequency = shorter wavelength = more nodes can fit on the plate = more
              complex pattern. Each "mode" has its own unique signature!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';

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
              Higher frequency creates more complex patterns with more nodal lines!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Mode Numbers Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Mode (m, n):</strong> Each pattern is
                described by two numbers indicating how many nodal lines exist in each direction.
                Mode (2, 1) has 2 vertical and 1 horizontal nodal line.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Frequency Relationship:</strong> Higher
                modes have higher resonant frequencies. The relationship follows f ∝ √(m² + n²),
                meaning complexity increases with frequency.
              </p>
              <p>
                This is why musical instruments have overtones - each is a different mode of the
                vibrating surface, creating the rich timbre we hear!
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
              Chladni patterns have practical uses in acoustics and engineering
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
                {transferCompleted.has(index) && (
                  <span style={{ color: colors.success }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(20, 184, 166, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  💭 {app.question}
                </p>
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
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered Chladni patterns!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

              return (
                <div
                  key={qIndex}
                  style={{
                    background: colors.bgCard,
                    margin: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}
                >
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        background: opt.correct
                          ? 'rgba(16, 185, 129, 0.2)'
                          : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}
                    >
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
              <span style={{ color: colors.textSecondary }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '24px',
            }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                      ? colors.textMuted
                      : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'rgba(20, 184, 166, 0.2)'
                      : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
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
              }}
            >
              ← Previous
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
                }}
              >
                Next →
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered Chladni patterns and standing waves
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Standing waves and nodal/antinodal regions</li>
              <li>Resonant frequencies and vibration modes</li>
              <li>Mode numbers (m, n) and pattern complexity</li>
              <li>Frequency-pattern relationship</li>
              <li>Applications in acoustics and instrument design</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(20, 184, 166, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern laser vibrometry creates 3D Chladni patterns, revealing vibrations in
              everything from car bodies to biological cells. The same mathematics describes
              electron orbitals in atoms - quantum "standing waves" around the nucleus!
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

export default ChladniPatternsRenderer;
