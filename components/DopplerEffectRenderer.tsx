import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'phase_change' | 'prediction' | 'answer' | 'interaction' | 'milestone';
  gameId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface DopplerEffectRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// --- PREMIUM DESIGN TOKENS ---
const design = {
  colors: {
    bgDeep: '#0a0504',
    bgPrimary: '#150a07',
    bgCard: '#1f0f0a',
    bgCardHover: '#2a1510',
    bgGlow: '#351a14',

    accentPrimary: '#ef4444',
    accentSecondary: '#f97316',
    accentMuted: '#dc2626',
    accentGlow: 'rgba(239, 68, 68, 0.3)',

    textPrimary: '#fef2f2',
    textSecondary: '#fca5a5',
    textMuted: '#b91c1c',
    textDim: '#7f1d1d',

    success: '#22c55e',
    successGlow: 'rgba(34, 197, 94, 0.2)',
    warning: '#f59e0b',
    info: '#3b82f6',

    gradientPrimary: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    gradientSecondary: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
    gradientBg: 'linear-gradient(180deg, #0a0504 0%, #150a07 50%, #1f0f0a 100%)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    glow: '0 0 40px rgba(239, 68, 68, 0.3)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    button: '0 4px 20px rgba(239, 68, 68, 0.4)',
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
const DopplerEffectRenderer: React.FC<DopplerEffectRendererProps> = ({ onGameEvent, gamePhase }) => {
  // --- PHASE MANAGEMENT ---
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Observer Motion',
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
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (gamePhase && phases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // --- GAME STATE ---
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [sourceSpeed, setSourceSpeed] = useState(30);
  const [observerSpeed, setObserverSpeed] = useState(0);
  const [sourcePosition, setSourcePosition] = useState(0);
  const [waveHistory, setWaveHistory] = useState<Array<{x: number, t: number, id: number}>>([]);
  const [passCount, setPassCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'approaching' | 'passing' | 'receding' | 'complete'>('none');
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(11).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Physics constants
  const sourceFreq = 440; // Hz (A4)
  const soundSpeed = 343; // m/s

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- EVENT EMITTER ---
  const emit = useCallback((eventType: GameEvent['eventType'], data: Record<string, unknown>) => {
    onGameEvent?.({
      eventType,
      gameId: 'doppler_effect',
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
      setSourcePosition(0);
      setWaveHistory([]);
      setPassCount(0);
      setIsAnimating(true);
      if (newPhase === 'play') {
        setSourceSpeed(30);
        setObserverSpeed(0);
      }
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  // --- BUTTON HELPER ---
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

    const variants = {
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
          e.preventDefault();
          if (disabled || navigationLockRef.current) return;
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        disabled={disabled}
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

  // --- ANIMATION LOOPS ---
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.016), 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isAnimating) {
      const interval = setInterval(() => {
        setSourcePosition(prev => {
          const newPos = prev + sourceSpeed * 0.02;
          if (newPos > 110) {
            setPassCount(c => c + 1);
            return -10;
          }
          return newPos;
        });
      }, 16);
      return () => clearInterval(interval);
    }
  }, [phase, isAnimating, sourceSpeed]);

  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isAnimating) {
      const interval = setInterval(() => {
        setWaveHistory(prev => {
          const newWaves = [...prev, { x: sourcePosition, t: time, id: Date.now() + Math.random() }];
          return newWaves.slice(-30);
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [phase, isAnimating, sourcePosition, time]);

  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      const normalizedPos = sourcePosition / 100;
      if (normalizedPos < 0.3) setTeachingMilestone('approaching');
      else if (normalizedPos < 0.55) setTeachingMilestone('passing');
      else if (normalizedPos < 0.9) setTeachingMilestone('receding');
      else setTeachingMilestone('complete');
    }
  }, [sourcePosition, phase]);

  // --- DOPPLER CALCULATIONS ---
  const calculateObservedFreq = useCallback((approaching: boolean) => {
    const obsDir = approaching ? observerSpeed : -observerSpeed;
    const srcDir = approaching ? -sourceSpeed : sourceSpeed;
    return sourceFreq * (soundSpeed + obsDir) / (soundSpeed + srcDir);
  }, [observerSpeed, sourceSpeed]);

  const observedFreqApproaching = calculateObservedFreq(true);
  const observedFreqReceding = calculateObservedFreq(false);
  const observerX = 50;
  const currentObservedFreq = sourcePosition < observerX ? observedFreqApproaching : observedFreqReceding;
  const isApproaching = sourcePosition < observerX;

  // --- TEST QUESTIONS ---
  const testQuestions = useMemo(() => [
    {
      scenario: "An ambulance with a 700 Hz siren approaches you at 30 m/s. Sound travels at 340 m/s in air.",
      question: "What frequency do you hear as it approaches?",
      options: ["~632 Hz (lower pitch)", "700 Hz (unchanged)", "~768 Hz (higher pitch)", "~900 Hz (much higher)"],
      correct: 2,
      explanation: "Using f' = f × v/(v - v_src) = 700 × 340/(340-30) = 700 × 340/310 ≈ 768 Hz. The approaching source compresses wavelengths, increasing frequency!"
    },
    {
      scenario: "You're standing on a train platform as an express train sounds its horn while passing through.",
      question: "At what moment do you hear the TRUE (unshifted) frequency?",
      options: ["When approaching but far away", "When directly beside you (perpendicular)", "When receding but nearby", "You never hear the true frequency"],
      correct: 1,
      explanation: "At the perpendicular moment, the train's velocity component toward/away from you is ZERO. No Doppler shift occurs—you hear the actual emitted frequency!"
    },
    {
      scenario: "Police radar guns bounce radio waves off moving vehicles and measure the reflected wave's frequency.",
      question: "If a car is driving TOWARD the radar gun, the reflected waves experience:",
      options: ["A single Doppler shift (higher)", "A DOUBLE Doppler shift (even higher)", "Two shifts that cancel out", "No shift (radio waves unaffected)"],
      correct: 1,
      explanation: "The wave is shifted once when hitting the moving car, then shifted AGAIN when reflecting back. This double-Doppler makes radar very sensitive to speed!"
    },
    {
      scenario: "Astronomers observe a distant galaxy. The hydrogen emission lines, normally at 656 nm, appear at 670 nm.",
      question: "What can we conclude about this galaxy?",
      options: ["It's approaching Earth", "It's moving away from Earth", "It's very hot", "It's a young galaxy"],
      correct: 1,
      explanation: "Longer wavelength (redshift) means the galaxy is receding. This cosmic Doppler effect proved the universe is expanding—the foundation of Big Bang cosmology!"
    },
    {
      scenario: "A bat emits 40 kHz ultrasound while flying at 10 m/s toward a stationary insect. Sound speed is 340 m/s.",
      question: "The echo frequency the bat hears is approximately:",
      options: ["40 kHz (unchanged)", "~41.2 kHz (slightly higher)", "~42.5 kHz (noticeably higher)", "~44 kHz (much higher)"],
      correct: 2,
      explanation: "Double Doppler! Outgoing: f' = 40 × 340/(340-10) ≈ 41.2 kHz. Returning: f'' = 41.2 × (340+10)/340 ≈ 42.5 kHz. Bats use this to detect prey motion!"
    },
    {
      scenario: "Both you AND the ambulance are moving. You walk toward the ambulance at 2 m/s while it approaches at 30 m/s.",
      question: "Compared to standing still, the Doppler shift you experience is:",
      options: ["Less—your motion cancels the ambulance's", "The same—observer motion doesn't matter", "Greater—both motions ADD to the shift", "Reversed—you hear a lower pitch"],
      correct: 2,
      explanation: "Both motions contribute! The full formula: f' = f × (v + v_obs)/(v - v_src). Walking toward + ambulance approaching = maximum frequency increase!"
    },
    {
      scenario: "A supersonic jet flies at Mach 2 (twice the speed of sound). The jet emits a continuous engine sound.",
      question: "What special phenomenon occurs for observers on the ground?",
      options: ["They hear an extremely high-pitched whine", "They hear a very low rumble", "They hear a sonic boom (shock wave)", "They hear nothing until the jet passes"],
      correct: 2,
      explanation: "At supersonic speeds, the jet outruns its own sound waves! They pile up into a cone-shaped shock wave—the sonic boom. This is BEYOND normal Doppler physics!"
    },
    {
      scenario: "Doppler ultrasound is used to measure blood flow velocity in arteries.",
      question: "This technology relies on the Doppler effect from:",
      options: ["Sound bouncing off artery walls", "Sound reflecting off moving red blood cells", "Sound passing through blood plasma", "Heartbeat vibrations in the chest"],
      correct: 1,
      explanation: "Red blood cells act as millions of tiny moving reflectors! The frequency shift reveals blood velocity—faster flow = larger shift. This detects blockages non-invasively!"
    },
    {
      scenario: "Weather radar shows a tornado with one side red (moving away) and the other green (approaching).",
      question: "This 'velocity couplet' signature indicates:",
      options: ["A very large, slow-moving storm", "Strong rotation—air spinning in a vortex", "A very tall storm cloud", "Heavy precipitation"],
      correct: 1,
      explanation: "Doppler radar measures wind velocity! Opposite-direction motions side-by-side = rotation. This 'couplet' is how meteorologists detect tornadoes before they touch down!"
    },
    {
      scenario: "You're designing a speed camera. You need to detect vehicles 20-200 km/h with 1 km/h accuracy.",
      question: "Which factor is MOST critical for accurate Doppler speed measurement?",
      options: ["Higher transmitter power", "Higher carrier frequency for better resolution", "Larger antenna size", "Closer measurement distance"],
      correct: 1,
      explanation: "Higher frequency = more Doppler shift per unit velocity! A 10 GHz radar gives 10× more shift than 1 GHz for the same speed. This enables precision measurement."
    },
    {
      scenario: "A fire truck is driving away from you at 25 m/s while sounding a 800 Hz siren. Speed of sound is 343 m/s.",
      question: "What frequency do you hear?",
      options: ["~746 Hz", "~800 Hz", "~857 Hz", "~691 Hz"],
      correct: 0,
      explanation: "Using f' = f × v/(v + v_src) = 800 × 343/(343+25) = 800 × 343/368 ≈ 746 Hz. Receding source stretches wavelengths, decreasing frequency!"
    },
  ], []);

  // --- APPLICATION DATA ---
  const applications = useMemo(() => [
    {
      id: 'radar',
      title: 'Police Radar & Speed Detection',
      icon: '🚔',
      description: 'How radar guns catch speeding vehicles using the double-Doppler effect.',
      physics: 'Radar guns emit microwave pulses that bounce off moving vehicles. The reflected signal has a shifted frequency proportional to speed. Because the wave travels TO the car then back FROM it, the shift is doubled!',
      formula: 'v = c × Δf / (2f₀)',
    },
    {
      id: 'cosmos',
      title: 'Cosmic Redshift & Expansion',
      icon: '🌌',
      description: 'How Doppler shift revealed the expanding universe.',
      physics: 'Light from distant galaxies is shifted toward red (longer wavelengths), indicating they\'re moving away. Edwin Hubble discovered that MORE distant galaxies have GREATER redshift—proof the universe is expanding!',
      formula: 'z = (λ_obs - λ_emit) / λ_emit',
    },
    {
      id: 'biosonar',
      title: 'Bat Echolocation',
      icon: '🦇',
      description: 'How bats use Doppler shifts to hunt in complete darkness.',
      physics: 'Bats emit ultrasonic chirps (40-100 kHz) and analyze returning echoes. The Doppler shift reveals whether prey is approaching or fleeing. Some bats adjust their call frequency to keep echoes in optimal hearing range!',
      formula: 'f_echo = f₀ × (v + v_bat)² / v²',
    },
    {
      id: 'medical',
      title: 'Medical Ultrasound',
      icon: '❤️',
      description: 'How doctors measure blood flow velocity non-invasively.',
      physics: 'Ultrasound waves reflect off moving red blood cells. The frequency shift reveals blood velocity—faster flow produces larger shifts. Color Doppler shows flow direction: red = toward probe, blue = away.',
      formula: 'v = (Δf × c) / (2f₀ × cos θ)',
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
        {renderButton('← Back', () => currentIdx > 0 && goToPhase(phases[currentIdx - 1]), 'ghost', { disabled: !canBack || currentIdx === 0 })}
        {renderButton(`${nextLabel} →`, () => {
          if (onNext) onNext();
          else if (currentIdx < phases.length - 1) goToPhase(phases[currentIdx + 1]);
        }, 'primary', { disabled: !canNext })}
      </div>
    );
  };

  // --- SVG VISUALIZER ---
  const renderDopplerVisualizer = (showObserverControls: boolean = false) => {
    const width = 700;
    const height = 350;
    const observerXPos = 350;
    const sourceXPos = 50 + (sourcePosition / 100) * 500;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
          <linearGradient id="deBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={design.colors.bgDeep} />
            <stop offset="50%" stopColor={design.colors.bgPrimary} />
            <stop offset="100%" stopColor={design.colors.bgDeep} />
          </linearGradient>
          <linearGradient id="deRoad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <linearGradient id="deAmbulance" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>
          <radialGradient id="deRedLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="1" />
            <stop offset="60%" stopColor={design.colors.accentMuted} stopOpacity="0.5" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="deBlueLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="60%" stopColor="#2563eb" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
          <filter id="deWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#deBg)" />
        <pattern id="deGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke={design.colors.bgGlow} strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={width} height={height} fill="url(#deGrid)" />

        {/* Road */}
        <rect x="0" y="200" width={width} height="80" fill="url(#deRoad)" />
        <rect x="0" y="238" width={width} height="4" fill="#fbbf24" />
        {Array.from({ length: 15 }).map((_, i) => (
          <rect key={i} x={i * 50 + 10} y="238" width="30" height="4" fill="#fbbf24" />
        ))}

        {/* Sidewalk */}
        <rect x="0" y="280" width={width} height="30" fill="#57534e" />
        <rect x="0" y="278" width={width} height="4" fill="#78716c" />

        {/* Wave fronts */}
        {waveHistory.map((wave) => {
          const age = (time - wave.t) * 300;
          const waveX = 50 + (wave.x / 100) * 500;
          const radius = Math.min(age, 300);
          const opacity = Math.max(0, 1 - age / 350) * 0.6;
          const isCompressed = waveX < observerXPos;
          const waveColor = isCompressed ? design.colors.accentPrimary : design.colors.accentSecondary;

          if (radius > 0 && opacity > 0) {
            return (
              <circle
                key={wave.id}
                cx={waveX}
                cy="210"
                r={radius}
                fill="none"
                stroke={waveColor}
                strokeWidth={2}
                opacity={opacity}
                filter="url(#deWaveGlow)"
              />
            );
          }
          return null;
        })}

        {/* Ambulance */}
        <g transform={`translate(${sourceXPos}, 200)`}>
          <ellipse cx="0" cy="45" rx="50" ry="8" fill="rgba(0,0,0,0.3)" />
          <rect x="-45" y="-30" width="90" height="55" rx="8" fill="url(#deAmbulance)" stroke="#d1d5db" strokeWidth="2" />
          <rect x="-45" y="5" width="90" height="12" fill={design.colors.accentPrimary} />
          <rect x="-40" y="-25" width="25" height="20" rx="3" fill="#0ea5e9" opacity="0.8" />
          <rect x="-10" y="-25" width="20" height="20" rx="3" fill="#0ea5e9" opacity="0.7" />
          <rect x="15" y="-25" width="25" height="20" rx="3" fill="#0ea5e9" opacity="0.6" />
          <rect x="-8" y="-18" width="6" height="14" fill={design.colors.accentPrimary} />
          <rect x="-11" y="-13" width="12" height="4" fill={design.colors.accentPrimary} />

          <g transform="translate(-25, -38)">
            <rect x="-8" y="-5" width="16" height="12" rx="3" fill="#1f2937" />
            <ellipse cx="0" cy="0" rx="20" ry="15" fill="url(#deRedLight)">
              {isAnimating && <animate attributeName="opacity" values="0.3;1;0.3" dur="0.3s" repeatCount="indefinite" />}
            </ellipse>
          </g>

          <g transform="translate(25, -38)">
            <rect x="-8" y="-5" width="16" height="12" rx="3" fill="#1f2937" />
            <ellipse cx="0" cy="0" rx="20" ry="15" fill="url(#deBlueLight)">
              {isAnimating && <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />}
            </ellipse>
          </g>

          <circle cx="-28" cy="28" r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
          <circle cx="-28" cy="28" r="6" fill="#4b5563" />
          <circle cx="28" cy="28" r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
          <circle cx="28" cy="28" r="6" fill="#4b5563" />

          <g transform="translate(0, -55)">
            <rect x="-30" y="-10" width="60" height="18" rx="4" fill={design.colors.bgCard} stroke={design.colors.bgGlow} />
            <text x="0" y="3" textAnchor="middle" fill={design.colors.textPrimary} fontSize="11" fontWeight="bold">
              {sourceSpeed} m/s
            </text>
          </g>
        </g>

        {/* Observer */}
        <g transform={`translate(${observerXPos}, 260)`}>
          <circle cx="0" cy="-40" r="15" fill="#f472b6" />
          <rect x="-12" y="-22" width="24" height="35" rx="6" fill="#ec4899" />
          <rect x="-14" y="13" width="12" height="22" rx="3" fill="#ec4899" />
          <rect x="2" y="13" width="12" height="22" rx="3" fill="#ec4899" />

          <g transform="translate(0, -80)">
            <rect x="-50" y="-15" width="100" height="28" rx="6"
              fill={isApproaching ? `${design.colors.accentPrimary}30` : `${design.colors.accentSecondary}30`}
              stroke={isApproaching ? design.colors.accentPrimary : design.colors.accentSecondary} strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle"
              fill={isApproaching ? design.colors.accentPrimary : design.colors.accentSecondary}
              fontSize="14" fontWeight="bold">
              {Math.round(currentObservedFreq)} Hz {isApproaching ? '↑' : '↓'}
            </text>
          </g>

          <text x="0" y="45" textAnchor="middle" fill={design.colors.textMuted} fontSize="11" fontWeight="bold">
            OBSERVER
          </text>

          {showObserverControls && observerSpeed > 0 && (
            <g transform="translate(60, -20)">
              <path d="M0,0 L-20,0 L-15,-8 M-15,8 L-20,0" stroke={design.colors.accentSecondary} strokeWidth="3" fill="none" />
              <text x="-10" y="-15" textAnchor="middle" fill={design.colors.accentSecondary} fontSize="10" fontWeight="bold">
                {observerSpeed} m/s
              </text>
            </g>
          )}
        </g>

        {/* Teaching overlay */}
        <g transform="translate(350, 30)">
          <rect x="-140" y="-5" width="280" height="40" rx="8" fill={design.colors.bgCard} stroke={design.colors.bgGlow} opacity="0.95" />
          <text x="0" y="20" textAnchor="middle" fill={design.colors.textPrimary} fontSize="13" fontWeight="bold">
            {teachingMilestone === 'approaching' && '🔴 APPROACHING: Waves COMPRESS → Higher pitch'}
            {teachingMilestone === 'passing' && '⚡ PASSING: Pitch changes dramatically!'}
            {teachingMilestone === 'receding' && '🟠 RECEDING: Waves STRETCH → Lower pitch'}
            {teachingMilestone === 'complete' && '✓ Watch the cycle repeat!'}
            {teachingMilestone === 'none' && '👀 Observe the wave patterns...'}
          </text>
        </g>

        {/* Frequency panel */}
        <g transform="translate(600, 120)">
          <rect x="-60" y="-80" width="120" height="160" rx="8" fill={design.colors.bgCard} stroke={design.colors.bgGlow} opacity="0.95" />
          <text x="0" y="-60" textAnchor="middle" fill={design.colors.textMuted} fontSize="9" fontWeight="bold">FREQUENCY</text>
          <text x="0" y="-30" textAnchor="middle" fill={design.colors.textSecondary} fontSize="9">Source</text>
          <text x="0" y="-12" textAnchor="middle" fill={design.colors.textPrimary} fontSize="16" fontWeight="bold">{sourceFreq} Hz</text>
          <line x1="-40" y1="5" x2="40" y2="5" stroke={design.colors.bgGlow} strokeWidth="1" />
          <text x="0" y="30" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="9">Approaching</text>
          <text x="0" y="48" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="16" fontWeight="bold">{Math.round(observedFreqApproaching)} Hz</text>
          <text x="0" y="70" textAnchor="middle" fill={design.colors.accentSecondary} fontSize="9">Receding</text>
          <text x="0" y="88" textAnchor="middle" fill={design.colors.accentSecondary} fontSize="16" fontWeight="bold">{Math.round(observedFreqReceding)} Hz</text>
        </g>

        {/* Pass counter */}
        <g transform="translate(80, 320)">
          <rect x="-60" y="-20" width="120" height="35" rx="6" fill={design.colors.bgCard} stroke={design.colors.bgGlow} />
          <text x="0" y="-2" textAnchor="middle" fill={design.colors.textMuted} fontSize="9" fontWeight="bold">PASSES</text>
          <text x="0" y="18" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="16" fontWeight="bold">{passCount}</text>
        </g>
      </svg>
    );
  };

  // --- APPLICATION SVG GRAPHICS ---
  const renderAppGraphic = (appId: string) => {
    switch (appId) {
      case 'radar':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="0" y="80" width="200" height="40" fill="#374151" />
            <rect x="0" y="78" width="200" height="4" fill="#fbbf24" />

            {/* Police car */}
            <rect x="10" y="50" width="40" height="25" rx="4" fill="#1f2937" />
            <rect x="15" y="40" width="30" height="15" rx="3" fill="#374151" />
            <circle cx="20" cy="75" r="6" fill="#1f2937" />
            <circle cx="40" cy="75" r="6" fill="#1f2937" />
            <rect x="50" y="55" width="20" height="10" rx="2" fill={design.colors.accentSecondary} />

            {/* Radar waves */}
            {[0, 1, 2].map(i => (
              <path key={i} d={`M70,60 Q${100 + i * 20},60 ${100 + i * 20},60`}
                fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" strokeDasharray="4,4" opacity={1 - i * 0.3}>
                <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
              </path>
            ))}
            <ellipse cx="90" cy="60" rx="30" ry="20" fill="url(#radarGrad)" opacity="0.3">
              <animate attributeName="rx" values="20;50;20" dur="1.5s" repeatCount="indefinite" />
            </ellipse>

            {/* Speeding car */}
            <rect x="140" y="48" width="50" height="28" rx="6" fill={design.colors.accentPrimary} />
            <rect x="148" y="42" width="35" height="12" rx="3" fill="#7f1d1d" />
            <circle cx="155" cy="76" r="7" fill="#1f2937" />
            <circle cx="175" cy="76" r="7" fill="#1f2937" />
            <text x="165" y="62" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">120</text>
          </svg>
        );

      case 'cosmos':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <radialGradient id="galaxyGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="redshiftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor={design.colors.accentPrimary} />
              </linearGradient>
            </defs>

            {/* Space background dots */}
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={i} cx={Math.random() * 200} cy={Math.random() * 120} r={Math.random() * 1.5} fill="white" opacity={0.3 + Math.random() * 0.5} />
            ))}

            {/* Galaxy */}
            <ellipse cx="50" cy="60" rx="35" ry="20" fill="url(#galaxyGrad)">
              <animateTransform attributeName="transform" type="rotate" values="0 50 60;360 50 60" dur="20s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="50" cy="60" rx="20" ry="10" fill="#fef3c7" opacity="0.5" />

            {/* Redshift arrow */}
            <line x1="90" y1="60" x2="160" y2="60" stroke="url(#redshiftGrad)" strokeWidth="4" markerEnd="url(#arrow)" />
            <polygon points="160,55 170,60 160,65" fill={design.colors.accentPrimary} />

            {/* Spectrum bar */}
            <rect x="90" y="90" width="100" height="12" rx="3" fill="url(#redshiftGrad)" />
            <text x="140" y="110" textAnchor="middle" fill={design.colors.textMuted} fontSize="8">REDSHIFT →</text>
          </svg>
        );

      case 'biosonar':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <radialGradient id="sonarGrad" cx="0%" cy="50%" r="100%">
                <stop offset="0%" stopColor={design.colors.accentSecondary} stopOpacity="0.6" />
                <stop offset="100%" stopColor={design.colors.accentSecondary} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Night sky */}
            <rect width="200" height="120" fill="#0f172a" />
            <circle cx="180" cy="20" r="12" fill="#fef9c3" opacity="0.8" />

            {/* Bat */}
            <g transform="translate(40, 50)">
              <ellipse cx="0" cy="0" rx="15" ry="10" fill="#4b5563" />
              <path d="M-15,0 Q-35,-20 -25,5 Q-15,5 -15,0" fill="#374151" />
              <path d="M15,0 Q35,-20 25,5 Q15,5 15,0" fill="#374151" />
              <circle cx="-5" cy="-3" r="2" fill={design.colors.accentPrimary} />
              <circle cx="5" cy="-3" r="2" fill={design.colors.accentPrimary} />
            </g>

            {/* Sonar waves */}
            {[0, 1, 2].map(i => (
              <path key={i} d={`M55,50 Q${80 + i * 25},30 ${80 + i * 25},50 Q${80 + i * 25},70 55,50`}
                fill="none" stroke={design.colors.accentSecondary} strokeWidth="2" opacity={0.8 - i * 0.25}>
                <animate attributeName="d"
                  values={`M55,50 Q${80 + i * 25},30 ${80 + i * 25},50 Q${80 + i * 25},70 55,50;M55,50 Q${90 + i * 25},25 ${90 + i * 25},50 Q${90 + i * 25},75 55,50`}
                  dur="1s" repeatCount="indefinite" />
              </path>
            ))}

            {/* Moth */}
            <g transform="translate(160, 55)">
              <ellipse cx="0" cy="0" rx="8" ry="5" fill="#a3a3a3" />
              <ellipse cx="-8" cy="-3" rx="6" ry="4" fill="#d4d4d4" opacity="0.8" />
              <ellipse cx="8" cy="-3" rx="6" ry="4" fill="#d4d4d4" opacity="0.8" />
            </g>

            <text x="100" y="105" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">40-100 kHz ultrasound</text>
          </svg>
        );

      case 'medical':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="bloodFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>

            {/* Heart outline */}
            <path d="M100,90 C100,90 60,60 60,40 C60,20 80,20 100,35 C120,20 140,20 140,40 C140,60 100,90 100,90"
              fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" opacity="0.3" />

            {/* Artery */}
            <rect x="20" y="45" width="160" height="30" rx="15" fill="#fecaca" stroke="#f87171" strokeWidth="2" />

            {/* Blood cells flowing */}
            {[0, 1, 2, 3, 4].map(i => (
              <circle key={i} cx={30 + i * 35} cy="60" r="8" fill="url(#bloodFlow)">
                <animate attributeName="cx" values={`${30 + i * 35};${180};${30 + i * 35}`} dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Ultrasound probe */}
            <rect x="85" y="10" width="30" height="25" rx="4" fill="#374151" />
            <rect x="92" y="35" width="16" height="8" fill="#4b5563" />

            {/* Sound waves into artery */}
            {[0, 1, 2].map(i => (
              <line key={i} x1="100" y1={43 + i * 3} x2="100" y2="45" stroke={design.colors.info} strokeWidth="2" opacity={0.7 - i * 0.2}>
                <animate attributeName="y2" values="45;55" dur="0.5s" repeatCount="indefinite" />
              </line>
            ))}

            <text x="100" y="105" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Blood velocity: 45 cm/s</text>
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
            <span style={{ fontSize: isMobile ? 50 : 60 }}>🚑</span>
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
            The Doppler Effect
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 520,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            Why does an ambulance siren sound <span style={{ color: design.colors.accentPrimary, fontWeight: 700 }}>higher</span> when approaching and <span style={{ color: design.colors.accentSecondary, fontWeight: 700 }}>lower</span> when leaving? Discover the physics behind radar guns, bat echolocation, and the expanding universe!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: design.spacing.md,
            maxWidth: 600,
            marginBottom: design.spacing.xl,
          }}>
            {[
              { icon: '🌊', label: 'Wave Physics' },
              { icon: '📡', label: 'Radar Tech' },
              { icon: '🌌', label: 'Cosmology' },
              { icon: '🦇', label: 'Biosonar' },
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

          {renderButton('Start Learning', () => goToPhase('predict'), 'primary', { size: 'lg' })}

          <p style={{ marginTop: design.spacing.lg, fontSize: design.typography.caption.size, color: design.colors.textDim }}>
            ~8 minutes • Interactive simulation • 11 mastery questions
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
              What Happens to the Pitch?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              An ambulance with its siren on drives past you on the street. As it approaches, passes, and moves away, what do you predict happens to the sound you hear?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              {[
                { id: 'constant', label: 'Pitch stays constant', desc: 'The siren sounds the same before, during, and after passing', icon: '➖' },
                { id: 'high_low', label: 'Higher approaching, lower receding', desc: 'Pitch drops as the ambulance passes by', icon: '📉' },
                { id: 'low_high', label: 'Lower approaching, higher receding', desc: 'Pitch rises as the ambulance passes by', icon: '📈' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    setPrediction(opt.id);
                    emit('prediction', { prediction: opt.id, label: opt.label });
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
                Have you ever noticed a change in the sound of a passing car, train, or airplane? What did it sound like?
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, !!prediction, 'See the Physics')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? 280 : 350 }}>
            {renderDopplerVisualizer(false)}
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.bgGlow}`,
          }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.md }}>
                <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textSecondary }}>
                  Source Speed: <span style={{ color: design.colors.accentPrimary }}>{sourceSpeed} m/s</span>
                </p>
                {renderButton(isAnimating ? '⏸ Pause' : '▶ Play', () => setIsAnimating(!isAnimating), isAnimating ? 'ghost' : 'primary', { size: 'sm' })}
              </div>

              <input
                type="range"
                min="10"
                max="80"
                value={sourceSpeed}
                onChange={(e) => setSourceSpeed(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  background: `linear-gradient(to right, ${design.colors.accentPrimary} 0%, ${design.colors.accentPrimary} ${((sourceSpeed - 10) / 70) * 100}%, ${design.colors.bgGlow} ${((sourceSpeed - 10) / 70) * 100}%, ${design.colors.bgGlow} 100%)`,
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.sm }}>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>10 m/s (slow)</span>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>80 m/s (fast)</span>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, passCount >= 1, 'Understand Why')}

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
              Why Does Pitch Change?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {prediction === 'high_low'
                ? '✅ You predicted correctly! Higher when approaching, lower when receding.'
                : 'The pitch is higher when approaching and lower when receding. Here\'s why:'}
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
                  🔴
                </div>
                <p style={{ fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>Wave Compression</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  When approaching, the source catches up to its own waves, compressing them. <strong>Shorter wavelength = higher frequency!</strong>
                </p>
              </div>

              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.accentSecondary}15`,
                border: `1px solid ${design.colors.accentSecondary}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.accentSecondary}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  🟠
                </div>
                <p style={{ fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>Wave Stretching</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  When receding, the source moves away from its waves, stretching them. <strong>Longer wavelength = lower frequency!</strong>
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
                THE DOPPLER FORMULA
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                f' = f × <span style={{ color: design.colors.textSecondary }}>v</span> / (<span style={{ color: design.colors.textSecondary }}>v</span> ∓ <span style={{ color: design.colors.accentPrimary }}>v<sub>src</sub></span>)
              </p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, marginTop: design.spacing.md }}>
                − when approaching (higher pitch), + when receding (lower pitch)
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'Add Observer Motion')}
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
              What if YOU Are Moving Too?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              Now imagine you're walking TOWARD the approaching ambulance. How does YOUR motion affect the pitch you hear?
            </p>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              marginBottom: design.spacing.lg,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: design.spacing.lg,
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>🚑→</span>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.textDim, marginTop: design.spacing.xs }}>Source moving</p>
              </div>
              <span style={{ fontSize: 24, color: design.colors.textDim }}>+</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>←🧍</span>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.textDim, marginTop: design.spacing.xs }}>You moving</p>
              </div>
              <span style={{ fontSize: 24, color: design.colors.textDim }}>=</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>❓</span>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.warning, marginTop: design.spacing.xs }}>What happens?</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {[
                { id: 'less', label: 'Less frequency shift', desc: 'Your motion partially cancels the ambulance\'s effect', icon: '⬇️' },
                { id: 'same', label: 'Same frequency shift', desc: 'Only source motion matters, not observer', icon: '➡️' },
                { id: 'more', label: 'Even more frequency shift', desc: 'Both motions add together!', icon: '⬆️' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    setTwistPrediction(opt.id);
                    emit('prediction', { prediction: opt.id, phase: 'twist' });
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
          <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? 280 : 350 }}>
            {renderDopplerVisualizer(true)}
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.bgGlow}`,
          }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.md,
                background: `${design.colors.accentSecondary}15`,
                border: `1px solid ${design.colors.accentSecondary}30`,
                marginBottom: design.spacing.md,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <span style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentSecondary }}>
                    Observer Speed (toward source)
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: design.colors.textPrimary }}>
                    {observerSpeed} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={observerSpeed}
                  onChange={(e) => setObserverSpeed(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 4,
                    background: `linear-gradient(to right, ${design.colors.accentSecondary} 0%, ${design.colors.accentSecondary} ${(observerSpeed / 40) * 100}%, ${design.colors.bgGlow} ${(observerSpeed / 40) * 100}%, ${design.colors.bgGlow} 100%)`,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: design.spacing.sm, textAlign: 'center' }}>
                <div style={{ padding: design.spacing.md, borderRadius: design.radius.sm, background: design.colors.bgGlow }}>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>Approaching</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.accentPrimary }}>{Math.round(observedFreqApproaching)} Hz</p>
                </div>
                <div style={{ padding: design.spacing.md, borderRadius: design.radius.sm, background: design.colors.bgGlow }}>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>Total Shift</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.warning }}>±{Math.round(observedFreqApproaching - sourceFreq)} Hz</p>
                </div>
                <div style={{ padding: design.spacing.md, borderRadius: design.radius.sm, background: design.colors.bgGlow }}>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>Receding</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.accentSecondary }}>{Math.round(observedFreqReceding)} Hz</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, observerSpeed > 5, 'See the Full Formula')}
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
              The Full Doppler Formula
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {twistPrediction === 'more'
                ? '✅ Correct! Both motions add together for maximum shift.'
                : 'Both source AND observer motion affect the frequency!'}
            </p>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.xl,
              background: `linear-gradient(135deg, ${design.colors.accentPrimary}15 0%, ${design.colors.accentSecondary}15 100%)`,
              border: `1px solid ${design.colors.accentPrimary}30`,
              textAlign: 'center',
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.lg, letterSpacing: 1 }}>
                COMPLETE DOPPLER FORMULA
              </p>
              <p style={{ fontSize: 26, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                f' = f × (<span style={{ color: design.colors.textSecondary }}>v</span> ± <span style={{ color: design.colors.accentSecondary }}>v<sub>obs</sub></span>) / (<span style={{ color: design.colors.textSecondary }}>v</span> ∓ <span style={{ color: design.colors.accentPrimary }}>v<sub>src</sub></span>)
              </p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, marginTop: design.spacing.lg }}>
                + numerator: observer approaches | − denominator: source approaches
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgCard, textAlign: 'center' }}>
                <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>Source Motion</p>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.textSecondary }}>Changes wavelength <em>in the medium</em></p>
              </div>
              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgCard, textAlign: 'center' }}>
                <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>Observer Motion</p>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.textSecondary }}>Changes rate of wave <em>sampling</em></p>
              </div>
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.warning, marginBottom: design.spacing.sm }}>🤯 INTERESTING ASYMMETRY</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.5 }}>
                For the same speed, source motion creates MORE shift than observer motion! At 30 m/s: source approaching gives ~10% higher pitch, but observer approaching gives ~9%. The physics is subtly different!
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
            Doppler Effect in Action
          </h2>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: design.spacing.sm, marginBottom: design.spacing.lg, overflowX: 'auto', paddingBottom: design.spacing.xs }}>
            {applications.map((a, i) => {
              const isUnlocked = i === 0 || completedApps.has(i - 1);
              const isCompleted = completedApps.has(i);
              return (
                <button
                  key={a.id}
                  onMouseDown={() => {
                    if (navigationLockRef.current || !isUnlocked) return;
                    navigationLockRef.current = true;
                    setActiveApp(i);
                    setTimeout(() => { navigationLockRef.current = false; }, 300);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.sm,
                    padding: `${design.spacing.sm}px ${design.spacing.lg}px`,
                    borderRadius: design.radius.md,
                    background: activeApp === i ? design.colors.gradientPrimary : isCompleted ? `${design.colors.success}20` : design.colors.bgCard,
                    border: `1px solid ${activeApp === i ? 'transparent' : isCompleted ? design.colors.success : design.colors.bgGlow}`,
                    color: activeApp === i ? 'white' : isCompleted ? design.colors.success : design.colors.textSecondary,
                    fontWeight: 700,
                    fontSize: design.typography.caption.size,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isUnlocked ? 1 : 0.5,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{isCompleted ? '✓' : a.icon}</span>
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
              }}>
                <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.xs }}>KEY FORMULA</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: design.colors.textPrimary, fontFamily: 'monospace' }}>
                  {app.formula}
                </p>
              </div>

              {/* Mark as Read Button */}
              <div style={{ marginTop: design.spacing.md }}>
                {!completedApps.has(activeApp) ? (
                  <button
                    onMouseDown={() => {
                      if (navigationLockRef.current) return;
                      navigationLockRef.current = true;
                      const newCompleted = new Set(completedApps);
                      newCompleted.add(activeApp);
                      setCompletedApps(newCompleted);
                      if (activeApp < applications.length - 1) {
                        setTimeout(() => setActiveApp(activeApp + 1), 300);
                      }
                      setTimeout(() => { navigationLockRef.current = false; }, 400);
                    }}
                    style={{
                      width: '100%',
                      padding: design.spacing.md,
                      borderRadius: design.radius.md,
                      background: design.colors.gradientPrimary,
                      border: 'none',
                      color: design.colors.textPrimary,
                      fontWeight: 700,
                      fontSize: design.typography.body.size,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: design.spacing.sm,
                    }}
                  >
                    ✓ Mark "{app.title}" as Read
                  </button>
                ) : (
                  <div style={{
                    padding: design.spacing.md,
                    borderRadius: design.radius.md,
                    background: `${design.colors.success}20`,
                    border: `1px solid ${design.colors.success}`,
                    color: design.colors.success,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}>
                    ✓ Completed
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, completedApps.size >= applications.length, 'Take the Test')}
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
                ? 'You\'ve mastered the Doppler effect!'
                : percentage >= 70
                ? 'Solid understanding of Doppler physics!'
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
                    const newAnswers = [...testAnswers];
                    newAnswers[testIndex] = i;
                    setTestAnswers(newAnswers);
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
          {renderButton('← Previous', () => testIndex > 0 && setTestIndex(testIndex - 1), 'ghost', { disabled: testIndex === 0 })}

          {testIndex < testQuestions.length - 1 ? (
            renderButton('Next →', () => selected !== null && setTestIndex(testIndex + 1), 'primary', { disabled: selected === null })
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
            Doppler Master!
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 500,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            You've mastered how motion affects wave frequency! From ambulance sirens to cosmic redshift, radar guns to bat echolocation — you now understand one of physics' most powerful principles.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: design.spacing.md,
            justifyContent: 'center',
            marginBottom: design.spacing.xl,
          }}>
            {['Wave Compression', 'Doppler Formula', 'Observer Motion', 'Real Applications'].map((item, i) => (
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

          {renderButton('Complete Lesson 🎉', () => emit('milestone', { type: 'completed', game: 'doppler_effect' }), 'primary', { size: 'lg' })}
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

export default DopplerEffectRenderer;
