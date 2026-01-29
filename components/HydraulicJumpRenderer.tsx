import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 107: HYDRAULIC JUMP
// The circular ring phenomenon when faucet water hits a flat surface
// Demonstrates supercritical to subcritical flow transition
// ============================================================================

interface HydraulicJumpRendererProps {
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
  waterFast: '#38bdf8',      // Supercritical - light blue
  waterSlow: '#0284c7',      // Subcritical - darker blue
  waterJump: '#7dd3fc',      // Jump zone - bright
  waterSpray: '#bae6fd',     // Spray/turbulence

  // Surface colors
  surface: '#64748b',
  surfaceHighlight: '#94a3b8',

  // UI colors
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',

  // Flow indicators
  fastFlow: '#f97316',
  slowFlow: '#3b82f6',
};

// Physics constants
const GRAVITY = 9.81;

const HydraulicJumpRenderer: React.FC<HydraulicJumpRendererProps> = ({
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
  const [flowRate, setFlowRate] = useState(50); // 0-100
  const [faucetHeight, setFaucetHeight] = useState(50); // 0-100
  const [surfaceTexture, setSurfaceTexture] = useState<'smooth' | 'rough'>('smooth');

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateJumpRadius = useCallback(() => {
    // Jump radius depends on flow rate and height
    const Q = (flowRate / 100) * 0.0005; // Flow rate in m³/s
    const H = (faucetHeight / 100) * 0.3 + 0.1; // Height 0.1-0.4m
    const nu = 0.000001; // Kinematic viscosity of water

    // Simplified Watson formula for hydraulic jump radius
    // R ∝ (Q^(5/8))/(g^(1/8) * nu^(1/4))
    const R = Math.pow(Q, 5/8) / (Math.pow(GRAVITY, 1/8) * Math.pow(nu, 1/4));

    // Normalize for display (20-80 range)
    return 20 + Math.min(60, R * 2000);
  }, [flowRate, faucetHeight]);

  const calculateFroudeNumber = useCallback((radius: number, inSupercritical: boolean) => {
    // Froude number Fr = v / sqrt(g*h)
    // Supercritical: Fr > 1 (fast, shallow)
    // Subcritical: Fr < 1 (slow, deep)
    const baseVelocity = (flowRate / 100) * 2 + 0.5;

    if (inSupercritical) {
      // Before jump: fast, shallow
      const depth = 0.002 + (radius / 1000);
      const velocity = baseVelocity / (radius / 30);
      return velocity / Math.sqrt(GRAVITY * depth);
    } else {
      // After jump: slow, deep
      const depth = 0.01 + (radius / 500);
      const velocity = baseVelocity / (radius / 10);
      return velocity / Math.sqrt(GRAVITY * depth);
    }
  }, [flowRate]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const jumpRadius = calculateJumpRadius();
    const froudeSuper = calculateFroudeNumber(jumpRadius / 2, true);
    const froudeSub = calculateFroudeNumber(jumpRadius * 1.5, false);
    const roughnessFactor = surfaceTexture === 'rough' ? 0.85 : 1.0;
    const adjustedRadius = jumpRadius * roughnessFactor;

    // Water stream width based on height
    const streamWidth = 3 + (100 - faucetHeight) / 20;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 350"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Water gradient for stream */}
            <linearGradient id="streamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.waterFast} stopOpacity="0.8" />
              <stop offset="50%" stopColor={colors.waterJump} stopOpacity="0.9" />
              <stop offset="100%" stopColor={colors.waterFast} stopOpacity="0.8" />
            </linearGradient>

            {/* Radial gradient for water spread */}
            <radialGradient id="waterSpread" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.waterFast} stopOpacity="0.9" />
              <stop offset={`${(adjustedRadius / 80) * 50}%`} stopColor={colors.waterJump} stopOpacity="1" />
              <stop offset={`${(adjustedRadius / 80) * 50 + 10}%`} stopColor={colors.waterSlow} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.waterSlow} stopOpacity="0.3" />
            </radialGradient>

            {/* Surface texture pattern */}
            <pattern id="surfacePattern" patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill={colors.surface} />
              {surfaceTexture === 'rough' && (
                <>
                  <circle cx="2" cy="3" r="1" fill={colors.surfaceHighlight} opacity="0.3" />
                  <circle cx="7" cy="8" r="1" fill={colors.surfaceHighlight} opacity="0.3" />
                </>
              )}
            </pattern>

            {/* Turbulence filter */}
            <filter id="turbulence">
              <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turb" />
              <feDisplacementMap in="SourceGraphic" in2="turb" scale="3" />
            </filter>
          </defs>

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Hydraulic Jump (Top View)
          </text>

          {/* Sink/Surface (top view) */}
          <ellipse
            cx="200"
            cy="190"
            rx="160"
            ry="120"
            fill="url(#surfacePattern)"
            stroke={colors.surfaceHighlight}
            strokeWidth="2"
          />

          {/* Water spread - outer region (subcritical) */}
          <ellipse
            cx="200"
            cy="190"
            rx={adjustedRadius + 50}
            ry={(adjustedRadius + 50) * 0.75}
            fill={colors.waterSlow}
            opacity="0.4"
          />

          {/* Jump zone - animated ring */}
          <ellipse
            cx="200"
            cy="190"
            rx={adjustedRadius + 5 + Math.sin(animationTime * 3) * 2}
            ry={(adjustedRadius + 5) * 0.75 + Math.sin(animationTime * 3) * 1.5}
            fill="none"
            stroke={colors.waterJump}
            strokeWidth={8 + Math.sin(animationTime * 5) * 2}
            opacity={0.7 + Math.sin(animationTime * 4) * 0.2}
          />

          {/* Inner region (supercritical) */}
          <ellipse
            cx="200"
            cy="190"
            rx={adjustedRadius}
            ry={adjustedRadius * 0.75}
            fill={colors.waterFast}
            opacity="0.7"
          />

          {/* Central impact point with animated ripples */}
          {[0, 1, 2].map((i) => {
            const ripplePhase = (animationTime * 2 + i * 2) % 6;
            const rippleRadius = ripplePhase * (adjustedRadius / 6);
            const rippleOpacity = Math.max(0, 1 - ripplePhase / 6);
            return (
              <ellipse
                key={i}
                cx="200"
                cy="190"
                rx={rippleRadius}
                ry={rippleRadius * 0.75}
                fill="none"
                stroke={colors.waterSpray}
                strokeWidth="1.5"
                opacity={rippleOpacity * 0.6}
              />
            );
          })}

          {/* Faucet stream (center) */}
          <circle
            cx="200"
            cy="190"
            r={streamWidth}
            fill="url(#streamGradient)"
          />

          {/* Flow direction arrows */}
          {interactive && [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const innerR = adjustedRadius * 0.4;
            const outerR = adjustedRadius * 0.8;
            const x1 = 200 + Math.cos(rad) * innerR;
            const y1 = 190 + Math.sin(rad) * innerR * 0.75;
            const x2 = 200 + Math.cos(rad) * outerR;
            const y2 = 190 + Math.sin(rad) * outerR * 0.75;

            return (
              <g key={angle}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={colors.fastFlow}
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                  opacity="0.7"
                />
              </g>
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill={colors.fastFlow} />
            </marker>
          </defs>

          {/* Labels */}
          <text x="200" y="145" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            Supercritical (Fast, Shallow)
          </text>
          <text x="200" y="160" textAnchor="middle" fill={colors.fastFlow} fontSize="10" fontWeight="bold">
            Fr = {froudeSuper.toFixed(1)} {'>'} 1
          </text>

          <text x="330" y="230" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            Subcritical
          </text>
          <text x="330" y="245" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
            (Slow, Deep)
          </text>
          <text x="330" y="260" textAnchor="middle" fill={colors.slowFlow} fontSize="10" fontWeight="bold">
            Fr = {froudeSub.toFixed(1)} {'<'} 1
          </text>

          {/* Jump zone label */}
          <text x="280" y="175" textAnchor="start" fill={colors.waterJump} fontSize="10" fontWeight="bold">
            ← JUMP
          </text>

          {/* Side view inset */}
          <g transform="translate(10, 260)">
            <rect x="0" y="0" width="130" height="70" fill={colors.bgCard} rx="5" />
            <text x="65" y="15" textAnchor="middle" fill={colors.textMuted} fontSize="9">
              Side View
            </text>

            {/* Surface line */}
            <line x1="10" y1="55" x2="120" y2="55" stroke={colors.surface} strokeWidth="2" />

            {/* Water profile - supercritical (thin) */}
            <path
              d={`M 30,55 Q 40,${52 - flowRate/20} 50,${50 - flowRate/15}`}
              fill="none"
              stroke={colors.waterFast}
              strokeWidth="3"
            />

            {/* Jump transition */}
            <path
              d={`M 50,${50 - flowRate/15} Q 55,35 60,30 Q 65,25 70,35`}
              fill="none"
              stroke={colors.waterJump}
              strokeWidth="3"
            />

            {/* Subcritical (thick) */}
            <path
              d={`M 70,35 Q 80,40 100,45 L 100,55 L 70,55 Z`}
              fill={colors.waterSlow}
              opacity="0.6"
            />

            {/* Faucet */}
            <rect x="25" y="20" width="8" height="20" fill={colors.surfaceHighlight} />
            <path
              d={`M 29,40 L 29,${50 - flowRate/15}`}
              stroke={colors.waterFast}
              strokeWidth={streamWidth/2}
              strokeLinecap="round"
            />
          </g>

          {/* Legend */}
          <g transform="translate(260, 285)">
            <rect x="0" y="0" width="130" height="50" fill={colors.bgCard} rx="5" />
            <circle cx="15" cy="15" r="6" fill={colors.waterFast} />
            <text x="28" y="18" fill={colors.textSecondary} fontSize="9">Fast, thin flow</text>
            <circle cx="15" cy="35" r="6" fill={colors.waterSlow} />
            <text x="28" y="38" fill={colors.textSecondary} fontSize="9">Slow, thick flow</text>
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
        🎮 Adjust Parameters:
      </div>

      {/* Flow Rate Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          💧 Flow Rate: {flowRate}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={flowRate}
          onChange={(e) => setFlowRate(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Trickle</span>
          <span>Full Blast</span>
        </div>
      </div>

      {/* Faucet Height Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📏 Faucet Height: {faucetHeight}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={faucetHeight}
          onChange={(e) => setFaucetHeight(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Surface Texture Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🔲 Surface Texture:
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['smooth', 'rough'] as const).map((texture) => (
            <button
              key={texture}
              onClick={() => setSurfaceTexture(texture)}
              style={{
                flex: 1,
                padding: '10px',
                background: surfaceTexture === texture ? colors.accent : 'rgba(71, 85, 105, 0.5)',
                border: 'none',
                borderRadius: '8px',
                color: colors.textPrimary,
                fontWeight: surfaceTexture === texture ? 'bold' : 'normal',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {texture}
            </button>
          ))}
        </div>
      </div>

      {/* Current measurements */}
      <div style={{
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Jump Radius:</div>
        <div style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold' }}>
          {calculateJumpRadius().toFixed(1)} mm
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Inner Froude #:</div>
        <div style={{ color: colors.fastFlow, fontSize: '11px', fontWeight: 'bold' }}>
          {calculateFroudeNumber(calculateJumpRadius() / 2, true).toFixed(2)}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Outer Froude #:</div>
        <div style={{ color: colors.slowFlow, fontSize: '11px', fontWeight: 'bold' }}>
          {calculateFroudeNumber(calculateJumpRadius() * 1.5, false).toFixed(2)}
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'larger', text: 'The jump ring moves FARTHER from center (larger radius)', correct: true },
    { id: 'smaller', text: 'The jump ring moves CLOSER to center (smaller radius)' },
    { id: 'same', text: 'The jump ring stays at the same location' },
    { id: 'disappears', text: 'The jump ring disappears entirely' },
  ];

  const twistPredictions = [
    { id: 'sink', text: 'The water would pool and flood the sink' },
    { id: 'smooth', text: 'The water would flow smoothly without any jump', correct: true },
    { id: 'bigger', text: 'The jump would become much larger' },
    { id: 'oscillate', text: 'The jump would oscillate back and forth' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What is the Froude number in the supercritical region (before the jump)?',
      options: [
        { id: 'a', text: 'Fr < 1' },
        { id: 'b', text: 'Fr = 1 exactly' },
        { id: 'c', text: 'Fr > 1', correct: true },
        { id: 'd', text: 'Fr = 0' },
      ],
    },
    {
      id: 2,
      question: 'What happens to water depth at the hydraulic jump?',
      options: [
        { id: 'a', text: 'Depth decreases suddenly' },
        { id: 'b', text: 'Depth increases suddenly', correct: true },
        { id: 'c', text: 'Depth stays constant' },
        { id: 'd', text: 'Depth oscillates' },
      ],
    },
    {
      id: 3,
      question: 'Why does a hydraulic jump occur?',
      options: [
        { id: 'a', text: 'Water freezes at that point' },
        { id: 'b', text: 'Surface tension pulls the water up' },
        { id: 'c', text: 'Fast shallow flow cannot smoothly transition to slow deep flow', correct: true },
        { id: 'd', text: 'Gravity suddenly increases' },
      ],
    },
    {
      id: 4,
      question: 'How does increasing flow rate affect the jump radius?',
      options: [
        { id: 'a', text: 'Jump moves closer to center' },
        { id: 'b', text: 'Jump moves farther from center', correct: true },
        { id: 'c', text: 'No effect on jump location' },
        { id: 'd', text: 'Jump disappears' },
      ],
    },
    {
      id: 5,
      question: 'What happens to energy at the hydraulic jump?',
      options: [
        { id: 'a', text: 'Energy is created' },
        { id: 'b', text: 'Energy is perfectly conserved' },
        { id: 'c', text: 'Energy is dissipated as turbulence and heat', correct: true },
        { id: 'd', text: 'Energy is stored for later' },
      ],
    },
    {
      id: 6,
      question: 'Why are hydraulic jumps used in dam spillways?',
      options: [
        { id: 'a', text: 'To make the water look pretty' },
        { id: 'b', text: 'To dissipate energy and prevent erosion', correct: true },
        { id: 'c', text: 'To speed up the water' },
        { id: 'd', text: 'To filter debris' },
      ],
    },
    {
      id: 7,
      question: 'What characterizes supercritical flow?',
      options: [
        { id: 'a', text: 'Slow and deep' },
        { id: 'b', text: 'Fast and shallow', correct: true },
        { id: 'c', text: 'Stationary' },
        { id: 'd', text: 'Moving uphill' },
      ],
    },
    {
      id: 8,
      question: 'A rough surface compared to a smooth surface will cause the jump to occur:',
      options: [
        { id: 'a', text: 'Closer to the center', correct: true },
        { id: 'b', text: 'Farther from the center' },
        { id: 'c', text: 'At the same location' },
        { id: 'd', text: 'Not at all' },
      ],
    },
    {
      id: 9,
      question: 'The hydraulic jump is analogous to which phenomenon in aerodynamics?',
      options: [
        { id: 'a', text: 'Laminar flow' },
        { id: 'b', text: 'Shock wave', correct: true },
        { id: 'c', text: 'Wind gust' },
        { id: 'd', text: 'Thermal updraft' },
      ],
    },
    {
      id: 10,
      question: 'If you reduced gravity (like on the Moon), the hydraulic jump would:',
      options: [
        { id: 'a', text: 'Not occur at all' },
        { id: 'b', text: 'Occur closer to center' },
        { id: 'c', text: 'Occur farther from center', correct: true },
        { id: 'd', text: 'Be exactly the same' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🏗️ Dam Spillways',
      description: 'Engineers design stilling basins below dam spillways to create controlled hydraulic jumps. The energy dissipation prevents erosion that would otherwise destroy the riverbed downstream.',
      insight: 'A single large dam can dissipate enough energy in its hydraulic jump to power a small city - but instead that energy safely disperses as harmless turbulence.',
    },
    {
      id: 1,
      title: '🏄 River Surfing',
      description: 'Standing waves in rivers occur where hydraulic jumps form over submerged obstacles. Surfers ride these "river waves" that stay in one place while the water flows through them.',
      insight: 'The wave shape is determined by the flow speed and depth - exactly the same physics as your kitchen sink, just scaled up dramatically.',
    },
    {
      id: 2,
      title: '✈️ Shock Waves',
      description: 'Hydraulic jumps are mathematically analogous to shock waves in compressible gas flow. Both involve a sudden transition from "supersonic" (supercritical) to "subsonic" (subcritical) flow.',
      insight: 'This analogy lets engineers study shock wave behavior using simple water channels - a technique called the "hydraulic analogy" or "water table".',
    },
    {
      id: 3,
      title: '🌊 Tidal Bores',
      description: 'When incoming tides enter funnel-shaped river mouths, the flow reversal can create traveling hydraulic jumps called tidal bores. The famous Severn Bore in England is surfable!',
      insight: 'Tidal bores can travel upstream for miles, with some bores reaching heights of several meters and speeds of 25 km/h.',
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
              ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
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
              🚰 The Kitchen Sink Mystery
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 107: Hydraulic Jump
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
                🤯 Have You Ever Noticed?
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Turn on your kitchen faucet and watch the water hit the sink. You'll see a thin,
                fast-moving layer of water spread outward... then suddenly <strong style={{ color: colors.waterJump }}>
                jump up</strong> into a thicker, slower ring!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                This is called a <span style={{ color: colors.accent }}>Hydraulic Jump</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                It's the same physics that engineers use to prevent dams from destroying riverbeds,
                that creates surfable standing waves in rivers, and that's mathematically identical
                to supersonic shock waves in air!
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
              This is a <strong>top-down view</strong> of water hitting a flat surface (like a sink).
              The water from the faucet spreads outward in a thin, fast layer (<span style={{ color: colors.fastFlow }}>
              supercritical flow</span>), then abruptly jumps up into a thicker, slower layer
              (<span style={{ color: colors.slowFlow }}>subcritical flow</span>).
              The bright ring marks where this transition occurs.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              The <strong>Froude number (Fr)</strong> tells us the flow regime: Fr {'>'} 1 means
              supercritical (fast), Fr {'<'} 1 means subcritical (slow).
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 If you INCREASE the water flow rate, what happens to the jump?
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
                      ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #22d3ee' : '2px solid transparent',
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
              🔬 Experiment Time!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the controls and watch how the hydraulic jump responds
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
              <li>Increase flow rate → watch the jump move outward</li>
              <li>Decrease flow rate → watch the jump move inward</li>
              <li>Switch to rough surface → notice the jump occurs closer</li>
              <li>Raise the faucet height → more velocity = larger jump radius</li>
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
              When you <strong>increase flow rate</strong>, the fast supercritical region extends
              farther before the transition can occur. The jump ring moves <strong style={{ color: colors.accent }}>
              outward (larger radius)</strong>.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              This happens because the higher momentum carries the water farther before friction
              and gravity can slow it enough to force the transition to subcritical flow.
            </p>
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                The jump occurs where the Froude number drops from above 1 to below 1.
                Higher flow rates maintain Fr {'>'} 1 farther from center.
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
              🔄 Energy at the Jump:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The hydraulic jump is <strong>not</strong> a smooth transition - it's an abrupt,
              turbulent discontinuity. Energy is <strong style={{ color: colors.error }}>dissipated</strong> as
              heat and sound in the turbulent zone. This is why engineers use hydraulic jumps
              to safely reduce water energy below dams!
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
              What if we could magically remove viscosity?
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
              🧪 The Thought Experiment:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Imagine water with <strong>zero viscosity</strong> (a "superfluid"). There's no friction
              between water layers or with the surface. What would happen to the hydraulic jump?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Without viscosity, what happens?
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
        {renderBottomBar(true, !!twistPrediction, 'See What Happens →')}
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
              🔬 Exploring Inviscid Flow
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how viscosity creates the conditions for the jump
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
              <li>Viscosity slows the water through friction</li>
              <li>Without viscosity, the water would thin indefinitely</li>
              <li>Rough surfaces increase effective "viscosity"</li>
              <li>The jump requires something to slow down the flow</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Understand the Twist →')}
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
              {isCorrect ? 'You Got It!' : 'Counterintuitive Result!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🌊 No Viscosity = No Jump!
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Without viscosity, the water would spread outward indefinitely as an ever-thinner,
              ever-faster layer. The flow would remain <strong>supercritical forever</strong>
              - there's nothing to slow it down and force the transition!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Viscosity (friction) is <strong style={{ color: colors.accent }}>essential</strong> for
              creating the conditions where a hydraulic jump can occur. It's the resistance that
              eventually slows the flow enough that it must transition to subcritical.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🧊 Real-World Analogy:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Superfluid helium (at near absolute zero) actually demonstrates this! It flows
              without viscosity and can climb walls, pass through tiny cracks, and flows
              without any hydraulic jump formation.
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
                background: 'rgba(6, 182, 212, 0.1)',
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
                        ? 'rgba(6, 182, 212, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(6, 182, 212, 0.5)'
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
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
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
              Hydraulic Jump Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered the physics of flow transitions
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
              <li>Supercritical flow (Fr {'>'} 1): fast and shallow</li>
              <li>Subcritical flow (Fr {'<'} 1): slow and deep</li>
              <li>Hydraulic jumps dissipate energy as turbulence</li>
              <li>The jump radius depends on flow rate and viscosity</li>
              <li>Engineers use jumps to protect dam spillways</li>
              <li>The physics is analogous to shock waves in air</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Keep Exploring:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Next time you're at a sink, try adjusting the flow rate and watch the jump move!
              Try different surfaces too - a cutting board vs the sink basin. You're now seeing
              the same physics that engineers use to design billion-dollar dam projects.
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

export default HydraulicJumpRenderer;
