'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// RESONANCE - Premium Apple/Airbnb Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: string;
}

interface ResonanceRendererProps {
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
    bgDeep: '#0a0510',
    bgPrimary: '#0f0818',
    bgSecondary: '#160d20',
    bgTertiary: '#1d1228',
    bgCard: '#1a0f24',
    bgElevated: '#241630',
    bgHover: '#2c1c3a',
    textPrimary: '#faf5ff',
    textSecondary: '#c4b5d8',
    textMuted: '#7e6898',
    textDisabled: '#4a3c60',
    accentPrimary: '#ec4899',
    accentSecondary: '#f472b6',
    accentMuted: '#831843',
    accentGlow: 'rgba(236, 72, 153, 0.25)',
    violet: '#a855f7',
    violetMuted: 'rgba(168, 85, 247, 0.2)',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    border: '#2e1f40',
    borderLight: '#3d2950',
    borderFocus: '#ec4899',
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
const ResonanceRenderer: React.FC<ResonanceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [time, setTime] = useState(0);
  const [drivingFrequency, setDrivingFrequency] = useState(100);
  const [addedMass, setAddedMass] = useState(0);
  const [foundResonance, setFoundResonance] = useState(false);
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
      setTime(t => t + delta * 2);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

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

  // Render button helper function
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
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
        color: '#fff',
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
          if (navigationLockRef.current || disabled) return;
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
          opacity: disabled ? 0.5 : 1,
          border: 'none',
          outline: 'none',
          ...sizeStyles[size],
          ...variantStyles[variant]
        }}
      >
        {label}
      </button>
    );
  };

  // Resonance physics
  const baseResonantFreq = 240;
  const resonantFreq = Math.round(baseResonantFreq - addedMass * 2);
  const frequencyDiff = Math.abs(drivingFrequency - resonantFreq);
  const isAtResonance = frequencyDiff < 15;
  const responseAmplitude = isAtResonance ? 100 : Math.max(5, 100 - frequencyDiff * 1.2);

  // Track resonance discovery
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isAtResonance && !foundResonance) {
      setFoundResonance(true);
      emit('resonance_found', { frequency: drivingFrequency });
    }
  }, [isAtResonance, phase, foundResonance, drivingFrequency, emit]);

  // Test questions
  const questions = [
    { question: "What is resonance?", options: ["Random vibration", "Maximum energy transfer at matching frequencies", "Minimum amplitude", "Constant frequency"], correct: 1, explanation: "Resonance occurs when the driving frequency matches the system's natural frequency, causing maximum energy transfer and amplitude." },
    { question: "A child on a swing has a natural frequency of 0.5 Hz. To push most effectively, at what frequency should you push?", options: ["0.25 Hz", "0.5 Hz", "1.0 Hz", "2.0 Hz"], correct: 1, explanation: "For maximum energy transfer (resonance), the driving frequency must match the natural frequency of 0.5 Hz." },
    { question: "What happens to resonant frequency when you add mass to an oscillator?", options: ["Increases", "Decreases", "Stays the same", "Becomes zero"], correct: 1, explanation: "From f = (1/2π)√(k/m), increasing mass decreases the natural/resonant frequency." },
    { question: "Why did the Tacoma Narrows Bridge collapse?", options: ["Earthquake", "Wind-induced resonance", "Heavy traffic", "Material fatigue"], correct: 1, explanation: "Wind created oscillations matching the bridge's natural frequency, causing resonance that amplified until structural failure." },
    { question: "How does MRI imaging work?", options: ["X-rays", "Sound waves", "Nuclear magnetic resonance", "Electrical current"], correct: 2, explanation: "MRI uses nuclear magnetic resonance - hydrogen nuclei in the body resonate at specific frequencies in a magnetic field." },
    { question: "A singer shatters a wine glass by singing. What must the singer's frequency match?", options: ["The room's frequency", "The glass's natural frequency", "440 Hz exactly", "Any high frequency"], correct: 1, explanation: "The singer must match the glass's natural frequency to create resonance and accumulate enough energy to shatter it." },
    { question: "Why do bass speakers need to be larger than treble speakers?", options: ["They need more power", "Lower frequency = longer wavelength needs larger resonator", "They're louder", "Marketing"], correct: 1, explanation: "Lower frequencies require larger resonating chambers. From f = (1/2π)√(k/m), more mass lowers frequency." },
    { question: "Taipei 101 has a 730-ton ball inside. What is its purpose?", options: ["Decoration", "Tuned mass damper to prevent resonance", "Electricity generation", "Water storage"], correct: 1, explanation: "The tuned mass damper oscillates opposite to building sway, canceling resonant vibrations from wind or earthquakes." },
    { question: "At resonance, what happens to the phase between driving force and oscillation?", options: ["In phase", "90° out of phase", "180° out of phase", "Random"], correct: 1, explanation: "At resonance, the velocity (not position) is in phase with the driving force, meaning position is 90° behind." },
    { question: "Why do soldiers break step when crossing bridges?", options: ["Tradition", "To avoid resonance", "To rest", "Balance"], correct: 1, explanation: "Marching in step could match the bridge's natural frequency, causing dangerous resonance amplification." },
    { question: "What determines a guitar body's resonant frequencies?", options: ["String length only", "Wood type and cavity shape", "Paint color", "Tuning pegs"], correct: 1, explanation: "The cavity shape, wood properties, and body construction determine which frequencies the body amplifies through resonance." }
  ];

  // Real-world applications with SVG graphics
  const applications = [
    {
      id: 'mri',
      title: 'Medical MRI',
      subtitle: 'Nuclear Magnetic Resonance',
      description: 'MRI scanners use nuclear magnetic resonance to image organs without radiation. Hydrogen nuclei in your body resonate at specific radio frequencies in strong magnetic fields.',
      stat: 'f = γB₀/2π',
      color: design.colors.accentPrimary
    },
    {
      id: 'glass',
      title: 'Glass Shattering',
      subtitle: 'Acoustic Resonance',
      description: 'Opera singers can shatter wine glasses by singing at the glass\'s natural frequency. Energy accumulates with each cycle until the glass fails catastrophically.',
      stat: 'A(t) ≈ A₀e^(γt)',
      color: design.colors.violet
    },
    {
      id: 'bridge',
      title: 'Bridge Engineering',
      subtitle: 'Avoiding Catastrophic Resonance',
      description: 'The 1940 Tacoma Narrows Bridge collapsed from wind-induced resonance. Modern bridges use tuned mass dampers and aerodynamic shapes to prevent disasters.',
      stat: 'f = (1/2π)√(k/m)',
      color: design.colors.success
    },
    {
      id: 'music',
      title: 'Musical Instruments',
      subtitle: 'Acoustic Amplification',
      description: 'Every instrument relies on resonance to amplify sound. Guitar bodies, violin chambers, and piano soundboards resonate at multiple frequencies for rich tones.',
      stat: 'fₙ = n × f₁',
      color: design.colors.warning
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

  // Progress bar
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
            Resonance
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

  // Resonance visualization
  const renderResonanceVisualization = () => {
    const springY = 80;
    const massY = springY + 80 + (responseAmplitude / 2) * Math.sin(time * (drivingFrequency / 50));
    const massSize = 30 + addedMass * 0.3;

    return (
      <svg viewBox="0 0 500 280" style={{ width: '100%', height: '100%', maxHeight: '280px' }}>
        <defs>
          <linearGradient id="resSpringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.violet} />
            <stop offset="100%" stopColor={design.colors.accentPrimary} />
          </linearGradient>
          <radialGradient id="resMassGrad">
            <stop offset="0%" stopColor={design.colors.accentSecondary} />
            <stop offset="70%" stopColor={design.colors.accentPrimary} />
            <stop offset="100%" stopColor={design.colors.accentMuted} />
          </radialGradient>
          <filter id="resGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect x="0" y="0" width="500" height="280" fill={design.colors.bgDeep} rx="12" />

        {/* Grid background */}
        <g opacity="0.1">
          {[...Array(7)].map((_, i) => (
            <line key={`h${i}`} x1="50" y1={40 + i * 35} x2="450" y2={40 + i * 35} stroke={design.colors.textMuted} />
          ))}
        </g>

        {/* Fixed anchor */}
        <rect x="115" y="30" width="70" height="20" rx="4" fill={design.colors.bgElevated} stroke={design.colors.border} />
        <rect x="125" y="15" width="50" height="20" rx="4" fill={design.colors.bgTertiary} />

        {/* Spring */}
        <path
          d={`M 150 50 ${[...Array(8)].map((_, i) => {
            const y = 50 + (i + 0.5) * ((massY - 50) / 8);
            const x = 150 + (i % 2 === 0 ? 20 : -20);
            return `L ${x} ${y}`;
          }).join(' ')} L 150 ${massY - massSize/2}`}
          fill="none"
          stroke="url(#resSpringGrad)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Mass */}
        <circle
          cx="150"
          cy={massY}
          r={massSize}
          fill="url(#resMassGrad)"
          filter={isAtResonance ? "url(#resGlow)" : undefined}
          stroke={isAtResonance ? design.colors.accentSecondary : 'none'}
          strokeWidth="3"
        />
        <text x="150" y={massY + 5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
          {Math.round(100 + addedMass)}g
        </text>

        {/* Driving force indicator */}
        <g transform="translate(300, 80)">
          <rect x="0" y="0" width="140" height="140" rx="12" fill={design.colors.bgCard} stroke={design.colors.border} />
          <text x="70" y="25" textAnchor="middle" fill={design.colors.textMuted} fontSize="10" fontWeight="600">DRIVING FORCE</text>

          {/* Oscillating arrow */}
          <g transform={`translate(70, 85)`}>
            <circle cx="0" cy="0" r="40" fill="none" stroke={design.colors.border} strokeDasharray="4,4" />
            <line
              x1="0" y1="0"
              x2={35 * Math.cos(time * (drivingFrequency / 50))}
              y2={35 * Math.sin(time * (drivingFrequency / 50))}
              stroke={design.colors.violet}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="5" fill={design.colors.violet} />
          </g>

          <text x="70" y="135" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="16" fontWeight="800">
            {drivingFrequency} Hz
          </text>
        </g>

        {/* Response amplitude bar */}
        <g transform="translate(50, 140)">
          <text x="0" y="-5" fill={design.colors.textMuted} fontSize="10" fontWeight="600">AMPLITUDE</text>
          <rect x="0" y="0" width="30" height="100" rx="4" fill={design.colors.bgElevated} />
          <rect
            x="0" y={100 - responseAmplitude}
            width="30" height={responseAmplitude}
            rx="4"
            fill={isAtResonance ? design.colors.success : design.colors.accentPrimary}
            style={{ transition: 'all 0.1s ease' }}
          />
          {isAtResonance && (
            <text x="15" y={100 - responseAmplitude - 8} textAnchor="middle" fill={design.colors.success} fontSize="11" fontWeight="700">
              MAX!
            </text>
          )}
        </g>

        {/* Info panel */}
        <g transform="translate(300, 230)">
          <rect x="0" y="0" width="140" height="40" rx="8" fill={design.colors.bgCard} stroke={design.colors.border} />
          <text x="10" y="16" fill={design.colors.textMuted} fontSize="9">NATURAL FREQ</text>
          <text x="10" y="32" fill={isAtResonance ? design.colors.success : design.colors.textSecondary} fontSize="14" fontWeight="700">
            {resonantFreq} Hz {isAtResonance ? '✓ RESONANCE!' : ''}
          </text>
        </g>
      </svg>
    );
  };

  // Application tab SVG graphics
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'mri') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            <linearGradient id="mriGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.colors.accentPrimary} />
              <stop offset="100%" stopColor={design.colors.violet} />
            </linearGradient>
            <filter id="mriGlow">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* MRI machine */}
          <ellipse cx="150" cy="100" rx="100" ry="80" fill={design.colors.bgElevated} stroke={design.colors.border} strokeWidth="3" />
          <ellipse cx="150" cy="100" rx="60" ry="50" fill={design.colors.bgDeep} />

          {/* Magnetic field lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M 50 ${80 + i * 10} Q 150 ${70 + i * 10 + 5 * Math.sin(time * 2 + i)} 250 ${80 + i * 10}`}
              fill="none"
              stroke={design.colors.violet}
              strokeWidth="1.5"
              opacity={0.3 + i * 0.1}
            />
          ))}

          {/* Patient */}
          <ellipse cx="150" cy="100" rx="25" ry="35" fill={design.colors.bgCard} />

          {/* Resonating nuclei */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2 + time * 3;
            const r = 15;
            return (
              <circle
                key={i}
                cx={150 + r * Math.cos(angle)}
                cy={100 + r * Math.sin(angle)}
                r="3"
                fill={design.colors.accentPrimary}
                filter="url(#mriGlow)"
              >
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
              </circle>
            );
          })}

          <text x="150" y="180" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Hydrogen nuclei resonate at specific frequencies
          </text>
        </svg>
      );
    }

    if (app.id === 'glass') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Wine glass */}
          <path
            d={`M 130 50 Q 120 80 125 110 Q 130 130 150 135 Q 170 130 175 110 Q 180 80 170 50 Z`}
            fill="url(#glassGrad)"
            stroke="#a5b4fc"
            strokeWidth="2"
          />
          <rect x="147" y="135" width="6" height="30" fill="#a5b4fc" />
          <ellipse cx="150" cy="170" rx="25" ry="5" fill="#a5b4fc" />

          {/* Vibration waves */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${130 - i * 15} ${80 + 10 * Math.sin(time * 5)} Q ${150} ${80 - 10 * Math.sin(time * 5)} ${170 + i * 15} ${80 + 10 * Math.sin(time * 5)}`}
              fill="none"
              stroke={design.colors.violet}
              strokeWidth="2"
              opacity={0.8 - i * 0.2}
            />
          ))}

          {/* Sound waves from singer */}
          <g transform="translate(230, 100)">
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                d={`M 0 0 Q ${-15 - i * 10} ${-20} ${-30 - i * 15} 0 Q ${-15 - i * 10} ${20} 0 0`}
                fill="none"
                stroke={design.colors.accentPrimary}
                strokeWidth="2"
                opacity={1 - i * 0.2}
              >
                <animate attributeName="opacity" values={`${1 - i * 0.2};${0.3 - i * 0.05};${1 - i * 0.2}`} dur="0.5s" repeatCount="indefinite" />
              </path>
            ))}
            <circle cx="20" cy="0" r="15" fill={design.colors.accentMuted} />
            <text x="20" y="5" textAnchor="middle" fontSize="14">🎤</text>
          </g>

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Sound at natural frequency shatters glass
          </text>
        </svg>
      );
    }

    if (app.id === 'bridge') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Bridge towers */}
          <rect x="60" y="60" width="20" height="100" fill={design.colors.bgElevated} stroke={design.colors.border} />
          <rect x="220" y="60" width="20" height="100" fill={design.colors.bgElevated} stroke={design.colors.border} />

          {/* Cables */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1="70" y1="60"
              x2={80 + i * 25} y2={100 + 10 * Math.sin(time * 2 + i * 0.5)}
              stroke={design.colors.textMuted}
              strokeWidth="1.5"
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={`r${i}`}
              x1="230" y1="60"
              x2={220 - i * 25} y2={100 + 10 * Math.sin(time * 2 + i * 0.5)}
              stroke={design.colors.textMuted}
              strokeWidth="1.5"
            />
          ))}

          {/* Bridge deck (oscillating) */}
          <path
            d={`M 30 ${110 + 15 * Math.sin(time * 2)} Q 150 ${110 - 15 * Math.sin(time * 2)} 270 ${110 + 15 * Math.sin(time * 2)}`}
            fill="none"
            stroke={design.colors.success}
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Wind arrows */}
          <g transform="translate(20, 80)">
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(0, ${i * 25})`}>
                <line x1="0" y1="0" x2="30" y2="0" stroke={design.colors.violet} strokeWidth="2" />
                <polygon points="30,0 20,-5 20,5" fill={design.colors.violet} />
              </g>
            ))}
          </g>

          {/* Tuned mass damper indicator */}
          <g transform="translate(140, 130)">
            <rect x="0" y="0" width="20" height="20" rx="4" fill={design.colors.warning}>
              <animate attributeName="x" values="0;5;0;-5;0" dur="1s" repeatCount="indefinite" />
            </rect>
          </g>

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Wind resonance can destroy bridges
          </text>
        </svg>
      );
    }

    if (app.id === 'music') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            <linearGradient id="guitarBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Guitar body */}
          <ellipse cx="200" cy="110" rx="70" ry="65" fill="url(#guitarBodyGrad)" />
          <ellipse cx="200" cy="110" rx="25" ry="25" fill="#1c1917" />

          {/* Neck */}
          <rect x="40" y="95" width="130" height="30" rx="3" fill="#44403c" />

          {/* Frets */}
          {[60, 90, 115, 135, 150].map((x, i) => (
            <line key={i} x1={x} y1="98" x2={x} y2="122" stroke="#a8a29e" strokeWidth="2" />
          ))}

          {/* Strings with resonance waves */}
          {[100, 105, 110, 115, 120].map((y, i) => (
            <g key={i}>
              <path
                d={`M 40 ${y} Q 100 ${y + 6 * Math.sin(time * 4 + i)} 150 ${y} Q 200 ${y - 6 * Math.sin(time * 4 + i)} 270 ${y}`}
                fill="none"
                stroke={design.colors.warning}
                strokeWidth={i === 2 ? "2.5" : "1.5"}
                opacity={i === 2 ? 1 : 0.6}
              />
            </g>
          ))}

          {/* Sound waves from body */}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx="200"
              cy="110"
              r={30 + i * 20 + (time * 20) % 60}
              fill="none"
              stroke={design.colors.warning}
              strokeWidth="1.5"
              opacity={0.5 - ((time * 20) % 60) / 120 - i * 0.1}
            />
          ))}

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Guitar body resonates to amplify sound
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
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
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
            boxShadow: design.shadow.glow(design.colors.accentPrimary),
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <svg viewBox="0 0 60 60" style={{ width: '60%', height: '60%' }}>
              {/* Spring */}
              <path
                d="M 30 5 L 25 12 L 35 18 L 25 24 L 35 30 L 25 36 L 30 42"
                fill="none"
                stroke={design.colors.accentPrimary}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Mass */}
              <circle
                cx="30"
                cy={48 + 4 * Math.sin(time * 3)}
                r="8"
                fill={design.colors.accentSecondary}
              />
            </svg>
          </div>

          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            color: design.colors.textPrimary,
            marginBottom: design.spacing.md,
            letterSpacing: '-0.02em'
          }}>
            Resonance
          </h1>

          <p style={{
            fontSize: '18px',
            color: design.colors.textSecondary,
            marginBottom: design.spacing.sm,
            maxWidth: '500px',
            lineHeight: 1.6
          }}>
            Ever pushed someone on a swing? <span style={{ color: design.colors.accentPrimary, fontWeight: 600 }}>Timing is everything!</span>
          </p>

          <p style={{
            fontSize: '15px',
            color: design.colors.textMuted,
            marginBottom: design.spacing.xl,
            maxWidth: '400px'
          }}>
            Discover why matching frequencies creates powerful effects
          </p>

          {/* Feature cards */}
          <div style={{ display: 'flex', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
            {[
              { icon: '🔊', label: 'Frequency' },
              { icon: '📈', label: 'Amplitude' },
              { icon: '⚡', label: 'Energy' }
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

          {renderButton('Start Learning', () => goToPhase('predict'), 'primary', false, 'lg')}

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
      { id: 'nothing', text: 'Nothing special happens at any particular frequency' },
      { id: 'resonance', text: 'At one specific frequency, amplitude becomes maximum' },
      { id: 'random', text: 'The response is unpredictable and random' },
      { id: 'always_max', text: 'Amplitude is always maximum regardless of frequency' }
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
                What happens when driving frequency matches natural frequency?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Imagine shaking a spring-mass system at different speeds. What do you predict?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setPrediction(opt.id);
                    emit('prediction', { value: opt.id });
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
                    transition: 'all 0.2s ease'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ marginTop: design.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Test Your Prediction', () => goToPhase('play'), 'primary', !prediction)}
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
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {renderResonanceVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Frequency slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Driving Frequency</label>
                  <span style={{ fontSize: '13px', color: isAtResonance ? design.colors.success : design.colors.accentPrimary, fontWeight: 700 }}>
                    {drivingFrequency} Hz {isAtResonance ? '✓ RESONANCE!' : ''}
                  </span>
                </div>
                <input
                  type="range" min="50" max="400" value={drivingFrequency}
                  onChange={(e) => setDrivingFrequency(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              {/* Status and continue */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: isAtResonance ? design.colors.successMuted : design.colors.bgElevated,
                  border: `1px solid ${isAtResonance ? design.colors.success : design.colors.border}`
                }}>
                  <span style={{ fontSize: '14px', color: isAtResonance ? design.colors.success : design.colors.textSecondary, fontWeight: 600 }}>
                    {isAtResonance ? '🎉 You found resonance!' : `Target: ${resonantFreq} Hz`}
                  </span>
                </div>
                {renderButton(foundResonance ? 'Continue' : 'Find Resonance First', () => goToPhase('review'), 'primary', !foundResonance)}
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
                The Physics of Resonance
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
              {[
                { icon: '🎯', title: 'Frequency Matching', desc: 'Maximum response when driving matches natural frequency' },
                { icon: '📈', title: 'Energy Accumulation', desc: 'Each cycle adds energy constructively' },
                { icon: '⚡', title: 'Amplitude Growth', desc: 'Response grows until limited by damping' },
                { icon: '🔄', title: 'Phase Relationship', desc: 'Velocity in phase with driving force at resonance' }
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
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.md, textTransform: 'uppercase', letterSpacing: '1px' }}>Natural Frequency Formula</p>
              <p style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                f = (1/2π)√(k/m)
              </p>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                k = stiffness, m = mass. Higher stiffness → higher frequency. More mass → lower frequency.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Continue', () => goToPhase('twist_predict'))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT
  if (phase === 'twist_predict') {
    const options = [
      { id: 'increase', text: 'Resonant frequency increases' },
      { id: 'decrease', text: 'Resonant frequency decreases' },
      { id: 'same', text: 'Resonant frequency stays the same' },
      { id: 'disappear', text: 'Resonance disappears entirely' }
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
                What happens when you add mass to the oscillator?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Think about heavy vs. light pendulums. How does mass affect natural frequency?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setTwistPrediction(opt.id);
                    emit('prediction', { value: opt.id, phase: 'twist_predict' });
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
                    transition: 'all 0.2s ease'
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
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {renderResonanceVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Mass slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Added Mass</label>
                  <span style={{ fontSize: '13px', color: design.colors.violet, fontWeight: 700 }}>+{addedMass}g</span>
                </div>
                <input
                  type="range" min="0" max="60" value={addedMass}
                  onChange={(e) => setAddedMass(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.violet }}
                />
              </div>

              {/* Frequency slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Driving Frequency</label>
                  <span style={{ fontSize: '13px', color: isAtResonance ? design.colors.success : design.colors.accentPrimary, fontWeight: 700 }}>
                    {drivingFrequency} Hz
                  </span>
                </div>
                <input
                  type="range" min="50" max="400" value={drivingFrequency}
                  onChange={(e) => setDrivingFrequency(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: design.colors.bgElevated
                }}>
                  <span style={{ fontSize: '12px', color: design.colors.textMuted }}>Natural Freq: </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: design.colors.accentPrimary }}>{resonantFreq} Hz</span>
                </div>
                {renderButton('Continue', () => goToPhase('twist_review'))}
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
                Mass Controls Frequency!
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
                You discovered a fundamental relationship:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.accentPrimary }}>More mass = Lower frequency</strong> — Heavy pendulums swing slowly
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.violet }}>Less mass = Higher frequency</strong> — Light objects vibrate faster
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.success }}>Bass speakers are bigger</strong> — Need more mass for low frequencies
                </li>
                <li style={{ color: design.colors.textPrimary }}>
                  <strong style={{ color: design.colors.warning }}>Engineers tune structures</strong> — Adjust mass to avoid dangerous resonances
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('See Real Applications', () => goToPhase('transfer'))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER - Tabbed applications with sequential navigation
  if (phase === 'transfer') {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size >= applications.length;

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            gap: design.spacing.sm,
            padding: `${design.spacing.md}px ${design.spacing.lg}px`,
            background: design.colors.bgCard,
            borderBottom: `1px solid ${design.colors.border}`,
            overflowX: 'auto'
          }}>
            {applications.map((a, idx) => (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: design.radius.md,
                  border: 'none',
                  background: activeApp === idx ? design.colors.bgElevated : 'transparent',
                  color: activeApp === idx ? design.colors.textPrimary : design.colors.textMuted,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {completedApps.has(idx) && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: design.colors.success,
                    color: '#fff',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>✓</span>
                )}
                {a.title}
              </button>
            ))}
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

              {/* Mark as Read / Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: design.spacing.md }}>
                {!completedApps.has(activeApp) ? (
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
                      padding: '14px 24px',
                      borderRadius: design.radius.lg,
                      background: design.colors.successMuted,
                      border: `1px solid ${design.colors.success}40`,
                      color: design.colors.success,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✓ Mark "{app.title}" as Read
                  </button>
                ) : (
                  <div style={{
                    padding: '14px 24px',
                    borderRadius: design.radius.lg,
                    background: design.colors.successMuted,
                    border: `1px solid ${design.colors.success}30`,
                    color: design.colors.success,
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    ✓ Completed
                  </div>
                )}

                {allAppsCompleted ? (
                  renderButton('Take Quiz', () => goToPhase('test'), 'success')
                ) : (
                  <div style={{
                    padding: '14px 24px',
                    borderRadius: design.radius.lg,
                    background: design.colors.bgElevated,
                    border: `1px solid ${design.colors.border}`,
                    color: design.colors.textMuted,
                    fontSize: '13px'
                  }}>
                    Read all {applications.length} applications to unlock quiz ({completedApps.size}/{applications.length})
                  </div>
                )}
              </div>
            </div>
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
              {score >= 8 ? "Excellent! You've truly mastered resonance!" :
               score >= 6 ? "Good job! Review the concepts you missed." :
               "Keep practicing! Review the material and try again."}
            </p>
            {renderButton('Complete Lesson', () => goToPhase('mastery'), 'success', false, 'lg')}
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
                      if (answered || navigationLockRef.current) return;
                      navigationLockRef.current = true;
                      const newAnswers = [...answers];
                      newAnswers[testIndex] = i;
                      setAnswers(newAnswers);
                      emit(i === q.correct ? 'correct_answer' : 'incorrect_answer', { questionIndex: testIndex });
                      setTimeout(() => { navigationLockRef.current = false; }, 400);
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
                      transition: 'all 0.2s ease'
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
              background: [design.colors.accentPrimary, design.colors.violet, design.colors.success, design.colors.warning][i % 4],
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
            boxShadow: `0 0 60px ${design.colors.accentPrimary}50`
          }}>
            <span style={{ fontSize: '56px' }}>🎓</span>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
            Congratulations!
          </h1>
          <p style={{ fontSize: '17px', color: design.colors.textSecondary, marginBottom: design.spacing.lg, maxWidth: '450px', lineHeight: 1.6 }}>
            You've mastered Resonance! You now understand one of physics' most powerful phenomena.
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
              {['Resonance', 'Natural Frequency', 'Damping', 'Mass Effect', 'Energy Transfer', 'Applications'].map((topic, i) => (
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
              setFoundResonance(false);
              setAddedMass(0);
              setDrivingFrequency(100);
              setCompletedApps(new Set());
            }, 'ghost')}
            {renderButton('Free Exploration', () => goToPhase('play'))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ResonanceRenderer;
