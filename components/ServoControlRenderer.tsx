'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// SERVO CONTROL LOOP - Complete 10-Phase Learning Experience (#270)
// PID Control: u(t) = Kp*e(t) + Ki*integral(e) + Kd*de/dt
// Step response metrics: overshoot, settling time, steady-state error
// Plant model: J*theta'' + b*theta' = u  (motor with inertia J, friction b)
// Closed-loop with PID feedback from encoder
// -----------------------------------------------------------------------------

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

interface ServoControlRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'servo') => {
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
      servo: { freq: 440, duration: 0.06, type: 'sawtooth' }
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

// -----------------------------------------------------------------------------
// PID Simulation Engine
// -----------------------------------------------------------------------------
interface PIDState {
  position: number;
  velocity: number;
  integral: number;
  prevError: number;
  time: number;
}

function simulatePIDStep(
  state: PIDState,
  target: number,
  kp: number,
  ki: number,
  kd: number,
  inertia: number,
  friction: number,
  dt: number
): PIDState {
  const error = target - state.position;
  const newIntegral = state.integral + error * dt;
  const derivative = (error - state.prevError) / dt;

  // PID output (control effort)
  const u = kp * error + ki * newIntegral + kd * derivative;

  // Plant dynamics: J * theta'' + b * theta' = u
  const acceleration = (u - friction * state.velocity) / inertia;
  const newVelocity = state.velocity + acceleration * dt;
  const newPosition = state.position + newVelocity * dt;

  return {
    position: newPosition,
    velocity: newVelocity,
    integral: newIntegral,
    prevError: error,
    time: state.time + dt,
  };
}

function generateStepResponse(
  target: number,
  kp: number,
  ki: number,
  kd: number,
  inertia: number,
  friction: number,
  duration: number,
  dt: number
): { times: number[]; positions: number[]; overshoot: number; settlingTime: number; steadyStateError: number } {
  let state: PIDState = { position: 0, velocity: 0, integral: 0, prevError: target, time: 0 };
  const times: number[] = [0];
  const positions: number[] = [0];

  const steps = Math.floor(duration / dt);
  let maxPos = 0;

  for (let i = 0; i < steps; i++) {
    state = simulatePIDStep(state, target, kp, ki, kd, inertia, friction, dt);
    times.push(state.time);
    positions.push(state.position);
    if (state.position > maxPos) maxPos = state.position;
  }

  // Compute metrics
  const overshoot = target > 0 ? Math.max(0, ((maxPos - target) / target) * 100) : 0;

  // Settling time: last time position is outside 2% band of target
  let settlingTime = duration;
  const band = Math.abs(target) * 0.02;
  for (let i = positions.length - 1; i >= 0; i--) {
    if (Math.abs(positions[i] - target) > band) {
      settlingTime = times[i];
      break;
    }
  }

  // Steady-state error: average of last 10% of samples
  const lastChunk = positions.slice(Math.floor(positions.length * 0.9));
  const avgFinal = lastChunk.reduce((a, b) => a + b, 0) / lastChunk.length;
  const steadyStateError = Math.abs(target - avgFinal);

  return { times, positions, overshoot, settlingTime, steadyStateError };
}

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A robotic arm is positioning a surgical tool. With proportional gain Kp = 10, the arm reaches near the target but stops 2mm short. Increasing Kp to 20 reduces the offset to 1mm but never eliminates it.",
    question: "What controller action will eliminate this steady-state error?",
    options: [
      { id: 'a', label: "Keep increasing Kp until the error is negligible" },
      { id: 'b', label: "Add integral action (Ki > 0) to accumulate and correct the persistent error", correct: true },
      { id: 'c', label: "Add derivative action (Kd > 0) to anticipate the error" },
      { id: 'd', label: "Reduce friction in the mechanical system" }
    ],
    explanation: "Integral action accumulates error over time. Even a tiny persistent error will cause the integral term to grow continuously, eventually producing enough control effort to drive the steady-state error to zero. This is the fundamental purpose of the I term in PID control."
  },
  {
    scenario: "An engineer doubles the proportional gain Kp on a servo motor controller. The system now oscillates continuously around the setpoint with constant amplitude.",
    question: "What has happened to the control system?",
    options: [
      { id: 'a', label: "The system has become critically damped" },
      { id: 'b', label: "The system is on the margin of stability - sustained oscillation means it is marginally stable", correct: true },
      { id: 'c', label: "The derivative term is too high" },
      { id: 'd', label: "The integral term has saturated" }
    ],
    explanation: "Sustained constant-amplitude oscillation indicates marginal stability. The gain is at the critical value where the closed-loop poles are on the imaginary axis. Any further increase will cause growing oscillations (instability). This critical gain is used in Ziegler-Nichols tuning methods."
  },
  {
    scenario: "A CNC machine tool servo has good tracking at low speed but overshoots badly during fast positioning moves. The overshoot is 40% with the current PID settings.",
    question: "Which PID parameter adjustment would most directly reduce overshoot?",
    options: [
      { id: 'a', label: "Increase Kp to make the system respond faster" },
      { id: 'b', label: "Increase Ki to reduce error accumulation" },
      { id: 'c', label: "Increase Kd to add damping that resists rapid changes", correct: true },
      { id: 'd', label: "Decrease all three gains equally" }
    ],
    explanation: "Derivative action (Kd) produces a control effort proportional to the rate of change of error. As the system approaches the target quickly, the derivative term applies a braking force that opposes the rapid approach, reducing overshoot. It acts like a viscous damper in the control loop."
  },
  {
    scenario: "A temperature control system uses PID to maintain 200C in an oven. When the door opens, the temperature drops to 180C. With only proportional control, it recovers to 195C. Adding integral action recovers it to 200C but with overshoot.",
    question: "Why does adding integral action cause overshoot in this scenario?",
    options: [
      { id: 'a', label: "The integral term accumulated a large value during the error period and keeps pushing after the error is corrected", correct: true },
      { id: 'b', label: "Integral action always causes overshoot regardless of conditions" },
      { id: 'c', label: "The oven heaters are oversized for the application" },
      { id: 'd', label: "The temperature sensor has a delay" }
    ],
    explanation: "This is 'integral windup.' While the temperature was below setpoint, the integral term accumulated a large positive value. Even after the temperature reaches 200C (error = 0), the accumulated integral still drives heating, causing overshoot. Anti-windup techniques limit integral accumulation."
  },
  {
    scenario: "A drone's altitude controller works perfectly with a 500g payload. When a 2kg package is attached, the drone becomes sluggish and oscillates slowly around the target altitude.",
    question: "What happened and how should the PID be adjusted?",
    options: [
      { id: 'a', label: "Reduce all gains to prevent oscillation" },
      { id: 'b', label: "The increased inertia requires higher gains - increase Kp and Kd proportionally", correct: true },
      { id: 'c', label: "Only increase Ki to handle the extra weight" },
      { id: 'd', label: "The PID controller cannot handle different payloads" }
    ],
    explanation: "Higher inertia means more force is needed for the same acceleration. The existing gains produce less effect per unit gain, making the system sluggish. Increasing Kp provides more corrective force, and increasing Kd provides adequate damping for the heavier system. This is the basis of gain scheduling."
  },
  {
    scenario: "A servo motor encoder reads 1000 counts per revolution. The PID controller runs at 1 kHz (1ms loop time). An engineer notices excessive noise on the derivative term, causing motor vibration.",
    question: "What is the most likely cause of the noisy derivative signal?",
    options: [
      { id: 'a', label: "The encoder resolution is too low" },
      { id: 'b', label: "Differentiating the position signal amplifies high-frequency encoder noise", correct: true },
      { id: 'c', label: "The proportional gain is too high" },
      { id: 'd', label: "The motor has mechanical resonance at 1 kHz" }
    ],
    explanation: "Differentiation amplifies high-frequency noise. Small quantization steps in the encoder create discrete jumps that, when differentiated at high sample rates, produce large spikes. Solutions include low-pass filtering the derivative term, reducing Kd, or using a derivative-on-measurement (not error) approach."
  },
  {
    scenario: "A conveyor belt positioning system uses PID control. The engineer measures: rise time = 0.3s, overshoot = 25%, settling time = 1.2s. The spec requires overshoot < 5% and settling time < 0.8s.",
    question: "Which tuning strategy best achieves both specifications?",
    options: [
      { id: 'a', label: "Decrease Kp to reduce overshoot, accept slower rise time" },
      { id: 'b', label: "Increase Kd to reduce overshoot while keeping Kp for fast rise time", correct: true },
      { id: 'c', label: "Add Ki to speed up settling" },
      { id: 'd', label: "Double Kp and Kd together" }
    ],
    explanation: "The system is fast (good rise time) but oscillatory (high overshoot, long settling). Increasing Kd adds damping to suppress overshoot without significantly slowing the initial response. This preserves the fast rise time from Kp while reducing oscillation, meeting both specifications."
  },
  {
    scenario: "Two identical robot joints use the same PID gains. Joint A (horizontal) tracks perfectly. Joint B (vertical, lifting against gravity) has a constant offset below the target position.",
    question: "What causes the offset in the vertical joint?",
    options: [
      { id: 'a', label: "The motor in joint B is defective" },
      { id: 'b', label: "Gravity creates a constant disturbance that proportional control alone cannot fully reject", correct: true },
      { id: 'c', label: "The encoder in joint B is miscalibrated" },
      { id: 'd', label: "Vertical motion requires a different controller type entirely" }
    ],
    explanation: "Gravity applies a constant torque opposing upward motion. With only proportional control, steady-state error = disturbance / (1 + Kp). The error can be reduced by increasing Kp but never eliminated. Adding integral action or a gravity feedforward term eliminates this offset."
  },
  {
    scenario: "A process control textbook states: 'The Ziegler-Nichols method first increases Kp until the system oscillates at a critical gain Ku with period Tu.' The critical gain is found to be Ku = 50 and Tu = 0.5s.",
    question: "Using Ziegler-Nichols PID tuning, what are the initial PID gains?",
    options: [
      { id: 'a', label: "Kp = 25, Ki = 0.25, Kd = 0 (PI only)" },
      { id: 'b', label: "Kp = 30, Ki = 120, Kd = 1.875", correct: true },
      { id: 'c', label: "Kp = 50, Ki = 50, Kd = 50 (equal gains)" },
      { id: 'd', label: "Kp = 10, Ki = 10, Kd = 10 (conservative)" }
    ],
    explanation: "Ziegler-Nichols PID: Kp = 0.6*Ku = 30, Ti = 0.5*Tu = 0.25s, Td = 0.125*Tu = 0.0625s. Ki = Kp/Ti = 30/0.25 = 120, Kd = Kp*Td = 30*0.0625 = 1.875. These are starting values; further tuning is usually needed for acceptable overshoot."
  },
  {
    scenario: "A factory replaces mechanical servo systems with digital controllers running at 100 Hz. Some systems that were stable with analog controllers now oscillate.",
    question: "What causes the instability in the digital implementation?",
    options: [
      { id: 'a', label: "Digital computers cannot implement PID control accurately" },
      { id: 'b', label: "The 100 Hz sample rate introduces phase lag that reduces stability margins", correct: true },
      { id: 'c', label: "The digital controller uses too much memory" },
      { id: 'd', label: "Electrical noise from the computer interferes with the motor" }
    ],
    explanation: "Digital control introduces a sample-and-hold delay of approximately half the sample period (5ms at 100 Hz). This delay adds phase lag to the loop, reducing phase margin. Systems near the stability boundary in analog become unstable. The solution is higher sample rates (typically 10-20x the bandwidth) or reducing gains."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F916}',
    title: 'Industrial Robot Arms',
    short: 'Precision motion at every joint',
    tagline: 'Six axes of PID-controlled perfection',
    description: 'Industrial robots like the FANUC M-20iA have 6 joints, each with its own servo motor, encoder, and PID controller. These systems achieve repeatability of 0.02mm while moving payloads up to 35kg at speeds over 2 m/s. Each joint runs independent PID loops at 1-8 kHz.',
    connection: 'Each joint is a servo control loop: the encoder provides position feedback, and the PID controller computes motor current to minimize tracking error. Gravity compensation, friction feedforward, and cross-coupling compensation augment the basic PID to handle the complex multi-axis dynamics.',
    howItWorks: 'The trajectory planner generates smooth position profiles. Each joint PID receives setpoints at the servo rate. The P term corrects position error, I compensates for gravity and friction, and D damps oscillation. Modern robots use cascaded loops: an outer position loop feeds an inner velocity loop feeding a current loop.',
    stats: [
      { value: '0.02 mm', label: 'Repeatability', icon: '\u{1F3AF}' },
      { value: '8 kHz', label: 'Servo rate', icon: '\u{26A1}' },
      { value: '6 axes', label: 'Independent PID loops', icon: '\u{1F504}' }
    ],
    examples: [
      'FANUC M-20iA - 6-axis industrial robot with 35kg payload',
      'ABB IRB 6700 - high-accuracy welding and material handling',
      'Universal Robots UR5e - collaborative robot with force-torque feedback',
      'KUKA LBR iiwa - 7-axis sensitive robot for human collaboration'
    ],
    companies: ['FANUC', 'ABB', 'KUKA', 'Universal Robots', 'Yaskawa', 'Mitsubishi'],
    futureImpact: 'AI-augmented PID controllers will learn optimal gains for each task automatically, adapting in real-time to wear, temperature changes, and varying payloads without manual tuning.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F3ED}',
    title: 'CNC Machine Tools',
    short: 'Cutting metal with micrometer precision',
    tagline: 'Where servo control meets manufacturing',
    description: 'CNC machining centers use servo motors on each axis (X, Y, Z, plus rotary axes) to cut parts to tolerances of 0.005mm. The servo control must handle cutting forces that act as disturbances while maintaining path accuracy at feed rates up to 30 m/min.',
    connection: 'The CNC interpolator generates axis position commands at 1-4 kHz. Each axis servo uses PID (often with velocity and acceleration feedforward) to track these commands. Cutting forces create disturbances that the controller must reject while maintaining the programmed tool path.',
    howItWorks: 'Modern CNC servos use a cascaded structure: position loop (PID) at 1-4 kHz wraps a velocity loop at 4-16 kHz which wraps a current loop at 16-64 kHz. Feedforward terms predict required effort from the commanded trajectory. Notch filters suppress mechanical resonances.',
    stats: [
      { value: '0.005 mm', label: 'Positioning accuracy', icon: '\u{1F3AF}' },
      { value: '30 m/min', label: 'Rapid traverse speed', icon: '\u{1F680}' },
      { value: '64 kHz', label: 'Current loop rate', icon: '\u{26A1}' }
    ],
    examples: [
      'Haas VF-2 - vertical machining center for job shops',
      'DMG MORI NLX 2500 - CNC lathe with sub-micron servo control',
      'Mazak INTEGREX - 5-axis multi-tasking with simultaneous control',
      'Okuma GENOS - thermal-friendly CNC with adaptive servo tuning'
    ],
    companies: ['Fanuc', 'Siemens', 'Mitsubishi Electric', 'Beckhoff', 'Haas'],
    futureImpact: 'Digital twin-driven servo tuning will simulate cutting conditions and pre-optimize PID gains before the first chip is cut, reducing setup time from hours to minutes.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F681}',
    title: 'Drone Flight Controllers',
    short: 'Stabilizing flight 400 times per second',
    tagline: 'PID loops keeping you airborne',
    description: 'Multirotor drones use cascaded PID loops for attitude stabilization. The inner loop (rate PID) runs at 2-8 kHz controlling angular velocity. The outer loop (angle PID) runs at 250-1000 Hz controlling orientation. GPS position and altitude loops add further outer cascades.',
    connection: 'Each axis (roll, pitch, yaw) has its own PID controller. The gyroscope provides angular rate feedback for the inner loop, and the accelerometer (integrated) provides angle feedback for the outer loop. Wind gusts, payload changes, and motor variations are disturbances the PID must reject.',
    howItWorks: 'The flight controller reads IMU data at high rate, computes PID outputs for each axis, mixes them into individual motor commands, and sends PWM signals to ESCs. The D term is critical for damping oscillation, but must be filtered heavily to avoid amplifying vibration noise from propellers.',
    stats: [
      { value: '8 kHz', label: 'PID loop rate', icon: '\u{26A1}' },
      { value: '3 axes', label: 'Attitude PID channels', icon: '\u{1F504}' },
      { value: '<10 ms', label: 'Disturbance response', icon: '\u{23F1}' }
    ],
    examples: [
      'Betaflight - open-source flight controller firmware for racing drones',
      'ArduPilot - autonomous vehicle control with advanced PID tuning',
      'DJI Mavic series - consumer drones with highly tuned servo loops',
      'PX4 Autopilot - professional drone firmware with cascaded PID'
    ],
    companies: ['DJI', 'Ardupilot', 'Betaflight', 'PX4', 'Skydio'],
    futureImpact: 'Reinforcement learning will complement PID control, learning to handle complex aerodynamic effects like ground effect and prop wash that are difficult to model analytically.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F3AE}',
    title: 'Hard Disk Drive Heads',
    short: 'Nanometer positioning at 15,000 RPM',
    tagline: 'The most demanding servo problem in consumer electronics',
    description: 'Hard disk drive read/write heads must track data tracks only 50-70 nm wide while the platter spins at 7,200-15,000 RPM. The servo controller repositions the head across tracks in under 4ms (seek) and holds position within 10nm during read/write (track-following).',
    connection: 'The HDD servo reads embedded position information from the platter 40,000+ times per revolution. A PID-like controller (actually a state estimator with LQG or H-infinity design) drives the voice coil actuator. The system must reject vibration, thermal expansion, and windage disturbances.',
    howItWorks: 'Servo sectors embedded between data sectors provide position error signals. The controller uses these samples (at 40-80 kHz effective rate) to compute actuator current. A two-stage actuator (voice coil for coarse, piezoelectric for fine positioning) enables the extreme precision required by modern track densities.',
    stats: [
      { value: '10 nm', label: 'Track-following accuracy', icon: '\u{1F3AF}' },
      { value: '4 ms', label: 'Average seek time', icon: '\u{23F1}' },
      { value: '80 kHz', label: 'Servo sample rate', icon: '\u{26A1}' }
    ],
    examples: [
      'Seagate Exos - enterprise HDD with 10+ platter servo control',
      'Western Digital Ultrastar - helium-sealed drives with reduced turbulence',
      'Toshiba MG series - 18TB drives with advanced multi-actuator servo',
      'Seagate MACH.2 - dual-actuator drives with independent servo loops'
    ],
    companies: ['Seagate', 'Western Digital', 'Toshiba'],
    futureImpact: 'HAMR (Heat-Assisted Magnetic Recording) will push track density even higher, requiring sub-nanometer servo precision achievable only through advanced adaptive control and AI-based vibration prediction.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ServoControlRenderer: React.FC<ServoControlRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
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
  const { isMobile } = useViewport();

  // PID Simulation state
  const [targetPosition, setTargetPosition] = useState(90); // degrees
  const [kp, setKp] = useState(2.0);
  const [ki, setKi] = useState(0.5);
  const [kd, setKd] = useState(0.3);
  const [inertia, setInertia] = useState(1.0);
  const [friction, setFriction] = useState(0.3);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simData, setSimData] = useState<{ times: number[]; positions: number[]; overshoot: number; settlingTime: number; steadyStateError: number } | null>(null);
  const [animFrame, setAnimFrame] = useState(0);
  const [servoAngle, setServoAngle] = useState(0);

  // Twist phase state
  const [twistInertia, setTwistInertia] = useState(4.0);
  const [twistKp, setTwistKp] = useState(2.0);
  const [twistKi, setTwistKi] = useState(0.5);
  const [twistKd, setTwistKd] = useState(0.3);
  const [twistSimData, setTwistSimData] = useState<{ times: number[]; positions: number[]; overshoot: number; settlingTime: number; steadyStateError: number } | null>(null);
  const [twistRetuned, setTwistRetuned] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Animate servo arm to current simulated position
  useEffect(() => {
    if (!isSimulating || !simData) return;

    const duration = simData.times[simData.times.length - 1];
    const startTime = Date.now();

    simTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= duration) {
        setServoAngle(simData.positions[simData.positions.length - 1]);
        setIsSimulating(false);
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        return;
      }
      // Interpolate position
      const idx = Math.min(
        Math.floor((elapsed / duration) * simData.positions.length),
        simData.positions.length - 1
      );
      setServoAngle(simData.positions[idx]);
    }, 20);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, simData]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber for servo/control
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F97316',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    cyan: '#06B6D4',
    orange: '#F97316',
    blue: '#3B82F6',
    violet: '#8B5CF6',
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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Re-tune',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'servo-control',
        gameTitle: 'Servo Control Loop',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Run simulation
  const runSimulation = useCallback((
    tgt: number, p: number, i: number, d: number, j: number, b: number,
    setter: (data: { times: number[]; positions: number[]; overshoot: number; settlingTime: number; steadyStateError: number }) => void
  ) => {
    const data = generateStepResponse(tgt, p, i, d, j, b, 3.0, 0.002);
    setter(data);
    setIsSimulating(true);
    playSound('servo');
  }, []);

  // Check if play goals achieved
  const playGoalsMet = simData
    ? simData.overshoot < 10 && simData.settlingTime < 0.5 && simData.steadyStateError < 2
    : false;

  const twistGoalsMet = twistSimData
    ? twistSimData.overshoot < 15 && twistSimData.settlingTime < 0.8 && twistSimData.steadyStateError < 3
    : false;

  // ──────────────────────────────────────────────────────────────────────
  // SVG COMPONENTS
  // ──────────────────────────────────────────────────────────────────────

  // PID Block Diagram
  const PIDBlockDiagram = ({ width: w }: { width: number }) => {
    const h = isMobile ? 140 : 160;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="PID Block Diagram">
        <text x={w / 2} y="16" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">PID Control Loop</text>

        {/* Reference input */}
        <text x="10" y={h / 2 - 10} fill={colors.cyan} fontSize="10">Target</text>
        <line x1="38" y1={h / 2} x2="60" y2={h / 2} stroke={colors.cyan} strokeWidth="2" markerEnd="url(#arrowCyan)" />

        {/* Summing junction */}
        <circle cx="70" cy={h / 2} r="10" fill="none" stroke={colors.textSecondary} strokeWidth="1.5" />
        <text x="67" y={h / 2 + 4} fill={colors.textSecondary} fontSize="11" fontWeight="700">{'\u03A3'}</text>
        <text x="65" y={h / 2 + 18} fill={colors.error} fontSize="9">-</text>

        {/* Error to PID */}
        <line x1="80" y1={h / 2} x2="110" y2={h / 2} stroke={colors.textSecondary} strokeWidth="2" />
        <text x="88" y={h / 2 - 6} fill={colors.textMuted} fontSize="9">e(t)</text>

        {/* PID Block */}
        <rect x="110" y={h / 2 - 22} width="80" height="44" rx="6" fill={colors.accent + '30'} stroke={colors.accent} strokeWidth="2" />
        <text x="150" y={h / 2 - 6} textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="700">PID</text>
        <text x="150" y={h / 2 + 10} textAnchor="middle" fill={colors.textMuted} fontSize="9">Kp + Ki/s + Kd*s</text>

        {/* PID to Plant */}
        <line x1="190" y1={h / 2} x2="220" y2={h / 2} stroke={colors.textSecondary} strokeWidth="2" />
        <text x="198" y={h / 2 - 6} fill={colors.textMuted} fontSize="9">u(t)</text>

        {/* Plant Block */}
        <rect x="220" y={h / 2 - 22} width="80" height="44" rx="6" fill={colors.blue + '30'} stroke={colors.blue} strokeWidth="2" />
        <text x="260" y={h / 2 - 6} textAnchor="middle" fill={colors.blue} fontSize="12" fontWeight="700">Motor</text>
        <text x="260" y={h / 2 + 10} textAnchor="middle" fill={colors.textMuted} fontSize="9">J, b</text>

        {/* Output */}
        <line x1="300" y1={h / 2} x2={w - 30} y2={h / 2} stroke={colors.success} strokeWidth="2" />
        <text x={w - 25} y={h / 2 - 10} fill={colors.success} fontSize="10">{'\u03B8'}(t)</text>

        {/* Feedback path */}
        <line x1={w - 50} y1={h / 2} x2={w - 50} y2={h / 2 + 40} stroke={colors.success} strokeWidth="1.5" />
        <line x1={w - 50} y1={h / 2 + 40} x2="70" y2={h / 2 + 40} stroke={colors.success} strokeWidth="1.5" />
        <line x1="70" y1={h / 2 + 40} x2="70" y2={h / 2 + 10} stroke={colors.success} strokeWidth="1.5" />

        {/* Encoder block on feedback */}
        <rect x={w / 2 - 30} y={h / 2 + 30} width="60" height="20" rx="4" fill={colors.success + '30'} stroke={colors.success} strokeWidth="1" />
        <text x={w / 2} y={h / 2 + 44} textAnchor="middle" fill={colors.success} fontSize="9">Encoder</text>

        {/* Arrow defs */}
        <defs>
          <marker id="arrowCyan" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill={colors.cyan} />
          </marker>
        </defs>
      </svg>
    );
  };

  // Servo Arm Visualization
  const ServoArmVis = ({ angle, target, size }: { angle: number; target: number; size: number }) => {
    const cx = size / 2;
    const cy = size / 2 + 10;
    const armLen = size * 0.35;
    const rad = (angle * Math.PI) / 180;
    const tRad = (target * Math.PI) / 180;
    const armX = cx + armLen * Math.cos(-rad + Math.PI);
    const armY = cy + armLen * Math.sin(-rad + Math.PI);
    const targetX = cx + (armLen + 10) * Math.cos(-tRad + Math.PI);
    const targetY = cy + (armLen + 10) * Math.sin(-tRad + Math.PI);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Servo arm visualization">
        <text x={size / 2} y="16" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="700">Servo Position</text>

        {/* Angle arc background */}
        <circle cx={cx} cy={cy} r={armLen + 15} fill="none" stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />

        {/* Angle markings */}
        {[0, 30, 60, 90, 120, 150, 180].map(deg => {
          const r2 = (deg * Math.PI) / 180;
          const outerR = armLen + 20;
          const innerR = armLen + 12;
          return (
            <g key={deg}>
              <line
                x1={cx + innerR * Math.cos(-r2 + Math.PI)}
                y1={cy + innerR * Math.sin(-r2 + Math.PI)}
                x2={cx + outerR * Math.cos(-r2 + Math.PI)}
                y2={cy + outerR * Math.sin(-r2 + Math.PI)}
                stroke={colors.textMuted}
                strokeWidth="1"
              />
              <text
                x={cx + (outerR + 10) * Math.cos(-r2 + Math.PI)}
                y={cy + (outerR + 10) * Math.sin(-r2 + Math.PI) + 3}
                textAnchor="middle"
                fill={colors.textMuted}
                fontSize="9"
              >{deg}{'°'}</text>
            </g>
          );
        })}

        {/* Target indicator line (dashed) */}
        <line x1={cx} y1={cy} x2={targetX} y2={targetY} stroke={colors.success} strokeWidth="2" strokeDasharray="6,4" opacity="0.6" />
        <circle cx={targetX} cy={targetY} r="5" fill={colors.success} opacity="0.5" />
        <text x={targetX + 10} y={targetY - 5} fill={colors.success} fontSize="10">Target</text>

        {/* Servo body */}
        <rect x={cx - 18} y={cy - 12} width="36" height="24" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="6" fill={colors.accent} />

        {/* Servo arm */}
        <line x1={cx} y1={cy} x2={armX} y2={armY} stroke={colors.accent} strokeWidth="4" strokeLinecap="round" />
        <circle cx={armX} cy={armY} r="5" fill={colors.accent} stroke="#fff" strokeWidth="1.5" />

        {/* Current angle readout */}
        <text x={size / 2} y={size - 8} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          {angle.toFixed(1)}{'°'} / {target}{'°'} target
        </text>
      </svg>
    );
  };

  // Step Response Waveform
  const StepResponseGraph = ({ data, targetVal, graphWidth, label, accentColor }: {
    data: { times: number[]; positions: number[] } | null;
    targetVal: number;
    graphWidth: number;
    label: string;
    accentColor: string;
  }) => {
    const h = 220;
    const plotTop = 35;
    const plotBottom = 190;
    const plotLeft = 50;
    const plotRight = graphWidth - 20;

    if (!data) {
      return (
        <svg width={graphWidth} height={h} viewBox={`0 0 ${graphWidth} ${h}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
          <text x={graphWidth / 2} y={h / 2} textAnchor="middle" fill={colors.textMuted} fontSize="14">Run simulation to see step response</text>
        </svg>
      );
    }

    const maxTime = data.times[data.times.length - 1];
    const maxVal = Math.max(targetVal * 1.5, ...data.positions);
    const minVal = Math.min(0, ...data.positions);
    const range = maxVal - minVal;

    const toX = (t: number) => plotLeft + (t / maxTime) * (plotRight - plotLeft);
    const toY = (v: number) => plotBottom - ((v - minVal) / range) * (plotBottom - plotTop);

    // Build polyline
    const step = Math.max(1, Math.floor(data.times.length / 300));
    const points = data.times
      .filter((_, i) => i % step === 0)
      .map((t, i) => `${toX(t)},${toY(data.positions[i * step])}`)
      .join(' ');

    const targetY = toY(targetVal);

    return (
      <svg width={graphWidth} height={h} viewBox={`0 0 ${graphWidth} ${h}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
        <text x={graphWidth / 2} y="18" textAnchor="middle" fill={accentColor} fontSize="13" fontWeight="700">{label}</text>

        {/* Grid */}
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={`hg-${frac}`} x1={plotLeft} y1={plotTop + frac * (plotBottom - plotTop)} x2={plotRight} y2={plotTop + frac * (plotBottom - plotTop)} stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map(frac => (
          <line key={`vg-${frac}`} x1={plotLeft + frac * (plotRight - plotLeft)} y1={plotTop} x2={plotLeft + frac * (plotRight - plotLeft)} y2={plotBottom} stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
        ))}

        {/* Axes */}
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={colors.textMuted} strokeWidth="1.5" />
        <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={colors.textMuted} strokeWidth="1.5" />

        {/* Target line */}
        <line x1={plotLeft} y1={targetY} x2={plotRight} y2={targetY} stroke={colors.success} strokeWidth="1.5" strokeDasharray="8,4" />
        <text x={plotRight + 2} y={targetY + 4} fill={colors.success} fontSize="10">target</text>

        {/* 2% band */}
        <rect x={plotLeft} y={toY(targetVal * 1.02)} width={plotRight - plotLeft} height={toY(targetVal * 0.98) - toY(targetVal * 1.02)} fill={colors.success} opacity="0.08" />

        {/* Response curve */}
        <polyline points={points} fill="none" stroke={accentColor} strokeWidth="2.5" />

        {/* Axis labels */}
        <text x="12" y={(plotTop + plotBottom) / 2} fill={colors.textSecondary} fontSize="10" transform={`rotate(-90, 12, ${(plotTop + plotBottom) / 2})`} textAnchor="middle">Position ({'\u00B0'})</text>
        <text x={(plotLeft + plotRight) / 2} y={plotBottom + 18} textAnchor="middle" fill={colors.textSecondary} fontSize="10">Time (s)</text>

        {/* Y ticks */}
        <text x={plotLeft - 5} y={toY(0) + 4} textAnchor="end" fill={colors.textMuted} fontSize="9">0</text>
        <text x={plotLeft - 5} y={toY(targetVal) + 4} textAnchor="end" fill={colors.textMuted} fontSize="9">{targetVal}</text>
        {maxVal > targetVal * 1.1 && (
          <text x={plotLeft - 5} y={toY(maxVal * 0.9) + 4} textAnchor="end" fill={colors.textMuted} fontSize="9">{(maxVal * 0.9).toFixed(0)}</text>
        )}

        {/* X ticks */}
        <text x={plotLeft} y={plotBottom + 14} textAnchor="middle" fill={colors.textMuted} fontSize="9">0</text>
        <text x={toX(maxTime / 2)} y={plotBottom + 14} textAnchor="middle" fill={colors.textMuted} fontSize="9">{(maxTime / 2).toFixed(1)}s</text>
        <text x={plotRight} y={plotBottom + 14} textAnchor="middle" fill={colors.textMuted} fontSize="9">{maxTime.toFixed(1)}s</text>
      </svg>
    );
  };

  // Metrics Panel
  const MetricsPanel = ({ data, targetVal }: { data: { overshoot: number; settlingTime: number; steadyStateError: number } | null; targetVal: number }) => {
    if (!data) return null;
    const items = [
      { label: 'Overshoot', value: `${data.overshoot.toFixed(1)}%`, good: data.overshoot < 10, color: colors.warning },
      { label: 'Settling Time', value: `${(data.settlingTime * 1000).toFixed(0)} ms`, good: data.settlingTime < 0.5, color: colors.cyan },
      { label: 'SS Error', value: `${data.steadyStateError.toFixed(2)}${'\u00B0'}`, good: data.steadyStateError < 2, color: colors.violet },
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
        {items.map(it => (
          <div key={it.label} style={{
            background: it.good ? colors.success + '20' : colors.error + '20',
            border: `1px solid ${it.good ? colors.success : colors.error}50`,
            borderRadius: '8px',
            padding: '10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: it.good ? colors.success : colors.error }}>{it.value}</div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>{it.label}</div>
            <div style={{ fontSize: '10px', color: it.good ? colors.success : colors.error, marginTop: '2px' }}>{it.good ? 'PASS' : 'FAIL'}</div>
          </div>
        ))}
      </div>
    );
  };

  // Slider control
  const SliderControl = ({ label, value, onChange, min, max, step, unit, color }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step: number; unit: string; color: string;
  }) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: colors.textSecondary }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color }}>{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color, height: '6px', cursor: 'pointer' }}
      />
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────
  // Progress bar
  // ──────────────────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1002,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.orange})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Phase indicators
  const renderPhaseIndicators = () => (
    <div style={{
      position: 'fixed',
      top: '4px',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      flexWrap: 'wrap',
      zIndex: 1001,
      background: colors.bgPrimary,
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={`Go to ${phaseLabels[p]} phase`}
          style={{
            width: phase === p ? '32px' : '10px',
            height: '10px',
            borderRadius: '5px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '44px',
          }}
          title={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ──────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      textAlign: 'center',
    }}>
      {/* Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: `${colors.accent}20`,
        border: `1px solid ${colors.accent}40`,
        borderRadius: '999px',
        marginBottom: '24px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent, animation: 'pulse 2s infinite' }} />
        <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 600 }}>CONTROL SYSTEMS</span>
      </div>

      {/* Title */}
      <h1 style={{
        ...typo.h1,
        color: colors.textPrimary,
        marginBottom: '16px',
        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.accent})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Why Does Your Robot Arm Overshoot?
      </h1>

      <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
        You command 90 degrees. It swings to 110, then 85, then 92, then 89...
        The secret is PID control - the algorithm that tames every servo motor.
      </p>

      {/* Animated servo illustration */}
      <div style={{
        background: colors.bgCard,
        borderRadius: '24px',
        padding: '24px',
        marginBottom: '32px',
        border: `1px solid ${colors.border}`,
      }}>
        <svg width={isMobile ? 280 : 380} height={isMobile ? 200 : 240} viewBox={`0 0 ${isMobile ? 280 : 380} ${isMobile ? 200 : 240}`} preserveAspectRatio="xMidYMid meet">
          {/* Servo motor body */}
          <rect x={isMobile ? 100 : 150} y={isMobile ? 90 : 110} width="60" height="40" rx="6" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
          <text x={isMobile ? 130 : 180} y={isMobile ? 115 : 135} textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">SERVO</text>

          {/* Oscillating arm */}
          {(() => {
            const cx = isMobile ? 130 : 180;
            const cy = isMobile ? 90 : 110;
            const armLen = 60;
            const osc = 90 + 20 * Math.sin(animFrame * 0.08) * Math.exp(-animFrame * 0.005);
            const rad = (osc * Math.PI) / 180;
            const ax = cx + armLen * Math.cos(-rad + Math.PI);
            const ay = cy + armLen * Math.sin(-rad + Math.PI);
            return (
              <g>
                {/* Target position */}
                <line x1={cx} y1={cy} x2={cx - armLen - 10} y2={cy} stroke={colors.success} strokeWidth="2" strokeDasharray="6,4" opacity="0.5" />
                <text x={cx - armLen - 15} y={cy - 8} fill={colors.success} fontSize="10">Target 90{'\u00B0'}</text>

                {/* Arm */}
                <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={colors.accent} strokeWidth="5" strokeLinecap="round" />
                <circle cx={cx} cy={cy} r="8" fill={colors.accent} stroke="#fff" strokeWidth="2" />
                <circle cx={ax} cy={ay} r="6" fill={colors.warning} />
              </g>
            );
          })()}

          {/* Label */}
          <text x={isMobile ? 140 : 190} y={isMobile ? 180 : 220} textAnchor="middle" fill={colors.textMuted} fontSize="12">
            Overshooting and oscillating...
          </text>

          {/* Oscillation wave hint */}
          <path
            d={`M${isMobile ? 20 : 30} ${isMobile ? 170 : 200} ${Array.from({length: 20}, (_, i) => {
              const t = i * 0.3;
              const x = (isMobile ? 20 : 30) + i * (isMobile ? 12 : 16);
              const y = (isMobile ? 170 : 200) - 15 * Math.sin(t * 3) * Math.exp(-t * 0.5);
              return `L${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={colors.orange}
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      </div>

      <button
        onClick={() => { playSound('click'); nextPhase(); }}
        style={{
          padding: '14px 32px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
          border: 'none',
          borderRadius: '12px',
          color: '#000',
          fontWeight: 700,
          fontSize: '16px',
          cursor: 'pointer',
          minHeight: '48px',
        }}
      >
        Learn PID Control
      </button>
    </div>
  );

  const renderPredict = () => {
    const options = [
      { id: 'more_overshoot', label: 'More overshoot and faster oscillation - the system reacts too aggressively' },
      { id: 'less_overshoot', label: 'Less overshoot - higher gain means more correction power' },
      { id: 'no_change', label: 'No change - the system is already tuned' },
      { id: 'steady_state', label: 'The steady-state error doubles but oscillation stays the same' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '24px',
        textAlign: 'center',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
          Make Your Prediction
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '550px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
            A servo motor currently uses proportional gain Kp = 2 to reach a target position.
            The response has moderate overshoot and oscillation.
          </p>
          <p style={{ ...typo.h3, color: colors.accent }}>
            What happens if you double Kp to 4?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '550px', width: '100%' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setPrediction(opt.id);
                playSound('click');
                onGameEvent?.({
                  eventType: 'prediction_made',
                  gameType: 'servo-control',
                  gameTitle: 'Servo Control Loop',
                  details: { prediction: opt.id },
                  timestamp: Date.now()
                });
              }}
              style={{
                padding: '14px 18px',
                background: prediction === opt.id ? `${colors.accent}30` : colors.bgSecondary,
                border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px',
                fontSize: '15px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              background: prediction === 'more_overshoot' ? colors.success + '20' : colors.warning + '20',
              border: `1px solid ${prediction === 'more_overshoot' ? colors.success : colors.warning}50`,
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '550px',
            }}>
              <p style={{ ...typo.body, color: prediction === 'more_overshoot' ? colors.success : colors.warning, fontWeight: 600 }}>
                {prediction === 'more_overshoot' ? 'Excellent intuition!' : 'Not quite - let\'s explore!'}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                Doubling Kp makes the system react more aggressively to error. The servo overshoots further because it applies too much force, leading to larger oscillations. This is the fundamental P-gain tradeoff.
              </p>
            </div>
            <button
              onClick={() => { playSound('transition'); nextPhase(); }}
              style={{
                marginTop: '16px',
                padding: '12px 32px',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Test It Yourself
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPlay = () => {
    const graphW = isMobile ? 340 : 440;
    const servoSize = isMobile ? 180 : 220;

    return (
      <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Tune the PID Controller
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
          Goal: Overshoot {'<'} 10%, Settling time {'<'} 500ms, Steady-state error {'<'} 2{'°'}
        </p>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
          {/* Left: Visualizations */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PIDBlockDiagram width={graphW} />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <ServoArmVis angle={servoAngle} target={targetPosition} size={servoSize} />
            </div>
            <StepResponseGraph data={simData} targetVal={targetPosition} graphWidth={graphW} label="Step Response" accentColor={colors.accent} />
            <MetricsPanel data={simData} targetVal={targetPosition} />
          </div>

          {/* Right: Controls */}
          <div style={{
            width: isMobile ? '100%' : '280px',
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Controls</h3>

            <SliderControl label="Target Position" value={targetPosition} onChange={setTargetPosition} min={10} max={170} step={5} unit={'\u00B0'} color={colors.success} />
            <SliderControl label="P Gain (Kp)" value={kp} onChange={setKp} min={0.1} max={10} step={0.1} unit="" color={colors.accent} />
            <SliderControl label="I Gain (Ki)" value={ki} onChange={setKi} min={0} max={5} step={0.1} unit="" color={colors.cyan} />
            <SliderControl label="D Gain (Kd)" value={kd} onChange={setKd} min={0} max={3} step={0.1} unit="" color={colors.violet} />

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '12px', paddingTop: '12px' }}>
              <SliderControl label="Load Inertia (J)" value={inertia} onChange={setInertia} min={0.2} max={5} step={0.1} unit="kg*m^2" color={colors.warning} />
              <SliderControl label="Friction (b)" value={friction} onChange={setFriction} min={0} max={2} step={0.1} unit="N*m*s" color={colors.textMuted} />
            </div>

            <button
              onClick={() => runSimulation(targetPosition, kp, ki, kd, inertia, friction, setSimData)}
              disabled={isSimulating}
              style={{
                width: '100%',
                padding: '12px',
                background: isSimulating ? colors.border : `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
                border: 'none',
                borderRadius: '8px',
                color: isSimulating ? colors.textMuted : '#000',
                fontWeight: 700,
                cursor: isSimulating ? 'default' : 'pointer',
                marginTop: '16px',
                minHeight: '44px',
              }}
            >
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>

            {playGoalsMet && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: colors.success + '20',
                border: `1px solid ${colors.success}50`,
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <p style={{ color: colors.success, fontWeight: 700, fontSize: '15px' }}>All specs met!</p>
                <button
                  onClick={() => { playSound('success'); nextPhase(); }}
                  style={{
                    marginTop: '8px',
                    padding: '8px 24px',
                    background: colors.success,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#000',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
        Understanding PID Control
      </h2>

      {/* PID terms explanation */}
      {[
        {
          term: 'P (Proportional)',
          formula: 'u_P = Kp * e(t)',
          color: colors.accent,
          description: 'Produces output proportional to the current error. High Kp gives fast response but causes overshoot and oscillation. Acts like a spring pulling toward the target.',
          analogy: 'Like pressing the gas pedal harder the further you are from your destination.',
        },
        {
          term: 'I (Integral)',
          formula: 'u_I = Ki * \u222Be(t)dt',
          color: colors.cyan,
          description: 'Accumulates error over time. Eliminates steady-state error by building up control effort when small persistent errors exist. Too much causes slow oscillation (integral windup).',
          analogy: 'Like a friend who says "you\'ve been 2mm off for 10 seconds - push harder!"',
        },
        {
          term: 'D (Derivative)',
          formula: 'u_D = Kd * de/dt',
          color: colors.violet,
          description: 'Responds to the rate of change of error. Acts as a brake when approaching the target quickly, reducing overshoot. Sensitive to noise. Provides damping.',
          analogy: 'Like a brake - when you\'re approaching the target fast, it says "slow down!"',
        },
      ].map(item => (
        <div key={item.term} style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          width: '100%',
          borderLeft: `4px solid ${item.color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ ...typo.h3, color: item.color }}>{item.term}</h3>
            <code style={{ background: colors.bgSecondary, padding: '4px 12px', borderRadius: '6px', color: item.color, fontSize: '13px' }}>{item.formula}</code>
          </div>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>{item.description}</p>
          <p style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic' }}>{item.analogy}</p>
        </div>
      ))}

      {/* Tuning guideline table */}
      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '20px',
        width: '100%',
        marginBottom: '16px',
      }}>
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Tuning Effects Summary</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Parameter', 'Rise Time', 'Overshoot', 'Settling', 'SS Error'].map(h => (
                  <th key={h} style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Increase Kp', 'Decrease', 'Increase', 'Small change', 'Decrease'],
                ['Increase Ki', 'Decrease', 'Increase', 'Increase', 'Eliminate'],
                ['Increase Kd', 'Small change', 'Decrease', 'Decrease', 'No effect'],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: '8px',
                      borderBottom: `1px solid ${colors.border}`,
                      color: j === 0 ? colors.accent : colors.textSecondary,
                      fontWeight: j === 0 ? 600 : 400,
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={() => { playSound('transition'); nextPhase(); }}
        style={{
          padding: '12px 32px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
          border: 'none',
          borderRadius: '8px',
          color: '#000',
          fontWeight: 700,
          cursor: 'pointer',
          minHeight: '44px',
        }}
      >
        Next: The Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => {
    const options = [
      { id: 'slower_stable', label: 'The response becomes slower but remains stable' },
      { id: 'more_oscillation', label: 'The system oscillates more and overshoots further because the gains are now insufficient for the heavier load', correct: true },
      { id: 'no_change', label: 'No change - PID adapts automatically' },
      { id: 'faster', label: 'The system responds faster due to more momentum' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '24px',
        textAlign: 'center',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
          The Twist: Heavy Load
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '550px',
          border: `1px solid ${colors.warning}40`,
          marginBottom: '24px',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
            Your PID controller is tuned perfectly for a light arm. Now a heavy tool (4x the inertia) is attached to the servo.
          </p>
          <p style={{ ...typo.h3, color: colors.warning }}>
            What happens to the step response with the same PID gains?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '550px', width: '100%' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setTwistPrediction(opt.id);
                playSound('click');
              }}
              style={{
                padding: '14px 18px',
                background: twistPrediction === opt.id ? `${colors.warning}30` : colors.bgSecondary,
                border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px',
                fontSize: '15px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              background: twistPrediction === 'more_oscillation' ? colors.success + '20' : colors.warning + '20',
              border: `1px solid ${twistPrediction === 'more_oscillation' ? colors.success : colors.warning}50`,
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '550px',
            }}>
              <p style={{ ...typo.body, color: twistPrediction === 'more_oscillation' ? colors.success : colors.warning, fontWeight: 600 }}>
                {twistPrediction === 'more_oscillation' ? 'Exactly right!' : 'Close - let\'s see what really happens.'}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                Higher inertia means the same control force produces less acceleration. The system becomes sluggish, oscillates more, and takes longer to settle. The gains that worked for the light load are insufficient for the heavy one. This is why gain scheduling is essential.
              </p>
            </div>
            <button
              onClick={() => { playSound('transition'); nextPhase(); }}
              style={{
                marginTop: '16px',
                padding: '12px 32px',
                background: `linear-gradient(135deg, ${colors.warning}, ${colors.orange})`,
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Try Re-Tuning
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => {
    const graphW = isMobile ? 340 : 440;

    // Generate original-gains-heavy-load response for comparison
    const originalHeavyData = generateStepResponse(targetPosition, kp, ki, kd, twistInertia, friction, 3.0, 0.002);

    return (
      <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Re-Tune for Heavy Load (J = {twistInertia.toFixed(1)} kg*m{'\u00B2'})
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
          Goal: Overshoot {'<'} 15%, Settling {'<'} 800ms, SS Error {'<'} 3{'°'} with heavy load
        </p>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
          {/* Left: Visualizations */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Show before (original gains + heavy load) */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '12px' }}>
              <h4 style={{ fontSize: '13px', color: colors.error, marginBottom: '8px' }}>Before: Original gains + heavy load</h4>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
                Overshoot: {originalHeavyData.overshoot.toFixed(1)}% | Settling: {(originalHeavyData.settlingTime * 1000).toFixed(0)}ms | SS Error: {originalHeavyData.steadyStateError.toFixed(1)}{'\u00B0'}
              </div>
            </div>

            <StepResponseGraph
              data={twistSimData}
              targetVal={targetPosition}
              graphWidth={graphW}
              label="Re-Tuned Step Response (Heavy Load)"
              accentColor={colors.warning}
            />
            <MetricsPanel data={twistSimData} targetVal={targetPosition} />
          </div>

          {/* Right: Controls */}
          <div style={{
            width: isMobile ? '100%' : '280px',
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.warning}40`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>Re-Tune Gains</h3>

            <div style={{ background: colors.warning + '15', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: colors.warning }}>
                Hint: Higher inertia needs higher Kp and Kd. Increase both proportionally.
              </p>
            </div>

            <SliderControl label="P Gain (Kp)" value={twistKp} onChange={setTwistKp} min={0.1} max={20} step={0.1} unit="" color={colors.accent} />
            <SliderControl label="I Gain (Ki)" value={twistKi} onChange={setTwistKi} min={0} max={10} step={0.1} unit="" color={colors.cyan} />
            <SliderControl label="D Gain (Kd)" value={twistKd} onChange={setTwistKd} min={0} max={6} step={0.1} unit="" color={colors.violet} />

            <SliderControl label="Load Inertia (J)" value={twistInertia} onChange={setTwistInertia} min={2} max={8} step={0.5} unit="kg*m^2" color={colors.warning} />

            <button
              onClick={() => {
                runSimulation(targetPosition, twistKp, twistKi, twistKd, twistInertia, friction, setTwistSimData);
                setTwistRetuned(true);
              }}
              disabled={isSimulating}
              style={{
                width: '100%',
                padding: '12px',
                background: isSimulating ? colors.border : `linear-gradient(135deg, ${colors.warning}, ${colors.orange})`,
                border: 'none',
                borderRadius: '8px',
                color: isSimulating ? colors.textMuted : '#000',
                fontWeight: 700,
                cursor: isSimulating ? 'default' : 'pointer',
                marginTop: '16px',
                minHeight: '44px',
              }}
            >
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>

            {twistGoalsMet && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: colors.success + '20',
                border: `1px solid ${colors.success}50`,
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <p style={{ color: colors.success, fontWeight: 700, fontSize: '15px' }}>Heavy load tuned!</p>
                <button
                  onClick={() => { playSound('success'); nextPhase(); }}
                  style={{
                    marginTop: '8px',
                    padding: '8px 24px',
                    background: colors.success,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#000',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
        Gain Scheduling and Adaptive Control
      </h2>

      {[
        {
          title: 'Why Fixed Gains Fail',
          color: colors.error,
          content: 'PID gains are tuned for a specific operating point (specific inertia, friction, load). When the plant changes - heavier payload, different speed, temperature shift - the original gains produce degraded or even unstable behavior. A controller that works for one condition may fail for another.',
        },
        {
          title: 'Gain Scheduling',
          color: colors.accent,
          content: 'The solution: store multiple sets of PID gains and switch between them based on operating condition. A robot arm might have different gain tables for each tool weight. The controller measures the condition (payload mass sensor, speed, position) and selects the appropriate gain set. This is gain scheduling - pre-computed adaptation.',
        },
        {
          title: 'Adaptive Control',
          color: colors.cyan,
          content: 'Advanced systems go further: they estimate plant parameters in real-time and adjust gains continuously. Model Reference Adaptive Control (MRAC) compares actual response to a desired reference model and adjusts gains to minimize the difference. Self-Tuning Regulators estimate the plant model online and re-compute optimal PID gains.',
        },
        {
          title: 'Modern Approaches',
          color: colors.violet,
          content: 'Today, reinforcement learning and neural network controllers can learn to handle varying conditions without explicit gain tables. However, PID with gain scheduling remains dominant in industry because it is well-understood, certifiable, and predictable - critical properties for safety-critical systems like aircraft flight control and medical devices.',
        },
      ].map(item => (
        <div key={item.title} style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px',
          width: '100%',
          borderLeft: `4px solid ${item.color}`,
        }}>
          <h3 style={{ ...typo.h3, color: item.color, marginBottom: '8px' }}>{item.title}</h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>{item.content}</p>
        </div>
      ))}

      <button
        onClick={() => { playSound('transition'); nextPhase(); }}
        style={{
          marginTop: '16px',
          padding: '12px 32px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
          border: 'none',
          borderRadius: '8px',
          color: '#000',
          fontWeight: 700,
          cursor: 'pointer',
          minHeight: '44px',
        }}
      >
        Real-World Applications
      </button>
    </div>
  );

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;
    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Knowledge Test
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
          Question {currentQuestion + 1} of {testQuestions.length}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {testQuestions.map((_, i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: i === currentQuestion ? colors.accent : testAnswers[i] !== null ? colors.success : colors.border,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Scenario + Question */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.cyan, marginBottom: '12px', fontStyle: 'italic' }}>
            {q.scenario}
          </p>
          <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
            {q.question}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {q.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[currentQuestion] = opt.id;
                setTestAnswers(newAnswers);
                playSound('click');
              }}
              style={{
                padding: '14px 16px',
                background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}30` : colors.bgSecondary,
                border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px',
              }}
            >
              <span style={{ fontWeight: 600, marginRight: '8px', color: colors.accent }}>{opt.id.toUpperCase()}.</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              style={{
                padding: '12px 24px',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Previous
            </button>
          )}

          {currentQuestion < 9 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={!answered}
              style={{
                padding: '12px 24px',
                background: answered ? colors.accent : colors.border,
                border: 'none',
                borderRadius: '8px',
                color: answered ? '#000' : colors.textMuted,
                cursor: answered ? 'pointer' : 'default',
                fontWeight: 600,
                minHeight: '44px',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                const score = testAnswers.reduce((acc, answer, i) => {
                  const correct = testQuestions[i].options.find(o => o.correct)?.id;
                  return acc + (answer === correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setTestSubmitted(true);
                onGameEvent?.({ eventType: 'game_completed', gameType: 'servo-control', gameTitle: 'Servo Control Loop', details: { score, total: testQuestions.length }, timestamp: Date.now() });
                playSound('complete');
                nextPhase();
              }}
              disabled={!allAnswered}
              style={{
                padding: '12px 32px',
                background: allAnswered ? colors.success : colors.border,
                border: 'none',
                borderRadius: '8px',
                color: allAnswered ? '#000' : colors.textMuted,
                fontWeight: 600,
                cursor: allAnswered ? 'pointer' : 'default',
                minHeight: '44px',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const finalScore = testSubmitted ? testScore : testAnswers.reduce((acc, answer, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return acc + (answer === correct ? 1 : 0);
    }, 0);
    const total = testQuestions.length;
    const pct = Math.round((finalScore / total) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingBottom: '80px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#127942;</div>
        <h2 style={{
          ...typo.h1,
          marginBottom: '8px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Servo Control Master!
        </h2>

        <div style={{ fontSize: '40px', fontWeight: 800, color: pct >= 70 ? colors.success : colors.warning, marginBottom: '4px' }}>
          {finalScore} / {total} ({grade})
        </div>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px' }}>
          {pct >= 90 ? 'Outstanding - you truly understand PID servo control!' : pct >= 70 ? 'Great work - you\'ve mastered the fundamentals of PID tuning!' : 'Good effort - review the answer key to strengthen your understanding.'}
        </p>

        {/* Score summary cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '24px',
          maxWidth: '400px',
          width: '100%',
        }}>
          {[
            { icon: '\u{1F3AF}', label: 'PID Tuning' },
            { icon: '\u{26A1}', label: 'Step Response' },
            { icon: '\u{2699}', label: 'Gain Scheduling' },
            { icon: '\u{1F916}', label: 'Real Servo Systems' },
          ].map(item => (
            <div key={item.label} style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
              <p style={{ ...typo.small, color: colors.textSecondary }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          maxWidth: '600px',
          width: '100%',
        }}>
          <p style={{ ...typo.small, color: colors.cyan }}>
            <strong>Key Insight:</strong> PID control uses three terms - Proportional (reacts to error), Integral (eliminates steady-state error), and Derivative (damps overshoot). Tuning must match the plant: higher inertia needs higher gains. Gain scheduling adapts to changing conditions.
          </p>
        </div>

        {/* Answer Key */}
        <h3 style={{ ...typo.h3, color: colors.textSecondary, marginBottom: '12px', textAlign: 'left', width: '100%', maxWidth: '600px' }}>Answer Key</h3>
        <div style={{ maxWidth: '600px', width: '100%', maxHeight: '50vh', overflowY: 'auto' as const, marginBottom: '20px' }}>
          {testQuestions.map((tq, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const correctOpt = tq.options.find(o => o.correct);
            const isCorrect = userAnswer === correctOpt?.id;
            const userOpt = tq.options.find(o => o.id === userAnswer);
            return (
              <div key={qIndex} style={{
                marginBottom: '12px',
                padding: '14px',
                borderRadius: '10px',
                background: colors.bgCard,
                borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px', lineHeight: '1.4' }}>
                  <span style={{ fontSize: '16px', marginRight: '6px' }}>{isCorrect ? '\u2705' : '\u274C'}</span>
                  {qIndex + 1}. {tq.question}
                </p>
                {!isCorrect && userOpt && (
                  <p style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '6px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)' }}>
                    Your answer: {userOpt.label}
                  </p>
                )}
                <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)' }}>
                  Correct: {correctOpt?.label}
                </p>
                <p style={{ fontSize: '12px', color: '#fbbf24', padding: '8px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', lineHeight: '1.5' }}>
                  Why? {tq.explanation}
                </p>
              </div>
            );
          })}
        </div>

        {/* Complete Game button */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: `linear-gradient(to top, ${colors.bgPrimary} 80%, transparent)`, display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
          <button
            onClick={() => {
              onGameEvent?.({ eventType: 'game_completed', gameType: 'servo-control', gameTitle: 'Servo Control Loop', details: { score: finalScore, total, pct, mastery_achieved: true }, timestamp: Date.now() });
              window.location.href = '/games';
            }}
            style={{
              padding: '14px 48px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
              color: '#000',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${colors.accentGlow}`,
              minHeight: '48px',
            }}
          >
            Complete Game
          </button>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
        <TransferPhaseView
          conceptName="Servo Control Loop"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
        />
      );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradients */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: isMobile ? '250px' : '400px',
        height: isMobile ? '250px' : '400px',
        background: `radial-gradient(circle, ${colors.accent}10, transparent)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: `radial-gradient(circle, ${colors.orange}10, transparent)`,
        pointerEvents: 'none',
      }} />

      {renderProgressBar()}

      <div style={{ position: 'relative', zIndex: 10, paddingTop: '80px', paddingBottom: '16px', overflowY: 'auto', flex: 1, minHeight: '100dvh' }}>
        {renderPhaseIndicators()}
        {renderPhase()}
      </div>

      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 1003,
      }}>
        <button
          onClick={() => {
            const idx = phaseOrder.indexOf(phase);
            if (idx > 0) goToPhase(phaseOrder[idx - 1]);
          }}
          disabled={phase === 'hook'}
          style={{
            padding: '10px 24px',
            background: phase === 'hook' ? colors.border : colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: phase === 'hook' ? colors.textMuted : colors.textPrimary,
            cursor: phase === 'hook' ? 'default' : 'pointer',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '13px' }}>
          {phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={nextPhase}
          disabled={phase === 'mastery'}
          style={{
            padding: '10px 24px',
            background: phase === 'mastery' ? colors.border : `linear-gradient(135deg, ${colors.accent}, ${colors.orange})`,
            border: 'none',
            borderRadius: '8px',
            color: phase === 'mastery' ? colors.textMuted : '#000',
            cursor: phase === 'mastery' ? 'default' : 'pointer',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </nav>
    </div>
  );
};

export default ServoControlRenderer;
