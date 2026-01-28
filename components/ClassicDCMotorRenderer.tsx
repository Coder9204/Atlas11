/**
 * CLASSIC DC MOTOR RENDERER
 *
 * Complete physics game demonstrating how commutation keeps DC motors spinning.
 * Shows the relationship between coil position, commutator timing, and torque.
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
  commutator: '#d97706',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'classic_dc_motor';

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
    scenario: "A simple DC motor has a coil rotating between two permanent magnets.",
    question: "What is the primary purpose of the commutator in a DC motor?",
    options: [
      { id: 'voltage', label: "To increase the voltage supplied to the coil" },
      { id: 'reverse', label: "To reverse current direction in the coil at the right moment", correct: true },
      { id: 'field', label: "To create a stronger magnetic field" },
      { id: 'friction', label: "To reduce friction in the motor" }
    ],
    explanation: "The commutator reverses the current direction exactly when the coil passes the dead zone, ensuring torque always pushes in the same rotational direction."
  },
  {
    scenario: "The coil in a DC motor is at the position where it's parallel to the magnetic field.",
    question: "What happens to the torque at this position (called the 'dead zone')?",
    options: [
      { id: 'max', label: "Torque is at maximum" },
      { id: 'zero', label: "Torque is zero", correct: true },
      { id: 'reverse', label: "Torque reverses direction" },
      { id: 'oscillate', label: "Torque oscillates rapidly" }
    ],
    explanation: "At the dead zone, the coil is aligned with the magnetic field. The force vectors are in line with the rotation axis, producing zero torque (τ = nBIA sin(0°) = 0)."
  },
  {
    scenario: "You notice your simple paperclip motor sometimes stops and won't restart.",
    question: "What is the most likely cause?",
    options: [
      { id: 'battery', label: "The battery is dead" },
      { id: 'deadzone', label: "The coil stopped at a dead zone position with poor brush contact", correct: true },
      { id: 'demagnetized', label: "The magnets have demagnetized" },
      { id: 'heavy', label: "The paperclips are too heavy" }
    ],
    explanation: "Simple motors with two commutator segments have dead zones at 0° and 180° where torque is zero. If the motor stops here without momentum, it can't restart on its own."
  },
  {
    scenario: "The commutator on a simple motor has two segments with a small gap between them.",
    question: "What happens during the brief moment when the brushes touch the gap?",
    options: [
      { id: 'increase', label: "Current increases dramatically" },
      { id: 'interrupt', label: "Current is momentarily interrupted, allowing momentum to carry through", correct: true },
      { id: 'reverse_motor', label: "The motor reverses direction" },
      { id: 'sparks', label: "Sparks destroy the commutator" }
    ],
    explanation: "The gap briefly interrupts current, but the coil's rotational momentum carries it through. This is why motors need to build up speed before hitting dead zones."
  },
  {
    scenario: "You're building a simple DC motor and want to increase its speed.",
    question: "Which modification would be most effective?",
    options: [
      { id: 'turns', label: "Add more turns to the coil" },
      { id: 'stronger', label: "Use stronger magnets or increase voltage", correct: true },
      { id: 'larger', label: "Make the coil larger in diameter" },
      { id: 'thicker', label: "Use thicker wire" }
    ],
    explanation: "Higher voltage increases current (I), and stronger magnets increase field (B). Both increase torque (τ = nBIA), leading to faster acceleration and higher speed."
  },
  {
    scenario: "In your motor, the coil experiences maximum torque at a certain position.",
    question: "At what angle relative to the magnetic field is torque maximum?",
    options: [
      { id: 'parallel', label: "When coil plane is parallel to the field (0°)" },
      { id: 'perpendicular', label: "When coil plane is perpendicular to the field (90°)", correct: true },
      { id: '45deg', label: "At 45° to the field" },
      { id: 'constant', label: "Torque is constant at all angles" }
    ],
    explanation: "Torque follows τ = nBIA sin(θ). Maximum torque occurs at θ = 90° because sin(90°) = 1. At this angle, the magnetic force has maximum leverage to rotate the coil."
  },
  {
    scenario: "A student scrapes only half of the enamel coating off the coil wire.",
    question: "Why is this technique used in simple motors?",
    options: [
      { id: 'weight', label: "To reduce the weight of the coil" },
      { id: 'commutator', label: "To create a simple commutator effect - current flows only half the rotation", correct: true },
      { id: 'resistance', label: "To increase electrical resistance" },
      { id: 'flexible', label: "To make the coil more flexible" }
    ],
    explanation: "The half-scraped wire acts as a simple commutator. Current only flows when the bare copper contacts the supports, effectively switching on/off each half rotation."
  },
  {
    scenario: "You add a second magnet to your motor setup, creating a stronger field.",
    question: "How does this affect the motor's behavior?",
    options: [
      { id: 'slower', label: "The motor will spin slower" },
      { id: 'more_torque', label: "The motor will have more torque and may start more easily", correct: true },
      { id: 'overheat', label: "The motor will overheat immediately" },
      { id: 'no_change', label: "No change in performance" }
    ],
    explanation: "Doubling the magnetic field (B) doubles the torque (τ = nBIA). More torque means the motor can overcome friction more easily and accelerate faster."
  },
  {
    scenario: "The torque equation for a DC motor is τ = nBIA sin(θ), where n is number of turns.",
    question: "What does this equation tell us about increasing torque?",
    options: [
      { id: 'field_only', label: "Only magnetic field strength matters" },
      { id: 'all_increase', label: "Increasing turns, field strength, current, or coil area all increase torque", correct: true },
      { id: 'angle_zero', label: "The angle θ must always be 0°" },
      { id: 'minimize', label: "Current should be minimized for maximum torque" }
    ],
    explanation: "The equation shows torque is proportional to n (turns), B (field), I (current), and A (area). Increasing any of these increases torque. The sin(θ) term shows torque varies with position."
  },
  {
    scenario: "Industrial DC motors often have many commutator segments instead of just two.",
    question: "What is the advantage of having more commutator segments?",
    options: [
      { id: 'cost', label: "It reduces the cost of the motor" },
      { id: 'smooth', label: "It provides smoother torque with fewer dead zones", correct: true },
      { id: 'no_brushes', label: "It eliminates the need for brushes" },
      { id: 'ac_power', label: "It allows the motor to run on AC power" }
    ],
    explanation: "More segments mean more coils at different angles. When one coil is at a dead zone, others provide torque. This results in smoother, more continuous power delivery."
  }
];

// Rich transfer phase applications (like Wave Particle Duality)
const realWorldApps = [
  {
    icon: '🔧',
    title: 'Cordless Power Tools',
    short: 'High-torque brushed motors',
    tagline: 'Portable Power Revolution',
    description: 'Every cordless drill, saw, and screwdriver relies on DC motors with commutators. The brushed DC design provides the high starting torque needed to drive screws and cut materials.',
    connection: 'Just like your simple motor, power tools use commutation to maintain constant rotation direction. The same τ = nBIA sin(θ) equation determines how much torque your drill can apply.',
    howItWorks: 'A battery provides DC power to a motor with multiple commutator segments and wound armature. Speed is controlled by PWM (pulse width modulation), varying the effective voltage.',
    stats: [
      { value: '20,000+', label: 'Max RPM', icon: '⚡' },
      { value: '800+ Nm', label: 'Impact torque', icon: '💪' },
      { value: '$40B', label: 'Global market', icon: '📊' }
    ],
    examples: [
      'Milwaukee, DeWalt, and Makita all use DC motor technology',
      'Brushed motors preferred for high-torque applications like impact wrenches',
      'Newer tools use brushless motors for longer life',
      'Variable speed triggers control PWM duty cycle'
    ],
    companies: ['Milwaukee Tool', 'DeWalt', 'Makita', 'Bosch', 'Ryobi'],
    futureImpact: 'While brushless motors are gaining ground, brushed DC motors remain essential for high-torque, cost-sensitive applications.',
    color: colors.warning
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Motors',
    short: 'From DC to modern drives',
    tagline: 'Evolution of Electric Transportation',
    description: 'The first electric vehicles in the 1800s used simple DC motors with commutators - the same principle as your motor! Understanding DC commutation was essential to developing modern EV technology.',
    connection: 'Early EVs like the 1888 Flocken Elektrowagen used DC motors with mechanical commutation. Modern EVs use electronic commutation (inverters) but the same electromagnetic principles apply.',
    howItWorks: 'Classic DC motors switch current mechanically via brushes. Modern EVs use brushless motors where power electronics replace the commutator, switching current electronically for better efficiency.',
    stats: [
      { value: '1834', label: 'First EV motor', icon: '📅' },
      { value: '95%', label: 'Modern efficiency', icon: '⚡' },
      { value: '$380B', label: 'EV market 2024', icon: '📈' }
    ],
    examples: [
      'Thomas Davenport built the first practical DC motor for a vehicle (1834)',
      'Early electric cars outsold gasoline cars until the 1920s',
      'Tesla uses AC induction motors with electronic commutation',
      'DC motors still used in EV auxiliary systems (windows, seats, pumps)'
    ],
    companies: ['Tesla', 'BYD', 'Rivian', 'Lucid Motors'],
    futureImpact: 'The principles you learned make modern EVs possible. Electronic commutation evolved from mechanical commutation understanding.',
    color: colors.success
  },
  {
    icon: '🔑',
    title: 'Car Starter Motors',
    short: 'Massive torque at low speed',
    tagline: 'Engine Cranking Power',
    description: 'Every gasoline car has a DC starter motor that cranks the engine. These motors must produce enormous torque at zero RPM - exactly what brushed DC motors excel at.',
    connection: 'Starter motors use the same commutation principle as your motor, but with heavy-duty brushes and thick copper windings to handle 200+ amps of current for a few seconds.',
    howItWorks: 'When you turn the key, a solenoid engages the starter gear with the flywheel. The DC motor draws massive current from the battery, producing enough torque to spin a cold engine.',
    stats: [
      { value: '200+ Amps', label: 'Peak current', icon: '⚡' },
      { value: '2-3 kW', label: 'Peak power', icon: '💪' },
      { value: '3-5 sec', label: 'Duty cycle', icon: '⏱️' }
    ],
    examples: [
      'Starter motors can briefly weld metal from the current they draw',
      'Cold weather requires more torque due to thick engine oil',
      'Starter motor failure is a common reason cars won\'t start',
      'Modern start-stop systems use enhanced starters rated for many more cycles'
    ],
    companies: ['Bosch', 'Denso', 'Valeo', 'BorgWarner'],
    futureImpact: 'While EVs don\'t need starters, hybrids use integrated starter-generators (ISGs) based on the same DC motor principles.',
    color: colors.error
  },
  {
    icon: '🤖',
    title: 'Robotics Actuators',
    short: 'Precise position control',
    tagline: 'Motion with Intelligence',
    description: 'Small DC motors power robot joints, grippers, and wheels. Combined with encoders and controllers, they provide precise position and speed control for automated systems.',
    connection: 'The τ = nBIA relationship you learned determines how much force a robot arm can exert. Understanding torque curves helps engineers design robots for specific tasks.',
    howItWorks: 'DC motors paired with gearboxes and position encoders form servo systems. A controller adjusts voltage/PWM to achieve desired position, speed, or torque based on feedback.',
    stats: [
      { value: '0.001°', label: 'Position accuracy', icon: '🎯' },
      { value: '-40 to +85°C', label: 'Operating range', icon: '🌡️' },
      { value: '10,000+ hrs', label: 'Brush life', icon: '⏱️' }
    ],
    examples: [
      'Mars rovers use DC motors rated for extreme temperature swings',
      'Surgical robots require sub-millimeter positioning accuracy',
      'Amazon warehouse robots use DC motors for wheel drives',
      'Drone gimbals use tiny DC motors for camera stabilization'
    ],
    companies: ['Maxon', 'Faulhaber', 'Portescap', 'MicroMo'],
    futureImpact: 'As robots become more prevalent, the demand for precise, reliable DC motor systems continues to grow across medical, industrial, and consumer applications.',
    color: colors.primary
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

interface ClassicDCMotorRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const ClassicDCMotorRenderer: React.FC<ClassicDCMotorRendererProps> = ({
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
  const [voltage, setVoltage] = useState(50);
  const [magnetCount, setMagnetCount] = useState<1 | 2>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [showCommutator, setShowCommutator] = useState(true);

  // Animation state
  const [coilAngle, setCoilAngle] = useState(0);
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

  // Calculate physics
  const torque = useMemo(() => {
    const angleRad = (coilAngle * Math.PI) / 180;
    const B = magnetCount === 2 ? 1.5 : 1.0;
    return B * (voltage / 100) * Math.sin(angleRad);
  }, [coilAngle, magnetCount, voltage]);

  const rotationSpeed = useMemo(() => {
    if (!isRunning) return 0;
    return (voltage / 100) * (magnetCount === 2 ? 1.5 : 1.0) * 3;
  }, [isRunning, voltage, magnetCount]);

  const currentDirection = useMemo(() => {
    const normalizedAngle = ((coilAngle % 360) + 360) % 360;
    return normalizedAngle < 180 ? 'cw' : 'ccw';
  }, [coilAngle]);

  // Animation loop
  useEffect(() => {
    if (rotationSpeed !== 0) {
      const animate = () => {
        setCoilAngle(prev => (prev + rotationSpeed) % 360);
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
  // MOTOR VISUALIZATION (Enhanced with dark theme)
  // ============================================================

  // LEGEND ITEMS - explain what each element represents
  const legendItems = [
    { color: colors.copper, label: 'Armature coil' },
    { color: colors.magnetNorth, label: 'North magnet (N)' },
    { color: colors.magnetSouth, label: 'South magnet (S)' },
    { color: '#4b5563', label: 'Brushes' },
    { color: colors.commutator, label: 'Commutator' },
    { color: colors.error, label: 'DC Power (+)' },
    { color: colors.magnetSouth, label: 'DC Power (−)' },
    { color: colors.force, label: 'Lorentz force (F)' },
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
        <li>Watch the <strong style={{ color: colors.copper }}>coil</strong> rotate in the magnetic field</li>
        <li>Notice when the <strong style={{ color: colors.commutator }}>commutator</strong> switches current direction</li>
        <li>The <strong style={{ color: colors.force }}>green arrows</strong> show the force (F = BIL)</li>
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
        <span style={{ color: '#f87171', fontWeight: 700 }}>F</span> = <span style={{ color: '#60a5fa', fontWeight: 700 }}>B</span><span style={{ color: '#fbbf24', fontWeight: 700 }}>I</span><span style={{ color: '#a855f7', fontWeight: 700 }}>L</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '12px' }}>
        <span style={{ color: '#f87171', fontWeight: 700 }}>F</span>
        <span style={{ color: '#e2e8f0' }}>Force on conductor (Newtons)</span>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>B</span>
        <span style={{ color: '#e2e8f0' }}>Magnetic field strength (Tesla)</span>
        <span style={{ color: '#fbbf24', fontWeight: 700 }}>I</span>
        <span style={{ color: '#e2e8f0' }}>Current (Amps - what YOU control)</span>
        <span style={{ color: '#a855f7', fontWeight: 700 }}>L</span>
        <span style={{ color: '#e2e8f0' }}>Length of conductor in field (meters)</span>
      </div>
    </div>
  );

  const renderMotorVisualization = () => {
    const width = isMobile ? 340 : 600;
    const height = isMobile ? 280 : 350;
    const cx = width / 2;
    const cy = height / 2;

    const coilWidth = isMobile ? 55 : 95;
    const coilHeight = isMobile ? 35 : 65;
    const angleRad = (coilAngle * Math.PI) / 180;
    const torqueAbs = Math.abs(torque);

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '620px', margin: '0 auto' }}>
        {renderLegend()}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
        <defs>
          {/* Magnet gradients */}
          <linearGradient id="dcMagnetNorth" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.error} />
            <stop offset="50%" stopColor={colors.errorLight} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <linearGradient id="dcMagnetSouth" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.magnetSouth} />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor={colors.magnetSouth} />
          </linearGradient>

          {/* Copper coil gradient */}
          <linearGradient id="dcCopperCoil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.copper} />
            <stop offset="50%" stopColor={colors.copperLight} />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Commutator gradient */}
          <linearGradient id="dcCommutatorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.copperLight} />
            <stop offset="50%" stopColor={colors.commutator} />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Brush gradient */}
          <linearGradient id="dcBrushGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Shaft gradient */}
          <linearGradient id="dcShaftGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="dcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Force arrow */}
          <marker id="dcForceArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L0,10 L10,5 z" fill={colors.success} />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

        {/* Title */}
        <text x={cx} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
          Classic DC Motor
        </text>
        <text x={cx} y="48" textAnchor="middle" fill="#e2e8f0" fontSize={isMobile ? 11 : 13}>
          Commutation keeps the rotation going
        </text>

        {/* Magnetic field lines */}
        {[...Array(5)].map((_, i) => {
          const y = cy - 55 + i * 28;
          return (
            <g key={`field-${i}`}>
              <line
                x1={cx - (isMobile ? 115 : 195)}
                y1={y}
                x2={cx + (isMobile ? 115 : 195)}
                y2={y}
                stroke={colors.textMuted}
                strokeWidth="1"
                strokeDasharray="6,4"
                opacity="0.3"
              />
              <polygon
                points={`${cx + (isMobile ? 100 : 175)},${y - 4} ${cx + (isMobile ? 100 : 175)},${y + 4} ${cx + (isMobile ? 110 : 190)},${y}`}
                fill={colors.textMuted}
                opacity="0.4"
              />
            </g>
          );
        })}

        {/* Left Magnet (North) */}
        <g transform={`translate(${cx - (isMobile ? 125 : 210)}, ${cy - 55})`}>
          <rect
            x="0"
            y="0"
            width={isMobile ? 32 : 48}
            height="110"
            rx="4"
            fill="url(#dcMagnetNorth)"
            stroke={colors.errorLight}
            strokeWidth="2"
          />
          <text x={isMobile ? 16 : 24} y="60" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">N</text>
        </g>

        {/* Right Magnet (South) */}
        <g transform={`translate(${cx + (isMobile ? 93 : 162)}, ${cy - 55})`}>
          <rect
            x="0"
            y="0"
            width={isMobile ? 32 : 48}
            height="110"
            rx="4"
            fill="url(#dcMagnetSouth)"
            stroke="#93c5fd"
            strokeWidth="2"
          />
          <text x={isMobile ? 16 : 24} y="60" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">S</text>
        </g>

        {/* Second magnet pair (if enabled) */}
        {magnetCount === 2 && (
          <>
            <g transform={`translate(${cx - (isMobile ? 125 : 210)}, ${cy - 55})`}>
              <rect
                x={isMobile ? -22 : -32}
                y="20"
                width={isMobile ? 18 : 28}
                height="70"
                rx="3"
                fill="url(#dcMagnetNorth)"
                stroke={colors.errorLight}
                strokeWidth="1"
                opacity="0.7"
              />
            </g>
            <g transform={`translate(${cx + (isMobile ? 93 : 162)}, ${cy - 55})`}>
              <rect
                x={isMobile ? 36 : 52}
                y="20"
                width={isMobile ? 18 : 28}
                height="70"
                rx="3"
                fill="url(#dcMagnetSouth)"
                stroke="#93c5fd"
                strokeWidth="1"
                opacity="0.7"
              />
            </g>
          </>
        )}

        {/* Rotating Coil */}
        <g transform={`translate(${cx}, ${cy}) rotate(${coilAngle})`}>
          {/* Coil rectangle */}
          <rect
            x={-coilWidth / 2}
            y={-coilHeight / 2}
            width={coilWidth}
            height={coilHeight}
            rx="4"
            fill="none"
            stroke="url(#dcCopperCoil)"
            strokeWidth={isMobile ? 6 : 9}
            filter={isRunning ? 'url(#dcGlow)' : undefined}
          />

          {/* Current direction arrows on coil */}
          {isRunning && (
            <>
              <polygon
                points={`${currentDirection === 'cw' ? -10 : 10},-${coilHeight / 2} 0,-${coilHeight / 2 - 8} ${currentDirection === 'cw' ? 10 : -10},-${coilHeight / 2}`}
                fill={colors.current}
              />
              <polygon
                points={`${currentDirection === 'cw' ? 10 : -10},${coilHeight / 2} 0,${coilHeight / 2 + 8} ${currentDirection === 'cw' ? -10 : 10},${coilHeight / 2}`}
                fill={colors.current}
              />
            </>
          )}

          {/* Shaft */}
          <rect
            x="-4"
            y={-coilHeight / 2 - 25}
            width="8"
            height={coilHeight + 50}
            fill="url(#dcShaftGradient)"
          />
        </g>

        {/* Force arrows showing torque */}
        {isRunning && torqueAbs > 0.1 && (
          <g transform={`translate(${cx}, ${cy})`}>
            <line
              x1={coilWidth / 2 * Math.cos(angleRad)}
              y1={-coilHeight / 2 * Math.cos(angleRad)}
              x2={coilWidth / 2 * Math.cos(angleRad) + 25 * torque}
              y2={-coilHeight / 2 * Math.cos(angleRad)}
              stroke={colors.success}
              strokeWidth="3"
              markerEnd="url(#dcForceArrow)"
            />
            <text
              x={isMobile ? 55 : 85}
              y="-25"
              fill={colors.success}
              fontSize="12"
              fontWeight="bold"
            >
              F
            </text>
          </g>
        )}

        {/* Commutator and Brushes */}
        {showCommutator && (
          <g transform={`translate(${cx}, ${cy + (isMobile ? 65 : 95)})`}>
            {/* Commutator segments (rotating with coil) */}
            <g transform={`rotate(${coilAngle})`}>
              <path
                d="M -14,-11 A 14,14 0 0,1 14,-11 L 11,-11 A 11,11 0 0,0 -11,-11 Z"
                fill="url(#dcCommutatorGradient)"
                stroke="#92400e"
                strokeWidth="1"
              />
              <path
                d="M -14,11 A 14,14 0 0,0 14,11 L 11,11 A 11,11 0 0,1 -11,11 Z"
                fill="url(#dcCommutatorGradient)"
                stroke="#92400e"
                strokeWidth="1"
              />
              <rect x="-2" y="-14" width="4" height="28" fill={colors.bgDark} />
            </g>

            {/* Static Brushes */}
            <rect x="-24" y="-5" width="7" height="10" rx="1" fill="url(#dcBrushGradient)" />
            <rect x="17" y="-5" width="7" height="10" rx="1" fill="url(#dcBrushGradient)" />

            {/* Brush connections */}
            <line x1="-28" y1="0" x2="-38" y2="0" stroke={colors.error} strokeWidth="2" />
            <line x1="24" y1="0" x2="38" y2="0" stroke={colors.magnetSouth} strokeWidth="2" />

            {/* Labels */}
            <text x="-42" y="4" fill={colors.error} fontSize="10" fontWeight="bold">+</text>
            <text x="40" y="4" fill={colors.magnetSouth} fontSize="10" fontWeight="bold">−</text>
          </g>
        )}

        {/* Torque vs Angle Graph */}
        <g transform={`translate(${isMobile ? 18 : 35}, ${height - (isMobile ? 75 : 95)})`}>
          <rect x="0" y="0" width={isMobile ? 75 : 115} height={isMobile ? 48 : 68} fill={colors.bgCard} rx="4" stroke={colors.border} />
          <text x={isMobile ? 37 : 57} y="12" textAnchor="middle" fill="#f8fafc" fontSize="9">Torque vs Angle</text>

          <path
            d={`M 5,${isMobile ? 28 : 38} ${[...Array(isMobile ? 65 : 105)].map((_, i) => {
              const x = 5 + i;
              const angle = (i / (isMobile ? 65 : 105)) * 2 * Math.PI;
              const y = (isMobile ? 28 : 38) - Math.sin(angle) * (isMobile ? 10 : 16);
              return `L ${x},${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={colors.success}
            strokeWidth="1.5"
          />

          <circle
            cx={5 + ((coilAngle % 360) / 360) * (isMobile ? 65 : 105)}
            cy={(isMobile ? 28 : 38) - torque * (isMobile ? 10 : 16)}
            r="4"
            fill={colors.current}
          />
        </g>

        {/* Current direction indicator */}
        <g transform={`translate(${width - (isMobile ? 95 : 155)}, ${height - (isMobile ? 75 : 95)})`}>
          <rect x="0" y="0" width={isMobile ? 77 : 120} height={isMobile ? 48 : 68} fill={colors.bgCard} rx="4" stroke={colors.border} />
          <text x={isMobile ? 38 : 60} y="12" textAnchor="middle" fill="#f8fafc" fontSize="9">Current Direction</text>

          <rect
            x="8"
            y="18"
            width={isMobile ? 26 : 45}
            height={isMobile ? 22 : 32}
            rx="3"
            fill={currentDirection === 'cw' ? colors.success : colors.bgCardLight}
          />
          <text x={isMobile ? 21 : 30} y={isMobile ? 33 : 40} textAnchor="middle" fill="white" fontSize="9">CW</text>

          <rect
            x={isMobile ? 42 : 63}
            y="18"
            width={isMobile ? 26 : 45}
            height={isMobile ? 22 : 32}
            rx="3"
            fill={currentDirection === 'ccw' ? colors.success : colors.bgCardLight}
          />
          <text x={isMobile ? 55 : 85} y={isMobile ? 33 : 40} textAnchor="middle" fill="white" fontSize="9">CCW</text>
        </g>

        {/* Status */}
        {isRunning && (
          <text x={cx} y={height - 12} textAnchor="middle" fill="#e2e8f0" fontSize="11">
            Angle: {Math.round(coilAngle % 360)}° | Torque: {torque.toFixed(2)} | {magnetCount} magnet{magnetCount > 1 ? 's' : ''}
          </text>
        )}

        {/* Formula */}
        {!isRunning && (
          <text x={cx} y={height - 12} textAnchor="middle" fill="#e2e8f0" fontSize="11">
            τ = nBIA sin(θ)
          </text>
        )}
      </svg>
      </div>
    );
  };

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
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      backgroundColor: colors.bgCard,
      minHeight: '72px'
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
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>⚙️🔄⚡</div>
          <h1 style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
            How Does a Motor Keep Spinning?
          </h1>
          <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 32px' }}>
            If a magnetic force pushes a coil one way, why doesn't it push it back the other way a moment later?
            <br /><br />
            Discover the ingenious trick that makes motors work.
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
              "The commutator is the heart of the DC motor - it's what transforms oscillation into continuous rotation."
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
              — Electric Motor Design Principle
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
              boxShadow: `0 8px 32px ${colors.primary}50`
            }}
          >
            Discover the Secret →
          </button>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictions = [
      { id: 'momentum', label: 'Just momentum - it keeps spinning after a push', icon: '🎯' },
      { id: 'commutator', label: 'A commutator flips current direction at the right time', icon: '🔄' },
      { id: 'magnet', label: 'The magnets rotate with the coil', icon: '🧲' },
      { id: 'ac', label: 'The electricity naturally reverses (like AC)', icon: '⚡' }
    ];

    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 1 • Make a Prediction
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
              What keeps the coil spinning?
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              In a simple motor with a coil between two magnets, what keeps the coil spinning in the same direction?
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
              Build Your DC Motor
            </h2>
          </div>

          {renderMotorVisualization()}

          {/* Controls */}
          <div style={{ maxWidth: '500px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600 }}>Voltage (Speed)</span>
                <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 700 }}>{voltage}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.primary }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onMouseDown={() => {
                  setIsRunning(!isRunning);
                  playSound(isRunning ? 'click' : 'success');
                  emitGameEvent(isRunning ? 'motor_stopped' : 'motor_started', { voltage, magnetCount });
                }}
                style={{
                  flex: 1,
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
                {isRunning ? '⏹ STOP' : '▶ START'}
              </button>

              <button
                onMouseDown={() => setShowCommutator(!showCommutator)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  backgroundColor: showCommutator ? colors.warning : colors.bgCardLight,
                  color: showCommutator ? 'white' : colors.textSecondary,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {showCommutator ? '👁 Hide' : '👁 Show'}
              </button>
            </div>
          </div>

          {isRunning && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.success, fontSize: '16px', fontWeight: 600 }}>
                Watch the torque graph! The commutator reverses current at the dead zones (0° and 180°).
              </p>
            </div>
          )}
        </div>

        {renderBottomBar(true, isRunning, 'Understand Commutation →', () => goToPhase('review'), colors.success)}
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
              The Magic of Commutation
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>What's Happening</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                As the coil rotates, the torque from the magnetic force follows a sine wave - positive half the
                time, negative half the time. Without commutation, the coil would just <strong style={{ color: colors.textPrimary }}>oscillate back and forth!</strong>
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
              <h3 style={{ color: colors.success, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Commutator's Job</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                The commutator is a mechanical switch that <strong style={{ color: colors.textPrimary }}>reverses the current direction</strong> exactly
                when torque would become negative. This keeps the torque always positive, creating continuous rotation.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
              <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Dead Zones</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                At 0° and 180°, torque is zero (sin(0) = 0). This is why simple motors sometimes stall - if they
                stop at a dead zone, they can't restart. The coil's <strong style={{ color: colors.textPrimary }}>momentum</strong> carries it through.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.error}` }}>
              <h3 style={{ color: colors.error, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Torque Equation</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '28px', fontFamily: 'monospace', color: colors.textPrimary, fontWeight: 700 }}>
                  τ = nBIA sin(θ)
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
                  <div>n = number of coil turns</div>
                  <div>B = magnetic field strength</div>
                  <div>I = current | A = coil area</div>
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
      { id: 'slower', label: 'The motor will spin slower due to extra weight', icon: '🐢' },
      { id: 'faster', label: 'The motor will have more torque and start easier', icon: '💪' },
      { id: 'stop', label: 'The motor will stop - too much magnetic force', icon: '⏹' },
      { id: 'same', label: 'No change - strength doesn\'t matter', icon: '➡️' }
    ];

    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Step 4 • New Variable
            </p>
            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
              Add a Second Magnet!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
              What do you think will happen if you add a second magnet to make the field stronger?
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
              Step 5 • Experiment
            </p>
            <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
              Test with Extra Magnets
            </h2>
          </div>

          {renderMotorVisualization()}

          {/* Controls */}
          <div style={{ maxWidth: '500px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
                Number of Magnets
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onMouseDown={() => {
                    setMagnetCount(1);
                    playSound('click');
                    emitGameEvent('magnet_changed', { count: 1 });
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: magnetCount === 1 ? colors.primary : colors.bgCardLight,
                    color: magnetCount === 1 ? 'white' : colors.textSecondary,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  1 Magnet
                </button>
                <button
                  onMouseDown={() => {
                    setMagnetCount(2);
                    playSound('click');
                    emitGameEvent('magnet_changed', { count: 2 });
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: magnetCount === 2 ? colors.primary : colors.bgCardLight,
                    color: magnetCount === 2 ? 'white' : colors.textSecondary,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  2 Magnets
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
              {isRunning ? '⏹ STOP' : '▶ START'}
            </button>
          </div>

          {isRunning && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '16px', fontWeight: 600 }}>
                With {magnetCount} magnet{magnetCount > 1 ? 's' : ''}: Torque is {magnetCount === 2 ? '50% stronger!' : 'at baseline.'}
              </p>
            </div>
          )}
        </div>

        {renderBottomBar(true, isRunning, 'See the Explanation →', () => goToPhase('twist_review'), colors.warning)}
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
              Stronger Magnets = More Torque
            </h2>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.accent}`, marginBottom: '24px' }}>
            <h3 style={{ color: colors.accent, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Why It Works</h3>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: '16px' }}>
              The torque equation <strong style={{ color: colors.textPrimary }}>τ = nBIA sin(θ)</strong> shows that torque is directly proportional
              to magnetic field strength (B). Double the field, double the torque!
            </p>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              With more torque, the motor can:
            </p>
            <ul style={{ color: colors.textSecondary, marginTop: '12px', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Start more easily from dead zones</li>
              <li style={{ marginBottom: '8px' }}>Overcome more mechanical resistance</li>
              <li>Accelerate faster to higher speeds</li>
            </ul>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
            <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Real-World Application</h3>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              This is why powerful motors use strong permanent magnets or electromagnets. <strong style={{ color: colors.textPrimary }}>Neodymium magnets</strong> revolutionized
              motor design by providing very strong fields in small packages - enabling everything from
              electric cars to micro-drones.
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
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', paddingBottom: '100px' }}>
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
                🔗 Connection to Your Motor
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
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
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
              ? 'You have mastered DC motor principles! You understand commutation, torque, and motor design.'
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
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '30px 20px', paddingBottom: '100px' }}>
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
                      : isAnswered && isCorrect
                        ? `2px solid ${colors.success}`
                        : `2px solid ${colors.border}`,
                    backgroundColor: isSelected
                      ? isCorrect ? `${colors.success}20` : `${colors.error}20`
                      : isAnswered && isCorrect
                        ? `${colors.success}10`
                        : colors.bgCard,
                    boxShadow: isAnswered && isCorrect
                      ? '0 0 20px rgba(34, 197, 94, 0.3)'
                      : isSelected && !isCorrect
                        ? '0 0 20px rgba(239, 68, 68, 0.3)'
                        : 'none',
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
                  {isAnswered && isCorrect && <span style={{ marginLeft: '8px', color: colors.success }}>✓</span>}
                  {isSelected && !isCorrect && <span style={{ marginLeft: '8px', color: colors.error }}>✗</span>}
                </button>
              );
            })}
          </div>

          {/* Correct/Wrong feedback */}
          {testAnswers[testQuestion] !== null && (
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: testAnswers[testQuestion] === currentQ.options.find(o => o.correct)?.id
                ? `${colors.success}15`
                : `${colors.error}15`
            }}>
              {testAnswers[testQuestion] === currentQ.options.find(o => o.correct)?.id ? (
                <div style={{ color: colors.success, fontSize: '24px', fontWeight: 700 }}>
                  ✓ Correct!
                </div>
              ) : (
                <div style={{ color: colors.error, fontSize: '24px', fontWeight: 700 }}>
                  ✗ Incorrect
                </div>
              )}
            </div>
          )}

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
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
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
          You now understand DC motor commutation — the ingenious trick that transforms oscillating torque into continuous rotation.
          From power tools to starter motors, this principle powers countless devices around you!
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

export default ClassicDCMotorRenderer;
