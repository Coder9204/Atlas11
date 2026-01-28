'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// LC RESONANCE TUNING GAME
// Core Concept: LC circuits resonate at specific frequencies, selecting signals
// Real-World Application: How radios tune to specific stations
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface LCResonanceRendererProps {
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

const LCResonanceRenderer: React.FC<LCResonanceRendererProps> = ({ onGameEvent }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [capacitance, setCapacitance] = useState(100); // pF (10-500)
  const [inductance, setInductance] = useState(250); // µH (50-500)
  const [inputFrequency, setInputFrequency] = useState(1000); // kHz (500-1700 AM band)
  const [showEnergyFlow, setShowEnergyFlow] = useState(true);

  // Radio stations (simulated AM band)
  const radioStations = useMemo(() => [
    { freq: 540, name: 'WXYZ News', genre: '📰' },
    { freq: 700, name: 'KABC Talk', genre: '🎙️' },
    { freq: 880, name: 'WCBS Sports', genre: '⚽' },
    { freq: 1010, name: 'WINS Music', genre: '🎵' },
    { freq: 1200, name: 'WOAI Country', genre: '🤠' },
    { freq: 1400, name: 'KFBK Classic', genre: '🎻' },
    { freq: 1600, name: 'KGBS Rock', genre: '🎸' },
  ], []);

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

  // Calculate resonant frequency: f = 1 / (2π√(LC))
  const resonantFrequency = useMemo(() => {
    const L = inductance * 1e-6; // Convert µH to H
    const C = capacitance * 1e-12; // Convert pF to F
    const f = 1 / (2 * Math.PI * Math.sqrt(L * C));
    return Math.round(f / 1000); // Return in kHz
  }, [inductance, capacitance]);

  // Calculate Q factor (quality factor) - assumed moderate Q for demonstration
  const qFactor = 50;

  // Response at current input frequency (resonance curve)
  const responseAtFrequency = useMemo(() => {
    const f = inputFrequency;
    const f0 = resonantFrequency;
    const bandwidth = f0 / qFactor;

    // Lorentzian resonance curve
    const response = 1 / (1 + Math.pow((f - f0) / (bandwidth / 2), 2));
    return Math.max(0, Math.min(100, response * 100));
  }, [inputFrequency, resonantFrequency, qFactor]);

  // Find closest station to current tuning
  const closestStation = useMemo(() => {
    let closest = radioStations[0];
    let minDiff = Math.abs(resonantFrequency - radioStations[0].freq);

    radioStations.forEach(station => {
      const diff = Math.abs(resonantFrequency - station.freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = station;
      }
    });

    // Only return if we're close enough (within ~30 kHz)
    return minDiff < 30 ? closest : null;
  }, [resonantFrequency, radioStations]);

  // Signal quality based on tuning accuracy
  const signalQuality = useMemo(() => {
    if (!closestStation) return 0;
    const diff = Math.abs(resonantFrequency - closestStation.freq);
    return Math.max(0, 100 - diff * 3);
  }, [resonantFrequency, closestStation]);

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
    capacitor: '#3b82f6',
    inductor: '#f97316',
    resonance: '#22c55e',
    energy: '#a855f7',
  };

  // Emit game events
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'lc_resonance',
      gameTitle: 'LC Resonance Tuning',
      details: { phase, capacitance, inductance, resonantFrequency, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, capacitance, inductance, resonantFrequency]);

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

  const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    hint: string;
    onChange: (v: number) => void;
    color?: string;
  }> = ({ label, value, min, max, unit, hint, onChange, color = colors.primary }) => {
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
          textTransform: 'uppercase'
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
              touchAction: 'none'
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
        backgroundColor: `${colors.energy}15`,
        borderLeft: `4px solid ${colors.energy}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.energy, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Happens (Energy Oscillation)
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
  // LC CIRCUIT VISUALIZATION
  // ============================================================================

  const LCVisualization: React.FC<{
    showLabels?: boolean;
    showResonanceCurve?: boolean;
    showEnergyAnimation?: boolean;
  }> = ({ showLabels = true, showResonanceCurve = true, showEnergyAnimation = true }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 380 : 450;
    const centerX = svgWidth / 2;

    // Animation state
    const [animPhase, setAnimPhase] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setAnimPhase(prev => (prev + 0.1) % (Math.PI * 2));
      }, 30);
      return () => clearInterval(interval);
    }, []);

    // Energy distribution (oscillates between C and L at resonance)
    const capacitorEnergy = Math.cos(animPhase * (resonantFrequency / 500)) ** 2;
    const inductorEnergy = Math.sin(animPhase * (resonantFrequency / 500)) ** 2;

    // Resonance curve points
    const resonanceCurvePoints = useMemo(() => {
      const points: string[] = [];
      const curveWidth = 200;
      const curveHeight = 80;
      const startX = centerX - curveWidth / 2;
      const baseY = 330;

      for (let i = 0; i <= 100; i++) {
        const freq = 500 + (i / 100) * 1200; // 500-1700 kHz
        const f0 = resonantFrequency;
        const bandwidth = f0 / qFactor;
        const response = 1 / (1 + Math.pow((freq - f0) / (bandwidth / 2), 2));
        const x = startX + (i / 100) * curveWidth;
        const y = baseY - response * curveHeight;
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    }, [resonantFrequency, qFactor, centerX]);

    // Current frequency marker position
    const freqMarkerX = centerX - 100 + ((inputFrequency - 500) / 1200) * 200;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, margin: '0 auto', display: 'block' }}
      >
        {/* === DEFINITIONS === */}
        <defs>
          {/* Capacitor plate gradient */}
          <linearGradient id="capacitorPlateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="30%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="70%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* Inductor coil gradient */}
          <linearGradient id="inductorCoilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="30%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="70%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* Energy glow */}
          <radialGradient id="energyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>

          {/* Electric field gradient */}
          <linearGradient id="electricFieldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* Magnetic field gradient */}
          <linearGradient id="magneticFieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>

          {/* Filters */}
          <filter id="lcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="componentShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* === BACKGROUND === */}
        <rect width={svgWidth} height={svgHeight} fill={colors.bgSurface} rx="12" />

        {/* Grid pattern */}
        <pattern id="lcGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.bgElevated} strokeWidth="0.5" opacity="0.4" />
        </pattern>
        <rect width={svgWidth} height={svgHeight} fill="url(#lcGrid)" rx="12" />

        {/* === LC CIRCUIT SCHEMATIC === */}
        <g transform="translate(0, 20)">
          {/* Circuit outline */}
          <rect
            x={centerX - 120}
            y={60}
            width={240}
            height={180}
            rx="8"
            fill="none"
            stroke={colors.bgElevated}
            strokeWidth="3"
          />

          {/* === CAPACITOR (C) === */}
          <g filter="url(#componentShadow)">
            {/* Capacitor plates */}
            <rect
              x={centerX - 100}
              y={90}
              width={60}
              height={8}
              rx="2"
              fill="url(#capacitorPlateGradient)"
            />
            <rect
              x={centerX - 100}
              y={115}
              width={60}
              height={8}
              rx="2"
              fill="url(#capacitorPlateGradient)"
            />

            {/* Electric field between plates (when charged) */}
            {showEnergyAnimation && capacitorEnergy > 0.1 && (
              <g opacity={capacitorEnergy}>
                {[0, 1, 2, 3].map(i => (
                  <line
                    key={i}
                    x1={centerX - 90 + i * 15}
                    y1={100}
                    x2={centerX - 90 + i * 15}
                    y2={113}
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeDasharray="3,2"
                  />
                ))}
                {/* Energy glow */}
                <ellipse
                  cx={centerX - 70}
                  cy={106}
                  rx={35}
                  ry={15}
                  fill="url(#electricFieldGradient)"
                  filter="url(#lcGlow)"
                />
              </g>
            )}

            {/* Capacitor label */}
            <text x={centerX - 70} y={145} textAnchor="middle" fill={colors.capacitor} fontSize="14" fontWeight="700">
              C
            </text>
            <text x={centerX - 70} y={160} textAnchor="middle" fill={colors.textMuted} fontSize="10">
              {capacitance} pF
            </text>
          </g>

          {/* === INDUCTOR (L) === */}
          <g filter="url(#componentShadow)">
            {/* Inductor coil (simplified representation) */}
            <path
              d={`M ${centerX + 40} 94
                  Q ${centerX + 55} 94, ${centerX + 55} 106
                  Q ${centerX + 55} 118, ${centerX + 70} 118
                  Q ${centerX + 85} 118, ${centerX + 85} 106
                  Q ${centerX + 85} 94, ${centerX + 100} 94`}
              fill="none"
              stroke="url(#inductorCoilGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Coil turns detail */}
            {[0, 1, 2].map(i => (
              <ellipse
                key={i}
                cx={centerX + 55 + i * 20}
                cy={106}
                rx={10}
                ry={15}
                fill="none"
                stroke={colors.inductor}
                strokeWidth="3"
              />
            ))}

            {/* Magnetic field (when current flows) */}
            {showEnergyAnimation && inductorEnergy > 0.1 && (
              <g opacity={inductorEnergy}>
                {[0, 1, 2].map(i => (
                  <ellipse
                    key={i}
                    cx={centerX + 70}
                    cy={106}
                    rx={25 + i * 10}
                    ry={30 + i * 8}
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity={0.6 - i * 0.15}
                  />
                ))}
              </g>
            )}

            {/* Inductor label */}
            <text x={centerX + 70} y={145} textAnchor="middle" fill={colors.inductor} fontSize="14" fontWeight="700">
              L
            </text>
            <text x={centerX + 70} y={160} textAnchor="middle" fill={colors.textMuted} fontSize="10">
              {inductance} µH
            </text>
          </g>

          {/* === CONNECTING WIRES === */}
          <g stroke={colors.textMuted} strokeWidth="3" fill="none">
            {/* Top wire */}
            <path d={`M ${centerX - 120} 60 L ${centerX - 120} 94 L ${centerX - 100} 94`} />
            <path d={`M ${centerX - 40} 94 L ${centerX + 40} 94`} />
            <path d={`M ${centerX + 100} 94 L ${centerX + 120} 94 L ${centerX + 120} 60`} />

            {/* Bottom wire */}
            <path d={`M ${centerX - 120} 240 L ${centerX - 120} 119 L ${centerX - 100} 119`} />
            <path d={`M ${centerX - 40} 119 L ${centerX + 40} 119`} />
            <path d={`M ${centerX + 100} 119 L ${centerX + 120} 119 L ${centerX + 120} 240`} />
          </g>

          {/* === CURRENT FLOW ANIMATION === */}
          {showEnergyAnimation && responseAtFrequency > 10 && (
            <g>
              {[0, 1, 2, 3].map(i => {
                const progress = ((animPhase * 2 + i * 0.8) % (Math.PI * 2)) / (Math.PI * 2);
                // Path around the circuit
                let x, y;
                if (progress < 0.25) {
                  // Top left to top right
                  x = centerX - 120 + progress * 4 * 240;
                  y = 60;
                } else if (progress < 0.5) {
                  // Top right down
                  x = centerX + 120;
                  y = 60 + (progress - 0.25) * 4 * 180;
                } else if (progress < 0.75) {
                  // Bottom right to left
                  x = centerX + 120 - (progress - 0.5) * 4 * 240;
                  y = 240;
                } else {
                  // Bottom left up
                  x = centerX - 120;
                  y = 240 - (progress - 0.75) * 4 * 180;
                }
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="5"
                    fill={colors.energy}
                    opacity={responseAtFrequency / 150}
                  >
                    <animate
                      attributeName="r"
                      values="5;7;5"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })}
            </g>
          )}

          {/* === ENERGY BARS === */}
          {showEnergyAnimation && (
            <g transform={`translate(${centerX - 130}, 180)`}>
              <rect x={0} y={0} width={60} height={50} rx="6" fill="rgba(15,23,42,0.9)" />
              <text x={30} y={14} textAnchor="middle" fill={colors.capacitor} fontSize="9" fontWeight="600">
                E (electric)
              </text>
              <rect x={8} y={20} width={44} height={8} rx="2" fill={colors.bgElevated} />
              <rect
                x={8}
                y={20}
                width={44 * capacitorEnergy}
                height={8}
                rx="2"
                fill={colors.capacitor}
              />
              <text x={30} y={42} textAnchor="middle" fill={colors.textMuted} fontSize="8">
                {Math.round(capacitorEnergy * 100)}%
              </text>
            </g>
          )}

          {showEnergyAnimation && (
            <g transform={`translate(${centerX + 70}, 180)`}>
              <rect x={0} y={0} width={60} height={50} rx="6" fill="rgba(15,23,42,0.9)" />
              <text x={30} y={14} textAnchor="middle" fill={colors.inductor} fontSize="9" fontWeight="600">
                E (magnetic)
              </text>
              <rect x={8} y={20} width={44} height={8} rx="2" fill={colors.bgElevated} />
              <rect
                x={8}
                y={20}
                width={44 * inductorEnergy}
                height={8}
                rx="2"
                fill={colors.inductor}
              />
              <text x={30} y={42} textAnchor="middle" fill={colors.textMuted} fontSize="8">
                {Math.round(inductorEnergy * 100)}%
              </text>
            </g>
          )}
        </g>

        {/* === RESONANCE CURVE === */}
        {showResonanceCurve && (
          <g transform="translate(0, 30)">
            {/* Background */}
            <rect
              x={centerX - 110}
              y={280}
              width={220}
              height={100}
              rx="8"
              fill="rgba(15,23,42,0.95)"
              stroke={colors.bgElevated}
              strokeWidth="1"
            />

            {/* Axis labels */}
            <text x={centerX} y={295} textAnchor="middle" fill={colors.textSecondary} fontSize="10" fontWeight="600">
              RESONANCE CURVE
            </text>

            {/* Frequency axis */}
            <line x1={centerX - 100} y1={360} x2={centerX + 100} y2={360} stroke={colors.textMuted} strokeWidth="1" />
            <text x={centerX - 95} y={375} fill={colors.textMuted} fontSize="8">500</text>
            <text x={centerX} y={375} textAnchor="middle" fill={colors.textMuted} fontSize="8">1100</text>
            <text x={centerX + 95} y={375} textAnchor="end" fill={colors.textMuted} fontSize="8">1700 kHz</text>

            {/* Response curve */}
            <polyline
              points={resonanceCurvePoints}
              fill="none"
              stroke={colors.resonance}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Resonant frequency marker */}
            <line
              x1={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
              y1={300}
              x2={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
              y2={360}
              stroke={colors.resonance}
              strokeWidth="2"
              strokeDasharray="4,4"
            />
            <circle
              cx={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
              cy={302}
              r="5"
              fill={colors.resonance}
            />

            {/* Resonant frequency label */}
            <text
              x={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
              y={295}
              textAnchor="middle"
              fill={colors.resonance}
              fontSize="10"
              fontWeight="700"
            >
              f₀ = {resonantFrequency} kHz
            </text>
          </g>
        )}

        {/* === INFO PANELS === */}

        {/* Resonant frequency - Top left */}
        {showLabels && (
          <g transform="translate(10, 10)">
            <rect x={0} y={0} width={100} height={55} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.resonance} strokeWidth="1" />
            <text x={50} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              RESONANCE
            </text>
            <text x={50} y={38} textAnchor="middle" fill={colors.resonance} fontSize="18" fontWeight="700">
              {resonantFrequency}
            </text>
            <text x={50} y={50} textAnchor="middle" fill={colors.textMuted} fontSize="9">
              kHz
            </text>
          </g>
        )}

        {/* Q Factor - Top right */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 85}, 10)`}>
            <rect x={0} y={0} width={75} height={55} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={37} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              Q FACTOR
            </text>
            <text x={37} y={38} textAnchor="middle" fill={colors.energy} fontSize="18" fontWeight="700">
              {qFactor}
            </text>
            <text x={37} y={50} textAnchor="middle" fill={colors.textMuted} fontSize="9">
              (selectivity)
            </text>
          </g>
        )}

        {/* Station tuned - Bottom center */}
        {showLabels && closestStation && signalQuality > 30 && (
          <g transform={`translate(${centerX - 70}, ${svgHeight - 45})`}>
            <rect x={0} y={0} width={140} height={35} rx="6" fill="rgba(34,197,94,0.15)" stroke={colors.success} strokeWidth="1" />
            <text x={70} y={15} textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="700">
              {closestStation.genre} {closestStation.name}
            </text>
            <text x={70} y={28} textAnchor="middle" fill={colors.textMuted} fontSize="10">
              {closestStation.freq} kHz • Signal: {Math.round(signalQuality)}%
            </text>
          </g>
        )}

        {/* Formula - Bottom left */}
        {showLabels && (
          <g transform={`translate(10, ${svgHeight - 40})`}>
            <rect x={0} y={0} width={110} height={30} rx="6" fill="rgba(168,85,247,0.15)" stroke={colors.energy} strokeWidth="1" />
            <text x={55} y={20} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">
              f = 1/(2π√LC)
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
        background: `${colors.resonance}20`,
        border: `1px solid ${colors.resonance}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.resonance, textTransform: 'uppercase' }}>
          Frequency Selection
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '40px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '20px',
        lineHeight: 1.2
      }}>
        Can a Circuit "Prefer"<br />One Frequency?
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        Radio waves from hundreds of stations fill the air right now. Your radio
        <strong style={{ color: colors.resonance }}> picks out just one</strong>.
        How does a simple circuit choose a single frequency like a musical note?
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: isMobile ? '260px' : '320px',
        marginBottom: '32px',
        backgroundColor: colors.bgSurface,
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <LCVisualization showLabels={false} showResonanceCurve={false} />
      </div>

      <Button onClick={goNext}>
        Discover Resonance →
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
          A coil and capacitor are connected together. What happens when we send different frequency signals through them?
        </h2>

        <div style={{
          padding: '16px',
          backgroundColor: colors.bgSurface,
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            An inductor (coil) and capacitor are connected in parallel. We sweep through different signal frequencies and measure the circuit's response.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'all_same', icon: '➡️', label: 'All frequencies pass equally', desc: 'The circuit treats all signals the same' },
            { id: 'one_peak', icon: '📊', label: 'One frequency gets a PEAK response', desc: 'The circuit "prefers" a specific frequency' },
            { id: 'blocks_all', icon: '🚫', label: 'It blocks all frequencies', desc: 'Coils and capacitors oppose current' },
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
          LC RESONANCE TUNER
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Adjust L and C to tune to different radio stations
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
            <LCVisualization />
          </div>

          {/* Radio stations display */}
          <div style={{
            padding: '12px',
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
              AM RADIO BAND • Tune to a station:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {radioStations.map(station => {
                const isNear = Math.abs(resonantFrequency - station.freq) < 40;
                const isTuned = Math.abs(resonantFrequency - station.freq) < 15;
                return (
                  <div
                    key={station.freq}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isTuned ? `${colors.success}20` : isNear ? `${colors.warning}15` : colors.bgElevated,
                      borderRadius: '8px',
                      border: `1px solid ${isTuned ? colors.success : isNear ? colors.warning : 'transparent'}`,
                      textAlign: 'center',
                      minWidth: '80px'
                    }}
                  >
                    <div style={{ fontSize: '16px' }}>{station.genre}</div>
                    <div style={{ fontSize: '11px', color: colors.textPrimary, fontWeight: 600 }}>{station.freq}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>{station.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px'
          }}>
            <SliderControl
              label="Capacitance (C)"
              value={capacitance}
              min={10}
              max={500}
              unit="pF"
              hint="Larger C = lower resonant frequency"
              onChange={setCapacitance}
              color={colors.capacitor}
            />
            <SliderControl
              label="Inductance (L)"
              value={inductance}
              min={50}
              max={500}
              unit="µH"
              hint="Larger L = lower resonant frequency"
              onChange={setInductance}
              color={colors.inductor}
            />
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
          Resonance: Energy Sloshing Back and Forth
        </h2>

        <ExplanationBox
          whatHappens="At one specific frequency, the circuit gives a peak response. This resonant frequency depends on the values of L and C: f₀ = 1/(2π√LC). At resonance, the circuit amplifies that frequency while rejecting others."
          whyItHappens="Energy oscillates between two forms: electric field energy stored in the capacitor, and magnetic field energy stored in the inductor. Like a swing at its natural frequency, the energy transfer is most efficient at resonance. At other frequencies, the timing is wrong and energy cancels out."
          realWorldExample="Every AM/FM radio uses an LC circuit to tune stations. The old-style tuning dial physically adjusts a variable capacitor, changing the resonant frequency. Digital radios use electronic varactors (voltage-controlled capacitors) to tune instantly."
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
            Keep voltages tiny when experimenting with LC circuits. At resonance, voltages can be amplified by the Q factor! Never connect to mains power.
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
          What happens if we DOUBLE the capacitance?
        </h2>

        <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
          Currently tuned to {resonantFrequency} kHz. If we replace the capacitor with one twice as large, what happens to the resonant frequency?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'double', icon: '📈', label: 'Frequency DOUBLES', desc: 'More capacitance = faster oscillation' },
            { id: 'half', icon: '📉', label: 'Frequency drops to about 70%', desc: 'Larger C means lower frequency' },
            { id: 'same', icon: '➡️', label: 'Frequency stays the same', desc: 'Only L affects frequency' },
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
          FREQUENCY vs L and C
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Watch how changing L or C shifts the resonant frequency
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
            <LCVisualization />
          </div>

          {/* Big frequency display */}
          <div style={{
            padding: '20px',
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px' }}>
              RESONANT FREQUENCY
            </div>
            <div style={{ fontSize: '48px', fontWeight: 700, color: colors.resonance }}>
              {resonantFrequency} kHz
            </div>
            <div style={{ fontSize: '14px', color: colors.textMuted, marginTop: '8px' }}>
              f₀ = 1 / (2π × √({inductance}µH × {capacitance}pF))
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px'
          }}>
            <SliderControl
              label="Capacitance (C)"
              value={capacitance}
              min={10}
              max={500}
              unit="pF"
              hint="Try doubling it! Watch the frequency change."
              onChange={setCapacitance}
              color={colors.capacitor}
            />
            <SliderControl
              label="Inductance (L)"
              value={inductance}
              min={50}
              max={500}
              unit="µH"
              hint="Larger L also lowers the frequency."
              onChange={setInductance}
              color={colors.inductor}
            />
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
          The Square Root Relationship
        </h2>

        <ExplanationBox
          whatHappens="Doubling C doesn't halve the frequency - it only reduces it to about 71% (1/√2). The formula f = 1/(2π√LC) shows that frequency depends on the SQUARE ROOT of L×C."
          whyItHappens="Think of it like a spring and mass: adding mass doesn't double the oscillation period. The relationship is non-linear because energy storage grows with the square of voltage (capacitor) and current (inductor)."
          realWorldExample="Radio engineers use this relationship to design tuning ranges. A 10:1 variable capacitor only gives a √10 ≈ 3.2:1 frequency range. To cover the full AM band (530-1700 kHz), you need both variable C and switchable L values."
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
        title: 'Radio & TV Tuners',
        icon: '📻',
        description: 'Every radio receiver uses LC resonance to select one station from the electromagnetic soup. Digital tuners use varactor diodes instead of mechanical capacitors.',
        insight: 'FM radios use the same principle at higher frequencies (88-108 MHz).'
      },
      {
        title: 'Wireless Charging',
        icon: '🔋',
        description: 'The charger and phone coils form a resonant system. Operating at the resonant frequency maximizes energy transfer efficiency.',
        insight: 'Qi chargers typically resonate around 100-200 kHz.'
      },
      {
        title: 'MRI Machines',
        icon: '🏥',
        description: 'The RF coils that detect signals from your body are precisely tuned LC circuits, resonating at the Larmor frequency of hydrogen atoms.',
        insight: 'At 3 Tesla, this is about 128 MHz - right in the FM radio band!'
      },
      {
        title: 'Guitar Pickups & Tone',
        icon: '🎸',
        description: 'The pickup coil and cable capacitance form an LC circuit. The resonance peak affects which frequencies sound brightest.',
        insight: 'This is why cable length and "tone" knobs change guitar sound.'
      }
    ];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
            Step 8 of 10 • Real-World Applications
          </span>

          <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: colors.textPrimary, margin: '12px 0 24px' }}>
            LC Resonance is Everywhere
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
        question: 'What determines the resonant frequency of an LC circuit?',
        options: ['Voltage applied', 'Values of L and C', 'Wire thickness', 'Temperature'],
        correct: 1
      },
      {
        question: 'At resonance, energy oscillates between:',
        options: ['Heat and light', 'Electric field (C) and magnetic field (L)', 'Voltage and current', 'Input and output'],
        correct: 1
      },
      {
        question: 'If you double the capacitance, the resonant frequency:',
        options: ['Doubles', 'Halves', 'Decreases by about 30%', 'Stays the same'],
        correct: 2
      },
      {
        question: 'Why can a radio "pick" one station from many?',
        options: ['Magic', 'LC circuit resonates at one frequency', 'Antenna size', 'Speaker quality'],
        correct: 1
      },
      {
        question: 'What is the Q factor of an LC circuit?',
        options: ['Quality of components', 'How selective/sharp the resonance peak is', 'Charge stored', 'Frequency range'],
        correct: 1
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
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉📻</div>

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
        You now understand how LC circuits select specific frequencies through resonance. This elegant principle enables radio communication, wireless charging, and countless other technologies!
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
          backgroundColor: colors.resonance,
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

export default LCResonanceRenderer;
