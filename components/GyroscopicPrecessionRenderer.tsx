import React, { useState, useEffect, useCallback } from 'react';

// --- GAME EVENT INTERFACE ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
    'coach_prompt' | 'visual_state_update' | 'app_changed' | 'app_completed';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface GyroscopicPrecessionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// --- PREMIUM DESIGN SYSTEM (Apple/Airbnb quality) ---
const design = {
  // Colors - carefully balanced for contrast and readability
  colors: {
    // Primary brand colors
    primary: '#f97316',       // Vibrant orange
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    accent: '#8b5cf6',        // Rich purple
    accentLight: '#a78bfa',

    // Semantic colors
    success: '#10b981',
    successLight: '#34d399',
    warning: '#f59e0b',
    danger: '#ef4444',

    // Background hierarchy (dark theme)
    bgPrimary: '#0a0a0f',     // Deepest background
    bgSecondary: '#12121a',   // Cards and elevated surfaces
    bgTertiary: '#1a1a24',    // Hover states, inputs
    bgElevated: '#22222e',    // Highly elevated elements

    // Border colors
    border: '#2a2a36',
    borderLight: '#3a3a48',
    borderFocus: '#f97316',

    // Text hierarchy
    textPrimary: '#fafafa',   // Headings
    textSecondary: '#a1a1aa', // Body text
    textTertiary: '#71717a',  // Captions, hints
    textInverse: '#0a0a0f',   // Text on light backgrounds
  },

  // Typography
  fonts: {
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  },

  // Spacing scale (4px base)
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 40px ${color}40`,
  },
};

const { colors, space, radius, shadows } = design;

// --- PHASES ---
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

// --- MAIN COMPONENT ---
const GyroscopicPrecessionRenderer: React.FC<GyroscopicPrecessionRendererProps> = ({ onGameEvent, gamePhase }) => {
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });

  // Audio feedback
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        success: { freq: 800, duration: 0.2, type: 'sine' },
        failure: { freq: 300, duration: 0.3, type: 'sine' },
        transition: { freq: 500, duration: 0.15, type: 'sine' },
        complete: { freq: 900, duration: 0.4, type: 'sine' }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // --- GAME STATE ---
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [precessionAngle, setPrecessionAngle] = useState(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [selectedApp, setSelectedApp] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- AI COACH ---
  const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'gyroscopic_precession',
      gameTitle: 'Gyroscopic Precession',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      emitGameEvent('game_started', { phase: 'hook' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // --- NAVIGATION ---
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitGameEvent('phase_changed', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
  }, [emitGameEvent, phase, playSound]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // --- PHYSICS ---
  const momentOfInertia = 0.1;
  const angularMomentum = momentOfInertia * spinSpeed;
  const precessionRate = spinSpeed > 0 ? 0.5 / angularMomentum : 0;

  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.016), 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSpinning && (phase === 'play' || phase === 'twist_play')) {
      setWheelAngle(prev => (prev + spinSpeed * 3) % 360);
      setPrecessionAngle(prev => (prev + precessionRate * 2) % 360);
    }
  }, [time, isSpinning, spinSpeed, precessionRate, phase]);

  // --- TEST DATA ---
  const testQuestions = [
    {
      scenario: "You're holding a spinning bike wheel by its axle, and you try to tilt it downward.",
      question: "Instead of tilting down, the wheel moves sideways. Why?",
      options: [
        { text: "Air resistance pushes it sideways", correct: false },
        { text: "Torque changes the direction of angular momentum", correct: true },
        { text: "The wheel is magnetically attracted", correct: false },
        { text: "Gravity affects spinning objects differently", correct: false }
      ],
      explanation: "When you apply a torque, it changes the DIRECTION of the angular momentum vector, not its magnitude. The wheel moves perpendicular to both the torque and spin axis—this is precession!"
    },
    {
      scenario: "A toy gyroscope is spinning fast. You push down on one end of its axle.",
      question: "What happens to the gyroscope?",
      options: [
        { text: "It tips over immediately", correct: false },
        { text: "It spins faster", correct: false },
        { text: "It precesses—moving in a slow circle", correct: true },
        { text: "It stops spinning", correct: false }
      ],
      explanation: "The push (torque) causes the gyroscope to precess—its axis slowly rotates in a circle. The faster it spins, the slower the precession."
    },
    {
      scenario: "Wheel A spins at 10 rad/s, Wheel B at 5 rad/s. You apply the same torque to both.",
      question: "Which wheel precesses faster?",
      options: [
        { text: "Wheel A (faster spin)", correct: false },
        { text: "Wheel B (slower spin)", correct: true },
        { text: "Both same rate", correct: false },
        { text: "Neither will precess", correct: false }
      ],
      explanation: "Precession rate Ω = τ/L. With same torque, the slower wheel has less angular momentum, so it precesses FASTER."
    },
    {
      scenario: "A spinning top starts to wobble as it slows down.",
      question: "Why does the wobbling get worse as it slows?",
      options: [
        { text: "The top becomes heavier", correct: false },
        { text: "Lower L means gravity causes faster precession", correct: true },
        { text: "Air becomes thicker", correct: false },
        { text: "It's running out of energy", correct: false }
      ],
      explanation: "As spin decreases, angular momentum L decreases. Since Ω = τ/L, lower L means faster precession and larger wobble."
    },
    {
      scenario: "A helicopter's main rotor spins counterclockwise viewed from above.",
      question: "Without a tail rotor, what would happen to the body?",
      options: [
        { text: "Nothing—too heavy", correct: false },
        { text: "Body spins clockwise", correct: true },
        { text: "Body precesses sideways", correct: false },
        { text: "Helicopter rises faster", correct: false }
      ],
      explanation: "Angular momentum conservation! The rotor spins one way, so without the tail rotor, the body would spin opposite."
    },
    {
      scenario: "Spacecraft use spinning reaction wheels to orient themselves.",
      question: "How do reaction wheels work?",
      options: [
        { text: "Push against solar wind", correct: false },
        { text: "Speed changes make spacecraft rotate opposite", correct: true },
        { text: "Create artificial gravity", correct: false },
        { text: "Emit particles", correct: false }
      ],
      explanation: "Conservation of angular momentum! If a wheel speeds up one direction, the spacecraft rotates opposite. No fuel needed!"
    },
    {
      scenario: "A figure skater tilts their head while spinning.",
      question: "What gyroscopic effect might they experience?",
      options: [
        { text: "No effect—humans too light", correct: false },
        { text: "Pulled sideways due to precession", correct: true },
        { text: "Immediately stop spinning", correct: false },
        { text: "Spin faster", correct: false }
      ],
      explanation: "Their body acts as a gyroscope! Tilting while spinning creates precession forces. Experienced skaters learn to anticipate these."
    },
    {
      scenario: "A motorcycle is leaning into a turn at high speed.",
      question: "How do the spinning wheels affect stability?",
      options: [
        { text: "Make it unstable", correct: false },
        { text: "Gyroscopic effect resists changes, increasing stability", correct: true },
        { text: "No effect", correct: false },
        { text: "Make it go straight", correct: false }
      ],
      explanation: "The wheels' angular momentum resists tilting and turning. This gyroscopic stability helps keep the bike upright."
    },
    {
      scenario: "Earth's axis slowly traces a circle in space over 26,000 years.",
      question: "What causes this slow precession?",
      options: [
        { text: "Sun's pull on Earth's equatorial bulge", correct: true },
        { text: "Moon pushing Earth sideways", correct: false },
        { text: "Solar wind pressure", correct: false },
        { text: "Dark matter", correct: false }
      ],
      explanation: "Earth bulges at the equator. The Sun and Moon exert torque on this bulge, causing Earth's axis to precess slowly."
    },
    {
      scenario: "An engineer designs a ship stabilizer using a massive spinning flywheel.",
      question: "How would this reduce ship roll in waves?",
      options: [
        { text: "Absorbs wave energy", correct: false },
        { text: "Precession generates counter-torques", correct: true },
        { text: "Adds weight to bottom", correct: false },
        { text: "Pushes water away", correct: false }
      ],
      explanation: "When waves try to roll the ship, the flywheel precesses. This generates torques opposing the roll, keeping the ship stable."
    }
  ];

  // --- REAL WORLD APPS ---
  const realWorldApps = [
    {
      icon: '🚁', title: 'Helicopter Dynamics', tagline: 'Tail Rotor & Gyroscopic Effects',
      description: "Helicopter rotors are massive spinning disks with significant angular momentum. The tail rotor counteracts torque, and gyroscopic effects influence maneuverability.",
      connection: "Just like a spinning wheel resists tilting, the helicopter's rotor resists orientation changes. Pilots must account for 90° phase lag in their inputs.",
      howItWorks: "The main rotor creates angular momentum. When tilting, gyroscopic precession causes response 90° ahead of input—pilots learn to compensate.",
      stats: [{ value: '400+', label: 'RPM typical', icon: '🔄' }, { value: '90°', label: 'Phase lag', icon: '📐' }, { value: '1944', label: 'First practical', icon: '📅' }],
      examples: ['Tail rotor prevents body rotation', 'Cyclic inputs account for precession', 'Autorotation uses stored momentum', 'Blade flapping compensates'],
      color: colors.primary
    },
    {
      icon: '🛰️', title: 'Spacecraft Control', tagline: 'Reaction Wheels & CMGs',
      description: "Satellites use spinning reaction wheels and control moment gyroscopes (CMGs) to orient precisely in space—without fuel.",
      connection: "When a reaction wheel speeds up, the spacecraft rotates opposite (conservation). CMGs use precession for large torques.",
      howItWorks: "Three wheels on perpendicular axes control all rotations. CMGs tilt spinning wheels to create precession torques larger than motors could directly.",
      stats: [{ value: '4+', label: 'Wheels on ISS', icon: '🔵' }, { value: '0', label: 'Fuel used', icon: '⛽' }, { value: '0.001°', label: 'Accuracy', icon: '🎯' }],
      examples: ['Hubble precision pointing', 'ISS uses CMGs', 'Mars rovers orient antennas', 'GPS satellites stay Earth-facing'],
      color: colors.accent
    },
    {
      icon: '🏍️', title: 'Motorcycle Dynamics', tagline: 'Countersteering & Stability',
      description: "Motorcycle wheels act as gyroscopes, providing inherent stability. Countersteering is necessary because of gyroscopic precession.",
      connection: "The spinning front wheel resists tilting. To lean for turning, riders briefly steer AWAY—using precession to tip the bike.",
      howItWorks: "At speed, steering right causes the wheel to precess and lean LEFT. This is why motorcycles are steered by 'pushing' the handlebar.",
      stats: [{ value: '20+', label: 'mph for effect', icon: '💨' }, { value: '2×', label: 'Stability boost', icon: '📊' }, { value: '~1s', label: 'Response time', icon: '⏱️' }],
      examples: ['Countersteering all turns', 'Hands-free stability', 'Weave damping', 'Racing lean angles 60°'],
      color: colors.success
    },
    {
      icon: '🌍', title: "Earth's Precession", tagline: '26,000 Year Wobble',
      description: "Earth's axis precesses like a slow-motion top, tracing a circle in space over 26,000 years, changing which star is the North Star.",
      connection: "Earth's equatorial bulge experiences gravitational torque from Sun and Moon. Combined with spin, this causes slow precession.",
      howItWorks: "Earth bulges at the equator. Sun and Moon pull more on the closer bulge, creating torque that causes 26,000-year precession.",
      stats: [{ value: '26,000', label: 'Years per cycle', icon: '🔄' }, { value: '23.4°', label: 'Axial tilt', icon: '📐' }, { value: '50"', label: 'Arc-sec/year', icon: '⭐' }],
      examples: ["Polaris wasn't always North Star", "Vega will be in ~12,000 years", "Milankovitch climate cycles", "Ancient alignments shift"],
      color: colors.warning
    }
  ];

  // ===================== HELPER FUNCTIONS (return JSX) =====================

  // Premium wrapper for all phases
  const renderPremiumWrapper = (content: React.ReactNode) => (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Gyroscopic Precession</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? space.md : space.xl }}>
          {content}
        </div>
      </div>
    </div>
  );

  // Progress indicator (kept for internal use, but header handles main navigation)
  const renderProgressBar = () => {
    return null; // Progress now shown in premium header
  };

  // Bottom navigation
  const renderBottomBar = (canBack: boolean, canNext: boolean, label: string) => {
    const idx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: space.lg,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => canBack && idx > 0 && goBack()}
          style={{
            padding: `${space.md} ${space.lg}`,
            borderRadius: radius.md,
            fontSize: '14px', fontWeight: 600,
            background: colors.bgTertiary,
            color: colors.textSecondary,
            border: 'none',
            cursor: canBack && idx > 0 ? 'pointer' : 'not-allowed',
            opacity: canBack && idx > 0 ? 1 : 0.4,
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => canNext && goNext()}
          style={{
            padding: `${space.md} ${space.xl}`,
            borderRadius: radius.md,
            fontSize: '14px', fontWeight: 700,
            background: canNext
              ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
              : colors.bgTertiary,
            color: canNext ? colors.textPrimary : colors.textTertiary,
            border: 'none',
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.4,
            boxShadow: canNext ? shadows.glow(colors.primary) : 'none',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          {label} →
        </button>
      </div>
    );
  };

  // Section header
  const renderHeader = (step: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: space.lg }}>
      <span style={{
        display: 'inline-block',
        fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: colors.primary,
        marginBottom: space.sm,
      }}>{step}</span>
      <h2 style={{
        fontSize: isMobile ? '22px' : '26px', fontWeight: 800,
        color: colors.textPrimary,
        lineHeight: 1.2, marginBottom: subtitle ? space.sm : 0,
      }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>{subtitle}</p>
      )}
    </div>
  );

  // Info card
  const renderInfoCard = (icon: string, title: string, desc: string) => (
    <div style={{
      display: 'flex', gap: space.md,
      padding: space.md,
      background: colors.bgSecondary,
      borderRadius: radius.md,
      border: `1px solid ${colors.border}`,
      marginBottom: space.sm,
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, marginBottom: '4px' }}>{title}</p>
        <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );

  // Gyroscope visualization
  const renderGyroscope = (interactive: boolean = false) => {
    const precX = Math.sin(precessionAngle * Math.PI / 180) * 25;
    const precY = Math.cos(precessionAngle * Math.PI / 180) * 8;

    return (
      <div style={{
        background: `linear-gradient(180deg, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 100%)`,
        borderRadius: radius.lg,
        padding: space.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <svg viewBox="0 0 400 280" style={{ width: '100%', maxHeight: '260px', display: 'block' }}>
          <defs>
            <linearGradient id="wheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.primaryDark} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background pattern */}
          <pattern id="gridP" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke={colors.bgTertiary} strokeWidth="0.5" />
          </pattern>
          <rect width="400" height="280" fill="url(#gridP)" opacity="0.3" />

          {/* Hand */}
          <g transform={`translate(${110 + precX}, ${140 + precY})`}>
            <ellipse cx="0" cy="0" rx="22" ry="32" fill="#78716c" stroke="#a8a29e" strokeWidth="2" />
            <ellipse cx="-7" cy="-14" rx="7" ry="11" fill="#78716c" />
            <ellipse cx="7" cy="-16" rx="7" ry="11" fill="#78716c" />
          </g>

          {/* Axle */}
          <line
            x1={130 + precX} y1={140 + precY}
            x2={270 + precX} y2={140 + precY}
            stroke="#94a3b8" strokeWidth="6" strokeLinecap="round"
          />

          {/* Wheel */}
          <g transform={`translate(${270 + precX}, ${140 + precY}) rotate(${wheelAngle})`} filter={isSpinning ? "url(#glow)" : ""}>
            <circle cx="0" cy="0" r="50" fill="none" stroke="url(#wheelGrad)" strokeWidth="10" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
              <line key={i} x1="0" y1="0" x2={Math.cos(a * Math.PI / 180) * 40} y2={Math.sin(a * Math.PI / 180) * 40} stroke="#64748b" strokeWidth="2" />
            ))}
            <circle cx="0" cy="0" r="10" fill="#475569" stroke="#64748b" strokeWidth="2" />
          </g>

          {/* L vector */}
          <g transform={`translate(${270 + precX}, ${140 + precY})`}>
            <line x1="0" y1="0" x2="0" y2="-80" stroke={colors.accent} strokeWidth="3" />
            <polygon points="-5,-80 5,-80 0,-90" fill={colors.accent} />
            <text x="12" y="-65" fontSize="13" fontWeight="bold" fill={colors.accent}>L</text>
          </g>

          {/* Torque arrow */}
          {isSpinning && (
            <g transform={`translate(${270 + precX}, ${200 + precY})`}>
              <line x1="0" y1="0" x2="0" y2="35" stroke={colors.danger} strokeWidth="3" strokeDasharray="6 3">
                <animate attributeName="stroke-dashoffset" values="0;-18" dur="0.5s" repeatCount="indefinite" />
              </line>
              <polygon points="-5,35 5,35 0,45" fill={colors.danger} />
              <text x="12" y="25" fontSize="11" fontWeight="bold" fill={colors.danger}>τ (Push)</text>
            </g>
          )}

          {/* Precession indicator */}
          {isSpinning && (
            <g transform="translate(200, 60)">
              <path d="M-25,0 A25,8 0 0 1 25,0" fill="none" stroke={colors.success} strokeWidth="2" strokeDasharray="4 2">
                <animate attributeName="stroke-dashoffset" values="0;-12" dur="1s" repeatCount="indefinite" />
              </path>
              <polygon points="23,-4 30,0 23,4" fill={colors.success} />
              <text x="0" y="-12" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colors.success}>PRECESSION</text>
            </g>
          )}

          {/* Info box */}
          <g transform="translate(15, 220)">
            <rect width="140" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
            <text x="10" y="18" fontSize="10" fill={colors.textTertiary}>Spin: {spinSpeed.toFixed(1)} rad/s</text>
            <text x="10" y="32" fontSize="10" fill={colors.textTertiary}>L = {angularMomentum.toFixed(2)} kg·m²/s</text>
            <text x="10" y="46" fontSize="10" fill={colors.success}>Ω = {precessionRate.toFixed(2)} rad/s</text>
          </g>
        </svg>

        {interactive && (
          <div style={{ marginTop: space.md }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: space.md,
              padding: space.md,
              background: colors.bgTertiary,
              borderRadius: radius.md,
              marginBottom: space.md,
            }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '70px' }}>Spin Speed</span>
              <input
                type="range" min="1" max="10" step="0.5" value={spinSpeed}
                onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: colors.primary, height: '6px' }}
              />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '50px', fontWeight: 600 }}>{spinSpeed.toFixed(1)}</span>
            </div>

            <button
              onClick={() => { setIsSpinning(!isSpinning); setExperimentCount(c => c + 1); }}
              style={{
                width: '100%',
                padding: space.md,
                borderRadius: radius.md,
                fontSize: '15px', fontWeight: 700,
                background: isSpinning ? colors.bgTertiary : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: colors.textPrimary,
                border: 'none',
                cursor: 'pointer',
                boxShadow: isSpinning ? 'none' : shadows.glow(colors.primary),
                transition: 'all 0.2s ease',
                zIndex: 10,
              }}
            >
              {isSpinning ? '⏹ Stop & Reset' : '▶ Spin Wheel & Apply Torque'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ===================== PHASE RENDERS =====================

  // HOOK - Premium welcome screen
  if (phase === 'hook') {
    return renderPremiumWrapper(
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Gradient title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
          The Spinning Wheel Mystery
        </h1>

        {/* Premium card */}
        <div className="max-w-2xl mx-auto p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl">
          <p className="text-lg text-slate-300 leading-relaxed">
            Push a spinning bike wheel down... but it moves <strong className="text-cyan-400">sideways</strong> instead! Discover the physics behind this counterintuitive behavior.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-md">
          {[
            { icon: '🔄', label: 'Spin & Push' },
            { icon: '📐', label: '90° Response' },
            { icon: '🚁', label: 'Real Uses' },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center">
              <span className="text-2xl block mb-2">{item.icon}</span>
              <span className="text-xs font-semibold text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => goNext()}
          style={{ zIndex: 10 }}
          className="mt-8 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all"
        >
          Make a Prediction
        </button>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.lg : space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 1 • Predict', 'Which Way Does It Move?', 'You hold a fast-spinning bike wheel, then push one end DOWN.')}

            {/* Simple diagram */}
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: space.lg,
            }}>
              <svg viewBox="0 0 300 120" style={{ width: '100%', maxHeight: '110px' }}>
                <circle cx="150" cy="55" r="38" fill="none" stroke={colors.primary} strokeWidth="5" />
                <line x1="90" y1="55" x2="210" y2="55" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
                <circle cx="150" cy="55" r="7" fill="#475569" />
                <line x1="210" y1="55" x2="210" y2="95" stroke={colors.danger} strokeWidth="3" />
                <polygon points="205,95 215,95 210,105" fill={colors.danger} />
                <text x="225" y="85" fontSize="11" fill={colors.danger} fontWeight="bold">PUSH</text>
                <text x="150" y="115" textAnchor="middle" fontSize="10" fill={colors.textTertiary}>Spinning wheel - you push one end down</text>
              </svg>
            </div>

            {/* Options */}
            <p style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, marginBottom: space.md }}>
              The wheel will...
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
              {[
                { id: 'down', label: 'Tip DOWNWARD', desc: 'In the direction I push' },
                { id: 'up', label: 'Tip UPWARD', desc: 'Opposite to my push' },
                { id: 'sideways', label: 'Move SIDEWAYS', desc: 'Perpendicular to my push' },
                { id: 'nothing', label: 'Stay perfectly still', desc: 'Resist all motion' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setPrediction(opt.id); emitGameEvent('prediction_made', { prediction: opt.id }); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: space.md,
                    padding: space.md,
                    borderRadius: radius.md,
                    textAlign: 'left',
                    background: prediction === opt.id ? `${colors.primary}15` : colors.bgSecondary,
                    border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    zIndex: 10,
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${prediction === opt.id ? colors.primary : colors.borderLight}`,
                    background: prediction === opt.id ? colors.primary : 'transparent',
                    transition: 'all 0.2s ease',
                  }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                    <p style={{ fontSize: '12px', color: colors.textTertiary }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test It')}
      </div>
    );
  }

  // PLAY
  if (phase === 'play') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.md : space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 2 • Experiment', 'Spin the Wheel & Push', 'Watch what happens when you apply torque to a spinning wheel!')}
            {renderGyroscope(true)}

            {isSpinning && (
              <div style={{
                marginTop: space.md,
                padding: space.md,
                borderRadius: radius.md,
                background: `${colors.success}15`,
                border: `1px solid ${colors.success}40`,
              }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: colors.success, marginBottom: '4px' }}>👀 Watch carefully!</p>
                <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                  The wheel moves <strong style={{ color: colors.textPrimary }}>sideways</strong>, not down!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, experimentCount >= 1, 'Understand Why')}
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.lg : space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 3 • Understanding', 'Why 90° Sideways?', 'The physics of gyroscopic precession explained.')}

            {renderInfoCard('🎯', 'Torque Changes L\'s Direction', 'Applied torque doesn\'t speed up the wheel—it changes the DIRECTION of angular momentum. The change is perpendicular to both torque and spin.')}
            {renderInfoCard('📐', 'The Right-Hand Rule', 'Point fingers along ω (spin), curl toward τ (push). Your thumb points where L moves—90° sideways!')}
            {renderInfoCard('⚡', 'Precession Rate: Ω = τ/L', 'More spin (bigger L) = SLOWER precession. More torque = faster precession.')}

            {/* Key equation */}
            <div style={{
              padding: space.lg,
              borderRadius: radius.lg,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
              marginTop: space.lg,
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: colors.textTertiary, marginBottom: space.sm }}>THE PRECESSION EQUATION</p>
              <p style={{ fontSize: '26px', fontWeight: 800, color: colors.primary }}>Ω = τ / (I × ω)</p>
              <p style={{ fontSize: '13px', color: colors.textSecondary, marginTop: space.sm }}>Higher spin (ω) → Lower precession rate (Ω)</p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Try a Challenge')}
      </div>
    );
  }

  // TWIST_PREDICT
  if (phase === 'twist_predict') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.lg : space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 4 • New Variable', 'What If You Spin Slower?', 'You spin the wheel at HALF the speed, then apply the same push.')}

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: `${colors.warning}15`,
              border: `1px solid ${colors.warning}40`,
              marginBottom: space.lg,
            }}>
              <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                Original: <strong style={{ color: colors.textPrimary }}>10 rad/s</strong><br />
                New: <strong style={{ color: colors.warning }}>5 rad/s</strong> (half speed)<br />
                Same push force applied.
              </p>
            </div>

            <p style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, marginBottom: space.md }}>The precession will be...</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
              {[
                { id: 'faster', label: 'FASTER precession', desc: 'Less spin = less resistance' },
                { id: 'slower', label: 'SLOWER precession', desc: 'Less spin = weaker effect' },
                { id: 'same', label: 'SAME rate', desc: 'Spin speed doesn\'t matter' },
                { id: 'opposite', label: 'OPPOSITE direction', desc: 'Slow spin reverses it' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setTwistPrediction(opt.id); emitGameEvent('prediction_made', { twistPrediction: opt.id }); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: space.md,
                    padding: space.md,
                    borderRadius: radius.md,
                    textAlign: 'left',
                    background: twistPrediction === opt.id ? `${colors.warning}15` : colors.bgSecondary,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    zIndex: 10,
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.borderLight}`,
                    background: twistPrediction === opt.id ? colors.warning : 'transparent',
                  }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                    <p style={{ fontSize: '12px', color: colors.textTertiary }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test It')}
      </div>
    );
  }

  // TWIST_PLAY
  if (phase === 'twist_play') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.md : space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 5 • Explore', 'Adjust Spin Speed', 'See how precession rate changes with different spin speeds.')}
            {renderGyroscope(true)}

            <div style={{
              marginTop: space.md,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.sm,
            }}>
              <div style={{
                padding: space.md,
                borderRadius: radius.md,
                background: `${colors.success}15`,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '11px', color: colors.textTertiary, marginBottom: '4px' }}>HIGH SPIN</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: colors.success }}>Slow Precession</p>
              </div>
              <div style={{
                padding: space.md,
                borderRadius: radius.md,
                background: `${colors.danger}15`,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '11px', color: colors.textTertiary, marginBottom: '4px' }}>LOW SPIN</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: colors.danger }}>Fast Precession</p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, experimentCount >= 1, 'Deep Insight')}
      </div>
    );
  }

  // TWIST_REVIEW
  if (phase === 'twist_review') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.lg : space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 6 • Deep Insight', 'Angular Momentum as Stability', 'Why spinning objects resist change.')}

            <div style={{
              padding: space.lg,
              borderRadius: radius.lg,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              marginBottom: space.lg,
            }}>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7 }}>
                A spinning object has <strong style={{ color: colors.primary }}>angular momentum</strong> along its spin axis. This creates "directional memory"—the object resists having its axis tilted.
              </p>
            </div>

            {renderInfoCard('🎪', 'Spinning Tops', 'A fast top stays upright because its L resists gravity\'s torque. As it slows, precession speeds up until it falls.')}
            {renderInfoCard('🌍', 'Earth\'s Axis', 'Earth\'s spin resists changes. Yet Sun and Moon\'s gravity slowly causes 26,000-year precession!')}
            {renderInfoCard('🛸', 'Spacecraft', 'Reaction wheels and CMGs use precession physics for fuel-free orientation control.')}
          </div>
        </div>
        {renderBottomBar(true, true, 'Real World Apps')}
      </div>
    );
  }

  // TRANSFER
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const isLastApp = selectedApp === realWorldApps.length - 1;

    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          padding: `${space.md} ${space.lg}`,
          background: colors.bgSecondary,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: '13px', color: colors.textSecondary }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {realWorldApps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: idx <= selectedApp ? colors.primary : colors.bgTertiary,
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Tabs - only allow clicking on viewed tabs */}
        <div style={{
          padding: `${space.sm} ${space.md}`,
          background: colors.bgSecondary,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', gap: space.xs }}>
            {realWorldApps.map((a, i) => {
              const isViewed = i <= selectedApp;
              const isCurrent = i === selectedApp;
              return (
                <button
                  key={i}
                  onClick={() => isViewed && setSelectedApp(i)}
                  style={{
                    flex: 1,
                    padding: `${space.sm} ${space.xs}`,
                    borderRadius: radius.sm,
                    border: 'none',
                    background: isCurrent ? `${a.color}20` : 'transparent',
                    borderBottom: isCurrent ? `3px solid ${a.color}` : '3px solid transparent',
                    cursor: isViewed ? 'pointer' : 'not-allowed',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    transition: 'all 0.2s ease',
                    opacity: isViewed ? 1 : 0.5,
                    zIndex: 10,
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{a.icon}</span>
                  <span style={{ fontSize: '9px', fontWeight: 600, color: isCurrent ? colors.textPrimary : isViewed ? colors.textSecondary : colors.textTertiary }}>{a.title.split(' ')[0]}</span>
                  {isViewed && i < selectedApp && <span style={{ fontSize: '10px', color: colors.success }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md, marginBottom: space.lg }}>
              <div style={{
                width: '56px', height: '56px',
                borderRadius: radius.md,
                background: `${app.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
              }}>{app.icon}</div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: colors.textPrimary }}>{app.title}</h2>
                <p style={{ fontSize: '13px', color: app.color, fontWeight: 600 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: space.md }}>{app.description}</p>

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: `${app.color}10`,
              border: `1px solid ${app.color}30`,
              marginBottom: space.md,
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: app.color, marginBottom: '6px' }}>🔗 Physics Connection</p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>{app.connection}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space.sm, marginBottom: space.md }}>
              {app.stats.map((s, i) => (
                <div key={i} style={{
                  padding: space.sm,
                  borderRadius: radius.sm,
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: '16px' }}>{s.icon}</span>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: app.color }}>{s.value}</p>
                  <p style={{ fontSize: '10px', color: colors.textTertiary }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: colors.bgSecondary,
              marginBottom: space.md,
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary, marginBottom: space.sm }}>Real Examples:</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* Bottom bar: Next Application or Take Quiz */}
        <div style={{
          padding: `${space.md} ${space.lg}`,
          background: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {selectedApp > 0 ? (
            <button
              onClick={() => setSelectedApp(selectedApp - 1)}
              style={{
                padding: `${space.md} ${space.lg}`,
                fontSize: '14px',
                color: colors.textSecondary,
                background: colors.bgTertiary,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              ← Previous
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={() => {
              if (isLastApp) {
                goToPhase('test');
              } else {
                setSelectedApp(selectedApp + 1);
              }
            }}
            style={{
              padding: `${space.md} ${space.xl}`,
              fontSize: '15px',
              fontWeight: 700,
              color: colors.textPrimary,
              background: isLastApp ? colors.success : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              zIndex: 10,
            }}
          >
            {isLastApp ? 'Take the Quiz →' : 'Next Application →'}
          </button>
        </div>
      </div>
    );
  }

  // TEST
  if (phase === 'test') {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return renderPremiumWrapper(
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
            <div style={{ textAlign: 'center', maxWidth: '380px' }}>
              <div style={{ fontSize: '64px', marginBottom: space.lg }}>{passed ? '🎉' : '📚'}</div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: colors.textPrimary, marginBottom: space.sm }}>
                {passed ? 'Excellent Work!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '42px', fontWeight: 800, color: passed ? colors.success : colors.warning, marginBottom: space.md }}>
                {totalCorrect}/10
              </p>
              <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: space.xl }}>
                {passed ? 'You\'ve mastered gyroscopic precession!' : 'Review the concepts and try again.'}
              </p>
              <button
                onClick={() => passed ? goNext() : goToPhase('review')}
                style={{
                  padding: `${space.md} ${space.xl}`,
                  borderRadius: radius.md,
                  fontSize: '15px', fontWeight: 700,
                  background: passed
                    ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`
                    : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  color: colors.textPrimary,
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                {passed ? 'Complete! →' : 'Review Material'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? space.md : space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>QUESTION {testIndex + 1}/10</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((tq, i) => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '4px',
                    background: testAnswers[i] !== null
                      ? (tq.options[testAnswers[i] as number]?.correct ? colors.success : colors.danger)
                      : (i === testIndex ? colors.primary : colors.bgTertiary),
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              marginBottom: space.md,
            }}>
              <p style={{ fontSize: '13px', color: colors.textSecondary, fontStyle: 'italic' }}>{q.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: colors.textPrimary, marginBottom: space.lg, lineHeight: 1.4 }}>{q.question}</h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm, marginBottom: space.lg }}>
              {q.options.map((opt, i) => {
                const selected = testAnswers[testIndex] === i;
                const correct = opt.correct;
                const answered = testAnswers[testIndex] !== null;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (testAnswers[testIndex] === null) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testIndex] = i;
                        setTestAnswers(newAnswers);
                        emitGameEvent(opt.correct ? 'correct_answer' : 'incorrect_answer', { questionIndex: testIndex });
                      }
                    }}
                    style={{
                      padding: `${space.md} ${space.lg}`,
                      borderRadius: radius.md,
                      textAlign: 'left',
                      background: answered
                        ? (correct ? `${colors.success}15` : selected ? `${colors.danger}15` : colors.bgSecondary)
                        : (selected ? `${colors.primary}15` : colors.bgSecondary),
                      border: `2px solid ${answered
                        ? (correct ? colors.success : selected ? colors.danger : colors.border)
                        : (selected ? colors.primary : colors.border)}`,
                      cursor: answered ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      zIndex: 10,
                    }}
                  >
                    <span style={{
                      fontWeight: 600, marginRight: space.sm,
                      color: answered ? (correct ? colors.success : selected ? colors.danger : colors.textTertiary) : colors.primary,
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ fontSize: '14px', color: colors.textPrimary }}>{opt.text}</span>
                    {answered && correct && <span style={{ marginLeft: space.sm, color: colors.success }}>✓</span>}
                    {answered && selected && !correct && <span style={{ marginLeft: space.sm, color: colors.danger }}>✗</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {testAnswers[testIndex] !== null && (
              <div style={{
                padding: space.md,
                borderRadius: radius.md,
                background: `${colors.accent}15`,
                border: `1px solid ${colors.accent}40`,
                marginBottom: space.lg,
              }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: colors.accent, marginBottom: '6px' }}>💡 Explanation</p>
                <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>{q.explanation}</p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: space.md, justifyContent: 'space-between' }}>
              <button
                onClick={() => setTestIndex(Math.max(0, testIndex - 1))}
                disabled={testIndex === 0}
                style={{
                  padding: `${space.sm} ${space.lg}`,
                  borderRadius: radius.md,
                  background: colors.bgTertiary,
                  color: colors.textSecondary,
                  border: 'none',
                  cursor: testIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: testIndex === 0 ? 0.4 : 1,
                  zIndex: 10,
                }}
              >← Prev</button>
              {testIndex < 9 ? (
                <button
                  onClick={() => setTestIndex(testIndex + 1)}
                  disabled={testAnswers[testIndex] === null}
                  style={{
                    padding: `${space.sm} ${space.lg}`,
                    borderRadius: radius.md,
                    background: testAnswers[testIndex] !== null
                      ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
                      : colors.bgTertiary,
                    color: colors.textPrimary,
                    border: 'none',
                    cursor: testAnswers[testIndex] === null ? 'not-allowed' : 'pointer',
                    opacity: testAnswers[testIndex] === null ? 0.4 : 1,
                    zIndex: 10,
                  }}
                >Next →</button>
              ) : (
                <button
                  onClick={() => { setTestSubmitted(true); emitGameEvent('game_completed', { score: totalCorrect }); }}
                  disabled={testAnswers.includes(null)}
                  style={{
                    padding: `${space.sm} ${space.lg}`,
                    borderRadius: radius.md,
                    background: !testAnswers.includes(null)
                      ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`
                      : colors.bgTertiary,
                    color: colors.textPrimary,
                    border: 'none',
                    cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                    opacity: testAnswers.includes(null) ? 0.4 : 1,
                    zIndex: 10,
                  }}
                >Submit Quiz</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY
  if (phase === 'mastery') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <div style={{ textAlign: 'center', maxWidth: '460px' }}>
            <div style={{ fontSize: '72px', marginBottom: space.lg }}>🏆</div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: colors.textPrimary, marginBottom: space.md }}>Mastery Achieved!</h1>
            <p style={{ fontSize: '15px', color: colors.textSecondary, marginBottom: space.xl, lineHeight: 1.7 }}>
              You now understand gyroscopic precession—the physics behind helicopters, spacecraft, motorcycles, and Earth's wobble!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center', marginBottom: space.xl }}>
              {['Ω = τ/L', 'L = Iω', '90° Precession', 'Angular Momentum'].map((c, i) => (
                <span key={i} style={{
                  padding: `${space.sm} ${space.md}`,
                  borderRadius: radius.full,
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  fontSize: '13px', fontWeight: 600, color: colors.primary,
                }}>{c}</span>
              ))}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: `${space.md} ${space.xl}`,
                borderRadius: radius.md,
                fontSize: '15px', fontWeight: 700,
                background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: colors.textPrimary,
                border: 'none',
                cursor: 'pointer',
                boxShadow: shadows.glow(colors.success),
                zIndex: 10,
              }}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GyroscopicPrecessionRenderer;
