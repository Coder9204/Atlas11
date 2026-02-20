import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAME 107: HYDRAULIC JUMP
// The circular ring phenomenon when faucet water hits a flat surface
// Demonstrates supercritical to subcritical flow transition
// ============================================================================

interface HydraulicJumpRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast
const colors = {
  // Text colors - HIGH CONTRAST (all >= 180 brightness)
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for accessibility

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
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // ==================== SELF-MANAGED PHASE NAVIGATION ====================
  const phaseNames = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const [internalPhase, setInternalPhase] = useState<string>('hook');

  // External prop overrides internal state when present
  const externalPhase = gamePhase || phaseProp;
  const phase = externalPhase || internalPhase;

  // Validate phase - default to 'hook' for invalid values
  const validPhase = phaseNames.includes(phase) ? phase : 'hook';
  const currentPhaseIndex = phaseNames.indexOf(validPhase);

  const goToNextPhase = () => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < phaseNames.length) {
      if (!externalPhase) {
        setInternalPhase(phaseNames[nextIndex]);
      }
      onPhaseComplete?.();
    }
  };

  const goToPrevPhase = () => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0 && !externalPhase) {
      setInternalPhase(phaseNames[prevIndex]);
    }
  };

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
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
  const [flowRate, setFlowRate] = useState(50); // 0-100
  const [faucetHeight, setFaucetHeight] = useState(50); // 0-100
  const [surfaceTexture, setSurfaceTexture] = useState<'smooth' | 'rough'>('smooth');

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateJumpRadius = useCallback(() => {
    // Jump radius depends on flow rate and height
    const Q = (flowRate / 100) * 0.0005; // Flow rate in m^3/s
    const H = (faucetHeight / 100) * 0.3 + 0.1; // Height 0.1-0.4m
    const nu = 0.000001; // Kinematic viscosity of water

    // Simplified Watson formula for hydraulic jump radius
    // R proportional to (Q^(5/8))/(g^(1/8) * nu^(1/4))
    const R = Math.pow(Q, 5/8) / (Math.pow(GRAVITY, 1/8) * Math.pow(nu, 1/4));

    // Normalize for display (20-80 range)
    return 20 + Math.min(60, R * 2000);
  }, [flowRate, faucetHeight]);

  const calculateFroudeNumber = useCallback((radius: number, inSupercritical: boolean) => {
    const baseVelocity = (flowRate / 100) * 2 + 0.5;

    if (inSupercritical) {
      const depth = 0.002 + (radius / 1000);
      const velocity = baseVelocity / (radius / 30);
      return velocity / Math.sqrt(GRAVITY * depth);
    } else {
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

    // Side view profile path data with M and L commands for proper vertical span
    const sideProfilePoints: string[] = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const x = 30 + (i / numPoints) * 340;
      const normalizedX = i / numPoints;
      let y: number;
      if (normalizedX < 0.15) {
        // Faucet stream coming down
        y = 40 + normalizedX * 100;
      } else if (normalizedX < 0.35) {
        // Supercritical thin layer
        const t = (normalizedX - 0.15) / 0.2;
        y = 280 - (10 + t * 5) * (flowRate / 50);
      } else if (normalizedX < 0.45) {
        // Hydraulic jump - sharp rise
        const t = (normalizedX - 0.35) / 0.1;
        const jumpHeight = 80 + (flowRate / 100) * 60;
        y = 280 - (15 * (flowRate / 50)) - t * jumpHeight;
      } else if (normalizedX < 0.55) {
        // Jump turbulent zone
        const t = (normalizedX - 0.45) / 0.1;
        const jumpHeight = 80 + (flowRate / 100) * 60;
        y = 280 - (15 * (flowRate / 50)) - jumpHeight + t * (jumpHeight * 0.3);
      } else {
        // Subcritical deep flow
        const t = (normalizedX - 0.55) / 0.45;
        const baseDepth = 50 + (flowRate / 100) * 40;
        y = 280 - baseDepth + t * 20;
      }
      const cmd = i === 0 ? 'M' : 'L';
      sideProfilePoints.push(`${cmd} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const sideProfilePath = sideProfilePoints.join(' ');

    // Interactive marker position on the side-view profile
    const markerFraction = flowRate / 100;
    const markerX = 30 + (0.4 * 340); // at the jump location
    const markerJumpHeight = 80 + markerFraction * 60;
    const markerY = 280 - (15 * markerFraction) - markerJumpHeight;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        {/* Title label outside SVG */}
        <div style={{
          textAlign: 'center',
          marginBottom: typo.elementGap,
          color: colors.textPrimary,
          fontSize: typo.body,
          fontWeight: 'bold',
        }}>
          Hydraulic Jump Cross-Section
        </div>

        <svg
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Supercritical (fast) water gradient */}
            <radialGradient id="hjumpFastWater" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#0891b2" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.6" />
            </radialGradient>

            {/* Subcritical (slow) water gradient */}
            <radialGradient id="hjumpSlowWater" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.7" />
              <stop offset="25%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
            </radialGradient>

            {/* Jump zone gradient */}
            <linearGradient id="hjumpTransition" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="40%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="60%" stopColor="#ecfeff" stopOpacity="0.95" />
              <stop offset="80%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>

            {/* Faucet stream gradient */}
            <linearGradient id="hjumpStream" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="30%" stopColor="#67e8f9" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.85" />
            </linearGradient>

            {/* Stream center glow gradient */}
            <radialGradient id="hjumpStreamGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#a5f3fc" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#67e8f9" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
            </radialGradient>

            {/* Surface gradient */}
            <linearGradient id="hjumpSurface" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Energy dissipation gradient */}
            <radialGradient id="hjumpEnergy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#b45309" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* Glow filters */}
            <filter id="hjumpStreamBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="hjumpJumpGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="hjumpMarkerGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Group 1: Grid and background */}
          <g id="grid-layer">
            {/* Grid lines for visual reference */}
            <line x1="30" y1="60" x2="370" y2="60" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            <line x1="30" y1="120" x2="370" y2="120" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            <line x1="30" y1="180" x2="370" y2="180" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            <line x1="30" y1="240" x2="370" y2="240" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            {/* Surface line */}
            <line x1="30" y1="285" x2="370" y2="285" stroke="url(#hjumpSurface)" strokeWidth="3" />
            {/* Faucet */}
            <rect x="45" y="20" width="12" height="30" fill="#94a3b8" rx="2" />
            {/* Faucet stream */}
            <line x1="51" y1="50" x2="51" y2={280 - 10 * (flowRate / 50)} stroke="#67e8f9" strokeWidth={streamWidth} opacity="0.8" filter="url(#hjumpStreamBlur)" />
          </g>

          {/* Group 2: Water visualization - main curve path comes FIRST */}
          <g id="water-layer">
            {/* Side-view water profile path with L-commands (21 points) */}
            <path
              d={sideProfilePath}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Subcritical water fill (closed shape, not a data curve) */}
            <rect
              x={30 + 0.55 * 340} y={280 - (50 + (flowRate / 100) * 40)}
              width={370 - (30 + 0.55 * 340)} height={(50 + (flowRate / 100) * 40) + 5}
              fill="url(#hjumpSlowWater)" opacity="0.4" rx="2"
            />

            {/* Supercritical water fill (closed shape) */}
            <rect
              x={30 + 0.15 * 340} y={280 - 15 * (flowRate / 50)}
              width={(30 + 0.35 * 340) - (30 + 0.15 * 340)} height={15 * (flowRate / 50) + 5}
              fill="url(#hjumpFastWater)" opacity="0.4" rx="2"
            />
          </g>

          {/* Group 3: Interactive elements */}
          <g id="interactive-layer">
            {/* Turbulence at jump zone */}
            {[0, 1, 2, 3, 4].map((i) => {
              const baseX = 30 + 0.4 * 340 + i * 8;
              const baseY = markerY + 10 + Math.sin(animationTime * 3 + i) * 8;
              return (
                <circle
                  key={`turb-${i}`}
                  cx={baseX}
                  cy={baseY}
                  r={3 + Math.sin(animationTime * 4 + i) * 1}
                  fill="url(#hjumpEnergy)"
                  opacity={0.5 + Math.sin(animationTime * 2 + i) * 0.3}
                />
              );
            })}

            {/* Interactive marker at jump point */}
            <circle
              cx={markerX}
              cy={markerY}
              r={8}
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#hjumpMarkerGlow)"
              opacity="0.9"
            />
          </g>

          {/* Group 4: Labels and text */}
          <g id="labels-layer">
            {/* Axis labels - Y axis */}
            <text x="8" y="30" fill={colors.textSecondary} fontSize="11" fontWeight="bold">Height</text>

            {/* Axis labels - X axis */}
            <text x="190" y="310" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">Distance from faucet</text>

            {/* Region labels */}
            <text x="100" y="260" fill={colors.fastFlow} fontSize="11" textAnchor="middle" fontWeight="bold">Supercritical</text>

            <text x={30 + 0.4 * 340} y="15" fill={colors.waterJump} fontSize="12" textAnchor="middle" fontWeight="bold">Hydraulic Jump</text>

            <text x="320" y="145" fill={colors.slowFlow} fontSize="11" textAnchor="middle" fontWeight="bold">Subcritical</text>

            {/* Legend inside SVG */}
            <text x="290" y="38" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Legend</text>
            <line x1="290" y1="48" x2="305" y2="48" stroke="#22d3ee" strokeWidth="3" />
            <text x="310" y="51" fill={colors.textSecondary} fontSize="11">Surface</text>
            <circle cx="297" cy="62" r="3" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
            <text x="310" y="65" fill={colors.textSecondary} fontSize="11">Marker</text>

            {/* Froude number readouts */}
            <text x="100" y="245" fill={colors.textPrimary} fontSize="11" textAnchor="middle">
              Fr = {froudeSuper.toFixed(1)}
            </text>
            <text x="320" y="130" fill={colors.textPrimary} fontSize="11" textAnchor="middle">
              Fr = {froudeSub.toFixed(1)}
            </text>
          </g>
        </svg>

        {/* Flow region info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: `${typo.elementGap} ${typo.cardPadding}`,
          marginTop: typo.elementGap,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.small }}>Supercritical (Fast, Shallow)</div>
            <div style={{ color: colors.fastFlow, fontSize: typo.label, fontWeight: 'bold' }}>
              Fr = {froudeSuper.toFixed(1)} &gt; 1
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: colors.waterJump, fontSize: typo.small, fontWeight: 'bold' }}>JUMP</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.small }}>Subcritical (Slow, Deep)</div>
            <div style={{ color: colors.slowFlow, fontSize: typo.label, fontWeight: 'bold' }}>
              Fr = {froudeSub.toFixed(1)} &lt; 1
            </div>
          </div>
        </div>
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
        Adjust Parameters:
      </div>

      {/* Flow Rate Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}>
          Flow Rate: {flowRate}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={flowRate}
          onChange={(e) => setFlowRate(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>20 (Min)</span>
          <span>100 (Max)</span>
        </div>
      </div>

      {/* Faucet Height Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}>
          Faucet Height: {faucetHeight}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={faucetHeight}
          onChange={(e) => setFaucetHeight(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>20 (Min)</span>
          <span>100 (Max)</span>
        </div>
      </div>

      {/* Surface Texture Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'normal' }}>
          Surface Texture:
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
                transition: 'all 0.2s ease',
              }}
            >
              {texture}
            </button>
          ))}
        </div>
      </div>

      {/* Cause-effect explanation */}
      <div style={{
        padding: '12px',
        background: 'rgba(6, 182, 212, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(6, 182, 212, 0.2)',
      }}>
        <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
          Increase flow rate to observe how the jump radius moves outward. Higher velocity causes the supercritical
          region to extend farther before the transition occurs. A rough surface increases friction, which
          decreases the jump radius.
        </p>
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
        { id: 'a', text: 'Froude number is less than 1 (subcritical)' },
        { id: 'b', text: 'Froude number is exactly equal to 1' },
        { id: 'c', text: 'Froude number is greater than 1 (supercritical)', correct: true },
        { id: 'd', text: 'Froude number is zero in all regions' },
      ],
    },
    {
      id: 2,
      question: 'What happens to water depth at the hydraulic jump?',
      options: [
        { id: 'a', text: 'Depth decreases suddenly and dramatically' },
        { id: 'b', text: 'Depth increases suddenly and dramatically', correct: true },
        { id: 'c', text: 'Depth stays constant throughout the transition' },
        { id: 'd', text: 'Depth oscillates back and forth repeatedly' },
      ],
    },
    {
      id: 3,
      question: 'Why does a hydraulic jump occur?',
      options: [
        { id: 'a', text: 'Water freezes at that specific point' },
        { id: 'b', text: 'Surface tension pulls the water upward' },
        { id: 'c', text: 'Fast shallow flow cannot smoothly transition to slow deep flow', correct: true },
        { id: 'd', text: 'Gravity suddenly increases at that location' },
      ],
    },
    {
      id: 4,
      question: 'How does increasing flow rate affect the jump radius?',
      options: [
        { id: 'a', text: 'Jump moves closer to the center point' },
        { id: 'b', text: 'Jump moves farther from the center point', correct: true },
        { id: 'c', text: 'No effect on the jump location at all' },
        { id: 'd', text: 'Jump disappears completely from view' },
      ],
    },
    {
      id: 5,
      question: 'What happens to energy at the hydraulic jump?',
      options: [
        { id: 'a', text: 'Energy is created from nothing' },
        { id: 'b', text: 'Energy is perfectly conserved without loss' },
        { id: 'c', text: 'Energy is dissipated as turbulence and heat', correct: true },
        { id: 'd', text: 'Energy is stored for later release' },
      ],
    },
    {
      id: 6,
      question: 'Why are hydraulic jumps used in dam spillways?',
      options: [
        { id: 'a', text: 'To make the water appear more attractive' },
        { id: 'b', text: 'To dissipate energy and prevent downstream erosion', correct: true },
        { id: 'c', text: 'To speed up the water flow velocity' },
        { id: 'd', text: 'To filter debris from the water flow' },
      ],
    },
    {
      id: 7,
      question: 'What characterizes supercritical flow?',
      options: [
        { id: 'a', text: 'Slow velocity and deep water layer' },
        { id: 'b', text: 'Fast velocity and shallow water layer', correct: true },
        { id: 'c', text: 'Completely stationary water throughout' },
        { id: 'd', text: 'Water moving uphill against gravity' },
      ],
    },
    {
      id: 8,
      question: 'A rough surface compared to a smooth surface will cause the jump to occur:',
      options: [
        { id: 'a', text: 'Closer to the center due to increased friction', correct: true },
        { id: 'b', text: 'Farther from the center with less friction' },
        { id: 'c', text: 'At exactly the same location regardless' },
        { id: 'd', text: 'The jump will not form on rough surfaces' },
      ],
    },
    {
      id: 9,
      question: 'The hydraulic jump is analogous to which phenomenon in aerodynamics?',
      options: [
        { id: 'a', text: 'Smooth laminar flow in wind tunnels' },
        { id: 'b', text: 'Shock wave from supersonic aircraft', correct: true },
        { id: 'c', text: 'Gentle wind gust on the ground' },
        { id: 'd', text: 'Thermal updraft from warm ground' },
      ],
    },
    {
      id: 10,
      question: 'If you reduced gravity (like on the Moon), the hydraulic jump would:',
      options: [
        { id: 'a', text: 'Not occur at all in reduced gravity' },
        { id: 'b', text: 'Occur much closer to the center point' },
        { id: 'c', text: 'Occur farther from center due to lower gravity', correct: true },
        { id: 'd', text: 'Be exactly the same regardless of gravity' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: 'Dam Spillways',
      description: 'Engineers design stilling basins below dam spillways to create controlled hydraulic jumps. The energy dissipation prevents erosion that would otherwise destroy the riverbed downstream. Modern spillways handle flows exceeding 5000 m of water per second.',
      insight: 'A large dam spillway can dissipate over 100 MW of kinetic energy in its hydraulic jump zone, converting destructive flow into safe turbulence.',
    },
    {
      id: 1,
      title: 'River Surfing',
      description: 'Standing waves in rivers occur where hydraulic jumps form over submerged obstacles. Surfers ride these "river waves" that stay in one place while the water rushes at 15 kph through them.',
      insight: 'The best river surf waves form at Froude numbers between 1.2 and 2.0, with wave heights reaching 1.5 m above the water surface.',
    },
    {
      id: 2,
      title: 'Shock Waves',
      description: 'Hydraulic jumps are mathematically analogous to shock waves in compressible gas flow at speeds above 340 m per second. Both involve a sudden transition from supercritical to subcritical flow.',
      insight: 'This analogy lets engineers study shock wave behavior using simple water channels flowing at just 2 m per second - a technique called the hydraulic analogy.',
    },
    {
      id: 3,
      title: 'Tidal Bores',
      description: 'When incoming tides enter funnel-shaped river mouths, the flow reversal can create traveling hydraulic jumps called tidal bores. The famous Severn Bore in England reaches heights of 2 m.',
      insight: 'Tidal bores can travel upstream for 30 km, with the largest bores reaching speeds of 25 kph and wave heights over 3 m.',
    },
  ];

  // ==================== NAVIGATION BAR RENDERER ====================
  const renderNavBar = () => (
    <nav
      aria-label="Game navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <button
        onClick={goToPrevPhase}
        aria-label="Back"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          background: currentPhaseIndex > 0 ? 'rgba(71, 85, 105, 0.5)' : 'transparent',
          border: 'none',
          borderRadius: '8px',
          color: currentPhaseIndex > 0 ? colors.textSecondary : 'transparent',
          fontSize: '14px',
          cursor: currentPhaseIndex > 0 ? 'pointer' : 'default',
          visibility: currentPhaseIndex > 0 ? 'visible' : 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        Back
      </button>

      {/* Progress bar with navigation dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {phaseNames.map((pName, idx) => (
          <button
            key={pName}
            aria-label={`Go to ${pName.replace('_', ' ')} phase`}
            onClick={() => {
              if (!externalPhase) {
                setInternalPhase(pName);
              }
            }}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: 'none',
              background: idx <= currentPhaseIndex ? colors.accent : 'rgba(71, 85, 105, 0.5)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Progress bar visual */}
      <div
        role="progressbar"
        aria-valuenow={currentPhaseIndex + 1}
        aria-valuemin={1}
        aria-valuemax={phaseNames.length}
        aria-label={`Progress: step ${currentPhaseIndex + 1} of ${phaseNames.length}`}
        style={{
          flex: 1,
          maxWidth: '120px',
          height: '6px',
          background: 'rgba(71, 85, 105, 0.5)',
          borderRadius: '3px',
          margin: '0 12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${((currentPhaseIndex + 1) / phaseNames.length) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #06b6d4, #10b981)',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <button
        onClick={goToNextPhase}
        aria-label="Next"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          background: 'rgba(6, 182, 212, 0.2)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textSecondary,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        Next
      </button>
    </nav>
  );

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
          onClick={goToNextPhase}
          disabled={!buttonEnabled}
          style={{
            width: '100%',
            padding: '14px 24px',
            minHeight: '44px',
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
            transition: 'all 0.2s ease',
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (validPhase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              The Kitchen Sink Mystery
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px', fontWeight: 'normal' }}>
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
                Have You Ever Noticed?
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 'normal' }}>
                Turn on your kitchen faucet and watch the water hit the sink. You'll see a thin,
                fast-moving layer of water spread outward... then suddenly <strong style={{ color: colors.waterJump }}>
                jump up</strong> into a thicker, slower ring! Let's explore how this works.
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 'normal' }}>
                It's the same physics that engineers use to prevent dams from destroying riverbeds,
                that creates surfable standing waves in rivers, and that's mathematically identical
                to supersonic shock waves in air!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! \u2192")}
      </div>
    );
  }

  // PREDICT PHASE
  if (validPhase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 'normal' }}>
              This is a <strong>cross-section view</strong> of water hitting a flat surface (like a sink).
              The water from the faucet spreads outward in a thin, fast layer (<span style={{ color: colors.fastFlow }}>
              supercritical flow</span>), then abruptly jumps up into a thicker, slower layer
              (<span style={{ color: colors.slowFlow }}>subcritical flow</span>).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              If you INCREASE the water flow rate, what happens to the jump?
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
                    minHeight: '44px',
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction \u2192')}
      </div>
    );
  }

  // PLAY PHASE
  if (validPhase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              Experiment Time!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Adjust the controls and watch how the hydraulic jump responds
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Increase flow rate - watch the jump move outward</li>
              <li>Decrease flow rate - watch the jump move inward</li>
              <li>Switch to rough surface - notice the jump occurs closer</li>
              <li>Raise the faucet height - more velocity = larger jump radius</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              Why This Matters in the Real World
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', fontWeight: 'normal' }}>
              This is important because engineers use hydraulic jumps to design dam spillways that safely
              dissipate enormous amounts of energy. Understanding this practical application helps us build
              infrastructure that protects riverbeds from erosion. The same technology is used in wastewater
              treatment plants and industrial flow control systems around the world.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned \u2192')}
      </div>
    );
  }

  // REVIEW PHASE
  if (validPhase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;
    const correctPrediction = predictions.find(p => p.correct);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '\uD83C\uDFAF' : '\uD83D\uDCA1'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Excellent Prediction!' : 'Interesting Thinking!'}
            </h2>
          </div>

          {/* Reference user's prediction */}
          <div style={{
            background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 'normal' }}>
              <strong>Your prediction:</strong> {selectedPrediction?.text || 'No prediction made'}
            </p>
            {!isCorrect && (
              <p style={{ color: colors.success, fontSize: '14px', margin: 0, fontWeight: 'normal' }}>
                <strong>Correct answer:</strong> {correctPrediction?.text}
              </p>
            )}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              The Physics Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px', fontWeight: 'normal' }}>
              When you <strong>increase flow rate</strong>, the fast supercritical region extends
              farther before the transition can occur. The jump ring moves <strong style={{ color: colors.accent }}>
              outward (larger radius)</strong>. This demonstrates the relationship between flow momentum and jump position.
            </p>
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Formula:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                R = Q^(5/8) / (g^(1/8) \u00d7 \u03bd^(1/4)) where R = jump radius, Q = flow rate, g = gravity, \u03bd = viscosity
              </p>
            </div>
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
                Fr = v / \u221A(g \u00d7 h) where v = velocity, h = depth. Higher flow rates maintain Fr &gt; 1 farther from center.
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
              Energy at the Jump:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', fontWeight: 'normal' }}>
              The hydraulic jump is <strong>not</strong> a smooth transition - it's an abrupt,
              turbulent discontinuity. Energy is <strong style={{ color: colors.error }}>dissipated</strong> as
              heat and sound in the turbulent zone. This is why engineers use hydraulic jumps
              to safely reduce water energy below dams!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge \u2192')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (validPhase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
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
              The Thought Experiment:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 'normal' }}>
              Imagine water with <strong>zero viscosity</strong> (a "superfluid"). There's no friction
              between water layers or with the surface. What would happen to the hydraulic jump?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              Without viscosity, what happens?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
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
        {renderBottomBar(true, !!twistPrediction, 'See What Happens \u2192')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (validPhase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              Exploring Inviscid Flow
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              See how viscosity creates the conditions for the jump
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Viscosity slows the water through friction</li>
              <li>Without viscosity, the water would thin indefinitely</li>
              <li>Rough surfaces increase effective "viscosity"</li>
              <li>The jump requires something to slow down the flow</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Understand the Twist \u2192')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (validPhase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '\uD83C\uDFAF' : '\uD83E\uDD2F'}
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
              No Viscosity = No Jump!
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px', fontWeight: 'normal' }}>
              Without viscosity, the water would spread outward indefinitely as an ever-thinner,
              ever-faster layer. The flow would remain <strong>supercritical forever</strong>
              - there's nothing to slow it down and force the transition!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', fontWeight: 'normal' }}>
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
              Real-World Analogy:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', fontWeight: 'normal' }}>
              Superfluid helium (at near absolute zero) actually demonstrates this! It flows
              without viscosity and can climb walls, pass through tiny cracks, and flows
              without any hydraulic jump formation.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications \u2192')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (validPhase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Hydraulic Jump"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (validPhase === 'transfer') {
    const allCompleted = transferCompleted.size >= transferApplications.length;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Application {Math.min(transferCompleted.size + 1, transferApplications.length)} of {transferApplications.length} - Explore all to continue
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
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>{'\u2713'}</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px', fontWeight: 'normal' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(6, 182, 212, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                  {app.insight}
                </p>
              </div>
              {!transferCompleted.has(app.id) && (
                <button
                  onClick={() => {
                    setTransferCompleted(prev => new Set([...prev, app.id]));
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: colors.textPrimary,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Got It
                </button>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test \u2192' : `Explore ${transferApplications.length - transferCompleted.size} More`)}
      </div>
    );
  }

  // TEST PHASE
  if (validPhase === 'test') {
    const optionLabels = ['A', 'B', 'C', 'D'];
    const currentQ = testQuestions[currentQuestion];
    const answeredCount = Object.keys(testAnswers).length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderNavBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '\uD83C\uDFC6' : score >= 60 ? '\uD83D\uDCDA' : '\uD83D\uDCAA'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px', fontWeight: 'normal' }}>
                {correctCount}/{testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const qIsCorrect = userAnswer === correctOption?.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: qIsCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${qIsCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    margin: '12px 16px',
                    padding: '14px',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: qIsCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                      {qIsCorrect ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                      Question {idx + 1} of {testQuestions.length}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>
                    {q.question}
                  </p>
                  {!qIsCorrect && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0 }}>
                      Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}

            <div style={{ padding: '16px', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers({});
                  setCurrentQuestion(0);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(71, 85, 105, 0.5)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textSecondary,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Replay Quiz
              </button>
              <button
                onClick={goToNextPhase}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Continue
              </button>
            </div>
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete!' : 'Review & Continue \u2192')}
        </div>
      );
    }

    // One question at a time
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Question {currentQuestion + 1} of {testQuestions.length}
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px', fontWeight: 'normal' }}>
              Test your understanding of hydraulic jumps, Froude numbers, supercritical and subcritical flow transitions,
              energy dissipation in turbulent zones, and real-world engineering applications of this phenomenon.
              Select the best answer for each question below.
            </p>
          </div>

          {currentQ && (
            <div
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                Question {currentQuestion + 1} of {testQuestions.length}: {currentQ.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQ.options.map((option, optIdx) => (
                  <button
                    key={option.id}
                    onClick={() => setTestAnswers(prev => ({ ...prev, [currentQ.id]: option.id }))}
                    style={{
                      padding: '10px 14px',
                      background: testAnswers[currentQ.id] === option.id
                        ? 'rgba(6, 182, 212, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[currentQ.id] === option.id
                        ? '1px solid rgba(6, 182, 212, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {optionLabels[optIdx]}) {option.text}
                  </button>
                ))}
              </div>

              {/* Show Confirm/Submit button after selecting an option */}
              {testAnswers[currentQ.id] && (
                <div style={{ marginTop: '16px' }}>
                  {currentQuestion < testQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(prev => prev + 1)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        border: 'none',
                        borderRadius: '8px',
                        color: colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Confirm Answer
                    </button>
                  ) : (
                    <button
                      onClick={() => setTestSubmitted(true)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        borderRadius: '8px',
                        color: colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Submit Answers
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress indicator */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 'normal' }}>
              {answeredCount} of {testQuestions.length} answered
            </p>
          </div>
        </div>
        {renderBottomBar(false, false, '')}
      </div>
    );
  }

  // MASTERY PHASE
  if (validPhase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>{'\uD83C\uDFC6'}</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Hydraulic Jump Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px', fontWeight: 'normal' }}>
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
              What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Supercritical flow (Fr &gt; 1): fast and shallow</li>
              <li>Subcritical flow (Fr &lt; 1): slow and deep</li>
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
              Keep Exploring:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 'normal' }}>
              Next time you're at a sink, try adjusting the flow rate and watch the jump move!
              Try different surfaces too - a cutting board vs the sink basin. You're now seeing
              the same physics that engineers use to design billion-dollar dam projects.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game \u2192')}
      </div>
    );
  }

  // Default fallback - render hook phase for any invalid/unknown phase
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {renderNavBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            The Kitchen Sink Mystery
          </h1>
          <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px', fontWeight: 'normal' }}>
            Game 107: Hydraulic Jump - Let's discover how water behaves!
          </p>
        </div>
        {renderVisualization(false)}
        <div style={{ padding: '20px' }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 'normal' }}>
              Turn on your kitchen faucet and watch the water hit the sink. You'll see a thin,
              fast-moving layer of water spread outward... then suddenly jump up into a thicker, slower ring!
              Let's explore how this phenomenon works.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, true, "Let's Explore! \u2192")}
    </div>
  );
};

export default HydraulicJumpRenderer;
