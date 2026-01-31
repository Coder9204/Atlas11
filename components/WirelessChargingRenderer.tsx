'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// WIRELESS CHARGING ALIGNMENT GAME
// Core Concept: Inductive coupling depends on coil overlap and distance
// Real-World Application: Why phone position on wireless charger matters
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface WirelessChargingRendererProps {
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

const WirelessChargingRenderer: React.FC<WirelessChargingRendererProps> = ({ onGameEvent }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [phoneOffsetX, setPhoneOffsetX] = useState(0); // -50 to 50 mm
  const [phoneOffsetY, setPhoneOffsetY] = useState(0); // -50 to 50 mm
  const [gapDistance, setGapDistance] = useState(3); // 3mm to 20mm (case thickness)
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Transfer state
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);
  const [activeApp, setActiveApp] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const isNavigating = useRef(false);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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

  // Calculate coupling efficiency based on position and distance
  const couplingEfficiency = useMemo(() => {
    // Coil overlap calculation (simplified gaussian model)
    // Coil radius ~25mm, coupling drops with offset squared
    const coilRadius = 25; // mm
    const offset = Math.sqrt(phoneOffsetX ** 2 + phoneOffsetY ** 2);

    // Overlap factor: 1 at center, drops off with offset
    const overlapFactor = Math.exp(-(offset ** 2) / (2 * (coilRadius * 0.8) ** 2));

    // Distance factor: coupling drops with distance cubed (near-field)
    // Optimal distance ~3mm, drops rapidly beyond
    const optimalDistance = 3;
    const distanceFactor = Math.pow(optimalDistance / Math.max(gapDistance, optimalDistance), 2.5);

    // Combined efficiency
    const efficiency = overlapFactor * distanceFactor * 100;
    return Math.max(0, Math.min(100, Math.round(efficiency)));
  }, [phoneOffsetX, phoneOffsetY, gapDistance]);

  // Charging power based on efficiency
  const chargingPower = useMemo(() => {
    // 15W max for Qi standard
    const maxPower = 15;
    const power = (couplingEfficiency / 100) * maxPower;
    return Math.round(power * 10) / 10;
  }, [couplingEfficiency]);

  // Estimated charge time
  const chargeTime = useMemo(() => {
    if (chargingPower < 1) return '∞';
    // 4000mAh battery, ~15Wh
    const batteryWh = 15;
    const hours = batteryWh / chargingPower;
    if (hours > 10) return '>10h';
    return `${hours.toFixed(1)}h`;
  }, [chargingPower]);

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
    accent: '#8b5cf6',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
    charging: '#22c55e',
    coilTx: '#3b82f6',
    coilRx: '#f97316',
  };

  // Phase labels
  const phaseLabels: Record<Phase, string> = {
    hook: '🔌 Hook',
    predict: '🤔 Predict',
    play: '🎮 Explore',
    review: '📖 Review',
    twist_predict: '🌀 Twist Predict',
    twist_play: '🎮 Twist Explore',
    twist_review: '📖 Twist Review',
    transfer: '🌍 Real World',
    test: '📝 Test',
    mastery: '🏆 Mastery'
  };

  // Emit game events for AI coach
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'wireless_charging',
      gameTitle: 'Wireless Charging Alignment',
      details: { phase, couplingEfficiency, phoneOffsetX, phoneOffsetY, gapDistance, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, couplingEfficiency, phoneOffsetX, phoneOffsetY, gapDistance]);

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

  // Reset test state when entering test phase
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestScore(0);
      setTestAnswers(Array(10).fill(null));
      setShowExplanation(false);
    }
  }, [phase]);

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

  // Enhanced Slider with all UX requirements
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
        {/* LABEL */}
        <div style={{
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          🎚️ {label}
        </div>

        {/* CURRENT VALUE */}
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

        {/* IMPACT DISPLAY */}
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

        {/* SLIDER - 48px touch target */}
        <div style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            onInput={(e) => onChange(parseInt((e.target as HTMLInputElement).value))}
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

        {/* RANGE LABELS */}
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

        {/* HINT */}
        <div style={{
          fontSize: isMobile ? '12px' : '13px',
          color: colors.textSecondary,
          marginTop: '10px',
          padding: '10px 12px',
          backgroundColor: `${color}10`,
          borderRadius: '8px',
          borderLeft: `3px solid ${color}`
        }}>
          💡 <strong>What happens:</strong> {hint}
        </div>
      </div>
    );
  };

  // Explanation box
  const ExplanationBox: React.FC<{
    whatHappens: string;
    whyItHappens: string;
    realWorldExample: string;
  }> = ({ whatHappens, whyItHappens, realWorldExample }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '10px' : '14px'
    }}>
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
        backgroundColor: `${colors.accent}15`,
        borderLeft: `4px solid ${colors.accent}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.accent, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Happens
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
          🌍 Real-World Example
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {realWorldExample}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // WIRELESS CHARGING VISUALIZATION (ENHANCED)
  // Realistic graphics with proper materials, coils, and magnetic field effects
  // ============================================================================

  const ChargingVisualization: React.FC<{
    showHeatmap?: boolean;
    showDistanceEffect?: boolean;
  }> = ({ showHeatmap = false, showDistanceEffect = false }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 320 : 400;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const padRadius = isMobile ? 80 : 100;
    const phoneWidth = isMobile ? 55 : 68;
    const phoneHeight = isMobile ? 100 : 125;

    // Phone position (scaled from mm to pixels)
    const scale = padRadius / 50;
    const phoneX = centerX + phoneOffsetX * scale - phoneWidth / 2;
    const phoneY = centerY + phoneOffsetY * scale - phoneHeight / 2;

    // Coupling color with smooth transitions
    const getCouplingColor = (efficiency: number) => {
      if (efficiency > 80) return colors.success;
      if (efficiency > 50) return colors.warning;
      if (efficiency > 20) return colors.error;
      return colors.textMuted;
    };

    // Generate heatmap with improved gradient
    const heatmapPoints = useMemo(() => {
      if (!showHeatmap) return [];
      const points: { x: number; y: number; efficiency: number }[] = [];
      const step = isMobile ? 18 : 14;
      for (let x = -50; x <= 50; x += step) {
        for (let y = -50; y <= 50; y += step) {
          const offset = Math.sqrt(x ** 2 + y ** 2);
          const overlapFactor = Math.exp(-(offset ** 2) / (2 * (25 * 0.8) ** 2));
          const distanceFactor = Math.pow(3 / Math.max(gapDistance, 3), 2.5);
          const eff = overlapFactor * distanceFactor * 100;
          points.push({ x: centerX + x * scale, y: centerY + y * scale, efficiency: Math.min(100, eff) });
        }
      }
      return points;
    }, [showHeatmap, gapDistance, centerX, centerY, scale]);

    // Magnetic field animation
    const [fieldPhase, setFieldPhase] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setFieldPhase(prev => (prev + 1) % 60);
      }, 50);
      return () => clearInterval(interval);
    }, []);

    // Energy particle animation
    const [energyPhase, setEnergyPhase] = useState(0);
    useEffect(() => {
      if (couplingEfficiency > 20) {
        const interval = setInterval(() => {
          setEnergyPhase(prev => (prev + 3) % 100);
        }, 30);
        return () => clearInterval(interval);
      }
    }, [couplingEfficiency]);

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxHeight: isMobile ? '320px' : '400px' }}
      >
        {/* === DEFINITIONS === */}
        <defs>
          {/* Charging pad surface gradient (premium matte finish) */}
          <radialGradient id="padSurfaceGradient" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* Pad edge highlight */}
          <linearGradient id="padEdgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Rubber grip ring */}
          <radialGradient id="rubberRingGradient" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="#1e293b" />
            <stop offset="95%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Copper coil gradient */}
          <linearGradient id="copperCoilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="30%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#fdba74" />
            <stop offset="70%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          {/* Phone frame gradient (aluminum) */}
          <linearGradient id="phoneFrameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="25%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Phone screen gradient (glass reflection) */}
          <linearGradient id="phoneScreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="10%" stopColor="#0f172a" />
            <stop offset="90%" stopColor="#020617" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Screen reflection */}
          <linearGradient id="screenReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Energy beam gradient */}
          <linearGradient id="energyBeamGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.coilTx} stopOpacity="0.9" />
            <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor={colors.coilRx} stopOpacity="0.8" />
          </linearGradient>

          {/* Magnetic field glow */}
          <radialGradient id="magneticGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>

          {/* Charging indicator glow */}
          <radialGradient id="chargingGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="1" />
            <stop offset="50%" stopColor={colors.success} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0" />
          </radialGradient>

          {/* Filters */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="padShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.5" />
          </filter>

          <filter id="phoneShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="3" dy="5" stdDeviation="8" floodOpacity="0.4" />
          </filter>

          {/* Heatmap gradient */}
          <radialGradient id="heatmapHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.2" />
          </radialGradient>
          <radialGradient id="heatmapMedium" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.warning} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colors.warning} stopOpacity="0.15" />
          </radialGradient>
          <radialGradient id="heatmapCold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.error} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.error} stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* === BACKGROUND === */}
        <rect width={svgWidth} height={svgHeight} fill={colors.bgDeep} rx="12" />

        {/* Subtle surface texture */}
        <pattern id="surfaceTexture" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={colors.bgDeep} />
          <circle cx="2" cy="2" r="0.5" fill="rgba(255,255,255,0.02)" />
        </pattern>
        <rect width={svgWidth} height={svgHeight} fill="url(#surfaceTexture)" rx="12" />

        {/* === HEATMAP (when enabled) === */}
        {showHeatmap && heatmapPoints.map((point, i) => {
          const gradientId = point.efficiency > 70 ? 'heatmapHot' : point.efficiency > 30 ? 'heatmapMedium' : 'heatmapCold';
          return (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={isMobile ? 14 : 18}
              fill={`url(#${gradientId})`}
              opacity={0.4 + (point.efficiency / 100) * 0.5}
            />
          );
        })}

        {/* === CHARGING PAD === */}
        <g filter="url(#padShadow)">
          {/* Outer rubber grip ring */}
          <circle cx={centerX} cy={centerY} r={padRadius + 8} fill="url(#rubberRingGradient)" />

          {/* Main pad body */}
          <circle cx={centerX} cy={centerY} r={padRadius} fill="url(#padSurfaceGradient)" />

          {/* Edge highlight (3D effect) */}
          <circle cx={centerX} cy={centerY} r={padRadius} fill="none" stroke="url(#padEdgeGradient)" strokeWidth="3" />

          {/* Inner decorative ring */}
          <circle cx={centerX} cy={centerY} r={padRadius * 0.85} fill="none" stroke="#334155" strokeWidth="1" opacity="0.6" />

          {/* Status LED ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={padRadius * 0.78}
            fill="none"
            stroke={couplingEfficiency > 50 ? colors.success : couplingEfficiency > 20 ? colors.warning : '#334155'}
            strokeWidth="2"
            opacity={couplingEfficiency > 10 ? 0.8 : 0.3}
          >
            {couplingEfficiency > 50 && (
              <animate attributeName="opacity" values="0.8;0.5;0.8" dur="2s" repeatCount="indefinite" />
            )}
          </circle>

          {/* Transmitter coil (copper windings) */}
          <circle
            cx={centerX}
            cy={centerY}
            r={padRadius * 0.6}
            fill="none"
            stroke="url(#copperCoilGradient)"
            strokeWidth={isMobile ? 5 : 6}
            strokeDasharray="12,4"
            opacity="0.9"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={padRadius * 0.48}
            fill="none"
            stroke="url(#copperCoilGradient)"
            strokeWidth={isMobile ? 4 : 5}
            strokeDasharray="10,5"
            opacity="0.7"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={padRadius * 0.36}
            fill="none"
            stroke="url(#copperCoilGradient)"
            strokeWidth={isMobile ? 3 : 4}
            strokeDasharray="8,6"
            opacity="0.5"
          />

          {/* Center Qi logo area */}
          <circle cx={centerX} cy={centerY} r={padRadius * 0.2} fill="#1e293b" />
          <text x={centerX} y={centerY + 4} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">
            Qi
          </text>
        </g>

        {/* === MAGNETIC FIELD VISUALIZATION === */}
        {couplingEfficiency > 10 && (
          <g opacity={couplingEfficiency / 120}>
            {/* Expanding field rings */}
            {[0, 1, 2, 3].map(i => {
              const baseRadius = padRadius * 0.25;
              const maxRadius = padRadius * 0.75;
              const animRadius = baseRadius + ((fieldPhase + i * 15) % 50) * ((maxRadius - baseRadius) / 50);
              const animOpacity = Math.max(0, 1 - (animRadius - baseRadius) / (maxRadius - baseRadius));

              return (
                <circle
                  key={i}
                  cx={centerX}
                  cy={centerY}
                  r={animRadius}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  opacity={animOpacity * 0.6 * (couplingEfficiency / 100)}
                  strokeDasharray="6,6"
                />
              );
            })}

            {/* Magnetic field glow */}
            <circle
              cx={centerX}
              cy={centerY}
              r={padRadius * 0.5}
              fill="url(#magneticGlow)"
              opacity={0.4 * (couplingEfficiency / 100)}
            />
          </g>
        )}

        {/* === ENERGY TRANSFER BEAM === */}
        {couplingEfficiency > 15 && (
          <g filter="url(#softGlow)">
            {/* Main energy beam */}
            <line
              x1={centerX}
              y1={centerY}
              x2={phoneX + phoneWidth / 2}
              y2={phoneY + phoneHeight / 2}
              stroke="url(#energyBeamGradient)"
              strokeWidth={Math.max(3, couplingEfficiency / 8)}
              opacity={0.6 * (couplingEfficiency / 100)}
              strokeLinecap="round"
            />

            {/* Energy particles */}
            {[0, 1, 2].map(i => {
              const progress = ((energyPhase + i * 33) % 100) / 100;
              const particleX = centerX + (phoneX + phoneWidth / 2 - centerX) * progress;
              const particleY = centerY + (phoneY + phoneHeight / 2 - centerY) * progress;
              return (
                <circle
                  key={i}
                  cx={particleX}
                  cy={particleY}
                  r={4 - progress * 2}
                  fill="#a855f7"
                  opacity={(1 - progress) * 0.8 * (couplingEfficiency / 100)}
                />
              );
            })}
          </g>
        )}

        {/* === PHONE === */}
        <g transform={`translate(${phoneX}, ${phoneY})`} filter="url(#phoneShadow)">
          {/* Phone body (aluminum frame) */}
          <rect
            width={phoneWidth}
            height={phoneHeight}
            rx="10"
            fill="url(#phoneFrameGradient)"
          />

          {/* Frame highlight (top-left) */}
          <rect
            x="1"
            y="1"
            width={phoneWidth - 2}
            height={phoneHeight - 2}
            rx="9"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Screen bezel */}
          <rect
            x="3"
            y="6"
            width={phoneWidth - 6}
            height={phoneHeight - 12}
            rx="6"
            fill="#0f172a"
          />

          {/* Screen display */}
          <rect
            x="4"
            y="7"
            width={phoneWidth - 8}
            height={phoneHeight - 14}
            rx="5"
            fill="url(#phoneScreenGradient)"
          />

          {/* Screen reflection */}
          <rect
            x="4"
            y="7"
            width={phoneWidth - 8}
            height={phoneHeight - 14}
            rx="5"
            fill="url(#screenReflection)"
          />

          {/* Notch/Dynamic Island */}
          <rect
            x={phoneWidth / 2 - 12}
            y="9"
            width="24"
            height="6"
            rx="3"
            fill="#020617"
          />

          {/* Receiver coil (visible through back) */}
          <circle
            cx={phoneWidth / 2}
            cy={phoneHeight / 2}
            r={phoneWidth * 0.32}
            fill="none"
            stroke={colors.coilRx}
            strokeWidth={isMobile ? 4 : 5}
            strokeDasharray="8,4"
            opacity="0.75"
          />
          <circle
            cx={phoneWidth / 2}
            cy={phoneHeight / 2}
            r={phoneWidth * 0.22}
            fill="none"
            stroke={colors.coilRx}
            strokeWidth={isMobile ? 3 : 4}
            strokeDasharray="6,5"
            opacity="0.55"
          />

          {/* Charging indicator on screen */}
          {couplingEfficiency > 15 && (
            <g>
              {/* Battery icon */}
              <rect
                x={phoneWidth / 2 - 12}
                y={phoneHeight / 2 - 18}
                width="24"
                height="36"
                rx="4"
                fill="none"
                stroke={colors.success}
                strokeWidth="2"
              />
              <rect
                x={phoneWidth / 2 - 4}
                y={phoneHeight / 2 - 22}
                width="8"
                height="4"
                rx="1"
                fill={colors.success}
              />

              {/* Battery fill level */}
              <rect
                x={phoneWidth / 2 - 9}
                y={phoneHeight / 2 + 14 - (couplingEfficiency / 100) * 28}
                width="18"
                height={(couplingEfficiency / 100) * 28}
                rx="2"
                fill={colors.success}
                opacity="0.9"
              >
                <animate attributeName="opacity" values="0.9;0.6;0.9" dur="1.5s" repeatCount="indefinite" />
              </rect>

              {/* Lightning bolt */}
              <path
                d={`M${phoneWidth / 2 - 4} ${phoneHeight / 2 - 6} L${phoneWidth / 2 + 2} ${phoneHeight / 2 - 6} L${phoneWidth / 2 - 1} ${phoneHeight / 2 + 2} L${phoneWidth / 2 + 4} ${phoneHeight / 2 + 2} L${phoneWidth / 2 - 4} ${phoneHeight / 2 + 12} L${phoneWidth / 2} ${phoneHeight / 2 + 2} L${phoneWidth / 2 - 4} ${phoneHeight / 2 + 2} Z`}
                fill="#fbbf24"
                opacity="0.9"
              >
                <animate attributeName="opacity" values="0.9;0.5;0.9" dur="0.8s" repeatCount="indefinite" />
              </path>

              {/* Percentage text */}
              <text
                x={phoneWidth / 2}
                y={phoneHeight - 18}
                textAnchor="middle"
                fill={colors.success}
                fontSize="10"
                fontWeight="700"
              >
                {couplingEfficiency}%
              </text>
            </g>
          )}

          {/* Charging border glow */}
          {couplingEfficiency > 50 && (
            <rect
              width={phoneWidth}
              height={phoneHeight}
              rx="10"
              fill="none"
              stroke={colors.success}
              strokeWidth="2"
              opacity="0.6"
            >
              <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1.5s" repeatCount="indefinite" />
            </rect>
          )}
        </g>

        {/* === DISTANCE INDICATOR (Twist Phase) === */}
        {showDistanceEffect && (
          <g transform={`translate(${svgWidth - 80}, ${centerY - 60})`}>
            <rect x={0} y={0} width="70" height="120" rx="8" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />

            <text x="35" y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="10" fontWeight="600">
              GAP
            </text>

            {/* Visual gap representation */}
            <rect x="15" y="30" width="40" height="50" rx="4" fill={colors.bgElevated} />

            {/* Charger surface */}
            <rect x="15" y="75" width="40" height="8" rx="2" fill={colors.coilTx} opacity="0.8" />

            {/* Gap spacing */}
            <rect
              x="15"
              y={75 - Math.min(gapDistance * 2, 40)}
              width="40"
              height={Math.min(gapDistance * 2, 40)}
              rx="0"
              fill={gapDistance > 10 ? colors.error : gapDistance > 5 ? colors.warning : colors.success}
              opacity="0.4"
            />

            {/* Phone surface */}
            <rect x="15" y={73 - Math.min(gapDistance * 2, 40)} width="40" height="4" rx="2" fill={colors.coilRx} opacity="0.8" />

            <text x="35" y="100" textAnchor="middle" fill={gapDistance > 10 ? colors.error : gapDistance > 5 ? colors.warning : colors.success} fontSize="14" fontWeight="700">
              {gapDistance}mm
            </text>

            <text x="35" y="112" textAnchor="middle" fill={colors.textMuted} fontSize="8">
              {gapDistance <= 5 ? 'Optimal' : gapDistance <= 10 ? 'Acceptable' : 'Too far'}
            </text>
          </g>
        )}

        {/* === INFO PANELS (Labels in corners) === */}

        {/* Coupling Efficiency - Bottom Left */}
        <g transform={`translate(10, ${svgHeight - 65})`}>
          <rect x={0} y={0} width={95} height={55} rx="8" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
          <text x="47" y="16" textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600" letterSpacing="0.5">
            COUPLING
          </text>

          {/* Efficiency arc meter */}
          <path
            d={`M 20 42 A 27 27 0 0 1 74 42`}
            fill="none"
            stroke={colors.bgElevated}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={`M 20 42 A 27 27 0 0 1 ${20 + 54 * (couplingEfficiency / 100)} ${42 - 27 * Math.sin(Math.acos(1 - 2 * couplingEfficiency / 100))}`}
            fill="none"
            stroke={getCouplingColor(couplingEfficiency)}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text x="47" y="48" textAnchor="middle" fill={getCouplingColor(couplingEfficiency)} fontSize="16" fontWeight="700">
            {couplingEfficiency}%
          </text>
        </g>

        {/* Power Output - Bottom Center */}
        <g transform={`translate(${centerX - 45}, ${svgHeight - 65})`}>
          <rect x={0} y={0} width={90} height={55} rx="8" fill="rgba(15,23,42,0.95)" stroke={getCouplingColor(couplingEfficiency)} strokeWidth="1" />
          <text x="45" y="16" textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600" letterSpacing="0.5">
            POWER
          </text>
          <text x="45" y="40" textAnchor="middle" fill={getCouplingColor(couplingEfficiency)} fontSize="20" fontWeight="700">
            {chargingPower}W
          </text>
          <text x="45" y="52" textAnchor="middle" fill={colors.textMuted} fontSize="8">
            of 15W max
          </text>
        </g>

        {/* Charge Time - Bottom Right */}
        <g transform={`translate(${svgWidth - 105}, ${svgHeight - 65})`}>
          <rect x={0} y={0} width={95} height={55} rx="8" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
          <text x="47" y="16" textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600" letterSpacing="0.5">
            EST. TIME
          </text>
          <text x="47" y="40" textAnchor="middle" fill={colors.textPrimary} fontSize="18" fontWeight="700">
            {chargeTime}
          </text>
          <text x="47" y="52" textAnchor="middle" fill={colors.textMuted} fontSize="8">
            to full charge
          </text>
        </g>

        {/* Legend - Top Left */}
        <g transform="translate(10, 10)">
          <rect x={0} y={0} width={100} height={40} rx="6" fill="rgba(15,23,42,0.9)" />
          <circle cx="12" cy="14" r="5" fill={colors.coilTx} />
          <text x="22" y="18" fill={colors.textSecondary} fontSize="9">Tx Coil</text>
          <circle cx="60" cy="14" r="5" fill={colors.coilRx} />
          <text x="70" y="18" fill={colors.textSecondary} fontSize="9">Rx Coil</text>
          <circle cx="12" cy="30" r="5" fill="#8b5cf6" />
          <text x="22" y="34" fill={colors.textSecondary} fontSize="9">Magnetic Field</text>
        </g>

        {/* Position Offset (when off-center) */}
        {Math.sqrt(phoneOffsetX ** 2 + phoneOffsetY ** 2) > 8 && (
          <g transform={`translate(${svgWidth - 90}, 10)`}>
            <rect x={0} y={0} width={80} height={35} rx="6" fill="rgba(239,68,68,0.15)" stroke={colors.error} strokeWidth="1" />
            <text x="40" y="14" textAnchor="middle" fill={colors.error} fontSize="9" fontWeight="600">
              OFF-CENTER
            </text>
            <text x="40" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="10" fontWeight="700">
              {Math.round(Math.sqrt(phoneOffsetX ** 2 + phoneOffsetY ** 2))}mm
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
        fontSize: isMobile ? '60px' : '80px',
        marginBottom: '24px'
      }}>
        🔋⚡📱
      </div>
      <h1 style={{
        fontSize: isMobile ? '24px' : '36px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '16px',
        lineHeight: 1.3
      }}>
        Why does wireless charging fail<br />if you're off-center?
      </h1>
      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        lineHeight: 1.6,
        marginBottom: '32px'
      }}>
        You've probably noticed: place your phone slightly wrong on a wireless charger, and it either charges slowly or not at all. Let's discover the invisible geometry that makes this happen.
      </p>
      <div style={{
        padding: '16px 24px',
        backgroundColor: `${colors.accent}20`,
        borderRadius: '12px',
        marginBottom: '32px'
      }}>
        <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
          ✨ "The magic of wireless charging hides an engineering challenge: <strong>invisible coil alignment</strong>"
        </p>
      </div>
      <Button onClick={goNext}>
        Let's Find Out →
      </Button>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: isMobile ? '20px' : '40px'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, marginBottom: '8px' }}>
          Step 2 of 10 • Make Your Prediction
        </span>
        <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: colors.textPrimary, marginBottom: '24px', lineHeight: 1.3 }}>
          What happens when you place your phone off-center on a wireless charger?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'same', icon: '🔋', text: 'It charges at the same speed regardless of position' },
            { id: 'slower', icon: '🐌', text: 'Charging slows down or stops completely' },
            { id: 'hotter', icon: '🔥', text: 'Phone gets hotter but charges faster' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '20px',
                background: prediction === opt.id ? `${colors.primary}20` : colors.bgSurface,
                border: `2px solid ${prediction === opt.id ? colors.primary : colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '48px'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <span style={{ color: colors.textPrimary, fontSize: '15px', textAlign: 'left' }}>{opt.text}</span>
              {prediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.primary, fontSize: '20px' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={goBack}>← Back</Button>
        <Button onClick={goNext} disabled={!prediction}>
          Test My Prediction →
        </Button>
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* HEADER - Large, clear title with scenario explanation */}
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, letterSpacing: '0.5px' }}>
          Step 3 of 10 • Interactive Experiment
        </span>
        <h1 style={{
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: colors.textPrimary,
          margin: '8px 0 4px',
          lineHeight: 1.2
        }}>
          WIRELESS CHARGING ALIGNMENT
        </h1>
        <p style={{
          fontSize: isMobile ? '14px' : '16px',
          color: colors.textSecondary,
          margin: 0,
          lineHeight: 1.4
        }}>
          Move the phone position to see how coil alignment affects charging power
        </p>
      </div>

      {/* Main scrollable content - minHeight: 0 required for flex scroll */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}>
        {/* GRAPHIC SECTION - Clear boundary, no text overlay */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgDeep
        }}>
          {/* Charging status - above graphic, not overlaid */}
          <div style={{
            maxWidth: '550px',
            margin: '0 auto 20px',
            padding: '14px 18px',
            background: colors.bgSurface,
            borderRadius: '12px',
            border: `2px solid ${couplingEfficiency > 70 ? colors.success : couplingEfficiency > 40 ? colors.warning : colors.error}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>⚡ CHARGING STATUS</span>
              <span style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 700,
                color: couplingEfficiency > 70 ? colors.success : couplingEfficiency > 40 ? colors.warning : colors.error
              }}>
                {chargingPower}W • {chargeTime} to full
              </span>
            </div>
            <div style={{
              height: '10px',
              background: colors.bgElevated,
              borderRadius: '5px',
              overflow: 'hidden',
              margin: '12px 0 8px'
            }}>
              <div style={{
                height: '100%',
                width: `${couplingEfficiency}%`,
                background: couplingEfficiency > 70 ? colors.success : couplingEfficiency > 40 ? colors.warning : colors.error,
                borderRadius: '5px',
                transition: 'width 0.1s, background 0.2s'
              }} />
            </div>
            <div style={{
              fontSize: '13px',
              color: couplingEfficiency > 70 ? colors.success : couplingEfficiency > 40 ? colors.warning : colors.error,
              fontWeight: 600,
              textAlign: 'center'
            }}>
              {couplingEfficiency > 70 ? '✓ OPTIMAL - Coils aligned!' :
               couplingEfficiency > 40 ? '⚠️ REDUCED - Partial overlap' :
               '✗ POOR - Misaligned'}
            </div>
          </div>

          {/* GRAPHIC - Clean, with breathing room */}
          <div style={{
            width: '100%',
            maxWidth: '550px',
            margin: '0 auto',
            background: colors.bgSurface,
            borderRadius: '16px',
            padding: isMobile ? '12px' : '16px',
            border: `1px solid ${colors.bgElevated}`
          }}>
            <div style={{ aspectRatio: isMobile ? '1' : '5/4' }}>
              <ChargingVisualization showHeatmap={showHeatmap} />
            </div>
          </div>

          {/* Toggle - below graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              style={{
                padding: '10px 20px',
                background: showHeatmap ? colors.primary : colors.bgSurface,
                border: `1px solid ${showHeatmap ? colors.primary : colors.bgElevated}`,
                borderRadius: '8px',
                color: showHeatmap ? 'white' : colors.textSecondary,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 0.2s'
              }}
            >
              🗺️ {showHeatmap ? 'Hide' : 'Show'} Coupling Heatmap
            </button>
          </div>
        </div>

        {/* CONTROLS SECTION - Clear header, grouped together */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgSurface,
          borderTop: `1px solid ${colors.bgElevated}`,
          borderBottom: `1px solid ${colors.bgElevated}`
        }}>
          <div style={{ maxWidth: '550px', margin: '0 auto' }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${colors.bgElevated}`
            }}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
              <div>
                <h2 style={{
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0
                }}>
                  CONTROLS
                </h2>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>
                  Drag sliders to move the phone position
                </p>
              </div>
            </div>

            {/* Sliders */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <SliderControl
                label="PHONE X POSITION"
                value={phoneOffsetX}
                min={-50}
                max={50}
                unit="mm"
                hint="Move left/right to test horizontal alignment"
                onChange={setPhoneOffsetX}
                color={colors.coilRx}
                showImpact={{
                  current: `${Math.abs(phoneOffsetX)}mm ${phoneOffsetX < 0 ? 'left' : phoneOffsetX > 0 ? 'right' : 'centered'}`,
                  status: Math.abs(phoneOffsetX) < 15 ? 'Good' : Math.abs(phoneOffsetX) < 30 ? 'Marginal' : 'Poor'
                }}
              />
              <SliderControl
                label="PHONE Y POSITION"
                value={phoneOffsetY}
                min={-50}
                max={50}
                unit="mm"
                hint="Move up/down to test vertical alignment"
                onChange={setPhoneOffsetY}
                color={colors.coilTx}
                showImpact={{
                  current: `${Math.abs(phoneOffsetY)}mm ${phoneOffsetY < 0 ? 'up' : phoneOffsetY > 0 ? 'down' : 'centered'}`,
                  status: Math.abs(phoneOffsetY) < 15 ? 'Good' : Math.abs(phoneOffsetY) < 30 ? 'Marginal' : 'Poor'
                }}
              />
            </div>

            {/* Quick position presets */}
            <div style={{
              padding: '12px',
              background: colors.bgDeep,
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '10px', fontWeight: 600 }}>
                TRY THESE POSITIONS:
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {[
                  { label: '🎯 Center', x: 0, y: 0 },
                  { label: '↖️ Corner', x: -35, y: -35 },
                  { label: '➡️ Edge', x: 40, y: 0 },
                  { label: '⬇️ Bottom', x: 0, y: 40 }
                ].map(pos => (
                  <button
                    key={pos.label}
                    onClick={() => { setPhoneOffsetX(pos.x); setPhoneOffsetY(pos.y); playSound('click'); }}
                    style={{
                      padding: '10px 16px',
                      background: phoneOffsetX === pos.x && phoneOffsetY === pos.y ? colors.primary : colors.bgSurface,
                      border: `1px solid ${phoneOffsetX === pos.x && phoneOffsetY === pos.y ? colors.primary : colors.bgElevated}`,
                      borderRadius: '8px',
                      color: colors.textPrimary,
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      minHeight: '44px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WHY SECTION - Prominent, separate from controls */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgDeep
        }}>
          <div style={{ maxWidth: '550px', margin: '0 auto' }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <h2 style={{
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0
              }}>
                WHAT'S HAPPENING & WHY
              </h2>
            </div>

            <ExplanationBox
              whatHappens={`At ${Math.round(Math.sqrt(phoneOffsetX ** 2 + phoneOffsetY ** 2))}mm offset: coupling is ${couplingEfficiency}%, delivering ${chargingPower}W. ${couplingEfficiency > 70 ? 'Excellent power transfer!' : couplingEfficiency > 40 ? 'Reduced efficiency - coils partially overlap.' : 'Critical - coils barely overlap, charging may fail.'}`}
              whyItHappens="Wireless charging uses electromagnetic induction between two coils. Energy transfers most efficiently when coils directly overlap. As the receiver moves away, less magnetic flux links them, reducing power."
              realWorldExample="This is why MagSafe uses magnets - they ensure perfect coil alignment every time you place your phone."
            />
          </div>
        </div>
      </div>

      {/* FOOTER - Navigation */}
      <div style={{
        padding: isMobile ? '14px 20px' : '18px 32px',
        borderTop: `1px solid ${colors.bgElevated}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', maxWidth: '550px', margin: '0 auto' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>I Understand →</Button>
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: isMobile ? '16px' : '32px'
    }}>
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>Step 4 of 10 • Review</span>

        {/* Prediction result */}
        <div style={{
          padding: '16px',
          background: prediction === 'slower' ? `${colors.success}15` : `${colors.warning}15`,
          borderRadius: '12px',
          marginBottom: '24px',
          marginTop: '12px'
        }}>
          <div style={{ fontSize: '14px', color: prediction === 'slower' ? colors.success : colors.warning, fontWeight: 600 }}>
            {prediction === 'slower' ? '✓ Correct!' : '→ Not quite!'}
          </div>
          <p style={{ color: colors.textPrimary, margin: '8px 0 0', fontSize: '14px' }}>
            {prediction === 'slower'
              ? 'You predicted correctly! Charging slows down or stops when the phone is off-center.'
              : prediction === 'same'
              ? 'Actually, position matters a lot! The coils must overlap for efficient energy transfer.'
              : 'While heat can be an issue, the main effect is reduced charging - not increased heat with faster charging.'}
          </p>
        </div>

        <h2 style={{ fontSize: isMobile ? '22px' : '26px', color: colors.textPrimary, marginBottom: '20px' }}>
          The Science of Inductive Coupling
        </h2>

        {/* Key takeaways */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            {
              icon: '🧲',
              title: 'Magnetic Coupling',
              desc: 'The transmitter coil creates an oscillating magnetic field. The receiver coil converts this back to electricity - but only when properly aligned.'
            },
            {
              icon: '📐',
              title: 'Coil Overlap = Efficiency',
              desc: 'Energy transfer depends on how much magnetic flux from the Tx coil passes through the Rx coil. More overlap = more flux = more power.'
            },
            {
              icon: '📉',
              title: 'Sharp Drop-off',
              desc: 'Coupling efficiency doesn\'t decrease linearly - it drops sharply once coils no longer overlap. This creates the "sweet spot" effect.'
            },
            {
              icon: '🔄',
              title: 'Qi Standard',
              desc: 'The Qi wireless charging standard uses 100-200 kHz frequencies with coils typically 30-50mm diameter, requiring <10mm misalignment for good coupling.'
            }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              background: colors.bgSurface,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '32px' }}>{item.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, margin: '0 0 4px', fontSize: '16px' }}>{item.title}</h3>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Formula */}
        <div style={{
          padding: '20px',
          background: `${colors.accent}15`,
          borderRadius: '12px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
            THE COUPLING COEFFICIENT
          </div>
          <div style={{ fontSize: '24px', color: colors.textPrimary, fontFamily: 'serif', marginBottom: '8px' }}>
            k = M / √(L₁ × L₂)
          </div>
          <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
            Where M is mutual inductance (depends on coil overlap and distance),<br />
            and L₁, L₂ are the self-inductances of each coil
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>Continue →</Button>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: isMobile ? '20px' : '40px'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          padding: '12px 16px',
          background: `${colors.warning}20`,
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>🌀</span>
          <span style={{ color: colors.warning, fontWeight: 600, fontSize: '13px' }}>TWIST: New Variable!</span>
        </div>

        <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.3 }}>
          What happens if you add a thick phone case between the phone and charger?
        </h2>
        <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: '15px' }}>
          Many people use protective cases 3-8mm thick. Some even use wallet cases with cards inside.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'nothing', icon: '🔋', text: 'No effect - wireless charging works through any material' },
            { id: 'collapse', icon: '📉', text: 'Coupling efficiency drops dramatically with distance' },
            { id: 'slower', icon: '🐢', text: 'Slightly slower but still works fine' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '20px',
                background: twistPrediction === opt.id ? `${colors.warning}20` : colors.bgSurface,
                border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '48px'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <span style={{ color: colors.textPrimary, fontSize: '15px', textAlign: 'left' }}>{opt.text}</span>
              {twistPrediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.warning, fontSize: '20px' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={goBack}>← Back</Button>
        <Button onClick={goNext} disabled={!twistPrediction}>
          Test My Prediction →
        </Button>
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* HEADER - Large clear title */}
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          background: `${colors.warning}20`,
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>🌀</span>
          <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600 }}>TWIST: New Variable!</span>
        </div>
        <h1 style={{
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: colors.textPrimary,
          margin: '0 0 4px',
          lineHeight: 1.2
        }}>
          CASE THICKNESS EFFECT
        </h1>
        <p style={{
          fontSize: isMobile ? '14px' : '16px',
          color: colors.textSecondary,
          margin: 0
        }}>
          See how distance between coils affects charging power
        </p>
      </div>

      {/* Main scrollable content - minHeight: 0 required for flex scroll */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}>
        {/* GRAPHIC SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgDeep
        }}>
          {/* Status meter - above graphic */}
          <div style={{
            maxWidth: '550px',
            margin: '0 auto 20px',
            padding: '14px 18px',
            background: colors.bgSurface,
            borderRadius: '12px',
            border: `2px solid ${gapDistance <= 5 ? colors.success : gapDistance <= 10 ? colors.warning : colors.error}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>📏 COIL SEPARATION</span>
              <span style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 700,
                color: gapDistance <= 5 ? colors.success : gapDistance <= 10 ? colors.warning : colors.error
              }}>
                {gapDistance}mm gap • {chargingPower}W
              </span>
            </div>
            <div style={{ height: '10px', background: colors.bgElevated, borderRadius: '5px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                height: '100%',
                width: `${((20 - gapDistance) / 17) * 100}%`,
                background: gapDistance <= 5 ? colors.success : gapDistance <= 10 ? colors.warning : colors.error,
                transition: 'width 0.1s'
              }} />
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: gapDistance <= 5 ? colors.success : gapDistance <= 10 ? colors.warning : colors.error,
              textAlign: 'center'
            }}>
              {gapDistance <= 5 ? '✓ Optimal for Qi charging' :
               gapDistance <= 10 ? '⚠️ Reduced efficiency' :
               '✗ Too far - charging fails'}
            </div>
          </div>

          {/* GRAPHIC - Clean container */}
          <div style={{
            width: '100%',
            maxWidth: '550px',
            margin: '0 auto',
            background: colors.bgSurface,
            borderRadius: '16px',
            padding: isMobile ? '12px' : '16px',
            border: `1px solid ${colors.bgElevated}`
          }}>
            <div style={{ aspectRatio: isMobile ? '1' : '5/4' }}>
              <ChargingVisualization showHeatmap={showHeatmap} showDistanceEffect={true} />
            </div>
          </div>

          {/* Reset position button */}
          {(Math.abs(phoneOffsetX) > 10 || Math.abs(phoneOffsetY) > 10) && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                onClick={() => { setPhoneOffsetX(0); setPhoneOffsetY(0); playSound('click'); }}
                style={{
                  padding: '12px 20px',
                  background: colors.bgSurface,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: '8px',
                  color: colors.primary,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  minHeight: '44px'
                }}
              >
                🎯 Center Phone (for cleaner distance test)
              </button>
            </div>
          )}
        </div>

        {/* CONTROLS SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgSurface,
          borderTop: `1px solid ${colors.bgElevated}`,
          borderBottom: `1px solid ${colors.bgElevated}`
        }}>
          <div style={{ maxWidth: '550px', margin: '0 auto' }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${colors.bgElevated}`
            }}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
              <div>
                <h2 style={{
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0
                }}>
                  CONTROLS
                </h2>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>
                  Adjust case thickness to see the distance effect
                </p>
              </div>
            </div>

            {/* Gap distance slider */}
            <SliderControl
              label="CASE THICKNESS (GAP DISTANCE)"
              value={gapDistance}
              min={3}
              max={20}
              unit="mm"
              hint="Simulates thick cases, wallet cases, or objects between phone and charger"
              onChange={setGapDistance}
              color={colors.warning}
              showImpact={{
                current: `${couplingEfficiency}% coupling`,
                status: gapDistance <= 5 ? 'Works well' : gapDistance <= 10 ? 'Degraded' : 'FAILS'
              }}
            />

            {/* Quick presets */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: colors.bgDeep,
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '10px', fontWeight: 600 }}>
                TRY THESE SCENARIOS:
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {[
                  { label: 'No case (3mm)', value: 3 },
                  { label: 'Thin case (5mm)', value: 5 },
                  { label: 'Thick case (8mm)', value: 8 },
                  { label: 'Wallet (12mm)', value: 12 },
                  { label: 'With card (15mm)', value: 15 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setGapDistance(preset.value); playSound('click'); }}
                    style={{
                      padding: '10px 14px',
                      background: gapDistance === preset.value ? colors.warning : colors.bgSurface,
                      border: `1px solid ${gapDistance === preset.value ? colors.warning : colors.bgElevated}`,
                      borderRadius: '8px',
                      color: colors.textPrimary,
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      minHeight: '40px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WHY SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgDeep
        }}>
          <div style={{ maxWidth: '550px', margin: '0 auto' }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <h2 style={{
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0
              }}>
                WHAT'S HAPPENING & WHY
              </h2>
            </div>

            <ExplanationBox
              whatHappens={`At ${gapDistance}mm gap: coupling is ${couplingEfficiency}%, delivering ${chargingPower}W. ${gapDistance <= 5 ? 'Good charging.' : gapDistance <= 10 ? 'Marginal - may work slowly.' : 'Too weak - won\'t charge.'}`}
              whyItHappens="Magnetic field strength drops rapidly with distance (inverse cube law). At 3mm coupling is strong; by 10mm it's weak; beyond 15mm charging fails entirely."
              realWorldExample="MagSafe magnets pull the phone to ~3mm. Wallet cases with metal cards block charging from both distance AND metal shielding."
            />

            {/* Safety warning */}
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: `${colors.error}10`,
              borderRadius: '12px',
              borderLeft: `4px solid ${colors.error}`
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.error, marginBottom: '8px' }}>
                ⚠️ SAFETY WARNING
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                Never place metal objects between phone and charger. Metal heats dangerously from induced currents. Remove thick cases if phone gets hot.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        padding: isMobile ? '14px 20px' : '18px 32px',
        borderTop: `1px solid ${colors.bgElevated}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', maxWidth: '550px', margin: '0 auto' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>I Understand →</Button>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: isMobile ? '16px' : '32px'
    }}>
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600 }}>Step 7 of 10 • Twist Review</span>

        {/* Prediction result */}
        <div style={{
          padding: '16px',
          background: twistPrediction === 'collapse' ? `${colors.success}15` : `${colors.warning}15`,
          borderRadius: '12px',
          margin: '12px 0 24px'
        }}>
          <div style={{ fontSize: '14px', color: twistPrediction === 'collapse' ? colors.success : colors.warning, fontWeight: 600 }}>
            {twistPrediction === 'collapse' ? '✓ Correct!' : '→ Not quite!'}
          </div>
          <p style={{ color: colors.textPrimary, margin: '8px 0 0', fontSize: '14px' }}>
            {twistPrediction === 'collapse'
              ? 'You\'re right! Coupling efficiency drops dramatically - not linearly - with distance.'
              : 'The drop is more severe than "slightly slower." Coupling follows an inverse-cube relationship, collapsing rapidly.'}
          </p>
        </div>

        <h2 style={{ fontSize: isMobile ? '22px' : '26px', color: colors.textPrimary, marginBottom: '20px' }}>
          Why Distance Matters So Much
        </h2>

        {/* Comparison cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div style={{ padding: '20px', background: `${colors.success}15`, borderRadius: '12px', border: `1px solid ${colors.success}30` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.success, marginBottom: '8px' }}>
              📱 No Case (3mm)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: colors.success }}>~95%</div>
            <div style={{ color: colors.textSecondary, fontSize: '13px' }}>coupling efficiency</div>
            <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>15W fast charging works</div>
          </div>
          <div style={{ padding: '20px', background: `${colors.error}15`, borderRadius: '12px', border: `1px solid ${colors.error}30` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.error, marginBottom: '8px' }}>
              📚 Wallet Case (12mm)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: colors.error }}>~15%</div>
            <div style={{ color: colors.textSecondary, fontSize: '13px' }}>coupling efficiency</div>
            <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>May not charge at all</div>
          </div>
        </div>

        {/* Key insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            {
              icon: '📉',
              title: 'Non-Linear Drop',
              desc: 'Doubling the distance doesn\'t halve efficiency - it can reduce it by 80% or more due to the inverse-cube relationship of near-field coupling.'
            },
            {
              icon: '🧲',
              title: 'Near-Field vs Far-Field',
              desc: 'Qi charging operates in the near-field (within ~1 wavelength). Here, magnetic field dominates and drops much faster than electromagnetic radiation would.'
            },
            {
              icon: '💳',
              title: 'Metal is Worse',
              desc: 'Metal cards or objects don\'t just add distance - they actively shield the magnetic field AND can heat up dangerously from induced currents.'
            }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              background: colors.bgSurface,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, margin: '0 0 4px', fontSize: '15px' }}>{item.title}</h3>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>See Real-World Uses →</Button>
        </div>
      </div>
    </div>
  );

  // Rich Transfer Applications
  const transferApps = [
    {
      title: 'Electric Vehicle Charging',
      icon: '🚗',
      tagline: 'Park & Charge Without Plugging In',
      physicsConnection: 'EV wireless charging uses the same inductive coupling principle, but with much larger coils (30-50cm) and higher power (up to 22kW). Alignment is even more critical at these power levels.',
      stats: [
        { value: '22kW', label: 'Max wireless power', icon: '⚡' },
        { value: '±10cm', label: 'Alignment tolerance', icon: '🎯' },
        { value: '92%', label: 'Peak efficiency', icon: '📊' }
      ],
      howItWorks: {
        simple: 'A charging pad in the ground creates a magnetic field that couples with a receiver under the car, transferring power without any physical connection.',
        steps: [
          'Ground pad (Tx coil) installed in parking spot or garage',
          'Car has receiver pad (Rx coil) mounted underneath',
          'Driver parks, guided by alignment system',
          'Coils must align within ~10cm for efficient charging',
          'Foreign object detection ensures safety before power flows'
        ]
      },
      examples: [
        { name: 'BMW 530e', desc: 'First production car with factory wireless charging option', why: 'Uses parking sensors to guide to the exact position' },
        { name: 'Genesis GV60', desc: 'Offers wireless charging up to 11kW', why: 'Automatic parking helps with alignment' },
        { name: 'WiTricity', desc: 'Leading wireless EV charging technology provider', why: 'Their system achieves 93% efficiency' },
        { name: 'Automated Taxi Fleets', desc: 'Wireless charging enables 24/7 autonomous operation', why: 'No human needed to plug in between rides' }
      ],
      whyItMatters: {
        personal: 'Imagine never plugging in your EV - just park in your garage and it charges. Wireless charging makes this possible.',
        broader: 'For autonomous vehicles, wireless charging is essential. Self-driving taxis can\'t plug themselves in, but can park over a charging pad.'
      },
      color: colors.primary
    },
    {
      title: 'Medical Implants',
      icon: '🏥',
      tagline: 'Charging Pacemakers Without Surgery',
      physicsConnection: 'Medical implants use miniaturized versions of inductive coupling to charge batteries through skin (typically 5-15mm of tissue). Alignment is critical for patient safety and charging reliability.',
      stats: [
        { value: '5-10mm', label: 'Through-tissue range', icon: '📏' },
        { value: '0.5W', label: 'Typical charge power', icon: '🔋' },
        { value: '0', label: 'Surgeries to recharge', icon: '🏥' }
      ],
      howItWorks: {
        simple: 'An external charger held against the skin transfers power through tissue to the implanted device, recharging its battery without any incision.',
        steps: [
          'Patient holds external charging coil against skin over implant',
          'Coils must align - implant may have magnet or alignment sensor',
          'Power transfers through 5-15mm of tissue',
          'Implant communicates charging status wirelessly',
          'Session typically 30-60 minutes weekly/monthly'
        ]
      },
      examples: [
        { name: 'Cochlear Implants', desc: 'Hearing devices charge through skin behind ear', why: 'Small coils require precise alignment' },
        { name: 'Neurostimulators', desc: 'Pain management and Parkinson\'s devices', why: 'Deep implants need careful charger positioning' },
        { name: 'Ventricular Assist Devices', desc: 'Heart pumps that can charge wirelessly', why: 'Eliminates infection risk from power cables through skin' },
        { name: 'Insulin Pumps', desc: 'Some models support wireless charging', why: 'Simplifies diabetes management' }
      ],
      whyItMatters: {
        personal: 'If you or a loved one has a medical implant, wireless charging means no surgery just to replace a battery.',
        broader: 'Transcutaneous (through-skin) power transfer eliminates infection pathways that cables create, dramatically improving patient outcomes.'
      },
      color: colors.success
    },
    {
      title: 'Industrial Automation',
      icon: '🤖',
      tagline: 'Robots That Never Stop for Charging',
      physicsConnection: 'Warehouse robots and automated guided vehicles (AGVs) use wireless charging for opportunity charging - brief top-ups during normal operation, enabled by good alignment at docking stations.',
      stats: [
        { value: '1-3kW', label: 'Robot charging power', icon: '⚡' },
        { value: '15sec', label: 'Opportunity charge time', icon: '⏱️' },
        { value: '24/7', label: 'Operation capability', icon: '🔄' }
      ],
      howItWorks: {
        simple: 'Instead of long charging breaks, robots briefly pause at wireless charging spots during their routes, maintaining battery level throughout 24/7 operation.',
        steps: [
          'Wireless charging pads embedded in floor at strategic points',
          'Robot pauses briefly (15-60 seconds) during route',
          'Alignment guides (mechanical or magnetic) ensure coupling',
          'Small power boost adds 5-10% battery each stop',
          'Robot never needs extended charging downtime'
        ]
      },
      examples: [
        { name: 'Amazon Warehouses', desc: 'Kiva robots use opportunity charging', why: 'Eliminates the fleet of "charging" robots sitting idle' },
        { name: 'Hospital AGVs', desc: 'Medicine delivery robots charge at nurse stations', why: 'Sterile environments benefit from no cables' },
        { name: 'Automotive Plants', desc: 'Assembly line AGVs charge at workstations', why: 'Precise stopping positions enable good alignment' },
        { name: 'Airport Luggage', desc: 'Baggage handling robots with wireless charging', why: 'Continuous operation during peak hours' }
      ],
      whyItMatters: {
        personal: 'Next time your Amazon package arrives quickly, thank wireless-charged robots that work 24/7.',
        broader: 'Opportunity charging increases robot fleet productivity by 20-30% by eliminating dedicated charging downtime.'
      },
      color: colors.warning
    },
    {
      title: 'Smart Furniture',
      icon: '🪑',
      tagline: 'Your Desk Charges Your Phone',
      physicsConnection: 'Furniture-integrated wireless charging faces the alignment challenge head-on with larger coils, multi-coil arrays, or visual guides to help users place devices in the right spot.',
      stats: [
        { value: '15W', label: 'IKEA charger power', icon: '⚡' },
        { value: '3+', label: 'Coils in premium pads', icon: '🧲' },
        { value: '20mm', label: 'Through-surface range', icon: '📏' }
      ],
      howItWorks: {
        simple: 'Charging coils hidden under desk surfaces, nightstands, or countertops create invisible charging zones. Multi-coil designs expand the "sweet spot."',
        steps: [
          'Charging coils installed beneath furniture surface',
          'Surface material must be non-metallic (wood, stone, composite)',
          'Multi-coil arrays detect phone position and activate nearest coil',
          'Some systems use visual indicators to guide placement',
          'Power management prevents overheating of furniture'
        ]
      },
      examples: [
        { name: 'IKEA Furniture', desc: 'Lamps, desks, and nightstands with built-in Qi', why: 'Alignment symbols on surface guide placement' },
        { name: 'Starbucks Tables', desc: 'Coffee shop tables with Powermat charging', why: 'Fixed position markers for customers' },
        { name: 'Hotel Nightstands', desc: 'Marriott and others adding wireless charging', why: 'Multiple coil positions accommodate different phone sizes' },
        { name: 'Car Center Consoles', desc: 'Automotive wireless charging trays', why: 'Walls help guide phone to correct position' }
      ],
      whyItMatters: {
        personal: 'Imagine your kitchen counter, office desk, and nightstand all charging your phone automatically - no hunting for cables.',
        broader: 'As wireless charging becomes ubiquitous in furniture, the concept of "charging" may disappear - devices just stay charged.'
      },
      color: colors.accent
    }
  ];

  const renderTransfer = () => {
    const app = transferApps[activeApp];

    // Application diagrams
    const ApplicationDiagram = () => {
      const diagrams: Record<number, JSX.Element> = {
        0: ( // EV Charging
          <svg viewBox="0 0 300 180" width="100%" height="auto" style={{ maxHeight: '180px' }}>
            {/* Ground/road */}
            <rect x="0" y="140" width="300" height="40" fill={colors.bgElevated} />

            {/* Ground coil */}
            <ellipse cx="150" cy="145" rx="40" ry="8" fill={colors.coilTx} opacity="0.8" />
            <text x="150" y="170" fontSize="9" fill={colors.textMuted} textAnchor="middle">Ground Pad (Tx)</text>

            {/* Car body */}
            <rect x="90" y="70" width="120" height="50" rx="10" fill={colors.bgSurface} stroke={colors.textMuted} strokeWidth="2" />
            <rect x="100" y="55" width="100" height="30" rx="8" fill={colors.bgSurface} stroke={colors.textMuted} strokeWidth="2" />

            {/* Wheels */}
            <circle cx="110" cy="120" r="15" fill={colors.bgElevated} stroke={colors.textMuted} strokeWidth="2" />
            <circle cx="190" cy="120" r="15" fill={colors.bgElevated} stroke={colors.textMuted} strokeWidth="2" />

            {/* Car coil */}
            <ellipse cx="150" cy="125" rx="30" ry="6" fill={colors.coilRx} opacity="0.8" />
            <text x="230" y="125" fontSize="9" fill={colors.coilRx}>Rx Coil</text>

            {/* Magnetic field */}
            <path d="M 130 145 Q 150 135, 170 145" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="4" opacity="0.6" />
            <path d="M 120 145 Q 150 130, 180 145" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="4" opacity="0.4" />

            {/* Alignment arrow */}
            <path d="M 70 100 L 85 100" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="50" y="95" fontSize="8" fill={colors.success}>Align</text>

            <text x="150" y="20" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">EV Wireless Charging</text>
          </svg>
        ),
        1: ( // Medical
          <svg viewBox="0 0 300 180" width="100%" height="auto" style={{ maxHeight: '180px' }}>
            {/* Skin layer */}
            <rect x="100" y="60" width="100" height="80" fill="#fcd5b5" rx="10" />
            <text x="150" y="155" fontSize="9" fill={colors.textMuted} textAnchor="middle">Skin/Tissue</text>

            {/* External charger */}
            <rect x="60" y="80" width="50" height="40" rx="5" fill={colors.bgSurface} stroke={colors.coilTx} strokeWidth="2" />
            <ellipse cx="85" cy="100" rx="15" ry="10" fill={colors.coilTx} opacity="0.8" />
            <text x="85" y="75" fontSize="8" fill={colors.textMuted} textAnchor="middle">External</text>

            {/* Implant */}
            <rect x="140" y="85" width="40" height="30" rx="5" fill={colors.bgElevated} stroke={colors.coilRx} strokeWidth="2" />
            <ellipse cx="160" cy="100" rx="12" ry="8" fill={colors.coilRx} opacity="0.8" />
            <text x="160" y="130" fontSize="8" fill={colors.textMuted} textAnchor="middle">Implant</text>

            {/* Magnetic coupling */}
            <path d="M 100 100 C 120 95, 130 95, 145 100" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="3" />

            {/* Distance label */}
            <line x1="100" y1="110" x2="140" y2="110" stroke={colors.warning} strokeWidth="1" strokeDasharray="2" />
            <text x="120" y="125" fontSize="8" fill={colors.warning} textAnchor="middle">5-15mm</text>

            <text x="150" y="20" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">Medical Implant Charging</text>
          </svg>
        ),
        2: ( // Industrial
          <svg viewBox="0 0 300 180" width="100%" height="auto" style={{ maxHeight: '180px' }}>
            {/* Floor */}
            <rect x="0" y="140" width="300" height="40" fill={colors.bgElevated} />

            {/* Charging spot */}
            <ellipse cx="150" cy="145" rx="35" ry="8" fill={colors.coilTx} opacity="0.7" />

            {/* Robot body */}
            <rect x="120" y="90" width="60" height="50" rx="5" fill={colors.bgSurface} stroke={colors.textMuted} strokeWidth="2" />
            <rect x="130" y="70" width="40" height="30" rx="3" fill={colors.primary} opacity="0.3" />

            {/* Robot wheels */}
            <rect x="115" y="130" width="15" height="15" rx="3" fill={colors.bgDeep} />
            <rect x="170" y="130" width="15" height="15" rx="3" fill={colors.bgDeep} />

            {/* Receiver */}
            <ellipse cx="150" cy="138" rx="25" ry="5" fill={colors.coilRx} opacity="0.8" />

            {/* Status indicator */}
            <circle cx="150" cy="80" r="8" fill={colors.success} opacity="0.8" />
            <text x="150" y="84" fontSize="8" fill="white" textAnchor="middle">⚡</text>

            {/* Path arrows */}
            <path d="M 50 120 L 110 120" stroke={colors.textMuted} strokeWidth="1" markerEnd="url(#arrow)" strokeDasharray="4" />
            <path d="M 190 120 L 250 120" stroke={colors.textMuted} strokeWidth="1" markerEnd="url(#arrow)" strokeDasharray="4" />
            <text x="50" y="115" fontSize="8" fill={colors.textMuted}>Route</text>

            <text x="150" y="20" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">AGV Opportunity Charging</text>
          </svg>
        ),
        3: ( // Furniture
          <svg viewBox="0 0 300 180" width="100%" height="auto" style={{ maxHeight: '180px' }}>
            {/* Desk surface */}
            <rect x="50" y="100" width="200" height="15" fill="#8b7355" rx="2" />
            <rect x="45" y="115" width="10" height="50" fill="#6b5344" />
            <rect x="245" y="115" width="10" height="50" fill="#6b5344" />

            {/* Charging coils under desk */}
            <ellipse cx="150" cy="108" rx="30" ry="5" fill={colors.coilTx} opacity="0.6" />
            <ellipse cx="100" cy="108" rx="25" ry="4" fill={colors.coilTx} opacity="0.4" />
            <ellipse cx="200" cy="108" rx="25" ry="4" fill={colors.coilTx} opacity="0.4" />

            {/* Phone on desk */}
            <rect x="135" y="85" width="30" height="15" rx="2" fill={colors.bgSurface} stroke={colors.success} strokeWidth="2" />
            <ellipse cx="150" cy="92" rx="10" ry="3" fill={colors.coilRx} opacity="0.8" />

            {/* Charging indicator */}
            <text x="150" y="78" fontSize="12" fill={colors.success} textAnchor="middle">⚡</text>

            {/* Alignment marker on surface */}
            <circle cx="150" cy="95" r="2" fill={colors.primary} opacity="0.6" />
            <text x="180" y="80" fontSize="8" fill={colors.textMuted}>Phone</text>

            {/* Multi-coil label */}
            <text x="150" y="135" fontSize="8" fill={colors.textMuted} textAnchor="middle">Multi-coil array under surface</text>

            <text x="150" y="20" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">Furniture-Integrated Charging</text>
          </svg>
        )
      };
      return diagrams[activeApp] || diagrams[0];
    };

    return (
      <div style={{
        height: '100%',
        overflowY: 'auto',
        padding: isMobile ? '16px' : '32px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
            Step 8 of 10 • Real-World Applications
          </span>
          <h2 style={{ fontSize: isMobile ? '22px' : '26px', color: colors.textPrimary, margin: '12px 0 20px' }}>
            Where Wireless Charging Alignment Matters
          </h2>

          {/* App tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            overflowX: 'auto',
            paddingBottom: '8px'
          }}>
            {transferApps.map((appItem, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i === 0 || completedApps[i - 1]) {
                    setActiveApp(i);
                    if (!completedApps[i]) {
                      const newCompleted = [...completedApps];
                      newCompleted[i] = true;
                      setCompletedApps(newCompleted);
                    }
                    playSound('click');
                    emitGameEvent('app_changed', { appNumber: i + 1, appTitle: appItem.title });
                  }
                }}
                style={{
                  padding: '10px 16px',
                  background: activeApp === i ? colors.success : colors.bgSurface,
                  border: `1px solid ${activeApp === i ? colors.success : colors.bgElevated}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontWeight: 600,
                  cursor: i === 0 || completedApps[i - 1] ? 'pointer' : 'not-allowed',
                  opacity: i === 0 || completedApps[i - 1] ? 1 : 0.4,
                  whiteSpace: 'nowrap',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <span style={{ fontSize: '18px' }}>{appItem.icon}</span>
                <span style={{ fontSize: isMobile ? '11px' : '13px' }}>{isMobile ? '' : appItem.title.split(' ')[0]}</span>
                {completedApps[i] && <span style={{ color: '#fff' }}>✓</span>}
              </button>
            ))}
          </div>

          {/* Active app RICH content */}
          <div style={{
            background: colors.bgSurface,
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.bgElevated}` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{app.icon}</div>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: isMobile ? '20px' : '24px' }}>
                {app.title}
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontStyle: 'italic' }}>
                {app.tagline}
              </p>
            </div>

            {/* Physics Connection */}
            <div style={{
              margin: '20px',
              padding: '16px',
              backgroundColor: `${colors.accent}15`,
              borderLeft: `4px solid ${colors.accent}`,
              borderRadius: '0 8px 8px 0'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: colors.accent, marginBottom: '6px' }}>
                ⚛️ PHYSICS CONNECTION
              </div>
              <div style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>
                {app.physicsConnection}
              </div>
            </div>

            {/* VISUAL DIAGRAM */}
            <div style={{
              margin: '20px',
              padding: '20px',
              backgroundColor: colors.bgDeep,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, marginBottom: '12px', textTransform: 'uppercase' }}>
                📊 How It Works Visually
              </div>
              <ApplicationDiagram />
            </div>

            {/* STATS GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              margin: '20px'
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  backgroundColor: colors.bgElevated,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.icon}</div>
                  <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: app.color || colors.primary }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px', lineHeight: 1.3 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* HOW IT WORKS */}
            <div style={{ margin: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary, marginBottom: '12px' }}>
                🔧 How It Works
              </div>
              <p style={{ color: colors.textSecondary, marginBottom: '16px', fontSize: '14px', lineHeight: 1.6 }}>
                {app.howItWorks.simple}
              </p>
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                {app.howItWorks.steps.map((step, i) => (
                  <li key={i} style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* REAL-WORLD EXAMPLES */}
            <div style={{ margin: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary, marginBottom: '12px' }}>
                🌍 Real-World Examples
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {app.examples.map((ex, i) => (
                  <div key={i} style={{
                    backgroundColor: colors.bgElevated,
                    padding: '14px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px', fontSize: '13px' }}>
                      {ex.name}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '6px' }}>
                      {ex.desc}
                    </div>
                    <div style={{ fontSize: '11px', color: app.color || colors.primary }}>
                      → {ex.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WHY IT MATTERS */}
            <div style={{
              margin: '20px',
              padding: '16px',
              backgroundColor: `${colors.success}15`,
              borderLeft: `4px solid ${colors.success}`,
              borderRadius: '0 8px 8px 0'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: colors.success, marginBottom: '8px' }}>
                💡 WHY THIS MATTERS TO YOU
              </div>
              <div style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '10px', lineHeight: 1.6 }}>
                {app.whyItMatters.personal}
              </div>
              <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5 }}>
                {app.whyItMatters.broader}
              </div>
            </div>

            {/* CONTINUE BUTTON */}
            <div style={{
              padding: '20px',
              borderTop: `1px solid ${colors.bgElevated}`,
              textAlign: 'center'
            }}>
              {activeApp < transferApps.length - 1 ? (
                <Button onClick={() => {
                  const nextIndex = activeApp + 1;
                  const newCompleted = [...completedApps];
                  newCompleted[activeApp] = true;
                  setCompletedApps(newCompleted);
                  setActiveApp(nextIndex);
                  emitGameEvent('app_changed', { appNumber: nextIndex + 1, appTitle: transferApps[nextIndex].title });
                }}>
                  Continue to {transferApps[activeApp + 1].title} →
                </Button>
              ) : (
                <Button onClick={() => {
                  const newCompleted = [...completedApps];
                  newCompleted[activeApp] = true;
                  setCompletedApps(newCompleted);
                  goNext();
                }}>
                  Take the Test →
                </Button>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
              {transferApps.map((_, i) => (
                <div key={i} style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: completedApps[i] ? colors.success : i === activeApp ? colors.primary : colors.bgElevated
                }} />
              ))}
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px' }}>
              Application {activeApp + 1} of 4 • {completedApps.filter(Boolean).length} completed
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Test questions
  const testQuestions = [
    {
      question: "What is the main factor that determines wireless charging efficiency?",
      options: [
        { text: "Phone battery size", correct: false },
        { text: "Coil alignment and distance", correct: true },
        { text: "Charger brand", correct: false },
        { text: "Room temperature", correct: false }
      ],
      explanation: "Coil alignment (overlap) and distance between coils are the primary factors determining coupling efficiency and thus charging speed."
    },
    {
      question: "What happens to charging power when you move your phone 3cm off-center?",
      options: [
        { text: "No change", correct: false },
        { text: "Slight decrease", correct: false },
        { text: "Dramatic decrease or failure", correct: true },
        { text: "Increases due to better cooling", correct: false }
      ],
      explanation: "At 3cm offset, the coils barely overlap, causing coupling to drop dramatically - often below the threshold for effective charging."
    },
    {
      question: "Why do MagSafe and similar systems use magnets?",
      options: [
        { text: "To make the phone stick better", correct: false },
        { text: "To ensure precise coil alignment", correct: true },
        { text: "To increase battery capacity", correct: false },
        { text: "For aesthetic design", correct: false }
      ],
      explanation: "The magnets ensure the phone's receiver coil aligns precisely with the charger's transmitter coil, maximizing coupling efficiency."
    },
    {
      question: "What is the typical maximum effective distance for Qi wireless charging?",
      options: [
        { text: "1mm", correct: false },
        { text: "5-8mm", correct: true },
        { text: "20mm", correct: false },
        { text: "50mm", correct: false }
      ],
      explanation: "Qi charging typically works up to 5-8mm, which is why thick cases can cause problems. Beyond this, coupling drops too low for practical charging."
    },
    {
      question: "Why should you never place metal objects on a wireless charger?",
      options: [
        { text: "They might scratch the charger", correct: false },
        { text: "They can heat up dangerously from induced currents", correct: true },
        { text: "They make the charger look ugly", correct: false },
        { text: "They use up the battery faster", correct: false }
      ],
      explanation: "Metal objects in the magnetic field develop eddy currents, which cause them to heat up significantly. This is both inefficient and potentially dangerous."
    },
    {
      question: "How does coupling efficiency change with distance?",
      options: [
        { text: "Linearly (half distance = half power)", correct: false },
        { text: "Barely changes", correct: false },
        { text: "Follows inverse cube law (drops very rapidly)", correct: true },
        { text: "Increases with distance", correct: false }
      ],
      explanation: "In the near-field (where Qi operates), magnetic coupling follows roughly an inverse cube relationship - small distance increases cause large efficiency drops."
    },
    {
      question: "What is 'opportunity charging' in industrial robotics?",
      options: [
        { text: "Charging robots when there's a sale on electricity", correct: false },
        { text: "Brief wireless top-ups during normal operation", correct: true },
        { text: "Only charging during off-peak hours", correct: false },
        { text: "Charging multiple robots at once", correct: false }
      ],
      explanation: "Opportunity charging means robots briefly pause at wireless charging spots during their routes, maintaining battery level without dedicated charging time."
    },
    {
      question: "Why is wireless charging particularly valuable for medical implants?",
      options: [
        { text: "It's cheaper than batteries", correct: false },
        { text: "It eliminates infection risk from power cables through skin", correct: true },
        { text: "Hospitals have better wireless chargers", correct: false },
        { text: "It makes surgery faster", correct: false }
      ],
      explanation: "Transcutaneous (through-skin) power transfer eliminates the need for cables penetrating the skin, dramatically reducing infection risk."
    },
    {
      question: "What does FOD stand for in wireless charging, and why is it important?",
      options: [
        { text: "Fast Output Delivery - for speed", correct: false },
        { text: "Foreign Object Detection - for safety", correct: true },
        { text: "Frequency Oscillation Damping - for efficiency", correct: false },
        { text: "Full Output Duration - for battery life", correct: false }
      ],
      explanation: "FOD (Foreign Object Detection) identifies metal objects on the charger and stops power transfer to prevent dangerous heating."
    },
    {
      question: "For EV wireless charging, what alignment tolerance is typically required?",
      options: [
        { text: "Exact center only", correct: false },
        { text: "Within 10cm", correct: true },
        { text: "Within 1 meter", correct: false },
        { text: "Alignment doesn't matter for EVs", correct: false }
      ],
      explanation: "EV wireless charging typically requires alignment within about 10cm. Parking guidance systems help drivers achieve this positioning."
    }
  ];

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;

    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '16px' : '32px'
      }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', width: '100%', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
              Step 9 of 10 • Knowledge Test
            </span>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              Question {currentQuestion + 1}/10
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: '6px', background: colors.bgElevated, borderRadius: '3px', marginBottom: '24px' }}>
            <div style={{
              height: '100%',
              width: `${((currentQuestion + 1) / 10) * 100}%`,
              background: colors.primary,
              borderRadius: '3px',
              transition: 'width 0.3s'
            }} />
          </div>

          <h3 style={{ fontSize: isMobile ? '18px' : '22px', color: colors.textPrimary, marginBottom: '24px', lineHeight: 1.4 }}>
            {q.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {q.options.map((opt, i) => {
              const isSelected = testAnswers[currentQuestion] === i;
              const isCorrect = opt.correct;
              const showResult = answered;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!answered) {
                      const newAnswers = [...testAnswers];
                      newAnswers[currentQuestion] = i;
                      setTestAnswers(newAnswers);
                      if (opt.correct) {
                        setTestScore(prev => prev + 1);
                        playSound('success');
                      } else {
                        playSound('failure');
                      }
                      setShowExplanation(true);
                    }
                  }}
                  disabled={answered}
                  style={{
                    padding: '16px 20px',
                    background: showResult
                      ? isCorrect ? `${colors.success}20` : isSelected ? `${colors.error}20` : colors.bgSurface
                      : isSelected ? `${colors.primary}20` : colors.bgSurface,
                    border: `2px solid ${
                      showResult
                        ? isCorrect ? colors.success : isSelected ? colors.error : colors.bgElevated
                        : isSelected ? colors.primary : colors.bgElevated
                    }`,
                    borderRadius: '12px',
                    textAlign: 'left',
                    cursor: answered ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '48px'
                  }}
                >
                  <span style={{ color: colors.textPrimary, fontSize: '15px' }}>{opt.text}</span>
                  {showResult && isCorrect && <span style={{ float: 'right', color: colors.success }}>✓</span>}
                  {showResult && isSelected && !isCorrect && <span style={{ float: 'right', color: colors.error }}>✗</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: `${colors.accent}15`,
              borderRadius: '12px',
              borderLeft: `4px solid ${colors.accent}`
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: colors.accent, marginBottom: '8px' }}>
                💡 EXPLANATION
              </div>
              <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                {q.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ maxWidth: '650px', margin: '20px auto 0', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ color: colors.textMuted, fontSize: '14px' }}>
              Score: {testScore}/{currentQuestion + (answered ? 1 : 0)}
            </div>
            {answered && (
              <Button onClick={() => {
                if (currentQuestion < 9) {
                  setCurrentQuestion(prev => prev + 1);
                  setShowExplanation(false);
                } else {
                  goNext();
                }
              }}>
                {currentQuestion < 9 ? 'Next Question →' : 'See Results →'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / 10) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{
        height: '100%',
        overflowY: 'auto',
        padding: isMobile ? '20px' : '40px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: passed ? colors.success : colors.warning, fontWeight: 600 }}>
            Step 10 of 10 • Results
          </span>

          <div style={{ fontSize: '80px', margin: '24px 0' }}>
            {passed ? '🏆' : '📚'}
          </div>

          <h2 style={{ fontSize: isMobile ? '24px' : '32px', color: colors.textPrimary, marginBottom: '16px' }}>
            {passed ? 'Congratulations!' : 'Keep Learning!'}
          </h2>

          <div style={{
            fontSize: '48px',
            fontWeight: 700,
            color: passed ? colors.success : colors.warning,
            marginBottom: '8px'
          }}>
            {percentage}%
          </div>
          <p style={{ color: colors.textSecondary, marginBottom: '32px' }}>
            You got {testScore} out of 10 questions correct
            {passed ? ' - You\'ve mastered wireless charging alignment!' : ' - Review the material and try again.'}
          </p>

          {/* Key concepts summary */}
          <div style={{
            textAlign: 'left',
            background: colors.bgSurface,
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '32px'
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '16px', fontSize: '18px' }}>
              📝 Key Concepts You Learned
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '🎯', text: 'Coil alignment is critical - even small offsets dramatically reduce efficiency' },
                { icon: '📏', text: 'Distance matters - coupling follows inverse cube law in near-field' },
                { icon: '🧲', text: 'Magnetic coupling transfers energy without physical contact' },
                { icon: '⚠️', text: 'Metal objects can heat dangerously - FOD systems protect against this' },
                { icon: '🌍', text: 'Same principles apply from phones to EVs to medical implants' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span style={{ color: colors.textSecondary, fontSize: '14px' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => goToPhase('hook')}>
              Review Lesson
            </Button>
            <Button onClick={() => {
              emitGameEvent('return_to_dashboard');
              playSound('complete');
              // Actually navigate to dashboard
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}>
              ← Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER CONTENT
  // ============================================================================

  const renderContent = () => {
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

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{
      height: '100%',
      background: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Progress bar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{phaseLabels[phase]}</span>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>
            {phaseOrder.indexOf(phase) + 1}/10
          </span>
        </div>
        <div style={{ height: '4px', background: colors.bgElevated, borderRadius: '2px' }}>
          <div style={{
            height: '100%',
            width: `${((phaseOrder.indexOf(phase) + 1) / 10) * 100}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
            borderRadius: '2px',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default WirelessChargingRenderer;
