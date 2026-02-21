'use client';

/**
 * MOTOR BACK-EMF RENDERER (Game #263)
 *
 * Teaches how a spinning DC motor generates a back-EMF voltage proportional
 * to speed, opposing supply voltage and limiting current at high speed.
 * At stall (zero speed), there is no back-EMF and current is maximum.
 *
 * Core formula: Back-EMF = Ke * omega
 * Current = (Vsupply - Back_EMF) / R_winding
 *
 * Phases: hook -> predict -> play -> review -> twist_predict -> twist_play
 *         -> twist_review -> transfer -> test -> mastery
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
    'mastery_achieved';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ============================================================================
// PHASE DEFINITIONS
// ============================================================================

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

const validPhases: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery',
];

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

// ============================================================================
// THEME COLORS
// ============================================================================

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
  motorBody: '#475569',
  copper: '#f59e0b',
  shaft: '#94a3b8',
  emfArrow: '#22d3ee',
  currentHigh: '#ef4444',
  currentMid: '#f59e0b',
  currentLow: '#22c55e',
};

const GAME_ID = 'motor_back_emf';

// ============================================================================
// SOUND UTILITY
// ============================================================================

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
      complete: { freq: 900, duration: 0.4, type: 'sine' },
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

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice
// ============================================================================

const testQuestions = [
  {
    scenario: 'A small DC motor is connected to a 12V power supply. The winding resistance is 2 ohms. When the motor is first turned on from rest, it is momentarily stalled.',
    question: 'What is the stall current drawn by this motor?',
    options: [
      { id: 'a', label: 'A) 1.2 A' },
      { id: 'b', label: 'B) 6 A', correct: true as const },
      { id: 'c', label: 'C) 12 A' },
      { id: 'd', label: 'D) 24 A' },
    ],
    explanation: 'At stall the motor speed is zero, so back-EMF is zero. Current = Vsupply / R = 12V / 2 ohm = 6 A. This is the maximum current the motor can draw.',
  },
  {
    scenario: 'The same 12V motor (R = 2 ohm, Ke = 0.05 V/(rad/s)) reaches a steady-state speed of 160 rad/s under no load.',
    question: 'What is the back-EMF at this speed?',
    options: [
      { id: 'a', label: 'A) 4 V' },
      { id: 'b', label: 'B) 8 V', correct: true as const },
      { id: 'c', label: 'C) 12 V' },
      { id: 'd', label: 'D) 16 V' },
    ],
    explanation: 'Back-EMF = Ke x omega = 0.05 x 160 = 8 V. At no load the small remaining current (2A) overcomes friction. The back-EMF is close to but below the supply voltage.',
  },
  {
    scenario: 'An engineer measures that a motor running at full speed draws only 0.5 A from a 24V supply. The winding resistance is 4 ohm.',
    question: 'What is the back-EMF generated by the motor?',
    options: [
      { id: 'a', label: 'A) 2 V' },
      { id: 'b', label: 'B) 12 V' },
      { id: 'c', label: 'C) 22 V', correct: true as const },
      { id: 'd', label: 'D) 24 V' },
    ],
    explanation: 'I = (Vsupply - Back_EMF) / R, so Back_EMF = Vsupply - I*R = 24 - 0.5*4 = 22 V. At high speed, back-EMF is nearly equal to the supply voltage.',
  },
  {
    scenario: 'A drone motor is spinning freely at high speed when the pilot suddenly applies full throttle load. The motor speed drops from 8000 RPM to 5000 RPM.',
    question: 'What happens to the current when speed drops?',
    options: [
      { id: 'a', label: 'A) Current decreases because the motor slows down' },
      { id: 'b', label: 'B) Current increases because back-EMF drops, widening the voltage gap', correct: true as const },
      { id: 'c', label: 'C) Current stays the same regardless of speed' },
      { id: 'd', label: 'D) Current drops to zero at lower speeds' },
    ],
    explanation: 'When speed drops, back-EMF decreases. The voltage difference (Vsupply - Back_EMF) increases, which drives more current through the winding resistance. This higher current produces more torque to fight the load.',
  },
  {
    scenario: 'A small toy motor has a winding resistance of only 0.5 ohm and runs on 3V batteries. A child holds the motor shaft still.',
    question: 'Why might this burn out the motor?',
    options: [
      { id: 'a', label: 'A) The batteries provide too much voltage' },
      { id: 'b', label: 'B) At stall, current = V/R = 6A with zero back-EMF, causing I^2*R = 18W of heat in tiny windings', correct: true as const },
      { id: 'c', label: 'C) The magnets demagnetize when the shaft is held' },
      { id: 'd', label: 'D) Stalling reverses the current direction and damages the brushes' },
    ],
    explanation: 'With zero speed there is no back-EMF. The full 3V drives 6A through 0.5 ohm, dissipating 18W of heat (I^2 * R). The thin copper windings cannot survive this thermal load for more than a few seconds.',
  },
  {
    scenario: 'Two identical motors are connected to 12V. Motor A has Ke = 0.02 V/(rad/s) and Motor B has Ke = 0.05 V/(rad/s). Both have 2 ohm winding resistance.',
    question: 'Which motor will have a higher no-load speed?',
    options: [
      { id: 'a', label: 'A) Motor A (lower Ke) will spin faster', correct: true as const },
      { id: 'b', label: 'B) Motor B (higher Ke) will spin faster' },
      { id: 'c', label: 'C) Both will spin at the same speed' },
      { id: 'd', label: 'D) Neither will spin - Ke does not affect speed' },
    ],
    explanation: 'At no load, back-EMF approaches supply voltage. omega = V/Ke. Motor A: 12/0.02 = 600 rad/s. Motor B: 12/0.05 = 240 rad/s. Lower Ke means higher free-running speed but less torque per amp.',
  },
  {
    scenario: 'An electric vehicle is traveling downhill. The driver releases the accelerator and the car begins to slow down through regenerative braking.',
    question: 'What is happening electrically in the motor during regenerative braking?',
    options: [
      { id: 'a', label: 'A) The motor disconnects from the battery completely' },
      { id: 'b', label: 'B) The wheels spin the motor faster than the no-load speed, making back-EMF exceed supply voltage and reversing current flow', correct: true as const },
      { id: 'c', label: 'C) The motor switches to AC mode for braking' },
      { id: 'd', label: 'D) Friction pads engage inside the motor' },
    ],
    explanation: 'When the wheels spin the motor fast enough that back-EMF exceeds supply voltage, current reverses direction. The motor becomes a generator, converting kinetic energy to electrical energy and charging the battery. This is regenerative braking.',
  },
  {
    scenario: 'A motor controller uses PWM (pulse width modulation) at 50% duty cycle on a 24V supply to drive a motor.',
    question: 'What effective voltage does the motor see, and how does this affect back-EMF balance?',
    options: [
      { id: 'a', label: 'A) The motor sees 24V but runs at half speed' },
      { id: 'b', label: 'B) The motor sees an average of 12V and reaches a speed where back-EMF equals approximately 12V', correct: true as const },
      { id: 'c', label: 'C) PWM does not affect motor speed' },
      { id: 'd', label: 'D) The motor sees 48V due to inductive doubling' },
    ],
    explanation: 'At 50% duty cycle the average voltage is 12V. The motor accelerates until back-EMF approaches 12V, reaching half its maximum speed. PWM is the standard method for speed control in DC motors.',
  },
  {
    scenario: 'An industrial motor nameplate states: 48V, 10A rated, 2400 RPM, R_winding = 0.8 ohm.',
    question: 'What is the back-EMF at rated conditions?',
    options: [
      { id: 'a', label: 'A) 40 V', correct: true as const },
      { id: 'b', label: 'B) 48 V' },
      { id: 'c', label: 'C) 8 V' },
      { id: 'd', label: 'D) 56 V' },
    ],
    explanation: 'Back_EMF = V - I*R = 48 - 10*0.8 = 40V. At rated operating conditions, 83% of the supply voltage is "used" by the back-EMF (useful mechanical work) and only 17% is lost as heat in the winding resistance.',
  },
  {
    scenario: 'A robotics engineer needs a motor that can deliver high torque at low speeds for a robot arm joint. She is comparing two motor designs with different Ke values.',
    question: 'Which Ke value is better for this application?',
    options: [
      { id: 'a', label: 'A) Low Ke for high speed capability' },
      { id: 'b', label: 'B) High Ke because torque constant equals back-EMF constant in SI units, giving more torque per amp', correct: true as const },
      { id: 'c', label: 'C) Ke does not affect torque' },
      { id: 'd', label: 'D) The lowest Ke possible to minimize back-EMF losses' },
    ],
    explanation: 'In SI units, the torque constant Kt equals the back-EMF constant Ke. A higher Ke means more torque per amp (Torque = Ke * I). For low-speed, high-torque applications this is ideal, even though maximum speed is lower.',
  },
];

// ============================================================================
// REAL-WORLD APPLICATIONS
// ============================================================================

const realWorldApps = [
  {
    icon: '',
    title: 'Electric Vehicle Drive Systems',
    short: 'Back-EMF governs EV motor efficiency and regenerative braking',
    tagline: 'The physics behind every EV on the road',
    description: 'Every electric vehicle relies on back-EMF to regulate motor current and enable regenerative braking. At highway speeds, back-EMF is nearly equal to battery voltage, so motor current is low and efficiency is high. During acceleration from a stop, back-EMF is low and the motor controller must limit current to prevent overheating.',
    connection: 'The exact relationship you explored - Current = (V_supply - Back_EMF) / R - determines how much current flows in an EV motor at every speed. Regenerative braking occurs when the wheels spin the motor fast enough that back-EMF exceeds supply voltage.',
    howItWorks: 'EV motor controllers use power electronics (IGBTs or MOSFETs) to modulate voltage via PWM. At low speeds, duty cycle is low to limit current. At cruising speed, back-EMF does the current-limiting naturally. During braking, the controller switches to generator mode.',
    stats: [
      { value: '95%', label: 'Peak motor efficiency' },
      { value: '30%', label: 'Energy recovered by regen' },
      { value: '600V', label: 'Typical EV bus voltage' },
    ],
    examples: ['Tesla Model 3 permanent magnet motor', 'Rivian quad-motor torque vectoring', 'Nissan Leaf regen braking recovery', 'Formula E race car energy management'],
    companies: ['Tesla', 'BYD', 'Rivian', 'Lucid Motors'],
    futureImpact: 'Next-generation silicon carbide inverters and higher bus voltages will push motor efficiency above 97%, with back-EMF management becoming even more critical at higher speeds.',
    color: '#3B82F6',
  },
  {
    icon: '',
    title: 'Drone Motor Control',
    short: 'Rapid speed changes demand precise back-EMF management',
    tagline: 'Millisecond response for stable flight',
    description: 'Drone flight controllers adjust motor speeds hundreds of times per second. Understanding back-EMF is essential because it determines how quickly a motor can change speed. When a drone tilts, some motors speed up while others slow down, and the current transients are governed by the back-EMF equation.',
    connection: 'When a drone motor speeds up, rising back-EMF reduces current, limiting acceleration. When it slows down, falling back-EMF increases current, providing braking torque. This natural feedback creates inherent speed regulation.',
    howItWorks: 'Brushless DC motors in drones use electronic speed controllers (ESCs) that sense back-EMF on the undriven phase to determine rotor position. This sensorless commutation relies on back-EMF zero-crossings for timing.',
    stats: [
      { value: '48,000', label: 'RPM max (racing drones)' },
      { value: '0.01s', label: 'Speed change response' },
      { value: '1000Hz', label: 'Control loop rate' },
    ],
    examples: ['DJI Mavic flight stabilization', 'FPV racing drone throttle response', 'Agricultural spray drone payload management', 'Delivery drone autoland precision'],
    companies: ['DJI', 'Hobbywing', 'T-Motor', 'BetaFPV'],
    futureImpact: 'AI-assisted flight controllers will predict back-EMF transients to pre-compensate for load changes, enabling more aggressive maneuvers and heavier payloads.',
    color: '#F59E0B',
  },
  {
    icon: '',
    title: 'Industrial Motor Protection',
    short: 'Stall detection prevents catastrophic motor burnout',
    tagline: 'Protecting million-dollar equipment',
    description: 'Industrial motors driving pumps, conveyors, and compressors must be protected from stall conditions. When a conveyor jams or a pump cavitates, the motor stalls and current surges to dangerous levels. Modern motor protection relays monitor current to detect stall.',
    connection: 'The stall current problem you observed (zero back-EMF = maximum current) is exactly what industrial protection systems guard against. Current monitoring is essentially an indirect measurement of speed via the back-EMF relationship.',
    howItWorks: 'Motor protection relays measure current continuously. A sudden rise to near-stall current triggers a timer. If high current persists beyond the allowed locked-rotor time (typically 10-30 seconds), the relay trips the contactor and disconnects the motor to prevent winding damage.',
    stats: [
      { value: '6-8x', label: 'Stall vs running current' },
      { value: '$50K+', label: 'Large motor replacement cost' },
      { value: '15s', label: 'Typical stall time limit' },
    ],
    examples: ['Mining conveyor stall protection', 'HVAC chiller compressor lockout', 'Water treatment pump protection', 'Steel mill rolling motor monitoring'],
    companies: ['ABB', 'Siemens', 'Schneider Electric', 'Rockwell Automation'],
    futureImpact: 'IoT-connected motor drives now use real-time back-EMF estimation to predict mechanical failures before they cause stalls, enabling predictive maintenance.',
    color: '#EF4444',
  },
  {
    icon: '',
    title: 'Power Tool Motor Design',
    short: 'Optimizing Ke for the right speed-torque balance',
    tagline: 'Engineering the perfect drill',
    description: 'Power tool designers must choose motor constants carefully. A drill needs high torque at low speed (high Ke), while a grinder needs high speed with moderate torque (low Ke). The back-EMF constant directly determines this speed-torque tradeoff.',
    connection: 'The Ke slider you experimented with is exactly what motor designers tune. Higher Ke means more torque per amp but lower top speed. Lower Ke gives higher speed but requires more current for the same torque.',
    howItWorks: 'Motor Ke is determined by the number of winding turns, magnet strength, and air gap geometry. Power tool manufacturers wind motors specifically for each application. Multi-speed tools often use electronic gearing via PWM rather than mechanical gearboxes.',
    stats: [
      { value: '30,000', label: 'RPM for angle grinders' },
      { value: '150 Nm', label: 'Impact wrench torque' },
      { value: '$40B', label: 'Global power tool market' },
    ],
    examples: ['Milwaukee high-torque impact wrench (high Ke)', 'Dremel rotary tool (low Ke, high speed)', 'DeWalt variable-speed drill (electronic Ke matching)', 'Festool plunge router speed control'],
    companies: ['Milwaukee', 'DeWalt', 'Makita', 'Bosch'],
    futureImpact: 'Brushless motors with firmware-programmable field weakening can dynamically adjust effective Ke, giving one motor the performance range that previously required multiple tools.',
    color: '#8B5CF6',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MotorBackEMFRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // --- Core state ---
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animFrame, setAnimFrame] = useState(0);
  const isNavigating = useRef(false);

  // --- Play phase simulation state ---
  const [supplyVoltage, setSupplyVoltage] = useState(12);
  const [motorSpeed, setMotorSpeed] = useState(100);      // rad/s
  const [ke, setKe] = useState(0.05);                     // V/(rad/s)
  const [resistance, setResistance] = useState(2);         // ohm

  // --- Twist phase state ---
  const [twistSpeed, setTwistSpeed] = useState(300);       // rad/s - can exceed no-load speed
  const [twistVoltage, setTwistVoltage] = useState(12);

  // --- Test state ---
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // --- Sync phase with external prop ---
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // --- Animation loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // --- Physics calculations ---
  const backEMF = useMemo(() => ke * motorSpeed, [ke, motorSpeed]);
  const current = useMemo(() => {
    const c = (supplyVoltage - backEMF) / resistance;
    return Math.max(0, c);
  }, [supplyVoltage, backEMF, resistance]);
  const stallCurrent = useMemo(() => supplyVoltage / resistance, [supplyVoltage, resistance]);
  const noLoadSpeed = useMemo(() => supplyVoltage / ke, [supplyVoltage, ke]);
  const powerDissipated = useMemo(() => current * current * resistance, [current, resistance]);
  const mechanicalPower = useMemo(() => backEMF * current, [backEMF, current]);

  // Twist phase physics
  const twistBackEMF = useMemo(() => ke * twistSpeed, [ke, twistSpeed]);
  const twistCurrent = useMemo(() => (twistVoltage - twistBackEMF) / resistance, [twistVoltage, twistBackEMF, resistance]);
  const isRegenerating = twistCurrent < 0;

  // --- Event emitter ---
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: GAME_ID,
      gameTitle: 'Motor Back-EMF',
      details: { ...details, phase },
      timestamp: Date.now(),
    });
  }, [onGameEvent, phase]);

  // --- Phase navigation ---
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setPhase(p);
    playSound('transition');
    emitEvent('phase_changed', { newPhase: p });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
      isNavigating.current = false;
    });
  }, [emitEvent]);

  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) {
      goToPhase(validPhases[idx + 1]);
    }
  }, [phase, goToPhase]);

  // --- Test scoring ---
  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => (o as any).correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  // --- Current danger level ---
  const currentDangerLevel = useMemo(() => {
    const ratio = current / stallCurrent;
    if (ratio > 0.8) return 'danger';
    if (ratio > 0.5) return 'warning';
    return 'safe';
  }, [current, stallCurrent]);

  const currentColor = currentDangerLevel === 'danger' ? colors.error : currentDangerLevel === 'warning' ? colors.warning : colors.success;

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderNavDots = () => (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 0',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      {validPhases.map((p) => (
        <button
          key={p}
          aria-label={phaseLabels[p]}
          onClick={() => goToPhase(p)}
          style={{
            width: '10px', height: '10px', borderRadius: '50%', border: 'none',
            cursor: 'pointer',
            backgroundColor: p === phase ? colors.primary : colors.bgCardLight,
            opacity: p === phase ? 1 : 0.6,
            padding: 0, transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );

  const renderBottomBar = (nextLabel: string, nextAction?: () => void) => {
    const idx = validPhases.indexOf(phase);
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        minHeight: '60px',
      }}>
        <button
          onClick={() => { if (idx > 0) goToPhase(validPhases[idx - 1]); }}
          style={{
            padding: '12px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
            backgroundColor: colors.bgCardLight, color: '#e2e8f0', border: 'none',
            cursor: 'pointer', opacity: idx > 0 ? 1 : 0.4,
          }}
        >
          Back
        </button>
        <button
          onClick={nextAction || nextPhase}
          style={{
            padding: '14px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ============================================================================
  // MOTOR SVG VISUALIZATION
  // ============================================================================

  const renderMotorSVG = (
    speed: number,
    vSupply: number,
    bemf: number,
    iCurrent: number,
    iStall: number,
    showRegen?: boolean,
  ) => {
    const rotationDeg = (animFrame * (speed / 60)) % 360;
    const currentRatio = Math.abs(iCurrent) / Math.max(iStall, 0.01);
    const meterColor = currentRatio > 0.8 ? colors.error : currentRatio > 0.5 ? colors.warning : colors.success;
    const meterAngle = -90 + Math.min(currentRatio, 1) * 180;
    const dangerZoneStart = 0.8;

    return (
      <svg viewBox="0 0 440 340" style={{ width: '100%', maxWidth: '440px', height: 'auto' }}>
        {/* Background */}
        <rect x="0" y="0" width="440" height="340" rx="12" fill={colors.bgDark} />

        {/* Title */}
        <text x="220" y="22" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600">
          DC MOTOR CIRCUIT
        </text>

        {/* Supply voltage source */}
        <rect x="20" y="60" width="60" height="100" rx="6" fill={colors.bgCard} stroke={colors.primary} strokeWidth="2" />
        <text x="50" y="85" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="700">V_supply</text>
        <text x="50" y="105" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="800">{vSupply.toFixed(1)}V</text>
        <text x="50" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="9">+</text>
        <line x1="50" y1="128" x2="50" y2="145" stroke={colors.textMuted} strokeWidth="1" />
        <text x="50" y="155" textAnchor="middle" fill={colors.textMuted} fontSize="9">-</text>

        {/* Wires from supply to motor */}
        <line x1="80" y1="90" x2="140" y2="90" stroke={iCurrent >= 0 ? colors.warning : colors.emfArrow} strokeWidth="2" />
        <line x1="80" y1="130" x2="140" y2="130" stroke={iCurrent >= 0 ? colors.warning : colors.emfArrow} strokeWidth="2" />

        {/* Current flow arrows */}
        {iCurrent >= 0 ? (
          <>
            <polygon points="125,86 135,90 125,94" fill={colors.warning} />
            <polygon points="155,134 145,130 155,126" fill={colors.warning} />
          </>
        ) : (
          <>
            <polygon points="155,86 145,90 155,94" fill={colors.emfArrow} />
            <polygon points="125,134 135,130 125,126" fill={colors.emfArrow} />
          </>
        )}

        {/* Winding resistance */}
        <rect x="140" y="78" width="50" height="24" rx="4" fill="none" stroke={colors.copper} strokeWidth="2" />
        <text x="165" y="94" textAnchor="middle" fill={colors.copper} fontSize="10" fontWeight="600">R</text>
        <text x="165" y="72" textAnchor="middle" fill={colors.textMuted} fontSize="9">{resistance.toFixed(1)} ohm</text>

        {/* Motor body */}
        <circle cx="260" cy="110" r="55" fill={colors.motorBody} stroke={colors.borderLight} strokeWidth="3" />
        <circle cx="260" cy="110" r="48" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />

        {/* Motor label */}
        <text x="260" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="9" fontWeight="600">MOTOR</text>

        {/* Rotating armature */}
        <g transform={`rotate(${rotationDeg}, 260, 110)`}>
          <line x1="230" y1="110" x2="290" y2="110" stroke={colors.copper} strokeWidth="3" strokeLinecap="round" />
          <line x1="260" y1="80" x2="260" y2="140" stroke={colors.copper} strokeWidth="3" strokeLinecap="round" />
          <circle cx="260" cy="110" r="5" fill={colors.copper} />
        </g>

        {/* Shaft */}
        <rect x="310" y="104" width="40" height="12" rx="2" fill={colors.shaft} />
        <circle cx="356" cy="110" r="8" fill={colors.shaft} stroke={colors.borderLight} strokeWidth="2" />

        {/* Speed indicator on shaft */}
        <g transform={`rotate(${rotationDeg * 2}, 356, 110)`}>
          <line x1="356" y1="104" x2="356" y2="116" stroke={colors.bgDark} strokeWidth="2" />
        </g>

        {/* Wire from resistance to motor */}
        <line x1="190" y1="90" x2="210" y2="90" stroke={colors.warning} strokeWidth="2" />
        <line x1="210" y1="90" x2="210" y2="110" stroke={colors.warning} strokeWidth="2" />
        <line x1="210" y1="110" x2="212" y2="110" stroke={colors.warning} strokeWidth="2" />

        {/* Wire from motor bottom back to supply */}
        <line x1="212" y1="130" x2="210" y2="130" stroke={colors.warning} strokeWidth="2" />
        <line x1="210" y1="130" x2="140" y2="130" stroke={colors.warning} strokeWidth="2" />

        {/* Back-EMF arrow */}
        <defs>
          <marker id="arrowEMF" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.emfArrow} />
          </marker>
        </defs>
        <line x1="260" y1="170" x2="260" y2="195" stroke={colors.emfArrow} strokeWidth="2" markerEnd="url(#arrowEMF)" />
        <text x="260" y="212" textAnchor="middle" fill={colors.emfArrow} fontSize="11" fontWeight="700">
          Back-EMF = {bemf.toFixed(1)}V
        </text>
        <text x="260" y="226" textAnchor="middle" fill={colors.textMuted} fontSize="9">
          Ke x omega = {ke.toFixed(3)} x {speed.toFixed(0)}
        </text>

        {/* Current meter */}
        <g transform="translate(370, 50)">
          <rect x="-45" y="-10" width="90" height="90" rx="8" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
          <text x="0" y="5" textAnchor="middle" fill={colors.textMuted} fontSize="8" fontWeight="600">CURRENT</text>

          {/* Meter arc */}
          <path d="M -30 60 A 35 35 0 0 1 30 60" fill="none" stroke={colors.bgCardLight} strokeWidth="6" strokeLinecap="round" />

          {/* Danger zone on meter */}
          <path
            d={`M ${30 * Math.cos(Math.PI * (1 - dangerZoneStart))} ${60 - 35 * Math.sin(Math.PI * (1 - dangerZoneStart))} A 35 35 0 0 1 30 60`}
            fill="none" stroke={`${colors.error}66`} strokeWidth="6" strokeLinecap="round"
          />

          {/* Needle */}
          <line
            x1="0" y1="60"
            x2={35 * Math.cos(Math.PI - (Math.min(currentRatio, 1) * Math.PI))}
            y2={60 - 35 * Math.sin(Math.PI - (Math.min(currentRatio, 1) * Math.PI))}
            stroke={meterColor} strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="0" cy="60" r="3" fill={meterColor} />

          {/* Value */}
          <text x="0" y="75" textAnchor="middle" fill={meterColor} fontSize="12" fontWeight="800">
            {Math.abs(iCurrent).toFixed(2)}A
          </text>
        </g>

        {/* Regeneration indicator */}
        {showRegen && isRegenerating && (
          <g>
            <rect x="130" y="240" width="180" height="30" rx="6" fill={`${colors.success}22`} stroke={colors.success} strokeWidth="1" />
            <text x="220" y="260" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="700">
              REGENERATING - Motor is a Generator!
            </text>
          </g>
        )}

        {/* Stall warning */}
        {!showRegen && speed < 5 && (
          <g>
            <rect x="150" y="240" width="140" height="30" rx="6" fill={`${colors.error}22`} stroke={colors.error} strokeWidth="1" strokeDasharray="4,2">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
            </rect>
            <text x="220" y="260" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="700">
              STALL - Max Current!
            </text>
          </g>
        )}

        {/* Speed readout */}
        <rect x="15" y="180" width="100" height="50" rx="6" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
        <text x="65" y="197" textAnchor="middle" fill={colors.textMuted} fontSize="9">SPEED</text>
        <text x="65" y="218" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="800">
          {speed.toFixed(0)}
        </text>
        <text x="65" y="228" textAnchor="middle" fill={colors.textMuted} fontSize="8">rad/s</text>

        {/* Power readout */}
        <rect x="15" y="270" width="100" height="50" rx="6" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
        <text x="65" y="287" textAnchor="middle" fill={colors.textMuted} fontSize="9">HEAT LOSS</text>
        <text x="65" y="308" textAnchor="middle" fill={currentRatio > 0.5 ? colors.error : colors.textPrimary} fontSize="14" fontWeight="700">
          {(iCurrent * iCurrent * resistance).toFixed(1)}W
        </text>

        {/* Mechanical power */}
        <rect x="325" y="270" width="100" height="50" rx="6" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
        <text x="375" y="287" textAnchor="middle" fill={colors.textMuted} fontSize="9">MECH POWER</text>
        <text x="375" y="308" textAnchor="middle" fill={colors.success} fontSize="14" fontWeight="700">
          {(bemf * Math.abs(iCurrent)).toFixed(1)}W
        </text>
      </svg>
    );
  };

  // ============================================================================
  // SPEED-TORQUE CHART for review phase
  // ============================================================================

  const renderSpeedTorqueChart = () => {
    const w = 400;
    const h = 220;
    const pad = { l: 55, r: 20, t: 30, b: 45 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const maxSpeed = supplyVoltage / ke;
    const maxCurrent = supplyVoltage / resistance;

    const points: string[] = [];
    const currentPoints: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const spd = (i / 40) * maxSpeed;
      const bemfVal = ke * spd;
      const cur = Math.max(0, (supplyVoltage - bemfVal) / resistance);
      const torque = ke * cur;
      const x = pad.l + (spd / maxSpeed) * plotW;
      const yTorque = pad.t + plotH - (torque / (ke * maxCurrent)) * plotH;
      const yCurrent = pad.t + plotH - (cur / maxCurrent) * plotH;
      points.push(`${x},${yTorque}`);
      currentPoints.push(`${x},${yCurrent}`);
    }

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
        <rect x="0" y="0" width={w} height={h} rx="8" fill={colors.bgCard} />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pad.l} y1={pad.t + plotH * (1 - f)} x2={pad.l + plotW} y2={pad.t + plotH * (1 - f)}
            stroke={colors.border} strokeWidth="0.5" strokeDasharray="3,3" />
        ))}

        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke={colors.borderLight} strokeWidth="1" />
        <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke={colors.borderLight} strokeWidth="1" />

        {/* Torque line */}
        <polyline points={points.join(' ')} fill="none" stroke={colors.primary} strokeWidth="2.5" />

        {/* Current line */}
        <polyline points={currentPoints.join(' ')} fill="none" stroke={colors.warning} strokeWidth="2" strokeDasharray="6,3" />

        {/* Labels */}
        <text x={pad.l + plotW / 2} y={h - 5} textAnchor="middle" fill={colors.textSecondary} fontSize="10">
          Speed (rad/s)
        </text>
        <text x="12" y={pad.t + plotH / 2} textAnchor="middle" fill={colors.primary} fontSize="10"
          transform={`rotate(-90, 12, ${pad.t + plotH / 2})`}>
          Torque (Nm)
        </text>

        {/* Stall point */}
        <circle cx={pad.l} cy={pad.t} r="4" fill={colors.error} />
        <text x={pad.l + 8} y={pad.t + 4} fill={colors.error} fontSize="9">Stall</text>

        {/* No-load point */}
        <circle cx={pad.l + plotW} cy={pad.t + plotH} r="4" fill={colors.success} />
        <text x={pad.l + plotW - 35} y={pad.t + plotH - 8} fill={colors.success} fontSize="9">No-load</text>

        {/* Legend */}
        <line x1={pad.l + 10} y1={pad.t + 10} x2={pad.l + 30} y2={pad.t + 10} stroke={colors.primary} strokeWidth="2.5" />
        <text x={pad.l + 34} y={pad.t + 14} fill={colors.primary} fontSize="9">Torque</text>
        <line x1={pad.l + 80} y1={pad.t + 10} x2={pad.l + 100} y2={pad.t + 10} stroke={colors.warning} strokeWidth="2" strokeDasharray="6,3" />
        <text x={pad.l + 104} y={pad.t + 14} fill={colors.warning} fontSize="9">Current</text>
      </svg>
    );
  };

  // ============================================================================
  // SLIDER COMPONENT
  // ============================================================================

  const renderSlider = (
    label: string, value: number, min: number, max: number, step: number,
    unit: string, color: string, onChange: (v: number) => void,
  ) => (
    <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', border: `1px solid ${colors.border}`, marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{value.toFixed(step < 1 ? (step < 0.01 ? 3 : 1) : 0)} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: color }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '10px', color: colors.textMuted }}>{min} {unit}</span>
        <span style={{ fontSize: '10px', color: colors.textMuted }}>{max} {unit}</span>
      </div>
    </div>
  );

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================

  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Game #263 - Motor Back-EMF
              </p>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
                Why does a motor draw 10x more current at startup?
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
                When you first flip the switch on a motor, it draws enormous current - enough to trip breakers, blow fuses, or burn out windings. But once it gets up to speed, current drops dramatically. What changes?
              </p>
            </div>

            {/* Hook visualization */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', color: colors.error, fontWeight: 800 }}>6A</div>
                  <p style={{ color: colors.error, fontSize: '12px', fontWeight: 600 }}>At Startup (Stall)</p>
                  <p style={{ color: colors.textMuted, fontSize: '11px' }}>Speed = 0 rad/s</p>
                </div>
                <div style={{ fontSize: '28px', color: colors.textMuted }}>vs</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', color: colors.success, fontWeight: 800 }}>0.5A</div>
                  <p style={{ color: colors.success, fontSize: '12px', fontWeight: 600 }}>At Full Speed</p>
                  <p style={{ color: colors.textMuted, fontSize: '11px' }}>Speed = 220 rad/s</p>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '20px', padding: '12px', background: `${colors.primary}11`, borderRadius: '8px', border: `1px solid ${colors.primary}33` }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                  Same motor. Same voltage. Same wires. <strong style={{ color: colors.primary }}>12x difference in current.</strong> Something inside the motor must be changing...
                </p>
              </div>
            </div>

            <div style={{ background: `${colors.error}11`, border: `1px solid ${colors.error}33`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                <strong style={{ color: colors.error }}>The Danger:</strong> If a motor stalls while powered, the enormous current can melt copper windings in seconds. This is why motors have thermal overload protection - and why you should never hold a running motor's shaft.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar('Make a Prediction')}
      </div>
    );
  }

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================

  if (phase === 'predict') {
    const predictions = [
      { id: 'resistance', label: 'The winding resistance increases as the motor heats up' },
      { id: 'back_emf', label: 'The spinning motor generates a voltage that opposes the supply' },
      { id: 'magnets', label: 'The permanent magnets weaken at high speed' },
      { id: 'brushes', label: 'The brush contact becomes intermittent at speed' },
    ];

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 - Predict
              </p>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                What limits current at high speed?
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px' }}>
                A 12V motor with 2 ohm winding draws 6A at stall but only 0.5A at full speed. What mechanism reduces the current?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {predictions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); emitEvent('prediction_made', { prediction: opt.id }); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px', padding: '16px 20px', textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <span style={{ color: colors.textPrimary, fontSize: '15px' }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => { playSound('success'); nextPhase(); }}
                  style={{
                    padding: '14px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px',
                  }}
                >
                  Test It Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PLAY
  // ============================================================================

  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 2 - Experiment
              </p>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
                Motor Back-EMF Simulator
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust motor speed and see how back-EMF affects current. Try stalling the motor!
              </p>
            </div>

            {/* Cause-effect hint */}
            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', textAlign: 'center' }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Decrease speed toward zero to see back-EMF vanish and current spike. Current = (V_supply - Back_EMF) / R
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', alignItems: isMobile ? 'center' : 'flex-start' }}>

              {/* Left: SVG */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderMotorSVG(motorSpeed, supplyVoltage, backEMF, current, stallCurrent, false)}

                {/* Real-time formula */}
                <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', marginTop: '12px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                  <p style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '6px' }}>LIVE CALCULATION</p>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', fontFamily: 'monospace', fontWeight: 600, margin: 0 }}>
                    I = ({supplyVoltage.toFixed(1)}V - {backEMF.toFixed(1)}V) / {resistance.toFixed(1)} ohm = <span style={{ color: currentColor, fontWeight: 800 }}>{current.toFixed(2)}A</span>
                  </p>
                </div>
              </div>

              {/* Right: Controls */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {renderSlider('Supply Voltage', supplyVoltage, 0, 24, 0.5, 'V', colors.primary, setSupplyVoltage)}
                {renderSlider('Motor Speed (Load)', motorSpeed, 0, 300, 1, 'rad/s', colors.success, setMotorSpeed)}
                {renderSlider('Motor Constant (Ke)', ke, 0.01, 0.1, 0.001, 'V/(rad/s)', colors.emfArrow, setKe)}
                {renderSlider('Winding Resistance', resistance, 0.5, 10, 0.1, 'ohm', colors.copper, setResistance)}

                {/* Quick stall button */}
                <button
                  onClick={() => { setMotorSpeed(0); playSound('click'); emitEvent('button_clicked', { action: 'stall_motor' }); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 700,
                    backgroundColor: `${colors.error}22`, color: colors.error,
                    border: `2px solid ${colors.error}`, cursor: 'pointer', marginTop: '8px', fontSize: '14px',
                  }}
                >
                  STALL MOTOR (Speed = 0)
                </button>

                {/* Computed values */}
                <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', marginTop: '12px', border: `1px solid ${colors.border}` }}>
                  <p style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, marginBottom: '8px' }}>KEY VALUES</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <p style={{ color: colors.textMuted, fontSize: '10px', margin: 0 }}>Stall Current</p>
                      <p style={{ color: colors.error, fontSize: '14px', fontWeight: 700, margin: 0 }}>{stallCurrent.toFixed(2)}A</p>
                    </div>
                    <div>
                      <p style={{ color: colors.textMuted, fontSize: '10px', margin: 0 }}>No-Load Speed</p>
                      <p style={{ color: colors.success, fontSize: '14px', fontWeight: 700, margin: 0 }}>{noLoadSpeed.toFixed(0)} rad/s</p>
                    </div>
                    <div>
                      <p style={{ color: colors.textMuted, fontSize: '10px', margin: 0 }}>Efficiency</p>
                      <p style={{ color: colors.primary, fontSize: '14px', fontWeight: 700, margin: 0 }}>
                        {supplyVoltage > 0 && current > 0 ? ((mechanicalPower / (supplyVoltage * current)) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                    <div>
                      <p style={{ color: colors.textMuted, fontSize: '10px', margin: 0 }}>Back-EMF / V</p>
                      <p style={{ color: colors.emfArrow, fontSize: '14px', fontWeight: 700, margin: 0 }}>
                        {supplyVoltage > 0 ? ((backEMF / supplyVoltage) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar('See the Explanation', () => goToPhase('review'))}
      </div>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================

  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 3 - Understanding
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                The Back-EMF Principle
              </h2>
            </div>

            {/* Prediction callback */}
            <div style={{ background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.primary}15 100%)`, border: `1px solid ${colors.accent}30`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Your Prediction:</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                {prediction === 'back_emf'
                  ? 'You predicted correctly! The spinning motor generates a back-EMF that opposes the supply voltage, naturally limiting current at high speed.'
                  : 'The answer is back-EMF. A spinning motor acts as a generator, creating a voltage (Back-EMF = Ke x omega) that opposes the supply. This reduces the effective voltage driving current through the windings.'}
              </p>
            </div>

            {/* Speed-Torque chart */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderSpeedTorqueChart()}
            </div>

            {/* Explanation cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
                <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Core Equation</h3>
                <p style={{ fontFamily: 'monospace', fontSize: '20px', color: colors.textPrimary, fontWeight: 700, marginBottom: '12px' }}>
                  I = (V_supply - Ke * omega) / R
                </p>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                  As speed (omega) increases, back-EMF (Ke * omega) rises, leaving less voltage to push current through the resistance. At no-load speed, back-EMF nearly equals V_supply and current approaches zero.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.error}` }}>
                <h3 style={{ color: colors.error, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>At Stall (omega = 0)</h3>
                <p style={{ fontFamily: 'monospace', fontSize: '18px', color: colors.textPrimary, fontWeight: 700, marginBottom: '12px' }}>
                  I_stall = V_supply / R
                </p>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                  With zero speed, there is no back-EMF. The full supply voltage drives current through the winding resistance alone. This can be 6-10x the normal running current - enough to overheat and destroy the motor.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
                <h3 style={{ color: colors.success, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Speed-Torque Relationship</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                  The chart above shows that torque and current decrease linearly with speed. At stall: maximum torque and current. At no-load speed: zero torque and near-zero current. Every DC motor operates along this straight line.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
                <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Efficiency Depends on Speed</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                  Motor efficiency = (Mechanical Power) / (Electrical Power) = (Back_EMF * I) / (V * I) = Back_EMF / V. At high speed, back-EMF is close to supply voltage and efficiency is high. At stall, efficiency is zero - all electrical energy becomes heat.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar('Try a Twist', () => goToPhase('twist_predict'))}
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST_PREDICT
  // ============================================================================

  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'motor_stops', label: 'The motor would stop spinning' },
      { id: 'current_reverses', label: 'Current would reverse - the motor becomes a generator' },
      { id: 'sparks', label: 'Sparks would fly from the brushes' },
      { id: 'nothing', label: 'Nothing changes - back-EMF cannot exceed supply voltage' },
    ];

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 4 - New Variable
              </p>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                What Happens During Regenerative Braking?
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
                Imagine a motor connected to a 12V supply. Normally it spins at 200 rad/s. But what if an external force (like gravity on a downhill EV) spins it to 300 rad/s - faster than its no-load speed?
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                If Back-EMF = Ke x omega &gt; V_supply...
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                The back-EMF (15V) would be GREATER than the supply voltage (12V).
              </p>
              <p style={{ color: colors.emfArrow, fontSize: '14px', fontWeight: 600 }}>
                What happens to the current direction?
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {twistOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    padding: '16px', borderRadius: '12px',
                    border: twistPrediction === opt.id ? `2px solid ${colors.warning}` : `2px solid ${colors.border}`,
                    backgroundColor: twistPrediction === opt.id ? `${colors.warning}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', minHeight: '44px',
                  }}
                >
                  <span style={{ color: colors.textPrimary, fontSize: '14px' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar('Test It', twistPrediction ? () => goToPhase('twist_play') : undefined)}
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST_PLAY
  // ============================================================================

  if (phase === 'twist_play') {
    const twistNoLoad = twistVoltage / ke;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 5 - Explore Regeneration
              </p>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
                Push the Motor Past No-Load Speed
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Increase speed above {twistNoLoad.toFixed(0)} rad/s to see current reverse direction!
              </p>
            </div>

            {/* Regen indicator */}
            <div style={{
              background: isRegenerating ? `${colors.success}11` : `${colors.primary}11`,
              border: `1px solid ${isRegenerating ? colors.success : colors.primary}33`,
              borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', textAlign: 'center',
            }}>
              <p style={{ color: isRegenerating ? colors.success : colors.primary, fontSize: '14px', fontWeight: 700, margin: 0 }}>
                {isRegenerating
                  ? 'REGENERATING: Motor is now a generator! Current flows back to supply.'
                  : 'MOTORING: Motor consumes current from supply. Increase speed to cross the boundary.'}
              </p>
            </div>

            {/* Side-by-side */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', alignItems: isMobile ? 'center' : 'flex-start' }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderMotorSVG(twistSpeed, twistVoltage, twistBackEMF, twistCurrent, twistVoltage / resistance, true)}

                {/* Live formula */}
                <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', marginTop: '12px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                  <p style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '6px' }}>LIVE CALCULATION</p>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', fontFamily: 'monospace', fontWeight: 600, margin: 0 }}>
                    I = ({twistVoltage.toFixed(1)}V - {twistBackEMF.toFixed(1)}V) / {resistance.toFixed(1)} = <span style={{ color: isRegenerating ? colors.success : colors.warning, fontWeight: 800 }}>{twistCurrent.toFixed(2)}A</span>
                  </p>
                  {isRegenerating && (
                    <p style={{ color: colors.success, fontSize: '12px', marginTop: '4px', margin: 0 }}>
                      Negative current = energy flowing back to supply!
                    </p>
                  )}
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {renderSlider('Supply Voltage', twistVoltage, 0, 24, 0.5, 'V', colors.primary, setTwistVoltage)}
                {renderSlider('Motor Speed (External)', twistSpeed, 0, 500, 1, 'rad/s', colors.success, setTwistSpeed)}

                {/* Boundary indicator */}
                <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', border: `1px solid ${colors.border}`, marginTop: '8px' }}>
                  <p style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, marginBottom: '8px' }}>OPERATING POINT</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>No-Load Speed:</span>
                    <span style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: 700 }}>{twistNoLoad.toFixed(0)} rad/s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>Current Speed:</span>
                    <span style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: 700 }}>{twistSpeed} rad/s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>Back-EMF:</span>
                    <span style={{ color: colors.emfArrow, fontSize: '11px', fontWeight: 700 }}>{twistBackEMF.toFixed(1)} V</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>Mode:</span>
                    <span style={{ color: isRegenerating ? colors.success : colors.warning, fontSize: '11px', fontWeight: 700 }}>
                      {isRegenerating ? 'Generator' : 'Motor'}
                    </span>
                  </div>
                </div>

                {/* Quick regen button */}
                <button
                  onClick={() => { setTwistSpeed(Math.round(twistNoLoad * 1.3)); playSound('click'); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 700,
                    backgroundColor: `${colors.success}22`, color: colors.success,
                    border: `2px solid ${colors.success}`, cursor: 'pointer', marginTop: '8px', fontSize: '14px',
                  }}
                >
                  Overspeed (130% No-Load)
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar('See the Explanation', () => goToPhase('twist_review'))}
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST_REVIEW
  // ============================================================================

  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 6 - Deep Insight
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                Regenerative Braking & Energy Recovery
              </h2>
            </div>

            {/* Twist prediction callback */}
            <div style={{ background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.accent}15 100%)`, border: `1px solid ${colors.warning}30`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: colors.warning, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Your Prediction:</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                {twistPrediction === 'current_reverses'
                  ? 'You were right! When back-EMF exceeds supply voltage, current reverses and the motor becomes a generator, pushing energy back to the source.'
                  : 'The correct answer: when back-EMF exceeds supply voltage, current reverses direction. The motor becomes a generator, converting mechanical energy to electrical energy. This is regenerative braking!'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
                <h3 style={{ color: colors.success, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Regeneration Boundary</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  When omega &gt; V_supply / Ke, the back-EMF exceeds supply voltage. The voltage equation (V_supply - Back_EMF) becomes negative, reversing current. The motor now pushes current into the supply instead of drawing from it.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
                <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Motor vs Generator: Same Machine!</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  A DC motor and a DC generator are physically identical. The difference is only which way current flows. Below no-load speed: motor mode (consumes electricity). Above no-load speed: generator mode (produces electricity). The back-EMF equation governs both.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.emfArrow}` }}>
                <h3 style={{ color: colors.emfArrow, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Electric Vehicles & Regen Braking</h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  When an EV driver lifts off the accelerator or applies brakes, the controller reduces voltage to the motor. The wheels keep spinning, so back-EMF exceeds the reduced supply voltage. Current reverses, and the motor converts the car's kinetic energy back to electrical energy stored in the battery. This can recover 15-30% of driving energy.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
                <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>The Complete Picture</h3>
                <p style={{ fontFamily: 'monospace', fontSize: '16px', color: colors.textPrimary, fontWeight: 700, marginBottom: '8px' }}>
                  I = (V_supply - Ke * omega) / R
                </p>
                <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
                  I &gt; 0: Motor mode (consuming power)<br />
                  I = 0: No-load speed (Back_EMF = V_supply)<br />
                  I &lt; 0: Generator mode (regenerating power)
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar('Real World Applications', () => goToPhase('transfer'))}
      </div>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER
  // ============================================================================

  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Motor Back-EMF"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        playSound={playSound}
      />
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================

  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'D';

      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
          {renderNavDots()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '30px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '\u2705' : '\u274C'}</div>
                <h2 style={{ fontSize: '32px', fontWeight: 800, color: passed ? colors.success : colors.warning, marginBottom: '8px' }}>
                  {passed ? 'Test Passed!' : 'Keep Learning!'}
                </h2>
                <div style={{ fontSize: '56px', fontWeight: 800, color: colors.textPrimary, margin: '16px 0' }}>
                  {testScore}/10
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
                  Grade: <strong style={{ color: passed ? colors.success : colors.warning }}>{grade}</strong>
                </p>
              </div>

              {/* Answer key */}
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                  Answer Key
                </h3>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => (o as any).correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;

                  return (
                    <div key={i} style={{
                      padding: '12px', marginBottom: '8px', borderRadius: '8px',
                      background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                      border: `1px solid ${isCorrect ? colors.success : colors.error}33`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 700 }}>
                          Q{i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                        <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                          {isCorrect ? '\u2713' : '\u2717'}
                        </span>
                      </div>
                      <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0' }}>
                        {q.question}
                      </p>
                      {!isCorrect && (
                        <p style={{ color: colors.textSecondary, fontSize: '11px', margin: '4px 0', fontStyle: 'italic' }}>
                          Correct: {q.options.find(o => (o as any).correct)?.label}
                        </p>
                      )}
                      <p style={{ color: colors.textMuted, fontSize: '11px', margin: '4px 0' }}>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                {!passed && (
                  <button
                    onClick={() => {
                      setTestSubmitted(false);
                      setTestAnswers(Array(10).fill(null));
                      setCurrentQuestion(0);
                      setSelectedAnswer(null);
                      setTestScore(0);
                      goToPhase('hook');
                    }}
                    style={{
                      padding: '14px 28px', borderRadius: '10px', fontWeight: 600,
                      backgroundColor: colors.bgCardLight, color: colors.textSecondary,
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Review and Retry
                  </button>
                )}
                <button
                  onClick={() => {
                    if (passed) {
                      playSound('complete');
                      goToPhase('mastery');
                    } else {
                      setTestSubmitted(false);
                      setTestAnswers(Array(10).fill(null));
                      setCurrentQuestion(0);
                      setSelectedAnswer(null);
                      setTestScore(0);
                    }
                  }}
                  style={{
                    padding: '14px 32px', borderRadius: '12px', fontWeight: 700,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    color: 'white', border: 'none', cursor: 'pointer',
                  }}
                >
                  {passed ? 'Complete Lesson' : 'Retry Quiz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Active test
    const question = testQuestions[currentQuestion];
    const isConfirmed = testAnswers[currentQuestion] !== null;
    const correctId = question.options.find(o => (o as any).correct)?.id;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '30px 20px' }}>
            {/* Progress */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Knowledge Test
                </span>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  Question {currentQuestion + 1} of 10
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{
                    flex: 1, height: '6px', borderRadius: '3px',
                    backgroundColor: testAnswers[i] !== null ? colors.success : i === currentQuestion ? colors.primary : colors.bgCardLight,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${colors.primary}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{question.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {question.options.map(opt => {
                const isSelected = isConfirmed ? testAnswers[currentQuestion] === opt.id : selectedAnswer === opt.id;
                const isCorrectOpt = !!(opt as any).correct;

                return (
                  <button
                    key={opt.id}
                    onClick={() => { if (!isConfirmed) { playSound('click'); setSelectedAnswer(opt.id); } }}
                    disabled={isConfirmed}
                    style={{
                      padding: '16px 18px', borderRadius: '10px', textAlign: 'left', cursor: isConfirmed ? 'default' : 'pointer',
                      border: isConfirmed && isSelected
                        ? `2px solid ${isCorrectOpt ? colors.success : colors.error}`
                        : isConfirmed && isCorrectOpt
                          ? `2px solid ${colors.success}`
                          : isSelected && !isConfirmed
                            ? `2px solid ${colors.primary}`
                            : `2px solid ${colors.border}`,
                      backgroundColor: isConfirmed && isSelected
                        ? isCorrectOpt ? `${colors.success}20` : `${colors.error}20`
                        : isConfirmed && isCorrectOpt
                          ? `${colors.success}10`
                          : isSelected && !isConfirmed
                            ? `${colors.primary}20`
                            : colors.bgCard,
                      opacity: isConfirmed && !isSelected && !isCorrectOpt ? 0.5 : 1,
                    }}
                  >
                    <span style={{ color: colors.textPrimary, fontSize: '14px' }}>{opt.label}</span>
                    {isConfirmed && isCorrectOpt && <span style={{ marginLeft: '8px', color: colors.success }}>{'\u2713'}</span>}
                    {isConfirmed && isSelected && !isCorrectOpt && <span style={{ marginLeft: '8px', color: colors.error }}>{'\u2717'}</span>}
                  </button>
                );
              })}
            </div>

            {/* Check answer button */}
            {selectedAnswer && !isConfirmed && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  onClick={() => {
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = selectedAnswer;
                    setTestAnswers(newAnswers);
                    const isCorrectAnswer = selectedAnswer === correctId;
                    playSound(isCorrectAnswer ? 'success' : 'failure');
                    emitEvent(isCorrectAnswer ? 'correct_answer' : 'incorrect_answer', { question: currentQuestion, answer: selectedAnswer });
                    setSelectedAnswer(null);
                  }}
                  style={{
                    padding: '14px 32px', borderRadius: '10px', fontWeight: 700,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    color: 'white', border: 'none', cursor: 'pointer',
                  }}
                >
                  Check Answer
                </button>
              </div>
            )}

            {/* Feedback */}
            {isConfirmed && (
              <div style={{
                textAlign: 'center', marginTop: '20px', padding: '16px', borderRadius: '12px',
                backgroundColor: testAnswers[currentQuestion] === correctId ? `${colors.success}15` : `${colors.error}15`,
              }}>
                <div style={{ color: testAnswers[currentQuestion] === correctId ? colors.success : colors.error, fontSize: '20px', fontWeight: 700 }}>
                  {testAnswers[currentQuestion] === correctId ? 'Correct!' : 'Incorrect'}
                </div>
              </div>
            )}

            {/* Explanation */}
            {isConfirmed && (
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginTop: '16px', borderLeft: `4px solid ${colors.warning}` }}>
                <h4 style={{ color: colors.warning, fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>Explanation</h4>
                <p style={{ color: colors.textSecondary, lineHeight: 1.6, fontSize: '13px', margin: 0 }}>{question.explanation}</p>
              </div>
            )}

            {/* Next / Submit */}
            {isConfirmed && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    if (currentQuestion < 9) {
                      setCurrentQuestion(currentQuestion + 1);
                      setSelectedAnswer(null);
                    } else {
                      const score = calculateScore();
                      setTestScore(score);
                      setTestSubmitted(true);
                      emitEvent('game_completed', { score, total: 10 });
                      playSound(score >= 7 ? 'complete' : 'failure');
                    }
                  }}
                  style={{
                    padding: '14px 28px', borderRadius: '10px', fontWeight: 700,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    color: 'white', border: 'none', cursor: 'pointer',
                  }}
                >
                  {currentQuestion < 9 ? 'Next Question' : 'See Results'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================

  if (phase === 'mastery') {
    const score = testScore || calculateScore();
    const grade = score >= 9 ? 'A' : score >= 8 ? 'B+' : score >= 7 ? 'B' : score >= 6 ? 'C' : 'D';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)` }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {'\u{1F3C6}'}
            </div>

            <h1 style={{ fontSize: '36px', fontWeight: 800, color: colors.success, marginBottom: '16px' }}>
              Motor Back-EMF Master!
            </h1>

            <p style={{ color: colors.textSecondary, fontSize: '18px', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.7 }}>
              You now understand how back-EMF governs DC motor behavior - from startup current surges to regenerative braking. This knowledge applies to every electric motor on the planet.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px 28px', border: `1px solid ${colors.border}` }}>
                <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Score</p>
                <p style={{ color: colors.textPrimary, fontSize: '32px', fontWeight: 800, margin: 0 }}>{score}/10</p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px 28px', border: `1px solid ${colors.border}` }}>
                <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Grade</p>
                <p style={{ color: colors.success, fontSize: '32px', fontWeight: 800, margin: 0 }}>{grade}</p>
              </div>
            </div>

            {/* Key learnings */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', textAlign: 'left', maxWidth: '500px', margin: '0 auto 32px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                What You Learned
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Back-EMF = Ke x omega opposes supply voltage',
                  'Current = (V_supply - Back_EMF) / R',
                  'Stall current is maximum: I = V/R (no back-EMF)',
                  'Higher speed means more back-EMF and less current',
                  'When back-EMF > V_supply, current reverses (regeneration)',
                  'Motor and generator are the same machine in different modes',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: colors.success, fontSize: '14px', marginTop: '2px' }}>{'\u2713'}</span>
                    <span style={{ color: colors.textSecondary, fontSize: '14px' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer key */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '32px', textAlign: 'left', maxWidth: '600px', margin: '0 auto 32px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                Full Answer Key
              </h3>
              {testQuestions.map((q, i) => {
                const correctOpt = q.options.find(o => (o as any).correct);
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer === correctOpt?.id;

                return (
                  <div key={i} style={{
                    padding: '10px', marginBottom: '6px', borderRadius: '6px',
                    background: isCorrect ? `${colors.success}08` : `${colors.error}08`,
                    borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 700 }}>
                        Q{i + 1}: {q.question.substring(0, 60)}...
                      </span>
                      <span style={{ color: isCorrect ? colors.success : colors.error }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                    </div>
                    <p style={{ color: colors.textMuted, fontSize: '11px', margin: '2px 0 0' }}>
                      Answer: {correctOpt?.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '14px 28px', borderRadius: '10px', fontWeight: 600,
                  backgroundColor: colors.bgCardLight, color: colors.textSecondary,
                  border: 'none', cursor: 'pointer',
                }}
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  playSound('complete');
                  emitEvent('mastery_achieved', { score, total: 10, grade });
                  emitEvent('game_completed', { score, total: 10 });
                  window.location.href = '/games';
                }}
                style={{
                  padding: '16px 36px', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
                  background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`,
                  color: 'white', border: 'none', cursor: 'pointer',
                  boxShadow: `0 8px 32px ${colors.success}40`,
                }}
              >
                Complete Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
};

export default MotorBackEMFRenderer;
