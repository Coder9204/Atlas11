'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// STANDING WAVES - Premium Apple/Airbnb Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: string;
}

interface StandingWavesRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// ============================================================================
// PREMIUM DESIGN TOKENS - Apple/Airbnb Quality
// ============================================================================
const design = {
  colors: {
    bgDeep: '#05060a',
    bgPrimary: '#0a0c12',
    bgSecondary: '#12151e',
    bgTertiary: '#1a1e2a',
    bgCard: '#161a24',
    bgElevated: '#1e232f',
    bgHover: '#252a38',
    textPrimary: '#f8f9fc',
    textSecondary: '#a8b0c2',
    textMuted: '#6b7488',
    textDisabled: '#454c5e',
    accentPrimary: '#f59e0b',
    accentSecondary: '#fbbf24',
    accentMuted: '#78350f',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    violet: '#8b5cf6',
    violetMuted: 'rgba(139, 92, 246, 0.2)',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    border: '#252a38',
    borderLight: '#2e3444',
    borderFocus: '#f59e0b',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 8px 24px rgba(0,0,0,0.4)',
    lg: '0 16px 48px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 32px ${color}40`
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const StandingWavesRenderer: React.FC<StandingWavesRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Navigation debouncing
  const navigationLockRef = useRef(false);

  // Phase state
  const [phase, setPhase] = useState<Phase>(() => {
    const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [harmonic, setHarmonic] = useState(1);
  const [tension, setTension] = useState(50);
  const [time, setTime] = useState(0);
  const [discoveredHarmonics, setDiscoveredHarmonics] = useState<number[]>([1]);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);

  const animationRef = useRef<number>();

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setTime(t => t + delta * (1.5 + tension / 100));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [tension]);

  // Track discovered harmonics
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && !discoveredHarmonics.includes(harmonic)) {
      setDiscoveredHarmonics(prev => [...new Set([...prev, harmonic])].sort((a, b) => a - b));
    }
  }, [harmonic, phase, discoveredHarmonics]);

  // Emit events
  const emit = useCallback((eventType: string, data: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type: 'interaction',
      phase,
      data: { eventType, ...data },
      timestamp: Date.now(),
      eventType
    });
  }, [onGameEvent, phase]);

  // Navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  // Calculate frequency
  const baseFrequency = 80 + tension * 3.2;
  const frequency = Math.round(baseFrequency * harmonic);

  // --- RENDER BUTTON HELPER FUNCTION ---
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
    fullWidth = false,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '10px 18px', fontSize: '13px' },
      md: { padding: '14px 28px', fontSize: '15px' },
      lg: { padding: '18px 36px', fontSize: '17px' }
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
        color: '#000',
        boxShadow: `0 4px 20px ${design.colors.accentGlow}`,
      },
      secondary: {
        background: design.colors.bgElevated,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
        border: `1px solid ${design.colors.border}`,
      },
      success: {
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
        color: '#fff',
        boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
      }
    };

    return (
      <button
        onMouseDown={() => {
          if (disabled || navigationLockRef.current) return;
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        disabled={disabled}
        style={{
          fontFamily: design.font.sans,
          fontWeight: 600,
          borderRadius: design.radius.lg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: design.spacing.sm,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.5 : 1,
          border: 'none',
          outline: 'none',
          ...sizeStyles[size],
          ...variantStyles[variant],
        }}
      >
        {label}
      </button>
    );
  };

  // Test questions
  const questions = [
    { question: "A rope fixed at both ends is shaken. When do stable standing wave patterns form?", options: ["Any frequency", "Only resonant frequencies fitting whole half-wavelengths", "Only low frequencies", "Only high frequencies"], correct: 1, explanation: "Standing waves form only at resonant frequencies where whole numbers of half-wavelengths fit between the fixed ends." },
    { question: "If the fundamental frequency is 100 Hz, what is the 3rd harmonic?", options: ["150 Hz", "200 Hz", "300 Hz", "400 Hz"], correct: 2, explanation: "Harmonics are integer multiples of the fundamental: 3rd harmonic = 3 × 100 Hz = 300 Hz." },
    { question: "How does increasing rope tension affect wave speed?", options: ["No effect", "Increases speed", "Decreases speed", "Depends on frequency"], correct: 1, explanation: "Wave speed v = √(T/μ). Higher tension = faster waves = higher resonant frequencies." },
    { question: "At a node in a standing wave, what do you observe?", options: ["Maximum motion", "Zero motion", "Half maximum", "Random motion"], correct: 1, explanation: "Nodes are points of destructive interference where the string stays stationary." },
    { question: "A string's 2nd harmonic is 330 Hz. What's the fundamental frequency?", options: ["110 Hz", "165 Hz", "220 Hz", "660 Hz"], correct: 1, explanation: "Fundamental = 2nd harmonic ÷ 2 = 330 ÷ 2 = 165 Hz." },
    { question: "What creates a standing wave on a fixed rope?", options: ["Two separate wave sources", "A wave interfering with its reflection", "Air resonance", "Natural vibration"], correct: 1, explanation: "Standing waves form when a traveling wave reflects off a fixed end and interferes with itself." },
    { question: "To raise a string's pitch without changing its length, you should:", options: ["Loosen the string", "Tighten the string", "Use a thicker string", "It's impossible"], correct: 1, explanation: "Increasing tension increases wave speed and therefore frequency (pitch)." },
    { question: "A standing wave has 4 nodes (including both ends). Which harmonic is this?", options: ["2nd harmonic", "3rd harmonic", "4th harmonic", "5th harmonic"], correct: 1, explanation: "The nth harmonic has (n+1) nodes including the endpoints. 4 nodes means n = 3 (3rd harmonic)." },
    { question: "Why do different instruments playing the same note sound different?", options: ["Different volumes", "Different harmonic mixtures (timbre)", "Different wave speeds", "Room acoustics only"], correct: 1, explanation: "Timbre comes from unique combinations of harmonics each instrument produces." },
    { question: "If you double the frequency while keeping wave speed constant, wavelength:", options: ["Doubles", "Halves", "Stays the same", "Quadruples"], correct: 1, explanation: "From v = fλ, if v is constant and f doubles, λ must halve." }
  ];

  // Real-world applications with SVG graphics
  const applications = [
    {
      id: 'guitar',
      title: 'Guitar Strings',
      subtitle: 'The Physics of Music',
      description: 'When you pluck a guitar string, it vibrates at specific frequencies determined by length, tension, and mass. Pressing frets shortens the vibrating length, raising pitch.',
      stat: 'f = (1/2L)√(T/μ)',
      color: design.colors.accentPrimary
    },
    {
      id: 'laser',
      title: 'Laser Cavities',
      subtitle: 'Standing Light Waves',
      description: 'Lasers use mirrors to create standing light waves. Only wavelengths that form exact standing wave patterns are amplified, producing coherent, monochromatic light.',
      stat: 'L = nλ/2',
      color: design.colors.violet
    },
    {
      id: 'quantum',
      title: 'Electron Orbitals',
      subtitle: 'Quantum Standing Waves',
      description: 'Electrons in atoms behave as standing waves around the nucleus. Only whole-number wavelengths fit the orbit, explaining why only certain energy levels are allowed.',
      stat: 'nλ = 2πr',
      color: design.colors.success
    },
    {
      id: 'acoustics',
      title: 'Room Acoustics',
      subtitle: 'Architectural Resonance',
      description: 'Parallel walls create standing waves called "room modes." Acoustic engineers use diffusers and absorbers to minimize problematic resonances in concert halls.',
      stat: 'f = c/(2L)',
      color: '#ec4899'
    }
  ];

  // Phase list for navigation
  const phaseList: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  // Common styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: `linear-gradient(145deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
    fontFamily: design.font.sans,
    color: design.colors.textPrimary,
    overflow: 'hidden'
  };

  // Progress bar helper function
  const renderProgressBar = () => {
    const currentIndex = phaseList.indexOf(phase);
    return (
      <div style={{
        padding: '16px 24px',
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.accentPrimary }}>
            Standing Waves
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {phaseList.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i < currentIndex ? design.colors.success : i === currentIndex ? design.colors.accentPrimary : design.colors.bgElevated,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
        <span style={{ fontSize: '12px', color: design.colors.textMuted }}>
          {currentIndex + 1} / {phaseList.length}
        </span>
      </div>
    );
  };

  // Standing wave SVG visualization
  const renderWaveVisualization = () => {
    const stringLength = 400;
    const stringY = 120;
    const n = harmonic;
    const amp = 50 * (1 - n * 0.05);
    const omega = baseFrequency * n * 0.015;

    const generateWavePath = () => {
      const points: string[] = [];
      for (let x = 0; x <= stringLength; x += 2) {
        const relX = x / stringLength;
        const envelope = Math.sin(Math.PI * n * relX);
        const y = stringY + amp * envelope * Math.sin(omega * time);
        points.push(`${50 + x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    const nodes: number[] = [];
    const antinodes: number[] = [];
    for (let i = 0; i <= n; i++) nodes.push(50 + (i * stringLength / n));
    for (let i = 0; i < n; i++) antinodes.push(50 + ((i + 0.5) * stringLength / n));

    return (
      <svg viewBox="0 0 500 240" style={{ width: '100%', height: '100%', maxHeight: '240px' }}>
        <defs>
          <linearGradient id="swStringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={design.colors.accentPrimary} />
            <stop offset="50%" stopColor={design.colors.accentSecondary} />
            <stop offset="100%" stopColor={design.colors.accentPrimary} />
          </linearGradient>
          <filter id="swGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="nodeGrad">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
          <radialGradient id="antinodeGrad">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="500" height="240" fill={design.colors.bgDeep} rx="12" />

        {/* Grid */}
        <g opacity="0.1">
          {[...Array(6)].map((_, i) => (
            <line key={`h${i}`} x1="50" y1={40 + i * 30} x2="450" y2={40 + i * 30} stroke={design.colors.textMuted} />
          ))}
        </g>

        {/* Equilibrium line */}
        <line x1="50" y1={stringY} x2="450" y2={stringY} stroke={design.colors.textMuted} strokeDasharray="4,4" opacity="0.3" />

        {/* Fixed ends */}
        <rect x="35" y={stringY - 25} width="20" height="50" rx="4" fill={design.colors.bgElevated} stroke={design.colors.border} />
        <rect x="445" y={stringY - 25} width="20" height="50" rx="4" fill={design.colors.bgElevated} stroke={design.colors.border} />

        {/* Vibrating string */}
        <path d={generateWavePath()} fill="none" stroke="url(#swStringGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#swGlow)" />

        {/* Nodes */}
        {nodes.map((x, i) => (
          <g key={`node-${i}`}>
            <circle cx={x} cy={stringY} r="8" fill="url(#nodeGrad)" opacity="0.9">
              <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={stringY} r="3" fill="#fecaca" />
          </g>
        ))}

        {/* Antinodes */}
        {antinodes.map((x, i) => (
          <g key={`antinode-${i}`}>
            <line x1={x} y1={stringY - amp - 5} x2={x} y2={stringY + amp + 5} stroke={design.colors.success} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            <circle cx={x} cy={stringY} r="6" fill="url(#antinodeGrad)" opacity="0.8" />
          </g>
        ))}

        {/* Info panel */}
        <g transform="translate(360, 10)">
          <rect x="0" y="0" width="130" height="70" rx="8" fill={design.colors.bgCard} fillOpacity="0.95" stroke={design.colors.border} />
          <text x="10" y="22" fill={design.colors.textMuted} fontSize="9" fontWeight="600">HARMONIC #{n}</text>
          <text x="10" y="42" fill={design.colors.accentPrimary} fontSize="18" fontWeight="800">{frequency} Hz</text>
          <text x="10" y="58" fill={design.colors.textMuted} fontSize="9">{n + 1} nodes · {n} antinodes</text>
        </g>
      </svg>
    );
  };

  // Application tab SVG graphics
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'guitar') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            <linearGradient id="guitarBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="guitarNeck" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Guitar body */}
          <ellipse cx="220" cy="120" rx="60" ry="70" fill="url(#guitarBody)" />
          <ellipse cx="220" cy="120" rx="20" ry="20" fill="#1c1917" />

          {/* Neck */}
          <rect x="40" y="105" width="140" height="30" fill="url(#guitarNeck)" rx="2" />

          {/* Frets */}
          {[60, 85, 105, 120, 135, 150, 162].map((x, i) => (
            <line key={i} x1={x} y1="108" x2={x} y2="132" stroke="#a8a29e" strokeWidth="2" />
          ))}

          {/* Strings */}
          {[110, 115, 120, 125, 130].map((y, i) => (
            <g key={i}>
              <line x1="40" y1={y} x2="280" y2={y} stroke={design.colors.accentPrimary} strokeWidth="1" opacity="0.7" />
              {/* Vibration on active string */}
              {i === 2 && (
                <path
                  d={`M 40 ${y} Q 100 ${y + 8 * Math.sin(time * 5)} 160 ${y} Q 220 ${y - 8 * Math.sin(time * 5)} 280 ${y}`}
                  fill="none"
                  stroke={design.colors.accentSecondary}
                  strokeWidth="2"
                />
              )}
            </g>
          ))}

          {/* Finger position */}
          <circle cx="95" cy="120" r="8" fill={design.colors.accentPrimary} opacity="0.8">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
          </circle>

          <text x="150" y="180" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Pressing frets changes effective string length
          </text>
        </svg>
      );
    }

    if (app.id === 'laser') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            <linearGradient id="laserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
            </linearGradient>
            <filter id="laserGlow">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Laser cavity tube */}
          <rect x="40" y="80" width="220" height="40" rx="6" fill={design.colors.bgElevated} stroke={design.colors.border} />

          {/* Mirrors */}
          <rect x="30" y="70" width="15" height="60" rx="3" fill="#a78bfa" />
          <rect x="255" y="70" width="15" height="60" rx="3" fill="#a78bfa" opacity="0.7" />

          {/* Standing light wave */}
          <g opacity="0.9">
            {[0, 1, 2, 3, 4].map((i) => {
              const x = 55 + i * 50;
              const amp = 15 * Math.sin(time * 3);
              return (
                <g key={i}>
                  <ellipse cx={x} cy={100} rx="3" ry={Math.abs(amp)} fill={design.colors.violet}>
                    <animate attributeName="ry" values="15;0;15" dur="0.5s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              );
            })}
          </g>

          {/* Laser beam glow */}
          <rect x="50" y="95" width="200" height="10" fill="url(#laserBeam)" filter="url(#laserGlow)" opacity="0.7" />

          {/* Output beam */}
          <line x1="270" y1="100" x2="300" y2="100" stroke={design.colors.violet} strokeWidth="3">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="0.2s" repeatCount="indefinite" />
          </line>

          <text x="150" y="180" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Only resonant wavelengths amplify between mirrors
          </text>
        </svg>
      );
    }

    if (app.id === 'quantum') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            <radialGradient id="nucleus">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            <filter id="electronGlow">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Nucleus */}
          <circle cx="150" cy="100" r="15" fill="url(#nucleus)">
            <animate attributeName="r" values="15;17;15" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Electron orbitals as standing waves */}
          {[40, 60, 85].map((r, i) => {
            const points: string[] = [];
            const n = i + 1;
            for (let angle = 0; angle <= 360; angle += 5) {
              const rad = (angle * Math.PI) / 180;
              const waveAmp = 5 * Math.sin(n * rad + time * 2);
              const x = 150 + (r + waveAmp) * Math.cos(rad);
              const y = 100 + (r + waveAmp) * Math.sin(rad);
              points.push(`${x},${y}`);
            }
            return (
              <g key={i}>
                <path
                  d={`M ${points.join(' L ')} Z`}
                  fill="none"
                  stroke={design.colors.success}
                  strokeWidth="2"
                  opacity={0.4 + i * 0.2}
                />
                {/* Electron */}
                <circle
                  cx={150 + r * Math.cos(time * (3 - i))}
                  cy={100 + r * Math.sin(time * (3 - i))}
                  r="4"
                  fill={design.colors.success}
                  filter="url(#electronGlow)"
                />
              </g>
            );
          })}

          {/* Energy level labels */}
          <text x="200" y="65" fill={design.colors.textMuted} fontSize="9">n=3</text>
          <text x="200" y="85" fill={design.colors.textMuted} fontSize="9">n=2</text>
          <text x="200" y="110" fill={design.colors.textMuted} fontSize="9">n=1</text>

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Only whole-number wavelengths form stable orbitals
          </text>
        </svg>
      );
    }

    if (app.id === 'acoustics') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Room outline */}
          <rect x="40" y="40" width="220" height="120" fill="none" stroke={design.colors.border} strokeWidth="3" />

          {/* Standing wave pattern (room mode) */}
          {[0, 1, 2].map((mode) => {
            const y = 70 + mode * 30;
            const points: string[] = [];
            const n = 2;
            for (let x = 40; x <= 260; x += 4) {
              const relX = (x - 40) / 220;
              const amp = 12 * Math.sin(Math.PI * n * relX) * Math.sin(time * 3 + mode);
              points.push(`${x},${y + amp}`);
            }
            return (
              <path
                key={mode}
                d={`M ${points.join(' L ')}`}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                opacity={0.5 + mode * 0.15}
              />
            );
          })}

          {/* Pressure nodes */}
          <circle cx="150" cy="100" r="6" fill="#ec4899" opacity="0.6">
            <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
          </circle>

          {/* Absorber panels */}
          <rect x="45" y="45" width="8" height="30" fill={design.colors.bgElevated} rx="2" />
          <rect x="45" y="125" width="8" height="30" fill={design.colors.bgElevated} rx="2" />
          <rect x="247" y="45" width="8" height="30" fill={design.colors.bgElevated} rx="2" />
          <rect x="247" y="125" width="8" height="30" fill={design.colors.bgElevated} rx="2" />

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Room modes cause bass buildup between parallel walls
          </text>
        </svg>
      );
    }

    return null;
  };

  // Calculate score
  const score = answers.filter((a, i) => a === questions[i].correct).length;

  // ==================== PHASE RENDERS ====================

  // HOOK - Premium welcome screen
  if (phase === 'hook') {
    return (
      <div style={containerStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Floating background elements */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: `radial-gradient(circle, ${design.colors.accentGlow} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${design.colors.violetMuted} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite reverse',
            pointerEvents: 'none'
          }} />

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-20px) scale(1.05); }
            }
          `}</style>

          {/* Icon */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '32px',
            background: `linear-gradient(135deg, ${design.colors.accentMuted} 0%, ${design.colors.bgElevated} 100%)`,
            border: `2px solid ${design.colors.accentPrimary}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: design.shadow.glow(design.colors.accentPrimary)
          }}>
            <svg viewBox="0 0 60 60" style={{ width: '60%', height: '60%' }}>
              <path
                d={`M 5 30 Q 15 ${30 - 12 * Math.sin(time * 4)} 30 30 Q 45 ${30 + 12 * Math.sin(time * 4)} 55 30`}
                fill="none"
                stroke={design.colors.accentPrimary}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="5" cy="30" r="4" fill={design.colors.accentSecondary} />
              <circle cx="55" cy="30" r="4" fill={design.colors.accentSecondary} />
              <circle cx="30" cy="30" r="3" fill={design.colors.success} />
            </svg>
          </div>

          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            color: design.colors.textPrimary,
            marginBottom: design.spacing.md,
            letterSpacing: '-0.02em'
          }}>
            Standing Waves
          </h1>

          <p style={{
            fontSize: '18px',
            color: design.colors.textSecondary,
            marginBottom: design.spacing.sm,
            maxWidth: '500px',
            lineHeight: 1.6
          }}>
            Why do guitar strings only produce <span style={{ color: design.colors.accentPrimary, fontWeight: 600 }}>certain musical notes</span>?
          </p>

          <p style={{
            fontSize: '15px',
            color: design.colors.textMuted,
            marginBottom: design.spacing.xl,
            maxWidth: '400px'
          }}>
            Discover harmonics, nodes, and the physics of music
          </p>

          {/* Feature cards */}
          <div style={{ display: 'flex', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
            {[
              { icon: '🎵', label: 'Harmonics' },
              { icon: '🔬', label: 'Physics' },
              { icon: '🎸', label: 'Music' }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px 24px',
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`
              }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: design.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {renderButton('Start Learning', () => goToPhase('predict'), 'primary', false, false, 'lg')}

          <p style={{ fontSize: '12px', color: design.colors.textMuted, marginTop: design.spacing.lg }}>
            ~5 minutes · Interactive simulation
          </p>
        </div>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    const options = [
      { id: 'same', text: 'The same single loop, just faster' },
      { id: 'more', text: 'More loops appear at specific frequencies' },
      { id: 'random', text: 'Completely random patterns' },
      { id: 'disappear', text: 'The wave disappears completely' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Predict
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
                What happens when you increase frequency?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Imagine a guitar string fixed at both ends. You start shaking it slowly, then faster and faster.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    setPrediction(opt.id);
                    emit('prediction', { value: opt.id });
                  }}
                  style={{
                    padding: '18px 24px',
                    borderRadius: design.radius.lg,
                    border: `2px solid ${prediction === opt.id ? design.colors.accentPrimary : design.colors.border}`,
                    background: prediction === opt.id ? design.colors.accentMuted : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    fontFamily: design.font.sans,
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ marginTop: design.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton("Let's Find Out", () => goToPhase('play'), 'primary', !prediction)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAY - Interactive experiment
  if (phase === 'play') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Visualization */}
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
            {renderWaveVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Harmonic slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Harmonic Mode</label>
                  <span style={{ fontSize: '13px', color: design.colors.accentPrimary, fontWeight: 700 }}>n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              {/* Discovered harmonics */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: design.spacing.sm }}>
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <div key={h} style={{
                      width: '36px', height: '36px', borderRadius: design.radius.md,
                      background: discoveredHarmonics.includes(h) ? design.colors.success : design.colors.bgElevated,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700,
                      color: discoveredHarmonics.includes(h) ? 'white' : design.colors.textMuted,
                      border: harmonic === h ? `2px solid ${design.colors.accentPrimary}` : 'none'
                    }}>
                      {h}
                    </div>
                  ))}
                </div>
                {renderButton(
                  discoveredHarmonics.length >= 3 ? 'Continue' : `Discover ${3 - discoveredHarmonics.length} more`,
                  () => goToPhase('review'),
                  'primary',
                  discoveredHarmonics.length < 3
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Understanding
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary }}>
                The Physics of Standing Waves
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
              {[
                { icon: '〰️', title: 'Standing Waves', desc: 'Form when a wave reflects and interferes with itself' },
                { icon: '⚫', title: 'Nodes', desc: 'Points of zero motion (destructive interference)' },
                { icon: '🟢', title: 'Antinodes', desc: 'Points of maximum amplitude (constructive interference)' },
                { icon: '🎵', title: 'Harmonics', desc: 'Integer multiples of the fundamental frequency' }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: design.spacing.lg,
                  borderRadius: design.radius.lg,
                  background: design.colors.bgCard,
                  border: `1px solid ${design.colors.border}`
                }}>
                  <div style={{ fontSize: '24px', marginBottom: design.spacing.sm }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Formula box */}
            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: `linear-gradient(135deg, ${design.colors.accentMuted} 0%, ${design.colors.bgElevated} 100%)`,
              border: `1px solid ${design.colors.accentPrimary}30`,
              textAlign: 'center',
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.md, textTransform: 'uppercase', letterSpacing: '1px' }}>Key Formula</p>
              <p style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                f<sub>n</sub> = n × f<sub>1</sub> = (n/2L)√(T/μ)
              </p>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                Frequency depends on harmonic number, length, tension, and mass density
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Continue', () => goToPhase('twist_predict'), 'primary')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT
  if (phase === 'twist_predict') {
    const options = [
      { id: 'nothing', text: 'Nothing changes - frequency stays the same' },
      { id: 'higher', text: 'All frequencies increase proportionally' },
      { id: 'lower', text: 'All frequencies decrease' },
      { id: 'random', text: 'Changes unpredictably' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.violet, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                New Variable
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
                What happens when you increase string tension?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Think about tuning a guitar - what happens when you tighten the tuning peg?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    setTwistPrediction(opt.id);
                    emit('prediction', { value: opt.id, phase: 'twist_predict' });
                  }}
                  style={{
                    padding: '18px 24px',
                    borderRadius: design.radius.lg,
                    border: `2px solid ${twistPrediction === opt.id ? design.colors.violet : design.colors.border}`,
                    background: twistPrediction === opt.id ? design.colors.violetMuted : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    fontFamily: design.font.sans,
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ marginTop: design.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Test It', () => goToPhase('twist_play'), 'primary', !twistPrediction)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PLAY
  if (phase === 'twist_play') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Visualization */}
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
            {renderWaveVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Tension slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>String Tension</label>
                  <span style={{ fontSize: '13px', color: design.colors.violet, fontWeight: 700 }}>{tension}%</span>
                </div>
                <input
                  type="range" min="10" max="100" value={tension}
                  onChange={(e) => setTension(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.violet }}
                />
              </div>

              {/* Harmonic slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Harmonic</label>
                  <span style={{ fontSize: '13px', color: design.colors.accentPrimary, fontWeight: 700 }}>n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: design.colors.bgElevated
                }}>
                  <span style={{ fontSize: '12px', color: design.colors.textMuted }}>Frequency: </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: design.colors.accentPrimary }}>{frequency} Hz</span>
                </div>
                {renderButton('Continue', () => goToPhase('twist_review'), 'primary')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST REVIEW
  if (phase === 'twist_review') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Deep Insight
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary }}>
                You've Mastered the Variables!
              </h2>
            </div>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.lg }}>
                Standing wave frequency depends on four key variables:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.accentPrimary }}>Harmonic number (n)</strong> — Integer multiples of fundamental
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.violet }}>Tension (T)</strong> — Higher tension = higher frequency
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.success }}>Length (L)</strong> — Shorter string = higher frequency
                </li>
                <li style={{ color: design.colors.textPrimary }}>
                  <strong style={{ color: '#ec4899' }}>Mass density (μ)</strong> — Lighter string = higher frequency
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('See Real Applications', () => goToPhase('transfer'), 'primary')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER - Tabbed applications with completedApps
  if (phase === 'transfer') {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size === applications.length;

    return (
      <div style={containerStyle}>
        {renderProgressBar()}

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: design.spacing.sm,
          padding: design.spacing.md,
          background: design.colors.bgCard,
          borderBottom: `1px solid ${design.colors.border}`,
        }}>
          <span style={{ fontSize: '13px', color: design.colors.textSecondary }}>
            Application {activeApp + 1} of {applications.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {applications.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: completedApps.has(idx) ? design.colors.success : idx === activeApp ? design.colors.accentPrimary : design.colors.bgElevated,
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: design.colors.textMuted }}>
            ({completedApps.size}/{applications.length} read)
          </span>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: design.spacing.sm,
          padding: `${design.spacing.md}px ${design.spacing.lg}px`,
          background: design.colors.bgCard,
          borderBottom: `1px solid ${design.colors.border}`,
          overflowX: 'auto'
        }}>
          {applications.map((a, idx) => {
            const isCompleted = completedApps.has(idx);
            const isCurrent = idx === activeApp;
            const canAccess = isCompleted || idx === activeApp;
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!canAccess || navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  emit('app_changed', { appIndex: idx });
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: design.radius.md,
                  border: 'none',
                  background: isCurrent ? design.colors.bgElevated : isCompleted ? design.colors.successMuted : 'transparent',
                  color: isCurrent ? design.colors.textPrimary : isCompleted ? design.colors.success : design.colors.textMuted,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: canAccess ? 'pointer' : 'not-allowed',
                  opacity: canAccess ? 1 : 0.5,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  fontFamily: design.font.sans,
                }}
              >
                {isCompleted && !isCurrent ? '✓ ' : ''}{a.title}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Graphic */}
            <div style={{
              marginBottom: design.spacing.lg,
              borderRadius: design.radius.lg,
              overflow: 'hidden',
              border: `1px solid ${design.colors.border}`
            }}>
              {renderApplicationGraphic()}
            </div>

            {/* Info */}
            <div style={{ marginBottom: design.spacing.lg }}>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>
                {app.title}
              </h3>
              <p style={{ fontSize: '14px', color: app.color, fontWeight: 600, marginBottom: design.spacing.md }}>
                {app.subtitle}
              </p>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7 }}>
                {app.description}
              </p>
            </div>

            {/* Formula */}
            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: `${app.color}15`,
              border: `1px solid ${app.color}30`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: app.color, marginBottom: design.spacing.sm, textTransform: 'uppercase' }}>
                Key Formula
              </p>
              <p style={{ fontSize: '20px', fontFamily: 'Georgia, serif', color: design.colors.textPrimary }}>
                {app.stat}
              </p>
            </div>

            {/* Mark as Read Button */}
            {!completedApps.has(activeApp) && (
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  emit('interaction', { app: app.id, action: 'marked_read' });
                  if (activeApp < applications.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
                }}
                style={{
                  width: '100%',
                  padding: design.spacing.lg,
                  borderRadius: design.radius.lg,
                  background: design.colors.successMuted,
                  border: `2px solid ${design.colors.success}`,
                  color: design.colors.success,
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontFamily: design.font.sans,
                  marginBottom: design.spacing.lg,
                }}
              >
                ✓ Mark "{app.title}" as Read
              </button>
            )}

            {completedApps.has(activeApp) && (
              <div style={{
                padding: design.spacing.md,
                borderRadius: design.radius.md,
                background: design.colors.successMuted,
                border: `1px solid ${design.colors.success}30`,
                textAlign: 'center',
                marginBottom: design.spacing.lg,
              }}>
                <span style={{ color: design.colors.success, fontWeight: 600 }}>✓ Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          padding: design.spacing.lg,
          background: design.colors.bgCard,
          borderTop: `1px solid ${design.colors.border}`,
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {allAppsCompleted ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: design.spacing.md, color: design.colors.success, fontWeight: 600 }}>
                  ✓ All {applications.length} applications read!
                </div>
                {renderButton('Take the Quiz →', () => goToPhase('test'), 'success', false, true)}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                {activeApp > 0 ? (
                  <button
                    onMouseDown={() => {
                      if (navigationLockRef.current) return;
                      navigationLockRef.current = true;
                      setActiveApp(activeApp - 1);
                      setTimeout(() => { navigationLockRef.current = false; }, 300);
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: design.radius.md,
                      border: 'none',
                      background: 'transparent',
                      color: design.colors.textSecondary,
                      cursor: 'pointer',
                      fontFamily: design.font.sans,
                      fontSize: '15px',
                      fontWeight: 500,
                    }}
                  >
                    ← Previous
                  </button>
                ) : <div />}
                <div style={{
                  padding: design.spacing.md,
                  borderRadius: design.radius.md,
                  background: design.colors.bgElevated,
                  color: design.colors.textMuted,
                  fontSize: '14px',
                }}>
                  Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length} completed)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TEST
  if (phase === 'test') {
    const q = questions[testIndex];
    const answered = answers[testIndex] !== null;

    if (showResult) {
      return (
        <div style={containerStyle}>
          {renderProgressBar()}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: design.spacing.xl, textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: design.spacing.lg }}>
              {score >= 8 ? '🏆' : score >= 6 ? '⭐' : '📚'}
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
              {score}/10 Correct
            </h2>
            <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, maxWidth: '400px' }}>
              {score >= 8 ? "Excellent! You've truly mastered standing waves!" :
               score >= 6 ? "Good job! Review the concepts you missed." :
               "Keep practicing! Review the material and try again."}
            </p>
            {renderButton('Complete Lesson', () => goToPhase('mastery'), 'success', false, false, 'lg')}
          </div>
        </div>
      );
    }

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.lg }}>
              <span style={{ fontSize: '14px', color: design.colors.textMuted, fontWeight: 600 }}>
                Question {testIndex + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {answers.slice(0, 10).map((a, i) => (
                  <div key={i} style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: a !== null ? (a === questions[i].correct ? design.colors.success : design.colors.error) :
                               i === testIndex ? design.colors.accentPrimary : design.colors.bgElevated
                  }} />
                ))}
              </div>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.lg, lineHeight: 1.5 }}>
              {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {q.options.map((opt, i) => {
                const isSelected = answers[testIndex] === i;
                const isCorrect = i === q.correct;
                const showFeedback = answered;

                return (
                  <button
                    key={i}
                    onMouseDown={() => {
                      if (!answered) {
                        const newAnswers = [...answers];
                        newAnswers[testIndex] = i;
                        setAnswers(newAnswers);
                        emit(i === q.correct ? 'correct_answer' : 'incorrect_answer', { questionIndex: testIndex });
                      }
                    }}
                    disabled={answered}
                    style={{
                      padding: '18px 24px',
                      borderRadius: design.radius.lg,
                      border: `2px solid ${showFeedback ? (isCorrect ? design.colors.success : isSelected ? design.colors.error : design.colors.border) : isSelected ? design.colors.accentPrimary : design.colors.border}`,
                      background: showFeedback ? (isCorrect ? design.colors.successMuted : isSelected ? design.colors.errorMuted : design.colors.bgCard) : isSelected ? design.colors.accentMuted : design.colors.bgCard,
                      color: design.colors.textPrimary,
                      fontSize: '15px',
                      fontWeight: 500,
                      cursor: answered ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      fontFamily: design.font.sans,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <div style={{
                marginTop: design.spacing.lg,
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: answers[testIndex] === q.correct ? design.colors.successMuted : design.colors.errorMuted,
                border: `1px solid ${answers[testIndex] === q.correct ? design.colors.success : design.colors.error}30`
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textPrimary, lineHeight: 1.6 }}>
                  <strong style={{ color: answers[testIndex] === q.correct ? design.colors.success : design.colors.error }}>
                    {answers[testIndex] === q.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </strong>{' '}
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          padding: design.spacing.lg,
          background: design.colors.bgCard,
          borderTop: `1px solid ${design.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: design.spacing.md
        }}>
          {renderButton('← Previous', () => testIndex > 0 && setTestIndex(testIndex - 1), 'ghost', testIndex === 0)}
          {testIndex < 9 ? (
            renderButton('Next Question →', () => answered && setTestIndex(testIndex + 1), 'primary', !answered)
          ) : (
            renderButton('See Results →', () => answered && setShowResult(true), 'success', !answered)
          )}
        </div>
      </div>
    );
  }

  // MASTERY
  if (phase === 'mastery') {
    return (
      <div style={{
        ...containerStyle,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Confetti */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: '10px',
              height: '10px',
              background: [design.colors.accentPrimary, design.colors.violet, design.colors.success, '#ec4899'][i % 4],
              borderRadius: '2px',
              animation: `confettiFall 3s ease-out ${Math.random() * 2}s infinite`,
              opacity: 0.8
            }}
          />
        ))}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${design.colors.success}, ${design.colors.accentPrimary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: `0 0 60px ${design.colors.success}50`
          }}>
            <span style={{ fontSize: '56px' }}>🎓</span>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
            Congratulations!
          </h1>
          <p style={{ fontSize: '17px', color: design.colors.textSecondary, marginBottom: design.spacing.lg, maxWidth: '450px', lineHeight: 1.6 }}>
            You've mastered Standing Waves! You now understand the physics behind every musical instrument.
          </p>

          {/* Score */}
          <div style={{
            padding: '16px 32px',
            borderRadius: design.radius.lg,
            background: design.colors.bgCard,
            border: `1px solid ${design.colors.border}`,
            marginBottom: design.spacing.xl
          }}>
            <p style={{ fontSize: '14px', color: design.colors.textMuted, marginBottom: '4px' }}>Quiz Score</p>
            <p style={{ fontSize: '32px', fontWeight: 900, color: score >= 8 ? design.colors.success : design.colors.accentPrimary }}>{score}/10</p>
          </div>

          {/* Topics learned */}
          <div style={{
            padding: design.spacing.lg,
            borderRadius: design.radius.lg,
            background: design.colors.successMuted,
            border: `1px solid ${design.colors.success}30`,
            marginBottom: design.spacing.xl,
            maxWidth: '400px'
          }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.md, textTransform: 'uppercase' }}>
              What You Learned
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: design.spacing.sm, justifyContent: 'center' }}>
              {['Harmonics', 'Nodes', 'Antinodes', 'Tension', 'Frequency', 'Music Physics'].map((topic, i) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  borderRadius: design.radius.full,
                  background: design.colors.bgCard,
                  color: design.colors.textPrimary,
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md }}>
            {renderButton('Replay Lesson', () => {
              setPhase('hook');
              setTestIndex(0);
              setAnswers(Array(10).fill(null));
              setShowResult(false);
              setDiscoveredHarmonics([1]);
              setActiveApp(0);
              setCompletedApps(new Set());
            }, 'ghost')}
            {renderButton('Free Exploration', () => goToPhase('play'), 'primary')}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StandingWavesRenderer;
