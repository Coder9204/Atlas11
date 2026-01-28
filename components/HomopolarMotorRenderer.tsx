/**
 * HOMOPOLAR MOTOR RENDERER
 *
 * Complete physics game demonstrating the simplest motor on Earth.
 * Uses Lorentz force (F = BIL) to create continuous rotation.
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
  copper: '#f59e0b',
  copperLight: '#fbbf24',
  magnetNorth: '#ef4444',
  magnetSouth: '#3b82f6',
  current: '#fbbf24',
  force: '#22c55e',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'homopolar_motor';

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
// In production, server validates; locally, we use correctIndex
const testQuestions = [
  {
    scenario: "A homopolar motor is built with an AA battery, a strong neodymium magnet, and a copper wire loop.",
    question: "What fundamental force causes the wire to spin?",
    options: [
      { id: 'gravity', label: "Gravitational force between the wire and magnet" },
      { id: 'lorentz', label: "Lorentz force on current-carrying wire in magnetic field", correct: true },
      { id: 'electrostatic', label: "Electrostatic repulsion between charges" },
      { id: 'magnetic', label: "Magnetic attraction between wire and magnet" }
    ],
    explanation: "The Lorentz force (F = qv×B or F = IL×B) acts on moving charges (current) in a magnetic field, creating the force that makes the wire spin."
  },
  {
    scenario: "The copper wire carries current from the battery's positive terminal through the magnet to the negative terminal.",
    question: "Why does the wire experience continuous torque rather than just a single push?",
    options: [
      { id: 'momentum', label: "The wire's momentum keeps it spinning" },
      { id: 'radial', label: "Current is always radial while B-field is axial, creating consistent tangential force", correct: true },
      { id: 'pulse', label: "The battery pulses current on and off rapidly" },
      { id: 'magnet', label: "The magnet rotates with the wire" }
    ],
    explanation: "In a homopolar motor, current flows radially through the wire while the magnetic field is axial. The cross product always produces a tangential force, creating continuous torque."
  },
  {
    scenario: "You flip the neodymium magnet so its north pole faces the battery instead of south.",
    question: "What happens to the motor's rotation?",
    options: [
      { id: 'stop', label: "The motor stops completely" },
      { id: 'faster', label: "The motor spins faster due to stronger field" },
      { id: 'reverse', label: "The motor reverses direction", correct: true },
      { id: 'same', label: "Nothing changes - polarity doesn't matter" }
    ],
    explanation: "Flipping the magnet reverses the magnetic field direction (B). Since F = I×B, reversing B reverses the force direction, causing the motor to spin the opposite way."
  },
  {
    scenario: "A student tries to build a homopolar motor but uses a plastic-coated wire.",
    question: "Why doesn't the motor work?",
    options: [
      { id: 'heavy', label: "Plastic is too heavy for the motor to spin" },
      { id: 'insulation', label: "Plastic insulation prevents electrical contact with the battery", correct: true },
      { id: 'static', label: "Plastic generates static electricity that opposes motion" },
      { id: 'works', label: "The motor would work fine - plastic doesn't affect it" }
    ],
    explanation: "Plastic insulation prevents the wire from making electrical contact with the battery terminal and the magnet, so no current can flow through the circuit."
  },
  {
    scenario: "The Lorentz force on a current-carrying wire is given by F = BIL.",
    question: "If you double the current through the wire, what happens to the force?",
    options: [
      { id: 'same', label: "Force stays the same" },
      { id: 'double', label: "Force doubles", correct: true },
      { id: 'quadruple', label: "Force quadruples" },
      { id: 'half', label: "Force is halved" }
    ],
    explanation: "The Lorentz force equation F = BIL shows that force is directly proportional to current. Doubling current doubles the force."
  },
  {
    scenario: "You want to make your homopolar motor spin faster.",
    question: "Which modification would be most effective?",
    options: [
      { id: 'longer', label: "Use a longer wire loop" },
      { id: 'stronger', label: "Use a stronger magnet", correct: true },
      { id: 'weight', label: "Add more weight to the wire" },
      { id: 'cold', label: "Cool the battery in ice" }
    ],
    explanation: "According to F = BIL, using a stronger magnet increases B, which directly increases the force and thus the rotational speed. More weight or longer wire would slow it down."
  },
  {
    scenario: "During operation, the battery gets warm after a few minutes.",
    question: "Why does this happen?",
    options: [
      { id: 'induction', label: "The magnet generates heat through induction" },
      { id: 'resistance', label: "The wire has resistance, converting electrical energy to heat", correct: true },
      { id: 'friction', label: "The spinning motion creates friction with air" },
      { id: 'chemical', label: "Chemical reactions in the battery slow down when cold" }
    ],
    explanation: "The wire has electrical resistance. When current flows through it, some electrical energy is converted to heat (P = I²R). This is why you shouldn't run the motor too long."
  },
  {
    scenario: "A homopolar motor is different from a conventional DC motor - it has no commutator.",
    question: "Why doesn't a homopolar motor need a commutator?",
    options: [
      { id: 'ac', label: "Because it uses AC power instead of DC" },
      { id: 'radial', label: "Because current flows in a constant radial direction, not through coils", correct: true },
      { id: 'switching', label: "Because the magnet provides all the switching" },
      { id: 'balanced', label: "Because the wire is perfectly balanced" }
    ],
    explanation: "A homopolar motor has current flowing in a constant radial direction (not in coils), so the torque direction never needs to reverse. No commutator is needed to switch current."
  },
  {
    scenario: "You're designing a homopolar motor for maximum torque.",
    question: "What geometry maximizes the torque at the point where current crosses the magnetic field?",
    options: [
      { id: 'parallel', label: "Current and magnetic field should be parallel" },
      { id: 'perpendicular', label: "Current and magnetic field should be perpendicular", correct: true },
      { id: 'spiral', label: "Current should spiral around the magnetic field" },
      { id: 'oscillate', label: "Current should oscillate back and forth" }
    ],
    explanation: "The Lorentz force F = I×B is maximum when I and B are perpendicular (90°). When parallel, the cross product is zero and there's no force."
  },
  {
    scenario: "Homopolar motors are rarely used in practical applications despite their simplicity.",
    question: "What is the main disadvantage of homopolar motors?",
    options: [
      { id: 'direction', label: "They can only spin in one direction" },
      { id: 'voltage', label: "They require very high voltages" },
      { id: 'efficiency', label: "They have low efficiency and require high currents for useful torque", correct: true },
      { id: 'magnets', label: "They only work with rare earth magnets" }
    ],
    explanation: "Homopolar motors have low efficiency because they require high currents to produce useful torque. The sliding contacts also cause energy losses. They're mainly used for special applications like welding."
  }
];

// Rich transfer phase applications (like Wave Particle Duality)
const realWorldApps = [
  {
    icon: '🚀',
    title: 'Electromagnetic Rail Guns',
    short: 'Lorentz force propulsion',
    tagline: 'Hypersonic Projectile Acceleration',
    description: 'Naval rail guns use the exact same Lorentz force principle as your homopolar motor. Instead of rotating a wire, they accelerate a projectile along parallel rails using massive currents.',
    connection: 'In your motor, F=BIL creates rotation. In a rail gun, the same force accelerates a projectile linearly. The current flows through the projectile between two rails, and the magnetic field from the rails provides the force.',
    howItWorks: 'Two parallel conducting rails carry enormous currents (millions of amps). A conductive armature completes the circuit. The Lorentz force accelerates it down the barrel at incredible speeds.',
    stats: [
      { value: 'Mach 6', label: 'Exit velocity', icon: '⚡' },
      { value: '100+ mi', label: 'Range achieved', icon: '🎯' },
      { value: '32 MJ', label: 'Energy per shot', icon: '💥' }
    ],
    examples: [
      'US Navy developed a 32-megajoule prototype capable of Mach 6 projectiles',
      'No explosives needed - pure electromagnetic acceleration',
      'Projectiles can pierce multiple steel plates from kinetic energy alone',
      'Future spacecraft could use similar technology for launches'
    ],
    companies: ['BAE Systems', 'General Atomics', 'US Navy Research Lab'],
    futureImpact: 'Rail guns could revolutionize naval warfare and eventually enable electromagnetic spacecraft launches without chemical rockets.',
    color: colors.error
  },
  {
    icon: '🏥',
    title: 'MRI Gradient Coils',
    short: 'Rapid field switching',
    tagline: 'Medical Imaging Revolution',
    description: 'MRI machines use homopolar motor principles in their gradient coils. These coils must switch magnetic field gradients rapidly to create detailed 3D images of your body.',
    connection: 'The Lorentz force that spins your motor wire also causes the loud banging sound in MRI machines. Gradient coils experience tremendous forces as currents switch thousands of times per second.',
    howItWorks: 'Gradient coils create small variations in the main magnetic field. The rapid current switching (using Lorentz force principles) allows spatial encoding of the MRI signal.',
    stats: [
      { value: '1000+', label: 'Switches per second', icon: '🔄' },
      { value: '3 Tesla', label: 'Field strength', icon: '🧲' },
      { value: '$40B', label: 'Global MRI market', icon: '📊' }
    ],
    examples: [
      'Gradient coils vibrate due to Lorentz forces - that\'s the MRI banging sound',
      'Faster gradient switching = higher resolution images',
      'Same F=BIL principle, but switching direction rapidly',
      'Cooling systems prevent overheating from resistive losses'
    ],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Canon Medical'],
    futureImpact: 'Advances in gradient coil technology are enabling faster, higher-resolution MRI scans with less patient discomfort.',
    color: colors.primary
  },
  {
    icon: '⚡',
    title: 'Homopolar Welding',
    short: 'Massive current pulses',
    tagline: 'Industrial Metal Joining',
    description: 'Homopolar generators store rotational energy and release it as enormous current pulses - perfect for welding applications that need millions of amps in milliseconds.',
    connection: 'Your homopolar motor converts electrical energy to rotation. Homopolar generators do the reverse - they convert rotation to electricity. The same Lorentz force principle works both ways!',
    howItWorks: 'A massive flywheel spins up, storing kinetic energy. When welding, the flywheel\'s energy is converted to a huge current pulse through the Lorentz force, joining metals instantly.',
    stats: [
      { value: '1M+ Amps', label: 'Peak current', icon: '⚡' },
      { value: '~10 ms', label: 'Pulse duration', icon: '⏱️' },
      { value: '500 MJ', label: 'Energy storage', icon: '🔋' }
    ],
    examples: [
      'Pipeline welding joins thick steel pipes in milliseconds',
      'Aircraft aluminum components welded without distortion',
      'Nuclear fuel rod assembly uses controlled pulse welding',
      'Automotive frame welding for electric vehicles'
    ],
    companies: ['Center for Electromechanics (UT Austin)', 'Magnaforce', 'Pulsed Power Labs'],
    futureImpact: 'Homopolar welding enables joining of dissimilar metals and materials that can\'t be welded by conventional methods.',
    color: colors.warning
  },
  {
    icon: '🔬',
    title: 'Faraday Disk Generator',
    short: 'Direct DC generation',
    tagline: 'The Original Homopolar Machine',
    description: 'Michael Faraday invented the homopolar generator in 1831 - the reverse of your motor. Spinning a disk in a magnetic field generates DC electricity directly, without AC conversion.',
    connection: 'Your motor uses current + magnetic field → rotation. Faraday\'s disk does the reverse: rotation + magnetic field → current. Both use F = qv×B, just in opposite directions.',
    howItWorks: 'A conducting disk rotates between magnet poles. Free electrons in the disk experience Lorentz force, creating a voltage between the center and edge. This produces pure DC current.',
    stats: [
      { value: '1831', label: 'Year invented', icon: '📅' },
      { value: '~1V', label: 'Per disk typical', icon: '🔌' },
      { value: '100kA', label: 'Current possible', icon: '⚡' }
    ],
    examples: [
      'First electromagnetic generator ever built by Faraday',
      'Produces DC directly - no rectification needed',
      'Used in some ship propulsion systems',
      'Studied for future space power generation'
    ],
    companies: ['Historical: Royal Institution', 'Modern: Research labs worldwide'],
    futureImpact: 'Understanding the Faraday disk is fundamental to all electromagnetic power generation - it\'s where our electrical age began.',
    color: colors.success
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

interface HomopolarMotorRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const HomopolarMotorRenderer: React.FC<HomopolarMotorRendererProps> = ({
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
  const [magnetStrength, setMagnetStrength] = useState(80);
  const [isRunning, setIsRunning] = useState(false);
  const [magnetPolarity, setMagnetPolarity] = useState<'north' | 'south'>('north');

  // Animation state
  const [wireAngle, setWireAngle] = useState(0);
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

  // Calculate rotation speed
  const rotationSpeed = useMemo(() => {
    if (!isRunning) return 0;
    const baseSpeed = (magnetStrength / 100) * 4;
    return magnetPolarity === 'north' ? baseSpeed : -baseSpeed;
  }, [isRunning, magnetStrength, magnetPolarity]);

  // Animation loop
  useEffect(() => {
    if (rotationSpeed !== 0) {
      const animate = () => {
        setWireAngle(prev => (prev + rotationSpeed) % 360);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rotationSpeed]);

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

  // ============================================================
  // MOTOR VISUALIZATION (Enhanced)
  // ============================================================

  const renderMotorVisualization = () => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 300 : 380;
    const cx = width / 2;
    const cy = height / 2 + 20;

    const wireRadius = isMobile ? 55 : 95;
    const angleRad = (wireAngle * Math.PI) / 180;

    // Force visualization
    const forceStrength = isRunning ? magnetStrength / 100 : 0;
    const forceDir = magnetPolarity === 'north' ? 1 : -1;

    // LEGEND ITEMS
    const legendItems = [
      { color: colors.error, label: 'North pole (N)' },
      { color: colors.primary, label: 'South pole (S)' },
      { color: colors.warning, label: 'Wire (carries current)' },
      { color: colors.success, label: 'Lorentz force (F)' },
    ];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '620px', margin: '0 auto' }}>
        {/* Legend */}
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
          <p style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>
            Legend
          </p>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: colors.textSecondary }}>{item.label}</span>
            </div>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
        <defs>
          {/* Battery gradient */}
          <linearGradient id="batteryBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Positive terminal */}
          <linearGradient id="posTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.warningLight} />
            <stop offset="100%" stopColor={colors.warning} />
          </linearGradient>

          {/* Magnet gradients */}
          <radialGradient id="magnetN" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={colors.errorLight} />
            <stop offset="100%" stopColor={colors.error} />
          </radialGradient>
          <radialGradient id="magnetS" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={colors.primaryLight} />
            <stop offset="100%" stopColor={colors.primary} />
          </radialGradient>

          {/* Copper gradient */}
          <linearGradient id="copper" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.warning} />
            <stop offset="50%" stopColor={colors.warningLight} />
            <stop offset="100%" stopColor={colors.warning} />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Field arrow marker */}
          <marker id="fieldArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,1 L0,7 L7,4 z" fill={magnetPolarity === 'north' ? colors.error : colors.primary} opacity="0.7" />
          </marker>

          {/* Force arrow marker */}
          <marker id="forceArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L0,10 L10,5 z" fill={colors.success} />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

        {/* Title */}
        <text x={cx} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
          Homopolar Motor
        </text>
        <text x={cx} y="48" textAnchor="middle" fill={colors.textMuted} fontSize={isMobile ? 11 : 13}>
          The simplest electric motor on Earth
        </text>

        {/* Magnetic field lines (radial) */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * Math.PI) / 4;
          const startR = isMobile ? 32 : 52;
          const endR = isMobile ? 85 : 135;
          return (
            <line
              key={`field-${i}`}
              x1={cx + startR * Math.cos(angle)}
              y1={cy + startR * Math.sin(angle)}
              x2={cx + endR * Math.cos(angle)}
              y2={cy + endR * Math.sin(angle)}
              stroke={magnetPolarity === 'north' ? colors.error : colors.primary}
              strokeWidth="2"
              strokeDasharray="6,4"
              opacity="0.4"
              markerEnd="url(#fieldArrow)"
            />
          );
        })}

        {/* AA Battery (vertical) */}
        <g transform={`translate(${cx}, ${cy - (isMobile ? 75 : 115)})`}>
          {/* Battery body */}
          <rect x="-18" y="0" width="36" height={isMobile ? 55 : 75} rx="5" fill="url(#batteryBody)" stroke={colors.border} strokeWidth="1.5" />

          {/* Positive terminal (bump) */}
          <rect x="-8" y="-10" width="16" height="12" rx="3" fill="url(#posTerminal)" />
          <text x="0" y="-14" textAnchor="middle" fill={colors.warningLight} fontSize="14" fontWeight="bold">+</text>

          {/* Battery label */}
          <text x="0" y={isMobile ? 32 : 42} textAnchor="middle" fill={colors.textSecondary} fontSize="10" fontWeight="bold">AA</text>
          <text x="0" y={isMobile ? 44 : 54} textAnchor="middle" fill={colors.textMuted} fontSize="8">1.5V</text>

          {/* Negative terminal */}
          <rect x="-14" y={isMobile ? 50 : 70} width="28" height="5" rx="2" fill={colors.bgCardLight} />
          <text x="0" y={isMobile ? 65 : 90} textAnchor="middle" fill={colors.textMuted} fontSize="10">−</text>
        </g>

        {/* Neodymium Magnet (disk) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={isMobile ? 28 : 48}
          ry={isMobile ? 12 : 18}
          fill={magnetPolarity === 'north' ? 'url(#magnetN)' : 'url(#magnetS)'}
          stroke={magnetPolarity === 'north' ? colors.errorLight : colors.primaryLight}
          strokeWidth="2"
        />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={isMobile ? 12 : 16} fontWeight="bold">
          {magnetPolarity === 'north' ? 'N' : 'S'}
        </text>

        {/* Copper Wire Loop (rotating) */}
        <g filter={isRunning ? 'url(#glow)' : undefined}>
          {/* Wire arc - top portion */}
          <path
            d={`M ${cx + wireRadius * Math.cos(angleRad)} ${cy - 25 + wireRadius * Math.sin(angleRad) * 0.3}
                Q ${cx} ${cy - (isMobile ? 55 : 85)} ${cx - wireRadius * Math.cos(angleRad)} ${cy - 25 - wireRadius * Math.sin(angleRad) * 0.3}
                L ${cx - wireRadius * Math.cos(angleRad)} ${cy + wireRadius * Math.sin(angleRad) * 0.3}
                Q ${cx} ${cy + (isMobile ? 18 : 25)} ${cx + wireRadius * Math.cos(angleRad)} ${cy - wireRadius * Math.sin(angleRad) * 0.3}
                Z`}
            fill="none"
            stroke="url(#copper)"
            strokeWidth={isMobile ? 5 : 8}
            strokeLinecap="round"
          />

          {/* Contact point sparks */}
          {isRunning && (
            <>
              <circle
                cx={cx + wireRadius * Math.cos(angleRad)}
                cy={cy + wireRadius * Math.sin(angleRad) * 0.3}
                r="5"
                fill={colors.warningLight}
                opacity={0.5 + 0.5 * Math.sin(wireAngle * 0.15)}
              />
              <circle
                cx={cx - wireRadius * Math.cos(angleRad)}
                cy={cy - wireRadius * Math.sin(angleRad) * 0.3}
                r="5"
                fill={colors.warningLight}
                opacity={0.5 + 0.5 * Math.cos(wireAngle * 0.15)}
              />
            </>
          )}
        </g>

        {/* Lorentz Force Arrow (when running) */}
        {isRunning && forceStrength > 0 && (
          <g>
            {/* Force vector on wire */}
            <line
              x1={cx + wireRadius * Math.cos(angleRad) * 0.7}
              y1={cy}
              x2={cx + wireRadius * Math.cos(angleRad) * 0.7 + 45 * forceDir * Math.sin(angleRad)}
              y2={cy - 45 * forceDir * Math.cos(angleRad)}
              stroke={colors.success}
              strokeWidth="3"
              markerEnd="url(#forceArrow)"
            />
            <text
              x={cx + wireRadius * Math.cos(angleRad) * 0.7 + 55 * forceDir * Math.sin(angleRad)}
              y={cy - 55 * forceDir * Math.cos(angleRad)}
              fill={colors.success}
              fontSize="14"
              fontWeight="bold"
            >
              F
            </text>
          </g>
        )}

        {/* Current direction indicator */}
        {isRunning && (
          <g transform={`translate(${width - (isMobile ? 75 : 100)}, ${isMobile ? 70 : 85})`}>
            <rect x="-35" y="-25" width="70" height="50" fill={colors.bgCard} rx="6" stroke={colors.border} />
            <text x="0" y="-8" textAnchor="middle" fill={colors.textMuted} fontSize="9">Current</text>
            <path
              d="M -15,10 L 15,10"
              stroke={colors.current}
              strokeWidth="3"
            />
            <polygon points="15,5 15,15 25,10" fill={colors.current} />
            <text x="0" y="25" textAnchor="middle" fill={colors.current} fontSize="11" fontWeight="bold">I</text>
          </g>
        )}

        {/* Info panel */}
        <g transform={`translate(${isMobile ? 15 : 25}, ${height - (isMobile ? 55 : 65)})`}>
          <rect x="0" y="0" width={isMobile ? 140 : 180} height={isMobile ? 45 : 55} fill={colors.bgCard} rx="8" stroke={colors.border} />
          <text x="10" y={isMobile ? 18 : 22} fill={colors.textSecondary} fontSize={isMobile ? 10 : 12} fontWeight="600">
            Lorentz Force
          </text>
          <text x="10" y={isMobile ? 34 : 42} fill={colors.primary} fontSize={isMobile ? 14 : 18} fontWeight="bold" fontFamily="monospace">
            F = B × I × L
          </text>
        </g>

        {/* Status panel */}
        {isRunning && (
          <g transform={`translate(${width - (isMobile ? 155 : 205)}, ${height - (isMobile ? 55 : 65)})`}>
            <rect x="0" y="0" width={isMobile ? 140 : 180} height={isMobile ? 45 : 55} fill={colors.bgCard} rx="8" stroke={colors.success} strokeWidth="1.5" />
            <text x="10" y={isMobile ? 18 : 22} fill={colors.success} fontSize={isMobile ? 10 : 12} fontWeight="600">
              Motor Running
            </text>
            <text x="10" y={isMobile ? 34 : 42} fill={colors.textPrimary} fontSize={isMobile ? 12 : 14}>
              {Math.abs(rotationSpeed * 60).toFixed(0)} RPM • {rotationSpeed > 0 ? 'CW' : 'CCW'}
            </text>
          </g>
        )}
      </svg>
      </div>
    );
  };

  // "What to Watch" callout
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
        <li>Watch the <strong style={{ color: colors.warning }}>wire</strong> spin when current flows</li>
        <li>The <strong style={{ color: colors.success }}>green arrow</strong> shows the Lorentz force (F = BIL)</li>
        <li>Try flipping the <strong style={{ color: colors.error }}>magnet polarity</strong> — the wire spins the opposite way!</li>
      </ul>
    </div>
  );

  // Formula breakdown
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
        F = B × I × L
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '12px' }}>
        <span style={{ color: colors.success, fontWeight: 700 }}>F</span>
        <span style={{ color: colors.textSecondary }}>Force on the wire (makes it spin)</span>
        <span style={{ color: colors.error, fontWeight: 700 }}>B</span>
        <span style={{ color: colors.textSecondary }}>Magnetic field strength (from the magnet)</span>
        <span style={{ color: colors.warning, fontWeight: 700 }}>I</span>
        <span style={{ color: colors.textSecondary }}>Current (what YOU control with slider)</span>
        <span style={{ color: colors.textMuted, fontWeight: 700 }}>L</span>
        <span style={{ color: colors.textSecondary }}>Length of wire in the field</span>
      </div>
    </div>
  );

  // ============================================================
  // RENDER FUNCTIONS (Phases)
  // ============================================================

  // CRITICAL: Bottom bar MUST use position: fixed to ALWAYS be visible
  const renderBottomBar = (showBack: boolean, showNext: boolean, nextLabel: string, nextAction?: () => void, nextColor?: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderTop: `1px solid ${colors.border}`,
      backgroundColor: colors.bgCard,
      boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
      minHeight: '72px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
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
          color: colors.textMuted,
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
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>🔋⚡🔄</div>
          <h1 style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
            The Simplest Motor on Earth
          </h1>
          <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 32px' }}>
            Can you build a motor with just a battery, a magnet, and a piece of wire?
            <br /><br />
            No coils. No commutator. No complex parts.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '40px',
            border: `1px solid ${colors.border}`,
            textAlign: 'left'
          }}>
            <p style={{ color: colors.textMuted, fontSize: '14px', fontStyle: 'italic', marginBottom: '12px' }}>
              "The homopolar motor demonstrates the fundamental connection between electricity and magnetism in its purest form."
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
              — Michael Faraday, inventor (1821)
            </p>
          </div>

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
              boxShadow: `0 8px 32px ${colors.primary}50`,
              minHeight: '52px'
            }}
          >
            Let's Build One →
          </button>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictions = [
      { id: 'nothing', label: 'Nothing happens - the wire stays still', icon: '🚫' },
      { id: 'spark', label: 'The wire sparks and heats up only', icon: '✨' },
      { id: 'spin', label: 'The wire spins continuously', icon: '🔄' },
      { id: 'jump', label: 'The wire jumps once then stops', icon: '⬆️' }
    ];

    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 1 • Make a Prediction
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
              What will happen?
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              If you attach a copper wire to a battery sitting on a strong magnet, what do you think will happen?
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
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
                  border: prediction === p.id ? `2px solid ${colors.primary}` : `2px solid ${colors.border}`,
                  backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
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

        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 2 • Run the Experiment
            </p>
            <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
              Build Your Homopolar Motor
            </h2>
          </div>

          {renderMotorVisualization()}

          {/* Controls */}
          <div style={{ maxWidth: '500px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600 }}>Magnet Strength</span>
                <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 700 }}>{magnetStrength}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={magnetStrength}
                onChange={(e) => setMagnetStrength(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.primary }}
              />
            </div>

            <button
              onMouseDown={() => {
                setIsRunning(!isRunning);
                playSound(isRunning ? 'click' : 'success');
                emitGameEvent(isRunning ? 'motor_stopped' : 'motor_started', { magnetStrength });
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '16px',
                backgroundColor: isRunning ? colors.error : colors.success,
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isRunning ? '⏹ Stop Motor' : '▶ Start Motor'}
            </button>
          </div>

          {isRunning && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.success, fontSize: '16px', fontWeight: 600 }}>
                The wire spins continuously! The Lorentz force creates constant torque.
              </p>
            </div>
          )}
        </div>

        {renderBottomBar(true, isRunning, 'Understand Why →', () => goToPhase('review'), colors.success)}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 3 • Understanding
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary }}>
              Why Does It Spin?
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* What happened */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>What Happened</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                When current flows through the wire in the magnetic field, each part of the wire experiences a <strong style={{ color: colors.textPrimary }}>Lorentz force</strong> (F = BIL).
                Because current is <em>radial</em> and the magnetic field is <em>axial</em>, the force is always <em>tangential</em> — creating continuous rotation.
              </p>
            </div>

            {/* Why it works */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
              <h3 style={{ color: colors.success, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Why No Commutator?</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                Unlike conventional motors, the current direction relative to the magnetic field <strong style={{ color: colors.textPrimary }}>never changes</strong>.
                The wire rotates, but current always flows radially. This means the torque direction is constant — no switching needed!
              </p>
            </div>

            {/* Key formula */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
              <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Lorentz Force</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '32px', fontFamily: 'monospace', color: colors.textPrimary, fontWeight: 700 }}>
                  F = B × I × L
                </div>
                <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                  <div>B = Magnetic field strength</div>
                  <div>I = Current through wire</div>
                  <div>L = Length of wire in field</div>
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
      { id: 'stop', label: 'The motor will stop completely', icon: '⏹' },
      { id: 'faster', label: 'The motor will spin faster', icon: '⚡' },
      { id: 'reverse', label: 'The motor will spin in the opposite direction', icon: '🔄' },
      { id: 'same', label: 'Nothing will change', icon: '➡️' }
    ];

    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 4 • New Variable
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
              Flip the Magnet!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
              What happens if you flip the magnet so the opposite pole faces up?
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

        {renderBottomBar(true, !!twistPrediction, 'Test It →', () => goToPhase('twist_play'), colors.warning)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 5 • Observer Effect
            </p>
            <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
              Flip the Magnet Polarity
            </h2>
          </div>

          {renderMotorVisualization()}

          {/* Controls */}
          <div style={{ maxWidth: '500px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
                Magnet Polarity (Facing Up)
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onMouseDown={() => {
                    setMagnetPolarity('north');
                    playSound('click');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: magnetPolarity === 'north' ? colors.error : colors.bgCardLight,
                    color: magnetPolarity === 'north' ? 'white' : colors.textSecondary,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  North (N)
                </button>
                <button
                  onMouseDown={() => {
                    setMagnetPolarity('south');
                    playSound('click');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: magnetPolarity === 'south' ? colors.primary : colors.bgCardLight,
                    color: magnetPolarity === 'south' ? 'white' : colors.textSecondary,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  South (S)
                </button>
              </div>
            </div>

            <button
              onMouseDown={() => {
                setIsRunning(!isRunning);
                playSound(isRunning ? 'click' : 'success');
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '16px',
                backgroundColor: isRunning ? colors.error : colors.success,
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isRunning ? '⏹ Stop Motor' : '▶ Start Motor'}
            </button>
          </div>

          {isRunning && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '16px', fontWeight: 600 }}>
                Direction: {rotationSpeed > 0 ? 'Clockwise' : 'Counter-clockwise'} — Flipping the magnet reverses it!
              </p>
            </div>
          )}
        </div>

        {renderBottomBar(true, isRunning, 'See Why →', () => goToPhase('twist_review'), colors.warning)}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 6 • Deep Insight
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary }}>
              Reversing the Field
            </h2>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.accent}`, marginBottom: '24px' }}>
            <h3 style={{ color: colors.accent, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Cross Product Reveals All</h3>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: '16px' }}>
              The Lorentz force is a <strong style={{ color: colors.textPrimary }}>cross product</strong>: F = I × B
            </p>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              When you flip the magnet, B reverses direction. The cross product means the force direction also reverses —
              so the motor spins the opposite way!
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
            <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Two Ways to Reverse</h3>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              You can reverse a homopolar motor by:
            </p>
            <ul style={{ color: colors.textSecondary, marginTop: '12px', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Flipping the <strong style={{ color: colors.error }}>magnet</strong> (reverses B)</li>
              <li>Flipping the <strong style={{ color: colors.warning }}>battery</strong> (reverses I)</li>
            </ul>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '16px', fontStyle: 'italic' }}>
              Both change the cross product direction. This is how we control motor direction in real applications!
            </p>
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

      // Auto-advance to next app
      if (selectedApp < 3) {
        setTimeout(() => setSelectedApp(selectedApp + 1), 500);
      }
    };

    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgCard }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>
                Step 7 • Real World Applications
              </p>
              <p style={{ fontSize: '12px', marginTop: '4px', color: colors.textMuted }}>
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
                    playSound('click');
                  }}
                  disabled={isLocked}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: isCurrent ? `2px solid ${app.color}` : `1px solid ${colors.border}`,
                    backgroundColor: isCurrent ? `${app.color}20` : isCompleted ? `${colors.success}15` : colors.bgCardLight,
                    color: isLocked ? colors.textMuted : colors.textPrimary,
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

        {/* App content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* App header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '56px' }}>{currentApp.icon}</span>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: colors.textPrimary, marginTop: '12px' }}>
                {currentApp.title}
              </h2>
              <p style={{ color: currentApp.color, fontSize: '16px', fontWeight: 600 }}>{currentApp.tagline}</p>
            </div>

            {/* Description */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${currentApp.color}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.7 }}>
                {currentApp.description}
              </p>
            </div>

            {/* Connection to motor */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                🔗 Connection to Your Motor
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                {currentApp.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                ⚙️ How It Works
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                {currentApp.howItWorks}
              </p>
            </div>

            {/* Stats */}
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
                  <div style={{ color: currentApp.color, fontSize: '20px', fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
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

            {/* Future impact */}
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          gap: '12px'
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
                fontSize: '15px',
                background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${currentApp.color}40`
              }}
            >
              {selectedApp < 3 ? '✓ Complete & Continue →' : '✓ Complete Final Topic'}
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
                fontSize: '15px',
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
    const answered = testAnswers.filter(a => a !== null).length;

    if (testSubmitted) {
      const passed = score >= 7;
      return (
        <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🎉' : '📚'}</div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: colors.textPrimary, marginBottom: '12px' }}>
            {passed ? 'Congratulations!' : 'Keep Learning!'}
          </h2>
          <div style={{ fontSize: '64px', fontWeight: 800, color: passed ? colors.success : colors.warning, marginBottom: '24px' }}>
            {score}/10
          </div>
          <p style={{ color: colors.textSecondary, fontSize: '18px', textAlign: 'center', maxWidth: '500px', marginBottom: '32px' }}>
            {passed
              ? 'You have mastered the homopolar motor! You understand the Lorentz force and its applications.'
              : 'You need 7/10 to pass. Review the lesson and try again.'}
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            {!passed && (
              <button
                onMouseDown={() => {
                  setPhase('hook');
                  setTestQuestion(0);
                  setTestAnswers(Array(10).fill(null));
                  setTestSubmitted(false);
                  setCompletedApps([false, false, false, false]);
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
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '30px 20px' }}>
          {/* Progress */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                Knowledge Test
              </span>
              <span style={{ color: colors.textMuted, fontSize: '14px' }}>
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

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = testAnswers[testQuestion] === opt.id;
              const isAnswered = testAnswers[testQuestion] !== null;
              const isCorrect = opt.correct;

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
                    border: isSelected
                      ? `2px solid ${isCorrect ? colors.success : colors.error}`
                      : `2px solid ${colors.border}`,
                    backgroundColor: isSelected
                      ? isCorrect ? `${colors.success}20` : `${colors.error}20`
                      : isAnswered && isCorrect
                        ? `${colors.success}10`
                        : colors.bgCard,
                    cursor: isAnswered ? 'default' : 'pointer',
                    textAlign: 'left',
                    opacity: isAnswered && !isSelected && !isCorrect ? 0.5 : 1
                  }}
                >
                  <span style={{
                    fontWeight: 700,
                    color: isSelected
                      ? isCorrect ? colors.success : colors.error
                      : colors.primary,
                    marginRight: '12px'
                  }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span style={{ color: colors.textPrimary }}>{opt.label}</span>
                  {isAnswered && isCorrect && <span style={{ marginLeft: '8px' }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {testAnswers[testQuestion] !== null && (
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginTop: '20px', borderLeft: `4px solid ${colors.warning}` }}>
              <h4 style={{ color: colors.warning, fontWeight: 700, marginBottom: '8px' }}>Explanation</h4>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>{currentQ.explanation}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard
        }}>
          <button
            onMouseDown={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
            disabled={testQuestion === 0}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              backgroundColor: colors.bgCardLight,
              color: testQuestion === 0 ? colors.textMuted : colors.textSecondary,
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
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '100px', marginBottom: '24px' }}>🏆</div>
        <h1 style={{ fontSize: '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
          Mastery Achieved!
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '18px', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
          You now understand the homopolar motor — the simplest demonstration of how electricity and magnetism combine to create motion.
          The Lorentz force F = BIL powers everything from rail guns to MRI machines!
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
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
              boxShadow: `0 8px 32px ${colors.primary}50`,
              minHeight: '52px'
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

export default HomopolarMotorRenderer;
