import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 112: CHAIN FOUNTAIN (MOULD EFFECT)
// The mysterious rising chain pulled from a beaker
// Demonstrates momentum transfer, reaction forces, and chain dynamics
// ============================================================================

interface ChainFountainRendererProps {
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

  // Chain colors
  chainLink: '#fbbf24',
  chainHighlight: '#fde68a',
  chainShadow: '#b45309',

  // Container colors
  beaker: 'rgba(147, 197, 253, 0.3)',
  beakerEdge: '#60a5fa',

  // Force arrows
  forceUp: '#22c55e',
  forceDown: '#ef4444',
  momentum: '#a855f7',

  // UI colors
  accent: '#fbbf24',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const ChainFountainRenderer: React.FC<ChainFountainRendererProps> = ({
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
  const [dropHeight, setDropHeight] = useState(50); // 0-100
  const [chainDensity, setChainDensity] = useState(50); // 0-100 (affects link size/mass)
  const [chainStiffness, setChainStiffness] = useState(50); // 0-100

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [fountainHeight, setFountainHeight] = useState(0);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateFountainHeight = useCallback(() => {
    // Fountain height depends on drop height and chain properties
    // Higher drop = more momentum = higher fountain
    // Stiffer chain = better momentum transfer = higher fountain
    const dropFactor = dropHeight / 100;
    const stiffnessFactor = chainStiffness / 100;
    const densityFactor = 1 + (chainDensity / 200);

    // Approximate: fountain height ∝ sqrt(drop height) for ideal chain
    // Stiffness increases the effect
    return Math.sqrt(dropFactor) * (0.2 + stiffnessFactor * 0.4) * densityFactor * 100;
  }, [dropHeight, chainStiffness, chainDensity]);

  const calculateChainVelocity = useCallback(() => {
    // v ≈ sqrt(2gh) for falling chain
    const h = (dropHeight / 100) * 3; // Scale to meters
    return Math.sqrt(2 * 9.81 * h);
  }, [dropHeight]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.04);

      if (isRunning) {
        const targetHeight = calculateFountainHeight();
        setFountainHeight(prev => {
          // Smooth transition to target height
          const diff = targetHeight - prev;
          return prev + diff * 0.1;
        });
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isAnimating, isRunning, calculateFountainHeight]);

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const velocity = calculateChainVelocity();
    const maxFountain = calculateFountainHeight();

    // Chain parameters
    const linkSize = 4 + (chainDensity / 50);
    const numLinksVisible = 40;

    // Container position
    const beakerX = 80;
    const beakerY = 150;
    const beakerWidth = 80;
    const beakerHeight = 120;

    // Drop point position
    const dropX = 320;
    const dropY = 150 + (dropHeight / 100) * 150;

    // Fountain apex
    const apexY = beakerY - fountainHeight;

    // Generate chain path points
    const chainPath = [];

    // Rising arc from beaker
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = beakerX + beakerWidth / 2 + t * 60;
      const y = beakerY - Math.sin(t * Math.PI) * fountainHeight;
      chainPath.push({ x, y });
    }

    // Falling arc to drop point
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = beakerX + beakerWidth / 2 + 60 + t * (dropX - beakerX - beakerWidth / 2 - 60);
      const arcHeight = fountainHeight * (1 - t);
      const y = beakerY - arcHeight + t * (dropY - beakerY + arcHeight);
      chainPath.push({ x, y });
    }

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Chain link gradient */}
            <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.chainHighlight} />
              <stop offset="50%" stopColor={colors.chainLink} />
              <stop offset="100%" stopColor={colors.chainShadow} />
            </linearGradient>

            {/* Beaker gradient */}
            <linearGradient id="beakerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.beakerEdge} stopOpacity="0.5" />
              <stop offset="50%" stopColor={colors.beaker} />
              <stop offset="100%" stopColor={colors.beakerEdge} stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Chain Fountain (Mould Effect)
          </text>

          {/* Ground line */}
          <line x1="0" y1="350" x2="400" y2="350" stroke={colors.textMuted} strokeWidth="2" />

          {/* Drop height indicator */}
          <line
            x1={dropX}
            y1={150}
            x2={dropX}
            y2={dropY}
            stroke={colors.forceDown}
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <text x={dropX + 10} y={(150 + dropY) / 2} fill={colors.forceDown} fontSize="10">
            h = {((dropHeight / 100) * 3).toFixed(1)}m
          </text>

          {/* Beaker/Container */}
          <g transform={`translate(${beakerX}, ${beakerY})`}>
            {/* Beaker body */}
            <path
              d={`M 0,0 L 0,${beakerHeight} Q 0,${beakerHeight + 10} 10,${beakerHeight + 10}
                  L ${beakerWidth - 10},${beakerHeight + 10} Q ${beakerWidth},${beakerHeight + 10}
                  ${beakerWidth},${beakerHeight} L ${beakerWidth},0`}
              fill="url(#beakerGradient)"
              stroke={colors.beakerEdge}
              strokeWidth="2"
            />

            {/* Chain pile inside beaker */}
            {!isRunning && (
              <g>
                {[...Array(15)].map((_, i) => (
                  <ellipse
                    key={i}
                    cx={beakerWidth / 2 + Math.sin(i * 1.5) * 20}
                    cy={beakerHeight - 20 - i * 4}
                    rx={linkSize}
                    ry={linkSize * 0.6}
                    fill="url(#chainGradient)"
                    opacity={0.8}
                  />
                ))}
              </g>
            )}

            {/* Beaker rim highlight */}
            <rect x="0" y="-3" width={beakerWidth} height="3" fill={colors.beakerEdge} rx="1" />
          </g>

          {/* Chain fountain arc */}
          {isRunning && (
            <g>
              {/* Draw chain links along path */}
              {chainPath.map((point, i) => {
                if (i % 2 !== 0) return null; // Skip every other for performance
                const phase = (animationTime * 5 + i * 0.2) % 1;
                const brightness = 0.7 + Math.sin(phase * Math.PI * 2) * 0.3;

                return (
                  <ellipse
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    rx={linkSize}
                    ry={linkSize * 0.6}
                    fill={colors.chainLink}
                    opacity={brightness}
                    transform={`rotate(${Math.atan2(
                      (chainPath[Math.min(i + 1, chainPath.length - 1)]?.y || point.y) - point.y,
                      (chainPath[Math.min(i + 1, chainPath.length - 1)]?.x || point.x) - point.x
                    ) * 180 / Math.PI}, ${point.x}, ${point.y})`}
                  />
                );
              })}

              {/* Flow arrows on chain */}
              {[0.2, 0.5, 0.8].map((t, i) => {
                const idx = Math.floor(t * chainPath.length);
                const point = chainPath[idx];
                const nextPoint = chainPath[Math.min(idx + 2, chainPath.length - 1)];
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);

                return (
                  <g key={i} transform={`translate(${point.x}, ${point.y}) rotate(${angle * 180 / Math.PI})`}>
                    <polygon
                      points="0,-4 10,0 0,4"
                      fill={colors.momentum}
                      opacity={0.8}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Kick force indicator at pickup point */}
          {isRunning && interactive && (
            <g transform={`translate(${beakerX + beakerWidth / 2}, ${beakerY})`}>
              {/* Upward kick force */}
              <line x1="0" y1="0" x2="0" y2="-30" stroke={colors.forceUp} strokeWidth="3" />
              <polygon points="-6,-30 0,-42 6,-30" fill={colors.forceUp} />
              <text x="10" y="-20" fill={colors.forceUp} fontSize="9">
                Kick force
              </text>

              {/* Reaction from surface */}
              <line x1="-15" y1="20" x2="-15" y2="-10" stroke={colors.forceUp} strokeWidth="2" />
              <polygon points="-19,-10 -15,-18 -11,-10" fill={colors.forceUp} />
              <text x="-45" y="0" fill={colors.forceUp} fontSize="8">
                Reaction
              </text>
            </g>
          )}

          {/* Falling chain from drop point */}
          {isRunning && (
            <g>
              {[...Array(10)].map((_, i) => {
                const y = dropY + i * 15 + (animationTime * 50) % 15;
                if (y > 350) return null;
                return (
                  <ellipse
                    key={i}
                    cx={dropX}
                    cy={y}
                    rx={linkSize}
                    ry={linkSize * 0.6}
                    fill={colors.chainLink}
                    opacity={0.7}
                  />
                );
              })}
            </g>
          )}

          {/* Table surface under drop */}
          <rect x={dropX - 30} y="350" width="60" height="10" fill={colors.textMuted} rx="2" />

          {/* Info panels */}
          <g transform="translate(10, 290)">
            <rect x="0" y="0" width="140" height="50" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Fountain Height:</text>
            <text x="10" y="32" fill={colors.chainLink} fontSize="14" fontWeight="bold">
              {(fountainHeight / 100 * maxFountain / 100).toFixed(2)} m
            </text>
            <text x="10" y="45" fill={colors.textMuted} fontSize="8">
              ({(fountainHeight / maxFountain * 100).toFixed(0)}% of max)
            </text>
          </g>

          <g transform="translate(160, 290)">
            <rect x="0" y="0" width="110" height="50" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Chain Velocity:</text>
            <text x="10" y="32" fill={colors.momentum} fontSize="14" fontWeight="bold">
              {velocity.toFixed(1)} m/s
            </text>
          </g>

          <g transform="translate(280, 290)">
            <rect x="0" y="0" width="110" height="50" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Status:</text>
            <text x="10" y="35" fill={isRunning ? colors.success : colors.textMuted} fontSize="12" fontWeight="bold">
              {isRunning ? '🔄 Running' : '⏸️ Stopped'}
            </text>
          </g>
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
        🎮 Control the Chain Fountain:
      </div>

      {/* Start/Stop Button */}
      <button
        onClick={() => {
          setIsRunning(!isRunning);
          if (!isRunning) setFountainHeight(0);
        }}
        style={{
          padding: '14px',
          background: isRunning
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textPrimary,
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {isRunning ? '⏹️ Stop Chain' : '▶️ Drop the Chain!'}
      </button>

      {/* Drop Height Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📏 Drop Height: {((dropHeight / 100) * 3).toFixed(1)}m
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={dropHeight}
          onChange={(e) => setDropHeight(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Low (0.6m)</span>
          <span>High (3m)</span>
        </div>
      </div>

      {/* Chain Stiffness Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🔗 Chain Stiffness: {chainStiffness}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={chainStiffness}
          onChange={(e) => setChainStiffness(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Flexible (rope-like)</span>
          <span>Rigid (ball chain)</span>
        </div>
      </div>

      {/* Chain Density Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          ⚖️ Chain Density: {chainDensity}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={chainDensity}
          onChange={(e) => setChainDensity(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Light</span>
          <span>Heavy</span>
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'edge', text: 'The chain just slides over the rim of the container' },
    { id: 'rise', text: 'The chain rises UP above the container before falling', correct: true },
    { id: 'faster', text: 'The chain falls faster than normal free-fall' },
    { id: 'tangles', text: 'The chain gets tangled and stops' },
  ];

  const twistPredictions = [
    { id: 'gravity', text: 'Gravity pulls it up momentarily' },
    { id: 'air', text: 'Air pressure lifts the chain' },
    { id: 'kick', text: 'Each link gets a "kick" from the surface when picked up', correct: true },
    { id: 'magic', text: 'It\'s an optical illusion - the chain doesn\'t really rise' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What causes the chain to rise above the container rim?',
      options: [
        { id: 'a', text: 'Air pressure from below' },
        { id: 'b', text: 'Magnetic forces in the chain' },
        { id: 'c', text: 'Reaction force from the container when each link is lifted', correct: true },
        { id: 'd', text: 'Static electricity' },
      ],
    },
    {
      id: 2,
      question: 'What property of the chain makes the fountain effect stronger?',
      options: [
        { id: 'a', text: 'Lighter chains work better' },
        { id: 'b', text: 'Flexible rope-like chains work best' },
        { id: 'c', text: 'Stiff chains with rigid links work better', correct: true },
        { id: 'd', text: 'Color of the chain' },
      ],
    },
    {
      id: 3,
      question: 'How does increasing the drop height affect the fountain?',
      options: [
        { id: 'a', text: 'No effect on fountain height' },
        { id: 'b', text: 'Higher drop = higher fountain', correct: true },
        { id: 'c', text: 'Higher drop = lower fountain' },
        { id: 'd', text: 'The chain stops working' },
      ],
    },
    {
      id: 4,
      question: 'Why doesn\'t a perfectly flexible rope create a fountain?',
      options: [
        { id: 'a', text: 'It\'s too light' },
        { id: 'b', text: 'It can bend smoothly without pushing against the surface', correct: true },
        { id: 'c', text: 'Rope is always tangled' },
        { id: 'd', text: 'Rope creates an even bigger fountain' },
      ],
    },
    {
      id: 5,
      question: 'The "Mould Effect" is named after:',
      options: [
        { id: 'a', text: 'The mold that forms on old chains' },
        { id: 'b', text: 'Steve Mould, who popularized the phenomenon on YouTube', correct: true },
        { id: 'c', text: 'The shape of the chain fountain' },
        { id: 'd', text: 'A famous physicist' },
      ],
    },
    {
      id: 6,
      question: 'What happens at the pickup point when a link is lifted?',
      options: [
        { id: 'a', text: 'Nothing special - it just slides up' },
        { id: 'b', text: 'The link rotates and pushes against the surface/other links', correct: true },
        { id: 'c', text: 'The link becomes lighter' },
        { id: 'd', text: 'The link heats up' },
      ],
    },
    {
      id: 7,
      question: 'Conservation of what principle is key to understanding the chain fountain?',
      options: [
        { id: 'a', text: 'Energy only' },
        { id: 'b', text: 'Mass only' },
        { id: 'c', text: 'Momentum', correct: true },
        { id: 'd', text: 'Electric charge' },
      ],
    },
    {
      id: 8,
      question: 'If you dropped the chain in a vacuum (no air), would the fountain still form?',
      options: [
        { id: 'a', text: 'No - air pressure is essential' },
        { id: 'b', text: 'Yes - the mechanism doesn\'t depend on air', correct: true },
        { id: 'c', text: 'The fountain would be twice as high' },
        { id: 'd', text: 'The chain would float' },
      ],
    },
    {
      id: 9,
      question: 'Ball chains work well for this effect because:',
      options: [
        { id: 'a', text: 'They\'re made of special metal' },
        { id: 'b', text: 'Each ball must rotate to change direction, creating the kick', correct: true },
        { id: 'c', text: 'They\'re heavier than regular chains' },
        { id: 'd', text: 'They have air pockets inside' },
      ],
    },
    {
      id: 10,
      question: 'The fountain height relative to drop height is:',
      options: [
        { id: 'a', text: 'Always equal' },
        { id: 'b', text: 'Always exactly half' },
        { id: 'c', text: 'A fraction that depends on chain properties', correct: true },
        { id: 'd', text: 'Always greater than drop height' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '⚓ Anchor Chain Deployment',
      description: 'Ship anchors use heavy chains that exhibit similar dynamics when deployed. Understanding chain mechanics helps naval engineers predict how the chain will behave during rapid deployment.',
      insight: 'A ship\'s anchor chain can weigh over 100 tons - the forces involved when dropping anchor at speed are immense!',
    },
    {
      id: 1,
      title: '🎢 Roller Coaster Chains',
      description: 'The lift chains on roller coasters must smoothly pick up and release cars. Engineers account for the momentum transfer and reaction forces to ensure smooth operation.',
      insight: 'The chain lift motor on a major coaster can be over 500 horsepower to handle the forces involved!',
    },
    {
      id: 2,
      title: '🔗 Cable Dynamics',
      description: 'Undersea cables, crane cables, and tow ropes all exhibit complex dynamics when rapidly deployed or retrieved. The same momentum principles apply to their behavior.',
      insight: 'When laying transatlantic fiber optic cables, engineers must account for similar dynamics to prevent cable damage.',
    },
    {
      id: 3,
      title: '🧬 Polymer Chain Physics',
      description: 'At the molecular level, polymer chains being pulled from a surface exhibit analogous behavior. Understanding macroscale chain physics helps predict nanoscale polymer dynamics.',
      insight: 'DNA being pulled through a nanopore follows similar principles - each base must be "kicked" free!',
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
              ? 'linear-gradient(135deg, #fbbf24, #d97706)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '12px',
            color: buttonEnabled ? '#0f172a' : colors.textMuted,
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
              ⛓️ The Self-Siphoning Chain
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 112: Chain Fountain
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
                🤯 The Internet's Favorite Physics Demo
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Take a chain, pile it in a beaker, and let one end drop to the floor. Instead of
                simply sliding over the rim, the chain <strong style={{ color: colors.chainLink }}>
                rises up into the air</strong> before falling - creating a beautiful fountain!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                Also called the <span style={{ color: colors.accent }}>Mould Effect</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                Named after Steve Mould who popularized it on YouTube, this effect puzzled
                physicists until 2014 when researchers figured out the elegant explanation.
                The secret lies in how momentum is transferred at the pickup point.
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
              A <strong>beaker filled with chain</strong> sits on a table. One end of the chain
              is dropped over the side to a lower surface. Gravity pulls the falling chain down,
              which in turn pulls more chain from the beaker.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              The green arrows show the "kick" force - the reaction when links are picked up.
              Purple arrows show the chain's momentum direction.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 When you drop one end of the chain, what happens?
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
                      ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #fde68a' : '2px solid transparent',
                    borderRadius: '12px',
                    color: prediction === p.id ? '#0f172a' : colors.textPrimary,
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
              🔬 Create Your Chain Fountain!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Drop the chain and watch the fountain form
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
              <li>Higher drop height → higher fountain</li>
              <li>Stiffer chain → more pronounced fountain</li>
              <li>Flexible chain → barely any fountain</li>
              <li>Watch how the arc shape changes</li>
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
              {isCorrect ? 'Great Observation!' : 'Surprising, Right?'}
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
              The key is what happens at the <strong style={{ color: colors.chainLink }}>pickup point</strong>.
              Each chain link can't simply slide upward - it must rotate to change direction.
              When it rotates, it pushes against the surface (or other links) below it.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              By Newton's 3rd law, the surface pushes BACK on the link. This upward
              <strong style={{ color: colors.forceUp }}> "kick"</strong> gives the chain extra
              upward momentum, propelling it above the container rim!
            </p>
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                A perfectly flexible rope wouldn't create a fountain - it can smoothly curve
                without pushing. It's the chain's rigidity that creates the kick!
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔄 The Momentum Balance:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The falling chain gains downward momentum from gravity. The kick transfers some
              of this to upward momentum at the pickup point. The fountain height depends on
              the <strong>ratio of kick force to chain weight</strong>.
            </p>
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
              What's actually doing the pushing?
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
              🤔 The Mystery Force:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              We've established that the chain rises above the container. But what exactly is
              providing that upward force? The chain is just sitting there in the beaker -
              why would pulling on one end make the rest jump up?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 What creates the upward force?
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

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              🔬 The Kick Mechanism
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the pickup point carefully
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
              💡 Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Each link must rotate to change from horizontal to vertical</li>
              <li>The link pushes down on what's below it while rotating</li>
              <li>Newton's 3rd: the surface pushes UP on the link</li>
              <li>This "kick" launches the chain upward!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Understand the Kick →')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
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
              {isCorrect ? 'Physics Intuition!' : 'The Elegant "Kick"!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🦶 The Kick Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Think of each chain link as a tiny lever. When the chain above pulls it upward,
              the link must <strong style={{ color: colors.chainLink }}>rotate</strong> to change
              direction. One end goes up, the other end pushes <strong style={{ color: colors.forceDown }}>
              down</strong> against whatever is below (the surface or other links).
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              By Newton's third law, that downward push creates an equal upward reaction force.
              This is the <strong style={{ color: colors.forceUp }}>"kick"</strong> that launches
              each link with extra upward velocity, creating the fountain!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📏 Why Stiffness Matters:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              A stiffer chain (like ball chain) has links that resist bending. They must rotate
              more forcefully, creating a bigger kick. A flexible rope can simply curve smoothly
              without any kick - no fountain!
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
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
            }}>
              {transferApplications.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: transferCompleted.has(i) ? colors.success : 'rgba(71, 85, 105, 0.5)',
                  }}
                />
              ))}
            </div>
          </div>

          {transferApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => {
                setTransferCompleted(prev => new Set([...prev, app.id]));
              }}
              style={{
                background: transferCompleted.has(app.id)
                  ? 'rgba(16, 185, 129, 0.1)'
                  : colors.bgCard,
                border: transferCompleted.has(app.id)
                  ? '2px solid rgba(16, 185, 129, 0.3)'
                  : '2px solid transparent',
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                  💡 {app.insight}
                </p>
              </div>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  // TEST PHASE
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
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '🏆' : score >= 60 ? '📚' : '💪'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                {correctCount} of {testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const isCorrect = userAnswer === correctOption?.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    margin: '12px 16px',
                    padding: '14px',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                      Q{idx + 1}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>
                    {q.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0 }}>
                      Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete! 🎉' : 'Review & Continue →')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              📝 Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {answeredCount} of {testQuestions.length} answered
            </p>
          </div>

          {testQuestions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                {idx + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: option.id }))}
                    style={{
                      padding: '10px 14px',
                      background: testAnswers[q.id] === option.id
                        ? 'rgba(251, 191, 36, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(251, 191, 36, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allAnswered ? (
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
            <button
              onClick={() => setTestSubmitted(true)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                border: 'none',
                borderRadius: '12px',
                color: '#0f172a',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          renderBottomBar(false, false, '')
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
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Chain Dynamics Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered the Mould Effect
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>
              🎓 What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Chains rise due to "kick" from link rotation</li>
              <li>Newton's 3rd law creates the upward force</li>
              <li>Stiff chains = bigger fountain</li>
              <li>Higher drop = higher fountain (more momentum)</li>
              <li>Same physics applies to cables & polymers</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(217, 119, 6, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Try It Yourself:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Get a ball chain (like the ones used for keychains or light pulls), pile it in
              a mug, and drop one end over the side. Start with a low drop and increase it.
              You'll see the fountain grow! Share the video and explain the physics to your
              friends.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p>
    </div>
  );
};

export default ChainFountainRenderer;
