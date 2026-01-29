import React, { useState, useEffect } from 'react';

interface RetroreflectionRendererProps {
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
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lightBeam: '#fbbf24',
  mirror: '#3b82f6',
  retroreflector: '#10b981',
};

const RetroreflectionRenderer: React.FC<RetroreflectionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [sourceAngle, setSourceAngle] = useState(30);
  const [viewerAngle, setViewerAngle] = useState(30);
  const [showMirror, setShowMirror] = useState(true);
  const [showRetro, setShowRetro] = useState(true);
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
      setSourceAngle(prev => {
        const newVal = prev + 1;
        if (newVal > 70) return 10;
        return newVal;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Both reflect light the same way' },
    { id: 'mirror_better', label: 'The mirror reflects more light overall' },
    { id: 'retro_source', label: 'The retroreflector sends light back toward the source' },
    { id: 'retro_scatter', label: 'The retroreflector scatters light in all directions' },
  ];

  const twistPredictions = [
    { id: 'same_brightness', label: 'Both types appear equally bright' },
    { id: 'mirror_bright', label: 'The flat mirror appears brighter' },
    { id: 'retro_bright', label: 'The retroreflector appears brighter from the source position' },
    { id: 'neither', label: 'Neither reflects back to the source' },
  ];

  const transferApplications = [
    {
      title: 'Road Signs and Lane Markers',
      description: 'Highway signs and road markings use tiny glass beads or prisms to reflect headlights back to drivers, making them visible at night.',
      question: 'Why do road signs seem to glow when your headlights hit them?',
      answer: 'Retroreflective materials send light back toward its source. Since your headlights and eyes are nearly in the same position, the sign reflects your headlights directly back to you, appearing bright.',
    },
    {
      title: 'Lunar Laser Ranging',
      description: 'Apollo astronauts left retroreflector arrays on the Moon. Scientists bounce lasers off them to measure Earth-Moon distance to millimeter precision.',
      question: 'Why are retroreflectors essential for measuring Moon distance with lasers?',
      answer: 'A regular mirror would need perfect alignment to return light. Retroreflectors return light parallel to its incoming path from any angle, so the laser pulse comes back to its source regardless of Moon orientation.',
    },
    {
      title: 'Safety Gear and Clothing',
      description: 'Reflective strips on safety vests, running shoes, and bike gear use retroreflective materials to make wearers visible to drivers.',
      question: 'Why is retroreflective tape more effective than just bright colors at night?',
      answer: 'Bright colors need ambient light to be visible. Retroreflective tape redirects car headlights back to drivers, creating intense brightness from the driver\'s viewpoint even in complete darkness.',
    },
    {
      title: 'Surveying and Distance Measurement',
      description: 'Total station surveying instruments use retroreflective prisms as targets. The instrument measures distance by timing reflected laser pulses.',
      question: 'Why do surveyors use retroreflective prisms instead of regular targets?',
      answer: 'Retroreflectors return light to the source regardless of exact alignment. This means the prism doesn\'t need to be perfectly aimed at the instrument, making surveying faster and more reliable.',
    },
  ];

  const testQuestions = [
    {
      question: 'What makes retroreflection different from regular mirror reflection?',
      options: [
        { text: 'Retroreflectors are brighter', correct: false },
        { text: 'Retroreflectors return light toward the source regardless of angle', correct: true },
        { text: 'Retroreflectors only work with laser light', correct: false },
        { text: 'Retroreflectors absorb more light', correct: false },
      ],
    },
    {
      question: 'A corner-cube retroreflector works by:',
      options: [
        { text: 'Bending light like a lens', correct: false },
        { text: 'Using three perpendicular mirrors to reverse ray direction', correct: true },
        { text: 'Creating interference patterns', correct: false },
        { text: 'Absorbing and re-emitting light', correct: false },
      ],
    },
    {
      question: 'When you shine a light at a retroreflector at 45 degrees:',
      options: [
        { text: 'Light reflects at 45 degrees to the other side', correct: false },
        { text: 'Light returns parallel to the incoming beam', correct: true },
        { text: 'Light is absorbed', correct: false },
        { text: 'Light scatters randomly', correct: false },
      ],
    },
    {
      question: 'A flat mirror reflects light back to the source only when:',
      options: [
        { text: 'The light hits at any angle', correct: false },
        { text: 'The light hits perpendicular to the surface', correct: true },
        { text: 'The mirror is curved', correct: false },
        { text: 'The light is polarized', correct: false },
      ],
    },
    {
      question: 'Road signs are highly visible to drivers at night because:',
      options: [
        { text: 'They are made of luminous paint', correct: false },
        { text: 'Retroreflective materials return headlight light to the driver', correct: true },
        { text: 'They have built-in lights', correct: false },
        { text: 'They absorb moonlight', correct: false },
      ],
    },
    {
      question: 'The Apollo lunar retroreflectors can return laser light because:',
      options: [
        { text: 'They are precisely aimed at Earth', correct: false },
        { text: 'They return light parallel to incoming rays regardless of angle', correct: true },
        { text: 'They amplify the laser signal', correct: false },
        { text: 'They use special Moon materials', correct: false },
      ],
    },
    {
      question: 'A cat\'s eye road marker is bright to drivers because:',
      options: [
        { text: 'It contains batteries', correct: false },
        { text: 'It uses retroreflective glass beads or prisms', correct: true },
        { text: 'It reflects moonlight', correct: false },
        { text: 'It is painted with glow-in-the-dark paint', correct: false },
      ],
    },
    {
      question: 'Bicycle reflectors typically use:',
      options: [
        { text: 'Flat mirrors', correct: false },
        { text: 'Corner-cube arrays or molded prisms', correct: true },
        { text: 'Fluorescent materials', correct: false },
        { text: 'LED lights', correct: false },
      ],
    },
    {
      question: 'The key geometric principle of corner-cube retroreflection is:',
      options: [
        { text: 'Light focuses to a point', correct: false },
        { text: 'Each of three reflections reverses one direction component', correct: true },
        { text: 'Light diffracts around corners', correct: false },
        { text: 'Light changes color on reflection', correct: false },
      ],
    },
    {
      question: 'Surveyors prefer retroreflective prisms because:',
      options: [
        { text: 'They are cheaper than mirrors', correct: false },
        { text: 'Precise angular alignment is not required', correct: true },
        { text: 'They work only in daylight', correct: false },
        { text: 'They measure angles directly', correct: false },
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
    const height = 400;
    const centerY = height / 2;

    // Calculate mirror reflection (angle in = angle out)
    const mirrorReflectAngle = -sourceAngle;

    // Calculate light source and viewer positions
    const sourceRad = (sourceAngle * Math.PI) / 180;
    const viewerRad = (viewerAngle * Math.PI) / 180;
    const mirrorReflectRad = (mirrorReflectAngle * Math.PI) / 180;

    const lightSourceX = 80;
    const lightSourceY = centerY - 80;
    const viewerX = 80;
    const viewerY = centerY + 80;

    const mirrorX = 180;
    const mirrorY = centerY - 60;

    const retroX = 180;
    const retroY = centerY + 80;

    // Ray endpoints
    const rayLength = 150;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#0a0a14', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Light source */}
          <g>
            <circle cx={lightSourceX} cy={lightSourceY} r={20} fill={colors.lightBeam} opacity={0.8} />
            <text x={lightSourceX} y={lightSourceY - 30} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Light Source</text>
            <text x={lightSourceX} y={lightSourceY + 35} fill={colors.textMuted} fontSize={10} textAnchor="middle">{sourceAngle} deg</text>
          </g>

          {/* Viewer / Eye */}
          <g>
            <ellipse cx={viewerX} cy={viewerY} rx={15} ry={10} fill="#fff" />
            <circle cx={viewerX} cy={viewerY} r={6} fill="#3b82f6" />
            <circle cx={viewerX + 2} cy={viewerY - 1} r={2} fill="#fff" />
            <text x={viewerX} y={viewerY + 25} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Viewer</text>
          </g>

          {/* Mirror section */}
          {showMirror && (
            <g>
              <text x={mirrorX + 60} y={mirrorY - 50} fill={colors.mirror} fontSize={12} textAnchor="middle">Flat Mirror</text>

              {/* Mirror surface */}
              <rect x={mirrorX + 40} y={mirrorY - 40} width={8} height={80} fill={colors.mirror} rx={2} />

              {/* Incident ray to mirror */}
              <line
                x1={lightSourceX + 15}
                y1={lightSourceY}
                x2={mirrorX + 44}
                y2={mirrorY}
                stroke={colors.lightBeam}
                strokeWidth={3}
                markerEnd="url(#arrowYellow)"
              />

              {/* Reflected ray from mirror (goes away from viewer) */}
              <line
                x1={mirrorX + 44}
                y1={mirrorY}
                x2={mirrorX + 44 + 80 * Math.cos(mirrorReflectRad)}
                y2={mirrorY - 80 * Math.sin(mirrorReflectRad)}
                stroke={colors.lightBeam}
                strokeWidth={3}
                opacity={0.6}
                strokeDasharray="8,4"
                markerEnd="url(#arrowYellow)"
              />

              {/* Normal line */}
              <line x1={mirrorX + 44} y1={mirrorY - 35} x2={mirrorX + 44} y2={mirrorY + 35} stroke="rgba(255,255,255,0.3)" strokeWidth={1} strokeDasharray="4,4" />

              {/* Angle arc */}
              <path
                d={`M ${mirrorX + 54} ${mirrorY} A 10 10 0 0 0 ${mirrorX + 44 + 10 * Math.cos(sourceRad)} ${mirrorY - 10 * Math.sin(sourceRad)}`}
                fill="none"
                stroke={colors.lightBeam}
                strokeWidth={1}
              />

              {/* Miss indicator for viewer */}
              <text x={mirrorX + 100} y={mirrorY - 60} fill={colors.error} fontSize={10} textAnchor="middle">
                Light misses viewer!
              </text>
            </g>
          )}

          {/* Retroreflector section */}
          {showRetro && (
            <g>
              <text x={retroX + 60} y={retroY - 60} fill={colors.retroreflector} fontSize={12} textAnchor="middle">Retroreflector</text>

              {/* Corner cube visualization */}
              <g transform={`translate(${retroX + 40}, ${retroY - 20})`}>
                {/* Three perpendicular surfaces */}
                <polygon points="0,0 30,-20 30,20" fill="rgba(16, 185, 129, 0.3)" stroke={colors.retroreflector} strokeWidth={2} />
                <polygon points="0,0 30,20 0,40" fill="rgba(16, 185, 129, 0.2)" stroke={colors.retroreflector} strokeWidth={2} />
                <line x1={0} y1={0} x2={0} y2={40} stroke={colors.retroreflector} strokeWidth={2} />
              </g>

              {/* Incident ray to retroreflector */}
              <line
                x1={lightSourceX + 15}
                y1={lightSourceY + 40}
                x2={retroX + 50}
                y2={retroY}
                stroke={colors.lightBeam}
                strokeWidth={3}
                markerEnd="url(#arrowYellow)"
              />

              {/* Internal bounces (simplified) */}
              <polyline
                points={`${retroX + 50},${retroY} ${retroX + 65},${retroY - 10} ${retroX + 60},${retroY + 5} ${retroX + 50},${retroY}`}
                fill="none"
                stroke={colors.lightBeam}
                strokeWidth={2}
                opacity={0.7}
              />

              {/* Returned ray - parallel to incident, going back to source */}
              <line
                x1={retroX + 50}
                y1={retroY}
                x2={lightSourceX + 20}
                y2={lightSourceY + 35}
                stroke={colors.retroreflector}
                strokeWidth={3}
                markerEnd="url(#arrowGreen)"
              />

              {/* Success indicator */}
              <text x={retroX - 20} y={retroY + 50} fill={colors.success} fontSize={10} textAnchor="middle">
                Returns to source!
              </text>
            </g>
          )}

          {/* Arrow markers */}
          <defs>
            <marker id="arrowYellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill={colors.lightBeam} />
            </marker>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill={colors.retroreflector} />
            </marker>
          </defs>

          {/* Legend */}
          <g transform={`translate(20, ${height - 60})`}>
            <rect x={0} y={0} width={15} height={15} fill={colors.lightBeam} rx={2} />
            <text x={20} y={12} fill={colors.textMuted} fontSize={10}>Incoming light</text>
            <rect x={100} y={0} width={15} height={15} fill={colors.retroreflector} rx={2} />
            <text x={120} y={12} fill={colors.textMuted} fontSize={10}>Returned light</text>
          </g>

          {/* Info */}
          <text x={width / 2} y={height - 15} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Source angle: {sourceAngle} deg | Mirror reflects away, Retroreflector returns to source
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: isAnimating ? colors.error : colors.success, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              {isAnimating ? 'Stop' : 'Animate Angle'}
            </button>
            <button
              onClick={() => { setSourceAngle(30); setIsAnimating(false); setShowMirror(true); setShowRetro(true); }}
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
          Light Source Angle: {sourceAngle} degrees
        </label>
        <input type="range" min="10" max="70" step="5" value={sourceAngle} onChange={(e) => setSourceAngle(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={showMirror} onChange={(e) => setShowMirror(e.target.checked)} />
          Show Mirror
        </label>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={showRetro} onChange={(e) => setShowRetro(e.target.checked)} />
          Show Retroreflector
        </label>
      </div>
      <div style={{ background: 'rgba(249, 115, 22, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Notice: The mirror reflects at the opposite angle, missing the source. The retroreflector always returns light to the source!
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
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>How can light return to the source no matter the angle?</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>The magic geometry of retroreflectors</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Bike reflectors, road signs, and even mirrors on the Moon all use a special trick: no matter what angle light comes from, it bounces straight back to the source.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is retroreflection - and it uses clever geometry, not magic.
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
              A light source shining on both a flat mirror (top) and a corner-cube retroreflector (bottom). The yellow lines show incoming light, the green lines show returned light. A viewer/eye is positioned near the light source.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>How do these two reflectors differ?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Retroreflection</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Change the source angle and compare mirror vs retroreflector</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Change the source angle - mirror reflection direction changes</li>
              <li>Notice retroreflector always returns to source</li>
              <li>At steep angles, mirror light goes far from viewer</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'retro_source';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>The retroreflector always sends light back toward its source!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Retroreflection</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Corner-Cube Geometry:</strong> Three mutually perpendicular surfaces form a corner. Light bouncing off all three surfaces has each of its direction components reversed, sending it back parallel to the incoming ray.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Angle Independence:</strong> Unlike a flat mirror (angle in = angle out), a corner cube returns light parallel to its entry regardless of the entry angle.</p>
              <p><strong style={{ color: colors.textPrimary }}>Practical Design:</strong> Bike reflectors use arrays of tiny corner cubes molded into plastic. Road signs use glass microbeads that act as tiny spherical retroreflectors.</p>
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
            <p style={{ color: colors.textSecondary }}>Standing next to a car at night with headlights on...</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Imagine you're a driver with headlights shining on two road signs: one with a regular mirror surface, one with retroreflective material. Both are angled slightly away from perpendicular to your view.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Which sign appears brighter to the driver?</h3>
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Driver Visibility</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Compare what the driver sees from each surface type</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>The mirror reflects light away from the driver at most angles. The retroreflector sends headlight light back to the driver's eyes, appearing brilliantly bright even when the sign isn't perpendicular!</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'retro_bright';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>The retroreflector appears much brighter from the driver's position!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Road Signs Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Source-Observer Coincidence:</strong> In a car, your eyes are very close to the headlights. Retroreflectors return light to the source - which is almost exactly where your eyes are!</p>
              <p><strong style={{ color: colors.textPrimary }}>Practical Result:</strong> Road signs covered with retroreflective material appear to "glow" when your headlights hit them, even though they have no internal light source. The brightness comes from your own headlights being returned directly to you.</p>
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
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Retroreflection keeps us safe and enables precision measurement</p>
          </div>
          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(249, 115, 22, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
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
            <p style={{ color: colors.textSecondary }}>You understand how retroreflectors return light to its source</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Corner-cube geometry reverses ray direction</li>
              <li>Retroreflection is angle-independent</li>
              <li>Driver sees reflected headlights from road signs</li>
              <li>Lunar ranging uses retroreflector arrays</li>
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

export default RetroreflectionRenderer;
