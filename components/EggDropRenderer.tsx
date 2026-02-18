import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EGGDROP RENDERER - CRUMPLE ZONES & IMPULSE PHYSICS
// Teaching: Force = Δp/Δt → More time = less force = surviving eggs
// ─────────────────────────────────────────────────────────────────────────────

interface GameEvent {
  type: 'prediction' | 'observation' | 'phase_change' | 'interaction' | 'completion';
  phase: string;
  data?: {
    prediction?: string;
    actual?: string;
    isCorrect?: boolean;
    score?: number;
    action?: string;
    details?: string;
  };
  timestamp: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUND UTILITY
// ─────────────────────────────────────────────────────────────────────────────

const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  const soundConfig = {
    click: { frequency: 400, type: 'sine' as OscillatorType, duration: 0.1 },
    success: { frequency: 800, type: 'triangle' as OscillatorType, duration: 0.3 },
    failure: { frequency: 200, type: 'triangle' as OscillatorType, duration: 0.3 },
    transition: { frequency: 500, type: 'sine' as OscillatorType, duration: 0.1 },
    complete: { frequency: 800, type: 'sine' as OscillatorType, duration: 0.3 }
  };
  const { frequency, type, duration } = soundConfig[soundType];
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio not available
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase =
  | 'hook'           // 1. Dramatic scenario
  | 'predict'        // 2. Initial prediction
  | 'play'           // 3. Interactive simulation
  | 'review'         // 4. Core concept explanation
  | 'twist_predict'  // 5. Predict with new scenario
  | 'twist_play'     // 6. Play twist scenario
  | 'twist_review'   // 7. Review twist insights
  | 'transfer'       // 8. Real-world applications
  | 'test'           // 9. 10-question assessment
  | 'mastery';       // 10. Celebration & summary

const isValidPhase = (phase: string): phase is Phase => {
  return ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].includes(phase);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface EggDropRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const design = {
  colors: {
    bgDeep: '#0f1419',
    bgPrimary: '#1a202c',
    bgSecondary: '#1e2a3a',
    bgCard: '#2d3748',
    bgElevated: '#374151',
    bgHover: '#4b5563',
    textPrimary: '#e2e8f0',
    textSecondary: '#cbd5e0',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    border: '#4a5568',
    accentPrimary: '#6366f1',
    accentSecondary: '#8b5cf6',
    accentMuted: '#4f46e5',
    accentGlow: '#818cf840',
    success: '#10b981',
    successMuted: '#10b98120',
    error: '#ef4444',
    errorMuted: '#ef444420',
    warning: '#f59e0b',
    cyan: '#06b6d4',
    cyanMuted: '#06b6d420',
    eggYellow: '#fbbf24',
    foam: '#60a5fa',
    ground: '#78716c'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px'
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  shadow: {
    glow: (color: string) => `0 0 20px ${color}40, 0 0 40px ${color}20`
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const EggDropRenderer: React.FC<EggDropRendererProps> = ({
  onComplete,
  emitGameEvent,
  gamePhase
}) => {
  // Phase management
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Learn',
    twist_predict: 'Predict Twist',
    twist_play: 'Explore Twist',
    twist_review: 'Understand',
    transfer: 'Applications',
    test: 'Quiz',
    mastery: 'Complete'
  };

  const getInitialPhase = (): Phase => {
    if (gamePhase && isValidPhase(gamePhase)) return gamePhase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase());
  const navigationLockRef = useRef(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [dropComplete, setDropComplete] = useState(false);
  const [eggPosition, setEggPosition] = useState(0);
  const [paddingThickness, setPaddingThickness] = useState(0.5); // 0-1 slider for play phase
  const [dropHeight, setDropHeight] = useState(2.0); // meters for twist_play
  const [eggSurvived, setEggSurvived] = useState<boolean | null>(null);

  // Transfer and test state
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  // Animation ref
  const animationRef = useRef<number | null>(null);

  // Phase sync
  useEffect(() => {
    if (gamePhase && isValidPhase(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Emit game events
  const emitEvent = useCallback((
    type: GameEvent['type'],
    data?: GameEvent['data'],
    message?: string
  ) => {
    if (emitGameEvent) {
      emitGameEvent({ type, phase, data, timestamp: Date.now(), message });
    }
  }, [emitGameEvent, phase]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { action: `Moved to ${newPhase}` });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [emitEvent]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─────────────────────────────────────────────────────────────────────────
  // EGG DROP PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  const calculateSurvival = (padding: number, height: number) => {
    // Impulse = F * Δt = Δp
    // More padding = longer Δt = less F
    // velocity from height: v = sqrt(2*g*h)
    const velocity = Math.sqrt(2 * 9.8 * height);
    const momentum = 0.05 * velocity; // 50g egg
    const stopTime = 0.01 + padding * 0.1; // More padding = more time
    const force = momentum / stopTime;
    const breakForce = 15; // Newtons
    return force < breakForce;
  };

  const startDrop = () => {
    if (isDropping) return;
    setIsDropping(true);
    setDropComplete(false);
    setEggPosition(0);
    setEggSurvived(null);

    const animate = () => {
      setEggPosition(prev => {
        const newPos = prev + 5;
        if (newPos >= 100) {
          setDropComplete(true);
          setIsDropping(false);
          const survived = calculateSurvival(paddingThickness, 2.0);
          setEggSurvived(survived);
          playSound(survived ? 'success' : 'failure');
          emitEvent('observation', {
            details: `Dropped with padding=${paddingThickness.toFixed(2)} - ${survived ? 'survived' : 'broke'}`
          });
          return 100;
        }
        animationRef.current = requestAnimationFrame(animate);
        return newPos;
      });
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const startTwistDrop = () => {
    if (isDropping) return;
    setIsDropping(true);
    setDropComplete(false);
    setEggPosition(0);
    setEggSurvived(null);

    const animate = () => {
      setEggPosition(prev => {
        const speedMultiplier = Math.min(10, dropHeight * 2);
        const newPos = prev + speedMultiplier;
        if (newPos >= 100) {
          setDropComplete(true);
          setIsDropping(false);
          const survived = calculateSurvival(0.5, dropHeight);
          setEggSurvived(survived);
          playSound(survived ? 'success' : 'failure');
          emitEvent('observation', {
            details: `Dropped from ${dropHeight.toFixed(1)}m - ${survived ? 'survived' : 'broke'}`
          });
          return 100;
        }
        animationRef.current = requestAnimationFrame(animate);
        return newPos;
      });
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const resetDrop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setEggPosition(0);
    setDropComplete(false);
    setEggSurvived(null);
    setIsDropping(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: `linear-gradient(145deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
    fontFamily: design.font.sans,
    color: design.colors.textPrimary,
    overflow: 'hidden'
  };

  const renderButton = (text: string, onClick: () => void, variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary', disabled = false) => {
    const baseStyle: React.CSSProperties = {
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: 500,
      borderRadius: design.radius.lg,
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.5 : 1,
      fontFamily: design.font.sans
    };

    const variants = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary}, ${design.colors.accentSecondary})`,
        color: design.colors.textPrimary,
        boxShadow: design.shadow.glow(design.colors.accentPrimary)
      },
      secondary: {
        background: design.colors.bgElevated,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
        border: `1px solid ${design.colors.border}`
      },
      success: {
        background: design.colors.success,
        color: design.colors.textPrimary,
        boxShadow: design.shadow.glow(design.colors.success)
      }
    };

    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={{ ...baseStyle, ...variants[variant] }}
      >
        {text}
      </button>
    );
  };

  // Progress bar with navigation dots
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const progressPercent = ((currentIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{
        padding: '16px 24px',
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Progress bar indicator */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${progressPercent}%`,
          height: '3px',
          background: design.colors.accentPrimary,
          transition: 'width 0.3s ease'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.accentPrimary }}>
            Egg Drop
          </span>
          {/* Navigation dots - clickable */}
          <div style={{ display: 'flex', gap: '6px' }} role="navigation" aria-label="Phase navigation">
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={phaseLabels[p]}
                aria-label={phaseLabels[p]}
                style={{
                  width: p === phase ? '24px' : '12px',
                  height: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: idx < currentIndex ? design.colors.success : p === phase ? design.colors.accentPrimary : 'rgba(148,163,184,0.7)',
                  transition: 'all 0.3s ease',
                  padding: 0
                }}
              />
            ))}
          </div>
        </div>
        {/* Back and Next buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={goBack}
            disabled={currentIndex === 0}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: design.radius.sm,
              border: `1px solid ${design.colors.border}`,
              background: 'transparent',
              color: currentIndex === 0 ? design.colors.textMuted : design.colors.textSecondary,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            Back
          </button>
          <span style={{ fontSize: '12px', color: design.colors.textMuted }}>
            {currentIndex + 1} / {phaseOrder.length}
          </span>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EGG DROP VISUALIZATION - PREMIUM SVG GRAPHICS
  // ─────────────────────────────────────────────────────────────────────────

  const renderEggDropVisualization = (
    position: number,
    survived: boolean | null,
    complete: boolean,
    padding: number,
    height: number,
    showSliders: boolean = false
  ) => {
    const svgHeight = 400;
    const dropZoneHeight = 300;
    const eggY = 50 + (position / 100) * (dropZoneHeight - 100);
    const paddingHeight = padding * 50;

    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <svg viewBox="0 0 400 400" style={{ width: '100%', height: 'auto', maxHeight: '400px' }}>
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="eggGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor={design.colors.eggYellow} />
            </linearGradient>
            <linearGradient id="foamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor={design.colors.foam} />
            </linearGradient>
            <filter id="eggShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sky background */}
          <rect x="0" y="0" width="400" height="350" fill="url(#skyGrad)" />

          {/* Decorative trajectory path */}
          <path
            d={`M 50,${50} Q 200,${30} 350,${50}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.3"
          />

          {/* Grid lines for reference */}
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <line
                x1="50"
                y1={50 + i * 60}
                x2="350"
                y2={50 + i * 60}
                stroke="#94a3b8"
                strokeWidth="0.5"
                strokeDasharray="4,4"
                opacity="0.3"
              />
              <text
                x="40"
                y={50 + i * 60 + 4}
                fontSize="11"
                fill={design.colors.textMuted}
                textAnchor="end"
              >
                {(4-i)}m
              </text>
            </g>
          ))}

          {/* Height indicator with background */}
          <rect x="120" y="15" width="160" height="24" fill={design.colors.bgCard} rx="6" opacity="0.9" />
          <text x="200" y="30" fontSize="14" fontWeight="700" fill={design.colors.textPrimary} textAnchor="middle">
            Drop Height: {height.toFixed(1)}m
          </text>

          {/* Ground */}
          <rect x="0" y="350" width="400" height="50" fill={design.colors.ground} />
          <text x="200" y="375" fontSize="12" fontWeight="600" fill="#d4d4d4" textAnchor="middle">
            Ground
          </text>

          {/* Padding layer */}
          {paddingHeight > 0 && (
            <g>
              <rect
                x="150"
                y={350 - paddingHeight}
                width="100"
                height={paddingHeight}
                fill="url(#foamGrad)"
                rx="4"
              />
              <text
                x="200"
                y={350 - paddingHeight/2 + 4}
                fontSize="11"
                fontWeight="600"
                fill="#1e3a8a"
                textAnchor="middle"
              >
                Foam Padding
              </text>
            </g>
          )}

          {/* Egg */}
          <g filter="url(#eggShadow)">
            <ellipse
              cx="200"
              cy={eggY}
              rx="20"
              ry="28"
              fill={complete && !survived ? design.colors.error : "url(#eggGrad)"}
              stroke="#f59e0b"
              strokeWidth="2"
            />
            {complete && !survived && (
              <g>
                <line x1="190" y1={eggY-10} x2="210" y2={eggY+10} stroke="#7f1d1d" strokeWidth="2" />
                <line x1="190" y1={eggY+10} x2="210" y2={eggY-10} stroke="#7f1d1d" strokeWidth="2" />
                <text x="200" y={eggY+50} fontSize="16" fill={design.colors.error} textAnchor="middle">
                  💥 Broken!
                </text>
              </g>
            )}
            {complete && survived && (
              <g>
                <circle cx="195" cy={eggY-5} r="2" fill="#000" />
                <circle cx="205" cy={eggY-5} r="2" fill="#000" />
                <path d={`M 195 ${eggY+5} Q 200 ${eggY+10} 205 ${eggY+5}`} stroke="#000" strokeWidth="1.5" fill="none" />
                <text x="200" y={eggY+50} fontSize="16" fill={design.colors.success} textAnchor="middle">
                  ✓ Survived!
                </text>
              </g>
            )}
          </g>

          {/* Motion lines when dropping */}
          {isDropping && (
            <g>
              <line x1="190" y1={eggY-35} x2="190" y2={eggY-45} stroke="#cbd5e0" strokeWidth="2" opacity="0.6" />
              <line x1="210" y1={eggY-35} x2="210" y2={eggY-45} stroke="#cbd5e0" strokeWidth="2" opacity="0.6" />
            </g>
          )}

          {/* Legend */}
          <g transform="translate(10, 370)">
            <rect x="0" y="0" width="12" height="12" fill="url(#foamGrad)" rx="2" />
            <text x="18" y="10" fontSize="11" fill={design.colors.textSecondary}>
              Padding
            </text>
            <rect x="80" y="0" width="12" height="12" fill="url(#eggGrad)" rx="2" />
            <text x="98" y="10" fontSize="11" fill={design.colors.textSecondary}>
              Egg
            </text>
            <rect x="140" y="0" width="12" height="12" fill={design.colors.ground} rx="2" />
            <text x="158" y="10" fontSize="11" fill={design.colors.textSecondary}>
              Ground
            </text>
          </g>

          {/* Velocity arrow indicator when dropping */}
          {isDropping && eggPosition > 20 && (
            <g>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={design.colors.error} />
                </marker>
              </defs>
              <line x1="230" y1={eggY - 20} x2="230" y2={eggY + 10} stroke={design.colors.error} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <text x="240" y={eggY} fontSize="11" fill={design.colors.error} fontWeight="600">
                v
              </text>
              {/* Motion blur effect */}
              <ellipse cx="200" cy={eggY - 15} rx="18" ry="10" fill={design.colors.eggYellow} opacity="0.3" />
            </g>
          )}
        </svg>

        {/* Real-time physics readout */}
        {showSliders && dropComplete && (
          <div style={{
            marginTop: design.spacing.lg,
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderRadius: design.radius.lg,
            border: `1px solid ${design.colors.border}`
          }}>
            <div style={{ fontSize: '13px', color: design.colors.textSecondary, marginBottom: design.spacing.sm }}>
              <strong style={{ color: design.colors.textPrimary }}>Physics Analysis:</strong>
            </div>
            <div style={{ fontSize: '12px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
              • Velocity at impact: <strong style={{ color: design.colors.cyan }}>{Math.sqrt(2 * 9.8 * height).toFixed(2)} m/s</strong><br />
              • Momentum: <strong style={{ color: design.colors.cyan }}>{(0.05 * Math.sqrt(2 * 9.8 * height)).toFixed(3)} kg⋅m/s</strong><br />
              • Stop time: <strong style={{ color: design.colors.cyan }}>{(0.01 + padding * 0.1).toFixed(3)} s</strong><br />
              • Impact force: <strong style={{ color: survived ? design.colors.success : design.colors.error }}>
                {(0.05 * Math.sqrt(2 * 9.8 * height) / (0.01 + padding * 0.1)).toFixed(1)} N
              </strong>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Static preview for predict phases
  const renderStaticEggPreview = () => {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <svg viewBox="0 0 400 350" style={{ width: '100%', height: 'auto', maxHeight: '350px' }}>
          <defs>
            <linearGradient id="staticSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="staticEggGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor={design.colors.eggYellow} />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect x="0" y="0" width="400" height="300" fill="url(#staticSkyGrad)" />

          {/* Grid */}
          {[0, 1, 2, 3].map(i => (
            <line
              key={i}
              x1="50"
              y1={50 + i * 60}
              x2="350"
              y2={50 + i * 60}
              stroke="#94a3b8"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              opacity="0.3"
            />
          ))}

          {/* Title */}
          <text x="200" y="30" fontSize="16" fontWeight="700" fill={design.colors.textPrimary} textAnchor="middle">
            The Egg Drop Challenge
          </text>

          {/* Egg at top */}
          <ellipse cx="120" cy="80" rx="18" ry="25" fill="url(#staticEggGrad)" stroke="#f59e0b" strokeWidth="2" />
          <text x="120" y="120" fontSize="11" fill={design.colors.textSecondary} textAnchor="middle">No Padding</text>

          {/* Egg at top with padding */}
          <ellipse cx="280" cy="80" rx="18" ry="25" fill="url(#staticEggGrad)" stroke="#f59e0b" strokeWidth="2" />
          <rect x="260" y="260" width="40" height="30" fill={design.colors.foam} rx="4" opacity="0.7" />
          <text x="280" y="120" fontSize="11" fill={design.colors.textSecondary} textAnchor="middle">With Padding</text>

          {/* Ground */}
          <rect x="0" y="300" width="400" height="50" fill={design.colors.ground} />
          <text x="200" y="325" fontSize="12" fontWeight="600" fill="#d4d4d4" textAnchor="middle">
            Ground (3m drop)
          </text>

          {/* Question mark */}
          <text x="200" y="180" fontSize="48" fill={design.colors.accentPrimary} textAnchor="middle" opacity="0.4">
            ?
          </text>
        </svg>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────

  // HOOK
  if (phase === 'hook') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          overflowY: 'auto',
          paddingBottom: '100px'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${design.colors.warning}40 0%, ${design.colors.bgElevated} 100%)`,
            border: `2px solid ${design.colors.warning}60`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            fontSize: '48px'
          }}>
            🥚
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff', marginBottom: design.spacing.md }}>
            The Egg Drop Challenge
          </h1>
          <p style={{ fontSize: '16px', color: '#9ca3af', marginBottom: design.spacing.xl, maxWidth: '500px', lineHeight: 1.6, fontWeight: 400 }}>
            Imagine dropping an egg from a 3-story building. One has foam packaging, one has nothing. Which survives? The answer reveals a fundamental physics principle that saves lives every day.
          </p>

          <div style={{
            padding: design.spacing.lg,
            borderRadius: design.radius.lg,
            background: design.colors.accentMuted + '20',
            border: `1px solid ${design.colors.accentPrimary}40`,
            marginBottom: design.spacing.xl,
            maxWidth: '450px'
          }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>
              🎯 What You'll Learn
            </p>
            <ul style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'left', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Why crumple zones save lives in car crashes</li>
              <li>The impulse-momentum theorem (F = Δp/Δt)</li>
              <li>How packaging protects fragile items</li>
              <li>Real engineering applications of cushioning</li>
            </ul>
          </div>

          {renderButton('Begin Exploration →', goNext)}
        </div>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    const predictionOptions = [
      { id: 'stops', label: 'Padding stops the egg before impact', icon: '🛑' },
      { id: 'reduces_force', label: 'Padding reduces the impact force', icon: '📉' },
      { id: 'changes_nothing', label: 'Padding makes no difference', icon: '🤷' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              Make Your Prediction
            </h2>
            <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, textAlign: 'center', lineHeight: 1.6 }}>
              An egg is dropped from 3 meters onto foam padding. <strong style={{ color: design.colors.textPrimary }}>How does the padding help?</strong>
            </p>

            {renderStaticEggPreview()}

            <div style={{ marginTop: design.spacing.xl }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                Select your hypothesis:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
                {predictionOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setPrediction(opt.id);
                      playSound('click');
                      emitEvent('prediction', { prediction: opt.id });
                    }}
                    style={{
                      padding: design.spacing.lg,
                      borderRadius: design.radius.lg,
                      border: `2px solid ${prediction === opt.id ? design.colors.accentPrimary : design.colors.border}`,
                      background: prediction === opt.id ? design.colors.accentPrimary + '20' : design.colors.bgCard,
                      color: design.colors.textPrimary,
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: design.spacing.md
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {prediction && (
              <div style={{ marginTop: design.spacing.xl, textAlign: 'center' }}>
                {renderButton('Test Your Prediction →', goNext)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PLAY
  if (phase === 'play') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              Interactive Egg Drop Lab
            </h2>
            <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, textAlign: 'center', lineHeight: 1.6 }}>
              Adjust the padding thickness and drop the egg. Watch how <strong style={{ color: design.colors.cyan }}>increasing padding time</strong> reduces the <strong style={{ color: design.colors.warning }}>impact force</strong> compared to the baseline (no padding).
            </p>

            {/* Educational context */}
            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>
                🔬 What to observe:
              </p>
              <ul style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.7, paddingLeft: '20px', margin: 0 }}>
                <li><strong style={{ color: design.colors.textPrimary }}>Cause:</strong> More padding = longer stopping time (Δt)</li>
                <li><strong style={{ color: design.colors.textPrimary }}>Effect:</strong> Same momentum change (Δp) over more time = less force (F = Δp/Δt)</li>
                <li><strong style={{ color: design.colors.textPrimary }}>Key term:</strong> <span style={{ color: design.colors.cyan, fontWeight: 700 }}>Impulse</span> = Force × Time = Change in Momentum</li>
                <li><strong style={{ color: design.colors.textPrimary }}>Why it matters:</strong> This principle protects cargo, passengers in cars, and athletes in sports</li>
              </ul>
            </div>

            {renderEggDropVisualization(eggPosition, eggSurvived, dropComplete, paddingThickness, 2.0, true)}

            {/* Comparison: Before vs After */}
            {dropComplete && (
              <div style={{
                marginTop: design.spacing.xl,
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.md, textAlign: 'center' }}>
                  Comparison: No Padding vs Your Padding
                </h4>
                <div style={{ display: 'flex', flexDirection: 'row', gap: design.spacing.lg, justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '12px', color: design.colors.textMuted, marginBottom: design.spacing.sm, fontWeight: 400 }}>
                      No Padding (0%)
                    </div>
                    <div style={{ fontSize: '24px', marginBottom: design.spacing.xs }}>💥</div>
                    <div style={{ fontSize: '11px', color: design.colors.error, fontWeight: 600 }}>Broken</div>
                    <div style={{ fontSize: '11px', color: design.colors.textMuted, marginTop: design.spacing.xs }}>
                      {(0.05 * Math.sqrt(2 * 9.8 * 2) / 0.01).toFixed(0)} N
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '12px', color: design.colors.textMuted, marginBottom: design.spacing.sm, fontWeight: 400 }}>
                      Your Padding ({(paddingThickness * 100).toFixed(0)}%)
                    </div>
                    <div style={{ fontSize: '24px', marginBottom: design.spacing.xs }}>{eggSurvived ? '✓' : '💥'}</div>
                    <div style={{ fontSize: '11px', color: eggSurvived ? design.colors.success : design.colors.error, fontWeight: 600 }}>
                      {eggSurvived ? 'Survived' : 'Broken'}
                    </div>
                    <div style={{ fontSize: '11px', color: design.colors.textMuted, marginTop: design.spacing.xs }}>
                      {(0.05 * Math.sqrt(2 * 9.8 * 2) / (0.01 + paddingThickness * 0.1)).toFixed(0)} N
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slider controls */}
            <div style={{
              marginTop: design.spacing.xl,
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: design.colors.textPrimary,
                marginBottom: design.spacing.sm
              }}>
                Padding Thickness: <span style={{ color: design.colors.cyan }}>{(paddingThickness * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={paddingThickness}
                onChange={(e) => {
                  setPaddingThickness(parseFloat(e.target.value));
                  resetDrop();
                }}
                onInput={(e) => {
                  setPaddingThickness(parseFloat((e.target as HTMLInputElement).value));
                  resetDrop();
                }}
                style={{
                  width: '100%',
                  height: '24px',
                  borderRadius: '12px',
                  background: `linear-gradient(to right, ${design.colors.error} 0%, ${design.colors.warning} 50%, ${design.colors.success} 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  touchAction: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: design.colors.textMuted, marginTop: design.spacing.xs }}>
                <span>None (0%)</span>
                <span>Thick (100%)</span>
              </div>
            </div>

            <div style={{ marginTop: design.spacing.lg, display: 'flex', gap: design.spacing.md, justifyContent: 'center' }}>
              {renderButton('Drop Egg', startDrop, 'primary', isDropping)}
              {renderButton('Reset', resetDrop, 'ghost')}
            </div>

            {dropComplete && (
              <div style={{ marginTop: design.spacing.xl, textAlign: 'center' }}>
                {renderButton('Continue to Explanation →', goNext)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    const userPredictionText = prediction === 'reduces_force'
      ? "You were right! Padding reduces the force."
      : prediction === 'stops'
      ? "Close! Padding doesn't stop the egg, it extends the stopping time."
      : prediction
      ? "Not quite. Padding does make a difference by extending the collision time."
      : "Let's see what you observed in the experiment.";

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              The Impulse-Momentum Theorem
            </h2>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: prediction === 'reduces_force' ? design.colors.successMuted : design.colors.warning + '20',
              border: `1px solid ${prediction === 'reduces_force' ? design.colors.success : design.colors.warning}60`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '14px', color: design.colors.textPrimary, lineHeight: 1.6 }}>
                <strong>Your prediction:</strong> {userPredictionText}
              </p>
            </div>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.xl
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 900,
                color: design.colors.accentPrimary,
                textAlign: 'center',
                marginBottom: design.spacing.lg,
                fontFamily: 'Georgia, serif'
              }}>
                <span style={{ color: design.colors.cyan, fontWeight: 900 }}>F</span> × <span style={{ color: design.colors.warning, fontWeight: 900 }}>Δt</span> = <span style={{ color: design.colors.textPrimary, fontWeight: 900 }}>Δp</span>
              </div>
              <div style={{ fontSize: '13px', color: design.colors.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
                <span style={{ color: design.colors.cyan, fontWeight: 700 }}>Force</span> × <span style={{ color: design.colors.warning, fontWeight: 700 }}>Time</span> = <span style={{ fontWeight: 700 }}>Change in Momentum</span>
              </div>
            </div>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.accentPrimary + '10',
              border: `1px solid ${design.colors.accentPrimary}40`,
              marginBottom: design.spacing.xl
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                💡 Why Padding Works
              </h3>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.md }}>
                When the egg hits the ground, its momentum must change from moving to stopped. This change in momentum (Δp) is fixed—it's determined by the egg's mass and velocity.
              </p>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.md }}>
                <strong style={{ color: design.colors.warning }}>The key insight:</strong> If we can't change Δp, we can change Δt! Padding <strong>extends the collision time</strong>, which means the force must be smaller to produce the same momentum change.
              </p>
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.md,
                background: design.colors.bgCard,
                marginTop: design.spacing.lg
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.7 }}>
                  • <strong style={{ color: design.colors.error }}>No padding:</strong> Δt ≈ 0.01s → Large force → Egg breaks 💥<br />
                  • <strong style={{ color: design.colors.success }}>With padding:</strong> Δt ≈ 0.1s → 10× smaller force → Egg survives ✓
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              {renderButton('Explore a Twist →', goNext)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST_PREDICT
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'all_survive', label: 'All heights work with foam padding', icon: '✓' },
      { id: 'fails_high', label: 'Foam fails at extreme heights', icon: '📈' },
      { id: 'works_better', label: 'Foam works better at higher drops', icon: '🚀' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              The Height Question
            </h2>
            <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, textAlign: 'center', lineHeight: 1.6 }}>
              We know foam padding works at 2 meters. But what if we increase the drop height? Same foam, different heights.
            </p>

            <div style={{ maxWidth: '500px', margin: '0 auto', marginBottom: design.spacing.xl }}>
              <svg viewBox="0 0 400 350" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  <linearGradient id="twistSky" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#bfdbfe" />
                    <stop offset="100%" stopColor="#dbeafe" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="300" fill="url(#twistSky)" />

                {/* Three building heights */}
                <rect x="50" y="250" width="80" height="50" fill="#94a3b8" />
                <text x="90" y="235" fontSize="12" fill={design.colors.textSecondary} textAnchor="middle">1m</text>
                <ellipse cx="90" cy="230" rx="10" ry="14" fill={design.colors.eggYellow} stroke="#f59e0b" strokeWidth="1.5" />

                <rect x="160" y="200" width="80" height="100" fill="#94a3b8" />
                <text x="200" y="185" fontSize="12" fill={design.colors.textSecondary} textAnchor="middle">3m</text>
                <ellipse cx="200" cy="180" rx="10" ry="14" fill={design.colors.eggYellow} stroke="#f59e0b" strokeWidth="1.5" />

                <rect x="270" y="120" width="80" height="180" fill="#94a3b8" />
                <text x="310" y="105" fontSize="12" fill={design.colors.textSecondary} textAnchor="middle">6m</text>
                <ellipse cx="310" cy="100" rx="10" ry="14" fill={design.colors.eggYellow} stroke="#f59e0b" strokeWidth="1.5" />

                <rect x="0" y="300" width="400" height="50" fill={design.colors.ground} />

                {/* Same foam padding at bottom */}
                <rect x="70" y="280" width="40" height="20" fill={design.colors.foam} rx="2" />
                <rect x="180" y="280" width="40" height="20" fill={design.colors.foam} rx="2" />
                <rect x="290" y="280" width="40" height="20" fill={design.colors.foam} rx="2" />

                <text x="200" y="330" fontSize="14" fontWeight="700" fill="#d4d4d4" textAnchor="middle">
                  Same Foam Padding
                </text>
              </svg>
            </div>

            <div style={{ marginTop: design.spacing.xl }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                What happens as we increase the drop height?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
                {twistOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTwistPrediction(opt.id);
                      playSound('click');
                      emitEvent('prediction', { prediction: opt.id });
                    }}
                    style={{
                      padding: design.spacing.lg,
                      borderRadius: design.radius.lg,
                      border: `2px solid ${twistPrediction === opt.id ? design.colors.accentPrimary : design.colors.border}`,
                      background: twistPrediction === opt.id ? design.colors.accentPrimary + '20' : design.colors.bgCard,
                      color: design.colors.textPrimary,
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: design.spacing.md
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {twistPrediction && (
              <div style={{ marginTop: design.spacing.xl, textAlign: 'center' }}>
                {renderButton('Test Different Heights →', goNext)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TWIST_PLAY
  if (phase === 'twist_play') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              Height Experiment
            </h2>
            <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, textAlign: 'center', lineHeight: 1.6 }}>
              Same foam padding, but vary the drop height. Notice how velocity (and momentum) increase with height: <strong style={{ color: design.colors.cyan }}>v = √(2gh)</strong>
            </p>

            {renderEggDropVisualization(eggPosition, eggSurvived, dropComplete, 0.5, dropHeight, true)}

            {/* Height slider */}
            <div style={{
              marginTop: design.spacing.xl,
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: design.colors.textPrimary,
                marginBottom: design.spacing.sm
              }}>
                Drop Height: <span style={{ color: design.colors.cyan }}>{dropHeight.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.1"
                value={dropHeight}
                onChange={(e) => {
                  setDropHeight(parseFloat(e.target.value));
                  resetDrop();
                }}
                onInput={(e) => {
                  setDropHeight(parseFloat((e.target as HTMLInputElement).value));
                  resetDrop();
                }}
                style={{
                  width: '100%',
                  height: '24px',
                  borderRadius: '12px',
                  background: `linear-gradient(to right, ${design.colors.success} 0%, ${design.colors.warning} 50%, ${design.colors.error} 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  touchAction: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: design.colors.textMuted, marginTop: design.spacing.xs }}>
                <span>Low (0.5m)</span>
                <span>High (6m)</span>
              </div>
            </div>

            <div style={{ marginTop: design.spacing.lg, display: 'flex', gap: design.spacing.md, justifyContent: 'center' }}>
              {renderButton('Drop Egg', startTwistDrop, 'primary', isDropping)}
              {renderButton('Reset', resetDrop, 'ghost')}
            </div>

            {dropComplete && (
              <div style={{ marginTop: design.spacing.xl, textAlign: 'center' }}>
                {renderButton('See the Complete Picture →', goNext)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TWIST_REVIEW
  if (phase === 'twist_review') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              The Complete Picture
            </h2>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.xl
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                🎯 Why Padding Eventually Fails
              </h3>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.md }}>
                As drop height increases, velocity at impact grows: <strong style={{ color: design.colors.cyan, fontFamily: 'Georgia, serif' }}>v = √(2gh)</strong>
              </p>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.md }}>
                Higher velocity means <strong>more momentum to dissipate</strong>. Even though padding extends the collision time, at extreme heights the momentum change is so large that the force still exceeds the egg's breaking point.
              </p>
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.md,
                background: design.colors.accentPrimary + '10',
                marginTop: design.spacing.lg
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.7 }}>
                  • <strong style={{ color: design.colors.success }}>1m drop:</strong> v = 4.4 m/s → Foam works ✓<br />
                  • <strong style={{ color: design.colors.warning }}>3m drop:</strong> v = 7.7 m/s → Foam barely works ⚠️<br />
                  • <strong style={{ color: design.colors.error }}>6m drop:</strong> v = 10.8 m/s → Foam fails 💥
                </p>
              </div>
            </div>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.successMuted,
              border: `1px solid ${design.colors.success}40`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.md }}>
                💡 Key Takeaway
              </p>
              <p style={{ fontSize: '15px', color: design.colors.textPrimary, lineHeight: 1.7 }}>
                Protection has limits. You need to design padding based on the expected impact energy. That's why cars have different crumple zones than bicycles, and why shipping boxes for phones differ from those for furniture.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              {renderButton('See Real-World Applications →', goNext)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER
  if (phase === 'transfer') {
    const applications = [
      {
        title: '🚗 Automotive Crumple Zones',
        content: `Modern cars have engineered crumple zones that extend collision time from 0.05s to 0.15s. In a 60 mph (27 m/s) crash, this reduces peak forces on passengers from 54,000 N to 18,000 N—the difference between life and death. Mercedes-Benz pioneered this in 1959, and it's now mandated worldwide. The 2023 Tesla Model S has 6 distinct crumple zones optimized via crash simulation.`,
        stats: '3× longer collision time = 3× less force'
      },
      {
        title: '📦 Packaging Engineering',
        content: `Amazon ships 1.6 million packages daily, and impulse physics determines every cushion. For a 2kg laptop dropped 1m, bubble wrap extends impact time to 0.03s (vs 0.005s on cardboard), reducing force from 3,920 N to 653 N—below the 800 N laptop chassis failure threshold. FedEx uses 4-layer foam for fragile items, with each layer adding 0.01s of protection time.`,
        stats: 'FedEx damage rate: 0.5% with proper cushioning vs 12% without'
      },
      {
        title: '🏃 Athletic Safety Gear',
        content: `NFL helmets use multi-density foam (soft outer, firm inner) to extend impact time from 0.006s to 0.015s during a 25 mph collision. This reduces peak brain acceleration from 150g to 60g—critical for preventing concussions. Riddell's SpeedFlex helmet, worn by 40% of NFL players, has suspension padding that increases Δt by 2.5×, cutting concussion risk by 31%.`,
        stats: '60g threshold: Below = safe, Above = concussion risk'
      }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              Real-World Impact
            </h2>
            <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: design.spacing.lg, textAlign: 'center', lineHeight: 1.6 }}>
              The impulse-momentum theorem isn't just physics class—it saves lives and protects billions in goods every day. From automotive engineering to package delivery, understanding F × Δt = Δp is critical.
            </p>
            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.accentPrimary + '10',
              border: `1px solid ${design.colors.accentPrimary}40`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.7 }}>
                <strong style={{ color: design.colors.accentPrimary }}>Key Principle:</strong> When momentum change is unavoidable, engineers design systems to maximize collision time. Every 0.01 second of extra time can mean the difference between protection and destruction. This principle applies across industries—from shipping fragile electronics to protecting passengers in vehicles to designing sports equipment.
              </p>
            </div>

            {/* Application cards with internal navigation */}
            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.xl
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: design.spacing.sm,
                marginBottom: design.spacing.lg
              }}>
                {applications.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '32px',
                      height: '4px',
                      borderRadius: '2px',
                      background: idx === currentAppIndex ? design.colors.accentPrimary : design.colors.bgElevated,
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>

              <div style={{ textAlign: 'center', marginBottom: design.spacing.md }}>
                <p style={{ fontSize: '12px', color: design.colors.textMuted }}>
                  App {currentAppIndex + 1} of {applications.length}
                </p>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.md, textAlign: 'center' }}>
                {applications[currentAppIndex].title}
              </h3>
              <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.lg }}>
                {applications[currentAppIndex].content}
              </p>
              <div style={{
                padding: design.spacing.md,
                borderRadius: design.radius.md,
                background: design.colors.successMuted,
                border: `1px solid ${design.colors.success}40`
              }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: design.colors.success }}>
                  📊 {applications[currentAppIndex].stats}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.lg }}>
                {renderButton('← Previous', () => setCurrentAppIndex(Math.max(0, currentAppIndex - 1)), 'ghost', currentAppIndex === 0)}
                {currentAppIndex < applications.length - 1
                  ? renderButton('Next App →', () => setCurrentAppIndex(currentAppIndex + 1), 'primary')
                  : renderButton('Got It!', () => {}, 'primary')}
              </div>
            </div>

            {currentAppIndex === applications.length - 1 && (
              <div style={{ textAlign: 'center' }}>
                {renderButton('Take the Test →', goNext, 'success')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TEST
  if (phase === 'test') {
    const questions = [
      {
        question: 'You are a packaging engineer designing protection for fragile eggs. An egg drops from 3 meters onto foam padding. The padding works by:',
        options: [
          { text: 'Reducing the egg\'s momentum before impact', correct: false },
          { text: 'Increasing the collision time to reduce force', correct: true },
          { text: 'Absorbing all the kinetic energy instantly', correct: false },
          { text: 'Preventing the egg from accelerating', correct: false }
        ],
        explanation: 'Padding extends collision time (Δt). Since F = Δp/Δt and momentum change is fixed, longer time means less force.'
      },
      {
        question: 'A physics lab measures an egg impact. The egg\'s momentum must change by 1 kg⋅m/s. If the collision time doubles from 0.01s to 0.02s, the impact force:',
        options: [
          { text: 'Stays the same', correct: false },
          { text: 'Doubles to 200 N', correct: false },
          { text: 'Halves to 50 N', correct: true },
          { text: 'Quadruples to 400 N', correct: false }
        ],
        explanation: 'F = Δp/Δt. If Δt doubles and Δp is constant, force is cut in half: F = 1/0.02 = 50 N (vs 100 N originally).'
      },
      {
        question: 'Safety engineers test crash protection. A car crash happens at 60 mph (27 m/s). Crumple zones extend collision time from 0.05s to 0.15s. The peak force on passengers:',
        options: [
          { text: 'Increases by 3×', correct: false },
          { text: 'Decreases by 3×', correct: true },
          { text: 'Stays the same', correct: false },
          { text: 'Decreases by 9×', correct: false }
        ],
        explanation: 'F = Δp/Δt. Tripling the time (0.05s → 0.15s) reduces force by 3×, which can mean survival vs fatal injury.'
      },
      {
        question: 'In a controlled experiment, researchers compare drops from different heights. An egg dropped from 6 meters has more momentum at impact than one dropped from 2 meters because:',
        options: [
          { text: 'It has more time to accelerate', correct: false },
          { text: 'Velocity increases with height: v = √(2gh)', correct: true },
          { text: 'Air resistance decreases at higher altitudes', correct: false },
          { text: 'Gravity is stronger higher up', correct: false }
        ],
        explanation: 'Velocity at impact grows with √(height). Since p = mv, higher v means more momentum to dissipate on impact.'
      },
      {
        question: 'A shipping company like Amazon uses bubble wrap to protect millions of packages daily. Bubble wrap protects fragile items during transport by:',
        options: [
          { text: 'Reducing the package momentum during shipping', correct: false },
          { text: 'Preventing any force from reaching the item', correct: false },
          { text: 'Extending impact time to lower peak forces', correct: true },
          { text: 'Making the package lighter', correct: false }
        ],
        explanation: 'Each air bubble compresses over time, extending the collision and reducing F = Δp/Δt. This is pure impulse physics.'
      },
      {
        question: 'Compare two surfaces: dropping an egg on a hard tile floor gives a collision time of 0.005s, while thick foam gives 0.05s. The foam reduces the impact force by:',
        options: [
          { text: '2×', correct: false },
          { text: '5×', correct: false },
          { text: '10×', correct: true },
          { text: '50×', correct: false }
        ],
        explanation: 'Force ratio = (0.05s / 0.005s) = 10×. The foam provides 10× longer impact time, so 10× less force.'
      },
      {
        question: 'In physics class, you learn about the fundamental relationship between force and time. The impulse-momentum theorem states that:',
        options: [
          { text: 'Force × Distance = Work', correct: false },
          { text: 'Force × Time = Change in Momentum', correct: true },
          { text: 'Mass × Velocity = Energy', correct: false },
          { text: 'Acceleration × Time = Velocity', correct: false }
        ],
        explanation: 'Impulse (F × Δt) equals change in momentum (Δp). This is why extending time reduces force for a given momentum change.'
      },
      {
        question: 'Professional football players experience high-speed collisions at 25 mph. Modern NFL helmets with multi-density foam reduce concussion risk by:',
        options: [
          { text: 'Making the head heavier', correct: false },
          { text: 'Stopping all head motion instantly', correct: false },
          { text: 'Increasing collision time with foam padding', correct: true },
          { text: 'Reducing the player\'s momentum', correct: false }
        ],
        explanation: 'Multi-layer foam extends impact time from ~6ms to ~15ms, reducing peak brain acceleration from 150g to 60g—below concussion threshold.'
      },
      {
        question: 'You design packaging for a 2kg laptop. During shipping, the box may drop 1 meter. To keep impact force under 800 N (the laptop chassis failure threshold), the minimum collision time needed with packaging is:',
        options: [
          { text: '0.005 s', correct: false },
          { text: '0.01 s', correct: false },
          { text: '0.025 s', correct: true },
          { text: '0.1 s', correct: false }
        ],
        explanation: 'v = √(2×9.8×1) = 4.43 m/s. Δp = 2×4.43 = 8.86 kg⋅m/s. Δt = 8.86/800 = 0.011s minimum. With safety margin, 0.025s is correct.'
      },
      {
        question: 'Modern automotive safety design uses a dual-zone approach. Engineers design cars with crumple zones at the front/rear but rigid passenger compartments in the middle. Why?',
        options: [
          { text: 'Crumple zones extend Δt for lower forces; rigid cabin protects occupants', correct: true },
          { text: 'Rigid compartments reduce momentum better', correct: false },
          { text: 'Crumple zones are cheaper to manufacture', correct: false },
          { text: 'It looks better aesthetically', correct: false }
        ],
        explanation: 'Crumple zones extend collision time (reducing F = Δp/Δt on passengers), while the rigid cabin prevents intrusion. Best of both worlds.'
      }
    ];

    const currentQ = questions[testIndex];
    const answered = answers[testIndex] !== null;

    if (showResult) {
      const finalScore = answers.reduce((sum, ans, idx) => sum + (questions[idx].options[ans as number]?.correct ? 1 : 0), 0);

      if (score !== finalScore) {
        setScore(finalScore);
        if (onComplete) onComplete(finalScore);
        emitEvent('completion', { score: finalScore });
        if (finalScore === 10) playSound('complete');
      }

      return (
        <div style={containerStyle}>
          {renderProgressBar()}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: design.spacing.xl,
            paddingBottom: '100px'
          }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
                Quiz Results
              </h2>

              <div style={{
                padding: design.spacing.xl,
                borderRadius: design.radius.lg,
                background: finalScore >= 8 ? design.colors.successMuted : design.colors.warning + '20',
                border: `2px solid ${finalScore >= 8 ? design.colors.success : design.colors.warning}`,
                marginBottom: design.spacing.xl,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', fontWeight: 900, color: finalScore >= 8 ? design.colors.success : design.colors.warning }}>
                  {finalScore}/10
                </div>
                <p style={{ fontSize: '16px', color: design.colors.textPrimary, marginTop: design.spacing.sm }}>
                  {finalScore === 10 ? '🎉 Perfect Score!' : finalScore >= 8 ? '✓ Great job!' : '📚 Keep learning!'}
                </p>
              </div>

              {/* Answer review */}
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`,
                marginBottom: design.spacing.xl,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  Review Your Answers
                </h3>
                {questions.map((q, idx) => {
                  const userAnswer = answers[idx];
                  const isCorrect = userAnswer !== null && q.options[userAnswer]?.correct;
                  return (
                    <div key={idx} style={{
                      padding: design.spacing.md,
                      borderRadius: design.radius.md,
                      background: design.colors.bgElevated,
                      marginBottom: design.spacing.md,
                      border: `1px solid ${isCorrect ? design.colors.success : design.colors.error}40`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.sm, marginBottom: design.spacing.sm }}>
                        <span style={{ fontSize: '18px' }}>{isCorrect ? '✓' : '✗'}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textMuted }}>
                          Question {idx + 1}
                        </span>
                      </div>
                      {!isCorrect && (
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: design.spacing.md, justifyContent: 'center' }}>
                {renderButton('Celebrate! →', () => goToPhase('mastery'), 'success')}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: design.spacing.xl,
          paddingBottom: '100px'
        }}>
          <div style={{ flex: 1, overflowY: 'auto', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: design.spacing.lg, textAlign: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: design.colors.accentPrimary }}>
                Question {testIndex + 1} of 10
              </span>
            </div>

            <div style={{
              padding: design.spacing.md,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.lg
            }}>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: design.colors.accentPrimary }}>Scenario:</strong> Apply your understanding of the impulse-momentum theorem (F = Δp/Δt) to real engineering and physics situations. Consider how extending collision time reduces peak impact forces.
              </p>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.xl, lineHeight: 1.5 }}>
              {currentQ.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[testIndex] === idx;
                const showCorrect = answered && opt.correct;
                const showWrong = answered && isSelected && !opt.correct;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!answered) {
                        const newAnswers = [...answers];
                        newAnswers[testIndex] = idx;
                        setAnswers(newAnswers);
                        playSound('click');
                      }
                    }}
                    style={{
                      padding: design.spacing.lg,
                      borderRadius: design.radius.lg,
                      border: `2px solid ${
                        showCorrect ? design.colors.success :
                        showWrong ? design.colors.error :
                        isSelected ? design.colors.accentPrimary :
                        design.colors.border
                      }`,
                      background:
                        showCorrect ? design.colors.successMuted :
                        showWrong ? design.colors.errorMuted :
                        isSelected ? design.colors.accentPrimary + '20' :
                        design.colors.bgCard,
                      color: design.colors.textPrimary,
                      fontSize: '15px',
                      fontWeight: 500,
                      cursor: answered ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div style={{
                marginTop: design.spacing.lg,
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: currentQ.options[answers[testIndex] as number]?.correct ? design.colors.successMuted : design.colors.errorMuted,
                border: `1px solid ${currentQ.options[answers[testIndex] as number]?.correct ? design.colors.success : design.colors.error}40`
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textPrimary, lineHeight: 1.6 }}>
                  <strong style={{ color: currentQ.options[answers[testIndex] as number]?.correct ? design.colors.success : design.colors.error }}>
                    {currentQ.options[answers[testIndex] as number]?.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </strong>{' '}
                  {currentQ.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Bottom navigation */}
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
              background: [design.colors.accentPrimary, design.colors.cyan, design.colors.success, design.colors.warning][i % 4],
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
            You've mastered impulse and momentum! You now understand why cars crumple, packages need padding, and helmets save lives.
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
              {['Impulse', 'Momentum', 'Crumple Zones', 'F = Δp/Δt', 'Packaging', 'Safety Engineering'].map((topic, i) => (
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
              setPrediction(null);
              setTwistPrediction(null);
              setCurrentAppIndex(0);
            }, 'ghost')}
            {renderButton('Free Exploration', () => goToPhase('play'))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EggDropRenderer;
