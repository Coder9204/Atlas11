import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 109: BOTTLE TORNADO (VORTEX)
// The water vortex when draining a spinning bottle
// Demonstrates angular momentum conservation and vortex dynamics
// ============================================================================

interface BottleTornadoRendererProps {
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

  // Water colors
  water: '#38bdf8',
  waterDeep: '#0284c7',
  waterLight: '#7dd3fc',
  waterBubble: '#bae6fd',

  // Vortex colors
  vortexCore: '#1e3a8a',
  vortexEdge: '#60a5fa',
  vortexHighlight: '#93c5fd',

  // Bottle colors
  bottle: 'rgba(200, 220, 255, 0.3)',
  bottleEdge: 'rgba(200, 220, 255, 0.6)',

  // Air colors
  airCore: 'rgba(255, 255, 255, 0.1)',

  // UI colors
  accent: '#22d3ee',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const BottleTornadoRenderer: React.FC<BottleTornadoRendererProps> = ({
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

  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [spinSpeed, setSpinSpeed] = useState(50); // 0-100
  const [bottleAngle, setBottleAngle] = useState(180); // 180 = upside down
  const [neckWidth, setNeckWidth] = useState(50); // 0-100

  // Simulation state
  const [waterLevel, setWaterLevel] = useState(100);
  const [isDraining, setIsDraining] = useState(false);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateVortexStrength = useCallback(() => {
    // Vortex forms when angular momentum is conserved as water drains
    // Stronger vortex with more spin and narrower neck
    const spinFactor = spinSpeed / 100;
    const neckFactor = 1 - (neckWidth / 200); // Narrower = stronger
    const vortexStrength = spinFactor * (1 + neckFactor);
    return Math.min(1, vortexStrength);
  }, [spinSpeed, neckWidth]);

  const calculateDrainRate = useCallback(() => {
    // With vortex: air enters through center, water drains faster
    // Without vortex: water and air compete at opening = slower
    const vortexStrength = calculateVortexStrength();
    const baseRate = 0.3; // Without vortex
    const vortexBonus = vortexStrength * 0.5;
    const angleEffect = Math.sin((bottleAngle * Math.PI) / 180);

    return baseRate + vortexBonus * angleEffect;
  }, [calculateVortexStrength, bottleAngle]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);

      if (isDraining && waterLevel > 0) {
        const drainRate = calculateDrainRate();
        setWaterLevel(prev => Math.max(0, prev - drainRate));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, isDraining, calculateDrainRate, waterLevel]);

  // Reset water for demonstration
  const resetWater = () => {
    setWaterLevel(100);
    setIsDraining(false);
  };

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const vortexStrength = calculateVortexStrength();
    const drainRate = calculateDrainRate();

    // Vortex core radius (air column in center)
    const coreRadius = 5 + vortexStrength * 15;

    // Water spiral parameters
    const spiralTurns = 2 + vortexStrength * 3;
    const spiralWidth = 8 - vortexStrength * 4;

    // Calculate bottle rotation
    const bottleRotation = bottleAngle - 180;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Water gradient */}
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.waterLight} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.waterDeep} stopOpacity="0.9" />
            </linearGradient>

            {/* Vortex gradient */}
            <radialGradient id="vortexGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.airCore} />
              <stop offset="30%" stopColor={colors.vortexCore} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.vortexEdge} stopOpacity="0.8" />
            </radialGradient>

            {/* Bottle gradient */}
            <linearGradient id="bottleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.bottleEdge} />
              <stop offset="50%" stopColor={colors.bottle} />
              <stop offset="100%" stopColor={colors.bottleEdge} />
            </linearGradient>

            {/* Clip path for water inside bottle */}
            <clipPath id="bottleClip">
              <path d="M 150,50 L 250,50 L 250,200 Q 250,230 220,230 L 220,310 Q 220,320 200,320 Q 180,320 180,310 L 180,230 Q 150,230 150,200 Z" />
            </clipPath>
          </defs>

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Bottle Tornado
          </text>

          {/* Bottle container (rotated) */}
          <g transform={`rotate(${bottleRotation}, 200, 180)`}>
            {/* Bottle outline */}
            <path
              d="M 150,50 L 250,50 L 250,200 Q 250,230 220,230 L 220,310 Q 220,320 200,320 Q 180,320 180,310 L 180,230 Q 150,230 150,200 Z"
              fill="url(#bottleGradient)"
              stroke={colors.bottleEdge}
              strokeWidth="2"
            />

            {/* Water inside bottle */}
            <g clipPath="url(#bottleClip)">
              {/* Static water level */}
              <rect
                x="150"
                y={50 + (100 - waterLevel) * 2.7}
                width="100"
                height={waterLevel * 2.7}
                fill="url(#waterGradient)"
              />

              {/* Vortex funnel (when draining) */}
              {isDraining && vortexStrength > 0.1 && waterLevel > 10 && (
                <g>
                  {/* Vortex funnel shape */}
                  <path
                    d={`M ${200 - coreRadius * 2},${320 - waterLevel * 1.5}
                        Q ${200 - coreRadius * 3},${280} ${200 - coreRadius * 0.5},${320}
                        L ${200 + coreRadius * 0.5},${320}
                        Q ${200 + coreRadius * 3},${280} ${200 + coreRadius * 2},${320 - waterLevel * 1.5}
                        Z`}
                    fill={colors.airCore}
                    stroke={colors.vortexHighlight}
                    strokeWidth="1"
                  />

                  {/* Rotating water spiral lines */}
                  {[0, 1, 2, 3].map(i => {
                    const angle = (animationTime * 4 * (spinSpeed / 50) + i * 90) * (Math.PI / 180);
                    const startY = 320 - waterLevel * 1.2;
                    const endY = 320;
                    const startR = coreRadius * 2;
                    const endR = coreRadius * 0.3;

                    const path = [];
                    for (let t = 0; t <= 1; t += 0.1) {
                      const y = startY + (endY - startY) * t;
                      const r = startR + (endR - startR) * t;
                      const a = angle + t * spiralTurns * Math.PI;
                      const x = 200 + Math.cos(a) * r;
                      path.push(`${t === 0 ? 'M' : 'L'} ${x},${y}`);
                    }

                    return (
                      <path
                        key={i}
                        d={path.join(' ')}
                        fill="none"
                        stroke={colors.vortexHighlight}
                        strokeWidth={spiralWidth}
                        strokeOpacity={0.6}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}

              {/* Air bubbles (without vortex) */}
              {isDraining && vortexStrength < 0.3 && waterLevel > 20 && (
                <>
                  {[0, 1, 2, 3, 4].map(i => {
                    const bubblePhase = (animationTime * 2 + i * 0.5) % 2;
                    const y = 320 - bubblePhase * (100 + waterLevel);
                    const x = 190 + Math.sin(animationTime + i) * 15;
                    const size = 3 + Math.sin(animationTime * 3 + i) * 2;

                    if (y < 50 || y > 320) return null;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={size}
                        fill={colors.waterBubble}
                        opacity={0.6}
                      />
                    );
                  })}
                </>
              )}
            </g>

            {/* Neck opening indicator */}
            <ellipse
              cx="200"
              cy="320"
              rx={10 + neckWidth / 10}
              ry="3"
              fill={colors.bottleEdge}
            />
          </g>

          {/* Draining water stream */}
          {isDraining && waterLevel > 5 && (
            <g>
              {vortexStrength > 0.3 ? (
                // Smooth stream with vortex
                <path
                  d={`M 195,${180 + bottleRotation / 2} Q 190,${220 + bottleRotation / 3} 185,350`}
                  fill="none"
                  stroke={colors.water}
                  strokeWidth={4 + drainRate * 4}
                  strokeOpacity="0.7"
                />
              ) : (
                // Glugging without vortex
                <>
                  {[0, 1, 2].map(i => {
                    const glugPhase = (animationTime * 3 + i * 0.7) % 1.5;
                    if (glugPhase > 1) return null;
                    return (
                      <ellipse
                        key={i}
                        cx={200 + Math.sin(animationTime * 5) * 5}
                        cy={180 + bottleRotation / 2 + glugPhase * 100}
                        rx={6 + Math.sin(glugPhase * Math.PI) * 4}
                        ry={8 + Math.sin(glugPhase * Math.PI) * 6}
                        fill={colors.water}
                        opacity={0.7 - glugPhase * 0.5}
                      />
                    );
                  })}
                </>
              )}
            </g>
          )}

          {/* Info panel */}
          <g transform="translate(10, 290)">
            <rect x="0" y="0" width="170" height="75" fill={colors.bgCard} rx="6" />
            <text x="10" y="18" fill={colors.textMuted} fontSize="10">Vortex Strength:</text>
            <rect x="10" y="24" width="150" height="8" fill="rgba(71, 85, 105, 0.5)" rx="4" />
            <rect x="10" y="24" width={150 * vortexStrength} height="8" fill={colors.accent} rx="4" />

            <text x="10" y="48" fill={colors.textMuted} fontSize="10">Drain Rate:</text>
            <text x="10" y="63" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              {(drainRate * 100).toFixed(0)}% {vortexStrength > 0.3 ? '(Fast!)' : '(Slow - glugging)'}
            </text>
          </g>

          {/* Water level indicator */}
          <g transform="translate(320, 290)">
            <rect x="0" y="0" width="70" height="75" fill={colors.bgCard} rx="6" />
            <text x="35" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="10">Water</text>
            <rect x="20" y="25" width="30" height="40" fill="rgba(71, 85, 105, 0.5)" rx="4" />
            <rect
              x="20"
              y={25 + (100 - waterLevel) * 0.4}
              width="30"
              height={waterLevel * 0.4}
              fill={colors.water}
              rx="4"
            />
            <text x="35" y="72" textAnchor="middle" fill={colors.textPrimary} fontSize="11">
              {Math.round(waterLevel)}%
            </text>
          </g>

          {/* Physics explanation */}
          <g transform="translate(200, 290)">
            <rect x="0" y="0" width="110" height="75" fill={colors.bgCard} rx="6" />
            <text x="55" y="15" textAnchor="middle" fill={colors.textMuted} fontSize="9">Physics:</text>
            {vortexStrength > 0.3 ? (
              <>
                <text x="55" y="32" textAnchor="middle" fill={colors.vortexHighlight} fontSize="9">
                  Air enters center
                </text>
                <text x="55" y="47" textAnchor="middle" fill={colors.water} fontSize="9">
                  Water spirals out
                </text>
                <text x="55" y="62" textAnchor="middle" fill={colors.success} fontSize="9">
                  = Smooth flow!
                </text>
              </>
            ) : (
              <>
                <text x="55" y="32" textAnchor="middle" fill={colors.warning} fontSize="9">
                  Air & water compete
                </text>
                <text x="55" y="47" textAnchor="middle" fill={colors.warning} fontSize="9">
                  at same opening
                </text>
                <text x="55" y="62" textAnchor="middle" fill={colors.error} fontSize="9">
                  = Glugging!
                </text>
              </>
            )}
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
        🎮 Control the Tornado:
      </div>

      {/* Drain Button */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => {
            if (waterLevel <= 5) {
              resetWater();
            } else {
              setIsDraining(!isDraining);
            }
          }}
          style={{
            flex: 1,
            padding: '14px',
            background: isDraining
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22d3ee, #06b6d4)',
            border: 'none',
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {waterLevel <= 5 ? '🔄 Refill' : isDraining ? '⏸️ Pause' : '▶️ Start Draining'}
        </button>
      </div>

      {/* Spin Speed Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🌀 Spin Speed: {spinSpeed}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={spinSpeed}
          onChange={(e) => setSpinSpeed(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>No Spin (glugging)</span>
          <span>Fast Spin (vortex!)</span>
        </div>
      </div>

      {/* Bottle Angle Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Bottle Angle: {bottleAngle}°
        </label>
        <input
          type="range"
          min="90"
          max="180"
          value={bottleAngle}
          onChange={(e) => setBottleAngle(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Sideways (90°)</span>
          <span>Upside Down (180°)</span>
        </div>
      </div>

      {/* Neck Width Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          ⚪ Neck Opening: {neckWidth}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={neckWidth}
          onChange={(e) => setNeckWidth(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Narrow</span>
          <span>Wide</span>
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'faster', text: 'The spinning water drains FASTER', correct: true },
    { id: 'slower', text: 'The spinning water drains SLOWER' },
    { id: 'same', text: 'Same speed, spinning makes no difference' },
    { id: 'stops', text: 'The spin prevents draining entirely' },
  ];

  const twistPredictions = [
    { id: 'clockwise', text: 'Yes - clockwise in the Northern Hemisphere' },
    { id: 'counter', text: 'Yes - counter-clockwise in the Northern Hemisphere' },
    { id: 'depends', text: 'It depends on the initial motion you give it', correct: true },
    { id: 'random', text: 'It spins randomly every time' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'Why does a spinning vortex help water drain faster?',
      options: [
        { id: 'a', text: 'The spin pushes water down harder' },
        { id: 'b', text: 'Air enters through the center while water exits around it', correct: true },
        { id: 'c', text: 'The vortex creates suction' },
        { id: 'd', text: 'Centrifugal force increases gravity' },
      ],
    },
    {
      id: 2,
      question: 'What physical principle keeps the vortex spinning?',
      options: [
        { id: 'a', text: 'Gravity' },
        { id: 'b', text: 'Conservation of angular momentum', correct: true },
        { id: 'c', text: 'Magnetic fields' },
        { id: 'd', text: 'Air pressure' },
      ],
    },
    {
      id: 3,
      question: 'What happens when you try to drain without any spin?',
      options: [
        { id: 'a', text: 'Water drains faster' },
        { id: 'b', text: 'The bottle explodes' },
        { id: 'c', text: 'Air and water compete at the opening, causing glugging', correct: true },
        { id: 'd', text: 'Nothing - water won\'t drain' },
      ],
    },
    {
      id: 4,
      question: 'As water spirals toward the center of the vortex, what happens to its speed?',
      options: [
        { id: 'a', text: 'It slows down' },
        { id: 'b', text: 'It speeds up (angular momentum conservation)', correct: true },
        { id: 'c', text: 'Speed stays constant' },
        { id: 'd', text: 'Speed becomes zero' },
      ],
    },
    {
      id: 5,
      question: 'Does the Coriolis effect determine which way bathtub water spins?',
      options: [
        { id: 'a', text: 'Yes - clockwise in Northern Hemisphere' },
        { id: 'b', text: 'Yes - counter-clockwise in Northern Hemisphere' },
        { id: 'c', text: 'No - at small scales, initial conditions dominate', correct: true },
        { id: 'd', text: 'Only near the equator' },
      ],
    },
    {
      id: 6,
      question: 'How does a narrower bottle neck affect the vortex?',
      options: [
        { id: 'a', text: 'Weakens the vortex' },
        { id: 'b', text: 'Strengthens the vortex (water spins faster)', correct: true },
        { id: 'c', text: 'No effect' },
        { id: 'd', text: 'Prevents vortex formation' },
      ],
    },
    {
      id: 7,
      question: 'What creates the characteristic funnel shape of the vortex?',
      options: [
        { id: 'a', text: 'The shape of the bottle' },
        { id: 'b', text: 'Air pressure is lower in the fast-spinning center', correct: true },
        { id: 'c', text: 'Water is heavier at the edges' },
        { id: 'd', text: 'Magnetic forces' },
      ],
    },
    {
      id: 8,
      question: 'Why do ice skaters spin faster when they pull their arms in?',
      options: [
        { id: 'a', text: 'Less air resistance' },
        { id: 'b', text: 'They push harder against the ice' },
        { id: 'c', text: 'Conservation of angular momentum - smaller radius = faster spin', correct: true },
        { id: 'd', text: 'They become lighter' },
      ],
    },
    {
      id: 9,
      question: 'Where is the water moving FASTEST in the vortex?',
      options: [
        { id: 'a', text: 'At the outer edge' },
        { id: 'b', text: 'Near the center of the funnel', correct: true },
        { id: 'c', text: 'At the top of the bottle' },
        { id: 'd', text: 'Speed is the same everywhere' },
      ],
    },
    {
      id: 10,
      question: 'Real tornadoes and the bottle vortex share which property?',
      options: [
        { id: 'a', text: 'Both are caused by the Coriolis effect' },
        { id: 'b', text: 'Both have low pressure cores with inward-spiraling flow', correct: true },
        { id: 'c', text: 'Both rotate the same direction' },
        { id: 'd', text: 'Both require water' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🌪️ Real Tornadoes',
      description: 'Tornadoes form when rotating air stretches vertically. Just like the bottle vortex speeds up as water moves inward, tornado winds accelerate as air spirals toward the low-pressure core.',
      insight: 'The same angular momentum conservation that makes your bottle drain faster creates 300 mph tornado winds.',
    },
    {
      id: 1,
      title: '⛸️ Figure Skating Spins',
      description: 'When skaters pull their arms in during a spin, they rotate faster - same principle as water accelerating toward the vortex center. This is conservation of angular momentum in action.',
      insight: 'A skater can go from 2 rotations per second to over 6 just by changing arm position!',
    },
    {
      id: 2,
      title: '🛁 Bathtub Drains',
      description: 'The famous question: does water always drain clockwise/counter-clockwise based on hemisphere? At household scales, the Coriolis effect is negligible - initial conditions and drain shape dominate.',
      insight: 'You\'d need a perfectly still, symmetric drain and hours of waiting for Coriolis to matter. Your hand motion determines the spin!',
    },
    {
      id: 3,
      title: '🌀 Centrifugal Separators',
      description: 'Industrial centrifuges use vortex principles to separate materials. In cream separators, cyclone dust collectors, and blood centrifuges, spinning creates density-based separation.',
      insight: 'The same physics that makes your bottle drain faster is used to separate uranium isotopes in enrichment facilities.',
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
              ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
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
              🌀 The Bottle Tornado
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 109: Vortex Dynamics
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
                🤯 The Magic Trick
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Want to empty a water bottle <strong>twice as fast</strong>? Just give it a swirl!
                The spinning water creates a <strong style={{ color: colors.vortexHighlight }}>tornado-like
                vortex</strong> that drains way faster than regular "glugging."
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                Same physics as <span style={{ color: colors.accent }}>real tornadoes</span>!
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                The bottle vortex demonstrates angular momentum conservation - the same principle
                that makes tornado winds accelerate to 300 mph and lets ice skaters spin faster
                when they pull their arms in!
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
              This is an <strong>upside-down water bottle</strong> draining. When you give the
              water a spin before flipping, it creates a vortex - a spinning funnel with an
              <span style={{ color: colors.airCore }}> air core</span> in the center and
              <span style={{ color: colors.water }}> water spiraling</span> around the edges.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              Without spin, the water "glugs" as air bubbles fight their way up through the water.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Compared to no spin, what happens when you spin the water?
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
                      ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #67e8f9' : '2px solid transparent',
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
              🔬 Create Your Tornado!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust spin speed and watch how it affects draining
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
              <li>Set spin to 0% → watch the slow "glugging"</li>
              <li>Increase spin → see the vortex form and drain speed up</li>
              <li>Try different bottle angles</li>
              <li>Narrow the neck → stronger vortex!</li>
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
              {isCorrect ? 'Excellent Prediction!' : 'Interesting Thinking!'}
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
              The vortex creates a <strong style={{ color: colors.accent }}>central air column</strong>
              surrounded by <strong style={{ color: colors.water }}>spiraling water</strong>.
              This solves the "competition problem" - air enters through the center while water
              exits around it. No more glugging!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Without spin, air and water must take turns at the opening. Air bubble goes up,
              water glug goes down, repeat. This is much slower!
            </p>
            <div style={{
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                Conservation of angular momentum: as water spirals inward, it speeds up
                (like a spinning skater pulling arms in), maintaining the vortex.
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
              💨 Low Pressure Core:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The fast-spinning water creates <strong>low pressure in the center</strong> - this is
              why the air column forms there. It's the same physics that creates the "eye" of
              a hurricane!
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
              The Coriolis Question
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
              🌍 The Famous Question:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              You've probably heard that water drains clockwise in one hemisphere and counter-clockwise
              in the other, due to Earth's rotation (the <strong>Coriolis effect</strong>).
              Does this actually determine which way the vortex spins in your bottle or bathtub?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Does the Coriolis effect determine your bathtub's spin direction?
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
        {renderBottomBar(true, !!twistPrediction, 'See The Truth →')}
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
              🔬 Scale Matters!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See why Coriolis doesn't matter at small scales
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
              <li>You control the spin direction by how YOU swirl it</li>
              <li>There's no preferred direction at this scale</li>
              <li>Coriolis is only ~0.00001 g at sink scales</li>
              <li>Your hand motion is billions of times stronger</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Learn The Truth →')}
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
              {isCorrect ? 'You Busted the Myth!' : 'Common Misconception!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🌍 The Coriolis Myth:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              At household scales, the Coriolis effect is <strong style={{ color: colors.error }}>
              completely negligible</strong>! The force is proportional to the scale of the
              rotation. For a bathtub, it's about 0.00001 g - a billion times weaker than the
              force from how you pulled the plug!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              <strong style={{ color: colors.accent }}>Initial conditions dominate</strong>: how the
              water was moving before you opened the drain, asymmetries in the drain shape, even
              air currents in the room all matter far more than Earth's rotation.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🌀 When Coriolis DOES Matter:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              For large-scale systems like hurricanes (hundreds of kilometers), ocean currents,
              and atmospheric circulation, the Coriolis effect absolutely matters. It's why
              hurricanes spin counter-clockwise in the Northern Hemisphere. But for your
              bathtub? <strong style={{ color: colors.warning }}>Not even close.</strong>
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
                background: 'rgba(34, 211, 238, 0.1)',
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
                        ? 'rgba(34, 211, 238, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(34, 211, 238, 0.5)'
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
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
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
              Vortex Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered angular momentum & vortex dynamics
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
              <li>Vortices create separate paths for air and water</li>
              <li>Angular momentum conservation accelerates the spin</li>
              <li>Fast-spinning cores have low pressure</li>
              <li>Coriolis effect is negligible at household scales</li>
              <li>Same physics applies to tornadoes and hurricanes</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(34, 211, 238, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Try It At Home:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Grab two identical bottles, fill them with water, and race them! Flip one normally
              (glugging) and give the other a good swirl first (vortex). The vortex bottle will
              empty in about half the time. You've just demonstrated conservation of angular
              momentum!
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

export default BottleTornadoRenderer;
