import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'phase_change' | 'prediction' | 'answer' | 'interaction' | 'milestone';
  gameId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface WaveSpeedTensionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// --- PREMIUM DESIGN TOKENS ---
const design = {
  colors: {
    bgDeep: '#0d0906',
    bgPrimary: '#1c1412',
    bgCard: '#2a1f1a',
    bgCardHover: '#3d2e26',
    bgGlow: '#4d3d32',

    accentPrimary: '#d97706',
    accentSecondary: '#f59e0b',
    accentMuted: '#b45309',
    accentGlow: 'rgba(217, 119, 6, 0.3)',

    textPrimary: '#fef3c7',
    textSecondary: '#fcd34d',
    textMuted: '#92400e',
    textDim: '#78350f',

    success: '#22c55e',
    successGlow: 'rgba(34, 197, 94, 0.2)',
    warning: '#f59e0b',
    info: '#3b82f6',

    gradientPrimary: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    gradientSecondary: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
    gradientBg: 'linear-gradient(180deg, #0d0906 0%, #1c1412 50%, #2a1f1a 100%)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    glow: '0 0 40px rgba(217, 119, 6, 0.3)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    button: '0 4px 20px rgba(217, 119, 6, 0.4)',
  },
  typography: {
    hero: { size: 42, weight: 900, lineHeight: 1.1 },
    title: { size: 28, weight: 800, lineHeight: 1.2 },
    subtitle: { size: 18, weight: 600, lineHeight: 1.4 },
    body: { size: 15, weight: 400, lineHeight: 1.6 },
    caption: { size: 12, weight: 600, lineHeight: 1.4 },
    micro: { size: 10, weight: 700, lineHeight: 1.2 },
  },
};


// --- MAIN COMPONENT ---
const WaveSpeedTensionRenderer: React.FC<WaveSpeedTensionRendererProps> = ({ onGameEvent, gamePhase }) => {
  // --- PHASE MANAGEMENT ---
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Mass Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): Phase => {
    if (gamePhase && phases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const navigationLockRef = useRef(false);

  useEffect(() => {
    if (gamePhase && phases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // --- GAME STATE ---
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [tension, setTension] = useState(50);
  const [linearDensity, setLinearDensity] = useState(0.01);
  const [twistLinearDensity, setTwistLinearDensity] = useState(0.02);
  const [isPulseSent, setIsPulseSent] = useState(false);
  const [pulsePosition, setPulsePosition] = useState(0);
  const [pulseComplete, setPulseComplete] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Physics constants
  const ropeLength = 5;

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- WAVE SPEED PHYSICS ---
  const calculateWaveSpeed = useCallback((t: number, mu: number) => Math.sqrt(t / mu), []);
  const waveSpeed = calculateWaveSpeed(tension, linearDensity);
  const twistWaveSpeed = calculateWaveSpeed(tension, twistLinearDensity);

  // --- EVENT EMITTER ---
  const emit = useCallback((eventType: GameEvent['eventType'], data: Record<string, unknown>) => {
    onGameEvent?.({
      eventType,
      gameId: 'wave_speed_tension',
      data,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  // --- NAVIGATION ---
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });

    if (newPhase === 'play' || newPhase === 'twist_play') {
      setPulsePosition(0);
      setIsPulseSent(false);
      setPulseComplete(false);
      setStopwatchTime(0);
      if (newPhase === 'play') {
        setTension(50);
        setLinearDensity(0.01);
      }
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  // --- RENDER BUTTON HELPER ---
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' = 'primary',
    options?: { disabled?: boolean; fullWidth?: boolean; size?: 'sm' | 'md' | 'lg' }
  ) => {
    const { disabled = false, fullWidth = false, size = 'md' } = options || {};

    const sizes = {
      sm: { padding: '10px 20px', fontSize: 13 },
      md: { padding: '14px 28px', fontSize: 15 },
      lg: { padding: '18px 40px', fontSize: 17 },
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: design.colors.gradientPrimary,
        color: design.colors.textPrimary,
        border: 'none',
        boxShadow: design.shadows.button,
      },
      secondary: {
        background: design.colors.bgCard,
        color: design.colors.textSecondary,
        border: `2px solid ${design.colors.accentMuted}`,
        boxShadow: 'none',
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textMuted,
        border: `1px solid ${design.colors.textDim}`,
        boxShadow: 'none',
      },
    };

    return (
      <button
        onMouseDown={(e) => {
          if (disabled || navigationLockRef.current) return;
          e.preventDefault();
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        style={{
          ...variants[variant],
          ...sizes[size],
          borderRadius: design.radius.lg,
          fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: design.spacing.sm,
          width: fullWidth ? '100%' : 'auto',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
    );
  };

  // --- PULSE ANIMATION ---
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isPulseSent && !pulseComplete) {
      const speed = phase === 'twist_play' ? twistWaveSpeed : waveSpeed;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const position = (speed * elapsed) / ropeLength;

        if (position >= 1) {
          setPulsePosition(1);
          setPulseComplete(true);
          setStopwatchTime(ropeLength / speed);
          setIsPulseSent(false);
          emit('milestone', { type: 'pulse_complete', travelTime: ropeLength / speed, speed });
        } else {
          setPulsePosition(position);
          setStopwatchTime(elapsed);
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [phase, isPulseSent, pulseComplete, waveSpeed, twistWaveSpeed, ropeLength, emit]);

  // --- TEST QUESTIONS ---
  const testQuestions = useMemo(() => [
    {
      scenario: "A rope has tension T = 100 N and linear density μ = 0.01 kg/m.",
      question: "What is the wave speed?",
      options: ["10 m/s", "50 m/s", "100 m/s", "1000 m/s"],
      correct: 2,
      explanation: "v = √(T/μ) = √(100/0.01) = √10000 = 100 m/s. The high tension and low mass density result in a fast wave speed."
    },
    {
      scenario: "The formula for wave speed on a string is v = √(T/μ).",
      question: "What happens to wave speed if tension doubles?",
      options: ["Speed doubles", "Speed increases by √2 ≈ 1.41", "Speed halves", "Speed stays the same"],
      correct: 1,
      explanation: "Because of the square root, v ∝ √T. Doubling T multiplies v by √2 ≈ 1.414. To double the speed, you'd need to quadruple the tension!"
    },
    {
      scenario: "A guitar string is replaced with a thicker string (more mass per length).",
      question: "How does the wave speed change?",
      options: ["Increases", "Decreases", "Stays the same", "Depends on tension only"],
      correct: 1,
      explanation: "v = √(T/μ). Higher μ (mass density) in the denominator means lower wave speed. More massive strings are 'sluggish' and respond slower."
    },
    {
      scenario: "A wave travels 10 meters in 0.2 seconds on a rope.",
      question: "What is the wave speed?",
      options: ["2 m/s", "20 m/s", "50 m/s", "200 m/s"],
      correct: 2,
      explanation: "v = distance/time = 10m / 0.2s = 50 m/s. This is the basic definition of speed applied to wave propagation."
    },
    {
      scenario: "Two strings have the same tension. String A has μ = 0.01 kg/m, String B has μ = 0.04 kg/m.",
      question: "How do their wave speeds compare?",
      options: ["Same speed", "A is twice as fast", "A is four times as fast", "B is twice as fast"],
      correct: 1,
      explanation: "vA/vB = √(μB/μA) = √(0.04/0.01) = √4 = 2. String A (lighter) is 2× faster. Note: 4× mass ratio = 2× speed ratio due to square root."
    },
    {
      scenario: "A piano's bass strings are wrapped with wire (higher mass density).",
      question: "Why is this done?",
      options: ["To increase wave speed", "To produce lower pitch notes", "To make them louder", "Only for durability"],
      correct: 1,
      explanation: "Higher mass → lower wave speed → lower frequency → lower pitch. This allows bass notes without requiring impossibly long strings."
    },
    {
      scenario: "A tightrope walker increases the rope tension.",
      question: "What happens to wave speed if you pluck the rope?",
      options: ["Decreases", "Increases", "Stays the same", "Becomes zero"],
      correct: 1,
      explanation: "v = √(T/μ). Higher tension in the numerator → higher wave speed. A tighter rope 'snaps back' faster when disturbed."
    },
    {
      scenario: "Sound travels through air at ~343 m/s and through steel at ~5000 m/s.",
      question: "Why is steel so much faster?",
      options: ["Steel is hotter", "Steel is much stiffer (higher 'tension' equivalent)", "Steel is less dense", "Steel has fewer molecules"],
      correct: 1,
      explanation: "The elastic modulus (stiffness) in solids is analogous to tension in strings. Steel's extreme stiffness dominates its higher density, resulting in much faster wave propagation."
    },
    {
      scenario: "A pulse takes 0.5 s to travel a 10m rope with T = 80 N.",
      question: "What is the rope's linear density?",
      options: ["0.01 kg/m", "0.02 kg/m", "0.05 kg/m", "0.2 kg/m"],
      correct: 3,
      explanation: "v = 10m/0.5s = 20 m/s. From v² = T/μ, we get μ = T/v² = 80N/(20m/s)² = 80/400 = 0.2 kg/m."
    },
    {
      scenario: "Seismic waves travel faster in denser rock layers deep in Earth.",
      question: "How is this possible given v = √(T/μ)?",
      options: ["The formula doesn't apply", "Extreme pressure increases stiffness more than density", "Deeper rock is less dense", "Temperature makes them faster"],
      correct: 1,
      explanation: "At great depths, extreme pressure increases the rock's elastic modulus (stiffness) faster than it increases density. The stiffness effect wins, so deeper = faster waves!"
    },
  ], []);

  // --- APPLICATION DATA ---
  const applications = useMemo(() => [
    {
      id: 'guitar',
      title: 'Guitar Strings',
      icon: '🎸',
      description: 'How string tension and thickness determine pitch.',
      physics: 'Tuning pegs adjust tension (T) while string gauge affects mass density (μ). Together they control wave speed and frequency: f = v/(2L) = √(T/μ)/(2L).',
      formula: 'f = (1/2L)√(T/μ)',
    },
    {
      id: 'bridge',
      title: 'Bridge Cables',
      icon: '🌉',
      description: 'Engineers monitor cable health by measuring wave speed.',
      physics: 'Cable tension affects wave propagation speed. Damaged or corroded cables have different vibration characteristics than healthy ones, detectable through wave speed measurements.',
      formula: 'v = √(T/μ) → T = μv²',
    },
    {
      id: 'medical',
      title: 'Medical Imaging',
      icon: '🏥',
      description: 'Ultrasound uses wave speed differences to image tissue.',
      physics: 'Sound waves travel at different speeds through different tissues based on their density and stiffness. These speed differences create reflections that form diagnostic images.',
      formula: 'v = √(K/ρ)',
    },
    {
      id: 'seismic',
      title: 'Seismology',
      icon: '🌍',
      description: "Earthquake waves reveal Earth's internal structure.",
      physics: "P-waves and S-waves travel at speeds determined by rock density and elastic properties. Speed changes indicate layer boundaries inside Earth.",
      formula: 'vP = √((K + 4G/3)/ρ)',
    },
  ], []);

  // --- RENDER HELPERS ---
  const renderProgressBar = () => {
    const currentIdx = phases.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${design.spacing.md}px ${design.spacing.lg}px`,
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.bgGlow}`,
        gap: design.spacing.md,
      }}>
        <div style={{ display: 'flex', gap: design.spacing.xs }}>
          {phases.map((p, i) => (
            <div
              key={p}
              onClick={() => i < currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? 24 : 10,
                height: 10,
                borderRadius: design.radius.full,
                background: i < currentIdx ? design.colors.success : i === currentIdx ? design.colors.accentPrimary : design.colors.bgGlow,
                cursor: i < currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textMuted }}>
          {currentIdx + 1}/{phases.length}
        </span>
        <div style={{
          padding: `${design.spacing.xs}px ${design.spacing.md}px`,
          borderRadius: design.radius.full,
          background: design.colors.accentGlow,
          color: design.colors.accentPrimary,
          fontSize: design.typography.micro.size,
          fontWeight: 800,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomNav = (canBack: boolean, canNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phases.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: design.spacing.lg,
        background: design.colors.bgCard,
        borderTop: `1px solid ${design.colors.bgGlow}`,
      }}>
        {renderButton('\u2190 Back', () => currentIdx > 0 && goToPhase(phases[currentIdx - 1]), 'ghost', { disabled: !canBack || currentIdx === 0 })}
        {renderButton(`${nextLabel} \u2192`, () => {
          if (onNext) onNext();
          else if (currentIdx < phases.length - 1) goToPhase(phases[currentIdx + 1]);
        }, 'primary', { disabled: !canNext })}
      </div>
    );
  };

  // --- SVG VISUALIZER ---
  const renderRopeVisualizer = (currentDensity: number) => {
    const width = 700;
    const height = 320;
    const ropeY = 160;
    const pulseX = 80 + pulsePosition * 480;
    const currentSpeed = calculateWaveSpeed(tension, currentDensity);
    const ropeThickness = Math.min(14, 3 + currentDensity * 500);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
          <linearGradient id="wstBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={design.colors.bgDeep} />
            <stop offset="50%" stopColor={design.colors.bgPrimary} />
            <stop offset="100%" stopColor={design.colors.bgDeep} />
          </linearGradient>
          <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4a574" />
            <stop offset="30%" stopColor="#8b6914" />
            <stop offset="70%" stopColor="#5c4a1f" />
            <stop offset="100%" stopColor="#3d2e16" />
          </linearGradient>
          <linearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.accentSecondary} />
            <stop offset="100%" stopColor={design.colors.accentPrimary} />
          </linearGradient>
          <radialGradient id="anchorGrad" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>
          <filter id="pulseGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#wstBg)" />
        <pattern id="wstGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="none" stroke={design.colors.bgGlow} strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={width} height={height} fill="url(#wstGrid)" />

        {/* Distance markers */}
        {[0, 1, 2, 3, 4, 5].map(m => (
          <g key={m} transform={`translate(${80 + m * 96}, ${ropeY + 45})`}>
            <line x1="0" y1="-10" x2="0" y2="0" stroke={design.colors.bgGlow} strokeWidth="2" />
            <text x="0" y="18" textAnchor="middle" fill={design.colors.textMuted} fontSize="11" fontWeight="600">{m}m</text>
          </g>
        ))}

        {/* Left anchor (wall) */}
        <g transform="translate(55, 0)">
          <rect x="0" y={ropeY - 45} width="28" height="90" rx="4" fill="url(#anchorGrad)" stroke="#4b5563" strokeWidth="2" />
          <rect x="4" y={ropeY - 40} width="20" height="80" rx="2" fill="#4b5563" />
          <circle cx="14" cy={ropeY - 28} r="4" fill="#1f2937" />
          <circle cx="14" cy={ropeY + 28} r="4" fill="#1f2937" />
        </g>

        {/* Right anchor (pulley system) */}
        <g transform={`translate(${80 + 480}, 0)`}>
          <circle cx="25" cy={ropeY} r="22" fill="url(#anchorGrad)" stroke="#4b5563" strokeWidth="2" />
          <circle cx="25" cy={ropeY} r="14" fill="#4b5563" />
          <circle cx="25" cy={ropeY} r="5" fill="#374151" />
          <line x1="25" y1={ropeY + 22} x2="25" y2={ropeY + 70} stroke="url(#ropeGrad)" strokeWidth={ropeThickness * 0.7} strokeLinecap="round" />
          <rect x="5" y={ropeY + 70} width="40" height="45" rx="6" fill="url(#weightGrad)" stroke={design.colors.accentMuted} strokeWidth="2" />
          <text x="25" y={ropeY + 100} textAnchor="middle" fill={design.colors.bgPrimary} fontSize="16" fontWeight="900">T</text>
        </g>

        {/* Main rope */}
        <line x1="83" y1={ropeY + 3} x2={80 + 480} y2={ropeY + 3} stroke="rgba(0,0,0,0.3)" strokeWidth={ropeThickness + 2} strokeLinecap="round" />
        <line x1="83" y1={ropeY} x2={80 + 480} y2={ropeY} stroke="url(#ropeGrad)" strokeWidth={ropeThickness} strokeLinecap="round" />

        {/* Pulse visualization */}
        {(isPulseSent || (pulseComplete && pulsePosition > 0)) && (
          <g transform={`translate(${pulseX}, ${ropeY})`}>
            <ellipse cx="0" cy="-20" rx="35" ry="30" fill={design.colors.accentPrimary} opacity="0.25" filter="url(#pulseGlow)">
              {isPulseSent && <animate attributeName="opacity" values="0.2;0.4;0.2" dur="0.25s" repeatCount="indefinite" />}
            </ellipse>
            <path d={`M-25,0 Q-12,-${35 + tension/8} 0,-${35 + tension/8} Q12,-${35 + tension/8} 25,0`} fill="none" stroke={design.colors.accentSecondary} strokeWidth="5" filter="url(#pulseGlow)" />
            <path d={`M-20,0 Q-10,-${30 + tension/10} 0,-${30 + tension/10} Q10,-${30 + tension/10} 20,0`} fill="none" stroke={design.colors.accentPrimary} strokeWidth="3" />
            <circle cx="0" cy={-25 - tension/12} r="6" fill={design.colors.accentSecondary} opacity="0.9">
              {isPulseSent && <animate attributeName="r" values="4;8;4" dur="0.3s" repeatCount="indefinite" />}
            </circle>
          </g>
        )}

        {/* Info panels */}
        <g transform="translate(80, 45)">
          <rect x="-30" y="-14" width="80" height="28" rx="8" fill={`${design.colors.accentPrimary}30`} stroke={design.colors.accentPrimary} strokeWidth="1.5" />
          <text x="10" y="6" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="12" fontWeight="800">T={tension}N</text>
        </g>

        <g transform="translate(350, 45)">
          <rect x="-65" y="-12" width="130" height="24" rx="6" fill={`${design.colors.warning}20`} stroke={design.colors.warning} strokeWidth="1" />
          <text x="0" y="5" textAnchor="middle" fill={design.colors.warning} fontSize="11" fontWeight="700">μ = {(currentDensity * 1000).toFixed(1)} g/m</text>
        </g>

        <g transform="translate(580, 45)">
          <rect x="-55" y="-14" width="110" height="28" rx="8" fill={`${design.colors.success}20`} stroke={design.colors.success} strokeWidth="1.5" />
          <text x="0" y="6" textAnchor="middle" fill={design.colors.success} fontSize="12" fontWeight="800">v = {currentSpeed.toFixed(1)} m/s</text>
        </g>

        {/* Stopwatch display */}
        <g transform="translate(350, 275)">
          <rect x="-70" y="-18" width="140" height="36" rx="10" fill={design.colors.bgCard} stroke={pulseComplete ? design.colors.success : design.colors.bgGlow} strokeWidth="2" />
          <text x="-40" y="6" fill={design.colors.textMuted} fontSize="11" fontWeight="600">TIME:</text>
          <text x="35" y="7" textAnchor="middle" fill={pulseComplete ? design.colors.success : design.colors.textSecondary} fontSize="18" fontWeight="900">{stopwatchTime.toFixed(3)}s</text>
        </g>

        {/* Completion indicator */}
        {pulseComplete && (
          <g transform={`translate(${80 + 480 - 20}, ${ropeY - 55})`}>
            <circle cx="0" cy="0" r="20" fill={design.colors.success} opacity="0.2" />
            <text x="0" y="7" textAnchor="middle" fill={design.colors.success} fontSize="20">✓</text>
          </g>
        )}
      </svg>
    );
  };

  // --- APPLICATION SVG GRAPHICS ---
  const renderAppGraphic = (appId: string) => {
    switch (appId) {
      case 'guitar':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="guitarBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <linearGradient id="guitarNeck" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#854d0e" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>
            </defs>

            {/* Guitar body */}
            <ellipse cx="100" cy="75" rx="50" ry="35" fill="url(#guitarBody)" stroke="#451a03" strokeWidth="2" />
            <circle cx="100" cy="75" r="15" fill="#1f2937" />

            {/* Guitar neck */}
            <rect x="145" y="35" width="50" height="15" rx="2" fill="url(#guitarNeck)" />
            <rect x="145" y="35" width="50" height="3" fill="#92400e" opacity="0.5" />

            {/* Strings */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1="85" y1={60 + i * 5} x2="195" y2={37 + i * 2.5} stroke={i < 3 ? "#e5e7eb" : "#d97706"} strokeWidth={0.8 + (5 - i) * 0.15} />
            ))}

            {/* Frets */}
            {[0, 1, 2, 3].map(i => (
              <line key={i} x1={155 + i * 12} y1="35" x2={155 + i * 12} y2="50" stroke="#fbbf24" strokeWidth="2" />
            ))}

            {/* Tuning pegs */}
            {[0, 1, 2].map(i => (
              <g key={i} transform={`translate(${190}, ${38 + i * 5})`}>
                <circle cx="5" cy="0" r="4" fill="#fbbf24" />
              </g>
            ))}

            <text x="100" y="115" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Tension → Wave Speed → Pitch</text>
          </svg>
        );

      case 'bridge':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="tower" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="50%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>

            {/* Water */}
            <rect x="0" y="90" width="200" height="30" fill="#0ea5e9" opacity="0.3" />

            {/* Towers */}
            <rect x="50" y="25" width="12" height="70" rx="2" fill="url(#tower)" />
            <rect x="138" y="25" width="12" height="70" rx="2" fill="url(#tower)" />

            {/* Main cables */}
            <path d="M10,30 Q56,70 100,70 Q144,70 190,30" fill="none" stroke={design.colors.accentPrimary} strokeWidth="3" />

            {/* Suspender cables */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
              const x = 30 + i * 20;
              const y = i < 4 ? 35 + Math.abs(3.5 - i) * 10 : 35 + Math.abs(3.5 - i) * 10;
              return <line key={i} x1={x} y1={y} x2={x} y2="85" stroke={design.colors.accentSecondary} strokeWidth="1.5" />;
            })}

            {/* Road deck */}
            <rect x="20" y="85" width="160" height="8" rx="2" fill="#374151" />

            {/* Wave pulse indicator */}
            <circle cx="56" cy="50" r="8" fill={design.colors.accentPrimary} opacity="0.3">
              <animate attributeName="r" values="4;12;4" dur="1.5s" repeatCount="indefinite" />
            </circle>

            <text x="100" y="115" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Cable Health Monitoring</text>
          </svg>
        );

      case 'medical':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="tissue" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fecaca" />
                <stop offset="100%" stopColor="#fca5a5" />
              </linearGradient>
            </defs>

            {/* Body outline */}
            <ellipse cx="100" cy="70" rx="70" ry="45" fill="url(#tissue)" stroke="#f87171" strokeWidth="2" />

            {/* Ultrasound probe */}
            <rect x="85" y="5" width="30" height="30" rx="4" fill="#374151" />
            <rect x="92" y="35" width="16" height="10" fill="#4b5563" />

            {/* Sound waves */}
            {[0, 1, 2].map(i => (
              <path key={i} d={`M100,45 Q${85 - i * 10},${60 + i * 10} 100,${75 + i * 15} Q${115 + i * 10},${60 + i * 10} 100,45`}
                fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" opacity={0.7 - i * 0.2}>
                <animate attributeName="opacity" values={`${0.7 - i * 0.2};${0.3};${0.7 - i * 0.2}`} dur="1s" repeatCount="indefinite" />
              </path>
            ))}

            {/* Internal organ */}
            <ellipse cx="100" cy="80" rx="25" ry="15" fill="#dc2626" opacity="0.4" />

            {/* Reflection point */}
            <circle cx="100" cy="65" r="5" fill={design.colors.accentSecondary}>
              <animate attributeName="r" values="3;6;3" dur="0.8s" repeatCount="indefinite" />
            </circle>

            <text x="100" y="115" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Tissue Imaging via Wave Speed</text>
          </svg>
        );

      case 'seismic':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="earthCrust" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <linearGradient id="earthMantle" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
              <linearGradient id="earthCore" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Earth cross-section */}
            <circle cx="100" cy="100" r="90" fill="url(#earthCore)" />
            <circle cx="100" cy="100" r="65" fill="url(#earthMantle)" />
            <circle cx="100" cy="100" r="40" fill="url(#earthCrust)" />

            {/* Surface */}
            <rect x="0" y="0" width="200" height="20" fill="#22c55e" opacity="0.3" />

            {/* Seismic waves */}
            <path d="M30,15 Q50,50 70,40 Q90,30 100,60" fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" strokeDasharray="4,2">
              <animate attributeName="stroke-dashoffset" values="0;-12" dur="1s" repeatCount="indefinite" />
            </path>
            <path d="M170,15 Q150,50 130,40 Q110,30 100,60" fill="none" stroke={design.colors.accentSecondary} strokeWidth="2" strokeDasharray="4,2">
              <animate attributeName="stroke-dashoffset" values="0;-12" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Epicenter */}
            <circle cx="100" cy="15" r="6" fill={design.colors.accentPrimary}>
              <animate attributeName="r" values="4;8;4" dur="0.5s" repeatCount="indefinite" />
            </circle>

            <text x="100" y="10" textAnchor="middle" fill={design.colors.textPrimary} fontSize="8" fontWeight="bold">EPICENTER</text>
          </svg>
        );

      default:
        return null;
    }
  };

  // --- PHASE RENDERS ---

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: design.colors.gradientBg,
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          overflow: 'auto',
        }}>
          <div style={{
            width: isMobile ? 100 : 120,
            height: isMobile ? 100 : 120,
            borderRadius: design.radius.xl,
            background: design.colors.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: design.shadows.glow,
            animation: 'float 3s ease-in-out infinite',
          }}>
            <span style={{ fontSize: isMobile ? 50 : 60 }}>🪢</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? 32 : design.typography.hero.size,
            fontWeight: design.typography.hero.weight,
            marginBottom: design.spacing.md,
            background: design.colors.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Wave Speed on Strings
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 520,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            Why do <span style={{ color: design.colors.accentPrimary, fontWeight: 700 }}>tight ropes</span> carry pulses faster than loose ones? Discover the v = √(T/μ) formula through hands-on experimentation!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: design.spacing.md,
            maxWidth: 450,
            marginBottom: design.spacing.xl,
          }}>
            {[
              { icon: '🎯', label: 'Tension' },
              { icon: '⚖️', label: 'Mass' },
              { icon: '⏱️', label: 'Timing' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.bgGlow}`,
              }}>
                <div style={{ fontSize: 28, marginBottom: design.spacing.sm }}>{item.icon}</div>
                <div style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textMuted }}>{item.label}</div>
              </div>
            ))}
          </div>

          {renderButton('Start Experiment', () => goToPhase('predict'), 'primary', { size: 'lg' })}

          <p style={{ marginTop: design.spacing.lg, fontSize: design.typography.caption.size, color: design.colors.textDim }}>
            ~5 minutes • Interactive simulation • 10 mastery questions
          </p>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflow: 'auto' }}>
          <div style={{ maxWidth: 540, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.accentPrimary, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 1 • MAKE YOUR PREDICTION
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              Tight vs. Loose Rope?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              You snap a pulse into a rope tied between two posts. What do you predict happens when you increase the rope's tension?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              {[
                { id: 'faster', label: 'Pulse travels faster', desc: 'Higher tension = faster pulse', icon: '🚀' },
                { id: 'slower', label: 'Pulse travels slower', desc: 'Higher tension = slower pulse', icon: '🐢' },
                { id: 'same', label: 'No change in speed', desc: "Tension doesn't affect speed", icon: '➡️' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setPrediction(opt.id);
                    emit('prediction', { prediction: opt.id, label: opt.label });
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.lg,
                    padding: design.spacing.lg,
                    borderRadius: design.radius.lg,
                    background: prediction === opt.id ? design.colors.accentGlow : design.colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? design.colors.accentPrimary : design.colors.bgGlow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, color: prediction === opt.id ? design.colors.textPrimary : design.colors.textSecondary, marginBottom: design.spacing.xs }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>💡 THINK ABOUT IT</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, lineHeight: 1.5 }}>
                Think about a guitar string. When you turn the tuning peg tighter, what happens to the note's pitch?
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, !!prediction, 'Test It')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? 260 : 320 }}>
            {renderRopeVisualizer(linearDensity)}

            <button
              onClick={() => {
                if (isPulseSent) return;
                setPulsePosition(0);
                setIsPulseSent(true);
                setPulseComplete(false);
                setStopwatchTime(0);
                emit('interaction', { action: 'send_pulse', tension, linearDensity, expectedSpeed: waveSpeed });
              }}
              disabled={isPulseSent}
              style={{
                position: 'absolute',
                bottom: design.spacing.xl,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: `${design.spacing.md}px ${design.spacing.xl}px`,
                borderRadius: design.radius.lg,
                background: isPulseSent ? design.colors.bgCard : design.colors.gradientPrimary,
                color: design.colors.textPrimary,
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                cursor: isPulseSent ? 'not-allowed' : 'pointer',
                boxShadow: isPulseSent ? 'none' : design.shadows.button,
                opacity: isPulseSent ? 0.6 : 1,
              }}
            >
              {isPulseSent ? '🏃 Traveling...' : '🎯 Send Pulse'}
            </button>
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.bgGlow}`,
          }}>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textSecondary, marginBottom: design.spacing.md }}>
                Adjust Tension: <span style={{ color: design.colors.accentPrimary }}>{tension} N</span>
              </p>
              <input
                type="range"
                min="10"
                max="200"
                value={tension}
                onChange={(e) => {
                  setTension(parseInt(e.target.value));
                  setPulsePosition(0);
                  setIsPulseSent(false);
                  setPulseComplete(false);
                  setStopwatchTime(0);
                }}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  background: `linear-gradient(to right, ${design.colors.accentPrimary} 0%, ${design.colors.accentPrimary} ${((tension - 10) / 190) * 100}%, ${design.colors.bgGlow} ${((tension - 10) / 190) * 100}%, ${design.colors.bgGlow} 100%)`,
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.sm }}>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>10 N (loose)</span>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>200 N (tight)</span>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, pulseComplete, 'Understand Why')}

        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${design.colors.gradientPrimary};
            cursor: pointer;
            border: 2px solid white;
          }
        `}</style>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflow: 'auto' }}>
          <div style={{ maxWidth: 600, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.success, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 3 • UNDERSTANDING THE PHYSICS
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              Why Does Tension Increase Speed?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {prediction === 'faster'
                ? '✅ You predicted correctly! Higher tension means faster wave speed.'
                : 'Higher tension actually increases wave speed. Here\'s why:'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: design.spacing.lg, marginBottom: design.spacing.lg }}>
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.accentPrimary}15`,
                border: `1px solid ${design.colors.accentPrimary}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.accentPrimary}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  🎯
                </div>
                <p style={{ fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>Restoring Force</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  Higher tension means stronger restoring force. The rope "snaps back" faster when disturbed!
                </p>
              </div>

              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.success}15`,
                border: `1px solid ${design.colors.success}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.success}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  ⚡
                </div>
                <p style={{ fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm }}>Faster Propagation</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  Wave speed increases with the square root of tension: v ∝ √T
                </p>
              </div>
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
              textAlign: 'center',
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.textDim, marginBottom: design.spacing.md, letterSpacing: 1 }}>
                THE WAVE SPEED FORMULA
              </p>
              <p style={{ fontSize: 32, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                v = √(<span style={{ color: design.colors.accentPrimary }}>T</span> / <span style={{ color: design.colors.warning }}>μ</span>)
              </p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, marginTop: design.spacing.md }}>
                <span style={{ color: design.colors.accentPrimary }}>T</span> = tension (N) | <span style={{ color: design.colors.warning }}>μ</span> = mass per length (kg/m)
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'Explore Mass Effect')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflow: 'auto' }}>
          <div style={{ maxWidth: 540, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.warning, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 4 • NEW VARIABLE
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              What About Rope Mass?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              Now keep tension the same, but use a HEAVIER rope (more mass per meter). How does this affect wave speed?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              {[
                { id: 'faster', label: 'Wave travels faster', desc: 'More mass = more momentum = faster', icon: '🚀' },
                { id: 'slower', label: 'Wave travels slower', desc: 'More mass = more inertia = slower', icon: '🐢' },
                { id: 'same', label: 'No change in speed', desc: "Mass doesn't affect wave speed", icon: '➡️' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setTwistPrediction(opt.id);
                    emit('prediction', { prediction: opt.id, phase: 'twist' });
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.lg,
                    padding: design.spacing.lg,
                    borderRadius: design.radius.lg,
                    background: twistPrediction === opt.id ? `${design.colors.warning}20` : design.colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? design.colors.warning : design.colors.bgGlow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, color: twistPrediction === opt.id ? design.colors.textPrimary : design.colors.textSecondary }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>💡 THINK ABOUT IT</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, lineHeight: 1.5 }}>
                Imagine pushing a heavy cart vs. a light cart. Which responds faster to the same force?
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, !!twistPrediction, 'Test Your Prediction')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? 260 : 320 }}>
            {renderRopeVisualizer(twistLinearDensity)}

            <button
              onClick={() => {
                if (isPulseSent) return;
                setPulsePosition(0);
                setIsPulseSent(true);
                setPulseComplete(false);
                setStopwatchTime(0);
                emit('interaction', { action: 'send_pulse', tension, linearDensity: twistLinearDensity, expectedSpeed: twistWaveSpeed });
              }}
              disabled={isPulseSent}
              style={{
                position: 'absolute',
                bottom: design.spacing.xl,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: `${design.spacing.md}px ${design.spacing.xl}px`,
                borderRadius: design.radius.lg,
                background: isPulseSent ? design.colors.bgCard : design.colors.gradientPrimary,
                color: design.colors.textPrimary,
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                cursor: isPulseSent ? 'not-allowed' : 'pointer',
                boxShadow: isPulseSent ? 'none' : design.shadows.button,
                opacity: isPulseSent ? 0.6 : 1,
              }}
            >
              {isPulseSent ? '🏃 Traveling...' : '🎯 Send Pulse'}
            </button>
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.bgGlow}`,
          }}>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.warning, marginBottom: design.spacing.md }}>
                Adjust Mass Density: <span style={{ color: design.colors.textPrimary }}>{(twistLinearDensity * 1000).toFixed(1)} g/m</span>
              </p>
              <input
                type="range"
                min="5"
                max="100"
                value={twistLinearDensity * 1000}
                onChange={(e) => {
                  setTwistLinearDensity(parseInt(e.target.value) / 1000);
                  setPulsePosition(0);
                  setIsPulseSent(false);
                  setPulseComplete(false);
                  setStopwatchTime(0);
                }}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  background: `linear-gradient(to right, ${design.colors.warning} 0%, ${design.colors.warning} ${((twistLinearDensity * 1000 - 5) / 95) * 100}%, ${design.colors.bgGlow} ${((twistLinearDensity * 1000 - 5) / 95) * 100}%, ${design.colors.bgGlow} 100%)`,
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.sm }}>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>5 g/m (light)</span>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>100 g/m (heavy)</span>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, pulseComplete, 'See the Full Picture')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflow: 'auto' }}>
          <div style={{ maxWidth: 600, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.accentSecondary, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 6 • COMPLETE UNDERSTANDING
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              The Complete Picture
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {twistPrediction === 'slower'
                ? '✅ Correct! More mass means more inertia, making the rope respond slower.'
                : 'More mass per length actually DECREASES wave speed!'}
            </p>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.xl,
              background: `linear-gradient(135deg, ${design.colors.accentPrimary}15 0%, ${design.colors.warning}15 100%)`,
              border: `1px solid ${design.colors.accentPrimary}30`,
              textAlign: 'center',
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.lg, letterSpacing: 1 }}>
                WAVE SPEED ON A STRING
              </p>
              <p style={{ fontSize: 36, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                v = √(<span style={{ color: design.colors.accentPrimary }}>T</span> / <span style={{ color: design.colors.warning }}>μ</span>)
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: design.spacing.xl, marginTop: design.spacing.lg }}>
                <div>
                  <p style={{ fontSize: 18, color: design.colors.accentPrimary, fontWeight: 700 }}>↑ T</p>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>Faster</p>
                </div>
                <div>
                  <p style={{ fontSize: 18, color: design.colors.warning, fontWeight: 700 }}>↑ μ</p>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>Slower</p>
                </div>
              </div>
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm }}>🎓 KEY INSIGHT</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.5 }}>
                Wave speed is the balance between restoring force (tension pulling the rope back) and inertia (mass resisting motion). This formula applies to guitar strings, bridge cables, and even seismic waves!
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = applications[activeApp];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: design.spacing.lg, overflow: 'hidden' }}>
          <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.info, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
            STEP 7 • REAL-WORLD APPLICATIONS
          </p>
          <h2 style={{ fontSize: isMobile ? 20 : design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
            Wave Speed in Action
          </h2>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: design.spacing.sm, marginBottom: design.spacing.lg, overflowX: 'auto', paddingBottom: design.spacing.xs }}>
            {applications.map((a, i) => {
              const isUnlocked = i === 0 || completedApps.has(i - 1);
              return (
                <button
                  key={a.id}
                  onMouseDown={() => {
                    if (!isUnlocked || navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setActiveApp(i);
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.sm,
                    padding: `${design.spacing.sm}px ${design.spacing.lg}px`,
                    borderRadius: design.radius.md,
                    background: activeApp === i ? design.colors.gradientPrimary : design.colors.bgCard,
                    border: `1px solid ${activeApp === i ? 'transparent' : design.colors.bgGlow}`,
                    color: activeApp === i ? 'white' : isUnlocked ? design.colors.textSecondary : design.colors.textMuted,
                    fontWeight: 700,
                    fontSize: design.typography.caption.size,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    opacity: isUnlocked ? 1 : 0.5,
                  }}
                >
                  {completedApps.has(i) && <span>✓</span>}
                  <span>{a.icon}</span>
                  <span>{isMobile ? a.id : a.title}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            background: design.colors.bgCard,
            borderRadius: design.radius.xl,
            padding: design.spacing.lg,
            overflow: 'auto',
          }}>
            {/* SVG Graphic */}
            <div style={{
              marginBottom: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgGlow,
              padding: design.spacing.md,
            }}>
              {renderAppGraphic(app.id)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.lg, marginBottom: design.spacing.lg }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: design.radius.lg,
                background: design.colors.accentGlow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}>
                {app.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>
                  {app.title}
                </h3>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary }}>{app.description}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgGlow }}>
                <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>🔬 THE PHYSICS</p>
                <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>{app.physics}</p>
              </div>

              <div style={{
                padding: design.spacing.md,
                borderRadius: design.radius.md,
                background: `${design.colors.accentPrimary}15`,
                border: `1px solid ${design.colors.accentPrimary}30`,
                textAlign: 'center',
                marginBottom: design.spacing.md,
              }}>
                <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.xs }}>KEY FORMULA</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: design.colors.textPrimary, fontFamily: 'monospace' }}>
                  {app.formula}
                </p>
              </div>

              {/* Mark as Read button */}
              {!completedApps.has(activeApp) ? (
                <button
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    emit('interaction', { app: app.title, action: 'marked_read' });
                    if (activeApp < applications.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    width: '100%',
                    padding: `${design.spacing.sm}px ${design.spacing.md}px`,
                    borderRadius: design.radius.md,
                    border: `1px solid ${design.colors.success}`,
                    background: `${design.colors.success}20`,
                    color: design.colors.success,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ✓ Mark "{app.title}" as Read
                </button>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: design.spacing.sm,
                  color: design.colors.success,
                  fontWeight: 700,
                  fontSize: 14,
                }}>
                  ✓ Completed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quiz button */}
        <div style={{
          padding: design.spacing.lg,
          background: design.colors.bgCard,
          borderTop: `1px solid ${design.colors.bgGlow}`,
        }}>
          {completedApps.size >= applications.length ? (
            renderButton('Take the Test \u2192', () => goToPhase('test'), 'primary', { fullWidth: true })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: design.spacing.md,
              color: design.colors.textMuted,
              fontSize: design.typography.caption.size,
            }}>
              Read all {applications.length} applications to unlock the test ({completedApps.size}/{applications.length})
            </div>
          )}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const score = testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correct ? 1 : 0), 0);
      const percentage = Math.round((score / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: design.spacing.xl,
            textAlign: 'center',
          }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: passed ? design.colors.success : design.colors.warning,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: design.spacing.lg,
              boxShadow: `0 0 40px ${passed ? design.colors.success : design.colors.warning}50`,
            }}>
              <span style={{ fontSize: 50 }}>{passed ? '🏆' : '📚'}</span>
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Learning!'}
            </h2>

            <p style={{ fontSize: 48, fontWeight: 900, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>
              {score}/{testQuestions.length}
            </p>

            <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.xl }}>
              {percentage >= 90
                ? 'You\'ve mastered wave speed physics!'
                : percentage >= 70
                ? 'Solid understanding of tension and mass effects!'
                : 'Review the concepts and try again!'}
            </p>

            {renderButton(passed ? 'Complete Lesson' : 'Try Again', () => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestSubmitted(false);
                setTestIndex(0);
                setTestAnswers(Array(testQuestions.length).fill(null));
              }
            }, 'primary', { size: 'lg' })}
          </div>
        </div>
      );
    }

    const q = testQuestions[testIndex];
    const selected = testAnswers[testIndex];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: design.spacing.lg, overflow: 'auto' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.accentPrimary, letterSpacing: 2 }}>
                QUESTION {testIndex + 1} OF {testQuestions.length}
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                {testQuestions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: testAnswers[i] !== null ? design.colors.success : i === testIndex ? design.colors.accentPrimary : design.colors.bgGlow,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>📋 SCENARIO</p>
              <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>{q.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
              {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm }}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    const newAnswers = [...testAnswers];
                    newAnswers[testIndex] = i;
                    setTestAnswers(newAnswers);
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    padding: design.spacing.lg,
                    borderRadius: design.radius.md,
                    background: selected === i ? design.colors.accentGlow : design.colors.bgCard,
                    border: `2px solid ${selected === i ? design.colors.accentPrimary : design.colors.bgGlow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <p style={{
                    fontSize: design.typography.body.size,
                    fontWeight: 600,
                    color: selected === i ? design.colors.textPrimary : design.colors.textSecondary,
                  }}>
                    {opt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: design.spacing.lg,
          borderTop: `1px solid ${design.colors.bgGlow}`,
          background: design.colors.bgCard,
        }}>
          {renderButton('\u2190 Previous', () => testIndex > 0 && setTestIndex(testIndex - 1), 'ghost', { disabled: testIndex === 0 })}

          {testIndex < testQuestions.length - 1 ? (
            renderButton('Next \u2192', () => selected !== null && setTestIndex(testIndex + 1), 'primary', { disabled: selected === null })
          ) : (
            renderButton('Submit Test', () => {
              if (testAnswers.every(a => a !== null)) {
                setTestSubmitted(true);
                emit('answer', {
                  score: testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correct ? 1 : 0), 0),
                  total: testQuestions.length
                });
              }
            }, 'primary', { disabled: !testAnswers.every(a => a !== null) })
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: design.colors.gradientBg,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Confetti */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 10,
              height: 10,
              background: [design.colors.accentPrimary, design.colors.accentSecondary, design.colors.success, design.colors.warning, design.colors.info][i % 5],
              borderRadius: 2,
              animation: `confetti-fall 3s ease-out ${Math.random() * 2}s infinite`,
              opacity: 0.8,
            }}
          />
        ))}

        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: design.colors.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: design.shadows.glow,
            animation: 'float 3s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 60 }}>🏆</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? 32 : design.typography.hero.size,
            fontWeight: design.typography.hero.weight,
            marginBottom: design.spacing.md,
            background: design.colors.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Wave Speed Master!
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 500,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            You've mastered the v = √(T/μ) formula! From guitar strings to seismic waves, you now understand how tension and mass control wave propagation.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: design.spacing.md,
            justifyContent: 'center',
            marginBottom: design.spacing.xl,
          }}>
            {['Tension Effect', 'Mass Effect', 'Wave Formula', 'Applications'].map((item, i) => (
              <div key={i} style={{
                padding: `${design.spacing.sm}px ${design.spacing.lg}px`,
                borderRadius: design.radius.full,
                background: design.colors.bgCard,
                fontSize: design.typography.caption.size,
                fontWeight: 600,
                color: design.colors.textSecondary,
              }}>
                ✓ {item}
              </div>
            ))}
          </div>

          {renderButton('Complete Lesson 🎉', () => emit('milestone', { type: 'completed', game: 'wave_speed_tension' }), 'primary', { size: 'lg' })}
        </div>

        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default WaveSpeedTensionRenderer;
