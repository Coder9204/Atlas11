'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// SPEAKER PRINCIPLE GAME
// Core Concept: Lorentz force on current-carrying wire in magnetic field
// Real-World Application: How speakers convert electrical signals to sound
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface SpeakerPrincipleRendererProps {
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

const SpeakerPrincipleRenderer: React.FC<SpeakerPrincipleRendererProps> = ({ onGameEvent }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [audioFrequency, setAudioFrequency] = useState(440); // Hz
  const [audioAmplitude, setAudioAmplitude] = useState(50); // 0-100%
  const [magnetStrength, setMagnetStrength] = useState(70); // 0-100%
  const [showForceVectors, setShowForceVectors] = useState(true);

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

  // Calculate wire displacement based on Lorentz force
  const wireDisplacement = useMemo(() => {
    // F = BIL, displacement proportional to force
    const forceFactor = (magnetStrength / 100) * (audioAmplitude / 100);
    return forceFactor * 25; // Max 25px displacement
  }, [magnetStrength, audioAmplitude]);

  // Sound intensity (what you'd hear)
  const soundIntensity = useMemo(() => {
    return Math.round(wireDisplacement * 4); // 0-100%
  }, [wireDisplacement]);

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
    wire: '#fbbf24',
    current: '#22d3ee',
    force: '#a855f7',
  };

  // Emit game events for AI coach
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'speaker_principle',
      gameTitle: 'Speaker Principle',
      details: { phase, audioFrequency, audioAmplitude, magnetStrength, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, audioFrequency, audioAmplitude, magnetStrength]);

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
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...style
      }}
    >
      {children}
    </button>
  );

  const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    hint: string;
    onChange: (v: number) => void;
    color?: string;
    showImpact?: { current: string; status: string };
  }> = ({ label, value, min, max, unit, hint, onChange, color = colors.primary, showImpact }) => {
    const [isDragging, setIsDragging] = useState(false);

    return (
      <div style={{
        padding: isMobile ? '14px' : '18px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        border: `1px solid ${isDragging ? color : colors.bgElevated}`,
        transition: 'border-color 0.2s'
      }}>
        <div style={{
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </div>

        <div style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 700,
          color: color,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px'
        }}>
          <span>{value}</span>
          <span style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary }}>{unit}</span>
        </div>

        {showImpact && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '12px',
            padding: '10px 12px',
            backgroundColor: colors.bgDeep,
            borderRadius: '8px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '2px' }}>RESULT</div>
              <div style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 600 }}>{showImpact.current}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '2px' }}>STATUS</div>
              <div style={{ fontSize: '14px', color: color, fontWeight: 600 }}>{showImpact.status}</div>
            </div>
          </div>
        )}

        <div style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            style={{
              width: '100%',
              height: '48px',
              cursor: 'grab',
              accentColor: color,
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: colors.textMuted,
          marginTop: '4px'
        }}>
          <span>{min}{unit}</span>
          <span style={{ color: colors.textSecondary }}>← Drag to adjust →</span>
          <span>{max}{unit}</span>
        </div>

        <div style={{
          fontSize: isMobile ? '12px' : '13px',
          color: colors.textSecondary,
          marginTop: '10px',
          padding: '10px 12px',
          backgroundColor: `${color}10`,
          borderRadius: '8px',
          borderLeft: `3px solid ${color}`
        }}>
          💡 {hint}
        </div>
      </div>
    );
  };

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
        backgroundColor: `${colors.force}15`,
        borderLeft: `4px solid ${colors.force}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.force, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Happens (Lorentz Force)
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
  // SPEAKER VISUALIZATION (Enhanced with realistic graphics)
  // ============================================================================

  const SpeakerVisualization: React.FC<{
    showLabels?: boolean;
    showWaveform?: boolean;
    animated?: boolean;
  }> = ({ showLabels = true, showWaveform = true, animated = true }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 320 : 400;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;

    // Animation state
    const [animPhase, setAnimPhase] = useState(0);
    useEffect(() => {
      if (!animated) return;
      const interval = setInterval(() => {
        setAnimPhase(prev => (prev + audioFrequency / 50) % (Math.PI * 2));
      }, 16);
      return () => clearInterval(interval);
    }, [animated, audioFrequency]);

    // Current wire displacement (sinusoidal)
    const currentDisplacement = animated
      ? Math.sin(animPhase) * wireDisplacement
      : wireDisplacement * 0.7;

    // Current direction (for force calculation display)
    const currentDirection = Math.sin(animPhase) > 0 ? 1 : -1;

    // Waveform points
    const waveformPoints = useMemo(() => {
      const points: string[] = [];
      const waveWidth = 120;
      const waveHeight = 40 * (audioAmplitude / 100);
      for (let i = 0; i <= 60; i++) {
        const x = 20 + (i / 60) * waveWidth;
        const y = svgHeight - 50 + Math.sin((i / 60) * Math.PI * 4 + animPhase) * waveHeight;
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    }, [animPhase, audioAmplitude, svgHeight]);

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, margin: '0 auto', display: 'block' }}
      >
        {/* === DEFINITIONS === */}
        <defs>
          {/* Magnet gradients - North pole (red) */}
          <linearGradient id="magnetNorthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="30%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>

          {/* Magnet gradient - South pole (blue) */}
          <linearGradient id="magnetSouthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="30%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* Wire gradient (copper) */}
          <linearGradient id="wireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="30%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Current glow */}
          <radialGradient id="currentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>

          {/* Force arrow gradient */}
          <linearGradient id="forceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>

          {/* Magnetic field gradient */}
          <linearGradient id="fieldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="magnetShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.4" />
          </filter>

          {/* Glow filter */}
          <filter id="wireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker */}
          <marker id="forceArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M0,2 L10,5 L0,8 L2,5 Z" fill={colors.force} />
          </marker>

          <marker id="currentArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,1 L8,4 L0,7 L1.5,4 Z" fill={colors.current} />
          </marker>

          <marker id="fieldArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#a855f7" />
          </marker>
        </defs>

        {/* === BACKGROUND === */}
        <rect width={svgWidth} height={svgHeight} fill={colors.bgSurface} rx="12" />

        {/* Subtle grid */}
        <pattern id="speakerGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.bgElevated} strokeWidth="0.5" opacity="0.4" />
        </pattern>
        <rect width={svgWidth} height={svgHeight} fill="url(#speakerGrid)" rx="12" />

        {/* === MAGNET ASSEMBLY === */}
        <g filter="url(#magnetShadow)">
          {/* Magnet yoke (back plate) */}
          <rect
            x={centerX - 100}
            y={centerY - 80}
            width={200}
            height={160}
            rx="8"
            fill="#374151"
            stroke="#4b5563"
            strokeWidth="2"
          />

          {/* Magnet yoke detail */}
          <rect
            x={centerX - 95}
            y={centerY - 75}
            width={190}
            height={150}
            rx="6"
            fill="#1f2937"
          />

          {/* North pole magnet (top) */}
          <rect
            x={centerX - 80}
            y={centerY - 65}
            width={160}
            height={45}
            rx="4"
            fill="url(#magnetNorthGradient)"
          />
          <text
            x={centerX}
            y={centerY - 38}
            textAnchor="middle"
            fill="#fef2f2"
            fontSize="14"
            fontWeight="700"
          >
            N
          </text>

          {/* South pole magnet (bottom) */}
          <rect
            x={centerX - 80}
            y={centerY + 20}
            width={160}
            height={45}
            rx="4"
            fill="url(#magnetSouthGradient)"
          />
          <text
            x={centerX}
            y={centerY + 47}
            textAnchor="middle"
            fill="#eff6ff"
            fontSize="14"
            fontWeight="700"
          >
            S
          </text>

          {/* Air gap (where the wire goes) */}
          <rect
            x={centerX - 80}
            y={centerY - 18}
            width={160}
            height={36}
            fill={colors.bgDeep}
            stroke="#374151"
            strokeWidth="1"
          />
        </g>

        {/* === MAGNETIC FIELD LINES === */}
        <g opacity={magnetStrength / 150 + 0.3}>
          {[0, 1, 2, 3, 4].map(i => {
            const xOffset = (i - 2) * 30;
            return (
              <g key={i}>
                <line
                  x1={centerX + xOffset}
                  y1={centerY - 60}
                  x2={centerX + xOffset}
                  y2={centerY + 60}
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  opacity="0.6"
                  markerEnd="url(#fieldArrow)"
                />
              </g>
            );
          })}
        </g>

        {/* === WIRE (Copper conductor) === */}
        <g transform={`translate(0, ${currentDisplacement})`} filter={audioAmplitude > 30 ? "url(#wireGlow)" : undefined}>
          {/* Wire body */}
          <rect
            x={centerX - 70}
            y={centerY - 6}
            width={140}
            height={12}
            rx="6"
            fill="url(#wireGradient)"
            stroke="#92400e"
            strokeWidth="1"
          />

          {/* Wire highlight */}
          <rect
            x={centerX - 65}
            y={centerY - 4}
            width={130}
            height={3}
            rx="1.5"
            fill="rgba(255,255,255,0.3)"
          />

          {/* Wire terminals */}
          <circle cx={centerX - 75} cy={centerY} r="8" fill="#78716c" stroke="#57534e" strokeWidth="2" />
          <circle cx={centerX + 75} cy={centerY} r="8" fill="#78716c" stroke="#57534e" strokeWidth="2" />

          {/* Current flow indicator */}
          {audioAmplitude > 10 && (
            <g opacity={audioAmplitude / 100}>
              <line
                x1={currentDirection > 0 ? centerX - 60 : centerX + 60}
                y1={centerY}
                x2={currentDirection > 0 ? centerX + 50 : centerX - 50}
                y2={centerY}
                stroke={colors.current}
                strokeWidth="3"
                strokeLinecap="round"
                markerEnd="url(#currentArrow)"
              />

              {/* Current glow particles */}
              {[0, 1, 2].map(i => {
                const particleX = centerX - 50 + ((animPhase * 20 + i * 40) % 100);
                return (
                  <circle
                    key={i}
                    cx={particleX}
                    cy={centerY}
                    r="4"
                    fill="url(#currentGlow)"
                  />
                );
              })}
            </g>
          )}
        </g>

        {/* === FORCE VECTORS (Lorentz Force) === */}
        {showForceVectors && wireDisplacement > 2 && (
          <g transform={`translate(0, ${currentDisplacement})`}>
            {/* Main force arrow */}
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY + (currentDirection > 0 ? -40 : 40)}
              stroke="url(#forceGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#forceArrow)"
              filter="url(#wireGlow)"
            />

            {/* Force label */}
            <rect
              x={centerX + 15}
              y={centerY + (currentDirection > 0 ? -45 : 25)}
              width="35"
              height="18"
              rx="4"
              fill="rgba(168,85,247,0.2)"
              stroke={colors.force}
              strokeWidth="1"
            />
            <text
              x={centerX + 32}
              y={centerY + (currentDirection > 0 ? -32 : 38)}
              textAnchor="middle"
              fill={colors.force}
              fontSize="11"
              fontWeight="700"
            >
              F
            </text>
          </g>
        )}

        {/* === WAVEFORM DISPLAY === */}
        {showWaveform && (
          <g>
            <rect
              x={15}
              y={svgHeight - 90}
              width={130}
              height={80}
              rx="8"
              fill="rgba(15,23,42,0.95)"
              stroke={colors.bgElevated}
              strokeWidth="1"
            />
            <text x={80} y={svgHeight - 72} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              AUDIO SIGNAL
            </text>

            {/* Waveform */}
            <polyline
              points={waveformPoints}
              fill="none"
              stroke={colors.current}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Center line */}
            <line
              x1={20}
              y1={svgHeight - 50}
              x2={140}
              y2={svgHeight - 50}
              stroke={colors.textMuted}
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          </g>
        )}

        {/* === DISPLACEMENT DISPLAY === */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 100}, ${svgHeight - 90})`}>
            <rect x={0} y={0} width={90} height={80} rx="8" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={45} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              DISPLACEMENT
            </text>

            {/* Displacement bar */}
            <rect x={15} y={28} width={60} height={8} rx="4" fill={colors.bgElevated} />
            <rect
              x={15}
              y={28}
              width={Math.min(60, wireDisplacement * 2.4)}
              height={8}
              rx="4"
              fill={wireDisplacement > 15 ? colors.success : wireDisplacement > 8 ? colors.warning : colors.textMuted}
            />

            <text x={45} y={55} textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="700">
              ±{wireDisplacement.toFixed(1)}mm
            </text>

            <text x={45} y={72} textAnchor="middle" fill={colors.textMuted} fontSize="9">
              Sound: {soundIntensity}%
            </text>
          </g>
        )}

        {/* === INFO PANELS === */}

        {/* Frequency display - Top left */}
        {showLabels && (
          <g transform="translate(10, 10)">
            <rect x={0} y={0} width={85} height={50} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={42} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              FREQUENCY
            </text>
            <text x={42} y={38} textAnchor="middle" fill={colors.current} fontSize="16" fontWeight="700">
              {audioFrequency}Hz
            </text>
          </g>
        )}

        {/* Magnet strength - Top right */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 95}, 10)`}>
            <rect x={0} y={0} width={85} height={50} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={42} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              B-FIELD
            </text>
            <text x={42} y={38} textAnchor="middle" fill={colors.magnet} fontSize="16" fontWeight="700">
              {magnetStrength}%
            </text>
          </g>
        )}

        {/* Formula display - Bottom center */}
        {showLabels && (
          <g transform={`translate(${centerX - 50}, ${svgHeight - 35})`}>
            <rect x={0} y={0} width={100} height={28} rx="6" fill="rgba(168,85,247,0.15)" stroke={colors.force} strokeWidth="1" />
            <text x={50} y={18} textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">
              F = B × I × L
            </text>
          </g>
        )}

        {/* Legend */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 120}, 70)`}>
            <rect x={0} y={0} width={110} height={55} rx="6" fill="rgba(15,23,42,0.9)" />
            <line x1={8} y1={14} x2={25} y2={14} stroke={colors.current} strokeWidth="3" />
            <text x={30} y={18} fill={colors.textMuted} fontSize="9">Current (I)</text>
            <line x1={8} y1={30} x2={25} y2={30} stroke="#a855f7" strokeWidth="2" strokeDasharray="4,4" />
            <text x={30} y={34} fill={colors.textMuted} fontSize="9">B-Field</text>
            <line x1={8} y1={46} x2={25} y2={46} stroke={colors.force} strokeWidth="3" />
            <text x={30} y={50} fill={colors.textMuted} fontSize="9">Force (F)</text>
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
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase' }}>
          Lorentz Force in Action
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '40px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '20px',
        lineHeight: 1.2
      }}>
        Can Electricity Push<br />a Wire Back and Forth?
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        Every speaker, headphone, and microphone relies on a simple principle:
        <strong style={{ color: colors.force }}> a wire carrying current in a magnetic field feels a force</strong>.
        Let's discover how electricity becomes sound.
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: isMobile ? '220px' : '280px',
        marginBottom: '32px',
        backgroundColor: colors.bgSurface,
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <SpeakerVisualization showLabels={false} showWaveform={false} />
      </div>

      <Button onClick={goNext}>
        Explore the Force →
      </Button>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: isMobile ? '16px' : '32px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 2 of 10 • Make a Prediction
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          What happens when AC current flows through a wire in a magnetic field?
        </h2>

        <p style={{
          color: colors.textSecondary,
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          A thin copper wire is suspended between two strong magnets.
          When we connect it to an audio signal (alternating current that changes direction rapidly), what will happen?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'nothing', icon: '🔇', label: 'Nothing happens', desc: 'The wire just gets warm' },
            { id: 'vibrate', icon: '〰️', label: 'The wire vibrates back and forth', desc: 'Following the changing current' },
            { id: 'spin', icon: '🔄', label: 'The wire spins in circles', desc: 'Like a motor' },
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
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {prediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.primary, fontSize: '20px' }}>✓</span>
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
        <h2 style={{
          fontSize: isMobile ? '18px' : '22px',
          color: colors.textPrimary,
          margin: '4px 0'
        }}>
          LORENTZ FORCE SPEAKER
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Adjust the audio signal and magnetic field to see how the wire moves
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
            <SpeakerVisualization />
          </div>

          {/* Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <SliderControl
              label="Audio Amplitude"
              value={audioAmplitude}
              min={0}
              max={100}
              unit="%"
              hint="Higher amplitude = more current = stronger force"
              onChange={setAudioAmplitude}
              color={colors.current}
              showImpact={{
                current: `${wireDisplacement.toFixed(1)}mm`,
                status: wireDisplacement > 15 ? 'Strong' : wireDisplacement > 8 ? 'Medium' : 'Weak'
              }}
            />
            <SliderControl
              label="Magnet Strength"
              value={magnetStrength}
              min={10}
              max={100}
              unit="%"
              hint="Stronger magnetic field = more force on the wire"
              onChange={setMagnetStrength}
              color={colors.magnet}
            />
          </div>

          {/* Frequency control */}
          <SliderControl
            label="Audio Frequency"
            value={audioFrequency}
            min={20}
            max={2000}
            unit="Hz"
            hint="This is the pitch of the sound - low = bass, high = treble"
            onChange={setAudioFrequency}
            color={colors.accent}
          />
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
          The Lorentz Force: Electricity Creates Motion
        </h2>

        <ExplanationBox
          whatHappens="When alternating current flows through the wire, it vibrates back and forth. The direction of movement reverses each time the current direction changes. This vibration pushes air molecules, creating sound waves you can hear."
          whyItHappens="The Lorentz Force (F = BIL) acts on any current-carrying wire in a magnetic field. B is the magnetic field strength, I is the current, and L is the wire length. When current alternates (AC), the force alternates too, causing oscillation."
          realWorldExample="Every speaker uses this principle! A coil of wire (voice coil) sits in a magnetic gap. Audio signals drive current through the coil, making it vibrate. The coil is attached to a cone that amplifies these vibrations into the sound you hear from your headphones, phone speakers, and concert PA systems."
        />

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: `${colors.warning}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.warning}40`
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: colors.warning, marginBottom: '8px' }}>
            ⚡ Safety Note
          </div>
          <div style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.5 }}>
            Keep currents low when experimenting. Never short audio outputs directly - always use appropriate resistance. The wire should be thin and light to move easily.
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
          What happens when you change the frequency?
        </h2>

        <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
          You've seen the wire vibrate. Now, what if we change the frequency of the audio signal from low (bass) to high (treble)?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'same', icon: '➡️', label: 'Same displacement, just faster', desc: 'Wire moves the same distance at any frequency' },
            { id: 'less', icon: '📉', label: 'Less displacement at higher frequencies', desc: 'Wire can\'t keep up with fast changes' },
            { id: 'more', icon: '📈', label: 'More displacement at higher frequencies', desc: 'Higher frequency means more energy' },
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
          FREQUENCY RESPONSE
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Sweep the frequency and watch how the wire's response changes
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
            <SpeakerVisualization />
          </div>

          <SliderControl
            label="Sweep Frequency"
            value={audioFrequency}
            min={20}
            max={2000}
            unit="Hz"
            hint="Notice: Real speakers have different responses at different frequencies. Subwoofers handle bass, tweeters handle treble."
            onChange={setAudioFrequency}
            color={colors.accent}
            showImpact={{
              current: audioFrequency < 200 ? 'Bass' : audioFrequency < 800 ? 'Midrange' : 'Treble',
              status: `${audioFrequency}Hz`
            }}
          />
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
          Why Speakers Need Different Drivers
        </h2>

        <ExplanationBox
          whatHappens="At higher frequencies, the wire vibrates faster but with smaller displacement. At lower frequencies, it moves larger distances but more slowly. Each speaker driver is optimized for a specific frequency range."
          whyItHappens="Mechanical inertia limits how quickly the wire can change direction. Heavy cones move well at low frequencies (woofers), while light diaphragms respond to high frequencies (tweeters). This is why quality speakers have multiple drivers."
          realWorldExample="A typical home speaker has a woofer (bass), midrange driver, and tweeter (treble). A crossover circuit sends different frequencies to each driver. Subwoofers are even larger and heavier for the deepest bass notes."
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
        title: 'Headphones & Earbuds',
        icon: '🎧',
        description: 'Tiny voice coils in miniature magnetic gaps. The same Lorentz force principle, just scaled down incredibly small.',
        insight: 'Premium headphones use neodymium magnets for stronger fields in less space.'
      },
      {
        title: 'Concert Speakers',
        icon: '🔊',
        description: 'Massive voice coils, huge magnets, and reinforced cones to move serious amounts of air.',
        insight: 'Large speakers can draw hundreds of watts and produce forces that shake buildings.'
      },
      {
        title: 'Electric Guitar Pickups',
        icon: '🎸',
        description: 'Works in reverse! String vibration near magnets induces current in coils.',
        insight: 'Same physics, opposite direction: motion → electricity instead of electricity → motion.'
      },
      {
        title: 'MRI Machines',
        icon: '🏥',
        description: 'The loud knocking sound in MRI comes from Lorentz forces on gradient coils.',
        insight: 'Powerful magnetic fields + rapid current changes = intense mechanical forces.'
      }
    ];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
            Step 8 of 10 • Real-World Applications
          </span>

          <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: colors.textPrimary, margin: '12px 0 24px' }}>
            The Lorentz Force is Everywhere
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
        question: 'What force causes a current-carrying wire to move in a magnetic field?',
        options: [
          { text: 'Gravitational force', correct: false },
          { text: 'Lorentz force', correct: true },
          { text: 'Centripetal force', correct: false },
          { text: 'Friction', correct: false }
        ]
      },
      {
        question: 'In the formula F = BIL, what does "B" represent?',
        options: [
          { text: 'Battery voltage', correct: false },
          { text: 'Magnetic field strength', correct: true },
          { text: 'Wire resistance', correct: false },
          { text: 'Current frequency', correct: false }
        ]
      },
      {
        question: 'Why does the wire vibrate when AC current flows through it?',
        options: [
          { text: 'Heat expansion', correct: false },
          { text: 'The current direction alternates', correct: true },
          { text: 'Gravity pulls it', correct: false },
          { text: 'The magnets vibrate', correct: false }
        ]
      },
      {
        question: 'What component in a speaker creates the magnetic field?',
        options: [
          { text: 'Voice coil', correct: false },
          { text: 'Permanent magnet', correct: true },
          { text: 'Speaker cone', correct: false },
          { text: 'Crossover', correct: false }
        ]
      },
      {
        question: 'Why do quality speakers have multiple drivers (woofer, tweeter)?',
        options: [
          { text: 'Looks better', correct: false },
          { text: 'Different sizes handle different frequencies better', correct: true },
          { text: 'More expensive', correct: false },
          { text: 'Louder volume', correct: false }
        ]
      },
      {
        question: 'What is the primary function of the voice coil in a speaker?',
        options: [
          { text: 'To amplify the audio signal', correct: false },
          { text: 'To create a permanent magnetic field', correct: false },
          { text: 'To carry current and interact with the magnetic field to produce motion', correct: true },
          { text: 'To filter out unwanted frequencies', correct: false }
        ]
      },
      {
        question: 'What happens to the Lorentz force when you increase both the current AND the magnetic field strength?',
        options: [
          { text: 'Force stays the same', correct: false },
          { text: 'Force decreases', correct: false },
          { text: 'Force increases significantly (multiplicative effect)', correct: true },
          { text: 'Force becomes unpredictable', correct: false }
        ]
      },
      {
        question: 'Why do subwoofers have larger, heavier cones than tweeters?',
        options: [
          { text: 'To look more impressive in home theaters', correct: false },
          { text: 'To move more air for low-frequency bass sounds', correct: true },
          { text: 'To handle higher electrical power', correct: false },
          { text: 'To reduce manufacturing costs', correct: false }
        ]
      },
      {
        question: 'What is the purpose of a crossover network in a speaker system?',
        options: [
          { text: 'To amplify all frequencies equally', correct: false },
          { text: 'To direct different frequency ranges to the appropriate drivers', correct: true },
          { text: 'To convert AC to DC current', correct: false },
          { text: 'To protect the speaker from overheating', correct: false }
        ]
      },
      {
        question: 'Why is impedance matching important between an amplifier and speaker?',
        options: [
          { text: 'To make the speaker louder regardless of quality', correct: false },
          { text: 'To ensure efficient power transfer and prevent damage', correct: true },
          { text: 'To change the frequency response of the speaker', correct: false },
          { text: 'To eliminate the need for a crossover', correct: false }
        ]
      }
    ];

    const currentQ = questions[currentQuestion];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>

          <h2 style={{
            fontSize: isMobile ? '20px' : '24px',
            color: colors.textPrimary,
            margin: '12px 0 24px'
          }}>
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
                  if (opt.correct) setTestScore(prev => prev + 1);
                  playSound(opt.correct ? 'success' : 'failure');
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
                    ? opt.correct ? `${colors.success}20` : `${colors.error}20`
                    : colors.bgSurface,
                  border: testAnswers[currentQuestion] === i
                    ? `2px solid ${opt.correct ? colors.success : colors.error}`
                    : `1px solid ${colors.bgElevated}`,
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: '15px',
                  textAlign: 'left',
                  cursor: testAnswers[currentQuestion] !== null ? 'default' : 'pointer',
                  position: 'relative',
                  zIndex: 10
                }}
              >
                {opt.text}
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
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉🔊</div>

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
        You now understand how the Lorentz force converts electrical signals into mechanical motion and sound. This principle powers every speaker and audio device in the world.
      </p>

      <div style={{
        padding: '20px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '8px' }}>Test Score</div>
        <div style={{ color: colors.success, fontSize: '36px', fontWeight: 700 }}>{testScore}/10</div>
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
      <div style={{
        height: '4px',
        backgroundColor: colors.bgElevated,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          backgroundColor: colors.primary,
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

export default SpeakerPrincipleRenderer;
