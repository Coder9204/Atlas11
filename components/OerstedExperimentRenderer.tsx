/**
 * HOW CURRENT CREATES MAGNETISM RENDERER
 * (Based on Oersted's 1820 Discovery)
 *
 * Complete physics game demonstrating that electric current creates magnetic fields.
 * The fundamental discovery linking electricity and magnetism.
 *
 * FEATURES:
 * - Rich transfer phase with detailed real-world applications
 * - Sequential app progression (must complete each to proceed)
 * - Local answer validation with server fallback
 * - Dark theme matching Wave Particle Duality
 * - Detailed SVG graphics with clear labels
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// THEME COLORS (matching Wave Particle Duality)
// ============================================================

const colors = {
  // Backgrounds
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  // Primary colors
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',

  // Accent colors
  accent: '#8b5cf6',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  // Text colors
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Component specific
  wire: '#ef4444',
  wireActive: '#f87171',
  field: '#3b82f6',
  compass: '#fbbf24',
  current: '#22c55e',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'current_creates_magnetism';

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

// Questions with LOCAL correct answers for development fallback
const testQuestions = [
  {
    scenario: "Hans Christian Oersted placed a compass near a wire carrying electric current.",
    question: "What did Oersted observe when he turned on the current?",
    options: [
      { id: 'toward', label: "The compass needle pointed toward the wire" },
      { id: 'perpendicular', label: "The compass needle deflected perpendicular to the wire", correct: true },
      { id: 'stopped', label: "The compass stopped working" },
      { id: 'moved', label: "The wire moved toward the compass" }
    ],
    explanation: "Oersted discovered that current creates circular magnetic field lines around the wire. The compass needle aligns with these field lines, deflecting perpendicular to the wire direction."
  },
  {
    scenario: "A straight wire carries current upward through a table with a compass placed nearby.",
    question: "What shape do the magnetic field lines around the wire form?",
    options: [
      { id: 'parallel', label: "Straight lines parallel to the wire" },
      { id: 'perpendicular_lines', label: "Straight lines perpendicular to the wire" },
      { id: 'circles', label: "Concentric circles around the wire", correct: true },
      { id: 'random', label: "Random curved lines" }
    ],
    explanation: "The magnetic field lines form concentric circles centered on the wire. This is why a compass placed anywhere around the wire deflects tangent to these circles, not toward or away from the wire."
  },
  {
    scenario: "You reverse the direction of current flow in a wire near a compass.",
    question: "What happens to the compass needle?",
    options: [
      { id: 'same', label: "It points in the same direction as before" },
      { id: 'opposite', label: "It deflects in the opposite direction", correct: true },
      { id: 'spins', label: "It spins continuously" },
      { id: 'no_response', label: "It stops responding to the current" }
    ],
    explanation: "The right-hand rule shows that reversing current direction reverses the magnetic field direction. The field circles in the opposite direction, so the compass deflects the opposite way."
  },
  {
    scenario: "The right-hand rule helps predict magnetic field direction around a current-carrying wire.",
    question: "When using the right-hand rule, what does your thumb represent?",
    options: [
      { id: 'field', label: "The direction of the magnetic field" },
      { id: 'current', label: "The direction of current flow", correct: true },
      { id: 'force', label: "The direction of force on the wire" },
      { id: 'electrons', label: "The direction of electron movement" }
    ],
    explanation: "In the right-hand rule for wires: point your thumb in the direction of current (conventional current, positive to negative), and your fingers curl in the direction of the magnetic field."
  },
  {
    scenario: "You want to increase the magnetic field strength near your current-carrying wire.",
    question: "Which modification would be most effective?",
    options: [
      { id: 'thicker', label: "Use a thicker wire" },
      { id: 'increase', label: "Increase the current or coil the wire", correct: true },
      { id: 'longer', label: "Use a longer wire" },
      { id: 'cool', label: "Cool the wire with ice" }
    ],
    explanation: "The field strength is proportional to current (B = μ₀I/2πr). Increasing current directly increases the field. Coiling the wire adds fields from multiple turns, multiplying the effect."
  },
  {
    scenario: "A wire is coiled into a solenoid (many loops in a cylinder shape).",
    question: "How does the magnetic field of a solenoid compare to a single wire?",
    options: [
      { id: 'weaker', label: "It's weaker because the fields cancel" },
      { id: 'spread', label: "It's the same strength but more spread out" },
      { id: 'stronger', label: "It's much stronger and resembles a bar magnet", correct: true },
      { id: 'ac_only', label: "It only works with AC current" }
    ],
    explanation: "In a solenoid, the magnetic fields from all the coils add together inside, creating a strong, uniform field. The field pattern resembles a bar magnet with clear north and south poles."
  },
  {
    scenario: "The magnetic field strength around a wire depends on distance.",
    question: "How does field strength change as you move away from the wire?",
    options: [
      { id: 'constant', label: "It stays constant" },
      { id: 'inverse', label: "It decreases inversely with distance (1/r)", correct: true },
      { id: 'inverse_square', label: "It decreases with the square of distance (1/r²)" },
      { id: 'increases', label: "It increases with distance" }
    ],
    explanation: "For a long straight wire, B = μ₀I/(2πr). The field decreases as 1/r, not 1/r² like electric fields from point charges. This is because the wire is a line source, not a point source."
  },
  {
    scenario: "Oersted's discovery in 1820 unified two previously separate phenomena.",
    question: "What two phenomena did Oersted's experiment connect?",
    options: [
      { id: 'gravity', label: "Gravity and magnetism" },
      { id: 'em', label: "Electricity and magnetism", correct: true },
      { id: 'light', label: "Light and sound" },
      { id: 'heat', label: "Heat and motion" }
    ],
    explanation: "Before 1820, electricity and magnetism were thought to be completely separate forces. Oersted's discovery that current creates magnetic fields was the first step toward unifying them into electromagnetism."
  },
  {
    scenario: "You're designing an electromagnet using Oersted's principle.",
    question: "What determines which end of the electromagnet is north vs south?",
    options: [
      { id: 'material', label: "The material of the wire" },
      { id: 'direction', label: "The direction of current flow through the coils", correct: true },
      { id: 'temperature', label: "The temperature of the coil" },
      { id: 'voltage', label: "The voltage of the power supply" }
    ],
    explanation: "Using the right-hand rule: wrap your fingers in the direction of current flow around the coil, and your thumb points to the north pole. Reversing current reverses the poles."
  },
  {
    scenario: "A compass is placed directly above a horizontal wire carrying current eastward.",
    question: "Using the right-hand rule, which way will the compass needle deflect?",
    options: [
      { id: 'north', label: "North (same as no current)" },
      { id: 'east', label: "East (along the wire)" },
      { id: 'south', label: "South (away from normal north)", correct: true },
      { id: 'depends', label: "It depends on the current strength" }
    ],
    explanation: "With current flowing east, the right-hand rule shows the field is pointing up on the south side of the wire and down on the north side. Above the wire, the field points south, deflecting the compass from its normal north position."
  }
];

// Rich transfer phase applications
const realWorldApps = [
  {
    icon: '🧲',
    title: 'Electromagnets',
    short: 'Controllable magnetic fields',
    tagline: 'Magnetism On Demand',
    description: 'From junkyard cranes to MRI machines, electromagnets use coiled wire to create powerful, controllable magnetic fields. Unlike permanent magnets, they can be turned on and off, and their strength can be precisely adjusted.',
    connection: 'Oersted discovered that current creates a magnetic field. Coiling the wire multiplies this effect - each loop adds to the total field, creating an electromagnet thousands of times stronger than a single wire.',
    howItWorks: 'Current flows through a coil wound around an iron core. The iron concentrates the magnetic field, multiplying the effect by up to 1000x. More current = stronger field. Reverse current = reverse poles.',
    stats: [
      { value: '45 Tesla', label: 'Strongest lab magnet', icon: '⚡' },
      { value: '1000x', label: 'Iron core multiplier', icon: '📈' },
      { value: '~100 ms', label: 'Switch time', icon: '⏱️' }
    ],
    examples: [
      'The world\'s strongest electromagnet at Florida National Lab generates 45 Tesla',
      'MRI machines use superconducting electromagnets cooled to -269°C',
      'Junkyard cranes lift entire cars using Oersted\'s principle',
      'Maglev trains use electromagnets for frictionless levitation'
    ],
    companies: ['Siemens', 'GE Healthcare', 'CERN', 'Hitachi'],
    futureImpact: 'Future fusion reactors will use electromagnets to contain plasma at 150 million °C - the same principle Oersted discovered with a compass.',
    color: colors.primary
  },
  {
    icon: '⚡',
    title: 'Electric Motors',
    short: 'From field to motion',
    tagline: 'Electromagnetism in Action',
    description: 'Every electric motor combines Oersted\'s discovery with the Lorentz force. Current through a coil creates a magnetic field, which interacts with permanent magnets to create rotation.',
    connection: 'Without Oersted\'s discovery, we wouldn\'t understand how to create magnetic fields from current. This is essential for both the stator (stationary electromagnets) and rotor (rotating electromagnets) in most motors.',
    howItWorks: 'Current through coils creates magnetic fields. These fields interact with permanent magnets or other electromagnets. The attraction and repulsion forces create torque that spins the rotor.',
    stats: [
      { value: '95%+', label: 'Motor efficiency', icon: '⚡' },
      { value: '50B+', label: 'Motors made yearly', icon: '📊' },
      { value: '1821', label: 'First motor', icon: '📅' }
    ],
    examples: [
      'Michael Faraday built the first motor just one year after Oersted\'s discovery',
      'Your phone contains multiple tiny motors based on this principle',
      'Electric vehicles use motor principles discovered 200 years ago',
      'Industrial robots depend on precise electromagnetic motor control'
    ],
    companies: ['Tesla', 'Nidec', 'ABB', 'Bosch'],
    futureImpact: 'Electric aviation and sustainable transportation are only possible because Oersted showed us how to convert electricity into controllable magnetic fields.',
    color: colors.success
  },
  {
    icon: '🔌',
    title: 'Power Transformers',
    short: 'Field transfer magic',
    tagline: 'Invisible Energy Bridges',
    description: 'The changing magnetic field from AC current in one coil induces voltage in another - this is how transformers step voltage up for transmission and down for your home.',
    connection: 'Oersted showed current creates fields. Faraday later showed changing fields create current. Together, these discoveries make transformers possible - no direct electrical connection needed!',
    howItWorks: 'AC current in the primary coil creates a changing magnetic field. This changing field passes through the secondary coil, inducing a voltage. The voltage ratio equals the turns ratio.',
    stats: [
      { value: '99%+', label: 'Efficiency possible', icon: '⚡' },
      { value: '765 kV', label: 'Max grid voltage', icon: '📈' },
      { value: '$30B', label: 'Market size', icon: '📊' }
    ],
    examples: [
      'Power plants step up to 765kV for efficient long-distance transmission',
      'Your phone charger steps down from 120V to 5V using a transformer',
      'Without transformers, power plants would need to be every few miles',
      'The grid loses only ~5% of power thanks to high-voltage transmission'
    ],
    companies: ['ABB', 'Siemens Energy', 'GE Grid Solutions', 'Hitachi Energy'],
    futureImpact: 'Smart grids and renewable energy integration depend on advanced transformers that manage power flow based on Oersted\'s electromagnetic principles.',
    color: colors.warning
  },
  {
    icon: '🔊',
    title: 'Speakers & Headphones',
    short: 'Sound from fields',
    tagline: 'Invisible Air Movers',
    description: 'Audio signals create varying currents in a coil, which creates varying magnetic fields that push and pull on a permanent magnet attached to a diaphragm - making sound!',
    connection: 'Oersted\'s principle in action: varying current creates varying magnetic field. The field interacts with a permanent magnet, creating force that moves the speaker cone and pushes air to make sound.',
    howItWorks: 'Audio signal current flows through a voice coil inside a permanent magnet. The changing magnetic field creates changing forces, moving the coil and attached cone back and forth to create sound waves.',
    stats: [
      { value: '20-20kHz', label: 'Human hearing range', icon: '👂' },
      { value: '1861', label: 'First speaker concept', icon: '📅' },
      { value: '500M+', label: 'Headphones sold yearly', icon: '🎧' }
    ],
    examples: [
      'The first electromagnetic speaker was invented just 7 years after Oersted\'s discovery',
      'Concert speakers can produce over 130 dB using massive electromagnets',
      'Bone conduction headphones use the same principle but vibrate your skull',
      'Ultrasonic speakers for pest control use frequencies above 20kHz'
    ],
    companies: ['JBL', 'Bose', 'Harman', 'Sony', 'Sennheiser'],
    futureImpact: 'Spatial audio and AR/VR sound systems are advancing rapidly, all built on Oersted\'s 1820 discovery that current creates magnetic fields.',
    color: colors.error
  }
];

// ============================================================
// SOUND UTILITY
// ============================================================

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface OerstedExperimentRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const OerstedExperimentRenderer: React.FC<OerstedExperimentRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase
}) => {
  // Phase management
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase state
  const [currentOn, setCurrentOn] = useState(false);
  const [currentStrength, setCurrentStrength] = useState(50);
  const [currentDirection, setCurrentDirection] = useState<'up' | 'down'>('up');
  const [wireMode, setWireMode] = useState<'straight' | 'coil'>('straight');
  const [coilTurns, setCoilTurns] = useState(5);

  // Animation state
  const [compassAngle, setCompassAngle] = useState(0);
  const targetCompassAngle = useRef(0);
  const animationRef = useRef<number>();

  // Test phase state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Transfer phase state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Viewport
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Calculate compass deflection based on current
  useEffect(() => {
    if (!currentOn) {
      targetCompassAngle.current = 0;
    } else {
      const baseDeflection = (currentStrength / 100) * 75;
      const multiplier = wireMode === 'coil' ? Math.min(coilTurns / 3, 3) : 1;
      const direction = currentDirection === 'up' ? 1 : -1;
      targetCompassAngle.current = baseDeflection * multiplier * direction;
    }
  }, [currentOn, currentStrength, currentDirection, wireMode, coilTurns]);

  // Smooth compass animation
  useEffect(() => {
    const animate = () => {
      setCompassAngle(prev => {
        const diff = targetCompassAngle.current - prev;
        if (Math.abs(diff) < 0.5) return targetCompassAngle.current;
        return prev + diff * 0.1;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Event emitter
  const emitGameEvent = useCallback((eventType: string, details: any) => {
    onGameEvent?.({ type: eventType, data: { ...details, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  // Navigation
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');
    emitGameEvent('phase_changed', { phase: p });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  // Test scoring (local validation)
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // Field strength for visualization
  const fieldStrength = currentOn ? (currentStrength / 100) * (wireMode === 'coil' ? coilTurns / 3 : 1) : 0;

  // ============================================================
  // EXPERIMENT VISUALIZATION
  // ============================================================

  // LEGEND ITEMS - explain what each element represents
  const legendItems = [
    { color: colors.wire, label: 'Wire (current direction)' },
    { color: colors.compass, label: 'Compass needle' },
    { color: colors.field, label: 'Magnetic field lines' },
    { color: colors.current, label: 'Current direction arrows' },
    { color: colors.warning, label: 'Power source' },
  ];

  const renderLegend = () => (
    <div style={{
      position: 'absolute',
      top: isMobile ? '8px' : '12px',
      right: isMobile ? '8px' : '12px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '8px',
      padding: isMobile ? '8px' : '12px',
      border: `1px solid ${colors.border}`,
      zIndex: 10
    }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Legend
      </p>
      {legendItems.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: colors.textSecondary }}>{item.label}</span>
        </div>
      ))}
    </div>
  );

  const renderExperimentVisualization = () => {
    const width = isMobile ? 340 : 600;
    const height = isMobile ? 280 : 350;
    const cx = width / 2;
    const cy = height / 2;

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '620px', margin: '0 auto' }}>
        {renderLegend()}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
        <defs>
          {/* Wire gradient */}
          <linearGradient id="oerstedWireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={currentOn ? colors.wire : '#64748b'} />
            <stop offset="50%" stopColor={currentOn ? colors.wireActive : '#94a3b8'} />
            <stop offset="100%" stopColor={currentOn ? colors.wire : '#64748b'} />
          </linearGradient>

          {/* Coil gradient */}
          <linearGradient id="oerstedCoilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentOn ? colors.warning : '#64748b'} />
            <stop offset="50%" stopColor={currentOn ? colors.warningLight : '#94a3b8'} />
            <stop offset="100%" stopColor={currentOn ? colors.warning : '#64748b'} />
          </linearGradient>

          {/* Compass face */}
          <radialGradient id="oerstedCompassFace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="90%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="oerstedGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

        {/* Table surface */}
        <rect x="0" y={cy - 15} width={width} height={height / 2 + 15} fill="#3f3a35" opacity="0.4" rx="0" />

        {/* Title */}
        <text x={cx} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
          How Current Creates Magnetism
        </text>
        <text x={cx} y="48" textAnchor="middle" fill="#e2e8f0" fontSize={isMobile ? 11 : 13}>
          Current creates magnetic fields
        </text>

        {/* Wire or Coil */}
        {wireMode === 'straight' ? (
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Wire through table */}
            <rect
              x="-5"
              y={-cy + 60}
              width="10"
              height={height - 120}
              fill="url(#oerstedWireGradient)"
              filter={currentOn ? 'url(#oerstedGlow)' : undefined}
            />

            {/* Current direction arrow */}
            {currentOn && (
              <g>
                <polygon
                  points={currentDirection === 'up' ? '0,-75 -12,-55 12,-55' : '0,75 -12,55 12,55'}
                  fill={colors.current}
                />
                <text
                  x="22"
                  y={currentDirection === 'up' ? -60 : 60}
                  fill={colors.current}
                  fontSize="14"
                  fontWeight="bold"
                >
                  I
                </text>
              </g>
            )}

            {/* Magnetic field circles */}
            {currentOn && [...Array(4)].map((_, i) => {
              const radius = 35 + i * 22;
              const opacity = 0.5 - i * 0.1;
              return (
                <g key={`field-circle-${i}`}>
                  <circle
                    cx="0"
                    cy="0"
                    r={radius}
                    fill="none"
                    stroke={colors.field}
                    strokeWidth="2"
                    strokeDasharray="8,5"
                    opacity={opacity * fieldStrength}
                  />
                  {/* Direction indicators */}
                  {currentDirection === 'up' ? (
                    <>
                      <circle cx={radius} cy="0" r="4" fill={colors.field} opacity={opacity * fieldStrength} />
                      <text x={-radius} y="4" textAnchor="middle" fill={colors.field} fontSize="12" fontWeight="bold" opacity={opacity * fieldStrength}>×</text>
                    </>
                  ) : (
                    <>
                      <text x={radius} y="4" textAnchor="middle" fill={colors.field} fontSize="12" fontWeight="bold" opacity={opacity * fieldStrength}>×</text>
                      <circle cx={-radius} cy="0" r="4" fill={colors.field} opacity={opacity * fieldStrength} />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        ) : (
          // Coiled wire (solenoid)
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Coil turns */}
            {[...Array(coilTurns)].map((_, i) => {
              const xOffset = (i - (coilTurns - 1) / 2) * 14;
              return (
                <ellipse
                  key={`coil-${i}`}
                  cx={xOffset}
                  cy="0"
                  rx="22"
                  ry="38"
                  fill="none"
                  stroke="url(#oerstedCoilGradient)"
                  strokeWidth="4"
                  filter={currentOn ? 'url(#oerstedGlow)' : undefined}
                />
              );
            })}

            {/* Magnetic field lines through solenoid */}
            {currentOn && [...Array(3)].map((_, i) => {
              const yOffset = (i - 1) * 18;
              return (
                <line
                  key={`solenoid-field-${i}`}
                  x1={-(coilTurns * 9 + 35)}
                  y1={yOffset}
                  x2={(coilTurns * 9 + 35)}
                  y2={yOffset}
                  stroke={colors.field}
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity={0.5 * fieldStrength}
                />
              );
            })}

            {/* N and S pole labels */}
            {currentOn && (
              <>
                <text
                  x={currentDirection === 'up' ? -(coilTurns * 9 + 50) : (coilTurns * 9 + 42)}
                  y="5"
                  fill={colors.error}
                  fontSize="16"
                  fontWeight="bold"
                >
                  N
                </text>
                <text
                  x={currentDirection === 'up' ? (coilTurns * 9 + 42) : -(coilTurns * 9 + 50)}
                  y="5"
                  fill={colors.field}
                  fontSize="16"
                  fontWeight="bold"
                >
                  S
                </text>
              </>
            )}
          </g>
        )}

        {/* Compass */}
        <g transform={`translate(${wireMode === 'straight' ? cx + (isMobile ? 95 : 140) : cx}, ${wireMode === 'straight' ? cy : cy + (isMobile ? 75 : 95)})`}>
          {/* Compass body */}
          <circle
            cx="0"
            cy="0"
            r={isMobile ? 32 : 45}
            fill="url(#oerstedCompassFace)"
            stroke={colors.borderLight}
            strokeWidth="3"
          />

          {/* Cardinal directions */}
          <text x="0" y={isMobile ? -20 : -28} textAnchor="middle" fill={colors.bgDark} fontSize="12" fontWeight="bold">N</text>
          <text x="0" y={isMobile ? 25 : 34} textAnchor="middle" fill="#f8fafc" fontSize="10">S</text>
          <text x={isMobile ? 23 : 32} y="4" textAnchor="middle" fill="#f8fafc" fontSize="10">E</text>
          <text x={isMobile ? -23 : -32} y="4" textAnchor="middle" fill="#f8fafc" fontSize="10">W</text>

          {/* Compass needle */}
          <g transform={`rotate(${compassAngle})`}>
            <polygon
              points={`0,${isMobile ? -25 : -35} -5,0 5,0`}
              fill={colors.error}
            />
            <polygon
              points={`0,${isMobile ? 25 : 35} -5,0 5,0`}
              fill="#e2e8f0"
              stroke={colors.textMuted}
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="4" fill={colors.bgDark} />
          </g>

          {/* Deflection indicator */}
          {currentOn && Math.abs(compassAngle) > 5 && (
            <text
              x="0"
              y={isMobile ? 50 : 65}
              textAnchor="middle"
              fill={colors.field}
              fontSize="11"
              fontWeight="bold"
            >
              Deflection: {Math.round(compassAngle)}°
            </text>
          )}
        </g>

        {/* Right-hand rule diagram */}
        {currentOn && wireMode === 'straight' && (
          <g transform={`translate(${isMobile ? 35 : 70}, ${isMobile ? 65 : 85})`}>
            <rect x="-28" y="-22" width="76" height="56" fill={colors.bgCard} rx="6" stroke={colors.border} />
            <text x="10" y="-6" textAnchor="middle" fill="#f8fafc" fontSize="9">Right-Hand Rule</text>
            <text x="10" y="10" textAnchor="middle" fill={colors.current} fontSize="9">👍 Thumb = I</text>
            <text x="10" y="24" textAnchor="middle" fill={colors.field} fontSize="9">👋 Fingers = B</text>
          </g>
        )}

        {/* Formula */}
        <g transform={`translate(${isMobile ? 18 : 35}, ${height - (isMobile ? 55 : 65)})`}>
          <rect x="0" y="0" width={isMobile ? 130 : 170} height={isMobile ? 42 : 52} fill={colors.bgCard} rx="6" stroke={colors.border} />
          <text x="10" y={isMobile ? 18 : 22} fill={colors.textSecondary} fontSize={isMobile ? 10 : 12} fontWeight="600">
            {wireMode === 'straight' ? 'Biot-Savart Law' : 'Solenoid Field'}
          </text>
          <text x="10" y={isMobile ? 34 : 42} fill={colors.primary} fontSize={isMobile ? 12 : 15} fontWeight="bold" fontFamily="monospace">
            {wireMode === 'straight' ? 'B = μ₀I / (2πr)' : 'B = μ₀nI'}
          </text>
        </g>

        {/* Status */}
        <g transform={`translate(${width - (isMobile ? 150 : 205)}, ${height - (isMobile ? 55 : 65)})`}>
          <rect x="0" y="0" width={isMobile ? 132 : 170} height={isMobile ? 42 : 52} fill={colors.bgCard} rx="6" stroke={currentOn ? colors.success : colors.border} strokeWidth={currentOn ? 1.5 : 1} />
          <text x="10" y={isMobile ? 18 : 22} fill={currentOn ? colors.success : colors.error} fontSize={isMobile ? 10 : 12} fontWeight="600">
            Current: {currentOn ? 'ON' : 'OFF'}
          </text>
          <text x="10" y={isMobile ? 34 : 42} fill={colors.textPrimary} fontSize={isMobile ? 11 : 13}>
            {currentOn ? `${currentStrength}% • ${currentDirection === 'up' ? '↑' : '↓'}` : 'No magnetic field'}
          </text>
        </g>
      </svg>
      </div>
    );
  };

  // "What to Watch" callout for play phases
  const renderWhatToWatch = () => (
    <div style={{
      background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
      border: `1px solid ${colors.primary}30`,
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
      marginBottom: '16px',
      maxWidth: '600px',
      margin: '0 auto 16px'
    }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, marginBottom: '8px' }}>
        👀 WHAT TO WATCH FOR:
      </p>
      <ul style={{ margin: 0, paddingLeft: '16px', color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
        <li>Watch the <strong style={{ color: colors.compass }}>compass needle</strong> — it shows the magnetic field direction</li>
        <li>Increase <strong style={{ color: colors.current }}>current strength</strong> → needle deflects <strong>more</strong></li>
        <li>The <strong style={{ color: colors.field }}>blue circles</strong> show how the field wraps around the wire</li>
      </ul>
    </div>
  );

  // Formula breakdown panel
  const renderFormulaBreakdown = () => (
    <div style={{
      background: colors.bgCard,
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
      maxWidth: '500px',
      margin: '16px auto',
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ fontSize: isMobile ? '18px' : '22px', fontFamily: 'monospace', color: colors.textPrimary, textAlign: 'center', marginBottom: '12px' }}>
        {wireMode === 'straight' ? 'B = μ₀I / (2πr)' : 'B = μ₀nI'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '12px' }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>B</span>
        <span style={{ color: '#e2e8f0' }}>Magnetic field strength (what we measure)</span>
        <span style={{ color: '#fbbf24', fontWeight: 700 }}>I</span>
        <span style={{ color: '#e2e8f0' }}>Current strength (what YOU control with slider)</span>
        {wireMode === 'straight' ? (
          <>
            <span style={{ color: '#4ade80', fontWeight: 700 }}>r</span>
            <span style={{ color: '#e2e8f0' }}>Distance from wire (closer = stronger)</span>
          </>
        ) : (
          <>
            <span style={{ color: '#4ade80', fontWeight: 700 }}>n</span>
            <span style={{ color: '#e2e8f0' }}>Number of coil turns (more = stronger)</span>
          </>
        )}
        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>μ₀</span>
        <span style={{ color: '#e2e8f0' }}>A physics constant (don't worry about it)</span>
      </div>
    </div>
  );

  // ============================================================
  // RENDER FUNCTIONS (Phases)
  // ============================================================

  // CRITICAL: Bottom bar MUST use position: fixed to ALWAYS be visible
  // Content area must have padding-bottom to not be hidden behind it
  const renderBottomBar = (showBack: boolean, showNext: boolean, nextLabel: string, nextAction?: () => void, nextColor?: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderTop: `1px solid ${colors.border}`,
      backgroundColor: colors.bgCard,
      zIndex: 1000,
      minHeight: '72px',
      boxShadow: '0 -8px 30px rgba(0,0,0,0.5)'
    }}>
      {showBack ? (
        <button
          onMouseDown={() => {
            const idx = validPhases.indexOf(phase);
            if (idx > 0) goToPhase(validPhases[idx - 1]);
          }}
          style={{
            padding: '14px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: 'none',
            cursor: 'pointer',
            minHeight: '48px'
          }}
        >
          ← Back
        </button>
      ) : <div />}

      {showNext ? (
        <button
          onMouseDown={nextAction || (() => {
            const idx = validPhases.indexOf(phase);
            if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]);
          })}
          style={{
            padding: '16px 32px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '16px',
            background: `linear-gradient(135deg, ${nextColor || colors.primary} 0%, ${colors.accent} 100%)`,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${(nextColor || colors.primary)}40`,
            minHeight: '52px',
            minWidth: '160px'
          }}
        >
          {nextLabel}
        </button>
      ) : (
        <div style={{
          padding: '16px 32px',
          color: '#e2e8f0',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          Select an option above to continue
        </div>
      )}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>🧭⚡🔬</div>
            <h1 style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
              Can a Wire Act Like a Magnet?
            </h1>
            <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 32px' }}>
              In 1820, Hans Christian Oersted noticed something strange during a lecture demonstration.
              <br /><br />
              His discovery changed physics forever.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '40px',
              border: `1px solid ${colors.border}`,
              textAlign: 'left'
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px', fontStyle: 'italic', marginBottom: '12px' }}>
                "I finally found that the magnetic needle was moved by the galvanic current."
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
                — Hans Christian Oersted, 1820
              </p>
            </div>
          </div>
        </div>

        {/* Fixed bottom bar */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          zIndex: 1000,
          minHeight: '72px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.5)'
        }}>
          <button
            onMouseDown={() => goToPhase('predict')}
            style={{
              padding: '18px 48px',
              fontSize: '18px',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              boxShadow: `0 8px 32px ${colors.primary}50`
            }}
          >
            Recreate the Discovery →
          </button>
        </div>
      </div>
    );
  }

  // Static Oersted visualization for predict phase
  const renderOerstedVisualization = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 200 : 250;
    const cx = width / 2;
    const cy = height / 2;

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '520px', margin: '0 auto 20px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

          {/* Table surface */}
          <rect x="0" y={cy - 10} width={width} height={height / 2 + 10} fill="#3f3a35" opacity="0.4" />

          {/* Wire (vertical) */}
          <rect
            x={cx - 80}
            y="30"
            width="8"
            height={height - 60}
            fill={colors.wire}
          />

          {/* Wire label */}
          <text x={cx - 76} y="22" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
            Wire
          </text>

          {/* Current arrow indicator (shows potential flow) */}
          <polygon
            points={`${cx - 76},50 ${cx - 86},65 ${cx - 66},65`}
            fill={colors.textMuted}
            opacity="0.5"
          />
          <text x={cx - 55} y="60" fill={colors.textMuted} fontSize="10">
            Current?
          </text>

          {/* Compass */}
          <g transform={`translate(${cx + 40}, ${cy})`}>
            {/* Compass body */}
            <circle
              cx="0"
              cy="0"
              r={isMobile ? 35 : 45}
              fill="#f8fafc"
              stroke={colors.borderLight}
              strokeWidth="3"
            />

            {/* Cardinal directions */}
            <text x="0" y={isMobile ? -22 : -30} textAnchor="middle" fill={colors.bgDark} fontSize="11" fontWeight="bold">N</text>
            <text x="0" y={isMobile ? 28 : 36} textAnchor="middle" fill={colors.textMuted} fontSize="10">S</text>
            <text x={isMobile ? 26 : 34} y="4" textAnchor="middle" fill={colors.textMuted} fontSize="10">E</text>
            <text x={isMobile ? -26 : -34} y="4" textAnchor="middle" fill={colors.textMuted} fontSize="10">W</text>

            {/* Compass needle pointing North (resting state) */}
            <polygon
              points={`0,${isMobile ? -28 : -36} -5,0 5,0`}
              fill={colors.error}
            />
            <polygon
              points={`0,${isMobile ? 28 : 36} -5,0 5,0`}
              fill="#cbd5e1"
            />
            <circle cx="0" cy="0" r="4" fill={colors.bgDark} />
          </g>

          {/* Compass label */}
          <text x={cx + 40} y={cy + (isMobile ? 55 : 65)} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
            Compass
          </text>

          {/* Question marks around wire (hinting at magnetic field) */}
          <text x={cx - 120} y={cy} fill={colors.field} fontSize="16" opacity="0.4">?</text>
          <text x={cx - 40} y={cy - 40} fill={colors.field} fontSize="16" opacity="0.4">?</text>
          <text x={cx - 40} y={cy + 50} fill={colors.field} fontSize="16" opacity="0.4">?</text>

          {/* Power source indicator */}
          <rect x="15" y={height - 45} width="60" height="30" fill={colors.bgCard} rx="6" stroke={colors.border} />
          <text x="45" y={height - 26} textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">
            Battery
          </text>
        </svg>
      </div>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictions = [
      { id: 'nothing', label: 'Nothing - electricity and magnetism are unrelated', icon: '❌' },
      { id: 'toward', label: 'The needle will point toward the wire', icon: '➡️' },
      { id: 'deflect', label: 'The needle will deflect sideways', icon: '↪️' },
      { id: 'spin', label: 'The needle will spin continuously', icon: '🔄' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 • Make a Prediction
              </p>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                What will happen to the compass?
              </h2>
            </div>

            {/* Static visualization */}
            {renderOerstedVisualization()}

            {/* What You're Looking At explanation box */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
              border: `1px solid ${colors.primary}30`,
              borderRadius: '12px',
              padding: isMobile ? '14px' : '18px',
              marginBottom: '24px',
              maxWidth: '520px',
              margin: '0 auto 24px'
            }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: colors.primary, marginBottom: '10px' }}>
                🔍 WHAT YOU'RE LOOKING AT:
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', color: colors.textSecondary, fontSize: '13px', lineHeight: 1.7 }}>
                <li><strong style={{ color: colors.wire }}>Vertical wire</strong> — connected to a battery (currently OFF)</li>
                <li><strong style={{ color: colors.textPrimary }}>Compass</strong> — needle points North when no other forces act on it</li>
                <li><strong style={{ color: colors.field }}>Question marks</strong> — what happens to the space around the wire when current flows?</li>
              </ul>
            </div>

            {/* Prediction question */}
            <p style={{ color: colors.textSecondary, fontSize: '16px', maxWidth: '500px', margin: '0 auto 20px', textAlign: 'center' }}>
              When we turn on the current, what do you think will happen to the compass needle?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {predictions.map(p => (
                <button
                  key={p.id}
                  onMouseDown={() => {
                    setPrediction(p.id);
                    playSound('click');
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: prediction === p.id ? `3px solid ${colors.primary}` : `2px solid ${colors.border}`,
                    backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    boxShadow: prediction === p.id ? `0 0 20px ${colors.primary}40` : 'none'
                  }}
                >
                  <span style={{ fontSize: '28px', marginRight: '12px' }}>{p.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '15px' }}>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Optional "Why?" textarea that appears after selection */}
            {prediction && (
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                maxWidth: '520px',
                margin: '0 auto',
                border: `1px solid ${colors.border}`
              }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  💭 Why do you think so? (optional)
                </label>
                <textarea
                  placeholder="I think this because..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bgCardLight,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
                  Writing out your reasoning helps you learn — even if you're wrong!
                </p>
              </div>
            )}
          </div>
        </div>

        {renderBottomBar(true, !!prediction, 'Run the Experiment →')}
      </div>
    );
  }

  // PLAY PHASE - Responsive layout with fixed bottom bar
  if (phase === 'play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {/* Scrollable content area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
          paddingBottom: '100px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 2 • Run the Experiment
            </p>
            <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
              How Current Creates Magnetism
            </h2>
          </div>

          {/* What to Watch callout */}
          {renderWhatToWatch()}

          {renderExperimentVisualization()}

          {/* Formula Breakdown */}
          {renderFormulaBreakdown()}

          {/* Controls with clear labels */}
          <div style={{ maxWidth: '500px', margin: '16px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Current Strength Slider with effect explanation */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>
                  ⚡ Current Strength
                </span>
                <span style={{ color: colors.current, fontSize: '18px', fontWeight: 700 }}>{currentStrength}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={currentStrength}
                onChange={(e) => setCurrentStrength(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.current, height: '8px' }}
              />
              <p style={{ color: '#e2e8f0', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                ↑ Higher current = ↑ Stronger magnetic field = ↑ More compass deflection
              </p>
            </div>

            {/* Current Direction with clear labels */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                🔄 Current Direction (changes field direction)
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onMouseDown={() => {
                    setCurrentDirection('up');
                    playSound('click');
                    emitGameEvent('direction_changed', { direction: 'up' });
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: currentDirection === 'up' ? colors.primary : colors.bgCardLight,
                    color: currentDirection === 'up' ? 'white' : colors.textSecondary,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ↑ Upward
                </button>
                <button
                  onMouseDown={() => {
                    setCurrentDirection('down');
                    playSound('click');
                    emitGameEvent('direction_changed', { direction: 'down' });
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: currentDirection === 'down' ? colors.primary : colors.bgCardLight,
                    color: currentDirection === 'down' ? 'white' : colors.textSecondary,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ↓ Downward
                </button>
              </div>
            </div>

            <button
              onMouseDown={() => {
                setCurrentOn(!currentOn);
                playSound(currentOn ? 'click' : 'success');
                emitGameEvent(currentOn ? 'current_off' : 'current_on', { strength: currentStrength, direction: currentDirection });
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '16px',
                backgroundColor: currentOn ? colors.error : colors.success,
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {currentOn ? '⏹ Turn OFF' : '▶ Turn ON'}
            </button>
          </div>

          {currentOn && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.success, fontSize: '16px', fontWeight: 600 }}>
                The compass deflects! Current creates a magnetic field around the wire.
              </p>
            </div>
          )}
        </div>

        {renderBottomBar(true, currentOn, 'Understand the Physics →', () => goToPhase('review'), colors.success)}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 3 • Understanding
              </p>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary }}>
                Electricity Creates Magnetism!
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
                <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>What Happened</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  When current flows through the wire, it creates a <strong style={{ color: colors.textPrimary }}>magnetic field</strong> that circles around the wire.
                  This field deflects the compass needle perpendicular to the wire direction.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
                <h3 style={{ color: colors.success, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Right-Hand Rule</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  Point your <strong style={{ color: colors.textPrimary }}>thumb</strong> in the direction of current flow. Your <strong style={{ color: colors.textPrimary }}>fingers curl</strong> in the direction
                  of the magnetic field. This is why the compass deflects perpendicular to the wire!
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
                <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Historical Significance</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  Oersted's 1820 discovery proved that <strong style={{ color: colors.textPrimary }}>electricity and magnetism are connected</strong>.
                  This led to Maxwell's equations and our entire understanding of electromagnetism - the foundation of modern technology!
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.error}` }}>
                <h3 style={{ color: colors.error, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Biot-Savart Law</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '28px', fontFamily: 'monospace', color: colors.textPrimary, fontWeight: 700 }}>
                    B = μ₀I / (2πr)
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
                    <div><span style={{ color: '#60a5fa', fontWeight: 700 }}>B</span> = magnetic field strength</div>
                    <div><span style={{ color: '#fbbf24', fontWeight: 700 }}>I</span> = current | <span style={{ color: '#4ade80', fontWeight: 700 }}>r</span> = distance</div>
                    <div>μ₀ = permeability of free space</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'Try a Twist →', () => goToPhase('twist_predict'), colors.accent)}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'weaker', label: 'The magnetic field will be weaker', icon: '📉' },
      { id: 'stronger', label: 'The magnetic field will be much stronger', icon: '📈' },
      { id: 'same', label: 'The field will be the same strength', icon: '➡️' },
      { id: 'cancel', label: 'The fields will cancel each other', icon: '❌' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 4 • New Variable
              </p>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                Coil the Wire!
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                What do you think will happen if you coil the wire into multiple loops (a solenoid)?
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              {twistPredictions.map(p => (
                <button
                  key={p.id}
                  onMouseDown={() => {
                    setTwistPrediction(p.id);
                    playSound('click');
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `2px solid ${colors.border}`,
                    backgroundColor: twistPrediction === p.id ? `${colors.warning}20` : colors.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '28px', marginRight: '12px' }}>{p.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '15px' }}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {renderBottomBar(true, !!twistPrediction, 'Test It →', () => { setWireMode('coil'); goToPhase('twist_play'); }, colors.warning)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
          paddingBottom: '100px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 5 • Experiment
            </p>
            <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
              The Solenoid Effect
            </h2>
          </div>

          {renderExperimentVisualization()}

          {/* Controls */}
          <div style={{ maxWidth: '500px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600 }}>Number of Coil Turns</span>
                <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 700 }}>{coilTurns}</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                value={coilTurns}
                onChange={(e) => {
                  setCoilTurns(Number(e.target.value));
                  emitGameEvent('coils_changed', { turns: Number(e.target.value) });
                }}
                style={{ width: '100%', accentColor: colors.accent }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onMouseDown={() => {
                  setWireMode(wireMode === 'straight' ? 'coil' : 'straight');
                  playSound('click');
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  backgroundColor: wireMode === 'coil' ? colors.accent : colors.bgCardLight,
                  color: wireMode === 'coil' ? 'white' : colors.textSecondary,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {wireMode === 'coil' ? '🔄 Coiled' : '| Straight'}
              </button>

              <button
                onMouseDown={() => {
                  setCurrentOn(!currentOn);
                  playSound(currentOn ? 'click' : 'success');
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  backgroundColor: currentOn ? colors.error : colors.success,
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {currentOn ? '⏹ OFF' : '▶ ON'}
              </button>
            </div>
          </div>

          {currentOn && wireMode === 'coil' && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '16px', fontWeight: 600 }}>
                Notice how the coiled wire creates a much stronger, focused magnetic field!
                It behaves like a bar magnet with N and S poles.
              </p>
            </div>
          )}
        </div>

        {renderBottomBar(true, currentOn && wireMode === 'coil', 'See the Explanation →', () => goToPhase('twist_review'), colors.warning)}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 6 • Deep Insight
              </p>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary }}>
                The Electromagnet
              </h2>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.accent}`, marginBottom: '24px' }}>
              <h3 style={{ color: colors.accent, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Why Coils Are Stronger</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: '16px' }}>
                When you coil the wire, each loop's magnetic field adds together. For a solenoid with n turns:
              </p>
              <div style={{ fontSize: '24px', fontFamily: 'monospace', color: colors.textPrimary, fontWeight: 700, textAlign: 'center', margin: '16px 0' }}>
                B = μ₀ × n × I
              </div>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                More turns = stronger field. This is the principle behind <strong style={{ color: colors.textPrimary }}>electromagnets</strong> - they can be
                turned on/off and have adjustable strength, unlike permanent magnets.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Key Insight</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                A coiled current-carrying wire acts exactly like a <strong style={{ color: colors.textPrimary }}>bar magnet</strong>! The direction of current
                determines which end is north and which is south (right-hand rule). This is how we create controllable, powerful magnetic fields for everything from MRI machines to maglev trains.
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'Real World Applications →', () => goToPhase('transfer'), colors.success)}
      </div>
    );
  }

  // TRANSFER PHASE (Rich, sequential applications)
  if (phase === 'transfer') {
    const currentApp = realWorldApps[selectedApp];
    const isCurrentCompleted = completedApps[selectedApp];
    const allCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    const handleCompleteApp = () => {
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      playSound('success');

      emitGameEvent('app_completed', {
        appNumber: selectedApp + 1,
        appTitle: currentApp.title
      });

      if (selectedApp < 3) {
        setTimeout(() => setSelectedApp(selectedApp + 1), 500);
      }
    };

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>
                Step 7 • Real World Applications
              </p>
              <p style={{ fontSize: '12px', marginTop: '4px', color: '#e2e8f0' }}>
                {completedCount}/4 completed — {allCompleted ? 'Ready for test!' : 'Complete all to proceed'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {completedApps.map((completed, i) => (
                <div key={i} style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: completed ? colors.success : i === selectedApp ? currentApp.color : colors.bgCardLight,
                  boxShadow: i === selectedApp ? `0 0 10px ${currentApp.color}` : 'none',
                  border: `2px solid ${completed ? colors.success : colors.border}`
                }} />
              ))}
            </div>
          </div>

          {/* App tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {realWorldApps.map((app, i) => {
              const isCompleted = completedApps[i];
              const isCurrent = selectedApp === i;
              const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

              return (
                <button
                  key={i}
                  onMouseDown={() => {
                    if (!isLocked) setSelectedApp(i);
                  }}
                  disabled={isLocked}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: isCurrent ? `2px solid ${app.color}` : `1px solid ${colors.border}`,
                    backgroundColor: isCurrent ? `${app.color}20` : isCompleted ? `${colors.success}15` : colors.bgCardLight,
                    color: isLocked ? '#94a3b8' : colors.textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{app.icon}</span>
                  <span>{isMobile ? '' : app.title}</span>
                  {isCompleted && <span style={{ color: colors.success }}>✓</span>}
                  {isLocked && <span>🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* App content - scrollable area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '56px' }}>{currentApp.icon}</span>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: colors.textPrimary, marginTop: '12px' }}>
                {currentApp.title}
              </h2>
              <p style={{ color: currentApp.color, fontSize: '16px', fontWeight: 600 }}>{currentApp.tagline}</p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${currentApp.color}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.7 }}>
                {currentApp.description}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                🔗 How This Uses Current → Magnetism
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                {currentApp.connection}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                ⚙️ How It Works
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                {currentApp.howItWorks}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  border: `1px solid ${colors.border}`
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ color: currentApp.color, fontSize: '18px', fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ color: '#e2e8f0', fontSize: '11px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                📋 Real Examples
              </h3>
              <ul style={{ color: colors.textSecondary, paddingLeft: '20px', lineHeight: 1.8 }}>
                {currentApp.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${colors.bgCard} 100%)`, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${currentApp.color}40` }}>
              <h3 style={{ color: currentApp.color, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                🚀 Future Impact
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                {currentApp.futureImpact}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          gap: '12px',
          zIndex: 1000,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
        }}>
          <button
            onMouseDown={() => goToPhase('twist_review')}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              backgroundColor: colors.bgCardLight,
              color: colors.textSecondary,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>

          {!isCurrentCompleted ? (
            <button
              onMouseDown={handleCompleteApp}
              style={{
                flex: 1,
                maxWidth: '300px',
                padding: '14px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '16px',
                minHeight: '52px',
                background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${currentApp.color}40`
              }}
            >
              Got It! Continue →
            </button>
          ) : allCompleted ? (
            <button
              onMouseDown={() => goToPhase('test')}
              style={{
                flex: 1,
                maxWidth: '300px',
                padding: '14px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '16px',
                minHeight: '52px',
                background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.success}40`
              }}
            >
              Take the Knowledge Test →
            </button>
          ) : (
            <div style={{ flex: 1, maxWidth: '300px', textAlign: 'center' }}>
              <span style={{ color: colors.success, fontWeight: 600 }}>✓ {currentApp.title} completed!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const score = calculateTestScore();

    if (testSubmitted) {
      const passed = score >= 7;
      return (
        <div style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
          overflow: 'hidden'
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '100px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🎉' : '📚'}</div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: colors.textPrimary, marginBottom: '12px' }}>
              {passed ? 'Congratulations!' : 'Keep Learning!'}
            </h2>
            <div style={{ fontSize: '64px', fontWeight: 800, color: passed ? colors.success : colors.warning, marginBottom: '24px' }}>
              {score}/10
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '18px', textAlign: 'center', maxWidth: '500px', marginBottom: '32px' }}>
              {passed
                ? 'You understand how current creates magnetic fields! This principle powers motors, speakers, and MRI machines.'
                : 'You need 7/10 to pass. Review the lesson and try again.'}
            </p>
          </div>

          {/* Fixed bottom bar */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            zIndex: 1000,
            minHeight: '72px',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.5)'
          }}>
            {!passed && (
              <button
                onMouseDown={() => {
                  setPhase('hook');
                  setTestQuestion(0);
                  setTestAnswers(Array(10).fill(null));
                  setTestSubmitted(false);
                  setCompletedApps([false, false, false, false]);
                  setWireMode('straight');
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  backgroundColor: colors.bgCardLight,
                  color: colors.textSecondary,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Review Lesson
              </button>
            )}
            <button
              onMouseDown={() => passed ? goToPhase('mastery') : setTestSubmitted(false)}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {passed ? 'Complete Journey →' : 'Try Again'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 20px' }}>
            {/* Progress */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Knowledge Test
                </span>
                <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
                  Question {testQuestion + 1} of 10
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: testAnswers[i] !== null
                        ? colors.success
                        : i === testQuestion
                          ? colors.primary
                          : colors.bgCardLight
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${colors.primary}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.6 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              {currentQ.question}
            </h3>

            {/* Options - with CLEAR correct answer styling */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map((opt, i) => {
                const isSelected = testAnswers[testQuestion] === opt.id;
                const isAnswered = testAnswers[testQuestion] !== null;
                const isCorrect = opt.correct;
                const userWasWrong = isAnswered && !isSelected && !isCorrect;
                const showAsCorrect = isAnswered && isCorrect;
                const showAsWrong = isSelected && !isCorrect;

                return (
                  <button
                    key={opt.id}
                    onMouseDown={() => {
                      if (!isAnswered) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                        playSound(isCorrect ? 'success' : 'failure');
                      }
                    }}
                    disabled={isAnswered}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      border: showAsCorrect
                        ? `3px solid ${colors.success}`
                        : showAsWrong
                          ? `3px solid ${colors.error}`
                          : `2px solid ${colors.border}`,
                      backgroundColor: showAsCorrect
                        ? `${colors.success}25`
                        : showAsWrong
                          ? `${colors.error}20`
                          : colors.bgCard,
                      cursor: isAnswered ? 'default' : 'pointer',
                      textAlign: 'left',
                      opacity: userWasWrong ? 0.4 : 1,
                      boxShadow: showAsCorrect ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{
                          fontWeight: 700,
                          color: showAsCorrect ? colors.success : showAsWrong ? colors.error : colors.primary,
                          marginRight: '12px'
                        }}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <span style={{ color: colors.textPrimary }}>{opt.label}</span>
                      </div>

                      {/* CLEAR correct/wrong indicators */}
                      {showAsCorrect && (
                        <span style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          color: colors.success,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          ✓ Correct!
                        </span>
                      )}
                      {showAsWrong && (
                        <span style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: colors.error
                        }}>
                          ✗ Wrong
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation - more prominent */}
            {testAnswers[testQuestion] !== null && (
              <div style={{
                background: testAnswers[testQuestion] === currentQ.options.find(o => o.correct)?.id
                  ? `linear-gradient(135deg, ${colors.success}20 0%, ${colors.bgCard} 100%)`
                  : `linear-gradient(135deg, ${colors.error}15 0%, ${colors.bgCard} 100%)`,
                borderRadius: '12px',
                padding: '20px',
                marginTop: '20px',
                border: `1px solid ${testAnswers[testQuestion] === currentQ.options.find(o => o.correct)?.id ? colors.success : colors.warning}40`
              }}>
                <h4 style={{ color: colors.warning, fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💡 Explanation
                </h4>
                <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>{currentQ.explanation}</p>
              </div>
            )}
          </div>
        </div>

        {/* FIXED Navigation bar */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          zIndex: 1000,
          boxShadow: '0 -8px 30px rgba(0,0,0,0.5)'
        }}>
          <button
            onMouseDown={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
            disabled={testQuestion === 0}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              backgroundColor: colors.bgCardLight,
              color: testQuestion === 0 ? '#94a3b8' : colors.textSecondary,
              border: 'none',
              cursor: testQuestion === 0 ? 'not-allowed' : 'pointer',
              opacity: testQuestion === 0 ? 0.5 : 1
            }}
          >
            ← Previous
          </button>

          {testAnswers[testQuestion] !== null && (
            <button
              onMouseDown={() => {
                if (testQuestion < 9) {
                  setTestQuestion(testQuestion + 1);
                } else {
                  setTestSubmitted(true);
                }
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {testQuestion < 9 ? 'Next Question →' : 'See Results →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px' }}>🏆</div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
            Mastery Achieved!
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
            You now understand how current creates magnetism — the foundation of electromagnetism discovered by Hans Christian Oersted in 1820.
            This 1820 breakthrough powers everything from your smartphone's speakers to MRI machines!
          </p>
        </div>

        {/* Fixed bottom bar */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          zIndex: 1000,
          minHeight: '72px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.5)'
        }}>
          <button
            onMouseDown={() => {
              onComplete?.();
              window.dispatchEvent(new CustomEvent('returnToDashboard'));
            }}
            style={{
              padding: '18px 36px',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '16px',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 8px 32px ${colors.primary}50`
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OerstedExperimentRenderer;
