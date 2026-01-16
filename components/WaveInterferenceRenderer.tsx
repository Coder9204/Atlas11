import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'phase_change' | 'prediction' | 'answer' | 'interaction' | 'milestone';
  gameId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface WaveInterferenceRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// --- PREMIUM DESIGN TOKENS ---
const design = {
  colors: {
    bgDeep: '#061214',
    bgPrimary: '#0a1a1f',
    bgCard: '#0f2930',
    bgCardHover: '#1a3d47',
    bgGlow: '#245361',

    accentPrimary: '#14b8a6',
    accentSecondary: '#2dd4bf',
    accentMuted: '#0d9488',
    accentGlow: 'rgba(20, 184, 166, 0.3)',

    textPrimary: '#ccfbf1',
    textSecondary: '#5eead4',
    textMuted: '#115e59',
    textDim: '#134e4a',

    success: '#22c55e',
    successGlow: 'rgba(34, 197, 94, 0.2)',
    warning: '#f59e0b',
    destructive: '#ef4444',
    constructive: '#22c55e',
    info: '#3b82f6',

    gradientPrimary: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
    gradientSecondary: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
    gradientBg: 'linear-gradient(180deg, #061214 0%, #0a1a1f 50%, #0f2930 100%)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    glow: '0 0 40px rgba(20, 184, 166, 0.3)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    button: '0 4px 20px rgba(20, 184, 166, 0.4)',
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
const WaveInterferenceRenderer: React.FC<WaveInterferenceRendererProps> = ({ onGameEvent, gamePhase }) => {
  // --- PHASE MANAGEMENT ---
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Wavelength Effect',
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
  const [time, setTime] = useState(0);
  const [sourceSeparation] = useState(120);
  const [wavelength, setWavelength] = useState(40);
  const [probePos, setProbePos] = useState({ x: 250, y: 200 });
  const [hasFoundConstructive, setHasFoundConstructive] = useState(false);
  const [hasFoundDestructive, setHasFoundDestructive] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Canvas dimensions
  const canvasWidth = 500;
  const canvasHeight = 350;
  const sourceY = 50;
  const s1 = { x: canvasWidth / 2 - sourceSeparation / 2, y: sourceY };
  const s2 = { x: canvasWidth / 2 + sourceSeparation / 2, y: sourceY };

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- WAVE ANIMATION ---
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.08), 30);
    return () => clearInterval(interval);
  }, []);

  // --- INTERFERENCE PHYSICS ---
  const d1 = Math.sqrt(Math.pow(probePos.x - s1.x, 2) + Math.pow(probePos.y - s1.y, 2));
  const d2 = Math.sqrt(Math.pow(probePos.x - s2.x, 2) + Math.pow(probePos.y - s2.y, 2));
  const pathDiff = Math.abs(d1 - d2);
  const pathDiffInWavelengths = pathDiff / wavelength;
  const fractionalPart = pathDiffInWavelengths % 1;

  const getInterferenceType = useCallback((): 'constructive' | 'destructive' | 'intermediate' => {
    if (fractionalPart < 0.15 || fractionalPart > 0.85) return 'constructive';
    if (Math.abs(fractionalPart - 0.5) < 0.15) return 'destructive';
    return 'intermediate';
  }, [fractionalPart]);

  const interferenceType = getInterferenceType();
  const interferenceAmplitude = Math.cos(Math.PI * pathDiffInWavelengths);

  // --- EVENT EMITTER ---
  const emit = useCallback((eventType: GameEvent['eventType'], data: Record<string, unknown>) => {
    onGameEvent?.({
      eventType,
      gameId: 'wave_interference',
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
      setProbePos({ x: 250, y: 200 });
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

  // --- MILESTONE TRACKING ---
  useEffect(() => {
    if (interferenceType === 'constructive' && !hasFoundConstructive) {
      setHasFoundConstructive(true);
      emit('milestone', { type: 'found_constructive' });
    }
    if (interferenceType === 'destructive' && !hasFoundDestructive) {
      setHasFoundDestructive(true);
      emit('milestone', { type: 'found_destructive' });
    }
  }, [interferenceType, hasFoundConstructive, hasFoundDestructive, emit]);

  // --- TEST QUESTIONS ---
  const testQuestions = useMemo(() => [
    {
      scenario: "Two speakers emit the same tone. At point P, the path difference from the two speakers is exactly 2 wavelengths.",
      question: "What type of interference occurs at point P?",
      options: ["Constructive interference", "Destructive interference", "No interference", "Partial cancellation"],
      correct: 0,
      explanation: "Path difference = 2λ = whole number of wavelengths. Waves arrive in phase (peak meets peak), so they add up → constructive interference!"
    },
    {
      scenario: "At another location, the path difference is 2.5 wavelengths.",
      question: "What happens at this point?",
      options: ["Maximum amplitude", "Minimum amplitude (near silence)", "Average amplitude", "Doubled frequency"],
      correct: 1,
      explanation: "Path difference = 2.5λ = (n + 0.5)λ. Waves arrive out of phase (peak meets trough) → destructive interference, near-silence!"
    },
    {
      scenario: "The wavelength of a wave is 20 cm. Two sources are separated by 60 cm.",
      question: "At what minimum path difference will you find constructive interference?",
      options: ["0 cm (on the center line)", "10 cm", "30 cm", "60 cm"],
      correct: 0,
      explanation: "Constructive interference occurs when Δd = nλ. The minimum is Δd = 0 (center line), where both waves travel equal distances."
    },
    {
      scenario: "Noise-canceling headphones work by creating a wave that is out of phase with ambient noise.",
      question: "What path/phase difference do they create?",
      options: ["0 wavelengths", "0.5 wavelengths (half wavelength)", "1 wavelength", "2 wavelengths"],
      correct: 1,
      explanation: "To cancel noise, the anti-noise wave must arrive 180° (half wavelength) out of phase. Peak meets trough → destructive interference → silence!"
    },
    {
      scenario: "You decrease the wavelength while keeping the source separation constant.",
      question: "What happens to the interference pattern?",
      options: ["Pattern spreads out", "Pattern becomes more closely spaced", "Pattern disappears", "Pattern stays the same"],
      correct: 1,
      explanation: "Shorter λ means the same physical distance corresponds to MORE wavelengths. The maxima/minima become more closely spaced."
    },
    {
      scenario: "In a double-slit experiment, the central maximum (bright fringe) is always at the center.",
      question: "Why is this?",
      options: ["Both paths have equal length → Δd = 0 → constructive", "Light naturally combines at center", "Slits focus light to center", "It's just coincidence"],
      correct: 0,
      explanation: "At the center, both waves travel exactly the same distance from their sources. Path difference = 0 = 0λ → always constructive!"
    },
    {
      scenario: "Radio signals from two towers can cancel at certain locations.",
      question: "What is this phenomenon called?",
      options: ["Signal amplification", "Dead zone or null point", "Signal reflection", "Atmospheric absorption"],
      correct: 1,
      explanation: "When radio waves from two sources arrive out of phase at a location, they cancel → creating 'dead zones' where reception is poor."
    },
    {
      scenario: "The path difference at a point is 3.25λ.",
      question: "Is this closer to constructive or destructive interference?",
      options: ["Closer to constructive (3λ)", "Closer to destructive (3.5λ)", "Exactly in between", "Neither - no interference"],
      correct: 1,
      explanation: "3.25λ is closer to 3.5λ (destructive) than to 3λ (constructive). The wave will be partially cancelled."
    },
    {
      scenario: "Soap bubbles show colorful patterns due to thin-film interference.",
      question: "What causes different colors in different regions?",
      options: ["Different soap concentrations", "Different film thickness → different path differences", "Trapped air bubbles", "Random light scattering"],
      correct: 1,
      explanation: "Film thickness varies across the bubble. Different thicknesses create different path differences for each color wavelength."
    },
    {
      scenario: "WiFi signals from your router reflect off walls, creating multiple paths.",
      question: "What causes WiFi 'dead zones' in your home?",
      options: ["Signal too weak", "Destructive interference between direct and reflected waves", "Wall absorption", "Router malfunction"],
      correct: 1,
      explanation: "Where direct and reflected waves have path differences of (n+½)λ, destructive interference creates weak signal zones!"
    },
  ], []);

  // --- APPLICATION DATA ---
  const applications = useMemo(() => [
    {
      id: 'noise',
      title: 'Noise Cancellation',
      icon: '🎧',
      description: 'How headphones create silence from sound.',
      physics: 'Microphones detect ambient noise. Processors generate an anti-phase signal (shifted by λ/2). When this meets the original noise, destructive interference cancels it.',
      formula: 'Anti-noise phase = Original + λ/2',
    },
    {
      id: 'radio',
      title: 'Radio Astronomy',
      icon: '📡',
      description: 'How telescope arrays achieve incredible resolution.',
      physics: 'Multiple radio telescopes act as sources in reverse. By combining signals with known path differences, astronomers achieve resolution equivalent to a telescope spanning kilometers.',
      formula: 'Resolution ∝ λ / baseline',
    },
    {
      id: 'thin_film',
      title: 'Thin Film Colors',
      icon: '🌈',
      description: 'Why soap bubbles and oil slicks show rainbows.',
      physics: 'Light reflects from both surfaces of a thin film. The path difference (2 × thickness) causes different wavelengths to interfere constructively or destructively.',
      formula: '2t = (m + ½)λ',
    },
    {
      id: 'wifi',
      title: 'WiFi Dead Zones',
      icon: '📱',
      description: 'Why signal strength varies around your home.',
      physics: 'WiFi signals reflect off walls, creating multiple paths. Where these paths differ by half-wavelengths, destructive interference creates weak signal zones.',
      formula: 'Dead zone: Δd = (n + ½)λ',
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
  const renderInterferenceVisualizer = (interactive: boolean = true) => {
    const numRipples = 8;

    return (
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={{ width: '100%', height: '100%', cursor: interactive ? 'crosshair' : 'default' }}
        onMouseMove={interactive ? (e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const scaleX = canvasWidth / rect.width;
          const scaleY = canvasHeight / rect.height;
          const newX = Math.max(20, Math.min(canvasWidth - 20, (e.clientX - rect.left) * scaleX));
          const newY = Math.max(80, Math.min(canvasHeight - 20, (e.clientY - rect.top) * scaleY));
          setProbePos({ x: newX, y: newY });
        } : undefined}
        onTouchMove={interactive ? (e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          const scaleX = canvasWidth / rect.width;
          const scaleY = canvasHeight / rect.height;
          const newX = Math.max(20, Math.min(canvasWidth - 20, (touch.clientX - rect.left) * scaleX));
          const newY = Math.max(80, Math.min(canvasHeight - 20, (touch.clientY - rect.top) * scaleY));
          setProbePos({ x: newX, y: newY });
        } : undefined}
      >
        <defs>
          <linearGradient id="wiBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={design.colors.bgDeep} />
            <stop offset="50%" stopColor={design.colors.bgPrimary} />
            <stop offset="100%" stopColor={design.colors.bgDeep} />
          </linearGradient>
          <filter id="wiGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={canvasWidth} height={canvasHeight} fill="url(#wiBg)" />
        <pattern id="wiGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke={design.colors.bgGlow} strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={canvasWidth} height={canvasHeight} fill="url(#wiGrid)" />

        {/* Wave ripples from source 1 */}
        {Array.from({ length: numRipples }).map((_, i) => {
          const radius = ((time * 60 + i * wavelength) % (wavelength * numRipples));
          const opacity = 0.5 * (1 - radius / (wavelength * numRipples));
          return (
            <circle
              key={`s1-${i}`}
              cx={s1.x}
              cy={s1.y}
              r={radius}
              fill="none"
              stroke={design.colors.accentPrimary}
              strokeWidth={2}
              opacity={opacity > 0 ? opacity : 0}
            />
          );
        })}

        {/* Wave ripples from source 2 */}
        {Array.from({ length: numRipples }).map((_, i) => {
          const radius = ((time * 60 + i * wavelength) % (wavelength * numRipples));
          const opacity = 0.5 * (1 - radius / (wavelength * numRipples));
          return (
            <circle
              key={`s2-${i}`}
              cx={s2.x}
              cy={s2.y}
              r={radius}
              fill="none"
              stroke={design.colors.accentSecondary}
              strokeWidth={2}
              opacity={opacity > 0 ? opacity : 0}
            />
          );
        })}

        {/* Sources */}
        <g filter="url(#wiGlow)">
          <circle cx={s1.x} cy={s1.y} r={12} fill={design.colors.accentPrimary} />
          <text x={s1.x} y={s1.y + 4} textAnchor="middle" fill={design.colors.bgDeep} fontSize="10" fontWeight="bold">S₁</text>
        </g>
        <g filter="url(#wiGlow)">
          <circle cx={s2.x} cy={s2.y} r={12} fill={design.colors.accentSecondary} />
          <text x={s2.x} y={s2.y + 4} textAnchor="middle" fill={design.colors.bgDeep} fontSize="10" fontWeight="bold">S₂</text>
        </g>

        {/* Path lines */}
        <line x1={s1.x} y1={s1.y} x2={probePos.x} y2={probePos.y} stroke={design.colors.accentPrimary} strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
        <line x1={s2.x} y1={s2.y} x2={probePos.x} y2={probePos.y} stroke={design.colors.accentSecondary} strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

        {/* Probe point */}
        <g transform={`translate(${probePos.x}, ${probePos.y})`}>
          <circle r={20 + Math.abs(interferenceAmplitude) * 15}
            fill={interferenceType === 'constructive' ? design.colors.constructive : interferenceType === 'destructive' ? design.colors.destructive : design.colors.warning}
            opacity="0.3" />
          <circle r={12} fill={interferenceType === 'constructive' ? design.colors.constructive : interferenceType === 'destructive' ? design.colors.destructive : design.colors.warning} />
          <text y={35} textAnchor="middle" fill={design.colors.textPrimary} fontSize="11" fontWeight="bold">
            {interferenceType === 'constructive' ? '✓ CONSTRUCTIVE' : interferenceType === 'destructive' ? '✗ DESTRUCTIVE' : '~ INTERMEDIATE'}
          </text>
        </g>

        {/* Info panels */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="130" height="55" rx="8" fill={design.colors.bgCard} opacity="0.95" />
          <text x="10" y="18" fill={design.colors.textMuted} fontSize="9" fontWeight="bold">PATH DIFFERENCE</text>
          <text x="10" y="38" fill={design.colors.textPrimary} fontSize="14" fontWeight="bold">{pathDiff.toFixed(1)} px</text>
          <text x="70" y="38" fill={design.colors.textSecondary} fontSize="11">= {pathDiffInWavelengths.toFixed(2)}λ</text>
        </g>

        <g transform={`translate(${canvasWidth - 150}, 20)`}>
          <rect x="0" y="0" width="130" height="55" rx="8" fill={design.colors.bgCard} opacity="0.95" />
          <text x="10" y="18" fill={design.colors.textMuted} fontSize="9" fontWeight="bold">WAVELENGTH</text>
          <text x="10" y="38" fill={design.colors.accentPrimary} fontSize="14" fontWeight="bold">λ = {wavelength} px</text>
        </g>

        {/* Amplitude indicator */}
        <g transform={`translate(${canvasWidth / 2}, ${canvasHeight - 40})`}>
          <rect x="-100" y="-15" width="200" height="30" rx="8" fill={design.colors.bgCard} opacity="0.95" />
          <text x="-85" y="5" fill={design.colors.textMuted} fontSize="9" fontWeight="bold">AMPLITUDE:</text>
          <rect x="0" y="-8" width={80 * Math.abs(interferenceAmplitude)} height="16" rx="4"
            fill={interferenceAmplitude > 0 ? design.colors.constructive : design.colors.destructive} />
          <text x="85" y="5" textAnchor="end" fill={design.colors.textPrimary} fontSize="10" fontWeight="bold">
            {(interferenceAmplitude * 100).toFixed(0)}%
          </text>
        </g>
      </svg>
    );
  };

  // --- APPLICATION SVG GRAPHICS ---
  const renderAppGraphic = (appId: string) => {
    switch (appId) {
      case 'noise':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="noiseWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={design.colors.destructive} />
                <stop offset="100%" stopColor={design.colors.destructive} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="antiWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={design.colors.constructive} />
                <stop offset="100%" stopColor={design.colors.constructive} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Headphones */}
            <path d="M60,80 Q60,30 100,30 Q140,30 140,80" fill="none" stroke="#374151" strokeWidth="8" />
            <ellipse cx="55" cy="85" rx="15" ry="20" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <ellipse cx="145" cy="85" rx="15" ry="20" fill="#1f2937" stroke="#374151" strokeWidth="2" />

            {/* Noise waves (red) */}
            <path d="M10,60 Q25,40 40,60 Q55,80 70,60" fill="none" stroke={design.colors.destructive} strokeWidth="2" opacity="0.7">
              <animate attributeName="d" values="M10,60 Q25,40 40,60 Q55,80 70,60;M10,65 Q25,45 40,65 Q55,85 70,65;M10,60 Q25,40 40,60 Q55,80 70,60" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Anti-noise waves (green, inverted) */}
            <path d="M45,60 Q60,80 75,60 Q90,40 105,60" fill="none" stroke={design.colors.constructive} strokeWidth="2" opacity="0.7">
              <animate attributeName="d" values="M45,60 Q60,80 75,60 Q90,40 105,60;M45,65 Q60,85 75,65 Q90,45 105,65;M45,60 Q60,80 75,60 Q90,40 105,60" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Cancelled result (flat line) */}
            <line x1="80" y1="60" x2="120" y2="60" stroke={design.colors.textMuted} strokeWidth="2" strokeDasharray="4,4" />

            {/* Speaker icon */}
            <rect x="5" y="50" width="15" height="20" rx="2" fill="#6b7280" />
            <path d="M20,50 L30,40 L30,80 L20,70 Z" fill="#6b7280" />

            <text x="100" y="115" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Destructive Interference → Silence</text>
          </svg>
        );

      case 'radio':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            {/* Radio telescopes */}
            <g transform="translate(30, 50)">
              <ellipse cx="0" cy="0" rx="20" ry="8" fill="#374151" />
              <rect x="-3" y="0" width="6" height="30" fill="#4b5563" />
              <rect x="-10" y="30" width="20" height="5" rx="2" fill="#374151" />
            </g>

            <g transform="translate(100, 50)">
              <ellipse cx="0" cy="0" rx="20" ry="8" fill="#374151" />
              <rect x="-3" y="0" width="6" height="30" fill="#4b5563" />
              <rect x="-10" y="30" width="20" height="5" rx="2" fill="#374151" />
            </g>

            <g transform="translate(170, 50)">
              <ellipse cx="0" cy="0" rx="20" ry="8" fill="#374151" />
              <rect x="-3" y="0" width="6" height="30" fill="#4b5563" />
              <rect x="-10" y="30" width="20" height="5" rx="2" fill="#374151" />
            </g>

            {/* Radio waves from star */}
            <circle cx="100" cy="10" r="5" fill={design.colors.warning}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </circle>

            {[0, 1, 2].map(i => (
              <circle key={i} cx="100" cy="10" r={15 + i * 15} fill="none" stroke={design.colors.accentPrimary} strokeWidth="1" opacity={0.5 - i * 0.15}>
                <animate attributeName="r" values={`${15 + i * 15};${25 + i * 15};${15 + i * 15}`} dur="2s" repeatCount="indefinite" />
              </circle>
            ))}

            {/* Baseline indicator */}
            <line x1="30" y1="95" x2="170" y2="95" stroke={design.colors.textSecondary} strokeWidth="2" />
            <text x="100" y="110" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Baseline = Virtual Dish Size</text>
          </svg>
        );

      case 'thin_film':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="filmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={design.colors.destructive} />
                <stop offset="25%" stopColor={design.colors.warning} />
                <stop offset="50%" stopColor={design.colors.constructive} />
                <stop offset="75%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            {/* Soap bubble */}
            <ellipse cx="100" cy="60" rx="70" ry="50" fill="url(#filmGrad)" opacity="0.4" />
            <ellipse cx="100" cy="60" rx="70" ry="50" fill="none" stroke={design.colors.textMuted} strokeWidth="1" />

            {/* Light ray incoming */}
            <line x1="50" y1="10" x2="80" y2="35" stroke={design.colors.warning} strokeWidth="2" />
            <polygon points="78,33 84,32 80,38" fill={design.colors.warning} />

            {/* Reflected rays */}
            <line x1="80" y1="35" x2="50" y2="50" stroke={design.colors.destructive} strokeWidth="1.5" strokeDasharray="4,2" />
            <line x1="80" y1="40" x2="45" y2="60" stroke={design.colors.constructive} strokeWidth="1.5" strokeDasharray="4,2" />

            {/* Film layers */}
            <path d="M70,30 Q100,25 130,32" fill="none" stroke={design.colors.textSecondary} strokeWidth="1" />
            <path d="M70,38 Q100,33 130,40" fill="none" stroke={design.colors.textMuted} strokeWidth="1" />

            <text x="150" y="30" fill={design.colors.textMuted} fontSize="8">Top surface</text>
            <text x="150" y="45" fill={design.colors.textMuted} fontSize="8">Bottom surface</text>

            <text x="100" y="115" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Thickness → Path Difference → Color</text>
          </svg>
        );

      case 'wifi':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }}>
            {/* Room walls */}
            <rect x="20" y="20" width="160" height="80" fill="none" stroke="#374151" strokeWidth="3" />

            {/* Router */}
            <rect x="30" y="50" width="20" height="15" rx="2" fill={design.colors.accentPrimary} />
            <line x1="35" y1="45" x2="35" y2="50" stroke={design.colors.accentPrimary} strokeWidth="2" />
            <line x1="45" y1="45" x2="45" y2="50" stroke={design.colors.accentPrimary} strokeWidth="2" />

            {/* Direct wave */}
            <path d="M50,57 Q100,57 150,57" fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" opacity="0.7">
              <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Reflected wave */}
            <path d="M50,57 L100,20 L150,57" fill="none" stroke={design.colors.accentSecondary} strokeWidth="2" opacity="0.7" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Phone with signal */}
            <rect x="145" y="52" width="15" height="25" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />

            {/* Signal strength indicator */}
            <g transform="translate(150, 45)">
              <rect x="0" y="6" width="3" height="4" fill={design.colors.constructive} />
              <rect x="4" y="3" width="3" height="7" fill={design.colors.constructive} />
              <rect x="8" y="0" width="3" height="10" fill={design.colors.constructive} opacity="0.3" />
            </g>

            {/* Dead zone indicator */}
            <circle cx="110" cy="75" r="12" fill={design.colors.destructive} opacity="0.3" />
            <text x="110" y="79" textAnchor="middle" fill={design.colors.destructive} fontSize="10" fontWeight="bold">✗</text>

            <text x="100" y="115" textAnchor="middle" fill={design.colors.textMuted} fontSize="9">Multipath → Dead Zones</text>
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
            <span style={{ fontSize: isMobile ? 50 : 60 }}>🌊</span>
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
            Wave Interference
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 520,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            Why do some spots get <span style={{ color: design.colors.constructive, fontWeight: 700 }}>LOUD</span> while others go <span style={{ color: design.colors.destructive, fontWeight: 700 }}>SILENT</span>? Discover how waves add up or cancel out based on their paths!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: design.spacing.md,
            maxWidth: 500,
            marginBottom: design.spacing.xl,
          }}>
            {[
              { icon: '➕', label: 'Constructive' },
              { icon: '➖', label: 'Destructive' },
              { icon: '📏', label: 'Path Diff' },
              { icon: '🌊', label: 'Wavelength' },
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

          {renderButton('Start Exploring', () => goToPhase('predict'), 'primary', { size: 'lg' })}

          <p style={{ marginTop: design.spacing.lg, fontSize: design.typography.caption.size, color: design.colors.textDim }}>
            ~6 minutes • Interactive simulation • 10 mastery questions
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
              Where Will Sound Be Loudest?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              Two speakers play the same tone. As you walk around, what determines whether you hear LOUD sound or near SILENCE?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              {[
                { id: 'closer', label: 'Closer to either speaker', desc: 'More sound energy = louder', icon: '📍' },
                { id: 'path_diff', label: 'Where path lengths match', desc: 'Equal distances = waves align', icon: '📏' },
                { id: 'random', label: 'It varies randomly', desc: 'No predictable pattern', icon: '🎲' },
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
                When two ripples meet in a pond, do they always make bigger waves? Or do they sometimes cancel out?
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, !!prediction, 'See the Pattern')}
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
            {renderInterferenceVisualizer(true)}
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.bgGlow}`,
          }}>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textSecondary, marginBottom: design.spacing.md, textAlign: 'center' }}>
                Move your cursor/finger to explore the interference pattern
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: design.spacing.md }}>
                <div style={{
                  padding: design.spacing.md,
                  borderRadius: design.radius.md,
                  background: hasFoundConstructive ? `${design.colors.constructive}20` : design.colors.bgGlow,
                  border: `1px solid ${hasFoundConstructive ? design.colors.constructive : design.colors.bgGlow}`,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: hasFoundConstructive ? design.colors.constructive : design.colors.textMuted }}>
                    {hasFoundConstructive ? '✓ FOUND' : '○ FIND'} CONSTRUCTIVE
                  </p>
                </div>
                <div style={{
                  padding: design.spacing.md,
                  borderRadius: design.radius.md,
                  background: hasFoundDestructive ? `${design.colors.destructive}20` : design.colors.bgGlow,
                  border: `1px solid ${hasFoundDestructive ? design.colors.destructive : design.colors.bgGlow}`,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: hasFoundDestructive ? design.colors.destructive : design.colors.textMuted }}>
                    {hasFoundDestructive ? '✓ FOUND' : '○ FIND'} DESTRUCTIVE
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, hasFoundConstructive && hasFoundDestructive, 'Understand Why')}
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
              The Key is Path Difference!
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              Whether waves add up or cancel depends on how their PATH LENGTHS compare to the WAVELENGTH.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: design.spacing.lg, marginBottom: design.spacing.lg }}>
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.constructive}15`,
                border: `1px solid ${design.colors.constructive}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.constructive}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  ➕
                </div>
                <p style={{ fontWeight: 700, color: design.colors.constructive, marginBottom: design.spacing.sm }}>Constructive</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  Path diff = 0, 1λ, 2λ, 3λ...<br />Peaks align with peaks → Maximum!
                </p>
              </div>

              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.destructive}15`,
                border: `1px solid ${design.colors.destructive}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.destructive}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  ➖
                </div>
                <p style={{ fontWeight: 700, color: design.colors.destructive, marginBottom: design.spacing.sm }}>Destructive</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  Path diff = 0.5λ, 1.5λ, 2.5λ...<br />Peak meets trough → Cancellation!
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
                INTERFERENCE CONDITIONS
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
                <span style={{ color: design.colors.constructive }}>Constructive:</span> Δd = nλ
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: design.colors.textPrimary }}>
                <span style={{ color: design.colors.destructive }}>Destructive:</span> Δd = (n+½)λ
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'Explore Wavelength')}
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
              What if We Change Wavelength?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              If we decrease the wavelength (shorter waves), how does the interference pattern change?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              {[
                { id: 'spread', label: 'Pattern spreads out', desc: 'Fringes get farther apart', icon: '↔️' },
                { id: 'compress', label: 'Pattern compresses', desc: 'Fringes get closer together', icon: '↕️' },
                { id: 'same', label: 'Pattern stays the same', desc: 'Wavelength doesn\'t matter', icon: '➡️' },
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
            {renderInterferenceVisualizer(true)}
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.bgGlow}`,
          }}>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.md }}>
                Wavelength: <span style={{ color: design.colors.textPrimary }}>{wavelength} px</span>
              </p>
              <input
                type="range"
                min="20"
                max="80"
                value={wavelength}
                onChange={(e) => setWavelength(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  background: `linear-gradient(to right, ${design.colors.accentPrimary} 0%, ${design.colors.accentPrimary} ${((wavelength - 20) / 60) * 100}%, ${design.colors.bgGlow} ${((wavelength - 20) / 60) * 100}%, ${design.colors.bgGlow} 100%)`,
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.sm }}>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>20 px (short)</span>
                <span style={{ fontSize: design.typography.micro.size, color: design.colors.textDim }}>80 px (long)</span>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'See the Pattern')}

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
              Wavelength Controls the Pattern!
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {twistPrediction === 'compress'
                ? '✅ Correct! Shorter wavelength = more fringes in the same space.'
                : 'Shorter wavelength means more closely-spaced interference fringes!'}
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
                FRINGE SPACING
              </p>
              <p style={{ fontSize: 26, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                Δy = <span style={{ color: design.colors.accentPrimary }}>λ</span>L / d
              </p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, marginTop: design.spacing.lg }}>
                Fringe spacing (Δy) is proportional to wavelength (λ)
              </p>
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm }}>🎓 KEY INSIGHT</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.5 }}>
                The interference pattern depends on the RATIO of path difference to wavelength. Same path difference but shorter λ = more fringes!
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
            Interference in Action
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
                ? 'You\'ve mastered wave interference!'
                : percentage >= 70
                ? 'Solid understanding of interference patterns!'
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
            Interference Master!
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 500,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            You've mastered how waves combine! From noise cancellation to radio astronomy, you now understand the physics of constructive and destructive interference.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: design.spacing.md,
            justifyContent: 'center',
            marginBottom: design.spacing.xl,
          }}>
            {['Path Difference', 'Constructive', 'Destructive', 'Wavelength Effect'].map((item, i) => (
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

          {renderButton('Complete Lesson \ud83c\udf89', () => emit('milestone', { type: 'completed', game: 'wave_interference' }), 'primary', { size: 'lg' })}
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

export default WaveInterferenceRenderer;
