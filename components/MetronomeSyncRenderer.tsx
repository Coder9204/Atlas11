import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 116: METRONOME SYNCHRONIZATION
// Multiple metronomes on a movable platform spontaneously synchronize
// Demonstrates coupled oscillators and self-organization
// ============================================================================

interface MetronomeSyncRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  metronome1: '#ef4444',
  metronome2: '#22c55e',
  metronome3: '#3b82f6',
  metronome4: '#f59e0b',
  platform: '#64748b',

  accent: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const MetronomeSyncRenderer: React.FC<MetronomeSyncRendererProps> = ({
  phase, onPhaseComplete, onPredictionMade,
}) => {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Metronome states (phases)
  const [metronomes, setMetronomes] = useState([
    { phase: 0, frequency: 1.0 },
    { phase: Math.PI * 0.5, frequency: 1.0 },
    { phase: Math.PI, frequency: 1.0 },
    { phase: Math.PI * 1.5, frequency: 1.0 },
  ]);

  // Controls
  const [couplingStrength, setCouplingStrength] = useState(50);
  const [numMetronomes, setNumMetronomes] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [platformOffset, setPlatformOffset] = useState(0);

  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Synchronization calculation
  const calculateSyncLevel = useCallback(() => {
    const phases = metronomes.slice(0, numMetronomes).map(m => m.phase);
    let sumCos = 0, sumSin = 0;
    phases.forEach(p => {
      sumCos += Math.cos(p);
      sumSin += Math.sin(p);
    });
    return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / phases.length;
  }, [metronomes, numMetronomes]);

  // Animation & physics
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);

      if (isRunning) {
        setMetronomes(prev => {
          const coupling = couplingStrength / 1000;
          const newMetronomes = [...prev];

          // Calculate mean phase for coupling
          let sumSin = 0, sumCos = 0;
          for (let i = 0; i < numMetronomes; i++) {
            sumSin += Math.sin(newMetronomes[i].phase);
            sumCos += Math.cos(newMetronomes[i].phase);
          }

          // Update each metronome
          for (let i = 0; i < numMetronomes; i++) {
            const naturalFreq = newMetronomes[i].frequency * 2 * Math.PI;
            // Kuramoto model: phase advances + coupling toward mean
            const phaseChange = naturalFreq * 0.05 + coupling * (
              sumSin * Math.cos(newMetronomes[i].phase) -
              sumCos * Math.sin(newMetronomes[i].phase)
            );
            newMetronomes[i] = {
              ...newMetronomes[i],
              phase: (newMetronomes[i].phase + phaseChange) % (2 * Math.PI),
            };
          }

          return newMetronomes;
        });

        // Platform motion (average of metronome positions)
        const avgPhase = metronomes.slice(0, numMetronomes)
          .reduce((sum, m) => sum + Math.sin(m.phase), 0) / numMetronomes;
        setPlatformOffset(avgPhase * 5 * (couplingStrength / 50));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, isRunning, couplingStrength, numMetronomes, metronomes]);

  const startSimulation = () => {
    // Randomize starting phases
    setMetronomes(prev => prev.map(m => ({
      ...m,
      phase: Math.random() * 2 * Math.PI,
    })));
    setIsRunning(true);
  };

  const reset = () => {
    setIsRunning(false);
    setMetronomes([
      { phase: 0, frequency: 1.0 },
      { phase: Math.PI * 0.5, frequency: 1.0 },
      { phase: Math.PI, frequency: 1.0 },
      { phase: Math.PI * 1.5, frequency: 1.0 },
    ]);
    setPlatformOffset(0);
  };

  const metronomeColors = [colors.metronome1, colors.metronome2, colors.metronome3, colors.metronome4];

  const renderVisualization = () => {
    const syncLevel = calculateSyncLevel();

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 320" style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}>
          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Metronome Synchronization
          </text>

          {/* Platform (movable) */}
          <g transform={`translate(${platformOffset}, 0)`}>
            <rect x="40" y="220" width="320" height="15" fill={colors.platform} rx="3" />

            {/* Rollers under platform */}
            <circle cx="80" cy="240" r="8" fill={colors.textMuted} />
            <circle cx="200" cy="240" r="8" fill={colors.textMuted} />
            <circle cx="320" cy="240" r="8" fill={colors.textMuted} />

            {/* Metronomes */}
            {metronomes.slice(0, numMetronomes).map((m, i) => {
              const baseX = 80 + i * (280 / numMetronomes);
              const angle = Math.sin(m.phase) * 30;
              const pendulumLength = 100;

              return (
                <g key={i} transform={`translate(${baseX}, 220)`}>
                  {/* Base */}
                  <rect x="-20" y="-30" width="40" height="30" fill={colors.bgCard} stroke={metronomeColors[i]} strokeWidth="2" rx="3" />

                  {/* Pendulum arm */}
                  <g transform={`rotate(${angle}, 0, -30)`}>
                    <line x1="0" y1="-30" x2="0" y2={-30 - pendulumLength}
                      stroke={metronomeColors[i]} strokeWidth="3" />
                    {/* Weight */}
                    <circle cx="0" cy={-30 - pendulumLength * 0.7} r="12" fill={metronomeColors[i]} />
                  </g>

                  {/* Pivot */}
                  <circle cx="0" cy="-30" r="4" fill={colors.textMuted} />
                </g>
              );
            })}
          </g>

          {/* Ground line */}
          <line x1="20" y1="250" x2="380" y2="250" stroke={colors.textMuted} strokeWidth="2" />

          {/* Sync meter */}
          <g transform="translate(20, 270)">
            <rect x="0" y="0" width="360" height="40" fill={colors.bgCard} rx="6" />
            <text x="10" y="18" fill={colors.textMuted} fontSize="10">Synchronization Level:</text>
            <rect x="10" y="24" width="280" height="10" fill="rgba(71, 85, 105, 0.5)" rx="5" />
            <rect x="10" y="24" width={280 * syncLevel} height="10"
              fill={syncLevel > 0.9 ? colors.success : syncLevel > 0.7 ? colors.warning : colors.error} rx="5" />
            <text x="300" y="33" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
              {(syncLevel * 100).toFixed(0)}%
            </text>
          </g>

          {/* Phase diagram (small) */}
          <g transform="translate(340, 60)">
            <circle cx="0" cy="0" r="30" fill="none" stroke={colors.textMuted} strokeWidth="1" />
            {metronomes.slice(0, numMetronomes).map((m, i) => (
              <circle key={i}
                cx={Math.cos(m.phase - Math.PI/2) * 25}
                cy={Math.sin(m.phase - Math.PI/2) * 25}
                r="5" fill={metronomeColors[i]} />
            ))}
            <text x="0" y="45" textAnchor="middle" fill={colors.textMuted} fontSize="8">Phase</text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <button onClick={isRunning ? reset : startSimulation}
        style={{ padding: '14px', background: isRunning ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
        {isRunning ? '🔄 Reset' : '▶️ Start (Random Phases)'}
      </button>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>🔗 Platform Coupling: {couplingStrength}%</label>
        <input type="range" min="0" max="100" value={couplingStrength}
          onChange={(e) => setCouplingStrength(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Fixed (no sync)</span>
          <span>Loose (fast sync)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>🎵 Number of Metronomes: {numMetronomes}</label>
        <input type="range" min="2" max="4" value={numMetronomes}
          onChange={(e) => { setNumMetronomes(Number(e.target.value)); reset(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>
    </div>
  );

  const predictions = [
    { id: 'chaos', text: 'They continue swinging randomly forever' },
    { id: 'stop', text: 'They eventually all stop' },
    { id: 'sync', text: 'They spontaneously synchronize!', correct: true },
    { id: 'faster', text: 'One speeds up and the others slow down' },
  ];

  const twistPredictions = [
    { id: 'magnetic', text: 'Magnetic attraction between the metronomes' },
    { id: 'sound', text: 'Sound waves from the ticking' },
    { id: 'platform', text: 'The movable platform transfers momentum between them', correct: true },
    { id: 'air', text: 'Air currents push them together' },
  ];

  const testQuestions = [
    { id: 1, question: 'What allows metronomes to synchronize?', options: [
      { id: 'a', text: 'Direct contact between them' },
      { id: 'b', text: 'A shared movable platform that transfers momentum', correct: true },
      { id: 'c', text: 'Magnetic fields' },
      { id: 'd', text: 'Sound waves' },
    ]},
    { id: 2, question: 'If the platform were completely fixed (bolted down), would they sync?', options: [
      { id: 'a', text: 'Yes, faster' },
      { id: 'b', text: 'No - no coupling means no synchronization', correct: true },
      { id: 'c', text: 'Yes, but slower' },
      { id: 'd', text: 'They would sync randomly' },
    ]},
    { id: 3, question: 'This phenomenon is an example of:', options: [
      { id: 'a', text: 'Chaos theory' },
      { id: 'b', text: 'Self-organization in coupled oscillators', correct: true },
      { id: 'c', text: 'Quantum mechanics' },
      { id: 'd', text: 'Magnetic resonance' },
    ]},
    { id: 4, question: 'More coupling (looser platform) leads to:', options: [
      { id: 'a', text: 'Slower synchronization' },
      { id: 'b', text: 'Faster synchronization', correct: true },
      { id: 'c', text: 'No change' },
      { id: 'd', text: 'The metronomes stop' },
    ]},
    { id: 5, question: 'The mathematical model for this is called:', options: [
      { id: 'a', text: 'Newton\'s laws' },
      { id: 'b', text: 'The Kuramoto model', correct: true },
      { id: 'c', text: 'Einstein\'s equations' },
      { id: 'd', text: 'The Schrödinger equation' },
    ]},
    { id: 6, question: 'Fireflies flashing in unison use:', options: [
      { id: 'a', text: 'A leader firefly' },
      { id: 'b', text: 'Similar coupled oscillator synchronization', correct: true },
      { id: 'c', text: 'Radio waves' },
      { id: 'd', text: 'Predetermined genetic timing' },
    ]},
    { id: 7, question: 'What determines the final synchronized frequency?', options: [
      { id: 'a', text: 'The fastest metronome' },
      { id: 'b', text: 'The slowest metronome' },
      { id: 'c', text: 'Close to the average natural frequency', correct: true },
      { id: 'd', text: 'Completely random' },
    ]},
    { id: 8, question: 'Can metronomes with different natural frequencies synchronize?', options: [
      { id: 'a', text: 'Never' },
      { id: 'b', text: 'Yes, if coupling is strong enough', correct: true },
      { id: 'c', text: 'Only if exactly the same' },
      { id: 'd', text: 'Only in space' },
    ]},
    { id: 9, question: 'The human heart\'s pacemaker cells synchronize using:', options: [
      { id: 'a', text: 'Electrical coupling similar to metronomes', correct: true },
      { id: 'b', text: 'A single master cell' },
      { id: 'c', text: 'Brain signals' },
      { id: 'd', text: 'They don\'t synchronize' },
    ]},
    { id: 10, question: 'Why is this called "self-organization"?', options: [
      { id: 'a', text: 'Someone organizes them' },
      { id: 'b', text: 'Order emerges spontaneously without external control', correct: true },
      { id: 'c', text: 'The metronomes have AI' },
      { id: 'd', text: 'It\'s predetermined' },
    ]},
  ];

  const transferApplications = [
    { id: 0, title: '💓 Heart Pacemaker Cells', description: 'Your heart has thousands of pacemaker cells that synchronize through electrical coupling. When they fall out of sync, it causes arrhythmia.', insight: 'Pacemaker devices work by providing a regular pulse to re-synchronize heart cells.' },
    { id: 1, title: '🌉 Millennium Bridge', description: 'In 2000, London\'s Millennium Bridge swayed dangerously as pedestrians unconsciously synchronized their footsteps with the bridge motion - a feedback loop!', insight: 'Engineers added dampers to break the coupling and prevent synchronization.' },
    { id: 2, title: '🔦 Firefly Synchronization', description: 'Certain firefly species flash in perfect unison across entire forests. Each firefly adjusts its timing based on neighbors\' flashes.', insight: 'Scientists use firefly synchronization as a model for distributed computing algorithms!' },
    { id: 3, title: '🌐 Power Grid Synchronization', description: 'All generators in a power grid must be phase-locked at exactly 60 Hz (or 50 Hz). Loss of synchronization can cause cascading blackouts.', insight: 'The 2003 Northeast blackout affected 55 million people when generators fell out of sync.' },
  ];

  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
      {showButton && (
        <button onClick={() => onPhaseComplete?.()} disabled={!buttonEnabled}
          style={{ width: '100%', padding: '14px 24px', background: buttonEnabled ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(71, 85, 105, 0.5)', border: 'none', borderRadius: '12px', color: buttonEnabled ? colors.textPrimary : colors.textMuted, fontSize: '16px', fontWeight: 'bold', cursor: buttonEnabled ? 'pointer' : 'not-allowed' }}>
          {buttonText}
        </button>
      )}
    </div>
  );

  // Phase renderers (condensed)
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>🎵 The Dancing Metronomes</h1>
            <p style={{ color: colors.accent, fontSize: '18px' }}>Game 116: Metronome Synchronization</p>
          </div>
          {renderVisualization()}
          <div style={{ padding: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>🤯 Spontaneous Order!</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Place several metronomes on a movable board, start them at random times,
                and watch them <strong style={{ color: colors.accent }}>spontaneously synchronize</strong> within minutes!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Multiple metronomes set to the same tempo are placed on a platform that can slide freely.
              They start at completely random phases. What happens over time?
            </p>
          </div>
          <div style={{ padding: '0 16px' }}>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{ display: 'block', width: '100%', padding: '16px', marginBottom: '12px', background: prediction === p.id ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(51, 65, 85, 0.7)', border: prediction === p.id ? '2px solid #c4b5fd' : '2px solid transparent', borderRadius: '12px', color: colors.textPrimary, textAlign: 'left', cursor: 'pointer' }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>🔬 Watch Them Sync!</h2>
          </div>
          {renderVisualization()}
          {renderControls()}
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  if (phase === 'review') {
    const isCorrect = predictions.find(p => p.id === prediction)?.correct;
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>{isCorrect ? '🎯' : '💡'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '24px' }}>{isCorrect ? 'Excellent!' : 'Amazing Phenomenon!'}</h2>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The metronomes <strong style={{ color: colors.accent }}>synchronize through the platform</strong>!
              Each swing pushes the platform slightly, which in turn nudges all the other metronomes.
              Over time, this coupling brings them into phase!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  // Twist phases
  if (phase === 'twist_predict' || phase === 'twist_play' || phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>🌀 The Coupling Mechanism</h2>
          </div>
          {renderVisualization()}
          {phase === 'twist_predict' && (
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '16px' }}>What physically couples the metronomes?</h3>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                  style={{ display: 'block', width: '100%', padding: '14px', marginBottom: '10px', background: twistPrediction === p.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.7)', border: 'none', borderRadius: '10px', color: colors.textPrimary, cursor: 'pointer' }}>
                  {p.text}
                </button>
              ))}
            </div>
          )}
          {(phase === 'twist_play' || phase === 'twist_review') && renderControls()}
        </div>
        {renderBottomBar(true, phase === 'twist_predict' ? !!twistPrediction : true,
          phase === 'twist_predict' ? 'See The Answer →' : phase === 'twist_play' ? 'Learn More →' : 'See Applications →')}
      </div>
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>🌍 Real Applications</h2>
          </div>
          {transferApplications.map((app) => (
            <div key={app.id} onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
              style={{ background: transferCompleted.has(app.id) ? 'rgba(16, 185, 129, 0.1)' : colors.bgCard, border: transferCompleted.has(app.id) ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid transparent', margin: '12px 16px', padding: '16px', borderRadius: '12px', cursor: 'pointer' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>{app.description}</p>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px' }}>{correctCount >= 8 ? '🏆' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>{Math.round(correctCount / 10 * 100)}%</h2>
            </div>
          </div>
          {renderBottomBar(true, true, 'Complete! 🎉')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>📝 Test</h2>
          </div>
          {testQuestions.map((q, idx) => (
            <div key={q.id} style={{ background: colors.bgCard, margin: '12px 16px', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{idx + 1}. {q.question}</p>
              {q.options.map(opt => (
                <button key={opt.id} onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: testAnswers[q.id] === opt.id ? 'rgba(168, 85, 247, 0.3)' : 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '8px', color: colors.textSecondary, textAlign: 'left', cursor: 'pointer' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {allAnswered && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: colors.bgDark }}>
            <button onClick={() => setTestSubmitted(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Synchronization Master!</h1>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary }}>🎓 Key Learnings:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
              <li>Coupled oscillators spontaneously synchronize</li>
              <li>A shared platform transfers momentum</li>
              <li>Same physics in hearts, fireflies, power grids</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  return <div style={{ padding: '20px' }}><p style={{ color: colors.textSecondary }}>Loading: {phase}</p></div>;
};

export default MetronomeSyncRenderer;
