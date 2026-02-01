import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 110: KÁRMÁN VORTEX STREET
// The alternating pattern of vortices behind an obstacle in fluid flow
// Demonstrates vortex shedding, Reynolds number, and resonance
// ============================================================================

interface KarmanVortexRendererProps {
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

  // Flow colors
  flowFast: '#60a5fa',
  flowSlow: '#1e40af',
  flowNeutral: '#3b82f6',

  // Vortex colors
  vortexCW: '#f97316',      // Clockwise - orange
  vortexCCW: '#a855f7',     // Counter-clockwise - purple
  vortexCenter: '#ffffff',

  // Obstacle
  obstacle: '#64748b',
  obstacleHighlight: '#94a3b8',

  // UI colors
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const KarmanVortexRenderer: React.FC<KarmanVortexRendererProps> = ({
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
  const [flowSpeed, setFlowSpeed] = useState(50); // 0-100
  const [obstacleSize, setObstacleSize] = useState(50); // 0-100
  const [obstacleShape, setObstacleShape] = useState<'cylinder' | 'square' | 'triangle'>('cylinder');

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

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateReynoldsNumber = useCallback(() => {
    // Re = ρvD/μ (simplified for visualization)
    // Higher flow speed and larger obstacle = higher Re
    const velocity = (flowSpeed / 100) * 10; // 0-10 m/s
    const diameter = (obstacleSize / 100) * 0.1 + 0.02; // 0.02-0.12 m
    const kinematicViscosity = 0.000001; // Water at 20°C

    return (velocity * diameter) / kinematicViscosity;
  }, [flowSpeed, obstacleSize]);

  const calculateStrouhalNumber = useCallback(() => {
    // Strouhal number for a cylinder is approximately 0.2
    // St = fD/v where f is shedding frequency
    const shapeFactors: Record<string, number> = {
      cylinder: 0.21,
      square: 0.13,
      triangle: 0.16,
    };
    return shapeFactors[obstacleShape] || 0.21;
  }, [obstacleShape]);

  const calculateSheddingFrequency = useCallback(() => {
    // f = St * v / D
    const St = calculateStrouhalNumber();
    const velocity = (flowSpeed / 100) * 10;
    const diameter = (obstacleSize / 100) * 0.1 + 0.02;

    return (St * velocity) / diameter;
  }, [flowSpeed, obstacleSize, calculateStrouhalNumber]);

  // Flow regime based on Reynolds number
  const getFlowRegime = useCallback(() => {
    const Re = calculateReynoldsNumber();
    if (Re < 5) return 'creeping';
    if (Re < 40) return 'steady_wake';
    if (Re < 150) return 'laminar_vortex';
    if (Re < 300000) return 'turbulent_vortex';
    return 'turbulent';
  }, [calculateReynoldsNumber]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.03);
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const Re = calculateReynoldsNumber();
    const regime = getFlowRegime();
    const St = calculateStrouhalNumber();
    const freq = calculateSheddingFrequency();

    // Obstacle dimensions
    const obsX = 100;
    const obsY = 175;
    const obsSize = 15 + (obstacleSize / 100) * 25;

    // Generate vortices based on regime
    const vortices = [];
    if (regime === 'laminar_vortex' || regime === 'turbulent_vortex') {
      const vortexSpeed = (flowSpeed / 100) * 2 + 0.5;
      const spacing = 40 + (100 - flowSpeed) / 5;

      for (let i = 0; i < 8; i++) {
        const xOffset = ((animationTime * vortexSpeed * 60) + i * spacing) % 300;
        const isUpper = i % 2 === 0;
        const yOffset = isUpper ? -25 : 25;

        // Add slight randomness for turbulent regime
        const turbulence = regime === 'turbulent_vortex' ? Math.sin(animationTime * 10 + i) * 5 : 0;

        vortices.push({
          x: obsX + 30 + xOffset,
          y: obsY + yOffset + turbulence,
          rotation: isUpper ? 'CW' : 'CCW',
          age: xOffset / 300,
          size: obsSize * 0.8 * (1 - xOffset / 400),
        });
      }
    }

    // Streamlines for steady wake
    const streamlines = [];
    if (regime === 'creeping' || regime === 'steady_wake') {
      for (let i = -3; i <= 3; i++) {
        const y = obsY + i * 20;
        streamlines.push(y);
      }
    }

    // Generate animated flow particles
    const flowParticles = [];
    for (let i = 0; i < 12; i++) {
      const baseY = 80 + (i % 5) * 50;
      const xPos = ((animationTime * 80 + i * 35) % 420) - 20;
      const yWobble = Math.sin(animationTime * 2 + i) * 3;
      flowParticles.push({
        x: xPos,
        y: baseY + yWobble,
        opacity: xPos < 60 ? xPos / 60 : xPos > 360 ? (420 - xPos) / 60 : 1,
      });
    }

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 350"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* ============ PREMIUM GRADIENTS ============ */}

            {/* Flow field background gradient with depth */}
            <linearGradient id="karvFlowField" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
              <stop offset="25%" stopColor="#0c4a6e" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#075985" stopOpacity="0.3" />
              <stop offset="75%" stopColor="#0369a1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
            </linearGradient>

            {/* Premium metallic cylinder gradient */}
            <linearGradient id="karvCylinderMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="80%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Cylinder highlight for 3D effect */}
            <radialGradient id="karvCylinderHighlight" cx="30%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0" />
            </radialGradient>

            {/* Square obstacle brushed metal */}
            <linearGradient id="karvSquareMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="15%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="85%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Triangle obstacle gradient */}
            <linearGradient id="karvTriangleMetal" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="30%" stopColor="#6b7280" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Clockwise vortex gradient - enhanced orange spiral */}
            <radialGradient id="karvVortexCW" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#fed7aa" stopOpacity="0.6" />
              <stop offset="45%" stopColor="#fb923c" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </radialGradient>

            {/* Counter-clockwise vortex gradient - enhanced purple spiral */}
            <radialGradient id="karvVortexCCW" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#e9d5ff" stopOpacity="0.6" />
              <stop offset="45%" stopColor="#c084fc" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
            </radialGradient>

            {/* Flow particle glow gradient */}
            <radialGradient id="karvParticleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Flow arrow gradient */}
            <linearGradient id="karvArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="1" />
            </linearGradient>

            {/* Streamline gradient */}
            <linearGradient id="karvStreamline" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
            </linearGradient>

            {/* Wake region gradient */}
            <linearGradient id="karvWakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#334155" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
            </linearGradient>

            {/* ============ GLOW FILTERS ============ */}

            {/* Vortex glow filter */}
            <filter id="karvVortexGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Particle glow filter */}
            <filter id="karvParticleBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Obstacle shadow filter */}
            <filter id="karvObstacleShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="shadow" />
              <feOffset dx="2" dy="2" in="shadow" result="offsetShadow" />
              <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cylinder inner glow */}
            <filter id="karvCylinderGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Text glow for labels */}
            <filter id="karvTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium dark lab background with gradient */}
          <rect width="400" height="350" fill="#030712" />
          <linearGradient id="karvLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <rect width="400" height="350" fill="url(#karvLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="karvLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect x="0" y="40" width="400" height="250" fill="url(#karvLabGrid)" />

          {/* Title with glow */}
          <text x="200" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold" filter="url(#karvTextGlow)">
            Karman Vortex Street
          </text>
          <text x="200" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Karman Vortex Street
          </text>

          {/* Flow field background with premium gradient */}
          <rect x="0" y="50" width="400" height="250" fill="url(#karvFlowField)" />

          {/* Animated flow particles */}
          <g filter="url(#karvParticleBlur)">
            {flowParticles.map((particle, i) => (
              <g key={`particle-${i}`} opacity={particle.opacity * 0.8}>
                <circle
                  cx={particle.x}
                  cy={particle.y}
                  r="4"
                  fill="url(#karvParticleGlow)"
                />
                <circle
                  cx={particle.x}
                  cy={particle.y}
                  r="1.5"
                  fill="#67e8f9"
                />
                {/* Particle trail */}
                <line
                  x1={particle.x - 8}
                  y1={particle.y}
                  x2={particle.x}
                  y2={particle.y}
                  stroke="#22d3ee"
                  strokeWidth="1"
                  strokeOpacity={particle.opacity * 0.5}
                />
              </g>
            ))}
          </g>

          {/* Flow direction arrows on left - premium style */}
          {[0, 1, 2, 3, 4].map(i => {
            const y = 80 + i * 50;
            const speed = flowSpeed / 50;
            const arrowLength = 20 * speed;
            return (
              <g key={i}>
                {/* Arrow shaft with gradient */}
                <line
                  x1="15"
                  y1={y}
                  x2={15 + arrowLength}
                  y2={y}
                  stroke="url(#karvArrowGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Arrow head */}
                <polygon
                  points={`${15 + arrowLength},${y - 5} ${15 + arrowLength + 10},${y} ${15 + arrowLength},${y + 5}`}
                  fill="#93c5fd"
                />
                {/* Glow effect */}
                <line
                  x1="15"
                  y1={y}
                  x2={15 + arrowLength}
                  y2={y}
                  stroke="#60a5fa"
                  strokeWidth="6"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Streamlines for low Re - premium curved lines with particles */}
          {(regime === 'creeping' || regime === 'steady_wake') && streamlines.map((y, i) => {
            const deflection = Math.abs(y - obsY) < obsSize * 1.5
              ? (y > obsY ? 1 : -1) * (obsSize * 2 - Math.abs(y - obsY) * 0.8)
              : 0;

            return (
              <g key={i}>
                {/* Streamline path */}
                <path
                  d={`M 0,${y}
                      Q ${obsX - 20},${y}
                      ${obsX},${y + deflection * 0.3}
                      Q ${obsX + obsSize},${y + deflection}
                      ${obsX + obsSize * 3},${y + deflection * 0.5}
                      L 400,${y}`}
                  fill="none"
                  stroke="url(#karvStreamline)"
                  strokeWidth="1.5"
                />
                {/* Animated particle on streamline */}
                <circle
                  cx={((animationTime * 50 + i * 40) % 400)}
                  cy={y + (((animationTime * 50 + i * 40) % 400) > obsX && ((animationTime * 50 + i * 40) % 400) < obsX + obsSize * 3 ? deflection * 0.5 : 0)}
                  r="3"
                  fill="#60a5fa"
                  opacity="0.8"
                />
              </g>
            );
          })}

          {/* Wake region visualization */}
          {(regime === 'laminar_vortex' || regime === 'turbulent_vortex') && (
            <ellipse
              cx={obsX + 150}
              cy={obsY}
              rx="140"
              ry="60"
              fill="url(#karvWakeGrad)"
              opacity="0.3"
            />
          )}

          {/* Vortices for high Re - enhanced with glow */}
          {vortices.map((vortex, i) => (
            <g key={i} filter="url(#karvVortexGlow)">
              {/* Outer vortex glow */}
              <circle
                cx={vortex.x}
                cy={vortex.y}
                r={vortex.size * 1.3}
                fill={vortex.rotation === 'CW' ? 'url(#karvVortexCW)' : 'url(#karvVortexCCW)'}
                opacity={(1 - vortex.age * 0.7) * 0.5}
              />
              {/* Main vortex circle */}
              <circle
                cx={vortex.x}
                cy={vortex.y}
                r={vortex.size}
                fill={vortex.rotation === 'CW' ? 'url(#karvVortexCW)' : 'url(#karvVortexCCW)'}
                opacity={1 - vortex.age * 0.7}
              />

              {/* Spinning spiral arms */}
              <g opacity={0.8 - vortex.age * 0.5}>
                {[0, 1, 2, 3].map(j => {
                  const baseAngle = (animationTime * (vortex.rotation === 'CW' ? 150 : -150) + j * 90) * (Math.PI / 180);
                  const spiralPoints = [];
                  for (let k = 0; k < 8; k++) {
                    const angle = baseAngle + k * 0.3 * (vortex.rotation === 'CW' ? 1 : -1);
                    const radius = (k / 8) * vortex.size * 0.9;
                    spiralPoints.push({
                      x: vortex.x + Math.cos(angle) * radius,
                      y: vortex.y + Math.sin(angle) * radius,
                    });
                  }
                  const pathD = spiralPoints.map((p, idx) =>
                    `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`
                  ).join(' ');

                  return (
                    <path
                      key={j}
                      d={pathD}
                      fill="none"
                      stroke={vortex.rotation === 'CW' ? colors.vortexCW : colors.vortexCCW}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeOpacity={0.7}
                    />
                  );
                })}
              </g>

              {/* Center bright core */}
              <circle
                cx={vortex.x}
                cy={vortex.y}
                r={vortex.size * 0.15}
                fill="white"
                opacity={0.6 - vortex.age * 0.4}
              />
            </g>
          ))}

          {/* Obstacle with premium metallic appearance */}
          <g filter="url(#karvObstacleShadow)">
            {obstacleShape === 'cylinder' && (
              <g>
                {/* Base cylinder */}
                <circle
                  cx={obsX}
                  cy={obsY}
                  r={obsSize}
                  fill="url(#karvCylinderMetal)"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                {/* Highlight overlay for 3D effect */}
                <circle
                  cx={obsX}
                  cy={obsY}
                  r={obsSize}
                  fill="url(#karvCylinderHighlight)"
                />
                {/* Rim highlight */}
                <circle
                  cx={obsX}
                  cy={obsY}
                  r={obsSize - 2}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
              </g>
            )}
            {obstacleShape === 'square' && (
              <g>
                <rect
                  x={obsX - obsSize}
                  y={obsY - obsSize}
                  width={obsSize * 2}
                  height={obsSize * 2}
                  fill="url(#karvSquareMetal)"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                {/* Top edge highlight */}
                <line
                  x1={obsX - obsSize + 2}
                  y1={obsY - obsSize + 2}
                  x2={obsX + obsSize - 2}
                  y2={obsY - obsSize + 2}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
              </g>
            )}
            {obstacleShape === 'triangle' && (
              <g>
                <polygon
                  points={`${obsX},${obsY - obsSize} ${obsX + obsSize},${obsY + obsSize} ${obsX - obsSize},${obsY + obsSize}`}
                  fill="url(#karvTriangleMetal)"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                {/* Edge highlights */}
                <line
                  x1={obsX}
                  y1={obsY - obsSize + 3}
                  x2={obsX - obsSize + 5}
                  y2={obsY + obsSize - 2}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
              </g>
            )}
          </g>

          {/* Wake region indicator - enhanced */}
          {interactive && (regime === 'laminar_vortex' || regime === 'turbulent_vortex') && (
            <g opacity="0.6">
              <path
                d={`M ${obsX + obsSize + 5},${obsY - 10}
                    Q ${obsX + obsSize + 30},${obsY - 30}
                    ${obsX + obsSize + 60},${obsY - 35}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="6,4"
              />
              <path
                d={`M ${obsX + obsSize + 5},${obsY + 10}
                    Q ${obsX + obsSize + 30},${obsY + 30}
                    ${obsX + obsSize + 60},${obsY + 35}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="6,4"
              />
              <text x={obsX + obsSize + 70} y={obsY - 32} fill="#94a3b8" fontSize="8" fontStyle="italic">
                Wake boundary
              </text>
            </g>
          )}

          {/* Legend - premium card style */}
          <g transform="translate(10, 290)">
            <rect x="0" y="0" width="180" height="50" fill={colors.bgCard} rx="8" stroke="#334155" strokeWidth="1" />
            <text x="90" y="14" textAnchor="middle" fill={colors.textMuted} fontSize="9" fontWeight="bold">VORTEX ROTATION</text>
            <circle cx="40" cy="34" r="12" fill="url(#karvVortexCW)" filter="url(#karvVortexGlow)" />
            <text x="60" y="38" fill={colors.vortexCW} fontSize="10" fontWeight="bold">CW</text>
            <circle cx="120" cy="34" r="12" fill="url(#karvVortexCCW)" filter="url(#karvVortexGlow)" />
            <text x="142" y="38" fill={colors.vortexCCW} fontSize="10" fontWeight="bold">CCW</text>
          </g>

          {/* Flow regime info - premium card style */}
          <g transform="translate(200, 290)">
            <rect x="0" y="0" width="190" height="50" fill={colors.bgCard} rx="8" stroke="#334155" strokeWidth="1" />
            <text x="10" y="14" fill={colors.textMuted} fontSize="8">Reynolds Number</text>
            <text x="100" y="14" fill={colors.textPrimary} fontSize="10" fontWeight="bold">
              Re = {Math.round(Re).toLocaleString()}
            </text>
            <text x="10" y="30" fill={colors.textMuted} fontSize="8">Flow Regime</text>
            <text x="70" y="30" fill={colors.accent} fontSize="10" fontWeight="bold">
              {regime.replace('_', ' ').toUpperCase()}
            </text>
            <text x="10" y="45" fill={colors.textMuted} fontSize="8">Shedding Frequency</text>
            <text x="100" y="45" fill="#22d3ee" fontSize="10" fontWeight="bold">
              {freq.toFixed(1)} Hz
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
        🎮 Control the Flow:
      </div>

      {/* Flow Speed Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          💨 Flow Speed: {flowSpeed}%
        </label>
        <input
          type="range"
          min="5"
          max="100"
          value={flowSpeed}
          onChange={(e) => setFlowSpeed(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Slow (no vortices)</span>
          <span>Fast (vortex street)</span>
        </div>
      </div>

      {/* Obstacle Size Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📏 Obstacle Size: {obstacleSize}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={obstacleSize}
          onChange={(e) => setObstacleSize(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Small</span>
          <span>Large</span>
        </div>
      </div>

      {/* Obstacle Shape Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🔷 Obstacle Shape:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['cylinder', 'square', 'triangle'] as const).map((shape) => (
            <button
              key={shape}
              onClick={() => setObstacleShape(shape)}
              style={{
                flex: 1,
                padding: '10px',
                background: obstacleShape === shape ? colors.accent : 'rgba(71, 85, 105, 0.5)',
                border: 'none',
                borderRadius: '8px',
                color: colors.textPrimary,
                fontWeight: obstacleShape === shape ? 'bold' : 'normal',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '12px',
              }}
            >
              {shape === 'cylinder' ? '⚪' : shape === 'square' ? '⬜' : '🔺'} {shape}
            </button>
          ))}
        </div>
      </div>

      {/* Physics info */}
      <div style={{
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '8px',
      }}>
        <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 4px 0' }}>
          💡 The Strouhal number (St ≈ {calculateStrouhalNumber().toFixed(2)}) relates
          vortex shedding frequency to flow speed and obstacle size.
        </p>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'random', text: 'Vortices form randomly on both sides' },
    { id: 'same', text: 'All vortices spin the same direction' },
    { id: 'alternate', text: 'Vortices alternate: top spins one way, bottom spins opposite', correct: true },
    { id: 'none', text: 'No vortices form behind obstacles' },
  ];

  const twistPredictions = [
    { id: 'stronger', text: 'Stronger, faster winds cause more damage' },
    { id: 'resonance', text: 'Vortex shedding frequency matched the bridge\'s natural frequency', correct: true },
    { id: 'weight', text: 'The bridge was too heavy for the cables' },
    { id: 'earthquake', text: 'A small earthquake weakened the structure' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What determines whether vortex shedding occurs?',
      options: [
        { id: 'a', text: 'Only the flow speed' },
        { id: 'b', text: 'Only the obstacle size' },
        { id: 'c', text: 'The Reynolds number (combination of speed, size, and viscosity)', correct: true },
        { id: 'd', text: 'The color of the fluid' },
      ],
    },
    {
      id: 2,
      question: 'In a Kármán vortex street, how do adjacent vortices relate?',
      options: [
        { id: 'a', text: 'They all spin the same direction' },
        { id: 'b', text: 'They alternate in rotation direction', correct: true },
        { id: 'c', text: 'They don\'t rotate at all' },
        { id: 'd', text: 'Direction is random' },
      ],
    },
    {
      id: 3,
      question: 'What is the Strouhal number used for?',
      options: [
        { id: 'a', text: 'Measuring temperature' },
        { id: 'b', text: 'Predicting vortex shedding frequency', correct: true },
        { id: 'c', text: 'Measuring obstacle weight' },
        { id: 'd', text: 'Calculating gravity' },
      ],
    },
    {
      id: 4,
      question: 'Why did the Tacoma Narrows Bridge collapse?',
      options: [
        { id: 'a', text: 'The wind was too strong' },
        { id: 'b', text: 'The cables snapped from weight' },
        { id: 'c', text: 'Vortex shedding frequency matched the bridge\'s resonant frequency', correct: true },
        { id: 'd', text: 'Earthquake damage' },
      ],
    },
    {
      id: 5,
      question: 'What happens to vortex shedding at very low Reynolds numbers (Re < 5)?',
      options: [
        { id: 'a', text: 'Vortices form very quickly' },
        { id: 'b', text: 'No vortex shedding occurs - flow is too slow', correct: true },
        { id: 'c', text: 'Vortices form in a straight line' },
        { id: 'd', text: 'Turbulent chaos' },
      ],
    },
    {
      id: 6,
      question: 'How do modern tall buildings avoid vortex-induced vibration problems?',
      options: [
        { id: 'a', text: 'Building them shorter' },
        { id: 'b', text: 'Using heavier materials' },
        { id: 'c', text: 'Aerodynamic shaping and tuned mass dampers', correct: true },
        { id: 'd', text: 'Painting them special colors' },
      ],
    },
    {
      id: 7,
      question: 'Why do power lines "sing" or hum in the wind?',
      options: [
        { id: 'a', text: 'Electricity makes noise' },
        { id: 'b', text: 'Vortex shedding creates oscillating forces', correct: true },
        { id: 'c', text: 'The poles vibrate' },
        { id: 'd', text: 'Birds landing on them' },
      ],
    },
    {
      id: 8,
      question: 'If you double the flow speed while keeping obstacle size constant, what happens to shedding frequency?',
      options: [
        { id: 'a', text: 'Halves' },
        { id: 'b', text: 'Stays the same' },
        { id: 'c', text: 'Approximately doubles', correct: true },
        { id: 'd', text: 'Becomes random' },
      ],
    },
    {
      id: 9,
      question: 'Why do vortices form alternately on each side of the obstacle?',
      options: [
        { id: 'a', text: 'Magnetic forces' },
        { id: 'b', text: 'One side creates low pressure, pulling flow across and creating the next vortex on the opposite side', correct: true },
        { id: 'c', text: 'Gravity pulls them alternately' },
        { id: 'd', text: 'Random chance' },
      ],
    },
    {
      id: 10,
      question: 'The Strouhal number for a cylinder is approximately:',
      options: [
        { id: 'a', text: 'St ≈ 0.01' },
        { id: 'b', text: 'St ≈ 0.21', correct: true },
        { id: 'c', text: 'St ≈ 1.0' },
        { id: 'd', text: 'St ≈ 10' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🌉 Bridge Design',
      description: 'The Tacoma Narrows Bridge collapse (1940) dramatically demonstrated vortex-induced vibration. Modern bridges use aerodynamic deck shapes and tuned mass dampers to prevent resonance with vortex shedding frequencies.',
      insight: 'Engineers now routinely test bridge models in wind tunnels specifically to identify and avoid dangerous vortex shedding frequencies.',
    },
    {
      id: 1,
      title: '🏙️ Skyscraper Aerodynamics',
      description: 'Tall buildings can sway dangerously when vortex shedding frequency matches structural resonance. The Burj Khalifa\'s stepped, asymmetric shape prevents synchronized vortex shedding.',
      insight: 'The 101-floor Taipei 101 has a 730-ton tuned mass damper to counteract wind-induced vibrations - visitors can watch it swing!',
    },
    {
      id: 2,
      title: '🔌 Power Line Design',
      description: 'Power lines "sing" in the wind due to vortex shedding. Engineers install spiral spoilers or dampers to disrupt the regular vortex pattern and prevent resonant vibrations that could damage lines.',
      insight: 'The "aeolian tones" from power lines are the same physics that makes wind instruments work - but engineers want to silence them!',
    },
    {
      id: 3,
      title: '☁️ Cloud Patterns',
      description: 'Kármán vortex streets appear in nature when wind flows past islands! Satellite photos show beautiful alternating vortex patterns in clouds downstream of mountainous islands.',
      insight: 'The Canary Islands and Madeira regularly create textbook Kármán vortex streets visible from space - some stretching hundreds of kilometers.',
    },
  ];

  // ==================== REAL WORLD APPLICATIONS ====================
  const realWorldApps = [
    {
      icon: '🔬',
      title: 'Vortex Flow Meters',
      short: 'Precision fluid measurement using vortex shedding frequency',
      tagline: 'Turning turbulence into precise measurement',
      description: 'Vortex flow meters exploit the Karman vortex street phenomenon to measure fluid flow rates with exceptional accuracy. A bluff body (shedder bar) placed in the pipe creates vortices at a frequency directly proportional to flow velocity, allowing precise calculation of volumetric flow without moving parts.',
      connection: 'The same vortex shedding that can destroy bridges becomes an incredibly useful measurement tool when properly harnessed. The Strouhal number relationship (St = fD/V) ensures a linear relationship between shedding frequency and flow velocity.',
      howItWorks: 'A piezoelectric or ultrasonic sensor detects pressure oscillations caused by alternating vortices. The frequency of these oscillations is directly proportional to flow velocity via the Strouhal number. Digital signal processing extracts the vortex frequency even in noisy industrial environments.',
      stats: [
        { value: '0.5-1%', label: 'Accuracy achievable' },
        { value: '10:1 to 40:1', label: 'Turndown ratio range' },
        { value: '20+ years', label: 'Typical service life' },
      ],
      examples: [
        'Steam flow measurement in power plants',
        'Natural gas distribution monitoring',
        'Chemical process flow control',
        'HVAC system airflow measurement',
      ],
      companies: [
        'Emerson (Rosemount)',
        'Endress+Hauser',
        'Yokogawa',
        'ABB',
        'Honeywell',
      ],
      futureImpact: 'Next-generation vortex meters incorporate AI-driven diagnostics, self-calibration, and multi-variable sensing (flow, temperature, pressure) in single units. Miniaturized versions enable precise measurement in microfluidic and biomedical applications.',
      color: '#3b82f6',
    },
    {
      icon: '🌉',
      title: 'Bridge Design',
      short: 'Preventing vortex-induced vibration in long-span structures',
      tagline: 'Engineering resilience against invisible forces',
      description: 'The Tacoma Narrows Bridge collapse in 1940 became the defining lesson in structural aerodynamics. Modern bridge design incorporates extensive wind tunnel testing, aerodynamic deck shaping, and active/passive damping systems to prevent resonance between vortex shedding frequency and structural natural frequencies.',
      connection: 'When vortex shedding frequency matches a structure\'s natural frequency, resonance amplifies oscillations until catastrophic failure. The Strouhal number determines shedding frequency, while structural dynamics determine natural frequency - engineers must ensure these never coincide.',
      howItWorks: 'Aerodynamic deck profiles disrupt coherent vortex formation. Tuned mass dampers absorb oscillation energy. Fairings and wind screens modify the effective bluff body shape. Computational fluid dynamics simulates vortex behavior before construction.',
      stats: [
        { value: '40 mph', label: 'Wind speed at Tacoma collapse' },
        { value: '0.2 Hz', label: 'Tacoma\'s fatal resonant frequency' },
        { value: '2000+ m', label: 'Modern span lengths achieved' },
      ],
      examples: [
        'Akashi Kaikyo Bridge - world\'s longest suspension span',
        'Great Belt East Bridge - aerodynamic box girder design',
        'Millau Viaduct - split deck reduces vortex coherence',
        'Stonecutters Bridge - fairings on tower legs',
      ],
      companies: [
        'COWI',
        'Arup',
        'WSP',
        'AECOM',
      ],
      futureImpact: 'Smart bridges with embedded sensors will continuously monitor vortex-induced vibrations, using AI to predict and prevent dangerous resonance conditions. Active aerodynamic control surfaces may dynamically adjust to wind conditions.',
      color: '#f59e0b',
    },
    {
      icon: '💨',
      title: 'Vortex Energy Harvesting',
      short: 'Generating renewable power from flow-induced oscillations',
      tagline: 'Harvesting energy from the wind\'s dance',
      description: 'Vortex-induced vibration energy harvesting transforms the oscillating forces from Karman vortex streets into usable electrical power. Unlike traditional wind turbines, these bladeless devices use piezoelectric or electromagnetic transducers to convert structural vibration directly into electricity.',
      connection: 'The same phenomenon that endangered bridges becomes a power source when oscillations are captured rather than suppressed. Resonance, normally avoided in structural design, is deliberately engineered to maximize energy extraction from vortex shedding.',
      howItWorks: 'A flexible cylinder or mast is mounted vertically in wind or water flow. Vortex shedding causes the structure to oscillate perpendicular to the flow. Piezoelectric materials or electromagnetic coils at the base convert this mechanical motion into electrical current.',
      stats: [
        { value: '30-40%', label: 'Theoretical efficiency limit' },
        { value: '80%', label: 'Fewer moving parts vs. turbines' },
        { value: '<3 m/s', label: 'Cut-in wind speed possible' },
      ],
      examples: [
        'Vortex Bladeless wind energy systems',
        'Ocean current energy harvesters',
        'Remote sensor power systems',
        'Low-power IoT device charging',
      ],
      companies: [
        'Vortex Bladeless',
        'Oscilla Power',
        'VIVACE (University of Michigan)',
        'Resen Waves',
      ],
      futureImpact: 'Arrays of vortex harvesters could provide distributed renewable energy in urban environments where turbines are impractical. Underwater versions may power ocean monitoring networks indefinitely using tidal and current flows.',
      color: '#10b981',
    },
    {
      icon: '🚢',
      title: 'Submarine Detection',
      short: 'Acoustic signature analysis from hull vortex shedding',
      tagline: 'Listening for vortex whispers in the deep',
      description: 'Submarines generate characteristic acoustic signatures from vortex shedding off hull appendages, propeller blades, and control surfaces. Naval sonar systems analyze these "flow noise" patterns to detect, classify, and track submarines. Conversely, submarine designers work to minimize vortex-generated noise.',
      connection: 'The frequency of vortex shedding depends on flow velocity and obstacle size (Strouhal relationship). This creates predictable acoustic signatures that reveal submarine speed, size, and even design features to sophisticated sonar arrays.',
      howItWorks: 'Passive sonar arrays detect low-frequency pressure fluctuations from vortex shedding. Signal processing algorithms isolate vortex frequencies from ambient ocean noise. The Strouhal relationship allows estimation of target velocity and characteristic dimensions from frequency analysis.',
      stats: [
        { value: '10-200 Hz', label: 'Typical vortex frequency range' },
        { value: '100+ km', label: 'Detection range in ideal conditions' },
        { value: '-20 dB', label: 'Noise reduction goal per generation' },
      ],
      examples: [
        'SOSUS fixed ocean surveillance system',
        'Towed array sonar submarine detection',
        'Virginia-class submarine stealth design',
        'Anechoic tile flow noise reduction',
      ],
      companies: [
        'Lockheed Martin',
        'General Dynamics Electric Boat',
        'BAE Systems',
        'Naval Group',
        'Thales',
      ],
      futureImpact: 'Machine learning algorithms increasingly distinguish submarine vortex signatures from marine life and oceanographic phenomena. Quantum sensors may detect the minute magnetic anomalies created by vortex-induced water motion.',
      color: '#6366f1',
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
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
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
              🌊 Streets in the Wind
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 110: Kármán Vortex Street
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
                🤯 The Bridge That Danced to Death
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                In 1940, the Tacoma Narrows Bridge twisted and collapsed in 40 mph winds - not
                even a strong storm! The culprit? A beautiful pattern of spinning air called a
                <strong style={{ color: colors.vortexCW }}> Kármán Vortex Street</strong>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                From Disasters to <span style={{ color: colors.accent }}>Discovery</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                These same vortex patterns appear in clouds behind islands, make power lines
                "sing" in the wind, and guide the design of every modern skyscraper. Understanding
                them saves lives!
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
              Fluid (air or water) flows from <strong>left to right</strong> past an obstacle.
              Behind the obstacle, you can see spinning vortices forming. The
              <span style={{ color: colors.vortexCW }}> orange vortices</span> spin clockwise,
              while <span style={{ color: colors.vortexCCW }}>purple vortices</span> spin
              counter-clockwise.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              The <strong>Reynolds number (Re)</strong> determines whether vortices form at all -
              it combines flow speed, obstacle size, and fluid properties.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 How do the vortices arrange themselves behind the obstacle?
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
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #fbbf24' : '2px solid transparent',
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
              🔬 Create Your Vortex Street!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust flow speed and obstacle size to see different regimes
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
              <li>Low speed → smooth flow, no vortices</li>
              <li>Medium speed → beautiful alternating pattern</li>
              <li>High speed → turbulent, chaotic vortices</li>
              <li>Try different shapes - which sheds most?</li>
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
              Vortices <strong style={{ color: colors.accent }}>alternate</strong> because of a
              feedback mechanism: when a vortex forms on one side, it creates a low-pressure
              region that pulls the flow across. This triggers the next vortex to form on
              the opposite side!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The result is a regular "street" of vortices: top ones spin one way, bottom ones
              spin the opposite. This creates alternating forces on the obstacle - push up,
              push down, push up...
            </p>
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                The alternating push/pull has a specific frequency (determined by the Strouhal
                number). If this matches the structure's natural frequency = <strong>resonance</strong>
                = potentially catastrophic vibration!
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
              🔢 The Strouhal Number:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              <strong>St = f × D / v</strong> where f is shedding frequency, D is obstacle size,
              and v is flow velocity. For a cylinder, St ≈ 0.21 - remarkably constant across
              a wide range of conditions!
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
              The Tacoma Narrows Disaster
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
              🌉 The Dancing Bridge:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              On November 7, 1940, the Tacoma Narrows Bridge collapsed in relatively mild winds
              (about 40 mph). The bridge had been visibly undulating for hours, twisting back
              and forth with increasing amplitude until it broke apart.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', marginTop: '8px' }}>
              The wind wasn't particularly strong that day. What really caused the collapse?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 What destroyed the Tacoma Narrows Bridge?
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
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: twistPrediction === p.id ? '2px solid #f87171' : '2px solid transparent',
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
        {renderBottomBar(true, !!twistPrediction, 'Learn The Truth →')}
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
              🔬 The Resonance Problem
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how shedding frequency can match structural frequency
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
              <li>Vortex shedding creates periodic forces</li>
              <li>Every structure has a natural frequency</li>
              <li>When these match = resonance = amplified oscillations</li>
              <li>Watch the shedding frequency as you change speed</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See The Full Story →')}
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
              {isCorrect ? 'Engineering Wisdom!' : 'The Resonance Killer!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🌉 Resonance Destroyed the Bridge:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The Tacoma Narrows Bridge's deck was unusually flexible, with a natural frequency
              around 0.2 Hz. On that fateful day, the wind speed happened to produce vortex
              shedding at <strong style={{ color: colors.error }}>exactly that frequency</strong>.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Each push from the vortices arrived at just the right moment to amplify the previous
              swing - like pushing a child on a swing at the perfect moment. The oscillations
              grew until the structure failed.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🏗️ Engineering Solutions:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Modern bridges avoid this by: (1) making decks more rigid, (2) using aerodynamic
              shapes that don't produce clean vortex streets, (3) adding dampers to absorb
              oscillations, and (4) extensive wind tunnel testing before construction.
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
                background: 'rgba(245, 158, 11, 0.1)',
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
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(245, 158, 11, 0.5)'
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
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
              Vortex Street Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered fluid dynamics & resonance
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
              <li>Vortices shed alternately from obstacles in flow</li>
              <li>Reynolds number determines the flow regime</li>
              <li>Strouhal number predicts shedding frequency</li>
              <li>Resonance with natural frequency can be catastrophic</li>
              <li>This physics shapes modern engineering design</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Spot Them In Nature:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Look at satellite images of cloud patterns around islands - you'll see beautiful
              Kármán vortex streets! Listen to power lines humming in the wind. Notice how
              flag poles have spiral wrapping near the top. You now understand the physics
              behind all of it!
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

export default KarmanVortexRenderer;
