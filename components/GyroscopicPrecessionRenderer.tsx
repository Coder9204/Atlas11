import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
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

// --- PREMIUM DESIGN SYSTEM ---
const colors = {
  primary: '#f97316',
  primaryLight: '#fb923c',
  primaryDark: '#ea580c',
  accent: '#8b5cf6',
  accentLight: '#a78bfa',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  danger: '#ef4444',
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a24',
  bgElevated: '#22222e',
  border: '#2a2a36',
  borderLight: '#3a3a48',
  borderFocus: '#f97316',
  textPrimary: '#fafafa',
  textSecondary: '#e2e8f0',
  textTertiary: '#cbd5e1',
  textInverse: '#0a0a0f',
  muted: 'rgba(148,163,184,0.7)',
};

const space = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' };
const radius = { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' };
const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 4px 12px rgba(0,0,0,0.4)',
  lg: '0 8px 24px rgba(0,0,0,0.5)',
  glow: (color: string) => `0 0 40px ${color}40`,
};

// --- PHASES ---
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Play',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

// Slider style constant for all sliders
const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
  accentColor: '#3b82f6',
};

// --- MAIN COMPONENT ---
const GyroscopicPrecessionRenderer: React.FC<GyroscopicPrecessionRendererProps> = ({ onGameEvent, gamePhase }) => {
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });
  const { isMobile } = useViewport();
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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
      scenario: "You're holding a spinning bike wheel by its axle, and you try to tilt it downward. The wheel is spinning at high speed with significant angular momentum stored in its rotating mass.",
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
      scenario: "A toy gyroscope is spinning fast on a tabletop. You push down on one end of its axle with your finger, applying a steady downward force that creates a torque about the support point.",
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
      scenario: "Wheel A spins at 10 rad/s, Wheel B at 5 rad/s. Both have identical mass and radius, giving them the same moment of inertia. You apply the same torque to both wheels simultaneously.",
      question: "Which wheel precesses faster?",
      options: [
        { text: "Wheel A (faster spin)", correct: false },
        { text: "Wheel B (slower spin)", correct: true },
        { text: "Both same rate", correct: false },
        { text: "Neither will precess", correct: false }
      ],
      explanation: "Precession rate \u03A9 = \u03C4/L. With same torque, the slower wheel has less angular momentum, so it precesses FASTER."
    },
    {
      scenario: "A spinning top on a smooth surface starts to wobble as it gradually loses speed due to friction at the contact point. The wobble amplitude keeps growing as the rotational energy decreases.",
      question: "Why does the wobbling get worse as it slows?",
      options: [
        { text: "The top becomes heavier", correct: false },
        { text: "Lower L means gravity causes faster precession", correct: true },
        { text: "Air becomes thicker", correct: false },
        { text: "It's running out of energy", correct: false }
      ],
      explanation: "As spin decreases, angular momentum L decreases. Since \u03A9 = \u03C4/L, lower L means faster precession and larger wobble."
    },
    {
      scenario: "A helicopter's main rotor spins counterclockwise viewed from above, generating enormous angular momentum. Without any compensation mechanism, Newton's third law would cause the fuselage to spin.",
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
      scenario: "Spacecraft like the Hubble Space Telescope and the International Space Station use spinning reaction wheels mounted on perpendicular axes to orient themselves precisely in the vacuum of space.",
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
      scenario: "A figure skater spinning at high speed on the ice tilts their head to one side. Their body acts as a massive gyroscope with significant angular momentum along the vertical axis.",
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
      scenario: "A motorcycle rider is leaning into a sharp turn at 120 km/h. The front and rear wheels spin rapidly, creating gyroscopic angular momentum that significantly affects the bike's handling dynamics.",
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
      scenario: "Earth's axis slowly traces a circle in space over 26,000 years. This astronomical precession was first noted by the ancient Greek astronomer Hipparchus around 130 BC when comparing star positions.",
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
      scenario: "An engineer designs a ship stabilizer using a massive spinning flywheel weighing over 10 tonnes, mounted on gimbals in the hull. When ocean waves roll the ship, the flywheel's angular momentum resists the motion.",
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
      icon: '\uD83D\uDE81', title: 'Helicopter Dynamics', tagline: 'Tail Rotor & Gyroscopic Effects',
      description: "Helicopter rotors are massive spinning disks with significant angular momentum. The tail rotor counteracts torque, and gyroscopic effects influence maneuverability. Engineers at Boeing, Sikorsky, and Airbus Helicopters carefully model precession to ensure stable flight control systems.",
      connection: "Just like a spinning wheel resists tilting, the helicopter's rotor resists orientation changes. Pilots must account for 90\u00B0 phase lag in their inputs.",
      howItWorks: "The main rotor creates angular momentum. When tilting, gyroscopic precession causes response 90\u00B0 ahead of input\u2014pilots learn to compensate.",
      stats: [{ value: '1000 kg', label: 'Rotor mass', icon: '\uD83D\uDD04' }, { value: '90%', label: 'Phase lag', icon: '\uD83D\uDCD0' }, { value: '3 m', label: 'Rotor radius', icon: '\uD83C\uDFAF' }],
      examples: ['Tail rotor prevents body rotation', 'Cyclic inputs account for precession', 'Autorotation uses stored momentum', 'Blade flapping compensates'],
      color: colors.primary
    },
    {
      icon: '\uD83D\uDEF0\uFE0F', title: 'Spacecraft Control', tagline: 'Reaction Wheels & CMGs',
      description: "NASA and ESA satellites use spinning reaction wheels and control moment gyroscopes (CMGs) to orient precisely in space\u2014without fuel. The Hubble Space Telescope, International Space Station, and Mars rovers all depend on this technology for precise pointing.",
      connection: "When a reaction wheel speeds up, the spacecraft rotates opposite (conservation). CMGs use precession for large torques.",
      howItWorks: "Three wheels on perpendicular axes control all rotations. CMGs tilt spinning wheels to create precession torques larger than motors could directly.",
      stats: [{ value: '4+', label: 'Wheels on ISS', icon: '\uD83D\uDD35' }, { value: '0', label: 'Fuel used', icon: '\u26FD' }, { value: '0.001\u00B0', label: 'Accuracy', icon: '\uD83C\uDFAF' }],
      examples: ['Hubble precision pointing', 'ISS uses CMGs', 'Mars rovers orient antennas', 'GPS satellites stay Earth-facing'],
      color: colors.accent
    },
    {
      icon: '\uD83C\uDFCD\uFE0F', title: 'Motorcycle Dynamics', tagline: 'Countersteering & Stability',
      description: "Motorcycle wheels act as gyroscopes, providing inherent stability at speed. Countersteering is necessary because of gyroscopic precession. Manufacturers like Ducati, BMW, and Honda engineer suspension geometry to work with gyroscopic forces.",
      connection: "The spinning front wheel resists tilting. To lean for turning, riders briefly steer AWAY\u2014using precession to tip the bike.",
      howItWorks: "At speed, steering right causes the wheel to precess and lean LEFT. This is why motorcycles are steered by 'pushing' the handlebar.",
      stats: [{ value: '20+', label: 'mph for effect', icon: '\uD83D\uDCA8' }, { value: '2\u00D7', label: 'Stability boost', icon: '\uD83D\uDCCA' }, { value: '~1s', label: 'Response time', icon: '\u23F1\uFE0F' }],
      examples: ['Countersteering all turns', 'Hands-free stability', 'Weave damping', 'Racing lean angles 60\u00B0'],
      color: colors.success
    },
    {
      icon: '\uD83C\uDF0D', title: "Earth's Precession", tagline: '26,000 Year Wobble',
      description: "Earth's axis precesses like a slow-motion top, tracing a circle in space over 26,000 years, changing which star is the North Star. This phenomenon was discovered by Hipparchus around 130 BC and is now understood through Newtonian mechanics and measured by observatories worldwide.",
      connection: "Earth's equatorial bulge experiences gravitational torque from Sun and Moon. Combined with spin, this causes slow precession.",
      howItWorks: "Earth bulges at the equator. Sun and Moon pull more on the closer bulge, creating torque that causes 26,000-year precession.",
      stats: [{ value: '26,000', label: 'Years per cycle', icon: '\uD83D\uDD04' }, { value: '23.4\u00B0', label: 'Axial tilt', icon: '\uD83D\uDCD0' }, { value: '50"', label: 'Arc-sec/year', icon: '\u2B50' }],
      examples: ["Polaris wasn't always North Star", "Vega will be in ~12,000 years", "Milankovitch climate cycles", "Ancient alignments shift"],
      color: colors.warning
    }
  ];

  // ===================== RENDER FUNCTIONS =====================

  // Premium wrapper for all phases
  const renderPremiumWrapper = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: theme.fontFamily,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Premium background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)',
        pointerEvents: 'none',
      }} />

      {/* Navigation bar - fixed position at top */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${space.sm} ${space.lg}`,
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Gyroscopic Precession</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={phaseLabels[p]}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: phase === p
                    ? colors.primary
                    : phaseOrder.indexOf(phase) > idx
                      ? colors.success
                      : colors.bgTertiary,
                  boxShadow: phase === p ? `0 0 8px ${colors.primary}60` : 'none',
                  zIndex: 10,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content with scroll */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '60px',
        paddingBottom: '16px',
        position: 'relative',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: space.xl }}>
          {content}
        </div>
      </div>
    </div>
  );

  // Bottom navigation
  const renderBottomBar = (canBack: boolean, canNext: boolean, label: string) => {
    const idx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: space.lg,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        marginTop: space.lg,
      }}>
        <button
          onClick={() => canBack && idx > 0 && goBack()}
          style={{
            padding: `${space.md} ${space.lg}`,
            minHeight: '44px',
            borderRadius: radius.md,
            fontSize: '14px', fontWeight: 600,
            background: colors.bgTertiary,
            color: '#e2e8f0',
            border: 'none',
            cursor: canBack && idx > 0 ? 'pointer' : 'not-allowed',
            opacity: canBack && idx > 0 ? 1 : 0.4,
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          \u2190 Back
        </button>
        <button
          onClick={() => canNext && goNext()}
          style={{
            padding: `${space.md} ${space.xl}`,
            minHeight: '44px',
            borderRadius: radius.md,
            fontSize: '14px', fontWeight: 700,
            background: canNext
              ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
              : colors.bgTertiary,
            color: canNext ? colors.textPrimary : '#71717a',
            border: 'none',
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.4,
            boxShadow: canNext ? shadows.glow(colors.primary) : 'none',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          {label} \u2192
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
        fontSize: '26px', fontWeight: 800,
        color: colors.textPrimary,
        lineHeight: 1.2, marginBottom: subtitle ? space.sm : 0,
      }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary, lineHeight: 1.6 }}>{subtitle}</p>
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
        <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );

  // Chart SVG for precession rate vs spin speed - data-driven visualization
  const renderPrecessionChart = () => {
    const chartW = 340;
    const chartH = 200;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    // Generate curve: precession rate = tau / (I * omega) = 0.5 / (0.1 * omega) = 5/omega
    const points: { x: number; y: number }[] = [];
    const minOmega = 1;
    const maxOmega = 10;
    const maxPrecession = 5 / minOmega; // 5
    for (let i = 0; i <= 40; i++) {
      const omega = minOmega + (maxOmega - minOmega) * (i / 40);
      const prec = 5 / omega;
      const px = padL + (omega - minOmega) / (maxOmega - minOmega) * plotW;
      const py = padT + (1 - prec / maxPrecession) * plotH;
      points.push({ x: px, y: py });
    }

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Current point position
    const curOmega = spinSpeed;
    const curPrec = 5 / curOmega;
    const curX = padL + (curOmega - minOmega) / (maxOmega - minOmega) * plotW;
    const curY = padT + (1 - curPrec / maxPrecession) * plotH;

    // Reference point at omega = 5
    const refOmega = 5;
    const refPrec = 5 / refOmega;
    const refX = padL + (refOmega - minOmega) / (maxOmega - minOmega) * plotW;
    const refY = padT + (1 - refPrec / maxPrecession) * plotH;

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Gyroscopic Precession visualization">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="chartCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="chartFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={chartW} height={chartH} rx="8" fill="#0f172a" />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={`hg${i}`} x1={padL} y1={padT + f * plotH} x2={padL + plotW} y2={padT + f * plotH}
            stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={`vg${i}`} x1={padL + f * plotW} y1={padT} x2={padL + f * plotW} y2={padT + plotH}
            stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#94a3b8" strokeWidth="1.5" />

        {/* Fill area under curve */}
        <path d={`${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padT + plotH} L ${points[0].x.toFixed(1)} ${padT + plotH} Z`}
          fill="url(#chartFillGrad)" />

        {/* Main curve with L commands */}
        <path d={pathD} fill="none" stroke="url(#chartCurveGrad)" strokeWidth="3" strokeLinecap="round" />

        {/* Reference dashed line at omega=5 */}
        <line x1={refX} y1={padT} x2={refX} y2={padT + plotH} stroke="#64748b" strokeDasharray="4 4" opacity="0.5" />
        <circle cx={refX} cy={refY} r="4" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />

        {/* Current value indicator lines */}
        <line x1={curX} y1={curY} x2={curX} y2={padT + plotH} stroke={colors.primary} strokeDasharray="3 3" opacity="0.6" />
        <line x1={padL} y1={curY} x2={curX} y2={curY} stroke={colors.primary} strokeDasharray="3 3" opacity="0.6" />

        {/* Interactive point - current value */}
        <circle cx={curX} cy={curY} r={8} fill={colors.primary} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

        {/* Axis labels */}
        <text x={padL + plotW / 2} y={chartH - 5} fill="#e2e8f0" fontSize="12" fontWeight="600" textAnchor="middle">
          Spin Speed \u03C9 (rad/s)
        </text>
        <text x="14" y={padT + plotH / 2} fill="#e2e8f0" fontSize="12" fontWeight="600" textAnchor="middle"
          transform={`rotate(-90, 14, ${padT + plotH / 2})`}>
          Precession \u03A9
        </text>

        {/* Tick labels */}
        <text x={padL} y={padT + plotH + 16} fill="#cbd5e1" fontSize="11" textAnchor="middle">1</text>
        <text x={padL + plotW} y={padT + plotH + 16} fill="#cbd5e1" fontSize="11" textAnchor="middle">10</text>
        <text x={padL - 8} y={padT + 20} fill="#cbd5e1" fontSize="11" textAnchor="end">5.0</text>
        <text x={padL - 8} y={padT + plotH + 4} fill="#cbd5e1" fontSize="11" textAnchor="end">0</text>

        {/* Current value readout */}
        <text x={curX} y={curY - 14} fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">
          \u03A9 = {curPrec.toFixed(2)}
        </text>

        {/* Reference label */}
        <text x={refX + 4} y={padT + 14} fill="#cbd5e1" fontSize="11" textAnchor="start">reference</text>

        {/* Title */}
        <text x={padL + plotW / 2} y={14} fill="#fafafa" fontSize="13" fontWeight="700" textAnchor="middle">
          Precession Rate vs Spin Speed (\u03A9 = \u03C4 \u00F7 (I \u00D7 \u03C9))
        </text>
      </svg>
    );
  };

  // Gyroscope visualization with premium SVG graphics
  const renderGyroscope = (interactive: boolean = false) => {
    const precX = Math.sin(precessionAngle * Math.PI / 180) * 25;
    const precY = Math.cos(precessionAngle * Math.PI / 180) * 8;
    // Derive visual parameters from spinSpeed for slider responsiveness
    const wheelRadius = 30 + spinSpeed * 2.5; // 32.5-55
    const spokeCount = Math.round(4 + spinSpeed); // 5-14

    return (
      <div style={{
        background: `linear-gradient(180deg, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 100%)`,
        borderRadius: radius.lg,
        padding: space.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <svg viewBox="0 0 400 300" style={{ width: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="gyroDiscGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <radialGradient id="gyroDiscRadial" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.6" />
            </radialGradient>
            <linearGradient id="gyroAxisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="15%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="85%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="gyroSpinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="gyroLVectorGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="30%" stopColor="#a78bfa" />
              <stop offset="60%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="gyroTorqueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="gyroPrecessionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>
            <radialGradient id="gyroHandGrad" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="40%" stopColor="#78716c" />
              <stop offset="70%" stopColor="#57534e" />
              <stop offset="100%" stopColor="#44403c" />
            </radialGradient>
            <radialGradient id="gyroHubGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>
            <linearGradient id="gyroSpokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id="gyroDiscGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="gyroVectorGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="gyroTorqueGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="gyroPrecessionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="gyroMotionBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
            <linearGradient id="gyroLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <pattern id="gyroGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Premium dark lab background */}
          <rect width="400" height="300" fill="url(#gyroLabBg)" />
          <rect width="400" height="300" fill="url(#gyroGridPattern)" opacity="0.3" />

          {/* Precession path visualization */}
          {isSpinning && (
            <g transform="translate(200, 150)">
              <ellipse
                cx="70" cy="0" rx="30" ry="10"
                fill="none"
                stroke="url(#gyroPrecessionGrad)"
                strokeWidth="2"
                strokeDasharray="8 4"
                filter="url(#gyroPrecessionGlow)"
                opacity="0.6"
              >
                <animate attributeName="stroke-dashoffset" values="0;-24" dur="2s" repeatCount="indefinite" />
              </ellipse>
            </g>
          )}

          {/* Hand with premium gradient */}
          <g transform={`translate(${110 + precX}, ${150 + precY})`}>
            <ellipse cx="0" cy="0" rx="22" ry="32" fill="url(#gyroHandGrad)" stroke="#a8a29e" strokeWidth="1.5" />
            <ellipse cx="-7" cy="-14" rx="7" ry="11" fill="url(#gyroHandGrad)" />
            <ellipse cx="7" cy="-16" rx="7" ry="11" fill="url(#gyroHandGrad)" />
            <ellipse cx="-7" cy="-16" rx="3" ry="5" fill="#a8a29e" opacity="0.3" />
            <ellipse cx="7" cy="-18" rx="3" ry="5" fill="#a8a29e" opacity="0.3" />
          </g>

          {/* Axle with metallic gradient */}
          <line
            x1={130 + precX} y1={150 + precY}
            x2={270 + precX} y2={150 + precY}
            stroke="url(#gyroAxisGrad)" strokeWidth="8" strokeLinecap="round"
          />
          <line
            x1={135 + precX} y1={148 + precY}
            x2={265 + precX} y2={148 + precY}
            stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" opacity="0.4"
          />

          {/* Wheel - radius driven by spinSpeed */}
          <g transform={`translate(${270 + precX}, ${150 + precY}) rotate(${wheelAngle})`} filter={isSpinning ? "url(#gyroDiscGlow)" : ""}>
            <circle cx="0" cy="0" r={wheelRadius} fill="none" stroke="url(#gyroDiscGrad)" strokeWidth="12" />
            <circle cx="0" cy="0" r={wheelRadius} fill="none" stroke="#fcd34d" strokeWidth="2" opacity="0.4" />
            <circle cx="0" cy="0" r={wheelRadius + 6} fill="none" stroke="#92400e" strokeWidth="1" opacity="0.3" />

            {/* Spokes - count driven by spinSpeed */}
            {Array.from({ length: spokeCount }, (_, i) => {
              const a = (360 / spokeCount) * i;
              return (
                <line
                  key={i}
                  x1="0" y1="0"
                  x2={Math.cos(a * Math.PI / 180) * (wheelRadius - 10)}
                  y2={Math.sin(a * Math.PI / 180) * (wheelRadius - 10)}
                  stroke="url(#gyroSpokeGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Center hub */}
            <circle cx="0" cy="0" r="12" fill="url(#gyroHubGrad)" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="-3" cy="-3" r="4" fill="#cbd5e1" opacity="0.4" />

            {/* Motion blur ring when spinning */}
            {isSpinning && (
              <circle cx="0" cy="0" r={wheelRadius} fill="none" stroke="url(#gyroSpinGrad)" strokeWidth="14" opacity="0.5" filter="url(#gyroMotionBlur)" />
            )}
          </g>

          {/* Angular momentum (L) vector - height driven by spinSpeed */}
          <g transform={`translate(${270 + precX}, ${150 + precY})`} filter="url(#gyroVectorGlow)">
            <line x1="0" y1="0" x2="0" y2={-spinSpeed * 10} stroke="url(#gyroLVectorGrad)" strokeWidth="4" strokeLinecap="round" />
            <polygon points={`-6,${-spinSpeed * 10 + 2} 6,${-spinSpeed * 10 + 2} 0,${-spinSpeed * 10 - 12}`} fill="url(#gyroLVectorGrad)" />
            <circle cx="0" cy={-spinSpeed * 10 - 5} r="6" fill="#a78bfa" opacity="0.3" />
          </g>

          {/* Torque arrow */}
          {isSpinning && (
            <g transform={`translate(${270 + precX}, ${200 + precY})`} filter="url(#gyroTorqueGlow)">
              <line x1="0" y1="0" x2="0" y2="35" stroke="url(#gyroTorqueGrad)" strokeWidth="4" strokeDasharray="6 3" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" values="0;-18" dur="0.5s" repeatCount="indefinite" />
              </line>
              <polygon points="-6,33 6,33 0,46" fill="url(#gyroTorqueGrad)" />
              <circle cx="0" cy="40" r="5" fill="#f87171" opacity="0.4" />
            </g>
          )}

          {/* Precession indicator */}
          {isSpinning && (
            <g transform="translate(200, 55)" filter="url(#gyroPrecessionGlow)">
              <path d="M-30,0 A30,10 0 0 1 30,0" fill="none" stroke="url(#gyroPrecessionGrad)" strokeWidth="3" strokeDasharray="6 3">
                <animate attributeName="stroke-dashoffset" values="0;-18" dur="1s" repeatCount="indefinite" />
              </path>
              <polygon points="28,-5 36,0 28,5" fill="#34d399" />
            </g>
          )}

          {/* Info box */}
          <g transform="translate(15, 230)">
            <rect width="170" height="60" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="12" y="20" fill="#e2e8f0" fontSize="12" fontWeight="600">
              \u03C9 = {spinSpeed.toFixed(1)} rad/s
            </text>
            <text x="12" y="36" fill="#a78bfa" fontSize="12" fontWeight="600">
              L = {angularMomentum.toFixed(2)} kg\u00B7m\u00B2/s
            </text>
            <text x="12" y="52" fill="#34d399" fontSize="12" fontWeight="600">
              \u03A9 = {precessionRate.toFixed(2)} rad/s
            </text>
          </g>

          {/* SVG Labels */}
          <text x="280" y="25" fill="#a78bfa" fontSize="12" fontWeight="600">L = Angular Momentum</text>
          <text x="280" y="275" fill="#ef4444" fontSize="12" fontWeight="600">\u03C4 = Torque (Gravity)</text>
          <text x="120" y="75" fill="#34d399" fontSize="12" fontWeight="600">Precession Path</text>
          <text x="240" y="195" fill="#fbbf24" fontSize="11" fontWeight="600">Spinning Wheel</text>
        </svg>

        {/* Labels outside SVG */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: space.sm,
          padding: `0 ${space.sm}`,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary }}>
              Spin: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{spinSpeed.toFixed(1)} rad/s</span>
            </span>
            <span style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary }}>
              L = <span style={{ color: colors.accent, fontWeight: 600 }}>{angularMomentum.toFixed(2)} kg\u00B7m\u00B2/s</span>
            </span>
            <span style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary }}>
              Precession: <span style={{ color: colors.success, fontWeight: 600 }}>\u03A9 = {precessionRate.toFixed(2)} rad/s</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: colors.textSecondary }}>L = Angular Momentum</span>
            <span style={{ fontSize: '12px', color: colors.textSecondary }}>\u03C4 = Torque (Push)</span>
            <span style={{ fontSize: '12px', color: colors.textSecondary }}>Precession Direction</span>
          </div>
        </div>

        {/* Formula Display */}
        <div style={{
          marginTop: space.sm,
          padding: space.md,
          background: colors.bgTertiary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, marginBottom: '4px' }}>Precession Equation</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>Ω = τ / L = τ / (I × ω)</p>
        </div>

        {interactive && (
          <div style={{ marginTop: space.md }}>
            {/* Precession chart that responds to slider */}
            <div style={{ marginBottom: space.md }}>
              {renderPrecessionChart()}
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: space.sm,
              padding: space.md,
              background: colors.bgTertiary,
              borderRadius: radius.md,
              marginBottom: space.md,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: colors.textSecondary }}>Spin Speed</span>
                <span style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 700 }}>{spinSpeed.toFixed(1)} rad/s</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
                <span style={{ fontSize: '12px', color: colors.textSecondary, minWidth: '28px' }}>1</span>
                <input
                  type="range" min="1" max="10" step="0.5" value={spinSpeed}
                  aria-label="Spin Speed"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSpinSpeed(val);
                    emitGameEvent('slider_changed', { spinSpeed: val });
                  }}
                  onInput={(e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    setSpinSpeed(val);
                  }}
                  style={sliderStyle}
                />
                <span style={{ fontSize: '12px', color: colors.textSecondary, minWidth: '28px', textAlign: 'right' }}>10</span>
              </div>
            </div>

            <button
              onClick={() => { setIsSpinning(!isSpinning); setExperimentCount(c => c + 1); }}
              style={{
                width: '100%',
                padding: space.md,
                borderRadius: radius.md,
                fontSize: '16px', fontWeight: 700,
                background: isSpinning ? colors.bgTertiary : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: colors.textPrimary,
                border: 'none',
                cursor: 'pointer',
                boxShadow: isSpinning ? 'none' : shadows.glow(colors.primary),
                transition: 'all 0.2s ease',
                zIndex: 10,
              }}
            >
              {isSpinning ? 'Stop & Reset' : 'Spin Wheel & Apply Torque'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Static prediction SVG (no sliders)
  const renderPredictionSVG = () => (
    <svg viewBox="0 0 400 250" style={{ width: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="predWheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="predAxisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="predPushGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <radialGradient id="predHubGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <filter id="predGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="predBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#030712" />
          <stop offset="50%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#030712" />
        </linearGradient>
        <pattern id="predGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width="400" height="250" fill="url(#predBg)" />
      <rect width="400" height="250" fill="url(#predGrid)" opacity="0.3" />

      {/* Axle */}
      <line x1="100" y1="120" x2="300" y2="120" stroke="url(#predAxisGrad)" strokeWidth="6" strokeLinecap="round" />

      {/* Spinning wheel */}
      <g transform="translate(200, 120)">
        <circle cx="0" cy="0" r="55" fill="none" stroke="url(#predWheelGrad)" strokeWidth="8" filter="url(#predGlow)" />
        <circle cx="0" cy="0" r="12" fill="url(#predHubGrad)" stroke="#64748b" strokeWidth="1" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
          <line key={i} x1="0" y1="0"
            x2={Math.cos(a * Math.PI / 180) * 45}
            y2={Math.sin(a * Math.PI / 180) * 45}
            stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        ))}
      </g>

      {/* Push arrow */}
      <line x1="300" y1="120" x2="300" y2="200" stroke="url(#predPushGrad)" strokeWidth="5" strokeLinecap="round" />
      <polygon points="292,195 308,195 300,215" fill="url(#predPushGrad)" />

      {/* Question marks for possible directions */}
      <text x="340" y="170" fill="#f87171" fontSize="18" fontWeight="700">?</text>
      <text x="200" y="35" fill="#34d399" fontSize="18" fontWeight="700">?</text>
      <text x="60" y="170" fill="#a78bfa" fontSize="18" fontWeight="700">?</text>

      {/* Labels */}
      <text x="200" y="245" fill="#e2e8f0" fontSize="13" fontWeight="600" textAnchor="middle">
        Which way does the wheel move when pushed down?
      </text>
      <text x="320" y="130" fill="#ef4444" fontSize="12" fontWeight="600">PUSH DOWN</text>
      <text x="200" y="15" fill="#fbbf24" fontSize="12" fontWeight="600" textAnchor="middle">Spinning Wheel</text>
    </svg>
  );

  // ===================== PHASE RENDERS =====================

  // HOOK
  if (phase === 'hook') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, padding: space.xl, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: space.sm,
            padding: `${space.sm} ${space.md}`,
            background: '#fff',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: radius.full,
            marginBottom: space.xl,
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22d3ee' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0a0a0f', letterSpacing: '0.1em' }}>PHYSICS EXPLORATION</span>
          </div>

          <h1 style={{
            fontSize: '36px', fontWeight: 800,
            background: 'linear-gradient(to right, #22d3ee, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: space.lg,
            lineHeight: 1.2,
          }}>
            The Spinning Wheel Mystery
          </h1>

          <div style={{
            maxWidth: '560px', margin: '0 auto',
            padding: space.xl,
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: radius.lg,
            border: '1px solid rgba(51, 65, 85, 0.5)',
          }}>
            <p style={{ fontSize: '16px', fontWeight: 400, color: '#cbd5e1', lineHeight: 1.6 }}>
              Push a spinning bike wheel down... but it moves <strong style={{ color: '#22d3ee' }}>sideways</strong> instead!
              Discover the physics behind this counterintuitive behavior that keeps helicopters stable and spacecraft oriented.
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space.md,
            marginTop: space.xl, maxWidth: '400px', margin: `${space.xl} auto 0`,
          }}>
            {[
              { icon: '\uD83D\uDD04', label: 'Spin & Push' },
              { icon: '\uD83D\uDCD0', label: '90\u00B0 Response' },
              { icon: '\uD83D\uDE81', label: 'Real Uses' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: space.md,
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: radius.md,
                border: '1px solid rgba(51, 65, 85, 0.5)',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: space.sm }}>{item.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {renderBottomBar(false, true, 'Start Discovery')}
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 1 \u2022 Predict', 'Which Way Does It Move?', 'You hold a fast-spinning bike wheel, then push one end DOWN.')}

            {/* Prediction SVG */}
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: space.lg,
            }}>
              {renderPredictionSVG()}
              <p style={{
                fontSize: '13px',
                fontWeight: 400,
                color: colors.textTertiary,
                textAlign: 'center',
                marginTop: space.sm,
                lineHeight: 1.5,
              }}>
                Spinning wheel \u2014 you push one end <span style={{ color: colors.danger, fontWeight: 600 }}>DOWN</span>
              </p>
            </div>

            {/* Options */}
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: space.md }}>
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
                    minHeight: '44px',
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
                    flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: prediction === opt.id ? '#fafafa' : '#e2e8f0' }}>{opt.label}</p>
                    <p style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Next')}
      </div>
    );
  }

  // PLAY
  if (phase === 'play') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 2 \u2022 Experiment', 'Spin the Wheel & Push', 'Watch what happens when you apply torque to a spinning wheel!')}

            <div style={{
              marginBottom: space.md,
              padding: space.md,
              borderRadius: radius.md,
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}40`,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: colors.accent, marginBottom: '4px' }}>What to observe:</p>
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#e2e8f0', lineHeight: 1.5 }}>
                Adjust the spin speed slider and click "Spin Wheel & Apply Torque". When spin speed increases, the precession rate decreases — higher spin causes slower, steadier precession.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderGyroscope(true)}
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {isSpinning && (
                  <div style={{
                    marginBottom: space.md,
                    padding: space.md,
                    borderRadius: radius.md,
                    background: `${colors.success}15`,
                    border: `1px solid ${colors.success}40`,
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: colors.success, marginBottom: '4px' }}>Watch carefully!</p>
                    <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textSecondary, lineHeight: 1.5 }}>
                      The wheel moves <strong style={{ color: colors.textPrimary }}>sideways</strong>, not down!
                      Compare this with the reference line on the chart to see how spin speed affects precession rate.
                    </p>
                  </div>
                )}

                <div style={{
                  padding: space.md,
                  borderRadius: radius.md,
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, marginBottom: '6px' }}>Why This Matters</p>
                  <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary, lineHeight: 1.6 }}>
                    Gyroscopic precession is fundamental to real-world engineering. Helicopters rely on this principle for stable flight,
                    spacecraft use reaction wheels for fuel-free orientation, and motorcycles depend on gyroscopic effects for stability at speed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, experimentCount >= 1, 'Next')}
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 3 \u2022 Understanding', 'Why 90\u00B0 Sideways?', 'The physics of gyroscopic precession explained.')}

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}40`,
              marginBottom: space.lg,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary, lineHeight: 1.5 }}>
                {prediction === 'sideways'
                  ? <><strong style={{ color: colors.success }}>Your prediction was correct!</strong> You observed that the wheel moves sideways when you push down.</>
                  : <><strong style={{ color: colors.warning }}>As you saw</strong>, the wheel didn't move the way you expected. Your prediction was "{prediction || 'not recorded'}", but the result showed sideways motion!</>}
              </p>
            </div>

            {renderInfoCard('\uD83C\uDFAF', 'Torque Changes L\'s Direction', 'Applied torque doesn\'t speed up the wheel\u2014it changes the DIRECTION of angular momentum. The change is perpendicular to both torque and spin.')}
            {renderInfoCard('\uD83D\uDCD0', 'The Right-Hand Rule', 'Point fingers along \u03C9 (spin), curl toward \u03C4 (push). Your thumb points where L moves\u201490\u00B0 sideways!')}
            {renderInfoCard('\u26A1', 'Precession Rate: \u03A9 = \u03C4/L', 'More spin (bigger L) = SLOWER precession. More torque = faster precession.')}

            <div style={{
              padding: space.lg,
              borderRadius: radius.lg,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
              marginTop: space.lg,
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: colors.textTertiary, marginBottom: space.sm }}>THE PRECESSION EQUATION</p>
              <p style={{ fontSize: '26px', fontWeight: 800, color: colors.primary }}>\u03A9 = \u03C4 / (I \u00D7 \u03C9)</p>
              <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary, marginTop: space.sm, lineHeight: 1.5 }}>Higher spin (\u03C9) \u2192 Lower precession rate (\u03A9)</p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Next')}
      </div>
    );
  }

  // TWIST_PREDICT
  if (phase === 'twist_predict') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 4 \u2022 New Variable', 'What If You Spin Slower?', 'You spin the wheel at HALF the speed, then apply the same push.')}

            {/* Static SVG showing the comparison - NO sliders */}
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: space.lg,
            }}>
              {renderPredictionSVG()}
            </div>

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: `${colors.warning}15`,
              border: `1px solid ${colors.warning}40`,
              marginBottom: space.lg,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary, lineHeight: 1.5 }}>
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
                    minHeight: '44px',
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
                    <p style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Next')}
      </div>
    );
  }

  // TWIST_PLAY
  if (phase === 'twist_play') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 5 \u2022 Explore', 'Adjust Spin Speed', 'See how precession rate changes with different spin speeds.')}
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderGyroscope(true)}
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
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
          </div>
        </div>
        {renderBottomBar(true, experimentCount >= 1, 'Next')}
      </div>
    );
  }

  // TWIST_REVIEW
  if (phase === 'twist_review') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: space.xl }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {renderHeader('Step 6 \u2022 Deep Insight', 'Angular Momentum as Stability', 'Why spinning objects resist change.')}

            <div style={{
              padding: space.lg,
              borderRadius: radius.lg,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              marginBottom: space.lg,
            }}>
              <p style={{ fontSize: '15px', fontWeight: 400, color: colors.textSecondary, lineHeight: 1.7 }}>
                A spinning object has <strong style={{ color: colors.primary }}>angular momentum</strong> along its spin axis. This creates "directional memory"\u2014the object resists having its axis tilted.
              </p>
            </div>

            {renderInfoCard('\uD83C\uDFAA', 'Spinning Tops', 'A fast top stays upright because its L resists gravity\'s torque. As it slows, precession speeds up until it falls.')}
            {renderInfoCard('\uD83C\uDF0D', 'Earth\'s Axis', 'Earth\'s spin resists changes. Yet Sun and Moon\'s gravity slowly causes 26,000-year precession!')}
            {renderInfoCard('\uD83D\uDEF8', 'Spacecraft', 'Reaction wheels and CMGs use precession physics for fuel-free orientation control.')}
          </div>
        </div>
        {renderBottomBar(true, true, 'Next')}
      </div>
    );
  }

  // TRANSFER
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Gyroscopic Precession"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        playSound={playSound}
      />
    );
  }

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
          <span style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary }}>
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

        {/* Tabs */}
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
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isCurrent ? colors.textPrimary : isViewed ? colors.textSecondary : colors.muted }}>{a.title.split(' ')[0]}</span>
                  {isViewed && i < selectedApp && <span style={{ fontSize: '11px', color: colors.success }}>\u2713</span>}
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
                <p style={{ fontSize: '13px', fontWeight: 600, color: app.color }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary, lineHeight: 1.7, marginBottom: space.md }}>{app.description}</p>

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: `${app.color}10`,
              border: `1px solid ${app.color}30`,
              marginBottom: space.md,
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: app.color, marginBottom: '6px' }}>Physics Connection</p>
              <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary, lineHeight: 1.5 }}>{app.connection}</p>
            </div>

            <div style={{
              padding: space.md,
              borderRadius: radius.md,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              marginBottom: space.md,
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary, marginBottom: '6px' }}>How It Works</p>
              <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary, lineHeight: 1.5 }}>{app.howItWorks}</p>
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
                  <p style={{ fontSize: '11px', fontWeight: 400, color: colors.textTertiary }}>{s.label}</p>
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
                  <li key={i} style={{ fontSize: '12px', fontWeight: 400, color: colors.textTertiary, marginBottom: '4px', lineHeight: 1.5 }}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
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
                minHeight: '44px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                background: colors.bgTertiary,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              \u2190 Back
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
              minHeight: '44px',
              fontSize: '15px',
              fontWeight: 700,
              color: colors.textPrimary,
              background: isLastApp ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              zIndex: 10,
            }}
          >
            {isLastApp ? 'Got It' : 'Next Application'}
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
              <div style={{ fontSize: '64px', marginBottom: space.lg }}>{passed ? '\uD83C\uDF89' : '\uD83D\uDCDA'}</div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: colors.textPrimary, marginBottom: space.sm }}>
                {passed ? 'Excellent Work!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '42px', fontWeight: 800, color: passed ? colors.success : colors.warning, marginBottom: space.md }}>
                {totalCorrect}/10
              </p>
              <p style={{ fontSize: '14px', fontWeight: 400, color: colors.textTertiary, marginBottom: space.xl, lineHeight: 1.5 }}>
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
                {passed ? 'Continue \u2192' : 'Review Material'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: space.lg }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>Question {testIndex + 1} / 10</span>
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
              <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 1.6 }}>{q.scenario}</p>
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
                      minHeight: '44px',
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
                    <span style={{ fontSize: '14px', fontWeight: 400, color: colors.textPrimary }}>{opt.text}</span>
                    {answered && correct && <span style={{ marginLeft: space.sm, color: colors.success }}>\u2713</span>}
                    {answered && selected && !correct && <span style={{ marginLeft: space.sm, color: colors.danger }}>\u2717</span>}
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
                <p style={{ fontSize: '12px', fontWeight: 700, color: colors.accent, marginBottom: '6px' }}>Explanation</p>
                <p style={{ fontSize: '13px', fontWeight: 400, color: colors.textTertiary, lineHeight: 1.6 }}>{q.explanation}</p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: space.md, justifyContent: 'space-between' }}>
              <button
                onClick={() => setTestIndex(Math.max(0, testIndex - 1))}
                disabled={testIndex === 0}
                style={{
                  padding: `${space.sm} ${space.lg}`,
                  minHeight: '44px',
                  borderRadius: radius.md,
                  background: colors.bgTertiary,
                  color: colors.textSecondary,
                  border: 'none',
                  cursor: testIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: testIndex === 0 ? 0.4 : 1,
                  zIndex: 10,
                }}
              >\u2190 Back</button>
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
                >Next \u2192</button>
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
            <div style={{ fontSize: '72px', marginBottom: space.lg }}>{'\uD83C\uDFC6'}</div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: colors.textPrimary, marginBottom: space.md }}>Mastery Achieved!</h1>
            <p style={{ fontSize: '15px', fontWeight: 400, color: colors.textTertiary, marginBottom: space.xl, lineHeight: 1.7 }}>
              You now understand gyroscopic precession\u2014the physics behind helicopters, spacecraft, motorcycles, and Earth's wobble!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center', marginBottom: space.xl }}>
              {['\u03A9 = \u03C4/L', 'L = I\u03C9', '90\u00B0 Precession', 'Angular Momentum'].map((c, i) => (
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
              onClick={() => goToPhase('hook')}
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
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GyroscopicPrecessionRenderer;
