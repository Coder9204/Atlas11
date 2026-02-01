'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// ANTENNA POLARIZATION GAME
// Core Concept: EM waves have polarization; antennas couple best when aligned
// Real-World Application: Why rotating your phone or router affects signal
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface AntennaPolarizationRendererProps {
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

const realWorldApps = [
  {
    icon: '📡',
    title: 'Satellite Communications',
    short: 'Satellite signal optimization',
    tagline: 'Maximizing signal through polarization alignment',
    description: 'Satellite dishes must precisely align their polarization with the satellite signal. Incorrect polarization can reduce signal strength by 20-30 dB, making the difference between perfect reception and no signal.',
    connection: 'Just like our simulation shows, when antenna and wave polarizations are misaligned, signal strength follows Malus\'s Law (cos²θ). At 90° misalignment, theoretically zero signal gets through.',
    howItWorks: 'Satellites transmit in either linear (horizontal/vertical) or circular polarization. The receiving antenna must match. Dual-polarization allows frequency reuse, doubling capacity on the same frequencies.',
    stats: [
      { value: '30dB', label: 'Cross-pol isolation', icon: '📊' },
      { value: '2x', label: 'Capacity with dual-pol', icon: '📈' },
      { value: '99.9%', label: 'Alignment precision', icon: '🎯' }
    ],
    examples: ['DirecTV dishes', 'Starlink terminals', 'GPS receivers', 'Weather satellites'],
    companies: ['SpaceX', 'Hughes', 'Viasat', 'SES'],
    futureImpact: 'Next-gen satellites use dynamic polarization to reduce interference and increase capacity. Phased arrays can electronically adjust polarization in milliseconds.',
    color: '#3B82F6'
  },
  {
    icon: '📱',
    title: 'Smartphone Antenna Design',
    short: 'Mobile signal reliability',
    tagline: 'Why phone orientation affects signal',
    description: 'Smartphone antennas are designed for multiple polarizations because users hold phones at random angles. MIMO technology uses polarization diversity to improve reliability.',
    connection: 'When you rotate your phone, you\'re changing the antenna polarization relative to the cell tower. Multiple antennas with different polarizations ensure at least one always has good signal.',
    howItWorks: 'Modern phones have 4+ antennas with different polarizations. MIMO combines signals from all antennas, using the polarization differences to separate data streams and improve throughput.',
    stats: [
      { value: '4x', label: 'MIMO improvement', icon: '⚡' },
      { value: '4+', label: 'Antennas per phone', icon: '📡' },
      { value: '5G', label: 'Massive MIMO', icon: '📶' }
    ],
    examples: ['5G smartphones', 'WiFi routers', 'Bluetooth devices', 'Smart watches'],
    companies: ['Apple', 'Qualcomm', 'Samsung', 'MediaTek'],
    futureImpact: '6G will use even more polarization states and orbital angular momentum to achieve terabit wireless speeds in dense urban environments.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Polarized Microscopy',
    short: 'Crystal and fiber analysis',
    tagline: 'Seeing structures through polarization',
    description: 'Polarized light microscopy reveals internal structures in crystals, minerals, and biological samples that are invisible in normal light. It\'s essential in geology, materials science, and pathology.',
    connection: 'Materials with ordered molecular structures rotate polarization. By placing samples between crossed polarizers, we can see this rotation as brilliant colors that reveal crystal structure.',
    howItWorks: 'Light passes through a polarizer, then the sample (which may rotate polarization), then an analyzer (second polarizer). Only light whose polarization was rotated by the sample passes through.',
    stats: [
      { value: '0.1°', label: 'Rotation detection', icon: '🎯' },
      { value: '100x', label: 'Structure visibility', icon: '👁️' },
      { value: '1850', label: 'Year invented', icon: '📅' }
    ],
    examples: ['Mineral identification', 'Asbestos detection', 'Kidney stone analysis', 'Polymer characterization'],
    companies: ['Zeiss', 'Leica', 'Nikon', 'Olympus'],
    futureImpact: 'AI-enhanced polarized microscopy can automatically identify minerals and pathological crystals, speeding diagnosis and material analysis.',
    color: '#8B5CF6'
  },
  {
    icon: '🎬',
    title: '3D Cinema Technology',
    short: 'Immersive 3D movies',
    tagline: 'Separate images through polarization',
    description: 'Modern 3D movies use polarization to deliver different images to each eye. RealD 3D and IMAX 3D both rely on circular polarization for a comfortable 3D experience.',
    connection: 'Two projectors (or one alternating projector) send left and right eye images with opposite circular polarizations. Glasses with matching polarized lenses let each eye see only its intended image.',
    howItWorks: 'RealD uses circular polarization (clockwise for one eye, counterclockwise for the other). The silver screen preserves polarization. Tilting your head doesn\'t break the 3D effect like linear polarization would.',
    stats: [
      { value: '144Hz', label: 'Frame rate (per eye)', icon: '🎥' },
      { value: '35%', label: 'Light efficiency', icon: '💡' },
      { value: '$200B', label: 'Global cinema market', icon: '💰' }
    ],
    examples: ['RealD 3D', 'IMAX 3D', 'Dolby 3D', 'Home 3D TVs'],
    companies: ['RealD', 'IMAX', 'Dolby', 'Sony'],
    futureImpact: 'Glasses-free 3D displays using lenticular lenses and light field technology may eventually replace polarization-based 3D, but polarization remains dominant for large screens.',
    color: '#EF4444'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AntennaPolarizationRenderer: React.FC<AntennaPolarizationRendererProps> = ({ onGameEvent }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [antennaAngle, setAntennaAngle] = useState(0);
  const [waveAngle, setWaveAngle] = useState(0);
  const [handDistance, setHandDistance] = useState(100); // 0 = touching, 100 = far away
  const [showPolarPlot, setShowPolarPlot] = useState(false);

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

  // Calculate signal strength based on polarization alignment
  const signalStrength = useMemo(() => {
    // Malus's Law: I = I₀ × cos²(θ)
    const angleDiff = Math.abs(antennaAngle - waveAngle) % 180;
    const alignmentFactor = Math.cos((angleDiff * Math.PI) / 180) ** 2;

    // Hand absorption effect (reduces signal when close)
    const absorptionFactor = 0.3 + 0.7 * (handDistance / 100);

    return Math.round(alignmentFactor * absorptionFactor * 100);
  }, [antennaAngle, waveAngle, handDistance]);

  // RSSI value (realistic dBm range)
  const rssiValue = useMemo(() => {
    // Map 0-100% to -90 to -30 dBm
    return Math.round(-90 + (signalStrength / 100) * 60);
  }, [signalStrength]);

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
    accent: '#a855f7',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
    wave: '#3b82f6',
    antenna: '#f97316',
  };

  // Emit game events for AI coach
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'antenna_polarization',
      gameTitle: 'Antenna Polarization',
      details: { phase, signalStrength, antennaAngle, waveAngle, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, signalStrength, antennaAngle, waveAngle]);

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

  // Slider control with all required labels - MEETS NEW SLIDER UX REQUIREMENTS
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
        {/* LABEL - What this controls */}
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

        {/* CURRENT VALUE - Prominent display */}
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

        {/* IMPACT DISPLAY - Shows what changed */}
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

        {/* SLIDER - 48px touch target with touch-action: none */}
        <div style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
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
              borderRadius: '4px',
              touchAction: 'none',  // CRITICAL: Prevents scroll interference
              WebkitTapHighlightColor: 'transparent',
              background: 'transparent'
            }}
          />
        </div>

        {/* RANGE LABELS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: colors.textMuted,
          marginTop: '4px',
          fontWeight: 500
        }}>
          <span>{min}{unit}</span>
          <span style={{ color: colors.textSecondary }}>← Drag to adjust →</span>
          <span>{max}{unit}</span>
        </div>

        {/* HINT - What happens when you adjust */}
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

  // Explanation box with What/Why/Real-world
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
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: colors.primary,
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}>
          What Happens
        </div>
        <div style={{
          fontSize: isMobile ? '13px' : '14px',
          color: colors.textPrimary,
          lineHeight: 1.5
        }}>
          {whatHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.accent}15`,
        borderLeft: `4px solid ${colors.accent}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: colors.accent,
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}>
          Why It Happens
        </div>
        <div style={{
          fontSize: isMobile ? '13px' : '14px',
          color: colors.textPrimary,
          lineHeight: 1.5
        }}>
          {whyItHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.success}15`,
        borderLeft: `4px solid ${colors.success}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: colors.success,
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}>
          🌍 Real-World Example
        </div>
        <div style={{
          fontSize: isMobile ? '13px' : '14px',
          color: colors.textPrimary,
          lineHeight: 1.5
        }}>
          {realWorldExample}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // INTERACTIVE VISUALIZATION - POLARIZATION GRAPHIC (ENHANCED)
  // Realistic graphics with proper materials, lighting, and clear labeling
  // ============================================================================

  const PolarizationVisualization: React.FC<{
    showLabels?: boolean;
    showPolarPlot?: boolean;
    showHandEffect?: boolean;
  }> = ({ showLabels = true, showPolarPlot = false, showHandEffect = false }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 300 : 400;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2 - 10;

    // Generate polar plot points
    const polarPlotPoints = useMemo(() => {
      const points: string[] = [];
      for (let angle = 0; angle < 360; angle += 5) {
        const angleDiff = Math.abs(angle - waveAngle) % 180;
        const strength = Math.cos((angleDiff * Math.PI) / 180) ** 2;
        const radius = 30 + strength * 60;
        const x = centerX + radius * Math.cos((angle * Math.PI) / 180);
        const y = centerY + radius * Math.sin((angle * Math.PI) / 180);
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    }, [waveAngle, centerX, centerY]);

    // Wave animation
    const [waveOffset, setWaveOffset] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setWaveOffset(prev => (prev + 2) % 40);
      }, 50);
      return () => clearInterval(interval);
    }, []);

    // Signal strength color
    const signalColor = signalStrength > 70 ? colors.success :
      signalStrength > 40 ? colors.warning : colors.error;

    // Router dimensions
    const routerX = 15;
    const routerY = centerY - 35;
    const routerW = isMobile ? 50 : 60;
    const routerH = isMobile ? 70 : 80;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, margin: '0 auto', display: 'block' }}
      >
        {/* === DEFINITIONS - Gradients, Filters, Markers === */}
        <defs>
          {/* Metallic antenna gradient */}
          <linearGradient id="antennaMetalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="25%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="75%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Antenna base gradient (darker metal) */}
          <linearGradient id="antennaBaseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Router body gradient */}
          <linearGradient id="routerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="20%" stopColor="#1e293b" />
            <stop offset="80%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Router front panel */}
          <linearGradient id="routerPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* EM Wave gradient (energy effect) */}
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
          </linearGradient>

          {/* Signal glow */}
          <radialGradient id="signalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={signalColor} stopOpacity="1" />
            <stop offset="60%" stopColor={signalColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={signalColor} stopOpacity="0" />
          </radialGradient>

          {/* Hand skin gradient */}
          <radialGradient id="handGradient" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fcd5ce" />
            <stop offset="50%" stopColor="#f8b4a8" />
            <stop offset="100%" stopColor="#e8998d" />
          </radialGradient>

          {/* Glow filter for signals */}
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow filter */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.4" />
          </filter>

          {/* Arrow markers */}
          <marker id="waveArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,1 L8,4 L0,7 L2,4 Z" fill="#60a5fa" />
          </marker>
          <marker id="eFieldArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={colors.wave} />
          </marker>
        </defs>

        {/* === BACKGROUND === */}
        <rect width={svgWidth} height={svgHeight} fill={colors.bgSurface} rx="12" />

        {/* Subtle grid pattern for depth */}
        <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.bgElevated} strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width={svgWidth} height={svgHeight} fill="url(#gridPattern)" rx="12" />

        {/* === WIFI ROUTER (Signal Source) === */}
        <g filter="url(#dropShadow)">
          {/* Router body - 3D box effect */}
          <rect x={routerX} y={routerY} width={routerW} height={routerH} rx="4" fill="url(#routerGradient)" />

          {/* Router top edge highlight */}
          <rect x={routerX} y={routerY} width={routerW} height="3" rx="2" fill="#475569" />

          {/* Router front panel */}
          <rect x={routerX + 4} y={routerY + 8} width={routerW - 8} height={routerH - 20} rx="2" fill="url(#routerPanelGradient)" />

          {/* LED indicators */}
          <g>
            {/* Power LED */}
            <circle cx={routerX + 10} cy={routerY + 15} r="3" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* WiFi LED */}
            <circle cx={routerX + 20} cy={routerY + 15} r="3" fill={colors.wave}>
              <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
            {/* Internet LED */}
            <circle cx={routerX + 30} cy={routerY + 15} r="3" fill="#f59e0b" />
          </g>

          {/* Router antenna stubs */}
          <rect x={routerX + 8} y={routerY - 15} width="4" height="18" rx="2" fill="url(#antennaMetalGradient)" />
          <rect x={routerX + routerW - 12} y={routerY - 15} width="4" height="18" rx="2" fill="url(#antennaMetalGradient)" />

          {/* Ventilation slots */}
          {[0, 1, 2, 3].map(i => (
            <rect key={i} x={routerX + 8} y={routerY + routerH - 12 + i * 3} width={routerW - 16} height="1.5" rx="0.5" fill="#0f172a" opacity="0.6" />
          ))}
        </g>

        {/* Router label - positioned below to avoid overlap */}
        {showLabels && (
          <g>
            <rect x={routerX - 2} y={routerY + routerH + 6} width={routerW + 4} height="20" rx="4" fill="rgba(0,0,0,0.7)" />
            <text x={routerX + routerW / 2} y={routerY + routerH + 20} textAnchor="middle" fill={colors.wave} fontSize="9" fontWeight="600">
              Wi-Fi Router
            </text>
          </g>
        )}

        {/* === ELECTROMAGNETIC WAVE PROPAGATION === */}
        <g>
          {/* Wave propagation path (dashed) */}
          <line
            x1={routerX + routerW + 10}
            y1={centerY}
            x2={centerX - 60}
            y2={centerY}
            stroke={colors.textMuted}
            strokeWidth="1"
            strokeDasharray="6,4"
            opacity="0.4"
            markerEnd="url(#waveArrow)"
          />

          {/* Animated EM waves */}
          {[0, 1, 2, 3].map((i) => {
            const baseX = routerX + routerW + 25 + i * 45;
            const x = baseX - (waveOffset * 1.5);
            const validX = ((x - routerX - routerW - 15) % 180) + routerX + routerW + 15;
            if (validX > centerX - 55) return null;

            const waveAmplitude = 25;
            const eFieldY1 = centerY - waveAmplitude * Math.cos((waveAngle * Math.PI) / 180);
            const eFieldY2 = centerY + waveAmplitude * Math.cos((waveAngle * Math.PI) / 180);
            const eFieldX1 = validX - waveAmplitude * Math.sin((waveAngle * Math.PI) / 180);
            const eFieldX2 = validX + waveAmplitude * Math.sin((waveAngle * Math.PI) / 180);

            return (
              <g key={i} opacity={0.5 + i * 0.12}>
                {/* Electric field vector (E-field) */}
                <line
                  x1={validX}
                  y1={eFieldY1}
                  x2={validX}
                  y2={eFieldY2}
                  stroke={colors.wave}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  markerEnd="url(#eFieldArrow)"
                />

                {/* Magnetic field component (perpendicular, fainter) */}
                <line
                  x1={eFieldX1}
                  y1={centerY}
                  x2={eFieldX2}
                  y2={centerY}
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.4"
                />

                {/* Wave front circle */}
                <circle
                  cx={validX}
                  cy={centerY}
                  r="4"
                  fill={colors.wave}
                  opacity="0.6"
                />
              </g>
            );
          })}
        </g>

        {/* === POLAR PLOT (Signal pattern when enabled) === */}
        {showPolarPlot && (
          <g opacity="0.85">
            {/* Plot background circles */}
            <circle cx={centerX} cy={centerY} r={90} fill="none" stroke={colors.bgElevated} strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={centerX} cy={centerY} r={60} fill="none" stroke={colors.bgElevated} strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={centerX} cy={centerY} r={30} fill="none" stroke={colors.bgElevated} strokeWidth="1" strokeDasharray="4,4" />

            {/* Polar plot shape with gradient fill */}
            <polygon
              points={polarPlotPoints}
              fill={`${colors.primary}25`}
              stroke={colors.primary}
              strokeWidth="2"
              filter="url(#glowFilter)"
            />

            {/* Current antenna position marker */}
            <circle
              cx={centerX + (30 + signalStrength * 0.6) * Math.cos((antennaAngle * Math.PI) / 180)}
              cy={centerY + (30 + signalStrength * 0.6) * Math.sin((antennaAngle * Math.PI) / 180)}
              r="8"
              fill={signalColor}
              stroke="white"
              strokeWidth="2"
              filter="url(#glowFilter)"
            />
          </g>
        )}

        {/* === RECEIVING ANTENNA (Metallic, 3D) === */}
        <g transform={`rotate(${antennaAngle}, ${centerX}, ${centerY})`} filter="url(#dropShadow)">
          {/* Antenna base platform */}
          <ellipse cx={centerX} cy={centerY + 52} rx="22" ry="8" fill="url(#antennaBaseGradient)" />
          <ellipse cx={centerX} cy={centerY + 50} rx="22" ry="8" fill="#475569" />

          {/* Base cylinder */}
          <rect x={centerX - 12} y={centerY + 40} width="24" height="12" fill="url(#antennaBaseGradient)" />

          {/* Main antenna rod */}
          <rect
            x={centerX - 5}
            y={centerY - 55}
            width={10}
            height={95}
            rx="5"
            fill="url(#antennaMetalGradient)"
          />

          {/* Antenna tip ball */}
          <circle cx={centerX} cy={centerY - 55} r="8" fill="url(#antennaMetalGradient)" />
          <circle cx={centerX - 2} cy={centerY - 57} r="3" fill="rgba(255,255,255,0.6)" />

          {/* Signal reception indicator (glowing) */}
          <circle
            cx={centerX}
            cy={centerY - 35}
            r="10"
            fill="url(#signalGlow)"
            filter="url(#glowFilter)"
          />
          <circle
            cx={centerX}
            cy={centerY - 35}
            r="5"
            fill={signalColor}
          />

          {/* Antenna segments/joints */}
          <rect x={centerX - 6} y={centerY - 20} width="12" height="4" rx="2" fill="#64748b" />
          <rect x={centerX - 6} y={centerY + 10} width="12" height="4" rx="2" fill="#64748b" />
        </g>

        {/* === HAND EFFECT VISUALIZATION === */}
        {showHandEffect && handDistance < 100 && (
          <g>
            {/* Hand silhouette with realistic skin */}
            <ellipse
              cx={centerX + 85}
              cy={centerY}
              rx={35 - (handDistance * 0.25)}
              ry={50 - (handDistance * 0.35)}
              fill="url(#handGradient)"
              stroke="#d4a89a"
              strokeWidth="2"
              opacity={0.85 - handDistance * 0.006}
              filter="url(#dropShadow)"
            />

            {/* Finger hints */}
            {[0, 1, 2, 3].map(i => (
              <ellipse
                key={i}
                cx={centerX + 70 - (handDistance * 0.15) + i * 10}
                cy={centerY - 35 + (handDistance * 0.2)}
                rx={5 - (handDistance * 0.03)}
                ry={12 - (handDistance * 0.08)}
                fill="url(#handGradient)"
                opacity={0.7 - handDistance * 0.005}
              />
            ))}

            {/* Signal absorption waves */}
            {handDistance < 60 && (
              <g>
                <circle cx={centerX + 55} cy={centerY} r="15" fill="none" stroke={colors.error} strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" from="15" to="35" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={centerX + 55} cy={centerY} r="10" fill="none" stroke={colors.error} strokeWidth="1.5" opacity="0.4">
                  <animate attributeName="r" from="10" to="30" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
                </circle>
              </g>
            )}

            {/* Hand label - positioned to avoid overlap */}
            <g>
              <rect x={centerX + 55} y={centerY + 55} width="60" height="22" rx="4" fill="rgba(0,0,0,0.75)" />
              <text x={centerX + 85} y={centerY + 70} textAnchor="middle" fill={colors.warning} fontSize="10" fontWeight="600">
                Hand ({100 - handDistance}%)
              </text>
            </g>
          </g>
        )}

        {/* === INFORMATION PANELS (Labels positioned in corners) === */}

        {/* Signal Strength Meter - Top Right */}
        <g transform={`translate(${svgWidth - 85}, 12)`}>
          <rect x={0} y={0} width={75} height={85} rx="8" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />

          <text x={37} y={16} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600" letterSpacing="0.5">
            SIGNAL
          </text>

          {/* Modern signal bars */}
          <g transform="translate(8, 24)">
            {[0, 1, 2, 3, 4].map((i) => {
              const barHeight = 8 + i * 6;
              const threshold = (i + 1) * 20;
              const isActive = signalStrength >= threshold;
              return (
                <rect
                  key={i}
                  x={i * 13}
                  y={38 - barHeight}
                  width={10}
                  height={barHeight}
                  rx="2"
                  fill={isActive ? signalColor : colors.bgElevated}
                  opacity={isActive ? 1 : 0.3}
                />
              );
            })}
          </g>

          <text x={37} y={75} textAnchor="middle" fill={signalColor} fontSize="14" fontWeight="700">
            {signalStrength}%
          </text>
        </g>

        {/* RSSI Panel - Below Signal */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 85}, 105)`}>
            <rect x={0} y={0} width={75} height={40} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={37} y={14} textAnchor="middle" fill={colors.textMuted} fontSize="8" letterSpacing="0.5">
              RSSI
            </text>
            <text x={37} y={32} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">
              {rssiValue} dBm
            </text>
          </g>
        )}

        {/* Wave Polarization Panel - Bottom Left */}
        {showLabels && (
          <g transform={`translate(10, ${svgHeight - 55})`}>
            <rect x={0} y={0} width={105} height={45} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.bgElevated} strokeWidth="1" />
            <text x={8} y={14} fill={colors.wave} fontSize="9" fontWeight="600">
              Wave Angle
            </text>
            <text x={8} y={32} fill={colors.textPrimary} fontSize="15" fontWeight="700">
              {waveAngle}°
            </text>
            <text x={50} y={32} fill={colors.textMuted} fontSize="10">
              from vertical
            </text>
          </g>
        )}

        {/* Antenna Angle Panel - Below antenna */}
        {showLabels && (
          <g transform={`translate(${centerX - 50}, ${svgHeight - 55})`}>
            <rect x={0} y={0} width={100} height={45} rx="6" fill="rgba(15,23,42,0.95)" stroke={colors.antenna} strokeWidth="1" />
            <text x={50} y={14} textAnchor="middle" fill={colors.antenna} fontSize="9" fontWeight="600">
              Antenna
            </text>
            <text x={50} y={32} textAnchor="middle" fill={colors.textPrimary} fontSize="15" fontWeight="700">
              {antennaAngle}°
            </text>
          </g>
        )}

        {/* Alignment Status Badge - Bottom Right */}
        {showLabels && (
          <g transform={`translate(${svgWidth - 115}, ${svgHeight - 55})`}>
            <rect
              x={0}
              y={0}
              width={105}
              height={45}
              rx="6"
              fill={signalStrength > 70 ? 'rgba(34,197,94,0.15)' : signalStrength > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}
              stroke={signalColor}
              strokeWidth="2"
            />
            <text x={52} y={18} textAnchor="middle" fill={colors.textSecondary} fontSize="9" fontWeight="600">
              STATUS
            </text>
            <text x={52} y={36} textAnchor="middle" fill={signalColor} fontSize="12" fontWeight="700">
              {signalStrength > 70 ? '✓ ALIGNED' : signalStrength > 40 ? '~ PARTIAL' : '✗ MISALIGNED'}
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
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase' }}>
          Real-World Physics
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '40px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '20px',
        lineHeight: 1.2
      }}>
        Does Rotating an Antenna<br />Change Reception?
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        You're in the same spot, same distance from the router.
        But when you rotate your phone, the Wi-Fi bars change.
        <strong style={{ color: colors.primary }}> Why?</strong>
      </p>

      {/* Animated preview */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: isMobile ? '200px' : '250px',
        marginBottom: '32px',
        backgroundColor: colors.bgSurface,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <PolarizationVisualization showLabels={false} />
      </div>

      <p style={{
        fontSize: '14px',
        color: colors.textMuted,
        fontStyle: 'italic',
        marginBottom: '24px'
      }}>
        "The key to understanding radio reception is understanding polarization."
        <br />— Every RF Engineer
      </p>

      <Button onClick={goNext}>
        Begin Experiment →
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
          What happens when you rotate an antenna 90°?
        </h2>

        <p style={{
          color: colors.textSecondary,
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          Imagine a vertical radio wave traveling toward an antenna.
          If you rotate the antenna from vertical (0°) to horizontal (90°),
          what do you predict will happen to the signal strength?
        </p>

        {/* Visual setup */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.bgSurface,
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
              <div style={{ color: colors.textPrimary, fontWeight: 600 }}>Vertical Wave</div>
              <div style={{ color: colors.textMuted, fontSize: '12px' }}>Coming from router</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
              <div style={{ color: colors.textPrimary, fontWeight: 600 }}>Rotate 90°</div>
              <div style={{ color: colors.textMuted, fontSize: '12px' }}>Vertical → Horizontal</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>❓</div>
              <div style={{ color: colors.textPrimary, fontWeight: 600 }}>Signal?</div>
            </div>
          </div>
        </div>

        {/* Prediction options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'same', icon: '➡️', label: 'Signal stays the same', desc: 'Rotation doesn\'t affect radio waves' },
            { id: 'stronger', icon: '📈', label: 'Signal gets STRONGER', desc: 'Horizontal catches more wave' },
            { id: 'weaker', icon: '📉', label: 'Signal gets WEAKER or disappears', desc: 'Alignment matters for reception' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: prediction === opt.id ? `${colors.success}20` : colors.bgSurface,
                border: prediction === opt.id ? `2px solid ${colors.success}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '48px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary }}>{opt.label}</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</div>
                </div>
                {prediction === opt.id && (
                  <span style={{ marginLeft: 'auto', color: colors.success }}>✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {prediction && (
          <Button onClick={goNext} style={{ width: '100%' }}>
            Test My Prediction →
          </Button>
        )}
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
      {/* HEADER - Large, clear title with scenario */}
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
          ANTENNA POLARIZATION
        </h1>
        <p style={{
          fontSize: isMobile ? '14px' : '16px',
          color: colors.textSecondary,
          margin: 0,
          lineHeight: 1.4
        }}>
          Rotate the antenna to align with the incoming signal and maximize reception
        </p>
      </div>

      {/* Main scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* GRAPHIC SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgDeep
        }}>
          {/* Signal status - above graphic */}
          <div style={{
            maxWidth: '550px',
            margin: '0 auto 20px',
            padding: '14px 18px',
            background: colors.bgSurface,
            borderRadius: '12px',
            border: `2px solid ${signalStrength > 70 ? colors.success : signalStrength > 40 ? colors.warning : colors.error}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>📶 SIGNAL STRENGTH</span>
              <span style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 700,
                color: signalStrength > 70 ? colors.success : signalStrength > 40 ? colors.warning : colors.error
              }}>
                {signalStrength}% • {rssiValue} dBm
              </span>
            </div>
            <div style={{
              height: '10px',
              background: colors.bgElevated,
              borderRadius: '5px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                height: '100%',
                width: `${signalStrength}%`,
                background: signalStrength > 70 ? colors.success : signalStrength > 40 ? colors.warning : colors.error,
                borderRadius: '5px',
                transition: 'width 0.1s, background 0.2s'
              }} />
            </div>
            <div style={{
              fontSize: '13px',
              color: signalStrength > 70 ? colors.success : signalStrength > 40 ? colors.warning : colors.error,
              fontWeight: 600,
              textAlign: 'center'
            }}>
              {signalStrength > 70 ? '✓ EXCELLENT - Aligned!' :
               signalStrength > 40 ? '⚠️ PARTIAL - Some mismatch' :
               '✗ WEAK - Misaligned'}
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
            <div style={{ aspectRatio: isMobile ? '4/3' : '5/4' }}>
              <PolarizationVisualization showLabels={true} showPolarPlot={showPolarPlot} />
            </div>
          </div>

          {/* Toggle - below graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button
              onClick={() => setShowPolarPlot(!showPolarPlot)}
              style={{
                padding: '10px 20px',
                background: showPolarPlot ? colors.primary : colors.bgSurface,
                border: `1px solid ${showPolarPlot ? colors.primary : colors.bgElevated}`,
                borderRadius: '8px',
                color: showPolarPlot ? 'white' : colors.textSecondary,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 0.2s'
              }}
            >
              {showPolarPlot ? '📊 Hide' : '📊 Show'} Signal Pattern
            </button>
          </div>
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
                  Adjust angles to see how alignment affects signal
                </p>
              </div>
            </div>

            {/* Sliders */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px'
            }}>
              <SliderControl
                label="ANTENNA ROTATION"
                value={antennaAngle}
                min={0}
                max={180}
                unit="°"
                hint="Rotate receiver to align with incoming signal"
                onChange={setAntennaAngle}
                color={colors.antenna}
                showImpact={{
                  current: `${Math.abs(antennaAngle - waveAngle)}° mismatch`,
                  status: Math.abs(antennaAngle - waveAngle) % 180 < 30 ? 'Aligned' : Math.abs(antennaAngle - waveAngle) % 180 > 60 ? 'Misaligned' : 'Partial'
                }}
              />
              <SliderControl
                label="WAVE POLARIZATION"
                value={waveAngle}
                min={0}
                max={180}
                unit="°"
                hint="Change the incoming signal's polarization"
                onChange={setWaveAngle}
                color={colors.wave}
                showImpact={{
                  current: `cos²(${Math.abs(antennaAngle - waveAngle)}°)`,
                  status: `= ${(Math.cos((Math.abs(antennaAngle - waveAngle) * Math.PI) / 180) ** 2 * 100).toFixed(0)}%`
                }}
              />
            </div>

            {/* Quick alignment presets */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: colors.bgDeep,
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '10px', fontWeight: 600 }}>
                TRY THESE ALIGNMENTS:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: '✓ Aligned (0°)', a: 0, w: 0 },
                  { label: '45° Mismatch', a: 45, w: 0 },
                  { label: '✗ Perpendicular', a: 90, w: 0 },
                  { label: 'Both 45°', a: 45, w: 45 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setAntennaAngle(preset.a); setWaveAngle(preset.w); playSound('click'); }}
                    style={{
                      padding: '10px 14px',
                      background: antennaAngle === preset.a && waveAngle === preset.w ? colors.primary : colors.bgSurface,
                      border: `1px solid ${antennaAngle === preset.a && waveAngle === preset.w ? colors.primary : colors.bgElevated}`,
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
              whatHappens={`Antenna at ${antennaAngle}°, wave at ${waveAngle}° = ${signalStrength}% signal. ${signalStrength > 70 ? 'Excellent!' : signalStrength > 40 ? 'Partial coupling.' : 'Too weak.'}`}
              whyItHappens="EM waves oscillate in one direction (polarization). Antennas respond best when aligned with that direction. Malus's Law: I = I₀ × cos²(θ) - at 90° mismatch, signal = 0!"
              realWorldExample="This is why tilting your phone can improve Wi-Fi - the antenna may align better with the router's signal!"
            />
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
          background: prediction === 'weaker' ? `${colors.success}15` : `${colors.warning}15`,
          borderRadius: '12px',
          marginBottom: '24px',
          marginTop: '12px',
          border: `1px solid ${prediction === 'weaker' ? colors.success : colors.warning}40`
        }}>
          <h3 style={{ color: prediction === 'weaker' ? colors.success : colors.warning, marginBottom: '8px' }}>
            {prediction === 'weaker' ? '✓ You predicted correctly!' : 'The answer was: Signal gets WEAKER'}
          </h3>
          <p style={{ color: colors.textSecondary, margin: 0 }}>
            When the antenna is rotated 90° away from the wave polarization, signal strength drops to nearly zero.
          </p>
        </div>

        <h2 style={{ fontSize: isMobile ? '22px' : '26px', color: colors.textPrimary, marginBottom: '20px' }}>
          Key Concept: Polarization
        </h2>

        {/* Key takeaways */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { emoji: '〰️', title: 'EM Waves Oscillate in One Direction', desc: 'The electric field of a radio wave vibrates along a specific axis - this is its "polarization"' },
            { emoji: '📐', title: 'Antennas Have Preferred Direction', desc: 'A straight antenna responds best to waves oscillating parallel to its length' },
            { emoji: '📊', title: 'Malus\'s Law Governs Coupling', desc: 'Signal strength = cos²(angle difference). At 90°, cos²(90°) = 0 → no signal!' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              background: colors.bgSurface,
              borderRadius: '12px',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '28px' }}>{item.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: colors.textMuted, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Why it matters */}
        <div style={{
          padding: '20px',
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`,
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: colors.primary, marginBottom: '12px' }}>💡 Why This Matters</h3>
          <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Understanding polarization explains everyday experiences: why holding your phone differently affects reception,
            why some antennas are vertical and others horizontal, and why professionals use circular polarization for satellites
            (so orientation doesn't matter in space!).
          </p>
        </div>

        <Button onClick={goNext} style={{ width: '100%' }}>
          Next: The Twist →
        </Button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: isMobile ? '16px' : '32px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 5 of 10 • New Challenge
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          What happens when you put your hand near the antenna?
        </h2>

        <p style={{
          color: colors.textSecondary,
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          Even with perfect polarization alignment, touching or holding near your phone's antenna
          can change the signal. What do you predict happens?
        </p>

        {/* Visual */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.bgSurface,
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📱✋</div>
          <div style={{ color: colors.textMuted }}>Perfect alignment... but your hand is touching the antenna area</div>
        </div>

        {/* Prediction options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'nothing', icon: '➖', label: 'Nothing happens', desc: 'Human body doesn\'t affect radio waves' },
            { id: 'stronger', icon: '📈', label: 'Signal improves', desc: 'Body acts like an extended antenna' },
            { id: 'weaker', icon: '📉', label: 'Signal weakens', desc: 'Body absorbs or detunes the signal' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: twistPrediction === opt.id ? `${colors.warning}20` : colors.bgSurface,
                border: twistPrediction === opt.id ? `2px solid ${colors.warning}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '48px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary }}>{opt.label}</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</div>
                </div>
                {twistPrediction === opt.id && (
                  <span style={{ marginLeft: 'auto', color: colors.warning }}>✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <Button onClick={goNext} style={{ width: '100%' }}>
            Test It →
          </Button>
        )}
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
          BODY ABSORPTION EFFECT
        </h1>
        <p style={{
          fontSize: isMobile ? '14px' : '16px',
          color: colors.textSecondary,
          margin: 0
        }}>
          See how your hand near the antenna affects signal strength
        </p>
      </div>

      {/* Main scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* GRAPHIC SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgDeep
        }}>
          {/* Absorption meter - above graphic */}
          <div style={{
            maxWidth: '550px',
            margin: '0 auto 20px',
            padding: '14px 18px',
            background: colors.bgSurface,
            borderRadius: '12px',
            border: `2px solid ${handDistance < 30 ? colors.error : handDistance < 60 ? colors.warning : colors.success}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>🖐️ BODY ABSORPTION</span>
              <span style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 700,
                color: handDistance < 30 ? colors.error : handDistance < 60 ? colors.warning : colors.success
              }}>
                {Math.round((1 - (0.3 + 0.7 * (handDistance / 100))) * 100)}% absorbed
              </span>
            </div>
            <div style={{ height: '10px', background: colors.bgElevated, borderRadius: '5px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                height: '100%',
                width: `${(1 - (0.3 + 0.7 * (handDistance / 100))) * 100}%`,
                background: handDistance < 30 ? colors.error : handDistance < 60 ? colors.warning : colors.success,
                transition: 'width 0.1s'
              }} />
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: handDistance < 30 ? colors.error : handDistance < 60 ? colors.warning : colors.success,
              textAlign: 'center'
            }}>
              {handDistance < 30 ? '✗ Heavy blocking' : handDistance < 60 ? '⚠️ Moderate effect' : '✓ Minimal absorption'}
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
            <div style={{ aspectRatio: isMobile ? '4/3' : '5/4' }}>
              <PolarizationVisualization showLabels={true} showHandEffect={true} />
            </div>
          </div>

          {/* Alignment button */}
          {Math.abs(antennaAngle - waveAngle) > 20 && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                onClick={() => { setAntennaAngle(waveAngle); playSound('click'); }}
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
                🎯 Align Antenna (for cleaner absorption test)
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
                  Move hand closer to see absorption effect
                </p>
              </div>
            </div>

            <SliderControl
              label="HAND PROXIMITY"
              value={100 - handDistance}
              min={0}
              max={100}
              unit="%"
              hint="Moving closer blocks more signal - like the 'death grip' on phones!"
              onChange={(v) => setHandDistance(100 - v)}
              color={colors.warning}
              showImpact={{
                current: `${100 - handDistance}% close`,
                status: handDistance < 30 ? 'Very Close' : handDistance < 60 ? 'Near' : 'Far Away'
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
                TRY THESE POSITIONS:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Far away', dist: 100 },
                  { label: 'Arm\'s length', dist: 70 },
                  { label: 'Near phone', dist: 40 },
                  { label: '"Death grip"', dist: 10 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setHandDistance(preset.dist); playSound('click'); }}
                    style={{
                      padding: '10px 14px',
                      background: handDistance === preset.dist ? colors.warning : colors.bgSurface,
                      border: `1px solid ${handDistance === preset.dist ? colors.warning : colors.bgElevated}`,
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
              whatHappens={`Hand ${100 - handDistance}% close: ${Math.round((1 - (0.3 + 0.7 * (handDistance / 100))) * 100)}% signal absorbed. ${handDistance < 30 ? 'Major loss!' : handDistance < 60 ? 'Noticeable effect.' : 'Minimal impact.'}`}
              whyItHappens="Human body is ~60% water, which absorbs radio waves. Your hand also 'detunes' the antenna, shifting its optimal frequency."
              realWorldExample="This is the 'death grip' problem! Certain phone holds block antennas. Modern phones use multiple antennas to mitigate this."
            />
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
          <Button onClick={goNext}>Continue →</Button>
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
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>Step 7 of 10 • Deep Insight</span>

        {/* Prediction result */}
        <div style={{
          padding: '16px',
          background: twistPrediction === 'weaker' ? `${colors.success}15` : `${colors.warning}15`,
          borderRadius: '12px',
          marginBottom: '24px',
          marginTop: '12px'
        }}>
          <h3 style={{ color: twistPrediction === 'weaker' ? colors.success : colors.warning, marginBottom: '8px' }}>
            {twistPrediction === 'weaker' ? '✓ Correct!' : 'Answer: Signal weakens'}
          </h3>
          <p style={{ color: colors.textSecondary, margin: 0 }}>
            Your body absorbs RF energy AND changes the antenna's electrical properties.
          </p>
        </div>

        <h2 style={{ fontSize: isMobile ? '22px' : '26px', color: colors.textPrimary, marginBottom: '20px' }}>
          Two Effects Combined
        </h2>

        {/* Comparison cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '20px',
            background: colors.bgSurface,
            borderRadius: '12px',
            borderTop: `4px solid ${colors.primary}`
          }}>
            <h4 style={{ color: colors.primary, marginBottom: '12px' }}>1. Polarization Mismatch</h4>
            <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li>Wave and antenna misaligned</li>
              <li>Less energy couples in</li>
              <li>Follows cos²(θ) law</li>
              <li>Can drop to 0% at 90°</li>
            </ul>
          </div>
          <div style={{
            padding: '20px',
            background: colors.bgSurface,
            borderRadius: '12px',
            borderTop: `4px solid ${colors.warning}`
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px' }}>2. Body Absorption</h4>
            <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li>Water absorbs RF energy</li>
              <li>Changes antenna impedance</li>
              <li>Shifts resonant frequency</li>
              <li>Can reduce signal 30-70%</li>
            </ul>
          </div>
        </div>

        {/* Key insight */}
        <div style={{
          padding: '20px',
          background: `linear-gradient(135deg, ${colors.accent}15, ${colors.primary}15)`,
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🔑 Key Insight</h3>
          <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: colors.textPrimary }}>Signal quality depends on BOTH polarization alignment AND environmental factors.</strong>
            {' '}Engineers must design antennas considering how they'll be held, where bodies will be,
            and what polarization the transmitter uses. It's a complex optimization problem!
          </p>
        </div>

        <Button onClick={goNext} style={{ width: '100%' }}>
          See Real-World Applications →
        </Button>
      </div>
    </div>
  );

  // Transfer applications data
  // RICH TRANSFER APPLICATIONS - Meeting new evaluation requirements
  // Each app has: diagram, stats, howItWorks, examples, whyItMatters
  const transferApps = [
    {
      title: 'Smartphone Antenna Design',
      icon: '📱',
      tagline: 'Why Your Phone Works No Matter How You Hold It',
      physicsConnection: 'Phones use multiple antennas at different angles so at least one always aligns with incoming signals, applying the same cos²(θ) principle you just learned.',
      stats: [
        { value: '4-8', label: 'Antennas per phone', icon: '📶' },
        { value: '90%', label: 'Signal recovery with diversity', icon: '📈' },
        { value: '<50ms', label: 'Antenna switch time', icon: '⚡' }
      ],
      howItWorks: {
        simple: 'Multiple antennas at different orientations let the phone switch to whichever has the best signal at any moment.',
        steps: [
          'Phone contains 4-8 antennas for cellular, Wi-Fi, Bluetooth, GPS',
          'Antennas are placed at different angles around the phone edges',
          'Software continuously monitors signal strength on each antenna',
          'When one antenna loses signal (wrong orientation), it switches to another',
          'Switch happens in under 50 milliseconds - you never notice'
        ]
      },
      examples: [
        { name: 'iPhone "Death Grip" Fix', desc: 'Apple added multiple antennas after iPhone 4 antenna issues', why: 'Diversity overcomes single-antenna orientation problems' },
        { name: 'Samsung Galaxy Antennas', desc: 'Antennas integrated into metal frame at multiple positions', why: 'Allows slim design while maintaining coverage' },
        { name: '5G MIMO Arrays', desc: '5G phones use 4x4 MIMO with polarization diversity', why: 'Doubles data rates by using both polarizations' },
        { name: 'Gaming Phone Design', desc: 'Special antenna placement for landscape gaming grip', why: 'Ensures signal even when hands cover phone edges' }
      ],
      whyItMatters: {
        personal: 'This is why your phone maintains calls even when you rotate it or hold it differently. Engineers solved the polarization problem so you don\'t have to think about it.',
        broader: '5G networks rely heavily on polarization - your phone uses BOTH vertical and horizontal polarizations simultaneously to double data speeds.'
      },
      color: colors.primary
    },
    {
      title: 'Satellite TV Reception',
      icon: '🛰️',
      tagline: 'Why Your Dish Installer Adjusts That Small Device',
      physicsConnection: 'The LNB (Low Noise Block) on your satellite dish must rotate to match the satellite\'s signal polarization - exactly like aligning the antennas in your simulation.',
      stats: [
        { value: '99%', label: 'Signal loss if perpendicular', icon: '📉' },
        { value: '2x', label: 'Channels with dual polarity', icon: '📺' },
        { value: '36,000 km', label: 'Signal travel distance', icon: '🛰️' }
      ],
      howItWorks: {
        simple: 'Satellites transmit signals with specific polarizations. Your dish\'s LNB must rotate to match, or you get no picture.',
        steps: [
          'Satellite transmits signal with known polarization (H or V)',
          'Signal travels 36,000 km from geostationary orbit',
          'Dish reflects signal to LNB at focal point',
          'LNB probe must align within ±5° of signal polarization',
          'Installer uses signal meter to find optimal "LNB skew" angle'
        ]
      },
      examples: [
        { name: 'DirecTV Installation', desc: 'Installers adjust LNB skew based on your geographic location', why: 'Different locations see satellite at different angles' },
        { name: 'Dual-Band Reception', desc: 'Single LNB receives both H and V polarized channels', why: 'Two probes at 90° capture both polarizations' },
        { name: 'Rain Fade', desc: 'Heavy rain weakens signal by depolarizing it randomly', why: 'Water droplets rotate wave polarization' },
        { name: 'Marine Satellite TV', desc: 'Moving boats need automatic polarization tracking', why: 'System continuously adjusts as boat orientation changes' }
      ],
      whyItMatters: {
        personal: 'That\'s why your installer spent time carefully adjusting the small device on your dish. A few degrees off = no picture.',
        broader: 'Polarization doubling enables hundreds of HD channels without needing more satellites. Half use vertical, half use horizontal.'
      },
      color: colors.success
    },
    {
      title: 'Wi-Fi Router Optimization',
      icon: '📡',
      tagline: 'Why Router Antenna Position Actually Matters',
      physicsConnection: 'Router antennas are typically vertical, but laptops are horizontal. This 90° mismatch loses signal - the same cos²(90°)=0 you saw in the simulation.',
      stats: [
        { value: '50%', label: 'Signal loss at 45° mismatch', icon: '📉' },
        { value: '3dB', label: 'Typical polarization loss', icon: '📊' },
        { value: '2.4/5 GHz', label: 'Both bands affected equally', icon: '📶' }
      ],
      howItWorks: {
        simple: 'Your router\'s antenna orientation affects how well different devices connect based on how they\'re positioned.',
        steps: [
          'Most router antennas are vertically polarized (standing up)',
          'Phones held vertically get best signal (matched polarization)',
          'Laptops lying flat have horizontal antennas = mismatch',
          'Tilting antennas 45° serves both orientations partially',
          'Mesh systems use multiple orientations to cover all angles'
        ]
      },
      examples: [
        { name: 'Adjustable Antenna Routers', desc: 'Gaming routers let you angle antennas differently', why: 'One vertical for phones, one horizontal for laptops' },
        { name: 'Enterprise Access Points', desc: 'Business APs have internal antennas at 45° angles', why: 'Compromises to serve all device orientations' },
        { name: 'Mesh Wi-Fi Systems', desc: 'Multiple units with different orientations throughout home', why: 'At least one unit aligns with each device' },
        { name: 'Laptop Wi-Fi Placement', desc: 'Laptop antennas are in screen bezel (horizontal when open)', why: 'This is why signal improves when you open laptop lid' }
      ],
      whyItMatters: {
        personal: 'Try this: tilt your router\'s antennas - one vertical, one at 45°. You may notice better coverage for all your devices.',
        broader: 'Wi-Fi 6E and Wi-Fi 7 use polarization diversity to double speeds by sending different data on each polarization simultaneously.'
      },
      color: colors.warning
    },
    {
      title: 'Radio Astronomy',
      icon: '🔭',
      tagline: 'How Scientists "See" Magnetic Fields in Space',
      physicsConnection: 'Cosmic radio waves have polarization that reveals magnetic field directions. Astronomers measure polarization angle just like your simulation measures antenna alignment.',
      stats: [
        { value: '27', label: 'Antennas in VLA array', icon: '📡' },
        { value: '10⁻²⁶ W', label: 'Detectable signal power', icon: '⚡' },
        { value: '1°', label: 'Polarization angle precision', icon: '🎯' }
      ],
      howItWorks: {
        simple: 'Light and radio waves from space carry information about magnetic fields in their polarization - astronomers decode this to map invisible fields.',
        steps: [
          'Charged particles spiral along magnetic field lines',
          'Spiraling produces "synchrotron radiation" - polarized radio waves',
          'Polarization direction is perpendicular to magnetic field',
          'Telescopes measure polarization angle across the sky',
          'Maps reveal magnetic field structure in galaxies and around black holes'
        ]
      },
      examples: [
        { name: 'Event Horizon Telescope', desc: 'Imaged magnetic fields around M87 black hole using polarization', why: 'Revealed how black holes launch jets of matter' },
        { name: 'Pulsar Studies', desc: 'Rapidly rotating neutron stars with intense polarized signals', why: 'Polarization timing reveals star rotation and magnetic poles' },
        { name: 'Cosmic Microwave Background', desc: 'Polarization patterns reveal universe at 380,000 years old', why: 'Searching for gravitational wave signatures from Big Bang' },
        { name: 'Solar Radio Bursts', desc: 'Sun\'s flares are highly polarized radio emissions', why: 'Polarization changes predict solar storm impacts on Earth' }
      ],
      whyItMatters: {
        personal: 'The same physics affecting your phone signal lets us understand black holes billions of light-years away.',
        broader: 'Detecting polarization in the cosmic microwave background could confirm cosmic inflation - a Nobel Prize-worthy discovery.'
      },
      color: colors.accent
    }
  ];

  // RICH TRANSFER PHASE - Detailed applications with diagrams, stats, how-it-works, examples
  const renderTransfer = () => {
    const app = transferApps[activeApp];

    // Application-specific diagram SVG
    const ApplicationDiagram = () => {
      const diagrams: Record<number, JSX.Element> = {
        0: ( // Smartphone
          <svg viewBox="0 0 300 200" width="100%" height="auto" style={{ maxHeight: '200px' }}>
            {/* Phone outline */}
            <rect x="110" y="30" width="80" height="140" rx="10" fill={colors.bgElevated} stroke={colors.textMuted} strokeWidth="2"/>
            {/* Screen */}
            <rect x="118" y="45" width="64" height="110" rx="4" fill={colors.bgDeep}/>
            {/* Antennas at different positions */}
            <line x1="115" y1="50" x2="115" y2="70" stroke={colors.primary} strokeWidth="3" strokeLinecap="round"/>
            <text x="95" y="60" fontSize="8" fill={colors.textMuted}>Ant 1</text>
            <line x1="185" y1="80" x2="185" y2="100" stroke={colors.success} strokeWidth="3" strokeLinecap="round"/>
            <text x="190" y="95" fontSize="8" fill={colors.textMuted}>Ant 2</text>
            <line x1="130" y1="165" x2="150" y2="165" stroke={colors.warning} strokeWidth="3" strokeLinecap="round"/>
            <text x="125" y="180" fontSize="8" fill={colors.textMuted}>Ant 3</text>
            <line x1="170" y1="35" x2="190" y2="35" stroke={colors.accent} strokeWidth="3" strokeLinecap="round"/>
            <text x="175" y="25" fontSize="8" fill={colors.textMuted}>Ant 4</text>
            {/* Signal waves */}
            <path d="M 50 100 Q 70 90, 90 100 Q 110 110, 115 100" stroke={colors.primary} strokeWidth="1.5" fill="none" strokeDasharray="4"/>
            <text x="20" y="90" fontSize="10" fill={colors.textSecondary}>Incoming</text>
            <text x="20" y="102" fontSize="10" fill={colors.textSecondary}>Signal</text>
            {/* Label */}
            <text x="150" y="195" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">4 Antennas at Different Angles</text>
          </svg>
        ),
        1: ( // Satellite
          <svg viewBox="0 0 300 200" width="100%" height="auto" style={{ maxHeight: '200px' }}>
            {/* Satellite */}
            <ellipse cx="150" cy="25" rx="30" ry="10" fill={colors.bgElevated}/>
            <rect x="145" y="18" width="10" height="15" fill={colors.textMuted}/>
            <line x1="120" y1="25" x2="100" y2="25" stroke={colors.primary} strokeWidth="2"/>
            <line x1="180" y1="25" x2="200" y2="25" stroke={colors.primary} strokeWidth="2"/>
            <text x="150" y="12" fontSize="9" fill={colors.textSecondary} textAnchor="middle">36,000 km</text>
            {/* Signal beam with polarization */}
            <path d="M 150 35 L 150 130" stroke={colors.wave} strokeWidth="2" strokeDasharray="5,3"/>
            <line x1="140" y1="60" x2="160" y2="60" stroke={colors.primary} strokeWidth="2"/>
            <line x1="140" y1="80" x2="160" y2="80" stroke={colors.primary} strokeWidth="2"/>
            <line x1="140" y1="100" x2="160" y2="100" stroke={colors.primary} strokeWidth="2"/>
            <text x="170" y="82" fontSize="9" fill={colors.textMuted}>Polarized</text>
            {/* Dish */}
            <path d="M 120 160 Q 150 130, 180 160" stroke={colors.textPrimary} strokeWidth="3" fill="none"/>
            <circle cx="150" cy="145" r="6" fill={colors.warning}/>
            <text x="165" y="148" fontSize="9" fill={colors.warning}>LNB</text>
            <line x1="150" y1="151" x2="150" y2="170" stroke={colors.textMuted} strokeWidth="2"/>
            {/* LNB rotation indicator */}
            <path d="M 142 145 A 8 8 0 0 1 158 145" stroke={colors.success} strokeWidth="2" fill="none"/>
            <text x="130" y="185" fontSize="9" fill={colors.success}>↻ Must align</text>
            <text x="150" y="195" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">LNB Rotates to Match Signal Polarization</text>
          </svg>
        ),
        2: ( // Wi-Fi Router
          <svg viewBox="0 0 300 200" width="100%" height="auto" style={{ maxHeight: '200px' }}>
            {/* Router body */}
            <rect x="100" y="100" width="100" height="30" rx="5" fill={colors.bgElevated}/>
            {/* Vertical antenna */}
            <line x1="120" y1="100" x2="120" y2="50" stroke={colors.textPrimary} strokeWidth="4" strokeLinecap="round"/>
            <text x="100" y="45" fontSize="9" fill={colors.success}>Vertical</text>
            {/* Tilted antenna */}
            <line x1="180" y1="100" x2="200" y2="55" stroke={colors.textPrimary} strokeWidth="4" strokeLinecap="round"/>
            <text x="185" y="45" fontSize="9" fill={colors.warning}>45° tilt</text>
            {/* Phone (vertical) - good signal */}
            <rect x="50" y="140" width="25" height="45" rx="3" fill={colors.bgSurface} stroke={colors.success} strokeWidth="2"/>
            <text x="62" y="200" fontSize="9" fill={colors.success} textAnchor="middle">Phone ✓</text>
            {/* Laptop (horizontal) - worse signal */}
            <rect x="230" y="160" width="50" height="30" rx="3" fill={colors.bgSurface} stroke={colors.warning} strokeWidth="2"/>
            <rect x="235" y="155" width="40" height="5" rx="1" fill={colors.bgElevated}/>
            <text x="255" y="200" fontSize="9" fill={colors.warning} textAnchor="middle">Laptop ⚠️</text>
            {/* Signal waves */}
            <circle cx="150" cy="85" r="20" stroke={colors.primary} strokeWidth="1" fill="none" opacity="0.5"/>
            <circle cx="150" cy="85" r="35" stroke={colors.primary} strokeWidth="1" fill="none" opacity="0.3"/>
            <circle cx="150" cy="85" r="50" stroke={colors.primary} strokeWidth="1" fill="none" opacity="0.2"/>
            <text x="150" y="20" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">Antenna Orientation Affects Different Devices</text>
          </svg>
        ),
        3: ( // Radio Astronomy
          <svg viewBox="0 0 300 200" width="100%" height="auto" style={{ maxHeight: '200px' }}>
            {/* Black hole */}
            <circle cx="60" cy="100" r="20" fill={colors.bgDeep} stroke={colors.accent} strokeWidth="2"/>
            <ellipse cx="60" cy="100" rx="40" ry="10" stroke={colors.warning} strokeWidth="1" fill="none" transform="rotate(-20, 60, 100)"/>
            <text x="60" y="145" fontSize="9" fill={colors.textSecondary} textAnchor="middle">Black Hole</text>
            {/* Polarized radio waves */}
            <line x1="85" y1="90" x2="180" y2="70" stroke={colors.wave} strokeWidth="1" strokeDasharray="5,3"/>
            <line x1="95" y1="95" x2="100" y2="85" stroke={colors.primary} strokeWidth="2"/>
            <line x1="115" y1="90" x2="120" y2="80" stroke={colors.primary} strokeWidth="2"/>
            <line x1="135" y1="85" x2="140" y2="75" stroke={colors.primary} strokeWidth="2"/>
            <line x1="155" y1="80" x2="160" y2="70" stroke={colors.primary} strokeWidth="2"/>
            <text x="140" y="60" fontSize="9" fill={colors.primary}>Polarized Radio Waves</text>
            {/* Telescope dish */}
            <path d="M 210 100 Q 240 60, 270 100" stroke={colors.textPrimary} strokeWidth="3" fill="none"/>
            <circle cx="240" cy="85" r="5" fill={colors.success}/>
            <line x1="240" y1="90" x2="240" y2="140" stroke={colors.textMuted} strokeWidth="3"/>
            <rect x="220" y="140" width="40" height="20" fill={colors.bgElevated}/>
            <text x="240" y="175" fontSize="9" fill={colors.textSecondary} textAnchor="middle">Radio Telescope</text>
            {/* Magnetic field lines */}
            <path d="M 40 80 Q 60 60, 80 80" stroke={colors.accent} strokeWidth="1" fill="none" strokeDasharray="2"/>
            <path d="M 40 120 Q 60 140, 80 120" stroke={colors.accent} strokeWidth="1" fill="none" strokeDasharray="2"/>
            <text x="150" y="195" fontSize="11" fill={colors.textPrimary} textAnchor="middle" fontWeight="600">Polarization Reveals Magnetic Field Direction</text>
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
            Where Polarization Matters
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
                    emitGameEvent('app_changed', {
                      appNumber: i + 1,
                      appTitle: appItem.title,
                      appTagline: appItem.tagline
                    });
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

            {/* Physics Connection Banner */}
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

            {/* CONTINUE BUTTON at end of content */}
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
                  emitGameEvent('app_changed', {
                    appNumber: nextIndex + 1,
                    appTitle: transferApps[nextIndex].title
                  });
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
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {transferApps.map((_, i) => (
                <div key={i} style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: completedApps[i] ? colors.success :
                    i === activeApp ? colors.primary : colors.bgElevated
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
      question: "What is 'polarization' of an electromagnetic wave?",
      options: [
        { text: "Its frequency", correct: false },
        { text: "The direction its electric field oscillates", correct: true },
        { text: "Its speed", correct: false },
        { text: "Its wavelength", correct: false }
      ],
      explanation: "Polarization refers to the orientation of the electric field oscillation as the wave travels."
    },
    {
      question: "What happens when you rotate a receiving antenna 90° away from the wave's polarization?",
      options: [
        { text: "Signal doubles", correct: false },
        { text: "Signal stays the same", correct: false },
        { text: "Signal drops to nearly zero", correct: true },
        { text: "Signal becomes noise", correct: false }
      ],
      explanation: "At 90° mismatch, cos²(90°) = 0, so theoretically no signal couples into the antenna."
    },
    {
      question: "What law describes how signal strength varies with polarization angle?",
      options: [
        { text: "Ohm's Law", correct: false },
        { text: "Malus's Law", correct: true },
        { text: "Newton's Law", correct: false },
        { text: "Faraday's Law", correct: false }
      ],
      explanation: "Malus's Law: I = I₀ × cos²(θ), where θ is the angle between polarizations."
    },
    {
      question: "Why does holding your phone near the antenna area weaken the signal?",
      options: [
        { text: "Your hand is magnetic", correct: false },
        { text: "Body absorbs RF and detunes antenna", correct: true },
        { text: "Phones don't like being touched", correct: false },
        { text: "It blocks light", correct: false }
      ],
      explanation: "Human body (mostly water) absorbs radio frequencies AND changes the antenna's electrical properties."
    },
    {
      question: "What type of polarization do GPS satellites use?",
      options: [
        { text: "Linear vertical", correct: false },
        { text: "Linear horizontal", correct: false },
        { text: "Circular polarization", correct: true },
        { text: "No polarization", correct: false }
      ],
      explanation: "Circular polarization works at any receiving angle - essential since phones rotate constantly."
    },
    {
      question: "Why do modern smartphones have multiple antennas?",
      options: [
        { text: "For decoration", correct: false },
        { text: "To use antenna diversity and overcome orientation issues", correct: true },
        { text: "They're cheaper", correct: false },
        { text: "Government requirement", correct: false }
      ],
      explanation: "Multiple antennas at different orientations allow switching to whichever has best signal."
    },
    {
      question: "If a router antenna is vertical, what device orientation loses the most signal?",
      options: [
        { text: "Vertical phone", correct: false },
        { text: "Horizontal laptop", correct: true },
        { text: "Tilted tablet", correct: false },
        { text: "All equal", correct: false }
      ],
      explanation: "Horizontal orientation is 90° from vertical - maximum polarization mismatch."
    },
    {
      question: "What did the 'death grip' problem on some phones demonstrate?",
      options: [
        { text: "Phones are fragile", correct: false },
        { text: "Body proximity affects antenna performance", correct: true },
        { text: "Users hold phones wrong", correct: false },
        { text: "Software bugs", correct: false }
      ],
      explanation: "Touching the antenna area changed its impedance and resonant frequency, degrading signal."
    },
    {
      question: "In satellite TV, why is dish alignment so critical?",
      options: [
        { text: "Aesthetic reasons", correct: false },
        { text: "To match polarization and point at satellite", correct: true },
        { text: "To avoid rain", correct: false },
        { text: "It's not critical", correct: false }
      ],
      explanation: "Dish must point at satellite AND have correct polarization to receive the linearly-polarized signal."
    },
    {
      question: "How do enterprise Wi-Fi access points handle polarization diversity?",
      options: [
        { text: "They don't", correct: false },
        { text: "Using antennas at multiple angles (e.g., 45°)", correct: true },
        { text: "By using only one frequency", correct: false },
        { text: "Through software only", correct: false }
      ],
      explanation: "Antennas at different angles serve both vertically and horizontally oriented devices better."
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
        <div style={{ flex: 1, maxWidth: '650px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ color: colors.textMuted }}>Question {currentQuestion + 1}/10</span>
            <span style={{ color: colors.success, fontWeight: 600 }}>Score: {testScore}</span>
          </div>

          <h2 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: colors.textPrimary,
            marginBottom: '24px',
            lineHeight: 1.4
          }}>
            {q.question}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {q.options.map((opt, i) => {
              const isSelected = testAnswers[currentQuestion] === i;
              const isCorrect = opt.correct;
              const showResult = answered;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (answered) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = i;
                    setTestAnswers(newAnswers);
                    if (isCorrect) {
                      setTestScore(s => s + 1);
                      playSound('success');
                    } else {
                      playSound('failure');
                    }
                  }}
                  disabled={answered}
                  style={{
                    padding: '16px',
                    background: showResult
                      ? isCorrect ? `${colors.success}20` : isSelected ? `${colors.error}20` : colors.bgSurface
                      : isSelected ? colors.primary : colors.bgSurface,
                    border: showResult && isCorrect ? `2px solid ${colors.success}` :
                      showResult && isSelected && !isCorrect ? `2px solid ${colors.error}` : `1px solid ${colors.bgElevated}`,
                    borderRadius: '12px',
                    textAlign: 'left',
                    color: colors.textPrimary,
                    cursor: answered ? 'default' : 'pointer',
                    fontSize: '15px',
                    minHeight: '48px'
                  }}
                >
                  {opt.text} {showResult && isCorrect && ' ✓'} {showResult && isSelected && !isCorrect && ' ✗'}
                </button>
              );
            })}
          </div>

          {answered && (
            <div style={{
              padding: '14px',
              background: `${colors.accent}15`,
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
                <strong style={{ color: colors.accent }}>Explanation:</strong> {q.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', maxWidth: '650px', margin: '0 auto', width: '100%' }}>
          {currentQuestion > 0 && (
            <Button variant="ghost" onClick={() => setCurrentQuestion(c => c - 1)}>← Back</Button>
          )}
          <div style={{ flex: 1 }} />
          {currentQuestion < 9 ? (
            <Button onClick={() => setCurrentQuestion(c => c + 1)} disabled={!answered}>
              Next Question →
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!answered}>
              See Results →
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const passed = testScore >= 7; // 70% threshold

    return (
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
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: passed ? `${colors.success}20` : `${colors.warning}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '48px'
        }}>
          {passed ? '🏆' : '📚'}
        </div>

        <h1 style={{
          fontSize: isMobile ? '28px' : '36px',
          color: colors.textPrimary,
          marginBottom: '12px'
        }}>
          {passed ? 'Polarization Master!' : 'Keep Practicing!'}
        </h1>

        <p style={{
          fontSize: '24px',
          color: passed ? colors.success : colors.warning,
          marginBottom: '32px'
        }}>
          {testScore}/10 ({testScore * 10}%)
        </p>

        <div style={{
          padding: '24px',
          background: colors.bgSurface,
          borderRadius: '16px',
          maxWidth: '500px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>EM waves have polarization (oscillation direction)</li>
            <li>Antennas couple best when aligned with wave</li>
            <li>Malus's Law: I = I₀ × cos²(θ)</li>
            <li>Body absorption detunes antennas</li>
            <li>Circular polarization solves orientation issues</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setPhase('hook');
              setTestScore(0);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setCompletedApps([false, false, false, false]);
              setPrediction(null);
              setTwistPrediction(null);
            }}
          >
            Review Lesson
          </Button>
          <Button onClick={() => {
            emitGameEvent('return_to_dashboard');
            playSound('complete');
            // Navigate to dashboard
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}>
            ← Return to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE ROUTER
  // ============================================================================

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Challenge',
    twist_play: 'Body Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

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

export default AntennaPolarizationRenderer;
