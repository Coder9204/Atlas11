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
import TransferPhaseView from './TransferPhaseView';

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
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

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
    scenario: "A homopolar motor is built with an AA battery (1.5 V), a strong neodymium magnet, and a copper wire loop. When the wire completes the circuit from the positive terminal of the battery through the magnet to the negative terminal, current flows and the wire begins to rotate.",
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
      { value: '2300 m/s', label: 'Exit velocity (Mach 6)', icon: '⚡' },
      { value: '160 km', label: 'Range achieved', icon: '🎯' },
      { value: '32 million J', label: 'Energy per shot', icon: '💥' }
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

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

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

    // Force visualization - magnetStrength affects visual even when not running
    const forceStrength = magnetStrength / 100;
    const forceDir = magnetPolarity === 'north' ? 1 : -1;

    // LEGEND ITEMS
    const legendItems = [
      { color: '#fbbf24', label: 'AA Battery (1.5V)' },
      { color: colors.error, label: 'Magnet N pole (red)' },
      { color: colors.primary, label: 'Magnet S pole (blue)' },
      { color: colors.warning, label: 'Copper wire' },
      { color: colors.success, label: 'Force direction (F)' },
      { color: '#a855f7', label: 'Magnetic field (B)' },
    ];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '620px', margin: '0 auto' }}>
        {/* Title - moved outside SVG using typo system */}
        <div style={{ textAlign: 'center', marginBottom: typo.elementGap }}>
          <h3 style={{
            fontSize: typo.heading,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0
          }}>
            Homopolar Motor
          </h3>
          <p style={{
            fontSize: typo.small,
            color: colors.textSecondary,
            margin: `4px 0 0 0`
          }}>
            The simplest electric motor on Earth
          </p>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          top: isMobile ? '48px' : '56px',
          right: isMobile ? '8px' : '12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: isMobile ? '8px' : '12px',
          border: `1px solid ${colors.border}`,
          zIndex: 10
        }}>
          <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>
            Legend
          </p>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Info panels - moved outside SVG */}
        <div style={{
          position: 'absolute',
          bottom: isMobile ? '8px' : '12px',
          left: isMobile ? '8px' : '12px',
          background: colors.bgCard,
          borderRadius: '8px',
          padding: isMobile ? '8px 12px' : '10px 14px',
          border: `1px solid ${colors.border}`,
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <p style={{ fontSize: typo.label, color: colors.textSecondary, fontWeight: 600, margin: 0 }}>
            Lorentz Force
          </p>
          <p style={{ fontSize: typo.bodyLarge, color: colors.primary, fontWeight: 700, fontFamily: 'monospace', margin: '2px 0 0 0' }}>
            F = B x I x L
          </p>
        </div>

        {/* Status panel - moved outside SVG */}
        {isRunning && (
          <div style={{
            position: 'absolute',
            bottom: isMobile ? '8px' : '12px',
            right: isMobile ? '8px' : '12px',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: isMobile ? '8px 12px' : '10px 14px',
            border: `1.5px solid ${colors.success}`,
            zIndex: 10
          }}>
            <p style={{ fontSize: typo.label, color: colors.success, fontWeight: 600, margin: 0 }}>
              Motor Running
            </p>
            <p style={{ fontSize: typo.body, color: colors.textPrimary, margin: '2px 0 0 0' }}>
              {Math.abs(rotationSpeed * 60).toFixed(0)} RPM {rotationSpeed > 0 ? 'CW' : 'CCW'}
            </p>
          </div>
        )}

        {/* Current indicator label - moved outside SVG */}
        {isRunning && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '48px' : '56px',
            left: isMobile ? '8px' : '12px',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: isMobile ? '6px 10px' : '8px 12px',
            border: `1px solid ${colors.border}`,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: typo.label, color: colors.current, fontWeight: 600 }}>
              Current
            </span>
            <span style={{ fontSize: typo.bodyLarge, color: colors.current, fontWeight: 700 }}>
              I
            </span>
            <svg width="24" height="12" viewBox="0 0 24 12">
              <defs>
                <marker id="homoCurrentArrowSmall" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill={colors.current} />
                </marker>
              </defs>
              <line x1="0" y1="6" x2="18" y2="6" stroke={colors.current} strokeWidth="2" markerEnd="url(#homoCurrentArrowSmall)" />
            </svg>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
        <defs>
          {/* === PREMIUM BATTERY GRADIENTS === */}
          {/* Battery body - metallic gray with depth */}
          <linearGradient id="homoBatteryBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="20%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="80%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Battery body highlight */}
          <linearGradient id="homoBatteryHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#64748b" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#475569" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
          </linearGradient>

          {/* Positive terminal - golden metallic */}
          <linearGradient id="homoPosTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="25%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Negative terminal - brushed metal */}
          <linearGradient id="homoNegTerminal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="25%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="75%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* === PREMIUM MAGNET GRADIENTS === */}
          {/* North pole - rich red with metallic sheen */}
          <radialGradient id="homoMagnetN" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="25%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="75%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>

          {/* South pole - deep blue with depth */}
          <radialGradient id="homoMagnetS" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="25%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>

          {/* Magnet edge highlight */}
          <linearGradient id="homoMagnetEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="black" stopOpacity="0.2" />
          </linearGradient>

          {/* === PREMIUM COPPER WIRE GRADIENT === */}
          {/* Copper wire - realistic metallic copper */}
          <linearGradient id="homoCopper" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="20%" stopColor="#d97706" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Copper wire glow when running */}
          <radialGradient id="homoCopperGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>

          {/* === PREMIUM GLOW FILTERS === */}
          {/* Wire glow when motor is running */}
          <filter id="homoWireGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Spark glow at contact points */}
          <filter id="homoSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Force arrow glow */}
          <filter id="homoForceGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Magnetic field line glow */}
          <filter id="homoFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* === ARROW MARKERS === */}
          {/* Field arrow marker with glow */}
          <marker id="homoFieldArrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
            <path d="M0,1 L0,9 L9,5 z" fill={magnetPolarity === 'north' ? colors.error : colors.primary} opacity="0.8" />
          </marker>

          {/* Force arrow marker - premium green */}
          <marker id="homoForceArrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
            <path d="M0,0 L0,12 L12,6 z" fill={colors.success} />
          </marker>

          {/* Current arrow marker */}
          <marker id="homoCurrentArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L0,8 L8,4 z" fill={colors.current} />
          </marker>

          {/* === BACKGROUND GRADIENT === */}
          <linearGradient id="homoLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Subtle grid pattern */}
          <pattern id="homoGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Premium background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#homoLabBg)" rx="12" />
        <rect x="0" y="0" width={width} height={height} fill="url(#homoGrid)" rx="12" />

        {/* Magnetic field lines (radial) with glow */}
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
              opacity="0.5"
              filter="url(#homoFieldGlow)"
              markerEnd="url(#homoFieldArrow)"
            />
          );
        })}

        {/* AA Battery (vertical) - Premium design */}
        <g transform={`translate(${cx}, ${cy - (isMobile ? 75 : 115)})`}>
          {/* Battery body with metallic gradient */}
          <rect x="-18" y="0" width="36" height={isMobile ? 55 : 75} rx="5" fill="url(#homoBatteryBody)" />
          {/* Highlight overlay */}
          <rect x="-18" y="0" width="36" height={isMobile ? 55 : 75} rx="5" fill="url(#homoBatteryHighlight)" />
          {/* Edge detail */}
          <rect x="-18" y="0" width="36" height={isMobile ? 55 : 75} rx="5" fill="none" stroke={colors.border} strokeWidth="1" />

          {/* Positive terminal (bump) - golden */}
          <rect x="-8" y="-10" width="16" height="12" rx="3" fill="url(#homoPosTerminal)" />
          {/* Terminal highlight */}
          <rect x="-6" y="-9" width="4" height="8" rx="1" fill="white" opacity="0.2" />

          {/* Battery label band */}
          <rect x="-16" y={isMobile ? 20 : 28} width="32" height={isMobile ? 28 : 36} fill="#1e293b" />
          <rect x="-16" y={isMobile ? 20 : 28} width="32" height="2" fill="#374151" />

          {/* Negative terminal - brushed metal */}
          <rect x="-14" y={isMobile ? 50 : 70} width="28" height="5" rx="2" fill="url(#homoNegTerminal)" />
        </g>

        {/* Neodymium Magnet (disk) - Premium 3D effect */}
        {/* Magnet shadow */}
        <ellipse
          cx={cx + 3}
          cy={cy + 4}
          rx={isMobile ? 28 : 48}
          ry={isMobile ? 12 : 18}
          fill="black"
          opacity="0.3"
        />
        {/* Main magnet body */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={isMobile ? 28 : 48}
          ry={isMobile ? 12 : 18}
          fill={magnetPolarity === 'north' ? 'url(#homoMagnetN)' : 'url(#homoMagnetS)'}
        />
        {/* Magnet edge highlight */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={isMobile ? 28 : 48}
          ry={isMobile ? 12 : 18}
          fill="url(#homoMagnetEdge)"
          opacity="0.5"
        />
        {/* Magnet stroke */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={isMobile ? 28 : 48}
          ry={isMobile ? 12 : 18}
          fill="none"
          stroke={magnetPolarity === 'north' ? '#fca5a5' : '#93c5fd'}
          strokeWidth="1.5"
        />

        {/* Copper Wire Loop (rotating) - Premium copper */}
        <g filter={isRunning ? 'url(#homoWireGlow)' : undefined}>
          {/* Wire arc - with premium copper gradient */}
          <path
            d={`M ${cx + wireRadius * Math.cos(angleRad)} ${cy - 25 + wireRadius * Math.sin(angleRad) * 0.3}
                Q ${cx} ${cy - (isMobile ? 55 : 85)} ${cx - wireRadius * Math.cos(angleRad)} ${cy - 25 - wireRadius * Math.sin(angleRad) * 0.3}
                C ${cx - wireRadius * Math.cos(angleRad)} ${cy - 15 - wireRadius * Math.sin(angleRad) * 0.3} ${cx - wireRadius * Math.cos(angleRad)} ${cy + wireRadius * Math.sin(angleRad) * 0.15} ${cx - wireRadius * Math.cos(angleRad)} ${cy + wireRadius * Math.sin(angleRad) * 0.3}
                Q ${cx} ${cy + (isMobile ? 18 : 25)} ${cx + wireRadius * Math.cos(angleRad)} ${cy - wireRadius * Math.sin(angleRad) * 0.3}
                Z`}
            fill="none"
            stroke="url(#homoCopper)"
            strokeWidth={isMobile ? 5 : 8}
            strokeLinecap="round"
          />

          {/* Rotation motion lines when running */}
          {isRunning && (
            <>
              {/* Motion trail arcs */}
              {[1, 2, 3].map((i) => {
                const trailAngle = angleRad - (i * 0.15 * forceDir);
                return (
                  <path
                    key={`trail-${i}`}
                    d={`M ${cx + wireRadius * 0.9 * Math.cos(trailAngle)} ${cy + wireRadius * 0.3 * Math.sin(trailAngle)}
                        A ${wireRadius * 0.9} ${wireRadius * 0.3} 0 0 ${forceDir > 0 ? 1 : 0}
                        ${cx + wireRadius * 0.9 * Math.cos(trailAngle + 0.3 * forceDir)} ${cy + wireRadius * 0.3 * Math.sin(trailAngle + 0.3 * forceDir)}`}
                    fill="none"
                    stroke={colors.warning}
                    strokeWidth="2"
                    opacity={0.3 - i * 0.08}
                    strokeDasharray="4,4"
                  />
                );
              })}
            </>
          )}

          {/* Contact point sparks with enhanced glow */}
          {isRunning && (
            <>
              <g filter="url(#homoSparkGlow)">
                <circle
                  cx={cx + wireRadius * Math.cos(angleRad)}
                  cy={cy + wireRadius * Math.sin(angleRad) * 0.3}
                  r="6"
                  fill="url(#homoCopperGlow)"
                  opacity={0.6 + 0.4 * Math.sin(wireAngle * 0.15)}
                />
                <circle
                  cx={cx + wireRadius * Math.cos(angleRad)}
                  cy={cy + wireRadius * Math.sin(angleRad) * 0.3}
                  r="3"
                  fill="#fef3c7"
                />
              </g>
              <g filter="url(#homoSparkGlow)">
                <circle
                  cx={cx - wireRadius * Math.cos(angleRad)}
                  cy={cy - wireRadius * Math.sin(angleRad) * 0.3}
                  r="6"
                  fill="url(#homoCopperGlow)"
                  opacity={0.6 + 0.4 * Math.cos(wireAngle * 0.15)}
                />
                <circle
                  cx={cx - wireRadius * Math.cos(angleRad)}
                  cy={cy - wireRadius * Math.sin(angleRad) * 0.3}
                  r="3"
                  fill="#fef3c7"
                />
              </g>
            </>
          )}
        </g>

        {/* Lorentz Force Arrow (when running) - Premium with glow */}
        {isRunning && forceStrength > 0 && (
          <g filter="url(#homoForceGlow)">
            {/* Force vector on wire */}
            <line
              x1={cx + wireRadius * Math.cos(angleRad) * 0.7}
              y1={cy}
              x2={cx + wireRadius * Math.cos(angleRad) * 0.7 + 45 * forceDir * Math.sin(angleRad)}
              y2={cy - 45 * forceDir * Math.cos(angleRad)}
              stroke={colors.success}
              strokeWidth="3"
              markerEnd="url(#homoForceArrow)"
            />
          </g>
        )}

        {/* Current direction indicator - Premium design */}
        {isRunning && (
          <g transform={`translate(${width - (isMobile ? 65 : 90)}, ${isMobile ? 60 : 75})`}>
            <rect x="-30" y="-22" width="60" height="44" fill={colors.bgCard} rx="6" stroke={colors.border} opacity="0.95" />
            <path
              d="M -12,5 L 12,5"
              stroke={colors.current}
              strokeWidth="3"
              markerEnd="url(#homoCurrentArrow)"
            />
          </g>
        )}

        {/* SVG Text Labels for educational clarity */}
        <text x={cx} y={isMobile ? 18 : 22} textAnchor="middle" fontSize={isMobile ? 11 : 13} fill={colors.textSecondary} fontWeight="600">Homopolar Motor</text>
        <text x={cx} y={cy + (isMobile ? 32 : 50)} textAnchor="middle" fontSize={isMobile ? 11 : 12} fill={colors.copper}>Copper Wire (I)</text>
        <text x={cx} y={cy - (isMobile ? 18 : 28)} textAnchor="middle" fontSize={isMobile ? 11 : 12} fill={magnetPolarity === 'north' ? colors.magnetNorth : colors.magnetSouth}>
          Magnet ({magnetPolarity === 'north' ? 'N' : 'S'})
        </text>
        <text x={isMobile ? 28 : 40} y={cy - (isMobile ? 55 : 90)} textAnchor="middle" fontSize={isMobile ? 11 : 12} fill={colors.textSecondary}>Battery (+)</text>
        <text x={cx + (isMobile ? 60 : 100)} y={cy + (isMobile ? 55 : 85)} textAnchor="middle" fontSize={isMobile ? 11 : 12} fill={colors.success}>F = BIL</text>

        {/* Mini Force vs Field chart - bottom left corner */}
        {(() => {
          const chartX = isMobile ? 10 : 14;
          const chartY = height - (isMobile ? 105 : 130);
          const chartW = isMobile ? 90 : 120;
          const chartH = isMobile ? 80 : 100;
          const numPts = 20;
          // Build path with 20 M/L points showing F = B*I*L (linear)
          const pts = Array.from({ length: numPts }, (_, i) => {
            const bFrac = i / (numPts - 1);
            const px = chartX + bFrac * chartW;
            const py = chartY + chartH - bFrac * chartH; // top = high force
            return i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : `L ${px.toFixed(1)} ${py.toFixed(1)}`;
          }).join(' ');
          // Current operating point
          const bFrac = (magnetStrength - 20) / 80;
          const dotX = chartX + bFrac * chartW;
          const dotY = chartY + chartH - bFrac * chartH;
          return (
            <g>
              {/* Chart background */}
              <rect x={chartX - 4} y={chartY - 16} width={chartW + 22} height={chartH + 28} fill="rgba(15,23,42,0.85)" rx="4" stroke={colors.border} strokeWidth="0.5" />
              {/* Axis lines */}
              <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke={colors.border} strokeWidth="1" />
              <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke={colors.border} strokeWidth="1" />
              {/* Data curve */}
              <path d={pts} fill="none" stroke={colors.success} strokeWidth="1.5" opacity="0.7" />
              {/* Current value marker */}
              <circle cx={dotX} cy={dotY} r="5" fill={colors.success} filter="url(#homoForceGlow)" />
              {/* Axis labels - fontSize >= 11 */}
              <text x={chartX + chartW / 2} y={chartY + chartH + 14} textAnchor="middle" fontSize="11" fill={colors.textMuted}>Field B</text>
              <text x={chartX - 10} y={chartY + chartH / 2} textAnchor="middle" fontSize="11" fill={colors.textMuted} transform={`rotate(-90, ${chartX - 10}, ${chartY + chartH / 2})`}>Force</text>
              {/* Chart title */}
              <text x={chartX + chartW / 2} y={chartY - 4} textAnchor="middle" fontSize="11" fill={colors.textMuted}>F vs B</text>
            </g>
          );
        })()}
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
        <span style={{ color: '#a855f7', fontWeight: 700 }}>L</span>
        <span style={{ color: colors.textSecondary }}>Length of wire in the field</span>
      </div>
    </div>
  );

  // ============================================================
  // RENDER FUNCTIONS (Phases)
  // ============================================================

  // TOP NAVIGATION BAR - fixed position with dots and progress bar
  const renderTopNavBar = () => {
    const currentIdx = validPhases.indexOf(phase);
    const progress = ((currentIdx + 1) / validPhases.length) * 100;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        padding: '12px 16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: '4px',
            backgroundColor: colors.bgCardLight,
            borderRadius: '2px',
            marginBottom: '10px',
            overflow: 'hidden'
          }}
        >
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: colors.primary,
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {validPhases.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={`Go to ${p.replace('_', ' ')} phase`}
              title={p.replace('_', ' ')}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: i === currentIdx
                  ? colors.primary
                  : i < currentIdx
                    ? colors.success
                    : colors.bgCardLight,
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // CRITICAL: Bottom bar MUST use position: fixed to ALWAYS be visible
  const renderBottomBar = (showBack: boolean, showNext: boolean, nextLabel: string, nextAction?: () => void, nextColor?: string) => (
    <div style={{
      position: 'sticky',
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
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      minHeight: '72px'
    }}>
      {showBack ? (
        <button
          onPointerDown={() => {
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
            minHeight: '44px'
          }}
        >
          ← Back
        </button>
      ) : <div />}

      {showNext ? (
        <button
          onPointerDown={nextAction || (() => {
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
            minHeight: '44px',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px 60px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>🔋⚡🔄</div>
          <h1 style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
            The Simplest Motor on Earth
          </h1>
          <p style={{ fontSize: isMobile ? '16px' : '20px', color: '#e2e8f0', marginBottom: '32px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 32px', fontWeight: 400 }}>
            Can you build a motor with just a battery, a magnet, and a piece of wire?
            <br /><br />
            No coils. No commutator. No complex parts.
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.7)', margin: '0 auto 20px', maxWidth: '500px', fontWeight: 400 }}>
            Discover the Lorentz force — the same principle behind MRI machines, rail guns, and industrial generators.
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
              "The homopolar motor demonstrates the fundamental connection between electricity and magnetism in its purest form."
            </p>
            <p style={{ color: '#e2e8f0', fontSize: '13px' }}>
              — Michael Faraday, inventor (1821)
            </p>
          </div>

          <button
            onPointerDown={() => goToPhase('predict')}
            onClick={() => goToPhase('predict')}
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
              minHeight: '44px'
            }}
          >
            Start Exploring →
          </button>
        </div>
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
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {renderTopNavBar()}
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
          paddingTop: '60px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 700 }}>Step 1 of 4</span>
              <span style={{ color: '#e2e8f0', fontSize: '14px' }}>|</span>
              <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Predict Phase</span>
            </div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 • Make a Prediction
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Homopolar Motor Setup
              </h2>
            </div>

            {/* STATIC GRAPHIC - No controls, just the visualization */}
            <div style={{
              width: '100%',
              maxWidth: '600px',
              margin: '0 auto 20px auto',
              aspectRatio: '16/10',
              background: colors.bgCard,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden'
            }}>
              {renderMotorVisualization()}
            </div>

            {/* What You're Looking At */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                📋 What You're Looking At:
              </h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                This is a <strong style={{ color: colors.warning }}>homopolar motor</strong> — an AA battery sitting on a neodymium magnet,
                with a copper wire touching both the battery's positive terminal and the magnet's edge.
                The <span style={{ color: colors.error }}>red</span>/<span style={{ color: colors.primary }}>blue</span> areas show the magnet's poles.
                The <span style={{ color: '#a855f7' }}>purple arrows</span> show the magnetic field direction.
              </p>
            </div>

            {/* Prediction Question */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 What do you think will happen when current flows?
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button
                    key={p.id}
                    onPointerDown={() => {
                      setPrediction(p.id);
                      playSound('click');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px' }}>{p.label}</span>
                    {prediction === p.id && (
                      <span style={{ marginLeft: 'auto', color: colors.primary, fontSize: '18px' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional "Why?" question - shown after selection */}
            {prediction && (
              <div style={{
                background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.primary}30`
              }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>
                  💭 Why do you think this will happen? <span style={{ color: colors.textMuted }}>(Optional)</span>
                </p>
                <textarea
                  placeholder="Share your reasoning... (skip if you prefer)"
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom bar */}
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {renderTopNavBar()}
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
          paddingTop: '60px'
        }}>
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 2 • Run the Experiment
              </p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
                Build Your Homopolar Motor
              </h2>
            </div>

            {/* Observation guidance */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
              border: `1px solid ${colors.primary}30`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              maxWidth: '600px',
              margin: '0 auto 16px'
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
                <strong style={{ color: colors.primary }}>Observe:</strong> Watch how the wire rotates when current flows. Notice the relationship between magnet strength (B) and rotation speed.
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
            {/* Responsive graphic container */}
            <div style={{
              width: '100%',
              margin: '0 auto'
            }}>
              {renderMotorVisualization()}
            </div>

          {isRunning && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.success, fontSize: '16px', fontWeight: 600 }}>
                The wire spins continuously! The Lorentz force creates constant torque.
              </p>
            </div>
          )}
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <label htmlFor="magnet-strength-slider" style={{ display: 'block', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>Magnetic Field Strength (B)</span>
                  <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 700 }}>{magnetStrength}%</span>
                </div>
                <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Controls the force on the wire (F = B × I × L)</span>
              </label>
              <input
                id="magnet-strength-slider"
                type="range"
                min="20"
                max="100"
                value={magnetStrength}
                onChange={(e) => setMagnetStrength(Number(e.target.value))}
                aria-label="Magnetic field strength B"
                style={{ width: '100%', accentColor: colors.primary, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                <span>Weak (20%)</span>
                <span>Strong (100%)</span>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '8px 0 0 0', fontWeight: 400 }}>
                Higher B causes stronger Lorentz force F = B×I×L, which results in faster wire rotation
              </p>
            </div>

            <button
              onPointerDown={() => {
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
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              {isRunning ? '⏹ Stop Motor' : '▶ Start Motor'}
            </button>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginTop: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <h4 style={{ color: colors.primary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
              Real-World Connection
            </h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              This same Lorentz force principle powers electromagnetic rail guns that accelerate projectiles to Mach 6,
              MRI gradient coils that create medical images, and industrial welding systems that join metals in milliseconds.
            </p>
          </div>
            </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom bar */}
        {renderBottomBar(true, isRunning, 'Understand Why →', () => goToPhase('review'), colors.success)}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionLabels: Record<string, string> = {
      nothing: 'the wire stays still',
      spark: 'the wire sparks and heats up',
      spin: 'the wire spins continuously',
      jump: 'the wire jumps once then stops'
    };
    const userPredictionLabel = prediction ? predictionLabels[prediction] : null;
    const wasCorrect = prediction === 'spin';

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {renderTopNavBar()}
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
          paddingTop: '60px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 3 • Understanding
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary }}>
              Why Does It Spin?
            </h2>
          </div>

          {/* User's prediction reference */}
          {userPredictionLabel && (
            <div style={{
              background: wasCorrect ? `${colors.success}15` : `${colors.warning}15`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${wasCorrect ? colors.success : colors.warning}40`
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                <strong style={{ color: wasCorrect ? colors.success : colors.warning }}>
                  {wasCorrect ? '✓ Great prediction!' : 'Your prediction:'}
                </strong>{' '}
                You predicted that {userPredictionLabel}.
                {wasCorrect
                  ? " That's exactly what happens!"
                  : " Let's see why the wire actually spins continuously."}
              </p>
            </div>
          )}

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
                <div style={{ fontSize: '14px' }}>
                  <div><span style={{ color: '#60a5fa', fontWeight: 700 }}>B</span> <span style={{ color: '#e2e8f0' }}>= Magnetic field strength</span></div>
                  <div><span style={{ color: '#fbbf24', fontWeight: 700 }}>I</span> <span style={{ color: '#e2e8f0' }}>= Current through wire</span></div>
                  <div><span style={{ color: '#a855f7', fontWeight: 700 }}>L</span> <span style={{ color: '#e2e8f0' }}>= Length of wire in field</span></div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Fixed bottom bar */}
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
          paddingBottom: '16px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 4 • New Variable
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Flip the Magnet!
              </h2>
            </div>

            {/* STATIC GRAPHIC - No controls, just the visualization */}
            <div style={{
              width: '100%',
              maxWidth: '600px',
              margin: '0 auto 20px auto',
              aspectRatio: '16/10',
              background: colors.bgCard,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden'
            }}>
              {renderMotorVisualization()}
            </div>

            {/* What You're Looking At */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                📋 What You're Looking At:
              </h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                The same homopolar motor setup — but now imagine <strong style={{ color: colors.warning }}>flipping the magnet</strong> so
                the opposite pole faces up. Currently showing <span style={{ color: magnetPolarity === 'north' ? colors.error : colors.primary }}>{magnetPolarity === 'north' ? 'North' : 'South'}</span> pole.
                The magnetic field direction will reverse!
              </p>
            </div>

            {/* Prediction Question */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 What do you think will happen when you flip the magnet?
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {twistPredictions.map(p => (
                  <button
                    key={p.id}
                    onPointerDown={() => {
                      setTwistPrediction(p.id);
                      playSound('click');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                      backgroundColor: twistPrediction === p.id ? `${colors.warning}20` : colors.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px' }}>{p.label}</span>
                    {twistPrediction === p.id && (
                      <span style={{ marginLeft: 'auto', color: colors.warning, fontSize: '18px' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional "Why?" question - shown after selection */}
            {twistPrediction && (
              <div style={{
                background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.accent}15 100%)`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.warning}30`
              }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>
                  💭 Why do you think this will happen? <span style={{ color: colors.textMuted }}>(Optional)</span>
                </p>
                <textarea
                  placeholder="Share your reasoning... (skip if you prefer)"
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom bar */}
        {renderBottomBar(true, !!twistPrediction, 'Test It →', () => goToPhase('twist_play'), colors.warning)}
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
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 5 • Observer Effect
              </p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
                Flip the Magnet Polarity
              </h2>
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
            {/* Responsive graphic container */}
            <div style={{
              width: '100%',
              margin: '0 auto'
            }}>
              {renderMotorVisualization()}
            </div>

            {isRunning && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <p style={{ color: colors.warning, fontSize: '16px', fontWeight: 600 }}>
                  Direction: {rotationSpeed > 0 ? 'Clockwise' : 'Counter-clockwise'} — Flipping the magnet reverses it!
                </p>
              </div>
            )}
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
                  Magnet Polarity (Facing Up)
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onPointerDown={() => {
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
                    onPointerDown={() => {
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
                onPointerDown={() => {
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
            </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom bar */}
        {renderBottomBar(true, isRunning, 'See Why →', () => goToPhase('twist_review'), colors.warning)}
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
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
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
        </div>

        {/* Fixed bottom bar */}
        {renderBottomBar(true, true, 'Real World Applications →', () => goToPhase('transfer'), colors.success)}
      </div>
    );
  }

  // TRANSFER PHASE (Rich, sequential applications)
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Homopolar Motor"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

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
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {/* Header - Fixed at top */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, flexShrink: 0 }}>
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
                  onPointerDown={() => {
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

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
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

        {/* Footer - Fixed at bottom */}
        <div style={{
          position: 'sticky',
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
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
          gap: '12px'
        }}>
          <button
            onPointerDown={() => goToPhase('twist_review')}
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
              onPointerDown={handleCompleteApp}
              style={{
                flex: 1,
                maxWidth: '400px',
                padding: '16px 24px',
                minHeight: '52px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '16px',
                background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${currentApp.color}40`
              }}
            >
              {selectedApp < 3 ? 'Got It! Continue →' : '✓ Complete All Topics'}
            </button>
          ) : allCompleted ? (
            <button
              onPointerDown={() => goToPhase('test')}
              style={{
                flex: 1,
                maxWidth: '400px',
                padding: '16px 24px',
                minHeight: '52px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '16px',
                background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.success}40`
              }}
            >
              🎯 Take the Knowledge Test →
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
            paddingBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
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
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                {!passed && (
                  <button
                    onPointerDown={() => {
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
                  onPointerDown={() => passed ? goToPhase('mastery') : setTestSubmitted(false)}
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
          paddingBottom: '16px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
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
                    onPointerDown={() => {
                      if (!isAnswered) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                        playSound(isCorrect ? 'success' : 'failure');
                      }
                    }}
                    onClick={() => {
                      if (!isAnswered) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                      }
                    }}
                    disabled={isAnswered}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      border: isAnswered && isCorrect
                        ? `3px solid ${colors.success}`
                        : isSelected && !isCorrect
                          ? `2px solid ${colors.error}`
                          : isSelected
                            ? `2px solid ${colors.success}`
                            : `2px solid ${colors.border}`,
                      backgroundColor: isAnswered && isCorrect
                        ? 'rgba(34, 197, 94, 0.15)'
                        : isSelected && !isCorrect
                          ? 'rgba(239, 68, 68, 0.15)'
                          : colors.bgCard,
                      boxShadow: isAnswered && isCorrect
                        ? '0 0 20px rgba(34, 197, 94, 0.3)'
                        : 'none',
                      cursor: isAnswered ? 'default' : 'pointer',
                      textAlign: 'left',
                      opacity: isAnswered && !isSelected && !isCorrect ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: isAnswered && isCorrect
                        ? colors.success
                        : isSelected && !isCorrect
                          ? colors.error
                          : colors.primary,
                      minWidth: '24px'
                    }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span style={{ color: colors.textPrimary, flex: 1 }}>{opt.label}</span>
                    {isAnswered && isCorrect && (
                      <span style={{
                        color: colors.success,
                        fontSize: '24px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ✓ {isSelected ? 'Correct!' : ''}
                      </span>
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <span style={{ color: colors.error, fontSize: '20px', fontWeight: 700 }}>✗</span>
                    )}
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
        </div>

        {/* Navigation - Fixed at bottom */}
        <div style={{
          position: 'sticky',
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
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
        }}>
          <button
            onPointerDown={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
            onClick={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
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
              onPointerDown={() => {
                if (testQuestion < 9) {
                  setTestQuestion(testQuestion + 1);
                } else {
                  setTestSubmitted(true);
                }
              }}
              onClick={() => {
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
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
              Mastery Achieved!
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
              You now understand the homopolar motor — the simplest demonstration of how electricity and magnetism combine to create motion.
              The Lorentz force F = BIL powers everything from rail guns to MRI machines!
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onPointerDown={() => {
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
        </div>
      </div>
    );
  }

  return null;
};

export default HomopolarMotorRenderer;
