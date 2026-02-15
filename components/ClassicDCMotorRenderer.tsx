/**
 * CLASSIC DC MOTOR RENDERER
 *
 * Complete physics game demonstrating how commutation keeps DC motors spinning.
 * Shows the relationship between coil position, commutator timing, and torque.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// THEME COLORS
// ============================================================

const colors = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  accent: '#8b5cf6',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  border: '#334155',
  borderLight: '#475569',
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

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// Questions with LOCAL correct answers
const testQuestions = [
  {
    scenario: "A simple DC motor has a coil rotating between two permanent magnets. The coil is connected to a DC power source through carbon brushes that press against a split-ring commutator.",
    question: "What is the primary purpose of the commutator in a DC motor?",
    options: [
      { id: 'voltage', label: "A) To increase the voltage supplied to the coil" },
      { id: 'reverse', label: "B) To reverse current direction in the coil at the right moment", correct: true as const },
      { id: 'field', label: "C) To create a stronger magnetic field" },
      { id: 'friction', label: "D) To reduce friction in the motor" }
    ],
    explanation: "The commutator reverses the current direction exactly when the coil passes the dead zone, ensuring torque always pushes in the same rotational direction."
  },
  {
    scenario: "The coil in a DC motor is at the position where it is parallel to the magnetic field. The angle theta between the coil normal and the field is 0 degrees. The torque equation gives tau = nBIA sin(theta).",
    question: "What happens to the torque at this position (called the 'dead zone')?",
    options: [
      { id: 'max', label: "A) Torque is at maximum" },
      { id: 'zero', label: "B) Torque is zero", correct: true as const },
      { id: 'reverse', label: "C) Torque reverses direction" },
      { id: 'oscillate', label: "D) Torque oscillates rapidly" }
    ],
    explanation: "At the dead zone, the coil is aligned with the magnetic field. The force vectors are in line with the rotation axis, producing zero torque (tau = nBIA sin(0) = 0)."
  },
  {
    scenario: "You notice your simple paperclip motor sometimes stops and won't restart on its own. The motor has a basic two-segment commutator. You observe that it tends to stop in certain positions.",
    question: "What is the most likely cause?",
    options: [
      { id: 'battery', label: "A) The battery is dead" },
      { id: 'deadzone', label: "B) The coil stopped at a dead zone position with poor brush contact", correct: true as const },
      { id: 'demagnetized', label: "C) The magnets have demagnetized" },
      { id: 'heavy', label: "D) The paperclips are too heavy" }
    ],
    explanation: "Simple motors with two commutator segments have dead zones at 0 and 180 degrees where torque is zero. If the motor stops here without momentum, it can't restart on its own."
  },
  {
    scenario: "The commutator on a simple motor has two segments with a small gap between them. As the motor rotates at high speed, the carbon brushes slide from one segment, across the gap, to the other segment.",
    question: "What happens during the brief moment when the brushes touch the gap?",
    options: [
      { id: 'increase', label: "A) Current increases dramatically" },
      { id: 'interrupt', label: "B) Current is momentarily interrupted, allowing momentum to carry through", correct: true as const },
      { id: 'reverse_motor', label: "C) The motor reverses direction" },
      { id: 'sparks', label: "D) Sparks destroy the commutator" }
    ],
    explanation: "The gap briefly interrupts current, but the coil's rotational momentum carries it through. This is why motors need to build up speed before hitting dead zones."
  },
  {
    scenario: "You are building a simple DC motor and want to increase its speed. You currently have a single coil turn, a 1.5V battery, a small neodymium magnet, and thin copper wire.",
    question: "Which modification would be most effective?",
    options: [
      { id: 'turns', label: "A) Add more turns to the coil" },
      { id: 'stronger', label: "B) Use stronger magnets or increase voltage", correct: true as const },
      { id: 'larger', label: "C) Make the coil larger in diameter" },
      { id: 'thicker', label: "D) Use thicker wire" }
    ],
    explanation: "Higher voltage increases current (I), and stronger magnets increase field (B). Both increase torque (tau = nBIA), leading to faster acceleration and higher speed."
  },
  {
    scenario: "In your motor, the coil experiences maximum torque at a certain position. The torque follows the equation tau = nBIA sin(theta), where theta is the angle between the coil plane and the field.",
    question: "At what angle relative to the magnetic field is torque maximum?",
    options: [
      { id: 'parallel', label: "A) When coil plane is parallel to the field (0 degrees)" },
      { id: 'perpendicular', label: "B) When coil plane is perpendicular to the field (90 degrees)", correct: true as const },
      { id: '45deg', label: "C) At 45 degrees to the field" },
      { id: 'constant', label: "D) Torque is constant at all angles" }
    ],
    explanation: "Torque follows tau = nBIA sin(theta). Maximum torque occurs at theta = 90 degrees because sin(90) = 1. At this angle, the magnetic force has maximum leverage to rotate the coil."
  },
  {
    scenario: "A student scrapes only half of the enamel coating off the coil wire to build a simple homopolar motor. The coil rests on two conducting supports connected to a battery.",
    question: "Why is this technique used in simple motors?",
    options: [
      { id: 'weight', label: "A) To reduce the weight of the coil" },
      { id: 'commutator', label: "B) To create a simple commutator effect - current flows only half the rotation", correct: true as const },
      { id: 'resistance', label: "C) To increase electrical resistance" },
      { id: 'flexible', label: "D) To make the coil more flexible" }
    ],
    explanation: "The half-scraped wire acts as a simple commutator. Current only flows when the bare copper contacts the supports, effectively switching on/off each half rotation."
  },
  {
    scenario: "You add a second magnet to your motor setup, creating a stronger field. The magnetic field strength B effectively doubles from 0.1 Tesla to 0.2 Tesla.",
    question: "How does this affect the motor's behavior?",
    options: [
      { id: 'slower', label: "A) The motor will spin slower" },
      { id: 'more_torque', label: "B) The motor will have more torque and may start more easily", correct: true as const },
      { id: 'overheat', label: "C) The motor will overheat immediately" },
      { id: 'no_change', label: "D) No change in performance" }
    ],
    explanation: "Doubling the magnetic field (B) doubles the torque (tau = nBIA). More torque means the motor can overcome friction more easily and accelerate faster."
  },
  {
    scenario: "The torque equation for a DC motor is tau = nBIA sin(theta), where n is number of turns, B is field strength, I is current, A is coil area, and theta is the rotation angle.",
    question: "What does this equation tell us about increasing torque?",
    options: [
      { id: 'field_only', label: "A) Only magnetic field strength matters" },
      { id: 'all_increase', label: "B) Increasing turns, field strength, current, or coil area all increase torque", correct: true as const },
      { id: 'angle_zero', label: "C) The angle theta must always be 0 degrees" },
      { id: 'minimize', label: "D) Current should be minimized for maximum torque" }
    ],
    explanation: "The equation shows torque is proportional to n (turns), B (field), I (current), and A (area). Increasing any of these increases torque. The sin(theta) term shows torque varies with position."
  },
  {
    scenario: "Industrial DC motors often have many commutator segments instead of just two. A typical automotive starter motor has 25 or more segments connected to multiple coils wound at different angles.",
    question: "What is the advantage of having more commutator segments?",
    options: [
      { id: 'cost', label: "A) It reduces the cost of the motor" },
      { id: 'smooth', label: "B) It provides smoother torque with fewer dead zones", correct: true as const },
      { id: 'no_brushes', label: "C) It eliminates the need for brushes" },
      { id: 'ac_power', label: "D) It allows the motor to run on AC power" }
    ],
    explanation: "More segments mean more coils at different angles. When one coil is at a dead zone, others provide torque. This results in smoother, more continuous power delivery."
  }
];

// Rich transfer phase applications
const realWorldApps = [
  {
    icon: '',
    title: 'Cordless Power Tools',
    short: 'High-torque brushed motors',
    tagline: 'Portable Power Revolution',
    description: 'Every cordless drill, saw, and screwdriver relies on DC motors with commutators. The brushed DC design provides the high starting torque needed to drive screws and cut materials.',
    connection: 'Just like your simple motor, power tools use commutation to maintain constant rotation direction. The same torque equation determines how much torque your drill can apply.',
    howItWorks: 'A battery provides DC power to a motor with multiple commutator segments and wound armature. Speed is controlled by PWM (pulse width modulation), varying the effective voltage.',
    stats: [
      { value: '20,000 V', label: 'Max voltage range' },
      { value: '800 W', label: 'Peak power' },
      { value: '$40 billion', label: 'Global market' }
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
    icon: '',
    title: 'Electric Vehicle Motors',
    short: 'From DC to modern drives',
    tagline: 'Evolution of Electric Transportation',
    description: 'The first electric vehicles in the 1800s used simple DC motors with commutators - the same principle as your motor! Understanding DC commutation was essential to developing modern EV technology.',
    connection: 'Early EVs like the 1888 Flocken Elektrowagen used DC motors with mechanical commutation. Modern EVs use electronic commutation (inverters) but the same electromagnetic principles apply.',
    howItWorks: 'Classic DC motors switch current mechanically via brushes. Modern EVs use brushless motors where power electronics replace the commutator, switching current electronically for better efficiency.',
    stats: [
      { value: '1834', label: 'First EV motor' },
      { value: '95%', label: 'Modern efficiency' },
      { value: '$380B', label: 'EV market 2024' }
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
    icon: '',
    title: 'Car Starter Motors',
    short: 'Massive torque at low speed',
    tagline: 'Engine Cranking Power',
    description: 'Every gasoline car has a DC starter motor that cranks the engine. These motors must produce enormous torque at zero RPM - exactly what brushed DC motors excel at.',
    connection: 'Starter motors use the same commutation principle as your motor, but with heavy-duty brushes and thick copper windings to handle 200+ Amps of current for a few seconds.',
    howItWorks: 'When you turn the key, a solenoid engages the starter gear with the flywheel. The DC motor draws massive current from the battery, producing enough torque to spin a cold engine.',
    stats: [
      { value: '200 A', label: 'Peak current' },
      { value: '3 kW', label: 'Peak power' },
      { value: '5 s', label: 'Duty cycle' }
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
    icon: '',
    title: 'Robotics Actuators',
    short: 'Precise position control',
    tagline: 'Motion with Intelligence',
    description: 'Small DC motors power robot joints, grippers, and wheels. Combined with encoders and controllers, they provide precise position and speed control for automated systems.',
    connection: 'The torque relationship you learned determines how much force a robot arm can exert. Understanding torque curves helps engineers design robots for specific tasks.',
    howItWorks: 'DC motors paired with gearboxes and position encoders form servo systems. A controller adjusts voltage/PWM to achieve desired position, speed, or torque based on feedback.',
    stats: [
      { value: '0.001 m', label: 'Position accuracy' },
      { value: '85 W', label: 'Operating range' },
      { value: '10,000 s', label: 'Brush life' }
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
  const [voltage, setVoltage] = useState(30);
  const [magnetCount, setMagnetCount] = useState<1 | 2>(1);
  const [showCommutator, setShowCommutator] = useState(true);

  // Test phase state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Transfer phase state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Calculate physics - voltage drives the coil angle for visualization
  const coilAngle = useMemo(() => {
    return (voltage / 100) * 360;
  }, [voltage]);

  const torque = useMemo(() => {
    const angleRad = (coilAngle * Math.PI) / 180;
    const B = magnetCount === 2 ? 1.5 : 1.0;
    return B * (voltage / 100) * Math.sin(angleRad);
  }, [coilAngle, magnetCount, voltage]);

  // Event emitter
  const emitGameEvent = useCallback((eventType: string, details: any) => {
    onGameEvent?.({ type: eventType, data: { ...details, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
    emitGameEvent('phase_changed', { phase: p });
  }, [emitGameEvent]);

  // Test scoring
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => (o as any).correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // ============================================================
  // RENDER HELPERS (plain functions, not components)
  // ============================================================

  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.7)' }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          aria-label={phaseLabels[p]}
          onClick={() => goToPhase(p)}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: p === phase ? colors.primary : colors.bgCardLight,
            opacity: p === phase ? 1 : 0.6,
            padding: 0,
            transition: 'all 0.2s ease'
          }}
        />
      ))}
    </div>
  );

  const renderBottomBar = (nextLabel: string, nextAction?: () => void) => {
    const idx = validPhases.indexOf(phase);
    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)', minHeight: '60px' }}>
        <button onClick={() => { if (idx > 0) goToPhase(validPhases[idx - 1]); }} style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', backgroundColor: colors.bgCardLight, color: '#e2e8f0', border: 'none', cursor: 'pointer', opacity: idx > 0 ? 1 : 0.4 }}>
          Back
        </button>
        <button onClick={nextAction || (() => { if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]); })} onPointerDown={nextAction || (() => { if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]); })} style={{ padding: '14px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '16px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px' }}>
          {nextLabel}
        </button>
      </div>
    );
  };

  // Torque vs Angle chart - standalone SVG for the play phase
  const renderTorqueChart = () => {
    const chartW = 500;
    const chartH = 250;
    const padL = 60;
    const padR = 20;
    const padT = 40;
    const padB = 50;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    const B = magnetCount === 2 ? 1.5 : 1.0;
    const I = voltage / 100;

    // Generate curve points
    const points: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const angle = (i / 100) * 360;
      const angleRad = (angle * Math.PI) / 180;
      const t = B * I * Math.sin(angleRad);
      const x = padL + (i / 100) * plotW;
      const y = padT + plotH / 2 - (t / 2) * plotH;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Current marker position
    const markerFrac = coilAngle / 360;
    const markerX = padL + markerFrac * plotW;
    const markerY = padT + plotH / 2 - (torque / 2) * plotH;

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="torqueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={chartW} height={chartH} fill="#0f172a" rx="8" />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={`vg-${i}`} x1={padL + f * plotW} y1={padT} x2={padL + f * plotW} y2={padT + plotH} strokeDasharray="4 4" opacity={0.3} stroke="#475569" strokeWidth="1" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={`hg-${i}`} x1={padL} y1={padT + f * plotH} x2={padL + plotW} y2={padT + f * plotH} strokeDasharray="4 4" opacity={0.3} stroke="#475569" strokeWidth="1" />
        ))}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#94a3b8" strokeWidth="2" />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#94a3b8" strokeWidth="2" />

        {/* Axis labels */}
        <text x={padL + plotW / 2} y={chartH - 8} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold">Angle (degrees)</text>
        <text x="14" y={padT + plotH / 2} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold" transform={`rotate(-90, 14, ${padT + plotH / 2})`}>Torque (N m)</text>

        {/* Tick labels */}
        <text x={padL} y={padT + plotH + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">0</text>
        <text x={padL + plotW * 0.25} y={padT + plotH + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">90</text>
        <text x={padL + plotW * 0.5} y={padT + plotH + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">180</text>
        <text x={padL + plotW * 0.75} y={padT + plotH + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">270</text>
        <text x={padL + plotW} y={padT + plotH + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">360</text>

        {/* Chart title */}
        <text x={chartW / 2} y={20} fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">Torque vs Angle</text>

        {/* Zero line */}
        <line x1={padL} y1={padT + plotH / 2} x2={padL + plotW} y2={padT + plotH / 2} stroke="#475569" strokeWidth="1" opacity="0.5" />

        {/* Torque curve */}
        <path d={points.join(' ')} fill="none" stroke="url(#torqueGrad)" strokeWidth="3" />

        {/* Interactive marker */}
        <circle
          cx={markerX}
          cy={markerY}
          r={8}
          fill="#fbbf24"
          filter="url(#glow)"
          stroke="#fff"
          strokeWidth={2}
        />

        {/* Voltage label */}
        <text x={padL + plotW - 4} y={padT + 16} fill={colors.copper} fontSize="11" textAnchor="end">
          V = {voltage}%
        </text>
        <text x={padL + plotW - 4} y={padT + 30} fill={colors.force} fontSize="11" textAnchor="end">
          B = {magnetCount === 2 ? '1.5' : '1.0'} T
        </text>
      </svg>
    );
  };

  // Motor cross-section visualization with embedded torque curve
  const renderMotorSVG = () => {
    const w = 500;
    const h = 420;
    const cx = w / 2;
    const cy = 120;
    const coilW = 90;
    const coilH = 60;
    const angleRad = (coilAngle * Math.PI) / 180;
    const absT = Math.abs(torque);

    // Embedded torque mini-chart at bottom of SVG
    const chartTop = 260;
    const chartH = 120;
    const chartL = 70;
    const chartR = w - 30;
    const chartW2 = chartR - chartL;
    const chartMid = chartTop + chartH / 2;

    // Generate torque curve - always use full amplitude for visibility
    // Normalize to use full chart height regardless of voltage/magnet settings
    const curvePoints: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const angle = (i / 60) * 360;
      const aRad = (angle * Math.PI) / 180;
      const normalizedT = Math.sin(aRad);
      const x = chartL + (i / 60) * chartW2;
      // Map [-1, 1] to full chart height
      const y = chartMid - normalizedT * (chartH / 2 - 5);
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Current marker position on curve
    const markerFrac = coilAngle / 360;
    const markerNormT = Math.sin((coilAngle * Math.PI) / 180);
    const markerX2 = chartL + markerFrac * chartW2;
    const markerY2 = chartMid - markerNormT * (chartH / 2 - 5);

    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="dcmMagN" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="30%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#f87171" />
            <stop offset="90%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="dcmMagS" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="30%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#60a5fa" />
            <stop offset="90%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="dcmCopper" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="25%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="dcmField" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="dcmForce" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <linearGradient id="torqueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="dcmGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={w} height={h} fill="#030712" rx="10" />

        {/* Magnetic field arrows (simple lines, not path elements) */}
        {[...Array(5)].map((_, i) => {
          const yOff = cy - 60 + i * 30;
          return (
            <g key={`fl-${i}`}>
              <line x1="80" y1={yOff} x2="420" y2={yOff} stroke="url(#dcmField)" strokeWidth="1.5" strokeOpacity={0.4} />
              <polygon points={`420,${yOff - 4} 430,${yOff} 420,${yOff + 4}`} fill="#a855f7" fillOpacity="0.5" />
            </g>
          );
        })}

        {/* Magnetic field label */}
        <text x={cx} y={18} fill="#a855f7" fontSize="11" fontWeight="500" textAnchor="middle">Magnetic Field Lines</text>

        {/* Left magnet (North) */}
        <rect x="30" y={cy - 55} width="45" height="110" rx="6" fill="url(#dcmMagN)" stroke="#fca5a5" strokeWidth="2" />
        <text x="52" y={cy - 60} fill="#fca5a5" fontSize="14" fontWeight="bold" textAnchor="middle">N</text>

        {/* Right magnet (South) */}
        <rect x={w - 75} y={cy - 55} width="45" height="110" rx="6" fill="url(#dcmMagS)" stroke="#93c5fd" strokeWidth="2" />
        <text x={w - 52} y={cy - 60} fill="#93c5fd" fontSize="14" fontWeight="bold" textAnchor="middle">S</text>

        {/* Extra magnets if 2 */}
        {magnetCount === 2 && (
          <>
            <rect x="10" y={cy - 35} width="22" height="70" rx="4" fill="url(#dcmMagN)" stroke="#fca5a5" strokeWidth="1" opacity="0.8" />
            <rect x={w - 32} y={cy - 35} width="22" height="70" rx="4" fill="url(#dcmMagS)" stroke="#93c5fd" strokeWidth="1" opacity="0.8" />
          </>
        )}

        {/* Rotating coil */}
        <g transform={`translate(${cx}, ${cy}) rotate(${coilAngle})`}>
          <rect x={-coilW / 2} y={-coilH / 2} width={coilW} height={coilH} rx="6" fill="none" stroke="url(#dcmCopper)" strokeWidth="10" />
          <rect x={-coilW / 2 + 3} y={-coilH / 2 + 3} width={coilW - 6} height={coilH - 6} rx="4" fill="none" stroke="#fcd34d" strokeWidth="1" opacity="0.4" />
          <rect x="-4" y={-coilH / 2 - 25} width="8" height={coilH + 50} rx="2" fill="#6b7280" />
        </g>

        {/* Force arrows when torque significant */}
        {absT > 0.05 && (
          <g transform={`translate(${cx}, ${cy})`}>
            <line
              x1={coilW / 2 * Math.cos(angleRad)}
              y1={-coilH / 2 * Math.cos(angleRad)}
              x2={coilW / 2 * Math.cos(angleRad) + 28 * torque}
              y2={-coilH / 2 * Math.cos(angleRad)}
              stroke="url(#dcmForce)" strokeWidth="4" filter="url(#dcmGlow)"
            />
          </g>
        )}

        {/* Coil label */}
        <text x={cx} y={cy - 70} fill="#fbbf24" fontSize="12" fontWeight="600" textAnchor="middle">Armature Coil</text>

        {/* Commutator and brushes */}
        {showCommutator && (
          <g transform={`translate(${cx}, ${cy + 80})`}>
            <g transform={`rotate(${coilAngle})`}>
              {/* Commutator half-rings */}
              <rect x="-14" y="-14" width="28" height="12" rx="4" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
              <rect x="-14" y="2" width="28" height="12" rx="4" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
              <rect x="-2" y="-14" width="4" height="28" fill="#030712" />
            </g>
            <rect x="-26" y="-5" width="8" height="10" rx="2" fill="#4b5563" stroke="#6b7280" strokeWidth="1" />
            <rect x="18" y="-5" width="8" height="10" rx="2" fill="#4b5563" stroke="#6b7280" strokeWidth="1" />
            <line x1="-30" y1="0" x2="-42" y2="0" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="30" y1="0" x2="42" y2="0" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="-45" cy="0" r="4" fill="#dc2626" stroke="#fca5a5" strokeWidth="1" />
            <circle cx="45" cy="0" r="4" fill="#2563eb" stroke="#93c5fd" strokeWidth="1" />
            <text x="0" y="28" fill="#d97706" fontSize="12" fontWeight="600" textAnchor="middle">Commutator</text>
          </g>
        )}

        {/* ---- Embedded Torque vs Angle mini-chart ---- */}
        <rect x={chartL - 5} y={chartTop - 5} width={chartW2 + 10} height={chartH + 10} fill="#0f172a" rx="6" />
        <text x={cx} y={chartTop + 12} fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle">Torque vs Angle</text>

        {/* Grid */}
        <line x1={chartL} y1={chartMid} x2={chartR} y2={chartMid} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <line x1={chartL} y1={chartTop + 18} x2={chartL} y2={chartTop + chartH} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={chartL} y1={chartTop + chartH} x2={chartR} y2={chartTop + chartH} stroke="#94a3b8" strokeWidth="1.5" />

        {/* Axis labels */}
        <text x={cx} y={chartTop + chartH + 14} fill="#94a3b8" fontSize="11" textAnchor="middle">Angle (degrees)</text>

        {/* Torque curve */}
        <path d={curvePoints.join(' ')} fill="none" stroke="url(#torqueGrad)" strokeWidth="2.5" />

        {/* Interactive marker */}
        <circle cx={markerX2} cy={markerY2} r={6} fill="#fbbf24" filter="url(#dcmGlow)" stroke="#fff" strokeWidth="1.5" />

        {/* Status info */}
        <text x={cx} y={h - 12} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Angle: {Math.round(coilAngle % 360)} | Torque: {torque.toFixed(2)} | Magnets: {magnetCount}
        </text>
      </svg>
    );
  };

  // ============================================================
  // PHASE RENDERS
  // ============================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
              How Does a Motor Keep Spinning?
            </h1>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '32px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 32px' }}>
              If a magnetic force pushes a coil one way, why doesn't it push it back the other way a moment later? Discover the ingenious trick that makes motors work.
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', border: `1px solid ${colors.border}`, textAlign: 'left' }}>
              <p style={{ color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic', marginBottom: '12px' }}>
                "The commutator is the heart of the DC motor - it's what transforms oscillation into continuous rotation."
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '13px' }}>
                -- Electric Motor Design Principle
              </p>
            </div>

            <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 400, marginTop: '16px' }}>
              Estimated time: 5-10 minutes
            </p>
          </div>
        </div>
        {renderBottomBar('Start', () => goToPhase('predict'))}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictions = [
      { id: 'momentum', label: 'Just momentum - it keeps spinning after a push' },
      { id: 'commutator', label: 'A commutator flips current direction at the right time' },
      { id: 'magnet', label: 'The magnets rotate with the coil' },
      { id: 'ac', label: 'The electricity naturally reverses (like AC)' }
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 - Make a Prediction
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                What keeps the coil spinning?
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
                In a simple motor with a coil between two magnets, what keeps the coil spinning in the same direction?
              </p>
            </div>

            {renderMotorSVG()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '24px 0' }}>
              {predictions.map(p => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '20px', borderRadius: '12px', border: prediction === p.id ? `2px solid ${colors.primary}` : `2px solid ${colors.border}`, backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard, cursor: 'pointer', textAlign: 'left', minHeight: '44px' }}>
                  <span style={{ color: colors.textPrimary, fontSize: '15px' }}>{p.label}</span>
                </button>
              ))}
            </div>

          </div>
        </div>
        {renderBottomBar('Test My Prediction', prediction ? () => goToPhase('play') : undefined)}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 2 - Run the Experiment
              </p>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>
                DC Motor Simulation
              </h2>
              <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 400, marginTop: '8px' }}>
                Observe how the motor responds to voltage changes. Watch how the torque curve displays the relationship between angle and force.
              </p>
            </div>

            {/* Motor visualization */}
            {renderMotorSVG()}

            {/* Formula */}
            <div style={{ textAlign: 'center', margin: '16px 0', padding: '12px', background: colors.bgCard, borderRadius: '10px', border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: '18px', fontFamily: 'monospace', color: colors.textPrimary }}>
                <span style={{ color: '#f87171', fontWeight: 700 }}>F</span> = <span style={{ color: '#60a5fa', fontWeight: 700 }}>B</span> <span style={{ color: '#cbd5e1' }}>{'\u00D7'}</span> <span style={{ color: '#fbbf24', fontWeight: 700 }}>I</span> <span style={{ color: '#cbd5e1' }}>{'\u00D7'}</span> <span style={{ color: '#a855f7', fontWeight: 700 }}>L</span>
              </span>
              <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                Force = Magnetic Field {'\u00D7'} Current {'\u00D7'} Length
              </p>
            </div>

            {/* Slider controls */}
            <div style={{ maxWidth: '500px', margin: '20px auto 0' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>Voltage (Speed Control)</span>
                  <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 700 }}>{voltage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={voltage}
                  onChange={(e) => setVoltage(Number(e.target.value))}
                  onInput={(e) => setVoltage(Number((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Low (0%)</span>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>High (100%)</span>
                </div>
              </div>
            </div>

            {/* Cause-effect explanation */}
            <div style={{ background: `linear-gradient(135deg, ${colors.success}15 0%, ${colors.primary}15 100%)`, border: `1px solid ${colors.success}30`, borderRadius: '12px', padding: '16px', marginTop: '16px', maxWidth: '600px', margin: '16px auto 0' }}>
              <p style={{ color: colors.success, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Cause and Effect:
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6 }}>
                When you increase the voltage, the current through the coil increases proportionally.
                Higher current means a stronger Lorentz force on the conductor, which results in more torque.
                As voltage increases, the motor accelerates faster because torque is calculated as F = B {'\u00D7'} I {'\u00D7'} L.
                This is why industrial motors use higher voltages for heavy loads.
              </p>
            </div>

            {/* Real-world connection */}
            <div style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`, border: `1px solid ${colors.primary}30`, borderRadius: '12px', padding: '16px', marginTop: '16px', maxWidth: '600px', margin: '16px auto 0' }}>
              <p style={{ color: colors.primary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Real-World Connection:
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6 }}>
                This commutation principle is used in technology everywhere - from cordless power tools and car starter motors to electric vehicle components and robotic actuators. Understanding how DC motors work helps engineers design more efficient, powerful, and reliable machines.
              </p>
            </div>

          </div>
        </div>
        {renderBottomBar('Understand Commutation', () => goToPhase('review'))}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 3 - Understanding
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary }}>
                The Magic of Commutation
              </h2>
            </div>

            {/* Connect to prediction */}
            <div style={{ background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.primary}15 100%)`, border: `1px solid ${colors.accent}30`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Your Prediction:
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                {prediction
                  ? `You predicted: "${prediction === 'momentum' ? 'Just momentum' : prediction === 'commutator' ? 'A commutator flips current direction' : prediction === 'magnet' ? 'The magnets rotate' : 'The electricity reverses'}". ${prediction === 'commutator' ? 'Correct! ' : ''}As you observed in the experiment, the commutator reverses the current at the right moment to maintain continuous rotation.`
                  : 'As you observed in the experiment, the commutator reverses the current at the right moment to maintain continuous rotation.'
                }
              </p>
            </div>

            {renderMotorSVG()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
                <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>What's Happening</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                  As the coil rotates, the torque from the magnetic force follows a sine wave - positive half the time, negative half the time. Without commutation, the coil would just oscillate back and forth!
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
                <h3 style={{ color: colors.success, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Commutator's Job</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                  The commutator is a mechanical switch that reverses the current direction exactly when torque would become negative. This keeps the torque always positive, creating continuous rotation.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
                <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Dead Zones</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                  At 0 and 180 degrees, torque is zero. This is why simple motors sometimes stall. The coil's momentum carries it through these dead zones.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.error}` }}>
                <h3 style={{ color: colors.error, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Torque Equation</h3>
                <p style={{ fontSize: '22px', fontFamily: 'monospace', color: colors.textPrimary, fontWeight: 700, marginBottom: '8px' }}>
                  {'\u03C4'} = n {'\u00D7'} B {'\u00D7'} I {'\u00D7'} A {'\u00D7'} sin({'\u03B8'})
                </p>
                <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                  n = turns | B = field | I = current | A = area | {'\u03B8'} = angle
                </p>
              </div>
            </div>

          </div>
        </div>
        {renderBottomBar('Try a Twist', () => goToPhase('twist_predict'))}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'slower', label: 'The motor will spin slower due to extra weight' },
      { id: 'faster', label: 'The motor will have more torque and start easier' },
      { id: 'stop', label: 'The motor will stop - too much magnetic force' },
      { id: 'same', label: 'No change - strength doesn\'t matter' }
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 4 - New Variable
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                Add a Second Magnet!
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '16px' }}>
                What do you think will happen if you add a second magnet to make the field stronger?
              </p>
            </div>

            {/* SVG graphic without sliders */}
            {renderMotorSVG()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '24px 0' }}>
              {twistPredictions.map(p => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '20px', borderRadius: '12px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `2px solid ${colors.border}`, backgroundColor: twistPrediction === p.id ? `${colors.warning}20` : colors.bgCard, cursor: 'pointer', textAlign: 'left', minHeight: '44px' }}>
                  <span style={{ color: colors.textPrimary, fontSize: '15px' }}>{p.label}</span>
                </button>
              ))}
            </div>

          </div>
        </div>
        {renderBottomBar('Test It', twistPrediction ? () => goToPhase('twist_play') : undefined)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 5 - Experiment
              </p>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>
                Test with Extra Magnets
              </h2>
            </div>

            {renderMotorSVG()}

            <div style={{ maxWidth: '500px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>Voltage</span>
                  <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 700 }}>{voltage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={voltage}
                  onChange={(e) => setVoltage(Number(e.target.value))}
                  onInput={(e) => setVoltage(Number((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Low (0%)</span>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>High (100%)</span>
                </div>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
                  Number of Magnets
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setMagnetCount(1)} style={{ flex: 1, padding: '14px', borderRadius: '10px', fontWeight: 700, backgroundColor: magnetCount === 1 ? colors.primary : colors.bgCardLight, color: magnetCount === 1 ? 'white' : colors.textPrimary, border: 'none', cursor: 'pointer', minHeight: '44px' }}>
                    1 Magnet
                  </button>
                  <button onClick={() => setMagnetCount(2)} style={{ flex: 1, padding: '14px', borderRadius: '10px', fontWeight: 700, backgroundColor: magnetCount === 2 ? colors.primary : colors.bgCardLight, color: magnetCount === 2 ? 'white' : colors.textPrimary, border: 'none', cursor: 'pointer', minHeight: '44px' }}>
                    2 Magnets
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '14px', fontWeight: 600 }}>
                With {magnetCount} magnet{magnetCount > 1 ? 's' : ''}: Torque is {magnetCount === 2 ? '50% stronger!' : 'at baseline.'}
              </p>
            </div>

          </div>
        </div>
        {renderBottomBar('See the Explanation', () => goToPhase('twist_review'))}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 6 - Deep Insight
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary }}>
                Stronger Magnets = More Torque
              </h2>
            </div>

            {renderMotorSVG()}

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.accent}`, marginTop: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: colors.accent, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Why It Works</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                The torque equation {'\u03C4'} = nBIA sin({'\u03B8'}) shows that torque is directly proportional to magnetic field strength (B). Double the field, double the torque! With more torque, the motor starts more easily and overcomes more resistance.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Real-World Application</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                This is why powerful motors use strong permanent magnets or electromagnets. Neodymium magnets revolutionized motor design by providing very strong fields in small packages.
              </p>
            </div>

          </div>
        </div>
        {renderBottomBar('Real World Applications', () => goToPhase('transfer'))}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const currentApp = realWorldApps[selectedApp];
    const isCurrentCompleted = completedApps[selectedApp];
    const allCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    const handleCompleteApp = () => {
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      emitGameEvent('app_completed', { appNumber: selectedApp + 1, appTitle: currentApp.title });
      if (selectedApp < 3) {
        setSelectedApp(selectedApp + 1);
      }
    };

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>
                  Step 7 - Real World Applications
                </p>
                <p style={{ fontSize: '12px', marginTop: '4px', color: '#cbd5e1' }}>
                  {completedCount}/4 completed
                </p>
              </div>
            </div>

            {/* App tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
              {realWorldApps.map((app, i) => (
                <button key={i} onClick={() => setSelectedApp(i)} style={{ padding: '10px 16px', borderRadius: '8px', border: selectedApp === i ? `2px solid ${app.color}` : `1px solid ${colors.border}`, backgroundColor: selectedApp === i ? `${app.color}20` : completedApps[i] ? `${colors.success}15` : colors.bgCardLight, color: colors.textPrimary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{app.title}</span>
                  {completedApps[i] && <span style={{ color: colors.success }}>{'\u2713'}</span>}
                </button>
              ))}
            </div>

            {/* App content */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: colors.textPrimary, marginTop: '12px' }}>
                {currentApp.title}
              </h2>
              <p style={{ color: currentApp.color, fontSize: '16px', fontWeight: 600 }}>{currentApp.tagline}</p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${currentApp.color}` }}>
              <p style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: 1.7 }}>
                {currentApp.description}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${colors.primary}` }}>
              <h3 style={{ color: colors.primary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                Connection to Your Motor
              </h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                {currentApp.connection}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                How It Works
              </h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                {currentApp.howItWorks}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                  <div style={{ color: currentApp.color, fontSize: '18px', fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ color: '#cbd5e1', fontSize: '11px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                Real Examples
              </h3>
              <ul style={{ color: '#cbd5e1', paddingLeft: '20px', lineHeight: 1.8 }}>
                {currentApp.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${colors.bgCard} 100%)`, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${currentApp.color}40` }}>
              <h3 style={{ color: currentApp.color, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                Future Impact
              </h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                {currentApp.futureImpact}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              {!isCurrentCompleted ? (
                <button onClick={handleCompleteApp} style={{ padding: '16px 48px', fontSize: '16px', fontWeight: 700, background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', minHeight: '44px' }}>
                  Got It
                </button>
              ) : allCompleted ? (
                <button onClick={() => goToPhase('test')} style={{ padding: '16px 48px', fontSize: '16px', fontWeight: 700, background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', minHeight: '44px' }}>
                  Take the Test
                </button>
              ) : (
                <button onClick={() => { if (selectedApp < 3) setSelectedApp(selectedApp + 1); }} style={{ padding: '16px 48px', fontSize: '16px', fontWeight: 700, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', minHeight: '44px' }}>
                  Next Application
                </button>
              )}
            </div>
          </div>
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
          {renderNavDots()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: colors.textPrimary, marginBottom: '12px' }}>
              {passed ? 'Test Complete!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '16px', marginBottom: '8px' }}>You scored:</p>
            <div style={{ fontSize: '64px', fontWeight: 800, color: passed ? colors.success : colors.warning, marginBottom: '24px' }}>
              {score}/10
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '18px', textAlign: 'center', maxWidth: '500px', marginBottom: '32px' }}>
              {passed ? 'Excellent! You have achieved mastery of DC motor principles!' : 'You need 7/10 to pass. Review the lesson and try again.'}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              {!passed && (
                <button onClick={() => { setPhase('hook'); setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); setCompletedApps([false, false, false, false]); }} style={{ padding: '16px 32px', borderRadius: '12px', fontWeight: 700, backgroundColor: colors.bgCardLight, color: colors.textSecondary, border: 'none', cursor: 'pointer' }}>
                  Return to Review
                </button>
              )}
              <button onClick={() => passed ? goToPhase('mastery') : setTestSubmitted(false)} style={{ padding: '16px 32px', borderRadius: '12px', fontWeight: 700, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', cursor: 'pointer' }}>
                {passed ? 'Complete Journey' : 'Replay Quiz'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 20px' }}>
            {/* Progress */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Knowledge Test
                </span>
                <span style={{ color: '#cbd5e1', fontSize: '14px' }}>
                  Question {testQuestion + 1} of 10
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: testAnswers[i] !== null ? colors.success : i === testQuestion ? colors.primary : colors.bgCardLight }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${colors.primary}` }}>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.6 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              {currentQ.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map((opt) => {
                const isConfirmed = testAnswers[testQuestion] !== null;
                const isSelected = isConfirmed ? testAnswers[testQuestion] === opt.id : selectedAnswer === opt.id;
                const isCorrect = !!(opt as any).correct;

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!isConfirmed) {
                        setSelectedAnswer(opt.id);
                      }
                    }}
                    disabled={isConfirmed}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      border: isConfirmed && isSelected
                        ? `2px solid ${isCorrect ? colors.success : colors.error}`
                        : isConfirmed && isCorrect
                          ? `2px solid ${colors.success}`
                          : isSelected && !isConfirmed
                            ? `2px solid ${colors.primary}`
                            : `2px solid ${colors.border}`,
                      backgroundColor: isConfirmed && isSelected
                        ? isCorrect ? `${colors.success}20` : `${colors.error}20`
                        : isConfirmed && isCorrect
                          ? `${colors.success}10`
                          : isSelected && !isConfirmed
                            ? `${colors.primary}20`
                            : colors.bgCard,
                      cursor: isConfirmed ? 'default' : 'pointer',
                      textAlign: 'left',
                      opacity: isConfirmed && !isSelected && !isCorrect ? 0.5 : 1
                    }}
                  >
                    <span style={{ color: colors.textPrimary }}>{opt.label}</span>
                    {isConfirmed && isCorrect && <span style={{ marginLeft: '8px', color: colors.success }}>{'\u2713'}</span>}
                    {isConfirmed && isSelected && !isCorrect && <span style={{ marginLeft: '8px', color: colors.error }}>{'\u2717'}</span>}
                  </button>
                );
              })}
            </div>

            {/* Check Answer button */}
            {selectedAnswer && testAnswers[testQuestion] === null && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button onClick={() => { const newAnswers = [...testAnswers]; newAnswers[testQuestion] = selectedAnswer; setTestAnswers(newAnswers); setSelectedAnswer(null); }} style={{ padding: '14px 32px', borderRadius: '10px', fontWeight: 700, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', cursor: 'pointer' }}>
                  Check Answer
                </button>
              </div>
            )}

            {/* Feedback */}
            {testAnswers[testQuestion] !== null && (
              <div style={{ textAlign: 'center', marginTop: '20px', padding: '16px', borderRadius: '12px', backgroundColor: testAnswers[testQuestion] === currentQ.options.find(o => (o as any).correct)?.id ? `${colors.success}15` : `${colors.error}15` }}>
                {testAnswers[testQuestion] === currentQ.options.find(o => (o as any).correct)?.id ? (
                  <div style={{ color: colors.success, fontSize: '24px', fontWeight: 700 }}>Correct!</div>
                ) : (
                  <div style={{ color: colors.error, fontSize: '24px', fontWeight: 700 }}>Incorrect</div>
                )}
              </div>
            )}

            {/* Explanation */}
            {testAnswers[testQuestion] !== null && (
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginTop: '20px', borderLeft: `4px solid ${colors.warning}` }}>
                <h4 style={{ color: colors.warning, fontWeight: 700, marginBottom: '8px' }}>Explanation</h4>
                <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>{currentQ.explanation}</p>
              </div>
            )}

            {/* Navigation */}
            {testAnswers[testQuestion] !== null && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <button
                  onClick={() => {
                    if (testQuestion < 9) {
                      setTestQuestion(testQuestion + 1);
                    } else {
                      setTestSubmitted(true);
                    }
                  }}
                  style={{ padding: '14px 28px', borderRadius: '10px', fontWeight: 700, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  {testQuestion < 9 ? 'Next Question' : 'See Results'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
            Mastery Achieved!
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '18px', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
            You now understand DC motor commutation - the ingenious trick that transforms oscillating torque into continuous rotation. From power tools to starter motors, this principle powers countless devices.
          </p>
          <button onClick={() => { onComplete?.(); window.dispatchEvent(new CustomEvent('returnToDashboard')); }} style={{ padding: '18px 36px', borderRadius: '14px', fontWeight: 700, fontSize: '16px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}50` }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ClassicDCMotorRenderer;
