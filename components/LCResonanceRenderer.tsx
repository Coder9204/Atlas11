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
// REAL-WORLD APPLICATIONS
// ============================================================================
const realWorldApps = [
  {
    icon: '📻',
    title: 'Radio Tuning Circuits',
    short: 'Selecting your favorite station',
    tagline: 'The original wireless technology',
    description: 'Every AM/FM radio uses an LC resonant circuit to select one station from the electromagnetic spectrum. By adjusting capacitance, the resonant frequency changes, allowing only the desired station\'s frequency to pass while rejecting all others.',
    connection: 'The resonant frequency f = 1/(2π√LC) determines which station you hear. Changing capacitance with the tuning dial shifts this frequency, exactly as we explored in the simulation.',
    howItWorks: 'A variable capacitor connected to a fixed inductor forms the tuning circuit. At resonance, the LC circuit has maximum impedance for parallel configurations or minimum for series. Only signals at the resonant frequency develop significant voltage.',
    stats: [
      { value: '540-1700kHz', label: 'AM band', icon: '⚡' },
      { value: '88-108MHz', label: 'FM band', icon: '📈' },
      { value: 'Billions', label: 'Radios worldwide', icon: '🚀' }
    ],
    examples: ['Car AM/FM receivers', 'Portable shortwave radios', 'Crystal radio sets', 'Software-defined radios'],
    companies: ['Sony', 'Bose', 'Sangean', 'Tecsun'],
    futureImpact: 'Digital radio and streaming dominate, but LC resonance principles remain fundamental in RF front-ends of all wireless devices including smartphones.',
    color: '#3B82F6'
  },
  {
    icon: '📡',
    title: 'Antenna Matching Networks',
    short: 'Maximizing power transfer',
    tagline: 'Every watt counts in wireless',
    description: 'Antennas must be matched to transmitters for efficient power transfer. LC networks transform antenna impedance to match the source, maximizing radiated power. Poor matching wastes energy as heat and reduces range.',
    connection: 'At resonance, an LC circuit can transform impedance levels. Matching networks use this principle to make antennas "look like" the optimal load impedance to the transmitter.',
    howItWorks: 'L-networks, pi-networks, and T-networks use combinations of inductors and capacitors to transform impedance. The component values are chosen so the network resonates at the operating frequency while providing the needed impedance transformation.',
    stats: [
      { value: '>90%', label: 'Match efficiency', icon: '⚡' },
      { value: '50Ω', label: 'Standard impedance', icon: '📈' },
      { value: '$12B', label: 'RF market', icon: '🚀' }
    ],
    examples: ['Cell tower transmitters', 'WiFi access points', 'Ham radio tuners', 'Satellite uplinks'],
    companies: ['Qualcomm', 'Skyworks', 'Qorvo', 'Murata'],
    futureImpact: 'Active tunable matching networks using varactors and MEMS will enable antennas that automatically optimize for any frequency and loading condition.',
    color: '#8B5CF6'
  },
  {
    icon: '🔊',
    title: 'Audio Crossover Networks',
    short: 'Sending frequencies to the right speaker',
    tagline: 'Physics behind high-fidelity sound',
    description: 'Speaker systems use LC filters to divide audio frequencies between drivers. Tweeters receive high frequencies, woofers receive low frequencies, and midranges handle the middle. LC resonance determines the crossover points.',
    connection: 'LC filters use resonance to pass or block frequency ranges. Below resonance, an LC low-pass filter passes signals; above resonance, a high-pass filter passes signals. This frequency-selective behavior separates audio into bands.',
    howItWorks: 'Second-order crossovers use one inductor and one capacitor per filter section. The crossover frequency is set by f = 1/(2π√LC). Higher-order designs use multiple LC sections for steeper rolloff between frequency bands.',
    stats: [
      { value: '80Hz-5kHz', label: 'Crossover range', icon: '⚡' },
      { value: '12dB/oct', label: 'Typical slope', icon: '📈' },
      { value: '$8.5B', label: 'Speaker market', icon: '🚀' }
    ],
    examples: ['Home theater systems', 'PA speaker cabinets', 'Studio monitors', 'Car audio systems'],
    companies: ['JBL', 'Bowers & Wilkins', 'KEF', 'Focal'],
    futureImpact: 'Digital signal processing increasingly replaces passive crossovers, but understanding LC resonance remains essential for speaker design and audio engineering.',
    color: '#10B981'
  },
  {
    icon: '⚡',
    title: 'Wireless Power Transfer',
    short: 'Charging without cables',
    tagline: 'Resonance enables the cordless future',
    description: 'Wireless chargers use resonant LC coils to transfer power across air gaps. When transmitter and receiver coils resonate at the same frequency, energy transfer is maximized. This resonant coupling enables efficient charging of phones and electric vehicles.',
    connection: 'Resonant wireless power transfer relies on coupled LC circuits oscillating at the same frequency. At resonance, magnetic coupling between coils is enhanced, allowing efficient energy transfer even with imperfect alignment.',
    howItWorks: 'The transmitter coil and capacitor form an LC circuit driven at resonance. The receiver coil and capacitor are tuned to the same frequency. At resonance, current flows efficiently between coils through their shared magnetic field.',
    stats: [
      { value: '85-95%', label: 'Efficiency', icon: '⚡' },
      { value: '15W-11kW', label: 'Power range', icon: '📈' },
      { value: '$15B', label: 'WPT market', icon: '🚀' }
    ],
    examples: ['Qi phone chargers', 'Electric vehicle charging', 'Medical implant power', 'Industrial robot charging'],
    companies: ['WiTricity', 'Energous', 'Powermat', 'Qualcomm Halo'],
    futureImpact: 'Room-scale wireless power using resonant magnetic fields will eliminate charging pads, powering devices automatically as they move through spaces.',
    color: '#F59E0B'
  }
];

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
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
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

    // Resonance curve fill area
    const resonanceCurveFillPoints = useMemo(() => {
      const startX = centerX - 100;
      const baseY = 360;
      return `${startX},${baseY} ${resonanceCurvePoints} ${centerX + 100},${baseY}`;
    }, [resonanceCurvePoints, centerX]);

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: svgWidth, margin: '0 auto' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block' }}
        >
          {/* === COMPREHENSIVE DEFINITIONS === */}
          <defs>
            {/* Premium capacitor plate gradient - 3D metallic blue */}
            <linearGradient id="lcrCapacitorPlate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="15%" stopColor="#60a5fa" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Capacitor plate side edge for 3D effect */}
            <linearGradient id="lcrCapacitorEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="30%" stopColor="#1e40af" />
              <stop offset="70%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Premium inductor coil gradient - copper metallic */}
            <linearGradient id="lcrInductorCoil" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#b45309" />
              <stop offset="80%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Inductor coil highlight for metallic shine */}
            <linearGradient id="lcrInductorHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0" />
              <stop offset="30%" stopColor="#fef3c7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>

            {/* Energy glow radial - purple for energy flow */}
            <radialGradient id="lcrEnergyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
              <stop offset="25%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#9333ea" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </radialGradient>

            {/* Electric field gradient between capacitor plates */}
            <linearGradient id="lcrElectricField" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
            </linearGradient>

            {/* Magnetic field gradient around inductor */}
            <radialGradient id="lcrMagneticField" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.3" />
            </radialGradient>

            {/* Resonance curve gradient fill */}
            <linearGradient id="lcrResonanceFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.05" />
            </linearGradient>

            {/* Resonance peak glow */}
            <radialGradient id="lcrResonancePeakGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Wire gradient - premium metallic silver */}
            <linearGradient id="lcrWire" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="lcrBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Current particle gradient */}
            <radialGradient id="lcrCurrentParticle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e9d5ff" stopOpacity="1" />
              <stop offset="30%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS === */}

            {/* Main component glow filter */}
            <filter id="lcrComponentGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Electric field glow */}
            <filter id="lcrElectricGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Magnetic field glow */}
            <filter id="lcrMagneticGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Energy particle glow */}
            <filter id="lcrParticleGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Resonance peak glow filter */}
            <filter id="lcrResonanceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Component shadow */}
            <filter id="lcrShadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Inner glow for panels */}
            <filter id="lcrInnerGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Grid pattern */}
            <pattern id="lcrGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={svgWidth} height={svgHeight} fill="url(#lcrBackground)" rx="12" />
          <rect width={svgWidth} height={svgHeight} fill="url(#lcrGrid)" rx="12" />

          {/* === LC CIRCUIT SCHEMATIC === */}
          <g transform="translate(0, 20)">
            {/* Circuit outline with gradient */}
            <rect
              x={centerX - 120}
              y={60}
              width={240}
              height={180}
              rx="8"
              fill="none"
              stroke="url(#lcrWire)"
              strokeWidth="4"
              filter="url(#lcrShadow)"
            />

            {/* === CAPACITOR (C) - Premium 3D Design === */}
            <g filter="url(#lcrShadow)">
              {/* Top plate with 3D effect */}
              <rect
                x={centerX - 100}
                y={88}
                width={60}
                height={12}
                rx="2"
                fill="url(#lcrCapacitorPlate)"
              />
              {/* Top plate edge highlight */}
              <rect
                x={centerX - 100}
                y={88}
                width={60}
                height={2}
                rx="1"
                fill="url(#lcrCapacitorEdge)"
                opacity="0.6"
              />

              {/* Bottom plate with 3D effect */}
              <rect
                x={centerX - 100}
                y={113}
                width={60}
                height={12}
                rx="2"
                fill="url(#lcrCapacitorPlate)"
              />
              {/* Bottom plate edge highlight */}
              <rect
                x={centerX - 100}
                y={123}
                width={60}
                height={2}
                rx="1"
                fill="url(#lcrCapacitorEdge)"
                opacity="0.6"
              />

              {/* Electric field between plates (when charged) */}
              {showEnergyAnimation && capacitorEnergy > 0.1 && (
                <g opacity={capacitorEnergy} filter="url(#lcrElectricGlow)">
                  {/* Field lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={i}
                      x1={centerX - 92 + i * 12}
                      y1={101}
                      x2={centerX - 92 + i * 12}
                      y2={112}
                      stroke="url(#lcrElectricField)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <animate
                        attributeName="strokeDasharray"
                        values="0,20;10,10;0,20"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </line>
                  ))}
                  {/* Energy glow between plates */}
                  <ellipse
                    cx={centerX - 70}
                    cy={106}
                    rx={35}
                    ry={12}
                    fill="url(#lcrEnergyGlow)"
                  />
                </g>
              )}
            </g>

            {/* === INDUCTOR (L) - Premium Copper Coil === */}
            <g filter="url(#lcrShadow)">
              {/* Coil turns with metallic copper effect */}
              {[0, 1, 2, 3].map(i => (
                <g key={i}>
                  {/* Back of coil (darker) */}
                  <ellipse
                    cx={centerX + 48 + i * 18}
                    cy={106}
                    rx={9}
                    ry={18}
                    fill="none"
                    stroke="#78350f"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* Front of coil (gradient) */}
                  <ellipse
                    cx={centerX + 48 + i * 18}
                    cy={106}
                    rx={9}
                    ry={18}
                    fill="none"
                    stroke="url(#lcrInductorCoil)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="28 28"
                    strokeDashoffset="0"
                  />
                  {/* Metallic highlight on each turn */}
                  <ellipse
                    cx={centerX + 48 + i * 18}
                    cy={106}
                    rx={9}
                    ry={18}
                    fill="none"
                    stroke="url(#lcrInductorHighlight)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="14 42"
                    strokeDashoffset="7"
                  />
                </g>
              ))}

              {/* Connecting ends */}
              <line
                x1={centerX + 38}
                y1={94}
                x2={centerX + 48}
                y2={94}
                stroke="url(#lcrInductorCoil)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1={centerX + 102}
                y1={94}
                x2={centerX + 112}
                y2={94}
                stroke="url(#lcrInductorCoil)"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Magnetic field (when current flows) */}
              {showEnergyAnimation && inductorEnergy > 0.1 && (
                <g opacity={inductorEnergy} filter="url(#lcrMagneticGlow)">
                  {[0, 1, 2].map(i => (
                    <ellipse
                      key={i}
                      cx={centerX + 75}
                      cy={106}
                      rx={30 + i * 12}
                      ry={35 + i * 10}
                      fill="none"
                      stroke="url(#lcrMagneticField)"
                      strokeWidth="2"
                      opacity={0.7 - i * 0.2}
                    >
                      <animate
                        attributeName="strokeDasharray"
                        values="10,5;5,10;10,5"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </ellipse>
                  ))}
                </g>
              )}
            </g>

            {/* === CONNECTING WIRES with premium gradient === */}
            <g stroke="url(#lcrWire)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Top wire */}
              <path d={`M ${centerX - 120} 60 L ${centerX - 120} 94 L ${centerX - 100} 94`} />
              <path d={`M ${centerX - 40} 94 L ${centerX + 38} 94`} />
              <path d={`M ${centerX + 112} 94 L ${centerX + 120} 94 L ${centerX + 120} 60`} />

              {/* Bottom wire */}
              <path d={`M ${centerX - 120} 240 L ${centerX - 120} 119 L ${centerX - 100} 119`} />
              <path d={`M ${centerX - 40} 119 L ${centerX + 38} 119`} />
              <path d={`M ${centerX + 112} 119 L ${centerX + 120} 119 L ${centerX + 120} 240`} />
            </g>

            {/* === CURRENT FLOW ANIMATION === */}
            {showEnergyAnimation && responseAtFrequency > 10 && (
              <g filter="url(#lcrParticleGlow)">
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const progress = ((animPhase * 2 + i * 0.6) % (Math.PI * 2)) / (Math.PI * 2);
                  let x, y;
                  if (progress < 0.25) {
                    x = centerX - 120 + progress * 4 * 240;
                    y = 60;
                  } else if (progress < 0.5) {
                    x = centerX + 120;
                    y = 60 + (progress - 0.25) * 4 * 180;
                  } else if (progress < 0.75) {
                    x = centerX + 120 - (progress - 0.5) * 4 * 240;
                    y = 240;
                  } else {
                    x = centerX - 120;
                    y = 240 - (progress - 0.75) * 4 * 180;
                  }
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="6"
                      fill="url(#lcrCurrentParticle)"
                      opacity={Math.min(1, responseAtFrequency / 80)}
                    >
                      <animate
                        attributeName="r"
                        values="4;7;4"
                        dur="0.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  );
                })}
              </g>
            )}

            {/* === ENERGY OSCILLATION VISUALIZATION === */}
            {showEnergyAnimation && (
              <>
                {/* Capacitor energy indicator */}
                <g transform={`translate(${centerX - 135}, 175)`}>
                  <rect x={0} y={0} width={70} height={58} rx="8" fill="rgba(15,23,42,0.95)" stroke="#3b82f6" strokeWidth="1" filter="url(#lcrInnerGlow)" />
                  <rect x={10} y={28} width={50} height={10} rx="3" fill="#1e293b" />
                  <rect
                    x={10}
                    y={28}
                    width={50 * capacitorEnergy}
                    height={10}
                    rx="3"
                    fill="url(#lcrCapacitorPlate)"
                  />
                  {capacitorEnergy > 0.5 && (
                    <rect
                      x={10}
                      y={28}
                      width={50 * capacitorEnergy}
                      height={10}
                      rx="3"
                      fill="#60a5fa"
                      opacity={0.4}
                      filter="url(#lcrComponentGlow)"
                    />
                  )}
                </g>

                {/* Inductor energy indicator */}
                <g transform={`translate(${centerX + 65}, 175)`}>
                  <rect x={0} y={0} width={70} height={58} rx="8" fill="rgba(15,23,42,0.95)" stroke="#f97316" strokeWidth="1" filter="url(#lcrInnerGlow)" />
                  <rect x={10} y={28} width={50} height={10} rx="3" fill="#1e293b" />
                  <rect
                    x={10}
                    y={28}
                    width={50 * inductorEnergy}
                    height={10}
                    rx="3"
                    fill="url(#lcrInductorCoil)"
                  />
                  {inductorEnergy > 0.5 && (
                    <rect
                      x={10}
                      y={28}
                      width={50 * inductorEnergy}
                      height={10}
                      rx="3"
                      fill="#fb923c"
                      opacity={0.4}
                      filter="url(#lcrComponentGlow)"
                    />
                  )}
                </g>
              </>
            )}
          </g>

          {/* === RESONANCE CURVE with premium styling === */}
          {showResonanceCurve && (
            <g transform="translate(0, 30)">
              {/* Background panel */}
              <rect
                x={centerX - 115}
                y={275}
                width={230}
                height={110}
                rx="10"
                fill="rgba(15,23,42,0.97)"
                stroke="#334155"
                strokeWidth="1"
                filter="url(#lcrShadow)"
              />

              {/* Frequency axis */}
              <line x1={centerX - 100} y1={365} x2={centerX + 100} y2={365} stroke="#475569" strokeWidth="1" />

              {/* Response curve fill */}
              <polygon
                points={resonanceCurveFillPoints}
                fill="url(#lcrResonanceFill)"
              />

              {/* Response curve line */}
              <polyline
                points={resonanceCurvePoints}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lcrResonanceGlow)"
              />

              {/* Resonant frequency marker */}
              <line
                x1={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
                y1={295}
                x2={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
                y2={365}
                stroke="#4ade80"
                strokeWidth="2"
                strokeDasharray="6,4"
                filter="url(#lcrResonanceGlow)"
              />

              {/* Resonance peak indicator */}
              <circle
                cx={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
                cy={295}
                r="8"
                fill="url(#lcrResonancePeakGlow)"
                filter="url(#lcrResonanceGlow)"
              >
                <animate
                  attributeName="r"
                  values="6;9;6"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}
                cy={295}
                r="4"
                fill="#4ade80"
              />
            </g>
          )}

          {/* === RESONANCE FREQUENCY INDICATOR - Top Left === */}
          {showLabels && (
            <g transform="translate(10, 10)">
              <rect x={0} y={0} width={105} height={60} rx="8" fill="rgba(15,23,42,0.97)" stroke="#22c55e" strokeWidth="1.5" filter="url(#lcrShadow)" />
              <circle cx={90} cy={12} r="4" fill="#22c55e" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* === Q FACTOR - Top Right === */}
          {showLabels && (
            <g transform={`translate(${svgWidth - 90}, 10)`}>
              <rect x={0} y={0} width={80} height={60} rx="8" fill="rgba(15,23,42,0.97)" stroke="#a855f7" strokeWidth="1" filter="url(#lcrShadow)" />
            </g>
          )}

          {/* === STATION TUNED - Bottom Center === */}
          {showLabels && closestStation && signalQuality > 30 && (
            <g transform={`translate(${centerX - 75}, ${svgHeight - 50})`}>
              <rect x={0} y={0} width={150} height={40} rx="8" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1.5" filter="url(#lcrShadow)" />
              {/* Signal strength bars */}
              {[0, 1, 2, 3, 4].map(i => (
                <rect
                  key={i}
                  x={125 + i * 5}
                  y={28 - i * 4}
                  width={3}
                  height={8 + i * 4}
                  rx="1"
                  fill={signalQuality > (i + 1) * 20 ? '#22c55e' : '#334155'}
                />
              ))}
            </g>
          )}

          {/* === FORMULA - Bottom Left === */}
          {showLabels && (
            <g transform={`translate(10, ${svgHeight - 45})`}>
              <rect x={0} y={0} width={115} height={35} rx="8" fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="1" filter="url(#lcrShadow)" />
            </g>
          )}
        </svg>

        {/* === TEXT LABELS OUTSIDE SVG using typo system === */}
        {showLabels && (
          <>
            {/* Resonance frequency label */}
            <div style={{
              position: 'absolute',
              top: isMobile ? '18px' : '20px',
              left: isMobile ? '18px' : '20px',
              width: isMobile ? '90px' : '95px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: typo.label, color: colors.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                RESONANCE
              </div>
              <div style={{ fontSize: isMobile ? '22px' : '26px', color: colors.resonance, fontWeight: 700, lineHeight: 1.2 }}>
                {resonantFrequency}
              </div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>
                kHz
              </div>
            </div>

            {/* Q Factor label */}
            <div style={{
              position: 'absolute',
              top: isMobile ? '18px' : '20px',
              right: isMobile ? '18px' : '20px',
              width: isMobile ? '70px' : '70px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: typo.label, color: colors.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Q FACTOR
              </div>
              <div style={{ fontSize: isMobile ? '22px' : '26px', color: colors.energy, fontWeight: 700, lineHeight: 1.2 }}>
                {qFactor}
              </div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>
                selectivity
              </div>
            </div>

            {/* Capacitor energy label */}
            {showEnergyAnimation && (
              <div style={{
                position: 'absolute',
                top: isMobile ? '198px' : '208px',
                left: isMobile ? `${centerX - 127}px` : `${centerX - 127}px`,
                width: '60px',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: typo.label, color: colors.capacitor, fontWeight: 600 }}>
                  E (electric)
                </div>
                <div style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '22px' }}>
                  {Math.round(capacitorEnergy * 100)}%
                </div>
              </div>
            )}

            {/* Inductor energy label */}
            {showEnergyAnimation && (
              <div style={{
                position: 'absolute',
                top: isMobile ? '198px' : '208px',
                left: isMobile ? `${centerX + 73}px` : `${centerX + 73}px`,
                width: '60px',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: typo.label, color: colors.inductor, fontWeight: 600 }}>
                  E (magnetic)
                </div>
                <div style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '22px' }}>
                  {Math.round(inductorEnergy * 100)}%
                </div>
              </div>
            )}

            {/* Component labels - C and L */}
            <div style={{
              position: 'absolute',
              top: isMobile ? '155px' : '165px',
              left: `${centerX - 80}px`,
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: typo.body, color: colors.capacitor, fontWeight: 700 }}>C</div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>{capacitance} pF</div>
            </div>

            <div style={{
              position: 'absolute',
              top: isMobile ? '155px' : '165px',
              left: `${centerX + 58}px`,
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: typo.body, color: colors.inductor, fontWeight: 700 }}>L</div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>{inductance} µH</div>
            </div>

            {/* Resonance curve labels */}
            {showResonanceCurve && (
              <>
                <div style={{
                  position: 'absolute',
                  top: isMobile ? '310px' : '320px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    RESONANCE CURVE
                  </div>
                </div>

                {/* Resonant frequency on curve */}
                <div style={{
                  position: 'absolute',
                  top: isMobile ? '323px' : '333px',
                  left: `${centerX - 100 + ((resonantFrequency - 500) / 1200) * 200}px`,
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: typo.small, color: colors.resonance, fontWeight: 700 }}>
                    f0 = {resonantFrequency} kHz
                  </div>
                </div>

                {/* Frequency axis labels */}
                <div style={{
                  position: 'absolute',
                  bottom: isMobile ? '52px' : '50px',
                  left: `${centerX - 95}px`,
                  fontSize: typo.label,
                  color: colors.textMuted,
                  pointerEvents: 'none'
                }}>500</div>
                <div style={{
                  position: 'absolute',
                  bottom: isMobile ? '52px' : '50px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: typo.label,
                  color: colors.textMuted,
                  pointerEvents: 'none'
                }}>1100</div>
                <div style={{
                  position: 'absolute',
                  bottom: isMobile ? '52px' : '50px',
                  right: `${svgWidth - centerX - 95}px`,
                  fontSize: typo.label,
                  color: colors.textMuted,
                  pointerEvents: 'none'
                }}>1700 kHz</div>
              </>
            )}

            {/* Station tuned label */}
            {closestStation && signalQuality > 30 && (
              <div style={{
                position: 'absolute',
                bottom: isMobile ? '18px' : '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '140px',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: typo.small, color: colors.success, fontWeight: 700 }}>
                  {closestStation.genre} {closestStation.name}
                </div>
                <div style={{ fontSize: typo.label, color: colors.textMuted }}>
                  {closestStation.freq} kHz - Signal: {Math.round(signalQuality)}%
                </div>
              </div>
            )}

            {/* Formula label */}
            <div style={{
              position: 'absolute',
              bottom: isMobile ? '22px' : '23px',
              left: isMobile ? '18px' : '20px',
              width: '105px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                f = 1/(2pi * sqrt(LC))
              </div>
            </div>
          </>
        )}
      </div>
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

  // ============================================================================
  // TEST QUESTIONS - Scenario-based multiple choice questions
  // ============================================================================
  const testQuestions = [
    {
      scenario: "You're building a simple AM radio receiver and need to understand what makes it tune to specific stations instead of picking up all broadcasts at once.",
      question: "What is LC resonance and why is it essential for radio tuning?",
      options: [
        { id: 'a', label: "A phenomenon where inductors and capacitors amplify all frequencies equally" },
        { id: 'b', label: "A condition where an LC circuit responds maximally to one specific frequency determined by L and C values", correct: true },
        { id: 'c', label: "A type of interference that occurs when multiple radio stations broadcast simultaneously" },
        { id: 'd', label: "The resistance that develops in a circuit at high frequencies" }
      ],
      explanation: "LC resonance occurs when the inductive reactance equals the capacitive reactance at a specific frequency (f = 1/2pi*sqrt(LC)). At this resonant frequency, energy oscillates efficiently between the inductor's magnetic field and the capacitor's electric field, causing the circuit to respond strongly to that frequency while attenuating others. This selectivity is what allows radios to 'pick' one station from many."
    },
    {
      scenario: "An old car radio has a manual tuning dial that you rotate to find stations. Inside, this dial is connected to a variable capacitor that changes its capacitance as you turn it.",
      question: "When you turn the dial to tune from a lower frequency station (600 kHz) to a higher frequency station (1400 kHz), what happens to the variable capacitor?",
      options: [
        { id: 'a', label: "The capacitance increases, raising the resonant frequency" },
        { id: 'b', label: "The capacitance decreases, raising the resonant frequency", correct: true },
        { id: 'c', label: "The capacitance stays the same while the inductance changes" },
        { id: 'd', label: "The capacitor disconnects and a different circuit takes over" }
      ],
      explanation: "Since resonant frequency f = 1/(2pi*sqrt(LC)), decreasing capacitance (C) will increase the resonant frequency. In variable capacitors, rotating the dial moves the overlapping plate area, reducing capacitance. This is why turning the dial clockwise typically tunes to higher frequency stations - you're reducing C to increase f0."
    },
    {
      scenario: "An engineer needs to design an LC circuit that resonates at exactly 1 MHz. She has a 100 microhenry inductor available.",
      question: "Using the resonance formula f = 1/(2pi*sqrt(LC)), what capacitance value does she need?",
      options: [
        { id: 'a', label: "About 253 picofarads (pF)", correct: true },
        { id: 'b', label: "About 1 microfarad (uF)" },
        { id: 'c', label: "About 100 nanofarads (nF)" },
        { id: 'd', label: "About 1 picofarad (pF)" }
      ],
      explanation: "Rearranging f = 1/(2pi*sqrt(LC)) gives C = 1/(4pi^2 * f^2 * L). Plugging in f = 1 MHz = 1x10^6 Hz and L = 100 uH = 100x10^-6 H: C = 1/(4 * 9.87 * 10^12 * 10^-4) = 1/(3.95 * 10^9) = 253 pF. This calculation is fundamental for designing tuned circuits in radio and communications equipment."
    },
    {
      scenario: "A radio receiver designer is comparing two LC circuits: one with Q factor of 20 and another with Q factor of 200. Both are tuned to the same frequency.",
      question: "How does the higher Q factor circuit differ in its ability to select radio stations?",
      options: [
        { id: 'a', label: "It has a wider bandwidth, allowing multiple stations to be heard simultaneously" },
        { id: 'b', label: "It has a narrower bandwidth, providing sharper selectivity to reject adjacent stations", correct: true },
        { id: 'c', label: "It produces louder audio output from the selected station" },
        { id: 'd', label: "It consumes less power but has identical selectivity" }
      ],
      explanation: "Q factor (Quality factor) determines the sharpness of the resonance peak. Bandwidth = f0/Q, so a higher Q means narrower bandwidth. The Q=200 circuit has a bandwidth 10 times narrower than the Q=20 circuit, making it much better at rejecting signals from adjacent channel stations. However, very high Q can make tuning more difficult and sensitive to component drift."
    },
    {
      scenario: "You're observing an LC tank circuit with an oscilloscope. The circuit was given an initial charge and is now oscillating freely with no external power source.",
      question: "What is happening to the energy in this tank circuit during each oscillation cycle?",
      options: [
        { id: 'a', label: "Energy is being created and destroyed as current flows" },
        { id: 'b', label: "Energy alternates between electric field energy in the capacitor and magnetic field energy in the inductor", correct: true },
        { id: 'c', label: "Energy remains constant in the capacitor while the inductor provides amplification" },
        { id: 'd', label: "Energy is continuously absorbed by the inductor's core material" }
      ],
      explanation: "In an ideal LC tank circuit, total energy is conserved but constantly transforms between two forms: when the capacitor is fully charged, all energy is stored in its electric field (E = 1/2 CV^2). As it discharges through the inductor, energy transfers to the magnetic field (E = 1/2 LI^2). This energy 'sloshing' back and forth at the resonant frequency is what creates sustained oscillation - the same principle that makes a pendulum swing."
    },
    {
      scenario: "A digital watch keeps time using a tiny quartz crystal oscillator. The crystal is connected to a small integrated circuit that maintains oscillation at exactly 32.768 kHz.",
      question: "Why do precision timekeeping devices use quartz crystals instead of simple LC circuits?",
      options: [
        { id: 'a', label: "Crystals are cheaper to manufacture than inductors and capacitors" },
        { id: 'b', label: "Quartz crystals have extremely high Q factors (10,000-100,000+), providing exceptional frequency stability", correct: true },
        { id: 'c', label: "Crystals can generate their own power through piezoelectric effects" },
        { id: 'd', label: "LC circuits cannot oscillate at frequencies as low as 32.768 kHz" }
      ],
      explanation: "Quartz crystals act as electromechanical resonators with Q factors of 10,000 to over 100,000 - far exceeding typical LC circuits (Q ~ 50-500). This ultra-high Q means the crystal's resonant frequency is extremely stable and precise, drifting only a few parts per million. The piezoelectric effect converts electrical energy to mechanical vibration and back, creating a highly stable oscillator. The 32.768 kHz frequency is chosen because it's 2^15 Hz, easily divided down to 1 Hz for timekeeping."
    },
    {
      scenario: "Engineers are designing a wireless charging pad for smartphones. The charging coil in the pad must transfer power efficiently to the receiving coil inside the phone.",
      question: "Why is resonant coupling used instead of simple transformer-style inductive coupling for wireless power transfer?",
      options: [
        { id: 'a', label: "Resonant coupling looks more impressive to consumers" },
        { id: 'b', label: "At resonance, energy transfer efficiency is dramatically improved, especially over larger air gaps", correct: true },
        { id: 'c', label: "Simple inductive coupling would damage the phone's battery" },
        { id: 'd', label: "Resonant coupling eliminates the need for any coils in the system" }
      ],
      explanation: "Resonant wireless power transfer uses matched LC circuits in both transmitter and receiver tuned to the same frequency (typically 100-200 kHz for Qi chargers). At resonance, the magnetic coupling between coils is dramatically enhanced, allowing efficient power transfer even with significant air gaps and misalignment. Non-resonant inductive coupling efficiency drops rapidly with distance, while resonant systems can maintain >80% efficiency across several centimeters."
    },
    {
      scenario: "A telecommunications engineer is designing a bandpass filter for a radio receiver's intermediate frequency (IF) stage. The filter must pass signals at 10.7 MHz while rejecting signals at 10.5 MHz and 10.9 MHz.",
      question: "What filter topology would best achieve this narrow bandpass characteristic using LC resonance?",
      options: [
        { id: 'a', label: "A single parallel LC circuit with moderate Q factor" },
        { id: 'b', label: "Multiple cascaded LC resonators with coupled resonances for steep rolloff", correct: true },
        { id: 'c', label: "A series combination of capacitors only" },
        { id: 'd', label: "A single high-value inductor with no capacitors" }
      ],
      explanation: "Professional IF filters use multiple coupled LC resonators (often ceramic or crystal filters with 2-8 poles) to achieve steep rolloff characteristics. A single LC circuit, even with high Q, cannot provide the sharp 'brick wall' response needed to reject adjacent channels just 200 kHz away. Coupled resonators create multiple poles in the transfer function, resulting in much steeper attenuation slopes. This is why quality receivers use multi-pole crystal or ceramic filters in their IF stages."
    },
    {
      scenario: "A power electronics engineer notices that a DC-DC converter is producing unexpected high-frequency noise. Investigation reveals oscillations occurring at 50 MHz, far above the 100 kHz switching frequency.",
      question: "What is the most likely cause of this parasitic resonance problem?",
      options: [
        { id: 'a', label: "The switching frequency is set incorrectly" },
        { id: 'b', label: "Unintended LC circuits formed by PCB trace inductance and component parasitic capacitances", correct: true },
        { id: 'c', label: "The output capacitors are too large" },
        { id: 'd', label: "The input voltage is fluctuating" }
      ],
      explanation: "Parasitic resonance is a common problem in power electronics and high-frequency circuits. Every PCB trace has inductance (~1 nH/mm) and every component has parasitic capacitance. These unintended L and C elements form resonant circuits. At 50 MHz, even a few nH of trace inductance combined with pF of parasitic capacitance creates resonance. Solutions include: adding damping resistors, using ferrite beads, optimizing PCB layout to minimize loop inductance, and selecting components with lower parasitic elements."
    },
    {
      scenario: "A ham radio operator is setting up a new antenna for the 20-meter band (14.0-14.35 MHz). The antenna feedpoint shows an impedance of 35 + j25 ohms, but the transmitter expects 50 ohms purely resistive.",
      question: "How can LC resonance principles be applied to match this antenna to the transmitter?",
      options: [
        { id: 'a', label: "Use a longer coaxial cable to absorb the mismatch" },
        { id: 'b', label: "Use an LC matching network (antenna tuner) to transform impedance and cancel the reactive component", correct: true },
        { id: 'c', label: "Increase transmitter power to overcome the mismatch" },
        { id: 'd', label: "The mismatch is acceptable and requires no correction" }
      ],
      explanation: "An LC matching network (antenna tuner) uses the resonance principle to transform impedances. The +j25 ohms indicates inductive reactance, which can be cancelled by adding appropriate capacitive reactance. Common topologies include L-networks, Pi-networks, and T-networks using variable inductors and capacitors. At the matched condition, the network resonates to cancel reactive components while transforming the 35-ohm resistive part to 50 ohms, ensuring maximum power transfer to the antenna and protecting the transmitter from reflected power."
    }
  ];

  const renderTest = () => {
    const questions = [
      {
        question: 'What determines the resonant frequency of an LC circuit?',
        options: [
          { text: 'Voltage applied', correct: false },
          { text: 'Values of L and C', correct: true },
          { text: 'Wire thickness', correct: false },
          { text: 'Temperature', correct: false }
        ]
      },
      {
        question: 'At resonance, energy oscillates between:',
        options: [
          { text: 'Heat and light', correct: false },
          { text: 'Electric field (C) and magnetic field (L)', correct: true },
          { text: 'Voltage and current', correct: false },
          { text: 'Input and output', correct: false }
        ]
      },
      {
        question: 'If you double the capacitance, the resonant frequency:',
        options: [
          { text: 'Doubles', correct: false },
          { text: 'Halves', correct: false },
          { text: 'Decreases by about 30%', correct: true },
          { text: 'Stays the same', correct: false }
        ]
      },
      {
        question: 'Why can a radio "pick" one station from many?',
        options: [
          { text: 'Magic', correct: false },
          { text: 'LC circuit resonates at one frequency', correct: true },
          { text: 'Antenna size', correct: false },
          { text: 'Speaker quality', correct: false }
        ]
      },
      {
        question: 'What is the Q factor of an LC circuit?',
        options: [
          { text: 'Quality of components', correct: false },
          { text: 'How selective/sharp the resonance peak is', correct: true },
          { text: 'Charge stored', correct: false },
          { text: 'Frequency range', correct: false }
        ]
      },
      {
        question: 'The resonant frequency formula f = 1/(2pi*sqrt(LC)) shows that frequency depends on:',
        options: [
          { text: 'The sum of L and C', correct: false },
          { text: 'The square root of the product L times C', correct: true },
          { text: 'Only the inductance L', correct: false },
          { text: 'The ratio of L to C', correct: false }
        ]
      },
      {
        question: 'A higher Q factor in an LC circuit means:',
        options: [
          { text: 'Wider bandwidth and less selective tuning', correct: false },
          { text: 'Narrower bandwidth and more selective tuning', correct: true },
          { text: 'Higher resonant frequency', correct: false },
          { text: 'More energy loss per cycle', correct: false }
        ]
      },
      {
        question: 'In a series LC circuit at resonance, the impedance is:',
        options: [
          { text: 'Maximum (very high)', correct: false },
          { text: 'Minimum (ideally zero)', correct: true },
          { text: 'Equal to the inductance', correct: false },
          { text: 'Equal to the capacitance', correct: false }
        ]
      },
      {
        question: 'What causes damping in a real LC circuit?',
        options: [
          { text: 'The magnetic field strength', correct: false },
          { text: 'Resistance in the circuit dissipating energy', correct: true },
          { text: 'The capacitor plate size', correct: false },
          { text: 'The frequency of oscillation', correct: false }
        ]
      },
      {
        question: 'In a parallel LC circuit at resonance, the impedance is:',
        options: [
          { text: 'Maximum (very high)', correct: true },
          { text: 'Minimum (ideally zero)', correct: false },
          { text: 'Equal to the resistance', correct: false },
          { text: 'Unpredictable', correct: false }
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
