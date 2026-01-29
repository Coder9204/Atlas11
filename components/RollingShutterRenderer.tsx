import React, { useState, useEffect, useCallback } from 'react';

interface RollingShutterRendererProps {
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
  accent: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  propeller: '#3b82f6',
  scanline: '#10b981',
};

const RollingShutterRenderer: React.FC<RollingShutterRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [rotationSpeed, setRotationSpeed] = useState(10);
  const [scanSpeed, setScanSpeed] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [showScanline, setShowScanline] = useState(true);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTime(prev => prev + 0.016);
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const predictions = [
    { id: 'normal', label: 'The propeller looks normal, just spinning' },
    { id: 'blur', label: 'The propeller becomes a blur' },
    { id: 'curved', label: 'The straight blades appear curved or bent' },
    { id: 'invisible', label: 'The propeller becomes invisible' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Objects stay straight' },
    { id: 'tilt', label: 'Vertical objects appear tilted/slanted' },
    { id: 'stretch', label: 'Objects appear stretched' },
    { id: 'shrink', label: 'Objects appear compressed' },
  ];

  const transferApplications = [
    {
      title: 'Helicopter Blades in Photos',
      description: 'Phone photos of helicopters often show impossibly bent or wavy rotor blades due to rolling shutter.',
      question: 'Why do helicopter blades look like they\'re made of rubber in phone photos?',
      answer: 'The blade moves significantly during the time the sensor scans from top to bottom. Each row captures the blade at a different position, creating a curved appearance from straight blades.',
    },
    {
      title: 'Guitar String Vibration',
      description: 'Videos of vibrating guitar strings show strange wobbly patterns that don\'t match the actual vibration.',
      question: 'Why do guitar strings appear to wobble in waves on video?',
      answer: 'The string vibrates many times during one frame\'s scan. Different scan lines capture different phases of vibration, creating an apparent wave pattern from simple back-and-forth motion.',
    },
    {
      title: 'Flash Photography Bands',
      description: 'Photos taken with flash during rolling shutter can show partial illumination - only part of the image is lit.',
      question: 'Why might only half your photo be properly lit with flash?',
      answer: 'If flash duration is shorter than the scan time, only the rows being scanned during the flash get illuminated. The rest of the frame sees no light.',
    },
    {
      title: 'Sports Photography',
      description: 'Golf clubs and baseball bats can appear bent in phone photos due to their speed during the swing.',
      question: 'How do sports photographers avoid rolling shutter artifacts?',
      answer: 'They use cameras with global shutters (all pixels exposed simultaneously) or very fast rolling shutters. Some cameras also have electronic flash sync to minimize the effect.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes rolling shutter distortion?',
      options: [
        { text: 'The lens bending light incorrectly', correct: false },
        { text: 'Sequential row-by-row sensor scanning', correct: true },
        { text: 'Motion blur from long exposure', correct: false },
        { text: 'Digital compression artifacts', correct: false },
      ],
    },
    {
      question: 'A spinning propeller appears bent because:',
      options: [
        { text: 'The propeller is actually flexible', correct: false },
        { text: 'Different rows capture different blade positions', correct: true },
        { text: 'The camera lens is distorted', correct: false },
        { text: 'Wind bends the blades', correct: false },
      ],
    },
    {
      question: 'When you pan a camera quickly to the right, vertical objects appear:',
      options: [
        { text: 'Perfectly vertical', correct: false },
        { text: 'Tilted (leaning)', correct: true },
        { text: 'Stretched horizontally', correct: false },
        { text: 'Blurred only', correct: false },
      ],
    },
    {
      question: 'Global shutter differs from rolling shutter because:',
      options: [
        { text: 'It\'s slower', correct: false },
        { text: 'All pixels are exposed simultaneously', correct: true },
        { text: 'It only works in low light', correct: false },
        { text: 'It\'s only used in film cameras', correct: false },
      ],
    },
    {
      question: 'The direction of rolling shutter distortion depends on:',
      options: [
        { text: 'The camera brand', correct: false },
        { text: 'The direction of motion relative to scan direction', correct: true },
        { text: 'The color of the object', correct: false },
        { text: 'The focal length only', correct: false },
      ],
    },
    {
      question: 'Faster rolling shutter scan speeds result in:',
      options: [
        { text: 'More distortion', correct: false },
        { text: 'Less distortion', correct: true },
        { text: 'Different colors', correct: false },
        { text: 'No change', correct: false },
      ],
    },
    {
      question: 'Which device typically has more rolling shutter issues?',
      options: [
        { text: 'Professional cinema camera', correct: false },
        { text: 'Smartphone camera', correct: true },
        { text: 'DSLR with mechanical shutter', correct: false },
        { text: 'Film camera', correct: false },
      ],
    },
    {
      question: 'Rolling shutter can cause problems with:',
      options: [
        { text: 'Still subjects only', correct: false },
        { text: 'Fast-moving subjects and camera motion', correct: true },
        { text: 'Only very slow motion', correct: false },
        { text: 'Only objects far away', correct: false },
      ],
    },
    {
      question: 'The "jello effect" in video is caused by:',
      options: [
        { text: 'Camera shake combined with rolling shutter', correct: true },
        { text: 'Poor video compression', correct: false },
        { text: 'Low frame rate', correct: false },
        { text: 'Incorrect white balance', correct: false },
      ],
    },
    {
      question: 'To minimize rolling shutter in video, you should:',
      options: [
        { text: 'Use maximum zoom', correct: false },
        { text: 'Move the camera more quickly', correct: false },
        { text: 'Use a camera with faster readout or global shutter', correct: true },
        { text: 'Decrease the frame rate', correct: false },
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
    const propRadius = 80;
    const numBlades = 3;
    const scanY = showScanline ? (time * scanSpeed * 10) % height : -1;

    // Calculate blade positions with rolling shutter distortion
    const renderDistortedPropeller = () => {
      const blades = [];
      for (let b = 0; b < numBlades; b++) {
        const baseAngle = (b * 360 / numBlades) + (time * rotationSpeed * 360);
        const points = [];

        // Create blade with distortion based on scan position
        for (let y = 0; y <= propRadius; y += 2) {
          // Calculate what angle this row "sees"
          const rowTime = time - (y / (scanSpeed * 10)) * 0.1;
          const distortedAngle = (b * 360 / numBlades) + (rowTime * rotationSpeed * 360);
          const rad = (distortedAngle * Math.PI) / 180;

          const x = width / 2 + y * Math.sin(rad);
          const yPos = height / 2 - 30 + y * Math.cos(rad);
          points.push(`${x},${yPos}`);
        }

        blades.push(
          <polyline
            key={b}
            points={points.join(' ')}
            fill="none"
            stroke={colors.propeller}
            strokeWidth={8}
            strokeLinecap="round"
          />
        );
      }
      return blades;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Scanline visualization */}
          {showScanline && scanY >= 0 && scanY < height && (
            <line
              x1={0}
              y1={scanY}
              x2={width}
              y2={scanY}
              stroke={colors.scanline}
              strokeWidth={2}
              opacity={0.7}
            />
          )}

          {/* Hub */}
          <circle cx={width / 2} cy={height / 2 - 30} r={15} fill="#64748b" />

          {/* Distorted propeller blades */}
          {renderDistortedPropeller()}

          {/* Labels */}
          <text x={20} y={25} fill={colors.textSecondary} fontSize={12}>
            Rolling Shutter Effect
          </text>
          <text x={20} y={height - 20} fill={colors.textMuted} fontSize={11}>
            Rotation: {rotationSpeed} rot/s | Scan: {scanSpeed}%
          </text>

          {/* Scan direction indicator */}
          <g transform={`translate(${width - 30}, ${height / 2 - 30})`}>
            <line x1={0} y1={-40} x2={0} y2={40} stroke={colors.scanline} strokeWidth={2} />
            <polygon points="0,40 -5,30 5,30" fill={colors.scanline} />
            <text x={-25} y={55} fill={colors.scanline} fontSize={10}>scan</text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: isPlaying ? colors.error : colors.success, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => { setTime(0); setIsPlaying(false); }}
              style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
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
          Propeller Speed: {rotationSpeed} rot/s
        </label>
        <input type="range" min="1" max="30" step="1" value={rotationSpeed} onChange={(e) => setRotationSpeed(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Scan Speed: {scanSpeed}%
        </label>
        <input type="range" min="10" max="100" step="10" value={scanSpeed} onChange={(e) => setScanSpeed(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <label style={{ color: colors.textSecondary }}>
        <input type="checkbox" checked={showScanline} onChange={(e) => setShowScanline(e.target.checked)} style={{ marginRight: '8px' }} />
        Show scanline
      </label>
      <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Slow scan + fast rotation = more distortion
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
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>📱 The Bendy Propeller</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>Why do straight spinning blades look curved on phones?</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>Film a helicopter, propeller, or fan with your phone. The blades look bent, wobbly, even rubber-like!</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>This is the rolling shutter effect - your camera reads pixels line by line, not all at once.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>A 3-blade propeller spinning. The camera sensor scans from top to bottom (green line), capturing one row at a time. Each row "sees" the blade at a different moment.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>🤔 What happens to straight blades when filmed with a rolling shutter?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(236, 72, 153, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Rolling Shutter</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>See how scan speed and rotation affect distortion</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>High rotation + slow scan = extreme bending</li>
              <li>Fast scan = minimal distortion</li>
              <li>Watch how the scanline captures different positions</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'curved';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Straight blades appear curved because each row captures a different blade position!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 How Rolling Shutter Works</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Sequential Scanning:</strong> CMOS sensors read pixels row by row, taking time to scan the full frame. During this time, fast objects move.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Time Offset:</strong> The top of the image is captured before the bottom. A spinning blade is at different angles at different scan positions.</p>
              <p><strong style={{ color: colors.textPrimary }}>Result:</strong> Each row "stitches together" a different moment, creating curved appearances from straight objects.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>What if you pan the camera quickly to the side?</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Instead of filming a spinning object, you quickly pan (sweep) your camera to the right while filming stationary vertical objects like buildings or poles.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>🤔 What happens to vertical objects when you pan quickly?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)', background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Camera Panning</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Visualize how panning creates skew</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>💡 Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>When panning, the scene moves across the sensor. Top rows capture the scene at one position, bottom rows at another - creating a slant or "skew" effect!</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tilt';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>Vertical objects appear tilted when you pan the camera!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 The Jello Effect</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Skew from Panning:</strong> When the camera pans right, the scene appears to move left. Top rows capture the scene before it's moved as far as bottom rows.</p>
              <p><strong style={{ color: colors.textPrimary }}>Jello Effect:</strong> With vibration or handheld shake, the scene appears to wobble like jello as the camera's position changes during scan time.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>🌍 Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Rolling shutter affects all CMOS cameras</p>
          </div>
          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✓</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>💭 {app.question}</p>
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error }}>{testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}</h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>{opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2><span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / 10</span></div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>{testQuestions.map((_, i) => (<div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />))}</div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}><p style={{ color: colors.textPrimary, fontSize: '16px' }}>{currentQ.question}</p></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(236, 72, 153, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary }}>← Previous</button>
            {currentTestQuestion < 9 ? <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', background: colors.accent, color: 'white' }}>Next →</button> : <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white' }}>Submit</button>}
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary }}>You've mastered rolling shutter effects</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Sequential row-by-row sensor scanning</li>
              <li>Time offset creates spatial distortion</li>
              <li>Jello effect from camera shake</li>
              <li>Global shutter as the solution</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default RollingShutterRenderer;
