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
        {/* Title label outside SVG */}
        <div style={{
          textAlign: 'center',
          marginBottom: typo.elementGap,
          color: colors.textPrimary,
          fontSize: typo.body,
          fontWeight: 'bold',
        }}>
          Hydraulic Jump (Top View)
        </div>

        <svg
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* ========== PREMIUM GRADIENTS ========== */}

            {/* Supercritical (fast) water gradient - radial with 5 color stops */}
            <radialGradient id="hjumpFastWater" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#0891b2" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.6" />
            </radialGradient>

            {/* Subcritical (slow) water gradient - radial with 5 color stops */}
            <radialGradient id="hjumpSlowWater" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.7" />
              <stop offset="25%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
            </radialGradient>

            {/* Jump zone gradient - linear with 6 color stops for turbulent effect */}
            <linearGradient id="hjumpTransition" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="40%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="60%" stopColor="#ecfeff" stopOpacity="0.95" />
              <stop offset="80%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>

            {/* Faucet stream gradient - linear with 4 color stops */}
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

            {/* Surface gradient - brushed metal effect */}
            <linearGradient id="hjumpSurface" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Energy dissipation gradient - for turbulence visualization */}
            <radialGradient id="hjumpEnergy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#b45309" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* Fast flow arrow gradient */}
            <linearGradient id="hjumpFastArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="1" />
            </linearGradient>

            {/* Slow flow arrow gradient */}
            <linearGradient id="hjumpSlowArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
            </linearGradient>

            {/* Side view water gradients */}
            <linearGradient id="hjumpSideSuper" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="hjumpSideSub" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#0369a1" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="hjumpSideJump" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="30%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#a5f3fc" />
              <stop offset="70%" stopColor="#ecfeff" />
              <stop offset="100%" stopColor="#a5f3fc" />
            </linearGradient>

            {/* Faucet metal gradient */}
            <linearGradient id="hjumpFaucet" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* ========== GLOW FILTERS ========== */}

            {/* Water stream glow filter */}
            <filter id="hjumpStreamBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Jump zone glow filter */}
            <filter id="hjumpJumpGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Energy dissipation glow */}
            <filter id="hjumpEnergyGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ripple glow filter */}
            <filter id="hjumpRippleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow glow filter */}
            <filter id="hjumpArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Surface texture pattern */}
            <pattern id="hjumpSurfacePattern" patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill="url(#hjumpSurface)" />
              {surfaceTexture === 'rough' && (
                <>
                  <circle cx="2" cy="3" r="1.2" fill="#94a3b8" opacity="0.4" />
                  <circle cx="7" cy="8" r="1" fill="#cbd5e1" opacity="0.3" />
                  <circle cx="5" cy="5" r="0.8" fill="#64748b" opacity="0.35" />
                </>
              )}
            </pattern>

            {/* Arrow markers */}
            <marker id="hjumpFastArrowHead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="url(#hjumpFastArrow)" />
            </marker>

            <marker id="hjumpSlowArrowHead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="url(#hjumpSlowArrow)" />
            </marker>
          </defs>

          {/* Sink/Surface (top view) */}
          <ellipse
            cx="200"
            cy="165"
            rx="160"
            ry="120"
            fill="url(#hjumpSurfacePattern)"
            stroke="url(#hjumpSurface)"
            strokeWidth="3"
          />

          {/* Water spread - outer region (subcritical) with gradient */}
          <ellipse
            cx="200"
            cy="165"
            rx={adjustedRadius + 50}
            ry={(adjustedRadius + 50) * 0.75}
            fill="url(#hjumpSlowWater)"
          />

          {/* Energy dissipation particles around jump zone */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const angle = (i * 45 + animationTime * 30) * (Math.PI / 180);
            const radius = adjustedRadius + 3 + Math.sin(animationTime * 4 + i) * 4;
            const x = 200 + Math.cos(angle) * radius;
            const y = 165 + Math.sin(angle) * radius * 0.75;
            const size = 3 + Math.sin(animationTime * 5 + i * 0.5) * 1.5;
            return (
              <circle
                key={`energy-${i}`}
                cx={x}
                cy={y}
                r={size}
                fill="url(#hjumpEnergy)"
                filter="url(#hjumpEnergyGlow)"
                opacity={0.6 + Math.sin(animationTime * 3 + i) * 0.3}
              />
            );
          })}

          {/* Jump zone - animated ring with premium gradient */}
          <ellipse
            cx="200"
            cy="165"
            rx={adjustedRadius + 5 + Math.sin(animationTime * 3) * 2}
            ry={(adjustedRadius + 5) * 0.75 + Math.sin(animationTime * 3) * 1.5}
            fill="none"
            stroke="url(#hjumpTransition)"
            strokeWidth={10 + Math.sin(animationTime * 5) * 3}
            opacity={0.85 + Math.sin(animationTime * 4) * 0.15}
            filter="url(#hjumpJumpGlow)"
          />

          {/* Inner turbulence ring at jump */}
          <ellipse
            cx="200"
            cy="165"
            rx={adjustedRadius + 2}
            ry={(adjustedRadius + 2) * 0.75}
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="2"
            strokeDasharray="4 3"
            opacity={0.5 + Math.sin(animationTime * 6) * 0.3}
          />

          {/* Inner region (supercritical) with premium gradient */}
          <ellipse
            cx="200"
            cy="165"
            rx={adjustedRadius}
            ry={adjustedRadius * 0.75}
            fill="url(#hjumpFastWater)"
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
                cy="165"
                rx={rippleRadius}
                ry={rippleRadius * 0.75}
                fill="none"
                stroke="#a5f3fc"
                strokeWidth="2"
                opacity={rippleOpacity * 0.7}
                filter="url(#hjumpRippleGlow)"
              />
            );
          })}

          {/* Faucet stream (center) with glow */}
          <circle
            cx="200"
            cy="165"
            r={streamWidth + 3}
            fill="url(#hjumpStreamGlow)"
            filter="url(#hjumpStreamBlur)"
            opacity="0.6"
          />
          <circle
            cx="200"
            cy="165"
            r={streamWidth}
            fill="url(#hjumpStream)"
            filter="url(#hjumpStreamBlur)"
          />
          {/* Stream center highlight */}
          <circle
            cx="200"
            cy="165"
            r={streamWidth * 0.4}
            fill="#ffffff"
            opacity="0.7"
          />

          {/* Fast flow velocity arrows (inner region) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const innerR = adjustedRadius * 0.25;
            const outerR = adjustedRadius * 0.65;
            const x1 = 200 + Math.cos(rad) * innerR;
            const y1 = 165 + Math.sin(rad) * innerR * 0.75;
            const x2 = 200 + Math.cos(rad) * outerR;
            const y2 = 165 + Math.sin(rad) * outerR * 0.75;

            return (
              <line
                key={`fast-${angle}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#hjumpFastArrow)"
                strokeWidth="2.5"
                markerEnd="url(#hjumpFastArrowHead)"
                opacity={0.8 + Math.sin(animationTime * 2 + angle * 0.02) * 0.2}
                filter="url(#hjumpArrowGlow)"
              />
            );
          })}

          {/* Slow flow velocity arrows (outer region) - only when interactive */}
          {interactive && [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const innerR = adjustedRadius + 15;
            const outerR = adjustedRadius + 40;
            const x1 = 200 + Math.cos(rad) * innerR;
            const y1 = 165 + Math.sin(rad) * innerR * 0.75;
            const x2 = 200 + Math.cos(rad) * outerR;
            const y2 = 165 + Math.sin(rad) * outerR * 0.75;

            return (
              <line
                key={`slow-${angle}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#hjumpSlowArrow)"
                strokeWidth="2"
                markerEnd="url(#hjumpSlowArrowHead)"
                opacity="0.7"
                filter="url(#hjumpArrowGlow)"
              />
            );
          })}

          {/* Side view inset with premium graphics */}
          <g transform="translate(10, 235)">
            <rect x="0" y="0" width="140" height="75" fill={colors.bgCard} rx="6" stroke="#334155" strokeWidth="1" />

            {/* Surface line with gradient */}
            <line x1="10" y1="58" x2="130" y2="58" stroke="url(#hjumpSurface)" strokeWidth="3" />

            {/* Water profile - supercritical (thin) with gradient */}
            <path
              d={`M 35,58 Q 45,${55 - flowRate/20} 55,${52 - flowRate/15}`}
              fill="none"
              stroke="url(#hjumpSideSuper)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Jump transition with turbulent effect */}
            <path
              d={`M 55,${52 - flowRate/15} Q 60,35 65,28 Q 72,22 78,32`}
              fill="none"
              stroke="url(#hjumpSideJump)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#hjumpJumpGlow)"
            />

            {/* Subcritical (thick) with gradient fill */}
            <path
              d={`M 78,32 Q 90,38 110,44 L 110,58 L 78,58 Z`}
              fill="url(#hjumpSideSub)"
            />

            {/* Turbulence bubbles at jump */}
            {[0, 1, 2].map((i) => {
              const bubbleY = 30 + Math.sin(animationTime * 4 + i * 2) * 5;
              const bubbleX = 65 + i * 5;
              return (
                <circle
                  key={`bubble-${i}`}
                  cx={bubbleX}
                  cy={bubbleY}
                  r={2 - i * 0.5}
                  fill="#a5f3fc"
                  opacity={0.6 + Math.sin(animationTime * 5 + i) * 0.3}
                />
              );
            })}

            {/* Faucet with metal gradient */}
            <rect x="28" y="15" width="10" height="25" fill="url(#hjumpFaucet)" rx="1" />
            <path
              d={`M 33,40 L 33,${52 - flowRate/15}`}
              stroke="url(#hjumpStream)"
              strokeWidth={streamWidth/2 + 1}
              strokeLinecap="round"
              filter="url(#hjumpStreamBlur)"
            />
          </g>

          {/* Legend with premium styling */}
          <g transform="translate(250, 235)">
            <rect x="0" y="0" width="140" height="75" fill={colors.bgCard} rx="6" stroke="#334155" strokeWidth="1" />

            {/* Fast flow indicator */}
            <circle cx="18" cy="20" r="8" fill="url(#hjumpFastWater)" />
            <line x1="30" y1="20" x2="50" y2="20" stroke="url(#hjumpFastArrow)" strokeWidth="2" markerEnd="url(#hjumpFastArrowHead)" />

            {/* Slow flow indicator */}
            <circle cx="18" cy="50" r="8" fill="url(#hjumpSlowWater)" />
            <line x1="30" y1="50" x2="50" y2="50" stroke="url(#hjumpSlowArrow)" strokeWidth="2" markerEnd="url(#hjumpSlowArrowHead)" />
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: `${typo.elementGap} ${typo.cardPadding}`,
          marginTop: '-65px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Side view label */}
          <div style={{
            color: colors.textMuted,
            fontSize: typo.label,
            marginLeft: '40px',
          }}>
            Side View
          </div>

          {/* Legend labels */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            marginRight: '5px',
          }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.label }}>Fast, thin flow</span>
            <span style={{ color: colors.textSecondary, fontSize: typo.label }}>Slow, thick flow</span>
          </div>
        </div>

        {/* Flow region labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: `0 ${typo.cardPadding}`,
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

  // ==================== REAL-WORLD APPLICATIONS ====================
  const realWorldApps = [
    {
      icon: '🏗️',
      title: 'Dam Spillway Design',
      short: 'Stilling basins protect infrastructure',
      tagline: 'Engineering controlled chaos to protect billion-dollar infrastructure',
      description: 'Dam spillways release massive volumes of water during floods. Without energy dissipation, this high-velocity flow would erode the riverbed and undermine the dam foundation. Engineers design stilling basins that force hydraulic jumps, converting destructive kinetic energy into harmless turbulence.',
      connection: 'The hydraulic jump in your sink demonstrates the same supercritical-to-subcritical transition. Dam engineers scale this up, designing basins where the jump occurs at a predictable location to maximize energy dissipation.',
      howItWorks: 'Water exits the spillway at supercritical speeds (Fr > 1), enters the stilling basin, and undergoes a hydraulic jump. The turbulent roller dissipates up to 85% of the water\'s energy. Baffles and end sills control jump position and enhance energy loss.',
      stats: [
        { value: '85%', label: 'Energy dissipation possible' },
        { value: '50m/s', label: 'Spillway exit velocities' },
        { value: '$2B+', label: 'Cost of major dam projects' },
      ],
      examples: [
        'Hoover Dam stilling basin handles 11,000 m³/s during floods',
        'Three Gorges Dam uses stepped spillways for staged energy dissipation',
        'Glen Canyon Dam flip bucket launches water to dissipate energy in air',
        'Itaipu Dam stilling basin is 162m wide with 15m depth variation',
      ],
      companies: [
        'U.S. Bureau of Reclamation',
        'U.S. Army Corps of Engineers',
        'Bechtel',
        'Stantec',
        'AECOM',
      ],
      futureImpact: 'Climate change is increasing flood frequency and intensity, requiring dam spillway upgrades worldwide. Advanced CFD modeling allows engineers to optimize stilling basin designs for extreme events while minimizing construction costs.',
      color: '#3b82f6',
    },
    {
      icon: '🌊',
      title: 'River Engineering',
      short: 'Flood control through flow management',
      tagline: 'Taming rivers to protect communities and ecosystems',
      description: 'River engineers use hydraulic jumps to control flood waters, reduce bank erosion, and maintain navigable channels. Strategic placement of weirs, drop structures, and grade control structures creates predictable hydraulic jumps that dissipate energy and stabilize river systems.',
      connection: 'Just as your sink jump occurs where fast flow meets resistance, river engineers create obstacles that force jumps at specific locations. The Froude number relationship you observed applies directly to designing these structures.',
      howItWorks: 'Grade control structures (low dams or weirs) create elevation drops that accelerate water to supercritical flow. Downstream, the flow depth increases and a hydraulic jump forms. Engineers calculate the conjugate depth ratio to ensure the jump stays in the desired location.',
      stats: [
        { value: '70%', label: 'Flood damage reduction possible' },
        { value: '10,000+', label: 'Grade control structures in US rivers' },
        { value: '$1.1T', label: 'US flood damage since 1980' },
      ],
      examples: [
        'Mississippi River levee systems use controlled overflows with jump dissipation',
        'Los Angeles River concrete channels create stable supercritical flow',
        'Netherlands Delta Works use hydraulic jumps in storm surge barriers',
        'Yellow River sedimentation control uses jump turbulence for mixing',
      ],
      companies: [
        'Jacobs Engineering',
        'HDR Inc.',
        'Tetra Tech',
        'Black & Veatch',
      ],
      futureImpact: 'Nature-based solutions are replacing hard infrastructure. Engineers now design "living" grade control structures using boulders and vegetation that create hydraulic jumps while providing fish habitat and maintaining natural aesthetics.',
      color: '#06b6d4',
    },
    {
      icon: '🏄',
      title: 'Whitewater Rapids',
      short: 'Recreation through natural hydraulics',
      tagline: 'Where physics meets adventure sports',
      description: 'Whitewater rapids form where river gradient, rocks, and constrictions create hydraulic jumps. These standing waves and hydraulic features power a multi-billion dollar recreation industry. Engineers now design artificial whitewater courses using hydraulic jump principles.',
      connection: 'The standing wave at your sink jump is identical in physics to river waves that kayakers surf. Both are stationary hydraulic jumps where supercritical flow transitions to subcritical, creating a persistent wave feature.',
      howItWorks: 'River flow accelerates over shallow rocks (supercritical), then meets deeper, slower water downstream. The hydraulic jump creates features like "holes" (recirculating water), "waves" (standing waves), and "pillows" (water piling against obstacles). Feature intensity depends on Froude number.',
      stats: [
        { value: '$12B', label: 'US paddle sports industry annually' },
        { value: '50+', label: 'Artificial whitewater parks worldwide' },
        { value: '3.2M', label: 'Kayakers in the US alone' },
      ],
      examples: [
        'U.S. National Whitewater Center uses adjustable weirs for tunable hydraulic jumps',
        'Eiskanal in Germany (1972 Olympics) pioneered artificial whitewater design',
        'River surfing waves in Munich\'s Eisbach are engineered standing jumps',
        'Lee Valley White Water Centre uses movable obstacles for varied jump patterns',
      ],
      companies: [
        'S2o Design',
        'Whitewater Parks International',
        'McLaughlin Whitewater Design',
        'Recreation Engineering and Planning',
      ],
      futureImpact: 'Adjustable whitewater venues can now modify hydraulic features in real-time using pneumatic systems. This allows the same course to host beginner training and Olympic competition, maximizing facility utility.',
      color: '#10b981',
    },
    {
      icon: '🏭',
      title: 'Industrial Mixing',
      short: 'Chemical processing efficiency',
      tagline: 'Harnessing turbulence for better chemical reactions',
      description: 'Chemical processing plants use hydraulic jumps for rapid mixing of reactants, gas absorption, and heat transfer. The intense turbulence at the jump provides mixing rates impossible to achieve with mechanical stirrers, while the predictable location allows precise process control.',
      connection: 'The turbulent energy dissipation at your sink jump creates intense mixing. Industrial processes scale this up, using the jump\'s chaotic flow to blend chemicals, dissolve gases, or transfer heat thousands of times faster than diffusion alone.',
      howItWorks: 'Reactants enter as supercritical flow in a channel or pipe. A hydraulic jump is induced by expansion, obstruction, or depth change. The turbulent roller zone provides 10-100x the mixing of laminar flow. Residence time in the jump zone is controlled by jump strength (Froude number).',
      stats: [
        { value: '100x', label: 'Mixing improvement vs laminar flow' },
        { value: '40%', label: 'Energy savings vs mechanical mixers' },
        { value: '99.9%', label: 'Gas absorption efficiency achievable' },
      ],
      examples: [
        'Water treatment plants use jump aerators for chlorine mixing',
        'Pulp and paper mills use hydraulic jumps for chemical bleaching',
        'Wastewater treatment uses jump aeration for biological oxygen demand',
        'Food processing uses hydraulic jumps for rapid pasteurization mixing',
      ],
      companies: [
        'Veolia',
        'Xylem Inc.',
        'Evoqua Water Technologies',
        'SUEZ Water Technologies',
        'Alfa Laval',
      ],
      futureImpact: 'Microfluidic devices are bringing hydraulic jump mixing to lab-on-chip applications. Microscale jumps enable rapid reaction screening for drug discovery, requiring only nanoliters of expensive reagents.',
      color: '#f59e0b',
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
