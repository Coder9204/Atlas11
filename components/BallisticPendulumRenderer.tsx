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
        <svg viewBox="0 0 400 320" style={{ width: '100%', height: 'auto', background: 'linear-gradient(135deg, #0a0f1a 0%, #030712 50%, #0a0f1a 100%)', borderRadius: '12px' }}>
          {/* ========== PREMIUM DEFS SECTION ========== */}
          <defs>
            {/* Premium metallic gun gradient with depth */}
            <linearGradient id="bpenGunMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="80%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Bullet brass gradient - golden metallic finish */}
            <linearGradient id="bpenBulletBrass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Bullet 3D radial for sphere/tip effect */}
            <radialGradient id="bpenBulletGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.5" />
            </radialGradient>

            {/* Wooden block gradient - oak/mahogany look */}
            <linearGradient id="bpenWoodBlock" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="15%" stopColor="#78350f" />
              <stop offset="35%" stopColor="#a16207" />
              <stop offset="55%" stopColor="#78350f" />
              <stop offset="75%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>

            {/* Wood grain pattern overlay */}
            <pattern id="bpenWoodGrain" patternUnits="userSpaceOnUse" width="50" height="40">
              <rect width="50" height="40" fill="none" />
              <line x1="0" y1="5" x2="50" y2="7" stroke="#5c3d0e" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1="0" y1="12" x2="50" y2="10" stroke="#713f12" strokeWidth="0.3" strokeOpacity="0.3" />
              <line x1="0" y1="20" x2="50" y2="22" stroke="#5c3d0e" strokeWidth="0.4" strokeOpacity="0.35" />
              <line x1="0" y1="28" x2="50" y2="26" stroke="#713f12" strokeWidth="0.3" strokeOpacity="0.3" />
              <line x1="0" y1="35" x2="50" y2="37" stroke="#5c3d0e" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>

            {/* Metallic pendulum bob gradient */}
            <linearGradient id="bpenMetalBob" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* 3D sphere effect for metallic bob highlight */}
            <radialGradient id="bpenBobHighlight" cx="30%" cy="25%" r="60%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </radialGradient>

            {/* Rope/string texture gradient */}
            <linearGradient id="bpenRopeTexture" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d4a574" />
              <stop offset="20%" stopColor="#c9a066" />
              <stop offset="40%" stopColor="#b8956b" />
              <stop offset="60%" stopColor="#c9a066" />
              <stop offset="80%" stopColor="#d4a574" />
              <stop offset="100%" stopColor="#a8845a" />
            </linearGradient>

            {/* Support structure brushed metal */}
            <linearGradient id="bpenBrushedSteel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="15%" stopColor="#9ca3af" />
              <stop offset="30%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="70%" stopColor="#6b7280" />
              <stop offset="85%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            {/* Energy glow gradient (green) */}
            <radialGradient id="bpenEnergyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Momentum indicator gradient (red) */}
            <linearGradient id="bpenMomentumArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="bpenInfoPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
            </linearGradient>

            {/* Lab background gradient */}
            <linearGradient id="bpenLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* ========== FILTER EFFECTS ========== */}

            {/* Bullet motion blur effect */}
            <filter id="bpenMotionBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8,0" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bullet glow effect */}
            <filter id="bpenBulletGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Embedded bullet glow */}
            <filter id="bpenEmbeddedGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Height indicator glow */}
            <filter id="bpenHeightGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Metal shine effect */}
            <filter id="bpenMetalShine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Shadow for depth */}
            <filter id="bpenDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Muzzle flash glow */}
            <filter id="bpenMuzzleFlash" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern for lab floor */}
            <pattern id="bpenLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ========== PREMIUM BACKGROUND ========== */}
          <rect width="400" height="320" fill="url(#bpenLabBg)" />
          <rect width="400" height="320" fill="url(#bpenLabGrid)" />

          {/* Title with subtle glow */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold"
            style={{ textShadow: '0 0 10px rgba(148, 163, 184, 0.3)' }}>
            Ballistic Pendulum
          </text>

          {/* ========== PREMIUM SUPPORT STRUCTURE ========== */}
          {/* Main support beam */}
          <rect x="268" y="35" width="24" height="12" rx="2" fill="url(#bpenBrushedSteel)" filter="url(#bpenDropShadow)" />
          {/* Beam highlight */}
          <rect x="268" y="35" width="24" height="3" rx="1" fill="#d1d5db" fillOpacity="0.3" />
          {/* Vertical support post */}
          <rect x="277" y="42" width="6" height="18" fill="url(#bpenBrushedSteel)" />
          <rect x="277" y="42" width="2" height="18" fill="#9ca3af" fillOpacity="0.2" />
          {/* Pivot mount */}
          <circle cx={pivotX} cy={pivotY} r="5" fill="url(#bpenMetalBob)" stroke="#475569" strokeWidth="1" />
          <circle cx={pivotX} cy={pivotY} r="2" fill="#1e293b" />

          {/* ========== PREMIUM ROPE/STRING ========== */}
          {/* Rope shadow */}
          <line x1={pivotX + 1} y1={pivotY + 2} x2={pendulumX + 1} y2={pendulumY + 2}
            stroke="#000000" strokeWidth="4" strokeOpacity="0.3" strokeLinecap="round" />
          {/* Main rope with texture gradient */}
          <line x1={pivotX} y1={pivotY} x2={pendulumX} y2={pendulumY}
            stroke="url(#bpenRopeTexture)" strokeWidth="3" strokeLinecap="round" />
          {/* Rope highlight strand */}
          <line x1={pivotX - 0.5} y1={pivotY} x2={pendulumX - 0.5} y2={pendulumY}
            stroke="#e5d4b8" strokeWidth="0.8" strokeOpacity="0.6" strokeLinecap="round" />
          {/* Rope texture details */}
          {Array.from({ length: 8 }, (_, i) => {
            const t = (i + 1) / 9;
            const x = pivotX + (pendulumX - pivotX) * t;
            const y = pivotY + (pendulumY - pivotY) * t;
            return (
              <circle key={`rope-knot-${i}`} cx={x} cy={y} r="0.8" fill="#8b6914" fillOpacity="0.5" />
            );
          })}

          {/* ========== PREMIUM WOODEN BLOCK ========== */}
          {/* Block shadow */}
          <rect
            x={pendulumX - 23}
            y={pendulumY - 18}
            width="50" height="40"
            rx="3"
            fill="#000000"
            fillOpacity="0.4"
            transform={`translate(3, 4) rotate(${pendulumAngle}, ${pendulumX}, ${pendulumY})`}
          />
          {/* Main block with wood gradient */}
          <rect
            x={pendulumX - 25}
            y={pendulumY - 20}
            width="50" height="40"
            fill="url(#bpenWoodBlock)"
            stroke="#5c3d0e"
            strokeWidth="1.5"
            rx="4"
            filter="url(#bpenMetalShine)"
          />
          {/* Wood grain overlay */}
          <rect
            x={pendulumX - 25}
            y={pendulumY - 20}
            width="50" height="40"
            fill="url(#bpenWoodGrain)"
            rx="4"
            opacity="0.6"
          />
          {/* Block edge highlights */}
          <line x1={pendulumX - 25} y1={pendulumY - 18} x2={pendulumX + 23} y2={pendulumY - 18}
            stroke="#c9a066" strokeWidth="1" strokeOpacity="0.5" />
          <line x1={pendulumX - 23} y1={pendulumY - 20} x2={pendulumX - 23} y2={pendulumY + 18}
            stroke="#c9a066" strokeWidth="0.8" strokeOpacity="0.4" />
          {/* Block label */}
          <text x={pendulumX} y={pendulumY + 5} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="bold"
            fillOpacity="0.7">{(pendulumMass / 1000).toFixed(1)}kg</text>

          {/* Embedded bullet in block */}
          {bulletEmbedded && (
            <g filter="url(#bpenEmbeddedGlow)">
              {/* Bullet hole shadow */}
              <ellipse cx={pendulumX - 15} cy={pendulumY} rx="4" ry="4" fill="#1c1917" />
              {/* Embedded bullet with 3D effect */}
              <ellipse cx={pendulumX - 14} cy={pendulumY} rx="5" ry="5" fill="url(#bpenBulletGlow)" />
              <ellipse cx={pendulumX - 15} cy={pendulumY - 1} rx="2" ry="2" fill="#fef3c7" fillOpacity="0.6" />
            </g>
          )}

          {/* ========== PREMIUM GUN ========== */}
          {/* Gun shadow */}
          <rect x="22" y="203" width="42" height="22" rx="3" fill="#000000" fillOpacity="0.4" />
          {/* Gun body with metallic gradient */}
          <rect x="20" y="200" width="42" height="22" rx="4" fill="url(#bpenGunMetal)" filter="url(#bpenMetalShine)" />
          {/* Gun barrel */}
          <rect x="55" y="206" width="15" height="10" rx="2" fill="url(#bpenBrushedSteel)" />
          <rect x="55" y="206" width="15" height="2" rx="1" fill="#d1d5db" fillOpacity="0.3" />
          {/* Gun grip */}
          <rect x="22" y="218" width="15" height="12" rx="2" fill="#1f2937" />
          <rect x="24" y="220" width="2" height="8" rx="1" fill="#374151" />
          <rect x="28" y="220" width="2" height="8" rx="1" fill="#374151" />
          <rect x="32" y="220" width="2" height="8" rx="1" fill="#374151" />
          {/* Gun sights */}
          <rect x="64" y="203" width="3" height="4" fill="#475569" />
          <rect x="30" y="198" width="4" height="3" fill="#475569" />
          {/* Gun label */}
          <text x="41" y="214" textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="bold">GUN</text>

          {/* Bullet in gun (before firing) */}
          {!bulletFired && (
            <g>
              <ellipse cx="68" cy="211" rx="7" ry="4" fill="url(#bpenBulletBrass)" />
              <ellipse cx="72" cy="211" rx="3" ry="3" fill="url(#bpenBulletGlow)" />
              <ellipse cx="67" cy="210" rx="2" ry="1.5" fill="#fef3c7" fillOpacity="0.5" />
            </g>
          )}

          {/* ========== BULLET IN FLIGHT WITH MOTION BLUR ========== */}
          {bulletFired && !bulletEmbedded && (
            <g filter="url(#bpenMotionBlur)">
              {/* Motion trail */}
              <ellipse cx={50 + bulletPos - 15} cy="210" rx="12" ry="3"
                fill="url(#bpenMomentumArrow)" fillOpacity="0.6" />
              <ellipse cx={50 + bulletPos - 25} cy="210" rx="8" ry="2"
                fill="#fbbf24" fillOpacity="0.3" />
              {/* Main bullet body */}
              <ellipse cx={50 + bulletPos} cy="210" rx="10" ry="5" fill="url(#bpenBulletBrass)"
                filter="url(#bpenBulletGlowFilter)" />
              {/* Bullet tip (pointed) */}
              <ellipse cx={50 + bulletPos + 6} cy="210" rx="4" ry="4" fill="url(#bpenBulletGlow)" />
              {/* Bullet highlight */}
              <ellipse cx={50 + bulletPos + 3} cy="208" rx="3" ry="1.5" fill="#fef3c7" fillOpacity="0.7" />
              {/* Velocity indicator */}
              <text x={50 + bulletPos} y="225" textAnchor="middle" fill="#fbbf24" fontSize="7" fontWeight="bold">
                {bulletVelocity} m/s
              </text>
            </g>
          )}

          {/* Muzzle flash effect when just fired */}
          {bulletFired && !bulletEmbedded && bulletPos < 30 && (
            <g filter="url(#bpenMuzzleFlash)">
              <ellipse cx="75" cy="211" rx="8" ry="6" fill="#fbbf24" fillOpacity="0.8" />
              <ellipse cx="75" cy="211" rx="5" ry="4" fill="#fef3c7" fillOpacity="0.9" />
            </g>
          )}

          {/* ========== HEIGHT INDICATOR WITH GLOW ========== */}
          {bulletEmbedded && pendulumAngle > 5 && (
            <g filter="url(#bpenHeightGlow)">
              {/* Reference line (rest position) */}
              <line x1="340" y1={pivotY + stringLength} x2="365" y2={pivotY + stringLength}
                stroke={colors.energy} strokeWidth="1" strokeOpacity="0.5" />
              {/* Current height line */}
              <line x1="340" y1={pendulumY} x2="365" y2={pendulumY}
                stroke={colors.energy} strokeWidth="1" strokeOpacity="0.5" />
              {/* Height measurement line */}
              <line x1="352" y1={pivotY + stringLength} x2="352" y2={pendulumY}
                stroke="url(#bpenEnergyGlow)" strokeWidth="3" strokeOpacity="0.8" />
              {/* Arrow heads */}
              <polygon points={`347,${pivotY + stringLength - 5} 352,${pivotY + stringLength} 357,${pivotY + stringLength - 5}`}
                fill={colors.energy} />
              <polygon points={`347,${pendulumY + 5} 352,${pendulumY} 357,${pendulumY + 5}`}
                fill={colors.energy} />
              {/* Height label with background */}
              <rect x="360" y={(pivotY + stringLength + pendulumY) / 2 - 8} width="38" height="16" rx="3"
                fill="#022c22" fillOpacity="0.8" />
              <text x="379" y={(pivotY + stringLength + pendulumY) / 2 + 4} textAnchor="middle"
                fill={colors.energy} fontSize="10" fontWeight="bold">
                h={h.toFixed(3)}m
              </text>
            </g>
          )}

          {/* ========== PREMIUM INFO PANEL ========== */}
          <g transform="translate(10, 248)">
            {/* Panel background with gradient */}
            <rect x="0" y="0" width="380" height="65" fill="url(#bpenInfoPanel)" rx="8"
              stroke="#334155" strokeWidth="1" />
            {/* Panel inner glow */}
            <rect x="2" y="2" width="376" height="61" rx="6" fill="none"
              stroke="#475569" strokeWidth="0.5" strokeOpacity="0.3" />

            {/* Left column - Input parameters */}
            <g>
              <text x="12" y="16" fill="#94a3b8" fontSize="8" fontWeight="bold">INPUT</text>
              <circle cx="18" cy="28" r="4" fill="url(#bpenBulletGlow)" />
              <text x="26" y="31" fill={colors.textSecondary} fontSize="9">
                Bullet: {bulletMass}g @ {bulletVelocity}m/s
              </text>
              <rect x="14" y="38" width="8" height="6" rx="1" fill="url(#bpenWoodBlock)" />
              <text x="26" y="46" fill={colors.textSecondary} fontSize="9">
                Block: {pendulumMass}g ({(pendulumMass/1000).toFixed(1)}kg)
              </text>
            </g>

            {/* Divider */}
            <line x1="140" y1="8" x2="140" y2="57" stroke="#334155" strokeWidth="1" />

            {/* Middle column - Results */}
            <g>
              <text x="150" y="16" fill="#94a3b8" fontSize="8" fontWeight="bold">RESULT</text>
              <circle cx="156" cy="28" r="3" fill="url(#bpenEnergyGlow)" />
              <text x="164" y="31" fill={colors.energy} fontSize="9" fontWeight="bold">
                V = {V.toFixed(2)} m/s
              </text>
              <text x="150" y="46" fill={colors.energy} fontSize="9">
                h = {(h * 100).toFixed(2)} cm
              </text>
            </g>

            {/* Divider */}
            <line x1="255" y1="8" x2="255" y2="57" stroke="#334155" strokeWidth="1" />

            {/* Right column - Conservation */}
            <g>
              <text x="265" y="16" fill="#94a3b8" fontSize="8" fontWeight="bold">MOMENTUM</text>
              <text x="265" y="31" fill={colors.momentum} fontSize="9">
                p = {(bulletMass * bulletVelocity / 1000).toFixed(2)} kg·m/s
              </text>
              <text x="265" y="46" fill="#22c55e" fontSize="8">
                Conserved
              </text>
            </g>

            {/* Bottom equation */}
            <text x="190" y="60" textAnchor="middle" fill="#64748b" fontSize="7">
              mv = (m+M)V → KE → PE = (m+M)gh
            </text>
          </g>

          {/* ========== FLOOR/TABLE ========== */}
          <rect x="0" y="312" width="400" height="8" fill="#1e293b" />
          <rect x="0" y="312" width="400" height="2" fill="#334155" />
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
