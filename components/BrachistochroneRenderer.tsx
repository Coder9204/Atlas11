import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 114: BRACHISTOCHRONE
// The curve of fastest descent - a cycloid, not a straight line!
// Demonstrates calculus of variations, energy/time tradeoffs
// ============================================================================

interface BrachistochroneRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Path colors
  straight: '#ef4444',
  parabola: '#f59e0b',
  cycloid: '#22c55e',

  // Ball colors
  ball: '#60a5fa',
  ballHighlight: '#93c5fd',

  accent: '#22c55e',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const BrachistochroneRenderer: React.FC<BrachistochroneRendererProps> = ({
  phase,
  onPhaseComplete,
  onPredictionMade,
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

  // Race state
  const [isRacing, setIsRacing] = useState(false);
  const [raceProgress, setRaceProgress] = useState({ straight: 0, parabola: 0, cycloid: 0 });
  const [winner, setWinner] = useState<string | null>(null);

  // Controls
  const [endPointX, setEndPointX] = useState(80);
  const [endPointY, setEndPointY] = useState(60);

  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Path calculations
  const startX = 50, startY = 80;
  const endX = 50 + (endPointX / 100) * 280;
  const endY = 80 + (endPointY / 100) * 180;

  // Generate path points
  const getCycloidPath = useCallback(() => {
    const points = [];
    const dx = endX - startX;
    const dy = endY - startY;

    for (let t = 0; t <= Math.PI; t += 0.1) {
      const x = startX + (dx / Math.PI) * (t - Math.sin(t) * 0.5);
      const y = startY + (dy / Math.PI) * (1 - Math.cos(t)) * 1.2;
      points.push({ x, y });
    }
    points.push({ x: endX, y: endY });
    return points;
  }, [endX, endY]);

  const getParabolaPath = useCallback(() => {
    const points = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * (t * t * 0.7 + t * 0.3);
      points.push({ x, y });
    }
    return points;
  }, [endX, endY]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.02);

      if (isRacing && !winner) {
        setRaceProgress(prev => {
          // Cycloid is fastest, straight is slowest
          const cycloidSpeed = 0.025;
          const parabolaSpeed = 0.020;
          const straightSpeed = 0.018;

          const newCycloid = Math.min(1, prev.cycloid + cycloidSpeed);
          const newParabola = Math.min(1, prev.parabola + parabolaSpeed);
          const newStraight = Math.min(1, prev.straight + straightSpeed);

          if (newCycloid >= 1 && !winner) {
            setWinner('cycloid');
          }

          return { straight: newStraight, parabola: newParabola, cycloid: newCycloid };
        });
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating, isRacing, winner]);

  const startRace = () => {
    setRaceProgress({ straight: 0, parabola: 0, cycloid: 0 });
    setWinner(null);
    setIsRacing(true);
  };

  const resetRace = () => {
    setIsRacing(false);
    setRaceProgress({ straight: 0, parabola: 0, cycloid: 0 });
    setWinner(null);
  };

  const renderVisualization = (interactive: boolean) => {
    const cycloidPath = getCycloidPath();
    const parabolaPath = getParabolaPath();

    // Ball positions along paths
    const straightBall = {
      x: startX + (endX - startX) * raceProgress.straight,
      y: startY + (endY - startY) * raceProgress.straight,
    };

    const parabolaIdx = Math.floor(raceProgress.parabola * (parabolaPath.length - 1));
    const parabolaBall = parabolaPath[parabolaIdx] || { x: startX, y: startY };

    const cycloidIdx = Math.floor(raceProgress.cycloid * (cycloidPath.length - 1));
    const cycloidBall = cycloidPath[cycloidIdx] || { x: startX, y: startY };

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 320" style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}>
          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Brachistochrone Problem
          </text>
          <text x="200" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            Which path is fastest?
          </text>

          {/* Start point */}
          <circle cx={startX} cy={startY} r="8" fill={colors.textMuted} />
          <text x={startX - 15} y={startY - 12} fill={colors.textMuted} fontSize="10">Start</text>

          {/* End point */}
          <circle cx={endX} cy={endY} r="8" fill={colors.textMuted} />
          <text x={endX + 5} y={endY + 15} fill={colors.textMuted} fontSize="10">End</text>

          {/* Straight line path */}
          <line x1={startX} y1={startY} x2={endX} y2={endY}
            stroke={colors.straight} strokeWidth="3" strokeDasharray="8,4" />

          {/* Parabola path */}
          <path
            d={`M ${startX},${startY} ${parabolaPath.map(p => `L ${p.x},${p.y}`).join(' ')}`}
            fill="none" stroke={colors.parabola} strokeWidth="3" strokeDasharray="5,3" />

          {/* Cycloid path */}
          <path
            d={`M ${startX},${startY} ${cycloidPath.map(p => `L ${p.x},${p.y}`).join(' ')}`}
            fill="none" stroke={colors.cycloid} strokeWidth="3" />

          {/* Balls */}
          {isRacing && (
            <>
              <circle cx={straightBall.x} cy={straightBall.y} r="10" fill={colors.straight} />
              <circle cx={parabolaBall.x} cy={parabolaBall.y} r="10" fill={colors.parabola} />
              <circle cx={cycloidBall.x} cy={cycloidBall.y} r="10" fill={colors.cycloid} />
            </>
          )}

          {/* Legend */}
          <g transform="translate(20, 260)">
            <rect x="0" y="0" width="360" height="50" fill={colors.bgCard} rx="6" />

            <line x1="15" y1="18" x2="45" y2="18" stroke={colors.straight} strokeWidth="3" strokeDasharray="8,4" />
            <text x="55" y="22" fill={colors.straight} fontSize="11">Straight</text>

            <line x1="120" y1="18" x2="150" y2="18" stroke={colors.parabola} strokeWidth="3" strokeDasharray="5,3" />
            <text x="160" y="22" fill={colors.parabola} fontSize="11">Parabola</text>

            <line x1="240" y1="18" x2="270" y2="18" stroke={colors.cycloid} strokeWidth="3" />
            <text x="280" y="22" fill={colors.cycloid} fontSize="11">Cycloid</text>

            {winner && (
              <text x="180" y="42" textAnchor="middle" fill={colors.cycloid} fontSize="12" fontWeight="bold">
                🏆 CYCLOID WINS!
              </text>
            )}
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <button
        onClick={isRacing ? resetRace : startRace}
        style={{
          padding: '14px',
          background: isRacing ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
        }}
      >
        {isRacing ? '🔄 Reset Race' : '🏁 Start Race!'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📏 Horizontal Distance: {endPointX}%
        </label>
        <input type="range" min="40" max="100" value={endPointX}
          onChange={(e) => { setEndPointX(Number(e.target.value)); resetRace(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Vertical Drop: {endPointY}%
        </label>
        <input type="range" min="30" max="100" value={endPointY}
          onChange={(e) => { setEndPointY(Number(e.target.value)); resetRace(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>
    </div>
  );

  const predictions = [
    { id: 'straight', text: 'The straight line - shortest distance!' },
    { id: 'parabola', text: 'The parabola - smooth curve' },
    { id: 'cycloid', text: 'The steeper curve (cycloid) - even though longer!', correct: true },
    { id: 'same', text: 'All paths take the same time' },
  ];

  const twistPredictions = [
    { id: 'newton', text: 'Leonardo da Vinci' },
    { id: 'bernoulli', text: 'Johann Bernoulli (who challenged other mathematicians)', correct: true },
    { id: 'galileo', text: 'Galileo Galilei' },
    { id: 'einstein', text: 'Albert Einstein' },
  ];

  const testQuestions = [
    { id: 1, question: 'What shape is the brachistochrone curve?', options: [
      { id: 'a', text: 'A straight line' },
      { id: 'b', text: 'A parabola' },
      { id: 'c', text: 'A cycloid (path traced by rolling circle)', correct: true },
      { id: 'd', text: 'A circle arc' },
    ]},
    { id: 2, question: 'Why is the straight line NOT the fastest path?', options: [
      { id: 'a', text: 'Gravity works differently on straight lines' },
      { id: 'b', text: 'The steeper initial drop accelerates the ball faster', correct: true },
      { id: 'c', text: 'Air resistance is higher on straight lines' },
      { id: 'd', text: 'The straight line is actually fastest' },
    ]},
    { id: 3, question: 'The brachistochrone problem was first solved in:', options: [
      { id: 'a', text: '1996' },
      { id: 'b', text: '1896' },
      { id: 'c', text: '1696', correct: true },
      { id: 'd', text: '1596' },
    ]},
    { id: 4, question: 'What branch of mathematics was developed to solve this?', options: [
      { id: 'a', text: 'Algebra' },
      { id: 'b', text: 'Geometry' },
      { id: 'c', text: 'Calculus of variations', correct: true },
      { id: 'd', text: 'Trigonometry' },
    ]},
    { id: 5, question: 'Who famously solved this problem overnight?', options: [
      { id: 'a', text: 'Isaac Newton', correct: true },
      { id: 'b', text: 'Galileo Galilei' },
      { id: 'c', text: 'Albert Einstein' },
      { id: 'd', text: 'Stephen Hawking' },
    ]},
    { id: 6, question: 'A cycloid is the path traced by:', options: [
      { id: 'a', text: 'A swinging pendulum' },
      { id: 'b', text: 'A point on a rolling circle', correct: true },
      { id: 'c', text: 'A falling raindrop' },
      { id: 'd', text: 'A planet orbiting the sun' },
    ]},
    { id: 7, question: 'The word "brachistochrone" comes from Greek meaning:', options: [
      { id: 'a', text: 'Fastest time', correct: true },
      { id: 'b', text: 'Shortest distance' },
      { id: 'c', text: 'Rolling ball' },
      { id: 'd', text: 'Curved path' },
    ]},
    { id: 8, question: 'The tautochrone property of a cycloid means:', options: [
      { id: 'a', text: 'All balls reach the bottom in the same time regardless of starting point', correct: true },
      { id: 'b', text: 'The path is the same length as a straight line' },
      { id: 'c', text: 'The ball speeds up at a constant rate' },
      { id: 'd', text: 'The path never curves' },
    ]},
    { id: 9, question: 'Friction in real-world scenarios would:', options: [
      { id: 'a', text: 'Make the straight line fastest' },
      { id: 'b', text: 'Still favor the cycloid but less dramatically', correct: true },
      { id: 'c', text: 'Make all paths equal' },
      { id: 'd', text: 'Make the ball go faster' },
    ]},
    { id: 10, question: 'This problem is an example of:', options: [
      { id: 'a', text: 'Simple mechanics' },
      { id: 'b', text: 'Optimization under constraints', correct: true },
      { id: 'c', text: 'Random motion' },
      { id: 'd', text: 'Quantum physics' },
    ]},
  ];

  const transferApplications = [
    { id: 0, title: '🎢 Roller Coaster Design', description: 'Roller coaster engineers use brachistochrone principles to design thrilling first drops. The steeper initial descent maximizes speed for the ride.', insight: 'The first drop of many coasters follows a curve close to a cycloid for maximum thrill!' },
    { id: 1, title: '⛷️ Ski Jump Ramps', description: 'Ski jump ramps are designed using similar optimization principles. The ramp shape affects takeoff speed and angle.', insight: 'Modern ski jumps are computer-optimized using calculus of variations - the same math that solves the brachistochrone.' },
    { id: 2, title: '🚀 Spacecraft Trajectories', description: 'Space mission planners use variational calculus to find optimal paths. Minimizing fuel or time often leads to non-intuitive trajectories.', insight: 'The Hohmann transfer orbit is a "brachistochrone" for reaching other planets efficiently.' },
    { id: 3, title: '⏱️ Isochronous Pendulums', description: 'Huygens designed pendulum clocks with cycloid-shaped cheeks so the period was independent of swing amplitude - perfect timekeeping!', insight: 'The same curve that\'s fastest down is also the curve where time doesn\'t depend on starting position.' },
  ];

  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
      {showButton && (
        <button onClick={() => onPhaseComplete?.()} disabled={!buttonEnabled}
          style={{ width: '100%', padding: '14px 24px', background: buttonEnabled ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(71, 85, 105, 0.5)', border: 'none', borderRadius: '12px', color: buttonEnabled ? colors.textPrimary : colors.textMuted, fontSize: '16px', fontWeight: 'bold', cursor: buttonEnabled ? 'pointer' : 'not-allowed' }}>
          {buttonText}
        </button>
      )}
    </div>
  );

  // Phase renderers (abbreviated structure)
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>🏎️ The Fastest Slide</h1>
            <p style={{ color: colors.accent, fontSize: '18px' }}>Game 114: Brachistochrone</p>
          </div>
          {renderVisualization(false)}
          <div style={{ padding: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>🤯 A 330-Year-Old Puzzle</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                In 1696, Johann Bernoulli challenged the world's mathematicians: <strong style={{ color: colors.cycloid }}>
                What shape slide gets a ball from A to B in the shortest TIME?</strong>
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                The answer shocked everyone - it's NOT the straight line! Isaac Newton famously solved it overnight.
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
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Three different paths connect the same two points. A ball will slide frictionlessly under gravity. Which path gets the ball to the end fastest?
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Which path is fastest?
            </h3>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{ display: 'block', width: '100%', padding: '16px', marginBottom: '12px', background: prediction === p.id ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(51, 65, 85, 0.7)', border: prediction === p.id ? '2px solid #4ade80' : '2px solid transparent', borderRadius: '12px', color: colors.textPrimary, fontSize: '14px', textAlign: 'left', cursor: 'pointer' }}>
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
            <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>🏁 Race the Paths!</h2>
          </div>
          {renderVisualization(true)}
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{isCorrect ? '🎯' : '💡'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '24px' }}>
              {isCorrect ? 'Excellent!' : 'Counterintuitive!'}
            </h2>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📚 The Physics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The <strong style={{ color: colors.cycloid }}>cycloid</strong> wins because it drops steeply at first,
              building up speed quickly. Even though the path is longer, the ball is moving faster for more of the journey!
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
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>🌀 Historical Twist!</h2>
          </div>
          {renderVisualization(true)}
          {phase === 'twist_predict' && (
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '16px' }}>Who posed this challenge in 1696?</h3>
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
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: testAnswers[q.id] === opt.id ? 'rgba(34, 197, 94, 0.3)' : 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '8px', color: colors.textSecondary, textAlign: 'left', cursor: 'pointer' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {allAnswered && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: colors.bgDark }}>
            <button onClick={() => setTestSubmitted(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
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
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Brachistochrone Master!</h1>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary }}>🎓 Key Learnings:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
              <li>The fastest path is a cycloid, not a straight line</li>
              <li>Steeper initial drop = faster overall time</li>
              <li>This led to the calculus of variations</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  return <div style={{ padding: '20px' }}><p style={{ color: colors.textSecondary }}>Loading: {phase}</p></div>;
};

export default BrachistochroneRenderer;
