'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// =============================================================================
// GAME 264: H-BRIDGE MOTOR DRIVE
// How H-bridge circuits control DC motor direction and speed using 4 MOSFETs
// Demonstrates switching states, shoot-through danger, PWM speed control
// =============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface HBridgeDriveRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
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
};

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: 'A robotics team is building a DC motor driver for a combat robot. They need the motor to spin in both directions at variable speed.',
    question: 'Which switch combination drives the motor forward (current left-to-right)?',
    options: [
      { id: 'a', label: 'Q1 and Q3 ON, Q2 and Q4 OFF' },
      { id: 'b', label: 'Q1 and Q4 ON, Q2 and Q3 OFF', correct: true },
      { id: 'c', label: 'All four switches ON' },
      { id: 'd', label: 'Q2 and Q4 ON, Q1 and Q3 OFF' }
    ],
    explanation: 'Forward drive uses Q1 (high-side left) and Q4 (low-side right) ON. Current flows from V+ through Q1, left-to-right through the motor, then through Q4 to ground. This creates the forward current path through the H-bridge diagonal.'
  },
  {
    scenario: 'During testing, a student accidentally turns on Q1 and Q3 at the same time. Both are on the left leg of the H-bridge.',
    question: 'What happens when both switches on the same leg are ON simultaneously?',
    options: [
      { id: 'a', label: 'The motor spins at double speed' },
      { id: 'b', label: 'The motor brakes smoothly' },
      { id: 'c', label: 'A shoot-through short circuit occurs, potentially destroying both MOSFETs', correct: true },
      { id: 'd', label: 'Nothing happens because the motor acts as a load' }
    ],
    explanation: 'Shoot-through creates a direct short from V+ to GND through Q1 and Q3. With no significant resistance in the path, massive current flows (potentially hundreds of amps), generating extreme heat that can destroy both MOSFETs in microseconds. This is the most dangerous failure mode in H-bridge circuits.'
  },
  {
    scenario: 'An electric wheelchair controller needs to stop the motor quickly when the joystick is released. The controller can choose between letting the motor coast or actively braking.',
    question: 'How does an H-bridge implement active braking?',
    options: [
      { id: 'a', label: 'Turn all switches OFF to let the motor coast' },
      { id: 'b', label: 'Turn on both low-side switches (Q3 and Q4) to short the motor terminals together', correct: true },
      { id: 'c', label: 'Reverse the motor direction at full speed' },
      { id: 'd', label: 'Disconnect the battery' }
    ],
    explanation: 'Active braking (also called dynamic braking) shorts the motor terminals together through the low-side switches. The spinning motor acts as a generator, but the short circuit dissipates the energy as heat in the motor windings, stopping it quickly. This is much faster than coasting (all switches OFF).'
  },
  {
    scenario: 'A drone motor controller uses PWM at 20kHz to control motor speed. The duty cycle is set to 50%.',
    question: 'What is the average voltage across the motor if the supply is 12V?',
    options: [
      { id: 'a', label: '12V - PWM does not affect voltage' },
      { id: 'b', label: '6V - the average voltage equals supply voltage times duty cycle', correct: true },
      { id: 'c', label: '0V - the motor sees no net voltage' },
      { id: 'd', label: '24V - PWM doubles the voltage' }
    ],
    explanation: 'PWM controls motor speed by rapidly switching the full supply voltage on and off. At 50% duty cycle, the motor sees 12V for half the time and 0V for the other half. The motor inductance smooths this into an effective average of 6V (12V x 0.50 = 6V), producing approximately half speed.'
  },
  {
    scenario: 'An H-bridge motor driver IC specifies a minimum dead time of 500ns between turning off one switch and turning on the complementary switch on the same leg.',
    question: 'Why is dead time essential in H-bridge operation?',
    options: [
      { id: 'a', label: 'To allow the motor to cool down between pulses' },
      { id: 'b', label: 'To prevent shoot-through by ensuring one MOSFET is fully OFF before the other turns ON', correct: true },
      { id: 'c', label: 'To synchronize with the PWM frequency' },
      { id: 'd', label: 'To reduce electromagnetic interference' }
    ],
    explanation: 'MOSFETs do not switch instantaneously - they take time to fully turn off (typically 100-500ns). Dead time is a deliberate delay inserted between turning off one switch and turning on its complement. Without dead time, both switches could be partially ON simultaneously, causing shoot-through. The 500ns dead time ensures the turning-off MOSFET is completely OFF before the other turns ON.'
  },
  {
    scenario: 'A conveyor belt system uses a 24V DC motor controlled by an H-bridge. The motor needs to run at 75% speed in the forward direction.',
    question: 'What PWM configuration achieves this?',
    options: [
      { id: 'a', label: 'Q1 always ON, Q4 PWM at 75% duty cycle, Q2 and Q3 OFF', correct: true },
      { id: 'b', label: 'All switches PWM at 75% duty cycle' },
      { id: 'c', label: 'Q1 and Q4 both PWM at 75% in phase' },
      { id: 'd', label: 'Reduce supply voltage to 18V' }
    ],
    explanation: 'The most common PWM strategy keeps the high-side switch (Q1) ON continuously and PWMs the low-side diagonal switch (Q4) at 75% duty cycle. When Q4 is ON, current flows through the motor. When Q4 is OFF, the motor current freewheels through Q3 body diode. This produces an average motor voltage of 24V x 0.75 = 18V.'
  },
  {
    scenario: 'An engineer notices that the MOSFETs in an H-bridge are getting very hot even at low motor load. The PWM frequency is set to 2kHz.',
    question: 'What is likely causing the excessive heat?',
    options: [
      { id: 'a', label: 'The motor is drawing too much current' },
      { id: 'b', label: 'The PWM frequency is too low, causing audible noise but not heat' },
      { id: 'c', label: 'Insufficient dead time is causing brief shoot-through events during every switching transition', correct: true },
      { id: 'd', label: 'The supply voltage is too high' }
    ],
    explanation: 'Even brief shoot-through events lasting nanoseconds cause massive current spikes. At 2kHz PWM with two transitions per cycle, that is 4000 shoot-through events per second. Each event dissipates significant energy. The cumulative heating can destroy MOSFETs even at low motor load. Proper dead time insertion eliminates this problem.'
  },
  {
    scenario: 'A high-side N-channel MOSFET (Q1) in an H-bridge needs its gate voltage to be higher than the source voltage to stay ON. When Q1 is ON, its source is at V+ (e.g., 12V).',
    question: 'How is the gate driven above the supply rail?',
    options: [
      { id: 'a', label: 'Use a higher voltage battery for the gate' },
      { id: 'b', label: 'A bootstrap circuit charges a capacitor that provides gate voltage above V+', correct: true },
      { id: 'c', label: 'Use P-channel MOSFETs instead - they do not have this problem' },
      { id: 'd', label: 'The gate does not need to be above the source voltage' }
    ],
    explanation: 'Bootstrap gate drive is the standard solution. A small capacitor is charged to the supply voltage through a diode when the low-side switch is ON (pulling the midpoint to ground). When the high-side switch turns ON, the capacitor voltage rides up with the source, providing Vgs > Vth to keep Q1 ON. This is why the low-side switch must turn ON periodically - to refresh the bootstrap capacitor.'
  },
  {
    scenario: 'A 3D printer uses H-bridge drivers for its stepper motors. The printer produces audible whining noise during operation.',
    question: 'What causes the audible noise, and how can it be reduced?',
    options: [
      { id: 'a', label: 'The motors are defective' },
      { id: 'b', label: 'The PWM frequency is in the audible range (below 20kHz); increasing it above 20kHz eliminates the noise', correct: true },
      { id: 'c', label: 'The power supply is unstable' },
      { id: 'd', label: 'The print head is vibrating mechanically' }
    ],
    explanation: 'PWM switching causes the motor windings to vibrate at the switching frequency due to magnetostriction. If the PWM frequency is below 20kHz, humans can hear it as a whine or whistle. Modern stepper drivers like the TMC2209 use SpreadCycle or StealthChop modes with PWM frequencies above 20kHz to achieve silent operation.'
  },
  {
    scenario: 'An electric go-kart uses regenerative braking. When the driver releases the throttle, the motor acts as a generator and charges the battery.',
    question: 'How does the H-bridge enable regenerative braking?',
    options: [
      { id: 'a', label: 'By reversing all the switches to run the motor backwards' },
      { id: 'b', label: 'By using the body diodes of the MOSFETs to route generator current back to the battery while controlling braking force with PWM', correct: true },
      { id: 'c', label: 'By disconnecting the motor and connecting a separate generator' },
      { id: 'd', label: 'Regenerative braking is not possible with an H-bridge' }
    ],
    explanation: 'During regenerative braking, the spinning motor generates back-EMF. The body diodes of the MOSFETs provide a natural current path from the motor back to the battery. By PWM-controlling the low-side switches, the braking force (and energy recovery rate) is precisely controlled. This is the same principle used in electric vehicles like Tesla.'
  }
];

// =============================================================================
// REAL-WORLD APPLICATIONS for TransferPhaseView
// =============================================================================
const realWorldApps = [
  {
    icon: '🤖',
    title: 'Industrial Robotics',
    short: 'Precise motor control in manufacturing',
    tagline: 'Every robot joint uses an H-bridge',
    description: 'Industrial robots use H-bridge motor drivers for each joint axis, enabling precise position and speed control. Modern 6-axis robots contain at least 6 independent H-bridge drivers, each running at 20kHz+ PWM for smooth, silent operation.',
    connection: 'The H-bridge switching states you learned (forward, reverse, brake, coast) are the fundamental building blocks of robotic motion control. Dead time prevents catastrophic shoot-through during rapid direction changes.',
    howItWorks: 'Each robot joint motor has a dedicated H-bridge driver IC with integrated current sensing. A microcontroller runs a PID control loop, adjusting PWM duty cycle thousands of times per second to achieve precise position tracking. Encoder feedback closes the loop for sub-degree accuracy.',
    stats: [
      { value: '20kHz+', label: 'PWM switching frequency' },
      { value: '0.01mm', label: 'Positioning accuracy' },
      { value: '100A+', label: 'Peak motor current' }
    ],
    examples: ['Welding robots in auto factories', 'Pick-and-place machines', 'CNC machine tool spindles', 'Surgical robot arms'],
    companies: ['Texas Instruments', 'Infineon', 'STMicroelectronics', 'Allegro'],
    futureImpact: 'GaN (Gallium Nitride) H-bridge drivers switch 10x faster than silicon, enabling higher PWM frequencies, smaller magnetics, and more precise control for next-generation collaborative robots.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Window and Seat Motors',
    short: 'Bidirectional motor control in vehicles',
    tagline: 'Every power window is an H-bridge application',
    description: 'Every power window, seat adjuster, mirror, and windshield wiper in modern vehicles uses an H-bridge for bidirectional DC motor control. A single car may contain 20-40 H-bridge motor drivers.',
    connection: 'The forward/reverse switching you practiced is exactly how power windows go up and down. Active braking stops the window precisely at the top/bottom position. PWM controls speed for soft-start and anti-pinch safety features.',
    howItWorks: 'A dedicated H-bridge IC receives direction and speed commands from the body control module via CAN bus. Current sensing detects obstacles (anti-pinch protection) and end-of-travel conditions. PWM ramps provide smooth start/stop to reduce mechanical stress.',
    stats: [
      { value: '20-40', label: 'H-bridges per vehicle' },
      { value: '30A', label: 'Typical motor current' },
      { value: '<100ms', label: 'Anti-pinch response time' }
    ],
    examples: ['Power windows (up/down)', 'Seat position motors (6-way)', 'Side mirror adjustment', 'Sunroof and trunk lift'],
    companies: ['NXP', 'Infineon', 'ON Semiconductor', 'Bosch'],
    futureImpact: 'Smart H-bridge ICs with integrated diagnostics and over-the-air updates enable predictive maintenance, detecting worn motors before they fail.',
    color: '#22C55E'
  },
  {
    icon: '🏭',
    title: 'Conveyor Belt Systems',
    short: 'Industrial material handling',
    tagline: 'Moving products at precisely controlled speeds',
    description: 'Conveyor belts in warehouses, airports, and factories use H-bridge motor controllers for variable speed and direction control. Amazon fulfillment centers alone use thousands of conveyor motor controllers.',
    connection: 'PWM duty cycle controls belt speed precisely, while the ability to reverse direction enables sorting and diverting operations. Active braking stops belts quickly for safety and package positioning.',
    howItWorks: 'A PLC sends speed and direction commands to H-bridge motor controllers. The PWM duty cycle sets belt speed, while current monitoring detects jams or overloads. Soft-start ramps prevent packages from sliding during acceleration.',
    stats: [
      { value: '0-100%', label: 'Speed range via PWM' },
      { value: '99.9%', label: 'Uptime requirement' },
      { value: '10,000+', label: 'Motors in large warehouse' }
    ],
    examples: ['Amazon fulfillment centers', 'Airport baggage handling', 'Mining ore transport', 'Food processing lines'],
    companies: ['Siemens', 'ABB', 'Rockwell Automation', 'Mitsubishi Electric'],
    futureImpact: 'IoT-connected H-bridge controllers enable real-time optimization of conveyor networks, reducing energy consumption by 30% through intelligent speed matching.',
    color: '#F59E0B'
  },
  {
    icon: '🎮',
    title: 'RC Cars and Drones',
    short: 'Hobby and consumer motor control',
    tagline: 'From toy cars to racing drones',
    description: 'Every RC car, drone, and hobby robot uses H-bridge ESCs (Electronic Speed Controllers) to drive brushed DC motors. Modern brushless ESCs use three half-bridges (6 MOSFETs) for three-phase motor control.',
    connection: 'The PWM speed control and direction switching you learned is the exact technology in every RC car ESC. Understanding shoot-through prevention explains why cheap ESCs burn out while quality ones survive.',
    howItWorks: 'The ESC receives throttle commands from the radio receiver as PWM signals. It translates these into H-bridge switching patterns. Brake mode shorts the motor for stopping. Proportional control maps stick position to duty cycle for smooth speed response.',
    stats: [
      { value: '32kHz', label: 'Typical PWM frequency' },
      { value: '100A+', label: 'Racing ESC current rating' },
      { value: '<1ms', label: 'Throttle response time' }
    ],
    examples: ['RC car speed controllers', 'Drone flight controllers', 'Battle bot motor drivers', 'Educational robotics kits'],
    companies: ['Hobbywing', 'Castle Creations', 'BetaFPV', 'Pololu'],
    futureImpact: 'Integrated motor driver SoCs with built-in microcontrollers and sensors are making sophisticated motor control accessible to hobbyists and makers at under $2 per chip.',
    color: '#A855F7'
  }
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const HBridgeDriveRenderer: React.FC<HBridgeDriveRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();

  // Switch states
  const [q1, setQ1] = useState(false);
  const [q2, setQ2] = useState(false);
  const [q3, setQ3] = useState(false);
  const [q4, setQ4] = useState(false);

  // PWM controls
  const [dutyCycle, setDutyCycle] = useState(100);
  const [pwmFrequency, setPwmFrequency] = useState(20); // kHz
  const [deadTime, setDeadTime] = useState(500); // ns

  // Animation
  const [animTime, setAnimTime] = useState(0);
  const [shootThroughFlash, setShootThroughFlash] = useState(0);

  // Play phase tracking
  const [triedForward, setTriedForward] = useState(false);
  const [triedReverse, setTriedReverse] = useState(false);
  const [triedBrake, setTriedBrake] = useState(false);
  const [triedCoast, setTriedCoast] = useState(false);
  const [triedShootThrough, setTriedShootThrough] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // Navigation ref
  const isNavigating = useRef(false);

  // Derived states
  const shootThroughLeft = q1 && q3;
  const shootThroughRight = q2 && q4;
  const isShootThrough = shootThroughLeft || shootThroughRight;
  const isForward = q1 && q4 && !q2 && !q3;
  const isReverse = q2 && q3 && !q1 && !q4;
  const isBrake = (q3 && q4 && !q1 && !q2) || (q1 && q2 && !q3 && !q4);
  const isCoast = !q1 && !q2 && !q3 && !q4;
  const motorState = isShootThrough ? 'shoot-through' : isForward ? 'forward' : isReverse ? 'reverse' : isBrake ? 'brake' : isCoast ? 'coast' : 'invalid';
  const avgVoltage = (isForward || isReverse) ? (12 * dutyCycle / 100) : 0;
  const motorSpeed = (isForward || isReverse) ? dutyCycle : 0;

  // Track states tried
  useEffect(() => {
    if (isForward) setTriedForward(true);
    if (isReverse) setTriedReverse(true);
    if (isBrake) setTriedBrake(true);
    if (isCoast) setTriedCoast(true);
    if (isShootThrough) setTriedShootThrough(true);
  }, [isForward, isReverse, isBrake, isCoast, isShootThrough]);

  // Shoot-through flash effect
  useEffect(() => {
    if (isShootThrough) {
      setShootThroughFlash(1);
      const interval = setInterval(() => {
        setShootThroughFlash(prev => prev > 0 ? prev * 0.92 : 0);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setShootThroughFlash(0);
    }
  }, [isShootThrough]);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimTime(prev => (prev + 0.08) % (Math.PI * 20));
    }, 33);
    return () => clearInterval(interval);
  }, []);

  // Color palette
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    mosfetOn: '#22c55e',
    mosfetOff: '#4b5563',
    mosfetDanger: '#ef4444',
    currentFlow: '#3b82f6',
    motorCW: '#22c55e',
    motorCCW: '#a855f7',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction', predict: 'Predict', play: 'Experiment',
    review: 'Understanding', twist_predict: 'New Variable', twist_play: 'PWM Control',
    twist_review: 'Deep Insight', transfer: 'Real World', test: 'Knowledge Test', mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    requestAnimationFrame(() => { window.scrollTo(0, 0); });
    if (onGameEvent) {
      onGameEvent({ eventType: 'phase_changed', gameType: 'h-bridge-drive', gameTitle: 'H-Bridge Motor Drive', details: { phase: p }, timestamp: Date.now() });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  // =========================================================================
  // H-BRIDGE SVG VISUALIZATION
  // =========================================================================
  const HBridgeSVG = ({ interactive, showPWM }: { interactive: boolean; showPWM?: boolean }) => {
    const w = isMobile ? 340 : 520;
    const h = isMobile ? 380 : 440;
    const cx = w / 2;

    // Layout positions
    const railY = 40;
    const gndY = h - 40;
    const motorCY = h / 2;
    const leftX = isMobile ? 60 : 120;
    const rightX = w - leftX;
    const mosfetW = isMobile ? 44 : 56;
    const mosfetH = isMobile ? 28 : 32;
    const topMosfetY = isMobile ? 100 : 120;
    const botMosfetY = isMobile ? 250 : 300;

    const switchColor = (on: boolean, shootThrough: boolean) =>
      shootThrough ? colors.mosfetDanger : on ? colors.mosfetOn : colors.mosfetOff;

    // Current arrow animation offset
    const arrowOffset = (animTime * 30) % 40;

    // PWM waveform points
    const pwmPoints = showPWM ? (() => {
      const py = h - 20;
      const pw = isMobile ? 140 : 200;
      const px = cx - pw / 2;
      const ph = 30;
      const pts: string[] = [];
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pwmPhase = (t * pwmFrequency * 0.4) % 1;
        const isOn = pwmPhase < (dutyCycle / 100);
        const x = px + t * pw;
        const y = isOn ? py - ph : py;
        if (i === 0) pts.push(`M ${x} ${y}`);
        else pts.push(`L ${x} ${y}`);
      }
      return pts.join(' ');
    })() : '';

    return (
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ borderRadius: '12px', maxWidth: isMobile ? '360px' : '540px', background: colors.bgCard }}
        role="img"
        aria-label="H-Bridge motor drive circuit"
      >
        <defs>
          <filter id="hbGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="hbDangerGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={colors.currentFlow} />
          </marker>
        </defs>

        {/* Shoot-through flash overlay */}
        {isShootThrough && (
          <rect x="0" y="0" width={w} height={h} rx="12"
            fill={colors.mosfetDanger} opacity={shootThroughFlash * 0.35}
          />
        )}

        {/* V+ Rail */}
        <line x1={leftX} y1={railY} x2={rightX} y2={railY} stroke={colors.error} strokeWidth="3" />
        <text x={cx} y={railY - 8} textAnchor="middle" fill={colors.error} fontSize="13" fontWeight="bold">V+ (12V)</text>
        <text x={leftX - 8} y={railY + 4} textAnchor="end" fill={colors.error} fontSize="11">+</text>

        {/* GND Rail */}
        <line x1={leftX} y1={gndY} x2={rightX} y2={gndY} stroke={colors.textMuted} strokeWidth="3" />
        <text x={cx} y={gndY + 18} textAnchor="middle" fill={colors.textMuted} fontSize="13" fontWeight="bold">GND</text>

        {/* Left leg vertical wires */}
        <line x1={leftX} y1={railY} x2={leftX} y2={topMosfetY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={leftX} y1={topMosfetY + mosfetH} x2={leftX} y2={motorCY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={leftX} y1={motorCY} x2={cx - 30} y2={motorCY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={leftX} y1={motorCY} x2={leftX} y2={botMosfetY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={leftX} y1={botMosfetY + mosfetH} x2={leftX} y2={gndY} stroke={colors.textMuted} strokeWidth="2" />

        {/* Right leg vertical wires */}
        <line x1={rightX} y1={railY} x2={rightX} y2={topMosfetY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={rightX} y1={topMosfetY + mosfetH} x2={rightX} y2={motorCY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={rightX} y1={motorCY} x2={cx + 30} y2={motorCY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={rightX} y1={motorCY} x2={rightX} y2={botMosfetY} stroke={colors.textMuted} strokeWidth="2" />
        <line x1={rightX} y1={botMosfetY + mosfetH} x2={rightX} y2={gndY} stroke={colors.textMuted} strokeWidth="2" />

        {/* Q1 - Top Left MOSFET */}
        <rect x={leftX - mosfetW / 2} y={topMosfetY} width={mosfetW} height={mosfetH} rx="4"
          fill={colors.bgSecondary} stroke={switchColor(q1, shootThroughLeft)} strokeWidth="2.5"
          style={interactive ? { cursor: 'pointer' } : {}}
          onClick={interactive ? () => { playSound('click'); setQ1(!q1); } : undefined}
        />
        <text x={leftX} y={topMosfetY + mosfetH / 2 + 5} textAnchor="middle"
          fill={switchColor(q1, shootThroughLeft)} fontSize="13" fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >Q1</text>
        <text x={leftX} y={topMosfetY - 6} textAnchor="middle"
          fill={q1 ? colors.mosfetOn : colors.textMuted} fontSize="10"
          style={{ pointerEvents: 'none' }}
        >{q1 ? 'ON' : 'OFF'}</text>

        {/* Q2 - Top Right MOSFET */}
        <rect x={rightX - mosfetW / 2} y={topMosfetY} width={mosfetW} height={mosfetH} rx="4"
          fill={colors.bgSecondary} stroke={switchColor(q2, shootThroughRight)} strokeWidth="2.5"
          style={interactive ? { cursor: 'pointer' } : {}}
          onClick={interactive ? () => { playSound('click'); setQ2(!q2); } : undefined}
        />
        <text x={rightX} y={topMosfetY + mosfetH / 2 + 5} textAnchor="middle"
          fill={switchColor(q2, shootThroughRight)} fontSize="13" fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >Q2</text>
        <text x={rightX} y={topMosfetY - 6} textAnchor="middle"
          fill={q2 ? colors.mosfetOn : colors.textMuted} fontSize="10"
          style={{ pointerEvents: 'none' }}
        >{q2 ? 'ON' : 'OFF'}</text>

        {/* Q3 - Bottom Left MOSFET */}
        <rect x={leftX - mosfetW / 2} y={botMosfetY} width={mosfetW} height={mosfetH} rx="4"
          fill={colors.bgSecondary} stroke={switchColor(q3, shootThroughLeft)} strokeWidth="2.5"
          style={interactive ? { cursor: 'pointer' } : {}}
          onClick={interactive ? () => { playSound('click'); setQ3(!q3); } : undefined}
        />
        <text x={leftX} y={botMosfetY + mosfetH / 2 + 5} textAnchor="middle"
          fill={switchColor(q3, shootThroughLeft)} fontSize="13" fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >Q3</text>
        <text x={leftX} y={botMosfetY + mosfetH + 14} textAnchor="middle"
          fill={q3 ? colors.mosfetOn : colors.textMuted} fontSize="10"
          style={{ pointerEvents: 'none' }}
        >{q3 ? 'ON' : 'OFF'}</text>

        {/* Q4 - Bottom Right MOSFET */}
        <rect x={rightX - mosfetW / 2} y={botMosfetY} width={mosfetW} height={mosfetH} rx="4"
          fill={colors.bgSecondary} stroke={switchColor(q4, shootThroughRight)} strokeWidth="2.5"
          style={interactive ? { cursor: 'pointer' } : {}}
          onClick={interactive ? () => { playSound('click'); setQ4(!q4); } : undefined}
        />
        <text x={rightX} y={botMosfetY + mosfetH / 2 + 5} textAnchor="middle"
          fill={switchColor(q4, shootThroughRight)} fontSize="13" fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >Q4</text>
        <text x={rightX} y={botMosfetY + mosfetH + 14} textAnchor="middle"
          fill={q4 ? colors.mosfetOn : colors.textMuted} fontSize="10"
          style={{ pointerEvents: 'none' }}
        >{q4 ? 'ON' : 'OFF'}</text>

        {/* Motor symbol */}
        <circle cx={cx} cy={motorCY} r="28"
          fill={colors.bgSecondary}
          stroke={isShootThrough ? colors.mosfetDanger : isForward ? colors.motorCW : isReverse ? colors.motorCCW : colors.textMuted}
          strokeWidth="3"
        />
        <text x={cx} y={motorCY + 1} textAnchor="middle" dominantBaseline="middle"
          fill={isShootThrough ? colors.mosfetDanger : isForward ? colors.motorCW : isReverse ? colors.motorCCW : colors.textPrimary}
          fontSize="16" fontWeight="bold"
        >M</text>

        {/* Motor rotation arrow */}
        {isForward && !isShootThrough && (
          <path
            d={`M ${cx + 18} ${motorCY - 20} A 20 20 0 0 1 ${cx + 18} ${motorCY + 20}`}
            fill="none" stroke={colors.motorCW} strokeWidth="2"
            markerEnd="url(#arrowBlue)" filter="url(#hbGlow)"
            style={{ animation: 'none' }}
          />
        )}
        {isReverse && !isShootThrough && (
          <path
            d={`M ${cx - 18} ${motorCY + 20} A 20 20 0 0 1 ${cx - 18} ${motorCY - 20}`}
            fill="none" stroke={colors.motorCCW} strokeWidth="2"
            markerEnd="url(#arrowBlue)" filter="url(#hbGlow)"
          />
        )}

        {/* Current flow arrows - Forward: V+ -> Q1 -> Motor L->R -> Q4 -> GND */}
        {isForward && !isShootThrough && (
          <>
            {/* Down through Q1 */}
            <circle cx={leftX} cy={railY + 20 + arrowOffset % 30} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={railY + 10} to={topMosfetY} dur="0.6s" repeatCount="indefinite" />
            </circle>
            {/* Down from Q1 to motor junction */}
            <circle cx={leftX} cy={topMosfetY + mosfetH + 10} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={topMosfetY + mosfetH} to={motorCY} dur="0.4s" repeatCount="indefinite" />
            </circle>
            {/* Across motor L -> R */}
            <circle cx={cx - 20} cy={motorCY} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cx" from={cx - 28} to={cx + 28} dur="0.5s" repeatCount="indefinite" />
            </circle>
            {/* Down through Q4 */}
            <circle cx={rightX} cy={motorCY + 10} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={motorCY} to={botMosfetY} dur="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={rightX} cy={botMosfetY + mosfetH + 10} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={botMosfetY + mosfetH} to={gndY} dur="0.4s" repeatCount="indefinite" />
            </circle>
            {/* Direction label */}
            <text x={cx} y={motorCY + 46} textAnchor="middle" fill={colors.motorCW} fontSize="12" fontWeight="bold">
              FORWARD (CW)
            </text>
          </>
        )}

        {/* Current flow arrows - Reverse: V+ -> Q2 -> Motor R->L -> Q3 -> GND */}
        {isReverse && !isShootThrough && (
          <>
            <circle cx={rightX} cy={railY + 20} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={railY + 10} to={topMosfetY} dur="0.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={rightX} cy={topMosfetY + mosfetH + 10} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={topMosfetY + mosfetH} to={motorCY} dur="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx + 20} cy={motorCY} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cx" from={cx + 28} to={cx - 28} dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={leftX} cy={motorCY + 10} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={motorCY} to={botMosfetY} dur="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={leftX} cy={botMosfetY + mosfetH + 10} r="3" fill={colors.currentFlow} opacity="0.9">
              <animate attributeName="cy" from={botMosfetY + mosfetH} to={gndY} dur="0.4s" repeatCount="indefinite" />
            </circle>
            <text x={cx} y={motorCY + 46} textAnchor="middle" fill={colors.motorCCW} fontSize="12" fontWeight="bold">
              REVERSE (CCW)
            </text>
          </>
        )}

        {/* Brake indicator */}
        {isBrake && (
          <text x={cx} y={motorCY + 46} textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="bold">
            BRAKE (motor shorted)
          </text>
        )}

        {/* Coast indicator */}
        {isCoast && (
          <text x={cx} y={motorCY + 46} textAnchor="middle" fill={colors.textMuted} fontSize="12" fontWeight="bold">
            COAST (disconnected)
          </text>
        )}

        {/* Shoot-through warning */}
        {isShootThrough && (
          <>
            {/* Lightning bolts on shorted legs */}
            {shootThroughLeft && (
              <>
                <line x1={leftX - 8} y1={topMosfetY + mosfetH + 10} x2={leftX + 8} y2={topMosfetY + mosfetH + 30}
                  stroke={colors.mosfetDanger} strokeWidth="3" filter="url(#hbDangerGlow)" />
                <line x1={leftX + 8} y1={topMosfetY + mosfetH + 30} x2={leftX - 8} y2={topMosfetY + mosfetH + 50}
                  stroke={colors.mosfetDanger} strokeWidth="3" filter="url(#hbDangerGlow)" />
                <line x1={leftX - 8} y1={topMosfetY + mosfetH + 50} x2={leftX + 8} y2={topMosfetY + mosfetH + 70}
                  stroke={colors.mosfetDanger} strokeWidth="3" filter="url(#hbDangerGlow)" />
              </>
            )}
            {shootThroughRight && (
              <>
                <line x1={rightX - 8} y1={topMosfetY + mosfetH + 10} x2={rightX + 8} y2={topMosfetY + mosfetH + 30}
                  stroke={colors.mosfetDanger} strokeWidth="3" filter="url(#hbDangerGlow)" />
                <line x1={rightX + 8} y1={topMosfetY + mosfetH + 30} x2={rightX - 8} y2={topMosfetY + mosfetH + 50}
                  stroke={colors.mosfetDanger} strokeWidth="3" filter="url(#hbDangerGlow)" />
                <line x1={rightX - 8} y1={topMosfetY + mosfetH + 50} x2={rightX + 8} y2={topMosfetY + mosfetH + 70}
                  stroke={colors.mosfetDanger} strokeWidth="3" filter="url(#hbDangerGlow)" />
              </>
            )}
            <rect x={cx - 70} y={motorCY + 35} width="140" height="26" rx="6"
              fill={colors.mosfetDanger} opacity="0.9" filter="url(#hbDangerGlow)" />
            <text x={cx} y={motorCY + 52} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
              SHOOT-THROUGH!
            </text>
          </>
        )}

        {/* PWM waveform (twist phase) */}
        {showPWM && !isShootThrough && (isForward || isReverse) && (
          <>
            <rect x={cx - (isMobile ? 75 : 105)} y={h - 60} width={isMobile ? 150 : 210} height="42" rx="6"
              fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
            <text x={cx} y={h - 48} textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="bold">
              PWM: {dutyCycle}% @ {pwmFrequency}kHz
            </text>
            <path d={pwmPoints} fill="none" stroke={colors.accent} strokeWidth="1.5" />
          </>
        )}

        {/* Motor state + voltage readout */}
        {!isShootThrough && !isCoast && (
          <text x={cx} y={motorCY + 60} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            V_avg = {avgVoltage.toFixed(1)}V | Speed: {motorSpeed}%
          </text>
        )}
      </svg>
    );
  };

  // =========================================================================
  // SHARED UI COMPONENTS
  // =========================================================================
  const renderNavBar = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
      background: colors.bgSecondary, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>&#9889;</span>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>H-Bridge Motor Drive</span>
      </div>
      <div style={{ color: colors.textSecondary, fontSize: '14px' }}>{phaseLabels[phase]}</div>
    </div>
  );

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed', top: '56px', left: 0, right: 0, height: '4px',
      background: colors.bgSecondary, zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
      {phaseOrder.map((p, i) => (
        <button key={p} onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px', height: '8px', borderRadius: '4px',
            border: 'none', background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer', transition: 'all 0.3s ease',
          }}
          aria-label={`Go to ${phaseLabels[p]}`}
        />
      ))}
    </div>
  );

  const renderBottomBar = (onNext?: () => void, nextLabel = 'Next', nextDisabled = false) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    return (
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: colors.bgSecondary, borderTop: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px',
      }}>
        <button onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])} disabled={!canGoBack}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: `1px solid ${colors.border}`,
            background: 'transparent', color: canGoBack ? colors.textSecondary : colors.border,
            cursor: canGoBack ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 600, minHeight: '44px',
          }}>
          &#8592; Back
        </button>
        <button onClick={onNext && !nextDisabled ? onNext : undefined} disabled={nextDisabled || !onNext}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none',
            background: nextDisabled || !onNext ? colors.border : `linear-gradient(135deg, ${colors.accent}, #D97706)`,
            color: 'white', cursor: nextDisabled || !onNext ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 700, minHeight: '44px',
            boxShadow: nextDisabled || !onNext ? 'none' : `0 4px 16px ${colors.accentGlow}`,
          }}>
          {nextLabel}
        </button>
      </div>
    );
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`, color: 'white', border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px', borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px', fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`, transition: 'all 0.2s ease', minHeight: '44px',
  };

  // Switch control buttons panel (for play phase right side)
  const SwitchControls = () => (
    <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px' }}>
      <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '16px', fontWeight: 700 }}>Switch Controls</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {([
          { label: 'Q1 (High-L)', on: q1, toggle: () => { playSound('click'); setQ1(!q1); }, st: shootThroughLeft },
          { label: 'Q2 (High-R)', on: q2, toggle: () => { playSound('click'); setQ2(!q2); }, st: shootThroughRight },
          { label: 'Q3 (Low-L)', on: q3, toggle: () => { playSound('click'); setQ3(!q3); }, st: shootThroughLeft },
          { label: 'Q4 (Low-R)', on: q4, toggle: () => { playSound('click'); setQ4(!q4); }, st: shootThroughRight },
        ] as const).map((sw, i) => (
          <button key={i} onClick={sw.toggle} style={{
            padding: '12px 8px', borderRadius: '8px', cursor: 'pointer',
            border: `2px solid ${sw.st && sw.on ? colors.mosfetDanger : sw.on ? colors.mosfetOn : colors.border}`,
            background: sw.st && sw.on ? `${colors.mosfetDanger}22` : sw.on ? `${colors.mosfetOn}22` : colors.bgSecondary,
            color: sw.st && sw.on ? colors.mosfetDanger : sw.on ? colors.mosfetOn : colors.textMuted,
            fontWeight: 600, fontSize: '13px', minHeight: '44px',
          }}>
            {sw.label}<br />{sw.on ? 'ON' : 'OFF'}
          </button>
        ))}
      </div>

      {/* Preset buttons */}
      <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 600 }}>Quick Presets</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {([
          { label: 'Forward (Q1+Q4)', action: () => { setQ1(true); setQ2(false); setQ3(false); setQ4(true); } },
          { label: 'Reverse (Q2+Q3)', action: () => { setQ1(false); setQ2(true); setQ3(true); setQ4(false); } },
          { label: 'Brake (Q3+Q4)', action: () => { setQ1(false); setQ2(false); setQ3(true); setQ4(true); } },
          { label: 'Coast (All OFF)', action: () => { setQ1(false); setQ2(false); setQ3(false); setQ4(false); } },
        ] as const).map((preset, i) => (
          <button key={i} onClick={() => { playSound('click'); preset.action(); }} style={{
            padding: '8px 12px', borderRadius: '6px', border: `1px solid ${colors.border}`,
            background: colors.bgSecondary, color: colors.textSecondary, cursor: 'pointer',
            fontSize: '12px', textAlign: 'left', minHeight: '36px',
          }}>
            {preset.label}
          </button>
        ))}
      </div>

      {/* Motor state display */}
      <div style={{
        marginTop: '16px', padding: '12px', borderRadius: '8px',
        background: isShootThrough ? `${colors.mosfetDanger}22` : colors.bgSecondary,
        border: `1px solid ${isShootThrough ? colors.mosfetDanger : colors.border}`,
      }}>
        <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Motor State:</div>
        <div style={{
          fontSize: '16px', fontWeight: 700,
          color: isShootThrough ? colors.mosfetDanger : isForward ? colors.motorCW : isReverse ? colors.motorCCW : colors.warning,
        }}>
          {motorState === 'shoot-through' ? 'SHOOT-THROUGH!' :
            motorState === 'forward' ? 'Forward (CW)' :
            motorState === 'reverse' ? 'Reverse (CCW)' :
            motorState === 'brake' ? 'Active Brake' :
            motorState === 'coast' ? 'Coast (Off)' : 'Invalid State'}
        </div>
        {isShootThrough && (
          <div style={{ ...typo.small, color: colors.mosfetDanger, marginTop: '4px' }}>
            DANGER: Direct short V+ to GND!
          </div>
        )}
      </div>
    </div>
  );

  // =========================================================================
  // PHASE RENDERS
  // =========================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{
          flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px',
          paddingLeft: isMobile ? '16px' : '24px', paddingRight: isMobile ? '16px' : '24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            &#9889;&#9881;&#65039;
          </div>
          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            H-Bridge Motor Drive
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
            How do you make a motor spin <span style={{ color: colors.motorCW }}>both directions</span> with just a battery?
            The answer is one of the most important circuits in power electronics: the <span style={{ color: colors.accent }}>H-Bridge</span>.
          </p>
          <div style={{
            background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px',
            maxWidth: '500px', border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Four switches. Infinite control. One wrong combination and it all goes up in smoke.
              The H-bridge is the most elegant and dangerous circuit in motor control."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>
              -- Power Electronics Engineering
            </p>
          </div>

          {/* Simple teaser diagram */}
          <svg width="100%" height="160" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid meet"
            style={{ maxWidth: '320px', marginBottom: '16px' }}>
            <rect x="20" y="40" width="260" height="80" rx="12" fill={colors.bgCard} stroke={colors.accent} strokeWidth="2" />
            <text x="150" y="30" textAnchor="middle" fill={colors.textMuted} fontSize="12">Battery +</text>
            <text x="150" y="140" textAnchor="middle" fill={colors.textMuted} fontSize="12">Battery -</text>
            <rect x="45" y="55" width="36" height="20" rx="4" fill={colors.bgSecondary} stroke={colors.mosfetOn} strokeWidth="1.5" />
            <text x="63" y="69" textAnchor="middle" fill={colors.mosfetOn} fontSize="10" fontWeight="bold">Q1</text>
            <rect x="219" y="55" width="36" height="20" rx="4" fill={colors.bgSecondary} stroke={colors.mosfetOff} strokeWidth="1.5" />
            <text x="237" y="69" textAnchor="middle" fill={colors.mosfetOff} fontSize="10" fontWeight="bold">Q2</text>
            <rect x="45" y="88" width="36" height="20" rx="4" fill={colors.bgSecondary} stroke={colors.mosfetOff} strokeWidth="1.5" />
            <text x="63" y="102" textAnchor="middle" fill={colors.mosfetOff} fontSize="10" fontWeight="bold">Q3</text>
            <rect x="219" y="88" width="36" height="20" rx="4" fill={colors.bgSecondary} stroke={colors.mosfetOn} strokeWidth="1.5" />
            <text x="237" y="102" textAnchor="middle" fill={colors.mosfetOn} fontSize="10" fontWeight="bold">Q4</text>
            <circle cx="150" cy="80" r="18" fill={colors.bgSecondary} stroke={colors.motorCW} strokeWidth="2" />
            <text x="150" y="84" textAnchor="middle" fill={colors.motorCW} fontSize="14" fontWeight="bold">M</text>
            <text x="150" y="80" textAnchor="middle" fill={colors.accent} fontSize="48" opacity="0.15">H</text>
          </svg>

          {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('click'); nextPhase(); }, 'Explore H-Bridge Technology \u2192')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Turn on all four switches for maximum power' },
      { id: 'b', text: 'Turn on Q1 (top-left) and Q4 (bottom-right) to create a diagonal current path', correct: true },
      { id: 'c', text: 'Alternate the two top switches rapidly' },
      { id: 'd', text: 'Use only the bottom two switches' },
    ];
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '80px 24px 24px', overflowY: 'auto' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`, borderRadius: '12px', padding: '16px',
            marginBottom: '24px', border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
          </div>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Which switch combination drives current forward (left to right) through the motor?
          </h2>

          {/* Static H-bridge diagram */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '400px' }}>
              <line x1="80" y1="20" x2="320" y2="20" stroke={colors.error} strokeWidth="2" />
              <text x="200" y="14" textAnchor="middle" fill={colors.error} fontSize="11">V+</text>
              <line x1="80" y1="160" x2="320" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <text x="200" y="176" textAnchor="middle" fill={colors.textMuted} fontSize="11">GND</text>
              {/* Left leg */}
              <line x1="100" y1="20" x2="100" y2="50" stroke={colors.textMuted} strokeWidth="1.5" />
              <rect x="78" y="50" width="44" height="24" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="100" y="66" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">Q1?</text>
              <line x1="100" y1="74" x2="100" y2="90" stroke={colors.textMuted} strokeWidth="1.5" />
              <line x1="100" y1="90" x2="160" y2="90" stroke={colors.textMuted} strokeWidth="1.5" />
              <line x1="100" y1="90" x2="100" y2="110" stroke={colors.textMuted} strokeWidth="1.5" />
              <rect x="78" y="110" width="44" height="24" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="100" y="126" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">Q3?</text>
              <line x1="100" y1="134" x2="100" y2="160" stroke={colors.textMuted} strokeWidth="1.5" />
              {/* Right leg */}
              <line x1="300" y1="20" x2="300" y2="50" stroke={colors.textMuted} strokeWidth="1.5" />
              <rect x="278" y="50" width="44" height="24" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="300" y="66" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">Q2?</text>
              <line x1="300" y1="74" x2="300" y2="90" stroke={colors.textMuted} strokeWidth="1.5" />
              <line x1="240" y1="90" x2="300" y2="90" stroke={colors.textMuted} strokeWidth="1.5" />
              <line x1="300" y1="90" x2="300" y2="110" stroke={colors.textMuted} strokeWidth="1.5" />
              <rect x="278" y="110" width="44" height="24" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="300" y="126" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">Q4?</text>
              <line x1="300" y1="134" x2="300" y2="160" stroke={colors.textMuted} strokeWidth="1.5" />
              {/* Motor */}
              <circle cx="200" cy="90" r="22" fill={colors.bgSecondary} stroke={colors.textPrimary} strokeWidth="2" />
              <text x="200" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">M</text>
              {/* Direction arrow */}
              <line x1="155" y1="82" x2="245" y2="82" stroke={colors.accent} strokeWidth="1" strokeDasharray="4 3" />
              <polygon points="245,79 252,82 245,85" fill={colors.accent} />
              <text x="200" y="75" textAnchor="middle" fill={colors.accent} fontSize="9">Forward?</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button key={opt.id} onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.2s', minHeight: '44px',
                }}>
                <span style={{
                  display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
        {renderNavDots()}
        {renderBottomBar(prediction ? () => { playSound('success'); nextPhase(); } : undefined, 'Continue \u2192', !prediction)}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    const allStatesTried = triedForward && triedReverse && triedBrake && triedCoast;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: colors.bgPrimary, overflow: 'hidden' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              H-Bridge Switching Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Toggle MOSFETs to control motor direction. Try all four states and discover the shoot-through danger.
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px' }}>
                  <HBridgeSVG interactive={true} />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <SwitchControls />
              </div>
            </div>

            {/* Progress checklist */}
            <div style={{
              marginTop: '20px', background: `${colors.success}11`, border: `1px solid ${colors.success}33`,
              borderRadius: '12px', padding: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                States to Try ({[triedForward, triedReverse, triedBrake, triedCoast].filter(Boolean).length}/4):
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { done: triedForward, label: 'Forward (Q1+Q4)' },
                  { done: triedReverse, label: 'Reverse (Q2+Q3)' },
                  { done: triedBrake, label: 'Brake (Q3+Q4)' },
                  { done: triedCoast, label: 'Coast (All OFF)' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: item.done ? colors.success : colors.textMuted }}>{item.done ? '\u2713' : '\u25CB'}</span>
                    <span style={{ ...typo.small, color: item.done ? colors.textPrimary : colors.textMuted }}>{item.label}</span>
                  </div>
                ))}
              </div>
              {triedShootThrough && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: colors.mosfetDanger }}>&#9888;</span>
                  <span style={{ ...typo.small, color: colors.mosfetDanger }}>Shoot-through discovered!</span>
                </div>
              )}
            </div>
          </div>
          {renderNavDots()}
        </div>
        {renderBottomBar(allStatesTried ? () => { playSound('success'); nextPhase(); } : undefined,
          allStatesTried ? 'Understand the Physics \u2192' : `Try all 4 states (${[triedForward, triedReverse, triedBrake, triedCoast].filter(Boolean).length}/4)`,
          !allStatesTried)}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '80px 24px 24px', overflowY: 'auto' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`, borderRadius: '12px',
            padding: '20px', marginBottom: '24px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Your Prediction Was Correct!' : 'Let\'s Review the Answer'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              {wasCorrect
                ? 'Exactly right! Q1 and Q4 form the diagonal path for forward current flow.'
                : 'The correct answer is Q1 (top-left) and Q4 (bottom-right). They form a diagonal that routes current left-to-right through the motor.'}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Four H-Bridge States
          </h2>

          {([
            { title: 'Forward Drive (Q1 + Q4)', desc: 'Current flows from V+ through Q1, left-to-right through motor, through Q4 to GND. Motor spins clockwise.', color: colors.motorCW, switches: 'Q1=ON, Q2=OFF, Q3=OFF, Q4=ON' },
            { title: 'Reverse Drive (Q2 + Q3)', desc: 'Current flows from V+ through Q2, right-to-left through motor, through Q3 to GND. Motor spins counter-clockwise.', color: colors.motorCCW, switches: 'Q1=OFF, Q2=ON, Q3=ON, Q4=OFF' },
            { title: 'Active Brake (Q3 + Q4)', desc: 'Both low-side switches ON short the motor terminals together. The spinning motor generates back-EMF that is dissipated, stopping it quickly.', color: colors.warning, switches: 'Q1=OFF, Q2=OFF, Q3=ON, Q4=ON' },
            { title: 'Coast / Off (All OFF)', desc: 'All switches open. Motor is disconnected and coasts to a stop gradually due to friction alone.', color: colors.textMuted, switches: 'Q1=OFF, Q2=OFF, Q3=OFF, Q4=OFF' },
          ] as const).map((state, i) => (
            <div key={i} style={{
              background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '12px',
              borderLeft: `4px solid ${state.color}`,
            }}>
              <h4 style={{ ...typo.h3, color: state.color, marginBottom: '8px' }}>{state.title}</h4>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>{state.desc}</p>
              <p style={{ ...typo.small, color: colors.textMuted, fontFamily: 'monospace' }}>{state.switches}</p>
            </div>
          ))}

          <div style={{
            background: `${colors.mosfetDanger}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px',
            borderLeft: `4px solid ${colors.mosfetDanger}`,
          }}>
            <h4 style={{ ...typo.h3, color: colors.mosfetDanger, marginBottom: '8px' }}>
              &#9888; Shoot-Through (FORBIDDEN)
            </h4>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              If both switches on the same leg are ON (Q1+Q3 or Q2+Q4), a direct short circuit from V+ to GND occurs.
              Massive current (hundreds of amps) flows, potentially destroying both MOSFETs in microseconds.
            </p>
            <p style={{ ...typo.small, color: colors.mosfetDanger }}>
              This is the most catastrophic failure mode in H-bridge circuits. Dead time prevents it.
            </p>
          </div>
        </div>
        {renderNavDots()}
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'Explore PWM Speed Control \u2192')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Reduce the battery voltage with a resistor' },
      { id: 'b', text: 'Rapidly switch the motor on and off (PWM) to control average voltage', correct: true },
      { id: 'c', text: 'Use only one MOSFET at reduced gate voltage' },
      { id: 'd', text: 'Change the motor winding configuration' },
    ];
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '80px 24px 24px', overflowY: 'auto' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`, borderRadius: '12px', padding: '16px',
            marginBottom: '24px', border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>New Variable: Speed Control</p>
          </div>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            How can we control motor speed without changing the battery?
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            You now know how to make a motor go forward and reverse. But how do you control <em>how fast</em> it spins?
            The H-bridge always connects the motor to full battery voltage when ON...
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button key={opt.id} onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.2s', minHeight: '44px',
                }}>
                <span style={{
                  display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
        {renderNavDots()}
        {renderBottomBar(twistPrediction ? () => { playSound('success'); nextPhase(); } : undefined, 'Continue \u2192', !twistPrediction)}
      </div>
    );
  }

  // TWIST PLAY PHASE - PWM control
  if (phase === 'twist_play') {
    // Set forward by default for PWM experimentation
    useEffect(() => {
      setQ1(true); setQ2(false); setQ3(false); setQ4(true);
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: colors.bgPrimary, overflow: 'hidden' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              PWM Speed Control Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust duty cycle to control average motor voltage and speed. Observe how dead time prevents shoot-through during switching transitions.
            </p>

            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px' }}>
                  <HBridgeSVG interactive={false} showPWM={true} />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px' }}>
                  <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '16px', fontWeight: 700 }}>PWM Controls</h4>

                  {/* Duty Cycle */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Duty Cycle</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dutyCycle}%</span>
                    </div>
                    <input type="range" min="0" max="100" step="5" value={dutyCycle}
                      onChange={(e) => { setDutyCycle(parseInt(e.target.value)); playSound('click'); }}
                      style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.accent }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0% (Stop)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>100% (Full)</span>
                    </div>
                  </div>

                  {/* PWM Frequency */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>PWM Frequency</span>
                      <span style={{ ...typo.small, color: colors.currentFlow, fontWeight: 600 }}>{pwmFrequency}kHz</span>
                    </div>
                    <input type="range" min="1" max="40" step="1" value={pwmFrequency}
                      onChange={(e) => setPwmFrequency(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.currentFlow }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1kHz</span>
                      <span style={{ ...typo.small, color: pwmFrequency < 16 ? colors.warning : colors.success }}>{pwmFrequency < 16 ? 'Audible!' : 'Silent'}</span>
                    </div>
                  </div>

                  {/* Dead Time */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Dead Time</span>
                      <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{deadTime}ns</span>
                    </div>
                    <input type="range" min="0" max="2000" step="50" value={deadTime}
                      onChange={(e) => setDeadTime(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.success }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: deadTime < 100 ? colors.mosfetDanger : colors.textMuted }}>{deadTime < 100 ? 'DANGER!' : '0ns'}</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>2000ns</span>
                    </div>
                  </div>

                  {/* Readout panel */}
                  <div style={{
                    background: colors.bgSecondary, borderRadius: '8px', padding: '12px',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Avg Voltage</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: colors.accent }}>{avgVoltage.toFixed(1)}V</div>
                      </div>
                      <div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Motor Speed</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: colors.motorCW }}>{motorSpeed}%</div>
                      </div>
                      <div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Supply</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>12V DC</div>
                      </div>
                      <div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Dead Time</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: deadTime < 100 ? colors.mosfetDanger : colors.success }}>
                          {deadTime < 100 ? 'UNSAFE' : 'Safe'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direction buttons */}
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setQ1(true); setQ2(false); setQ3(false); setQ4(true); playSound('click'); }}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', minHeight: '40px',
                        background: isForward ? `${colors.motorCW}22` : colors.bgSecondary,
                        border: `2px solid ${isForward ? colors.motorCW : colors.border}`,
                        color: isForward ? colors.motorCW : colors.textMuted, fontWeight: 600, fontSize: '12px',
                      }}>Forward</button>
                    <button onClick={() => { setQ1(false); setQ2(true); setQ3(true); setQ4(false); playSound('click'); }}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', minHeight: '40px',
                        background: isReverse ? `${colors.motorCCW}22` : colors.bgSecondary,
                        border: `2px solid ${isReverse ? colors.motorCCW : colors.border}`,
                        color: isReverse ? colors.motorCCW : colors.textMuted, fontWeight: 600, fontSize: '12px',
                      }}>Reverse</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Experiments */}
            <div style={{
              marginTop: '20px', background: `${colors.success}11`, border: `1px solid ${colors.success}33`,
              borderRadius: '12px', padding: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>Experiments to Try:</h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Sweep duty cycle from 0% to 100% - watch average voltage change linearly</li>
                <li>Set PWM frequency below 16kHz - in a real motor you would hear audible whining</li>
                <li>Reduce dead time below 100ns - see the danger warning (real shoot-through risk!)</li>
                <li>Switch direction while running - observe the current path reversal</li>
              </ul>
            </div>
          </div>
          {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'Deep Dive: Dead Time \u2192')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistCorrect = twistPrediction === 'b';
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '80px 24px 24px', overflowY: 'auto' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: twistCorrect ? `${colors.success}22` : `${colors.error}22`, borderRadius: '12px',
            padding: '20px', marginBottom: '24px', borderLeft: `4px solid ${twistCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: twistCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {twistCorrect ? 'Correct! PWM is the key.' : 'The answer is PWM (Pulse Width Modulation).'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              By rapidly switching the motor on and off thousands of times per second, we control the average voltage
              without wasting energy in resistors. A 50% duty cycle at 12V supply gives an average of 6V to the motor.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Dead Time and Bootstrap Gate Drive
          </h2>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Dead Time: The Safety Gap</h4>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              When switching from Q1+Q4 to Q2+Q3 (or vice versa), MOSFETs take time to fully turn off
              (typically 100-500ns). If the outgoing switch is not yet OFF when the incoming switch turns ON,
              both are momentarily conducting -- <span style={{ color: colors.mosfetDanger }}>shoot-through!</span>
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Dead time is a deliberate delay (typically 200-1000ns) inserted between turning off one switch
              and turning on its complement. This ensures the turning-off MOSFET is completely OFF before
              the other turns ON. All modern H-bridge driver ICs include configurable dead time.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.h3, color: colors.currentFlow, marginBottom: '12px' }}>Bootstrap Gate Drive</h4>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              N-channel MOSFETs need their gate voltage above their source to turn ON. For the high-side switches
              (Q1, Q2), the source is connected to the motor (which can be at V+ when ON). So the gate must be
              <em> above the supply rail</em> -- a voltage that does not exist in the circuit!
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              The <span style={{ color: colors.currentFlow }}>bootstrap circuit</span> solves this: a small capacitor charges
              through a diode when the low-side switch pulls the midpoint to ground. When the high-side switch turns ON,
              the capacitor voltage "rides up" with the source, providing the gate-source voltage needed. This is why
              PWM duty cycle cannot be 100% indefinitely -- the low-side switch must turn ON periodically to refresh
              the bootstrap capacitor.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>PWM Frequency Trade-offs</h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                <div style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '4px' }}>Higher PWM Frequency</div>
                <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                  <li>Smoother motor current (less ripple)</li>
                  <li>Silent operation ({'>'}20kHz)</li>
                  <li>Better dynamic response</li>
                </ul>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                <div style={{ ...typo.small, color: colors.mosfetDanger, fontWeight: 600, marginBottom: '4px' }}>But Costs More</div>
                <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                  <li>Higher switching losses (heat)</li>
                  <li>More EMI (electromagnetic interference)</li>
                  <li>Requires faster (more expensive) MOSFETs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'See Real Applications \u2192')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="H-Bridge Motor Drive"
        applications={realWorldApps}
        onComplete={() => nextPhase()}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'Retry';

      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '80px 24px 24px', overflowY: 'auto' }}>
          {renderNavBar()}
          {renderProgressBar()}
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '\uD83C\uDFC6' : '\uD83D\uDCD6'}</div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Grade: <span style={{ color: colors.accent, fontWeight: 700 }}>{grade}</span>
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed ? 'You understand H-bridge motor drive circuits!' : 'Review the concepts and try again.'}
            </p>

            {/* Answer Key Toggle */}
            <button onClick={() => setShowAnswerKey(!showAnswerKey)} style={{
              padding: '10px 24px', borderRadius: '8px', border: `1px solid ${colors.border}`,
              background: 'transparent', color: colors.textSecondary, cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, marginBottom: '24px', minHeight: '44px',
            }}>
              {showAnswerKey ? 'Hide Answer Key' : 'Show Answer Key'}
            </button>

            {showAnswerKey && (
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;
                  return (
                    <div key={i} style={{
                      background: colors.bgCard, borderRadius: '10px', padding: '16px', marginBottom: '10px',
                      borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                          {isCorrect ? '\u2713' : '\u2717'}
                        </span>
                        <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                          Q{i + 1}: {q.question}
                        </span>
                      </div>
                      <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '6px' }}>
                        Your answer: {q.options.find(o => o.id === userAnswer)?.label || 'None'}
                      </p>
                      {!isCorrect && (
                        <p style={{ ...typo.small, color: colors.success, marginBottom: '6px' }}>
                          Correct: {q.options.find(o => o.correct)?.label}
                        </p>
                      )}
                      <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {passed ? (
              <button onClick={() => {
                playSound('complete');
                if (onGameEvent) {
                  onGameEvent({ eventType: 'game_completed', gameType: 'h-bridge-drive', gameTitle: 'H-Bridge Motor Drive', details: { score: testScore, total: 10, grade }, timestamp: Date.now() });
                }
                nextPhase();
              }} style={primaryButtonStyle}>
                Complete Lesson \u2192
              </button>
            ) : (
              <button onClick={() => {
                setTestSubmitted(false); setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0); setTestScore(0); setShowAnswerKey(false); goToPhase('hook');
              }} style={primaryButtonStyle}>
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Question display
    const question = testQuestions[currentQuestion];
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '80px 24px 24px', overflowY: 'auto' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Question {currentQuestion + 1} of 10</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
          </div>

          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>{question.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button key={opt.id} onClick={() => {
                playSound('click');
                const newAnswers = [...testAnswers]; newAnswers[currentQuestion] = opt.id; setTestAnswers(newAnswers);
              }} style={{
                background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', minHeight: '44px',
              }}>
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button onClick={() => setCurrentQuestion(currentQuestion - 1)} style={{
                flex: 1, padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}`,
                background: 'transparent', color: colors.textSecondary, cursor: 'pointer', minHeight: '44px',
              }}>Previous</button>
            )}
            {currentQuestion < 9 ? (
              <button onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed', fontWeight: 600, minHeight: '44px',
                }}>Next</button>
            ) : (
              <button onClick={() => {
                const score = testAnswers.reduce((acc, ans, i) => {
                  const correct = testQuestions[i].options.find(o => o.correct)?.id;
                  return acc + (ans === correct ? 1 : 0);
                }, 0);
                setTestScore(score); setTestSubmitted(true);
                playSound(score >= 7 ? 'complete' : 'failure');
              }} disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', fontWeight: 600, minHeight: '44px',
                }}>Submit Test</button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'B';
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{
          flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'hbBounce 1s infinite' }}>
            &#9889;
          </div>
          <style>{`@keyframes hbBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            H-Bridge Master!
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '8px' }}>
            You now understand how H-bridge circuits control DC motor direction and speed --
            the fundamental building block of robotics, electric vehicles, and industrial automation.
          </p>
          <p style={{ ...typo.body, color: colors.accent, marginBottom: '24px' }}>
            Score: {testScore}/10 | Grade: {grade}
          </p>

          <div style={{
            background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>You Learned:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'H-bridge uses 4 MOSFETs to control motor direction',
                'Forward and reverse use diagonal switch pairs',
                'Shoot-through is catastrophic (both switches on same leg)',
                'Dead time prevents shoot-through during transitions',
                'PWM duty cycle controls average voltage and speed',
                'Bootstrap circuits drive high-side gate above V+',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Answer key summary */}
          <button onClick={() => setShowAnswerKey(!showAnswerKey)} style={{
            padding: '10px 24px', borderRadius: '8px', border: `1px solid ${colors.border}`,
            background: 'transparent', color: colors.textSecondary, cursor: 'pointer',
            fontSize: '14px', fontWeight: 600, marginBottom: '16px', minHeight: '44px',
          }}>
            {showAnswerKey ? 'Hide Answer Key' : 'View Full Answer Key'}
          </button>

          {showAnswerKey && (
            <div style={{ textAlign: 'left', maxWidth: '600px', width: '100%', marginBottom: '24px' }}>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer === correctId;
                return (
                  <div key={i} style={{
                    background: colors.bgCard, borderRadius: '8px', padding: '12px', marginBottom: '8px',
                    borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`,
                  }}>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, marginBottom: '4px' }}>
                      {isCorrect ? '\u2713' : '\u2717'} Q{i + 1}: {q.question}
                    </div>
                    <div style={{ ...typo.small, color: colors.success }}>
                      Answer: {q.options.find(o => o.correct)?.label}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px', fontStyle: 'italic' }}>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => goToPhase('hook')} style={{
              padding: '14px 28px', borderRadius: '10px', border: `1px solid ${colors.border}`,
              background: 'transparent', color: colors.textSecondary, cursor: 'pointer', minHeight: '44px',
            }}>Play Again</button>
            <button onClick={() => {
              if (onGameEvent) {
                onGameEvent({ eventType: 'achievement_unlocked', gameType: 'h-bridge-drive', gameTitle: 'H-Bridge Motor Drive', details: { achievement: 'mastery_achieved', score: testScore, total: 10, grade }, timestamp: Date.now() });
              }
              window.location.href = '/games';
            }} style={{
              ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block',
            }}>
              Complete Game
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  return null;
};

export default HBridgeDriveRenderer;
