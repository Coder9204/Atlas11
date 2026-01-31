import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 113: RATTLEBACK REVERSAL
// The mysterious spinning top that reverses direction
// Demonstrates coupled oscillations, asymmetric inertia, and energy transfer
// ============================================================================

interface RattlebackRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast
const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Rattleback colors
  stoneTop: '#a78bfa',
  stoneSide: '#7c3aed',
  stoneHighlight: '#c4b5fd',
  stoneShadow: '#5b21b6',

  // Rotation indicators
  spinCW: '#22c55e',
  spinCCW: '#ef4444',
  wobble: '#f59e0b',

  // Surface
  surface: '#334155',
  surfaceHighlight: '#475569',

  // UI colors
  accent: '#a78bfa',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const RattlebackRenderer: React.FC<RattlebackRendererProps> = ({
  phase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [asymmetry, setAsymmetry] = useState(50); // 0-100 (shape asymmetry)
  const [initialSpin, setInitialSpin] = useState(50); // 0-100 (initial angular velocity)
  const [spinDirection, setSpinDirection] = useState<'preferred' | 'reverse'>('preferred');

  // Simulation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSpin, setCurrentSpin] = useState(0);
  const [wobbleAmount, setWobbleAmount] = useState(0);
  const [hasReversed, setHasReversed] = useState(false);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
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

  // ==================== PHYSICS SIMULATION ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.04);

      if (isSpinning) {
        const asymmetryFactor = asymmetry / 100;
        const friction = 0.995;

        setCurrentSpin(prev => {
          let newSpin = prev * friction;

          // If spinning in "wrong" direction and asymmetric, transfer energy to wobble
          if (spinDirection === 'reverse' && asymmetryFactor > 0.2) {
            // Increase wobble, decrease spin
            setWobbleAmount(w => {
              const newWobble = w + Math.abs(prev) * 0.1 * asymmetryFactor;
              // When wobble gets high enough, reverse direction
              if (newWobble > 0.5 && !hasReversed && prev < 0) {
                setHasReversed(true);
                return newWobble * 0.3; // Dampen wobble after reversal
              }
              return Math.min(newWobble, 1);
            });
            newSpin *= (1 - asymmetryFactor * 0.1);
          } else {
            // Preferred direction - wobble decays
            setWobbleAmount(w => w * 0.95);
          }

          // After reversal, spin in preferred direction
          if (hasReversed && newSpin < 0.1) {
            return Math.abs(newSpin) + 0.2; // Positive spin (CW)
          }

          // Stop when very slow
          if (Math.abs(newSpin) < 0.01) {
            setIsSpinning(false);
            return 0;
          }

          return newSpin;
        });
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isAnimating, isSpinning, asymmetry, spinDirection, hasReversed]);

  // Start spinning
  const startSpin = () => {
    const spinValue = (initialSpin / 100) * 2;
    setCurrentSpin(spinDirection === 'preferred' ? spinValue : -spinValue);
    setWobbleAmount(0);
    setHasReversed(false);
    setIsSpinning(true);
  };

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    // Calculate rotation angle from spin
    const rotationAngle = (animationTime * currentSpin * 180);

    // Wobble oscillation
    const wobbleX = Math.sin(animationTime * 20) * wobbleAmount * 15;
    const wobbleY = Math.cos(animationTime * 15) * wobbleAmount * 10;

    // Asymmetry visualization
    const asymmetryOffset = (asymmetry / 100) * 20;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Stone gradient */}
            <linearGradient id="stoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.stoneHighlight} />
              <stop offset="50%" stopColor={colors.stoneTop} />
              <stop offset="100%" stopColor={colors.stoneShadow} />
            </linearGradient>

            {/* Surface gradient */}
            <linearGradient id="surfaceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.surfaceHighlight} />
              <stop offset="100%" stopColor={colors.surface} />
            </linearGradient>

            {/* Shadow */}
            <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Rattleback (Celt)
          </text>

          {/* Surface */}
          <ellipse cx="200" cy="280" rx="180" ry="40" fill="url(#surfaceGradient)" />

          {/* Shadow under rattleback */}
          <ellipse
            cx={200 + wobbleX * 0.5}
            cy="275"
            rx={80 + wobbleAmount * 10}
            ry={15 + wobbleAmount * 5}
            fill="url(#shadow)"
          />

          {/* Rattleback - Top view showing asymmetry */}
          <g transform={`translate(200, 180) rotate(${rotationAngle}) translate(${wobbleX}, ${wobbleY})`}>
            {/* Main body - asymmetric ellipse */}
            <ellipse
              cx={asymmetryOffset}
              cy="0"
              rx="80"
              ry="35"
              fill="url(#stoneGradient)"
              stroke={colors.stoneShadow}
              strokeWidth="2"
              transform={`rotate(${asymmetry / 5})`}
            />

            {/* Asymmetry indicator line */}
            <line
              x1={-40 + asymmetryOffset}
              y1="0"
              x2={40 + asymmetryOffset}
              y2="0"
              stroke={colors.stoneHighlight}
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.5"
            />

            {/* Center of mass marker (offset) */}
            <circle
              cx={asymmetryOffset * 0.3}
              cy={asymmetryOffset * 0.15}
              r="5"
              fill={colors.wobble}
              opacity="0.8"
            />
            <text x={asymmetryOffset * 0.3 + 10} y={asymmetryOffset * 0.15 + 4} fill={colors.wobble} fontSize="8">
              CoM
            </text>

            {/* Rotation direction indicator */}
            {isSpinning && (
              <g>
                <path
                  d={currentSpin > 0
                    ? "M 50,-30 A 40,40 0 0,1 50,30"
                    : "M 50,30 A 40,40 0 0,1 50,-30"
                  }
                  fill="none"
                  stroke={currentSpin > 0 ? colors.spinCW : colors.spinCCW}
                  strokeWidth="3"
                  markerEnd="url(#arrowMarker)"
                />
              </g>
            )}
          </g>

          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowMarker" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={currentSpin > 0 ? colors.spinCW : colors.spinCCW} />
            </marker>
          </defs>

          {/* Side view */}
          <g transform="translate(200, 260)">
            {/* Curved bottom surface */}
            <path
              d={`M -70,0 Q 0,${20 + wobbleAmount * 20} 70,0`}
              fill="none"
              stroke={colors.stoneTop}
              strokeWidth="4"
            />

            {/* Contact point indicator */}
            <circle cx={wobbleX * 3} cy={Math.abs(wobbleX) * 0.3} r="4" fill={colors.wobble} />
          </g>

          {/* Labels and info */}
          <g transform="translate(10, 300)">
            <rect x="0" y="0" width="120" height="60" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Spin:</text>
            <text x="10" y="32" fill={currentSpin > 0 ? colors.spinCW : currentSpin < 0 ? colors.spinCCW : colors.textMuted} fontSize="14" fontWeight="bold">
              {currentSpin > 0.01 ? '↻ CW' : currentSpin < -0.01 ? '↺ CCW' : '— Stopped'}
            </text>
            <text x="10" y="50" fill={colors.textMuted} fontSize="9">
              Speed: {Math.abs(currentSpin * 100).toFixed(0)}%
            </text>
          </g>

          <g transform="translate(140, 300)">
            <rect x="0" y="0" width="120" height="60" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Wobble:</text>
            <rect x="10" y="22" width="100" height="10" fill="rgba(71, 85, 105, 0.5)" rx="5" />
            <rect x="10" y="22" width={100 * wobbleAmount} height="10" fill={colors.wobble} rx="5" />
            <text x="10" y="50" fill={colors.textMuted} fontSize="9">
              {hasReversed ? '✨ REVERSED!' : wobbleAmount > 0.3 ? '⚠️ Building...' : 'Stable'}
            </text>
          </g>

          <g transform="translate(270, 300)">
            <rect x="0" y="0" width="120" height="60" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Asymmetry:</text>
            <text x="10" y="32" fill={colors.accent} fontSize="14" fontWeight="bold">
              {asymmetry}%
            </text>
            <text x="10" y="50" fill={colors.textMuted} fontSize="9">
              {asymmetry < 30 ? 'Symmetric' : asymmetry < 70 ? 'Moderate' : 'High'}
            </text>
          </g>

          {/* Reversal animation overlay */}
          {hasReversed && isSpinning && (
            <g>
              <text x="200" y="100" textAnchor="middle" fill={colors.spinCW} fontSize="24" fontWeight="bold">
                ✨ DIRECTION REVERSED! ✨
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  };

  // ==================== RENDER CONTROLS ====================
  const renderControls = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      background: colors.bgCard,
      borderRadius: '12px',
      margin: '16px',
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        🎮 Control the Rattleback:
      </div>

      {/* Direction Selection */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setSpinDirection('preferred')}
          style={{
            flex: 1,
            padding: '12px',
            background: spinDirection === 'preferred'
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '13px',
            fontWeight: spinDirection === 'preferred' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          ↻ Preferred (CW)
        </button>
        <button
          onClick={() => setSpinDirection('reverse')}
          style={{
            flex: 1,
            padding: '12px',
            background: spinDirection === 'reverse'
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '13px',
            fontWeight: spinDirection === 'reverse' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          ↺ Reverse (CCW)
        </button>
      </div>

      {/* Spin Button */}
      <button
        onClick={startSpin}
        disabled={isSpinning}
        style={{
          padding: '14px',
          background: isSpinning
            ? 'rgba(71, 85, 105, 0.5)'
            : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textPrimary,
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: isSpinning ? 'not-allowed' : 'pointer',
          opacity: isSpinning ? 0.7 : 1,
        }}
      >
        {isSpinning ? '🔄 Spinning...' : '▶️ Spin It!'}
      </button>

      {/* Initial Spin Speed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🚀 Initial Spin Speed: {initialSpin}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={initialSpin}
          onChange={(e) => setInitialSpin(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      {/* Asymmetry Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Shape Asymmetry: {asymmetry}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={asymmetry}
          onChange={(e) => setAsymmetry(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Symmetric (no reversal)</span>
          <span>Highly asymmetric</span>
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'same', text: 'It spins the same way you started it, just slowing down' },
    { id: 'stops', text: 'It immediately stops and falls over' },
    { id: 'reverse', text: 'It starts wobbling and then REVERSES direction!', correct: true },
    { id: 'faster', text: 'It speeds up in the wrong direction' },
  ];

  const twistPredictions = [
    { id: 'magic', text: 'Ancient magic embedded in the stone' },
    { id: 'gyro', text: 'Gyroscopic precession from Earth\'s rotation' },
    { id: 'coupled', text: 'Spin energy transfers to rocking, then back to spin in the other direction', correct: true },
    { id: 'friction', text: 'Friction with the surface reverses it' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What makes a rattleback reverse its spin direction?',
      options: [
        { id: 'a', text: 'Magnetic forces' },
        { id: 'b', text: 'Asymmetric shape couples spin to rocking motion', correct: true },
        { id: 'c', text: 'Air resistance' },
        { id: 'd', text: 'The surface it sits on' },
      ],
    },
    {
      id: 2,
      question: 'A perfectly symmetric top would:',
      options: [
        { id: 'a', text: 'Reverse faster' },
        { id: 'b', text: 'Spin forever' },
        { id: 'c', text: 'Not reverse - it would just slow down equally in both directions', correct: true },
        { id: 'd', text: 'Immediately stop' },
      ],
    },
    {
      id: 3,
      question: 'When a rattleback wobbles, energy is being transferred from:',
      options: [
        { id: 'a', text: 'Heat to motion' },
        { id: 'b', text: 'Spin (rotation about vertical) to rocking (rotation about horizontal)', correct: true },
        { id: 'c', text: 'The surface to the rattleback' },
        { id: 'd', text: 'Gravity to the rattleback' },
      ],
    },
    {
      id: 4,
      question: 'Rattlebacks are also called "celts" because:',
      options: [
        { id: 'a', text: 'They were invented by Celtic physicists' },
        { id: 'b', text: 'Ancient Celtic artifacts showed this behavior', correct: true },
        { id: 'c', text: 'The shape looks like Celtic knots' },
        { id: 'd', text: 'They make a Celtic sound' },
      ],
    },
    {
      id: 5,
      question: 'Which property must be misaligned for a rattleback to work?',
      options: [
        { id: 'a', text: 'Color and weight' },
        { id: 'b', text: 'Principal axes of inertia and geometric axes', correct: true },
        { id: 'c', text: 'Top and bottom' },
        { id: 'd', text: 'Front and back' },
      ],
    },
    {
      id: 6,
      question: 'A rattleback with higher asymmetry will:',
      options: [
        { id: 'a', text: 'Never reverse' },
        { id: 'b', text: 'Reverse more quickly and strongly', correct: true },
        { id: 'c', text: 'Spin faster' },
        { id: 'd', text: 'Float in air' },
      ],
    },
    {
      id: 7,
      question: 'Why does spinning in the "preferred" direction not cause reversal?',
      options: [
        { id: 'a', text: 'The asymmetry doesn\'t couple to rocking in that direction', correct: true },
        { id: 'b', text: 'Gravity is different' },
        { id: 'c', text: 'The surface prevents it' },
        { id: 'd', text: 'It\'s actually reversing but too fast to see' },
      ],
    },
    {
      id: 8,
      question: 'The rocking motion that builds up before reversal is due to:',
      options: [
        { id: 'a', text: 'The Earth shaking' },
        { id: 'b', text: 'Unstable equilibrium in the "wrong" spin direction', correct: true },
        { id: 'c', text: 'Thermal expansion' },
        { id: 'd', text: 'Sound waves' },
      ],
    },
    {
      id: 9,
      question: 'What happens to the total energy during the reversal process?',
      options: [
        { id: 'a', text: 'It increases' },
        { id: 'b', text: 'It stays perfectly constant' },
        { id: 'c', text: 'It decreases due to friction', correct: true },
        { id: 'd', text: 'It becomes negative' },
      ],
    },
    {
      id: 10,
      question: 'A rattleback demonstrates violation of which apparent principle?',
      options: [
        { id: 'a', text: 'Conservation of energy' },
        { id: 'b', text: 'Conservation of momentum' },
        { id: 'c', text: 'The assumption that friction always opposes motion in the same direction', correct: true },
        { id: 'd', text: 'Gravity' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🏛️ Ancient Celtic Artifacts',
      description: 'Archaeological finds of boat-shaped stone tools from Celtic times show rattleback behavior. Whether ancient people knew about this or it was accidental is debated, but these objects fascinated scientists when rediscovered.',
      insight: 'Some researchers believe ancient Celts intentionally made these as "magic stones" for divination or gaming purposes.',
    },
    {
      id: 1,
      title: '🛰️ Satellite Dynamics',
      description: 'Spacecraft with elongated shapes can exhibit rattleback-like behavior! The Mariner 4 spacecraft showed unexpected rotation reversals due to asymmetric solar radiation pressure.',
      insight: 'Understanding coupled rotations helps spacecraft engineers design stable satellites and predict spin behavior.',
    },
    {
      id: 2,
      title: '⚽ Sports Equipment',
      description: 'Some rugby balls and American footballs exhibit weak rattleback behavior when spun on a table. The asymmetric shape can cause unexpected wobbles and reversals.',
      insight: 'The physics of rattlebacks helps explain why spinning a football on a table behaves differently than in the air.',
    },
    {
      id: 3,
      title: '🧲 Coupled Oscillators',
      description: 'The rattleback is a physical example of coupled oscillators - where energy transfers between different modes of vibration. This concept appears in electronics, bridges, and molecular physics.',
      insight: 'The mathematics that explains rattleback reversal also describes why some bridges sway dangerously in the wind.',
    },
  ];

  // ==================== BOTTOM BAR RENDERER ====================
  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 20px',
      background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      zIndex: 1000,
    }}>
      {showButton && (
        <button
          onClick={() => onPhaseComplete?.()}
          disabled={!buttonEnabled}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: buttonEnabled
              ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '12px',
            color: buttonEnabled ? colors.textPrimary : colors.textMuted,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: buttonEnabled ? 'pointer' : 'not-allowed',
            opacity: buttonEnabled ? 1 : 0.5,
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              🔄 The Defiant Spinner
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 113: Rattleback Reversal
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '20px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>
                🤯 A Top That Refuses to Spin "Wrong"
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Spin this stone-like object one way and it spins smoothly. Spin it the other
                way and it <strong style={{ color: colors.spinCCW }}>wobbles, fights back,
                and reverses direction</strong> - spinning the way it "wants" to!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                Also called <span style={{ color: colors.accent }}>Celt</span> or <span style={{ color: colors.accent }}>Anagyre</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                Known since ancient times, this object puzzled physicists until the 20th century.
                The secret lies in its asymmetric shape, which couples different types of rotation
                in a sneaky way.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* 1. STATIC GRAPHIC FIRST */}
          {renderVisualization(false)}

          {/* 2. WHAT YOU'RE LOOKING AT */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📋 What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              This is a <strong>rattleback</strong> - an elongated, boat-shaped object with an
              asymmetric bottom. The <span style={{ color: colors.wobble }}>orange dot</span>
              marks the center of mass, which is offset from the geometric center. The dashed
              line shows the shape's asymmetry axis.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              It has a "preferred" spin direction (CW) where it spins smoothly, and a "reverse"
              direction (CCW) where something strange happens...
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 When you spin it in the "wrong" (reverse) direction, what happens?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    onPredictionMade?.(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #c4b5fd' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Spin the Rattleback!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Try both directions and watch the difference
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
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              🎯 Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Spin CW (preferred) → smooth spin, no reversal</li>
              <li>Spin CCW (reverse) → wobble builds, then reverses!</li>
              <li>Increase asymmetry → faster reversal</li>
              <li>Zero asymmetry → no reversal either way</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '💡'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Amazing Intuition!' : 'Surprising Physics!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📚 The Physics Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The rattleback's asymmetric shape means its <strong style={{ color: colors.accent }}>
              principal axes of inertia</strong> don't align with its geometric axes. When you spin
              it the "wrong" way, this misalignment couples the spin to a rocking motion.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Energy transfers from <strong style={{ color: colors.spinCCW }}>spin</strong> →
              <strong style={{ color: colors.wobble }}> wobble</strong> →
              <strong style={{ color: colors.spinCW }}> spin in the opposite direction</strong>!
            </p>
            <div style={{
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                In the "preferred" direction, the asymmetry doesn't couple to rocking.
                It's like a one-way gate for energy transfer between rotation modes!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              🌀 Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What's really causing the reversal?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🤔 The Deep Question:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              We've seen that the rattleback wobbles and reverses. But what mechanism actually
              makes this happen? How does spinning one way cause energy to transfer differently
              than spinning the other way?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 What causes the direction-dependent energy transfer?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: twistPrediction === p.id ? '2px solid #fbbf24' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'See The Mechanism →')}
      </div>
    );
  }

  // TWIST_PLAY & TWIST_REVIEW phases follow similar pattern...
  // (abbreviated for space - follow same structure)

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Coupled Oscillations
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch energy transfer between modes
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
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              💡 Observe the Coupling:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Watch spin energy decrease as wobble increases</li>
              <li>Wobble reaches maximum just before reversal</li>
              <li>Wobble energy converts back to spin (other direction!)</li>
              <li>Higher asymmetry = stronger coupling</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Understand the Physics →')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '🤯'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Physics Mastery!' : 'Elegant Mathematics!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔄 Coupled Mode Energy Transfer:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The rattleback demonstrates <strong style={{ color: colors.accent }}>parametric coupling</strong>
              between rotation modes. The asymmetry creates cross-terms in the equations of motion
              that only allow energy to flow one way.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              It's like a one-way valve: spin → wobble → spin in the other direction. In the
              preferred direction, the coupling terms cancel out, so no energy transfers to wobble.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore all {transferApplications.length} applications to continue
            </p>
          </div>

          {transferApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
              style={{
                background: transferCompleted.has(app.id) ? 'rgba(16, 185, 129, 0.1)' : colors.bgCard,
                border: transferCompleted.has(app.id) ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid transparent',
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>{app.title}</h3>
                {transferCompleted.has(app.id) && <span style={{ color: colors.success }}>✓</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>{app.description}</p>
              <div style={{ background: 'rgba(167, 139, 250, 0.1)', borderRadius: '6px', padding: '10px', marginTop: '10px' }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>💡 {app.insight}</p>
              </div>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  // TEST PHASE (abbreviated - same pattern as other games)
  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 80 ? '🏆' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>{score}% Score</h2>
            </div>
            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const isCorrect = testAnswers[q.id] === correctOption?.id;
              return (
                <div key={q.id} style={{ background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', margin: '12px 16px', padding: '14px', borderRadius: '10px' }}>
                  <span style={{ color: isCorrect ? colors.success : colors.error }}>{isCorrect ? '✓' : '✗'} Q{idx + 1}</span>
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, 'Complete! 🎉')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>📝 Knowledge Check</h2>
          </div>
          {testQuestions.map((q, idx) => (
            <div key={q.id} style={{ background: colors.bgCard, margin: '12px 16px', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{idx + 1}. {q.question}</p>
              {q.options.map(opt => (
                <button key={opt.id} onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: testAnswers[q.id] === opt.id ? 'rgba(167, 139, 250, 0.3)' : 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '8px', color: colors.textSecondary, textAlign: 'left', cursor: 'pointer' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {allAnswered && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: colors.bgDark }}>
            <button onClick={() => setTestSubmitted(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
          </div>
        )}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Rattleback Master!</h1>
            <p style={{ color: colors.accent }}>You've mastered coupled rotations</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>🎓 What You've Learned:</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px' }}>
              <li>Asymmetric shapes couple different rotation modes</li>
              <li>Energy can transfer from spin to wobble and back</li>
              <li>The coupling is direction-dependent</li>
              <li>Ancient artifacts showed this phenomenon</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  return <div style={{ padding: '20px' }}><p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p></div>;
};

export default RattlebackRenderer;
