'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// EDDY-CURRENT PENDULUM GAME
// Core Concept: Eddy currents create magnetic braking via Lenz's Law
// Real-World Application: How trains brake, metal detectors, damping systems
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface EddyCurrentPendulumRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound effects
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number }> = {
      click: { freq: 600, duration: 0.1 },
      success: { freq: 800, duration: 0.2 },
      failure: { freq: 300, duration: 0.3 },
      transition: { freq: 500, duration: 0.15 },
      complete: { freq: 900, duration: 0.4 }
    };
    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EddyCurrentPendulumRenderer: React.FC<EddyCurrentPendulumRendererProps> = ({ onGameEvent }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [materialType, setMaterialType] = useState<'aluminum' | 'copper' | 'plastic' | 'wood'>('aluminum');
  const [hasSlits, setHasSlits] = useState(false);
  const [magnetStrength, setMagnetStrength] = useState(80);
  const [isSwinging, setIsSwinging] = useState(false);

  // Pendulum physics state
  const [pendulumAngle, setPendulumAngle] = useState(45); // degrees
  const [angularVelocity, setAngularVelocity] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Transfer state
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);
  const [activeApp, setActiveApp] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);

  const isNavigating = useRef(false);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Material conductivity (affects damping)
  const materialConductivity = useMemo(() => {
    const conductivities: Record<string, number> = {
      copper: 1.0,      // Highest
      aluminum: 0.65,   // High
      plastic: 0.0,     // None
      wood: 0.0,        // None
    };
    return conductivities[materialType] || 0;
  }, [materialType]);

  // Damping coefficient based on material and slits
  const dampingCoefficient = useMemo(() => {
    let damping = materialConductivity * (magnetStrength / 100) * 0.15;
    if (hasSlits && materialConductivity > 0) {
      damping *= 0.2; // Slits reduce eddy currents by 80%
    }
    return damping;
  }, [materialConductivity, magnetStrength, hasSlits]);

  // Eddy current intensity (for visualization)
  const eddyCurrentIntensity = useMemo(() => {
    if (materialConductivity === 0) return 0;
    const velocity = Math.abs(angularVelocity);
    let intensity = velocity * materialConductivity * (magnetStrength / 100);
    if (hasSlits) intensity *= 0.2;
    return Math.min(100, intensity * 50);
  }, [angularVelocity, materialConductivity, magnetStrength, hasSlits]);

  // Pendulum physics simulation
  useEffect(() => {
    if (!isSwinging) return;

    const g = 9.81;
    const L = 1.0; // Pendulum length in meters
    const dt = 0.016; // 60 FPS

    const simulate = () => {
      setPendulumAngle(prev => {
        const angleRad = (prev * Math.PI) / 180;

        // Gravitational torque
        const gravityAccel = -(g / L) * Math.sin(angleRad) * (180 / Math.PI);

        // Damping from eddy currents (velocity-dependent)
        const dampingForce = -dampingCoefficient * angularVelocity * 10;

        // Air resistance (small)
        const airDamping = -0.01 * angularVelocity;

        const totalAccel = gravityAccel + dampingForce + airDamping;

        setAngularVelocity(v => {
          const newV = v + totalAccel * dt;
          return newV;
        });

        let newAngle = prev + angularVelocity * dt;

        // Stop if energy is very low
        if (Math.abs(newAngle) < 0.5 && Math.abs(angularVelocity) < 1) {
          setIsSwinging(false);
          return 0;
        }

        return newAngle;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSwinging, dampingCoefficient, angularVelocity]);

  // Start pendulum swing
  const startSwing = () => {
    setPendulumAngle(60);
    setAngularVelocity(0);
    setIsSwinging(true);
  };

  // Colors
  const colors = {
    bgDeep: '#030712',
    bgSurface: '#0f172a',
    bgElevated: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    accent: '#f59e0b',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
    magnet: '#dc2626',
    magnetSouth: '#3b82f6',
    aluminum: '#94a3b8',
    copper: '#f97316',
    plastic: '#84cc16',
    wood: '#a16207',
    eddy: '#8b5cf6',
  };

  // Material colors
  const getMaterialColor = (mat: string) => {
    const materialColors: Record<string, string> = {
      aluminum: colors.aluminum,
      copper: colors.copper,
      plastic: colors.plastic,
      wood: colors.wood,
    };
    return materialColors[mat] || colors.aluminum;
  };

  // Emit game events
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'eddy_current_pendulum',
      gameTitle: 'Eddy Current Pendulum',
      details: { phase, materialType, hasSlits, magnetStrength, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, materialType, hasSlits, magnetStrength]);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_changed', { newPhase: p });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // ============================================================================
  // REUSABLE COMPONENTS
  // ============================================================================

  const Button: React.FC<{
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }> = ({ onClick, variant = 'primary', disabled, children, style }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          playSound('click');
          onClick();
        }
      }}
      disabled={disabled}
      style={{
        padding: isMobile ? '14px 20px' : '16px 28px',
        minHeight: '48px',
        minWidth: '48px',
        background: variant === 'primary'
          ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
          : variant === 'secondary' ? colors.bgElevated : 'transparent',
        color: colors.textPrimary,
        border: variant === 'ghost' ? `1px solid ${colors.bgElevated}` : 'none',
        borderRadius: '12px',
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        touchAction: 'manipulation',
        ...style
      }}
    >
      {children}
    </button>
  );

  const ExplanationBox: React.FC<{
    whatHappens: string;
    whyItHappens: string;
    realWorldExample: string;
  }> = ({ whatHappens, whyItHappens, realWorldExample }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px' }}>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.primary}15`,
        borderLeft: `4px solid ${colors.primary}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase', marginBottom: '6px' }}>
          What Happens
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {whatHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.eddy}15`,
        borderLeft: `4px solid ${colors.eddy}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.eddy, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Happens (Lenz's Law)
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {whyItHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.success}15`,
        borderLeft: `4px solid ${colors.success}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.success, textTransform: 'uppercase', marginBottom: '6px' }}>
          Real-World Example
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {realWorldExample}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // PENDULUM VISUALIZATION (Enhanced with realistic graphics)
  // ============================================================================

  const PendulumVisualization: React.FC<{
    showLabels?: boolean;
    showEddyCurrents?: boolean;
    animated?: boolean;
  }> = ({ showLabels = true, showEddyCurrents = true, animated = true }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 350 : 420;
    const pivotX = svgWidth / 2;
    const pivotY = 60;
    const pendulumLength = isMobile ? 180 : 240;

    // Calculate pendulum bob position
    const angleRad = (pendulumAngle * Math.PI) / 180;
    const bobX = pivotX + Math.sin(angleRad) * pendulumLength;
    const bobY = pivotY + Math.cos(angleRad) * pendulumLength;

    // Magnet gap position (where pendulum passes through)
    const magnetY = pivotY + pendulumLength - 30;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, margin: '0 auto', display: 'block' }}
      >
        {/* === DEFINITIONS === */}
        <defs>
          {/* Magnet gradients */}
          <linearGradient id="eddyMagnetNorth" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="eddyMagnetSouth" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Metal sheet gradients */}
          <linearGradient id="aluminumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="copperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="30%" stopColor="#fdba74" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="70%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="plasticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="50%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#65a30d" />
          </linearGradient>
          <linearGradient id="woodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" />
            <stop offset="25%" stopColor="#b8860b" />
            <stop offset="50%" stopColor="#a16207" />
            <stop offset="75%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Eddy current glow */}
          <radialGradient id="eddyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>

          {/* Magnetic field lines */}
          <linearGradient id="fieldLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>

          {/* Filters */}
          <filter id="eddyShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.4" />
          </filter>
          <filter id="eddyGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* === BACKGROUND === */}
        <rect width={svgWidth} height={svgHeight} fill={colors.bgSurface} rx="12" />

        {/* Subtle grid */}
        <pattern id="eddyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.bgElevated} strokeWidth="0.5" opacity="0.4" />
        </pattern>
        <rect width={svgWidth} height={svgHeight} fill="url(#eddyGrid)" rx="12" />

        {/* === SUPPORT FRAME === */}
        <g filter="url(#eddyShadow)">
          {/* Top bar */}
          <rect x={pivotX - 80} y={30} width={160} height={12} rx="3" fill="#374151" />
          <rect x={pivotX - 75} y={32} width={150} height={3} rx="1" fill="#4b5563" />

          {/* Support posts */}
          <rect x={pivotX - 85} y={30} width={14} height={svgHeight - 60} rx="3" fill="#374151" />
          <rect x={pivotX + 71} y={30} width={14} height={svgHeight - 60} rx="3" fill="#374151" />

          {/* Base */}
          <rect x={pivotX - 100} y={svgHeight - 35} width={200} height={20} rx="4" fill="#1f2937" />
        </g>

        {/* === MAGNET ASSEMBLY === */}
        <g filter="url(#eddyShadow)">
          {/* Left magnet (North) */}
          <rect
            x={pivotX - 70}
            y={magnetY - 40}
            width={25}
            height={80}
            rx="4"
            fill="url(#eddyMagnetNorth)"
          />
          <text x={pivotX - 57} y={magnetY + 5} textAnchor="middle" fill="white" fontSize="16" fontWeight="700">N</text>

          {/* Right magnet (South) */}
          <rect
            x={pivotX + 45}
            y={magnetY - 40}
            width={25}
            height={80}
            rx="4"
            fill="url(#eddyMagnetSouth)"
          />
          <text x={pivotX + 58} y={magnetY + 5} textAnchor="middle" fill="white" fontSize="16" fontWeight="700">S</text>

          {/* Magnet yoke (connects them) */}
          <rect
            x={pivotX - 70}
            y={magnetY + 45}
            width={140}
            height={12}
            rx="3"
            fill="#374151"
          />
        </g>

        {/* === MAGNETIC FIELD LINES === */}
        <g opacity={magnetStrength / 150 + 0.3}>
          {[-20, -10, 0, 10, 20].map((offset, i) => (
            <line
              key={i}
              x1={pivotX - 42}
              y1={magnetY + offset}
              x2={pivotX + 42}
              y2={magnetY + offset}
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeDasharray="6,4"
              opacity="0.5"
            />
          ))}
        </g>

        {/* === PENDULUM === */}
        <g>
          {/* Pivot point */}
          <circle cx={pivotX} cy={pivotY} r="8" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
          <circle cx={pivotX} cy={pivotY} r="3" fill="#1e293b" />

          {/* String/rod */}
          <line
            x1={pivotX}
            y1={pivotY}
            x2={bobX}
            y2={bobY}
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Pendulum bob (metal/plastic sheet) */}
          <g transform={`translate(${bobX}, ${bobY}) rotate(${pendulumAngle})`}>
            {/* Get the right gradient based on material */}
            {(() => {
              const gradientId = `${materialType}Gradient`;
              const sheetWidth = isMobile ? 50 : 65;
              const sheetHeight = isMobile ? 70 : 90;

              return (
                <>
                  {/* Sheet body */}
                  <rect
                    x={-sheetWidth / 2}
                    y={-10}
                    width={sheetWidth}
                    height={sheetHeight}
                    rx="4"
                    fill={`url(#${gradientId})`}
                    stroke={getMaterialColor(materialType)}
                    strokeWidth="2"
                    filter="url(#eddyShadow)"
                  />

                  {/* Slits (if enabled) */}
                  {hasSlits && materialConductivity > 0 && (
                    <>
                      {[0, 1, 2, 3].map(i => (
                        <rect
                          key={i}
                          x={-sheetWidth / 2 + 8 + i * 12}
                          y={5}
                          width={3}
                          height={sheetHeight - 20}
                          rx="1"
                          fill={colors.bgDeep}
                        />
                      ))}
                    </>
                  )}

                  {/* Surface highlight */}
                  <rect
                    x={-sheetWidth / 2 + 3}
                    y={-7}
                    width={sheetWidth - 6}
                    height={8}
                    rx="2"
                    fill="rgba(255,255,255,0.2)"
                  />
                </>
              );
            })()}
          </g>

          {/* Eddy current visualization (swirling loops) */}
          {showEddyCurrents && eddyCurrentIntensity > 5 && materialConductivity > 0 && (
            <g transform={`translate(${bobX}, ${bobY + 30}) rotate(${pendulumAngle})`} filter="url(#eddyGlowFilter)">
              {/* Current loops */}
              {[0, 1, 2].map(i => {
                const loopRadius = 12 + i * 8;
                const opacity = (eddyCurrentIntensity / 100) * (1 - i * 0.25);
                return (
                  <circle
                    key={i}
                    cx={0}
                    cy={0}
                    r={loopRadius}
                    fill="none"
                    stroke={colors.eddy}
                    strokeWidth="2"
                    strokeDasharray={`${loopRadius * 0.5},${loopRadius * 0.3}`}
                    opacity={opacity}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={angularVelocity > 0 ? "0" : "360"}
                      to={angularVelocity > 0 ? "360" : "0"}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })}

              {/* Induced magnetic field indicator */}
              <circle
                cx={0}
                cy={0}
                r={8}
                fill="url(#eddyGlow)"
              />
            </g>
          )}
        </g>

        {/* === INFO PANELS === */}

        {/* Material indicator - Top left */}
        {showLabels && (
          <g transform="translate(10, 10)">
            <rect x={0} y={0} width={90} height={50} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={45} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              MATERIAL
            </text>
            <circle cx={20} cy={34} r="8" fill={getMaterialColor(materialType)} />
            <text x={55} y={38} textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600" style={{ textTransform: 'capitalize' }}>
              {materialType}
            </text>
          </g>
        )}

        {/* Damping indicator - Top right */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 100}, 10)`}>
            <rect x={0} y={0} width={90} height={50} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={45} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              DAMPING
            </text>
            <text x={45} y={38} textAnchor="middle" fill={dampingCoefficient > 0.05 ? colors.success : colors.textMuted} fontSize="14" fontWeight="700">
              {dampingCoefficient > 0.05 ? 'STRONG' : dampingCoefficient > 0.01 ? 'WEAK' : 'NONE'}
            </text>
          </g>
        )}

        {/* Eddy current intensity - Bottom left */}
        {showLabels && (
          <g transform={`translate(10, ${svgHeight - 70})`}>
            <rect x={0} y={0} width={110} height={60} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={55} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              EDDY CURRENTS
            </text>

            {/* Intensity bar */}
            <rect x={10} y={26} width={90} height={8} rx="4" fill={colors.bgElevated} />
            <rect
              x={10}
              y={26}
              width={Math.min(90, eddyCurrentIntensity * 0.9)}
              height={8}
              rx="4"
              fill={colors.eddy}
            />

            <text x={55} y={52} textAnchor="middle" fill={colors.eddy} fontSize="12" fontWeight="700">
              {Math.round(eddyCurrentIntensity)}%
            </text>
          </g>
        )}

        {/* Angle indicator - Bottom right */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 100}, ${svgHeight - 70})`}>
            <rect x={0} y={0} width={90} height={60} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={45} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              ANGLE
            </text>
            <text x={45} y={42} textAnchor="middle" fill={colors.textPrimary} fontSize="20" fontWeight="700">
              {Math.round(pendulumAngle)}°
            </text>
          </g>
        )}

        {/* Slits indicator */}
        {showLabels && hasSlits && materialConductivity > 0 && (
          <g transform={`translate(${svgWidth / 2 - 40}, ${svgHeight - 35})`}>
            <rect x={0} y={0} width={80} height={25} rx="6" fill="rgba(245,158,11,0.2)" stroke={colors.warning} strokeWidth="1" />
            <text x={40} y={17} textAnchor="middle" fill={colors.warning} fontSize="10" fontWeight="600">
              SLITS ACTIVE
            </text>
          </g>
        )}

        {/* Lenz's Law label - Bottom center */}
        {showLabels && (
          <g transform={`translate(${svgWidth / 2 - 55}, 10)`}>
            <rect x={0} y={0} width={110} height={25} rx="6" fill="rgba(139,92,246,0.15)" stroke={colors.eddy} strokeWidth="1" />
            <text x={55} y={17} textAnchor="middle" fill={colors.textPrimary} fontSize="10" fontWeight="600">
              Lenz's Law Braking
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{
        padding: '8px 20px',
        background: `${colors.eddy}20`,
        border: `1px solid ${colors.eddy}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.eddy, textTransform: 'uppercase' }}>
          Invisible Magnetic Braking
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '40px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '20px',
        lineHeight: 1.2
      }}>
        Can a Metal Sheet Stop<br />Motion Without Touching?
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        Swing a pendulum near magnets. If the pendulum is metal, something
        <strong style={{ color: colors.eddy }}> mysterious happens</strong> -
        it slows down dramatically, even though nothing touches it.
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: isMobile ? '240px' : '300px',
        marginBottom: '32px',
        backgroundColor: colors.bgSurface,
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <PendulumVisualization showLabels={false} showEddyCurrents={false} />
      </div>

      <Button onClick={goNext}>
        Discover the Secret →
      </Button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 2 of 10 • Make a Prediction
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          A metal pendulum swings between strong magnets. What will happen?
        </h2>

        <div style={{
          padding: '16px',
          backgroundColor: colors.bgSurface,
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            The pendulum is a sheet of aluminum - a good conductor but NOT magnetic (a magnet won't stick to it).
            We swing it so it passes through a strong magnetic field between two magnets.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'nothing', icon: '↔️', label: 'Nothing special happens', desc: 'Aluminum isn\'t magnetic, so magnets don\'t affect it' },
            { id: 'attract', icon: '🧲', label: 'The pendulum sticks to the magnets', desc: 'Magnets attract all metals' },
            { id: 'slows', icon: '🛑', label: 'The pendulum slows down dramatically', desc: 'Something invisible brakes it' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: prediction === opt.id ? `${colors.primary}20` : colors.bgSurface,
                border: prediction === opt.id ? `2px solid ${colors.primary}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {prediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.primary }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext} disabled={!prediction}>Test It →</Button>
        </div>
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        background: colors.bgSurface
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
          Step 3 of 10 • Interactive Experiment
        </span>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', color: colors.textPrimary, margin: '4px 0' }}>
          EDDY CURRENT PENDULUM
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Compare different materials swinging through the magnetic field
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Visualization */}
          <div style={{
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            padding: '8px',
            marginBottom: '16px'
          }}>
            <PendulumVisualization />
          </div>

          {/* Material selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
              SELECT MATERIAL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(['aluminum', 'copper', 'plastic', 'wood'] as const).map(mat => (
                <button
                  key={mat}
                  onClick={() => { setMaterialType(mat); setIsSwinging(false); setPendulumAngle(45); playSound('click'); }}
                  style={{
                    padding: '12px 8px',
                    backgroundColor: materialType === mat ? `${getMaterialColor(mat)}30` : colors.bgSurface,
                    border: `2px solid ${materialType === mat ? getMaterialColor(mat) : colors.bgElevated}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: getMaterialColor(mat),
                    borderRadius: '4px',
                    margin: '0 auto 6px'
                  }} />
                  <div style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {mat}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: '9px' }}>
                    {mat === 'aluminum' || mat === 'copper' ? 'Conductor' : 'Insulator'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Swing button */}
          <Button
            onClick={startSwing}
            disabled={isSwinging}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            {isSwinging ? 'Swinging...' : '🔄 Release Pendulum'}
          </Button>

          {/* Results display */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            border: `1px solid ${dampingCoefficient > 0.05 ? colors.success : colors.bgElevated}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>Braking Effect</div>
                <div style={{ fontSize: '18px', color: dampingCoefficient > 0.05 ? colors.success : colors.textMuted, fontWeight: 700 }}>
                  {dampingCoefficient > 0.05 ? 'STRONG DAMPING' : dampingCoefficient > 0.01 ? 'WEAK DAMPING' : 'NO DAMPING'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>Conductivity</div>
                <div style={{ fontSize: '18px', color: colors.textPrimary, fontWeight: 700 }}>
                  {Math.round(materialConductivity * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.bgElevated}`,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button variant="ghost" onClick={goBack}>← Back</Button>
        <Button onClick={goNext}>See Why →</Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
          Step 4 of 10 • Understanding
        </span>
        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 24px'
        }}>
          Lenz's Law: Nature's Magnetic Brake
        </h2>

        <ExplanationBox
          whatHappens="When the conducting sheet moves through the magnetic field, it slows down dramatically - even though nothing physically touches it. Non-conductors (plastic, wood) swing freely without any braking."
          whyItHappens="Motion through a magnetic field induces circular electric currents (eddy currents) in the conductor. By Lenz's Law, these currents create their own magnetic field that OPPOSES the motion that caused them. The kinetic energy is converted to heat in the metal."
          realWorldExample="This principle is used in electromagnetic brakes for trains, roller coasters, and exercise equipment. No friction, no wear, instant response - and the braking force increases automatically with speed!"
        />

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: `${colors.warning}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.warning}40`
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: colors.warning, marginBottom: '8px' }}>
            ⚠️ Safety Note
          </div>
          <div style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.5 }}>
            Strong neodymium magnets can pinch fingers severely. Keep fingers clear of the gap when the pendulum is swinging. These magnets can also damage electronics and credit cards.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>Try the Twist →</Button>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 5 of 10 • Twist Prediction
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          What if we cut slits in the metal sheet?
        </h2>

        <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
          We take the same aluminum sheet and cut several parallel slits through it (like a comb).
          How will this affect the magnetic braking?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'stronger', icon: '📈', label: 'Braking becomes STRONGER', desc: 'More edges means more interaction' },
            { id: 'weaker', icon: '📉', label: 'Braking becomes WEAKER', desc: 'Slits interrupt something important' },
            { id: 'same', icon: '➡️', label: 'No change', desc: 'The material is still aluminum' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgSurface,
                border: twistPrediction === opt.id ? `2px solid ${colors.accent}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {twistPrediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.accent }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext} disabled={!twistPrediction}>Test It →</Button>
        </div>
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.bgSurface} 100%)`
      }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
          Step 6 of 10 • Twist Experiment
        </span>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', color: colors.textPrimary, margin: '4px 0' }}>
          SLITS VS SOLID SHEET
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Toggle slits on the metal sheet and compare the braking
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            padding: '8px',
            marginBottom: '16px'
          }}>
            <PendulumVisualization />
          </div>

          {/* Slit toggle */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 600 }}>
                  Cut Slits in Sheet
                </div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>
                  Interrupt the circular eddy current paths
                </div>
              </div>
              <button
                onClick={() => { setHasSlits(!hasSlits); setIsSwinging(false); setPendulumAngle(45); playSound('click'); }}
                style={{
                  width: '60px',
                  height: '32px',
                  borderRadius: '16px',
                  backgroundColor: hasSlits ? colors.accent : colors.bgElevated,
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  position: 'absolute',
                  top: '4px',
                  left: hasSlits ? '32px' : '4px',
                  transition: 'left 0.2s'
                }} />
              </button>
            </div>
          </div>

          {/* Make sure we're testing with a conductor */}
          {materialConductivity === 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: `${colors.warning}20`,
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <span style={{ color: colors.warning, fontSize: '13px' }}>
                ⚠️ Select a conductor (aluminum or copper) to see the slit effect
              </span>
            </div>
          )}

          <Button
            onClick={startSwing}
            disabled={isSwinging}
            style={{ width: '100%' }}
          >
            {isSwinging ? 'Swinging...' : '🔄 Release Pendulum'}
          </Button>
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.bgElevated}`,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button variant="ghost" onClick={goBack}>← Back</Button>
        <Button onClick={goNext}>Continue →</Button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
          Step 7 of 10 • Twist Understanding
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 24px'
        }}>
          Why Slits Weaken the Brake
        </h2>

        <ExplanationBox
          whatHappens="With slits cut in the sheet, the braking effect becomes much weaker. The pendulum swings more freely, almost like it was plastic!"
          whyItHappens="Eddy currents flow in circular loops. The slits interrupt these circular paths, forcing the current to take longer, higher-resistance routes. Less current means less opposing magnetic field, which means less braking force."
          realWorldExample="This is why transformer cores are made of thin laminated sheets instead of solid metal. The laminations reduce eddy currents that would otherwise waste energy as heat."
        />

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>Real World →</Button>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const applications = [
      {
        title: 'Train Brakes (Maglev & Emergency)',
        icon: '🚄',
        description: 'High-speed trains use eddy current brakes that never wear out. The faster the train, the stronger the braking - perfect for emergencies.',
        insight: 'Some trains can stop from 300 km/h using only magnetic braking.'
      },
      {
        title: 'Roller Coaster Brakes',
        icon: '🎢',
        description: 'At the end of the ride, magnetic fins on the car pass through arrays of magnets. Smooth, reliable braking with no friction parts to maintain.',
        insight: 'These brakes work even if the power goes out - they\'re passive and failsafe.'
      },
      {
        title: 'Metal Detectors',
        icon: '🔍',
        description: 'Airport and industrial metal detectors use eddy currents. A changing magnetic field induces currents in metal objects, which are then detected.',
        insight: 'This is why you have to remove metal items at airport security.'
      },
      {
        title: 'Induction Cooktops',
        icon: '🍳',
        description: 'Eddy currents in the pot bottom generate heat directly. The cooktop stays cool - only the pot heats up.',
        insight: 'Only works with magnetic pots (iron, steel). Aluminum and copper pans won\'t work!'
      }
    ];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
            Step 8 of 10 • Real-World Applications
          </span>

          <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: colors.textPrimary, margin: '12px 0 24px' }}>
            Eddy Currents Are Everywhere
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applications.map((app, i) => (
              <div
                key={i}
                onClick={() => {
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                  setActiveApp(i);
                  playSound('click');
                }}
                style={{
                  padding: '16px',
                  backgroundColor: activeApp === i ? `${colors.success}15` : colors.bgSurface,
                  border: `1px solid ${completedApps[i] ? colors.success : colors.bgElevated}`,
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{app.icon}</span>
                  <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{app.title}</span>
                  {completedApps[i] && <span style={{ marginLeft: 'auto', color: colors.success }}>✓</span>}
                </div>
                {activeApp === i && (
                  <>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', margin: '8px 0', lineHeight: 1.5 }}>
                      {app.description}
                    </p>
                    <p style={{ color: colors.accent, fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                      💡 {app.insight}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button variant="ghost" onClick={goBack}>← Back</Button>
            <Button onClick={goNext} disabled={!completedApps.some(c => c)}>
              Take the Test →
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const questions = [
      {
        question: 'What causes eddy currents in a conductor moving through a magnetic field?',
        options: ['Static electricity', 'Electromagnetic induction', 'Friction', 'Gravity'],
        correct: 1
      },
      {
        question: 'According to Lenz\'s Law, eddy currents create a magnetic field that:',
        options: ['Helps the motion', 'Opposes the motion', 'Has no effect', 'Attracts the magnets'],
        correct: 1
      },
      {
        question: 'Why does plastic NOT experience magnetic braking?',
        options: ['It\'s too light', 'It\'s not a conductor', 'It\'s not magnetic', 'It\'s too soft'],
        correct: 1
      },
      {
        question: 'Why do slits in the metal reduce the braking effect?',
        options: ['Less material', 'Interrupt eddy current loops', 'Reduce weight', 'Change the shape'],
        correct: 1
      },
      {
        question: 'Which application does NOT use eddy current braking?',
        options: ['Maglev trains', 'Roller coasters', 'Car disc brakes', 'Exercise bikes'],
        correct: 2
      }
    ];

    const currentQ = questions[currentQuestion];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>

          <h2 style={{ fontSize: isMobile ? '20px' : '24px', color: colors.textPrimary, margin: '12px 0 24px' }}>
            {currentQ.question}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = i;
                  setTestAnswers(newAnswers);
                  if (i === currentQ.correct) setTestScore(prev => prev + 1);
                  playSound(i === currentQ.correct ? 'success' : 'failure');
                  setTimeout(() => {
                    if (currentQuestion < questions.length - 1) {
                      setCurrentQuestion(prev => prev + 1);
                    } else {
                      goNext();
                    }
                  }, 1000);
                }}
                disabled={testAnswers[currentQuestion] !== null}
                style={{
                  padding: '16px',
                  background: testAnswers[currentQuestion] === i
                    ? i === currentQ.correct ? `${colors.success}20` : `${colors.error}20`
                    : colors.bgSurface,
                  border: testAnswers[currentQuestion] === i
                    ? `2px solid ${i === currentQ.correct ? colors.success : colors.error}`
                    : `1px solid ${colors.bgElevated}`,
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: '15px',
                  textAlign: 'left',
                  cursor: testAnswers[currentQuestion] !== null ? 'default' : 'pointer'
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button variant="ghost" onClick={goBack}>← Back</Button>
            <span style={{ color: colors.textMuted }}>Score: {testScore}/{questions.length}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉🧲</div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '16px'
      }}>
        Mastery Achieved!
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        You now understand how eddy currents create magnetic braking through Lenz's Law. This invisible force powers braking systems from trains to theme parks!
      </p>

      <div style={{
        padding: '20px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '8px' }}>Test Score</div>
        <div style={{ color: colors.success, fontSize: '36px', fontWeight: 700 }}>{testScore}/5</div>
      </div>

      <Button onClick={() => goToPhase('hook')}>
        Start Over
      </Button>
    </div>
  );

  // Phase renderer mapping
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Progress bar */}
      <div style={{ height: '4px', backgroundColor: colors.bgElevated, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          backgroundColor: colors.eddy,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default EddyCurrentPendulumRenderer;
