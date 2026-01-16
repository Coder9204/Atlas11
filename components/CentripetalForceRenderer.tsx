'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CENTRIPETAL FORCE - Premium Apple/Airbnb Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'speed_change' | 'radius_change' | 'spin_toggle' | 'answer_submit' | 'app_completed';
}

interface CentripetalForceRendererProps {
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
    // Refined dark theme with depth
    bgDeep: '#000000',
    bgPrimary: '#0D0D0D',
    bgSecondary: '#141414',
    bgTertiary: '#1A1A1A',
    bgCard: '#141414',
    bgElevated: '#222222',
    bgHover: '#1A1A1A',

    // High contrast text
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#737373',
    textDisabled: '#525252',

    // Brand colors
    accentBlue: '#0066FF',
    accentBlueHover: '#0052CC',
    accentBlueMuted: 'rgba(0, 102, 255, 0.15)',

    // Functional
    success: '#00C853',
    successMuted: 'rgba(0, 200, 83, 0.1)',
    warning: '#FF9500',
    warningMuted: 'rgba(255, 149, 0, 0.1)',
    error: '#FF3B30',
    errorMuted: 'rgba(255, 59, 48, 0.1)',

    // Borders
    border: '#262626',
    borderLight: '#333333',
    borderFocus: '#0066FF',

    // Gradients
    gradientBlue: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
    gradientGreen: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 4px 14px rgba(0, 102, 255, 0.4)',
    lg: '0 8px 32px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 24px ${color}40`,
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CentripetalForceRenderer: React.FC<CentripetalForceRendererProps> = ({
  width = 400,
  height = 500,
  onGameEvent,
  gamePhase
}) => {
  // State
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const [speed, setSpeed] = useState(4);
  const [radius_, setRadius_] = useState(1.5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [waterSpilled, setWaterSpilled] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const navigationLockRef = useRef(false);
  const animationRef = useRef<number>();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Physics constants
  const g = 9.8;
  const minSpeedAtTop = Math.sqrt(g * radius_);
  const centripetalAccel = (speed * speed) / radius_;

  // Test questions
  const testQuestions = [
    { question: "At the top of a vertical circle, what keeps water in the cup?", options: ["Gravity pushes water into the cup", "Air pressure holds it in", "The cup pushes the water toward the center", "Centrifugal force pushes water outward"], correct: 2, explanation: "At the top, both gravity and the cup's normal force point toward the center. The cup actively pushes the water inward, providing the centripetal force needed for circular motion." },
    { question: "Why does water spill if you swing too slowly?", options: ["Air resistance blows it out", "Gravity exceeds the centripetal force needed", "The cup becomes unstable", "Water pressure increases"], correct: 1, explanation: "At slow speeds, the required centripetal force (mv²/r) is less than gravity (mg). The excess gravitational force pulls water out of the cup." },
    { question: "The minimum speed at the top to keep water in is:", options: ["v = gr", "v = √(gr)", "v = 2πr", "v = g/r"], correct: 1, explanation: "At minimum speed, gravity alone provides centripetal force: mg = mv²/r. Solving: v² = gr, so v = √(gr)." },
    { question: "Doubling the radius while keeping speed constant makes centripetal acceleration:", options: ["Double", "Half", "Quadruple", "Stay the same"], correct: 1, explanation: "Centripetal acceleration a = v²/r. With constant v, doubling r cuts acceleration in half. Larger circles need less acceleration for the same speed." },
    { question: "At the bottom of a roller coaster loop, you feel heavier because:", options: ["Gravity increases there", "The track must push up harder to provide centripetal force", "Your mass increases temporarily", "Air pressure is higher"], correct: 1, explanation: "At the bottom, centripetal force points upward. The track's normal force must exceed your weight by mv²/r to provide this upward force, making you feel heavier." },
    { question: "On a flat road curve, what provides centripetal force for a car?", options: ["Engine thrust", "Friction between tires and road", "Wind resistance", "Gravity"], correct: 1, explanation: "On flat roads, static friction between tires and pavement provides the inward centripetal force. This is why cars slip on icy curves—reduced friction." },
    { question: "In a centrifuge, heavy blood cells collect:", options: ["At the center", "At the outside edge", "Evenly distributed", "At the top"], correct: 1, explanation: "Heavy particles need more centripetal force. Without enough at a given radius, they move outward. Lighter plasma stays closer to the center." },
    { question: "Race tracks are banked to:", options: ["Look impressive", "Provide a horizontal force component toward the center", "Drain rainwater", "Reduce speed"], correct: 1, explanation: "Banking tilts the normal force so it has a horizontal component pointing toward the center, reducing reliance on friction and allowing higher speeds." },
    { question: "In a rotating space station, 'gravity' comes from:", options: ["Earth's gravitational pull", "The floor pushing inward as centripetal force", "Air pressure differences", "Magnetic fields"], correct: 1, explanation: "The floor provides centripetal force inward. By Newton's 3rd law, you push outward on the floor—this feels like standing on Earth." },
    { question: "Rope tension is greatest when swinging a bucket:", options: ["At the top", "At the bottom", "At the sides", "Tension is constant"], correct: 1, explanation: "At the bottom, tension must overcome gravity AND provide centripetal force: T = mg + mv²/r. At the top, gravity helps: T = mv²/r - mg." }
  ];

  // Real-world applications
  const applications = [
    {
      id: 'rollercoaster',
      icon: '🎢',
      title: 'Roller Coasters',
      subtitle: 'Engineering thrills safely',
      description: 'Modern roller coasters use precisely calculated speeds and loop designs to keep riders safe while maximizing excitement.',
      physics: 'Engineers ensure the car\'s speed at the top of each loop exceeds √(gr) so centripetal force keeps riders in their seats.',
      insight: 'Clothoid loops (teardrop shape) have tighter radius at top, reducing the minimum speed needed and the g-forces on riders.',
      stats: [
        { label: 'Loop Speed', value: '60+ mph' },
        { label: 'G-Forces', value: '3-4 Gs' },
        { label: 'Design', value: 'Clothoid' },
      ],
      color: '#0066FF',
    },
    {
      id: 'centrifuge',
      icon: '🧬',
      title: 'Medical Centrifuges',
      subtitle: 'Separating blood components',
      description: 'Centrifuges spin samples at thousands of RPM, using centripetal acceleration to separate substances by density.',
      physics: 'Heavy particles (red blood cells) need more centripetal force. Without enough, they migrate outward, separating from lighter plasma.',
      insight: 'A centrifuge at 3000 RPM creates about 1000g of acceleration—1000 times stronger than gravity!',
      stats: [
        { label: 'Speed', value: '3-15K RPM' },
        { label: 'Force', value: '500-20K g' },
        { label: 'Use', value: 'Blood analysis' },
      ],
      color: '#00C853',
    },
    {
      id: 'banking',
      icon: '🏎️',
      title: 'Banked Tracks',
      subtitle: 'NASCAR physics',
      description: 'High-speed race tracks bank curves up to 33°, allowing cars to turn at extreme speeds without sliding outward.',
      physics: 'Banking tilts the normal force, adding a horizontal component that helps provide centripetal force without relying solely on friction.',
      insight: 'At the "ideal" banking angle, a car could navigate the curve with zero friction. Real tracks exceed this for safety.',
      stats: [
        { label: 'Bank Angle', value: 'Up to 33°' },
        { label: 'Top Speed', value: '200+ mph' },
        { label: 'Example', value: 'Daytona' },
      ],
      color: '#FF9500',
    },
    {
      id: 'space',
      icon: '🛸',
      title: 'Space Stations',
      subtitle: 'Artificial gravity',
      description: 'Future rotating space stations will create artificial gravity through centripetal acceleration—no Earth required.',
      physics: 'Standing on the outer rim of a rotating station, the floor pushes you inward. Your body interprets this as "weight."',
      insight: 'To feel Earth-like gravity (9.8 m/s²), a 100m radius station would spin at ~3 RPM. Larger stations can spin slower.',
      stats: [
        { label: 'Rotation', value: '1-2 RPM' },
        { label: 'Min Radius', value: '500+ m' },
        { label: 'Target', value: '0.5-1.0 g' },
      ],
      color: '#8B5CF6',
    },
  ];

  // Effects
  useEffect(() => {
    if (gamePhase && gamePhase !== phase) setPhase(gamePhase as Phase);
  }, [gamePhase, phase]);

  // Animation
  useEffect(() => {
    if (isSpinning && (phase === 'play' || phase === 'twist_play')) {
      const animate = () => {
        setAngle(prev => {
          const newAngle = (prev + speed * 0.04) % (2 * Math.PI);
          if (Math.abs(newAngle - Math.PI / 2) < 0.15 && speed < minSpeedAtTop && !waterSpilled) {
            setWaterSpilled(true);
            emit('result', { event: 'water_spilled', speed, minRequired: minSpeedAtTop });
          }
          return newAngle;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }
  }, [isSpinning, speed, phase, minSpeedAtTop, waterSpilled]);

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Event emitter
  const emit = useCallback((type: GameEvent['type'], data: Record<string, unknown>, eventType?: GameEvent['eventType']) => {
    onGameEvent?.({ type, phase, data, timestamp: Date.now(), eventType });
  }, [onGameEvent, phase]);

  // Navigation with strong debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = answerIndex === testQuestions[currentQuestion].correct;
    if (isCorrect) setCorrectAnswers(prev => prev + 1);
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emit('interaction', { question: currentQuestion, answer: answerIndex, correct: isCorrect }, 'answer_submit');
  }, [currentQuestion, answeredQuestions, emit, testQuestions]);

  // ============================================================================
  // HELPER FUNCTIONS - Premium Button & Progress
  // ============================================================================
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
    fullWidth = false,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeStyles = {
      sm: { padding: '10px 18px', fontSize: 13 },
      md: { padding: '14px 28px', fontSize: 15 },
      lg: { padding: '18px 36px', fontSize: 17 }
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: design.colors.gradientBlue,
        color: '#fff',
        boxShadow: design.shadow.md,
      },
      secondary: {
        background: design.colors.bgCard,
        color: design.colors.textSecondary,
        border: `1px solid ${design.colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
      },
      success: {
        background: design.colors.gradientGreen,
        color: '#fff',
        boxShadow: '0 4px 14px rgba(0, 200, 83, 0.4)',
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
          ...sizeStyles[size],
          ...variants[variant],
          borderRadius: design.radius.md,
          fontWeight: 600,
          fontFamily: design.font.sans,
          border: variants[variant].border || 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.2s ease',
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {label}
      </button>
    );
  };

  const renderProgressBar = () => {
    const phaseList: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIdx = phaseList.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${design.spacing.md}px ${design.spacing.lg}px`,
        borderBottom: `1px solid ${design.colors.border}`,
        background: design.colors.bgPrimary,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.md }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {phaseList.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentIdx ? 24 : 8,
                  height: 8,
                  borderRadius: design.radius.full,
                  background: i < currentIdx ? design.colors.success : i === currentIdx ? design.colors.accentBlue : design.colors.border,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: design.colors.textMuted }}>
            {currentIdx + 1} of {phaseList.length}
          </span>
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: design.radius.full,
          background: design.colors.accentBlueMuted,
          color: design.colors.accentBlue,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {['Discover', 'Predict', 'Experiment', 'Learn', 'Challenge', 'Explore', 'Understand', 'Apply', 'Quiz', 'Complete'][currentIdx]}
        </div>
      </div>
    );
  };

  // ============================================================================
  // VISUALIZATION - Circular Motion
  // ============================================================================
  const renderVisualization = (showControls = true) => {
    const cx = 180, cy = 160, r = 100;
    const cupX = cx + r * Math.cos(angle - Math.PI / 2);
    const cupY = cy + r * Math.sin(angle - Math.PI / 2);
    const isSafe = speed >= minSpeedAtTop;

    return (
      <div style={{
        background: `linear-gradient(180deg, #0A1628 0%, #000814 100%)`,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        border: `1px solid ${design.colors.border}`,
      }}>
        <svg viewBox="0 0 360 320" style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
          <defs>
            <radialGradient id="cf-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isSafe ? '#00C853' : '#FF3B30'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isSafe ? '#00C853' : '#FF3B30'} stopOpacity="0" />
            </radialGradient>
            <filter id="cf-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* Glow effect when spinning */}
          {isSpinning && (
            <circle cx={cx} cy={cy} r={r + 30} fill="url(#cf-glow)" filter="url(#cf-blur)" />
          )}

          {/* Pivot point (hand) */}
          <circle cx={cx} cy={cy} r={14} fill="#1E293B" stroke="#475569" strokeWidth="3" />
          <circle cx={cx} cy={cy} r={6} fill="#64748B" />

          {/* Circular path */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="8 8" opacity="0.6" />

          {/* String/rope */}
          <line x1={cx} y1={cy} x2={cupX} y2={cupY} stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

          {/* Cup and water */}
          <g transform={`translate(${cupX}, ${cupY}) rotate(${angle * 180 / Math.PI})`}>
            {/* Cup body */}
            <path d="M-14,0 L-11,-24 L11,-24 L14,0 Z" fill="#475569" stroke="#64748B" strokeWidth="2" />

            {/* Water */}
            {!waterSpilled && (
              <ellipse cx="0" cy="-10" rx="9" ry="5" fill="#3B82F6" opacity="0.9">
                <animate attributeName="ry" values="5;6;5" dur="1s" repeatCount="indefinite" />
              </ellipse>
            )}

            {/* Spill droplets */}
            {waterSpilled && (
              <>
                <circle cx="0" cy="18" r="5" fill="#3B82F6" opacity="0.8">
                  <animate attributeName="cy" values="18;40;60" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.4;0" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="-8" cy="24" r="3" fill="#3B82F6" opacity="0.6">
                  <animate attributeName="cy" values="24;50;70" dur="0.9s" repeatCount="indefinite" />
                </circle>
                <circle cx="8" cy="28" r="4" fill="#3B82F6" opacity="0.5">
                  <animate attributeName="cy" values="28;55;75" dur="0.85s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>

          {/* Speed direction indicator */}
          {isSpinning && (
            <path
              d={`M ${cx + r + 15} ${cy - 20} A ${r + 15} ${r + 15} 0 0 1 ${cx + r + 15} ${cy + 20}`}
              fill="none"
              stroke={design.colors.accentBlue}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          )}
        </svg>

        {/* Status Panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: design.spacing.sm,
          marginTop: design.spacing.md,
        }}>
          <div style={{
            background: design.colors.bgCard,
            borderRadius: design.radius.sm,
            padding: design.spacing.sm,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: design.colors.textMuted, marginBottom: 2, textTransform: 'uppercase' }}>SPEED</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: design.colors.textPrimary }}>{speed.toFixed(1)} m/s</div>
          </div>
          <div style={{
            background: design.colors.bgCard,
            borderRadius: design.radius.sm,
            padding: design.spacing.sm,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: design.colors.textMuted, marginBottom: 2, textTransform: 'uppercase' }}>MIN NEEDED</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: design.colors.warning }}>{minSpeedAtTop.toFixed(1)} m/s</div>
          </div>
          <div style={{
            background: isSafe ? design.colors.successMuted : design.colors.errorMuted,
            borderRadius: design.radius.sm,
            padding: design.spacing.sm,
            textAlign: 'center',
            border: `1px solid ${isSafe ? design.colors.success : design.colors.error}40`,
          }}>
            <div style={{ fontSize: 11, color: design.colors.textMuted, marginBottom: 2, textTransform: 'uppercase' }}>STATUS</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: isSafe ? design.colors.success : design.colors.error }}>
              {isSafe ? '✓ Safe' : '✗ Spill'}
            </div>
          </div>
        </div>

        {/* Controls */}
        {showControls && (
          <div style={{ marginTop: design.spacing.lg }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: design.spacing.md,
              padding: design.spacing.md,
              background: design.colors.bgCard,
              borderRadius: design.radius.md,
              marginBottom: design.spacing.md,
            }}>
              <span style={{ fontSize: 14, color: design.colors.textSecondary, minWidth: 80 }}>Speed</span>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={speed}
                onChange={(e) => { setSpeed(parseFloat(e.target.value)); setWaterSpilled(false); }}
                style={{ flex: 1, accentColor: design.colors.accentBlue, height: 6 }}
              />
              <span style={{ fontSize: 16, color: design.colors.textPrimary, minWidth: 60, textAlign: 'right' }}>
                {speed.toFixed(1)} m/s
              </span>
            </div>

            {renderButton(
              isSpinning ? '⏹ Stop Spinning' : '▶ Start Spinning',
              () => { setIsSpinning(!isSpinning); setWaterSpilled(false); setExperimentCount(c => c + 1); },
              isSpinning ? 'secondary' : 'primary',
              false,
              true
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS - Premium Design
  // ============================================================================

  const renderHook = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(180deg, #001233 0%, #000814 50%, #000000 100%)',
          padding: isMobile ? design.spacing.lg : design.spacing.xxl,
          textAlign: 'center',
        }}>
          {/* Animated Hero Visual */}
          <div style={{ maxWidth: 400, margin: '0 auto', marginBottom: design.spacing.xl }}>
            <svg viewBox="0 0 400 280" style={{ width: '100%' }}>
              <defs>
                <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0066FF" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>

              {/* Background glow */}
              <ellipse cx="200" cy="140" rx="180" ry="120" fill="url(#heroGlow)" />

              {/* Circular path */}
              <circle cx="200" cy="140" r="90" fill="none" stroke="#1E3A5F" strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />

              {/* Hand/pivot */}
              <circle cx="200" cy="140" r="16" fill="#1E293B" stroke="#3B82F6" strokeWidth="3">
                <animate attributeName="stroke-opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Rope and cup at top */}
              <g>
                <line x1="200" y1="140" x2="200" y2="50" stroke="#94A3B8" strokeWidth="3" />
                {/* Cup - upside down at top */}
                <g transform="translate(200, 50) rotate(180)">
                  <path d="M-16,0 L-13,-28 L13,-28 L16,0 Z" fill="#475569" stroke="#64748B" strokeWidth="2" />
                  <ellipse cx="0" cy="-12" rx="10" ry="6" fill="url(#waterGrad)">
                    <animate attributeName="ry" values="6;7;6" dur="1.5s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              </g>

              {/* Question mark */}
              <text x="200" y="255" textAnchor="middle" fill="#3B82F6" fontSize="36" fontWeight="bold">❓</text>

              {/* Motion arrows */}
              <path d="M120 80 Q 80 140 120 200" fill="none" stroke="#0066FF" strokeWidth="2" strokeDasharray="4 4" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
              </path>
              <path d="M280 80 Q 320 140 280 200" fill="none" stroke="#0066FF" strokeWidth="2" strokeDasharray="4 4" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>

          {/* Topic Badge */}
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: design.radius.full,
            background: design.colors.accentBlueMuted,
            marginBottom: design.spacing.md,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.accentBlue }}>
              PHYSICS • CIRCULAR MOTION
            </span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: isMobile ? 28 : 42,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: design.colors.textPrimary,
            marginBottom: design.spacing.md,
            maxWidth: 500,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Why Doesn't the Water Fall Out?
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.6,
            color: design.colors.textSecondary,
            maxWidth: 480,
            margin: '0 auto',
            marginBottom: design.spacing.xl,
          }}>
            Swing a cup of water in a vertical circle. At the top, it's upside down—yet the water stays in. How is this possible?
          </p>

          {/* CTA Button */}
          {renderButton('Discover the Physics →', () => goToPhase('predict'), 'primary', false, false, 'lg')}
        </div>

        {/* Feature Cards */}
        <div style={{
          padding: isMobile ? design.spacing.lg : design.spacing.xxl,
          maxWidth: 600,
          margin: '0 auto',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: design.spacing.md,
          }}>
            {[
              { icon: '🔬', title: 'Interactive Simulation', desc: 'Control speed and radius to explore' },
              { icon: '📐', title: 'Real Physics', desc: 'Learn v = √(gr) and F = mv²/r' },
              { icon: '🎢', title: 'Real Applications', desc: 'From roller coasters to space stations' },
              { icon: '✅', title: 'Knowledge Quiz', desc: '10 questions to test mastery' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: design.spacing.lg,
                background: design.colors.bgCard,
                borderRadius: design.radius.lg,
                border: `1px solid ${design.colors.border}`,
              }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: design.spacing.sm }}>{item.icon}</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: design.colors.textMuted, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.lg : design.spacing.xl }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.warning, marginBottom: design.spacing.sm }}>
            MAKE YOUR PREDICTION
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
            What keeps the water from falling at the top?
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
            {[
              { id: 'A', text: 'The cup pushes water upward (centrifugal force)' },
              { id: 'B', text: 'Gravity is cancelled at the top of the circle' },
              { id: 'C', text: 'The water\'s inertia keeps it moving in a circle' },
              { id: 'D', text: 'Air pressure holds the water in the cup' },
            ].map(opt => (
              <button
                key={opt.id}
                onMouseDown={() => { setPrediction(opt.id); emit('prediction', { prediction: opt.id }); }}
                style={{
                  padding: design.spacing.lg,
                  borderRadius: design.radius.md,
                  textAlign: 'left',
                  background: prediction === opt.id ? design.colors.accentBlueMuted : design.colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? design.colors.accentBlue : design.colors.border}`,
                  color: design.colors.textPrimary,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: design.font.sans,
                }}
              >
                <span style={{ fontWeight: 700, color: design.colors.accentBlue, marginRight: design.spacing.md }}>{opt.id}</span>
                <span style={{ fontSize: 16 }}>{opt.text}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md }}>
            {renderButton('← Back', () => goToPhase('hook'), 'ghost')}
            {renderButton('Test Your Prediction →', () => goToPhase('play'), 'primary', !prediction)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.md : design.spacing.lg }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.success, marginBottom: design.spacing.sm }}>
            INTERACTIVE EXPERIMENT
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
            Swing the Cup in a Vertical Circle
          </h2>

          {renderVisualization(true)}

          {experimentCount > 0 && (
            <div style={{
              marginTop: design.spacing.lg,
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: waterSpilled ? design.colors.errorMuted : design.colors.successMuted,
              border: `1px solid ${waterSpilled ? design.colors.error : design.colors.success}40`,
            }}>
              <p style={{ fontSize: 16, color: waterSpilled ? design.colors.error : design.colors.success, fontWeight: 600, marginBottom: design.spacing.xs }}>
                {waterSpilled ? '💧 Water spilled!' : '✓ Water stays in!'}
              </p>
              <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>
                {waterSpilled
                  ? `Speed (${speed.toFixed(1)} m/s) was below minimum (${minSpeedAtTop.toFixed(1)} m/s)`
                  : `Speed provides ${centripetalAccel.toFixed(1)} m/s² centripetal acceleration`
                }
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: design.spacing.md,
            marginTop: design.spacing.xl,
            paddingTop: design.spacing.lg,
            borderTop: `1px solid ${design.colors.border}`,
          }}>
            {renderButton('← Back', () => goToPhase('predict'), 'ghost')}
            {renderButton('Understand Why →', () => goToPhase('review'), 'primary', experimentCount < 2)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.lg : design.spacing.xl }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.accentBlue, marginBottom: design.spacing.sm }}>
            THE PHYSICS EXPLAINED
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.xl }}>
            Understanding Centripetal Force
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
            {[
              { icon: '🎯', title: 'Centripetal = "Center-Seeking"', desc: 'Any object moving in a circle needs a constant inward force. This is centripetal force: F = mv²/r.' },
              { icon: '⬇️', title: 'At the Top of the Circle', desc: 'BOTH gravity AND the cup\'s normal force point toward the center (downward). They work together to provide centripetal force.' },
              { icon: '📐', title: 'Minimum Speed Formula', desc: 'When gravity alone provides all centripetal force: mg = mv²/r → v = √(gr). Faster speeds are safer!' },
              { icon: '⚖️', title: 'Why Water Feels "Pressed In"', desc: 'When centripetal acceleration exceeds g, the cup must push the water inward. The water "feels" pressed into the cup bottom.' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: design.spacing.md,
                padding: design.spacing.lg,
                borderRadius: design.radius.md,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`,
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: design.spacing.lg,
            borderRadius: design.radius.lg,
            background: design.colors.accentBlueMuted,
            border: `1px solid ${design.colors.accentBlue}40`,
            marginBottom: design.spacing.xl,
          }}>
            <p style={{ fontSize: 16, color: design.colors.accentBlue, fontWeight: 600, marginBottom: design.spacing.xs }}>💡 Key Insight</p>
            <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>
              The water doesn't "know" it's upside down. It's accelerating toward the center so fast that the cup must push it inward—from the water's perspective, it's being pressed into the cup!
            </p>
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md }}>
            {renderButton('← Back', () => goToPhase('play'), 'ghost')}
            {renderButton('Try a Challenge →', () => goToPhase('twist_predict'))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.lg : design.spacing.xl }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.warning, marginBottom: design.spacing.sm }}>
            NEW CHALLENGE
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
            What if we change the radius?
          </h2>
          <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.xl }}>
            Using a <strong style={{ color: design.colors.textPrimary }}>longer string</strong> (bigger radius) at the same speed—will the water be more or less likely to stay in?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
            {[
              { id: 'A', text: 'More likely to stay in (bigger circle is easier)' },
              { id: 'B', text: 'Less likely to stay in (bigger circle needs more speed)' },
              { id: 'C', text: 'No difference (radius doesn\'t matter)' },
              { id: 'D', text: 'Depends on the mass of water' },
            ].map(opt => (
              <button
                key={opt.id}
                onMouseDown={() => { setTwistPrediction(opt.id); emit('prediction', { twistPrediction: opt.id }); }}
                style={{
                  padding: design.spacing.lg,
                  borderRadius: design.radius.md,
                  textAlign: 'left',
                  background: twistPrediction === opt.id ? design.colors.warningMuted : design.colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? design.colors.warning : design.colors.border}`,
                  color: design.colors.textPrimary,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: design.font.sans,
                }}
              >
                <span style={{ fontWeight: 700, color: design.colors.warning, marginRight: design.spacing.md }}>{opt.id}</span>
                <span style={{ fontSize: 16 }}>{opt.text}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md }}>
            {renderButton('← Back', () => goToPhase('review'), 'ghost')}
            {renderButton('Test It →', () => goToPhase('twist_play'), 'primary', !twistPrediction)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.md : design.spacing.lg }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.accentBlue, marginBottom: design.spacing.sm }}>
            EXPLORE RADIUS EFFECTS
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
            Adjust the String Length
          </h2>

          <div style={{
            background: `linear-gradient(180deg, #0A1628 0%, #000814 100%)`,
            borderRadius: design.radius.lg,
            padding: design.spacing.lg,
            border: `1px solid ${design.colors.border}`,
            marginBottom: design.spacing.lg,
          }}>
            {/* Simple radius visualization */}
            <svg viewBox="0 0 360 200" style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
              <circle cx="180" cy="100" r={40 + radius_ * 40} fill="none" stroke="#1E3A5F" strokeWidth="2" strokeDasharray="6 6" />
              <circle cx="180" cy="100" r="12" fill="#1E293B" stroke="#3B82F6" strokeWidth="2" />
              <line x1="180" y1="100" x2={180 + 40 + radius_ * 40} y2="100" stroke="#CBD5E1" strokeWidth="2" />
              <circle cx={180 + 40 + radius_ * 40} cy="100" r="14" fill="#475569" stroke="#64748B" strokeWidth="2" />
              <text x="180" y="180" textAnchor="middle" fill={design.colors.textSecondary} fontSize="14">
                Radius: {radius_.toFixed(1)} m
              </text>
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginTop: design.spacing.lg }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: design.spacing.md,
                padding: design.spacing.md,
                background: design.colors.bgCard,
                borderRadius: design.radius.md,
              }}>
                <span style={{ fontSize: 14, color: design.colors.textSecondary, minWidth: 70 }}>Radius</span>
                <input
                  type="range" min="0.5" max="3" step="0.5" value={radius_}
                  onChange={(e) => { setRadius_(parseFloat(e.target.value)); setWaterSpilled(false); }}
                  style={{ flex: 1, accentColor: design.colors.accentBlue }}
                />
                <span style={{ fontSize: 16, color: design.colors.textPrimary, minWidth: 50 }}>{radius_.toFixed(1)} m</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: design.spacing.md,
                padding: design.spacing.md,
                background: design.colors.bgCard,
                borderRadius: design.radius.md,
              }}>
                <span style={{ fontSize: 14, color: design.colors.textSecondary, minWidth: 70 }}>Speed</span>
                <input
                  type="range" min="1" max="8" step="0.5" value={speed}
                  onChange={(e) => { setSpeed(parseFloat(e.target.value)); setWaterSpilled(false); }}
                  style={{ flex: 1, accentColor: design.colors.success }}
                />
                <span style={{ fontSize: 16, color: design.colors.textPrimary, minWidth: 50 }}>{speed.toFixed(1)} m/s</span>
              </div>
            </div>
          </div>

          {/* Calculation Box */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderRadius: design.radius.md,
            marginBottom: design.spacing.lg,
          }}>
            <p style={{ fontSize: 14, color: design.colors.textSecondary, marginBottom: design.spacing.xs }}>
              <strong style={{ color: design.colors.textPrimary }}>Min speed at top:</strong> v = √(g × r) = √(9.8 × {radius_.toFixed(1)}) = <strong style={{ color: design.colors.warning }}>{minSpeedAtTop.toFixed(2)} m/s</strong>
            </p>
            <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>
              <strong style={{ color: design.colors.textPrimary }}>Your speed:</strong> <span style={{ color: speed >= minSpeedAtTop ? design.colors.success : design.colors.error }}>{speed.toFixed(1)} m/s {speed >= minSpeedAtTop ? '✓ Safe' : '✗ Too slow!'}</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md, justifyContent: 'space-between' }}>
            {renderButton('← Back', () => goToPhase('twist_predict'), 'ghost')}
            {renderButton('See Why →', () => goToPhase('twist_review'))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: design.colors.bgDeep, fontFamily: design.font.sans,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.lg : design.spacing.xl }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.accentBlue, marginBottom: design.spacing.sm }}>
            DEEPER UNDERSTANDING
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.xl }}>
            Bigger Radius = Higher Minimum Speed
          </h2>

          <div style={{
            padding: design.spacing.xl,
            background: design.colors.bgCard,
            borderRadius: design.radius.lg,
            border: `1px solid ${design.colors.border}`,
            marginBottom: design.spacing.xl,
          }}>
            <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              The formula <strong style={{ color: design.colors.accentBlue }}>v = √(gr)</strong> shows that larger radius requires MORE speed:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: design.spacing.md }}>
              {[
                { r: '1m', v: '3.1 m/s', color: design.colors.success },
                { r: '2m', v: '4.4 m/s', color: design.colors.warning },
                { r: '3m', v: '5.4 m/s', color: design.colors.error },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: design.spacing.md,
                  background: design.colors.bgElevated,
                  borderRadius: design.radius.md,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: item.color, marginBottom: design.spacing.xs }}>r = {item.r}</div>
                  <div style={{ fontSize: 12, color: design.colors.textSecondary }}>v<sub>min</sub> = {item.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: design.spacing.lg,
            background: design.colors.warningMuted,
            borderRadius: design.radius.lg,
            border: `1px solid ${design.colors.warning}40`,
            marginBottom: design.spacing.xl,
          }}>
            <p style={{ fontSize: 16, color: design.colors.warning, fontWeight: 600, marginBottom: design.spacing.xs }}>🎢 Real World Design</p>
            <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>
              This is why roller coaster loops are <strong style={{ color: design.colors.textPrimary }}>clothoid (teardrop) shapes</strong> instead of perfect circles. The tighter radius at the top reduces the required speed!
            </p>
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md }}>
            {renderButton('← Back', () => goToPhase('twist_play'), 'ghost')}
            {renderButton('Real World Applications →', () => goToPhase('transfer'))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TRANSFER - Real World Applications with Sequential Navigation
  // ============================================================================
  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size === applications.length;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: design.colors.bgDeep, fontFamily: design.font.sans,
      }}>
        {renderProgressBar()}

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: design.spacing.sm,
          padding: design.spacing.md,
          background: design.colors.bgPrimary,
          borderBottom: `1px solid ${design.colors.border}`,
        }}>
          {applications.map((_, idx) => (
            <div key={idx} style={{
              width: 10, height: 10, borderRadius: design.radius.full,
              background: completedApps.has(idx)
                ? design.colors.success
                : idx === activeApp
                  ? design.colors.accentBlue
                  : design.colors.bgElevated,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: design.spacing.sm,
          padding: design.spacing.md,
          borderBottom: `1px solid ${design.colors.border}`,
          overflowX: 'auto',
          background: design.colors.bgPrimary,
        }}>
          {applications.map((a, idx) => {
            const isAccessible = idx === 0 || completedApps.has(idx - 1);
            const isCurrent = idx === activeApp;
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!isAccessible || navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                disabled={!isAccessible}
                style={{
                  padding: '10px 16px',
                  borderRadius: design.radius.md,
                  border: 'none',
                  background: isCurrent ? a.color : design.colors.bgCard,
                  color: isCurrent ? '#FFFFFF' : isAccessible ? design.colors.textSecondary : design.colors.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isAccessible ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                  fontFamily: design.font.sans,
                  transition: 'all 0.2s',
                  opacity: isAccessible ? 1 : 0.5,
                  position: 'relative',
                }}
              >
                {completedApps.has(idx) && (
                  <span style={{ position: 'absolute', top: 2, right: 2, color: design.colors.success, fontSize: 8 }}>✓</span>
                )}
                {a.icon} {a.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.lg : design.spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.lg, marginBottom: design.spacing.xl }}>
              <div style={{
                width: 72, height: 72,
                borderRadius: design.radius.lg,
                background: `${app.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}>
                {app.icon}
              </div>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>{app.title}</h2>
                <p style={{ fontSize: 14, color: app.color, margin: 0, fontWeight: 500 }}>{app.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: 1.7 }}>
              {app.description}
            </p>

            {/* Physics Connection */}
            <div style={{
              padding: design.spacing.lg,
              background: `${app.color}10`,
              borderRadius: design.radius.md,
              border: `1px solid ${app.color}30`,
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: 16, color: app.color, fontWeight: 600, marginBottom: design.spacing.xs }}>🔗 Physics Connection</p>
              <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>{app.physics}</p>
            </div>

            {/* Insight */}
            <div style={{
              padding: design.spacing.lg,
              background: design.colors.bgCard,
              borderRadius: design.radius.md,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: 16, color: design.colors.textPrimary, fontWeight: 600, marginBottom: design.spacing.xs }}>💡 Key Insight</p>
              <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0 }}>{app.insight}</p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: design.spacing.md,
              marginBottom: design.spacing.xl,
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  padding: design.spacing.md,
                  background: design.colors.bgCard,
                  borderRadius: design.radius.md,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: app.color, marginBottom: 2 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: design.colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mark as read button */}
            {!completedApps.has(activeApp) && (
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  emit('interaction', { app: app.id, action: 'marked_read' }, 'app_completed');
                  if (activeApp < applications.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
                }}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: design.colors.successMuted,
                  border: `1px solid ${design.colors.success}50`,
                  borderRadius: design.radius.md,
                  cursor: 'pointer',
                  color: design.colors.success,
                  fontWeight: 600,
                  fontSize: 15,
                  fontFamily: design.font.sans,
                  transition: 'all 0.2s ease',
                  marginBottom: design.spacing.md,
                }}
              >
                ✓ Mark "{app.title}" as Read
              </button>
            )}

            {completedApps.has(activeApp) && activeApp < applications.length - 1 && (
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(activeApp + 1);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: design.colors.bgCard,
                  border: `1px solid ${design.colors.border}`,
                  borderRadius: design.radius.md,
                  cursor: 'pointer',
                  color: design.colors.textPrimary,
                  fontWeight: 600,
                  fontSize: 15,
                  fontFamily: design.font.sans,
                  transition: 'all 0.2s ease',
                  marginBottom: design.spacing.md,
                }}
              >
                Next Application →
              </button>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          padding: design.spacing.lg,
          borderTop: `1px solid ${design.colors.border}`,
          background: design.colors.bgPrimary,
        }}>
          {allAppsCompleted ? (
            renderButton('Take the Quiz →', () => goToPhase('test'), 'primary', false, true)
          ) : (
            <div style={{
              padding: '14px 20px',
              background: design.colors.bgSecondary,
              borderRadius: design.radius.md,
              textAlign: 'center',
              border: `1px solid ${design.colors.border}`,
            }}>
              <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0 }}>
                Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length} completed)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TEST - Knowledge Assessment
  // ============================================================================
  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: design.colors.bgDeep, fontFamily: design.font.sans,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? design.spacing.lg : design.spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.lg, flexWrap: 'wrap', gap: design.spacing.sm }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: design.colors.accentBlue }}>
                QUESTION {currentQuestion + 1} OF {testQuestions.length}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: design.colors.success, fontFamily: design.font.sans,
                background: design.colors.successMuted, padding: '6px 12px', borderRadius: design.radius.full,
              }}>
                Score: {correctAnswers}/{answeredQuestions.size}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 4, background: design.colors.bgTertiary, borderRadius: design.radius.full,
              marginBottom: design.spacing.md, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${((currentQuestion + 1) / testQuestions.length) * 100}%`,
                background: design.colors.accentBlue, borderRadius: design.radius.full,
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Question */}
            <h2 style={{ fontSize: 22, fontWeight: 600, color: design.colors.textPrimary, marginBottom: design.spacing.xl, lineHeight: 1.4 }}>
              {q.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
              {q.options.map((opt, i) => {
                const isSelected = selectedAnswer === i && currentQuestion === answeredQuestions.size - 1 || (isAnswered && i === selectedAnswer);
                const isCorrect = i === q.correct;
                const showResult = isAnswered;

                let bg = design.colors.bgCard;
                let borderColor = design.colors.border;
                let textColor = design.colors.textPrimary;

                if (showResult) {
                  if (isCorrect) {
                    bg = design.colors.successMuted;
                    borderColor = design.colors.success;
                    textColor = design.colors.success;
                  } else if (isSelected) {
                    bg = design.colors.errorMuted;
                    borderColor = design.colors.error;
                    textColor = design.colors.error;
                  }
                }

                return (
                  <button
                    key={i}
                    onMouseDown={() => handleTestAnswer(i)}
                    disabled={isAnswered}
                    style={{
                      padding: design.spacing.lg,
                      borderRadius: design.radius.md,
                      textAlign: 'left',
                      background: bg,
                      border: `2px solid ${borderColor}`,
                      color: textColor,
                      cursor: isAnswered ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: design.font.sans,
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: design.spacing.md, color: showResult ? (isCorrect ? design.colors.success : isSelected ? design.colors.error : design.colors.textSecondary) : design.colors.accentBlue }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ fontSize: 16 }}>{opt}</span>
                    {showResult && isCorrect && <span style={{ marginLeft: design.spacing.sm }}>✓</span>}
                    {showResult && isSelected && !isCorrect && <span style={{ marginLeft: design.spacing.sm }}>✗</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && isAnswered && (
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.md,
                background: design.colors.accentBlueMuted,
                border: `1px solid ${design.colors.accentBlue}40`,
                marginBottom: design.spacing.xl,
              }}>
                <p style={{ fontSize: 16, color: design.colors.accentBlue, fontWeight: 600, marginBottom: design.spacing.xs }}>💡 Explanation</p>
                <p style={{ fontSize: 14, color: design.colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{q.explanation}</p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: design.spacing.md, justifyContent: 'space-between' }}>
              {renderButton(
                '← Previous',
                () => {
                  setCurrentQuestion(prev => Math.max(0, prev - 1));
                  setSelectedAnswer(null);
                  setShowExplanation(answeredQuestions.has(currentQuestion - 1));
                },
                'ghost',
                currentQuestion === 0
              )}
              {currentQuestion < testQuestions.length - 1 ? (
                renderButton(
                  'Next →',
                  () => {
                    setCurrentQuestion(prev => prev + 1);
                    setSelectedAnswer(null);
                    setShowExplanation(answeredQuestions.has(currentQuestion + 1));
                  },
                  'secondary',
                  !isAnswered
                )
              ) : answeredQuestions.size === testQuestions.length ? (
                renderButton('Complete →', () => goToPhase('mastery'), 'success')
              ) : (
                <span style={{ fontSize: 12, color: design.colors.textMuted, alignSelf: 'center' }}>
                  Answer all to continue
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MASTERY - Completion Screen
  // ============================================================================
  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: design.colors.bgDeep, fontFamily: design.font.sans,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: design.spacing.xl, position: 'relative', overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: isMobile ? 64 : 80, marginBottom: design.spacing.xl }}>🏆</div>
            <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
              Mastery Achieved!
            </h1>
            <div style={{
              fontSize: isMobile ? 44 : 56, fontWeight: 700, color: design.colors.success,
              marginBottom: design.spacing.xs,
            }}>
              {percentage}%
            </div>
            <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {correctAnswers}/{testQuestions.length} correct answers
            </p>
            <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.xl, lineHeight: 1.7 }}>
              You now understand centripetal force—the invisible force that keeps objects moving in circles, from swinging water cups to orbiting satellites!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: design.spacing.sm, justifyContent: 'center', marginBottom: design.spacing.xl }}>
              {['F = mv²/r', 'v = √(gr)', 'Centripetal → Center', 'Inertia → Tangent'].map((concept, i) => (
                <div key={i} style={{
                  padding: '10px 18px',
                  borderRadius: design.radius.full,
                  background: design.colors.bgCard,
                  border: `1px solid ${design.colors.border}`,
                }}>
                  <span style={{ fontSize: 14, color: design.colors.accentBlue, fontWeight: 600 }}>{concept}</span>
                </div>
              ))}
            </div>
            {renderButton('🔄 Play Again', () => {
              setPhase('hook');
              setExperimentCount(0);
              setCurrentQuestion(0);
              setCorrectAnswers(0);
              setAnsweredQuestions(new Set());
              setPrediction(null);
              setTwistPrediction(null);
              setActiveApp(0);
              setCompletedApps(new Set());
              setSpeed(4);
              setRadius_(1.5);
              setAngle(0);
              setIsSpinning(false);
              setWaterSpilled(false);
            }, 'success', false, false, 'lg')}
          </div>

          {/* Confetti */}
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
            }
          `}</style>
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px',
              animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
              pointerEvents: 'none', fontSize: 18,
            }}>
              {['🎢', '⚡', '⭐', '✨', '🎉'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Phase mapping
  const phases: Record<Phase, () => JSX.Element> = {
    hook: renderHook,
    predict: renderPredict,
    play: renderPlay,
    review: renderReview,
    twist_predict: renderTwistPredict,
    twist_play: renderTwistPlay,
    twist_review: renderTwistReview,
    transfer: renderTransfer,
    test: renderTest,
    mastery: renderMastery,
  };

  return (
    <div style={{
      width, height, borderRadius: design.radius.lg, overflow: 'hidden',
      position: 'relative', background: design.colors.bgDeep, fontFamily: design.font.sans,
      boxShadow: design.shadow.lg,
    }}>
      {phases[phase]()}
    </div>
  );
};

export default CentripetalForceRenderer;
