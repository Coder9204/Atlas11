import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 115: BALLISTIC PENDULUM
// Classic experiment to measure projectile velocity using momentum conservation
// Demonstrates inelastic collision and energy conversion
// ============================================================================

interface BallisticPendulumRendererProps {
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

  bullet: '#fbbf24',
  pendulum: '#64748b',
  pendulumHighlight: '#94a3b8',
  string: '#e2e8f0',
  momentum: '#ef4444',
  energy: '#22c55e',

  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const BallisticPendulumRenderer: React.FC<BallisticPendulumRendererProps> = ({
  phase, onPhaseComplete, onPredictionMade,
}) => {
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

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Simulation state
  const [bulletFired, setBulletFired] = useState(false);
  const [bulletEmbedded, setBulletEmbedded] = useState(false);
  const [bulletPos, setBulletPos] = useState(0);
  const [pendulumAngle, setPendulumAngle] = useState(0);
  const [swingPhase, setSwingPhase] = useState<'rest' | 'rising' | 'falling'>('rest');

  // Controls
  const [bulletMass, setBulletMass] = useState(10); // grams
  const [bulletVelocity, setBulletVelocity] = useState(300); // m/s
  const [pendulumMass, setPendulumMass] = useState(2000); // grams

  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Physics calculations
  const calculateSwingHeight = useCallback(() => {
    // Conservation of momentum: m*v = (m+M)*V
    // Conservation of energy: (1/2)(m+M)V² = (m+M)gh
    // h = (m*v)² / (2*g*(m+M)²)
    const m = bulletMass / 1000; // kg
    const M = pendulumMass / 1000; // kg
    const v = bulletVelocity; // m/s
    const g = 9.81;

    const V = (m * v) / (m + M); // velocity after collision
    const h = (V * V) / (2 * g); // height from energy conservation

    return { V, h, maxAngle: Math.asin(Math.min(1, h / 0.5)) };
  }, [bulletMass, bulletVelocity, pendulumMass]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.03);

      if (bulletFired && !bulletEmbedded) {
        setBulletPos(prev => {
          if (prev >= 180) {
            setBulletEmbedded(true);
            setSwingPhase('rising');
            return prev;
          }
          return prev + 15;
        });
      }

      if (bulletEmbedded) {
        const { maxAngle } = calculateSwingHeight();
        const maxDeg = (maxAngle * 180) / Math.PI;

        if (swingPhase === 'rising') {
          setPendulumAngle(prev => {
            if (prev >= maxDeg) {
              setSwingPhase('falling');
              return maxDeg;
            }
            return prev + maxDeg * 0.08;
          });
        } else if (swingPhase === 'falling') {
          setPendulumAngle(prev => {
            if (prev <= 0) {
              setSwingPhase('rest');
              return 0;
            }
            return prev - maxDeg * 0.06;
          });
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating, bulletFired, bulletEmbedded, swingPhase, calculateSwingHeight]);

  const fireBullet = () => {
    setBulletFired(true);
    setBulletEmbedded(false);
    setBulletPos(0);
    setPendulumAngle(0);
    setSwingPhase('rest');
  };

  const reset = () => {
    setBulletFired(false);
    setBulletEmbedded(false);
    setBulletPos(0);
    setPendulumAngle(0);
    setSwingPhase('rest');
  };

  const renderVisualization = () => {
    const { V, h } = calculateSwingHeight();
    const pivotX = 280, pivotY = 60;
    const stringLength = 150;
    const angleRad = (pendulumAngle * Math.PI) / 180;

    const pendulumX = pivotX + Math.sin(angleRad) * stringLength;
    const pendulumY = pivotY + Math.cos(angleRad) * stringLength;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 320" style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}>
          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Ballistic Pendulum
          </text>

          {/* Pivot point and support */}
          <rect x="270" y="40" width="20" height="8" fill={colors.pendulumHighlight} />
          <line x1="280" y1="48" x2="280" y2={pivotY} stroke={colors.pendulumHighlight} strokeWidth="3" />

          {/* String */}
          <line x1={pivotX} y1={pivotY} x2={pendulumX} y2={pendulumY}
            stroke={colors.string} strokeWidth="2" />

          {/* Pendulum block */}
          <rect
            x={pendulumX - 25}
            y={pendulumY - 20}
            width="50" height="40"
            fill={colors.pendulum}
            stroke={colors.pendulumHighlight}
            strokeWidth="2"
            rx="4"
          />
          {bulletEmbedded && (
            <circle cx={pendulumX - 15} cy={pendulumY} r="5" fill={colors.bullet} />
          )}

          {/* Bullet (before embedding) */}
          {bulletFired && !bulletEmbedded && (
            <ellipse cx={50 + bulletPos} cy="210" rx="8" ry="4" fill={colors.bullet} />
          )}

          {/* Gun */}
          <rect x="20" y="200" width="40" height="20" fill={colors.pendulumHighlight} rx="3" />
          {!bulletFired && (
            <ellipse cx="55" cy="210" rx="6" ry="3" fill={colors.bullet} />
          )}

          {/* Height indicator */}
          {bulletEmbedded && pendulumAngle > 5 && (
            <g>
              <line x1="350" y1={pivotY + stringLength} x2="350" y2={pendulumY}
                stroke={colors.energy} strokeWidth="2" strokeDasharray="4,4" />
              <text x="360" y={(pivotY + stringLength + pendulumY) / 2} fill={colors.energy} fontSize="10">
                h={h.toFixed(3)}m
              </text>
            </g>
          )}

          {/* Info panel */}
          <g transform="translate(20, 250)">
            <rect x="0" y="0" width="360" height="55" fill={colors.bgCard} rx="6" />
            <text x="10" y="18" fill={colors.textMuted} fontSize="10">Bullet: {bulletMass}g @ {bulletVelocity}m/s</text>
            <text x="10" y="35" fill={colors.textMuted} fontSize="10">Block: {pendulumMass}g</text>
            <text x="200" y="18" fill={colors.energy} fontSize="10">Combined velocity: {V.toFixed(2)} m/s</text>
            <text x="200" y="35" fill={colors.energy} fontSize="10">Max height: {(h * 100).toFixed(2)} cm</text>
            <text x="10" y="50" fill={colors.momentum} fontSize="10">
              Momentum conserved: {(bulletMass * bulletVelocity / 1000).toFixed(2)} = {((bulletMass + pendulumMass) * V / 1000).toFixed(2)} kg·m/s
            </text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <button onClick={bulletFired ? reset : fireBullet}
        style={{ padding: '14px', background: bulletFired ? 'linear-gradient(135deg, #64748b, #475569)' : 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
        {bulletFired ? '🔄 Reset' : '🔫 Fire!'}
      </button>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>Bullet Mass: {bulletMass}g</label>
        <input type="range" min="5" max="50" value={bulletMass} onChange={(e) => { setBulletMass(Number(e.target.value)); reset(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>Bullet Velocity: {bulletVelocity} m/s</label>
        <input type="range" min="100" max="500" value={bulletVelocity} onChange={(e) => { setBulletVelocity(Number(e.target.value)); reset(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>Pendulum Mass: {pendulumMass}g</label>
        <input type="range" min="500" max="5000" value={pendulumMass} onChange={(e) => { setPendulumMass(Number(e.target.value)); reset(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>
    </div>
  );

  const predictions = [
    { id: 'energy', text: 'Use conservation of energy throughout the process' },
    { id: 'momentum', text: 'Use conservation of momentum (collision) then energy (swing)', correct: true },
    { id: 'neither', text: 'Neither conservation law applies here' },
    { id: 'force', text: 'Calculate using F=ma directly' },
  ];

  const twistPredictions = [
    { id: 'all', text: 'Yes - all kinetic energy becomes potential energy' },
    { id: 'most', text: 'Most of it - some is lost to friction' },
    { id: 'little', text: 'Very little - most is lost as heat in the inelastic collision', correct: true },
    { id: 'none', text: 'None - energy disappears' },
  ];

  const testQuestions = [
    { id: 1, question: 'Why can\'t we use energy conservation during the collision?', options: [
      { id: 'a', text: 'Energy is created' },
      { id: 'b', text: 'It\'s an inelastic collision - kinetic energy is lost to heat/deformation', correct: true },
      { id: 'c', text: 'The pendulum is too heavy' },
      { id: 'd', text: 'We actually can use it' },
    ]},
    { id: 2, question: 'What IS conserved during the bullet-block collision?', options: [
      { id: 'a', text: 'Kinetic energy' },
      { id: 'b', text: 'Potential energy' },
      { id: 'c', text: 'Momentum', correct: true },
      { id: 'd', text: 'Nothing' },
    ]},
    { id: 3, question: 'What conservation law applies during the swing?', options: [
      { id: 'a', text: 'Momentum' },
      { id: 'b', text: 'Mechanical energy (KE ↔ PE)', correct: true },
      { id: 'c', text: 'Neither' },
      { id: 'd', text: 'Mass' },
    ]},
    { id: 4, question: 'If you double the bullet mass (same velocity), swing height:', options: [
      { id: 'a', text: 'Doubles' },
      { id: 'b', text: 'Quadruples' },
      { id: 'c', text: 'Less than doubles (depends on ratio m/(m+M))', correct: true },
      { id: 'd', text: 'Stays the same' },
    ]},
    { id: 5, question: 'The ballistic pendulum was historically used for:', options: [
      { id: 'a', text: 'Entertainment' },
      { id: 'b', text: 'Measuring bullet velocities', correct: true },
      { id: 'c', text: 'Timekeeping' },
      { id: 'd', text: 'Measuring gravity' },
    ]},
    { id: 6, question: 'What type of collision is bullet embedding in the block?', options: [
      { id: 'a', text: 'Perfectly elastic' },
      { id: 'b', text: 'Perfectly inelastic', correct: true },
      { id: 'c', text: 'Partially elastic' },
      { id: 'd', text: 'Explosive' },
    ]},
    { id: 7, question: 'A heavier pendulum block means:', options: [
      { id: 'a', text: 'Higher swing (more energy absorbed)' },
      { id: 'b', text: 'Lower swing (momentum shared with more mass)', correct: true },
      { id: 'c', text: 'Same swing height' },
      { id: 'd', text: 'The bullet bounces off' },
    ]},
    { id: 8, question: 'What percentage of KE is typically lost in the collision?', options: [
      { id: 'a', text: 'About 1%' },
      { id: 'b', text: 'About 50%' },
      { id: 'c', text: 'Over 99% (when M >> m)', correct: true },
      { id: 'd', text: '0%' },
    ]},
    { id: 9, question: 'Forensic ballistics uses similar principles to:', options: [
      { id: 'a', text: 'Identify bullet types from wounds', correct: true },
      { id: 'b', text: 'Make bullets travel faster' },
      { id: 'c', text: 'Design pendulum clocks' },
      { id: 'd', text: 'Measure gravity' },
    ]},
    { id: 10, question: 'The combined momentum before and after collision is:', options: [
      { id: 'a', text: 'Greater after' },
      { id: 'b', text: 'Less after' },
      { id: 'c', text: 'Equal (momentum is conserved)', correct: true },
      { id: 'd', text: 'Zero' },
    ]},
  ];

  const transferApplications = [
    { id: 0, title: '🔫 Forensic Ballistics', description: 'Forensic scientists use momentum principles to analyze crime scenes, determining bullet velocities and trajectories from impact evidence.', insight: 'The same physics helps reconstruct car crashes from damage patterns.' },
    { id: 1, title: '🚗 Car Crash Analysis', description: 'Accident reconstructionists use conservation of momentum to determine vehicle speeds before collision from post-crash positions.', insight: 'Crumple zones are designed using inelastic collision physics to absorb energy and protect passengers.' },
    { id: 2, title: '⚾ Sports Physics', description: 'When a baseball bat hits a ball, momentum is transferred. The "sweet spot" maximizes energy transfer to the ball.', insight: 'A heavier bat transfers more momentum but is harder to swing fast - there\'s an optimal mass!' },
    { id: 3, title: '🛡️ Armor Testing', description: 'Ballistic armor is tested by measuring how it absorbs and spreads impact momentum. The goal is to stop bullets without transferring too much force to the wearer.', insight: 'Modern body armor uses multiple layers that deform, extending the collision time and reducing peak force.' },
  ];

  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
      {showButton && (
        <button onClick={() => onPhaseComplete?.()} disabled={!buttonEnabled}
          style={{ width: '100%', padding: '14px 24px', background: buttonEnabled ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(71, 85, 105, 0.5)', border: 'none', borderRadius: '12px', color: buttonEnabled ? colors.textPrimary : colors.textMuted, fontSize: '16px', fontWeight: 'bold', cursor: buttonEnabled ? 'pointer' : 'not-allowed' }}>
          {buttonText}
        </button>
      )}
    </div>
  );

  // Phase renderers
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>🎯 Catch That Bullet!</h1>
            <p style={{ color: colors.accent, fontSize: '18px' }}>Game 115: Ballistic Pendulum</p>
          </div>
          {renderVisualization()}
          <div style={{ padding: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>🤯 Measuring the Invisible</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                How do you measure how fast a bullet travels? In the 1700s, before electronics, scientists
                invented the <strong style={{ color: colors.bullet }}>ballistic pendulum</strong> - fire a
                bullet into a block, measure how high it swings!
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
              A bullet embeds in a hanging block. We measure how high the block swings.
              How do we calculate the bullet's original velocity?
            </p>
          </div>
          <div style={{ padding: '0 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Which method works?
            </h3>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{ display: 'block', width: '100%', padding: '16px', marginBottom: '12px', background: prediction === p.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.7)', border: prediction === p.id ? '2px solid #fbbf24' : '2px solid transparent', borderRadius: '12px', color: colors.textPrimary, fontSize: '14px', textAlign: 'left', cursor: 'pointer' }}>
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
            <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>🔬 Fire Away!</h2>
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
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '24px' }}>
              {isCorrect ? 'Excellent!' : 'Two-Step Solution!'}
            </h2>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📚 The Key Insight:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              <strong style={{ color: colors.momentum }}>Step 1 - Collision:</strong> Momentum conserved (energy is NOT - it's inelastic!)<br />
              <strong style={{ color: colors.energy }}>Step 2 - Swing:</strong> Energy conserved (KE → PE)<br /><br />
              We CANNOT use energy conservation through the collision because most kinetic energy becomes heat!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  if (phase === 'twist_predict' || phase === 'twist_play' || phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>🌀 Energy Mystery!</h2>
          </div>
          {renderVisualization()}
          {phase === 'twist_predict' && (
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '16px' }}>
                How much of the bullet's KE ends up as the pendulum's PE?
              </h3>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                  style={{ display: 'block', width: '100%', padding: '14px', marginBottom: '10px', background: twistPrediction === p.id ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(51, 65, 85, 0.7)', border: 'none', borderRadius: '10px', color: colors.textPrimary, cursor: 'pointer' }}>
                  {p.text}
                </button>
              ))}
            </div>
          )}
          {(phase === 'twist_play' || phase === 'twist_review') && renderControls()}
          {phase === 'twist_review' && (
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                With a 10g bullet and 2kg block, over <strong style={{ color: colors.error }}>99.5%</strong> of the
                kinetic energy is lost as heat! Only a tiny fraction remains to swing the pendulum.
              </p>
            </div>
          )}
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
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: testAnswers[q.id] === opt.id ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '8px', color: colors.textSecondary, textAlign: 'left', cursor: 'pointer' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {allAnswered && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: colors.bgDark }}>
            <button onClick={() => setTestSubmitted(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
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
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Ballistics Master!</h1>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary }}>🎓 Key Learnings:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
              <li>Inelastic collisions: momentum conserved, energy NOT</li>
              <li>Two-step analysis: collision then swing</li>
              <li>Most KE lost as heat in collision</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  return <div style={{ padding: '20px' }}><p style={{ color: colors.textSecondary }}>Loading: {phase}</p></div>;
};

export default BallisticPendulumRenderer;
